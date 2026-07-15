/** Plain-language data notice for the invite-only, non-commercial private beta. */
export function PrivacyPage() {
  return (
    <main id="main-content" className="rf-heat-bloom min-h-screen px-5 py-10 sm:px-8 sm:py-16">
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-card bg-bg-raised p-6 shadow-card sm:p-10">
        <header className="flex flex-col gap-3 border-b border-border-subtle pb-6">
          <a
            href="/"
            className="self-start rounded-control font-ui text-sm font-semibold text-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
          >
            ← Back to Ritmo Studio
          </a>
          <span className="rf-eyebrow">Private beta</span>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            Privacy and data notice
          </h1>
          <p className="max-w-prose font-ui text-sm leading-6 text-text-secondary">
            Ritmo Studio is an invite-only, non-commercial beta built for a small group of
            instructors. This notice explains what it keeps and why.
          </p>
          <p className="font-data text-xs text-text-tertiary">Last updated July 14, 2026</p>
        </header>

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
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-semibold text-text-primary">{title}</h2>
      <div className="flex flex-col gap-3 font-ui text-sm leading-6 text-text-secondary">
        {children}
      </div>
    </section>
  );
}
