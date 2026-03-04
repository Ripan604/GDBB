'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUiStore } from '@/lib/store';
import { ChatText } from './ChatText';

type Msg = { role: 'user' | 'assistant'; content: string };

const STARTERS = [
  'Explain how the Sigma Table works',
  "What is GDBB's time complexity?",
  'How does epsilon approximation guarantee work?',
  'Show how GDBB solves CVRP',
];

export function ChatDrawer() {
  const chatOpen = useUiStore((s) => s.chatOpen);
  const setChatOpen = useUiStore((s) => s.setChatOpen);
  const theme = useUiStore((s) => s.theme);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === 'string' && detail.trim()) setInput(detail.trim());
    };

    window.addEventListener('gdbb-chat-prefill', handler as EventListener);
    return () => window.removeEventListener('gdbb-chat-prefill', handler as EventListener);
  }, []);

  const send = async (content: string) => {
    if (!content.trim()) return;
    setLoading(true);
    const nextMessages = [...messages, { role: 'user' as const, content }];
    setMessages(nextMessages);
    setInput('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, pageContext: 'drawer' }),
      });

      if (!res.body) throw new Error('No stream body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistant += decoder.decode(value, { stream: true });
        setMessages([...nextMessages, { role: 'assistant', content: assistant }]);
      }
    } catch (error) {
      setMessages([...nextMessages, { role: 'assistant', content: 'Chat is unavailable right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside
      className={`fixed right-0 top-0 z-[70] h-full w-full max-w-md border-l p-4 backdrop-blur-md transition-transform duration-300 ${
        chatOpen ? 'translate-x-0' : 'translate-x-full'
      } ${
        theme === 'light'
          ? 'border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(240,246,255,0.95))] text-slate-900'
          : 'border-white/10 bg-[linear-gradient(180deg,rgba(4,8,22,0.95),rgba(6,11,26,0.93))] text-[var(--text-primary)]'
      }`}
      aria-label="GDBB AI Assistant drawer"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg text-neural">GDBB Assistant</h2>
        <button
          className={`rounded-full px-3 py-1 text-xs ${theme === 'light' ? 'border border-slate-300' : 'border border-white/15'}`}
          onClick={() => setChatOpen(false)}
        >
          Close
        </button>
      </div>

      <div className="surface-muted mb-3 max-h-[58vh] space-y-3 overflow-auto rounded-2xl p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Ask about theorems, proofs, demos, and parameters.</p>
        ) : (
          messages.map((m, i) => (
            <article
              key={`${m.role}-${i}`}
              className={`rounded-xl border p-3 ${
                m.role === 'user'
                  ? 'border-neural/35 bg-neural/10'
                  : 'border-[var(--surface-border)] bg-[var(--surface-muted)]'
              }`}
            >
              <p className="mb-2 font-mono text-xs font-semibold uppercase text-[var(--text-secondary)]">{m.role}</p>
              <ChatText text={m.content} />
            </article>
          ))
        )}
        {loading && (
          <div className="rounded-xl border border-dp/35 bg-dp/10 p-3 text-sm text-[var(--text-secondary)]">
            Generating response...
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {STARTERS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="chip-btn rounded-full px-3 py-1 text-xs transition"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSend) send(input);
          }}
          className="input-shell w-full rounded-lg px-3 py-2 text-sm outline-none ring-neural/30 focus:ring-2"
          placeholder="Ask about GDBB"
        />
        <button className="primary-btn px-4 py-2" disabled={!canSend} onClick={() => send(input)}>
          Send
        </button>
      </div>
    </aside>
  );
}

