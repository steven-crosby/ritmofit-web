// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  consumeOnboardingVideoPending,
  hasDismissedOnboardingVideo,
  markOnboardingVideoDismissed,
  markOnboardingVideoPending,
  ONBOARDING_VIDEO_DISMISSED_KEY,
  ONBOARDING_VIDEO_PENDING_KEY,
} from './onboarding-video.js';

function installLocalStorage() {
  const values = new Map<string, string>();
  const localStorage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, String(value)),
  } satisfies Storage;

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: localStorage,
  });
}

beforeEach(() => {
  installLocalStorage();
});

afterEach(() => {
  window.localStorage?.clear();
});

describe('onboarding video storage', () => {
  it('marks a successful signup as a one-time pending tutorial trigger', () => {
    markOnboardingVideoPending();

    expect(window.localStorage.getItem(ONBOARDING_VIDEO_PENDING_KEY)).toBe('1');
    expect(consumeOnboardingVideoPending()).toBe(true);
    expect(consumeOnboardingVideoPending()).toBe(false);
  });

  it('dismisses the tutorial and clears any pending signup marker', () => {
    markOnboardingVideoPending();
    markOnboardingVideoDismissed();

    expect(window.localStorage.getItem(ONBOARDING_VIDEO_PENDING_KEY)).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_VIDEO_DISMISSED_KEY)).toBe('1');
    expect(hasDismissedOnboardingVideo()).toBe(true);
    expect(consumeOnboardingVideoPending()).toBe(false);
  });

  it('lets a new signup show the tutorial even if this browser dismissed it before', () => {
    markOnboardingVideoDismissed();

    markOnboardingVideoPending();

    expect(hasDismissedOnboardingVideo()).toBe(false);
    expect(consumeOnboardingVideoPending()).toBe(true);
  });
});
