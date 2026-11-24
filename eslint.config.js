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
      // Agent-authored design-audit deliverables: standalone prototype HTML/CSS/JS
      // that never ships. Prettier-ignored for the same reason (see .prettierignore).
      'docs/audits/**',
      // Claude Code saved workflows: the Workflow runtime runs the body as a function with injected
      // globals, so its top-level `return` cannot parse as a module here. Agent worktrees are
      // whole checkouts with their own lint run.
      '.claude/workflows/**',
      '.claude/worktrees/**',
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
