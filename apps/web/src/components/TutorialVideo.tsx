import { useEffect, useMemo, useRef, useState } from 'react';

export type TutorialVideoVariant = 'landing' | 'onboarding';

type TutorialFocus = 'find' | 'build' | 'shape' | 'cue' | 'live' | 'save';

interface TutorialScene {
  start: number;
  end: number;
  focus: TutorialFocus;
  eyebrow: string;
  headline: string;
  caption: string;
}

interface TutorialCut {
  label: string;
  descriptor: string;
  durationSeconds: number;
  scenes: TutorialScene[];
}

const CUTS: Record<TutorialVideoVariant, TutorialCut> = {
  landing: {
    label: 'Aha loop',
    descriptor: 'caption-only 68 second landing cut',
    durationSeconds: 68,
    scenes: [
      {
        start: 0,
        end: 11,
        focus: 'find',
        eyebrow: '01 / Find',
        headline: 'Start with a track, not a blank page.',
        caption: 'Search your catalog or add a trusted track from your own library.',
      },
      {
        start: 11,
        end: 24,
        focus: 'build',
        eyebrow: '02 / Stack',
        headline: 'Drop tracks into a ride that already has shape.',
        caption: 'The builder turns songs into a class stack with time, BPM, and intent.',
      },
      {
        start: 24,
        end: 38,
        focus: 'shape',
        eyebrow: '03 / Shape',
        headline: 'Make the energy arc visible before class.',
        caption: 'Intensity, sections, and timing show the class the room will feel.',
      },
      {
        start: 38,
        end: 52,
        focus: 'cue',
        eyebrow: '04 / Cue',
        headline: 'Choreograph the moments that matter.',
        caption: 'Add beat-matched cues, moves, notes, and coachable transitions.',
      },
      {
        start: 52,
        end: 63,
        focus: 'live',
        eyebrow: '05 / Lead',
        headline: 'Run Live Mode when the room is moving.',
        caption: 'Current cue, next cue, time, BPM, and provider handoff stay glanceable.',
      },
      {
        start: 63,
        end: 68,
        focus: 'save',
        eyebrow: '06 / Repeat',
        headline: 'Save the class. Teach it again.',
        caption: 'Your track stack, arc, and choreography stay ready for the next ride.',
      },
    ],
  },
  onboarding: {
    label: 'First class walkthrough',
    descriptor: 'caption-only 86 second post-signup cut',
    durationSeconds: 86,
    scenes: [
      {
        start: 0,
        end: 12,
        focus: 'build',
        eyebrow: 'Step 1',
        headline: 'Create a class and keep it in your library.',
        caption: 'New classes start in the left rail, then open into the builder.',
      },
      {
        start: 12,
        end: 27,
        focus: 'find',
        eyebrow: 'Step 2',
        headline: 'Add tracks from search, library, or manual entry.',
        caption: 'Use stable metadata: title, artist, duration, BPM, and provider reference.',
      },
      {
        start: 27,
        end: 42,
        focus: 'build',
        eyebrow: 'Step 3',
        headline: 'Arrange the track stack into the ride order.',
        caption: 'Sequential timing gives the class a reliable clock before you teach.',
      },
      {
        start: 42,
        end: 57,
        focus: 'shape',
        eyebrow: 'Step 4',
        headline: 'Set intensity and sections so the arc is readable.',
        caption: 'The energy ribbon makes warmup, climb, sprint, recovery, and peak obvious.',
      },
      {
        start: 57,
        end: 72,
        focus: 'cue',
        eyebrow: 'Step 5',
        headline: 'Add cues, moves, and notes on the beat.',
        caption: 'Cue timing, movement picks, and instructor notes stay attached to each track.',
      },
      {
        start: 72,
        end: 83,
        focus: 'live',
        eyebrow: 'Step 6',
        headline: 'Open Live Mode and lead from the prompter.',
        caption:
          'Live mode keeps the next action visible while music playback stays with providers.',
      },
      {
        start: 83,
        end: 86,
        focus: 'save',
        eyebrow: 'Ready',
        headline: 'Build the first class, then keep refining.',
        caption: 'Ritmo Studio keeps the class plan reusable without touching provider audio.',
      },
    ],
  },
};

const DEMO_TRACKS = [
  { title: 'First Light', artist: 'Pulse Lab', duration: '4:08', bpm: 124, intensity: 'easy' },
  { title: 'Cadence Lines', artist: 'North Room', duration: '3:42', bpm: 128, intensity: 'mod' },
  { title: 'Climb Signal', artist: 'Lift Crew', duration: '5:10', bpm: 132, intensity: 'hard' },
  { title: 'Drop Point', artist: 'Studio Nine', duration: '3:18', bpm: 138, intensity: 'all_out' },
] as const;

const SEARCH_RESULTS = [
  { title: 'Tempo Sketch', artist: 'Demo Catalog', meta: '3:48 · 126 BPM' },
  { title: 'Second Gear', artist: 'Demo Catalog', meta: '4:22 · 130 BPM' },
  { title: 'Peak Draft', artist: 'Demo Catalog', meta: '3:34 · 138 BPM' },
] as const;

const INTENSITY_CLASS: Record<(typeof DEMO_TRACKS)[number]['intensity'], string> = {
  easy: 'bg-intensity-easy',
  mod: 'bg-intensity-mod',
  hard: 'bg-intensity-hard',
  all_out: 'bg-intensity-all_out shadow-peak-glow',
};

export function TutorialVideo({
  variant,
  autoPlay = false,
  compact = false,
  className = '',
  id,
}: {
  variant: TutorialVideoVariant;
  autoPlay?: boolean;
  compact?: boolean;
  className?: string;
  id?: string;
}) {
  const cut = CUTS[variant];
  const reducedMotion = usePrefersReducedMotion();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const elapsedRef = useRef(elapsedSeconds);

  useEffect(() => {
    elapsedRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    setElapsedSeconds(0);
    setPlaying(autoPlay && !reducedMotion);
  }, [autoPlay, reducedMotion, variant]);

  useEffect(() => {
    if (!playing || typeof window === 'undefined') return;
    const startedAt = Date.now() - elapsedRef.current * 1000;
    const id = window.setInterval(() => {
      const next = (Date.now() - startedAt) / 1000;
      if (next >= cut.durationSeconds) {
        setElapsedSeconds(cut.durationSeconds);
        setPlaying(false);
      } else {
        setElapsedSeconds(next);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [cut.durationSeconds, playing]);

  const activeScene = useMemo<TutorialScene>(() => {
    const fallbackScene = cut.scenes.at(-1);
    if (!fallbackScene) throw new Error('Tutorial video cut has no scenes.');
    return (
      cut.scenes.find((scene) => elapsedSeconds >= scene.start && elapsedSeconds < scene.end) ??
      fallbackScene
    );
  }, [cut.scenes, elapsedSeconds]);

  const progressPct = Math.min(100, (elapsedSeconds / cut.durationSeconds) * 100);
  const activeIndex = cut.scenes.indexOf(activeScene);
  const remainingSeconds = Math.max(0, Math.ceil(cut.durationSeconds - elapsedSeconds));

  function startPlayback() {
    if (elapsedRef.current >= cut.durationSeconds) setElapsedSeconds(0);
    setPlaying(true);
  }

  function replay() {
    setElapsedSeconds(0);
    setPlaying(!reducedMotion);
  }

  return (
    <section
      id={id}
      aria-label={`${cut.label} tutorial video`}
      className={`flex flex-col gap-3 ${className}`}
    >
      <div className="overflow-hidden rounded-card border border-interactive/20 bg-bg-raised shadow-card">
        <div
          className={`relative overflow-hidden bg-bg-base ${
            compact ? 'h-[320px] sm:h-[340px]' : 'aspect-video min-h-[340px] sm:min-h-0'
          }`}
        >
          <div className="absolute inset-0 flex flex-col gap-3 p-3 sm:gap-4 sm:p-4">
            <MockHeader focus={activeScene.focus} />
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[minmax(120px,0.55fr)_minmax(0,1.45fr)] lg:grid-cols-[150px_minmax(0,1.5fr)_180px]">
              <MockLibrary active={activeScene.focus === 'build' || activeScene.focus === 'save'} />
              <MockWorkspace
                focus={activeScene.focus}
                activeIndex={activeIndex}
                compact={compact}
              />
              <MockInspector focus={activeScene.focus} />
            </div>
          </div>
        </div>

        <div className="border-t border-interactive/20 bg-bg-overlay px-3 py-3 sm:px-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <span className="rf-eyebrow">{activeScene.eyebrow}</span>
              <h3 className="mt-1 font-display text-base font-semibold text-text-primary sm:text-lg">
                {activeScene.headline}
              </h3>
              <p className="mt-1 font-ui text-xs text-text-secondary sm:text-sm">
                {activeScene.caption}
              </p>
            </div>
            <span className="shrink-0 font-data text-xs text-text-tertiary">
              {formatClock(elapsedSeconds)} / {formatClock(cut.durationSeconds)}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-bg-base" aria-hidden="true">
            <div
              className="h-full rounded-pill bg-interactive transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-interactive/20 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (playing ? setPlaying(false) : startPlayback())}
              aria-label={playing ? 'Pause tutorial video' : 'Play tutorial video'}
              className="rounded-pill border border-interactive/40 px-3 py-1.5 font-ui text-xs font-semibold text-interactive transition-colors hover:bg-interactive/10"
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={replay}
              aria-label="Replay tutorial video"
              className="rounded-pill border border-interactive/30 px-3 py-1.5 font-ui text-xs text-text-secondary transition-colors hover:text-text-primary"
            >
              Replay
            </button>
          </div>
          <p className="font-ui text-xs text-text-tertiary">
            {cut.descriptor} · {remainingSeconds}s left
          </p>
        </div>
      </div>
    </section>
  );
}

function MockHeader({ focus }: { focus: TutorialFocus }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card bg-bg-raised/90 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="rf-brand-mark scale-75" aria-hidden="true">
          R
        </span>
        <div className="min-w-0">
          <p className="truncate font-ui text-xs font-semibold text-text-primary">
            Saturday rhythm build
          </p>
          <p className="font-data text-[10px] text-text-tertiary">42:18 · 9 tracks · 129 BPM</p>
        </div>
      </div>
      <div className="hidden items-center gap-1.5 sm:flex">
        {(['find', 'shape', 'cue', 'live'] as TutorialFocus[]).map((item) => (
          <span
            key={item}
            className={`rounded-pill border px-2 py-1 font-data text-[10px] uppercase ${
              item === focus
                ? 'border-interactive bg-interactive/15 text-text-primary'
                : 'border-interactive/20 text-text-tertiary'
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function MockLibrary({ active }: { active: boolean }) {
  return (
    <aside
      className={`hidden min-h-0 flex-col gap-2 rounded-card bg-bg-raised/80 p-3 transition-opacity sm:flex ${
        active ? 'opacity-100' : 'opacity-75'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-data text-[10px] uppercase text-text-tertiary">Library</span>
        <span className="font-data text-[10px] text-text-tertiary">3</span>
      </div>
      {['Saturday rhythm build', 'Studio climb', 'Tempo reset'].map((title, index) => (
        <div
          key={title}
          className={`rounded-card border p-2 ${
            index === 0
              ? 'border-interactive bg-interactive/10'
              : 'border-interactive/10 bg-bg-base/70'
          }`}
        >
          <p className="truncate font-ui text-[11px] font-medium text-text-primary">{title}</p>
          <p className="mt-0.5 font-data text-[10px] text-text-tertiary">
            {index === 0 ? '4 tracks · 16:18' : 'draft'}
          </p>
        </div>
      ))}
    </aside>
  );
}

function MockWorkspace({
  focus,
  activeIndex,
  compact,
}: {
  focus: TutorialFocus;
  activeIndex: number;
  compact: boolean;
}) {
  const showSearch = focus === 'find';
  const showCue = focus === 'cue';
  const showLive = focus === 'live';
  return (
    <div className="min-w-0 rounded-card bg-bg-raised/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-data text-[10px] uppercase text-text-tertiary">Builder</p>
          <h4 className="mt-1 truncate font-display text-sm font-semibold text-text-primary">
            Warmup to all-out
          </h4>
        </div>
        <span className="rounded-pill bg-bg-base px-2 py-1 font-data text-[10px] text-text-tertiary">
          Sequential
        </span>
      </div>

      <EnergyRibbon activeIndex={activeIndex} />

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div
          className={`rounded-card border border-interactive/15 bg-bg-base/80 p-2 transition-opacity ${
            showSearch ? 'opacity-100 ring-2 ring-interactive/60' : 'opacity-60'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-ui text-[11px] font-semibold text-text-primary">Track search</p>
            <span className="font-data text-[10px] text-text-tertiary">Catalog</span>
          </div>
          <div className="mt-2 rounded-pill border border-interactive/20 px-3 py-1.5 font-ui text-[11px] text-text-tertiary">
            tempo 126 warmup
          </div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {SEARCH_RESULTS.map((result, index) => (
              <li
                key={result.title}
                className={`rounded-card px-2 py-1.5 ${
                  index === 0 ? 'bg-interactive/10' : 'bg-bg-raised/70'
                }`}
              >
                <p className="truncate font-ui text-[11px] text-text-primary">{result.title}</p>
                <p className="truncate font-data text-[10px] text-text-tertiary">
                  {result.artist} · {result.meta}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`rounded-card border border-interactive/15 bg-bg-base/80 p-2 ${
            focus === 'build' || focus === 'shape' ? 'ring-2 ring-interactive/60' : ''
          }`}
        >
          <p className="font-ui text-[11px] font-semibold text-text-primary">Track stack</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {DEMO_TRACKS.map((track, index) => (
              <li
                key={track.title}
                className="flex items-center gap-2 rounded-card bg-bg-raised/80 p-2"
              >
                <span className={`h-8 w-1.5 rounded-pill ${INTENSITY_CLASS[track.intensity]}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-ui text-[11px] text-text-primary">
                    {index + 1}. {track.title}
                  </span>
                  <span className="block font-data text-[10px] text-text-tertiary">
                    {track.artist} · {track.duration} · {track.bpm}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className={`mt-3 rounded-card border border-interactive/15 bg-bg-base/80 p-2 transition-opacity ${
          compact && !showCue ? 'hidden' : ''
        } ${showCue ? 'opacity-100 ring-2 ring-interactive/60' : 'opacity-65'}`}
      >
        <div className="flex flex-wrap gap-1.5">
          {['Add resistance', 'Saddle push', 'Beat drop', 'Recover'].map((cue, index) => (
            <span
              key={cue}
              className={`rounded-pill px-2 py-1 font-ui text-[10px] ${
                showCue && index === 2
                  ? 'bg-intensity-all_out text-text-on-accent shadow-peak-glow'
                  : 'bg-bg-raised text-text-secondary'
              }`}
            >
              {cue}
            </span>
          ))}
        </div>
      </div>

      <div
        className={`mt-3 rounded-card border border-interactive/20 bg-bg-live p-3 transition-opacity ${
          compact && !showLive ? 'hidden' : ''
        } ${showLive ? 'opacity-100 ring-2 ring-interactive/60' : 'opacity-60'}`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-data text-[10px] uppercase text-text-tertiary">Live mode</span>
          <span className="font-data text-[10px] text-interactive">Provider handoff ready</span>
        </div>
        <p className="mt-2 font-display text-sm font-semibold text-text-primary">
          Next cue: all-out attack in 0:16
        </p>
      </div>
    </div>
  );
}

function EnergyRibbon({ activeIndex }: { activeIndex: number }) {
  const widths = [18, 18, 24, 20, 20];
  const fills = [
    'bg-intensity-easy',
    'bg-intensity-mod',
    'bg-intensity-hard',
    'bg-intensity-all_out',
    'bg-intensity-hard',
  ];
  return (
    <div className="mt-3 rounded-card bg-bg-base/80 p-2">
      <div className="flex h-12 items-end gap-1.5">
        {widths.map((width, index) => (
          <span
            key={`${width}-${index}`}
            className={`rounded-t-control ${fills[index]} ${
              index === Math.min(activeIndex, fills.length - 1) ? 'ring-2 ring-interactive/80' : ''
            }`}
            style={{ width: `${width}%`, height: `${28 + index * 7}px` }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

function MockInspector({ focus }: { focus: TutorialFocus }) {
  return (
    <aside className="hidden min-h-0 flex-col gap-2 rounded-card bg-bg-raised/80 p-3 lg:flex">
      <p className="font-data text-[10px] uppercase text-text-tertiary">Inspector</p>
      <InspectorRow
        label="Intensity"
        value={focus === 'shape' ? 'Hard' : 'Mod'}
        active={focus === 'shape'}
      />
      <InspectorRow
        label="BPM"
        value={focus === 'find' ? '126' : '132'}
        active={focus === 'find'}
      />
      <InspectorRow
        label="Move"
        value={focus === 'cue' ? 'Tap back' : 'Climb'}
        active={focus === 'cue'}
      />
      <InspectorRow
        label="Notes"
        value={focus === 'live' ? 'Glanceable' : 'Ready'}
        active={focus === 'live'}
      />
    </aside>
  );
}

function InspectorRow({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div
      className={`rounded-card border p-2 ${
        active ? 'border-interactive bg-interactive/10' : 'border-interactive/10 bg-bg-base/70'
      }`}
    >
      <p className="font-data text-[10px] uppercase text-text-tertiary">{label}</p>
      <p className="mt-1 truncate font-ui text-[11px] font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function formatClock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  return reduced;
}
