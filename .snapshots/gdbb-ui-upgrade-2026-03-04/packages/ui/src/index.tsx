import type { HTMLAttributes, ButtonHTMLAttributes } from 'react';

export function cn(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}

export function Panel(props: HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md',
        className,
      )}
      {...rest}
    />
  );
}

export function GlowButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;
  return (
    <button
      className={cn(
        'rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-300/60',
        className,
      )}
      {...rest}
    />
  );
}

