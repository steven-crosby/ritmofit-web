/**
 * Minimal 404 view for unknown SPA paths. Cloudflare serves `index.html` for
 * every path, so without this an arbitrary URL silently renders Login/Dashboard
 * (`/`). Rendered before the session gate so a bad link fails the same way
 * whether or not the visitor is signed in.
 */
export function NotFound() {
  return (
    <main className="rf-hero-glow flex min-h-screen items-center px-5 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="rf-brand-mark" aria-hidden="true">
            R
          </span>
          <span className="font-display text-lg font-bold text-text-primary">Ritmo Studio</span>
        </div>
        <p className="rf-eyebrow mt-16">404 · safe return</p>
        <h1 className="mt-3 max-w-2xl font-display text-[clamp(2.6rem,8vw,5rem)] font-bold leading-[0.94] tracking-tight text-text-primary">
          This beat is off the map.
        </h1>
        <p className="mt-5 max-w-xl font-ui text-base leading-7 text-text-secondary">
          This address does not exist. Opening it did not change saved classes, account settings, or
          music connections.
        </p>
        <div className="mt-8 flex flex-col gap-3 rounded-card border border-border-subtle bg-bg-raised p-4 sm:flex-row sm:flex-wrap sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="font-ui font-semibold text-text-primary">Return to the active product</p>
            <p className="mt-1 font-ui text-sm text-text-tertiary">
              The public entry is the safe route back into Ritmo Studio.
            </p>
          </div>
          <a
            href="/"
            className="inline-flex min-h-11 w-full items-center justify-center self-center rounded-control rf-btn-primary px-5 font-ui text-sm font-semibold text-text-on-accent sm:w-auto sm:rounded-pill"
          >
            Back to Ritmo Studio
          </a>
        </div>
      </div>
    </main>
  );
}
