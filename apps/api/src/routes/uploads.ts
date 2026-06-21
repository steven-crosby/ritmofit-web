import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';
import { HttpError } from '../lib/errors.js';

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
