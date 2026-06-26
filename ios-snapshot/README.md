# Vendored iOS snapshot (read-only)

Read-only snapshots of the **client-facing source from the authoritative `ritmofit-ios`
repository**. This directory exists only so an agent working in a web-only checkout (no
sibling iOS repo on the machine) can run the cross-surface prompts —
`technical/api-contract-parity` and `technical/content-consistency` — which compare the web
backend/contract and user-facing copy against the iOS client.

`ritmofit-ios` remains the source of truth for this code. **Do not edit these files here**;
edit the originals in `ritmofit-ios` and re-run the refresh below.

## Contents

| Path | Source in `ritmofit-ios` (`RitmoFit/RitmoFit/`) | Used by |
| --- | --- | --- |
| `Core/Models/` | `Core/Models/` — domain + wire models (`RunPayload`, DTOs) | `api-contract-parity` |
| `Core/Networking/` | `Core/Networking/` — API client, DTO decoding, auth | `api-contract-parity` |
| `Features/` | `Features/` — SwiftUI screens; the iOS user-facing copy | `content-consistency` |

Scope is deliberately bounded to the contract- and copy-bearing source. The full iOS app
(design system, cache layer, tests, project files) is **not** vendored — consult a full
`ritmofit-ios` checkout for anything beyond cross-surface parity.

## Provenance

- Synced from `ritmofit-ios` `main` at commit `cd2993d` on 2026-06-26.

## Refreshing

When you have a `ritmofit-ios` checkout available, refresh from this repo's root:

```bash
IOS=/path/to/ritmofit-ios        # e.g. a temporary clone
WEB=/path/to/ritmofit-web
SRC="$IOS/RitmoFit/RitmoFit"
rm -rf "$WEB/ios-snapshot/Core" "$WEB/ios-snapshot/Features"
cp -R "$SRC/Core/Models"     "$WEB/ios-snapshot/Core/Models"
cp -R "$SRC/Core/Networking" "$WEB/ios-snapshot/Core/Networking"
cp -R "$SRC/Features"        "$WEB/ios-snapshot/Features"
```

Then update the provenance line above with the new iOS commit and date. Because this is a
snapshot, it can lag `ritmofit-ios`; for a definitive cross-surface diff, refresh first or
read a live iOS checkout.
