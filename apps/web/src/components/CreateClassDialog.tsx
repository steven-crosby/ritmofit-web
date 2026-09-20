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

/**
 * Which path the instructor asked for. The dialog serves both, and leads with
 * the one she chose — a button labelled "Start empty" that opens a panel headed
 * "Start from a teaching plan" answers a question she did not ask.
 */
export type CreateClassMode = 'scaffold' | 'empty';

export function CreateClassDialog({
  mode: initialMode = 'scaffold',
  onClose,
  onCreated,
  onError,
}: {
  mode?: CreateClassMode;
  onClose: () => void;
  onCreated: (cls: Class) => void;
  onError: (msg: string | null) => void;
}) {
  const emptyFirst = initialMode === 'empty';
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState<ScaffoldDiscipline | null>(null);
  const [duration, setDuration] = useState<ScaffoldDuration>(DEFAULT_SCAFFOLD_DURATION);
  const { busy, run } = useAsyncAction(onError);
  const [missing, setMissing] = useState<'title' | 'discipline' | null>(null);
  const trimmed = title.trim();

  // The buttons stay operable so a click always answers. A disabled submit is
  // both a dead end (nothing happens, nothing is said) and invisible to the
  // keyboard, because a disabled button leaves the tab order entirely.
  const create = (mode: 'scaffold' | 'empty') => {
    if (busy) return;
    if (!trimmed) {
      setMissing('title');
      titleRef.current?.focus();
      return;
    }
    if (discipline == null) {
      setMissing('discipline');
      return;
    }
    setMissing(null);
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
            {emptyFirst ? 'Start with an empty class' : 'Start from a teaching plan'}
          </h2>
          <p className="mt-1 font-ui text-sm leading-5 text-text-secondary">
            {emptyFirst
              ? 'No blocks — you build the run of show yourself.'
              : 'Ritmo lays out the blocks. You add the music.'}
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
        // The dialog owns its own validation copy and focus placement, so the
        // native bubble must not pre-empt it (and silently swallow the submit).
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          create(initialMode);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="new-class-title"
            className="font-ui text-xs font-semibold text-text-secondary"
          >
            Class title
          </label>
          <input
            ref={titleRef}
            id="new-class-title"
            className={`min-h-11 rounded-control border bg-bg-sunken px-3 font-ui text-sm text-text-primary rf-focus-ring ${
              missing === 'title' ? 'border-state-danger' : 'border-border'
            }`}
            placeholder="Saturday ride"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (missing === 'title') setMissing(null);
            }}
            required
            aria-required="true"
            aria-invalid={missing === 'title'}
            aria-describedby="new-class-title-help"
            maxLength={200}
            autoComplete="off"
          />
          {missing === 'title' ? (
            <span
              id="new-class-title-help"
              role="alert"
              className="flex items-center gap-1 font-ui text-xs text-state-danger"
            >
              <span aria-hidden>!</span> Name the class so you can find it again.
            </span>
          ) : (
            <span id="new-class-title-help" className="font-ui text-xs text-text-tertiary">
              Needed — you can rename it later.
            </span>
          )}
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-ui text-xs font-semibold text-text-secondary">Discipline</legend>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Class discipline"
            aria-describedby="new-class-scaffold-summary"
          >
            {SCAFFOLD_DISCIPLINES.map(({ value, label }) => {
              const selected = discipline === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setDiscipline(value);
                    if (missing === 'discipline') setMissing(null);
                  }}
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

        <p
          id="new-class-scaffold-summary"
          role={missing === 'discipline' ? 'alert' : undefined}
          className={`font-ui text-sm leading-5 ${
            missing === 'discipline' ? 'text-state-danger' : 'text-text-secondary'
          }`}
        >
          {missing === 'discipline' ? (
            <>
              <span aria-hidden>! </span>Pick a discipline — it names the movement language and the
              class clock.
            </>
          ) : emptyFirst ? (
            `Creates an empty ${duration}-minute class. The discipline sets its movement language.`
          ) : discipline ? (
            `Creates ${SCAFFOLD_BLOCK_COUNT} editable blocks totaling ${duration} minutes.`
          ) : (
            'Choose a discipline to preview the scaffold.'
          )}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40 motion-reduce:transition-none"
          >
            {busy ? 'Creating…' : emptyFirst ? 'Create empty class' : 'Create class'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => create(emptyFirst ? 'scaffold' : 'empty')}
            className="min-h-11 rounded-control px-3 font-ui text-sm text-text-tertiary hover:text-text-secondary disabled:opacity-40 rf-focus-ring"
          >
            {emptyFirst ? 'Use a teaching plan instead' : 'Start empty instead'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
