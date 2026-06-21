// Tailwind config for the design-sync CSS compile (run from the repo root).
// Reuses the app's theme (token-mapped --rf-* vars) but widens `content` to
// also scan the authored preview .tsx so any utility a preview uses — not just
// ones already present in app source — lands in the compiled stylesheet.
import base from '../apps/web/tailwind.config.js';

export default {
  ...base,
  content: [
    './apps/web/index.html',
    './apps/web/src/**/*.{ts,tsx}',
    './.design-sync/previews/**/*.{ts,tsx}',
  ],
};
