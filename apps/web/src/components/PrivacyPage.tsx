/** Plain-language data notice for the invite-only, non-commercial private beta. */
export function PrivacyPage() {
  return (
    <main id="main-content" className="rf-heat-bloom min-h-screen px-5 py-10 sm:px-8 sm:py-16">
      <article className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-border-subtle pb-8">
          <a
            href="/"
            className="inline-flex min-h-11 items-center self-start rounded-control px-2 font-ui text-sm font-semibold text-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
          >
            ← Back to Ritmo Studio
          </a>
          <span className="rf-eyebrow">Privacy &amp; data</span>
          <h1 className="max-w-2xl font-display text-[clamp(2.4rem,6vw,4.5rem)] font-bold leading-[0.96] tracking-tight text-text-primary">
            Privacy without mystery.
          </h1>
          <p className="max-w-2xl font-ui text-base leading-7 text-text-secondary">
            Ritmo Studio is an invite-only, non-commercial beta built for a small group of
            instructors. This notice explains what it keeps and why.
          </p>
          <p className="font-data text-xs text-text-tertiary">Last updated July 14, 2026</p>
        </header>

        <section
          aria-label="Data boundary summary"
          className="grid gap-px overflow-hidden rounded-panel border border-border-subtle bg-border-subtle sm:grid-cols-3"
        >
          <BoundarySummary
            number="1"
            title="Ritmo keeps the class plan"
            detail="Classes, order, timing, choreography, cues, notes, preferences, and provider references."
          />
          <BoundarySummary
            number="2"
            title="Providers own the audio"
            detail="Spotify, Apple Music, and SoundCloud control streams, authorization, and availability."
          />
          <BoundarySummary
            number="3"
            title="Connections stay controllable"
            detail="Provider links can be removed from Account while Live remains usable as a prompter."
          />
        </section>

        <NoticeSection title="What Ritmo keeps">
          <ul className="list-disc space-y-2 pl-5">
            <li>Your email, display name, profile image, and secure account/session records.</li>
            <li>Your classes, track order, timing, choreography, cues, notes, and preferences.</li>
            <li>
              Connected-provider references and displayed track details such as title, artist,
              duration, and artwork.
            </li>
            <li>
              Provider access and refresh tokens encrypted at rest. Provider passwords are never
              collected.
            </li>
          </ul>
        </NoticeSection>

        <NoticeSection title="How it is used">
          <p>
            Data is used only to operate the beta: authenticate you, save your work, connect your
            chosen music services, and run previews or Live Mode. Ritmo does not sell personal data,
            run advertising, or use provider music to train models.
          </p>
        </NoticeSection>

        <NoticeSection title="Music providers">
          <p>
            Spotify, Apple Music, and SoundCloud remain responsible for their audio streams,
            subscriptions, catalog availability, and provider accounts. Ritmo uses their authorized
            SDKs, widgets, and APIs; it does not download, proxy, mix, analyze, or cache provider
            audio.
          </p>
        </NoticeSection>

        <NoticeSection title="Disconnecting and deletion">
          <p>
            Disconnecting a music provider removes its tokens immediately and schedules removal of
            its provider references and artwork within seven days. Class-plan details such as title,
            artist, and duration may remain so an existing class does not become unreadable.
          </p>
          <p>
            To request complete account and class-data deletion during the beta, reply to the person
            who invited you. Self-service deletion will be added before access expands beyond the
            private beta.
          </p>
        </NoticeSection>

        <NoticeSection title="Beta boundary">
          <p>
            Access is limited to invited instructors. The beta is not currently sold or marketed as
            a commercial studio music service. Provider connections can be removed at any time from
            Account → Music connections, and Live Mode can run as a prompter without provider audio.
          </p>
        </NoticeSection>
      </article>
    </main>
  );
}

function NoticeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-border-subtle pt-6 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-8">
      <h2 className="font-display text-xl font-semibold text-text-primary">{title}</h2>
      <div className="flex flex-col gap-3 font-ui text-sm leading-6 text-text-secondary">
        {children}
      </div>
    </section>
  );
}

function BoundarySummary({
  number,
  title,
  detail,
}: {
  number: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="bg-bg-raised p-5">
      <span className="font-data text-xs text-interactive" aria-hidden="true">
        {number.padStart(2, '0')}
      </span>
      <h2 className="mt-3 font-display text-lg font-semibold text-text-primary">{title}</h2>
      <p className="mt-2 font-ui text-xs leading-5 text-text-secondary">{detail}</p>
    </div>
  );
}
