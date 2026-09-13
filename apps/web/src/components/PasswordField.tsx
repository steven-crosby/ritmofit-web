/**
 * A password input with a labelled reveal/conceal toggle (design audit
 * Studio Pulse Check SPC-03) and an optional redundant invalid treatment
 * (SPC-01 — ember border, never color alone: the field also stays wired to
 * whatever alert/aria-describedby names the problem in words).
 *
 * The toggle sits inside the same `<label>` as the input; a `<button>` isn't
 * a labelable element, so this doesn't change what `getByLabelText` resolves
 * to for the input itself.
 */
import { useId, useState } from 'react';

export function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  required,
  minLength,
  ariaDescribedBy,
  invalid = false,
  helpText,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  ariaDescribedBy?: string;
  /** Redundant ember border alongside whatever names the error in text (SPC-01). */
  invalid?: boolean;
  helpText?: string;
}) {
  const [visible, setVisible] = useState(false);
  const helpId = useId();
  const describedBy = ariaDescribedBy ?? (helpText ? helpId : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Explicit htmlFor/id, not an implicit wrap: the toggle button below sits
          inside the same visual group, and a `<label>` wrapping it would fold
          the button's own text into the field's accessible name. */}
      <label htmlFor={id} className="font-ui text-sm text-text-secondary">
        {label}
      </label>
      <span className="relative flex items-center">
        <input
          id={id}
          className={`min-h-11 w-full rounded-input border bg-bg-sunken px-4 pr-16 font-ui text-text-primary ${
            invalid ? 'border-state-danger' : 'border-border'
          }`}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="rf-focus-ring absolute right-1 min-h-9 rounded-control px-2 font-ui text-xs font-semibold text-interactive hover:text-interactive-hover"
          aria-pressed={visible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
      {helpText && (
        <span id={helpId} className="font-ui text-xs text-text-tertiary">
          {helpText}
        </span>
      )}
    </div>
  );
}
