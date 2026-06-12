import { API_VERSION } from '@ritmofit/shared';

// Scaffold smoke screen (M1 step 1): proves Tailwind utilities resolve the
// generated design tokens, Martian Mono renders the BPM hero, and the
// @ritmofit/shared workspace import works in the web app. Real UI is step 12.
export function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-semibold text-text-primary">RitmoFit</h1>
        <p className="font-ui text-text-secondary">
          Monorepo scaffold · API <code className="font-data text-interactive">{API_VERSION}</code>
        </p>
      </header>

      <section className="rounded-card bg-bg-raised p-6 shadow-card">
        <p className="font-ui text-sm uppercase tracking-wide text-text-tertiary">Display BPM</p>
        <p className="font-data text-7xl font-bold tabular-nums text-text-primary">122</p>
        <div className="mt-4 flex gap-2">
          {(['none', 'easy', 'mod', 'hard', 'all_out'] as const).map((zone, i) => (
            <span
              key={zone}
              className="h-2 flex-1 rounded-pill"
              style={{ backgroundColor: `var(--rf-color-intensity-${zone})`, opacity: i === 0 ? 0.4 : 1 }}
              aria-hidden
            />
          ))}
        </div>
      </section>

      <div className="flex gap-3">
        <button className="rounded-pill bg-brand px-5 py-2 font-ui font-semibold text-text-on-accent">
          Primary
        </button>
        <button className="rounded-pill border border-interactive px-5 py-2 font-ui font-semibold text-interactive">
          Action
        </button>
      </div>
    </main>
  );
}
