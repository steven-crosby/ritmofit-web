// @vitest-environment jsdom
/**
 * Reviewer B audit repro (2026-10-27, SHA 4e0b150). Not product code.
 *
 * B-6: `refreshClasses` has no request generation. Two quick tag-filter clicks
 * whose responses land out of order leave the newer chip pressed while the
 * list shows the older filter's classes. Asserts the CORRECT behaviour and is
 * expected to FAIL at HEAD.
 */
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ClassListItem } from '@ritmofit/shared';
import { Dashboard } from './Dashboard.js';
import * as api from '../lib/api.js';
import type { ClassListPage } from '../lib/api.js';

vi.mock('../lib/api.js');
vi.mock('../lib/auth-client.js', () => ({ authClient: { signOut: vi.fn() } }));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.sessionStorage?.clear();
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function cls(n: number, title: string, tags: string[]): ClassListItem {
  return {
    id: `00000000-0000-4000-8000-00000000000${n}`,
    ownerUserId: 'me',
    title,
    description: null,
    template: 'cycle',
    status: 'draft',
    visibility: 'private',
    timelineMode: 'sequential',
    targetDurationMs: null,
    scaffoldRecipeId: null,
    createdAt: n,
    updatedAt: n,
    lastOpenedAt: null,
    featuredCategory: null,
    coverImageUrl: null,
    tags,
    accessLevel: 'owner',
    trackCount: 0,
    totalDurationMs: 0,
    albumArtUrls: [],
  } as unknown as ClassListItem;
}

it('B-6: the class list matches the pressed tag after out-of-order responses', async () => {
  const hiitRide = cls(1, 'Hiit ride', ['hiit']);
  const yogaRide = cls(2, 'Yoga ride', ['yoga']);
  const hiit = deferred<ClassListPage>();
  const yoga = deferred<ClassListPage>();
  vi.mocked(api.listClasses).mockImplementation(async (_l, _c, tag) => {
    if (tag === 'hiit') return hiit.promise;
    if (tag === 'yoga') return yoga.promise;
    return { items: [hiitRide, yogaRide], nextCursor: null };
  });
  render(<Dashboard userId="me" userName="Tester" />);

  fireEvent.click(await screen.findByRole('button', { name: '#hiit' }));
  fireEvent.click(screen.getByRole('button', { name: '#yoga' }));
  await act(async () => {
    yoga.resolve({ items: [yogaRide], nextCursor: null });
    await yoga.promise;
  });
  await act(async () => {
    hiit.resolve({ items: [hiitRide], nextCursor: null });
    await hiit.promise;
  });

  const pressed = screen.getByRole('button', { name: '#yoga' }).getAttribute('aria-pressed');
  const shown = ['Hiit ride', 'Yoga ride'].filter((t) => screen.queryAllByText(t).length > 0);
  console.info('[B-6] #yoga pressed:', pressed, '| classes shown:', shown.join(', '));
  expect(shown).toEqual(['Yoga ride']);
});
