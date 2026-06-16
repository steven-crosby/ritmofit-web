/** @type {import('tailwindcss').Config} */
// Colors/spacing/type all reference the --rf-* custom properties generated from
// ritmofit_design_system/tokens.json (see scripts/generate-tokens.mjs). Tokens
// stay the single source of truth; this file only maps them into Tailwind.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--rf-color-semantic-bg-base)',
          raised: 'var(--rf-color-semantic-bg-raised)',
          overlay: 'var(--rf-color-semantic-bg-overlay)',
          sunken: 'var(--rf-color-semantic-bg-sunken)',
          // Live runs darker than bg/base for AAA contrast in a dim studio; stays
          // dark even under the light theme (02-color-system: a performance surface).
          live: 'var(--rf-color-semantic-bg-live)',
        },
        text: {
          primary: 'var(--rf-color-semantic-text-primary)',
          secondary: 'var(--rf-color-semantic-text-secondary)',
          tertiary: 'var(--rf-color-semantic-text-tertiary)',
          'on-accent': 'var(--rf-color-semantic-text-on-accent)',
        },
        brand: {
          DEFAULT: 'var(--rf-color-semantic-brand-primary)',
          strong: 'var(--rf-color-semantic-brand-primary-strong)',
          muted: 'var(--rf-color-semantic-brand-primary-muted)',
        },
        interactive: {
          DEFAULT: 'var(--rf-color-semantic-interactive-default)',
          hover: 'var(--rf-color-semantic-interactive-hover)',
          pressed: 'var(--rf-color-semantic-interactive-pressed)',
          ring: 'var(--rf-color-semantic-interactive-focus-ring)',
        },
        peak: 'var(--rf-color-semantic-peak-glow)',
        intensity: {
          none: 'var(--rf-color-intensity-none)',
          easy: 'var(--rf-color-intensity-easy)',
          mod: 'var(--rf-color-intensity-mod)',
          hard: 'var(--rf-color-intensity-hard)',
          all_out: 'var(--rf-color-intensity-all_out)',
        },
        // Semantic states (02-color-system) — always paired with a mandatory icon
        // in components. Distinct from the intensity ramp: danger/error meaning
        // belongs here, never on intensity-all_out.
        state: {
          positive: 'var(--rf-color-semantic-state-positive)',
          caution: 'var(--rf-color-semantic-state-caution)',
          danger: 'var(--rf-color-semantic-state-danger)',
          info: 'var(--rf-color-semantic-state-info)',
        },
        // Segment-track tints — quiet, label-first reinforcement (02). Not the
        // interactive channel; never used as a fill.
        segment: {
          warmup: 'var(--rf-color-segment-warmup)',
          climb: 'var(--rf-color-segment-climb)',
          sprint: 'var(--rf-color-segment-sprint)',
          recovery: 'var(--rf-color-segment-recovery)',
          cooldown: 'var(--rf-color-segment-cooldown)',
        },
      },
      fontFamily: {
        display: 'var(--rf-typography-family-display)',
        ui: 'var(--rf-typography-family-ui)',
        data: 'var(--rf-typography-family-data)',
      },
      borderRadius: {
        sheet: 'var(--rf-radius-sheet)',
        panel: 'var(--rf-radius-panel)',
        card: 'var(--rf-radius-card)',
        input: 'var(--rf-radius-input)',
        control: 'var(--rf-radius-control)',
        pill: 'var(--rf-radius-pill)',
      },
      boxShadow: {
        card: 'var(--rf-surface-shadow-card)',
        lifted: 'var(--rf-surface-shadow-lifted)',
        'peak-glow': 'var(--rf-surface-shadow-peak-glow)',
      },
    },
  },
  plugins: [],
};
