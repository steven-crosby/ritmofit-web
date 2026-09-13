#!/usr/bin/env bash
# Cloud Agent install: idempotent repository bootstrap after checkout.
# Installs workspace dependencies, provisions git-ignored local Worker secrets
# for mock-provider dev, and prepares the local D1 database (migrate + seed).
# Safe to run repeatedly and against cached state.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

corepack enable >/dev/null 2>&1 || true

echo "==> Installing workspace dependencies"
pnpm install --frozen-lockfile

# Build the SPA so apps/web/dist exists. `wrangler dev` (pnpm dev:api) fails to
# start otherwise because wrangler.toml's [assets] directory points at
# ../web/dist — the Worker serves the SPA single-origin. This is source-derived
# generation, so it belongs in install; it is safe to re-run.
echo "==> Building web SPA (required by wrangler dev [assets])"
pnpm --filter @ritmofit/web build

# Local Worker secrets. .dev.vars is git-ignored; only BETTER_AUTH_SECRET is
# required to boot. MOCK_PROVIDERS=true (already the template default) runs the
# builder against a deterministic mock catalog with no third-party credentials.
dev_vars="apps/api/.dev.vars"
if [ ! -f "$dev_vars" ]; then
  echo "==> Creating $dev_vars from template with a generated dev auth secret"
  cp apps/api/.dev.vars.example "$dev_vars"
  secret="$(openssl rand -base64 32)"
  # Fill the empty BETTER_AUTH_SECRET= line (dev-only, local machine).
  tmp="$(mktemp)"
  while IFS= read -r line || [ -n "$line" ]; do
    if [ "$line" = "BETTER_AUTH_SECRET=" ]; then
      printf 'BETTER_AUTH_SECRET=%s\n' "$secret"
    else
      printf '%s\n' "$line"
    fi
  done <"$dev_vars" >"$tmp"
  mv "$tmp" "$dev_vars"
else
  echo "==> $dev_vars already exists; leaving it untouched"
fi

echo "==> Applying local D1 migrations"
pnpm --filter @ritmofit/api db:migrate:local

echo "==> Seeding local D1 database"
pnpm --filter @ritmofit/api db:seed:local

echo "==> Install complete"
