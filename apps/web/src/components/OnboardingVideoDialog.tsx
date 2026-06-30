import { useRef } from 'react';
import { Dialog } from './Dialog.js';
import { TutorialVideo } from './TutorialVideo.js';

export function OnboardingVideoDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      onClose={onClose}
      label="New instructor tutorial video"
      initialFocusRef={closeRef}
      panelClassName="flex max-h-[calc(100svh-2rem)] w-full max-w-5xl flex-col gap-4 overflow-y-auto rounded-panel bg-bg-raised p-4 shadow-lifted sm:p-5"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="rf-eyebrow">Start here</span>
          <h2 className="mt-1 font-display text-xl font-semibold text-text-primary">
            Build your first class in one loop
          </h2>
          <p className="mt-1 font-ui text-sm text-text-secondary">
            A caption-only guided pass through finding tracks, shaping the ride, cueing, and opening
            Live Mode.
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="rounded-pill px-2 py-1 font-ui text-sm text-text-tertiary hover:text-text-primary"
          onClick={onClose}
          aria-label="Close tutorial video"
        >
          Close
        </button>
      </header>

      <TutorialVideo variant="onboarding" autoPlay compact />

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-ui text-xs text-text-tertiary">
          Focused on the core loop: find tracks, shape the ride, cue it, and run Live Mode.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-pill rf-btn-primary px-5 py-2 font-ui text-sm font-semibold text-text-on-accent"
        >
          Start building
        </button>
      </footer>
    </Dialog>
  );
}
