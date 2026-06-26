/**
 * Cross-surface contract-drift detection (web ↔ iOS).
 *
 * The backend is the source of truth for the live contract
 * (`GET /classes/:id/run-payload`, decision D12). The iOS client decodes that
 * payload into Swift DTOs vendored read-only at `ios-snapshot/Core/Models/`. The
 * design-token pipeline is already drift-gated in CI, but the **DTO** seam was
 * not: additive fields could (and did) land on the contract while the iOS DTO
 * silently lagged — `web-ios-parity.md` › "known seam gaps".
 *
 * This module compares the run-payload field sets the OpenAPI spec advertises
 * against the fields the vendored Swift DTOs decode. Field-name presence is the
 * automatable signal; type/nullability/enum drift remains the job of the manual
 * `agent-prompts/technical/api-contract-parity.md` pass.
 *
 * Two drift directions, very different risk:
 * - `missing-on-ios` — server serves a field the DTO doesn't decode. Additive and
 *   forward-compatible (Swift `Decodable` with explicit `CodingKeys` ignores
 *   unknown keys), so it never blacks out the live screen — but it is a real
 *   **capability lag** (iOS can't surface that field). Known lags are tracked in
 *   {@link CONTRACT_PARITY_ALLOWLIST}; a NEW one fails CI.
 * - `unknown-to-server` — the DTO decodes a field the server never sends. This is
 *   the client-crashing direction (a removed/renamed contract field). Never
 *   allowlisted by default.
 */

type Json = { [key: string]: unknown };

function asObject(value: unknown): Json {
  return value && typeof value === 'object' ? (value as Json) : {};
}

function schemaProperties(schema: unknown): Json {
  return asObject(asObject(schema).properties);
}

function schemaItems(schema: unknown): unknown {
  return asObject(schema).items;
}

function propertyKeys(schema: unknown): string[] {
  return Object.keys(schemaProperties(schema));
}

/**
 * Extract the run-payload field sets from a generated OpenAPI document, keyed by
 * the **Swift struct name** the object maps to (so comparison is a 1:1 lookup).
 * Throws if the `RunPayload` component is absent — a malformed/empty spec is a
 * gate failure, not a silent pass.
 */
export function extractOpenApiRunPayloadFields(doc: unknown): Record<string, string[]> {
  const schemas = asObject(asObject(asObject(doc).components).schemas);
  const runPayload = schemas.RunPayload;
  if (!runPayload || propertyKeys(runPayload).length === 0) {
    throw new Error('OpenAPI: components.schemas.RunPayload not found or has no properties');
  }
  const props = schemaProperties(runPayload);
  const trackEntry = schemaItems(props.tracks);
  const trackEntryProps = schemaProperties(trackEntry);
  return {
    RunPayload: propertyKeys(runPayload),
    RunClass: propertyKeys(props.class),
    RunTrack: propertyKeys(trackEntry),
    TrackMeta: propertyKeys(trackEntryProps.track),
    ProviderRef: propertyKeys(schemaItems(trackEntryProps.providerRefs)),
    Cue: propertyKeys(schemaItems(trackEntryProps.cues)),
    Move: propertyKeys(schemaItems(trackEntryProps.moves)),
    Section: propertyKeys(schemaItems(props.sections)),
  };
}

/** Return the substring inside the balanced `{ … }` that opens at `openIndex`. */
function readBalanced(src: string, openIndex: number): string | null {
  let depth = 0;
  for (let i = openIndex; i < src.length; i += 1) {
    const c = src[i];
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(openIndex + 1, i);
    }
  }
  return null;
}

/** Remove every nested balanced `{ … }` block, leaving only direct-level decls. */
function stripNestedBraces(body: string): string {
  const innermost = /\{[^{}]*\}/g;
  let out = body;
  let prev: string;
  do {
    prev = out;
    out = out.replace(innermost, ' ');
  } while (out !== prev);
  return out;
}

/**
 * Parse a Swift source file into `{ StructName: [storedPropertyNames] }`.
 *
 * Only **stored** properties (`let name: Type`) declared directly in a `struct`
 * body are collected — computed `var`s, initializers, nested `CodingKeys`, and
 * `init(from:)` locals are stripped first (their brace blocks are removed), so
 * they can't masquerade as decoded fields. Backtick-escaped names (`` `class` ``)
 * are unwrapped.
 */
export function extractSwiftStructFields(src: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const declRe = /\bstruct\s+([A-Za-z_]\w*)/g;
  let decl: RegExpExecArray | null;
  while ((decl = declRe.exec(src)) !== null) {
    const name = decl[1];
    if (name === undefined) continue;
    const braceStart = src.indexOf('{', declRe.lastIndex);
    if (braceStart === -1) continue;
    const body = readBalanced(src, braceStart);
    if (body === null) continue;
    const direct = stripNestedBraces(body);
    const fields: string[] = [];
    const letRe = /\blet\s+`?([A-Za-z_]\w*)`?\s*:/g;
    let prop: RegExpExecArray | null;
    while ((prop = letRe.exec(direct)) !== null) {
      const field = prop[1];
      if (field !== undefined) fields.push(field);
    }
    // A struct may be declared once; if seen twice (extensions), merge.
    result[name] = [...(result[name] ?? []), ...fields];
  }
  return result;
}

export interface AllowlistEntry {
  /** Swift struct name (matches {@link extractOpenApiRunPayloadFields} keys). */
  struct: string;
  /** The wire field name the iOS DTO does not yet decode. */
  field: string;
  /** Why this lag is tolerated, and the tracked parity follow-up. */
  reason: string;
}

export type DriftKind = 'missing-on-ios' | 'unknown-to-server';

export interface ParityDrift {
  struct: string;
  field: string;
  kind: DriftKind;
  allowlisted: boolean;
  reason?: string;
}

export interface ParityResult {
  drifts: ParityDrift[];
  /** Non-allowlisted drift — a non-empty list fails the gate. */
  failing: ParityDrift[];
  /** Allowlisted drift — the tracked, accepted lag. */
  allowlisted: ParityDrift[];
  /** Allowlist entries that no longer correspond to real drift (iOS caught up). */
  staleAllowlist: AllowlistEntry[];
}

/**
 * Known, tracked DTO lags — additive run-payload fields the iOS snapshot does not
 * yet decode. Each is forward-compatible (the live screen still renders), so it is
 * a capability follow-up for the `ritmofit-ios` repo, not a web defect. Remove an
 * entry once the iOS DTO adds the field (the stale-allowlist guard enforces this).
 *
 * Source contract: `packages/shared/src/entities/run-payload.ts`.
 */
export const CONTRACT_PARITY_ALLOWLIST: AllowlistEntry[] = [
  {
    struct: 'RunClass',
    field: 'timelineMode',
    reason:
      'Additive v1 field (sequential|free). iOS RunClass omits it; consumers assume sequential. iOS parity follow-up.',
  },
  {
    struct: 'RunTrack',
    field: 'displayRpm',
    reason:
      'M6/D14 per-track cadence (PR #110). iOS RunTrack does not decode it yet — Live cannot surface RPM. iOS parity follow-up.',
  },
  {
    struct: 'RunTrack',
    field: 'holdCount',
    reason:
      'M6/D14 per-track hold count (PR #110). iOS RunTrack does not decode it yet. iOS parity follow-up.',
  },
  {
    struct: 'RunTrack',
    field: 'clipStartMs',
    reason:
      'Additive v1 clip-window start. iOS RunTrack omits it; cue/move anchors are pre-rebased so Live is correct, but the beat grid origin is unavailable. iOS parity follow-up.',
  },
  {
    struct: 'RunTrack',
    field: 'beatAnchorMs',
    reason:
      'Additive v1 downbeat offset. iOS RunTrack omits it; needed only for editor beat-grid drawing. iOS parity follow-up.',
  },
  {
    struct: 'Move',
    field: 'beat',
    reason:
      'Additive v1 derived beat (mirrors Cue). iOS Move omits it; Move shows time/name without beat number. iOS parity follow-up.',
  },
  {
    struct: 'Move',
    field: 'bar',
    reason: 'Additive v1 derived bar (mirrors Cue). iOS Move omits it. iOS parity follow-up.',
  },
];

/**
 * Compare the contract the server advertises against what the iOS DTOs decode.
 * Structs present in `openapiFields` but absent from `swiftFields` surface every
 * field as `missing-on-ios` (a wholly un-vendored DTO). Structs the Swift source
 * has that aren't in the OpenAPI map are ignored — only the run-payload surface
 * is gated here.
 */
export function compareContractParity(
  openapiFields: Record<string, string[]>,
  swiftFields: Record<string, string[]>,
  allowlist: AllowlistEntry[] = CONTRACT_PARITY_ALLOWLIST,
): ParityResult {
  const allow = new Map(allowlist.map((entry) => [`${entry.struct}.${entry.field}`, entry.reason]));
  const matched = new Set<string>();
  const drifts: ParityDrift[] = [];

  for (const struct of Object.keys(openapiFields)) {
    const serverFields = new Set(openapiFields[struct]);
    const clientFields = new Set(swiftFields[struct] ?? []);

    for (const field of serverFields) {
      if (clientFields.has(field)) continue;
      const key = `${struct}.${field}`;
      if (allow.has(key)) matched.add(key);
      drifts.push({
        struct,
        field,
        kind: 'missing-on-ios',
        allowlisted: allow.has(key),
        reason: allow.get(key),
      });
    }

    for (const field of clientFields) {
      if (serverFields.has(field)) continue;
      const key = `${struct}.${field}`;
      if (allow.has(key)) matched.add(key);
      drifts.push({
        struct,
        field,
        kind: 'unknown-to-server',
        allowlisted: allow.has(key),
        reason: allow.get(key),
      });
    }
  }

  const staleAllowlist = allowlist.filter(
    (entry) => !matched.has(`${entry.struct}.${entry.field}`),
  );
  return {
    drifts,
    failing: drifts.filter((drift) => !drift.allowlisted),
    allowlisted: drifts.filter((drift) => drift.allowlisted),
    staleAllowlist,
  };
}
