// @vitest-environment jsdom
/**
 * B-02 repro (lane b-web, audit 4c344e2). Copy to apps/web/src/components/ and run:
 *   pnpm --filter @ritmofit/web exec vitest run src/components/b-web-duplicate-class.repro.test.tsx
 *
 * Classes > Recents row ⋯ > Duplicate calls `void onDuplicate(cls)` (ClassesHome.tsx RowMenu).
 * Dashboard's onDuplicate (copyClass → applyTagFilter → refreshClasses → openClass) has no
 * catch and no in-flight guard. Assertions describe CORRECT behaviour; both FAIL on 4c344e2.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ClassListItem } from '@ritmofit/shared';
import { Dashboard } from './Dashboard.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api.js')>();
  const mocked = Object.fromEntries(
    Object.entries(actual).map(([k, v]) => [k, typeof v === 'function' && k !== 'ApiError' ? vi.fn() : v]),
  );
  return { ...mocked, ApiError: actual.ApiError };
});
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));
vi.mock('../lib/auth-client.js', () => ({ authClient: { signOut: vi.fn() } }));

const ride: ClassListItem = {
  id: '00000000-0000-4000-8000-0000000000a1',
  ownerUserId: 'me',
  title: 'Morning ride',
  description: null,
  template: 'cycle',
  status: 'draft',
  visibility: 'private',
  timelineMode: 'sequential',
  targetDurationMs: null,
  scaffoldRecipeId: null,
  createdAt: 1,
  updatedAt: 1,
  lastOpenedAt: null,
  featuredCategory: null,
  coverImageUrl: null,
  tags: [],
  accessLevel: 'owner',
  trackCount: 0,
  totalDurationMs: 0,
  albumArtUrls: [],
};

const unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => unhandled.push(reason);

beforeEach(() => {
  unhandled.length = 0;
  process.on('unhandledRejection', onUnhandled);
  const values = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      get length() {
        return values.size;
      },
      clear: () => values.clear(),
      getItem: (k: string) => values.get(k) ?? null,
      key: (i: number) => Array.from(values.keys())[i] ?? null,
      removeItem: (k: string) => values.delete(k),
      setItem: (k: string, v: string) => values.set(k, String(v)),
    },
  });
  vi.mocked(api.listClasses).mockResolvedValue({ items: [ride], nextCursor: null });
  vi.mocked(api.getClassShelfPayload).mockRejectedValue(new Error('n/a'));
  vi.mocked(api.listConnections).mockResolvedValue([]);
});
afterEach(() => {
  process.off('unhandledRejection', onUnhandled);
  cleanup();
  vi.clearAllMocks();
  window.sessionStorage?.clear();
});

async function duplicateFromMenu() {
  fireEvent.click(await screen.findByRole('button', { name: 'More actions — Morning ride' }));
  fireEvent.click(screen.getByRole('button', { name: 'Duplicate — Morning ride' }));
}

describe('B-02 Duplicate class from the Recents row menu', () => {
  it('tells the instructor when the copy fails', async () => {
    vi.mocked(api.copyClass).mockRejectedValue(
      new api.ApiError('Ritmo could not copy this class.', 'INTERNAL', 500),
    );
    render(<Dashboard userId="me" userName="Tester" />);
    await duplicateFromMenu();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(api.copyClass).toHaveBeenCalledTimes(1);
    // Observed on 4c344e2: nothing on screen; the rejection escapes as unhandled.
    expect(unhandled).toHaveLength(0);
    expect(screen.queryByText('Ritmo could not copy this class.')).not.toBeNull();
  });

  it('does not create a second copy when Duplicate is chosen again while the first is in flight', async () => {
    let resolveCopy!: (v: unknown) => void;
    vi.mocked(api.copyClass).mockReturnValue(
      new Promise((r) => {
        resolveCopy = r;
      }) as never,
    );
    render(<Dashboard userId="me" userName="Tester" />);
    await duplicateFromMenu();
    await duplicateFromMenu();
    // Correct: one in-flight copy per class. Observed on 4c344e2: two POST /classes/:id/copy.
    expect(api.copyClass).toHaveBeenCalledTimes(1);
    resolveCopy({ ...ride, id: '00000000-0000-4000-8000-0000000000a2', title: 'Morning ride (copy)' });
  });
});
