/**
 * Generate the OpenAPI spec from the shared Zod schemas (step 12) — so web and
 * iOS share one contract derived from the single source of truth in
 * `packages/shared`. Run with `pnpm --filter @ritmofit/api openapi`.
 *
 * Components are produced by Zod 4's `z.toJSONSchema`; refinements (the share /
 * placed-move invariants) aren't expressible in JSON Schema and are dropped via
 * `unrepresentable: 'any'` — they remain enforced server-side. Paths cover the
 * M1 REST surface (api.md); request/response bodies reference the components.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import {
  API_VERSION,
  CLASS_LIST_DEFAULT_LIMIT,
  CLASS_LIST_MAX_LIMIT,
  CLASS_LIST_NEXT_CURSOR_HEADER,
  MAX_CLASS_COVER_BYTES,
  classSchema,
  classWithAccessSchema,
  classListItemSchema,
  exploreClassSchema,
  createClassSchema,
  updateClassSchema,
  copyClassSchema,
  classTrackSchema,
  addClassTrackSchema,
  updateClassTrackSchema,
  reorderClassTracksSchema,
  copyClassTrackSchema,
  cueSchema,
  createCueSchema,
  updateCueSchema,
  classSectionSchema,
  createClassSectionSchema,
  updateClassSectionSchema,
  classTrackMoveSchema,
  placeClassTrackMoveSchema,
  updateClassTrackMoveSchema,
  moveSchema,
  userMoveSchema,
  songByMoveSchema,
  createUserMoveSchema,
  updateUserMoveSchema,
  trackSchema,
  createTrackSchema,
  updateTrackSchema,
  trackProviderIdSchema,
  createTrackProviderIdSchema,
  trackWithProviderIdsSchema,
  trackSearchResultSchema,
  importProviderTrackSchema,
  resolveProviderRequestSchema,
  resolveProviderResultSchema,
  musicConnectionViewSchema,
  connectProviderResponseSchema,
  appleMusicClientConfigSchema,
  spotifyPlaybackTokenSchema,
  connectAppleMusicSchema,
  providerPlaylistSummarySchema,
  providerPlaylistImportResultSchema,
  teamSchema,
  teamWithRoleSchema,
  createTeamSchema,
  addTeamMemberSchema,
  teamMemberViewSchema,
  shareSchema,
  createShareSchema,
  updateShareSchema,
  runPayloadSchema,
  userSchema,
  updateUserProfileSchema,
} from '@ritmofit/shared';

const named: Record<string, z.ZodType> = {
  Class: classSchema,
  ClassWithAccess: classWithAccessSchema,
  ClassListItem: classListItemSchema,
  ExploreClass: exploreClassSchema,
  CreateClass: createClassSchema,
  UpdateClass: updateClassSchema,
  CopyClass: copyClassSchema,
  ClassTrack: classTrackSchema,
  AddClassTrack: addClassTrackSchema,
  UpdateClassTrack: updateClassTrackSchema,
  ReorderClassTracks: reorderClassTracksSchema,
  CopyClassTrack: copyClassTrackSchema,
  Cue: cueSchema,
  CreateCue: createCueSchema,
  UpdateCue: updateCueSchema,
  ClassSection: classSectionSchema,
  CreateClassSection: createClassSectionSchema,
  UpdateClassSection: updateClassSectionSchema,
  ClassTrackMove: classTrackMoveSchema,
  PlaceClassTrackMove: placeClassTrackMoveSchema,
  UpdateClassTrackMove: updateClassTrackMoveSchema,
  Move: moveSchema,
  UserMove: userMoveSchema,
  SongByMove: songByMoveSchema,
  CreateUserMove: createUserMoveSchema,
  UpdateUserMove: updateUserMoveSchema,
  Track: trackSchema,
  CreateTrack: createTrackSchema,
  UpdateTrack: updateTrackSchema,
  TrackProviderId: trackProviderIdSchema,
  CreateTrackProviderId: createTrackProviderIdSchema,
  TrackWithProviderIds: trackWithProviderIdsSchema,
  TrackSearchResult: trackSearchResultSchema,
  ImportProviderTrack: importProviderTrackSchema,
  ResolveProviderRequest: resolveProviderRequestSchema,
  ResolveProviderResult: resolveProviderResultSchema,
  MusicConnectionView: musicConnectionViewSchema,
  ConnectProviderResponse: connectProviderResponseSchema,
  AppleMusicClientConfig: appleMusicClientConfigSchema,
  SpotifyPlaybackToken: spotifyPlaybackTokenSchema,
  ConnectAppleMusic: connectAppleMusicSchema,
  ProviderPlaylistSummary: providerPlaylistSummarySchema,
  ProviderPlaylistImportResult: providerPlaylistImportResultSchema,
  Team: teamSchema,
  TeamWithRole: teamWithRoleSchema,
  CreateTeam: createTeamSchema,
  AddTeamMember: addTeamMemberSchema,
  TeamMemberView: teamMemberViewSchema,
  Share: shareSchema,
  CreateShare: createShareSchema,
  UpdateShare: updateShareSchema,
  RunPayload: runPayloadSchema,
  User: userSchema,
  UpdateUserProfile: updateUserProfileSchema,
};

const schemas: Record<string, unknown> = {};
for (const [name, schema] of Object.entries(named)) {
  schemas[name] = z.toJSONSchema(schema, { target: 'draft-2020-12', unrepresentable: 'any' });
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const jsonBody = (name: string) => ({
  required: true,
  content: { 'application/json': { schema: ref(name) } },
});
const jsonResp = (name: string, desc: string) => ({
  description: desc,
  content: { 'application/json': { schema: ref(name) } },
});
const arrayResp = (name: string, desc: string) => ({
  description: desc,
  content: { 'application/json': { schema: { type: 'array', items: ref(name) } } },
});
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };

const doc = {
  openapi: '3.1.0',
  info: {
    title: 'Ritmo Studio API',
    version: API_VERSION,
    description:
      'Ritmo Studio REST surface. Generated from the @ritmofit/shared Zod schemas — the single source of truth. Most endpoints require a Better Auth session; public exceptions explicitly override the global security requirement.',
  },
  servers: [{ url: `/api/${API_VERSION}` }],
  paths: {
    '/auth/session': {
      post: {
        summary: 'Validate session, return canonical profile',
        responses: {
          '200': jsonResp('User', 'Canonical profile'),
          '401': { description: 'Not authenticated' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Fetch caller profile',
        responses: {
          '200': jsonResp('User', 'Canonical profile'),
          '401': { description: 'Not authenticated' },
        },
      },
      patch: {
        summary: 'Update caller profile',
        requestBody: jsonBody('UpdateUserProfile'),
        responses: {
          '200': jsonResp('User', 'Updated profile'),
          '401': { description: 'Not authenticated' },
          '422': { description: 'Profile failed validation' },
        },
      },
    },
    '/classes': {
      get: {
        summary: 'List visible classes (owned ∪ shared), optionally paginated',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: CLASS_LIST_MAX_LIMIT,
            },
            description: `Page size. Supplying limit or cursor enables keyset pagination; cursor without limit uses ${CLASS_LIST_DEFAULT_LIMIT}.`,
          },
          {
            name: 'cursor',
            in: 'query',
            required: false,
            schema: { type: 'string', maxLength: 512 },
            description: 'Opaque continuation cursor from the prior response header.',
          },
          {
            name: 'tag',
            in: 'query',
            required: false,
            schema: { type: 'string', maxLength: 50 },
            description:
              'Filter to classes carrying this tag (trimmed + lowercased). Composes with pagination.',
          },
        ],
        responses: {
          '200': {
            ...arrayResp('ClassListItem', 'Visible classes'),
            headers: {
              [CLASS_LIST_NEXT_CURSOR_HEADER]: {
                description: 'Opaque cursor for the next page; absent on the final page.',
                schema: { type: 'string' },
              },
            },
          },
          '422': { description: 'Invalid pagination parameters or cursor' },
        },
      },
      post: {
        summary: 'Create a class',
        requestBody: jsonBody('CreateClass'),
        responses: { '201': jsonResp('Class', 'Created') },
      },
    },
    '/classes/{id}': {
      parameters: [idParam],
      get: {
        summary: 'Fetch a class',
        responses: {
          '200': jsonResp('ClassWithAccess', 'The class'),
          '404': { description: 'Not found / hidden' },
        },
      },
      patch: {
        summary: 'Update class fields (edit)',
        requestBody: jsonBody('UpdateClass'),
        responses: { '200': jsonResp('Class', 'Updated') },
      },
      delete: {
        summary: 'Delete a class (owner)',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/classes/{id}/run-payload': {
      parameters: [idParam],
      get: {
        summary: 'Versioned single-fetch live payload',
        responses: { '200': jsonResp('RunPayload', 'Run payload') },
      },
    },
    '/classes/{id}/copy': {
      parameters: [idParam],
      post: {
        summary: "Save a copy of a visible class into the caller's library",
        requestBody: jsonBody('CopyClass'),
        responses: {
          '201': jsonResp('Class', 'Fresh private draft owned by the caller'),
          '404': { description: 'Source class not found / hidden' },
        },
      },
    },
    '/classes/{id}/cover': {
      parameters: [idParam],
      post: {
        summary: 'Upload a class cover image (edit)',
        description: `Multipart JPEG, PNG, or WebP; maximum ${MAX_CLASS_COVER_BYTES} bytes (5 MiB).`,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { file: { type: 'string', format: 'binary' } },
                required: ['file'],
              },
            },
          },
        },
        responses: {
          '200': jsonResp('Class', 'Updated class with coverImageUrl'),
          '400': { description: 'Missing file, or not a JPEG/PNG/WebP image' },
          '413': { description: 'Cover image exceeds 5 MiB' },
        },
      },
    },
    '/classes/{id}/tags': {
      parameters: [idParam],
      post: {
        summary: 'Add a tag to a class (edit). Tag is lowercased; duplicates are no-ops.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { tag: { type: 'string', minLength: 1 } },
                required: ['tag'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tag added (or already present)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' }, tag: { type: 'string' } },
                  required: ['success', 'tag'],
                },
              },
            },
          },
          '400': { description: 'Tag must be a non-empty string' },
        },
      },
    },
    '/classes/{id}/tags/{tag}': {
      parameters: [
        idParam,
        { name: 'tag', in: 'path', required: true, schema: { type: 'string' } },
      ],
      delete: {
        summary: 'Remove a tag from a class (edit)',
        responses: { '204': { description: 'Removed' } },
      },
    },
    '/classes/{id}/sections': {
      parameters: [idParam],
      get: {
        summary: 'List segment bands in timeline order (view)',
        responses: { '200': arrayResp('ClassSection', 'Class sections') },
      },
      post: {
        summary: 'Add a segment band (edit)',
        requestBody: jsonBody('CreateClassSection'),
        responses: { '201': jsonResp('ClassSection', 'Created') },
      },
    },
    '/sections/{id}': {
      parameters: [idParam],
      patch: {
        summary: 'Update a segment band (edit)',
        requestBody: jsonBody('UpdateClassSection'),
        responses: { '200': jsonResp('ClassSection', 'Updated') },
      },
      delete: {
        summary: 'Delete a segment band (edit)',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/classes/{id}/import-playlist': {
      parameters: [idParam],
      post: {
        summary:
          'Import a public Spotify, SoundCloud, or Apple Music catalog playlist URL as class tracks (edit).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { url: { type: 'string', format: 'uri' } },
                required: ['url'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tracks imported',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { imported: { type: 'integer' } },
                  required: ['imported'],
                },
              },
            },
          },
          '400': { description: 'Invalid or unsupported playlist URL, or empty playlist' },
        },
      },
    },
    '/uploads/covers/{filename}': {
      parameters: [{ name: 'filename', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        summary: 'Serve a stored cover image from R2',
        security: [],
        responses: {
          '200': {
            description: 'Image bytes',
            content: { 'image/*': { schema: { type: 'string', format: 'binary' } } },
          },
          '404': { description: 'Image not found' },
        },
      },
    },
    '/classes/{id}/tracks': {
      parameters: [idParam],
      get: {
        summary: 'List class_tracks in position order',
        responses: { '200': arrayResp('ClassTrack', 'Class tracks') },
      },
      post: {
        summary: 'Add a track (reference or inline-create)',
        requestBody: jsonBody('AddClassTrack'),
        responses: { '201': jsonResp('ClassTrack', 'Added') },
      },
    },
    '/classes/{id}/tracks/reorder': {
      parameters: [idParam],
      post: {
        summary: 'Reorder class_tracks',
        requestBody: jsonBody('ReorderClassTracks'),
        responses: { '200': arrayResp('ClassTrack', 'New order') },
      },
    },
    '/class-tracks/{id}': {
      parameters: [idParam],
      patch: {
        summary: 'Update a class_track',
        requestBody: jsonBody('UpdateClassTrack'),
        responses: { '200': jsonResp('ClassTrack', 'Updated') },
      },
      delete: { summary: 'Remove a class_track', responses: { '204': { description: 'Removed' } } },
    },
    '/class-tracks/{id}/copy': {
      parameters: [idParam],
      post: {
        summary: 'Copy a class_track with its cues/moves',
        requestBody: jsonBody('CopyClassTrack'),
        responses: { '201': jsonResp('ClassTrack', 'Copy') },
      },
    },
    '/class-tracks/{id}/cues': {
      parameters: [idParam],
      get: { summary: 'List cues', responses: { '200': arrayResp('Cue', 'Cues') } },
      post: {
        summary: 'Create a cue',
        requestBody: jsonBody('CreateCue'),
        responses: { '201': jsonResp('Cue', 'Created') },
      },
    },
    '/cues/{id}': {
      parameters: [idParam],
      patch: {
        summary: 'Update a cue',
        requestBody: jsonBody('UpdateCue'),
        responses: { '200': jsonResp('Cue', 'Updated') },
      },
      delete: { summary: 'Delete a cue', responses: { '204': { description: 'Deleted' } } },
    },
    '/class-tracks/{id}/moves': {
      parameters: [idParam],
      get: {
        summary: 'List placed moves',
        responses: { '200': arrayResp('ClassTrackMove', 'Placed moves') },
      },
      post: {
        summary: 'Place a move',
        requestBody: jsonBody('PlaceClassTrackMove'),
        responses: { '201': jsonResp('ClassTrackMove', 'Placed') },
      },
    },
    '/class-track-moves/{id}': {
      parameters: [idParam],
      patch: {
        summary: 'Update a placed move',
        requestBody: jsonBody('UpdateClassTrackMove'),
        responses: { '200': jsonResp('ClassTrackMove', 'Updated') },
      },
      delete: { summary: 'Remove a placed move', responses: { '204': { description: 'Removed' } } },
    },
    '/moves': {
      get: {
        summary: 'List global library moves',
        parameters: [
          { name: 'template', in: 'query', required: false, schema: { type: 'string' } },
        ],
        responses: { '200': arrayResp('Move', 'Global moves') },
      },
    },
    '/moves/{id}/songs': {
      parameters: [idParam],
      get: {
        summary: "The caller's songs choreographed with this global move",
        responses: { '200': arrayResp('SongByMove', 'Songs grouped by track') },
      },
    },
    '/user-moves': {
      get: {
        summary: "List the caller's custom moves",
        responses: { '200': arrayResp('UserMove', 'User moves') },
      },
      post: {
        summary: 'Create a custom move',
        requestBody: jsonBody('CreateUserMove'),
        responses: { '201': jsonResp('UserMove', 'Created') },
      },
    },
    '/user-moves/{id}': {
      parameters: [idParam],
      patch: {
        summary: 'Update a custom move',
        requestBody: jsonBody('UpdateUserMove'),
        responses: { '200': jsonResp('UserMove', 'Updated') },
      },
      delete: { summary: 'Delete a custom move', responses: { '204': { description: 'Deleted' } } },
    },
    '/user-moves/{id}/songs': {
      parameters: [idParam],
      get: {
        summary: "The caller's songs choreographed with this custom move",
        responses: {
          '200': arrayResp('SongByMove', 'Songs grouped by track'),
          '404': { description: 'Not found or not owned' },
        },
      },
    },
    '/tracks': {
      post: {
        summary: 'Create a track',
        requestBody: jsonBody('CreateTrack'),
        responses: { '201': jsonResp('Track', 'Created') },
      },
    },
    '/tracks/{id}': {
      parameters: [idParam],
      get: {
        summary: 'Fetch a track with provider ids',
        responses: { '200': jsonResp('TrackWithProviderIds', 'Track') },
      },
      patch: {
        summary: 'Update a track',
        requestBody: jsonBody('UpdateTrack'),
        responses: { '200': jsonResp('Track', 'Updated') },
      },
    },
    '/tracks/{id}/provider-ids': {
      parameters: [idParam],
      post: {
        summary: 'Attach a provider id',
        requestBody: jsonBody('CreateTrackProviderId'),
        responses: {
          '201': jsonResp('TrackProviderId', 'Attached'),
          '409': { description: 'Duplicate provider id' },
        },
      },
    },
    '/tracks/{id}/resolve-provider': {
      parameters: [idParam],
      post: {
        summary: 'Resolve a track to a playable provider by same-song catalog search',
        requestBody: jsonBody('ResolveProviderRequest'),
        responses: {
          '200': jsonResp(
            'ResolveProviderResult',
            'A strong match was attached, or candidates to confirm',
          ),
          '404': { description: 'Not found' },
        },
      },
    },
    '/tracks/{id}/bpm-lookup': {
      parameters: [idParam],
      post: {
        summary: 'Fill display_bpm from a third-party BPM provider (M2; never Spotify)',
        responses: {
          '200': jsonResp(
            'Track',
            'Track (with display_bpm applied if a confident match was found)',
          ),
          '404': { description: 'Not found' },
          '503': { description: 'BPM provider not configured' },
        },
      },
    },
    '/track-provider-ids/{id}': {
      parameters: [idParam],
      delete: { summary: 'Remove a provider id', responses: { '204': { description: 'Removed' } } },
    },
    '/providers/{provider}/search': {
      parameters: [
        {
          name: 'provider',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['spotify', 'apple_music', 'soundcloud'] },
        },
      ],
      get: {
        summary: 'Search a configured music provider catalog',
        parameters: [{ name: 'q', in: 'query', required: false, schema: { type: 'string' } }],
        responses: {
          '200': arrayResp('TrackSearchResult', 'Candidates'),
          '501': { description: 'Provider not yet integrated' },
          '503': { description: 'Provider not configured' },
        },
      },
    },
    '/providers/{provider}/likes': {
      parameters: [
        {
          name: 'provider',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['spotify', 'apple_music', 'soundcloud'] },
        },
      ],
      get: {
        summary: "List the caller's liked tracks (M2; spends their per-user OAuth token)",
        responses: {
          '200': arrayResp('TrackSearchResult', 'Liked tracks'),
          '409': { description: 'Not connected / reconnect required' },
          '501': { description: 'Provider not yet integrated' },
          '503': { description: 'Provider not configured' },
        },
      },
    },
    '/providers/{provider}/playlists': {
      parameters: [
        {
          name: 'provider',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['spotify', 'apple_music', 'soundcloud'] },
        },
      ],
      get: {
        summary: "List the caller's saved playlists (D21; spends their per-user OAuth token)",
        responses: {
          '200': arrayResp('ProviderPlaylistSummary', 'Saved playlists'),
          '409': { description: 'Not connected / reconnect required' },
          '501': { description: 'Provider saved playlists not integrated' },
          '503': { description: 'Provider not configured' },
        },
      },
    },
    '/providers/{provider}/playlists/{playlistId}/tracks': {
      parameters: [
        {
          name: 'provider',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['spotify', 'apple_music', 'soundcloud'] },
        },
        { name: 'playlistId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      get: {
        summary:
          'List tracks in one saved playlist for browse/drill-in (D21; spends their per-user OAuth token)',
        responses: {
          '200': arrayResp('TrackSearchResult', 'Playlist tracks'),
          '409': { description: 'Not connected / reconnect required' },
          '501': { description: 'Provider saved playlists not integrated' },
          '503': { description: 'Provider not configured' },
        },
      },
    },
    '/providers/{provider}/playlists/{playlistId}/import': {
      parameters: [
        {
          name: 'provider',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['spotify', 'apple_music', 'soundcloud'] },
        },
        { name: 'playlistId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      post: {
        summary:
          'Bulk-import a saved playlist as track references (D21; deduped, one bulk op, references only)',
        responses: {
          '201': jsonResp(
            'ProviderPlaylistImportResult',
            'Imported; at least one new track created',
          ),
          '200': jsonResp(
            'ProviderPlaylistImportResult',
            'Imported; every song already existed in the library',
          ),
          '409': { description: 'Not connected / reconnect required' },
          '422': { description: 'Playlist has too many distinct tracks to import at once' },
          '501': { description: 'Provider saved playlists not integrated' },
          '503': { description: 'Provider not configured' },
        },
      },
    },
    '/providers/track-import': {
      post: {
        summary: 'Import a provider candidate into the library',
        requestBody: jsonBody('ImportProviderTrack'),
        responses: {
          '201': jsonResp('TrackWithProviderIds', 'Created a new track'),
          '200': jsonResp(
            'TrackWithProviderIds',
            'Resolved to an existing track (idempotent / same-song attach)',
          ),
          '404': { description: 'No such provider track' },
          '409': { description: "Another user's library already holds this provider ref" },
        },
      },
    },
    '/providers/connections': {
      get: {
        summary: "List the caller's provider connections (tokens stripped)",
        responses: { '200': arrayResp('MusicConnectionView', 'Connections') },
      },
    },
    '/providers/{provider}/connect': {
      parameters: [
        {
          name: 'provider',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['spotify', 'apple_music', 'soundcloud'] },
        },
      ],
      post: {
        summary: 'Start a provider OAuth connection (returns authorize URL)',
        responses: {
          '200': jsonResp('ConnectProviderResponse', 'Authorize URL or mock-connected'),
          '501': { description: 'Provider not yet integrated' },
          '503': { description: 'Provider not configured' },
        },
      },
    },
    '/providers/{provider}/callback': {
      parameters: [
        {
          name: 'provider',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['spotify', 'apple_music', 'soundcloud'] },
        },
      ],
      get: {
        summary: 'OAuth redirect target — exchanges the code, then 302s to the SPA',
        parameters: [
          { name: 'code', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'state', in: 'query', required: false, schema: { type: 'string' } },
        ],
        responses: { '302': { description: 'Redirect to the web app (connected or error)' } },
      },
    },
    '/providers/{provider}/connection': {
      parameters: [
        {
          name: 'provider',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['spotify', 'apple_music', 'soundcloud'] },
        },
      ],
      delete: {
        summary: 'Disconnect a provider (immediate token forget)',
        responses: { '204': { description: 'Disconnected' } },
      },
    },
    // Apple Music has no redirect OAuth: these two concrete routes replace the
    // generic connect/callback pair (MusicKit JS authorizes in the browser).
    '/providers/apple_music/config': {
      get: {
        summary: 'Apple Music developer token + storefront for MusicKit.configure()',
        responses: {
          '200': jsonResp('AppleMusicClientConfig', 'Developer token + storefront'),
          '401': { description: 'Authentication required' },
          '503': { description: 'Apple Music not configured' },
        },
      },
    },
    // Spotify Web Playback SDK needs a live access token in the browser; this serves
    // a short-lived one (never the refresh token) for a playback-scoped connection.
    '/providers/spotify/playback-token': {
      get: {
        summary: 'Short-lived Spotify access token for the Web Playback SDK',
        responses: {
          '200': jsonResp('SpotifyPlaybackToken', 'Short-lived access token + TTL'),
          '401': { description: 'Authentication required' },
          '409': { description: 'Not connected, or reconnect required for playback scope' },
          '503': { description: 'Spotify not configured' },
        },
      },
    },
    '/providers/apple_music/connection': {
      post: {
        summary: 'Store the Music-User-Token MusicKit returned (encrypted; no refresh)',
        requestBody: jsonBody('ConnectAppleMusic'),
        responses: {
          '204': { description: 'Stored' },
          '401': { description: 'Authentication required' },
          '422': { description: 'Invalid request body' },
          '503': { description: 'Apple Music not configured' },
        },
      },
    },
    '/mock/track-search': {
      get: {
        summary: 'Dev-only mock provider search',
        parameters: [{ name: 'q', in: 'query', required: false, schema: { type: 'string' } }],
        responses: { '200': arrayResp('TrackSearchResult', 'Candidates') },
      },
    },
    '/mock/track-import': {
      post: {
        summary: 'Dev-only import a mock candidate',
        requestBody: jsonBody('ImportProviderTrack'),
        responses: {
          '201': jsonResp('TrackWithProviderIds', 'Created a new track'),
          '200': jsonResp('TrackWithProviderIds', 'Resolved to an existing track'),
        },
      },
    },
    '/explore': {
      get: {
        summary: 'List public classes in recency order (dormant D20 surface)',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 30 },
          },
          {
            name: 'offset',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 0, default: 0 },
          },
        ],
        responses: { '200': arrayResp('ExploreClass', 'Public classes') },
      },
    },
    '/teams': {
      get: { summary: 'List my teams', responses: { '200': arrayResp('TeamWithRole', 'Teams') } },
      post: {
        summary: 'Create a team',
        requestBody: jsonBody('CreateTeam'),
        responses: { '201': jsonResp('Team', 'Created') },
      },
    },
    '/teams/{id}': {
      parameters: [idParam],
      get: { summary: 'Fetch a team (member)', responses: { '200': jsonResp('Team', 'Team') } },
    },
    '/teams/{id}/members': {
      parameters: [idParam],
      get: {
        summary: 'List members',
        responses: { '200': arrayResp('TeamMemberView', 'Members') },
      },
      post: {
        summary: 'Add a member (owner/admin)',
        requestBody: jsonBody('AddTeamMember'),
        responses: { '201': { description: 'Added' } },
      },
    },
    '/teams/{id}/members/{userId}': {
      parameters: [
        idParam,
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      delete: {
        summary: 'Remove a member (owner/admin or self)',
        responses: { '204': { description: 'Removed' } },
      },
    },
    '/classes/{id}/shares': {
      parameters: [idParam],
      get: {
        summary: 'List shares on a class (owner)',
        responses: { '200': arrayResp('Share', 'Shares') },
      },
    },
    '/shares': {
      post: {
        summary: 'Share a class with a user or team',
        requestBody: jsonBody('CreateShare'),
        responses: {
          '201': jsonResp('Share', 'Created'),
          '200': jsonResp('Share', 'Updated (re-share)'),
        },
      },
    },
    '/shares/{id}': {
      parameters: [idParam],
      patch: {
        summary: 'Change a share permission',
        requestBody: jsonBody('UpdateShare'),
        responses: { '200': jsonResp('Share', 'Updated') },
      },
      delete: { summary: 'Revoke a share', responses: { '204': { description: 'Revoked' } } },
    },
  },
  components: {
    securitySchemes: {
      sessionCookie: { type: 'apiKey', in: 'cookie', name: 'better-auth.session_token' },
    },
    schemas,
  },
  security: [{ sessionCookie: [] }],
};

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'openapi');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'openapi.json');
writeFileSync(outFile, JSON.stringify(doc, null, 2) + '\n');
console.log(
  `Wrote ${outFile} — ${Object.keys(schemas).length} schemas, ${Object.keys(doc.paths).length} paths.`,
);
