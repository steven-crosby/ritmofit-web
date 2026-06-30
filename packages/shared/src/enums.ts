/**
 * Enums — defined once, reused everywhere.
 *
 * Each enum exposes its value tuple (`*Values`) and a Zod schema (`*Schema`).
 * The tuple is the form Drizzle wants in step 3 (`text({ enum: [...] })`), so the
 * DB CHECK constraints and the Zod validation share one source of truth. Values
 * are lower_snake per `conventions.md`.
 */
import { z } from 'zod';

/** Effort level for a class_track or a placed move. */
export const intensityValues = ['none', 'easy', 'mod', 'hard', 'all_out'] as const;
export const intensitySchema = z.enum(intensityValues);
export type Intensity = z.infer<typeof intensitySchema>;

/** Music providers. M1 hand-enters tracks; provider playback arrives in M2. */
export const providerValues = ['spotify', 'apple_music', 'soundcloud'] as const;
export const providerSchema = z.enum(providerValues);
export type Provider = z.infer<typeof providerSchema>;

/**
 * Per-provider capability matrix — the single source of truth for which provider
 * features are actually integrated, so the UI never offers a dead end and the API
 * gates unsupported per-user actions from one place.
 *
 * - `catalogSearch`: public catalog search + import via the app-level token.
 * - `userConnect`: per-user OAuth account link (`POST /providers/:provider/connect`).
 * - `userLikes`: read the connected user's likes (spends their token).
 * - `playlistImport`: import a public playlist URL (`POST /classes/:id/import-playlist`).
 *
 * All three providers have a per-user connect + likes path. SoundCloud and Spotify
 * use redirect OAuth (Authorization Code + PKCE); Apple Music uses MusicKit JS in
 * the browser (no redirect OAuth) to mint a Music-User-Token the SPA posts to the
 * server. Playlist import is Spotify-only — SoundCloud needs permalink `/resolve`
 * (returns 501) and Apple Music has no playlist-import path. The `MOCK_PROVIDERS`
 * dev seam fakes tokens but does not change real integration, so this matrix stays
 * static and provider-honest.
 */
export interface ProviderCapabilities {
  catalogSearch: boolean;
  userConnect: boolean;
  userLikes: boolean;
  playlistImport: boolean;
}

export const providerCapabilities: Record<Provider, ProviderCapabilities> = {
  soundcloud: { catalogSearch: true, userConnect: true, userLikes: true, playlistImport: false },
  spotify: { catalogSearch: true, userConnect: true, userLikes: true, playlistImport: true },
  apple_music: {
    catalogSearch: true,
    userConnect: true,
    userLikes: true,
    playlistImport: false,
  },
};

/** Does this provider support linking a per-user account (OAuth connect)? */
export function supportsUserAccount(provider: Provider): boolean {
  return providerCapabilities[provider].userConnect;
}

/** Role within a team — governs membership management, not class access. */
export const teamRoleValues = ['owner', 'admin', 'member'] as const;
export const teamRoleSchema = z.enum(teamRoleValues);
export type TeamRole = z.infer<typeof teamRoleSchema>;

/** Class template / discipline. */
export const classTemplateValues = ['cycle', 'hiit', 'sculpt', 'tread'] as const;
export const classTemplateSchema = z.enum(classTemplateValues);
export type ClassTemplate = z.infer<typeof classTemplateSchema>;

/**
 * How a class's timeline is laid out.
 * - `sequential` (default): tracks play back-to-back; `start_offset_ms` is
 *   **server-derived** from the sum of preceding effective durations.
 * - `free`: the instructor places tracks at explicit offsets, with gaps (silence)
 *   allowed and overlaps rejected; `start_offset_ms` is **user-authored** and
 *   `position` is derived from offset order.
 */
export const timelineModeValues = ['sequential', 'free'] as const;
export const timelineModeSchema = z.enum(timelineModeValues);
export type TimelineMode = z.infer<typeof timelineModeSchema>;

/** Lifecycle status of a class. */
export const classStatusValues = ['draft', 'ready', 'archived'] as const;
export const classStatusSchema = z.enum(classStatusValues);
export type ClassStatus = z.infer<typeof classStatusSchema>;

/**
 * Discovery visibility of a class (M4) — **orthogonal** to lifecycle `status`.
 * `private` (default) is owner + shares only; `public` is additionally listed in
 * the Explore feed and grants VIEW to any authenticated user (see
 * `authorization.md` → public floor).
 */
export const classVisibilityValues = ['private', 'public'] as const;
export const classVisibilitySchema = z.enum(classVisibilityValues);
export type ClassVisibility = z.infer<typeof classVisibilitySchema>;

/** Permission granted by a share. */
export const sharePermissionValues = ['view', 'edit'] as const;
export const sharePermissionSchema = z.enum(sharePermissionValues);
export type SharePermission = z.infer<typeof sharePermissionSchema>;

/** What a share points at. Extensible beyond `class` in later milestones. */
export const shareResourceTypeValues = ['class'] as const;
export const shareResourceTypeSchema = z.enum(shareResourceTypeValues);
export type ShareResourceType = z.infer<typeof shareResourceTypeSchema>;

/**
 * Class section / segment type — the energy-arc bands under the timeline
 * (`09-class-builder-guidelines.md`, `02-color-system.md`). A **fixed enum**;
 * labels and tints are presentation-only (Warm-up/Climb/Sprint/Recovery/Cool-down).
 */
export const segmentTypeValues = ['warm_up', 'climb', 'sprint', 'recovery', 'cool_down'] as const;
export const segmentTypeSchema = z.enum(segmentTypeValues);
export type SegmentType = z.infer<typeof segmentTypeSchema>;

/**
 * Effective access a user has to a class — owner ∪ shared-direct ∪ shared-team,
 * highest wins (see `authorization.md`). Ordered **ascending**, so the tuple index
 * is the rank used for `minLevel` comparisons. Surfaced by `GET /classes`.
 */
export const accessLevelValues = ['none', 'view', 'edit', 'owner'] as const;
export const accessLevelSchema = z.enum(accessLevelValues);
export type AccessLevel = z.infer<typeof accessLevelSchema>;
