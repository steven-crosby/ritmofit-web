// Dialog — the accessible modal primitive: portal + focus trap + scroll lock +
// backdrop/Escape close. It owns chrome + behavior; callers supply the header
// and body as children. Shown open with realistic content (mirrors the app's
// ShareDialog composition). Overlay component → rendered as a single card.
import { Dialog } from '@ritmofit/web';

export function ShareClass() {
  return (
    <Dialog
      onClose={() => {}}
      label="Share Sunset Climb"
      panelClassName="flex w-full max-w-md flex-col gap-4 rounded-panel bg-bg-raised p-6 shadow-lifted"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">Share class</h2>
          <p className="font-ui text-sm text-text-secondary">Sunset Climb</p>
        </div>
        <button
          type="button"
          className="rounded-pill px-2 py-1 font-ui text-sm text-text-tertiary hover:text-text-primary"
          aria-label="Close"
        >
          ✕
        </button>
      </header>
      <label className="flex flex-col gap-1.5">
        <span className="font-ui text-sm text-text-secondary">Invite by email</span>
        <input
          type="email"
          placeholder="teammate@studio.com"
          className="rounded-input bg-bg-base px-3 py-2 font-ui text-sm text-text-primary placeholder:text-text-tertiary"
        />
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-control px-4 py-2 font-ui text-sm text-text-secondary hover:text-text-primary"
        >
          Cancel
        </button>
        <button type="button" className="rf-btn-primary rounded-control px-4 py-2 font-ui text-sm">
          Send invite
        </button>
      </div>
    </Dialog>
  );
}
