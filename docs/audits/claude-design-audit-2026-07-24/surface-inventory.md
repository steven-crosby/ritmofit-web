# Surface inventory — claude design audit, 2026-07-24

**Baseline branch:** `main`
**Baseline commit:** `9b188df7b38a607a208343cd7f73f7c7f4ee4bbe`
**Pack version:** 6
**Prior run compared against:** `2026-07-19-full-product-preview` (baseline `addaff3f`)
**Registry bound to:** `agent-prompts/design-audit/surface-ids.md`

All 51 registry surfaces were traced against the running app. **No new surfaces were discovered and
none were retired**, so `surface-ids.md` is unchanged by this run. Every ID below keeps the number the
2026-07-19 run established.

Classification legend — Preview requirement: `primary` (must appear in the phase-3 prototype),
`must-mock-state` (a state variant the prototype must demonstrate), `reference-only`.
Coverage: `observed` (exercised in a real browser), `code-confirmed`, `inferred`, `not-checked`.

Screenshot paths are relative to `screenshots/current/`. Desktop captures are 1440×1000; mobile 390×844;
narrow 320×844; `zoom200` is a 640×500 viewport standing in for 200% reflow of 1280×1000.

---

## PUB — public entry, auth, recovery, legal

| ID | Surface/state | Entry path | Active? | Scenario(s) | Current evidence | State class | Preview req. | Coverage | Notes/gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PUB-01 | Public entry | `/` signed out | Yes — rendered | Entry | `PUB-01-marketing-desktop.jpg`, `-390.jpg`, `-full` variants; `MarketingPage.tsx` | default | primary | observed | Hero, Class Pulse demo card, 4-step loop |
| PUB-02 | Sign in / sign up | `/?auth=signin` · `?auth=signup` | Yes | Entry | `PUB-02-signin-desktop.jpg`, `PUB-02-signup-desktop.jpg`, `-390`, `PUB-02-signup-320.jpg` | default | primary | observed | Split layout; Apple sign-in shows an unavailable notice |
| PUB-03 | Recovery request | Sign in → "Forgot password?" | Yes | Recovery | `PUB-03-recovery-desktop.jpg`, `PUB-03-recovery-sent-desktop.jpg`, `-390` | default + success | must-mock-state | observed | Neutral anti-enumeration response confirmed |
| PUB-04 | Privacy | `/privacy` | Yes | Trust | `PUB-04-privacy-desktop.jpg`, `-390.jpg` | default | reference-only | observed | |
| PUB-05 | Reset-password completion | `/reset-password?token=…` | Yes | Recovery | `PUB-05-reset-desktop.jpg`, `-390.jpg` | default | must-mock-state | observed | Rendered with a deliberately invalid local token |
| PUB-06 | Not found | any unknown path | Yes | Recovery | `PUB-06-notfound-desktop.jpg`, `-390.jpg`, `-320.jpg` | error | must-mock-state | observed | No horizontal overflow at 320 |
| PUB-07 | Invitation-required rejection | Sign up with a non-allowlisted email | Yes | Entry boundary | `PUB-07-invite-rejected-desktop.jpg`, `-390.jpg` | error/recovery | must-mock-state | observed | Induced by temporarily populating `BETA_ALLOWED_EMAILS`, then reverting |

## SYS — app shell lifecycle

| ID | Surface/state | Entry path | Active? | Scenario(s) | Current evidence | State class | Preview req. | Coverage | Notes/gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SYS-01 | Authenticated app loading | Signed-in reload with a slow `/classes` | Yes | All | `SYS-01-workspace-loading-desktop.jpg` | loading | must-mock-state | observed | Induced with a 6s route delay; silhouette + named workspace preserved |
| SYS-02 | Update available | Service-worker `needRefresh` | Yes | Recovery | `UpdatePrompt.tsx:19,36,45,52` | update | must-mock-state | code-confirmed | Not induced: requires a real SW update cycle against a built, deployed bundle |
| SYS-03 | Render / stale-chunk recovery | Descendant render throw or stale lazy chunk | Yes | Recovery | `ErrorBoundary.tsx:15-32`; `Dashboard.tsx` `resetLabel="Exit live mode"` | error/recovery | must-mock-state | code-confirmed | Not induced: would require forcing a render throw in product code, which this run may not edit |

## CLS — classes library, creation, summary

| ID | Surface/state | Entry path | Active? | Scenario(s) | Current evidence | State class | Preview req. | Coverage | Notes/gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CLS-00 | First-run tutorial | In-app sign-up → `onSignedUp` | Yes | First use | `App.tsx:78`, `onboarding-video.ts:19`, `OnboardingVideoDialog.tsx` | overlay | must-mock-state | code-confirmed | **Did not fire.** The pending flag is set only by the SPA sign-up path; the fixture accounts were created through the API, so the flag was never written. `CLS-00-first-run-*.jpg` therefore show the fresh workspace, not the tutorial |
| CLS-01 | Populated class library | Sign in → Classes | Yes | Resume, plan | `CLS-01-library-desktop.jpg`, `-390.jpg`, `-full` | populated | primary | observed | 5 classes; 4 shown as priority cards |
| CLS-02 | Fresh signed-in account | Sign in as the fresh account | Yes | First use | `CLS-02-fresh-desktop.jpg`, `-390.jpg`, `-full` | empty | primary | observed | Four legitimate start paths offered |
| CLS-03 | Empty class and start choices | Open "Untitled class" | Yes | Start a class | `CLS-03-empty-class-desktop.jpg`, `-390.jpg`, `-full` | empty | primary | observed | "Choose the strongest starting point" + 4 entries |
| CLS-04 | Class summary / rehearsal | Class card → "Rehearsal view" | Yes | Rehearse, review | `CLS-04-rehearsal-desktop.jpg` (empty class), `CLS-04-rehearsal-populated-desktop.jpg`, `-390` | populated + empty | primary | observed | Read-only modal with pulse, readiness, run-of-show. **The populated capture shows "SoundCloud likes", not Sunrise Climb** — Sunrise Climb has no Rehearsal control because it is not one of the four priority cards, which is itself the evidence for critique B7 |
| CLS-05 | Class-library load failure | Force `/classes` → 500 | Yes | Recovery | `CLS-05-library-error-desktop.jpg` | error | must-mock-state | observed | Named state, safety line, two recovery actions |

## MUS — music workspace

| ID | Surface/state | Entry path | Active? | Scenario(s) | Current evidence | State class | Preview req. | Coverage | Notes/gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MUS-01 | Music home disconnected | Music, before any connection | Yes | Source music | `MUS-01-music-disconnected-desktop.jpg`, `-390.jpg`, `-full` | disconnected | primary | observed | Captured before any provider was connected, per `fixtures.md` order |
| MUS-02 | Music home connected/mixed | Music, after connecting | Yes | Source music | `MUS-02-music-mixed-desktop.jpg`, `-390.jpg`, `MUS-02-music-connected-desktop.jpg` | populated/mixed | primary | observed | Connected / expired / catalog-only side by side |
| MUS-03 | Liked tracks selection | Music → "Browse liked tracks" | Yes | Start from likes | `MUS-03-likes-desktop.jpg`, `-390.jpg`, `MUS-03-likes-selection-desktop.jpg` | populated | primary | observed | 2 deterministic mock likes |
| MUS-04 | Class-created confirmation | Likes → "Create class from 2 liked tracks" | Yes | Start from likes | `MUS-04-class-created-desktop.jpg`, `-full` | success | must-mock-state | observed | Created a real class titled "SoundCloud likes" — see fixture deviations |
| MUS-05 | Saved playlist detail, populated | Provider playlist card | Yes in prod | Start from a playlist | `user-playlists.ts:114,152` | populated | primary | **not-checked** | **Not inducible locally.** Under `MOCK_PROVIDERS=true` the saved-playlist path returns `[]` by design, so only the empty state exists. UI correctly shows "No saved playlists yet on this account." |
| MUS-06 | Catalog search and selection | Builder → Add music → Search | Yes | Start from a track | `MUS-06-catalog-search-desktop.jpg`, `BLD-07-search-results-desktop.jpg` | populated | primary | observed | Reachable only from Builder, not from the Music workspace — see critique B4 |
| MUS-07 | Provider status unavailable | Force `/providers/connections` → 503 | Yes | Recovery | `MUS-07-status-unavailable-desktop.jpg` | unavailable | must-mock-state | observed | "Status unavailable" stays distinct from disconnected |

## CONN — provider connection management

| ID | Surface/state | Entry path | Active? | Scenario(s) | Current evidence | State class | Preview req. | Coverage | Notes/gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CONN-01 | All providers disconnected | Music → Manage connections | Yes | Connect | `CONN-01-disconnected-desktop.jpg`, `-390.jpg` | disconnected | primary | observed | Captured before any connection existed |
| CONN-02 | Mixed connection / recovery | Same, after connecting two | Yes | Reconnect | `CONN-02-mixed-desktop.jpg`, `-390.jpg` | mixed | primary | observed | Connected + session-expired + not-connected together |

## BLD — builder

| ID | Surface/state | Entry path | Active? | Scenario(s) | Current evidence | State class | Preview req. | Coverage | Notes/gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BLD-01 | Populated Builder | Classes → open "Sunrise Climb" | Yes | Build, score | `BLD-01-builder-desktop.jpg`, `-390.jpg`, `-320.jpg`, `-zoom200.jpg`, `-full` | populated | primary | observed | 10 tracks; no horizontal overflow at 320 or 200% |
| BLD-02 | Track inspector essentials | Select a track | Yes | Score a track | `BLD-02-inspector-desktop.jpg`, `-full` | populated | primary | observed | Intensity, BPM, duration, clip window, notes |
| BLD-03 | Inspector advanced fields | Inspector → "Advanced timing and placement" | Yes | Score a track | `BLD-03-advanced-desktop.jpg`, `-full` | populated | primary | observed | RPM, holds, downbeat — a link, not a button |
| BLD-04 | Free-placement timeline | Open "Slow Burn" | Yes | Place music | `BLD-04-timeline-desktop.jpg`, `-390.jpg`, `-full` | populated | primary | observed | Free mode with a deliberate 45s gap |
| BLD-05 | Preview ready | Select track → preview rail | Yes | Audition | `BLD-05-preview-ready-desktop.jpg` | ready | must-mock-state | observed | "▶ Play preview on SoundCloud" |
| BLD-06 | Preview playing | Press play | Yes | Audition | `BLD-06-preview-playing-desktop.jpg` | playing | must-mock-state | observed (UI state only) | UI advanced to "Now playing"; **audible playback not verifiable headlessly** — `encrypted-media` is blocked by permissions policy |
| BLD-07 | Add music — search | Builder → Add music → Search | Yes | Start from a track | `BLD-07-addmusic-desktop.jpg`, `BLD-07-search-results-desktop.jpg` | populated | primary | observed | |
| BLD-08 | Add music — likes | Add music → My likes | Yes | Start from likes | `BLD-08-likes-desktop.jpg` | populated | primary | observed | |
| BLD-09 | Saved playlists empty | Add music → Saved playlists | Yes | Start from a playlist | `BLD-09-playlists-empty-desktop.jpg` | empty | must-mock-state | observed | Empty message renders twice — critique B2 |
| BLD-10 | Playlist URL import | Add music → Import Playlist URL | Yes | Import | `BLD-10-playlist-import-desktop.jpg` | default | must-mock-state | observed | Destination selector + URL field |
| BLD-11 | Custom moves library | Moves → "Manage…" | Yes | Movement | `BLD-11-custom-moves-desktop.jpg` | populated | primary | observed | Shows the fixture move "Hover Pulse" |
| BLD-12 | Songs by move — empty | Moves → "Songs by move…" | Yes | Movement-first start | `BLD-12-songs-by-move-desktop.jpg` | empty | must-mock-state | observed | "Pick a move" resting state |
| BLD-13 | Songs by move — results | Pick "Climb" | Yes | Movement-first start | `BLD-13-songs-by-move-results-desktop.jpg` | populated | primary | observed | Finds Baianá in Sunrise Climb at 0:30 |
| BLD-14 | Preview paused | Preview → Pause | Yes | Audition | `BLD-14-preview-paused-desktop.jpg` | paused | must-mock-state | observed | |
| BLD-15 | Preview resume failed | Provider resume rejection | Yes in prod | Audition recovery | `TrackPreview.tsx` failure branch | error | must-mock-state | **not-checked** | Not induced: the mock seam has no resume-failure path, and forcing one would require editing product code |
| BLD-16 | Preview clip complete | Clip window reaches its end | Yes in prod | Audition | `TrackPreview.tsx` completion branch | success | must-mock-state | **not-checked** | Not induced: requires real audio progression, which headless playback cannot produce |

## LIVE — live queue and runtime

| ID | Surface/state | Entry path | Active? | Scenario(s) | Current evidence | State class | Preview req. | Coverage | Notes/gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LIVE-01 | Live queue | Nav → Live | Yes | Choose next class | `LIVE-01-queue-desktop.jpg`, `-390.jpg`, `-full` | populated | primary | observed | Queue readiness summary panel |
| LIVE-02 | Preflight with blocked playback | Queue card → Preflight | Yes | Pre-class check | `LIVE-02-preflight-desktop.jpg`, `-390.jpg`, `-320.jpg`, `-zoom200.jpg`, `-dense-desktop.jpg` | mixed/blocked | primary | observed | Per-track verdicts; prompter-only path always offered |
| LIVE-03 | Run ready | Preflight → Run without music | Yes | Run a class | `LIVE-03-run-ready-desktop.jpg`, `-390.jpg`, `-320.jpg`, `-zoom200.jpg`, `-dense-desktop.jpg` | ready | primary | observed | Affirmative "Press play to start" |
| LIVE-04 | Run active | Press Play | Yes | Run a class | `LIVE-04-run-active-desktop.jpg`, `-390.jpg`, `-dense-desktop.jpg` | active | primary | observed | Timers advance; wake-lock state disclosed |
| LIVE-05 | Run paused | Pause | Yes | Recover mid-class | `LIVE-05-run-paused-desktop.jpg`, `-390.jpg`, `-dense-desktop.jpg` | paused | primary | observed | |
| LIVE-06 | Full run-of-show list | Runtime → "Full List" | Yes | Scan the class | `LIVE-06-run-of-show-desktop.jpg`, `-full` | populated | primary | observed | Per-track duration, BPM, effort |
| LIVE-07 | — | — | — | — | — | — | — | — | Reserved; not assigned |
| LIVE-08 | — | — | — | — | — | — | — | — | Reserved; not assigned |
| LIVE-09 | Runtime playback failure / recovery | Mid-class provider stream failure | Yes in prod | Recover mid-class | `LiveMode.tsx` runtime-failure branch | error/recovery | must-mock-state | **not-checked** | Failing the playback-token route produced no failure surface because the fixture class runs prompter-only ("Music off"), so no stream was ever requested. `LIVE-09-runtime-failure-desktop.jpg` shows the healthy prompter runtime, not a failure |

## ACC — account

| ID | Surface/state | Entry path | Active? | Scenario(s) | Current evidence | State class | Preview req. | Coverage | Notes/gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ACC-01 | Account workspace | Nav → Account | Yes | Manage account | `ACC-01-account-disconnected-desktop.jpg`, `-390.jpg`, `-full` | populated | primary | observed | Profile / Preferences / Music connections / Security |
| ACC-02 | Account music connections | Account → Music connections | Yes | Reconnect | `ACC-02-connections-desktop-full.jpg` | mixed | primary | observed | Same capability ledger as CONN-02 |
| ACC-03 | Account status unavailable | Force `/providers/connections` → 503 | Yes | Recovery | `ACC-03-status-unavailable-desktop.jpg` | unavailable | must-mock-state | observed | Does not imply data loss |

---

## Counts

| Metric | Count |
| --- | --- |
| Registry surfaces bound | 51 (49 active + 2 reserved) |
| New surfaces discovered | 0 |
| Surfaces retired | 0 |
| `primary` | 30 |
| `must-mock-state` | 18 |
| `reference-only` | 1 |
| Coverage `observed` | 42 |
| Coverage `code-confirmed` | 3 (SYS-02, SYS-03, CLS-00) |
| Coverage `not-checked` | 4 (MUS-05, BLD-15, BLD-16, LIVE-09) |
| Screenshots captured | 121 files, 9.2 MB |
| Viewports exercised | 1440×1000, 640×500 (200%-equivalent), 390×844, 320×844 |

**Registry impact:** none. `agent-prompts/design-audit/surface-ids.md` required no edit — every surface it lists
still exists and no surface outside it was found.

## Dormant surfaces confirmed excluded

Explore, Teams, shares/public classes, collaborators, invitations, community discovery, and
pricing/subscription merchandising were **not reachable** from any signed-in navigation path.
`ExploreDialog.tsx` and the teams/shares routes remain in the repository as dormant scaffolding
(D20), consistent with the locked scope. No user-facing entry point surfaces them.

## Evidence gaps, stated plainly

Four registry surfaces could not be honestly exercised in this environment, and three more are
code-confirmed only. They are listed above with the exact blocker. None of them are rounded up to
`observed`, and the phase-3 prototype marks each as a proposal that current evidence cannot validate:

1. **MUS-05** — the mock provider seam returns an empty saved-playlist array by design.
2. **BLD-15 / BLD-16** — preview failure and clip completion need real provider audio progression.
3. **LIVE-09** — no provider stream is requested in prompter-only mode, so no runtime failure occurs.
4. **CLS-00** — the onboarding flag is written only by the in-app sign-up path.
5. **SYS-02 / SYS-03** — need a real service-worker update cycle and a forced render throw.
6. **Audible playback** for BLD-06 and Live — headless Chromium blocks `encrypted-media`; the repo's own
   `AGENTS.md` already requires a real browser for playback verification.
