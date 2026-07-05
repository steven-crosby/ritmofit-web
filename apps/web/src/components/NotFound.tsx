/**
 * Minimal 404 view for unknown SPA paths. Cloudflare serves `index.html` for
 * every path, so without this an arbitrary URL silently renders Login/Dashboard
 * (`/`). Rendered before the session gate so a bad link fails the same way
 * whether or not the visitor is signed in.
 */
export function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-data text-sm uppercase tracking-wide text-text-tertiary">404</p>
      <h1 className="font-ui text-xl font-semibold text-text-primary">This page doesn’t exist</h1>
      <p className="max-w-sm font-ui text-sm text-text-secondary">
        The link may be broken or the page may have moved.
      </p>
      <a
        href="/"
        className="rounded-pill border border-interactive bg-interactive/15 px-4 py-1.5 font-ui text-sm text-text-primary hover:bg-interactive/25"
      >
        Back to Ritmo Studio
      </a>
    </main>
  );
}
