import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { formatCitationBlock, retrieveLocalChunks } from '@/lib/server/retrieval';

export const runtime = 'nodejs';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type RequestBody = {
  messages: ChatMessage[];
  pageContext?: string;
};

type Provider = 'openai' | 'anthropic' | 'ollama';

function cleanKey(value: string | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message || 'unknown error';
    return msg.length > 220 ? `${msg.slice(0, 220)}...` : msg;
  }
  return 'unknown error';
}

function streamText(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function buildSystemPrompt(context: string, pageContext?: string) {
  return [
    'You are the GDBB Research Assistant embedded in an optimization research platform.',
    'Answer any user question clearly and directly.',
    'If the question is about GDBB, include formal explanation + intuitive explanation + references.',
    'If the question is outside GDBB, still answer helpfully while noting when content is general knowledge.',
    'Prefer concise, technically correct responses. Use markdown when useful.',
    pageContext ? `Current page context: ${pageContext}` : '',
    context ? `Paper context for citations:\n${context}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildLocalFallbackAnswer(
  question: string,
  chunks: ReturnType<typeof retrieveLocalChunks>,
  providerErrors: string[],
) {
  const ranked = chunks.filter((c) => c.score > 0).slice(0, 3);
  const isQuotaIssue = providerErrors.some((e) => /429|quota|billing/i.test(e));
  const normalized = question.toLowerCase();

  let direct = '';
  if (normalized.includes('greedy')) {
    direct =
      'Greedy in GDBB is the fast construction phase that builds an initial feasible solution (UB) by choosing locally good moves, then later phases improve and certify it.';
  } else if (normalized.includes('sigma')) {
    direct =
      'The Sigma Table stores subproblem bounds and confidence scores so DP and B&B can prune more aggressively.';
  } else if (normalized.includes('complexity')) {
    direct =
      'The reported hybrid complexity is O(n^2 * 2^(n/log n)) in the provided paper constants, with practical speedups from tighter pruning.';
  }

  const guidance = isQuotaIssue
    ? 'OpenAI is reachable but quota is exhausted (429). Add billing/credits or switch provider.'
    : 'Model providers are currently unavailable. Configure OpenAI/Anthropic or run Ollama locally.';

  if (!ranked.length) {
    return `${guidance}\n\nI can still help with general guidance, but local paper chunks did not strongly match this query.`;
  }

  const chunkSummary = ranked.map((c) => `- ${c.reference}: ${c.snippet}`).join('\n');
  return [
    guidance,
    direct,
    'Using local retrieval mode, here are the most relevant paper points:',
    chunkSummary,
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function runAnthropic(messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const apiKey = cleanKey(process.env.ANTHROPIC_API_KEY);
  if (!apiKey) throw new Error('anthropic_not_configured');

  const anthropic = new Anthropic({ apiKey });
  const result = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  return result.content
    .map((part) => ('text' in part ? part.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
}

async function runOpenAI(messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const apiKey = cleanKey(process.env.OPENAI_API_KEY);
  if (!apiKey) throw new Error('openai_not_configured');

  const openai = new OpenAI({ apiKey });
  const candidateModels = Array.from(
    new Set([process.env.OPENAI_MODEL, 'gpt-4o-mini', 'gpt-4.1-mini'].filter(Boolean) as string[]),
  );
  let lastError: unknown;

  for (const model of candidateModels) {
    try {
      const result = await openai.chat.completions.create({
        model,
        temperature: 0.25,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      });
      return result.choices[0]?.message?.content?.trim() ?? '';
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('openai_request_failed');
}

async function runOllama(messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
  const model = process.env.OLLAMA_MODEL ?? 'llama3.1:8b';

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('ollama_not_available');
  }

  const json = (await response.json()) as { message?: { content?: string } };
  return json.message?.content?.trim() ?? '';
}

function getProviderOrder(): Provider[] {
  const raw = process.env.CHAT_PROVIDER_ORDER?.trim();
  if (!raw) return ['openai', 'anthropic', 'ollama'];

  const normalized = raw
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is Provider => p === 'openai' || p === 'anthropic' || p === 'ollama');

  return normalized.length ? normalized : ['openai', 'anthropic', 'ollama'];
}

export async function POST(req: Request) {
  const body = (await req.json()) as RequestBody;
  const messages = body.messages ?? [];
  const latest = messages.at(-1)?.content ?? '';

  const chunks = retrieveLocalChunks(latest, 5);
  const context = formatCitationBlock(chunks);
  const systemPrompt = buildSystemPrompt(context, body.pageContext);

  let text = '';
  const providerErrors: string[] = [];
  const providerOrder = getProviderOrder();

  for (const provider of providerOrder) {
    if (text) break;
    try {
      if (provider === 'openai') {
        text = await runOpenAI(messages, systemPrompt);
      } else if (provider === 'anthropic') {
        text = await runAnthropic(messages, systemPrompt);
      } else {
        text = await runOllama(messages, systemPrompt);
      }
    } catch (error) {
      const name = provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'Ollama';
      providerErrors.push(`${name} failed: ${describeError(error)}`);
    }
  }

  if (!text) {
    text = buildLocalFallbackAnswer(latest, chunks, providerErrors);
    if (providerErrors.length) {
      text = `${text}\n\nProvider debug:\n${providerErrors.join(' | ')}`;
    }
  }

  if (!text) {
    text = 'The model returned an empty response. Please try rephrasing your question.';
  }

  if (context) {
    text = `${text}\n\nReferences:\n${context}`;
  }

  return new Response(streamText(text), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
