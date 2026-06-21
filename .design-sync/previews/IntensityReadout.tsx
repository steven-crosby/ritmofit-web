// IntensityReadout — redundant intensity encoding (swatch-height bars + text
// label, never color alone). One cell per zone sweeps the full intensity scale.
import { IntensityReadout } from '@ritmofit/web';
import { Surface } from './_ui.js';

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <span className="font-data text-xs uppercase tracking-wide text-text-tertiary">{label}</span>
    {children}
  </div>
);

export function AllZones() {
  return (
    <Surface width={300}>
      <Row label="none">
        <IntensityReadout intensity="none" />
      </Row>
      <Row label="easy">
        <IntensityReadout intensity="easy" />
      </Row>
      <Row label="moderate">
        <IntensityReadout intensity="mod" />
      </Row>
      <Row label="hard">
        <IntensityReadout intensity="hard" />
      </Row>
      <Row label="all-out">
        <IntensityReadout intensity="all_out" />
      </Row>
    </Surface>
  );
}

export function PeakZone() {
  return (
    <Surface width={300}>
      <IntensityReadout intensity="all_out" />
    </Surface>
  );
}
