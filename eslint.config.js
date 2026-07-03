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
      // Git-ignored Claude Code local state (settings + agent worktrees). Worktrees
      // are full repo copies, so rooted ignores like `ritmofit_design_system/**`
      // don't match their nested paths — without this, local `pnpm lint` diverges
      // from CI whenever a worktree exists.
      '.claude/**',
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
