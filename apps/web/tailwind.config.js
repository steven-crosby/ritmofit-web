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
      },
      fontFamily: {
        display: 'var(--rf-typography-family-display)',
        ui: 'var(--rf-typography-family-ui)',
        data: 'var(--rf-typography-family-data)',
      },
      borderRadius: {
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
