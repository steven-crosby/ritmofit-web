const PENDING_KEY = 'ritmofit:onboarding-video:pending-signup:v1';
const DISMISSED_KEY = 'ritmofit:onboarding-video:dismissed:v1';

export const ONBOARDING_VIDEO_PENDING_KEY = PENDING_KEY;
export const ONBOARDING_VIDEO_DISMISSED_KEY = DISMISSED_KEY;

function storage() {
  if (typeof window === 'undefined') return null;
  try {
    const testKey = 'ritmofit:onboarding-video:storage-test';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function markOnboardingVideoPending() {
  const store = storage();
  if (!store) return;
  store.setItem(PENDING_KEY, '1');
  store.removeItem(DISMISSED_KEY);
}

export function consumeOnboardingVideoPending() {
  const store = storage();
  if (!store) return false;
  const pending = store.getItem(PENDING_KEY) === '1';
  store.removeItem(PENDING_KEY);
  return pending && store.getItem(DISMISSED_KEY) !== '1';
}

export function markOnboardingVideoDismissed() {
  const store = storage();
  if (!store) return;
  store.setItem(DISMISSED_KEY, '1');
  store.removeItem(PENDING_KEY);
}

export function hasDismissedOnboardingVideo() {
  return storage()?.getItem(DISMISSED_KEY) === '1';
}
