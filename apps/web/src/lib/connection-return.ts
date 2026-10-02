import type { Provider } from '@ritmofit/shared';
import { PROVIDER_ORDER } from './providers.js';

const KEY = 'rf-provider-return';
export interface ConnectionReturn {
  userId: string;
  destination: 'classes' | 'music' | 'live' | 'account';
  classId?: string;
  provider: Provider;
  createdAt: number;
}
export function rememberConnectionReturn(value: Omit<ConnectionReturn, 'createdAt'>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...value, createdAt: Date.now() }));
  } catch {
    /* Navigation still works without storage. */
  }
}
export function consumeConnectionReturn(
  userId: string,
  provider?: string,
): ConnectionReturn | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as ConnectionReturn;
    if (
      value.userId !== userId ||
      !['classes', 'music', 'live', 'account'].includes(value.destination) ||
      !PROVIDER_ORDER.includes(value.provider) ||
      (provider && provider !== value.provider) ||
      typeof value.createdAt !== 'number' ||
      Date.now() - value.createdAt > 15 * 60_000 ||
      value.createdAt > Date.now() ||
      (value.classId !== undefined && !/^[a-f0-9-]{36}$/i.test(value.classId))
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
