# Vendored iOS snapshot (read-only)

Read-only snapshots of the **contract-facing source from the authoritative `ritmofit-ios`
repository**. This directory exists only so an agent working in a web-only checkout (no
sibling iOS repo on the machine) can run `technical/api-contract-parity`, which compares what
this backend serves against what the iOS client decodes.

Scope is deliberately limited to the **stable contract surface** (`Core/Models`,
`Core/Networking`). The iOS user-facing copy (`Features/`) is intentionally **not** vendored:
it lives in fast-moving SwiftUI views, so a snapshot would go stale and produce false copy-drift
findings. `technical/content-consistency` therefore degrades gracefully — it runs its
web-internal checks and only does the cross-surface copy comparison when a live `ritmofit-ios`
checkout is present (see that prompt).

`ritmofit-ios` remains the source of truth for this code. **Do not edit these files here**;
edit the originals in `ritmofit-ios` and re-run the refresh below.

## Contents

| Path | Source in `ritmofit-ios` (`RitmoFit/RitmoFit/`) | Used by |
| --- | --- | --- |
| `Core/Models/` | `Core/Models/` — domain + wire models (`RunPayload`, DTOs) | `api-contract-parity` |
| `Core/Networking/` | `Core/Networking/` — API client, DTO decoding, auth | `api-contract-parity` |

Everything else in the iOS app (the `Features/` UI copy, design system, cache layer, tests,
project files) is **not** vendored — consult a full `ritmofit-ios` checkout for anything beyond
the contract surface above.

## Provenance

- Synced from `ritmofit-ios` `main` at commit `cd2993d` on 2026-06-26.

## Refreshing

When you have a `ritmofit-ios` checkout available, refresh from this repo's root:

```bash
IOS=/path/to/ritmofit-ios        # e.g. a temporary clone
WEB=/path/to/ritmofit-web
SRC="$IOS/RitmoFit/RitmoFit"
rm -rf "$WEB/ios-snapshot/Core"
cp -R "$SRC/Core/Models"     "$WEB/ios-snapshot/Core/Models"
cp -R "$SRC/Core/Networking" "$WEB/ios-snapshot/Core/Networking"
```

Then update the provenance line above with the new iOS commit and date. Because this is a
snapshot, it can lag `ritmofit-ios`; for a definitive cross-surface diff, refresh first or
read a live iOS checkout.
