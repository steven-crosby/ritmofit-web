/**
 * Track/class artwork with a derived fallback (design system `05-components.md`
 * "Song row"): "Real art wins; otherwise use a derived rhythmic tile keyed to
 * known BPM/energy. Never fall back to a bare music-note placeholder on a
 * signature track surface."
 *
 * Deliberately keyed by BPM (a source-level track attribute), never by
 * intensity/energy — Library and other browse surfaces must not infer or
 * display class intensity before a track is added to a class
 * (`11-library-guidelines.md`), so this stays safe wherever it's used,
 * including pre-class-context rows.
 *
 * Purely decorative: the adjacent title/artist text already names the track
 * for every caller, so this stays `aria-hidden` exactly like the bare-glyph
 * fallback it replaces — no new accessible name is introduced.
 *
 * The palette is restricted to the copper/amber/ember warm family on purpose:
 * cyan and plasma are reserved (interaction, peak) and must never be spent on
 * decoration (`02-color-system.md`).
 */

/** Warm gradient stops only — see module doc for why cyan/plasma are excluded. */
const GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ['#F7B987', '#C8682A'], // copper-200 -> copper-600
  ['#E07E3C', '#E8654F'], // copper-400 -> ember-400
  ['#F2B838', '#A8521C'], // amber-400 -> copper-600
  ['#EE7A66', '#7A3B12'], // ember-300 -> copper-700
  ['#F0975A', '#B83A2B'], // copper-300 -> ember-600
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Tempo band when BPM is known (same tile for the same tempo everywhere it
 * appears); otherwise a stable hash of the track's own identity. Never random
 * per render — "derived", not decorative noise. */
function gradientFor(identity: string, bpm?: number | null): readonly [string, string] {
  const index =
    bpm != null && bpm > 0
      ? Math.min(GRADIENTS.length - 1, Math.floor(bpm / 30))
      : hashString(identity) % GRADIENTS.length;
  return GRADIENTS[index]!;
}

export function TrackArt({
  url,
  identity,
  bpm,
  size = 44,
  className = '',
}: {
  /** Real artwork URL, when the track/class has one. */
  url?: string | null;
  /** Stable per-item text (title, or title+artist) the fallback tile is keyed from. */
  identity: string;
  /** Track BPM, when known — takes priority over the identity hash. */
  bpm?: number | null;
  /** Square size in px; matches the 44pt song-row convention by default. */
  size?: number;
  className?: string;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-card object-cover ${className}`}
      />
    );
  }
  const [from, to] = gradientFor(identity, bpm);
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${from}, ${to})` }}
      className={`shrink-0 rounded-card ${className}`}
    />
  );
}

/**
 * Derived class cover (Apple Music "Made for You" style): the class's own gradient
 * with its title set on the art. Keyed by class id, so it matches the list card's
 * zero-art tile and survives renames.
 *
 * Text is ink (`text-on-accent`) — the design system's text-on-copper rule — because
 * white fails on every light gradient stop. It sits top-left (the light end of the
 * 135° gradient), bold at 19px (WCAG "large text", 3:1), clamped to two lines: the
 * worst pixel under that box is ~3.4:1 on the darkest pair; most of it is far higher.
 * Only for cover sizes — at 44px a title is unreadable, so list tiles stay plain.
 *
 * Sized so ordinary title words fit whole: at 120px (sm+) with 6px padding and
 * -0.025em tracking the text box is 108px, which holds "Wednesday" (~105px). Phones
 * keep 96px (84px box: "Saturday" fits, "Wednesday" doesn't) because the larger tile
 * squeezes the truncating class heading beside it. The font can't shrink instead —
 * below 18.67px bold it stops being large text and fails contrast.
 * Chromium won't hyphenate capitalized words, so `hyphens` doesn't help here;
 * `overflow-wrap:anywhere` only catches longer outliers.
 *
 * Decorative: the visible class heading beside it names the class, so the whole
 * tile stays `aria-hidden` and adds no accessible name.
 */
export function ClassCoverArt({ classId, title }: { classId: string; title: string }) {
  const [from, to] = gradientFor(classId);
  return (
    <span
      aria-hidden
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      className="block h-24 w-24 shrink-0 rounded-card p-1.5 sm:h-[120px] sm:w-[120px]"
    >
      <span className="line-clamp-2 break-words font-display text-[19px] font-bold leading-[1.1] tracking-[-0.025em] text-text-on-accent [overflow-wrap:anywhere]">
        {title}
      </span>
    </span>
  );
}
