# Implementation Prompt 04: Music Workspace & Clip Window Preview (`P1-02`)

**Goal:** Refine the Music workspace shelves, track search UI, provider attribution badges, and audio clip auditioning controls across Spotify, Apple Music, and SoundCloud.

**Authority:** Implementation only. Do not commit, push, open PR, or deploy unless granted.

---

## Task Instructions

1. **Inspect Code:**
   Read `apps/web/src/components/TrackSearch.tsx` and `apps/web/src/components/TrackPreview.tsx`.

2. **Implement Music UI Improvements:**
   - Add clear provider icons (Spotify, Apple Music, SoundCloud) and active connection status badges to track search rows.
   - Improve audio clip preview window controls (`TrackPreview`) with clear play/pause, scrub offset, and duration indicators.
   - Enhance `PlaylistBrowserDialog` to allow instant class creation directly from a playlist card.

3. **Verification:**
   Run:
   ```bash
   pnpm --filter @ritmofit/web build
   pnpm test
   ```
