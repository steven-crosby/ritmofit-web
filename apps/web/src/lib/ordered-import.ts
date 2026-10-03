import type {
  ClassTrack,
  ImportClassTracks,
  ProviderPlaylistSummary,
  TrackSearchResult,
} from '@ritmofit/shared';
import { ApiError, importClassTracks, importTrack, listClassTracks } from './api.js';

export interface ImportOccurrence {
  id: string;
  candidate: TrackSearchResult;
  trackId?: string;
  added: boolean;
  removed?: boolean;
}
export interface OrderedImportSession {
  entries: ImportOccurrence[];
  pending?: ImportClassTracks;
  storageKey?: string;
  started?: boolean;
  sourceChanged?: boolean;
  needsRecovery?: boolean;
  keepCurrentOrder?: boolean;
  sourcePlaylist?: ProviderPlaylistSummary;
}
/** Restore the saved intent without needing the provider to return its playlist. */
export function restoreOrderedImport(storageKey: string): OrderedImportSession | null {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(storageKey) ?? 'null',
    ) as OrderedImportSession | null;
    if (
      saved &&
      Array.isArray(saved.entries) &&
      saved.entries.every(
        (e) => typeof e.id === 'string' && typeof e.added === 'boolean' && e.candidate,
      )
    )
      return { ...saved, storageKey };
  } catch {
    /* Storage may be unavailable or obsolete. */
  }
  return null;
}

export function pendingOrderedImports(prefix: string): OrderedImportSession[] {
  const pending: OrderedImportSession[] = [];
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const saved = restoreOrderedImport(key);
      if (saved?.pending) pending.push(saved);
    }
  } catch {
    /* In-memory recovery is still available when storage is disabled. */
  }
  return pending;
}
export function createOrderedImport(
  candidates: TrackSearchResult[],
  storageKey?: string,
): OrderedImportSession {
  if (storageKey) {
    try {
      const saved = restoreOrderedImport(storageKey);
      const valid =
        saved &&
        Array.isArray(saved.entries) &&
        saved.entries.every(
          (e) => typeof e.id === 'string' && typeof e.added === 'boolean' && e.candidate,
        );
      const matches =
        valid &&
        saved.entries.length === candidates.length &&
        saved.entries.every(
          (e, i) =>
            e.candidate.provider === candidates[i]!.provider &&
            e.candidate.providerTrackId === candidates[i]!.providerTrackId,
        );
      if (
        valid &&
        (matches || saved.pending || (saved.started && saved.entries.some((e) => !e.added)))
      ) {
        // Finish the original intent before accepting a changed provider order.
        // The caller displays this retained source snapshot, never mismatched rows.
        return { ...saved, storageKey, sourceChanged: !matches };
      }
    } catch {
      /* Storage can be unavailable or contain an obsolete session. */
    }
  }
  return {
    entries: candidates.map((candidate) => ({ id: crypto.randomUUID(), candidate, added: false })),
    storageKey,
  };
}

function persist(session: OrderedImportSession) {
  if (!session.storageKey) return;
  try {
    sessionStorage.setItem(session.storageKey, JSON.stringify(session));
  } catch {
    /* In-memory retries remain available. */
  }
}

/** Saved receipts describe past commits. The class remains the membership truth. */
export async function reconcileOrderedImport(classId: string, session: OrderedImportSession) {
  const current = await listClassTracks(classId);
  const ids = new Set(current.map((row) => row.id));
  for (const entry of session.entries) {
    if (entry.added && !ids.has(entry.id)) entry.removed = true;
    entry.added = ids.has(entry.id);
    if (entry.added) entry.removed = false;
  }
  try {
    mergeImportOrder(current, session.entries, []);
    session.needsRecovery = false;
  } catch {
    session.needsRecovery = !session.keepCurrentOrder && session.entries.some((e) => !e.added);
  }
  persist(session);
  return current;
}

/** Explicitly honor the instructor's current arrangement on subsequent retries. */
export function preserveImportArrangement(session: OrderedImportSession) {
  session.keepCurrentOrder = true;
  session.needsRecovery = false;
  persist(session);
}

/** Insert recovered occurrences at their source position without moving unrelated
 * songs. Refuse to undo a deliberate reorder/deletion of previously imported work.
 */
export function mergeImportOrder(
  existing: ClassTrack[],
  entries: ImportOccurrence[],
  placements: ImportClassTracks['placements'],
): string[] {
  const currentIds = new Set(existing.map((r) => r.id));
  const incomingIds = new Set(placements.map((r) => r.id));
  const group = entries
    .filter((e) => currentIds.has(e.id) || incomingIds.has(e.id))
    .map((e) => e.id);
  const groupSet = new Set(group);
  const existingGroup = existing.filter((r) => groupSet.has(r.id)).map((r) => r.id);
  const groupPositions = existing.flatMap((r, index) => (groupSet.has(r.id) ? [index] : []));
  if (
    existingGroup.join() !== group.filter((id) => currentIds.has(id)).join() ||
    groupPositions.some((position, index) => position !== groupPositions[0]! + index) ||
    entries.some((e) => e.added && !currentIds.has(e.id))
  ) {
    throw new Error(
      'Previously imported songs were moved or removed. Add remaining songs at end to keep your current arrangement.',
    );
  }
  const first = existing.findIndex((r) => groupSet.has(r.id));
  const insertion =
    first < 0
      ? existing.length
      : existing.slice(0, first).filter((r) => !groupSet.has(r.id)).length;
  const unrelated = existing.filter((r) => !groupSet.has(r.id)).map((r) => r.id);
  unrelated.splice(insertion, 0, ...group);
  return unrelated;
}

/** Resolve library songs with bounded concurrency, then commit placements as an
 * ordered unit. Failed provider resolution doesn't erase source ordinals. Keep
 * the exact pending operation after an uncertain response; never append anew.
 */
export async function runOrderedImport(
  classId: string,
  session: OrderedImportSession,
  selectedIds?: Set<string>,
  planBlockId?: string | null,
  options: { confirmOnly?: boolean } = {},
) {
  session.started = true;
  persist(session);
  const commitPending = async () => {
    const pending = session.pending!;
    persist(session);
    try {
      await importClassTracks(classId, pending);
      const committed = new Set(pending.placements.map((p) => p.id));
      session.entries.forEach((e) => {
        if (committed.has(e.id)) e.added = true;
      });
      session.pending = undefined;
      persist(session);
    } catch (error) {
      // A definitive validation/access/conflict response means no write landed.
      // Network errors and 5xx remain ambiguous and must replay the exact body.
      if (error instanceof ApiError && error.status < 500) session.pending = undefined;
      persist(session);
      throw error;
    }
  };
  try {
    if (session.pending) await commitPending();
    if (options.confirmOnly) {
      await reconcileOrderedImport(classId, session);
      return { error: null };
    }
    await reconcileOrderedImport(classId, session);
    const wanted = session.entries.filter(
      (e) => !e.added && (!selectedIds || selectedIds.has(e.id)),
    );
    const resolved = new Map<string, Promise<string>>();
    for (const e of session.entries) {
      if (e.trackId)
        resolved.set(
          `${e.candidate.provider}:${e.candidate.providerTrackId}`,
          Promise.resolve(e.trackId),
        );
    }
    for (let i = 0; i < wanted.length; i += 4) {
      await Promise.all(
        wanted.slice(i, i + 4).map(async (entry) => {
          if (entry.trackId) return;
          const { candidate } = entry;
          const key = `${candidate.provider}:${candidate.providerTrackId}`;
          if (!resolved.has(key))
            resolved.set(
              key,
              importTrack(candidate.provider, candidate.providerTrackId).then((t) => t.id),
            );
          try {
            entry.trackId = await resolved.get(key)!;
          } catch {
            /* Retry unresolved occurrences later. */
          }
        }),
      );
    }
    // Bound each commit to the existing per-import API limit, without imposing a
    // new class-size policy. Every subsequent chunk still retains source order.
    const placements = wanted
      .filter((e) => e.trackId)
      .map((e) => ({ id: e.id, trackId: e.trackId! }));
    for (let i = 0; i < placements.length; i += 100) {
      const chunk = placements.slice(i, i + 100);
      const current = await listClassTracks(classId);
      session.pending = {
        operationId: crypto.randomUUID(),
        expectedTracks: current.map(({ id, position, updatedAt }) => ({ id, position, updatedAt })),
        placements: chunk,
        orderedIds: session.keepCurrentOrder
          ? [
              ...current.map((row) => row.id),
              ...chunk.filter((p) => !current.some((row) => row.id === p.id)).map((p) => p.id),
            ]
          : mergeImportOrder(current, session.entries, chunk),
        ...(planBlockId ? { planBlockId } : {}),
      };
      await commitPending();
    }
    return { error: null };
  } catch (error) {
    if ((error as Error).message.startsWith('Previously imported songs'))
      session.needsRecovery = true;
    return { error: (error as Error).message };
  } finally {
    persist(session);
  }
}
