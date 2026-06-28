import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '@ritmofit/shared';
import { authClient } from '../lib/auth-client.js';
import { getMe, updateMe } from '../lib/api.js';
import { Dialog } from './Dialog.js';
import { PendingList } from './PendingList.js';

function normalizeOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function AccountDialog({
  onClose,
  onProfileUpdated,
}: {
  onClose: () => void;
  onProfileUpdated?: (user: User) => void;
}) {
  const [profile, setProfile] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoadingError(null);
    setNotice(null);
    try {
      const user = await getMe();
      setProfile(user);
      setDisplayName(user.displayName ?? '');
      setImageUrl(user.imageUrl ?? '');
    } catch (e) {
      setLoadingError((e as Error).message);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setNotice(null);
    try {
      const updated = await updateMe({
        displayName: normalizeOptional(displayName),
        imageUrl: normalizeOptional(imageUrl),
      });
      setProfile(updated);
      setDisplayName(updated.displayName ?? '');
      setImageUrl(updated.imageUrl ?? '');
      setNotice('Profile updated.');
      onProfileUpdated?.(updated);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      onClose={onClose}
      label="Account settings"
      panelClassName="flex w-full max-w-md flex-col gap-4 rounded-panel bg-bg-raised p-6 shadow-lifted"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-text-primary">Account</h2>
          <p className="font-ui text-xs text-text-tertiary">
            Profile details used across teams and sharing.
          </p>
        </div>
        <button
          className="rounded-pill px-2 py-1 font-ui text-sm text-text-tertiary hover:text-text-primary"
          onClick={onClose}
          aria-label="Close account dialog"
        >
          ×
        </button>
      </header>

      {loadingError && <p className="font-ui text-sm text-state-danger">{loadingError}</p>}
      {notice && <p className="font-ui text-sm text-state-positive">{notice}</p>}
      {saveError && <p className="font-ui text-sm text-state-danger">{saveError}</p>}

      {!profile ? (
        <PendingList error={loadingError} onRetry={refresh} />
      ) : (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <section className="flex items-center gap-3 rounded-card border border-border-subtle bg-bg-surface p-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-subtle bg-bg-base font-display text-lg font-semibold text-text-primary">
              {profile.imageUrl ? (
                <img
                  src={profile.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                (profile.displayName ?? profile.email).slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-ui text-sm font-medium text-text-primary">
                {profile.displayName ?? 'Unnamed instructor'}
              </p>
              <p className="truncate font-ui text-xs text-text-tertiary">{profile.email}</p>
            </div>
          </section>

          <label className="flex flex-col gap-1.5 font-ui text-sm text-text-secondary">
            Display name
            <input
              className="rounded-card border border-border-subtle bg-bg-base px-3 py-2 text-text-primary outline-none focus:border-interactive"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Instructor name"
              maxLength={200}
            />
          </label>

          <label className="flex flex-col gap-1.5 font-ui text-sm text-text-secondary">
            Profile image URL
            <input
              className="rounded-card border border-border-subtle bg-bg-base px-3 py-2 text-text-primary outline-none focus:border-interactive"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              inputMode="url"
            />
          </label>

          <div className="rounded-card border border-border-subtle bg-bg-surface p-3">
            <p className="font-ui text-xs uppercase text-text-tertiary">Sign-in email</p>
            <p className="break-all font-ui text-sm text-text-primary">{profile.email}</p>
            <p className="mt-1 font-ui text-xs text-text-tertiary">
              Email changes stay with the sign-in provider for now.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-4">
            <button
              type="button"
              className="rounded-pill border border-border-subtle px-4 py-2 font-ui text-sm text-text-secondary transition-colors hover:text-text-primary"
              onClick={() => authClient.signOut()}
            >
              Sign out
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-pill bg-brand px-4 py-2 font-ui text-sm font-semibold text-bg-base transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
