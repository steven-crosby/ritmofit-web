// TimelineStrip — the planning timeline beneath the energy ribbon: proportional
// track blocks with ▲ cue / ◆ move markers (distinct shapes, not just color) at
// their absolute time. Read-only and interactive (selectable) variants.
import { TimelineStrip } from '@ritmofit/web';
import { Surface } from './_ui.js';
import { demoClass } from './_fixtures.js';

export function ReadOnly() {
  return (
    <Surface>
      <TimelineStrip payload={demoClass} />
    </Surface>
  );
}

export function Selectable() {
  const firstTrackId = demoClass.tracks[2]?.classTrackId ?? null;
  return (
    <Surface>
      <TimelineStrip payload={demoClass} selectedTrackId={firstTrackId} onSelectTrack={() => {}} />
    </Surface>
  );
}
