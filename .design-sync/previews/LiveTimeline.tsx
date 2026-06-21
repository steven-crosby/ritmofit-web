// LiveTimeline — the Live-mode scrubber: the static timeline brought into Live
// with a moving playhead and the played portion filled. An accessible slider
// (pointer + keyboard seek). Cells show the playhead at different elapsed times.
import { LiveTimeline } from '@ritmofit/web';
import { Surface } from './_ui.js';
import { demoClass, DEMO_TOTAL_MS } from './_fixtures.js';

export function MidClass() {
  return (
    <Surface>
      <span className="font-data text-xs uppercase tracking-wide text-text-tertiary">
        Live · seeking
      </span>
      <LiveTimeline payload={demoClass} elapsedMs={DEMO_TOTAL_MS * 0.45} onSeek={() => {}} />
    </Surface>
  );
}

export function NearStart() {
  return (
    <Surface>
      <LiveTimeline payload={demoClass} elapsedMs={DEMO_TOTAL_MS * 0.08} onSeek={() => {}} />
    </Surface>
  );
}

export function NearEnd() {
  return (
    <Surface>
      <LiveTimeline payload={demoClass} elapsedMs={DEMO_TOTAL_MS * 0.92} onSeek={() => {}} />
    </Surface>
  );
}
