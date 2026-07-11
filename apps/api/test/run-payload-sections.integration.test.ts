/**
 * Coverage for the additive `sections[].id` field on the run-payload (D21). Each
 * `class_sections` row already carries a stable DB `id`; the projection now emits it
 * (mirroring cue/move `id`) so Live/editor can correlate or deep-link a specific band
 * even when two sections share a `type`.
 *
 * The assembly is DB-bound (`assembleRunPayload` batches real queries), so presence +
 * stability can only be exercised end-to-end here — `run-payload.test.ts` unit-tests
 * the pure timeline helpers and has no database. Asserts: every section carries the
 * exact id returned at creation, ids are stable across two fetches, and two sections
 * sharing a `type` remain individually addressable by id.
 */
import { describe, expect, it } from 'vitest';
import { authed, signUpUser } from './helpers.js';

describe('run-payload sections[].id (integration)', () => {
  it('emits each section stable DB id, preserved across fetches', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    const classRes = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Section ids' }),
    });
    expect(classRes.status).toBe(201);
    const classId = ((await classRes.json()) as { id: string }).id;

    // Two bands sharing a `type` (climb) at different offsets — the exact case the id
    // disambiguates — plus a warm_up at the front. Created out of timeline order to
    // confirm the projection orders by startOffsetMs, not insertion order.
    const specs = [
      { type: 'climb', startOffsetMs: 300_000 },
      { type: 'warm_up', startOffsetMs: 0 },
      { type: 'climb', startOffsetMs: 600_000 },
    ];
    const createdIdByOffset = new Map<number, string>();
    for (const spec of specs) {
      const res = await api(`/api/v1/classes/${classId}/sections`, {
        method: 'POST',
        body: JSON.stringify(spec),
      });
      expect(res.status).toBe(201);
      createdIdByOffset.set(spec.startOffsetMs, ((await res.json()) as { id: string }).id);
    }

    type Section = { id: string; type: string; startOffsetMs: number };
    const fetchSections = async (): Promise<Section[]> => {
      const res = await api(`/api/v1/classes/${classId}/run-payload`);
      expect(res.status).toBe(200);
      return ((await res.json()) as { sections: Section[] }).sections;
    };

    const sections = await fetchSections();

    // Ordered by startOffsetMs; each carries the exact id returned at creation.
    expect(sections.map((s) => [s.type, s.startOffsetMs])).toEqual([
      ['warm_up', 0],
      ['climb', 300_000],
      ['climb', 600_000],
    ]);
    for (const s of sections) {
      expect(s.id).toBe(createdIdByOffset.get(s.startOffsetMs));
      expect(s.id).toMatch(/^[0-9a-f-]{36}$/);
    }

    // The two `climb` bands are individually addressable — distinct ids.
    const climbIds = sections.filter((s) => s.type === 'climb').map((s) => s.id);
    expect(new Set(climbIds).size).toBe(2);

    // Stable: a second assembly returns identical ids (not recomputed per request).
    const again = await fetchSections();
    expect(again.map((s) => s.id)).toEqual(sections.map((s) => s.id));
  });
});

/**
 * Free-mode `class.totalDurationMs` is the latest track END across all tracks
 * (`computeFreeTimeline` reduces `max(startOffsetMs + durationMs)`), not the last
 * track's end. The two are only ever different when an earlier track ends later than
 * a later-positioned one — which the no-overlap invariant permits solely for a
 * later-positioned track of zero/unknown effective duration. This pins that end-to-end
 * so a `last.start + last.duration` shortcut can't silently truncate a long opener in
 * Live Mode (the DB-bound assembly can only be exercised here; the pure max-end math
 * is unit-tested in `run-payload.test.ts`).
 */
describe('run-payload free-mode max-end duration (integration)', () => {
  it('totals to the latest track end, not the last-positioned track end', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    const classRes = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Free max-end' }),
    });
    expect(classRes.status).toBe(201);
    const classId = ((await classRes.json()) as { id: string }).id;

    // Long opener (300000ms) + a second track of unknown (null) duration.
    const opener = await api(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ track: { title: 'Opener', artist: 'A', durationMs: 300_000 } }),
    });
    expect(opener.status).toBe(201);
    const marker = await api(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ track: { title: 'Marker', artist: 'A' } }), // durationMs omitted -> null
    });
    expect(marker.status).toBe(201);

    // Switch to free placement; seedFreeOffsets lays them back-to-back (opener @0,
    // marker @300000, since the opener's 300000 duration precedes the null one).
    const toFree = await api(`/api/v1/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify({ timelineMode: 'free' }),
    });
    expect(toFree.status).toBe(200);

    type CT = { id: string; startOffsetMs: number };
    const cts = (await (await api(`/api/v1/classes/${classId}/tracks`)).json()) as CT[];
    const markerCt = cts.find((t) => t.startOffsetMs === 300_000)!;
    expect(markerCt).toBeTruthy();

    // Drag the zero-width marker back to 100000 — legal (a zero/unknown-duration track
    // can't overlap), but now the LAST-positioned track (the marker, offset 100000)
    // ends at 100000 while the earlier opener ends at 300000.
    const move = await api(`/api/v1/class-tracks/${markerCt.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ startOffsetMs: 100_000 }),
    });
    expect(move.status).toBe(200);

    const payload = (await (await api(`/api/v1/classes/${classId}/run-payload`)).json()) as {
      class: { timelineMode: string; totalDurationMs: number };
      tracks: Array<{ position: number; startOffsetMs: number }>;
    };

    // Tracks come back position-ordered by offset: opener @0 (pos 0), marker @100000
    // (pos 1, the last track — and it ends first).
    expect(payload.class.timelineMode).toBe('free');
    expect(payload.tracks.map((t) => [t.position, t.startOffsetMs])).toEqual([
      [0, 0],
      [1, 100_000],
    ]);
    // The invariant: the class total is the opener's end (300000), NOT the last
    // track's end (100000). A last-item-end shortcut would report 100000.
    expect(payload.class.totalDurationMs).toBe(300_000);
  });
});
