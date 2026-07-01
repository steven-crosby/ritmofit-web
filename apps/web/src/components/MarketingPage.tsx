/**
 * Public marketing landing — the signed-out front door at "/".
 * Content from ritmofit_design_system/mockups/marketing.html.
 * Uses existing index.css recipes: rf-topbar, rf-brand-mark, rf-eyebrow,
 * rf-heat-bloom, rf-heat-text, rf-btn-primary.
 */
import { TutorialVideo } from './TutorialVideo.js';

interface MarketingPageProps {
  /** Called when the user clicks "Sign in" or "Start building". */
  onSignIn: () => void;
}

export function MarketingPage({ onSignIn }: MarketingPageProps) {
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
          className="flex items-center gap-2 no-underline sm:gap-2.5"
          aria-label="RitmoFit home"
        >
          <span className="rf-brand-mark" aria-hidden="true">
            R
          </span>
          <span className="font-display text-lg font-bold text-text-primary">RitmoFit</span>
        </a>

        {/* Anchor nav */}
        <nav aria-label="Marketing navigation" className="hidden items-center gap-6 sm:flex">
          <a
            href="#product"
            className="font-ui text-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:text-text-primary"
          >
            Product
          </a>
          <a
            href="#method"
            className="font-ui text-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:text-text-primary"
          >
            Method
          </a>
          <a
            href="#studios"
            className="font-ui text-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:text-text-primary"
          >
            For studios
          </a>
        </nav>

        {/* CTA row */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="marketing-signin-btn"
            type="button"
            onClick={onSignIn}
            className="rounded-pill border border-interactive/30 px-3 py-1.5 font-ui text-sm text-interactive transition-colors hover:border-interactive/60 hover:text-interactive-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive sm:px-4"
          >
            Sign in
          </button>
          <button
            id="marketing-start-building-btn"
            type="button"
            aria-label="Start building"
            onClick={onSignIn}
            className="rounded-pill rf-btn-primary px-3 py-1.5 font-ui text-sm font-semibold text-text-on-accent sm:px-4"
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
          className="rf-heat-bloom flex min-h-[80svh] flex-col items-start justify-center gap-10 px-6 py-16 sm:px-12 lg:flex-row lg:items-center lg:gap-16 lg:px-24"
        >
          {/* Copy */}
          <div className="flex max-w-lg flex-col gap-5">
            <span className="rf-eyebrow">Built for instructors who create</span>
            <h1 className="font-display text-[clamp(2.4rem,5vw,3.25rem)] font-bold leading-[1.08] tracking-tight text-text-primary">
              Find the class inside the <span className="rf-heat-text">music.</span>
            </h1>
            <p className="font-ui text-body text-text-secondary">
              Anyone can press play. You build the room — track by track, cue by cue, from the music
              up.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                id="marketing-hero-start-btn"
                type="button"
                onClick={onSignIn}
                className="rounded-pill rf-btn-primary px-6 py-2.5 font-ui font-semibold text-text-on-accent"
              >
                Start building
              </button>
              <a
                href="#class-shape"
                id="marketing-hero-shape-btn"
                className="rounded-pill border border-interactive/30 px-6 py-2.5 font-ui font-semibold text-interactive transition-colors hover:border-interactive/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
              >
                See class shape
              </a>
            </div>
            <span className="font-ui text-sm text-text-tertiary">
              Music providers connected by approved handoff
            </span>
          </div>

          <TutorialVideo
            id="class-shape"
            variant="landing"
            autoPlay
            className="w-full max-w-2xl scroll-mt-20"
          />
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
          <div className="grid gap-4 sm:grid-cols-3" id="method">
            <FeatureCard
              eyebrow="01 / Find"
              heading="Start with your music."
              body="Select saved tracks in Library and carry them directly into a new class. The music and the authoring workflow stay connected."
            />
            <FeatureCard
              eyebrow="02 / Shape"
              heading="Make the energy visible."
              body="Sequence tracks, assign effort, score movement, and see the class become a shape before the room hears the first beat."
              id="studios"
            />
            <FeatureCard
              eyebrow="03 / Perform"
              heading="Lead without losing the beat."
              body="Live mode puts current cue, next cue, BPM, time, and intensity where an instructor can read them while moving."
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
            onClick={onSignIn}
            className="rounded-pill rf-btn-primary px-8 py-3 font-ui text-base font-semibold text-text-on-accent"
          >
            Start building — it’s free
          </button>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-border-subtle px-6 py-8 text-center">
        <span className="font-ui text-sm text-text-tertiary">
          © {new Date().getFullYear()} RitmoFit · Built for instructors who create
        </span>
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
    <article
      id={id}
      className="flex flex-col gap-3 rounded-card bg-bg-raised p-6 shadow-card scroll-mt-20"
    >
      <span className="rf-eyebrow">{eyebrow}</span>
      <h3 className="font-display text-xl font-bold text-text-primary">{heading}</h3>
      <p className="font-ui text-sm text-text-secondary">{body}</p>
    </article>
  );
}
