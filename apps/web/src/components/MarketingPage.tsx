/**
 * Public marketing landing — the signed-out front door at "/".
 * Content from ritmofit_design_system/mockups/marketing.html.
 * Uses existing index.css recipes: rf-topbar, rf-brand-mark, rf-eyebrow,
 * rf-heat-bloom, rf-heat-text, rf-btn-primary.
 */
import { CreatorLoopProof } from './CreatorLoopProof.js';

interface MarketingPageProps {
  /** Existing instructors return through sign-in. */
  onSignIn: () => void;
  /** Prospective instructors continue directly into account creation. */
  onStartBuilding: () => void;
}

export function MarketingPage({ onSignIn, onStartBuilding }: MarketingPageProps) {
  return (
    <>
      {/* ── Skip link ─────────────────────────────────────────────────── */}
      <a
        href="#marketing-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[100] rounded-pill bg-bg-raised px-4 py-2 font-ui text-text-primary shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
      >
        Skip to main content
      </a>

      {/* ── Top navigation ────────────────────────────────────────────── */}
      <header className="rf-topbar flex items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        {/* Brand */}
        <a
          href="/"
          className="flex min-h-11 items-center gap-2 no-underline sm:gap-2.5"
          aria-label="Ritmo Studio home"
        >
          <span className="rf-brand-mark" aria-hidden="true">
            R
          </span>
          <span className="font-display text-lg font-bold text-text-primary">Ritmo Studio</span>
        </a>

        {/* Anchor nav */}
        <nav
          aria-label="Marketing navigation"
          className="hidden items-center gap-4 lg:flex xl:gap-6"
        >
          <a
            href="#product"
            className="flex min-h-11 min-w-11 items-center justify-center font-ui text-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:text-text-primary"
          >
            Product
          </a>
          <a
            href="#method"
            className="flex min-h-11 min-w-11 items-center justify-center font-ui text-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:text-text-primary"
          >
            Method
          </a>
          <a
            href="#studios"
            className="flex min-h-11 min-w-11 items-center justify-center font-ui text-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:text-text-primary"
          >
            Live mode
          </a>
          <a
            href="#class-shape"
            className="flex min-h-11 min-w-11 items-center justify-center font-ui text-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:text-text-primary"
          >
            Learn the workflow
          </a>
        </nav>

        {/* CTA row */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="marketing-signin-btn"
            type="button"
            onClick={onSignIn}
            className="min-h-11 rounded-pill border border-interactive/30 px-3 font-ui text-sm text-interactive transition-colors hover:border-interactive/60 hover:text-interactive-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive sm:px-4"
          >
            Sign in
          </button>
          <button
            id="marketing-start-building-btn"
            type="button"
            aria-label="Start building"
            onClick={onStartBuilding}
            className="min-h-11 rounded-pill rf-btn-primary px-3 font-ui text-sm font-semibold text-text-on-accent sm:px-4"
          >
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Start building</span>
          </button>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main id="marketing-main" className="flex flex-col">
        {/* Hero */}
        <section
          aria-label="Hero"
          className="rf-heat-bloom grid min-h-[78svh] items-center gap-10 px-6 py-16 sm:px-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)] lg:gap-16 lg:px-24"
        >
          {/* Copy */}
          <div className="flex max-w-lg flex-col gap-5">
            <span className="rf-eyebrow">Built for instructors who create</span>
            <h1 className="font-display text-[clamp(2.4rem,5vw,3.25rem)] font-bold leading-[1.08] tracking-tight text-text-primary">
              Find the class inside the <span className="rf-heat-text">music.</span>
            </h1>
            <p className="font-ui text-body text-text-secondary">
              Source the right tracks. Shape the energy. Score the movement. Walk into Live knowing
              what comes next.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                id="marketing-hero-start-btn"
                type="button"
                onClick={onStartBuilding}
                className="rounded-pill rf-btn-primary px-6 py-2.5 font-ui font-semibold text-text-on-accent"
              >
                Start building
              </button>
              <a
                href="#class-shape"
                id="marketing-hero-shape-btn"
                className="rounded-pill border border-interactive/30 px-6 py-2.5 font-ui font-semibold text-interactive transition-colors hover:border-interactive/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
              >
                Learn the workflow
              </a>
            </div>
            <span className="font-ui text-sm text-text-tertiary">
              Private beta · Playback uses your connected provider account
            </span>
          </div>

          <CreatorLoopProof id="class-shape" />
        </section>

        {/* Feature grid */}
        <section
          id="product"
          aria-labelledby="features-heading"
          className="px-6 py-16 sm:px-12 lg:px-24"
        >
          <h2 id="features-heading" className="sr-only">
            Features
          </h2>
          <div
            className="grid gap-px overflow-hidden rounded-panel border border-border-subtle bg-border-subtle sm:grid-cols-2 lg:grid-cols-4"
            id="method"
          >
            <FeatureCard
              eyebrow="01 / Find"
              heading="Start with the right track."
              body="Browse provider catalogs or your authorized library, then carry the source into class work."
            />
            <FeatureCard
              eyebrow="02 / Shape"
              heading="Make the energy visible."
              body="Order tracks and assign intended effort so the class arc is readable before rehearsal."
            />
            <FeatureCard
              eyebrow="03 / Score"
              heading="Write what you will teach."
              body="Keep cues, movement, BPM, notes, and clip decisions attached to the track that needs them."
            />
            <FeatureCard
              id="studios"
              eyebrow="04 / Lead"
              heading="Run the room under pressure."
              body="Live keeps the current cue, next cue, time, effort, and provider truth in one pressure-safe view."
            />
          </div>
        </section>

        {/* Bottom CTA strip */}
        <section
          aria-label="Get started"
          className="flex flex-col items-center gap-6 px-6 py-20 text-center"
        >
          <span className="rf-eyebrow">Ready to build?</span>
          <h2 className="font-display text-[clamp(1.6rem,3.5vw,2.4rem)] font-bold leading-tight tracking-tight text-text-primary">
            Your next class starts with a track.
          </h2>
          <button
            id="marketing-bottom-cta-btn"
            type="button"
            onClick={onStartBuilding}
            className="rounded-pill rf-btn-primary px-8 py-3 font-ui text-base font-semibold text-text-on-accent"
          >
            Enter the private beta
          </button>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-border-subtle px-6 py-8 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-ui text-sm text-text-tertiary">
          <span>© {new Date().getFullYear()} Ritmo Studio · Built for instructors who create</span>
          <a
            href="/privacy"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-interactive hover:text-interactive-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
          >
            Privacy and data
          </a>
        </div>
      </footer>
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

interface FeatureCardProps {
  eyebrow: string;
  heading: string;
  body: string;
  id?: string;
}

function FeatureCard({ eyebrow, heading, body, id }: FeatureCardProps) {
  return (
    <article id={id} className="flex flex-col gap-3 bg-bg-raised p-6 scroll-mt-20">
      <span className="rf-eyebrow">{eyebrow}</span>
      <h3 className="font-display text-xl font-bold text-text-primary">{heading}</h3>
      <p className="font-ui text-sm text-text-secondary">{body}</p>
    </article>
  );
}
