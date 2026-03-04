'use client';

import { useState } from 'react';
import { ChatText } from '@/components/chat/ChatText';

type Msg = { role: 'user' | 'assistant'; content: string };

const starters = [
  'Explain how Sigma Table pruning works in plain language.',
  'Compare GDBB time complexity with pure branch-and-bound.',
  'Give CVRP parameter defaults for a fast near-optimal run.',
  'Summarize Theorem 5 and epsilon approximation guarantee.',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (prompt?: string) => {
    const content = (prompt ?? input).trim();
    if (!content || busy) return;
    setBusy(true);
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setInput('');

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next, pageContext: 'chat_page' }),
    });

    if (!res.body) {
      setMessages([...next, { role: 'assistant', content: 'No response body.' }]);
      setBusy(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      setMessages([...next, { role: 'assistant', content: text }]);
    }

    setBusy(false);
  };

  return (
    <section className="space-y-6 pb-8">
      <header className="space-y-4">
        <span className="eyebrow">Research Assistant</span>
        <h1 className="section-title">Ask the paper, not just the UI.</h1>
        <p className="section-subtitle">
          Get theorem references, parameter guidance, and domain-specific walkthroughs with citation-aware responses.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.8fr]">
        <div className="glass-panel-strong rounded-2xl p-4">
          <div className="mb-3 max-h-[58vh] space-y-3 overflow-auto rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] p-3">
            {messages.length === 0 && (
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                Start with a question about Sigma, complexity, proofs, or demo configuration.
              </p>
            )}
            {messages.map((m, i) => (
              <article
                key={`${m.role}-${i}`}
                className={`rounded-xl border p-3 ${
                  m.role === 'user'
                    ? 'border-neural/35 bg-neural/10'
                    : 'border-[var(--surface-border)] bg-[var(--surface-muted)]'
                }`}
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">{m.role}</p>
                <ChatText text={m.content} />
              </article>
            ))}
            {busy && (
              <div className="rounded-xl border border-dp/35 bg-dp/10 p-3 text-sm text-[var(--text-secondary)]">
                Generating response...
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              className="input-shell w-full rounded-xl px-3 py-2 text-sm outline-none ring-neural/30 focus:ring-2"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask a research question"
            />
            <button className="primary-btn px-4 py-2" onClick={() => send()} disabled={busy}>
              {busy ? '...' : 'Send'}
            </button>
          </div>
        </div>

        <aside className="glass-panel rounded-2xl p-4">
          <h2 className="mb-3 font-display text-2xl">Starter Prompts</h2>
          <div className="space-y-2">
            {starters.map((starter) => (
              <button
                key={starter}
                className="chip-btn w-full rounded-xl px-3 py-2 text-left text-sm transition"
                onClick={() => send(starter)}
              >
                {starter}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
