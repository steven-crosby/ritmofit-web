/**
 * Manage teams (M4 team-sharing UX): create a team, view its members, add a
 * member by email, and remove/leave. Member-management affordances are gated by
 * the caller's role (`owner`/`admin` from `GET /teams`); the backend enforces the
 * same governance regardless. A team is the share target populated here so
 * share-to-team (in ShareDialog) becomes meaningful.
 */
import { useCallback, useEffect, useState } from 'react';
import type { TeamWithRole, TeamMemberView } from '@ritmofit/shared';
import { listTeams, createTeam, listMembers, addMember, removeMember } from '../lib/api.js';
import { Dialog } from './Dialog.js';

export function TeamsDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [teams, setTeams] = useState<TeamWithRole[] | null>(null);
  const [selected, setSelected] = useState<TeamWithRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshTeams = useCallback(async () => {
    try {
      setTeams(await listTeams());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refreshTeams();
  }, [refreshTeams]);

  return (
    <Dialog
      onClose={onClose}
      label="Manage teams"
      panelClassName="flex w-full max-w-2xl flex-col gap-4 rounded-panel bg-bg-raised p-6 shadow-lifted"
    >
      <header className="flex items-start justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-text-primary">Teams</h2>
        <button
          className="rounded-pill px-2 py-1 font-ui text-sm text-text-tertiary hover:text-text-primary"
          onClick={onClose}
          aria-label="Close teams dialog"
        >
          ✕
        </button>
      </header>

      {error && (
        <p className="font-ui text-sm text-intensity-all_out" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-[1fr_1.4fr] gap-4">
        <section className="flex flex-col gap-3">
          <CreateTeamForm
            onCreated={async () => {
              setError(null);
              await refreshTeams();
            }}
            onError={setError}
          />
          {teams === null ? (
            <p className="font-ui text-sm text-text-tertiary">Loading…</p>
          ) : teams.length === 0 ? (
            <p className="font-ui text-sm text-text-tertiary">
              No teams yet. Create one to share with a group.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {teams.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelected(t)}
                    className={`w-full rounded-card bg-bg-base p-3 text-left font-ui ${
                      selected?.id === t.id ? 'ring-2 ring-interactive' : ''
                    }`}
                  >
                    <span className="text-text-primary">{t.name}</span>
                    <span className="ml-2 font-data text-xs uppercase text-text-tertiary">
                      {t.role}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          {selected ? (
            <TeamMembers team={selected} meUserId={userId} onError={setError} />
          ) : (
            <p className="font-ui text-sm text-text-tertiary">Select a team to manage members.</p>
          )}
        </section>
      </div>
    </Dialog>
  );
}

function CreateTeamForm({
  onCreated,
  onError,
}: {
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
          await createTeam(name.trim());
          setName('');
          onCreated();
        } catch (err) {
          onError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        className="flex-1 rounded-pill border border-interactive/30 bg-bg-base px-3 py-1.5 font-ui text-sm text-text-primary"
        placeholder="New team name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={busy}
        aria-label="New team name"
      />
      <button
        className="rounded-pill rf-btn-primary px-4 py-1.5 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
        disabled={busy || !name.trim()}
      >
        Create
      </button>
    </form>
  );
}

function TeamMembers({
  team,
  meUserId,
  onError,
}: {
  team: TeamWithRole;
  meUserId: string;
  onError: (msg: string) => void;
}) {
  const [members, setMembers] = useState<TeamMemberView[] | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const canManage = team.role === 'owner' || team.role === 'admin';

  const refresh = useCallback(async () => {
    try {
      setMembers(await listMembers(team.id));
    } catch (e) {
      onError((e as Error).message);
    }
  }, [team.id, onError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = useCallback(
    async (uid: string) => {
      try {
        await removeMember(team.id, uid);
        await refresh();
      } catch (e) {
        onError((e as Error).message);
      }
    },
    [team.id, refresh, onError],
  );

  return (
    <div className="flex flex-col gap-3 rounded-card bg-bg-base p-4">
      <h3 className="font-display text-base font-semibold text-text-primary">{team.name}</h3>

      {canManage && (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const target = email.trim();
            if (!target) return;
            setBusy(true);
            try {
              await addMember(team.id, target);
              setEmail('');
              await refresh();
            } catch (err) {
              onError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            type="email"
            className="flex-1 rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-ui text-sm text-text-primary"
            placeholder="Add member by email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            aria-label="Add member by email"
          />
          <button
            className="rounded-pill rf-btn-primary px-4 py-1.5 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
            disabled={busy || !email.trim()}
          >
            Add
          </button>
        </form>
      )}

      {members === null ? (
        <p className="font-ui text-sm text-text-tertiary">Loading…</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {members.map((m) => {
            const isOwner = m.userId === team.ownerUserId;
            const isMe = m.userId === meUserId;
            // Owner is immovable; otherwise managers remove others and anyone may leave.
            const canRemove = !isOwner && (canManage || isMe);
            return (
              <li
                key={m.userId}
                className="flex items-center gap-3 rounded-pill bg-bg-raised px-3 py-2"
              >
                <span
                  className="min-w-0 flex-1 truncate font-ui text-sm text-text-primary"
                  title={m.email}
                >
                  {m.displayName ?? m.email}
                  {isMe && <span className="ml-1 text-text-tertiary">(you)</span>}
                </span>
                <span className="font-data text-xs uppercase text-text-tertiary">{m.role}</span>
                {canRemove && (
                  <button
                    className="rounded-pill px-2 py-1 font-ui text-xs text-text-tertiary hover:text-intensity-all_out"
                    onClick={() => remove(m.userId)}
                    aria-label={isMe ? `Leave ${team.name}` : `Remove ${m.displayName ?? m.email}`}
                  >
                    {isMe ? 'Leave' : 'Remove'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
