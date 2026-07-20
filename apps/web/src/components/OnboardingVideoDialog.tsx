import { useRef } from 'react';
import { Dialog } from './Dialog.js';
import { TutorialVideo } from './TutorialVideo.js';

export function OnboardingVideoDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const counts = [
    ['1 · Find', 'Bring music, a playlist, a movement pairing, or a manual track.'],
    ['2 · Shape', 'Order tracks and enter real durations so the clock stays honest.'],
    ['3 · Score', 'Add your intended effort; Class Pulse derives only what you entered.'],
    ['4 · Lead', 'Confirm the shape, rehearse the run of show, then open Live Mode.'],
  ] as const;

  return (
    <Dialog
      onClose={onClose}
      label="New instructor four-count tutorial"
      initialFocusRef={closeRef}
      panelClassName="flex max-h-[calc(100svh-2rem)] w-full max-w-5xl flex-col gap-4 overflow-y-auto rounded-panel bg-bg-raised p-4 shadow-lifted sm:p-5"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="rf-eyebrow">Start here</span>
          <h2 className="mt-1 font-display text-xl font-semibold text-text-primary">
            Build your first class in four counts
          </h2>
          <p className="mt-1 font-ui text-sm text-text-secondary">
            An inspectable, captioned path through the creator loop. Skip it now; the same four
            routes remain visible in Classes.
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="min-h-11 rounded-control px-3 font-ui text-sm text-text-tertiary hover:text-text-primary sm:rounded-pill"
          onClick={onClose}
          aria-label="Skip tutorial"
        >
          Skip
        </button>
      </header>

      <ol className="grid gap-2 sm:grid-cols-2" aria-label="Four-count class-building guide">
        {counts.map(([title, detail]) => (
          <li key={title} className="rounded-card border border-border-subtle bg-bg-sunken p-3">
            <h3 className="font-data text-xs font-semibold uppercase tracking-wide text-text-primary">
              {title}
            </h3>
            <p className="mt-1 font-ui text-xs leading-5 text-text-secondary">{detail}</p>
          </li>
        ))}
      </ol>

      <TutorialVideo variant="onboarding" autoPlay compact />

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-ui text-xs text-text-tertiary">
          Keyboard-operable, captioned, and always skippable.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-control rf-btn-primary px-5 font-ui text-sm font-semibold text-text-on-accent sm:rounded-pill"
        >
          Start building
        </button>
      </footer>
    </Dialog>
  );
}
