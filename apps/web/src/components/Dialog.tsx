/**
 * Accessible modal dialog primitive. Centralizes the focus and keyboard behavior
 * every Ritmo Studio dialog needs (design-system `09` accessibility rules + the
 * pre-launch review's "complete modal focus management" finding):
 *
 * - Renders into a portal on `document.body` so the rest of the app (`#root`) can
 *   be marked `inert` + `aria-hidden` while the dialog is open — background
 *   controls become unfocusable and invisible to assistive tech.
 * - Moves focus into the dialog on open (an explicit `initialFocusRef`, else the
 *   first focusable, else the panel) and returns it to the previously-focused
 *   trigger on close.
 * - Traps Tab / Shift+Tab inside the panel and closes on Escape.
 * - Backdrop click (mousedown on the overlay itself, not a child) closes.
 * - Locks body scroll while open.
 *
 * It owns only chrome + behavior; callers supply the header (title + close
 * button) and body as `children`, so each dialog keeps its bespoke content.
 */
import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  onClose,
  label,
  panelClassName,
  initialFocusRef,
  children,
}: {
  onClose: () => void;
  /** Accessible name for the dialog (`aria-label`). */
  label: string;
  /** Tailwind classes for the panel surface (width, padding, radius, shadow). */
  panelClassName: string;
  /** Element to focus on open; defaults to the first focusable in the panel. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep the latest onClose without re-running the open/close effect (which must
  // run exactly once per mount so focus is captured and restored cleanly).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const focusablesIn = useCallback(
    () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
    [],
  );

  // On open: remember the trigger, make the background inert, lock scroll, and
  // move focus into the dialog. On close: undo each and restore focus.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    root?.setAttribute('aria-hidden', 'true');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const target = initialFocusRef?.current ?? focusablesIn()[0] ?? panelRef.current;
    target?.focus();

    // Focus guard: if focus leaves the dialog while it's open — e.g. the focused
    // control is removed by an in-dialog action (Connect → Disconnect), dropping
    // focus to <body> — pull it back so Tab/Escape keep working. The Tab handler
    // covers keyboard cycling; this covers programmatic focus loss. Background is
    // already `inert`, so the only escape route is element removal.
    const onFocusOut = () => {
      setTimeout(() => {
        const overlay = overlayRef.current;
        if (overlay && !overlay.contains(document.activeElement)) {
          (focusablesIn()[0] ?? panelRef.current)?.focus();
        }
      }, 0);
    };
    overlayRef.current?.addEventListener('focusout', onFocusOut);

    return () => {
      overlayRef.current?.removeEventListener('focusout', onFocusOut);
      root?.removeAttribute('inert');
      root?.removeAttribute('aria-hidden');
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [focusablesIn, initialFocusRef]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusablesIn();
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) {
      // Nothing to land on — keep focus on the panel rather than escaping it.
      e.preventDefault();
      panelRef.current?.focus();
      return;
    }
    const active = document.activeElement;
    const insidePanel = panelRef.current?.contains(active) ?? false;
    if (e.shiftKey && (active === first || !insidePanel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !insidePanel)) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(e) => e.target === e.currentTarget && onCloseRef.current()}
      onKeyDown={onKeyDown}
    >
      <div ref={panelRef} tabIndex={-1} className={panelClassName}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
