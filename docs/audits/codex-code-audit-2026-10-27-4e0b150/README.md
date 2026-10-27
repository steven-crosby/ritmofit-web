# Adversarial engineering audit — ritmofit-web @ 4e0b150

Status: **COMPLETE**, with the limits in "Bounded assessment". This is not a
claim that the product is free of defects, that production data is intact, or
that playback was heard.

## Baseline

| Field | Value |
| --- | --- |
| Repository | `steven-crosby/ritmofit-web` |
| Branch | `main` |
| Audited SHA | `4e0b15096995c125b3941bf374a6a580e2ff52f8` |
| Audit start (UTC) | 2026-10-27T14:13:48Z |
| Tracked modifications | none at start; none at delivery. `git status` shows only this directory untracked. |
| Node / pnpm | v22.23.4 / 11.4.0 |
| Environment | Cursor cloud agent VM, ephemeral. Dependencies were already installed. Repros ran in disposable worktrees. |
| Open PRs at start | #625 and draft #596, both test-only. Not incorporated. Neither overlaps the accepted findings. |

## Bounded assessment

Reviewed: authentication and ownership on the class API, dormant share and team
routes, migrations on local D1, the Builder save path, Live preflight and
playback orchestration against fake SDKs, Spotify and SoundCloud token refresh,
same-song resolution, ordered import, the CI-equivalent gate, bundle size, and
a handful of hot queries.

Not reviewed as a live system: production D1, audible playback, a real Spotify
or Apple SDK, and a browser pass over the Builder. C-21 through C-26 were not
independently challenged. Historical migration data loss is not claimed.

The gate is green: 2,078 unit tests and 237 integration tests. The highest
findings sit in behavior those tests do not lock, and in one test that locks
the Spotify expiry bug as intended.

## Highest-priority findings

Full records: `findings.md`. Challenge verdicts: `challenge.md`.

1. **B-3 (P1, confirmed).** A text-only cue, move, or section save rewrites the time. At 128 BPM a cue moves one beat early. This is the default sequential timeline.
2. **B-1 and B-2 (P1, confirmed).** After a timeline drag, saving an unrelated edit writes the old start or cue anchor back.
3. **C-1 (P1, confirmed).** About an hour after the last server Spotify read, Live treats Spotify as disconnected. The server can refresh the token. Preflight never asks.
4. **D-1 (P1, confirmed).** D1 rejects statements with more than 100 bound parameters. Disconnect purge never finishes past about 97 tracks. A class with 101 tracks cannot enter Live. A custom-move rename returns an error after the name is saved.
5. **A-7 (P1, latent).** Replaying five already-applied table-rebuild migrations on a populated local D1 deletes cues and moves and exits 0. The live risk is the next parent rebuild, not an incident observed in production.

The first remediation packet is the Builder timing fixes (B-3, B-2, B-1). See `NEXT_SESSION.md`.

## Files

| Path | Role |
| --- | --- |
| `findings.md` | Ranked findings, challenge results, rejected leads |
| `verification-and-coverage.md` | Coverage map, gate, repros, limits |
| `NEXT_SESSION.md` | Remediation packets and restart steps |
| `challenge.md` | Independent challenge writeup |
| `verification-gate.md` | Gate commands and exits |
| `lanes/` | Per-reviewer notes |
| `evidence/`, `repro/` | Sanitized logs and reproduction tests |
| `MANIFEST.md` | File list |

## Delivery

Copied to `/opt/cursor/artifacts/codex-code-audit-2026-10-27-4e0b150/`. That
directory is this session's artifact export. The audit was not committed, per
the audit-only mandate. If the artifact export does not surface after the
session, the files also remain in the workspace at
`docs/audits/codex-code-audit-2026-10-27-4e0b150/` until the VM is destroyed.
