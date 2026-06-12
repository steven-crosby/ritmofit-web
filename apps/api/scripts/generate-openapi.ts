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
  classSchema,
  classWithAccessSchema,
  createClassSchema,
  updateClassSchema,
  classTrackSchema,
  addClassTrackSchema,
  updateClassTrackSchema,
  reorderClassTracksSchema,
  copyClassTrackSchema,
  cueSchema,
  createCueSchema,
  updateCueSchema,
  classTrackMoveSchema,
  placeClassTrackMoveSchema,
  updateClassTrackMoveSchema,
  moveSchema,
  userMoveSchema,
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
  musicConnectionViewSchema,
  connectProviderResponseSchema,
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
} from '@ritmofit/shared';

const named: Record<string, z.ZodType> = {
  Class: classSchema,
  ClassWithAccess: classWithAccessSchema,
  CreateClass: createClassSchema,
  UpdateClass: updateClassSchema,
  ClassTrack: classTrackSchema,
  AddClassTrack: addClassTrackSchema,
  UpdateClassTrack: updateClassTrackSchema,
  ReorderClassTracks: reorderClassTracksSchema,
  CopyClassTrack: copyClassTrackSchema,
  Cue: cueSchema,
  CreateCue: createCueSchema,
  UpdateCue: updateCueSchema,
  ClassTrackMove: classTrackMoveSchema,
  PlaceClassTrackMove: placeClassTrackMoveSchema,
  UpdateClassTrackMove: updateClassTrackMoveSchema,
  Move: moveSchema,
  UserMove: userMoveSchema,
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
  MusicConnectionView: musicConnectionViewSchema,
  ConnectProviderResponse: connectProviderResponseSchema,
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
    title: 'RitmoFit API',
    version: API_VERSION,
    description:
      'RitmoFit M1 REST surface. Generated from the @ritmofit/shared Zod schemas — the single source of truth. All endpoints except the auth bootstrap require a Better Auth session.',
  },
  servers: [{ url: `/api/${API_VERSION}` }],
  paths: {
    '/auth/session': {
      post: { summary: 'Validate session, return canonical profile', responses: { '200': jsonResp('User', 'Canonical profile'), '401': { description: 'Not authenticated' } } },
    },
    '/classes': {
      get: { summary: 'List visible classes (owned ∪ shared)', responses: { '200': arrayResp('ClassWithAccess', 'Visible classes') } },
      post: { summary: 'Create a class', requestBody: jsonBody('CreateClass'), responses: { '201': jsonResp('Class', 'Created') } },
    },
    '/classes/{id}': {
      parameters: [idParam],
      get: { summary: 'Fetch a class', responses: { '200': jsonResp('ClassWithAccess', 'The class'), '404': { description: 'Not found / hidden' } } },
      patch: { summary: 'Update class fields (edit)', requestBody: jsonBody('UpdateClass'), responses: { '200': jsonResp('Class', 'Updated') } },
      delete: { summary: 'Delete a class (owner)', responses: { '204': { description: 'Deleted' } } },
    },
    '/classes/{id}/run-payload': {
      parameters: [idParam],
      get: { summary: 'Versioned single-fetch live payload', responses: { '200': jsonResp('RunPayload', 'Run payload') } },
    },
    '/classes/{id}/tracks': {
      parameters: [idParam],
      get: { summary: 'List class_tracks in position order', responses: { '200': arrayResp('ClassTrack', 'Class tracks') } },
      post: { summary: 'Add a track (reference or inline-create)', requestBody: jsonBody('AddClassTrack'), responses: { '201': jsonResp('ClassTrack', 'Added') } },
    },
    '/classes/{id}/tracks/reorder': {
      parameters: [idParam],
      post: { summary: 'Reorder class_tracks', requestBody: jsonBody('ReorderClassTracks'), responses: { '200': arrayResp('ClassTrack', 'New order') } },
    },
    '/class-tracks/{id}': {
      parameters: [idParam],
      patch: { summary: 'Update a class_track', requestBody: jsonBody('UpdateClassTrack'), responses: { '200': jsonResp('ClassTrack', 'Updated') } },
      delete: { summary: 'Remove a class_track', responses: { '204': { description: 'Removed' } } },
    },
    '/class-tracks/{id}/copy': {
      parameters: [idParam],
      post: { summary: 'Copy a class_track with its cues/moves', requestBody: jsonBody('CopyClassTrack'), responses: { '201': jsonResp('ClassTrack', 'Copy') } },
    },
    '/class-tracks/{id}/cues': {
      parameters: [idParam],
      get: { summary: 'List cues', responses: { '200': arrayResp('Cue', 'Cues') } },
      post: { summary: 'Create a cue', requestBody: jsonBody('CreateCue'), responses: { '201': jsonResp('Cue', 'Created') } },
    },
    '/cues/{id}': {
      parameters: [idParam],
      patch: { summary: 'Update a cue', requestBody: jsonBody('UpdateCue'), responses: { '200': jsonResp('Cue', 'Updated') } },
      delete: { summary: 'Delete a cue', responses: { '204': { description: 'Deleted' } } },
    },
    '/class-tracks/{id}/moves': {
      parameters: [idParam],
      get: { summary: 'List placed moves', responses: { '200': arrayResp('ClassTrackMove', 'Placed moves') } },
      post: { summary: 'Place a move', requestBody: jsonBody('PlaceClassTrackMove'), responses: { '201': jsonResp('ClassTrackMove', 'Placed') } },
    },
    '/class-track-moves/{id}': {
      parameters: [idParam],
      patch: { summary: 'Update a placed move', requestBody: jsonBody('UpdateClassTrackMove'), responses: { '200': jsonResp('ClassTrackMove', 'Updated') } },
      delete: { summary: 'Remove a placed move', responses: { '204': { description: 'Removed' } } },
    },
    '/moves': {
      get: { summary: 'List global library moves', parameters: [{ name: 'template', in: 'query', required: false, schema: { type: 'string' } }], responses: { '200': arrayResp('Move', 'Global moves') } },
    },
    '/user-moves': {
      get: { summary: "List the caller's custom moves", responses: { '200': arrayResp('UserMove', 'User moves') } },
      post: { summary: 'Create a custom move', requestBody: jsonBody('CreateUserMove'), responses: { '201': jsonResp('UserMove', 'Created') } },
    },
    '/user-moves/{id}': {
      parameters: [idParam],
      patch: { summary: 'Update a custom move', requestBody: jsonBody('UpdateUserMove'), responses: { '200': jsonResp('UserMove', 'Updated') } },
      delete: { summary: 'Delete a custom move', responses: { '204': { description: 'Deleted' } } },
    },
    '/tracks': {
      post: { summary: 'Create a track', requestBody: jsonBody('CreateTrack'), responses: { '201': jsonResp('Track', 'Created') } },
    },
    '/tracks/{id}': {
      parameters: [idParam],
      get: { summary: 'Fetch a track with provider ids', responses: { '200': jsonResp('TrackWithProviderIds', 'Track') } },
      patch: { summary: 'Update a track', requestBody: jsonBody('UpdateTrack'), responses: { '200': jsonResp('Track', 'Updated') } },
    },
    '/tracks/{id}/provider-ids': {
      parameters: [idParam],
      post: { summary: 'Attach a provider id', requestBody: jsonBody('CreateTrackProviderId'), responses: { '201': jsonResp('TrackProviderId', 'Attached'), '409': { description: 'Duplicate provider id' } } },
    },
    '/track-provider-ids/{id}': {
      parameters: [idParam],
      delete: { summary: 'Remove a provider id', responses: { '204': { description: 'Removed' } } },
    },
    '/providers/{provider}/search': {
      parameters: [{ name: 'provider', in: 'path', required: true, schema: { type: 'string', enum: ['spotify', 'apple_music', 'soundcloud'] } }],
      get: { summary: 'Search a music provider (M2; SoundCloud live, others mock/pending)', parameters: [{ name: 'q', in: 'query', required: false, schema: { type: 'string' } }], responses: { '200': arrayResp('TrackSearchResult', 'Candidates'), '501': { description: 'Provider not yet integrated' }, '503': { description: 'Provider not configured' } } },
    },
    '/providers/track-import': {
      post: { summary: 'Import a provider candidate into the library', requestBody: jsonBody('ImportProviderTrack'), responses: { '201': jsonResp('TrackWithProviderIds', 'Imported'), '404': { description: 'No such provider track' }, '409': { description: 'Already in a library' } } },
    },
    '/providers/connections': {
      get: { summary: "List the caller's provider connections (tokens stripped)", responses: { '200': arrayResp('MusicConnectionView', 'Connections') } },
    },
    '/providers/{provider}/connect': {
      parameters: [{ name: 'provider', in: 'path', required: true, schema: { type: 'string', enum: ['spotify', 'apple_music', 'soundcloud'] } }],
      post: { summary: 'Start a provider OAuth connection (returns authorize URL)', responses: { '200': jsonResp('ConnectProviderResponse', 'Authorize URL or mock-connected'), '501': { description: 'Provider not yet integrated' }, '503': { description: 'Provider not configured' } } },
    },
    '/providers/{provider}/callback': {
      parameters: [{ name: 'provider', in: 'path', required: true, schema: { type: 'string', enum: ['spotify', 'apple_music', 'soundcloud'] } }],
      get: { summary: 'OAuth redirect target — exchanges the code, then 302s to the SPA', parameters: [{ name: 'code', in: 'query', required: false, schema: { type: 'string' } }, { name: 'state', in: 'query', required: false, schema: { type: 'string' } }], responses: { '302': { description: 'Redirect to the web app (connected or error)' } } },
    },
    '/providers/{provider}/connection': {
      parameters: [{ name: 'provider', in: 'path', required: true, schema: { type: 'string', enum: ['spotify', 'apple_music', 'soundcloud'] } }],
      delete: { summary: 'Disconnect a provider (immediate token forget)', responses: { '204': { description: 'Disconnected' } } },
    },
    '/mock/track-search': {
      get: { summary: 'Dev-only mock provider search', parameters: [{ name: 'q', in: 'query', required: false, schema: { type: 'string' } }], responses: { '200': arrayResp('TrackSearchResult', 'Candidates') } },
    },
    '/mock/track-import': {
      post: { summary: 'Dev-only import a mock candidate', requestBody: jsonBody('ImportProviderTrack'), responses: { '201': jsonResp('TrackWithProviderIds', 'Imported') } },
    },
    '/teams': {
      get: { summary: 'List my teams', responses: { '200': arrayResp('TeamWithRole', 'Teams') } },
      post: { summary: 'Create a team', requestBody: jsonBody('CreateTeam'), responses: { '201': jsonResp('Team', 'Created') } },
    },
    '/teams/{id}': {
      parameters: [idParam],
      get: { summary: 'Fetch a team (member)', responses: { '200': jsonResp('Team', 'Team') } },
    },
    '/teams/{id}/members': {
      parameters: [idParam],
      get: { summary: 'List members', responses: { '200': arrayResp('TeamMemberView', 'Members') } },
      post: { summary: 'Add a member (owner/admin)', requestBody: jsonBody('AddTeamMember'), responses: { '201': { description: 'Added' } } },
    },
    '/teams/{id}/members/{userId}': {
      parameters: [idParam, { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
      delete: { summary: 'Remove a member (owner/admin or self)', responses: { '204': { description: 'Removed' } } },
    },
    '/classes/{id}/shares': {
      parameters: [idParam],
      get: { summary: 'List shares on a class (owner)', responses: { '200': arrayResp('Share', 'Shares') } },
    },
    '/shares': {
      post: { summary: 'Share a class with a user or team', requestBody: jsonBody('CreateShare'), responses: { '201': jsonResp('Share', 'Created'), '200': jsonResp('Share', 'Updated (re-share)') } },
    },
    '/shares/{id}': {
      parameters: [idParam],
      patch: { summary: 'Change a share permission', requestBody: jsonBody('UpdateShare'), responses: { '200': jsonResp('Share', 'Updated') } },
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
console.log(`Wrote ${outFile} — ${Object.keys(schemas).length} schemas, ${Object.keys(doc.paths).length} paths.`);
