'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto mt-20 max-w-xl rounded-xl border border-red-400/30 bg-black/40 p-6 text-sm">
      <h2 className="mb-2 font-display text-2xl text-red-300">Something went wrong</h2>
      <p className="mb-4 text-[var(--text-secondary)]">{error.message}</p>
      <button className="rounded-lg border border-red-300/40 px-3 py-2" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}

