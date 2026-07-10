import { describe, expect, it } from 'vitest';
import {
  CONTRACT_PARITY_ALLOWLIST,
  compareContractParity,
  extractOpenApiRunPayloadFields,
  extractSwiftStructFields,
} from './contract-parity.js';

describe('extractSwiftStructFields', () => {
  it('collects stored let-properties per struct, unwrapping backticks', () => {
    const src = `
      nonisolated struct RunPayload: Decodable {
        let schemaVersion: Int
        let \`class\`: RunClass
        let tracks: [RunTrack]
        var isRunnable: Bool { !tracks.isEmpty }
      }
    `;
    expect(extractSwiftStructFields(src).RunPayload).toEqual(['schemaVersion', 'class', 'tracks']);
  });

  it('ignores let-locals inside init(from:) and computed vars', () => {
    const src = `
      struct Move: Decodable {
        let id: String
        let anchorMs: Int
        let name: String
        var label: String { name }
        init(from decoder: Decoder) throws {
          let c = try decoder.container(keyedBy: CodingKeys.self)
          let raw = try c.decode(String.self, forKey: .name)
          name = raw
        }
      }
    `;
    expect(extractSwiftStructFields(src).Move).toEqual(['id', 'anchorMs', 'name']);
  });

  it('does not capture memberwise-init parameters as fields', () => {
    const src = `
      struct T: Decodable {
        let a: Int
        init(a: Int, b: Int) { self.a = a }
      }
    `;
    expect(extractSwiftStructFields(src).T).toEqual(['a']);
  });

  it('ignores commented-out and TODO let-declarations', () => {
    const src = `
      struct T: Decodable {
        let a: Int
        // let displayRpm: Int?  // TODO: decode once iOS catches up
        /* let holdCount: Int? */
        let b: Int
      }
    `;
    expect(extractSwiftStructFields(src).T).toEqual(['a', 'b']);
  });

  it('uses CodingKeys cases (not stored lets) when a custom decoder is present', () => {
    // A stored `let` that is NOT a CodingKeys case is not actually decoded.
    const src = `
      struct RunTrack: Decodable {
        let classTrackId: String
        let displayRpm: Int?
        private enum CodingKeys: String, CodingKey {
          case classTrackId, displayBpm
          case notes
        }
        init(from decoder: Decoder) throws { /* ... */ }
      }
    `;
    expect(extractSwiftStructFields(src).RunTrack).toEqual(['classTrackId', 'displayBpm', 'notes']);
  });

  it('honors CodingKeys wire remapping (case x = "wire")', () => {
    const src = `
      struct T: Decodable {
        enum CodingKeys: String, CodingKey { case internalName = "wireName", other }
      }
    `;
    expect(extractSwiftStructFields(src).T).toEqual(['wireName', 'other']);
  });
});

describe('extractOpenApiRunPayloadFields', () => {
  const doc = {
    components: {
      schemas: {
        RunPayload: {
          properties: {
            schemaVersion: {},
            class: { properties: { id: {}, timelineMode: {} } },
            tracks: {
              type: 'array',
              items: {
                properties: {
                  classTrackId: {},
                  displayRpm: {},
                  track: { properties: { id: {}, title: {} } },
                  providerRefs: { type: 'array', items: { properties: { provider: {} } } },
                  cues: { type: 'array', items: { properties: { id: {}, text: {} } } },
                  moves: { type: 'array', items: { properties: { id: {}, beat: {} } } },
                },
              },
            },
            sections: { type: 'array', items: { properties: { type: {}, startOffsetMs: {} } } },
          },
        },
      },
    },
  };

  it('keys the field sets by Swift struct name', () => {
    const fields = extractOpenApiRunPayloadFields(doc);
    expect(fields.RunPayload).toContain('class');
    expect(fields.RunClass).toEqual(['id', 'timelineMode']);
    expect(fields.RunTrack).toContain('displayRpm');
    expect(fields.TrackMeta).toEqual(['id', 'title']);
    expect(fields.ProviderRef).toEqual(['provider']);
    expect(fields.Cue).toEqual(['id', 'text']);
    expect(fields.Move).toEqual(['id', 'beat']);
    expect(fields.Section).toEqual(['type', 'startOffsetMs']);
  });

  it('throws when the RunPayload component is missing', () => {
    expect(() => extractOpenApiRunPayloadFields({})).toThrow(/RunPayload/);
  });
});

describe('compareContractParity', () => {
  it('flags a server field the client lacks as missing-on-ios', () => {
    const result = compareContractParity({ RunTrack: ['a', 'b'] }, { RunTrack: ['a'] }, []);
    expect(result.failing).toEqual([
      {
        struct: 'RunTrack',
        field: 'b',
        kind: 'missing-on-ios',
        allowlisted: false,
        reason: undefined,
      },
    ]);
  });

  it('flags a client field the server lacks as unknown-to-server', () => {
    const result = compareContractParity({ RunTrack: ['a'] }, { RunTrack: ['a', 'ghost'] }, []);
    expect(result.failing).toEqual([
      {
        struct: 'RunTrack',
        field: 'ghost',
        kind: 'unknown-to-server',
        allowlisted: false,
        reason: undefined,
      },
    ]);
  });

  it('treats a wholly un-vendored struct as all-fields-missing', () => {
    const result = compareContractParity({ Section: ['type', 'startOffsetMs'] }, {}, []);
    expect(result.failing.map((d) => d.field)).toEqual(['type', 'startOffsetMs']);
  });

  it('never allowlists unknown-to-server drift, even when struct.field is in the allowlist', () => {
    // A field that was allowlisted as additive lag is later REMOVED from the
    // server while iOS still decodes it: the crash direction must still fail,
    // and the now-misdirected allowlist entry must surface as stale.
    const allow = [{ struct: 'RunTrack', field: 'displayRpm', reason: 'additive lag' }];
    const result = compareContractParity(
      { RunTrack: ['classTrackId'] },
      { RunTrack: ['classTrackId', 'displayRpm'] },
      allow,
    );
    expect(result.failing).toEqual([
      { struct: 'RunTrack', field: 'displayRpm', kind: 'unknown-to-server', allowlisted: false },
    ]);
    expect(result.staleAllowlist).toEqual([
      { struct: 'RunTrack', field: 'displayRpm', reason: 'additive lag' },
    ]);
  });

  it('moves allowlisted drift out of failing and reports stale entries', () => {
    const allow = [
      { struct: 'RunTrack', field: 'b', reason: 'tracked' },
      { struct: 'RunTrack', field: 'gone', reason: 'no longer drifting' },
    ];
    const result = compareContractParity({ RunTrack: ['a', 'b'] }, { RunTrack: ['a'] }, allow);
    expect(result.failing).toEqual([]);
    expect(result.allowlisted.map((d) => d.field)).toEqual(['b']);
    expect(result.staleAllowlist).toEqual([
      { struct: 'RunTrack', field: 'gone', reason: 'no longer drifting' },
    ]);
  });

  it('allowlists the additive Section.id (iOS decodes only type + startOffsetMs)', () => {
    // The run-payload now serves a stable `id` on each section, but the vendored
    // iOS Section derives its `id` (computed `var id: Int { startOffsetMs }`) and
    // does not decode the wire field — a tracked lag, not a gate failure. With the
    // real allowlist, Section.id must land in `allowlisted`, never in `failing`,
    // and must not register as a stale entry.
    const result = compareContractParity(
      { Section: ['id', 'type', 'startOffsetMs'] },
      { Section: ['type', 'startOffsetMs'] },
      CONTRACT_PARITY_ALLOWLIST,
    );
    expect(result.failing).toEqual([]);
    expect(result.allowlisted.map((d) => `${d.struct}.${d.field}`)).toEqual(['Section.id']);
    expect(result.staleAllowlist.map((e) => `${e.struct}.${e.field}`)).not.toContain('Section.id');
  });
});

// Enforcement against the *real* vendored snapshot (no untracked drift, no stale
// allowlist entry) lives in the dedicated CI gate `pnpm --filter @ritmofit/api
// contract-parity` (scripts/check-contract-parity.ts) — the unit-test tsconfig is
// Worker-typed and has no Node fs access, so the file-reading guard runs there.
