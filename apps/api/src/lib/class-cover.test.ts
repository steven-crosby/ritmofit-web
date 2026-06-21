import { describe, expect, it, vi } from 'vitest';
import { classCoverObjectKey, deleteClassCover } from './class-cover.js';

describe('classCoverObjectKey', () => {
  it('extracts only generated cover keys', () => {
    expect(
      classCoverObjectKey(
        'https://ritmofit.studio/api/v1/uploads/covers/123e4567-e89b-12d3-a456-426614174000.webp',
      ),
    ).toBe('covers/123e4567-e89b-12d3-a456-426614174000.webp');
    expect(classCoverObjectKey('https://example.com/untrusted.jpg')).toBeNull();
    expect(
      classCoverObjectKey('https://ritmofit.studio/api/v1/uploads/covers/../../private'),
    ).toBeNull();
    expect(classCoverObjectKey(null)).toBeNull();
  });
});

describe('deleteClassCover', () => {
  it('deletes a managed object and absorbs cleanup failures', async () => {
    const deleteObject = vi.fn().mockRejectedValue(new Error('R2 unavailable'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const bucket: Pick<R2Bucket, 'delete'> = { delete: deleteObject };

    await expect(
      deleteClassCover(
        bucket,
        'https://ritmofit.studio/api/v1/uploads/covers/123e4567-e89b-12d3-a456-426614174000.jpg',
      ),
    ).resolves.toBeUndefined();
    expect(deleteObject).toHaveBeenCalledWith('covers/123e4567-e89b-12d3-a456-426614174000.jpg');
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
