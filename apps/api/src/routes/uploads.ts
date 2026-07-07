import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';
import { HttpError } from '../lib/errors.js';

// Intentionally PUBLIC — no `requireSession` by design. Class covers are served at
// unguessable UUIDv4 capability URLs (`covers/<uuid>.<ext>`, minted in classes.ts);
// the URL itself is the access token, matching how object storage / CDNs serve user
// images. The guarded surface is the WRITE path (POST cover in classes.ts:
// requireSession + requireAccess). A session gate here would protect nothing an
// unguessable key doesn't already and would break <img>/prefetch loading. Revisit only
// if class covers become private-per-viewer (not the current solo-first,
// sharing-deferred model).
export const uploadsRoutes = new Hono<AppEnv>();

/** GET /uploads/covers/:filename — serve R2 images */
uploadsRoutes.get('/covers/:filename', async (c) => {
  if (!c.env.IMAGES_BUCKET) {
    throw new HttpError(500, 'INTERNAL_SERVER_ERROR', 'Images bucket not configured.');
  }

  const filename = c.req.param('filename');
  const objectKey = `covers/${filename}`;

  const object = await c.env.IMAGES_BUCKET.get(objectKey);
  if (!object) {
    throw new HttpError(404, 'NOT_FOUND', 'Image not found.');
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options', 'nosniff');

  return new Response(object.body, { headers });
});
