<!-- Intake 2026-10-29: copied verbatim from the owner's ritmo-ux-audit-2026-10-28.md. Code verification
against main c9b89a7, intake corrections and the RF records filed from it are in run-decisions.md.
The audit text below is unedited; where it and run-decisions.md disagree, run-decisions.md wins. -->

# Ritmo Studio — UX Audit Findings

2026-10-28 · Steven Crosby (review run with Claude)

## How to read this

The app's biggest problem is trust in its own status labels: readiness, music and authorization states disagree across Classes, Live, Music and Account. Fix that before visual polish.

**Scope.** Production `ritmofit.studio`, reviewed 2026-10-28 in the Claude desktop built-in browser, signed in as the owner account. Pages: landing, sign-in, Classes home, Music, Live queue and preflight, Account. Viewports: ~713px, 1440px emulated, 375px emulated. No class was created, edited, started or deleted.

**Canon.** Checked against the project docs: `01-design-principles.md` (Principle 0 "Simple. Stupid. Swift."), `ritmofit-design-system.md`, `decisions.md` (D1–D24), `DEVELOPMENT_PLAN.md`, `HISTORY.md`. Section numbers like §9.1 refer to the design-system brief.

**Evidence tags** on every finding:

- **Verified** — measured in the live DOM, network log or computed styles, or reproduced by interaction.
- **Inference** — consistent with the evidence but the cause or intent is not proven.
- **Judgment** — a design opinion measured against the docs; reasonable people may differ.

Each page was reviewed, then re-checked in an adversarial pass. Corrections from those passes are applied below; withdrawn claims are listed in their own section so agents don't act on them.

**Limits.** One account with heavy QA data. Real phones and tablets, audible playback, error states that need submitted credentials, and a brand-new invited account were not tested.

**Authority.** This is audit intake: proposed remediation, not implementation authority. Triage into RF task records per the normal plan gate.

## Top priorities

Two P0s: a library bug that hides most of her music, and a run rule that differs between screens. Everything else is P1 or P2.

| # | Priority | Page | Finding | Evidence |
| --- | --- | --- | --- | --- |
| 1 | P0 | Music | Apple library Songs capped at 200 (A–"Angel"); search filters only those 200, so the rest of the library is unreachable | Verified |
| 2 | P0 | Builder / Live | Same class: builder disables "Run live" ("7 blocks still need music"); Live queue says "Can run live" and preflight allows it | Verified |
| 3 | P1 | Live | Card says "✓ Music ready"; preflight for the same class says Blocked, 15 of 30 tracks can't play | Verified |
| 4 | P1 | Account | Apple "Playback ✓ Authorized" while Live preflight requires browser authorization (D24) | Verified |
| 5 | P1 | Classes | "Needs tempo" on 25 of 30 rows, styled like a blocker though tempo doesn't block a run; copper status dot | Verified |
| 6 | P1 | Music | No per-track preview, select or add on playlist detail or Songs (D21 "browse/listen first") | Verified |
| 7 | P1 | Sign-in | No URL of its own: path stays `/`, no history entry, can't be linked from an invite email | Verified |
| 8 | P1 | Music | Opens on the first provider (SoundCloud, disconnected) in Catalog mode every visit; not remembered | Verified |
| 9 | P1 | Account | Security section has no controls (no password change, no deletion); copy points to a provider that doesn't exist for email accounts | Verified |
| 10 | P1 | Live | 28 copper "Preflight" primaries on one screen (§9.1) | Verified |
| 11 | P1 | Live | Preflight repeats one failure 15× and puts "Manage connections" ~1,900px below; never names the provider | Verified |
| 12 | P2 | Landing | No fitness or discipline words on the page; meta description says "spin" against "movement-first, not spin-only" | Verified |
| 13 | P2 | Sign-in | Brand panel headline 72px (above type scale) with class-shape art on a surface that should be cool and quiet (§3.6, OD-01) | Verified + Judgment |

Rationale: 1 and 2 block real work or produce wrong behavior; 3–5 erode trust in every status in the app; the rest are clarity and polish.

## Cross-cutting themes

Five patterns repeat across pages; fixing them at the source clears many individual findings at once.

1. **One word, several meanings.** "Music" means filled plan blocks on Classes and playable tracks on Live. "Ready" means runnable-without-music on the Live header but implies music on the card. "Reconnect" (Music) vs "Session expired" (Account) for the same state. Pick one vocabulary and one readiness model, used everywhere.
2. **Copper used for status and for every row.** Copper status dots on Classes, 28 copper buttons on Live. §4 and §9.1 reserve copper for identity and the one primary action per surface; warnings belong on the caution channel.
3. **Engineering language on instructor surfaces** (Principle 0, Q3). Examples: "provider truth", "pressure-safe view", "Catalog, library, and playback are separate capabilities", "Public widget ready", "SOURCE → DESTINATION", "movement language", "your creative loop". Fix with plainer words (ladder rung 3), not more helper text.
4. **Old effort words in screen-reader labels.** Class Pulse `aria-label`s on landing and Live say "easy, moderate, hard, all out" while visible legends use D17's Build / Push / Attack / All Out. Live labels also list every track (15 values) instead of the §11.5 summary.
5. **Redundant repetition.** "Jump back in" repeats Recents; "Playlist · Apple Music" on every row; identity shown twice on Account; two exits in the playlist dialog. Principle 7: earn every element.

## Landing page

Technically clean (no console errors, no mobile overflow, correct fonts, 44px targets), but it never says it's for fitness instructors.

| Finding | Doc | Evidence |
| --- | --- | --- |
| No "fitness", "cycle", "Pilates" or "HIIT" anywhere in the page text; the "what" relies on inference | Principle 0; §12.4 | Verified |
| Meta description says "rhythm spin instructors"; canon is movement-first, not spin-only (Cycle / Pilates / HIIT) | §12.4; D20 | Verified |
| Jargon: "provider truth", "pressure-safe view", "your authorized library", "carry the source into class work", "clip decisions" | Principle 0 Q3 | Judgment |
| Class Pulse `aria-label` uses "easy, moderate, hard, all out"; legend uses Build / Push / Attack / All Out; no duration or peak count | §11.5; D17 | Verified |
| Nav links hidden at ~713px with no menu button | §11 | Verified |
| Secondary CTA "Learn the workflow" links to `#class-shape`; spec says "See class shape" | §12.4 | Verified |
| Header + hero + closing CTAs are all copper | §9.1 | Judgment (common marketing pattern) |
| Eyebrow "Built for instructors who create" drifts from canonical "For instructors who build the class" | §5.4 | Judgment |
| The core pain (hours choreographing on a phone) never appears | DEVELOPMENT_PLAN core insight | Judgment |
| Current hero demo is a generic "Example class" at 27:00 | — | Judgment |

Suggested hero subhead from the canon: "helps rhythm fitness instructors build, cue, and perform movement-first classes from the music up."

## Sign-in

The form itself is solid; the problems are the missing URL and a brand panel that outshouts the task.

| Finding | Doc | Evidence |
| --- | --- | --- |
| Sign-in has no path: `location.pathname` stays `/`, `history.length` 1; invite emails can't deep-link and Back can't return to landing | CLAUDE.md (no router; known paths `/`, `/privacy`, `/reset-password`) | Verified |
| Desktop brand panel headline computes to 72px (scale max `display-xl` 52px); form H1 about a third of that | §7.2; Principle 7 | Verified |
| Class-shape artwork and campaign display type on sign-in | §3.6 hard boundary; OD-01 | Verified + Judgment |
| "Continue with Apple" has no Apple logo; HIG custom buttons require the official logo asset. Not an App Review issue on web | Apple HIG | Verified (nonconformance) |
| "Need an invited account? Sign up" reads backwards → "Invited? Create your account." | Principle 0 Q3 | Judgment |
| Sign-up subhead "Your name and email stay here if the invitation needs attention" is unclear → "Use the email your invitation was sent to." | Principle 0 Q3 | Judgment |
| Panel copy "Your creative loop is waiting" and "provider-authorized playback" are internal terms (D20, D19/D22) | Principle 0 Q3 | Judgment |
| "Private beta" stated twice (panel and form footer) | Principle 7 | Verified |
| Show-password button 36px tall | §9.1; §11.4 (44px) | Verified |
| Panel H2s precede the form H1 in DOM order | §11.5 | Verified |

**Passes:** correct `autocomplete` values, labels above fields, labelled Show/Hide, password rule linked via `aria-describedby`, forgot-password copy doesn't reveal accounts, mode switches move focus to the H1, glow removed per OD-01.

## Classes home

A status on nearly every row stops being a status; the page doesn't say what to do next.

| Finding | Doc | Evidence |
| --- | --- | --- |
| "Needs tempo" on 25 of 30 loaded rows, "Needs music" on 5; tempo doesn't block a run ("Can run live · 2 things left" with no BPM) | Principle 3 (lead with the affirmative) | Verified |
| "Needs tempo" and "Needs music" share the same dot, color and weight; only one blocks the builder's Run live | Principle 3 | Verified |
| "Needs music" means empty plan blocks ("7 blocks still need music"), not missing tracks; label should name the gap | Principle 0 Q3 | Verified |
| Status dot uses `bg-brand` (copper) on every row | §4; §6.1 | Verified |
| Manual BPM only (GetSongBPM key not provisioned) makes "Needs tempo" practically unfixable at scale | DEVELOPMENT_PLAN deferred items | Inference |
| "Jump back in" repeats the first four Recents rows shown beside it | Principle 7 | Verified |
| Home template cards show Cycle and Pilates; the template dialog also offers HIIT | D20; D21 | Verified |
| "+ Create" (New class / From a template / Import a playlist) and the template cards overlap | Principle 7 | Verified |
| At narrow widths, DOM order (Recents first) differs from visual order (templates first); ~60 tab stops before templates | WCAG 1.3.2 / 2.4.3 (debatable) | Verified |
| "Steven" in the top nav is a non-interactive `<p>` among tabs | Principle 0 Q4 | Verified |
| "Recents" order after the first four looks alphabetical; likely never-opened classes tie | — | Inference |
| Page H1 is the logo text; the browser tab title stays "Ritmo Studio" (other tabs set their own) | §11.5 | Verified |
| Titles truncate in the desktop rail while the status keeps full width | — | Verified |
| 23 of 30 loaded classes are `[QA]` fixtures; `#qa-fixture` shows as a filter chip | prod-fixture-hygiene | Verified |

**Passes:** 44px row buttons, per-class "More actions" labels, mono durations, bounded art, text (not color) readiness labels, no overflow at ~713px.

## Music

One P0 bug (truncated library) and one product gap (no track-level preview or selection). Tested with Apple Music, the only connected provider.

| Finding | Doc | Evidence |
| --- | --- | --- |
| Songs shows exactly 200 rows ("A.F.U." → "Angel (Remastered 2018)"); scrolling loads nothing; one `GET /providers/apple_music/likes` with no paging params | D21 | Verified |
| Search makes no network request and filters only the 200 loaded ("love" → 10 results, all starting with A) | D21 | Verified |
| Playlist-detail rows and song rows contain zero buttons: no preview, select or add | D21 ("browse/listen first, then Start class or Add selected") | Verified |
| Opens on SoundCloud + Catalog every visit even after choosing Apple Music | Principle 8 (alive at rest) | Verified |
| "Recents" order is near-alphabetical (54 of 75 playlists; songs strictly A→An); Name sort works | — | Inference |
| Spotify shows "Reconnect"; selecting it shows only catalog search with no reason. #606 may explain the allowlist during reconnect (untested) | D24 truth and recovery | Verified (partial) |
| Playlist header shows no track count or total time; 15-song import cap not disclosed before "Start class" (click untested) | Principle 0 Q5 | Verified (count) |
| "Create class from liked songs" reads Apple *library* songs | — | Verified via docs |
| "Catalog" vs "Songs", "movement language", "MUSIC SOURCES", "SOURCE → DESTINATION" | Principle 0 Q3 | Judgment |
| "Playlist · Apple Music" / "Song ·" on every row | Principle 7 | Verified |
| Playlist dialog has both "Close" and "Back to playlists" | Principle 7 | Verified |
| Status badges in Azeret Mono at 10px (below 11px caption floor) | §7.2 (size); §7.3 (mono for words = judgment) | Verified |
| "SoundCloud" pill truncates to "SoundC…" at ~713px | — | Verified |
| §9.8 says Spotify/Apple are catalog-only; D21 and the app connect all three — doc is stale | §9.8 vs D21 | Verified |

**Passes:** `aria-current` on nav, `aria-pressed` on toggles, labelled search, modal dialog with focus to Close and Escape to close, 44px targets, cyan + check for Connected and amber + icon for Reconnect, page title "Music – Ritmo Studio".

## Live queue and preflight

Preflight is honest and well built; the queue in front of it and the builder use different rules. Decide one run rule and apply it to builder, queue and preflight.

| Finding | Doc | Evidence |
| --- | --- | --- |
| "[QA] Goal Template Cycle": builder "Run live" disabled ("7 blocks still need music"); Live lists "Can run live"; preflight lets it start after Apple authorization, "Run without music" enabled | D24; readiness model | Verified |
| "[QA] Spotify import smoke": card details "✓ Music ready"; preflight "Blocked · 30 checked · 15 passed · 15 need attention" | D24 (no promise from connection data) | Verified |
| Header "28 of 28 classes ready for Live" is true only as runnable-without-music | D22 | Verified |
| Cause of the 15 failures assumed to be Spotify (class name); preflight never names the provider | — | Inference |
| 28 copper "Preflight" buttons on one screen | §9.1 one primary per surface | Verified |
| Preflight repeats "No connected provider can play this / Connect a music provider…" 15×; "Manage connections" ~1,900px down | Principle 0 Q5 | Verified |
| Exit from preflight sends focus to the logo H1 and scrolls the list to top | §11.4 | Verified |
| "◇ AUTO" tag has no visible explanation (SR label explains it) | Principle 0 Q3/Q4 | Verified |
| Card face shows "2 things left" styled as an action; details say "Can run live" → lead with "Ready · BPM and cues optional" | Principle 3 | Judgment |
| Sort looks like most-recently-edited but is unlabeled | — | Inference |
| Class Pulse `aria-label` lists every track's effort in old words | §11.5; D17 | Verified |
| Class length truncates at 375px ("59:…") while "2 things left" keeps full width | — | Verified |

**Passes:** preflight blocks music start honestly, keeps "Run without music" first-class, disabled Start uses native `disabled` + 40% opacity, focus moves to preflight H1, Live background, AUTO follows §9.6a, 44px targets, plain-language readiness detail.

## Account

The connection matrix is the best status UI in the app; Security is empty and Apple's "Authorized" overclaims.

| Finding | Doc | Evidence |
| --- | --- | --- |
| Security has no controls (no password change, no other-session sign-out, no deletion); only a privacy link | D22 (self-service deletion before expansion) | Verified |
| Security copy "remain with the active sign-in provider" is ambiguous; for email accounts Ritmo is the provider | D1; D2a | Judgment |
| Apple Music "Playback ✓ Authorized" while Live preflight requires a browser authorization check | D24 | Verified |
| "Session expired" here vs "Reconnect" on Music for the same state | — | Verified |
| "Sign out" sits in the profile form row beside "Save profile" (semantic misplacement; misclick unlikely, ~90–500px apart) | — | Verified |
| "Profile image URL" text field feeds the 64px avatar; instructors don't have image URLs → upload or drop | Principle 0 Q2 | Judgment |
| Engineering copy: "Catalog, library, and playback are separate capabilities", "Public widget ready", "PERSONAL WORKSPACE" | Principle 0 Q3 | Judgment |
| Name and email shown twice | Principle 7 | Verified |
| Profile / Music connections / Security are unlabeled `<section>`s with eyebrow text, no headings or landmarks | §11.5 | Verified |
| D21 lists a Preferences section; none exists (cut or stale doc?) | D21 | Verified |

**Passes:** per-provider Catalog / Library / Playback matrix with next steps, `aria-current` on Account, correct page title, one copper primary, labelled fields, `autocomplete="name"`, 44px targets, no overflow at 375px.

## Withdrawn or corrected — do not act on these

These claims appeared in the live review and were withdrawn or corrected after re-checking.

| Original claim | Status | Why |
| --- | --- | --- |
| Name spin plainly on the landing page | Withdrawn | Canon is Cycle / Pilates / HIIT, movement-first (D20, §12.4) |
| Advertise "Works with Spotify" | Withdrawn | D22 provider-terms review; Spotify currently 403s for the owner account |
| Update modal / "Restoring your workspace" hits first-time visitors | Unproven | Built-in browser has a persistent profile; retest in a clean profile |
| Password managers can't target sign-in | Withdrawn | They key on form fields; autocomplete is correct |
| Apple button is an App Review risk | Withdrawn | App Review doesn't govern websites; HIG nonconformance remains |
| Focus lands on body when entering sign-in | Untested | Measured after manual clicks |
| "28 of 31 Needs tempo", "25 of 31 QA" | Corrected | 25 of 30 and 23 of 30 loaded rows |
| Two unexplained ways to create a class | Corrected | "+ Create" is a menu; only the template cards duplicate it |
| HIIT missing | Corrected | In the template dialog; only home cards omit it |
| #438 readiness ranking regressed | Withdrawn | All rows tie; this data can't show it |
| Classes "Needs music" and Live "Music ready" contradict | Reframed | Different meanings of "music"; the real bug is the differing run rule |
| Profile image field does nothing | Corrected | It feeds the avatar circle |
| Spotify: "5 users", "250k MAU", "search capped at 10" | Unverified | Third-party sources; Spotify's blog confirms Premium, a user cap and one Client ID only |

## Open decisions and untested areas

The run rule is the one decision that unblocks the most fixes.

**Owner decisions**

- [ ] Run rule: do empty plan blocks block a run, or only a music start? Then align builder, Live queue and preflight.
- [ ] Readiness vocabulary: one meaning each for "ready", "music" and connection states across all pages.
- [ ] Tempo: provision GetSongBPM, or stop flagging missing BPM at list level.
- [ ] HIIT on the Classes home template cards: intended omission or bug?
- [ ] Account Preferences: cut (update D21) or still planned?
- [ ] Spotify: hide until the developer allowlist is resolved, or label the real cause?

**Not yet tested**

- [ ] A brand-new invited account's first screen (the true first page for testers)
- [ ] The builder, beyond reading one class
- [ ] Live running a class, on a real iPhone and iPad
- [ ] "Start class" from a 49-track playlist (15-song picker)
- [ ] Sign-in and sign-up error states
- [ ] Spotify reconnect flow (#606 allowlist message)
- [ ] Update prompt on a clean browser profile

**Docs to add to the project** for the next pass: `09-class-builder-guidelines.md`, `10-rhythm-system.md`, `11-library-guidelines.md`, `music-providers.md`, `glossary.md`, `AGENTS.md`.
