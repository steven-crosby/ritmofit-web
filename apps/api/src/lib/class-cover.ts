const COVER_PATH_PREFIX = '/api/v1/uploads/covers/';
const COVER_FILENAME_PATTERN = /^[0-9a-f-]+\.(?:jpg|png|webp)$/;

/** Return the R2 key for a Worker-managed class cover, never for an arbitrary URL. */
export function classCoverObjectKey(coverImageUrl: string | null): string | null {
  if (!coverImageUrl) return null;

  try {
    const pathname = new URL(coverImageUrl).pathname;
    if (!pathname.startsWith(COVER_PATH_PREFIX)) return null;
    const filename = pathname.slice(COVER_PATH_PREFIX.length);
    if (!COVER_FILENAME_PATTERN.test(filename)) return null;
    return `covers/${filename}`;
  } catch {
    return null;
  }
}

/**
 * Remove an obsolete cover without turning an already-committed D1 change into a
 * client-visible failure. D1 and R2 are not transactional together; a failed
 * cleanup is observable and retryable by an operator, while the class remains valid.
 */
export async function deleteClassCover(
  bucket: Pick<R2Bucket, 'delete'>,
  coverImageUrl: string | null,
): Promise<void> {
  const objectKey = classCoverObjectKey(coverImageUrl);
  if (!objectKey) return;

  try {
    await bucket.delete(objectKey);
  } catch (error) {
    console.error(
      JSON.stringify({
        message: 'class cover cleanup failed',
        objectKey,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
