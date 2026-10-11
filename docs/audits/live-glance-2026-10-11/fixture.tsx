// Synthetic presentation fixture. No account, provider reference, or provider audio.
import React from 'react';
import { createRoot } from 'react-dom/client';
import type { RunPayload } from '../../../packages/shared/src/index';
import { LiveMode } from '../../../apps/web/src/components/LiveMode';
import '../../../apps/web/src/index.css';

const variant = new URLSearchParams(location.search).get('variant') ?? 'short';
const longCue =
  'Keep shoulders relaxed, breathe steadily, and hold a smooth seated rhythm. Stay tall through the spine, soften your grip, keep knees tracking forward, and prepare to add resistance with control.';
const count = variant.includes('count');
const holds = variant.includes('holds');
const sections = variant.includes('section');
const payload: RunPayload = {
  schemaVersion: 1,
  class: {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Synthetic portrait ride',
    template: 'cycle',
    targetDurationMs: null,
    timelineMode: 'sequential',
    totalDurationMs: 720000,
  },
  tracks: [0, 1, 2].map((index) => ({
    classTrackId: `synthetic-track-${index}`,
    position: index,
    startOffsetMs: index * 240000,
    displayBpm: 124,
    displayRpm: null,
    holdCount: holds ? 8 : null,
    intensity: 'mod',
    clipStartMs: 0,
    beatAnchorMs: 0,
    notes: 'Synthetic instructor guidance. Keep the full cue available in Full List.',
    providerRefs: [],
    track: {
      id: `synthetic-song-${index}`,
      title: `Synthetic song ${index + 1}`,
      artist: 'Local fixture',
      durationMs: 240000,
      baseDurationMs: 240000,
      albumArtUrl: null,
    },
    cues: [
      {
        id: `current-${index}`,
        anchorMs: 0,
        text: variant === 'short' ? 'Find your rhythm' : longCue,
        bar: count ? 12 : null,
        beat: count ? 4 : null,
        color: null,
      },
      {
        id: `next-${index}`,
        anchorMs: 90000,
        text: 'Add a quarter turn and stay seated with a smooth, controlled cadence.',
        bar: null,
        beat: null,
        color: null,
      },
    ],
    moves: [],
  })),
  sections: sections
    ? [
        { id: 'section-1', type: 'warm_up', startOffsetMs: 0 },
        { id: 'section-2', type: 'sprint', startOffsetMs: 60000 },
      ]
    : [],
};

const realFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.endsWith('/api/v1/providers/connections')) {
    return Promise.resolve(new Response('[]', { headers: { 'Content-Type': 'application/json' } }));
  }
  if (url.includes('/api/')) throw new Error(`Unexpected API request: ${url}`);
  return realFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <LiveMode payload={payload} onExit={() => location.reload()} />,
);
