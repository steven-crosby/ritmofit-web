import type { ProviderCapabilityTruth, ProviderCapabilityView } from '../lib/providers.js';
import { providerLabel } from '../lib/providers.js';
import type { Provider } from '@ritmofit/shared';

const CAPABILITIES = ['catalog', 'library', 'playback'] as const;

function capabilityMeta(capability: ProviderCapabilityView) {
  if (capability.state === 'ready') return { glyph: '✓', tone: 'text-state-positive' };
  if (capability.state === 'partial') return { glyph: '◐', tone: 'text-state-caution' };
  if (capability.state === 'checking') return { glyph: '◌', tone: 'text-text-tertiary' };
  if (capability.state === 'unverified') return { glyph: '?', tone: 'text-text-tertiary' };
  return { glyph: '→', tone: 'text-state-caution' };
}

/** Shared presentation only; provider state mapping remains in providerCapabilityTruth. */
export function ProviderCapabilityLedger({
  provider,
  truth,
  className = '',
}: {
  provider: Provider;
  truth: ProviderCapabilityTruth;
  className?: string;
}) {
  return (
    <dl
      className={`grid gap-1.5 border-t border-interactive/10 pt-3 font-ui text-xs ${className}`}
      aria-label={`${providerLabel(provider)} capabilities`}
    >
      {CAPABILITIES.map((key) => {
        const capability = truth[key];
        const meta = capabilityMeta(capability);
        const label = key.slice(0, 1).toUpperCase() + key.slice(1);
        return (
          <div key={key} className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-2">
            <dt className="text-text-tertiary">{label}</dt>
            <dd className={`min-w-0 text-right ${meta.tone}`}>
              <span aria-hidden="true">{meta.glyph} </span>
              {capability.label}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
