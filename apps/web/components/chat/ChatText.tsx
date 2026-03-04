'use client';

import { Fragment } from 'react';

type Segment =
  | { type: 'text'; content: string }
  | { type: 'code'; content: string };

function splitCodeFence(input: string): Segment[] {
  const parts = input.split('```');
  return parts
    .map((part, index) => ({ part, index }))
    .filter(({ part }) => part.length > 0)
    .map(({ part, index }) => ({
      type: index % 2 === 0 ? ('text' as const) : ('code' as const),
      content: part.trimEnd(),
    }));
}

function renderTextBlock(text: string) {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="ml-4 list-disc space-y-1">
        {listItems.map((item, idx) => (
          <li key={`li-${idx}`} className="text-sm leading-relaxed text-[var(--text-primary)]">
            {item}
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushList();
      nodes.push(<div key={`spacer-${idx}`} className="h-2" />);
      return;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2).trim());
      return;
    }

    flushList();

    if (line.startsWith('### ')) {
      nodes.push(
        <h4 key={`h3-${idx}`} className="text-base font-semibold text-[var(--text-primary)]">
          {line.slice(4)}
        </h4>,
      );
      return;
    }

    if (line.startsWith('## ')) {
      nodes.push(
        <h3 key={`h2-${idx}`} className="text-lg font-semibold text-[var(--text-primary)]">
          {line.slice(3)}
        </h3>,
      );
      return;
    }

    if (line.startsWith('# ')) {
      nodes.push(
        <h2 key={`h1-${idx}`} className="text-xl font-semibold text-[var(--text-primary)]">
          {line.slice(2)}
        </h2>,
      );
      return;
    }

    nodes.push(
      <p key={`p-${idx}`} className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">
        {line}
      </p>,
    );
  });

  flushList();
  return nodes;
}

export function ChatText({ text }: { text: string }) {
  const segments = splitCodeFence(text);
  if (!segments.length) {
    return <p className="text-sm leading-relaxed text-[var(--text-primary)]">{text}</p>;
  }

  return (
    <div className="space-y-2">
      {segments.map((segment, idx) => (
        <Fragment key={`${segment.type}-${idx}`}>
          {segment.type === 'code' ? (
            <pre className="overflow-x-auto rounded-xl border border-[var(--surface-border)] bg-black/35 p-3 font-mono text-xs leading-6 text-[#f1f7ff]">
              <code>{segment.content}</code>
            </pre>
          ) : (
            <div className="space-y-1">{renderTextBlock(segment.content)}</div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

