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

/** Role within a team — governs membership management, not class access. */
export const teamRoleValues = ['owner', 'admin', 'member'] as const;
export const teamRoleSchema = z.enum(teamRoleValues);
export type TeamRole = z.infer<typeof teamRoleSchema>;

/** Class template / discipline. */
export const classTemplateValues = ['cycle', 'hiit', 'sculpt', 'tread'] as const;
export const classTemplateSchema = z.enum(classTemplateValues);
export type ClassTemplate = z.infer<typeof classTemplateSchema>;

/** Lifecycle status of a class. */
export const classStatusValues = ['draft', 'ready', 'archived'] as const;
export const classStatusSchema = z.enum(classStatusValues);
export type ClassStatus = z.infer<typeof classStatusSchema>;

/** Permission granted by a share. */
export const sharePermissionValues = ['view', 'edit'] as const;
export const sharePermissionSchema = z.enum(sharePermissionValues);
export type SharePermission = z.infer<typeof sharePermissionSchema>;

/** What a share points at. Extensible beyond `class` in later milestones. */
export const shareResourceTypeValues = ['class'] as const;
export const shareResourceTypeSchema = z.enum(shareResourceTypeValues);
export type ShareResourceType = z.infer<typeof shareResourceTypeSchema>;
