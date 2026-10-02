import { useEffect, useRef, useState } from 'react';
import type { Provider } from '@ritmofit/shared';
import { connectAppleMusic, connectProvider, getAppleMusicConfig } from './api.js';
import { prepareAppleMusic, type MusicKitInstance } from './musickit.js';
import { providerLabel } from './providers.js';

export type ConnectionStage = 'preparing' | 'ready' | 'authorizing' | 'saving' | 'redirecting';
export interface ConnectionOperation {
  provider: Provider;
  stage: ConnectionStage;
  slow: boolean;
  error?: string;
}

/** One operation for a surface, shared by its service cards or dialog rows. */
export function useProviderConnect({
  onConnected,
  beforeRedirect,
  onPrepared,
}: {
  onConnected: (signal: AbortSignal) => void | Promise<void>;
  beforeRedirect?: (provider: Provider) => void;
  /** Preflight may accept an already-authorized browser without requesting consent again. */
  onPrepared?: (instance: MusicKitInstance) => boolean;
}) {
  const [operation, setOperation] = useState<ConnectionOperation | null>(null);
  const epoch = useRef(0);
  const active = useRef(false);
  const instance = useRef<MusicKitInstance | null>(null);
  const abort = useRef<AbortController | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearTimers = () => {
    clearTimeout(deadline.current);
    clearTimeout(slowTimer.current);
  };
  const cancel = () => {
    epoch.current += 1;
    active.current = false;
    abort.current?.abort();
    clearTimers();
    setOperation(null);
  };
  useEffect(
    () => () => {
      epoch.current += 1;
      abort.current?.abort();
      clearTimers();
    },
    [],
  );

  const start = async (provider: Provider) => {
    if (active.current) return;
    active.current = true;
    const id = ++epoch.current;
    const controller = new AbortController();
    abort.current = controller;
    const isCurrent = () => epoch.current === id;
    let redirectPending = false;
    const stage = (value: ConnectionStage, timeoutMs = 20_000) => {
      clearTimers();
      setOperation({ provider, stage: value, slow: false });
      slowTimer.current = setTimeout(() => {
        if (isCurrent()) setOperation((prev) => prev && { ...prev, slow: true });
      }, 10_000);
      deadline.current = setTimeout(() => {
        if (!isCurrent()) return;
        epoch.current += 1;
        active.current = false;
        controller.abort();
        clearTimers();
        setOperation({
          provider,
          stage: value,
          slow: true,
          error: `${providerLabel(provider)} did not finish ${value === 'authorizing' ? 'authorization' : 'connecting'}. Close any provider sign-in window, then try again.`,
        });
      }, timeoutMs);
    };
    try {
      if (provider === 'apple_music') {
        if (!instance.current) {
          stage('preparing');
          const config = await getAppleMusicConfig(controller.signal);
          if (!isCurrent()) return;
          const prepared = await prepareAppleMusic(config);
          if (!isCurrent()) return;
          instance.current = prepared;
          if (onPrepared?.(prepared)) {
            setOperation(null);
            return;
          }
          clearTimers();
          active.current = false;
          setOperation({ provider, stage: 'ready', slow: false });
          // Consent opens from a fresh explicit tap, after SDK/network preparation.
          return;
        }
        if (onPrepared?.(instance.current)) {
          setOperation(null);
          return;
        }
        stage('authorizing', 60_000);
        const consent = instance.current.authorize();
        const token = await consent;
        if (!isCurrent()) return;
        if (!token) throw new Error('Apple Music authorization was cancelled.');
        stage('saving');
        await connectAppleMusic(token, controller.signal);
      } else {
        stage('preparing');
        const result = await connectProvider(provider, controller.signal);
        if (!isCurrent()) return;
        if (result.authorizeUrl) {
          beforeRedirect?.(provider);
          stage('redirecting');
          window.location.assign(result.authorizeUrl);
          redirectPending = true;
          return;
        }
      }
      if (!isCurrent()) return;
      await onConnected(controller.signal);
      if (isCurrent()) setOperation(null);
    } catch (e) {
      if (isCurrent()) {
        setOperation((previous) => ({
          provider,
          stage: previous?.stage ?? 'preparing',
          slow: false,
          error: e instanceof Error ? e.message : 'Could not connect. Try again.',
        }));
      }
    } finally {
      if (isCurrent() && !redirectPending) {
        clearTimers();
        active.current = false;
      }
    }
  };
  return { operation, start, cancel };
}

export type ProviderConnectFlow = ReturnType<typeof useProviderConnect>;
