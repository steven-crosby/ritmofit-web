/**
 * Share a class with another user by email (M4 sharing UX). Owner-only — the
 * dashboard only mounts this for classes the caller owns, and every route is
 * owner-gated server-side regardless. Lists current shares with a permission
 * toggle + revoke. Permission is encoded redundantly (icon + label, never color
 * alone) per the design-system accessibility rules.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ShareView, SharePermission, TeamWithRole } from '@ritmofit/shared';
import { listShares, createShare, updateShare, deleteShare, listTeams } from '../lib/api.js';

const PERMISSION_LABEL: Record<SharePermission, string> = { view: 'Can view', edit: 'Can edit' };
const PERMISSION_ICON: Record<SharePermission, string> = { view: '👁', edit: '✎' };

export function ShareDialog({
  classId,
  classTitle,
  onClose,
}: {
  classId: string;
  classTitle: string;
  onClose: () => void;
}) {
  const [shares, setShares] = useState<ShareView[] | null>(null);
  const [teams, setTeams] = useState<TeamWithRole[]>([]);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<SharePermission>('view');
  const [teamId, setTeamId] = useState('');
  const [teamPermission, setTeamPermission] = useState<SharePermission>('view');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setShares(await listShares(classId));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [classId]);

  useEffect(() => {
    void refresh();
    // The team picker offers the caller's own teams; failure just hides it.
    listTeams()
      .then(setTeams)
      .catch(() => setTeams([]));
    emailRef.current?.focus();
  }, [refresh]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const target = email.trim();
      if (!target) return;
      setBusy(true);
      setError(null);
      try {
        await createShare({ resourceType: 'class', resourceId: classId, targetEmail: target, permission });
        setEmail('');
        await refresh();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [classId, email, permission, refresh],
  );

  const submitTeam = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!teamId) return;
      setBusy(true);
      setError(null);
      try {
        await createShare({ resourceType: 'class', resourceId: classId, targetTeamId: teamId, permission: teamPermission });
        setTeamId('');
        await refresh();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [classId, teamId, teamPermission, refresh],
  );

  const changePermission = useCallback(
    async (id: string, next: SharePermission) => {
      try {
        await updateShare(id, next);
        await refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [refresh],
  );

  const revoke = useCallback(
    async (id: string) => {
      try {
        await deleteShare(id);
        await refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [refresh],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Share ${classTitle}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-panel bg-bg-raised p-6 shadow-lifted">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-text-primary">Share class</h2>
            <p className="font-ui text-sm text-text-secondary">{classTitle}</p>
          </div>
          <button
            className="rounded-pill px-2 py-1 font-ui text-sm text-text-tertiary hover:text-text-primary"
            onClick={onClose}
            aria-label="Close share dialog"
          >
            ✕
          </button>
        </header>

        <form className="flex flex-col gap-2" onSubmit={submit}>
          <label htmlFor="share-email" className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
            Invite by email
          </label>
          <div className="flex gap-2">
            <input
              id="share-email"
              ref={emailRef}
              type="email"
              className="flex-1 rounded-pill border border-interactive/30 bg-bg-base px-3 py-1.5 font-ui text-sm text-text-primary"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
            <select
              className="rounded-pill border border-interactive/30 bg-bg-base px-3 py-1.5 font-ui text-sm text-text-primary"
              value={permission}
              onChange={(e) => setPermission(e.target.value as SharePermission)}
              aria-label="Permission for the invited user"
              disabled={busy}
            >
              <option value="view">Can view</option>
              <option value="edit">Can edit</option>
            </select>
            <button
              className="rounded-pill rf-btn-primary px-4 py-1.5 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
              disabled={busy || !email.trim()}
            >
              Share
            </button>
          </div>
        </form>

        {teams.length > 0 && (
          <form className="flex flex-col gap-2" onSubmit={submitTeam}>
            <label htmlFor="share-team" className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
              Share with a team
            </label>
            <div className="flex gap-2">
              <select
                id="share-team"
                className="flex-1 rounded-pill border border-interactive/30 bg-bg-base px-3 py-1.5 font-ui text-sm text-text-primary"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                disabled={busy}
              >
                <option value="">Select a team…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-pill border border-interactive/30 bg-bg-base px-3 py-1.5 font-ui text-sm text-text-primary"
                value={teamPermission}
                onChange={(e) => setTeamPermission(e.target.value as SharePermission)}
                aria-label="Permission for the team"
                disabled={busy}
              >
                <option value="view">Can view</option>
                <option value="edit">Can edit</option>
              </select>
              <button
                className="rounded-pill rf-btn-primary px-4 py-1.5 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
                disabled={busy || !teamId}
              >
                Share
              </button>
            </div>
          </form>
        )}

        {error && (
          <p className="font-ui text-sm text-intensity-all_out" role="alert">
            {error}
          </p>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Shared with</h3>
          {shares === null ? (
            <p className="font-ui text-sm text-text-tertiary">Loading…</p>
          ) : shares.length === 0 ? (
            <p className="font-ui text-sm text-text-tertiary">Not shared with anyone yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {shares.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-card bg-bg-base px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate font-ui text-sm text-text-primary" title={shareTarget(s)}>
                    {shareTarget(s)}
                  </span>
                  {s.targetTeamId ? (
                    // Team shares carry a single permission; no per-row toggle here.
                    <span className="font-ui text-xs text-text-secondary">
                      {PERMISSION_ICON[s.permission]} {PERMISSION_LABEL[s.permission]}
                    </span>
                  ) : (
                    <select
                      className="rounded-pill border border-interactive/30 bg-bg-raised px-2 py-1 font-ui text-xs text-text-primary"
                      value={s.permission}
                      onChange={(e) => changePermission(s.id, e.target.value as SharePermission)}
                      aria-label={`Permission for ${shareTarget(s)}`}
                    >
                      <option value="view">👁 Can view</option>
                      <option value="edit">✎ Can edit</option>
                    </select>
                  )}
                  <button
                    className="rounded-pill px-2 py-1 font-ui text-xs text-text-tertiary hover:text-intensity-all_out"
                    onClick={() => revoke(s.id)}
                    aria-label={`Revoke access for ${shareTarget(s)}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** Human label for a share's target: a team name, or a user's email/name. */
function shareTarget(s: ShareView): string {
  if (s.targetTeamId) return s.targetTeamName ?? 'A team';
  return s.targetDisplayName ?? s.targetEmail ?? 'A user';
}
