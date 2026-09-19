/**
 * Isolated create-class dialog. Scaffold is the primary path; empty creation
 * stays available as a quiet alternative. Playlist, likes, copy, and
 * Songs-by-Move keep their existing empty/legacy create calls.
 */
import { useRef, useState } from 'react';
import type { Class } from '@ritmofit/shared';
import { createClass } from '../lib/api.js';
import {
  DEFAULT_SCAFFOLD_DURATION,
  SCAFFOLD_BLOCK_COUNT,
  SCAFFOLD_DISCIPLINES,
  SCAFFOLD_DURATIONS,
  scaffoldRecipeId,
  type ScaffoldDiscipline,
  type ScaffoldDuration,
} from '../lib/class-scaffold.js';
import { useAsyncAction } from '../lib/use-async-action.js';
import { Dialog } from './Dialog.js';

const MINUTE_MS = 60_000;

export function CreateClassDialog({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: (cls: Class) => void;
  onError: (msg: string | null) => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState<ScaffoldDiscipline | null>(null);
  const [duration, setDuration] = useState<ScaffoldDuration>(DEFAULT_SCAFFOLD_DURATION);
  const { busy, run } = useAsyncAction(onError);
  const trimmed = title.trim();
  const canSubmit = trimmed.length > 0 && discipline != null && !busy;

  const create = (mode: 'scaffold' | 'empty') => {
    if (!trimmed || discipline == null) return;
    void run(async () => {
      const cls =
        mode === 'scaffold'
          ? await createClass({
              mode: 'scaffold',
              title: trimmed,
              recipeId: scaffoldRecipeId(discipline, duration),
            })
          : await createClass({
              mode: 'empty',
              title: trimmed,
              template: discipline,
              targetDurationMs: duration * MINUTE_MS,
            });
      onCreated(cls);
      onClose();
    });
  };

  return (
    <Dialog
      onClose={onClose}
      label="Create a class"
      initialFocusRef={titleRef}
      panelClassName="flex max-h-[min(720px,100dvh)] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-panel bg-bg-raised p-4 shadow-lifted motion-reduce:transition-none sm:p-6"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="rf-eyebrow">New class</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-text-primary">
            Start from a teaching plan
          </h2>
          <p className="mt-1 font-ui text-sm leading-5 text-text-secondary">
            Nine deterministic recipes. Music stays empty until you choose it.
          </p>
        </div>
        <button
          type="button"
          className="min-h-11 rounded-control px-2 font-ui text-sm text-text-tertiary hover:text-text-primary rf-focus-ring"
          onClick={onClose}
          aria-label="Close create class dialog"
        >
          ✕
        </button>
      </header>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          create('scaffold');
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="font-ui text-xs font-semibold text-text-secondary">Class title</span>
          <input
            ref={titleRef}
            id="new-class-title"
            className="min-h-11 rounded-control border border-border bg-bg-sunken px-3 font-ui text-sm text-text-primary rf-focus-ring"
            placeholder="Saturday ride"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            autoComplete="off"
          />
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-ui text-xs font-semibold text-text-secondary">Discipline</legend>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Class discipline">
            {SCAFFOLD_DISCIPLINES.map(({ value, label }) => {
              const selected = discipline === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setDiscipline(value)}
                  className={`min-h-11 rounded-pill border px-3 font-ui text-sm rf-focus-ring ${
                    selected
                      ? 'border-interactive bg-interactive/15 font-semibold text-text-primary'
                      : 'border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-ui text-xs font-semibold text-text-secondary">
            Class length
          </legend>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Class length">
            {SCAFFOLD_DURATIONS.map((minutes) => {
              const selected = duration === minutes;
              return (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setDuration(minutes)}
                  className={`min-h-11 rounded-pill border px-3 font-ui text-sm rf-focus-ring ${
                    selected
                      ? 'border-interactive bg-interactive/15 font-semibold text-text-primary'
                      : 'border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {minutes} min
                </button>
              );
            })}
          </div>
        </fieldset>

        <p className="font-ui text-sm leading-5 text-text-secondary">
          {discipline
            ? `Creates ${SCAFFOLD_BLOCK_COUNT} editable blocks totaling ${duration} minutes.`
            : 'Choose a discipline to preview the scaffold.'}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={!canSubmit}
            className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40 motion-reduce:transition-none"
          >
            {busy ? 'Creating…' : 'Create class'}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => create('empty')}
            className="min-h-11 rounded-control px-3 font-ui text-sm text-text-tertiary hover:text-text-secondary disabled:opacity-40 rf-focus-ring"
          >
            Start empty instead
          </button>
        </div>
      </form>
    </Dialog>
  );
}
