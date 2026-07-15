# Browser smokes

Real-browser checks that jsdom component tests can't cover (no layout engine):
horizontal overflow at a phone viewport and live modal focus management.

These are **not** part of `pnpm test` — they need the app running and a Playwright
browser, so they're run on demand (e.g. before a UI-affecting deploy).

## narrow-width.smoke.mjs

Signs up a throwaway mock-seam user at **390×844**, creates a class, adds a track,
and opens the private-beta nav dialogs. Asserts:

- no horizontal overflow on login, the empty dashboard, the dashboard with a track,
  and with each dialog open;
- each dialog moves focus inside on open, marks `#root` `inert` + `aria-hidden`,
  traps Tab, and returns focus to its trigger on Escape.

Exits non-zero on any failure. Screenshots (gitignored) land in `./shots/`. Set
`SMOKE_DIAG=1` to print the elements responsible for any overflow.

### Run

```bash
# 1. Local stack (two terminals), mock providers, no email key (dev fallback):
MOCK_PROVIDERS=true pnpm dev:api     # :8787; mock mode permits throwaway sign-ups
pnpm dev:web                          # :5173

# 2. Playwright is intentionally NOT a repo dependency. Install it once anywhere,
#    then point the smoke at it via PLAYWRIGHT_BASE (a dir whose node_modules has
#    playwright). Example using a scratch install:
mkdir -p /tmp/rf-smoke && (cd /tmp/rf-smoke && npm i playwright && npx playwright install chromium)

# 3. Run:
PLAYWRIGHT_BASE=/tmp/rf-smoke/package.json node apps/web/smoke/narrow-width.smoke.mjs
```

If Playwright is ever added to the workspace, the script resolves it directly and
`PLAYWRIGHT_BASE` becomes unnecessary. Override the target with `SMOKE_WEB_URL`.
