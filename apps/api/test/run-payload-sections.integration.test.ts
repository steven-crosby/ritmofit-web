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
