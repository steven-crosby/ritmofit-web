/** Local synthetic Builder fixture. No authenticated account or provider is involved. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Dashboard } from '../../../apps/web/src/components/Dashboard';
import '../../../apps/web/src/index.css';

const classId = '00000000-0000-4000-8000-000000000001';
const trackIds = ['00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102'];
const titles = ['First Light', 'Second Song'];
let order = [...trackIds];
let failRead = false;
const calls: Array<{ path: string; method: string }> = [];
const cls = {
  id: classId, ownerUserId: 'synthetic', title: 'Refresh integrity ride', description: null,
  template: 'cycle', status: 'draft', visibility: 'private', timelineMode: 'sequential',
  targetDurationMs: null, scaffoldRecipeId: null, createdAt: 1, updatedAt: 1,
  lastOpenedAt: null, featuredCategory: null, coverImageUrl: null, tags: [],
  accessLevel: 'owner', trackCount: 2, totalDurationMs: 420000, albumArtUrls: [],
};
const tracks = () => order.map((id, position) => ({
  id, classId, trackId: id, position, intensity: 'mod', displayBpmOverride: null,
  displayRpm: null, holdCount: null, durationMsOverride: null, clipStartMs: 0,
  clipEndMs: null, beatAnchorMs: null, startOffsetMs: position ? 240000 : 0,
  notes: null, createdAt: 1, updatedAt: 1,
}));
const payload = () => ({
  schemaVersion: 1,
  class: { ...cls, totalDurationMs: 420000 },
  tracks: tracks().map((t) => ({
    classTrackId: t.id, position: t.position, startOffsetMs: t.startOffsetMs,
    displayBpm: 120, displayRpm: null, holdCount: null, intensity: t.intensity,
    notes: null, clipStartMs: 0, clipEndMs: null, beatAnchorMs: 0, providerRefs: [],
    track: { id: t.id, title: titles[trackIds.indexOf(t.id)], artist: 'Synthetic artist',
      durationMs: t.id === trackIds[0] ? 240000 : 180000,
      baseDurationMs: t.id === trackIds[0] ? 240000 : 180000,
      albumArtUrl: null, displayBpm: 120 },
    cues: [], moves: [],
  })),
});
Object.assign(window, { __builderFixture: { calls } });
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
  if (!url.pathname.startsWith('/api/')) return originalFetch(input, init);
  const path = url.pathname.replace('/api/v1', '');
  const method = init?.method ?? 'GET';
  calls.push({ path, method });
  let body: unknown = [];
  let status = 200;
  if (path === '/classes') body = [cls];
  else if (path === `/classes/${classId}/tracks/reorder`) {
    order = (JSON.parse(String(init?.body)) as { classTrackIds: string[] }).classTrackIds;
    failRead = true;
    body = tracks();
  } else if (path === `/classes/${classId}/tracks`) {
    if (failRead) {
      failRead = false;
      status = 503;
      body = { error: { code: 'SYNTHETIC_UNAVAILABLE', message: 'Latest read unavailable' } };
    } else body = tracks();
  } else if (path === `/classes/${classId}/run-payload`) body = payload();
  else if (!(/\/plan-blocks$|\/cues$|\/moves$|\/user-moves$|\/providers\/connections$/.test(path))) {
    status = 500;
    body = { error: { code: 'UNEXPECTED_FIXTURE_REQUEST', message: `Unstubbed fixture route: ${path}` } };
  }
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
};
createRoot(document.getElementById('root')!).render(
  <StrictMode><Dashboard userId="synthetic" userName="Synthetic instructor" /></StrictMode>,
);
