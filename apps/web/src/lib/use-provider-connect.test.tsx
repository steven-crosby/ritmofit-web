// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useProviderConnect } from './use-provider-connect.js';
import { ProviderConnectAction } from '../components/ProviderConnectAction.js';
import * as api from './api.js';
import { prepareAppleMusic, type MusicKitInstance } from './musickit.js';

vi.mock('./api.js');
vi.mock('./musickit.js', () => ({ prepareAppleMusic: vi.fn() }));
const authorize = vi.fn();
const connected = vi.fn();
function pending<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function Harness() {
  const flow = useProviderConnect({ onConnected: connected });
  return <ProviderConnectAction provider="apple_music" label="Connect Apple Music" flow={flow} />;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getAppleMusicConfig).mockResolvedValue({
    developerToken: 'test',
    storefront: null,
  });
  vi.mocked(prepareAppleMusic).mockResolvedValue({ authorize } as unknown as MusicKitInstance);
  vi.mocked(api.connectAppleMusic).mockResolvedValue(undefined);
  authorize.mockResolvedValue('test-user-token');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('provider connection lifecycle', () => {
  it('prepares without consent, then opens consent synchronously on a fresh tap', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect Apple Music' }));
    const consent = await screen.findByRole('button', { name: 'Authorize Apple Music' });
    expect(authorize).not.toHaveBeenCalled();
    fireEvent.click(consent);
    expect(authorize).toHaveBeenCalledTimes(1);
    await screen.findByRole('button', { name: 'Connect Apple Music' });
    expect(api.connectAppleMusic).toHaveBeenCalledWith('test-user-token', expect.any(AbortSignal));
    expect(connected).toHaveBeenCalledTimes(1);
  });
  it('never saves a late token after cancellation', async () => {
    const consent = pending<string>();
    authorize.mockReturnValue(consent.promise);
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect Apple Music' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Authorize Apple Music' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Apple Music connection' }));
    await act(async () => {
      consent.resolve('late-token');
    });
    expect(api.connectAppleMusic).not.toHaveBeenCalled();
    expect(connected).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Connect Apple Music' })).toBeTruthy();
  });
  it('does not authorize or save after unmount', async () => {
    const preparation = pending<MusicKitInstance>();
    vi.mocked(prepareAppleMusic).mockReturnValue(preparation.promise);
    const view = render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect Apple Music' }));
    await act(async () => {});
    view.unmount();
    await act(async () => {
      preparation.resolve({ authorize } as unknown as MusicKitInstance);
    });
    expect(authorize).not.toHaveBeenCalled();
    expect(api.connectAppleMusic).not.toHaveBeenCalled();
  });
  it('shows slow preparation, times out, and ignores its late completion', async () => {
    vi.useFakeTimers();
    const config = pending<{ developerToken: string; storefront: null }>();
    vi.mocked(api.getAppleMusicConfig).mockReturnValue(config.promise);
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect Apple Music' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.getByRole('status').textContent).toContain('Still waiting');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.getByRole('alert').textContent).toContain('did not finish');
    await act(async () => {
      config.resolve({ developerToken: 'test', storefront: null });
    });
    expect(prepareAppleMusic).not.toHaveBeenCalled();
    expect(
      (screen.getByRole('button', { name: 'Connect Apple Music' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });
  it('bounds unanswered consent and never persists its late token', async () => {
    vi.useFakeTimers();
    const consent = pending<string>();
    authorize.mockReturnValue(consent.promise);
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect Apple Music' }));
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'Authorize Apple Music' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(screen.getByRole('alert').textContent).toContain('authorization');
    await act(async () => {
      consent.resolve('late-token');
    });
    expect(api.connectAppleMusic).not.toHaveBeenCalled();
    expect(connected).not.toHaveBeenCalled();
  });
  it('ignores duplicate taps and lets a cancelled consent be retried', async () => {
    authorize.mockRejectedValueOnce(new Error('Consent cancelled.'));
    render(<Harness />);
    const connect = screen.getByRole('button', { name: 'Connect Apple Music' });
    fireEvent.click(connect);
    fireEvent.click(connect);
    fireEvent.click(await screen.findByRole('button', { name: 'Authorize Apple Music' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Consent cancelled');
    expect(api.getAppleMusicConfig).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Connect Apple Music' }));
    await screen.findByRole('button', { name: 'Connect Apple Music' });
    expect(authorize).toHaveBeenCalledTimes(2);
  });
});
