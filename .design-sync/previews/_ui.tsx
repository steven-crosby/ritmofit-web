// Shared framing for the preview cards: a RitmoFit dark surface (the app's
// default theme) with the UI font + primary text color, so each component
// renders in-context instead of on a bare white card. Token vars are used
// inline so the frame is styled even if a utility class isn't in the compiled
// stylesheet.
import type { ReactNode } from 'react';

export function Surface({ children, width = 460 }: { children: ReactNode; width?: number }) {
  return (
    <div
      className="font-ui text-text-primary"
      style={{
        background: 'var(--rf-color-semantic-bg-base)',
        padding: 20,
        borderRadius: 14,
        width,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}
