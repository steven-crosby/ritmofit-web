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
 *   **capability lag** (iOS can't surface that field). Temporary, explicitly
 *   accepted lags belong in {@link CONTRACT_PARITY_ALLOWLIST}; a new one fails CI.
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
 * Strip Swift comments before any structural matching, so a commented-out or TODO
 * declaration (`// let displayRpm: Int?`) can't be counted as a decoded field, and
 * so a `{`/`}` inside a comment can't break brace matching. Block comments are
 * removed first (they may span the braces a later pass relies on), then line
 * comments. Non-nested block comments only — Swift's are rare and the vendored
 * snapshot uses none.
 */
function stripSwiftComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/** Extract the coded keys from a `CodingKeys` enum body: `case a, b = "wire"`. */
function extractCodingKeys(enumBody: string): string[] {
  const keys: string[] = [];
  const caseRe = /\bcase\s+([^\n]+)/g;
  let line: RegExpExecArray | null;
  while ((line = caseRe.exec(enumBody)) !== null) {
    const caseList = line[1];
    if (caseList === undefined) continue;
    for (const item of caseList.split(',')) {
      // `name` or `name = "wireName"`; the wire string wins when remapped.
      const m = /`?([A-Za-z_]\w*)`?\s*(?:=\s*"([^"]+)")?/.exec(item.trim());
      const key = m ? (m[2] ?? m[1]) : undefined;
      if (key !== undefined) keys.push(key);
    }
  }
  return keys;
}

/**
 * Parse a Swift source file into `{ StructName: [decodedFieldNames] }`.
 *
 * The decoded field set is what the wire actually maps onto, which is authoritative
 * in this order:
 * 1. an explicit `CodingKeys` enum (its cases) — required when a struct uses custom
 *    `init(from:)`, since a stored `let` that isn't a `CodingKeys` case is *not*
 *    decoded; `RunTrack`/`Move` in the snapshot do exactly this;
 * 2. otherwise the synthesized keys, i.e. the stored `let name: Type` properties
 *    declared directly in the struct body.
 *
 * Computed `var`s, initializers, and nested bodies are stripped first so they can't
 * masquerade as fields; comments are stripped before any matching. Backtick-escaped
 * names (`` `class` ``) are unwrapped.
 */
export function extractSwiftStructFields(source: string): Record<string, string[]> {
  const src = stripSwiftComments(source);
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

    let fields: string[] = [];
    // 1. Prefer an explicit CodingKeys enum (authoritative for custom decoders).
    const ckMatch = /\benum\s+CodingKeys\b/.exec(body);
    if (ckMatch) {
      const ckBraceStart = body.indexOf('{', ckMatch.index);
      const ckBody = ckBraceStart === -1 ? null : readBalanced(body, ckBraceStart);
      if (ckBody !== null) fields = extractCodingKeys(ckBody);
    }
    // 2. Fall back to synthesized keys: stored `let` properties.
    if (fields.length === 0) {
      const direct = stripNestedBraces(body);
      const letRe = /\blet\s+`?([A-Za-z_]\w*)`?\s*:/g;
      let prop: RegExpExecArray | null;
      while ((prop = letRe.exec(direct)) !== null) {
        const field = prop[1];
        if (field !== undefined) fields.push(field);
      }
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
 * Temporary, tracked DTO lags. Phase 0 reconciled the iOS run-payload DTO with the
 * current contract, so the allowlist is intentionally empty. If an additive lag is
 * ever accepted again, document why and remove it as soon as iOS catches up (the
 * stale-allowlist guard enforces removal).
 *
 * Source contract: `packages/shared/src/entities/run-payload.ts`.
 */
export const CONTRACT_PARITY_ALLOWLIST: AllowlistEntry[] = [];

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
      // The allowlist tracks *additive* lag only; it must NEVER suppress the
      // client-crashing direction (the server removed/renamed a field the DTO
      // still decodes). So `unknown-to-server` always fails, even if an
      // allowlist entry for `struct.field` exists — and that now-misdirected
      // entry surfaces separately as a stale allowlist entry (it no longer
      // matches a `missing-on-ios` drift).
      drifts.push({
        struct,
        field,
        kind: 'unknown-to-server',
        allowlisted: false,
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
