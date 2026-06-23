import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/.wrangler/**',
      '**/worker-configuration.d.ts',
      '**/src/styles/tokens.css',
      // Vendored design-system reference package — owns its own gates
      // (`ritmofit_design_system` → npm run verify) and is Prettier-ignored too.
      'ritmofit_design_system/**',
      // Git-ignored DesignSync local artifacts (bundle output + sync tooling).
      // CI never sees these (they're untracked); ignoring them here makes a local
      // `pnpm lint` match CI instead of drowning in ~600 errors from generated code.
      '**/.ds-sync/**',
      '**/ds-bundle/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['**/*.mjs', '**/*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },
);
