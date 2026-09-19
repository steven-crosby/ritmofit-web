/** Stable playback ordering for tracks grouped into ordered scaffold blocks. */

export interface PlanOrderedTrack {
  id: string;
  position: number;
  planBlockId: string | null;
}

/**
 * Group assigned tracks by plan-block order while preserving their within-block
 * playback order. Unassigned tracks remain stable after assigned scaffold music.
 */
export function orderTrackIdsByPlan(
  tracks: readonly PlanOrderedTrack[],
  blockPositions: ReadonlyMap<string, number>,
): string[] {
  const unassignedRank = Number.MAX_SAFE_INTEGER;
  return [...tracks]
    .sort((a, b) => {
      const aRank =
        a.planBlockId == null
          ? unassignedRank
          : (blockPositions.get(a.planBlockId) ?? unassignedRank);
      const bRank =
        b.planBlockId == null
          ? unassignedRank
          : (blockPositions.get(b.planBlockId) ?? unassignedRank);
      return aRank - bRank || a.position - b.position;
    })
    .map((track) => track.id);
}

export function isTrackPlanOrderValid(
  tracks: readonly PlanOrderedTrack[],
  blockPositions: ReadonlyMap<string, number>,
): boolean {
  const ordered = orderTrackIdsByPlan(tracks, blockPositions);
  const current = [...tracks].sort((a, b) => a.position - b.position);
  return ordered.every((id, index) => id === current[index]?.id);
}
