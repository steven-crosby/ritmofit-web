import type { ReactNode } from 'react';

type DialogStatePlaceholder = 'class-cards' | 'provider-rows' | 'team-rows' | 'move-rows';

const PLACEHOLDER_ROWS: Record<DialogStatePlaceholder, number[]> = {
  'class-cards': [0, 1],
  'provider-rows': [0, 1, 2],
  'team-rows': [0, 1, 2],
  'move-rows': [0, 1, 2],
};
const CLASS_SHAPE_BARS = ['h-2', 'h-4', 'h-3', 'h-5', 'h-2'];

export function DialogState({
  title,
  description,
  placeholder,
  action,
}: {
  title: string;
  description: string;
  placeholder: DialogStatePlaceholder;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-card border border-border-subtle bg-bg-base p-4" role="status">
      <div className="flex flex-col gap-1">
        <h3 className="font-ui text-sm font-semibold text-text-primary">{title}</h3>
        <p className="font-ui text-sm text-text-tertiary">{description}</p>
      </div>
      <DialogStatePlaceholder kind={placeholder} />
      {action && <div className="mt-4 flex">{action}</div>}
    </section>
  );
}

function DialogStatePlaceholder({ kind }: { kind: DialogStatePlaceholder }) {
  if (kind === 'class-cards') {
    return (
      <div className="mt-4 grid grid-cols-2 gap-2" aria-hidden="true">
        {PLACEHOLDER_ROWS[kind].map((index) => (
          <div key={index} className="rounded-card bg-bg-raised p-3">
            <div className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-control bg-bg-overlay" />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="h-2 rounded-pill bg-border-default" />
                <span className="h-2 w-2/3 rounded-pill bg-border-subtle" />
              </span>
            </div>
            <div className="mt-3 flex items-end gap-1">
              {CLASS_SHAPE_BARS.map((heightClass, bar) => (
                <span
                  key={bar}
                  className={`w-full rounded-pill bg-border-default ${heightClass}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2" aria-hidden="true">
      {PLACEHOLDER_ROWS[kind].map((index) => (
        <div key={index} className="flex items-center gap-3 rounded-control bg-bg-raised px-3 py-2">
          <PlaceholderGlyph kind={kind} index={index} />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="h-2 rounded-pill bg-border-default" />
            <span className="h-2 w-2/3 rounded-pill bg-border-subtle" />
          </span>
          {kind !== 'move-rows' && (
            <span className="h-5 w-14 rounded-pill border border-border-subtle bg-bg-base" />
          )}
          {kind === 'move-rows' && (
            <span className="font-data text-xs text-text-tertiary">{index + 1}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function PlaceholderGlyph({ kind, index }: { kind: DialogStatePlaceholder; index: number }) {
  if (kind === 'provider-rows') {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-control bg-bg-overlay font-data text-xs text-text-tertiary">
        {index + 1}
      </span>
    );
  }
  if (kind === 'team-rows') {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-pill bg-bg-overlay font-ui text-xs font-semibold text-text-tertiary">
        {index === 0 ? 'O' : 'M'}
      </span>
    );
  }
  return <span className="h-8 w-8 rounded-control bg-bg-overlay" />;
}
