# UX audit 2026-10-28 — intake decisions

Intake 2026-10-29 by Claude (conductor session), against `main` at `c9b89a7`. The audit itself is
[`README.md`](README.md), copied verbatim. This file is the authoritative ledger: where the two
disagree, this file wins. Nothing here authorizes implementation; each RF record does that once the
owner moves it to Ready.

## How the findings were checked

Each finding in "Top priorities" and the page tables was checked against the source on `main`, not
against production. The result is one of:

- **Reproduced**: the code produces the observed behavior.
- **Explained**: the code does it on purpose; the reason is cited.
- **Browser check**: the code can't settle it; it needs a DOM, viewport or device check.
- **Tracked**: an existing record or runbook already covers it.

Items under the audit's "Withdrawn or corrected" were not filed.

## Top priorities

| # | Finding | Tag | Result | Evidence | Record |
| --- | --- | --- | --- | --- | --- |
| 1 | Apple library songs capped at 200; search filters only those | Verified | Reproduced, and wider than Apple | `packages/music/src/apple-music.ts:363` defaults `maxTracks` to 200 (pages of 100); `spotify.ts:341` and `soundcloud.ts:361` use the same default. `apps/api/src/lib/music/user-likes.ts:220` never passes `maxTracks`. `GET /providers/:provider/likes` (`apps/api/src/routes/providers.ts:93`) takes no cursor. Search is client-only: `filterLibrary` in `apps/web/src/lib/music-library.ts:189`. No paging exists on this path. | RF-132 |
| 2 | Builder disables Run live; Live queue and preflight allow it | Verified | Reproduced (gates differ, see brief 1) | Builder: `Dashboard.tsx` `canRun = canRunPayload && !planLead && planReady` and `runEnabled = canRun && !planLead`. Queue: `classReadiness().runnable` (duration only). Preflight: `LivePreflight.tsx` Start needs every track playable plus browser authorization; Run without music is always enabled. | RF-131, RF-133 |
| 3 | Live card "Music ready" vs preflight "Blocked" | Verified | Reproduced; the checks differ on purpose, the copy overclaims | The card checks only that each track has a provider ref (`apps/web/src/lib/readiness.ts`, music dimension). Its detail says "a music service Live can play", which the file's own header note says it does not check. Preflight runs the coordinator: connected provider, playback scope and duration per track. | RF-134 |
| 4 | Account "Playback ✓ Authorized" vs preflight browser authorization | Verified | Reproduced; conflicts with D24 | "Authorized" means a stored connection with playback scope (`apps/web/src/lib/providers.ts`, `providerCapabilityTruth`). Live checks MusicKit `isAuthorized` in the current browser (`LiveMode.tsx`). D24 "Truth and recovery" says these are separate capabilities. | RF-134 |
| 5 | "Needs tempo" styled like a blocker, copper dot | Verified | Reproduced | `apps/web/src/lib/library-shell.ts` `readinessLabel`/`readinessMark`: every non-Ready label gets the same dot, drawn `bg-brand` in `ClassesHome.tsx`. Tempo is an attention state, not a gate (`readiness.ts`). | RF-134, RF-135 |
| 6 | No per-track preview, select or add on Music | Verified | Reproduced, scoped to the Music page | Song rows and the playlist dialog have no per-track controls. The builder already lazy-loads `TrackPreview` (`Dashboard.tsx`). | RF-138 |
| 7 | Sign-in has no URL of its own | Verified | Reproduced | `App.tsx` knows only `/`, `/privacy`, `/reset-password`; there is no router. | RF-139 |
| 8 | Music opens on SoundCloud + Catalog every visit | Verified | Reproduced | `useState<Provider>(PROVIDER_ORDER[0])` with `PROVIDER_ORDER = ['soundcloud', …]` (`providers.ts:22`); nothing is saved; a disconnected provider defaults to Catalog (`defaultLibraryKind`). | RF-137 |
| 9 | Account Security has no controls; copy is ambiguous | Verified | Reproduced | The Security section is one paragraph and a privacy link. D22 requires self-service deletion before expansion. RF-116 covers session revocation on password reset only. | RF-140 |
| 10 | 28 copper "Preflight" buttons | Verified | Reproduced | Every `LiveQueueCard` button uses `rf-btn-primary`. | RF-135 |
| 11 | Preflight repeats one failure per track, fix far below, provider unnamed | Verified | Reproduced | One row per track in `PreflightGroup`; Manage connections renders after both lists; the `no_connected_provider` reason carries no provider (`LivePreflight.tsx`, `coordinator.ts`). | RF-136 |
| 12 | Landing has no fitness words; meta says "spin" | Verified | Reproduced | `apps/web/index.html` description and og:description: "rhythm spin instructors". | RF-141 |
| 13 | Sign-in brand headline 72px, class-shape art | Verified + Judgment | Reproduced (size) | `Login.tsx` headline `clamp(2rem,5vw,4.5rem)`; 4.5rem = 72px. | RF-143 |

## Page tables

| Page | Finding | Tag | Result | Evidence | Record |
| --- | --- | --- | --- | --- | --- |
| Landing | Class Pulse `aria-label` uses easy/moderate/hard/all out | Verified | Reproduced | `ClassPulse.tsx` `EFFORT_LABEL` vs `EFFORT_ZONE_LABEL`; canon D17 | RF-141 |
| Landing | Nav hidden below `lg`, no menu button | Verified | Reproduced | `MarketingPage.tsx` nav `hidden … lg:flex` | RF-142 |
| Landing | "Learn the workflow", eyebrow drift, jargon, vague "Playback uses your connected provider account" | Verified / Judgment | Reproduced | `MarketingPage.tsx` | RF-141 |
| Landing | Core pain absent; generic hero demo | Judgment | Not a code question | — | RF-141 (copy pass) |
| Landing | Three CTA labels | — (notes only) | Partly explained: "Start" is the phone label of the same "Start building" button; every CTA calls `onStartBuilding` | `MarketingPage.tsx:85–90` | RF-141 (judgment) |
| Sign-in | Show-password button 36px | Verified | Reproduced | `PasswordField.tsx` `min-h-9` | RF-142 |
| Sign-in | Internal copy, "Private beta" twice, backwards "Need an invited account?", unclear subhead | Verified / Judgment | Reproduced | `Login.tsx` | RF-141 |
| Sign-in | Apple button lacks the logo; panel H2s precede the H1 | Verified | Browser check | — | RF-142, RF-143 |
| Classes | "Needs music" names several gaps | Verified | Reproduced, wider than the audit says | `readinessLabel` maps empty blocks, songs outside blocks, no tracks and unlinked tracks all to "Needs music" | RF-134 |
| Classes | Home template cards show Cycle and Pilates only | Verified | Explained | RF-37 (Done) shipped exactly "Cycle and Pilates templates"; `LIBRARY_TEMPLATES` in `library-shell.ts` | RF-131 (decision 4) |
| Classes | "Jump back in" repeats Recents | Verified | Reproduced | Both read `recentClasses` (`library-shell.ts`) | RF-142 |
| Classes | Tab title stays "Ritmo Studio"; "Steven" is a `<p>`; narrow-width DOM order | Verified | Reproduced | `Dashboard.tsx` title effect; `ClassesHome.tsx` `order-2 lg:order-none` | RF-142 |
| Classes | Nothing surfaces "your next class" | Judgment (notes only) | Not withdrawn; the #438 claim was | — | RF-134 |
| Classes | `[QA]` fixtures dominate the list | Verified | Tracked | `ritmofit_dev_plan/prod-fixture-hygiene.md` (SPC-21); owner cleanup, not code | none |
| Classes | GetSongBPM not provisioned | Inference | Confirmed | `DEVELOPMENT_PLAN.md` deferred items | RF-131 (decision 3) |
| Music | "Recents" is near-alphabetical | Inference | Explained, and the label is wrong | `orderLibrary` returns provider order for `recents`; Apple's library song order is A→Z, which is also why the cap ends at "Angel" | RF-132 |
| Music | No count in playlist header; 15-song cap not disclosed | Verified | Partly reproduced | The count shows only when the provider reports one; Apple library playlists map `trackCount ?? null`. Disclosure needs a browser check. | RF-138 |
| Music | Spotify "Reconnect" with no reason | Verified (partial) | Browser check | Needs the real allowlist state (#606) | RF-131 (decision 6) |
| Music | Row-type prefixes; Close plus Back to playlists | Verified | Reproduced | `playlistMetaLine`/`songMetaLine`; playlist dialog | RF-142 |
| Music | 10px mono badges; "SoundC…" truncation | Verified | Browser check | — | RF-142 |
| Music | §9.8 says Spotify and Apple are catalog-only | Verified | Confirmed doc drift | `ritmofit-design-system.md` §9.8 | RF-144 |
| Live | "28 of 28 ready for Live" true only without music | Verified | Reproduced | The header counts `runnable` (duration only) | RF-134 |
| Live | Exit focuses the H1 and scrolls to top | Verified | Explained | Deliberate landmark focus, commented with #250 in `Dashboard.tsx` | RF-142 (optional) |
| Live | Pulse label lists every track; AUTO unexplained to sighted users | Verified | Reproduced (label) | `ClassPulse.tsx` `accessibleLabel` | RF-141 |
| Live | Sort unlabeled | Inference | Explained | The queue keeps `GET /classes` order, `updatedAt DESC` | RF-142 (label) |
| Live | Class length truncates at 375px | Verified | Browser check | — | RF-142 |
| Account | "Session expired" vs "Reconnect" | Verified | Reproduced, reframed | Music's caution notice does say "Session expired" or "Reconnect needed"; only the provider pill says "Reconnect". Account's button says "Manage", preflight's says "Manage connections". | RF-134 |
| Account | Engineering copy | Judgment | Reproduced | `Dashboard.tsx` Music connections intro; `providers.ts` "Public widget ready" | RF-141 |
| Account | Sections have no headings or landmarks | Verified | Partly contradicted | Profile and Music connections ("Provider accounts") have h3s; only Security lacks one. No section has an accessible name. | RF-142 |
| Account | Sign out in the profile form; Profile image URL field | Verified / Judgment | Reproduced | `Dashboard.tsx` profile form | RF-142 |
| Account | D21 lists a Preferences section | Verified | Citation wrong | D21 says only "an in-page settings workspace"; Preferences appears in `HISTORY.md` (2026-07-07 entry) | RF-131 (decision 5), RF-144 |

## Intake corrections

These came from comparing the audit with the owner's walkthrough notes and with the code.

1. The Preferences claim cites D21; the source is `HISTORY.md`.
2. Account headings: two of three sections have h3s. The "no landmarks" half holds.
3. "Run without music is first-class" is D24, not D22.
4. Music does name the expired state in its caution notice; the audit's "same state, different
   names" and the walkthrough's "Music never names the state" are both imprecise.
5. "Hides most of her music" is an inference: nobody measured the library size. The 200 cap also
   applies to Spotify saved tracks and SoundCloud likes, and to "Create class from liked songs".
6. The builder's run gate is wider than empty blocks: songs outside any block and blocks over their
   planned time also disable Run live.
7. The Classes list agrees with the builder (both use `planNextStep`); the split is Classes and
   builder versus the Live queue and preflight.
8. The walkthrough's narrowing of finding 6 was dropped from the audit: the builder already has
   in-list preview, so the gap is the Music page only.

## Owner decisions

All six are held in RF-131. Briefs:

1. **Run rule.** Today the builder blocks for any song outside a block, any empty block and any
   block over its planned time, plus the duration gate; the Classes row agrees. The Live queue and
   its header count check duration only and never load plan blocks. Preflight's Start needs every
   track playable and browser authorization; Run without music is always enabled. Options: (a) plan
   gaps block everywhere (the queue fetches plan blocks per card; preflight adds the check; iOS Live
   must match); (b) plan gaps are guidance only (drop `!planLead` from the builder gate; smallest
   change); (c) empty blocks block Start with music only, Run without music stays open (preflight
   gains a plan check). Over-time blocks need their own answer under any option.
2. **Readiness vocabulary.** Today "Music ready" means "every track has a provider link", "ready for
   Live" means "durations set", "Authorized" means "stored connection with scope". Options: (a) keep
   four dimensions, rename each by what it checks (copy only); (b) collapse to "Can run" and "Can
   play music", which runs the connection check before the queue renders (more requests). The design
   canon wording changes either way, so iOS strings follow.
3. **Tempo.** (a) Provision GetSongBPM: the adapter exists; it needs the owner to set
   `GETSONGBPM_API_KEY` and a terms and quota check. (b) Stop flagging missing BPM on the Classes
   list and keep it in the builder panel. (b) now and (a) later is compatible.
4. **HIIT on the Classes home cards.** RF-37 shipped two cards; the dialog and D21 have three. Adding
   HIIT is one array entry plus a layout check on the two-column grid. Keeping two needs a note on
   RF-37 saying why.
5. **Account Preferences.** None exist and D21 promises none. Cutting costs one sentence in D21 naming
   the three Account sections. Keeping it needs a new record defining which preferences exist.
6. **Spotify while the allowlist is unresolved.** (a) Hide Spotify library and playback for accounts
   not on the allowlist, which needs a reliable signal from the API. (b) Keep it visible and name the
   real cause, surfacing the #606 error. Test against the real 403 first.

## Docs-only items

- **DOC-1:** `ritmofit-design-system.md` §9.8 says Spotify and Apple Music are catalog-only. That
  is stale against D21, D24 and `providerCapabilityTruth`. Record: RF-144.
- **DOC-2:** after decision 5, name the Account sections in D21. `HISTORY.md` stays as written.
  Record: RF-144.
- **DOC-3:** code comments that call duration the only run gate (`Dashboard.tsx`, `readiness.ts`,
  `live-readiness.ts`, `ClassReadinessSummary.tsx`) are updated with the run-rule change. Record:
  RF-133.
- **DOC-4:** the audit's "docs to add" list already exists in the repository; nothing to do.

## Records filed

| Record | Outcome | Priority | Surface |
| --- | --- | --- | --- |
| RF-131 | Owner decisions from the audit | P0 | — |
| RF-132 | Music shows the whole library and search reaches it | P0 | Both (API contract) |
| RF-133 | Builder, Live queue and preflight apply one run rule | P0 | Both (Live gate) |
| RF-134 | Status labels say only what they checked, in one vocabulary | P1 | Web; iOS for canon wording |
| RF-135 | Copper only for identity and the one primary action | P1 | Web |
| RF-136 | Preflight groups failures, names the provider, puts the fix beside them | P1 | Web |
| RF-137 | Music reopens on the last provider and view | P1 | Web |
| RF-138 | Music page track preview, select and add | P1 | Web |
| RF-139 | Sign-in and sign-up have their own URLs | P1 | Web |
| RF-140 | Account Security controls | P1 | Both (auth API) |
| RF-141 | Plain words and D17 effort words on instructor surfaces | P2 | Web |
| RF-142 | Repeated elements removed; small accessibility gaps fixed | P2 | Web |
| RF-143 | Sign-in brand panel within the type scale and quiet | P2 | Web |
| RF-144 | Design brief §9.8 and D21 Account sections match the product | P3 | Docs |
