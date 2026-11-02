# Ritmo Studio Web — Status / Deploy History

The dated build, deploy, and verification log (PRs, Worker version ids, migration steps, per-slice
detail). Current focus and `main` vs production live in the "Now" block of
[`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md); in-flight session state lives in
[`handoffs/`](./handoffs/README.md). This file is not live-state authority — verify production with
[`deployment-runbook.md`](./deployment-runbook.md).

> Append-only. Newest entries first within each section. The two sections below are named for the
> docs they were split out of; new entries go at the top of the first section.

---

## Deploy and session log (newest first)
> **Session 2026-11-01 — Air close (no deploy).** Merged with owner permission per PR:
> [#693](https://github.com/steven-crosby/ritmofit-web/pull/693) as `9d50cfb` and
> [#694](https://github.com/steven-crosby/ritmofit-web/pull/694) as `d4ef72f` (RF-169: the Neo holds
> no Cloudflare credentials, signed-in production checks mean the RitmoFit app, a message is not a
> claim). From the Neo, owner permission in the Neo session:
> [#695](https://github.com/steven-crosby/ritmofit-web/pull/695) as `ebd7aa0` (RF-157 rescoped to
> three checks, no longer waiting on RF-92). Earlier since the last entry: #690 `d06d6ec`, #691
> `dbd72e2` and #692 `48b774b` (RF-151 records). ritmofit-ios: #55 `100094f`, #56 `e8f8bba` and
> #57 `2c56fba` (RF-1021 to RF-1023 records); RF-1021's #58 was still in review at this close.
> This close also writes the owner's 2026-11-01 conductor rulings into AGENTS.md (who finishes a PR,
> iOS on the Neo, no rollback on the Neo); relayed owner approval went to its own PR. With the
> owner's yes, the Air removed its empty `lanes/web-a` and `lanes/web-b` folders and other stale local worktrees. Production unchanged at
> `67496ab`: every merge since is records and docs only (checked from git, not wrangler).
> Correction to the 2026-10-31 addendum below: it postdates the deploy entry under it, the Air
> merges entry it points at is two entries down, and #689 also rewrote the Now block and carried the
> RF-172, RF-138 and RF-169 follow-ups.

> **Session 2026-10-31 — addendum to the Air merges entry below.** Also merged that day:
> ritmofit-ios #53 as `fc0166e` (RF-1014: tests report skipped without a local backend), and, with
> owner permission given in the Air session, the Neo's #688 as `1b4e5cf` (RF-151 desktop production
> observation, on Spotify likes) and the Air's #689 as `4f83f03` (the `67496ab` deploy record).

> **Deploy 2026-10-31 — RF-166, RF-134 and RF-151 on main `67496ab`** (from the Air, owner "yes
> deploy"). Remote D1: none to apply. New Worker `feac7dde-dc10-4462-bd2d-79075d289bda`; rollback
> `e50f1fd3-bdd1-4541-bc3f-4c2cd483a167` (`a1b971d`). SPA `assets/index-ChxMwIpX.js` (was
> `assets/index-DCUUNJcv.js`). Gates passed; propagation 3/3; status smoke and all six security
> headers passed; a tail of about 15 minutes saw 55 events, 0 exceptions and 0 5xx. Not done: the
> authed smoke, skipped because the QA session is expired (RF-155), and the owner's Mac and iPhone
> smoke test of RF-151 (For review) and RF-134's live labels.

> **Session 2026-10-31 — Air conductor merges.** All with owner permission per PR:
> [#684](https://github.com/steven-crosby/ritmofit-web/pull/684) as `909182e` (RF-151 pick-mode
> spec, RF-172 created, RF-138 narrowed, RF-170 created),
> [#681](https://github.com/steven-crosby/ritmofit-web/pull/681) as `9bc9a09` (RF-169: AGENTS.md
> two-machine conductors, owner-gated) and
> [#687](https://github.com/steven-crosby/ritmofit-web/pull/687) as `e4d27f2` (RF-172 and RF-138
> spec fixes). ritmofit-ios #54 merged as `e3b45db` (AGENTS.md pointer to the two-machine rules).
> From the Neo: #683 as `411bdba` (RF-134), #685 as `b1468ec` (docs) and #686 as `67496ab` (RF-151).

> **Session 2026-10-31 (Neo) — second round merged; Spotify likes observed.** With owner permission
> per PR: [#679](https://github.com/steven-crosby/ritmofit-web/pull/679) as `62c3cee` (RF-144: design brief §9.8 provider capabilities, D21 Account
> sections), [#680](https://github.com/steven-crosby/ritmofit-web/pull/680) as `a1b971d` (RF-133: one run rule, plan gaps are guidance; follow-ups
> RF-171) and [#682](https://github.com/steven-crosby/ritmofit-web/pull/682) as `c0b60d4` (RF-166: the Classes list stops flagging missing tempo).
> From the Air: [#678](https://github.com/steven-crosby/ritmofit-web/pull/678) as `dbcb514` (RF-165: HIIT template card). Read-only check of the
> `a1b971d` deploy in the owner's signed-in browser passed: HIIT card; one copper primary on Classes
> and in the Live queue; a scaffold with seven empty blocks keeps Run live enabled and is in the
> queue; Music reopens on Apple Music › Songs after leaving and after a reload. The open tab needed the
> app's "Reload now" prompt to leave the old service-worker shell. Also observed: Music › Songs lists
> the owner's Spotify liked songs with no allowlist error (RF-92). Writes from the check: one
> last-opened stamp on a QA class and the Music view in local storage. `main` is ahead by RF-166.

> **Deploy 2026-10-31 — RF-137, RF-135, RF-165 and RF-133 on main `a1b971d`** (from the Air, owner
> "Yes deploy"). Remote D1: none to apply. New Worker `e50f1fd3-bdd1-4541-bc3f-4c2cd483a167`; rollback
> `61cdeb33-e106-4224-90ad-18ad0cb3173f` (`0a77110`). SPA `assets/index-DCUUNJcv.js` (was
> `assets/index-DTaSHnmL.js`). Gates passed; propagation 3/3; status smoke and all six security
> headers passed; the five-minute tail saw 0 events. Not done: the authed smoke, skipped because the
> QA session is expired (RF-155). The Neo's read-only browser check is in the session entry above.

> **Session 2026-10-31 — Air conductor merges (no deploy), relayed to the Neo close.** All with
> owner permission. [#670](https://github.com/steven-crosby/ritmofit-web/pull/670) merged as `eaec1d3` (RF-156 record, For review). ritmofit-ios
> [#52](https://github.com/steven-crosby/ritmofit-ios/pull/52) merged as `2cc92e2` (web-contract snapshots refreshed from web `0a77110`; iOS
> Cross-repository parity passed on `2cc92e2`; the `iOS CI` run on that commit failed, consistent with
> the Air simulator issue below). [#674](https://github.com/steven-crosby/ritmofit-web/pull/674) merged as `01a28d6` (RF-156 Done; new
> Backlog RF-162, owner-gated: OpenAPI describes the provider routes' 429s, the empty likes cursor
> and long `q` as the server behaves). [#677](https://github.com/steven-crosby/ritmofit-web/pull/677) merged as `9fa76d2` (RF-131 answered and Done:
> run rule (b), plan gaps are guidance and over-time blocks a warning; readiness labels (a), four
> renamed dimensions; tempo (b), no BPM flag on the Classes list, GetSongBPM deferred; HIIT card (a);
> Account Preferences (a), cut; Spotify (b), keep it visible and name the real cause). New Backlog
> RF-165 (HIIT card), RF-166 (Classes BPM flag), RF-167 (Spotify allowlist message, owner-gated,
> depends on RF-92) and RF-168 (owner decision on Live's "No BPM set"); RF-133, RF-134 (now depends on
> RF-166) and RF-144 are unblocked but still need the owner's Ready. iOS #53 (RF-1014) is a Blocked
> draft until the Air's simulator component is updated. Production unchanged at `0a77110`.

> **Session 2026-10-31 — Neo lanes N1 and N2 merged (no deploy).** Owner Ready set 2026-10-31
> ("Yes, approve both"), relayed from the Air conductor. [#671](https://github.com/steven-crosby/ritmofit-web/pull/671) merged as `efcf1f9`
> (records catch-up; RF-160 and RF-161 filed). [#672](https://github.com/steven-crosby/ritmofit-web/pull/672) merged as `579d7a9` (RF-137: Music
> reopens on the last service and shelf; its final review found one bug, fixed in the PR; follow-ups
> RF-164). [#673](https://github.com/steven-crosby/ritmofit-web/pull/673) merged as `9d9b5b4` (RF-135: caution status dots, one copper Live queue
> action, landing CTAs kept; follow-ups RF-163). An RF-162 ID collision with the Air's #674 was
> resolved by renumbering this session's record to RF-164. `main` is ahead of production; no deploy
> or migration. Not checked in a real browser beyond the e2e smoke.

> **Deploy 2026-10-31 — RF-108 queue wait on main `0a77110`.** Deployed `origin/main` `0a77110`
> ([#669](https://github.com/steven-crosby/ritmofit-web/pull/669), RF-108). Remote D1: none to apply. New Worker
> `61cdeb33-e106-4224-90ad-18ad0cb3173f`; rollback `ffcf858d-78b7-4bc6-8a7b-e4197f28f6e2`
> (`97f4454`). SPA `assets/index-DTaSHnmL.js` (was `assets/index-CvzdWsbA.js`). Smoke checks and
> security headers passed; the tail saw no traffic. Not done: the authed smoke, skipped because the
> QA session is expired (RF-155). A later start-session on 2026-10-31 saw the same SPA entry on
> three cache-busted fetches. Owed: the owner's iPhone Safari device check (RF-108).

> **Merge 2026-10-31 — [#669](https://github.com/steven-crosby/ritmofit-web/pull/669) as `0a77110` (RF-108 queue wait).** Removes the
> double start at its source (one timeline tap starts one adapter); a new Apple start waits for a
> previous queue, bounded 2 s, instead of failing; a pending play is superseded, not waited on;
> first playing state counts as started, with a 5 s `play()` cap. Two final reviews: the first found
> five significant bugs, fixed in `f1fdcfd`, and the owner raised the cap from 3 s to 5 s; the second
> found nothing blocking and its items are RF-161. Mock MusicKit only; not audible playback.

> **Owner iPhone timing run 2026-10-31 on `97f4454`** (`?playback-timing=1`, relayed by the
> conductor). Every timeline jump showed "still finishing a previous queue" with Retry. Cause: one
> tap started two track loads about 60 ms apart, and a cancelled `setQueue` ran on for 129–1,125 ms.
> `setQueue` took 27–247 ms; audio started 0.5–1.2 s after `play()`, and `play()` resolved after
> 1.7–2.6 s. Start itself worked; Next and auto-advance were not measured. These numbers shaped #669
> (RF-108 evidence).

> **Deploy 2026-10-31 — RF-128 timing log and RF-147 on main `97f4454`.** Deployed `origin/main`
> `97f4454` ([#668](https://github.com/steven-crosby/ritmofit-web/pull/668)). Remote D1: none to apply. New Worker
> `ffcf858d-78b7-4bc6-8a7b-e4197f28f6e2`; rollback `765c9424-6007-480c-9b52-1e71426f0f18`
> (`d888d28`). SPA `assets/index-CvzdWsbA.js` (was `assets/index-BAVpF1uf.js`). Smoke checks,
> security headers and propagation passed; the five-minute tail saw no traffic. The authed smoke
> returned 401 because the QA session is expired (RF-155).

> **Merge 2026-10-31 — [#668](https://github.com/steven-crosby/ritmofit-web/pull/668) as `97f4454` (RF-128, RF-147).** The RF-128 debug
> timing log (`?playback-timing=1` turns it on, `=0` turns it off) and RF-147 criteria 0, 1 and 3.
> Playback is unchanged: after its fourth final review the owner chose "measure first", and the lock work
> is preserved on `wip/rf-108-apple-locks` (`85442ac`). The last review's items 1–2 are RF-160;
> items 3–8 are RF-128 evidence.

> **Session 2026-10-30 — round r20261029a close and device results (docs only).** Two web lanes ran
> under one orchestrator, partitioned by file: Lane A owned `apple-music-adapter.ts` and its test
> (RF-123); Lane B owned `packages/music/`, `apps/api/src/lib/music/`, `routes/providers.ts`, the
> likes OpenAPI entries, the Music workspace and the likes client in `apps/web/src/lib/api.ts`
> (RF-132), as the round's only editor of
> `providers.ts` and `openapi.json`. [#664](https://github.com/steven-crosby/ritmofit-web/pull/664)
> merged as `a1fafa9` (RF-123: release the Apple queue lock when `setQueue` times out). #656 was
> closed unmerged as superseded, and its resume-in-place change did not ship.
> [#665](https://github.com/steven-crosby/ritmofit-web/pull/665) merged as `d888d28` after four final
> reviews (RF-132: Load more and whole-library search for Apple Music and SoundCloud; "Library
> order"; Spotify verification in RF-148, TrackSearch in RF-149). Owner device checks on production,
> 2026-10-30. Mac Chrome: Apple Music Load more went past 200 (about 5 s per batch, RF-150); search
> found Garden Grove; the sort reads "Library order"; SoundCloud, after a reconnect, showed its 2
> likes and no Load more (paging past 200 untested, RF-154); "Create class from liked songs" said
> "Using your first 200 liked songs" and built a 15-song Cycle class, which is left in the owner's
> account. The owner asked for song selection in the Songs list itself (RF-151). iPhone Safari:
> Start, Pause, Next and Previous worked; quick timeline jumps showed "Playback stopped" until Retry
> playback, with no reload (RF-108). Review items logged on #664 and #665 are now RF-147, RF-108 and
> RF-152–RF-154, and the skipped authed smoke is RF-155. Correction to the 2026-10-29 session entry for #662 further down: four of #662's seven review items were folded then,
> not all; #663's review logged the rest, and this close resolves them (Phases markers removed, RF-108
> and RF-123 wording, the partition above). No code, deploy or migration.

> **Deploy 2026-10-30 — RF-123 and RF-132 on main `d888d28`.** `scripts/deploy.sh` from a clean
> detached worktree at `origin/main` `d888d28`
> ([#664](https://github.com/steven-crosby/ritmofit-web/pull/664), RF-123;
> [#665](https://github.com/steven-crosby/ritmofit-web/pull/665), RF-132). Remote D1: none to apply.
> New Worker `765c9424-6007-480c-9b52-1e71426f0f18`; rollback
> `2a302ce6-7665-47d2-8f79-68d6822450b1` (`d81c0fc`). SPA `assets/index-BAVpF1uf.js` (was
> `assets/index-Cqjj6m_w.js`); three cache-busted fetches agree. `/` and `/api/v1/health` 200;
> `/classes`, `/explore`, `/teams` and the likes route 401 signed out; security
> headers present. Not done: the five-minute tail watch and the authed smoke (QA token still
> expired; renewing it is RF-155). The owner's device results are in the session entry above.

> **Session 2026-10-29 (second close) — Lanes A/B set up (docs only).** The owner moved RF-123 and
> RF-132 to Ready as Lane A and Lane B for the next session
> ([#662](https://github.com/steven-crosby/ritmofit-web/pull/662), merged `3592c82`). The owner then
> narrowed Lane A to the RF-123 queue-lock fix: #656's `runtime.ts` resume-in-place change is reverted
> at its rebase, since #657 fixed RF-124 another way and the owner verified Pause/Resume on iPhone.
> RF-132 leaves its Ready criteria unchanged; its PR asks the owner whether it closes on Apple and
> SoundCloud with a Spotify follow-up (RF-92 `403`). Review items logged on #662 were folded into
> this close (Now block, RF-108 wording, RF-123 evidence, RF-132 lane note); the RF-132 closing ruling
> stays an owner call in its work PR. No code, deploy or migration.

> **Deploy 2026-10-29 — RF-124 on main `d81c0fc`.** `scripts/deploy.sh` from a clean detached
> worktree at `origin/main` `d81c0fc` ([#657](https://github.com/steven-crosby/ritmofit-web/pull/657),
> RF-124: stop forcing modern FairPlay so iPhone Safari plays every song, plus RF-129/RF-130 records).
> Everything else after `04e695f` is docs. Remote D1: none to apply. New Worker
> `2a302ce6-7665-47d2-8f79-68d6822450b1`; rollback `b41b99f9-8b93-4947-915c-ca18bd42d2d2` (`04e695f`).
> SPA `assets/index-Cqjj6m_w.js` (was `assets/index-BTdVQWvK.js`); propagation 3/3 after 4 tries. `/`
> and `/api/v1/health` 200, `/classes`, `/explore`, `/teams` 401, security headers present. Not done:
> the five-minute tail watch (`wrangler tail` from this shell captured no events, not even three
> deliberate health requests that returned 200, so a quiet tail proves nothing) and the authed smoke
> (QA token still expired). Owner iPhone Safari Live on this build, same day: Start, Next to songs 2
> and 3, Previous, Pause/Resume, seek and auto-advance all audible; RF-124 and RF-29 Done.

> **Session 2026-10-29 — UX audit intake and phased plan (docs only).** The owner's 2026-10-28
> production UX audit was copied to `docs/audits/ux-audit-2026-10-28/`, verified against main `c9b89a7`
> and filed as RF-131–RF-144. The owner approved a phased plan, now `DEVELOPMENT_PLAN.md` › Phases.
> Board cleanup: RF-73 cancelled into RF-142; RF-74 grouped under RF-92; RF-145 (SPC-09) and RF-146
> (benchmark gaps) filed. Superseded "Now" text, preserved here: production Worker `b41b99f9` at
> `04e695f` (RF-107, RF-90, RF-122); RF-29 blocked on the owner's iPhone retry after the RF-122 CSP fix;
> RF-125 Wi-Fi authorization stall; D25 and the device matrix (RF-126); RF-80 blocked on recovering
> its plan; RF-90–94 and RF-107–117 audit intake; Spotify reopened 2026-10-28 with Apple first until
> ~2026-11-27. The Codex 2026-10-27 baseline (main `f35d5d5`, Worker `24cdedc9` at `535e61a`, SPA
> parity unverified from that environment) is also retired from "Now".

> **Deploy 2026-10-28 (second) — #652 on main `04e695f`.** `scripts/deploy.sh` from a clean
> detached worktree at `origin/main` `04e695f`
> ([#652](https://github.com/steven-crosby/ritmofit-web/pull/652), RF-122: page CSP `media-src` adds
> `https://*.itunes.apple.com` so iPhone Safari can load Apple's HLS audio). Remote D1: none to apply.
> New Worker `b41b99f9-8b93-4947-915c-ca18bd42d2d2`; rollback `d092af3c-114f-416f-bbe5-cb112cb52306`.
> SPA entry unchanged at `assets/index-BTdVQWvK.js` (headers-only change); propagation 3/3. `/` and
> `/api/v1/health` 200, `/classes`, `/explore`, `/teams` 401, security headers present; a cache-busted
> fetch of `/` served `media-src 'self' blob: https://*.itunes.apple.com`. Skipped: the five-minute tail
> watch, and the authed smoke (the QA session token in `apps/api/.qa-beta-token` has expired; both
> calls returned 401). The iPhone retry is RF-29.
>
> **Deploy 2026-10-28 — RF-107 and RF-90 on main `b6af93e`.** `scripts/deploy.sh` from a clean detached
> worktree at `origin/main` `b6af93e`, which carries
> [#649](https://github.com/steven-crosby/ritmofit-web/pull/649) (`9166826`, RF-107 FairPlay probe) and
> [#650](https://github.com/steven-crosby/ritmofit-web/pull/650) (`492e181`, RF-90 Builder stored times).
> Remote D1: none to apply. New Worker `d092af3c-114f-416f-bbe5-cb112cb52306` (created
> 2026-10-29T00:16:11Z); rollback `24cdedc9-8103-417c-a502-23b0846c0967` (`535e61a`). SPA
> `assets/index-BTdVQWvK.js` (was `assets/index-CClNobxY.js`); propagation 3/3. Status smoke and
> security headers passed. Authed smoke failed with 401 on both calls (expired QA token), not a
> deploy fault. The first tail attempt did not run (no `timeout` on macOS); a verified five-minute
> tail afterwards saw no events, no exceptions and no 5xx. Owner iPhone Safari retry on this build:
> `modern-access: ok`, no audio; Web Inspector then showed the CSP `media-src` refusal fixed by RF-122.

> **Deploy 2026-10-27 — #637 and #636 on main `535e61a`.** Production deploy at
> 2026-10-27T20:06:15Z (2:06 PM MT) through
> `scripts/deploy.sh 535e61aa9e940ca357f7d4d71ac5c65cdf3adf80` from a clean
> detached worktree. `origin/main` was that commit: [#637](https://github.com/steven-crosby/ritmofit-web/pull/637)
> (`2bd73e0`, better-auth 1.6.25 → 1.7.14) and
> [#636](https://github.com/steven-crosby/ritmofit-web/pull/636)
> (`535e61a`, FairPlay probe on iOS Safari without `WebKitMediaKeys`). The
> main checkout had an untracked `.claude/` directory and was left untouched.
> No migration file is in `bf31706..535e61a`. The auth-schema edit is a version
> comment. The script reported none to apply. None was applied. No production
> data was edited.
>
> New Worker `24cdedc9-8103-417c-a502-23b0846c0967` (message `535e61a`);
> rollback `df90f169-a51d-4476-bb9a-d4fbf6ab3663` (`bf31706`). SPA
> `assets/index-CClNobxY.js` (was `assets/index-DvFKqouw.js`); CSS
> `assets/index-DGcMUSRx.css` unchanged. Propagation 3/3 on the first three
> cache-busted fetches, and three later cache-busted fetches agreed.
> `/` 200, `/api/v1/health` 200 with `database: true` and the six security
> headers; `/classes`, `/explore`, `/teams` 401. `wrangler deployments status`
> shows this Worker at 100%. Tail for five minutes: four events, all outcome
> ok, no exceptions and no 5xx (health 200, classes 401, explore 401, teams
> 401), all on this Worker. #636 is now in production and still awaits
> Steven's iPhone Apple Music check. This docs record is not in the deployed
> tree.

> **Deploy 2026-10-27 — #634 on main `bf31706`.** Steven approved at 9:50 AM MT,
> after the squash was on `origin/main`. Production deploy at
> 2026-10-27T16:00:38Z (10:00 AM MT) through
> `scripts/deploy.sh bf31706c64662a3c7e5306359c237b60cbed61c9` from a clean
> detached worktree. The main checkout had an untracked `.claude/` directory
> and was left untouched. Against the previous production tree `65d4deb`, the
> runtime diff is [#634](https://github.com/steven-crosby/ritmofit-web/pull/634)
> (`bf31706`): `musickit.ts`, `apple-music-adapter.ts`, and their tests.
> Docs commits in `bf31706` that do not change runtime are
> [#632](https://github.com/steven-crosby/ritmofit-web/pull/632) (`e470a84`) and
> [#633](https://github.com/steven-crosby/ritmofit-web/pull/633) (`91a1e7f`, the
> 4e0b150 code audit).
> No migration file is in `65d4deb..bf31706`. The script reported none to
> apply. None was applied. No production data was edited.
>
> New Worker `df90f169-a51d-4476-bb9a-d4fbf6ab3663` (message `bf31706`);
> rollback `94e7003b-af7f-4d56-84e1-3288f0c3a813` (`65d4deb`). SPA
> `assets/index-DvFKqouw.js` (was `assets/index-B1FRgRjm.js`); CSS
> `assets/index-DGcMUSRx.css` unchanged. Propagation 3/3 on the first three
> cache-busted fetches, and three later cache-busted fetches agreed.
> `/` 200, `/api/v1/health` 200 with `database: true` and the six security
> headers; `/classes`, `/explore`, `/teams` 401. `wrangler deployments status`
> shows this Worker at 100%. Tail across two connects (3m54s, then 80s): four
> events, all outcome ok, no exceptions and no 5xx (health 200, classes 401,
> explore 401, teams 401), all on this Worker. #634 is now in production and
> still awaits Steven's iPhone Apple Music check. This docs record is not in
> the deployed tree.

> **Deploy 2026-10-27 — #629 on main `65d4deb`.** Steven said go at 8:06 AM MT.
> Production deploy at 2026-10-27T14:11:12Z (8:11 AM MT) through
> `scripts/deploy.sh 65d4deb4aba90f26c6706a099351709680d11aee` from a clean
> detached worktree. Since `4e0b150`, `origin/main` adds only the #631 docs
> (`HISTORY.md`, `DEVELOPMENT_PLAN.md`, and
> `handoffs/2026-10-27-staged-deploy.md`). Against production tree `04ec72f`,
> the code diff is exactly [#629](https://github.com/steven-crosby/ritmofit-web/pull/629)
> (`7ab9bbb`): `LiveMode.tsx`, `LiveMode.test.tsx`, and
> `apple-music-adapter.ts` plus its test. No migration. The script reported
> none to apply. None was applied. No production data was edited.
>
> New Worker `94e7003b-af7f-4d56-84e1-3288f0c3a813` (message `65d4deb`);
> rollback `05a49728-aa41-4113-ab52-948a62a091cc` (`04ec72f`). SPA
> `assets/index-B1FRgRjm.js` (was `assets/index-1IADUpWL.js`); CSS
> `assets/index-DGcMUSRx.css` unchanged. Propagation 3/3 on the first three
> cache-busted fetches. `/` 200, `/api/v1/health` 200 with `database: true`
> and the six security headers; `/classes`, `/explore`, `/teams` 401.
> `wrangler deployments status` shows this Worker at 100%. Tail for five
> minutes: five events, all outcome ok, no exceptions and no 5xx (health 200
> twice, classes 401 once, `GET /api/auth/get-session` 200 twice), all on
> this Worker. #629 is now in production and still awaits Steven's iPhone
> Apple Music check. This docs record is not in the deployed tree.

> **Staged deploy 2026-10-27 — main `4e0b150` minus #629.** Owner approved
> Option B. Three production publishes through `scripts/deploy.sh` from local
> branch `cursor/staged-deploy-4e0b150-2f76`. That branch was not pushed and
> has no pull request. No migration file is in `c07bba3..4e0b150`. Each
> script reported no remote D1 migrations to apply. None was applied. No
> production data was edited. Node 22.23.4.
>
> **Stage 1** at 2026-10-27T13:24:57Z (7:24 AM MT). Tree `361c935`
> (`4e0b150` with #629, #621, and #617 reverted). #629 and #621 reverted
> cleanly. #617 (`17a91a9`) conflicted in `Dashboard.tsx` and
> `Dashboard.test.tsx`. The hand resolution removes only #617: the two
> `setLiveActive` effects go, and #619's `const online = useOnline()` stays.
> The session-lost test is deleted. The #619 class-details and Offline tests
> and the #622 crash test stay. The `readyRidePayload` helper stays; #622
> inserted its test after that helper and does not own it. Before deploy,
> the local gate passed: format, typecheck, lint, unit web 1460 / api 557 /
> music 30, Worker/D1 integration 235, web build with the bundle budget, and
> `pnpm e2e` (2 passed). Worker `751ea170-9482-440d-b002-47ac9affadda`
> (message `361c935`); rollback `60dcbb9d-0310-4c86-939b-3201c36498ae`
> (`c07bba3`). SPA `assets/index-qpATHuVY.js`, CSS
> `assets/index-BwpPxh8O.css`. Propagation 3/3 after one previous-entry
> fetch. `/` 200, `/api/v1/health` 200 with `database: true` and the six
> security headers; `/classes`, `/explore`, `/teams` 401. Tail: health 200
> and classes 401, both on this Worker, no exceptions and no 5xx.
>
> **Stage 2** at 2026-10-27T13:37:49Z (7:37 AM MT). Reapplied #617. `git diff`
> against `b9e4b8e` was empty, so the tree is `4e0b150` with only #621 and
> #629 reverted. Commit `810d26c`. Worker
> `f2526ab0-d65e-462d-9d74-d4154df039d0` (message `810d26c`); rollback
> `751ea170-9482-440d-b002-47ac9affadda`. SPA `assets/index-Cy9zvPdd.js`,
> CSS `assets/index-DGcMUSRx.css`. Propagation 3/3 on the first three
> fetches. Same smoke: `/` and health 200 (`database: true`, six headers);
> classes, explore, and teams 401. Tail: health 200 and classes 401 on this
> Worker, no exceptions and no 5xx.
>
> **Stage 3** at 2026-10-27T13:46:28Z (7:46 AM MT). Reapplied #621. `git diff`
> against `121f5ba` was empty, so the tree is `4e0b150` minus #629. Commit
> `04ec72f`. Worker `05a49728-aa41-4113-ab52-948a62a091cc` (message
> `04ec72f`); rollback `f2526ab0-d65e-462d-9d74-d4154df039d0`. SPA
> `assets/index-1IADUpWL.js`, CSS `assets/index-DGcMUSRx.css` unchanged.
> Propagation 3/3 after two fetches of the stage-2 entry. Same smoke. Tail:
> health 200 and classes 401 on this Worker, no exceptions and no 5xx.
>
> [#629](https://github.com/steven-crosby/ritmofit-web/pull/629) (name Apple
> Music failures mid-class and mark Offline in Live, `7ab9bbb`) is on `main`
> and is not in production. It stays held for Steven's iPhone Apple Music
> check. This docs record is not in the deployed tree.

> **Deploy 2026-10-26 — #604–#613 on main `c07bba3`.** Owner approved.
> Production deploy at 2026-10-27T04:59:26Z (10:59 PM MT 2026-10-26) through
> `scripts/deploy.sh c07bba3cc41f720b5e7cf485b640cb443f54f5c0` from a clean
> detached worktree (the main checkout had an untracked `.claude/` directory,
> so it was left untouched). The script built and deployed from its own
> `/tmp/ritmofit-deploy.00lWlF` worktree. New Worker
> `60dcbb9d-0310-4c86-939b-3201c36498ae` (message `c07bba3`); previous/rollback
> `e7104e5d-bede-4871-82fb-f69eb8a0db20` (`cbb8496`). SPA entry
> `assets/index-68HtGOrR.js` (was `assets/index-dMUWppKG.js`); CSS
> `assets/index-DfzOPjzL.css` (was `assets/index-BI9aa-sY.css`). Three
> consecutive cache-busted fetches matched the build on the first three tries,
> and `wrangler deployments status` shows the new Worker at 100%. Script gates
> passed on Node 22.23.4 (matches `.nvmrc`): `--self-check`, required-secret
> names present, no remote D1 migrations pending, unit web 1437 / api 557 /
> music 30, Worker/D1 integration 235, web build, OpenAPI no drift,
> contract-parity (four allowlisted iOS cue-field lags, no untracked drift),
> audit (2 ignored). No migration was applied. The range adds no migration
> file. One preflight `wrangler d1 migrations list` returned Cloudflare 7403;
> the retry and the deploy script both reported nothing to apply. No production
> data was edited.
>
> Runtime since production `cbb8496`:
> [#604](https://github.com/steven-crosby/ritmofit-web/pull/604) (modern FairPlay
> for Safari Apple Music, `9fb1091`; web),
> [#605](https://github.com/steven-crosby/ritmofit-web/pull/605) (obvious compact
> Live queue, `e84aab7`; web),
> [#606](https://github.com/steven-crosby/ritmofit-web/pull/606) (name the Spotify
> development-mode allowlist and start reconnect; OpenAPI gains a 403
> description on the existing Spotify routes, `c52cad4`),
> [#607](https://github.com/steven-crosby/ritmofit-web/pull/607) (open the class
> builder after a Music playlist create, `d35c5cc`; web),
> [#608](https://github.com/steven-crosby/ritmofit-web/pull/608) (delete a class
> from its row, `18557ed`; web, plus a class-delete integration test),
> [#609](https://github.com/steven-crosby/ritmofit-web/pull/609) (quieter Music
> connection area, `2d51112`; web),
> [#610](https://github.com/steven-crosby/ritmofit-web/pull/610) (keep the update
> toast up when the app shell crashes, `f4d23f5`; web),
> [#611](https://github.com/steven-crosby/ritmofit-web/pull/611) (show the next
> track's first cue after a track's last cue, `d787491`; web),
> [#612](https://github.com/steven-crosby/ritmofit-web/pull/612) (wrap long Live
> titles and notes so the phone shell cannot scroll sideways, `ccb3460`; web),
> and [#613](https://github.com/steven-crosby/ritmofit-web/pull/613) (phone
> Cue-by-Cue first-screen test, `c07bba3`; tests only).
>
> Smoke (script): propagation 3/3 on the built entry; `/` 200, `/api/v1/health`
> 200 with all six security headers; `/classes`, `/explore`, `/teams` 401.
> Health body: `status: ok`, `database: true`, every required secret `true`
> (`APPLE_CLIENT_SECRET` `false` as expected — the signing trio is set).
> Mounted routes reach handlers: `GET /shares`, `GET /shares/x`,
> `GET /providers/spotify/search`, `POST /providers/track-import`, and
> `GET /classes/<uuid>/shares`, `POST .../import-playlist`,
> `POST .../tracks/import`, `GET .../cover`, `POST .../tags` 401;
> `GET /classes/not-a-uuid/tracks` 404 `application/json`. Landing HTML is 200
> and serves `assets/index-68HtGOrR.js` plus `assets/index-DfzOPjzL.css`.
> Authed smoke failed: `GET /api/v1/classes` and
> `GET /api/v1/providers/spotify/playlists` 401. The QA token file is present
> and was not printed. Classes, the builder, Music, and Live at rest were not
> opened. Tail for five minutes on `ritmofit-api`: 18 events, all outcome ok,
> no exceptions and no 5xx, every event on Worker `60dcbb9d`, all from this
> session's own checks (health 200, the unauthenticated 401s above, the 404,
> and the two authed-smoke 401s).

> **Deploy 2026-10-26 — #598 and #599 on main `7163d71`.** Owner approved.
> Production deploy at 2026-10-27T00:41:51Z (6:41 PM MT 2026-10-26) through
> `scripts/deploy.sh` from a clean detached worktree (the main checkout had an
> untracked `.claude/` directory, so it was left untouched). The script built and
> deployed from its own `/tmp/ritmofit-deploy.qhHsRL` worktree. New Worker
> `4fdba2fc-9292-4b6f-9658-582b3b27777b` (message `7163d71`); previous/rollback
> `45dd784f-23ce-4697-bd33-3ab04f8b458e` (`5daee7a`). SPA entry
> `assets/index-Bz3SPa2S.js` (was `assets/index-SlqjBWky.js`); CSS
> `assets/index-BypEbwc1.css`. Three consecutive cache-busted fetches matched the
> build on the first three tries, and `wrangler deployments status` shows the new
> Worker at 100%. Script gates passed on Node 22.23.4 (matches `.nvmrc`):
> required-secret names present, no remote D1 migrations pending, unit web 1375 /
> api 552 / music 30, Worker/D1 integration 233, web build, OpenAPI no drift,
> contract-parity, audit. No migration was applied.
>
> Runtime since production `5daee7a`:
> [#598](https://github.com/steven-crosby/ritmofit-web/pull/598) (the class
> builder takes the full Classes page, `34ab5c4`; web) and
> [#599](https://github.com/steven-crosby/ritmofit-web/pull/599) (narrow Live,
> Music, and landing polish, `7163d71`; web).
> [#597](https://github.com/steven-crosby/ritmofit-web/pull/597) (https smoke
> sends the `__Secure-` session cookie, `f82c3a0`) is in that tree and does not
> change the served Worker. Docs [#593](https://github.com/steven-crosby/ritmofit-web/pull/593)
> (`3b57f73`), [#595](https://github.com/steven-crosby/ritmofit-web/pull/595)
> (`bc84c3b`), and the ignore cleanup [#594](https://github.com/steven-crosby/ritmofit-web/pull/594)
> (`cd734ee`) do not change runtime.
>
> Smoke (script): propagation 3/3 on the built entry; `/` 200, `/api/v1/health`
> 200 with all six security headers; `/classes`, `/explore`, `/teams` 401.
> Health body: `status: ok`, `database: true`, every required secret `true`
> (`APPLE_CLIENT_SECRET` `false` as expected — the signing trio is set).
> Mounted routes reach handlers: `GET /shares`, `GET /shares/x`,
> `GET /providers/spotify/search`, `POST /providers/track-import`, and
> `GET /classes/<uuid>/shares`, `POST .../import-playlist`,
> `POST .../tracks/import`, `GET .../cover`, `POST .../tags` 401;
> `GET /classes/not-a-uuid/tracks` 404 JSON. Landing page in Chrome at 1280 and
> 390: hero "Find the class inside the music.", Start building opens the email
> field, Back to home returns, no horizontal overflow, no console errors, no
> 5xx, and the page loaded `assets/index-Bz3SPa2S.js` plus
> `assets/index-BypEbwc1.css`. Authed smoke failed: `GET /api/v1/classes` and
> `GET /api/v1/providers/spotify/playlists` 401;
> `GET /api/auth/get-session` 200 with a null body. The QA token file is present
> and was not printed. Classes, the builder, Music, and Live at rest were not
> opened. Tail for five minutes on `ritmofit-api`: five events, all outcome ok,
> no exceptions and no 5xx (`GET /` 200 four times, `GET /api/v1/health` 200
> once), from this session's own checks.

> **Deploy 2026-10-25 — #591 and #592 on main `5daee7a`.** Owner approved.
> Production deploy at 2026-10-26T05:07Z (11:07 PM MT 2026-10-25), the first
> deploy through `scripts/deploy.sh 5daee7a…` (run from a clean detached
> worktree on Steven's MacBook; the script built and deployed from its own
> `/tmp/ritmofit-deploy.*` worktree). New Worker
> `45dd784f-23ce-4697-bd33-3ab04f8b458e` (message `5daee7a`); previous/rollback
> `64bf0d19-fbce-4823-9bd8-e65230bdd2ca` (`6ee1454`). SPA entry
> `assets/index-SlqjBWky.js` unchanged (no web change). Script gates all passed
> on Node 22.23.4 (matches `.nvmrc`; the MacBook default is Node 26, so a
> Node 22 binary was put first on PATH): `--self-check`, required-secret names
> present, no remote D1 migrations pending, unit web 1371 / api 549 / music 30,
> Worker/D1 integration 233, web build, OpenAPI no drift, contract-parity,
> audit. No migration was applied.
>
> Deployed since production `6ee1454`:
> [#591](https://github.com/steven-crosby/ritmofit-web/pull/591) (`/health`
> runs D1 `SELECT 1` and reports required-secret presence as booleans; adds the
> signed-in smoke `scripts/authed-production-smoke.ts`, `fe68689`; API) and
> [#592](https://github.com/steven-crosby/ritmofit-web/pull/592) (guarded
> `scripts/deploy.sh`, `5daee7a`; tooling/docs).
>
> Smoke (script): propagation 3/3 consecutive fetches on the built entry; `/`
> 200, `/api/v1/health` 200 with all six security headers; `/classes`,
> `/explore`, `/teams` 401. Health body: `status: ok`, `database: true`, every
> required secret `true` (`APPLE_CLIENT_SECRET` `false` as expected — the
> signing trio is set). Mounted routes reach handlers: `/shares`,
> `/shares/x`, `/providers/spotify/search`, `/providers/track-import`, and
> `/classes/<uuid>/{shares,import-playlist,tracks/import,cover,tags}` 401;
> non-UUID class ids 404 JSON (#589). Authed smoke **skipped**:
> `apps/api/.qa-beta-token` is not present in the main clone.

> **Deploy 2026-10-25 — #588 and #589 on main `6ee1454`.** Owner approved.
> Production deploy at 2026-10-26T03:24Z (9:24 PM MT 2026-10-25). New Worker
> `64bf0d19-fbce-4823-9bd8-e65230bdd2ca`; previous/rollback
> `9248bbdf-cbd2-4b96-a2eb-ebd25e2a8afe`. SPA entry `assets/index-SlqjBWky.js`
> (was `assets/index-1d_QF5nN.js`); CSS `assets/index-CSpFExJg.css` unchanged.
> Three consecutive cache-busted fetches matched the build, and
> `wrangler deployments status` shows the new Worker at 100%. Built and deployed
> from a clean detached worktree at `6ee1454` on Steven's MacBook. Full gate
> passed on `6ee1454` (format, typecheck, lint, design verify, theme-classes,
> unit tests web 1371 / api 532 / music 30, Worker/D1 integration 232, web build,
> OpenAPI no drift, contract-parity, audit:ci; Node 26). Preflight: no remote D1
> migrations pending and `BETA_ALLOWED_EMAILS` present. No migration was applied.
>
> Deployed since production `5b006ec`:
> [#588](https://github.com/steven-crosby/ritmofit-web/pull/588) (the playlist
> picker shows the 15-song warning only after a refused 16th song; a malformed
> Spotify playlist id gets "Unsupported playlist URL" before the request,
> `80b6f82`; web only) and
> [#589](https://github.com/steven-crosby/ritmofit-web/pull/589) (nested routes
> with a non-UUID class id return a JSON 404 instead of the SPA, `6ee1454`; API).
> Docs [#587](https://github.com/steven-crosby/ritmofit-web/pull/587)
> (`38bb2d8`) is in that tree and does not change runtime. The #586 "Session
> expired" fix was verified in production in a real browser on 2026-10-25.
>
> Smoke: `/` 200, `/api/v1/health` 200 with security headers; unauthenticated
> `/api/v1/classes`, `/explore`, `/teams`, `/shares/x`, `/imports/playlist`, and
> `/providers/spotify/search` 401; `/api/v1/classes/not-a-uuid/tracks` 404
> `application/json` (the #589 fix, live).

> **Deploy 2026-10-25 — #586 and #579 on main `5b006ec`.** Owner approved.
> Production deploy at 2026-10-25T22:57Z (4:57 PM MT 2026-10-25). New Worker
> `9248bbdf-cbd2-4b96-a2eb-ebd25e2a8afe`; previous/rollback
> `594b510a-dca2-4644-b87e-50fd86a83485`. SPA entry `assets/index-1d_QF5nN.js`
> (was `assets/index-DWV4zBSM.js`); CSS `assets/index-CSpFExJg.css` unchanged.
> Three consecutive cache-busted fetches matched the build, and
> `wrangler deployments status` shows the new Worker at 100%. Built and deployed
> from a clean detached worktree at `5b006ec` on Steven's MacBook. Full gate
> passed on `5b006ec` (format, typecheck, lint, design verify, theme-classes,
> unit tests web 1365 / api 532 / music 30, Worker/D1 integration 226, web build,
> OpenAPI no drift, contract-parity, audit:ci; Node 26). GitHub CI green on both
> PR heads. Preflight: no remote D1 migrations pending and `BETA_ALLOWED_EMAILS`
> present. No migration was applied.
>
> Deployed since production `7a8bc71`:
> [#586](https://github.com/steven-crosby/ritmofit-web/pull/586) (after a
> successful Spotify paste import, `TrackSearch` rereads provider connections so
> the panel drops a stale "Session expired" mark, `5e9ec74`; web only) and
> [#579](https://github.com/steven-crosby/ritmofit-web/pull/579) (tests for
> playlist preview deadlines and empty song picks, `5b006ec`; no runtime
> change). Docs [#584](https://github.com/steven-crosby/ritmofit-web/pull/584)
> (`e6db697`) and [#585](https://github.com/steven-crosby/ritmofit-web/pull/585)
> (`29145a9`) are in that tree and do not change runtime.
>
> Smoke: `/` 200, `/api/v1/health` 200 with security headers; unauthenticated
> `/api/v1/classes`, `/explore`, `/teams`, `/providers/spotify/connection`, and
> `POST /api/v1/playlists/import-preview` 401. Real-browser check of the #586
> fix is still owed.

> **Deploy 2026-10-25 — #580 on main `7a8bc71`.** Owner approved; deployed
> immediately as a production-bug fix. Production deploy at 2026-10-25T21:57Z
> (3:57 PM MT 2026-10-25). New Worker `594b510a-dca2-4644-b87e-50fd86a83485`;
> previous/rollback `55ae3b1a-5850-4c28-bed3-ebbdfea0b029`. SPA entry
> `assets/index-DWV4zBSM.js` and CSS `assets/index-CSpFExJg.css` are unchanged
> (API-only fix), confirmed by three consecutive cache-busted fetches that
> matched the build; the Worker version is the deploy proof. Built and deployed
> from a clean detached worktree at `7a8bc71` on Steven's MacBook. The full gate
> passed on the rebased #580 head `0cdcb03`, whose tree is identical to
> `7a8bc71` (`cfea335`), so it was not re-run (format, typecheck, lint, design
> verify, theme-classes, unit tests web 1361 / api 526 / music 30, Worker/D1
> integration 225, web build, OpenAPI no drift, contract-parity, audit:ci; Node
> 24). Preflight: no remote D1 migrations pending and `BETA_ALLOWED_EMAILS`
> present. No migration was applied.
>
> Deployed since production `85204b9`:
> [#580](https://github.com/steven-crosby/ritmofit-web/pull/580) (compact
> plan-block positions after a song-block import, `7a8bc71`). Before the fix, a
> song-block import that kept some recipe blocks left position gaps (for example
> `[2, 3]`), and a later `POST /classes/:id/plan-blocks` returned 500 on the
> `(class_id, position)` unique index. Reproduced against main's unpatched code
> in the Worker/D1 integration suite; not reproduced against production data.
> Docs [#583](https://github.com/steven-crosby/ritmofit-web/pull/583) (`3280f99`)
> is in that tree and does not change runtime.
>
> Smoke: `/` 200, `/api/v1/health` 200 with security headers; unauthenticated
> `/api/v1/classes`, `/explore`, `/teams`, and
> `POST /api/v1/classes/:id/plan-blocks` 401. The fix compacts only on the next
> song-block import (a block reorder also renumbers), so a read-only count ran
> against remote D1 after the deploy: 0 classes had plan-block positions other
> than `0..n-1`, so no data repair is needed.

> **Deploy 2026-10-25 — #582 on main `85204b9`.** Owner approved.
> Production deploy at 2026-10-25T17:46Z (11:46 AM MT 2026-10-25). New Worker
> `55ae3b1a-5850-4c28-bed3-ebbdfea0b029`; previous/rollback
> `2e4ded17-6b40-4168-96b7-a37424aecf60`. SPA entry `assets/index-DWV4zBSM.js`
> (CSS `assets/index-CSpFExJg.css`, was `assets/index-C8maPrOT.css`), confirmed
> by three consecutive cache-busted fetches that matched the build. Previous
> entry `assets/index-ypfiWW-x.js`. API and web shipped together in the single
> Worker deploy. Pre-deploy full gate passed on `85204b9` from a clean detached
> worktree on Steven's MacBook (format, typecheck, lint, design verify,
> theme-classes, unit tests web 1361 / api 526 / music 30, Worker/D1
> integration 224, web build, OpenAPI no drift, contract-parity, audit:ci).
> The local gate ran on Node 26. Preflight ran before the deploy: no remote D1
> migrations pending and `BETA_ALLOWED_EMAILS` present. No migration was applied.
>
> Deployed since production `2b3a79c`:
> [#582](https://github.com/steven-crosby/ritmofit-web/pull/582) (update toast
> reloads onto the new build; paste-a-link placeholder covers every provider,
> `bb7e1cb`). Docs [#581](https://github.com/steven-crosby/ritmofit-web/pull/581)
> (`85204b9`) is in that tree and does not change runtime.
>
> Smoke: `/` 200, `/api/v1/health` 200 with security headers; unauthenticated
> `/api/v1/classes`, `/explore`, and `/teams` 401; unauthenticated
> `POST /api/v1/classes/:id/import-playlist` and `GET /classes/:id/shares` 401.
> Real-browser check of the update toast (needs a real service-worker update
> cycle) and playlist import is still owed.

> **Deploy 2026-10-25 — #577 and #578 on main `2b3a79c`.** Owner approved.
> Production deploy at 2026-10-25T15:29Z (9:29 AM MT 2026-10-25). New Worker
> `2e4ded17-6b40-4168-96b7-a37424aecf60`; previous/rollback
> `a3c6bc65-662d-4f2a-9149-c107171e8092`. SPA entry `assets/index-ypfiWW-x.js`
> (CSS `assets/index-C8maPrOT.css`, unchanged), confirmed by three consecutive
> cache-busted fetches that matched the build. Previous entry
> `assets/index-Bmap-hv5.js`. API and web shipped together in the single Worker
> deploy. Pre-deploy full gate passed on `2b3a79c` from a clean detached
> worktree on Steven's MacBook (format, typecheck, lint, design verify,
> theme-classes, unit tests web 1344 / api 526 / music 30, Worker/D1
> integration 224, web build, OpenAPI no drift, contract-parity, audit:ci).
> The local gate ran on Node 26. Preflight ran before the deploy: no remote D1
> migrations pending and `BETA_ALLOWED_EMAILS` present. No migration was applied.
>
> Deployed since production `81b0a55`:
> [#577](https://github.com/steven-crosby/ritmofit-web/pull/577) (add a playlist
> on any editable class, `6993f80`) and
> [#578](https://github.com/steven-crosby/ritmofit-web/pull/578) (skip songs
> already in the class when importing a playlist, `2b3a79c`). Docs
> [#576](https://github.com/steven-crosby/ritmofit-web/pull/576) (`2cfe4c0`) is
> in that tree and does not change runtime.
>
> Smoke: `/` 200, `/api/v1/health` 200 with security headers; unauthenticated
> `/api/v1/classes`, `/explore`, and `/teams` 401; unauthenticated
> `POST /api/v1/classes/:id/import-playlist`, `GET /classes/:id/shares`, and
> provider search 401. Real-browser check of playlist import is still owed.

> **Deploy 2026-10-24 — #575 on main `81b0a55`.** Owner approved.
> Production deploy at 2026-10-25T05:18Z (11:18 PM MT 2026-10-24). New Worker
> `a3c6bc65-662d-4f2a-9149-c107171e8092`; previous/rollback
> `308a01a9-1972-4c5b-b046-f497c0c10d7e`. SPA entry `assets/index-Bmap-hv5.js`
> (CSS `assets/index-C8maPrOT.css`, unchanged), confirmed by three consecutive
> cache-busted fetches that matched the build. Previous entry
> `assets/index-BDFuf20J.js`. API and web shipped together in the single Worker
> deploy. Pre-deploy full gate passed on `81b0a55` from a clean detached
> worktree on Steven's MacBook (format, typecheck, lint, design verify,
> theme-classes, unit tests web 1328 / api 526 / music 30, Worker/D1
> integration 223, web build, OpenAPI no drift, contract-parity, audit:ci).
> The local gate ran on Node 26. Preflight ran before the deploy: no remote D1
> migrations pending and `BETA_ALLOWED_EMAILS` present. No migration was applied.
>
> Deployed since production `c7110b4`:
> [#575](https://github.com/steven-crosby/ritmofit-web/pull/575) (Spotify
> paste-a-link preview uses the instructor's user token; `409 NOT_CONNECTED` /
> `REAUTH_REQUIRED` instead of `502`, `81b0a55`). Docs
> [#574](https://github.com/steven-crosby/ritmofit-web/pull/574) (`990c12a`) is
> in that tree and does not change runtime.
>
> Smoke: `/` 200, `/api/v1/health` 200 with security headers; unauthenticated
> `/api/v1/classes`, `/explore`, and `/teams` 401; unauthenticated
> `POST /api/v1/classes/:id/import-playlist` 401. Real-browser check against a
> live Spotify playlist is still owed.

> **Deploy 2026-10-24 — #572 and #573 on main `c7110b4`.** Owner approved.
> Production deploy at 2026-10-25T04:28Z (10:28 PM MT 2026-10-24). New Worker
> `308a01a9-1972-4c5b-b046-f497c0c10d7e`; previous/rollback
> `91e323c9-504c-4e60-8bde-47befd2ccb8c`. SPA entry `assets/index-BDFuf20J.js`
> (CSS `assets/index-C8maPrOT.css`), confirmed by six consecutive cache-busted
> fetches that matched the build. Previous entry `assets/index-B3YiofMb.js`,
> previous CSS `assets/index-DcqGkA5K.css`. API and web shipped together in the
> single Worker deploy. Pre-deploy full gate passed on `c7110b4` from a clean
> detached worktree on Steven's MacBook (format, typecheck, lint, design verify,
> theme-classes, unit tests web 1326 / api 517 / music 30, Worker/D1
> integration 219, web build, OpenAPI no drift, contract-parity, audit:ci).
> The local gate ran on Node 26 (Node 22 not installed there). Preflight ran
> before the deploy: no remote D1 migrations pending (`0021` latest) and
> `BETA_ALLOWED_EMAILS` present. No migration was applied.
>
> Deployed since production `a78f6f5`:
> [#572](https://github.com/steven-crosby/ritmofit-web/pull/572) (commit
> playlist imports as one block per song, `88128ef`) and
> [#573](https://github.com/steven-crosby/ritmofit-web/pull/573) (preview
> playlist imports and pick up to 15 songs, `c7110b4`). Docs
> [#571](https://github.com/steven-crosby/ritmofit-web/pull/571) (`15cf188`) is
> in that tree and does not change runtime.
>
> Smoke: `/` 200, `/api/v1/health` 200 with security headers; unauthenticated
> `/api/v1/classes`, `/explore`, and `/teams` 401; unauthenticated
> `POST /api/v1/classes/:id/import-playlist` 401 (route mounted, not 404).
> **Owed:** real-browser smoke of playlist import preview, picker, and commit.
> Production matches main `c7110b4` code at deploy time. This docs record is not
> in the deployed tree.

> **Deploy 2026-10-24 — #569 on main `a78f6f5`.** Owner approved.
> Production deploy at 2026-10-24T23:02:31Z (5:02 PM MT). New Worker
> `91e323c9-504c-4e60-8bde-47befd2ccb8c`; previous/rollback
> `9b471c26-c62f-41b2-9788-6eb49c1353fa`. SPA entry `assets/index-B3YiofMb.js`
> (CSS `assets/index-DcqGkA5K.css`), confirmed by six consecutive cache-busted
> fetches that matched the build. The JS filename differs from the previous
> production entry `assets/index-DtpLW965.js`. The CSS filename is unchanged.
> The served chunk `assets/LiveMode-DaO4hU9g.js` contains the End Class label
> from #569. Pre-deploy full gate passed on `a78f6f5` from a clean detached
> worktree on Steven's MacBook (format, typecheck, lint, design verify,
> theme-classes, unit tests web 1310 / api 496 / music 30, Worker/D1
> integration 200, web build, OpenAPI no drift, contract-parity, audit:ci).
> The local gate ran on Node 26 (Node 22 not installed there); CI on Node 22
> passed on the PR head. Preflight ran before the deploy: no remote D1
> migrations pending (`0021` latest) and `BETA_ALLOWED_EMAILS` present. No
> migration was applied.
>
> Deployed since production `7a505ae`:
> [#569](https://github.com/steven-crosby/ritmofit-web/pull/569) (Live End Class
> and finished-class copy, `a78f6f5`). Docs `d5e7b7c`
> ([#568](https://github.com/steven-crosby/ritmofit-web/pull/568), the earlier
> 2026-10-24 deploy record) is in that tree and does not change runtime.
>
> Smoke: `/` 200, `/api/v1/health` 200 with security headers; unauthenticated
> `/api/v1/classes`, `/explore`, and `/teams` 401. Production matches main
> `a78f6f5` code at deploy time. This docs record is not in the deployed tree.

> **Deploy 2026-10-24 — #563 and #562 on main `7a505ae`.** Owner approved.
> Production deploy at 2026-10-24T20:35:42Z (2:35 PM MT). New Worker
> `9b471c26-c62f-41b2-9788-6eb49c1353fa`; previous/rollback
> `baa4a420-562c-4988-969b-2bd1709a35a9`. SPA entry `assets/index-DtpLW965.js`
> (CSS `assets/index-DcqGkA5K.css`), confirmed by six consecutive cache-busted
> fetches that matched the build. The JS filename differs from the previous
> production entry `assets/index-q9aP7Jrc.js`. The CSS filename is unchanged.
> The served chunk `assets/cue-list-qsZtbLBj.js` contains the tenths-rounded
> hold countdown from #563. Pre-deploy full gate passed on `7a505ae` from a
> clean detached worktree on Steven's MacBook (format, typecheck, lint, design
> verify, theme-classes, unit tests web 1309 / api 496 / music 30, Worker/D1
> integration 200, web build, OpenAPI no drift, contract-parity, audit:ci).
> Preflight ran before the deploy: no remote D1 migrations pending (`0021`
> latest) and `BETA_ALLOWED_EMAILS` present. No migration was applied.
>
> Deployed since production `ff24f46`:
> [#563](https://github.com/steven-crosby/ritmofit-web/pull/563) (round the
> Cue-by-Cue hold countdown, `d4c67fd`) and
> [#562](https://github.com/steven-crosby/ritmofit-web/pull/562) (lock cue-hold
> selection when anchors tie, tests only, `7a505ae`). Docs `be24ac1`
> ([#567](https://github.com/steven-crosby/ritmofit-web/pull/567), the earlier
> 2026-10-24 deploy record) is in that tree and does not change runtime.
>
> Smoke: `/` 200, `/api/v1/health` 200 with security headers; unauthenticated
> `/api/v1/classes`, `/explore`, and `/teams` 401. Production matches main
> `7a505ae` code at deploy time. This docs record is not in the deployed tree.

> **Deploy 2026-10-24 — #546, #557, #564, #565, #566 on main `ff24f46`.** Owner approved.
> Production deploy at 2026-10-24T20:12:50Z (2:12 PM MT). New Worker
> `baa4a420-562c-4988-969b-2bd1709a35a9`; previous/rollback
> `7a2d5773-e807-4d49-9074-c21a8723723f`. SPA entry `assets/index-q9aP7Jrc.js`
> (CSS `assets/index-DcqGkA5K.css`), confirmed by six consecutive cache-busted
> fetches that matched the build. The JS filename differs from the previous
> production entry `assets/index-Dzrd7d91.js`. The CSS filename is unchanged.
> Pre-deploy full gate passed on `ff24f46` from a clean detached worktree on
> Steven's MacBook (format, typecheck, lint, design verify, theme-classes, unit
> tests web 1301 / api 496 / music 30, Worker/D1 integration 200, web build,
> OpenAPI no drift, contract-parity, audit:ci). An earlier gate on `687e1ca`
> failed one ordered-import test on Node 25; #566 fixed the test mock. Preflight
> ran before the deploy: no remote D1 migrations pending (`0021` latest) and
> `BETA_ALLOWED_EMAILS` present. No migration was applied.
>
> Deployed since production `4cc4121`:
> [#546](https://github.com/steven-crosby/ritmofit-web/pull/546) (ordered-import
> recovery tests, `e050c1c`),
> [#557](https://github.com/steven-crosby/ritmofit-web/pull/557) (cue beat source
> and builder field tests, `37ff209`),
> [#564](https://github.com/steven-crosby/ritmofit-web/pull/564) (quiet the Live
> next clock and queue interval, `97219bc`),
> [#565](https://github.com/steven-crosby/ritmofit-web/pull/565) (lock pause
> during an in-flight play, `687e1ca`), and
> [#566](https://github.com/steven-crosby/ritmofit-web/pull/566) (deterministic
> unreadable-sessionStorage test, `ff24f46`). Docs `6f5041b`
> ([#561](https://github.com/steven-crosby/ritmofit-web/pull/561), the 2026-10-23
> zod deploy record) is in that tree and does not change runtime.
>
> Smoke: `/` 200, `/api/v1/health` 200 with security headers; unauthenticated
> `/api/v1/classes`, `/explore`, and `/teams` 401. Production matches main
> `ff24f46` code at deploy time. This docs record is not in the deployed tree.

> **Deploy 2026-10-23 — #560 on main `4cc4121`.**
> Production deploy at 2026-10-24T03:57:57Z (9:57 PM MT). New Worker
> `7a2d5773-e807-4d49-9074-c21a8723723f`; previous/rollback
> `a14a6c8b-868c-47c8-88f4-23d9df7543ed`. SPA entry `assets/index-Dzrd7d91.js`
> (CSS `assets/index-DcqGkA5K.css`), confirmed by three consecutive cache-busted
> fetches that matched the build. The JS filename differs from the previous
> production entry `assets/index-CNS2JRTb.js`. The CSS filename is unchanged.
> Pre-deploy full gate passed on `4cc4121` from a clean detached worktree on
> Steven's MacBook (format, typecheck, lint, design verify, theme-classes, unit
> tests web 1289 / api 496 / music 30, Worker/D1 integration 200, web build,
> OpenAPI no drift, contract-parity, audit:ci). The remote D1 migrations check
> and the `BETA_ALLOWED_EMAILS` secret-name check ran immediately after the
> deploy rather than before (shell error). Both passed: no migrations pending
> (`0021` latest) and `BETA_ALLOWED_EMAILS` present. No migration was applied.
>
> Deployed since production `a4a021d`:
> [#560](https://github.com/steven-crosby/ritmofit-web/pull/560) (patch zod
> 4.4.3 → 4.6.7 for
> [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
> `003d4b6`; includes regenerated `openapi.json`). Docs
> [#559](https://github.com/steven-crosby/ritmofit-web/pull/559) (`4cc4121`) and
> `0f3d18a` ([#558](https://github.com/steven-crosby/ritmofit-web/pull/558), the
> 2026-10-23 teaching screen deploy record) are in that tree and do not change
> runtime. Drafts [#546](https://github.com/steven-crosby/ritmofit-web/pull/546)
> and [#557](https://github.com/steven-crosby/ritmofit-web/pull/557) were not
> deployed.
>
> Smoke: `/` 200, `/api/v1/health` 200; unauthenticated `/api/v1/classes`,
> `/explore`, and `/teams` 401. Production matches main `4cc4121` code at deploy
> time. This docs record is not in the deployed tree.

> **Deploy 2026-10-23 — #555 and #556 on main `a4a021d`.** Owner asked to deploy.
> Production deploy at 2026-10-23T15:05:19Z (9:05 AM MT). New Worker
> `a14a6c8b-868c-47c8-88f4-23d9df7543ed`; previous/rollback
> `3b136b53-de16-450d-b4cd-3c220c893d65`. SPA entry `assets/index-CNS2JRTb.js`
> (CSS `assets/index-DcqGkA5K.css`), confirmed by three consecutive cache-busted
> fetches on the first triple. The JS filename differs from the previous
> production entry `assets/index-C7a2e70_.js`. The CSS filename also differs
> from the previous `assets/index-DmB9GctO.css`. Asset responses were
> `text/javascript` and `text/css`, both
> `Cache-Control: public, max-age=0, must-revalidate, no-transform`.
> Pre-deploy full gate passed on `a4a021d` from a clean detached worktree (format,
> typecheck, lint, design verify, theme-classes, unit tests web 1289 / api 496 /
> music 30, Worker/D1 integration 200, web build, OpenAPI no drift, contract-parity,
> audit:ci). The gate ran on Node v26.7.0 (`/opt/homebrew/bin/node`). `.nvmrc` is
> 22; Homebrew `node@22` and `~/.nvm` were not present. Remote D1 already had
> `0021_rainy_falcon.sql` applied (`d1_migrations` id 22). `migrations list --remote`
> reported nothing to apply before and after the deploy. No migration was applied
> and `0022` was not created. `BETA_ALLOWED_EMAILS` present (name only). A Worker
> rollback does not un-apply `0021`.
>
> Deployed since production `a56e0ee`:
> [#555](https://github.com/steven-crosby/ritmofit-web/pull/555) (stored cue fields
> on the run payload, `82b5b9d`) and
> [#556](https://github.com/steven-crosby/ritmofit-web/pull/556) (teach the cue hold
> on Cue-by-Cue, `a4a021d`). Docs record `a42c0f1` (the 2026-10-22 cue-list deploy
> record) is in that tree and does not change runtime. Draft
> [#546](https://github.com/steven-crosby/ritmofit-web/pull/546) was not on `main`
> and was not deployed.
>
> Smoke: `/` 200, `/api/v1/health` 200 (`status: ok`, service `ritmofit-api`);
> unauthenticated `/api/v1/classes`, `/explore`, and `/teams` 401. Six security
> headers present. Unauthenticated class shares, playlist import, Spotify search,
> saved playlists, playlist import-by-id, track import, cover upload, tag
> add/remove, moves, and the cue list returned 401.
> `GET /api/v1/uploads/covers/smoke-missing.jpg` reached the handler as 404
> `NOT_FOUND` (`Image not found.`). No Cloudflare challenge page. Worker status
> 100% on `a14a6c8b`. Production matches main `a4a021d` at deploy time. This
> docs record is not in the deployed tree.

> **Deploy 2026-10-22 — #553 on main `a56e0ee`.** Owner asked to deploy.
> Production deploy at 2026-10-23T00:34:49Z (6:34 PM MT). New Worker
> `3b136b53-de16-450d-b4cd-3c220c893d65`; previous/rollback
> `d5dc04f9-a793-47e8-9591-ce73b5379142`. SPA entry `assets/index-C7a2e70_.js`
> (CSS `assets/index-DmB9GctO.css`), confirmed by three consecutive cache-busted
> fetches on the first triple. The JS filename differs from the previous
> production entry `assets/index-DbX6Q4N-.js`. The CSS filename is unchanged
> from the `d5dc04f9` release. Asset responses were `text/javascript` and
> `text/css`, both `Cache-Control: public, max-age=0, must-revalidate`.
> Pre-deploy full gate passed on `a56e0ee` from a clean detached worktree (format,
> typecheck, lint, design verify, theme-classes, unit tests web 1277 / api 491 /
> music 30, Worker/D1 integration 198, web build, OpenAPI no drift, contract-parity,
> audit:ci). The gate ran on Node v26.7.0 (`/opt/homebrew/bin/node`). `.nvmrc` is
> 22; Homebrew `node@22` and `~/.nvm` were not present. Remote D1 had exactly one
> pending migration, `0021_rainy_falcon.sql` (cues table rebuild: `position`
> default 0, nullable `duration_ms`, `bpm`, `intensity`, `note`). It was read,
> then applied before the Worker deploy (8 commands, success). Pre-apply
> time-travel bookmark
> `00000379-00000000-0000510d-f1115961aca3f44f84466b91e205e3f8`. After apply,
> `cues` had 23 rows, the new columns, and `cues_class_track_id_idx`; no
> pre-apply row count was captured. `BETA_ALLOWED_EMAILS` present (name only).
> Post-deploy `migrations list --remote` reported nothing to apply. A Worker
> rollback does not un-apply `0021`.
>
> Deployed since production `b644217`:
> [#553](https://github.com/steven-crosby/ritmofit-web/pull/553) (teaching-order
> cue list on a builder song, `a56e0ee`). Docs record `8541f9e` (the earlier
> same-day Worker `d5dc04f9` record) is in that tree and does not change runtime.
> Draft [#546](https://github.com/steven-crosby/ritmofit-web/pull/546) was not on
> `main` and was not deployed. The cue-list handoff still describes #553 as an
> open draft and was not edited.
>
> Smoke: `/` 200, `/api/v1/health` 200 (`status: ok`, service `ritmofit-api`);
> unauthenticated `/api/v1/classes`, `/explore`, and `/teams` 401. Six security
> headers present. Unauthenticated class shares, playlist import, Spotify search,
> saved playlists, track import, cover upload, tag add/remove, moves, and the
> cue list returned 401. `GET /api/v1/uploads/covers/smoke-missing.jpg` reached
> the handler as 404 `NOT_FOUND`. No Cloudflare challenge page. Worker status
> 100% on `3b136b53`. Production matches main `a56e0ee` at deploy time. This
> docs record is not in the deployed tree.

> **Deploy 2026-10-22 — #551 on main `b644217`.** Owner asked to deploy.
> Production deploy at 2026-10-22T21:39:16Z (3:39 PM MT). New Worker
> `d5dc04f9-a793-47e8-9591-ce73b5379142`; previous/rollback
> `f559fcca-94db-45a9-93b1-774cfb99f812`. SPA entry `assets/index-DbX6Q4N-.js`
> (CSS `assets/index-DmB9GctO.css`), confirmed by three consecutive cache-busted
> fetches on the first triple. A further fetch returned the same JS and CSS.
> Pre-deploy full gate passed on `b644217` from a clean detached worktree (format,
> typecheck, lint, design verify, theme-classes, unit tests web 1268 / api 486 /
> music 30, Worker/D1 integration 196, web build, OpenAPI no drift, contract-parity,
> audit:ci). The gate ran on Node v26.7.0 (`/opt/homebrew/bin/node`). `.nvmrc` is
> 22; Homebrew `node@22` and `~/.nvm` were not present. Remote D1 had no migrations
> to apply, and no migration files changed between production `2a85509` and
> `b644217`. `BETA_ALLOWED_EMAILS` present (name only). Post-deploy
> `migrations list --remote` still reported nothing to apply.
>
> Deployed since production `2a85509`:
> [#551](https://github.com/steven-crosby/ritmofit-web/pull/551) (authored sections
> under Class Pulse, `b644217`). Docs record `5edeb78` (the earlier same-day
> Worker `f559fcca` record) is in that tree and does not change runtime.
> Draft [#546](https://github.com/steven-crosby/ritmofit-web/pull/546) was not on
> `main` and was not deployed.
>
> Smoke: `/` 200, `/api/v1/health` 200 (`status: ok`, service `ritmofit-api`);
> unauthenticated `/api/v1/classes`, `/explore`, and `/teams` 401. Six security
> headers present. Unauthenticated class shares, playlist import, Spotify search,
> saved playlists, track import, cover upload, tag add/remove, and moves returned
> 401. `GET /api/v1/uploads/covers/smoke-missing.jpg` reached the handler as
> 404 `NOT_FOUND`. Worker status 100% on `d5dc04f9`. Production matches main
> `b644217` at deploy time. This docs record is not in the deployed tree.

> **Deploy 2026-10-22 — #543, #544, #548, and #549 on main `2a85509`.** Owner asked to deploy.
> Production deploy at 2026-10-22T18:39:45Z (12:39 PM MT). New Worker
> `f559fcca-94db-45a9-93b1-774cfb99f812`; previous/rollback
> `a7ce7cc4-b071-45a8-82b0-43f3cde1b482`. SPA entry `assets/index-D1PZXPS7.js`
> (CSS `assets/index-DmB9GctO.css`), confirmed by three consecutive cache-busted
> fetches on the first triple. A further fetch returned the same JS and CSS.
> Pre-deploy full gate passed on `2a85509` from a clean detached worktree (format,
> typecheck, lint, design verify, theme-classes, unit tests web 1263 / api 486 /
> music 30, Worker/D1 integration 196, web build, OpenAPI no drift, contract-parity,
> audit:ci). The gate ran on Node v26.7.0 (`/opt/homebrew/bin/node`). `.nvmrc` is
> 22; Homebrew `node@22` and `~/.nvm` were not present. Remote D1 had no migrations
> to apply, and no migration files changed between production `4770ab9` and
> `2a85509`. `BETA_ALLOWED_EMAILS` present (name only). Post-deploy
> `migrations list --remote` still reported nothing to apply.
>
> Deployed since production `4770ab9`:
> [#541](https://github.com/steven-crosby/ritmofit-web/pull/541) (docs, `711c543`),
> [#542](https://github.com/steven-crosby/ritmofit-web/pull/542) (docs, `d1236b0`),
> [#543](https://github.com/steven-crosby/ritmofit-web/pull/543) (fill blank segment
> failure lines, `decf9f7`),
> [#544](https://github.com/steven-crosby/ritmofit-web/pull/544) (fill blank
> Add-music failure copy, `910ecc1`),
> [#545](https://github.com/steven-crosby/ritmofit-web/pull/545) (docs, `d9d2051`),
> [#547](https://github.com/steven-crosby/ritmofit-web/pull/547) (docs, `c466994`),
> [#549](https://github.com/steven-crosby/ritmofit-web/pull/549) (fill a blank Live
> playback failure, `968379d`), and
> [#548](https://github.com/steven-crosby/ritmofit-web/pull/548) (fill a blank Apple
> connect failure, `2a85509`).
> Draft [#546](https://github.com/steven-crosby/ritmofit-web/pull/546) was not on
> `main` and was not deployed. The #548 and #549 lane handoffs still describe those
> PRs as open drafts and were not edited. The 2026-10-22 close handoff still
> describes the pre-deploy state.
>
> Smoke: `/` 200, `/api/v1/health` 200 (`status: ok`, service `ritmofit-api`);
> unauthenticated `/api/v1/classes`, `/explore`, and `/teams` 401. Six security
> headers present. Unauthenticated class shares, playlist import, Spotify search,
> saved playlists, track import, cover upload, tag add/remove, and moves returned
> 401. `GET /api/v1/uploads/covers/smoke-missing.jpg` reached the handler as
> 404 `NOT_FOUND`. Worker status 100% on `f559fcca`. Production matches main
> `2a85509`.

> **Deploy 2026-10-21 — #540 on main `4770ab9`.** Owner asked to deploy.
> Production deploy at 2026-10-22T00:10:18Z (6:10 PM MT). New Worker
> `a7ce7cc4-b071-45a8-82b0-43f3cde1b482`; previous/rollback
> `0b50b635-614e-4ed4-8cfe-e6aa2092e696`. SPA entry `assets/index-Db7wrScM.js`
> (CSS `assets/index-DmB9GctO.css`), confirmed by three consecutive cache-busted
> fetches on the first triple. A further fetch returned the same CSS.
> Pre-deploy full gate passed on `4770ab9` from a clean detached worktree (format,
> typecheck, lint, design verify, theme-classes, unit tests web 1233 / api 486 /
> music 30, Worker/D1 integration 196, web build, OpenAPI no drift, contract-parity,
> audit:ci). The gate ran on Node v26.7.0; `.nvmrc` is 22 and Node 22 is not
> installed on this Mac. Remote D1 had no migrations to apply, and no migration
> files changed between production `3ffb7e0` and `4770ab9`. `BETA_ALLOWED_EMAILS`
> present (name only). Post-deploy `migrations list --remote` still reported
> nothing to apply.
>
> Deployed since production `3ffb7e0`:
> [#540](https://github.com/steven-crosby/ritmofit-web/pull/540) (fill blank
> TrackPreview failure alerts, `4770ab9`). Docs record `2914253` (the earlier
> same-day Worker `0b50b635` record) is in that tree and does not change runtime.
> The #540 lane handoff still describes that PR as an open draft and was not
> edited.
>
> Smoke: `/` 200, `/api/v1/health` 200 (`status: ok`, service `ritmofit-api`);
> unauthenticated `/api/v1/classes`, `/explore`, and `/teams` 401. Six security
> headers present. Unauthenticated class shares, playlist import, Spotify search,
> saved playlists, track import, cover upload, tag add/remove, and moves returned
> 401. `GET /api/v1/uploads/covers/smoke-missing.jpg` reached the handler as
> 404 `NOT_FOUND`. Worker status 100% on `a7ce7cc4`. Production matches main
> `4770ab9`.

> **Deploy 2026-10-21 — #533 and #538 on main `3ffb7e0`.** Owner asked to deploy.
> Production deploy at 2026-10-21T22:20:04Z (4:20 PM MT). New Worker
> `0b50b635-614e-4ed4-8cfe-e6aa2092e696`; previous/rollback
> `d35db864-3d34-4803-9c4f-d560c859da4d`. SPA entry `assets/index-DPJbMvMh.js`
> (CSS `assets/index-DmB9GctO.css`), confirmed by three consecutive cache-busted
> fetches on the first triple. A further fetch returned the same JS and CSS.
> Pre-deploy full gate passed on `3ffb7e0` from a clean detached worktree (format,
> typecheck, lint, design verify, theme-classes, unit tests web 1221 / api 486 /
> music 30, Worker/D1 integration 196, web build, OpenAPI no drift, contract-parity,
> audit:ci). The gate ran on Node v26.7.0; `.nvmrc` is 22 and Node 22 is not
> installed on this Mac. Remote D1 had no migrations to apply, and no migration
> files changed between production `80b5e0f` and `3ffb7e0`. `BETA_ALLOWED_EMAILS`
> present (name only). Post-deploy `migrations list --remote` still reported
> nothing to apply.
>
> Deployed since production `80b5e0f`:
> [#533](https://github.com/steven-crosby/ritmofit-web/pull/533) (prioritize
> actionable Live preflight checks, `037199a`) and
> [#538](https://github.com/steven-crosby/ritmofit-web/pull/538) (class summary
> recovery for a blank load error, `3ffb7e0`). Docs record `8347ace` (the earlier
> same-day Worker `d35db864` record) is in that tree and does not change runtime.
> The #533 and #538 lane handoffs still describe those PRs as open and were not
> edited. The round handoff still describes the earlier pre-deploy state.
>
> Smoke: `/` 200, `/api/v1/health` 200 (`status: ok`, service `ritmofit-api`);
> unauthenticated `/api/v1/classes`, `/explore`, and `/teams` 401. Six security
> headers present. Unauthenticated class shares, playlist import, Spotify search,
> saved playlists, track import, cover upload, tag add/remove, and moves returned
> 401. `GET /api/v1/uploads/covers/smoke-missing.jpg` reached the handler as
> 404 `NOT_FOUND`. Worker status 100% on `0b50b635`. Production matches main
> `3ffb7e0`.

> **Deploy 2026-10-21 — #532, #535, and #536 on main `80b5e0f`.** Owner released the hold.
> Production deploy at 2026-10-21T19:26:50Z (1:26 PM MT). New Worker
> `d35db864-3d34-4803-9c4f-d560c859da4d`; previous/rollback
> `cb549532-a8c6-4807-adbe-d8a6b36adf38`. SPA entry `assets/index-DDKy4C-k.js`
> (CSS `assets/index-BME8DglN.css`), confirmed by three consecutive cache-busted
> fetches on the first triple. Pre-deploy full gate passed on `80b5e0f` from a
> clean detached worktree (format, typecheck, lint, design verify, theme-classes,
> unit tests web 1215 / api 486 / music 30, Worker/D1 integration 196, web build,
> OpenAPI no drift, contract-parity, audit:ci). The gate ran on Node v26.7.0;
> `.nvmrc` is 22 and Node 22 is not installed on this Mac. Remote D1 had no
> migrations to apply, and no migration files changed between production
> `9e43307` and `80b5e0f`. `BETA_ALLOWED_EMAILS` present (name only).
>
> Deployed since production `9e43307`:
> [#531](https://github.com/steven-crosby/ritmofit-web/pull/531) (docs),
> [#532](https://github.com/steven-crosby/ritmofit-web/pull/532) (preserve
> untouched clip-end precision, `421d0dc`),
> [#534](https://github.com/steven-crosby/ritmofit-web/pull/534) (docs),
> [#535](https://github.com/steven-crosby/ritmofit-web/pull/535) (builder failure
> fallback when an error has no message, `3a1cc3f`), and
> [#536](https://github.com/steven-crosby/ritmofit-web/pull/536) (Live preflight
> Exit stays inside the header, `80b5e0f`).
> [#533](https://github.com/steven-crosby/ritmofit-web/pull/533) was not merged
> and was not deployed. The round handoff still describes the pre-deploy state
> and was not edited.
>
> Smoke: `/` 200, `/api/v1/health` 200 (`status: ok`, service `ritmofit-api`);
> unauthenticated `/api/v1/classes`, `/explore`, and `/teams` 401. Six security
> headers present. Unauthenticated class shares, playlist import, Spotify search,
> saved playlists, track import, cover upload, tag add/remove, and moves returned
> 401. `GET /api/v1/uploads/covers/smoke-missing.jpg` reached the handler as
> 404 `NOT_FOUND` (Image not found). Worker status 100% on `d35db864`. Production
> matches main `80b5e0f`.

> **Close-session 2026-10-21 — #532 merged, undeployed; #533 left open.**
> Round r20261021 (Codex, local), orchestrator light close.
> [#532](https://github.com/steven-crosby/ritmofit-web/pull/532)
> `fix(web): preserve untouched clip-end precision` squash-merged as
> `421d0dc` on 2026-10-21. Not deployed.
> [#533](https://github.com/steven-crosby/ritmofit-web/pull/533)
> `fix(web): prioritize actionable Live preflight checks` (branch
> `codex/r20261021-preflight`) remains open by owner decision. The branch
> was updated with main (remote head `f172a36`), but GitHub's PR still
> shows the old head `fdd2d26`, mergeability is stuck `unknown`, and no CI
> ran on `f172a36`. Merge was rejected as `head branch out of date`.
> Production as observed 2026-10-21 ~8:20 AM MT: Worker
> `cb549532-a8c6-4807-adbe-d8a6b36adf38`, SPA `assets/index-C_SFpl0g.js`
> (3/3 fetches), health 200. Main is ahead of production by #532. Deploy
> held by owner. Neither lane got native 200% zoom verification
> (NOT_ASSESSED). Apple 5:18 debugging and Spotify stay tabled.
> Retired the completed #532 lane-1 builder-trim handoff, the #527 session
> handoff, and the r20261020 lane-2 handoff. Links in the 2026-10-20 entries
> below now point at `421d0dc`, the last main commit that still contains
> those files. The 2026-10-11 handoffs, the 2026-10-13 handoffs, and the
> r20261021 lane-2 preflight handoff were not edited; that lane-2 file lives
> on #533's branch, not main.
> [Round handoff](https://github.com/steven-crosby/ritmofit-web/blob/711c54339834b9c7ef3ddff312c9fd3cc744ce4e/ritmofit_dev_plan/handoffs/2026-10-21-r20261021-round-close.md).

> **Deploy 2026-10-20 — #527–#530 on main `9e43307`.** Owner-approved production deploy at
> 2026-10-20T22:44:21Z (4:44 PM MT). New Worker `cb549532-a8c6-4807-adbe-d8a6b36adf38`;
> previous/rollback `73493517-2006-4beb-bf7c-cdb1edf298fd`. SPA entry
> `assets/index-C_SFpl0g.js`, confirmed by three consecutive cache-busted fetches.
> Pre-deploy full gate passed on `9e43307`. Remote D1 had no migrations to apply.
> `BETA_ALLOWED_EMAILS` present.
>
> Deployed batch: [#527](https://github.com/steven-crosby/ritmofit-web/pull/527) (Live tab
> keyboard navigation, Hono 4.13.7 → 4.13.11,
> [GHSA-5r4p-p66f-jhc7](https://github.com/advisories/GHSA-5r4p-p66f-jhc7)),
> [#528](https://github.com/steven-crosby/ritmofit-web/pull/528) (docs),
> [#529](https://github.com/steven-crosby/ritmofit-web/pull/529) (class-route access and
> run-payload contract integration tests), and
> [#530](https://github.com/steven-crosby/ritmofit-web/pull/530) (2s presentation grace on
> the Live Waiting for music panel).
>
> Smoke: `/` 200, `/api/v1/health` 200; unauthenticated `/api/v1/classes`, `/explore`, and
> `/teams` 401. Six security headers present. Production matches main `9e43307`.
>
> Closed [the #527 session handoff](https://github.com/steven-crosby/ritmofit-web/blob/421d0dce4912fe88590c601f99902bdd62ebca05/ritmofit_dev_plan/handoffs/2026-10-20-live-tab-typecheck.md) and the
> [r20261020 lane-2 handoff](https://github.com/steven-crosby/ritmofit-web/blob/421d0dce4912fe88590c601f99902bdd62ebca05/ritmofit_dev_plan/handoffs/2026-10-20-r20261020-lane2-runpayload-harden.md)
> from #529 after both had merged and this deploy shipped them. #530 added no handoff.
> The 2026-10-11 handoffs and the Apple 5:18 investigation handoff are unchanged.

> **Close-session 2026-10-20 — #527 merged and verified; deployment held.**
> [#527](https://github.com/steven-crosby/ritmofit-web/pull/527) squash-merged as
> `4ee691213ebd388c8c5e2dcbd8b4987102816c7d`. Live's Cue-by-Cue / Full List tabs now
> support manual keyboard navigation; the follow-up narrows the indexed tab value to fix
> TS2538. Hono is patched from 4.13.7 to 4.13.11, with no other package version changes
> or new audit exceptions. Full local gate passed (web 1185, API 486, music 30,
> Worker/D1 integration 184). Local Chrome verified arrows, Home/End, Enter/Space,
> and Tab/Shift+Tab in synthetic prompter-only mode; no audio or real-device acceptance.
> [Evidence](../docs/audits/live-tab-typecheck-2026-10-20/hono-verification.json).
>
> Final PR head `1710472` passed [CI 39470330713](https://github.com/steven-crosby/ritmofit-web/actions/runs/39470330713).
> Exact squash `4ee6912` passed [post-main CI 39470831675](https://github.com/steven-crosby/ritmofit-web/actions/runs/39470831675).
> Local and origin main were synchronized at that squash before preparing close records.
> Main is ahead of production by #527. Steven explicitly held deployment. Read-only
> post-merge production check: Worker `73493517-2006-4beb-bf7c-cdb1edf298fd` at 100%;
> three consecutive cache-busted SPA entries `assets/index-C1EvvyLa.js`. No deployment,
> remote migration, or production fixture mutation; remote migration state not checked.
>
> Close removes only local branch `cursor/r20261019-live-view-tabs` (`1710472`), after
> its tree matched the squash and no worktree used it. Its remote branch is retained
> pending separate deletion approval. Completed #527 lane handoff is retired after routing
> its delivery state here and its local fixture notes to the retained
> [session handoff](https://github.com/steven-crosby/ritmofit-web/blob/421d0dce4912fe88590c601f99902bdd62ebca05/ritmofit_dev_plan/handoffs/2026-10-20-live-tab-typecheck.md).
> The untracked planning brief, verification tag, local QA fixtures, Apple
> production fixture, other authors' handoffs, and all existing evidence remain.
> Apple 5:18 debugging remains tabled. Close-record publication is owed from the handoff.

> **2026-10-19 — remote #518/#519 lane branches deleted.** Steven explicitly
> approved deleting the two leftover origin branches after #525 merged.
> `codex/r20261011c-live-short-viewport` was `a06e0e6` (#518, squash `ed00aed`)
> and `codex/r20261011c-builder-refresh-integrity` was `3d7bfd6` (#519, squash
> `dbc8afb`). No open PR used either head. Both refs were deleted from origin
> and the local remote-tracking refs were pruned. No product, schema, or deploy
> change. Same-day production check, before this delete: Worker
> `73493517-2006-4beb-bf7c-cdb1edf298fd` at 100%; three cache-busted SPA entries
> `assets/index-C1EvvyLa.js`; `/` 200, health 200, unauthenticated classes 401.

> **Close-session 2026-10-19 — local lane worktrees removed.** No product change and no
> deploy. Local worktrees and local branches for squash-merged #518
> (`codex/r20261011c-live-short-viewport`, was `a06e0e6`) and #519
> (`codex/r20261011c-builder-refresh-integrity`, was `3d7bfd6`) were removed after
> confirming neither tree held product files missing from `main`. The orchestrator
> handoff that still existed on the #519 branch was already retired on `main` in #523.
> Untracked planning briefs were kept outside the repo. Both remote branches remain
> on origin until an explicit delete. The local verification tag, the
> Apple fixture, and other authors' handoffs were not touched. Production was not
> re-checked at this close; the 2026-10-18 observation was Worker
> `73493517-2006-4beb-bf7c-cdb1edf298fd` at 100% and SPA `assets/index-C1EvvyLa.js`.

> **Close-session 2026-10-13 — Apple debugging tabled; deployment unnecessary.** Steven tabled
> the Apple 5:18 investigation and requested main synchronization, obsolete-branch cleanup and
> deployment only if needed. #523 is merged as `973db61` with full post-main CI `38460359795`.
> Local main, origin/main and GitHub main agreed at that base. Completed publication branch
> `codex/session-cleanup-pass2-20261013` was removed locally/remotely after its reviewed `eb202b2`
> tree matched the squash. Both lane branches remain tied to protected worktrees; no unpin/archive
> bypass or worktree/brief deletion occurred. All existing evidence, tags and fixtures stay.
>
> Fresh production: Worker `73493517-2006-4beb-bf7c-cdb1edf298fd` at 100%, three cache-busted SPA
> entries `assets/index-C1EvvyLa.js`, served SHA-256 `9c8ac2825d5c5a2cf17be7b831949e6e60fbac192f1388a5cb9573882a25bb95`.
> SPA/health 200; unauthenticated classes 401; remote D1 has no migrations pending. Application
> source diff from `4fd1ecd` is empty, so no deployment was needed or performed.
>
> Apple fixture and open investigation handoff retained; the 5:18 cause is unresolved and diagnosis
> resumes only on explicit owner instruction. Completed cleanup handoff marked closed and kept for
> immutable audit links. Live finish-control breadcrumb moved intact in meaning to DEVELOPMENT_PLAN;
> INBOX drained. No product change, new hearing claim or further production data cleanup.
> [Close receipt](../docs/audits/session-close-2026-10-13/receipt.json).


> **Session cleanup 2026-10-13 — both passes complete; records on the cleanup branch.**
> Owner-authorized #522 squash is `9625ef9`; full post-main CI `38444410636` passed, and local,
> origin and GitHub main matched. First pass removed the #521/#522 publication branches locally
> and remotely after exact head/tree checks, plus three named temporary PR/preservation files.
> No production fixture deletion occurred in that pass.
>
> Second pass retires the superseded root deployment, native-zoom and orchestrator handoffs locally
> after routing their remaining obligations. Exact SoundCloud QA class
> `91c94386-5816-48f5-91aa-61e874abb05b` was freshly verified as owner-access/qa-fixture, one track,
> no description, track notes, cues, moves or sections. After final action-time owner confirmation,
> deleted through the normal UI. Authenticated re-read at `2026-10-13T19:26:51Z` returned 404;
> the class disappeared from the library. Retained Apple class returned 200 with all ten tracks
> and the same content fingerprint as before deletion. The content fingerprint covers class
> identity/title/tags/description and run-payload tracks/sections, excluding recency timestamps.
>
> Apple QA `75b7af90-141f-4f56-b02b-0bdd2c1c9dfe` and the open investigation handoff remain;
> original Apple 5:18 initiating cause is unresolved. All existing evidence, protected lane worktrees,
> briefs/branches, tags and other authors' handoffs are retained. SoundCloud hearing evidence
> remains immutable. No product/API/schema/config changes, playback or deployment.
> [Cleanup record](../docs/audits/session-cleanup-2026-10-13/README.md).
> Owner authorized the cleanup-record commit; push, PR and merge remain separate.
> The cleanup handoff holds publication state; the receipt preserves fixture-verification capture state.


> **Scoped Apple investigation 2026-10-13 — not reproduced in fresh visible session.** Owner
> approved attended diagnosis with code/deployment/cleanup separate. Exact retained Apple QA
> class ran naturally from Abracadabra to Bad Romance; owner confirmed normal audio through 6:34
> and silence after intentional agent Exit. No Pause/seek/Next/Retry. Planned 6:00 stop overshot
> by 34 seconds; actual timing retained. Five temporary SDK/visibility listeners removed afterward.
>
> 243 periodic observations and 18 SDK events, no sampled recovery or mediaPlaybackError. The
> 5:05–5:40 window has 35 playing/progress observations with max gap 1.027 s. The entire run has
> inter-chunk gaps up to 105.104 s; SDK event recording stayed installed. All recorded observations
> reported visible/focused. Chrome reopened after interruption; reduced UA reports Chrome 155.
> No old-version/focus comparison or background/lock/device test. [Evidence](../docs/audits/apple-recovery-investigation-2026-10-13/README.md).
>
> Source shows fail destroys the adapter and calls MusicKit.stop(); the prior post-alert paused
> SDK reading cannot establish initiating cause. Original 5:18 cause remains open; no code fix
> justified by this negative controlled run. Next proposed condition: attended same-session
> background-tab comparison with event-only recording to reduce observer effects.
> Worker remains `73493517` at 100%, loaded SPA `index-C1EvvyLa.js`; source unchanged. Both QA
> fixtures and protected lane worktrees/branches remain. #521 delivery is complete at `26158c4`,
> post-main CI `38420265392` passed. No new deployment or cleanup.


> **Attended acceptance follow-up 2026-10-13 — SoundCloud complete; later Apple stop open.** After
> the confirmed clean Apple handover, a separate recovery appeared at Live 5:18 / Bad Romance.
> Official MusicKit getters reported not playing, item Bad Romance/time 2 s. Steven was not
> listening at that moment; cause/audible result and attribution are unknown. No agent retry/seek/
> Next or product change. Steven subsequently confirmed Apple Exit, Builder return and sustained
> silence; SDK after Exit was not playing, time 0/no item. The earlier clean audio result stands,
> but overall uninterrupted Apple playback/stability is not accepted from this run.
>
> Steven separately confirmed SoundCloud public-widget audible start, pause silence/held clock,
> resume from paused position with clock progress, and Exit silence/Builder return. Post-Exit DOM
> has no iframe. [Full attended record](../docs/audits/provider-acceptance-2026-10-13/README.md)
> preserves both owner PNGs and distinct agent UI/SDK evidence. Both named fixtures remain;
> investigation of the later Apple stop, real iPhone and scoped UI follow-ups remain open.
> No additional deploy, fixture deletion or account reconnection.


> **Attended Apple acceptance 2026-10-13 — deployed #518/#519, partial.** Steven confirmed browser
> authorization, audible Abracadabra start with advancing clock/no recovery, and a clean natural
> handover to Bad Romance in the exact retained Cycle QA class. The agent did not seek or press Next.
> Steven also reported a momentary notification just before the next song began; his original PNG
> shows Waiting for music / Teaching position held at 3:43, track 2. Later DOM observation shows
> normal teaching track 2 at 4:00 with the banner cleared. No measured banner duration or
> message-free transition claim. Source maps the panel to provider preparation/buffering before
> confirmed progress; its presentation is recorded as a scoped UX follow-up without code changes.
>
> [Attended evidence](../docs/audits/provider-acceptance-2026-10-13/README.md) preserves exact human
> reports and screenshot. Apple Exit silence and all SoundCloud audible checks remain pending; no
> untouched full-class, fresh Pilates or real-iPhone run claimed. Worker remains `73493517`, SPA
> `index-C1EvvyLa.js`, source `4fd1ecd`. No fixture deletion or additional deployment.


> **Deploy 2026-10-13 — Builder / Live #518/#519.** Owner-approved application main `4fd1ecd`
> deployed as Worker `73493517-2006-4beb-bf7c-cdb1edf298fd` at 100%, completed
> 2026-10-13T14:23:43Z. SPA `assets/index-C1EvvyLa.js`; immediate rollback Worker
> `9563d726-bc4d-44f7-834a-d7dbcc388d19`. No migrations pending or applied; no rollback or
> secret/config changes. Application diff from the preceding deployed source `6eeccc0` is exactly
> Dashboard.tsx / LiveMode.tsx and their two test files; API/provider/playback-runtime unchanged.
>
> All 501 source hashes still matched the full twelve-step local gate (web 1184, API 486,
> music 30, integration 184). A fresh web build reproduced the prepared SPA and served JS hash.
> After manual Mac unlock and Chrome restart, 75 local browser observations completed a measured
> 12-surface × 5-width matrix plus native 200% and dialog inert/focus trapping/return. Completion
> was synthetic in prompter-only mode; no human-audible or real-device claim.
>
> Post-deploy: new Worker identity checked independently; three consecutive cache-busted SPA
> entries matched on the first settle attempt; served JS hash agrees; eleven HTTP probes and six
> health security headers passed. Generic unauthenticated 401 confirms protection, not mounting.
> Authenticated retained Apple QA class/track loading, prompter-only Live Cue/List at 390×844,
> list/Exit/Builder return at 320×568 passed. The browser initially loaded the old cached SPA;
> the prompted Reload now path switched it to the new asset. No class content edits or deletions.
>
> [Deployment/browser packet](../docs/audits/deployment-preflight-518-519-2026-10-13/README.md) and
> [publication PR #521](https://github.com/steven-crosby/ritmofit-web/pull/521). Human Apple
> authorization/listening and SoundCloud audible acceptance remain open; the named Apple QA
> preflight is parked without starting audio. Real iPhone and the existing tab arrow-key gap remain
> separate. Partial cleanup from October 12 is unchanged: verification branch removed; two managed
> lane archives refused because pinned/protected. Their branches/briefs and both listening fixtures
> remain preserved.


> **Preflight/publication and partial cleanup 2026-10-12 — #518/#519.** Owner approved deployment,
> Git publication, cleanup and guided human audible checks. The application candidate remains
> `4fd1ecd`; all twelve local gates and Worker dry run passed, with explicit partial browser smoke.
> Refreshed production remains Worker `9563d726-bc4d-44f7-834a-d7dbcc388d19` at 100%, three
> cache-busted SPA entries `assets/index-DyruxT0m.js`, no remote D1 migrations pending and
> `BETA_ALLOWED_EMAILS` present by name. No deployment occurred; Mac unlock or an explicit
> browser coverage disposition is still needed. Human audible acceptance stays open.
>
> [PR #521](https://github.com/steven-crosby/ritmofit-web/pull/521) publishes the
> [preflight packet](../docs/audits/deployment-preflight-518-519-2026-10-12/README.md) and handoff.
> Finished verification branch `codex/verification-zoom-provider-20261012` was deleted locally and
> remotely after exact head/merged-PR checks and full-tree equality between `a4c909d` and #520's
> squash `4fd1ecd`. Both managed lane archive calls were refused because they are protected by a
> pinned task or workspace; the worktrees, both lane branches and briefs remain. No bypass, fixture
> deletion or unrelated cleanup occurred. Tags and local smoke state are
> preserved; [cleanup receipt](../docs/audits/deployment-preflight-518-519-2026-10-12/cleanup-receipt.json).


> **Deploy 2026-10-11 — main as one batch (#495 through #513).** Owner approved deploying current
> `main` at `6eeccc0` as a single batch after choosing an all-of-main preflight over the two-batch
> release proposal. Worker `9563d726-bc4d-44f7-834a-d7dbcc388d19` at 100%, created
> 2026-10-11T22:01:47Z. SPA `assets/index-DyruxT0m.js`. Rollback Worker
> `5f67d242-8956-42b7-9318-67b2797d3454` (#494, SPA `assets/index-mZ1ypG4t.js`). No rollback
> performed.
>
> Ships #495/#499 (Apple catalog and library pagination guards, `packages/music/src/apple-music.ts`),
> #501 (first post-gap transport read, `lib/playback/runtime.ts`), #503/#504 (Builder and Live
> clarity), #506/#507 (choreography and song-picker draft integrity), #509 (zero inspector anchors),
> #512 (inspector errors announced on the field), and #513 (Live/Connections error messages). #498
> is tests only. Provider, playback-runtime, and web changes shipped together by owner choice,
> against the runbook default of shipping provider changes alone. No schema, migration, API,
> shared-contract, OpenAPI, configuration, dependency, or secret change.
>
> Pre-deploy on `6eeccc0`: full twelve-step local gate passed (web 1148, API 486, music 30, Worker
> integration 184; OpenAPI no drift; contract parity and audit pass); main CI `38178407528` passed.
> Remote D1 migration list reported nothing to apply, immediately before deploy. `BETA_ALLOWED_EMAILS`
> present by name. SPA built fresh before the Worker deploy.
>
> Post-deploy smoke: SPA entry matched the build on three consecutive cache-busted fetches after
> two retries (about 20 seconds); `/` 200, health 200, classes/explore/teams 401 unauthenticated;
> security headers present; entry asset and `sw.js` 200; unauthenticated probes of provider search,
> class track import, cues, and provider connections returned 401 (auth runs before routing, so
> this does not by itself prove each route is mounted). Not done: authenticated checks, the local
> browser smokes, Apple browse/import, a real SoundCloud transport check for #501, and any audible
> playback on the new build — these are owed with the owner present.
>
> Desktop acceptance basis: the owner accepted an attended Cycle transition spot-check on the
> previous build (#494) earlier the same day and ruled Pilates covered by it
> ([record](../docs/audits/apple-natural-acceptance-2026-10-09/README.md)). No untouched natural
> run was performed on either build.

> **Cleanup 2026-10-11 — zero-anchor round archived; exact merged branches removed.** After explicit
> owner approval, the managed `builder-zero-anchors` worktree was recoverably archived. Its recovery
> ref `refs/codex/snapshots/23fb169b941a0a0046ab593a2e536f15a5833cc3` retains commit `7d0240c`, whose
> complete tree equals #510's squash `912433f`. Both PR attachments are retained with the archive.
> Local/remote `codex/r20261010b-builder-anchors` and `codex/close-anchors-session-20261011` were
> deleted only after matching their tips to the recorded squashes on main; absence was verified.
>
> Both original Claude briefs moved byte-for-byte from untracked daily scratch into
> [historical evidence](../docs/audits/builder-anchors-2026-10-11/lane-briefs/README.md).
> [The cleanup receipt](../docs/audits/builder-anchors-2026-10-11/cleanup-receipt.json) records hashes,
> recovery identity, ref deletion, and preservation checks. The other four worktrees'
> HEAD/status/untracked bytes or symlink targets, and pre-existing tags, match the baseline.
> No release candidate, older worktree, production fixture, or other author's handoff was removed.
> #510 final main CI `38148374555` passed at `912433f`; this follow-up changes documentation only.
> No deployment, remote migration, secret change, or provider playback occurred.


> **Session 2026-10-11 — zero-anchor round merged; production unchanged.** [#509](https://github.com/steven-crosby/ritmofit-web/pull/509)
> squash-merged as `4412c3c6231e9b8bfa6dad831c6100421c3adc04` after explicit owner merge approval and
> [reviewed-head CI 38145254535](https://github.com/steven-crosby/ritmofit-web/actions/runs/38145254535)
> passed on `1050a7a`. [Post-merge main CI 38147699980](https://github.com/steven-crosby/ritmofit-web/actions/runs/38147699980) passed on `4412c3c`;
> the complete squash tree equals the reviewed tree. The inspector accepts
> `0:00` for clip start, downbeat, and free-timeline Start at; untouched fields preserve exact stored
> milliseconds. Sixteen new inspector tests and the full local gate pass (web 1137/API 486/music 30;
> integration 184). [Evidence](../docs/audits/builder-anchors-2026-10-11/README.md) retains baseline
> failures, passing results, and source hashes.
>
> The Live lane closed without code edits: five synthetic 375×812 variants passed at zero scroll.
> Next truncation and count/section/hold pressure at shorter heights remain parked for real-iPhone
> investigation. The OD-02 decision/design-system wording conflict is documented without changing
> hierarchy. [Live evidence](../docs/audits/live-glance-2026-10-11/README.md) retains fifteen screenshots.
>
> Primary main fast-forwarded safely. Fresh read-only production checks at 2026-10-11 14:33 UTC
> confirmed Worker `5f67d242-8956-42b7-9318-67b2797d3454` at 100% and three consecutive SPA entries
> `assets/index-mZ1ypG4t.js`, matching the recorded #494 baseline. No deployment, remote migration,
> secret change, provider playback, or fixture mutation occurred. Listener availability remains
> pending. This round's branches/worktree and Claude briefs are retained; no general cleanup
> or deletion authority is inferred from merge approval.


> **Close-session 2026-10-09 — merged records reconciled; Git cleanup authorized.** #497
> squash-merged as `46c2593` after exact-head CI `37949861335` on `bea5f88`; post-merge main CI
> `37950232324` passed. The tested and merged trees matched, and local main fast-forwarded safely.
> Completed remote branches for #503, #504, and #497 were removed after matching their merged PR
> head identities. The unreleased Apple provider candidate `0afa5c8` remains retained.
>
> Retired ten superseded handoffs after routing their pending acceptance/release work to the
> [current handoff](https://github.com/steven-crosby/ritmofit-web/blob/0eeddc5f7f528880aafe0436bac8834ab8caa10e/ritmofit_dev_plan/handoffs/2026-10-09-ux-close-acceptance.md) and release proposal. Historical
> merge facts: #494 `e712274` (deployed), #495 `8dc2e24`, #496 `c5fe7aa`, #498 `423218a`,
> #499 `5aaa8c5`, #500 `6460182`, #501 `c953aa5`, #502 `aade146`, #503 `be6d71a`,
> #504 `0ec1d10`, and #497 `46c2593`. Detailed original tests, limitations, and source identities
> remain in [the immutable pre-cleanup handoff snapshot](https://github.com/steven-crosby/ritmofit-web/tree/46c2593fe518585d54a31c739210aa2b9255575a/ritmofit_dev_plan/handoffs)
> and the retained UI evidence packets. Worktree archival is presently blocked by the pinned chat;
> the author requested temporary unpinning/restoration.
> No deployment, playback, remote migration, secret mutation, or production-fixture deletion
> occurred during this close; the prepared classes remain unplayed.

> **Session 2026-10-09 — Builder/Live clarity merged, production unchanged.** #503 squash-merged
> as `be6d71a8a63494863ac03b14f20de0d0c92888fc` after reviewed-head CI on `50b61fc`
> ([37894990070](https://github.com/steven-crosby/ritmofit-web/actions/runs/37894990070)); post-merge
> main CI [37895313770](https://github.com/steven-crosby/ritmofit-web/actions/runs/37895313770) passed.
> Native Chrome merge review found disabled rename controls blurring keyboard focus to BODY;
> the correction covers success/rejection and relinquishes ownership after unrelated focus.
> Seven additional regressions, 113 focused tests, native delayed-response checks, and the full
> gate passed. #504 integrated that main without history rewriting, passed 197 combined focused
> tests and exact-head combined CI on `8023d74`
> ([37895737330](https://github.com/steven-crosby/ritmofit-web/actions/runs/37895737330)), and
> squash-merged as `0ec1d1009c33a128150fbd58c36bf283f1f485da`. Both squash trees matched their
> tested candidates. No API/schema/migration/auth/provider/runtime change in these UX slices.
>
> The integrated local browser audit on candidate `8023d74` exercised Builder → Run without music → Live →
> Builder with synthetic data and mocked APIs. Desktop, 390/320px portrait, short landscape,
> and 600×304 CSS viewports passed closed/open page and Live-shell overflow checks, disclosure
> focus/view reset, sparse-track handling, and return to Builder. These are UI checks, not
> authenticated provider or listening acceptance. Retained evidence:
> [integration audit](../docs/audits/ux-clarity-2026-10-08/integration-audit/README.md).
>
> Current production was rechecked as Worker `5f67d242-8956-42b7-9318-67b2797d3454` at 100%,
> with three consecutive SPA entries `assets/index-mZ1ypG4t.js`, the recorded #494 release.
> No deployment, remote migration, secret change, fixture deletion, or branch/worktree cleanup
> occurred in the UX round. Main remains ahead by #495/#499/#501/#503/#504 application changes.
> The #497 historical deployment record below is reconciled against this newer state rather than
> replacing it. Natural desktop/iPhone acceptance and exact release decisions remain open.
> Fresh owner-approved Cycle and Pilates fixtures were prepared through Apple saved-playlist import
> on 2026-10-09, named `[QA] Apple natural acceptance 2026-10-09 Cycle` / `Pilates`, and tagged
> `qa-fixture`; each displays ten tracks and 39:50. IDs and unstarted status are retained in the
> [acceptance receipt](../docs/audits/apple-natural-acceptance-2026-10-09/README.md). No audio started,
> no existing class was changed, and no fixture was deleted. Remote D1 migration list returned
> 7403 once, then no migrations to apply on retry; no migrations were applied.


> **Deploy 2026-10-07 — PR #494 Apple Music zero-pause endpoint cache.** Owner approved a #494-only
> release from local `main` at `e712274f8b0add74755bc97accff42f44405260f`, deliberately behind
> `origin/main` (`c5fe7aa`, which also contains #495 and #496). Worker
> `5f67d242-8956-42b7-9318-67b2797d3454` at 100%, created 2026-10-08T02:50:44Z (about 8:50 PM MT).
> SPA `assets/index-mZ1ypG4t.js`. Rollback Worker `18fe76cd-5273-4cd0-beae-d01b0a307693` (#488,
> SPA `assets/index-CFcewXzm.js`). No rollback performed.
>
> #494 changes the Apple Music web adapter and its tests: cache an endpoint only when
> `positionMs > 0`, so a MusicKit pause at 0 before `ended` no longer replaces the real playhead.
> `runtime.ts` is unchanged. A comment-only `SegmentBand.tsx` wording change from #489 rides along.
> No schema, API, migration, shared-contract, OpenAPI, configuration, or secret change. #495
> (Apple library pagination cycle guard) was not deployed.
>
> Pre-deploy: main CI run `37640210172` passed on `e712274`. The full local gate was not re-run
> this session. Remote D1 migration list failed once with Cloudflare `7403`, then reported no
> migrations to apply. `BETA_ALLOWED_EMAILS` is present (name only). SPA rebuilt from this SHA
> (`assets/index-mZ1ypG4t.js`); service-worker `navigateFallbackDenylist` still excludes `/api/`.
>
> Post-deploy smoke: SPA, health `{"status":"ok"}`, and unauthenticated classes/explore/teams
> returned 200/200/401/401/401. Security headers present (HSTS, CSP, Permissions-Policy,
> Referrer-Policy, X-Content-Type-Options, X-Frame-Options). Shares, playlist import, provider
> search, track import, cover upload, and tags reached their handlers (401). A missing cover
> returned the public handler's `NOT_FOUND` / "Image not found." Spotify callback redirected
> to `/?error=state_missing` (302), not a router 404. Six consecutive cache-busted fetches of `/`
> agreed on `assets/index-mZ1ypG4t.js`. `wrangler deployments status` shows version
> `5f67d242-8956-42b7-9318-67b2797d3454` at 100%.
>
> Natural desktop Cycle/Pilates listening acceptance was not run. It is the next step, on this
> production build.


> **Session 2026-10-06 — DEVELOPMENT_PLAN consolidation (docs only).** The plan's dated
> "Current operating focus (2026-10-04)" bullet and its pre-2026-10-06 "Backlog / Open Items" section
> were replaced by a short "Now" block and a curated backlog. Their full text is preserved verbatim
> below so no context is lost; every deploy fact in it was already recorded in the entries that
> follow. Not a deploy; production state unchanged and not live-checked from this session.
>
> <details><summary>Moved text — "Current operating focus (2026-10-04)"</summary>
>
> - **Current operating focus (2026-10-04):** the Live zoom fix (#486) and natural
>   song-end precision fix (#484) are deployed. Released source is
>   `efd542b88552d29c94d7b0edad484f29f244d20c`, Worker
>   `1053f665-ebf1-4d8c-be40-16ddfdea908f`, SPA entry `assets/index-B8JJicuF.js`;
>   remote D1 has no pending migrations. Production Chrome at actual 200% zoom
>   measured 600×304 CSS pixels: current/Next guidance, compact timecode, transport,
>   view/Exit controls, and waiting recovery remained reachable. Full List retained
>   the entire manually authored long QA cue and kept controls visible at its bottom.
>   The natural Apple Music first-song transition **failed again at 3:43** in the
>   fresh Cycle QA fixture: music ended before the saved playback window. Teaching
>   time held and failure recovery remained visible. Full uninterrupted Cycle/Pilates
>   classes and audible acceptance remain unverified. Spotify testing
>   stays paused; iPhone and HIIT testing remain outside this desktop follow-up.
>   **Next step:** capture the Apple adapter’s final state/position/duration and
>   finish-event ordering, propose a regression-backed boundary fix without weakening
>   genuine early-end protection, then repeat natural desktop playback acceptance.
>   The later product decision is the editable playlist-derived teaching draft and Classes/Music creation
>   policy using the [audit and restart guide](../docs/audits/playlist-to-live-2026-10-03/NEXT_SESSION.md).
>   Empty blocks still disable Run live. No teaching-draft implementation, readiness
>   change, schema/API choice, or 15-song cap is authorized by this release.
>   See [`HISTORY.md`](./HISTORY.md).
>   Earlier #465 previews a recipe's exact blocks in the
>   create dialog and cleans up block guidance text. The recipe content review is resolved
>   and deployed (#470): new classes get `cycle_*_v2` (easy valley before a shorter
>   peak) and `hiit_45_v2`/`hiit_60_v2` (4-minute finisher at every length); v1 recipes are
>   frozen by a snapshot test. The block editor's first slice (#463)
>   edits planned block time and HIIT rounds/intervals inline, keeps the class
>   target fixed, and shows the target gap and any HIIT mismatch. PR #467 added
>   label, intensity, goal, and focus editing. Deployed PR #468 completes scaffold-block
>   add, reorder, and empty-block delete. See
>   [`class-template-handoff.md`](./class-template-handoff.md) for the settled rules.
>   **SPC-09 remains pending:** design the API signals that separate permission from
>   provider-error before adding those UI states.
>   PROD-HYGIENE is complete: four owner-confirmed fixtures were tagged and deleted
>   2026-09-28 (see [`HISTORY.md`](./HISTORY.md)). Full Pulse Check disposition lives in
>   [`docs/audits/studio-pulse-check-2026-09-13/run-decisions.md`](../docs/audits/studio-pulse-check-2026-09-13/run-decisions.md).
>   **Prior Pulse Check deploys:** batch 2 PRs #420, #422 — Worker
>   `5d659102-3bff-4398-91ad-cdc1d165ccc1` from main `dd625b5` (recorded in #423);
>   batch 1 PRs #412, #414, #415 — Worker `edaa62b0-8957-486c-b953-24eae2b0fd33` from
>   main `38f8526` (recorded in #416), from the same-day [Studio Pulse
>   Check](https://claude.ai/code/artifact/28aaf27a-434f-46c5-a163-f301c0ab2238) live UX
>   audit (Intensity picker P0, AUTH-A11Y + OD-01, SOURCE-ARTWORK).
>   Prior deploy: **PRs #401–#403, #406** — Worker `c77ba5c9-0ea2-43d4-8272-b98a1ac1d3e7` from
>   main `4031d5b`. Playback-liveness `classify()` now lets provider transport win over a
>   zero-tick host rAF loop instead of short-circuiting to a false `host_stalled` verdict
>   (`host_stalled` removed from `LivenessVerdict`); hono bumped to `4.13.7` (patches three
>   moderate GHSAs) with an unused `better-auth`→`vitest` peer stripped; the signup screen no
>   longer claims invitation-only copy in open-access mode (`Login.tsx` eyebrow/footer now
>   follow the same `inviteOnly` flag, #406); plus session-prompt doc tightening. Observer
>   remains inert (still observe, never alert, never call `fail()`). No schema, migration, or
>   shared-contract change; no remote D1 change. The six
>   2026-07-24 design-audit implementation slices already landed
>   and shipped (2026-07-27); they are not current work. Remaining owner calls: the
>   alerting half of playback liveness, and F-02 (D11 `createPattern`, still unconfirmed).
>   The class-cover decision is resolved (title-on-art, #454, deployed 2026-09-27). The product track remains the **D21 creator-workstation-shell
>   slice** — the first slice (Cycle/Pilates/HIIT templates,
>   readiness + discovery resting state, provider shelves) is deployed; the **saved-playlist browsing
>   sub-slice is now implemented and deployed (Worker `ded27a07`)** (new `GET
>   /providers/:provider/playlists` + `GET /providers/:provider/playlists/:playlistId/tracks`
>   endpoints; TrackSearch "Saved playlists" mode with per-playlist drill-in, individual track
>   preview/add, and "Import all N" bulk-import; resting shelf cards show live playlist counts and open
>   `PlaylistBrowserDialog` to create a class from any playlist; all three providers integrated —
>   Spotify OAuth, SoundCloud OAuth, Apple Music Music-User-Token). Alongside the
>   **provider-authorized playback initiative**. SoundCloud, Apple Music, and Spotify Web Playback SDK
>   adapters are now registered and live-verified for Builder clip-window preview (`TrackPreview.tsx`,
>   manual/single-track/no-auto-advance) and Live Mode. The **2026-07-06 batch made the player usable
>   across all three providers**: SoundCloud plays via the public Widget without a live connection,
>   Apple Music `authorize()` recovers instead of freezing, Spotify plays in-app for Premium users via
>   the official Web Playback SDK, older Spotify connections missing playback scopes surface a reconnect
>   action, and Spotify-only tracks can still be **resolved cross-provider** to a playable equivalent.
>   Teams, Sharing, Publish, and Explore stay hidden/dormant (D20). The **2026-07-07 workstation-shell
>   consolidation** then unified primary navigation to the four locked destinations — **Classes, Music,
>   Live, Account**: Music is a first-class provider/source workspace (saved-playlist *and* liked-tracks
>   browsing on its shelves), Live is a runnable-class queue with preflight readiness, and Account is an
>   in-page settings workspace (Profile, Preferences, Music Connections, Security). Liked-tracks browsing
>   (browse likes → create a class from likes) now appears in both the Classes resting state and the
>   Music workspace via a shared provider-browse hook. Earlier production application code
>   included the 2026-09-23 #450 Worker `b4ac663d` from `c2dbd75`, preceded by
>   the 2026-09-23 #440/#443–#448 Worker `4f5cfb73` from `c5531a0`, then
>   the 2026-09-19 #438 Classes-home Worker `b4a99062` from `54c3bf7`, then
>   the 2026-09-19 #429 Worker `3b39fac6` from main `51a6ade`, then the
>   2026-09-17 #417/#418/#419/#424/#425 Worker
>   `ad638215-6758-498c-8782-522e23a6d942` from main `4ddddeb`, then the 2026-09-13
>   #420/#422 Worker
>   `5d659102-3bff-4398-91ad-cdc1d165ccc1` from main `dd625b5`, then the 2026-09-13
>   #412/#414/#415 Worker `edaa62b0`, then the 2026-09-13 #406 Worker
>   `c77ba5c9-0ea2-43d4-8272-b98a1ac1d3e7` from main `4031d5b`,
>   and before that the 2026-09-13 #401–#403 Worker `8a6318e4-1f32-4c47-8651-6cde7416b9ca` from main `37c437d`,
>   and before that the 2026-09-06 #399 Worker `5ae8b540-ffe6-45cc-98a8-c82e5c3caa31` from main
>   `b340ddf`.
>   Earlier trail (not current alignment; deployment checkout `dc998dd`, application source
>   `68dfc27`, 2026-07-16): all-harden round 19 (#322–#324) is deployed in Worker
>   `9d144446-bd89-4792-9fda-64220eb122b9`, serving SPA asset `assets/index-BoLBQItP.js`; there was no
>   schema/migration change. The release fails closed on malformed later Apple saved-playlist pages,
>   refreshes class recency after non-empty playlist URL imports, and fails closed during racing Live
>   connection refreshes. The preceding mixed round 18 deployment was Worker
>   `85b139e3-981d-44a5-b3ff-29389d1e8ce4` from main `79be29c`. The preceding mixed round 17 deployment was Worker
>   `de9f5cc5-f697-4f40-89e3-a9ba5e48b37b` from main `31fbba1`. The preceding private-beta hardening deployment was Worker
>   `b4449c8d-5978-4298-9c6e-e222791a208f` from main `115b003`. The invite-only beta deployment was Worker
>   `2b390842-8f71-4086-a59a-6ea3050d4882` from main `3e21611`. The preceding deployed all-harden
>   release was Worker `4e009966-6a4c-47ef-8994-c88aa6613680` at `ad53541`: public-cover auth-contract
>   repair and class-copy OpenAPI correction (#297), strict Apple playlist pagination failure handling
>   (#298), mutually exclusive saved-playlist add actions (#299), and the clipped-placement
>   duration-shrink guard (#300). The prior coherent code deployment was
>   **2026-07-12 (Worker `a83a71d2`)** — twelfth parallel lane-agent round (mixed polish/harden,
>   THREE-lane round, D21 loop): three disjoint-lane slices — bound Spotify catalog `getPlaylist` paging
>   to 500 tracks (#288, BE); bound `offsetMsSchema` to `MAX_DURATION_MS` (#289, BE); and focus
>   management for adding tracks and inspector (#290, FE) — **no schema/migration** (supersedes `1a6c1d5a`).
>   The **eleventh parallel round (2026-07-11, polish-led mixed, D21 loop) deployed prior
>   (Worker `1a6c1d5a`, superseding `b0d0fe54`)**: return focus after removing a track (#286), surface
>   playback-reconnect state in Connections (#285), cancel pending provider purge on reconnect (#284),
>   and return 422 for an inverted clip window (#283) — **no schema/migration**.
>   The **ninth parallel round (2026-07-11, all-feature, D21 loop) deployed earlier the same session
>   (Worker `209a2a13`, superseding `b883cae9`)**: dragged track starts snap to the preceding track's
>   beat grid in free mode (#274), whole-class copy carries `timelineMode` + authored free-mode offsets
>   (#273), and playlist import-by-URL reaches parity — SoundCloud and Apple Music catalog playlists
>   join Spotify, with `providerCapabilities.playlistImport` now true for all three (#275) — **no
>   schema/migration**. Round-9 live provider checks (real SoundCloud/Apple catalog playlist-URL
>   imports, Apple library-link 400) remain owner-pending. For deployment chronology see
>   [`HISTORY.md`](./HISTORY.md), newest first; determine current production state with the independent
>   Worker-version and SPA-hash checks in [`deployment-runbook.md`](./deployment-runbook.md).
>
> </details>
>
> <details><summary>Moved text — "Backlog / Open Items" as of 2026-10-04</summary>
>
>
> **Live zoom checkpoint (2026-10-04):** #486 merged as `eeec377add5294850a78334ef120374f26f23e14`
> and shipped in Worker `1053f665`. The full local gate and exact-commit CI passed. Production
> Chrome at actual 200% zoom (600×304 CSS pixels) passed cue/Next visibility, compact timecode,
> Full List text retention and bottom scrolling, persistent transport/view/Exit controls,
> keyboard Exit, waiting recovery, and a real natural-boundary failure panel. Local fixtures also passed at 320×304 CSS pixels and
> cover asynchronous readiness focus and failure recovery. This does not establish phone or
> full-class provider acceptance. Run-live readiness, teaching-draft policy, and playback
> behavior are unchanged by #486.
>
> Forward work lives in the solo creator loop. The **creator-workstation-shell slice (D21)** — discovery
> shelves, liked/saved cards, playlist browsing, Cycle/Pilates/HIIT template narrowing, and the unified
> Classes / Music / Live / Account navigation — **shipped 2026-07-07 (Worker `9d0a5710`)**. Provider-authorized
> playback for all three providers shipped 2026-07-06. Historical
> web launch deferrals remain in [`web-launch-readiness.md`](./archive/web-launch-readiness.md); the old
> cross-surface parity record remains in [`web-ios-parity.md`](./web-ios-parity.md), but it is not the
> current planning queue.
>
> **Music-led implementation planning (2026-09-30):** [D24](./decisions.md#d24--music-drives-creation-and-instruction-until-the-instructor-chooses-otherwise-resolved-2026-09-30)
> records the owner's decision: music drives class creation and instruction until the instructor
> explicitly chooses otherwise. Real-iPhone recordings exposed connection friction and silent Apple
> Music preparation while teaching time advanced. The [phased workflow plan](./music-led-instructor-workflow-plan.md)
> proposes connection/playback reliability and honest readiness first, mobile teaching/editing clarity
> next, then Builder speed/rehearsal and timed exercise steps. Phase 1 implementation is authorized, starting with 1A;
> release remains separately gated. SPC-09 remains open; replacing it as the next implementation focus
> is approved for Phase 1. Connection recovery (1A), the music-authoritative Live clock (1B), and truthful preflight with explicit Apple browser authorization (1C) were deployed on 2026-10-02 (#478, Worker `e4744ca1`). The dated first-round results are in the [acceptance record](../docs/audits/music-led-phase-1-acceptance/README.md): Apple Music was audible on the owner’s Mac test build, while iPhone Safari failed or hung. These observations do not establish acceptance of the October 4 release (#486). Real-device audible playback and interruption acceptance remain. Later phases await approval.
>
> **Spotify tabled (owner decision, 2026-10-02):** Spotify work and Spotify acceptance testing are
> paused until UI/UX and Live playback with Apple Music are completed and hardened. Spotify stays
> connected in the product but is not a release gate, and no Spotify-specific readiness claim should
> be made meanwhile. Known open item when it resumes: the connected Spotify account is rejected by the
> Spotify developer app ("The user is not registered for this application"), so every Spotify Web API
> call returns `403`.
>
> **Earlier iPhone investigation handoff (2026-10-02):** the proposed first check was to
> fully close the iOS Music app, reload Ritmo, and retry the Apple Music class. If the failure
> persists, use Safari Web Inspector to capture the MusicKit error at Start and Retry before
> choosing a web-adapter fix or native iOS playback plan. This remains unresolved; the October 3
> desktop audit and current focus above determine the next session’s immediate scope.
>
> **Class-building design direction:** The owner-approved
> [`instructor-class-score-blueprint.md`](./instructor-class-score-blueprint.md) sets the target for a
> simple run of show with optional precision editing and named timed exercise steps in rehearsal/Live.
> Its first proposed slice is a 20-minute HIIT interaction prototype and contract proposal; it does not
> change the current recipe catalog or authorize implementation.
>
> **Instructor benchmark (2026-09-29):** A benchmark of Ritmo's builder and Live against a Fitness+
> trainer's workflow and Struct Club, for the owner's household instructor. She teaches in person:
> Live on an iPhone for spin (portrait on the handlebars, glance-only, Apple Music over Bluetooth to
> the studio) and on an iPad for Pilates/HIIT, with classes built on a laptop. Scope is
> instructor-only. The evidence and findings are in
> [`docs/audits/instructor-benchmark-2026-09-29/evidence/`](../docs/audits/instructor-benchmark-2026-09-29/evidence/README.md);
> the full report is the owner's private artifact. This is findings only. It feeds the blueprint's
> prototype and authorizes no implementation. Open before any slice:
>
> - Verify Apple Music playback from web Live on a real iPhone for a full class: Bluetooth output,
>   screen locked and unlocked, one notification during playback. MusicKit on the Web docs don't
>   address iOS Safari. The result decides whether the phone surface is web Live or native iOS Live
>   (which has no playback today).
> - Ask the instructor what Struct Club's Live "Open" intensity means, and where she sees a
>   beats-remaining count. None of her Struct Club evidence shows one.
> - Ranked gaps in web Live and the builder:
>   - (P0) a portrait-first glance screen. Landscape shows no cue text, and a long cue hides Next and
>     its countdown.
>   - (P0) a class that finishes hands-free. One playback error stops music until someone taps.
>   - (P1) cue plus a per-cue note. This is a schema change.
>   - (P1) a beats-to-next-cue count. Beat 1 can only be set to a whole second today.
>   - (P1) builder speed: mark a cue at the playhead, copy a routine between songs.
>   - (P1) a real rehearse mode.
>   - (P2) discipline-specific effort words in Live.
>
> **Design-audit implementation (2026-07-24) — landed, not current work:**
>
> The `claude` design-audit run is delivered and **owner-approved**: 18 backlog items disposition
> `approve`, and PDR-01/02/03 resolved (teaching-readiness default ordering · Music owns sourcing ·
> group-and-demote in the move library). All six implementation slices **already landed** (PRs
> #370, #375, #377, #378, #379, #380) and shipped 2026-07-27. They are not the active queue.
>
> **Current application release (2026-10-04, after #486):** production serves released
> source `efd542b88552d29c94d7b0edad484f29f244d20c`. Application code is unchanged from
> merged `eeec377add5294850a78334ef120374f26f23e14`; the later #485/#480 merges contain
> only documentation. This includes Phase 1 (#478), ordered playlist-import recovery
> (#481), natural song-end precision (#484), and reachable Live teaching at 200% zoom (#486).
> Worker `1053f665-ebf1-4d8c-be40-16ddfdea908f` serves 100%; SPA entry
> `assets/index-B8JJicuF.js` matched three consecutive cache-busted fetches and the updated
> Chrome document. Remote D1 has no pending migrations. Rollback target:
> `1ae3e216-89a6-4bbd-aec0-38f01bc600ff`. All 12 local gate checks passed on the released
> source (1,528 unit tests and 184 integration tests). The paragraphs below retain the
> #481 verification and the October 3 audit that preceded #484/#486; their failures
> must not be presented as a test of the newly released build.
>
> **Historical #481 and October 3 audit evidence:** CI and the full local gate
> passed on that release. Desktop Apple Music imports passed for Cycle/Pilates through Music and Classes-to-empty-class. A
> controlled response-loss test recovered the original ten placements after reload,
> and both disciplines passed prompter-only transport mechanics with accelerated
> completion. The October 3 desktop audit resolved browser sign-in and observed
> provider transport progress, pause/resume, seek/skip, manual notes/cues, and recovery.
> Both natural first-song transitions failed at 3:43 with “Music ended before the saved
> playback window.” Full uninterrupted completion is blocked by that defect; audible
> output remains unverified. No iPhone, Spotify, or HIIT testing was performed in this
> audit. These smokes do not establish universally reliable playback. The Phase 1 acceptance
> scenarios remain in
> [`docs/audits/music-led-phase-1-acceptance/`](../docs/audits/music-led-phase-1-acceptance/README.md).
>
> The playlist-based automatic teaching draft remains a product gap: source order is
> preserved, but imports create no exercise blocks, generic cues, or notes. The Classes
> template path imports all songs into its first fixed block and leaves empty blocks
> that disable Run Live. Six tagged QA fixtures remain for review; IDs, screenshots,
> scenario verdicts, and the ranked fix sequence are in the
> [desktop audit](../docs/audits/playlist-to-live-2026-10-03/coverage.md).
> #470's v2 recipes remain deployed; a Worker rollback below `dd9a27e9` is unsafe once
> any v2-recipe class exists. The prior live Worker for this additive-migration
> release was `e4744ca1-11b0-4ad6-9382-ef8ad6f9b0a5`.
> See [`class-template-handoff.md`](./class-template-handoff.md). The alerting
> half of liveness remains an owner decision; F-02 (D11 `createPattern`) stays unconfirmed.
>
> - **Entry point:** [`docs/audits/claude-design-audit-2026-07-24/IMPLEMENTATION-KICKOFF.md`](../docs/audits/claude-design-audit-2026-07-24/IMPLEMENTATION-KICKOFF.md)
> - **Authority:** [`run-decisions.md`](../docs/audits/claude-design-audit-2026-07-24/run-decisions.md) —
>   the ledger, not any summary, is authoritative.
> - **Landed sequence:** [`implementation-sequence.md`](../docs/audits/claude-design-audit-2026-07-24/implementation-sequence.md).
>
> **Open production issues:**
>
> - None from the Studio Pulse Check P0. The Class Builder Intensity picker collapse
>   ([PR #412](https://github.com/steven-crosby/ritmofit-web/pull/412)) is merged and deployed with
>   AUTH-A11Y / OD-01 ([#414](https://github.com/steven-crosby/ritmofit-web/pull/414)) and
>   SOURCE-ARTWORK ([#415](https://github.com/steven-crosby/ritmofit-web/pull/415)) as Worker
>   `edaa62b0` (recorded in [PR #416](https://github.com/steven-crosby/ritmofit-web/pull/416)).
>   Batch 2 — LIVE-RUNTIME ([#420](https://github.com/steven-crosby/ritmofit-web/pull/420)) and
>   BUILDER-A11Y ([#422](https://github.com/steven-crosby/ritmofit-web/pull/422)) — is deployed as
>   Worker `5d659102` (recorded in [PR #423](https://github.com/steven-crosby/ritmofit-web/pull/423)).
>   Batch 3 — DESTRUCTIVE-CONTROLS ([#417](https://github.com/steven-crosby/ritmofit-web/pull/417)),
>   PROVIDER-TRUTH ([#418](https://github.com/steven-crosby/ritmofit-web/pull/418)),
>   RESPONSIVE-QA ([#419](https://github.com/steven-crosby/ritmofit-web/pull/419)),
>   semantic opacity ([#424](https://github.com/steven-crosby/ritmofit-web/pull/424)), and
>   LIVE-CONTROLS ([#425](https://github.com/steven-crosby/ritmofit-web/pull/425)) — is
>   deployed as Worker `ad638215` from main `4ddddeb`. LIVE-RUN-OF-SHOW
>   ([#429](https://github.com/steven-crosby/ritmofit-web/pull/429)) shipped as
>   Worker `3b39fac6` from main `51a6ade`. **Current production is Worker
>   `1053f665` from `efd542b` (#486); see "Current application release" above
>   for the live state.**
>
> **Studio Pulse Check follow-up — batches 1–3 shipped; remaining open slices:**
>
> The other 21 findings have an authoritative disposition in
> [`docs/audits/studio-pulse-check-2026-09-13/run-decisions.md`](../docs/audits/studio-pulse-check-2026-09-13/run-decisions.md).
> Nineteen map to the ten scoped slices below. Three owner decisions are now resolved: the two original
> decision findings plus SPC-14's later implement-versus-docs decision.
> The two
> out-of-scope/unverified audit claims were independently checked before disposition. This list is the
> planning queue; the ledger preserves the finding-by-finding evidence and acceptance boundaries.
>
> - **LIVE-RUN-OF-SHOW — ✅ shipped ([#429](https://github.com/steven-crosby/ritmofit-web/pull/429); Worker `3b39fac6`):**
>   closes the minimum live-running gaps identified from Steven's 2026-09-19 StructClub recording and
>   same-day production verification. First distinguish a dead/unembeddable SoundCloud reference from a
>   coordinator or widget-transition defect: initial SoundCloud playback and automatic track advance
>   succeeded, and SoundCloud's public oEmbed endpoint returned `404` for the failed “CHOOSIN TEXAS…”
>   reference while returning `200` for the other three tracks in that class. No coordinator patch was
>   warranted. The merged implementation adds large, keyboard-accessible previous/next **track**
>   controls to the existing player rail and a compact rolling choreography queue that keeps the
>   current event plus three upcoming cues/moves and their derived interval durations visible without
>   displacing the cue-first hero. Intervals derive from existing event anchors and the track
>   boundary; there are no persisted duration fields or run-payload changes.
>   Preserve preflight, prompter-only mode, recovery, wake lock, provider-authoritative playback, and
>   the official-provider-only music constraints. Verified with 800 web tests, 151 integration tests,
>   typecheck/lint/build/design-system/theme/contract/audit gates, and local browser checks at desktop,
>   390px, and 320px; no Spotify playback was initialized. Steven approved this slice ahead of
>   ENERGY-RIBBON and approved its scoped implementation plan on 2026-09-19. Deployed 2026-09-19 as
>   Worker `3b39fac6` from main `51a6ade`.
>
> - **AUTH-A11Y (SPC-01–04) — ✅ shipped:** redundant auth status cues, one password
>   contract, reveal controls, and announced mode transitions. Bundled with the OD-01 implementation
>   below in [PR #414](https://github.com/steven-crosby/ritmofit-web/pull/414); deployed as Worker
>   `edaa62b0` (recorded in [PR #416](https://github.com/steven-crosby/ritmofit-web/pull/416)).
> - **PROVIDER-TRUTH (SPC-06, SPC-08) — ✅ shipped:** Dashboard Music/Account
>   headers use the centralized caution tone for “Session expired,” and connection-state marks
>   move to the shared `ConnectionStateMark` icon system in
>   [PR #418](https://github.com/steven-crosby/ritmofit-web/pull/418); deployed as Worker
>   `ad638215`. **SPC-09 is the next planning objective (owner, 2026-09-28)** —
>   permission/provider-error still need a backend-signal design before UI work.
> - **SOURCE-ARTWORK (SPC-07) — ✅ shipped:** new shared `TrackArt` component
>   (deterministic warm-gradient tile keyed by BPM band, or a stable identity hash when BPM is
>   unknown — never intensity, since Library rows must not infer class intensity) replaces the bare
>   note glyph. The audit named 2 sites (`SourceList.tsx`, `ClassSummaryView.tsx`); `Dashboard.tsx`
>   turned out to have 4 more instances of the identical pattern (including the class-cover
>   `ArtCollage` zero-art case) that weren't cited — all 6 fixed together in
>   [PR #415](https://github.com/steven-crosby/ritmofit-web/pull/415); deployed as Worker
>   `edaa62b0` (recorded in [PR #416](https://github.com/steven-crosby/ritmofit-web/pull/416)).
> - **DESTRUCTIVE-CONTROLS (SPC-10) — ✅ shipped:** Dashboard class deletion uses
>   the documented destructive pattern (transparent fill, ember text, mandatory error icon) for both
>   the initial and confirmation controls in
>   [PR #417](https://github.com/steven-crosby/ritmofit-web/pull/417); deployed as Worker
>   `ad638215`.
> - **BUILDER-A11Y (SPC-11–13, 15) — ✅ shipped:** restore focus, normalize mutation errors, and
>   announce validation and inline confirmations in
>   [PR #422](https://github.com/steven-crosby/ritmofit-web/pull/422); deployed as Worker
>   `5d659102` (recorded in [PR #423](https://github.com/steven-crosby/ritmofit-web/pull/423)).
> - **ENERGY-RIBBON (SPC-14) — ✅ shipped ([#432](https://github.com/steven-crosby/ritmofit-web/pull/432); Worker `29a72e1c`):**
>   documented hybrid ribbon — track intensity is the staircase baseline; placed-move intensity at
>   `anchorMs` holds until the next scored move or the track end. ClassPulse uses the same spans. No
>   schema change. Segment banding stays deferred. A scored placed move takes the class out of
>   provisional auto-shape. Steven approved the direction on 2026-09-19. Deployed 2026-09-19 as
>   Worker `29a72e1c` from `b70ded1`.
> - **LIVE-RUNTIME (SPC-16, 18) — ✅ shipped:** coalesce drag seeking and isolate animation-frame
>   rendering without changing provider-authoritative playback/liveness behavior in
>   [PR #420](https://github.com/steven-crosby/ritmofit-web/pull/420); deployed as Worker
>   `5d659102` (recorded in [PR #423](https://github.com/steven-crosby/ritmofit-web/pull/423)).
> - **LIVE-CONTROLS (SPC-19) — ✅ shipped:** disabled Live “Start class”
>   uses native `disabled` plus the documented ~40% opacity (never color-only) in
>   [PR #425](https://github.com/steven-crosby/ritmofit-web/pull/425); deployed as Worker
>   `ad638215`.
> - **RESPONSIVE-QA (SPC-20) — ✅ shipped:** stale narrow-width smoke locators
>   repaired, 390px intensity overflow and 320px tag-input overflow fixed, and
>   1280 / 953 / 680 / 390 / 320 plus 200% zoom verified (67/67) in
>   [PR #419](https://github.com/steven-crosby/ritmofit-web/pull/419); deployed as Worker
>   `ad638215`.
> - **Semantic color opacity — ✅ shipped:** Tailwind `/opacity` utilities on semantic
>   `var(--rf-*)` colors in [PR #424](https://github.com/steven-crosby/ritmofit-web/pull/424);
>   deployed as Worker `ad638215`.
> - **PROD-HYGIENE (SPC-21):** runbook landed in
>   [PR #426](https://github.com/steven-crosby/ritmofit-web/pull/426)
>   ([`prod-fixture-hygiene.md`](./prod-fixture-hygiene.md)). ✅ Live fixtures deleted
>   2026-09-28 with owner authorization (four classes; see [`HISTORY.md`](./HISTORY.md)).
>
> Resolved owner decisions (Steven, 2026-09-13):
>
> - **OD-01 / SPC-05 — sign-in warmth — ✅ shipped:** auth stays cool and quiet; the
>   heat glow is removed from `Login.tsx` and `ResetPassword.tsx` (both had it; only `Login.tsx` was
>   cited in the audit) in [PR #414](https://github.com/steven-crosby/ritmofit-web/pull/414); deployed
>   as Worker `edaa62b0` (recorded in [PR #416](https://github.com/steven-crosby/ritmofit-web/pull/416)).
>   `NotFound.tsx` and `ErrorBoundary.tsx` also use the same glow class and were deliberately left
>   alone — they're not "sign-in" and nobody decided about them; flagged for a separate owner call if
>   warmth should be removed there too.
> - **OD-02 / SPC-17 — Live data hero — ✅ docs in #425:** the next cue stays the visual
>   hero; BPM remains prominent but subordinate. Stale design docs and code comments that
>   still called BPM the 88px screenshot hero are updated here; no Live hierarchy rewrite.
>
> **Non-blocking production verification:**
>
> - **Live-site SoundCloud audio confirmation** — the owner heard the exact deployed code path locally
>   in both Preview and Live Mode, including full-track playback after the fixture correction. On the
>   next convenient live-site session, accept the PWA refresh and repeat audible Preview + Live
>   pause/resume once against a real public SoundCloud track; automated checks prove widget events and
>   production asset alignment, not human-heard production audio.
>
> **Known deferred post-launch features (not blocking, owner decision):**
>
> - **Google sign-in** — `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are unprovisioned; Google is excluded from the Login UI. See `deployment-runbook.md` for activation steps (owner deferral, 2026-06-28).
> - **Automatic BPM lookup (GetSongBPM)** — the adapter is built; `GETSONGBPM_API_KEY` is not provisioned in prod, so `POST /tracks/:id/bpm-lookup` returns `503`. Activate via `wrangler secret put GETSONGBPM_API_KEY`. (Owner deferral, 2026-06-28.)
>
> Recently closed (kept as pointers so the trail isn't lost):
>
> - **`sections[]` id in run-payload — ✅ shipped** (2026-07-10, PR #267, Worker `6b8e1a48`): the
>   run-payload section projection now carries the `class_sections` row `id` (additive, OpenAPI regen,
>   no migration), completing the id-everywhere pattern already applied to cues and moves so Live/editor
>   can correlate or deep-link a band even when two share a `type`. Server-derived `endOffsetMs` was
>   evaluated and deferred (no consumer needs it; iOS derives the band window client-side).
>
> - **Provider connect prerequisite for playback — ✅ verified** (2026-07-03, Worker
>   `94126954-0e61-408e-b404-bb380c338141`): Apple Music, SoundCloud, and Spotify production connect are
>   all verified working. SoundCloud required an OAuth request-shape fix; Spotify required registering
>   `https://ritmofit.studio/api/v1/providers/spotify/callback` in the Spotify app dashboard. See
>   [`deployment-runbook.md`](./deployment-runbook.md).
> - **"Songs by Move" / track-and-theme reverse search — ✅ shipped** (PRs #99; reverse move→songs search
>   + server-side class tag/theme search). See [`HISTORY.md`](./HISTORY.md).
> - **Cues vs. Notes — ✅ resolved + read-path shipped.** Decided *not* to split the schema; the
>   `class_tracks.notes` channel already existed end-to-end but was write-only, and Live mode now renders
>   it. If *anchored, per-moment* notes ever prove needed, add a `kind: 'cue' | 'note'` discriminator to
>   `cues` (additive) rather than a new table. Full decision (archived): [`archive/cues-vs-notes-decision.md`](./archive/cues-vs-notes-decision.md).
> - **Community surfaces** (Teams, Sharing, Publish, Explore, invites, collaborators, public class pages,
>   social discovery, marketplace/community browsing, share links, and rich Explore merchandising) are
>   explicitly deferred until the owner reopens them.
>
> </details>


> **Session 2026-10-04 — PR #488 Apple Music endpoint retention deployed; natural playback acceptance FAILED.**
> Squash merge/source `7c69786caf5631fca9d57c02e98c27e31c0345e2`, Worker
> `18fe76cd-5273-4cd0-beae-d01b0a307693` at 100%, SPA `assets/index-CFcewXzm.js`.
> Reviewed head `bdebd0348a2b16e6143d8b39599df9ccbacd88b1` and merged source have identical
> trees. Owner approved squash merge, merged-branch deletion, main synchronization,
> separate provider release, and natural desktop Cycle/Pilates verification.
> Prior Worker `1053f665-ebf1-4d8c-be40-16ddfdea908f` retained as rollback reference;
> no rollback performed. No schema, API, migration, shared-contract, OpenAPI,
> configuration, or secret change; remote D1 reported no migrations to apply.
>
> #488 changes only the Apple Music adapter and its tests: capture SDK state/position
> synchronously, retain the actual observed endpoint through queue reset, clear evidence
> on lifecycle/seek/replay changes, and guard event handling by singleton ownership.
> It does not substitute the source duration. Runtime's strict less-than-1,000-ms
> finished-end reconciliation and genuine early-end protection remain unchanged.
>
> Verification: all 12 local gate checks passed on exact merged source, including
> 1,538 unit tests and 184 integration tests. Main CI run `37234524900` passed on
> that SHA. Three consecutive cache-busted SPA fetches matched the entry, served
> bytes matched the build, SPA/health and protected/mounted routes passed, and six
> security headers were present. Browser ran the matching production entry.
>
> **Natural acceptance: FAIL.** Cycle passed the first three natural transitions,
> then failed at Telephone's end at class `16:30`; the SDK reached 221 seconds
> against saved duration `220537` ms, reset to zero, and Live held teaching time
> with the early-end error. Pilates failed its first natural end at `3:43`.
> Its actual event sequence included paused at 223 seconds, seeking at zero,
> another paused at zero, then ended/stopped/completed at zero. A numeric getter
> observer preserved original values and captured the adapter's `captureTransport`
> reading zero from that second paused callback. The paused zero overwrites the
> valid cached endpoint before ended. Cycle's exact internal overwrite path was
> not instrumented. A temporary reproduction using the unchanged deployed adapter
> reproduced both paused-poll and second-paused overwrite paths; this synthetic
> mechanism proof is separate from natural acceptance.
>
> Neither run used operator pause, seek, skip, reset, or retry before failure.
> Full-class completion and later boundaries remain unverified; audible confirmation
> was requested but not received. Spotify remains paused. No iPhone/HIIT, teaching
> draft, readiness, music assignment, runtime, or UI change occurred in this slice.
> [Restart guide and durable evidence](../docs/audits/apple-music-boundary-2026-10-04/NEXT_SESSION.md)
> identify the P1 and proposed narrow adapter/test follow-up, which awaits owner approval.
>
> Three new tagged QA fixtures remain for owner review: boundary trace Cycle
> `8eba970c-a742-4d25-9c77-befd1744b9bc`, release Cycle
> `6d012025-0236-487d-94b2-1ed597ec8eab`, and release Pilates
> `39c679c0-597f-4fbe-a18d-193a080cb76c`. Fresh duplicates retained source order,
> all ten durations, and authored teaching details; no clips/readiness were changed.
> Pending fixture deletion is handed to the owner; none were deleted. Both observers
> removed, original SDK getter restored, playback stopped, Live exited, temporary
> server/export tab closed. Merged feature branch deleted after a verified recovery
> bundle; main synchronized, no open PRs at handoff preparation. The deploy record/handoff
> is documentation only; publication status must be rechecked on GitHub before declaring
> close complete.

> **Session 2026-10-04 — PR #486 Live zoom fix deployed; #485/#480 documentation reconciled.**
> Released source `efd542b88552d29c94d7b0edad484f29f244d20c`, Worker
> `1053f665-ebf1-4d8c-be40-16ddfdea908f` at 100%, SPA `assets/index-B8JJicuF.js`.
> Application code matches #486 merge `eeec377add5294850a78334ef120374f26f23e14`;
> the subsequent #485/#480 merges are documentation only. Owner approved docs reconciliation,
> branch cleanup, deployment, and production verification. Rollback Worker:
> `1ae3e216-89a6-4bbd-aec0-38f01bc600ff`. No API, schema, migration, shared-contract,
> OpenAPI, configuration, or secret change. Remote D1 had no pending migrations before/after;
> the beta allowlist secret was confirmed by name only.
>
> Verification: all 12 canonical local gate checks passed on the released source,
> including 1,528 unit and 184 integration tests. Both reconciled docs PRs passed fresh
> CI before squash merge. Three consecutive cache-busted SPA fetches matched the build;
> health/SPA returned 200, protected and mounted routes returned 401, six security headers
> were present. The production update prompt activated the matching entry in Chrome.
>
> **Production UI:** Chrome's own zoom control confirmed 200%; a 1200×608 viewport
> measured 600×304 CSS pixels. Current and Next remained readable with a long cue;
> compact timecode, transport, view/Exit controls, waiting recovery, and real failure recovery stayed reachable.
> Full List retained the complete cue, scrolled to the final song with header/dock visible,
> and keyboard Exit returned to Builder. Provider preparation held teaching time at zero
> and exposed recovery actions before confirming real Apple Music progress.
>
> **Provider acceptance: FAIL at the first natural boundary.** With no agent pause, seek,
> skip, or retry during the run, Apple Music advanced through Abracadabra, then stopped at
> displayed `3:43`: "Music ended before the saved playback window. Check its duration or
> skip this track." Track 2 did not start. Teaching time held and all four recovery actions
> remained visible at 200% zoom. The saved run payload confirmed first-track duration
> `223398` ms, clip start `0`, and next-track offset `223398` ms. The actual provider
> finished state/position/duration reading was not captured, so the root cause remains
> unverified; #484's tolerance did not prevent this observed failure. No playback source
> was edited and no artificial network failure was introduced. Full natural Cycle/Pilates
> classes and audible acceptance remain unverified; no listening confirmation was received.
> Spotify remains paused; no iPhone, HIIT, teaching-draft, or readiness work was performed.
>
> One new production fixture was created for this pass: `[QA] Live zoom acceptance 2026-10-04 Cycle`,
> ID `bc488d5c-7dc5-4414-a7d2-4ef26601deae`, tagged `qa-fixture` immediately. The ten-song
> `Ritmo Apple Music Test` order was imported unchanged; two manual regression cues were added
> only to this fixture (long cue at 0:00, Next at 1:30). This is manual QA preparation, not a
> generated teaching-draft pass. The fixture remains for owner review; none were deleted.
>
> Cleanup: a verified complete-history Git bundle preserves the exact deleted branch tips.
> Deleted merged branches for #481/#482/#486/#485/#480 and the two corrupt Cursor branches;
> the corrupt branches were never checked out or merged. No force push or remote change.
> Historical device results and Spotify pause from #480 were retained while newer release
> facts and desktop scope took precedence.

> **Session 2026-10-03 (PR #484 — natural song-end precision) — deployed
> (Worker `1ae3e216-89a6-4bbd-aec0-38f01bc600ff`); production playback acceptance
> NOT yet run.** Application source `49ca56662fee109859e6a419ad166ff40a581506`; owner
> authorized merge and deploy. Rollback target: Worker
> `b74e4fe2-fbf3-4eb4-a617-ea6f45a04e03`. No schema, migration, API, shared-contract,
> OpenAPI, config, or secret change; remote D1 reported no migrations to apply.
>
> The fix addresses audit finding 1. The saved playback window is millisecond-precise
> (223,398 ms) while the Apple adapter reports MusicKit's ended endpoint from a
> whole-second duration (223 s), so the runtime's strict comparison read every natural
> end as an early finish. In `apps/web/src/lib/playback/runtime.ts`, a finished stream
> less than 1,000 ms short of the saved window now counts as reaching it and reports
> the window end, so the class advances; a shortfall of 1,000 ms or more still errors
> and holds the teaching position (D24). The rule applies to every provider. Three new
> regression tests failed before the change and pass after; guard tests cover the
> 1,000 ms boundary, a still-playing position, and retry into a genuinely early end.
>
> Verification: CI green on #484; the full local gate passed on the branch and again
> on `main` before deploy. Post-deploy, SPA entry `assets/index-93-j7jyw.js` matched
> three consecutive cache-busted fetches (rechecked 20:22 UTC); SPA and health returned
> 200; classes/explore/teams returned 401 unauthenticated; six security headers present.
>
> **Not verified:** no real-provider playback ran on this release. The Claude Code
> browser pane reached Live preflight for `[QA] #481 Empty Cycle` on the new build
> (after accepting the update prompt), but that browser has no Apple Music
> authorization and Start stayed disabled. The natural first-song transition, full
> uninterrupted classes, and audible output all remain unverified in production. The
> whole-second MusicKit duration rests on the one audit capture.
>
> Also this session: the audit and its planning-doc updates were published unchanged
> as #483. The Classes list showed `[QA]` classes beyond the six the audit recorded
> (`[QA] Ritmo Playlist Pilates`, `[QA] Ritmo Playlist Cycle`, `[QA] Audit Experienced
> Pilates`, `[QA] Audit Experienced Cycle`); none were modified or deleted. PR #480
> remains open and conflicting; it holds the only record of the #478 deploy entry and
> the owner's "Spotify tabled" decision.

> **Session 2026-10-03 — playlist-to-class-to-Live desktop audit completed; no deployment.**
> Production Chrome / Apple Music, beginner and experienced Cycle/Pilates, using
> only the ten-song `Ritmo Apple Music Test` playlist. Browser sign-in completed.
> The [audit report](../docs/audits/playlist-to-live-2026-10-03/coverage.md) records
> scenario verdicts, screenshots, reproduction steps, and contract implications;
> the [next-session guide](../docs/audits/playlist-to-live-2026-10-03/NEXT_SESSION.md)
> routes a Plan Mode development plan. Completing the audit does not mean the
> desired product experience passed.
>
> Beginner flows fail the desired teaching-draft experience: imports generate no
> song cues/notes; fixed templates put all ten songs in Block 1, leaving empty
> blocks that disable Run Live. Experienced empty-class authoring works with
> optional choreography, manual notes, timed cues, precise edits, and reload
> persistence. Music-backed Start, provider progress, Pause/Resume, seek/skip, and
> explicit prompter recovery were observed. Both disciplines fail the first
> natural song boundary at 3:43. Saved 223,398 ms versus SDK duration 223 seconds
> is strong causal evidence for precision mismatch, not a verified implemented
> fix. No full uninterrupted class passed; audible output remains unverified.
> Live at real desktop 200% zoom hides the teaching region; long cues overwhelm
> Cue-by-Cue. Explicit `0:00` clip start is rejected while blank start works.
>
> Read-only close reconcile at 17:11 UTC: Worker
> `b74e4fe2-fbf3-4eb4-a617-ea6f45a04e03` serves 100%; three consecutive cache-busted
> SPA responses matched `assets/index-68EE379w.js`. SPA entry/health returned 200,
> classes/explore/teams returned 401 unauthenticated, and six security headers
> were present. Remote D1 reports no pending migrations through repository level
> `0020`. Application source remains `d026f5992b8c2181b262259e5d9acf84e7745364`;
> local/fetched main `aa128e8` contains later documentation. No application code,
> shared contract, schema, configuration, migration, or deployment changed here.
>
> Six `qa-fixture` classes remain at the owner's instruction; no deletion. Two
> fresh fixtures: `[QA] Goal Template Cycle` (`8a8dcf22-0b20-48ec-a84a-4f13d10ebe85`)
> and `[QA] Goal Template Pilates` (`975a0152-3bc8-4a79-a812-dee80a148164`). The four
> #481 fixtures listed below were reused. Only QA fixtures were modified; source
> playlists and existing instructor content were preserved. Temporary clipping
> was restored; manual test notes/cues remain. No iPhone, Spotify, HIIT, or large
> playlist imports were tested. The 15-song cap is a proposal, not a locked rule.
>
> Full close prepares documentation and curated QA evidence for publication.
> Raw scoped API/automation snapshots were reduced to field summaries after a
> hash-verified local backup. Git publication/merge remain separate owner actions.
> Documentation formatting, diff whitespace, evidence parsing/hash/integrity,
> relative links, and scoped credential-pattern checks passed. The matching
> deployed application gate was not repeated for this docs-only close.
> Pre-existing conflicting docs PR #480 was preserved.

> **Session 2026-10-02 (PR #481 — ordered playlist import and recovery) — deployed
> (Worker `b74e4fe2-fbf3-4eb4-a617-ea6f45a04e03`).** Application source
> `d026f5992b8c2181b262259e5d9acf84e7745364`; owner authorized commit, PR, merge,
> migration, deployment, and desktop Apple Music verification in this session.
> Remote D1 migration `0020_secret_zaladane.sql` applied before code; subsequent
> migration check reported nothing pending. No secret/configuration changes.
>
> Playlist occurrences resolve concurrently but commit in source order through a
> guarded D1 batch. Durable receipts recover ambiguous playlist responses without
> duplicate placements. Single-song adds share the atomic guard and discard their
> non-replayable receipts in the batch. Recovery reconciles current membership,
> preserves instructor arrangements through an explicit append-remaining action,
> and ignores stale playlist responses and destination callbacks.
>
> Validation: CI passed for PR head `02a9efb`; merged main has the identical tree.
> The full local gate passed again on merged main: 1,513 unit/component tests and
> 184 migrated D1 integration tests, plus formatting, types, lint, design/theme,
> build, OpenAPI, contract parity, and dependency audit. Main CI also passed.
> Review identified a stale success callback and redundant single-add receipt
> retention; both were fixed with regressions before merge.
>
> Post-deploy: Worker serves 100%; three consecutive cache-busted SPA fetches and
> the updated Chrome document matched `assets/index-68EE379w.js`. SPA/health/entry
> asset returned 200, classes/explore/teams returned 401 unauthenticated, and all
> six documented security headers were present. Chrome's offered update was accepted.
>
> Authenticated production smoke used only the 10-song `Ritmo Apple Music Test`
> playlist. Music-to-class and Classes-to-empty-class both passed for Cycle and
> Pilates: 10 unique placement IDs, positions 0–9, and the exact source sequence.
> A controlled Chrome network failure discarded a real 201 import response after
> commit; reload exposed saved confirmation and replay retained all 10 original
> placement IDs without duplication. Interception was cleared after the test.
> [Screenshot of the controlled uncertain-import state](../docs/audits/playlist-import-release-2026-10-02/uncertain-import.jpg).
> Two manual timed cues and a creator note persisted in the empty Pilates fixture
> and appeared in Live. Both disciplines passed prompter-only Start, Pause/Resume,
> next-song transition, keyboard seek, and accelerated completion. These are not
> uninterrupted audible class runs. Apple Music playback was blocked by Apple's
> browser sign-in; audible playback and uninterrupted provider runs remain unverified.
>
> Existing product gaps remain: playlist creation generates no teaching blocks,
> cues, or notes; Music creation remains on Music, and the chooser track count can
> lag until reload. No automatic teaching builder, class-size cap, iPhone, Spotify,
> or HIIT work was included.
>
> Fresh fixtures were named `[QA]` and tagged `qa-fixture` immediately. They remain
> for owner review; deletion was not authorized. Source playlists and existing
> instructor classes were preserved.
>
> | Fixture | Class ID |
> | --- | --- |
> | [QA] #481 Music Cycle | `a1dac274-197b-4696-a649-d16fb24a620f` |
> | [QA] #481 Empty Pilates | `da1aec6e-f5b0-4066-8d45-2853558be233` |
> | [QA] #481 Music Pilates | `05f546c7-ffe7-4827-ba2e-cbd526d9dc03` |
> | [QA] #481 Empty Cycle | `3402a289-b570-4e7c-a6a9-4c996b28383a` |
>
> Prior live Worker for code rollback: `e4744ca1-11b0-4ad6-9382-ef8ad6f9b0a5`.
> Migration 0020 is additive; Worker rollback leaves its receipt table in place.

> **Session 2026-10-02 (PR #478 — music-led Phase 1) — deployed (Worker
> `e4744ca1-11b0-4ad6-9382-ef8ad6f9b0a5`).** Application source `48bfd11`, deployed from clean
> `main` `71c6fc2` after owner go. Web-only; no API, schema, OpenAPI, or contract change. No remote
> D1 change (nothing to apply; latest `0019`). No secret change; `BETA_ALLOWED_EMAILS` confirmed
> present by name.
>
> - **#478:** connection recovery (1A), Live teaching position driven by confirmed provider
>   playback (1B), and preflight that gates Start on explicit Apple Music / Spotify browser
>   authorization (1C). #479 added the acceptance record.
> - **Test deployment before release:** an undeployed version of the production Worker
>   (`87526f68`, alias `phase1-test`, auth URL overridden to its preview address) served the same
>   build against production D1. `d393a47b` was a throwaway upload used to learn the address.
>   Neither ever took production traffic. **Never promote `87526f68`**: its auth is bound to the
>   preview address.
> - **Acceptance (details in `docs/audits/music-led-phase-1-acceptance/`):** Apple Music played
>   audibly on the owner's Mac (Chrome) on the test build; Live held at `0:00` while the player
>   loaded, then tracked the song's position, and Pause/Resume stopped and restarted both. On the
>   owner's iPhone (Safari), Apple Music failed or hung on the test build and stalled on
>   authorization on the old production build, so that is not a Phase 1 regression. Spotify returned
>   `403` ("user is not registered for this application"); Spotify is tabled by owner decision.
>   SoundCloud never played in a hidden or embedded browser window, in either build.
> - **Incident, same day:** production returned Cloudflare `503` pages for Apple Music playlists and
>   email sign-in. Worker logs showed `exceededCpu` ("Worker exceeded CPU time limit") on 5 of 6
>   playlist requests. The owner upgraded the account to Workers Paid; afterwards 6 of 6 playlist
>   requests and a Chrome sign-in succeeded, with no `exceededCpu` or `5xx` in the log.
>
> Pre-deploy: the full local gate passed on `main` `71c6fc2` (997 web, 466 API, 30 music, 171
> integration tests; build, OpenAPI no-drift, contract parity, audit). The built SPA entry matched
> the tested preview build. Post-deploy smoke: `/` and `/api/v1/health` `200`; classes, explore,
> teams, and provider routes `401` unauthenticated; six security headers present. SPA entry
> `assets/index-C3NTdD-N.js` on five consecutive cache-busted fetches, and the served
> `LiveMode` chunk contains the Phase 1 hold/recovery text. Worker 100% on `e4744ca1`. Rollback is
> Worker-only to `18aa93dd-8695-4791-a6dd-f0e031e28c75`.

> **Session 2026-09-28 (PR #473 — drain empty 204 bodies in the web API client) — deployed
> (Worker `18aa93dd-8695-4791-a6dd-f0e031e28c75`).** Application source `70a733d`. Deployed
> from clean `main` after owner go. No remote D1 change (nothing to apply; latest `0019`). No
> secret change; `BETA_ALLOWED_EMAILS` confirmed present by name.
>
> - **#473:** `api()` now reads the empty body of a `204` before returning, so Chromium stops
>   logging successful deletes as `net::ERR_ABORTED` (cause confirmed with a local double
>   toggle). Return value unchanged. Web-only; no API, schema, OpenAPI, or iOS change.
>
> Pre-deploy: `main` tree `70a733d` was identical to CI-green PR head `de1a956`; the full local
> gate passed again on `main`; SPA built before deploy. Post-deploy smoke: `/` and
> `/api/v1/health` `200`; classes, explore, teams `401` unauthenticated; six security headers
> present. SPA entry `assets/index-vAXMRElW.js`: the first five cache-busted fetches returned
> four new and one old (`index-DAkmIV8y.js`) during edge propagation, then eight consecutive
> fetches all returned the new entry. The live bundle contains the 204 drain. Worker 100% on
> `18aa93dd`. Rollback is Worker-only to `dd9a27e9-e891-41a8-b5cf-d1438f65fcad` (same v2 recipe
> support, so no recipe-ID rollback hazard between these two).

> **Session 2026-09-28 — production fixture cleanup (SPC-21 / PROD-HYGIENE).** No deploy.
> The owner confirmed each class as test data in chat. Following `prod-fixture-hygiene.md`,
> each was tagged `qa-fixture` first, re-checked for the tag, then deleted with
> `DELETE /api/v1/classes/:id` from the owner's signed-in session (`204`; a follow-up
> `GET` returned `404`). Class deletion cascades to tracks, cues, moves, tags, and sections.
>
> | Class | Id | Created | Content |
> | --- | --- | --- | --- |
> | QA smoke 2026-09-19 | `f6f6c698-afba-42ea-86db-4ac2f5c889e4` | 2026-09-20 | Cycle scaffold `cycle_45_v1`, 1 track |
> | Spotify likesLiveness probe - Spotify | `d246553c-b39b-4a20-9ca8-f6c94faa9215` | 2026-09-01 | Cycle, 30 tracks (the SPC-21 class) |
> | SoundCloud Test: Cool Down | `6002d279-75e7-4631-b0eb-ed3df92dcb7c` | 2026-09-19 | Pilates, 9 tracks |
> | Saturday Ride | `18fc9f47-4c31-45d2-83d2-6452fa8b643a` | 2026-09-23 | Pilates scaffold `pilates_45_v1`, 0 tracks |
>
> Three real classes remain in the account. Recovery, if ever needed, is D1 time travel
> (`deployment-runbook.md`); these deletions happened after the #470 deploy on 2026-09-28.
> Same session, owner decisions: SPC-09 becomes the next planning objective; the v2
> recipe-ID iOS decode risk is tracked in `web-ios-parity.md`.

> **Session 2026-09-28 (PR #470 — v2 Cycle and HIIT scaffold recipes) — deployed
> (Worker `dd9a27e9-e891-41a8-b5cf-d1438f65fcad`).** Application source `c81bc73`.
> Deployed from clean `main` after owner go. Remote D1 had no pending migrations
> (latest `0019`). No secret change; `BETA_ALLOWED_EMAILS` confirmed present by name.
>
> - **#470:** new classes get `cycle_{30,45,60}_v2` (Speed control → `mod`; an easy
>   "Recover before the peak" block precedes a shorter peak) and `hiit_{45,60}_v2`
>   (4-minute finisher at every length). Pilates and `hiit_30` stay v1. v1 content
>   is pinned by a snapshot test. No migration (`scaffold_recipe_id` is unconstrained
>   text); the OpenAPI `scaffoldRecipeId` enum grew; run payload unchanged.
>
> **Rollback hazard:** `serializeClass` parses rows with `classSchema`, so a Worker
> older than `dd9a27e9` fails on any class storing a v2 id. At the end of this session
> no v2 class exists in production (the QA class below was deleted), so rollback to
> `90b7c40f-6e16-4798-be88-ca7a4606362a` is currently safe; once instructors create v2
> classes, recovery is forward-fix only.
>
> Pre-deploy: merged `main` tree `c81bc73` was identical to CI-green PR head
> `7b7ce3f`; the full local gate passed again on `main`; SPA built before deploy.
> Post-deploy smoke: `/` and `/api/v1/health` `200`; classes, explore, teams `401`
> unauthenticated; six security headers present; SPA entry `assets/index-DAkmIV8y.js`
> matched the build on five consecutive cache-busted fetches; Worker 100% on `dd9a27e9`.
>
> **Authenticated production acceptance (#468 + #470), owner-approved, owner signed in:**
> created `[QA] #468 + v2 recipes` (id `27ca8ca8-a548-42d8-91b1-62f7df4b4ff9`, Cycle 45)
> and tagged it `qa-fixture` immediately. Its eight persisted blocks matched the
> `cycle_45_v2` table. Add block appended block 9, kept the class target at 45:00, and
> showed "2:00 over target". Keyboard Move earlier persisted (server positions and the
> UI after reload). Empty-block delete: inline confirm, Cancel kept the block and
> restored focus, confirm deleted it, positions compacted, and the plan read "On target".
> No horizontal overflow at 390 px; no console errors; all API calls 2xx. Anomaly: the
> block `DELETE` returned `204` but Chromium logged it `net::ERR_ABORTED`; the delete
> took effect, so this looks like the client dropping an empty 204 body, not a failure.
> The QA class was then deleted through the UI Delete path (direct fetch now `404`).
> The non-empty-block delete guard was not exercised in production (it needs a provider
> track); it is covered by integration tests.

> **Session 2026-09-28 (PR #468 — scaffold plan-block management) — deployed
> (Worker `90b7c40f-6e16-4798-be88-ca7a4606362a`).** Application source
> `7c69bb4`. Deployed from clean `main` after owner go. Remote D1 had no pending
> migrations (latest local migration `0019`). No secret change;
> `BETA_ALLOWED_EMAILS` was confirmed present by name.
>
> - **#468:** scaffold classes can append Cycle, Pilates, and HIIT teaching blocks,
>   edit authored guidance, move blocks with keyboard-accessible buttons, and delete
>   empty blocks with inline confirmation. A zero-block scaffold can add again.
>   Review fixes preserve partial HIIT timing, refresh the block list after creation,
>   hold music assignment during structural changes, and guard reorder/delete against
>   concurrent assignment.
>
> No schema, migration, secret, route, OpenAPI, or iOS contract change. Rollback is
> Worker-only to prior live `962f7935-2726-43f1-b277-c4daa1626da7`.
> Pre-deploy: merged `main` tree `7c69bb4` matched CI-green PR head `37a08a3`;
> the full local gate passed again on `main`, and the SPA was built there before deploy.
> Local browser QA exercised add/reorder and inline delete cancellation on a throwaway
> scaffold at desktop, 390 px, and 320 px, including reduced motion.
>
> Post-deploy smoke on `https://ritmofit.studio`: SPA `/` and `/api/v1/health`
> returned `200`; protected classes, explore, teams, plan-block create/reorder/delete,
> shares, playlist import, cover upload, tags, and provider search/import returned
> `401` unauthenticated. Cover serving reached its `404 Image not found` handler.
> All six security headers were present. The SPA entry
> `assets/index-QqMbE-wS.js` matched the build on three consecutive cache-busted
> fetches; Worker status was 100% on `90b7c40f`. Production class data was not
> modified for this smoke, and the authenticated Builder flow was not exercised
> against production.
>
> **Session 2026-09-28 (PR #465 — create-dialog recipe preview and block guidance cleanup) —
> deployed (Worker `962f7935-2726-43f1-b277-c4daa1626da7`).** Application source `2d14515`.
> Deployed from this checkout after owner go. No remote D1 change
> (`wrangler d1 migrations list --remote` reported nothing to apply; latest migration `0019`).
> No secret change (`BETA_ALLOWED_EMAILS` confirmed present by name).
>
> - **#465:** from a review of the nine scaffold recipes against the new-instructor and
>   experienced-instructor lenses. The create dialog lists the exact blocks a recipe will create
>   (label, minutes, intensity) before commit, because a recipe cannot be swapped afterwards.
>   Recipe tables moved unchanged from `apps/api` to `packages/shared/src/scaffold-recipes.ts`,
>   so the preview and the API use one generator. Block guidance no longer repeats the HIIT
>   focus text, shows Cycle `mixed` posture as "Mixed" (was "Seated/mixed"), and marks
>   Pilates/HIIT props optional.
>
> No schema, migration, secret, route, OpenAPI, or run-payload change; recipe IDs unchanged.
> Rollback is Worker-only to prior live `79056d05-853e-46ea-9922-1d562c131325`.
> Pre-deploy: merged tree `2d14515` is identical to the CI-green PR head `4996475`, on which the
> full local gate ran green; SPA rebuilt from `main` before deploy.
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` →
> `200`, protected `classes` / `explore` / `teams` → `401`, all six security headers present.
> Mounted routes unauthenticated: scaffold `POST /classes`, `GET /classes/:id/plan-blocks`,
> `PATCH /plan-blocks/:id`, playlist import, provider search, provider track import → `401`;
> cover serving → handler `404 Image not found`. SPA entry `assets/index-CuEjmewJ.js` matched the
> build on three consecutive cache-busted fetches. Worker status 100% on `962f7935`. The preview
> was not exercised against production data; local browser QA covered it before merge.

> **Session 2026-09-28 (PRs #458–#461, #463 — builder UI batch and plan-block
> time editor) — deployed (Worker `79056d05-853e-46ea-9922-1d562c131325`).**
> Application source `87bf79d`. Deployed from this checkout after owner go.
> No remote D1 change (`wrangler d1 migrations list --remote` reported nothing
> to apply; latest local migration remains `0019`). No secret change
> (`BETA_ALLOWED_EMAILS` confirmed present by name).
>
> - **#458:** music source rows fit narrow builder pickers.
> - **#459:** plan fit waits for music timing to resolve.
> - **#460:** class cover stays readable on phones.
> - **#461:** builder focus restore and catalog retry.
> - **#463:** inline plan-block editor for planned time and HIIT
>   rounds/work/recovery. The class target never changes; the plan header shows
>   class target, blocks total, and the gap; HIIT blocks show both totals when
>   intervals and planned time disagree. Saves send only the changed field via
>   the existing `PATCH /plan-blocks/:id`, which gains its first integration
>   coverage. Also fixes the #436 first-Choose-music autofocus re-firing on
>   every block update and stealing focus after a save.
>
> No schema, migration, secret, shared-contract, OpenAPI, or run-payload change.
> Rollback is Worker-only to prior live `3561b1ba-a854-48cd-9e5f-519a02092ef5`.
> Pre-deploy: merged tree `87bf79d` is identical to the CI-green PR head
> `748ab31`, on which the full local gate ran green; SPA rebuilt from `main`
> before deploy.
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`,
> `/api/v1/health` → `200`, protected `classes` / `explore` / `teams` → `401`,
> `GET`/`PATCH /plan-blocks/:id` → `401`, all six security headers present.
> Mounted routes unauthenticated: shares, playlist import, class cover upload,
> tag add/remove, provider search, provider track import → `401`; cover
> serving (`/uploads/covers/:filename`) → handler `404 Image not found`. SPA
> entry `assets/index-BmQ_JqQW.js` matched the build on three consecutive
> cache-busted fetches. Worker status 100% on `79056d05`. The editor was not
> exercised against production data; local browser QA covered it before merge.

> **Session 2026-09-27 (PR #456 — class cover title words stay whole) — deployed (Worker
> `3561b1ba-a854-48cd-9e5f-519a02092ef5`).** Application source `7eebc00`.
> Deployed from this checkout after owner go. No remote D1 change
> (`wrangler d1 migrations list --remote` reported nothing to apply). No
> secret change (`BETA_ALLOWED_EMAILS` confirmed present by name).
>
> - **PR #456:** the #454 signed-in production check found the derived cover
>   splitting words mid-word ("Saturda / y Ride": bold 19px in an 80px box
>   fits ~7 letters). Fix: -0.025em tracking, 6px padding, builder cover
>   120px from `sm` up (uploaded `<img>` matches), `text-balance`, and three
>   lines from `sm` up. A 630-title "Day Theme Type + emoji" matrix renders
>   whole at 120px; phones stay 96px/two lines (three would be 2.97:1).
>   `hyphens: auto` was tried and dropped — Chromium won't hyphenate
>   capitalized words.
>
> No schema, migration, secret, or shared-contract change. Rollback is
> Worker-only to prior live `eb41ded4-ba0a-44df-8a0d-bae52e28be9d`.
> Pre-deploy: merged tree `7eebc00` is identical to the CI-green PR head
> `15d3b57`; the full local gate ran green on `main` at `7eebc00`; SPA
> rebuilt from `main` before deploy.
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`,
> `/api/v1/health` → `200`, protected `classes` / `explore` / `teams` →
> `401`, all six security headers present. Mounted routes unauthenticated:
> class shares, playlist import, class cover upload, tags, provider search,
> provider track import → `401`; cover serving → handler `404 Image not
> found`. (Provider search returned a clean `401`; the one-off `400` noted
> after the #454 deploy did not recur.) Worker status 100% on `3561b1ba`.
> Built + served SPA entry `assets/index-D5zicKh0.js` (CSS
> `assets/index-DkHa6k5P.css`) — **three consecutive** cache-busted fetches
> agreed on the first triple. **Signed-in production check PASS:** the
> owner's Chrome took the PWA "Reload now" prompt onto `index-D5zicKh0.js`;
> Saturday Ride (no cover) renders "Saturday / Ride" on a 120px tile,
> three-line clamp, balanced, not clipped. This also closes the #454
> owner-pending no-cover look.

> **Session 2026-09-27 (PR #454 — derived class cover with the title on the art) — deployed (Worker
> `eb41ded4-ba0a-44df-8a0d-bae52e28be9d`).** Application source `734dd7a`.
> Deployed from this checkout after owner go. No remote D1 change
> (`wrangler d1 migrations list --remote` reported nothing to apply). No
> secret change (`BETA_ALLOWED_EMAILS` confirmed present by name).
>
> - **PR #454:** classes without an uploaded cover show `ClassCoverArt` (the
>   class's warm gradient with its title in ink, bold 19px, top-left, two
>   lines) instead of a bare 📷; the list card's zero-art tile is keyed by
>   class id too. Also drained the class-cover breadcrumb and fixed a stale
>   Worker id in `DEVELOPMENT_PLAN.md`.
>
> No schema, migration, secret, or shared-contract change. Rollback is
> Worker-only to prior live `b4ac663d-9cdd-42b4-bbbb-9750b19a132e`.
> Pre-deploy: merged tree `734dd7a` is identical to the CI-green PR head
> `14c1491`; the full local gate ran on `b2fddda` (code-identical; the later
> commit is docs only); SPA rebuilt from `main` before deploy.
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`,
> `/api/v1/health` → `200`, protected `classes` / `explore` / `teams` →
> `401`, all six security headers present. Mounted routes unauthenticated:
> class shares, playlist import, class cover upload, tags → `401`. Provider
> search returned `400` once in the smoke loop (body `UNAUTHORIZED`), then
> `401` on four immediate re-checks — not reproduced, noted rather than
> explained. Worker status 100% on `eb41ded4`. Built + served SPA entry
> `assets/index-C5MSP26E.js` (CSS `assets/index-0w9wfAuz.css`) — **three
> consecutive** cache-busted fetches agreed on the first triple.
> **Owner-pending:** signed-in production look at a class with no cover
> (titled tile, light and dark, ~320px); the deploy agent had no signed-in
> production session. Local browser QA covered this before merge.

> **Session 2026-09-23 (PR #450 — baseDurationMs + Track length inspector save) — deployed (Worker
> `b4ac663d-9cdd-42b4-bbbb-9750b19a132e`).** Application source `c2dbd75`.
> Deployed from this checkout after owner go (adversarial review of #450).
> No remote D1 change (`wrangler d1 migrations list` reported nothing to
> apply). No secret change (`BETA_ALLOWED_EMAILS` confirmed present by name).
> Carries the #450 product fix already on that tip (prior live Worker
> `4f5cfb73` / application tip `c5531a0` plus docs #449):
>
> - **PR #450:** `baseDurationMs` + Track length inspector save — Track
>   length shows the base (not clipped) duration; notes-only save does not
>   invent an override.
>
> No schema, migration, secret, or shared-contract change. Rollback is
> Worker-only to prior live `4f5cfb73-901f-4377-96cd-bea0583972f0`
> (2026-09-23 #440/#443–#448). Local pre-deploy: clean `main` at
> `c2dbd75`; `pnpm --filter @ritmofit/web build` green (CI already green
> on the merge). Full local gate suite not re-run; minimum deploy gates
> satisfied.
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`,
> `/api/v1/health` → `200`, protected `classes` / `explore` / `teams` →
> `401`, all six security headers present (HSTS, CSP, Permissions-Policy,
> Referrer-Policy, X-Content-Type-Options, X-Frame-Options). Worker status
> confirmed 100% on `b4ac663d` via `wrangler deployments status`. Built +
> served SPA entry `assets/index-CSepK95F.js` (CSS
> `assets/index-DM6csDfB.css`) — **three consecutive** cache-busted
> fetches agreed on the first triple. Signed-in production click-through
> (clipped-track length + notes-only save) was not run this deploy
> (no safe signed-in browser session available to the deploy agent).
> After this docs PR merges, `main` is one docs commit ahead of the
> deployed application tip.
>
> **Signed-in Track length smoke PASS (2026-09-23):** class QA smoke
> 2026-09-19 / track Baby cool down; base Track length 3:29; temp clip
> 0:30–2:30 effective 2:00; Track length stayed 3:29; notes-only save no
> invented override; clip+smoke note restored. Clears the owner-pending
> signed-in click-through left open at #450 deploy.


> **Session 2026-09-23 (PRs #440, #443–#448 — plan-block UX + SoundCloud picker + pulse labels) — deployed (Worker
> `4f5cfb73-901f-4377-96cd-bea0583972f0`).** Application source `c5531a0`.
> Deployed from this checkout after owner go. No remote D1 change (`0019`
> already applied; `wrangler d1 migrations list` reported nothing to apply).
> Carries product/docs already on that tip that were not on prior live
> Worker `b4a99062` (#438 / `54c3bf7`):
>
> - **PR #439:** docs — record the #438 deploy (Worker `b4a99062`).
> - **PR #440:** harden SoundCloud library expiry in the music picker.
> - **PR #442:** docs — Simple Stupid Swift UX principle and prompt pack.
> - **PR #443:** name the plan block a song is going into, and let it move.
> - **PR #444:** lead with the plan's next step; empty is a real start.
> - **PR #445:** lead class creation with the unfinished plan.
> - **PR #446:** stay on the unfinished plan after the first assign.
> - **PR #447:** put the music picker on the dest plan card.
> - **PR #448:** label provisional class pulse sparklines.
>
> **#441** (`docs: audit creation journey simplicity`) remains open and is
> not on this tip. No schema, migration, secret, or shared-contract change.
> Rollback is Worker-only to prior live
> `b4a99062-8f11-4e2a-ab57-7d147b2ed109` (2026-09-20 #438). Local
> pre-deploy gate was green (`GATE_EXIT=0`; no flake retry).
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`,
> `/api/v1/health` → `200`, protected `classes` / `explore` / `teams` /
> `shares` / `plan-blocks` → `401`, all six security headers present (HSTS,
> CSP, Permissions-Policy, Referrer-Policy, X-Content-Type-Options,
> X-Frame-Options). Worker status confirmed 100% on `4f5cfb73` via
> `wrangler deployments status`. Built + served SPA entry
> `assets/index-BfJbu2jd.js` (CSS `assets/index-DM6csDfB.css`) — **three
> consecutive** cache-busted fetches agreed on the first triple. Signed-in
> production click-through was not run this deploy. After this docs PR
> merges, `main` is one docs commit ahead of the deployed application tip.

> **Session 2026-09-19 (PR #438 — Classes home) — deployed (Worker
> `b4a99062-8f11-4e2a-ab57-7d147b2ed109`).** Application source `54c3bf7`.
> Deployed from this checkout after owner go. No remote D1 change (`0019`
> already applied; `wrangler d1 migrations list` reported nothing to apply).
> Carries the Classes-home implementation plus docs already on that tip:
>
> - **PR #438:** resting Classes is one readiness-ranked list (`ClassesHome`).
>   Copper stays on the top row; ranking updates as payloads arrive; H7 uses
>   `Can run live` / `Can run live · N left`; search, sort, and tags appear
>   only past eight loaded classes. Manual sort hides the readiness toggles.
>   The library rail stays in the builder. No schema, migration, secret, or
>   shared-contract change.
>
> Rollback is Worker-only to prior live
> `29a72e1c-0022-498f-b3ba-735a18c1985a` (2026-09-19 #432–#436). Local
> pre-deploy gate was green after one flake retry of
> `CustomMovesDialog.test.tsx` (passed on rerun; #438 CI was already green).
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`,
> `/api/v1/health` → `200`, protected `classes` / `explore` / `teams` /
> `shares` / `plan-blocks` → `401`, all six security headers present (HSTS,
> CSP, Permissions-Policy, Referrer-Policy, X-Content-Type-Options,
> X-Frame-Options). Worker status confirmed 100% on `b4a99062` via
> `wrangler deployments status`. Built + served SPA entry
> `assets/index-CZoX8_-x.js` (CSS `assets/index-_Eebt8hH.css`) — **three
> consecutive** cache-busted fetches agreed on the first triple. Production
> bundle contains the new Classes-home copy. Signed-in production click-through
> was not run this deploy (browser MCP unavailable); localhost QA of #438
> already exercised the populated list, create dialog, builder rail, and
> 390/320 overflow. After this docs PR merges, `main` is one docs commit
> ahead of the deployed application tip. Inbox class-cover taste decision
> remains open.

> **Session 2026-09-19 (PRs #432, #434, #435, #436 — ENERGY-RIBBON + class
> scaffolds) — deployed (Worker `29a72e1c-0022-498f-b3ba-735a18c1985a`).**
> Application source `b70ded1`. Deployed from this checkout after owner go.
> Remote D1 applied `0019_keen_matthew_murdock.sql` (7 statements) before the
> Worker deploy; post-apply list was clean. Carries four product PRs plus docs
> #431 already on that tip:
>
> - **PR #432 (ENERGY-RIBBON, SPC-14):** track intensity is the staircase
>   baseline; placed-move intensity at `anchorMs` holds until the next scored
>   move or the track end. ClassPulse uses the same spans. No schema change.
> - **PR #434:** class builder explains itself (copy/readiness, no scaffold UI).
> - **PR #435 (scaffold API):** nine immutable recipes, expand-only `0019`
>   (`class_plan_blocks`, nullable `classes.scaffold_recipe_id`, nullable
>   `class_tracks.plan_block_id` with `ON DELETE SET NULL`), scaffold/empty
>   create contract. Run-payload unchanged.
> - **PR #436 (scaffold UI):** isolated create-class dialog (45 preselected,
>   scaffold primary, quiet empty path) and planned-versus-actual plan blocks
>   using existing music sourcing. Empty blocks are not Live tracks.
>
> Shared-contract change is additive (new create mode + plan-block DTOs). No
> secret or lockfile change. Rollback is Worker-only to prior live
> `3b39fac6-2c6e-420b-865b-ee67f9912c5c` (2026-09-19 #429); `0019` stays
> applied and is compatible with that Worker. Main CI on `b70ded1` was green
> (run 35473699855) before migrate/deploy.
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`,
> `/api/v1/health` → `200`, protected `classes` / `explore` / `teams` /
> `shares` / `plan-blocks` → `401`, all six security headers present (HSTS,
> CSP, Permissions-Policy, Referrer-Policy, X-Content-Type-Options,
> X-Frame-Options). Worker status confirmed 100% on `29a72e1c` via
> `wrangler deployments status`. Built + served SPA entry
> `assets/index-BdYKswiD.js` (CSS `assets/index-RLk4hLSc.css`) — **three
> consecutive** cache-busted fetches agreed on the first triple. Signed-in
> production scaffold create was not run this deploy; localhost QA of #436
> already exercised create, assignment, Escape, 390/320, and reduced motion.
> After this docs PR merges, `main` is one docs commit ahead of the deployed
> application tip. Inbox class-cover taste decision remains open. Draft #433
> (Classes home contract) is still open and was not part of this batch.

> **Session 2026-09-19 (PR #429 — LIVE-RUN-OF-SHOW) — deployed (Worker
> `3b39fac6-2c6e-420b-865b-ee67f9912c5c`).** Main HEAD `51a6ade` (docs #430 on the
> same tip). Owner deployed ritmofit-web production from Mac. Carries the Live
> run-of-show product PR plus the docs record already on this tip:
>
> - **PR #429 (LIVE-RUN-OF-SHOW):** explicit previous/next track controls and a
>   read-only rolling choreography queue (current event plus the next three
>   cues/moves). The observed SoundCloud manual-jump failure is isolated to one
>   oEmbed-404 reference; no coordinator or adapter change.
> - **PR #430:** docs record that #429 was on `main` before this deploy.
>
> No schema, migration, shared-contract, secret, or lockfile change. No remote D1
> change. Rollback is Worker-only to prior live
> `ad638215-6758-498c-8782-522e23a6d942` (2026-09-17 #417–#425). Remote D1: **no
> migrations to apply** (checked before deploy). `BETA_ALLOWED_EMAILS` present
> (name only). Full AGENTS.md gate was 12/12 PASS on this SHA locally before
> deploy (format on tracked files; typecheck; lint; design verify; theme-classes;
> unit tests; 151 integration tests; web build; OpenAPI no-drift; contract
> parity; audit:ci).
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`,
> `/api/v1/health` → `200`, protected `classes` / `explore` / `teams` → `401`,
> all six security headers present (HSTS, CSP, Permissions-Policy,
> Referrer-Policy, X-Content-Type-Options, X-Frame-Options), mounted
> `/api/v1/shares`, Spotify search/playlists, and class tags/moves/cover →
> `401`. Worker status confirmed 100% on `3b39fac6` via
> `wrangler deployments status`. Built + served SPA entry
> `assets/index-CL-T-XP_.js` (CSS `assets/index-BeDI8Azh.css`) — **three
> consecutive** cache-busted fetches agreed on the first triple. Authenticated
> Live Mode prev/next + queue click-through was not run from this session
> (browser MCP unavailable). ENERGY-RIBBON direction remains approved;
> implementation separately gated. SPC-09 remains owner-blocked. Live fixture
> delete remains owner-pending.

> **Session 2026-09-19 (PR #429 — LIVE-RUN-OF-SHOW) — merged, not deployed.** Main HEAD
> `451964c`. Squash-merged to `main`; production remains Worker
> `ad638215-6758-498c-8782-522e23a6d942` from the 2026-09-17 #417–#425 batch
> (`4ddddeb`). No production deploy this session.
>
> - **PR #429 (LIVE-RUN-OF-SHOW):** explicit previous/next track controls and a
>   read-only rolling choreography queue (current event plus the next three
>   cues/moves). The observed SoundCloud manual-jump failure is isolated to one
>   oEmbed-404 reference; no coordinator or adapter change.
>
> No schema, migration, shared-contract, secret, or lockfile change. No remote D1
> change. Rollback for the still-live Worker is Worker-only to `5d659102`.
> ENERGY-RIBBON direction is approved (placed-move refinement); implementation
> remains separately gated. SPC-09 remains owner-blocked. Live fixture delete
> remains owner-pending.

> **Session 2026-09-17 (PRs #417, #418, #419, #424, #425 — Studio Pulse Check product
> batch) — deployed (Worker `ad638215-6758-498c-8782-522e23a6d942`).** Main HEAD
> `4ddddeb`. Owner deployed ritmofit-web production from Mac. Carries five product PRs
> plus two documentation-only PRs already on this tip:
>
> - **PR #417 (DESTRUCTIVE-CONTROLS, SPC-10):** Dashboard class deletion uses the
>   canonical destructive treatment (transparent fill, ember text, mandatory error
>   icon) for initial and confirmation states.
> - **PR #418 (PROVIDER-TRUTH, SPC-06/SPC-08):** Dashboard Music/Account headers use
>   the centralized caution tone for “Session expired,” and connection-state marks
>   move to the shared icon system. SPC-09 (permission/provider-error API signals)
>   stays owner-blocked.
> - **PR #419 (RESPONSIVE-QA, SPC-20):** repairs stale narrow-width smoke locators,
>   fixes the 390px intensity overflow and 320px tag-input overflow, and verifies
>   1280/953/680/390/320 plus 200% zoom.
> - **PR #424 (semantic color opacity):** restores semantic color opacity modifiers
>   so Tailwind `/opacity` utilities work on `var(--rf-*)` colors.
> - **PR #425 (LIVE-CONTROLS, SPC-19):** disabled Live “Start class” uses native
>   `disabled` plus the documented ~40% opacity.
>
> Tip also includes docs **PR #426** (PROD-HYGIENE runbook) and **PR #427**
> (deploy-readiness note). Live fixture delete remains owner-pending. ENERGY-RIBBON
> stays owner-blocked.
>
> No schema, migration, shared-contract, secret, or lockfile change. No remote D1
> change. Rollback is Worker-only to prior live
> `5d659102-3bff-4398-91ad-cdc1d165ccc1` (2026-09-13 #420/#422). Remote D1: **no
> migrations to apply** (checked before deploy). `BETA_ALLOWED_EMAILS` present (name
> only). Full AGENTS.md gate was 12/12 PASS on this SHA earlier the same day in
> cloud; the Mac deploy rebuilt the SPA and wrangler-deployed.
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`,
> `/api/v1/health` → `200`, protected `classes` / `explore` / `teams` → `401`, all
> six security headers present (HSTS, CSP, Permissions-Policy, Referrer-Policy,
> X-Content-Type-Options, X-Frame-Options), mounted `/api/v1/shares` and
> `/api/v1/providers/spotify/playlists` → `401`. Worker status confirmed 100% on
> `ad638215` via `wrangler deployments status`. Built + served SPA entry
> `assets/index-BxFscIFx.js` (CSS `assets/index-BrfkNDA3.css`) — **three
> consecutive** cache-busted fetches agreed.

> **Session 2026-09-13 (PRs #420, #422 — Studio Pulse Check remediation, batch 2) —
> deployed (Worker `5d659102-3bff-4398-91ad-cdc1d165ccc1`).** Main HEAD `dd625b5`. Carries
> two frontend-only audit slices plus the intervening documentation-only PR #421:
>
> - **PR #420 (LIVE-RUNTIME, SPC-16/SPC-18):** separates raw timeline animation from the
>   throttled Live Mode display clock so the full Live subtree no longer re-renders every
>   animation frame, and reduces drag-seek provider traffic to trailing commits while
>   preserving immediate keyboard and pointer-release seeks.
> - **PR #422 (BUILDER-A11Y, SPC-11/SPC-12/SPC-13/SPC-15):** restores deterministic
>   keyboard focus after cue and move save/cancel/delete actions, manages custom-move
>   confirmation focus, associates and announces validation errors, focuses the first
>   invalid field, and normalizes mutation failures through the established error helper.
>
> No schema, migration, API, shared-contract, provider-playback, secret, or configuration
> change. No remote D1 change. Rollback anchor: prior live
> `edaa62b0-8957-486c-b953-24eae2b0fd33` (2026-09-13 #412/#414/#415). Remote D1:
> **no migrations to apply** (checked before deploy). `BETA_ALLOWED_EMAILS` present (name
> only). Full pre-deploy gate green on exact commit `dd625b5`: format, typecheck, lint,
> design verify, theme classes, unit tests (770 web + 431 API + 30 music), 151 integration
> tests, web build, OpenAPI no-drift, contract parity, and the accepted audit baseline.
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` and health → `200`;
> protected `classes`, `explore`, and `teams` → `401`; all six security headers present;
> mounted shares, Spotify search/playlists, class tags/moves, and cover routes reached JSON
> handlers rather than the SPA fallback. Worker status confirmed 100% on `5d659102`.
> Served entry `assets/index-Bm9AVXtk.js` matched the local build across **five consecutive**
> cache-busted fetches. The two UI slices had passed real-Chrome verification against the
> exact code before merge; no authenticated production data was mutated during deployment
> verification.

> **Session 2026-09-13 (PRs #412, #414, #415 — Studio Pulse Check remediation, batch 1) —
> deployed (Worker `edaa62b0-8957-486c-b953-24eae2b0fd33`).** Main HEAD `38f8526`. Carries
> three merged PRs from the same-day live UX audit ([Studio Pulse
> Check](https://claude.ai/code/artifact/28aaf27a-434f-46c5-a163-f301c0ab2238)):
>
> - **PR #412 (the audit's P0):** the Class Builder's per-track Intensity picker
>   (`IntensitySegmentedControl.tsx`, `.rf-zone-control` in `index.css`) rendered at 0px
>   computed width at ordinary desktop widths, corrupting the "Zone N · Label" summary into
>   overlapping unreadable text on every track. Fixed with an explicit `width: 100%` plus a
>   new real-browser smoke assertion (`narrow-width.smoke.mjs`) guarding the regression.
> - **PR #414 (AUTH-A11Y + OD-01):** redundant icon+color error/success cues and ember
>   invalid-field borders on auth forms; one consistent password-length contract with help
>   text between sign-up and reset; a labelled show/hide password toggle (new shared
>   `PasswordField` component); focus now moves to the heading on sign-in/sign-up/forgot
>   mode switches. Also removed the `rf-hero-glow` warm atmosphere from `Login.tsx` **and**
>   `ResetPassword.tsx` (owner-resolved OD-01: auth stays cool-and-quiet).
> - **PR #415 (SOURCE-ARTWORK):** a new shared `TrackArt` component replaces the bare
>   music-note placeholder with a deterministic warm-gradient tile (copper/amber/ember
>   family only, never cyan/plasma) keyed by BPM band or a stable title+artist hash — never
>   by intensity, since Library rows must not infer class intensity before a track joins a
>   class. Fixed 6 instances total (the audit named 2; grepping found 4 more in
>   `Dashboard.tsx`, including the class-cover `ArtCollage` zero-art case).
>
> No schema, migration, or shared-contract change in any of the three. No remote D1 change.
>
> Rollback anchor: prior live `c77ba5c9-0ea2-43d4-8272-b98a1ac1d3e7` (2026-09-13 #406).
> Remote D1: **no migrations to apply** (checked before deploy). `BETA_ALLOWED_EMAILS`
> present (name only). Full pre-deploy gate green on these exact bytes from the repository
> root (format / typecheck / lint / design verify / theme-classes / unit / integration /
> web build / openapi no-drift / contract-parity / audit:ci).
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` →
> `200`, protected `classes` / `explore` / `teams` → `401`, all six security headers
> present, mounted routes (`shares`, provider `playlists`, class `cover`) reached real
> handlers (`401`, not `404`). Served entry `assets/index-qP8PwncH.js` confirmed by
> **three consecutive** cache-busted fetches immediately after deploy (no propagation lag
> observed this time). Live-verified in an authenticated Chrome session against production:
> the Intensity picker renders correctly (full-width zone buttons, clean "Zone 2 · Push"
> summary, no overlap) on the same 65-track class used to reproduce the bug during the
> audit; no console errors. The disposition ledger
> ([`docs/audits/studio-pulse-check-2026-09-13/run-decisions.md`](../docs/audits/studio-pulse-check-2026-09-13/run-decisions.md))
> tracks the remaining backlog slices (PROVIDER-TRUTH, DESTRUCTIVE-CONTROLS, BUILDER-A11Y,
> ENERGY-RIBBON, LIVE-RUNTIME, LIVE-CONTROLS, RESPONSIVE-QA, PROD-HYGIENE) as not yet
> scheduled.

> **Session 2026-09-13 (PR #406 signup open-access copy fix) — deployed (Worker
> `c77ba5c9-0ea2-43d4-8272-b98a1ac1d3e7`).** Main HEAD `4031d5b`. Carries **PR #406**
> (merge): the auth screen's eyebrow and left-panel footer were hardcoded to
> invitation-required copy regardless of access mode, contradicting the already-correct
> heading/description when the API reports `access.mode: "open"`. Both now follow the
> same `inviteOnly` flag as the rest of the screen (`Login.tsx` + new `Login.test.tsx`
> coverage). No schema, migration, or shared-contract change. No remote D1 change.
>
> Rollback anchor: prior live `8a6318e4-1f32-4c47-8651-6cde7416b9ca` (2026-09-13
> #401–#403). Remote D1: **no migrations to apply** (checked before deploy).
> `BETA_ALLOWED_EMAILS` present (name only). Full pre-deploy gate green on these exact
> bytes from the repository root (format / typecheck / lint / design verify /
> theme-classes / unit / integration / web build / openapi no-drift / contract-parity /
> audit:ci).
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health`
> → `200`, protected `classes` / `explore` / `teams` → `401`, all six security headers
> present. Served entry `assets/index-njApmPWl.js` confirmed by **five consecutive**
> cache-busted fetches. Worker version independently confirmed at 100% `c77ba5c9`. The
> alerting half of liveness remains an owner decision. F-02 (D11 `createPattern`) stays
> unconfirmed. Inbox empty.

> **Session 2026-09-13 (PRs #401–#403 liveness provider-wins + hono audit fix + docs) —
> deployed (Worker `8a6318e4-1f32-4c47-8651-6cde7416b9ca`).** Main HEAD `37c437d`. Carries
> **PR #402** (merge, provider liveness wins over a stalled host rAF loop): `classify()`
> no longer treats `hostTicks === 0` as a winning `host_stalled` verdict and instead
> inspects the provider reading — a hidden host with an advancing playhead now classifies
> `advancing`, a frozen `playing: true` reading classifies `not_advancing`; `host_stalled`
> is removed from `LivenessVerdict` entirely. **PR #403** (merge, CI unblocker): bumps
> `hono` `~4.12.34` → `~4.13.7` (patches three moderate GHSAs — `toSSG()`, `parseBody()`
> dot-nesting, and fragment-aware query parsing) and strips the unused optional
> `better-auth`→`vitest` peer in `.pnpmfile.cjs` (a workspace `vitest` override would break
> `@cloudflare/vitest-pool-workers` 0.12.21's required vitest 2–3.x range and the per-test
> D1 isolation the authz integration suite relies on). **PR #401** (docs only):
> start-/close-session prompt refinements — checkout identity, orient modes, production
> evidence bar, single recommended next action. The observer stays inert throughout —
> still observe, never alert, never call `fail()`. **No schema, migration, or
> shared-contract change. No remote D1 change.**
>
> Rollback anchor: prior live `5ae8b540-ffe6-45cc-98a8-c82e5c3caa31` (2026-09-06 #399).
> Remote D1: **no migrations to apply** (checked before deploy). `BETA_ALLOWED_EMAILS`
> present (name only). Full pre-deploy gate green on these exact bytes from the repository
> root (format / typecheck / lint / design verify / theme-classes / unit / integration / web
> build / openapi no-drift / contract-parity / audit:ci) — `audit:ci` confirms the hono/
> vitest advisories are cleared. SPA built before the Worker deploy.
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` →
> `200`, protected `classes` / `explore` / `teams` → `401`, all six security headers present,
> and the mounted launch routes (shares, Spotify search, saved playlists, playlist import,
> class tags, moves) reach their handlers as `401` rather than `404`. Cover serve
> (`GET /api/v1/uploads/covers/smoke-missing.jpg`) reaches the real handler as JSON
> `NOT_FOUND`, not an SPA miss. Served entry `assets/index-DTvRS9yt.js`: the first
> cache-busted fetch still returned the previous entry, then settled by the second fetch,
> confirmed by **two further consecutive** matches. Worker version independently confirmed
> at 100% `8a6318e4`. F-06 Live danger token still ships:
> `--rf-color-semantic-live-danger: #EF8572` and `--rf-color-primitive-ember-200: #EF8572`
> on the served stylesheet. The alerting half of liveness remains an owner decision. F-02
> (D11 `createPattern`) stays unconfirmed. Inbox empty.

> **Session 2026-09-06 (PR #399 Spotify liveness current-state) — deployed (Worker
> `5ae8b540-ffe6-45cc-98a8-c82e5c3caa31`).** Main HEAD `b340ddf`. Carries **PR #399**
> (merge `b340ddf`): Spotify playback liveness now reads the SDK's *current* player state
> on every probe instead of reusing stale `player_state_changed` payloads; inactive
> devices and unexpected Connect track changes classify as unresponsive while shared-player
> ownership guards stay intact. Observer remains inert — still observe, never alert, never
> call `fail()`. Also on this tip since the prior prod: #397 (docs record for the #395
> deploy) and #398 (start-/close-session prompt tighten). **No schema, migration, or
> shared-contract change. No remote D1 change.**
>
> Rollback anchor: prior live `fc0eb9a9-5255-4948-8753-3c5d46a5231f` (2026-08-28 #395).
> Remote D1: **no migrations to apply** (checked before deploy). `BETA_ALLOWED_EMAILS`
> present (name only). Full pre-deploy gate green on these exact bytes from the repository
> root (format / typecheck / lint / design verify / theme-classes / unit / integration / web
> build / openapi no-drift / contract-parity / audit:ci). SPA built before the Worker deploy.
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` →
> `200`, protected `classes` / `explore` / `teams` → `401`, all six security headers present,
> and the mounted launch routes (shares, Spotify search, saved playlists, playlist import,
> class tags, moves) reach their handlers as `401` rather than `404`. Cover serve
> (`GET /api/v1/uploads/covers/smoke-missing.jpg`) reaches the real handler as JSON
> `NOT_FOUND`, not an SPA miss. Served entry `assets/index-DpWW44bT.js`, confirmed by
> **three consecutive** cache-busted fetches (settled on the first three probes). Worker
> version independently confirmed at 100% `5ae8b540`. F-06 Live danger token still ships:
> `--rf-color-semantic-live-danger: #EF8572` and `--rf-color-primitive-ember-200: #EF8572`
> on the served stylesheet. The alerting half of liveness remains an owner decision. F-02
> (D11 `createPattern`) stays unconfirmed. Inbox empty.

> **Session 2026-08-28 (PR #395 playback liveness instrumentation) — deployed (Worker
> `fc0eb9a9-5255-4948-8753-3c5d46a5231f`).** Main HEAD `7eb013e`. Carries **PR #395**
> (merge `b5f1ff4`) plus the #396 merge-record docs: instrument-only playback liveness
> (observe, never alert, never call `fail()`), plus CI unblockers (postcss / hono / undici /
> nanoid `audit:ci` bumps and a TrackPreview test flake guard). Production now matches
> `main`. **No schema, migration, or shared-contract change. No remote D1 change.**
>
> Rollback anchor: prior live `0588098f-5b1f-4e7d-9aad-d340445ebe20` (2026-07-30 F-06).
> Remote D1: **no migrations to apply** (checked before deploy). `BETA_ALLOWED_EMAILS`
> present (name only). Full pre-deploy gate green on these exact bytes from the repository
> root (format / typecheck / lint / design verify / theme-classes / unit / integration / web
> build / openapi no-drift / contract-parity / audit:ci). SPA built before the Worker deploy.
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` →
> `200`, protected `classes` / `explore` / `teams` → `401`, all six security headers present,
> and the mounted launch routes (shares, Spotify search, saved playlists, playlist import,
> class tags, moves) reach their handlers as `401` rather than `404`. Cover serve
> (`GET /api/v1/uploads/covers/smoke-missing.jpg`) reaches the real handler as JSON
> `NOT_FOUND`, not an SPA miss. Served entry `assets/index-Cxh5tVKs.js`, confirmed by
> **three consecutive** cache-busted fetches (settled on the first three probes). Worker
> version independently confirmed at 100% `fc0eb9a9`. F-06 Live danger token still ships:
> `--rf-color-semantic-live-danger: #EF8572` and `--rf-color-primitive-ember-200: #EF8572`
> on the served stylesheet. The alerting half of liveness remains an owner decision. F-02
> (D11 `createPattern`) stays unconfirmed. Inbox empty.

> **Session 2026-08-25 (PR #395 playback liveness instrumentation) — merged, not deployed.**
> This is a merge-to-main record, not a deploy. Main reached
> `b5f1ff44c36892b61107247988d99f4f13be80b3` (merge of
> [PR #395](https://github.com/steven-crosby/ritmofit-web/pull/395)) on 2026-08-25.
> Instrument-only playback liveness: observe, never alert, never call `fail()`. Also CI
> unblockers: postcss / hono / undici / nanoid `audit:ci` bumps and a TrackPreview test flake
> guard. CI green on the merged tip:
> https://github.com/steven-crosby/ritmofit-web/actions/runs/32884347966.
>
> **Superseded 2026-08-28** by Worker `fc0eb9a9`. At the time of this merge, production was
> still the 2026-07-30 F-06 Worker `0588098f-5b1f-4e7d-9aad-d340445ebe20` from main
> `4be6b7c`. **No schema, migration, or shared-contract change. No remote D1 change.** The
> alerting half of liveness remains an owner decision. F-02 (D11 `createPattern`) stays
> unconfirmed. Inbox empty.

> **Session 2026-07-30 (F-06 Live danger AAA) — deployed (Worker
> `0588098f-5b1f-4e7d-9aad-d340445ebe20`).** Main HEAD `4be6b7c`. Carries **PR #392**, an accessibility
> fix on Live's playback-failure alert — the `role="alert"` that tells an instructor mid-class that the
> music died. Its "Music interrupted" status line and `!` glyph rendered at **6.48:1** against Live's
> 7.0 AAA target, at 1440×1000, 390×844 and 320×844 alike; they now measure **7.04:1**.
>
> Root cause: the token was validated against a backdrop it never renders on. The Live re-map in
> `index.css` was working — the colour really was `live.danger` — but `live.danger` (ember-300) was
> measured and gated only on `bg/live`, where it reads 7.52:1, while `RecoveryState` renders on
> **`bg/raised`** (ink-800), where the same colour gives 6.48:1. Fixed by adding `ember-200`
> (`#EF8572`) and pointing `live.danger` at it: 7.04:1 on `bg/raised`, 8.17:1 on `bg/live`.
> `check-contrast.mjs` now gates every Live text role against **both** grounds, worst case wins, and is
> verified to fail when the old value is restored.
>
> **Found only by inducing LIVE-09** (PRs #392/#393, `playback-liveness-investigation.md`). The §8
> reconciliation's "Live runtime 0 of 36 text nodes below AAA" was accurate for the 36 nodes reachable
> without a playback failure; with the failure surface open there are **43**, and the defect was in the
> seven no traversal had ever entered.
>
> **Frontend token only — no schema / migration / API / shared-contract change.** The entire
> production-visible delta since `75fc1b8d` is one custom property,
> `--rf-color-semantic-live-danger: #EE7A66 → #EF8572`; everything else merged since (#391, #393) is
> documentation, and #392's other files (`ios/RFTokens.swift`, `mockups/theme.css`,
> `scripts/check-contrast.mjs`) ship in neither the Worker nor the SPA. **iOS:** `RFColor.liveDanger`
> changes value and `RFColorPrimitive.ember200` is added; `ember300` is retained as a ramp step with no
> semantic role pointing at it, so no Swift constant was removed.
>
> Rollback anchor: prior live `75fc1b8d-80c9-40a7-a814-3b34dd5b772f`. Remote D1: **no migrations to
> apply** (checked before deploy). Full pre-deploy gate green on these exact bytes from the repository
> root (format / typecheck / lint / design verify / theme-classes / unit / integration / web build /
> openapi no-drift / contract-parity / audit:ci). SPA built before the Worker deploy.
>
> Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200`,
> protected `classes` / `explore` / `teams` → `401`, all six security headers present, and the mounted
> launch routes (shares, provider search, playlist import, class cover, class tags, moves) reach their
> handlers as `401` rather than `404`. Served entry `assets/index-Z_q6zbAu.js`, confirmed by **three
> consecutive** cache-busted fetches — the first six probes alternated old/new/new/old/new/old exactly as
> this runbook's propagation note predicts, so a single check would have proved nothing either way.
> **The fix itself was verified on production, not merely the deploy:** the served stylesheet carries
> `--rf-color-semantic-live-danger: #EF8572` in both theme blocks, `--rf-color-primitive-ember-200`, and
> an intact `.bg-bg-live` re-map block. `#EE7A66` survives only as `--rf-color-primitive-ember-300`,
> pointed at by nothing.

> **Session 2026-07-27 (F-05 truthful playlist counts) — deployed (Worker
> `75fc1b8d-80c9-40a7-a814-3b34dd5b772f`).** Main HEAD `a657299`. Carries **PR #390**, the fix for a
> defect found by verifying the audit's live-provider gap against a real account: all 70 saved Apple
> Music playlists rendered "0 tracks", on every list row and in the detail header, directly above their
> real tracks. Apple's `/v1/me/library/playlists` attributes carry no `trackCount`, so the `?? 0` fallback
> fired every time. `ProviderPlaylistSummary.trackCount` is now `number | null` and the count is omitted
> when unknown, rather than fetching tracks for 70 playlists to compute one. **Shared-contract change** —
> the OpenAPI schema widens to `anyOf: [integer, null]`; iOS contract parity reports no drift, as
> `trackCount` is not in the run-payload DTO. Also **PR #389**, the verification record. No schema /
> migration. Rollback anchor: prior Worker `d0a89df6-82cd-40bd-ac79-1b5287d324aa`.
>
> **Gate evidence.** Deployed tree byte-identical to the tree CI passed on `cf149f1`. Post-deploy smoke
> passed: SPA and health `200`; protected routes `401`; all six security headers present; served entry
> `assets/index-D8cUcxps.js` with SHA-256
> `026de5f86612f6774965d5474feedd23612261141349913aaa07593489ab5088` matching the build.
>
> **Verified live after deploy**, in a real Chrome against the same Apple Music account that exposed the
> bug: zero occurrences of "0 tracks" anywhere in the playlist browser, list rows and detail header both
> reading "Apple Music" alone, track lists unchanged. **SYS-02 also self-verified** — the "Update
> available / a fresh build is ready" prompt fired on its own when this build landed, with its
> "reloading does not change saved classes or music-connection settings" reassurance, and behaved
> correctly on reload. SYS-02 was `code-confirmed` only in the 2026-07-24 audit; this is the first time
> it has been observed.
>
> **Propagation is not instant, and the runbook's asset check was too weak.** The first post-deploy fetch
> returned the *previous* entry, and four cache-busted fetches then alternated old/new/old/new — edge
> nodes held different versions of `index.html` — before settling a couple of minutes later. A single
> cache-busted fetch can hit either version, so it proves nothing. The runbook now requires **three
> consecutive** agreeing fetches before a mismatch is worth investigating.

> **Session 2026-07-27 (realign prod with `main`) — deployed (Worker
> `d0a89df6-82cd-40bd-ac79-1b5287d324aa`).** Main HEAD `cc772af`. A bookkeeping deploy taken so
> `deployed == main` holds as an operational invariant: **no user-visible change**. It carries **PR
> #385** (deleting the orphaned `AccountDialog.tsx`, porting its two uncovered test paths into
> `Dashboard.test.tsx`, and repointing surface ID ACC-02 at `AccountWorkspace`) and **PR #386** (the
> deploy record for `085a153f`). No schema / migration — remote D1 "No migrations to apply". `apps/api`
> and `packages` were untouched since `4aadd66`, so the Worker bundle input was unchanged. Rollback
> anchor: prior Worker `085a153f-fa09-410b-ba4a-c248022a58c2`.
>
> **The functional delta was measured, not assumed.** `4aadd66` was rebuilt in a separate worktree — it
> reproduced the exact entry hash production was serving, proving the build deterministic and the
> comparison sound. Against a build of `cc772af`: **every JS chunk is byte-identical once chunk-filename
> references are normalized** (all nine, entry included), and the sole content change is the CSS dropping
> two rules — `.w-12{width:3rem}` and `.hover\:opacity-90:hover{opacity:.9}` — which existed only because
> the deleted component used them (0 live references each). The deployed bundle never contained
> `AccountDialog` at all, confirming it was unreachable and that #384's fix to it was latent-only. Cost
> of the deploy was therefore a full asset-filename turnover (10 of 13 stems, cache-bust + service-worker
> precache invalidation) to remove ~50 bytes of dead CSS — accepted deliberately for the invariant.
>
> **Post-deploy smoke passed:** SPA and health `200`; `/classes`, `/explore`, `/teams` `401`
> unauthenticated; all six required security headers present; `/api/v1/auth/capabilities` still
> `{"access":{"mode":"invite_only"}}`. Served entry `assets/index-D1tZB2BT.js` (SHA-256
> `ad91d7d2ed518604494631a76f32b1ac52db775acc6abe428eeb3f5b0f7f2ac3`) and CSS
> `assets/index-lKV5nKyd.css` both matched the build, with the two dropped rules confirmed absent from
> production CSS.
>
> **Asset-hash transient, worth knowing:** the first post-deploy hash check disagreed with the build
> (`f4e544…` vs `ad91d7d2…`) seconds after upload; three cache-busted re-fetches then returned the
> correct bytes on every attempt. This is the case the runbook already anticipates — cache-bust before
> diagnosing a rollback — and the window is real but brief. **Do not read a single disagreeing hash
> immediately after deploy as a broken release.**

> **Session 2026-07-27 (2026-07-24 design-audit implementation run) — deployed (Worker
> `085a153f-fa09-410b-ba4a-c248022a58c2`).** Main HEAD `4aadd66`. The largest user-visible batch since
> launch: **12 app-code commits**, carrying all six implementation prompts of the 2026-07-24 Claude
> design audit — **PR #370** (shared foundations: one `.rf-focus-ring`, the Live AAA contrast fix and
> its gate, `ClassPulse`, the canon intensity control), **#375** (Music rebuilt as a sourcing workspace
> on a shared `SourceList`), **#377** (Classes ranked by teaching readiness with a per-card next-step
> verb), **#378** (Live queue density and runtime composition), **#379** (move picker grouped by
> discipline), and **#380** (truthful account/state copy, derived `betaAccessMode`) — plus **#382**
> (WCAG 1.4.10 reflow repair: the move picker `<select>` was widening the document to 425px at a 320px
> viewport) and **#384** (three color classes Tailwind never generated, used in 12 places). Also
> includes **#365**, the iOS contract-parity baseline. **No schema / migration** — remote D1 reported
> "No migrations to apply" both before and after. Rollback anchor: prior Worker
> `c25b7515-c92f-462e-8686-24289774687e` (deployed 2026-07-24 18:40 UTC).
>
> **Gate evidence.** The deployed tree (`9d8925df…`) is byte-identical to the tree GitHub CI passed on
> `7418156`, so the full workflow — formatting, typecheck, lint, design-system verification, 689 web +
> 431 API + 30 music tests, Worker/D1 integration, production build, OpenAPI no-drift, iOS contract
> parity, and the dependency audit — covers exactly what shipped. Post-deploy smoke passed: SPA and
> health `200`; `/classes`, `/explore`, `/teams` `401` unauthenticated; HSTS, CSP, Permissions-Policy,
> Referrer-Policy, `X-Content-Type-Options`, and `X-Frame-Options` all present. Served SPA asset
> `assets/index-BZs5V4Fv.js` matched the production build with SHA-256
> `96048dc4356ef7e0fb7d87aadf1c1075a205d2dc8d08324ebe63018ebfef2dd4`. `BETA_ALLOWED_EMAILS` confirmed
> present in `wrangler secret list` (names only).
>
> **Deviation, deliberate:** `AGENTS.md` says auth changes deploy on their own, and this batch included
> `apps/api/src/lib/auth.ts` and `routes/auth.ts` (#380). Shipped together because the delta is provably
> inert in production — `betaAccessMode` encodes the identical condition the previous hard-coded
> constant did, and on a non-localhost `BETTER_AUTH_URL` it can only return `invite_only`. Confirmed
> live after deploy: `/api/v1/auth/capabilities` returns `{"access":{"mode":"invite_only"}}`. Had it
> returned `open`, that would have been an open signup gate and cause for immediate rollback. **The next
> auth change should go on its own** rather than treating this as precedent.
>
> **Live-provider paths remain unverified.** The whole audit run was local against
> `MOCK_PROVIDERS=true`, so MUS-05 (populated playlist detail), LIVE-09 (runtime playback failure), and
> BLD-15/16 (preview failure, clip completion) shipped without ever being exercised — they exist only
> where real provider audio does. Run the live connect/playback checks in a real browser before treating
> any of them as working; do not read this entry as verification.

> **Session 2026-07-24 (all-harden round 24 + dependency hardening) — deployed (Worker
> `c25b7515-c92f-462e-8686-24289774687e`).** Main HEAD `e36fcf9` contains three sequential
> disjoint-lane PRs with green combined CI: **PR #360** serializes Live Screen Wake Lock acquisition
> and ignores stale sentinel releases; **PR #361** enforces the existing 50-character / 20-unique-tag
> class contract atomically at the write boundary while preserving duplicate-add success; and **PR
> #362** makes malformed later Spotify saved-track, saved-playlist, and playlist-track pages fail
> closed instead of returning misleading partial results. The release also includes **PR #359**'s
> Hono, Better Auth, and PostCSS advisory updates plus workspace-routing documentation. Code, tests,
> generated OpenAPI, and dependency updates — **no schema / migration** (remote D1: "No migrations
> to apply"). Rollback anchor: prior Worker `2456a149-c2a0-43b0-b8fb-b1a282b31d49`. The exact clean
> release tree passed formatting, typecheck, lint, design-system verification, 635 web tests, 428 API
> unit tests, 30 music-package tests, 151 Worker/D1 integration tests, production build, OpenAPI
> no-drift, contract parity, dependency-audit policy, and `git diff --check`. Post-deploy smoke passed:
> SPA and health `200`; protected class, community, share, playlist-import, cover/tag, and provider
> routes `401`; missing public cover `404`; required security headers present; and Cloudflare reported
> the new Worker version at 100%. Served SPA asset `assets/index-BtwXnVAT.js` matched the production
> build with SHA-256
> `d0969cf1b658fa0c46f94342ac0b4c8153c898ed155ab56cd6b78fc85fa90095`. A signed-in browser
> initially loaded the prior service-worker shell, displayed the update prompt, and advanced through
> "Reload now" to the deployed entry asset; the workspace restored with no browser warnings, errors,
> or horizontal overflow. No audible provider playback or production-data mutation was performed.

> **Session 2026-07-20–21 (full-product UI upgrade closeout) — deployed (Worker
> `2456a149-c2a0-43b0-b8fb-b1a282b31d49`).** Main HEAD `1be7d7e` closes the approved six-slice
> D20/D21 full-product sequence and its post-sequence reconciliation: shared UI foundations (**PR
> #350**), Class Pulse and Classes (**PR #351**), music/provider truth (**PR #352**), Builder
> workbench (**PR #353**), Live pressure hierarchy (**PR #354**), public/auth/Account trust (**PR
> #356**), and the three narrow reconciliation repairs (**PR #357**). The repair PR stacks the
> not-found safe-return card and liked-track creation action at phone widths and raises tutorial
> Pause/Replay controls to the established 44px target. Client-only web changes — **no schema /
> migration** (remote D1: "No migrations to apply"). Rollback anchor: prior Worker
> `5d68832a-6959-472a-8750-96feea7e46ac`. The complete final local gate and GitHub CI passed:
> formatting, typecheck, lint, design-system verification, 632 web tests, 425 API unit tests, 30
> music-package tests, 149 Worker/D1 integration tests, production build, OpenAPI no-drift,
> contract parity, dependency-audit policy, and `git diff --check`. Browser QA covered 1440×1000,
> 1280×800, 390×844, direct 320px, and 640×400 reflow. Post-deploy smoke passed: SPA and health
> `200`; protected class, community, provider, cover, and tag routes returned the expected `401`;
> required security headers were present. Served SPA asset `assets/index-CItIH7Ro.js` matched the
> production build with SHA-256
> `fb2df89351373052f69b4d263f1b6c099225d8ce2485a2a9f9c383d3ed7c2927`. A signed-in production
> pass confirmed the not-found recovery and liked-track import layouts at phone widths with no
> overflow, overlap, clipping, or browser warnings. The stale-service-worker recovery prompt also
> moved the browser from the prior shell to the deployed entry asset. Production did not create a
> new account solely to retrigger the one-time onboarding tutorial; its 44px control behavior was
> verified locally and the deployed JavaScript matched that build byte-for-byte. Real SoundCloud
> resume/reconnect/clip-completion remains a separately authorized provider-runtime check, not a
> claim of this UI release. Consolidated evidence and explicit deferrals are recorded in
> `docs/audits/2026-07-19-full-product-preview/implementation-evidence/07-full-product-reconciliation/README.md`.

> **Session 2026-07-20 (Slice 5 Live pressure hierarchy) — deployed (Worker
> `5d68832a-6959-472a-8750-96feea7e46ac`).** Main HEAD `07777e4` (merge of **PR #354**) establishes
> the approved Live teaching hierarchy: current authored cue/count, next cue, transport, then time and
> effort. Queue, preflight, ready, active, paused, compact full-list, prompter-only, and recovery states
> reuse the landed Class Pulse, provider-truth, focus, target-size, reduced-motion, and shared recovery
> contracts. Code and tests only — **no schema / migration** (remote D1: "No migrations to apply").
> Rollback anchor: prior Worker `65a69959-c7b7-411a-a15c-7fc33b701669`. The final local and GitHub CI
> gates passed: formatting, typecheck, lint, design-system verification, 615 web tests, 425 API unit
> tests, 30 music-package tests, 149 Worker/D1 integration tests, production build, OpenAPI no-drift,
> contract parity, and dependency-audit policy. Browser QA covered 1440×1000, 1280×800, 390×844,
> direct 320px, and 640×400 reflow with no horizontal overflow; production also exercised the stale
> service-worker update notice and confirmed Refresh moved from the prior shell to the new entry asset.
> Post-deploy smoke passed on `https://ritmofit.studio`: SPA and health `200`; protected class,
> community, share, playlist-import, cover/tag, and provider routes `401`; missing public cover `404`;
> security headers present. Served SPA asset `assets/index-CmPI6kGU.js` matched the production build
> with SHA-256 `9ece6c846d630f6abe66a65803ae106880df95d0c23c5f844bdfa808e07effb8`, and Cloudflare reported
> the new Worker version at 100%. The signed-in production Live queue rendered the new hierarchy with
> no browser warnings/errors. No authorized audible provider verification was performed during this
> release; playback runtime and provider adapters were unchanged.

> **Session 2026-07-17 (all-harden round 23) — deployed (Worker
> `65a69959-c7b7-411a-a15c-7fc33b701669`).** Application-code source `f193abd` (merge of **PR
> #341**) contains three sequential disjoint-lane PRs with green combined CI, plus the earlier
> **PR #338** atomic cue/move anchor-write follow-up that had already reached `main`. Code and tests
> only — **no schema / migration** (remote D1: "No migrations to apply"). Rollback anchor: prior live
> Worker `5e04d218-dada-4d28-beba-88d19144bb09` (the intermediate #338-only production publish that
> landed after round 22 without a HISTORY line; round 22 Worker was
> `8182f11f-c0c7-4678-b93a-898d27a34695`). **PR #340** normalizes Apple catalog `getPlaylist` paging
> so page-2+ URLs carry exactly one `limit=300`. **PR #342** makes `PATCH /class-tracks/:id`
> clip-window updates re-check exterior cues/moves inside the authoritative `UPDATE`, closing the
> inverse of the #338 race. **PR #341** refreshes Account Music connections when Manage
> disconnect/connect bumps `connectionRevision` (Music resting shelves were already covered). The
> full pre-deploy gate passed: formatting, typecheck, lint, design-system verification, 570 web
> tests, API unit tests, 30 music-package tests, 149 Worker/D1 integration tests, production build,
> OpenAPI no-drift, contract parity, and dependency-audit policy. Post-deploy smoke passed on
> `https://ritmofit.studio`: SPA and health `200`; protected class, community, share,
> playlist-import, cover, and provider routes `401`; security headers present. Served SPA asset
> `assets/index-Cu2ptcuQ.js` matched the production build with SHA-256
> `f1f0186199b418ad3a40c63a385441c9880710acf5716f0e5f2ecba84e3045e0`, and Cloudflare reported
> the new Worker version at 100%.

> **Session 2026-07-17 (round 22 atomic choreography follow-up) — merged, not deployed.** Main
> reached `9841f11` (merge of **PR #338**) after the round 22 production deployment. The follow-up
> makes cue and placed-move creates and anchor-changing updates re-check the effective half-open track
> window inside their authoritative `INSERT` / `UPDATE` statement, closing the documented race with a
> concurrent library-duration shrink. Precise preflight validation remains; a zero-row write is
> diagnosed as the current `422` or a retryable `409` if timing changed back. A deterministic
> stale-preflight regression proved that the guarded production insert persists no invalid cue, and a
> mutation check failed when its predicate was removed. The full local and GitHub CI gates passed:
> formatting, typecheck, lint, design-system verification, 569 web tests, 423 API unit tests, 30
> music-package tests, 146 Worker/D1 integration tests, production build, OpenAPI no-drift, contract
> parity, and dependency-audit policy. Code and tests only — **no schema / migration**. Production
> remains on the round 22 Worker and application source recorded immediately below; deploy requires a
> fresh owner gate. A separate analogous race in `PATCH /class-tracks/:id` clip-window mutation was
> discovered during review and is not changed by PR #338.

> **Session 2026-07-17 (all-harden round 22) — deployed (Worker
> `8182f11f-c0c7-4678-b93a-898d27a34695`).** Application-code source `249378a` (merge of **PR
> #337**) contains three sequential disjoint-lane PRs with green combined CI. Code and tests only —
> **no schema / migration** (remote D1: "No migrations to apply"). Rollback anchor: prior live Worker
> `70262215-3ee3-4ff4-b412-60e46eae1b8b`. **PR #335** makes Apple Music library-song and
> library-playlist pagination fail closed when a later page has a malformed envelope instead of
> returning misleading partial results. **PR #336** atomically rejects inherited library-duration
> shrinks that would put a placement clip start, cue, or placed move at or beyond the new exclusive
> end. **PR #337** keeps Songs by Move results aligned with the latest selection by ignoring stale
> successes, failures, and completion writes. The full final-main gate passed: formatting, typecheck,
> lint, design-system verification, 569 web tests, 423 API unit tests, 30 music-package tests, 140
> Worker/D1 integration tests, production build, OpenAPI no-drift, contract parity, and
> dependency-audit policy. Post-deploy smoke passed on `https://ritmofit.studio`: SPA and health
> `200`; protected class, community, share, playlist-import, cover/tag, and provider routes `401`;
> missing public cover `404`; security headers present. Served SPA asset
> `assets/index-De9ebYam.js` matched the production build with SHA-256
> `c884006736f4bae7ea0461a5030a83c59c9ee844ab04ce252684b625a788ec15`, and Cloudflare reported
> the new Worker version at 100%.

> **Session 2026-07-16 (all-harden round 19) — deployed (Worker
> `9d144446-bd89-4792-9fda-64220eb122b9`).** Deploying checkout HEAD `dc998dd` (application-code
> source `68dfc27`, merge of PR #324) contains three sequential disjoint-lane PRs with green combined
> CI. Code and tests only — **no schema / migration** (remote D1: "No migrations to apply"). Rollback
> anchor: prior live Worker `85b139e3-981d-44a5-b3ff-29389d1e8ce4`. **PR #322** makes Apple
> saved-playlist pagination fail closed when
> any later track page is malformed instead of returning a partial playlist that can appear to import
> successfully. **PR #323** centralizes the monotonic class-recency touch and applies it after a
> non-empty playlist URL import, with a real Miniflare D1 ordering regression and an empty-import no-op
> lock. **PR #324** makes Live provider-connection refreshes fail closed, last-request-wins, and immune
> to late post-unmount success/failure writes. The full final-main gate passed: formatting, typecheck,
> lint, design-system verification, 552 web tests, 415 API unit tests, 30 music-package tests, 136
> Worker/D1 integration tests, production build, OpenAPI no-drift, contract parity, and
> dependency-audit policy; desktop and 390×844 keyboard browser QA passed for the Live change.
> Post-deploy smoke passed on `https://ritmofit.studio`: SPA and health `200`; protected class,
> community, share, playlist-import, cover/tag, and provider routes `401`; missing public cover `404`;
> security headers present. Served SPA asset `assets/index-BoLBQItP.js` matches the production build,
> and Cloudflare reports the new Worker version at 100%.

> **Session 2026-07-15 (mixed feature/harden round 18) — deployed (Worker
> `85b139e3-981d-44a5-b3ff-29389d1e8ce4`).** Main HEAD `79be29c` (merge of PR #320). Code and tests
> only — **no schema / migration** (remote D1: "No migrations to apply"). Rollback anchor: prior live
> Worker `de9f5cc5-f697-4f40-89e3-a9ba5e48b37b`. Three disjoint-lane PRs shipped through the standard
> sequential update-branch, CI, and merge train: **PR #318** makes choreography honor the playback
> clip's half-open interval by rejecting cues/moves at the unreachable exclusive end and preventing a
> later clip shrink onto the latest anchor; **PR #319** caps Spotify saved-track paging inside a page
> at the requested `maxTracks`; **PR #320** opens Music Connections from Live preflight, refreshes
> readiness after in-place connection changes, and states honestly that Spotify/SoundCloud OAuth leaves
> Live. The full merged-main gate passed: formatting, typecheck, lint, design-system verification, 549
> web tests, 414 API unit tests, 30 music-package tests, 135 Worker/D1 integration tests, production
> build, OpenAPI no-drift, contract parity, and dependency-audit policy. Post-deploy smoke passed on
> `https://ritmofit.studio`: SPA and health `200`; protected class, community, share, playlist-import,
> cover/tag, and provider routes `401`; missing public cover `404`; security headers present. Served
> SPA asset `assets/index-D6vkg-2R.js` matches the production build, and Cloudflare reports the new
> Worker version at 100%.

> **Session 2026-07-15 (mixed polish/harden round 17) — deployed (Worker
> `de9f5cc5-f697-4f40-89e3-a9ba5e48b37b`).** Main HEAD `31fbba1` (merge of PR #316). Code and tests
> only — **no schema / migration** (remote D1: "No migrations to apply"). Rollback anchor: prior live
> Worker `b4449c8d-5978-4298-9c6e-e222791a208f`. Three disjoint-lane PRs shipped through the standard
> sequential update-branch, CI, and merge train: **PR #314** caps Apple Music library-song paging at
> the requested `maxTracks` within a page; **PR #315** refreshes parent class recency after successful
> class-track mutations so recent ordering and keyset pagination stay truthful; **PR #316** replaces
> false provider-disconnected guidance with an honest, retryable Music connection-load state. The full
> pre-deploy gate passed: formatting, typecheck, lint, design-system verification, 547 web tests, 412
> API unit tests, 30 music-package tests, 134 Worker/D1 integration tests, production build, OpenAPI
> no-drift, contract parity, and dependency-audit policy. Post-deploy smoke passed on
> `https://ritmofit.studio`: SPA and health `200`; protected class, community, share, playlist-import,
> cover, and provider routes `401`; missing public cover `404`; security headers present. Served SPA
> asset `assets/index-CTl7CDqh.js` matches the production build, and Cloudflare reports the new Worker
> version at 100%.

> **Session 2026-07-15 (private-beta hardening rounds 15–16 + SoundCloud playback follow-up) —
> deployed (Worker `b4449c8d-5978-4298-9c6e-e222791a208f`).** Main HEAD `115b003` (merge of PR
> #311). Code, tests, and documentation only — **no schema / migration** (remote D1: "No migrations
> to apply"). Rollback anchor: prior live Worker `2b390842-8f71-4086-a59a-6ea3050d4882`. The release
> ships the six round 15–16 hardening PRs (#304–#309), their session record (#310), and PR #311's
> corrected full-track SoundCloud mock fixture. Owner testing heard the official SoundCloud widget in
> both Preview and Live Mode; the follow-up replaced an obsolete permalink and then a 30-second
> `SNIP` release with Bakermat's full public upload, with a regression test pinning that fixture. The
> full pre-deploy gate passed: formatting, typecheck, lint, design-system verification, unit/component
> tests, 133 Worker/D1 integration tests, production build, OpenAPI no-drift, contract parity, and
> dependency-audit policy. Post-deploy smoke passed on `https://ritmofit.studio`: SPA and health `200`;
> protected class, community, share, playlist-import, cover/tag, and provider routes `401`; missing
> public cover `404`; invite-only capability and security headers present. Served SPA asset
> `assets/index-Db7zXm3P.js` matches the production build. The custom domain briefly returned the prior
> cached entry during edge propagation; cache-busted rechecks converged with the direct Worker endpoint.

> **Session 2026-07-15 (private-beta hardening rounds 15–16) — merged, not deployed.** Main
> reached `12663a4` (merge of PR #309) through six sequential PRs, all with green combined CI; code and
> tests only — **no schema / migration**. **PR #304** kept invite-only signup fail-closed when provider
> mocks are enabled. **PR #305** accepted SoundCloud resources that expose the current URN identity
> without the deprecated numeric id. **PR #306** waited for the official SoundCloud Widget `PLAY`
> acknowledgement before reporting playback active. **PR #307** stopped generated beta invitations
> from leaking across integration tests and proved existing users can still sign in after leaving the
> allowlist. **PR #308** treated legacy numeric SoundCloud track ids and their decimal URNs as the same
> library identity without rewriting stored rows. **PR #309** made pending playback transitions
> cancellable so late acknowledgements cannot revive stopped or superseded audio. Headed Chromium
> against the official SoundCloud widget observed ready, play, pause, resume, replacement, and teardown
> acknowledgements; this verifies widget command/state transitions, **not independently machine-heard
> audio**. Production was **not deployed** in these rounds and remains at the invite-only private-beta
> Worker `2b390842-8f71-4086-a59a-6ea3050d4882` recorded in the previous entry (main `3e21611`, served
> SPA asset `assets/index-DTHma_pV.js`).

> **Session 2026-07-14 (invite-only personal beta v1) — deployed (Worker
> `2b390842-8f71-4086-a59a-6ea3050d4882`).** Main HEAD `3e21611` (merge of PR #302).
> Code, generated contract, and documentation only — **no schema / migration** (remote D1: "No
> migrations to apply"). Rollback anchor before the release: Worker
> `d09da7c1-3cbd-43b9-9951-c1cfa606cab8` (the preceding secret-change version); the prior code
> deployment was `4e009966-6a4c-47ef-8994-c88aa6613680`. Production now has the
> `BETA_ALLOWED_EMAILS` secret and advertises `access.mode = invite_only`; existing accounts may sign
> in while new account creation fails closed outside the allowlist. The release keeps official
> provider SDK/widget playback alongside music-off Live Mode, adds provider-source attribution,
> structured provider errors, reactive readiness updates, private-beta/privacy copy, and removes
> deferred community surfaces from the active UI. Full local and GitHub CI gates passed: formatting,
> typecheck, lint, design-system verification, 534 web tests, 406 API unit tests, 131 Worker/D1
> integration tests, production build, OpenAPI no-drift, contract parity, and dependency-audit policy.
> A visible local browser demo covered signup, onboarding, SoundCloud mock connection, search/import,
> BPM, cue/move authoring, readiness, preflight, and both Live views with no browser warnings/errors.
> Post-deploy smoke passed on `https://ritmofit.studio`: `/`, `/privacy`, and health `200`; protected
> class/community/provider routes `401`; missing public cover `404 NOT_FOUND`; security headers
> present; invite-only capability live; served SPA asset `assets/index-DTHma_pV.js` exactly matched the
> production build. HTTP smoke used Node's built-in `fetch` because `curl` was unavailable in this
> shell.

> **Session 2026-07-14 (all-harden round — four-PR release) — deployed (Worker
> `4e009966-6a4c-47ef-8994-c88aa6613680`).** Main HEAD `ad53541` (merge of PR #300). Code and
> documentation only — **no schema / migration** (remote D1: "No migrations to apply"). Rollback
> anchor: prior live `812b97ce-e04d-40b6-b709-316445fa8b9a`. **PR #297** repaired the public-cover
> route/auth contract, made the class-copy OpenAPI body optional to match runtime, and reconciled the
> production-state documentation. **PR #298** rejects partial Apple Music playlist imports when a later
> page is malformed instead of silently returning a truncated playlist. **PR #299** prevents bulk and
> per-row saved-playlist adds from overlapping in the web UI. **PR #300** rejects library-track duration
> reductions that would invalidate dependent clipped placements. The full pre-deploy gate passed:
> formatting, typecheck, lint, design-system verification, 529 web tests, 400 API unit tests, 129
> Worker/D1 integration tests, production build, OpenAPI no-drift, contract parity, and dependency audit
> policy. Post-deploy smoke passed on `https://ritmofit.studio`: SPA and health `200`; protected launch
> routes `401`; a missing public cover `404` without auth; security headers present; live SPA asset
> `assets/index-BxRw-uUk.js` matches the local build. The custom-domain HTML briefly returned the prior
> cached entry during edge propagation; cache-busted rechecks converged with the direct Worker endpoint.

> **Production realignment verification 2026-07-13 — round-13 Worker and SPA deployed; no migration
> change.** Cloudflare reports Worker version `812b97ce-e04d-40b6-b709-316445fa8b9a` at 100%, created
> 2026-07-14 03:10:48 UTC after round-13 `main` reached `34ef84e`. Live HTML independently served
> `assets/index-CV-cI48s.js`, the round-13 SPA asset recorded in the preceding verification. Remote D1
> reported "No migrations to apply." This newer deployment supersedes the split-state operational
> conclusion below: production is realigned on the round-13 release. Continue to verify Worker version
> and SPA asset independently after every deployment; neither signal proves the other.

> **Production alignment verification 2026-07-13 — live SPA and Worker API are not from the same
> source state; no mutation performed.** Live HTML served `assets/index-CV-cI48s.js`; its public bundle
> SHA-256 (`accbecf9f40c735cc97da7fe5f629c79e90387adee00373eeae9b5dd7213273c`) exactly matched a
> clean web build of `origin/main` at `34ef84e` (round 13). Cloudflare deployment status, however,
> remained on Worker version `832547d5-a7ea-4683-8507-1e647c1268eb` (version 133, uploaded
> 2026-07-12 20:50:20 UTC). `wrangler versions view` showed that version and the recorded round-12
> version `a83a71d2-9a24-4ba3-af8e-8c01b595e0fb` have the identical Worker script etag
> `61ff731b...e8b72f2d`, bindings, compatibility settings, and asset-header configuration. A clean
> build of round-12 HEAD `696c915` produced the earlier recorded SPA entry `index-CtVDbqcN.js`, not
> the currently served entry. Version 133 was uploaded 39 seconds after docs-only PR #291 merged, but
> Cloudflare's version metadata does not prove when or from which checkout the later static assets were
> uploaded. Remote D1 reported "No migrations to apply." **Operational conclusion:** production must
> be treated as split and not aligned with `main`; the round-13 API fixes are not proven live. A full,
> owner-approved build + Worker deploy is required to re-establish one-source alignment. Query live
> Worker status and the served SPA hash independently; this chronological entry is not a substitute for
> a current check.

> **Session 2026-07-12 (polish + harden mixed round — twelfth parallel lane-agent round) — deployed
> (Worker `a83a71d2-9a24-4ba3-af8e-8c01b595e0fb`).** Main HEAD `696c915` (merge of PR #290). Code-only
> — **no schema / migration** (remote D1: "No migrations to apply"). Rollback anchor: prior live
> `1a6c1d5a-bd69-4385-84b9-c93c9fcd97dd`. **THREE-lane round** (walked back from 4; lane 4 idle): one
> front-end polish lane (1) beside two back-end harden lanes (2, 3). Three disjoint-lane PRs merged
> via the standard train (sequential `update-branch` → combined CI → merge; zero cross-lane conflicts).
> **PR #288** (BE, provider/music) — *bound Spotify catalog getPlaylist paging to 500 tracks*: caps
> unbounded iteration for pasted public playlists. **PR #289** (BE, class-core) — *bound offsetMsSchema
> to MAX_DURATION_MS*: caps section/cue/move anchors (+ user-move delete cascade test-only lock).
> **PR #290** (FE, Builder) — *focus management for adding tracks and inspector*: structural focus
> returns when tracks are added or inspected. Pre-deploy full CI gate green. Post-deploy smoke green
> on live `https://ritmofit.studio`: SPA `/` → `200` (served hash `index-CtVDbqcN.js` matches build),
> `/api/v1/health` → `200`, unauth `/api/v1/classes` → `401`, security headers present.

> **Session 2026-07-11 (polish-led mixed round — eleventh parallel lane-agent round) — deployed
> (Worker `1a6c1d5a-bd69-4385-84b9-c93c9fcd97dd`).** Main HEAD `7b82282` (merge of PR #286). Code-only
> — **no schema / migration** (remote D1: "No migrations to apply"). Rollback anchor: prior live
> `b0d0fe54-b2e8-486e-9cb7-ebb80f360a42`. **Second FOUR-lane round**, first *polish-led* one: two
> front-end polish/craft lanes (1, 4) beside two back-end audit-first harden lanes (2, 3); SPA split
> at the component level with `Dashboard.tsx` single-owned by lane 1. Four disjoint-lane slices merged
> via the standard train (sequential `update-branch` → combined CI → merge; zero cross-lane conflicts;
> neither BE lane regenerated the OpenAPI spec, so no coordinate). Every plan-gate finding was
> verified against the actual code before approval. **PR #286** (FE, Builder) — *return focus after
> removing a track*: removing a track unmounted the inspector holding the focused "Remove track"
> button, dropping focus to `<body>` (keyboard/AT users lost their place); focus now returns to the
> nearest remaining track's row (the one sliding into the removed slot, else the previous), or the
> placeholder when the class empties. Load-bearing change: the post-remove refresh became *silent*
> (mirroring the existing `onReordered` path) so `ClassWorkspace` stays mounted and a `useLayoutEffect`
> restores focus before paint — side benefit, the "Loading class…" flash on every removal is gone.
> Browser-verified; FE-only, +2 tests. **PR #285** (FE, Live/Account) — *surface the playback-reconnect
> state in Connections*: the playback coordinator computes `playback_reauth_required` via
> `connectionHasPlaybackScope` and Live preflight tells the instructor "Reconnect Spotify for
> playback", but `ConnectionsDialog` never called that helper — a live-token-but-no-`streaming`
> Spotify connection rendered as a plain "✓ Connected" dead-end; now it shows a caution
> "Reconnect for playback" affordance mirroring the shipped saved-playlist block, with the playlist
> block gated on playback-scope-present so a both-scopes-missing connection shows a single reconnect
> button. FE-only, +tests. **PR #284** (BE, provider/music) — *cancel a pending provider purge on
> reconnect*: disconnect enqueues a deferred metadata purge drained by the daily Cron, which strips
> all `track_provider_ids` + album art for `(user, provider)` with no active-connection check — so a
> disconnect → reconnect → re-import inside the drain window silently wiped the freshly re-imported
> refs and turned playable class tracks unplayable; new `cancelProviderPurge` (deletes only
> drain-eligible `failedAt IS NULL` rows) called in `upsertConnection`, the single choke point for
> mock/OAuth-callback/Apple connects. Contract-neutral; +2 tests incl. a consequence-level survival
> lock (seed ref → reconnect → run real drain → assert ref + art survive). **PR #283** (BE, class-core)
> — *return 422 for an inverted clip window instead of 500*: `clipEndMs <= clipStartMs` passed the flat
> schema + the start-vs-length guard, hit the `class_tracks_clip_window_check` DB CHECK, and surfaced
> as an unhandled 500 rather than the documented 422 envelope; new route-level `clipWindowInverted`
> guard (mirrors `clipStartBeyondTrack`) in POST add + PATCH (PATCH on the merged window, so partial
> patches are caught); falsifier-verified (returned 500 before / 422 after); no shared-contract touch.
> Post-deploy smoke green (SPA 200 + served asset hash `index-MskxBG7r` matches build after an initial
> stale-edge-cache HIT cleared on cache-bust; `/api/v1/health` 200; unauth `/api/v1/classes` 401; HSTS
> · CSP · nosniff · frame-DENY · referrer-policy present). Parked follow-ups (see `INBOX.md`): bound
> `offsetMsSchema` (finding B, needs a coordinated `packages/shared` change); cap Spotify catalog
> `getPlaylist` paging (asymmetric with SoundCloud/Apple's 500 cap); Apple `getPlaylist` duplicate
> `limit` param (cosmetic); in-Live "Manage connections" overlay (composes on #285).

> **Session 2026-07-11 (mixed feature/harden round — D21 creator loop — tenth parallel lane-agent
> round) — deployed (Worker `b0d0fe54-b2e8-486e-9cb7-ebb80f360a42`).** Main HEAD `f03c51a` (merge of
> PR #281). Code-only — **no schema / migration** (remote D1: "No migrations to apply"). Rollback
> anchor: prior live `209a2a13-37d1-4edd-abc5-f7bdca0858dd`. **First FOUR-lane round** and first with
> two front-end feature lanes running beside two back-end harden lanes; the SPA was split at the
> component level with `Dashboard.tsx` given a single owner (lane 1) as the collision magnet. Four
> disjoint-lane slices merged via the standard train (sequential `update-branch` → combined CI →
> merge; zero cross-lane conflicts; neither BE lane regenerated the OpenAPI spec, so no coordinate).
> **PR #280** (FE, Builder/Music) — *m:ss time entry for cue/move/segment placement*: all six anchor
> inputs (add/edit cue, move, segment) now take `m:ss` instead of raw whole-seconds, matching the
> Duration/Trim fields and the row display; new anchor-safe `parseClockToMs` / `formatClockFromMs`
> (0:00 allowed, unlike duration parse); `aria-invalid` + non-color-only inline error with Add/Save
> disabled on malformed/past-the-end; folded in the `TODO(anchor-range)` clamp (out-of-range caught
> client-side, not as a generic 422); FE-only, +tests incl. explicit 0:00 case. **PR #281** (FE,
> Live/Account) — *surface wake-lock status in the Live transport*: `useWakeLock` now returns
> `'idle' | 'awake' | 'unavailable'` via `useState` (lock/re-acquire/cleanup logic untouched); a
> glyph+label `role="status"` chip shows "Screen awake" / "Screen may dim" (unsupported + denied
> collapse to one caution state), holding `awake` across a hidden-tab auto-release so it doesn't
> flicker; FE-only, +9 tests driving the real component. **PR #279** (BE, provider/music) — *make
> playlist-URL import best-effort*: the URL route's `Promise.all` (all-or-nothing) → `Promise.allSettled`
> so a raced 409 / transient D1 error on one track no longer aborts the whole class import and inserts
> zero `class_tracks`; a pure DB-free `partitionSettledImports` helper now backs both bulk importers
> (URL route + `importUserPlaylist`); response shape `{ imported }` unchanged (no OpenAPI touch); one
> stale doc-comment fix; +4 helper cases. **PR #278** (BE, class-core, test-only) — *lock the
> free-mode run-payload max-end duration invariant*: `computeFreeTimeline`'s total is `max(start +
> duration)` over all tracks, but every prior test had the last array item ending latest; a
> refactor to `last.start + last.duration` would have passed silently and truncated a long-opener /
> short-closer free-mode class in Live. Unit + integration lock (falsifier-verified by mutation); no
> product code.

> **Session 2026-07-11 (all-feature round — D21 creator loop — ninth parallel lane-agent round) —
> deployed (Worker `209a2a13-37d1-4edd-abc5-f7bdca0858dd`).** Code HEAD `76befee` (merge of PR #275);
> deployed from `main` @ `9ec2b12` (after docs merges #276/#277). Code-only — **no schema /
> migration** (remote D1: "No migrations to apply"). Rollback anchor: prior live
> `b883cae9-7067-49ed-9d0e-9f6d96eba9d3`. A second machine's session had merged an INBOX breadcrumb
> (#277) noting "the deploy will happen from another machine"; this session (the round-10
> orchestrator) is that machine and ran the deploy. The round-9 live provider checks (real
> SoundCloud/Apple catalog playlist-URL imports, Apple library-link 400) remain owner-pending.
> **All-feature** parallel round
> (owner-chosen) after the same-day all-harden round: three disjoint-lane feature slices merged via
> the standard train (sequential `update-branch` → combined CI → merge; zero cross-lane conflicts;
> one owner-authorized carve-out: lane 3 updated `TrackSearch.test.tsx` so the capability-gating
> tests derive from `providerCapabilities` instead of hard-coding the old matrix). **PR #274** (FE,
> web) — *snap dragged track starts to the preceding track's beat grid*: in free timeline mode,
> `TimelineStrip` gains exported pure helpers `trackStartGrid` / `snapTrackStart` (nearest preceding
> block with a known BPM; grid origin `startMs + beatAnchorMs − clipStartMs`, extended through the
> gap); pointer drags snap live under the existing "Snap to beat" toggle, ←/→ step one beat (Shift =
> one bar), whole-second fallback when snap is off or no grid precedes; FE-only, +14 tests. **PR
> #273** (BE, class-core) — *class copy carries free-timeline layout*: `POST /classes/:id/copy` now
> carries `timelineMode` on the class insert and, for free-mode sources, every authored
> `startOffsetMs` (owned duplicate and cross-user save-a-copy alike); sequential copies byte-for-byte
> unchanged; the trailing `resequence` needed no change (free mode only re-ranks positions); +3
> integration tests incl. the gap surviving into the copy's run-payload `totalDurationMs`. **PR
> #275** (BE, provider/music) — *playlist import-by-URL parity*: SoundCloud (app-token `/resolve`
> with manual-redirect handling → paged `/playlists/{urn}/tracks`; URN string-id tolerance added) and
> Apple Music catalog (developer token, storefront from the URL, cursor paging; `pl.u-…` accepted
> with a 404 fallback; library `p.…` links → clear 400 pointing at saved-playlist browsing) join
> Spotify behind `POST /classes/:id/import-playlist`; shared URL parser extracted to
> `packages/music/src/playlist-url.ts`; `providerCapabilities.playlistImport` flipped true for all
> three providers, lighting up the already-gated UI with zero component edits; OpenAPI summary
> updated (description-only regen); +40 unit / +7 integration tests. Round-close cleanup (this PR):
> stale-doc corrections (inline-reconnect note in `provider-playback-implementation.md`;
> editing-granularity follow-ups marked shipped), stale `TrackSearch.tsx` "Spotify-only" comment
> removed, unreachable import-playlist `501` dropped from the hand-maintained OpenAPI manifest, and
> a SoundCloud session-scoped metadata-caching terms note added to `music-providers.md`.

> **Session 2026-07-11 (all-harden round — D21 creator loop — eighth parallel lane-agent round) —
> deployed (Worker `b883cae9-7067-49ed-9d0e-9f6d96eba9d3`).** Main HEAD `a0be14b` (merge of PR #271).
> Code-only — **no schema / migration** (remote D1: "No migrations to apply"). Rollback anchor: prior
> live `6b8e1a48-6881-491f-8c3d-292b518919d9`. **All-harden** parallel round (owner-chosen) after the
> 2026-07-10 all-feature round: three disjoint-lane correctness/coverage slices, merged via the
> standard train (zero cross-lane conflicts; no OpenAPI coordinate this round — neither BE lane
> regenerated the spec). **PR #269** (FE) — *offer cross-provider resolve for `no_provider_ref`
> previews*: Builder `TrackPreview` no longer dead-ends manual-add / zero-ref tracks with text only;
> `UnplayableVerdict` reuses `ResolveProviderAction` for both `no_provider_ref` and
> `provider_not_playable`, differentiated by a `leadIn` prop ("No provider link yet" vs "Not on a
> provider Ritmo can play yet"); Spotify reauth path unchanged; FE-only; +4 `TrackPreview` tests
> (idle CTA, resolve success → playable overlay, error+retry, preserved not-playable copy). **PR
> #270** (BE, class-core) — *pin cross-user authz on by-id cue routes*: extends
> `nested-resource-access.integration.test.ts` to complete the #254 triad (sections · placed-moves ·
> **cues**): on a real cue under another user's class, stranger PATCH/DELETE → `404 NOT_FOUND`,
> view-share → `403 FORBIDDEN`, owner-200 positive control so the 404 is authz-hiding; test-only
> (no `authz.ts` / route / DTO change). **PR #271** (BE, provider/music) — *map post-refresh playlist
> Forbidden/AccessDenied to stable codes*: `readWithConnectedPlaylistToken` shared a first-path mapper
> for Forbidden → `409 REAUTH_REQUIRED` and AccessDenied → `403 PROVIDER_FORBIDDEN` but the
> reactive-refresh retry only mapped a second Unauthorized; post-refresh `SpotifyForbiddenError` /
> `SpotifyPlaylistAccessDeniedError` leaked as raw 5xx — fixed with shared
> `mapConnectedPlaylistReadError` on both catch sites + unit locks for 401→refresh→Forbidden and
> 401→refresh→AccessDenied; double-401 and first-path cases stay green. Pre-deploy: each PR merged
> green through the combined CI check; web build before deploy (`index-DnnH73Eb.js`). Post-deploy
> smoke on live `https://ritmofit.studio`: SPA `/` → `200` (served hash `index-DnnH73Eb.js` matches
> the build), `/api/v1/health` → `200`, `/api/v1/classes` · `/api/v1/explore` · `/api/v1/teams` →
> `401`, `/api/v1/providers/spotify/playlists` · `POST …/playlists/:id/import` → `401` (mounted, not
> `404`), security headers present (HSTS · CSP · Permissions-Policy · Referrer-Policy ·
> X-Content-Type-Options · X-Frame-Options). **Still open (unchanged):** owner live-verify of Spotify
> `/items` browse rendering real tracks + counts (filed after #260/#262).

> **Session 2026-07-10 (all-feature round — D21 creator loop — seventh parallel lane-agent round) —
> deployed (Worker `6b8e1a48-6881-491f-8c3d-292b518919d9`).** Main HEAD `4cc03c1` (merge of PR #267).
> Code-only — **no schema / migration** (remote D1: "No migrations to apply"). Rollback anchor: prior
> live `7deb2d20-d0c2-40a9-8a4a-966968d0c552`. First **all-feature** parallel round (owner-chosen):
> three disjoint-lane D21 feature slices, merged via the standard train (zero cross-lane conflicts;
> the one coordinate — two back-end lanes both regenerating `openapi.json` — resolved on the second BE
> PR by re-running `openapi` after `update-branch`, diff clean). **PR #265** (FE) — *honest readiness in
> the Live workspace queue*: replaced the naive `trackCount > 0 && totalDurationMs > 0` runnable
> heuristic with the real gate (`classReadiness(payload).runnable`, provably `≡ canRunPayload` — both
> bottom out on `tracksMissingDuration`), so a class can no longer look runnable in the queue then get
> blocked on click; every class with tracks now shows in the queue runnable-first, blocked ones with
> "Run live" disabled + the exact `runBlockedMessage` (wired via `aria-describedby`); per-card
> four-dimension readout reuses `ClassReadinessSummary` (`canEdit={false}`); the three hard-coded
> preflight tiles became real counts from a pure `summarizeQueue`; per-card loading/error/partial states
> with a fail-safe (unknown readiness never reads as runnable). FE-only, no contract change. **PR #266**
> (BE, provider/music) — *server-side bulk playlist import*: new `POST
> /providers/:provider/playlists/:playlistId/import` collapses the client's N-round-trip "Import all N"
> into one authed call over the caller's provider token across all three providers (no class required);
> reuses `fetchUserPlaylistTracks` + `importTrackFromCandidate` (references only — `displayBpm: null`, no
> provider/Spotify BPM, no audio cached/decoded), pure `dedupeByMatchKey`, 100-cap → `422`, bounded
> concurrency 5 with per-track best-effort (`skipped` tallied), returns `{ created, existing, skipped,
> tracks }` (invariant `tracks.length === created + existing`), `201`/`200`; new `provider-playlist-import`
> limiter (60s / max 5, per user — parity with the class-scoped importer). Additive; OpenAPI regen; no
> migration. **PR #267** (BE, class core) — *`sections[].id` in the run-payload*: the section projection
> now emits the `class_sections` row `id` (required field, mirroring cues/moves), with the required
> `Section.id` contract-parity allowlist entry (iOS `Section` uses a computed `var id` from
> `startOffsetMs`, not a decoded wire field) and an `api.md` doc update; the required-field addition's one
> web constructor break (`LiveMode.test.tsx` fixtures) was fixed atomically in the same PR. Additive;
> OpenAPI regen; no migration. Pre-deploy: full gate green (incl. `openapi` no-drift — 49 schemas, 51
> paths — and contract-parity). Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`
> (served hash `index-BRM6EhdN.js` matches the build), `/api/v1/health` → `200`, `/api/v1/classes` ·
> `/api/v1/explore` · `/api/v1/teams` → `401`, the new `POST …/playlists/:id/import` → `401` (mounted, not
> `404`), security headers present (HSTS · CSP · Permissions-Policy · Referrer-Policy ·
> X-Content-Type-Options · X-Frame-Options).

> **Session 2026-07-09 (Spotify browse polish + harden round — sixth parallel lane-agent round) —
> deployed (Worker `7deb2d20-d0c2-40a9-8a4a-966968d0c552`).** Main HEAD `f9aef8e` (merge of PR #263).
> Code-only — **no schema / migration** (remote D1: "No migrations to apply"). Three disjoint-lane PRs,
> merged via the standard train (each trailing branch update-branched against the new `main` and
> re-passed the combined CI check before merge; zero conflicts): **PR #261** — *sharpen Spotify
> saved-playlist browse empty/error states* (de-conflates a **failed load** from a **truly empty
> library** — they used to render together; opened-playlist gets distinct loading / empty / error copy;
> drill-in failures classified via `classifyPlaylistDrillInError` on the backend error message —
> `403` "own or collaborate on" → calm caution + Import-URL helper, no retry; `REAUTH_REQUIRED` /
> `NOT_CONNECTED` → caution reconnect via a **case-insensitive** match so the capitalized "Connect
> your…" string lands on reauth; everything else → danger + retry; single `role="alert"` per error,
> top-level alert suppressed in `saved_playlists` mode to avoid a double announcement). Message-based
> classification is a deliberate constraint: `api()` (`apps/web/src/lib/api.ts`) drops `error.code`, so
> the classifier keys on the envelope message with `user-playlists.ts` cited as the source of truth —
> follow-up filed to propagate `error.code` as a typed error. **PR #262** — *lock the Spotify `/items`
> migration against regression* (test-only, +5: `getPlaylist` (URL-import) and `fetchSpotifyPlaylistTracks`
> both assert `/items` **and `.not.toContain('/tracks')`**; item-less pages degrade to `[]`;
> `fetchSpotifySavedPlaylists` reads `items.total` even past a decoy legacy `tracks.total: 999`). **PR
> #263** — *map double-401 provider reads to `REAUTH_REQUIRED`* (real latent bugfix + 4 tests: the
> reactive-retry path in `readWithConnectedPlaylistToken` / `fetchUserLikes` only wrapped the first
> read, and `user-playlists.ts` returned the retry **without `await`**, so a second 401 escaped as a
> raw provider error → 5xx instead of a `409` reconnect prompt; wrapped the awaited retry and map a
> second `isUnauthorized` → `REAUTH_REQUIRED`, rethrowing anything else). Rollback anchor: prior live
> `7b9c9baa-ddd6-4479-ab66-a0dd92bad9f8`. Remote D1: **no migrations to apply.** Pre-deploy: SPA build
> ✓ (each PR already merged green through the combined CI check). Post-deploy smoke on live
> `https://ritmofit.studio`: SPA `/` → `200` (served hash `index-iDB-1Wfk.js` matches the build),
> `/api/v1/health` → `200`, `/api/v1/classes` · `/api/v1/explore` → `401`, security headers present
> (HSTS · CSP · Permissions-Policy · Referrer-Policy · X-Content-Type-Options · X-Frame-Options).
> **Open:** owner (Alex, the playlist owner) still to live-verify the `/items` browse renders real
> tracks + counts; if empty, a one-line `spotify.ts` entry-field correction (`item` vs `track`) redeploys.

> **Session 2026-07-09 (Spotify playlist `/items` migration hotfix) — deployed (Worker
> `7b9c9baa-ddd6-4479-ab66-a0dd92bad9f8`).** Main HEAD `a4910be` (merge of PR #260). Code-only — **no
> schema / migration.** **Incident:** Spotify saved-playlist browse was broken in prod — every playlist
> showed `0` tracks and opening one returned a misleading "reconnect" error. **Not our regression:** a
> Spotify **Web API migration (Feb–Mar 2026)** retired `GET /playlists/{id}/tracks` (→ bare `403
> "Forbidden"` for all callers) and renamed the playlist object field `tracks` → `items`. The fifth
> round earlier the same cycle (Worker `a75663cf`, PRs #256/#257/#258, 2026-07-08) shipped the
> `playlist-read-private` connect scope that unblocked `GET /me/playlists` (→ `200`) and thereby
> **exposed** that the surrounding read code still targeted the retired endpoint/shape. **PR #260**
> migrated all three read paths to `/playlists/{id}/items` (entry `track` → `item`;
> `fetchSpotifyPlaylistTracks` browse + `SpotifyProvider.getPlaylist` URL-import), moved the
> `/me/playlists` count to `items.total`, and added `SpotifyPlaylistAccessDeniedError` → `403
> PROVIDER_FORBIDDEN` with an honest "only playlists you own or collaborate on" message (a genuine
> per-playlist 403 is not a reauth). Root cause confirmed live via a safe metadata-only diagnostic on
> the **ephemeral Worker `e2d55661`** (now superseded — the diag was never committed). Fixed **forward**
> (browse was already 100% broken pre-fix, so no rollback); rollback anchor `a75663cf`. Pre-deploy gate:
> typecheck ×all ✓ · `@ritmofit/api` unit 360 ✓ · SPA build ✓. Post-deploy smoke: SPA `/` → `200` (hash
> `index-3SwqPrUs.js`), `/api/v1/health` → `200`, unauth `/classes` · `/explore` · `/teams` → `401`, all
> six security headers present. Changelog:
> `developer.spotify.com/documentation/web-api/references/changes/february-2026`.

> **Session 2026-07-08 (fourth parallel lane-agent round — 2 polish + 1 harden) — deployed (Worker
> `a7ec9c81-3ba1-40ba-95c0-97ccb918b162`).** Main HEAD `e152057` (merge of PR #254). Code-only — **no
> schema / migration** (remote D1: "No migrations to apply"). Two runtime-surface **screen-reader a11y**
> slices shipped: **PR #253** (Live Mode **re-announces a verbatim-repeated cue** — a single assertive
> region only re-announces when its text *changes*, so "Push!" → "Push!" was silent; fixed with the
> react-aria LiveAnnouncer **dual-region ping-pong** keyed on cue identity `cue:idx:kind:atMs` so an
> identical-text cue still drives an `'' → text` mutation, while `elapsedMs` never enters the key so the
> on-change-only discipline holds) and **PR #252** (Music browse **announces the search outcome + result
> count** — an always-mounted `role="status"` region fed by a pure `browseAnnouncement()`; "No results"
> keys on a *settled empty array* only and a new query nulls `results` first, so no stale count /
> premature empty leaks mid-typing). Also merged this round but **test-only / no runtime change** (not a
> deploy trigger, listed for the trail): **PR #254** (lock **by-id nested-resource cross-tenant authz** —
> `PATCH`/`DELETE /sections/:id` and `/class-track-moves/:id`: no-access caller → **404 NOT_FOUND**
> (existence hidden), view-only caller → **403 FORBIDDEN**; envelope-code asserted, owner-200 positive
> control, mutation-proven against the parent-chain gate — the highest-value remaining authz gap under
> D1's no-RLS model). Rollback anchor: prior live `67f00f2b-8dd2-4bb5-be4a-cd5a868f4dd7`. Remote D1: **no
> migrations to apply.** Pre-deploy gate (on `main`): format:check ✓ · typecheck ×4 ✓ · lint ✓ ·
> design-system verify ✓ · unit web 454 / api 352 ✓ · integration 91 ✓ · web build ✓ · OpenAPI no drift
> (48 schemas · 50 paths) ✓ · contract-parity (no untracked drift) ✓ · audit:ci ✓. Post-deploy smoke on
> live `https://ritmofit.studio`: SPA `/` → `200` (served hash `index-C9XtDowQ.js` matches the build),
> `/api/v1/health` → `200`, `/api/v1/classes` · `/api/v1/explore` · `/api/v1/teams` → `401`, security
> headers present (HSTS · CSP · Permissions-Policy · Referrer-Policy · X-Content-Type-Options ·
> X-Frame-Options), Spotify callback mounted (`302`, not `404`), providers-connect · class-shares ·
> provider-search · `PATCH /sections/:id` → `401`. **Round-3 #248 Spotify re-verification CLOSED ✅** —
> live authenticated connect round-trip re-smoked on this Worker: `POST …/spotify/connect - Ok` →
> `GET …/spotify/callback?code=…&state=… - Ok` → dialog "Connected to Spotify." → `…/spotify/likes - Ok`;
> the confidential-client exchange #248 touched is confirmed behavior-preserving in prod. **Observed
> (pre-existing, unrelated to this deploy):** `GET /me/playlists` returns Spotify `403` — the connect
> scope `user-library-read` covers likes but not saved playlists (needs `playlist-read-private`); Spotify
> saved-playlist browse is a wanted feature, filed as an INBOX breadcrumb (deliberate scope-expansion +
> re-consent, its own slice).

> **Session 2026-07-08 (third parallel lane-agent round — mixed 1-polish/2-harden) — deployed (Worker
> `67f00f2b-8dd2-4bb5-be4a-cd5a868f4dd7`).** Main HEAD `645cf59` (merge of PR #250). Code-only — **no
> schema / migration** (remote D1: "No migrations to apply"). Runtime-surface slice: **PR #250** (Live
> Mode **start-focus placement** — the full-screen takeover was stranding keyboard/SR focus on `<body>`
> on entry and on the preflight→live transition, exactly as the class goes hands-free; now focuses the
> class-title heading on preflight entry and the transport's primary Play/Pause control when the class
> goes live, with the empty-class direct-to-live path made deterministic via a preflight-gated mount
> effect; FE-only `LiveMode.tsx` + 4 `document.activeElement` tests, driven live in Chrome). Production-
> code path change, **behavior-preserving but requires manual re-verification**: **PR #248** (drop dead
> PKCE `codeChallenge`/`codeVerifier` params from the Spotify **confidential-client** OAuth helpers —
> they never reached the wire, Basic-auth is the identity; SoundCloud PKCE untouched; the `ProviderOAuth`
> interface + connect route are unchanged so the registry still passes the full object and Spotify's
> slimmed functions stay structurally assignable; added a confidential-client contract test). **Manual
> Spotify connect round-trip re-verification pending** (authorize → `?connected=spotify` → "Connected to
> Spotify"; Worker log `GET /api/v1/providers/spotify/callback?... - Ok`). Also merged this round but
> **test-only / no runtime change** (not a deploy trigger, listed for the trail): **PR #249** (lock the
> run-payload **pre-downbeat beat/bar clamp** — a cue anchored before the track's first downbeat emits
> `{ beat: null, bar: null }`, not a garbage `bar: 0`; mutation-proven — neuter the `p.bar >= 1` guard
> and only the new test fails). Rollback anchor: prior live `7763f79c-662d-4aa4-a52c-8d12e78be411`.
> Remote D1: **no migrations to apply.** Pre-deploy gate (on `main`): format:check ✓ · typecheck ×4 ✓ ·
> lint ✓ · design-system verify ✓ · unit web 448 / api 352 ✓ · integration 86 ✓ · web build ✓ · OpenAPI
> no drift (48 schemas · 50 paths) ✓ · contract-parity (no untracked drift) ✓ · audit:ci ✓. Post-deploy
> smoke on live `https://ritmofit.studio`: SPA `/` → `200` (served hash `index-CCiP32t2.js` matches the
> build), `/api/v1/health` → `200`, `/api/v1/classes` · `/api/v1/explore` · `/api/v1/teams` → `401`,
> security headers present (HSTS · CSP · Permissions-Policy · Referrer-Policy · X-Content-Type-Options ·
> X-Frame-Options), Spotify callback route mounted (`302`, not `404`), providers-connect · class-shares ·
> provider-search → `401`.

> **Session 2026-07-07 (web polish + hardening round — parallel lane-agents) — deployed (Worker
> `7763f79c-662d-4aa4-a52c-8d12e78be411`).** Main HEAD `f0b84cd` (merge of PR #246). Code-only —
> **no schema / migration** (remote D1: "No migrations to apply"). Deployed the two runtime-surface
> slices from a mixed 1-feature/2-harden round: **PR #242** (Classes library **search + sort**
> organization — client-side, diacritic-insensitive token-AND search over title + template with five
> stable sorts, over the loaded page set; honest "X of N loaded" framing + recoverable no-match state)
> and **PR #246** (**announce + harden keyboard track-reorder** for assistive tech — polite aria-live
> announcements for keyboard moves and already-first/last boundaries, assertive on a failed persist;
> the pre-existing ↑/↓ reorder mechanism gained a `silent` reload path in `loadDetail` that skips the
> loading mask so the workspace never unmounts, preserving grip focus + the announcement). Also merged
> this round but **test-only / no runtime change** (not a deploy trigger, listed for the trail):
> **PR #241** (lock run-payload clip-rebase × beat/bar for trimmed tracks), **PR #244** (lock class-list
> keyset pagination across a same-timestamp boundary — mutation-proven), **PR #243** (provider
> token-machinery + refresh-token rotation-omit coverage), **PR #245** (PROVIDER_UNAVAILABLE 503
> config-guard coverage incl. playback-token). Rollback anchor: prior live
> `9d0a5710-d140-4100-ad26-84aaf13ef3d9`. Remote D1: **no migrations to apply.** Pre-deploy gate (on
> `main`): format:check ✓ · typecheck ×4 ✓ · lint ✓ · design-system verify ✓ · unit web 444 / api 351 /
> music 5 ✓ · integration 85 ✓ · web build ✓ · OpenAPI no drift (48 schemas · 50 paths) ✓ ·
> contract-parity (7 tracked lag) ✓ · audit:ci ✓. Post-deploy smoke on live `https://ritmofit.studio`:
> SPA `/` → `200` (served hash `index-B_v5epWC.js` matches the build), `/api/v1/health` → `200`,
> `/api/v1/classes` · `/api/v1/explore` · `/api/v1/teams` → `401`, security headers present (HSTS · CSP ·
> Permissions-Policy · Referrer-Policy · X-Content-Type-Options · X-Frame-Options).

> **Session 2026-07-07 (D21 workstation-shell consolidation + accumulated batch) — deployed (Worker
> `9d0a5710-d140-4100-ad26-84aaf13ef3d9`).** Merge commit `494aef6`. Code-only batch — **no
> schema / migration** (remote D1: "No migrations to apply"). Shipped the previously-merged-but-
> unshipped backlog in one deliberate batch: **PR #232** (D21 workstation-shell consolidation — primary
> nav unified to **Classes / Music / Live / Account**; Music is a first-class provider/source workspace
> with saved-playlist *and* liked-tracks browsing on its shelves; Live is a runnable-class queue with
> preflight readiness; Account is an in-page settings workspace), the **liked-tracks discovery shelf**
> (`9ade653` — browse likes → create class from likes, now surfaced in both the Classes resting state
> and the Music workspace via a shared `useProviderBrowseState` hook), and **PR #230** (SoundCloud
> saved-playlist read pagination fix). Also merged this session but no runtime change: **PR #233**
> (documented the two D21 saved-playlist endpoints + `ProviderPlaylistSummary` in OpenAPI — now 48
> schemas / 50 paths — and added Apple Music adapter tests) and **PR #234** (provider connection
> token-lifecycle tests; also wired a missing `test` script on `packages/music` so its first test
> actually runs, and fixed a latent mock bug it exposed). Rollback anchor: prior live
> `ded27a07-b006-411c-aa5f-ce923d3d440f` (saved-playlist browsing). Remote D1: **no migrations to
> apply.** Pre-deploy gate (on `main`): format:check ✓ · typecheck ×4 ✓ · lint ✓ · design-system verify
> ✓ · unit web 423 / api 308 / music 5 ✓ · integration 82 ✓ · web build ✓ · OpenAPI no drift (48
> schemas · 50 paths) ✓ · contract-parity ✓ · audit:ci ✓. Post-deploy smoke on live
> `https://ritmofit.studio`: SPA `/` → `200` (served hash `index-DkO1a4Yp.js` matches the build),
> `/api/v1/health` → `200`, `/api/v1/providers/spotify/playlists` (unauthenticated) → `401` (mounted,
> not `404`), `/api/v1/classes` · `/api/v1/explore` · `/api/v1/teams` → `401`, security headers present
> (HSTS · CSP · Permissions-Policy · Referrer-Policy · X-Content-Type-Options · X-Frame-Options).

> **Session 2026-07-06 (saved-playlist browsing — D21 sub-slice) — deployed (Worker
> `ded27a07-b006-411c-aa5f-ce923d3d440f`).** Commit `eb229d5`. Additive API slice + frontend
> feature — **no schema / migration.** New endpoints: `GET /providers/:provider/playlists` (list
> connected user's saved playlists — Spotify OAuth, SoundCloud OAuth, Apple Music Music-User-Token)
> and `GET /providers/:provider/playlists/:playlistId/tracks` (drill-in track read for a single
> playlist). Shared `ProviderPlaylistSummary` DTO + `savedPlaylists` capability flag enabled for all
> three providers. Web: `TrackSearch` gains a **Saved playlists** mode (playlist list → per-playlist
> drill-in → per-track Add + **Import all N** bulk-import with concurrency-4 batching; `addedKeys`
> resets per playlist; empty-state copy scoped); resting provider shelf cards now load live playlist
> counts for connected providers and their summary text becomes a clickable **Browse** button;
> `PlaylistBrowserDialog` lets an instructor browse saved playlists from the resting state (no class
> open), pick a discipline template (Cycle / Pilates / HIIT), and create a new class from any playlist
> in one action (imports all tracks, then opens the class in the builder). Rollback anchor: prior live
> `b99ac98d-ea10-4efb-b42f-b068e479c550` (Spotify Web Playback SDK launch). Remote D1: **no migrations
> to apply.** Pre-deploy gate: format:check ✓ · typecheck ×4 ✓ · lint ✓ · design-system verify ✓ ·
> unit web 418 / api 285 ✓ · integration 82 ✓ · web build ✓ · OpenAPI no drift (47 schemas · 48 paths)
> ✓ · contract-parity 7 tracked lag items ✓ · audit:ci ✓. Post-deploy smoke on live
> `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200` `{"status":"ok"}`,
> `/api/v1/providers/spotify/playlists` (unauthenticated) → `401` (mounted, not `404`),
> `/api/v1/classes` → `401`.

> **Session 2026-07-06 (Spotify Web Playback SDK launch — registered + live-verified) — deployed
> (Worker `b99ac98d-ea10-4efb-b42f-b068e479c550`).** Deployed the stacked Spotify playback branch
> (`feat/spotify-playback-web`, on the backend playback-token/scope branch and the SoundCloud/Apple CSP
> hotfix stack) after the final registry switch (`spotifyAdapterFactory` added to the shared playback
> registry) and an `index.html` comment byte change to force static-asset/header metadata upload. This
> makes Spotify in-app playback live for all users. Scope/contract/API changes from the stack: expanded
> Spotify OAuth connect scope for the Web Playback SDK, `GET /providers/spotify/playback-token` for
> short-lived memory-only access tokens, shared `SpotifyPlaybackToken`, reconnect UX for legacy
> library-only Spotify grants, and the web SDK/Connect playback adapter. **No schema / migration.**
> Rollback anchor: prior live `cbea9f69-98fd-441f-915f-7820be24c58b` (Apple Music CSP playback hosts).
> Remote D1: **no migrations to apply.** Full CI-equivalent gate passed twice: once after reconnect UX,
> then again after the registry launch switch (format / typecheck ×4 workspaces / lint / design-system
> verify / web **413** + api **283** unit / api integration **82** / web build / OpenAPI no drift
> `47 schemas · 48 paths` / contract-parity clean with the 7 tracked iOS lag items / audit:ci exit 0
> with the existing ignored advisory set). Post-deploy smoke on live `https://ritmofit.studio`: SPA `/`
> → `200`, `/api/v1/health` → `200`, protected `classes`/`explore`/`teams` → `401`, served bundle
> `index-CKR7uylR.js`, deployment status 100% on `b99ac98d`, and remote D1 still no pending migrations.
> **Spotify live verification:** in Chrome with the owner's Premium account, Connections showed Spotify
> connected; Builder preview for `Gemini Test Class` / *Uptown Funk (feat. Bruno Mars)* showed
> `Preview on Spotify`, entered `Preview: Spotify`, and play/pause/resume/stop all worked. Live Mode
> preflight reported `Plays on Spotify`; starting Live Mode advanced the class clock and showed
> `Playback: Spotify`. The owner confirmed audible Spotify audio. Chrome captured no relevant Spotify
> SDK, CSP, Permissions-Policy, authentication, account, or playback errors, so the initial Spotify CSP /
> Permissions-Policy host set needed no hotfix.

> **Session 2026-07-06 (Apple Music web playback CSP — connect-src + media-src) — deployed (Worker
> `cbea9f69-98fd-441f-915f-7820be24c58b`).** Continuation of the SoundCloud CSP pass, on branch
> `fix/apple-music-csp-playback-hosts` (stacked on the SoundCloud branch so the deploy keeps
> `w.soundcloud.com`). Live Apple Music preview verification (Pilates One → track 2 *A'oga O Samoana*,
> Builder "Preview on Apple Music") surfaced **two enforced `connect-src` blocks**, each halting playback
> before any audio (each captured via a `securitypolicyviolation` listener; MusicKit `playbackState`
> stayed `none`): (1) **"Failed to fetch"** — the web-playback handshake to
> `https://play.itunes.apple.com/WebObjects/MZPlay.woa/wa/webPlayback`; (2) **"Could not fetch manifest"**
> — the HLS audio manifest at `https://aod-ssl.itunes.apple.com/.../mzaf_*.aac.wa.m3u8`. Root cause — CSP
> `connect-src` allowed `*.music.apple.com` / `*.mzstatic.com` but **not** the `itunes.apple.com` audio
> hosts. Fix in `apps/web/public/_headers`: `connect-src` **+ `https://*.itunes.apple.com`** (covers the
> handshake/license host and the `aod-ssl` audio manifest/segment hosts, matching the file's existing
> wildcard style) and **`media-src 'self' blob:`** (MusicKit plays via Media Source Extensions, so the
> `<audio>` source is a `blob:` MediaSource URL — confirmed live). **Two deploys this session:**
> `10c1bfde-1894-4985-868f-c4ad779904bf` first added `play.itunes.apple.com` + `media-src` (cleared block
> #1, which then surfaced #2), then `cbea9f69` broadened to `*.itunes.apple.com` (cleared #2).
> **Frontend/static-header only — no schema / migration / API.** Rollback anchor: prior live
> `5072dd3b-ff09-412b-bcad-9cef7086719b` (the SoundCloud deploy). Remote D1: **no migrations to apply.**
> Full pre-deploy gate green on the `play.itunes` commit (format / typecheck ×3 / lint / design verify /
> unit / integration / web build / openapi no-drift `46 schemas · 47 paths` / contract-parity 7-allowlisted
> clean / audit:ci); the wildcard-broaden delta is a single host in a static header, re-checked via
> `format:check` + web build (the heavy gate is unaffected by a header string change). Post-deploy smoke on
> live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200`, protected `classes` → `401`,
> and the CSP response header now includes `https://*.itunes.apple.com` in `connect-src` plus `media-src
> 'self' blob:`. **Provider-playback verification (Apple Music, partial-but-strong):** on a fresh document
> carrying the new CSP (the browser's stale-precache service worker had to be unregistered first — see
> caveat), the Apple preview now **authorizes, loads the track (`nowPlayingItem` set, full `246s`
> duration), fetches the HLS manifest, and builds the MSE `blob:` `<audio>` element with ZERO CSP
> violations and no errors** — the exact pipeline that failed twice before. In the hidden automation tab
> the buffer stalled at `readyState 0` (`document.visibilityState === 'hidden'` → Chrome background-media
> throttling), so **the owner confirmed audible playback in a foreground tab** — Apple Music real-provider
> audio is now **verified** (alongside SoundCloud). **Stale-SW caveat (again):** an
> already-open PWA client keeps serving the OLD precached CSP until the "New version — Refresh" prompt is
> taken (or the SW re-fetches); a hard header change like this only reaches such clients after that refresh.

> **Session 2026-07-06 (SoundCloud Widget CSP hotfix — unblocks real-provider playback) — deployed
> (Worker `5072dd3b-ff09-412b-bcad-9cef7086719b`).** Landed via PR
> [#225](https://github.com/steven-crosby/ritmofit-web/pull/225) (`0429d34`). This was **deployed from
> the working tree during the first real-provider playback verification pass**, then committed to `main`
> afterward, so the entry records a live-verification hotfix rather than a merge-then-deploy. Root cause —
> the production SPA CSP `script-src`/`frame-src` did not allow the official SoundCloud Widget origin
> `https://w.soundcloud.com`, so Live Mode SoundCloud playback failed with a CSP violation
> (`w.soundcloud.com/player/api.js` blocked by `script-src`) and correctly fell into the playback-error
> recovery state ("The SoundCloud player failed to load"). Fix: add `https://w.soundcloud.com` to
> `script-src` (Widget API JS) and `frame-src` (the hidden player iframe) in `apps/web/public/_headers`
> plus its CSP comment block. **Two deploys were needed:** the first (Worker
> `cde2cb9e-b8a2-42fb-9e0d-f8d69da7206f`) uploaded no static-asset files, so Wrangler left the old header
> metadata attached and the live CSP was unchanged; forcing a byte change (a no-op comment in
> `apps/web/index.html`) + rebuild produced the second deploy (`5072dd3b`) which actually carried the new
> header. **Frontend/static-header only — no schema / migration / API.** Rollback anchor: prior live
> `be7c9425-5733-4783-89af-93ab3f823ae0`. Remote D1: **no migrations to apply**. Full pre-deploy gate ran
> green on these exact bytes before deploy (format / typecheck ×3 / lint / design-system verify / unit /
> integration / web build / openapi no-drift / contract-parity / audit:ci). Post-deploy smoke on live
> `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200`, protected
> `classes`/`explore`/`teams` → `401`, served bundle `index-B79dxbYI.js`, and the CSP response header now
> includes `w.soundcloud.com` in `script-src` and `frame-src`. **Provider-playback verification (partial):
> SoundCloud is now verified on live** — in a clean isolated-context browser on the current bundle, Live
> Mode (Burn Ride 🔥) preflight resolves both tracks as "Plays on SoundCloud", the Widget loads from
> `w.soundcloud.com`, the player rail shows `Playback: SoundCloud`, the timer advances, and pause/resume is
> stable (the Widget emits its own noisy third-party `encrypted-media` / CORS console warnings, which are
> cosmetic and do not affect our playback state). **Apple Music playback is still unverified** — the
> Builder preview loads MusicKit and reaches "Waiting for Apple Music authorization…" (opens a real Apple
> sign-in tab); full clip playback was not confirmed and remains the open follow-up. Watch for a possible
> second CSP gap there: the current CSP has no `media-src`, so `default-src 'self'` governs media and may
> block Apple CDN audio — tune `_headers` against violation reports during the Apple pass.

> **Session 2026-07-06 (PWA refresh-on-deploy prompt — fixes update lag) — deployed (Worker
> `be7c9425-5733-4783-89af-93ab3f823ae0`).** Shipped `main` (`8d98c7e`, PR
> [#222](https://github.com/steven-crosby/ritmofit-web/pull/222)). Verifying the D21 shell on live
> surfaced update lag: already-open clients kept serving the old precached bundle until a manual reload.
> Root cause — `registerType: 'autoUpdate'` with only the bare inline `registerSW.js` (no
> update-and-reload wiring), so a new deploy's service worker silently took over the precache while open
> tabs stayed stale. Fix: switch to `registerType: 'prompt'` and wire the app via `useRegisterSW`
> (`virtual:pwa-register/react`) in a new `UpdatePrompt` component — a non-intrusive "New version
> available — Refresh" toast (`role="status"`/`aria-live="polite"`); **Refresh** calls
> `updateServiceWorker()` (skip-waiting + reload), **Later** dismisses. Nothing reloads on its own, so
> **Live Mode and in-progress edits are never interrupted**; the worker is re-checked hourly and on tab
> focus. Adds `workbox-window` as a direct dep (the react register hook imports it). **Frontend-only, no
> schema / migration.** Rollback anchor: prior live `fc7f8cfe-ab31-44d9-bbc6-82ecac97d6d5`. Remote D1:
> **no migrations to apply**. Pre-deploy gate green on `main` (format / typecheck ×3 / lint / design
> verify / unit **web 398 · api 278** / integration **76** / web build / openapi no-drift `46 schemas ·
> 47 paths` / contract-parity clean / audit:ci). Post-deploy smoke on live: SPA `/` → `200`,
> `/api/v1/health` → `200`, protected `classes`/`explore` → `401`, `/app` → `200`, served bundle
> `index-B79dxbYI.js` matches the build, the separate auto-register script is gone (prompt-mode
> registration is bundled), security headers present; a clean isolated-context browser load rendered the
> marketing page with **zero console errors/warnings**. **Caveat:** clients still on the previous
> `autoUpdate` bundle get no prompt for *this* deploy (they have no prompt code) — they pick it up one
> last time via the old silent path; the prompt governs every deploy *after* this one.

> **Session 2026-07-06 (D21 workstation resting shell) — deployed (Worker
> `fc7f8cfe-ab31-44d9-bbc6-82ecac97d6d5`).** Squash-merged to `main` as
> [#219](https://github.com/steven-crosby/ritmofit-web/pull/219) (`01fd955`), then shipped.
> Frontend-only D21 slice. `CreateClassForm` now **requires a template** before
> creating a new blank class, with create options narrowed to **Cycle / Pilates / HIIT** (Pilates maps
> to the stored `sculpt` enum — **no schema / API migration**; `formatTemplateLabel('sculpt')` now
> renders "Pilates"). The Dashboard no-class-open state renders an **alive-at-rest workstation shell**
> with class-readiness tiles and **provider shelves** (SoundCloud / Spotify / Apple Music liked/saved
> source cards plus honest playlist-read-surface placeholders). Touches five files (`Dashboard.tsx`,
> `Dashboard.test.tsx`, `LibraryRail.test.tsx`, `class-summary.ts`, `class-summary.test.ts`). Verified:
> focused vitest (Dashboard / LibraryRail / class-summary), web typecheck, lint, `format:check`, and
> `git diff --check` all green; browser QA (Playwright + intercepted auth/API on system Chrome) covered
> desktop-empty, desktop-populated, and mobile-empty states — the mobile "Template first" tile value was
> changed to "Required" to fix an overflow. Saved-playlist browsing still needs new read endpoints (its
> own sub-slice). Rollback anchor: prior live `4cb1e13e-9c19-4a6b-b06c-89f0f6f6d935`. **No schema /
> migration** (`wrangler d1 migrations list ritmofit --remote` → none to apply). Pre-deploy gate green on
> `main` (format / typecheck ×3 workspaces / lint / design-system verify / unit **api 278** / integration
> **76** / web build / openapi no-drift `46 schemas · 47 paths` / contract-parity no untracked drift /
> audit:ci). Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` →
> `200`, protected `/api/v1/classes` + `/api/v1/explore` + `/api/v1/teams` → `401`, SPA fallback `/app` →
> `200`, served bundle hash `index-Dg36zIiQ.js` matches the build (the bare-`/` first read was a stale CF
> edge HIT; cache-busted fetch and the new asset both serve the new hash), security headers present
> (HSTS/CSP/X-Frame/X-Content-Type/Referrer/Permissions).

> **Session 2026-07-06 (batch deploy: playback usability — provider-selection fixes + cross-provider
> resolution) — deployed (Worker `4cb1e13e-9c19-4a6b-b06c-89f0f6f6d935`).** Shipped `main` (`359db07`)
> batching everything merged since the run-live-gate deploy — the "web player not usable for instructors"
> arc: **#213** (Apple Music `authorize()` recovery — cancellable `awaiting_authorization` state + 60s
> consent timeout), the earlier **Apple Music `setQueue` generation guard** (`b1fe198`, PR #211),
> **#214** (**fix**: play SoundCloud without a live connection — the public Widget needs no token, so an
> expired likes-only OAuth token no longer takes SoundCloud tracks dark), and **#216** (cross-provider
> resolution — `provider_not_playable` reason + `POST /tracks/:id/resolve-provider` + Builder "Find on a
> supported provider"). **First API change in this batch:** the additive, auth-gated `resolve-provider`
> route — **no schema / migration** (refs use the existing `track_provider_ids`; catalog search spends
> the app-level token, never provider audio). #215 (D21 shell-frame docs) also rode along.
>
> Rollback anchor: prior live `d4954a2e-6b33-4fc3-87f8-b792411f4906` (the run-live-gate deploy). Remote
> D1: **no migrations to apply** (`wrangler d1 migrations list ritmofit --remote` → none). Pre-deploy
> gate green on `main` (format / typecheck ×4 workspaces / lint / design-system verify / **392 web + 278
> api** unit / **76** integration / web build / openapi no-drift `46 schemas · 47 paths` / contract-parity
> no untracked drift / audit:ci exit 0). Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` →
> `200`, `/api/v1/health` → `200`, protected `/api/v1/classes` + `/api/v1/explore` → `401`, SPA fallback
> `/app` → `200`, the **new** `POST /api/v1/tracks/:id/resolve-provider` (unauth) → `401` (mounted, not
> `404`), served bundle hash `index-n3saxiPG.js` matches the build, security headers present (HSTS/CSP/
> X-Frame/X-Content-Type/Referrer/Permissions). **Still pending:** real-provider **audio** verification
> (SoundCloud Widget + Apple Music) with a live subscriber account — the last un-verified step.

> **Session 2026-07-05 (checkpoint deploy: run-live gate accessibility) — deployed (Worker
> `d4954a2e-6b33-4fc3-87f8-b792411f4906`).** Shipped `main` (`a3ea61a`) taking **#207** (run-live gate
> explains itself at the button, accessibly) live — presentation/a11y only, **no schema / migration /
> API / provider change** (#208 deploy-log docs also on this `main`). Brings production back level with
> `main`. Rollback anchor: prior live `a08f6b59-0207-4535-8bcf-8acf657974e0`. Remote D1: **no migrations
> to apply** (none since `4c4aa35`). Pre-deploy gate green on `main` (format / typecheck ×4 workspaces /
> lint / design-system verify / **373 web + 271 api** unit / **76** integration / web build / openapi
> no-drift `44 schemas · 46 paths` / contract-parity no untracked drift / audit:ci exit 0). Post-deploy
> smoke on live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200`, protected
> `/api/v1/classes` → `401`, SPA fallback `/app` → `200`, served bundle hash `index-4ISGEun_.js` matches
> the build. (Deployed from the `ritmo-studio-agent1` worktree after the local `ritmo-studio-claude`
> checkout was reorganized away.)

> **Session 2026-07-05 (checkpoint deploy: Builder preview + front-door polish) — deployed (Worker
> `a08f6b59-0207-4535-8bcf-8acf657974e0`).** Shipped `main` (`4c4aa35`) batching everything merged since
> the solo-first reset deploy — all presentation-only, **no schema / migration / API / provider
> change**: **#206** (solo-first front-door polish — first-run workspace, owner-chip removed) and
> **#204** (manual **Builder clip-window preview** — `TrackPreview.tsx` + `PreviewPlaybackController`
> over the shared adapter registry; single-track, manual, no auto-advance; four review-found
> correctness fixes applied pre-merge — the rAF-clock/`preparing` bug, the `endActive`/`pause`/`resume`/
> `stop` epoch-recheck races, and the frozen-`now` clock). **#205** (deploy-log docs) also rode along.
>
> Rollback anchor: prior live `fa385d71-d9fd-4e86-bfc5-f390475f1692` (the solo-first reset deploy).
> Remote D1: **no migrations to apply** (verified `git diff` shows none since `23f5481`). Pre-deploy
> gate green on `main` (format / typecheck ×4 workspaces / lint / design-system verify / **370 web +
> 271 api** unit / **76** integration / web build / openapi no-drift `44 schemas · 46 paths` /
> contract-parity no untracked drift / audit:ci exit 0). Post-deploy smoke on live
> `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200` (`{"status":"ok"}`), protected
> `/api/v1/classes` → `401`, SPA fallback `/app` → `200`, served bundle hash `index-BiKiO4wT.js` matches
> the build. Real-provider **audio** verification of the Builder preview and the SoundCloud/Apple Music
> Live Mode adapters remains a pending manual pass with a live subscriber account.

> **Session 2026-07-05 (checkpoint deploy: solo-first reset · D20) — deployed (Worker
> `fa385d71-d9fd-4e86-bfc5-f390475f1692`).** Shipped `main` (`23f5481`) taking the **solo-first reset**
> (PR #203, decision **D20**) live — presentation only, **no schema / migration / API / provider
> change**: the web product now hides the deferred community surfaces (top-bar Explore + Teams, the
> class-header Share + Publish/visibility controls, the Explore public-preview branch) and filters the
> library to the current user's own classes. Backend/API/schema scaffolding for teams, shares,
> visibility, and Explore is **preserved but dormant** (hide-not-delete) — verified live: `/api/v1/explore`
> still answers `401` (auth-gated), not `404`. D18's hard parity gate is paused under D20; web is the
> product-definition surface.
>
> Rollback anchor: prior live `c6829c8e-583b-475d-81fa-d3fcf34bbd2e` (the 2026-07-05 Apple Music +
> rename checkpoint, below). Remote D1: **no migrations to apply**. Pre-deploy gate green on `main`
> (format / typecheck ×4 workspaces / lint / design-system verify / **353 web + 271 api** unit / **76**
> integration / web build / openapi no-drift `44 schemas · 46 paths` / contract-parity no untracked
> drift / audit:ci exit 0). Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`,
> `/api/v1/health` → `200`, protected `/api/v1/classes` → `401`, SPA fallback `/app` → `200`, served
> bundle hash `index-CHIz1kGn.js` matches the build, `<title>Ritmo Studio</title>`.

> **Session 2026-07-05 (checkpoint deploy: Apple Music playback adapter + Ritmo Studio rename) —
> deployed (Worker `c6829c8e-583b-475d-81fa-d3fcf34bbd2e`).** Shipped `main` (`33455ea`) batching
> everything merged since the 2026-07-04 "alive at rest" deploy — **no schema / migration / token
> change**: **#201** (Apple Music playback adapter for Live Mode, D19 — `apps/web/src/lib/playback/
> apple-music-adapter.ts` + MusicKit-on-the-Web helper extension, registered in the Live Mode adapter
> registry alongside SoundCloud; 15 focused adapter tests), the **Ritmo Studio product rename**
> (`cd1cd3b` — human-facing brand renamed from RitmoFit across app copy, generated OpenAPI docs,
> design-system references, prompts, and tests; internal package/worker names stay `@ritmofit/*` /
> `ritmofit-api`), and docs/prompt cleanup **#199**/**#200**. Rollback anchor: prior live
> `190bc83e-c6c7-4ed4-a441-465a8d72981f`. Remote D1: **no migrations to apply**. Post-deploy smoke on
> live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200`, protected
> `/api/v1/classes` → `401`, `<title>Ritmo Studio</title>` confirmed the rename live, CSP allow-lists
> `js-cdn.music.apple.com` + Apple Music frame/connect origins. Real-account playback verification
> (Apple Music subscriber audio, mixed-provider auto-advance, clipped windows, failure drills) remains
> a pending manual pass.

> **Session 2026-07-04 ("alive at rest" implementation — DS doctrine + 5 web slices) — deployed
> (Worker `190bc83e-c6c7-4ed4-a441-465a8d72981f`).** Shipped `main` (`2bb08be`) bringing the full
> "alive at rest" set live together — all presentation-only, **no schema / token / API / provider
> change**: **#193** (design-system doctrine — 8th principle "alive at rest" + the provisional-state
> contract *caution channel + glyph + `auto` label + underlying value, never plasma, no new token*;
> canonical docs + reference mockups), **#194** (derived provisional class-shape ribbon: a warm-up →
> peak → release arc for an unshaped class, marked `auto shape`, capped below plasma), **#195** (missing
> BPM named in place — "BPM needed" chip + "add BPM · pulse off" header; **no fabricated `~132 · auto`**
> — the data model has no BPM provenance, so a real provisional BPM would need a schema feature),
> **#196** (Essentials-first inspector — intensity/BPM/duration/notes lead, the long tail under an
> "Advanced" `<details>`), **#197** (affirmative Live-at-rest "Press play to start" hero + class-shape
> mini-map, and the builder all-clear "Class shape ready · take it live"), **#198** (auto-banded
> provisional segment structure — warm-up → cool-down bands derived from the class length, marked
> `auto`, builder-only).
>
> Rollback anchor: prior live `1fcdee96-e1a9-4535-9870-2219d0c68e9a` (the 2026-07-03 v1-redesign deploy,
> PRs #187–#192). Remote D1: **No migrations to apply** (verified `--remote`). Pre-deploy gate green
> (format / typecheck / lint / design-system verify / **337 web + 271 api** unit tests / **76**
> integration / web build / openapi no-drift / contract-parity / audit). Post-deploy smoke on live
> `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200`, protected `/api/v1/classes` →
> `401`. Each of the five web slices was driven end-to-end pre-merge by the 390px narrow-width browser
> smoke (grown to **31 checks** covering every phase). Presentation-only; iOS parity notes are recorded
> on the merged PRs (no new parity debt).

> **Session 2026-07-03 (out-of-band deploy: provider connect fixes) — deployed (Worker
> `94126954-0e61-408e-b404-bb380c338141`).** Provider-change deploy shipped on its own per the deploy
> cadence: SoundCloud OAuth token-exchange request-shape fix and Spotify connect verification
> (`packages/music` + `apps/api` provider-connections route). Live verification: Apple Music,
> SoundCloud, and Spotify production connect all round-trip successfully — the connect prerequisite
> for the provider-authorized playback initiative (D19) is done. Spotify additionally required
> registering `https://ritmofit.studio/api/v1/providers/spotify/callback` in the Spotify app
> dashboard (dashboard config, no code). Remote D1: no migrations in this slice (a `wrangler d1
> migrations list --remote` check failed with Cloudflare auth code `7403` — auth to re-verify next
> remote-migration session). Pre-deploy gate green; post-deploy smoke passed. Rollback anchor: prior
> live `3ee0a8c3-1ce7-488e-b708-e521ad03bc1b`. Same-day follow-on work (not deployed): the web
> playback layer — `apps/web/src/lib/playback/` (selection/preflight core, runtime coordinator,
> SoundCloud Widget adapter) + Live Mode wiring (preflight screen, player rail, recoverable playback
> failure) — landing via PR after this session.

> **Session 2026-07-02 (checkpoint deploy: design-audit batch + builder/dialog polish) — deployed
> (Worker `3ee0a8c3-1ce7-488e-b708-e521ad03bc1b`).** Shipped `main` (`0f52a04`) bringing the
> accumulated presentation checkpoint live — everything merged since the 2026-06-30 deploy, all
> presentation- or docs-only, no schema / API / provider change: **#168** (dialog loading-state
> polish), **#170** (class/library rail re-staged as the music-forward creation queue), **#171**
> (narrow-viewport action density), the design-audit slices **#172–#176** (mockup refinements, builder
> row hierarchy, compact builder mobile composition, Live next-cue anchored on the countdown, mobile
> sign-in music identity), **#177** (builder mockup: duplicate `builder-layout` grid dropped from the
> page wrapper), **#178** (ESLint ignores git-ignored local tool state so local `pnpm lint`
> matches CI when agent worktrees exist), and docs **#167** / **#169** (deploy-cadence policy).
>
> Rollback anchor: prior live `e8b83edf-e2f0-474f-9b66-ab827998a371`. Remote D1: **No migrations to
> apply**. Pre-deploy gate green (format / typecheck / lint / design-system verify / 249 web + 271 api
> unit tests / 76 integration / web build / openapi no-drift / contract-parity / audit). Post-deploy
> smoke on live `https://ritmofit.studio`: SPA `/` → `200`, `/api/v1/health` → `200`, protected
> `/api/v1/classes` / `/explore` / `/teams` → `401`, SPA fallback `/app` → `200`, security headers
> present, served asset hash matches the build (`index-BU64c-uM.js`; the first hash read was a CF
> edge-cache `HIT` of the prior HTML — it revalidates immediately under `max-age=0, must-revalidate`).
> No new parity debt: the batch is presentation-only and its iOS parity notes were recorded on the
> merged PRs.

> **Session 2026-06-30 (Studio redesign slices 1–3: Live re-stage + builder title fix + energy-arc
> workbench) — deployed (Worker `e8b83edf-e2f0-474f-9b66-ab827998a371`).** Shipped `main` (`83204ed`)
> bringing **#164**, **#165**, and **#166** live together — all presentation-only, no schema / API /
> provider change:
>
> - **#164** re-stages **Live mode** as a split performance instrument (large focal current cue + a
>   BPM/effort/timer instrument rail; the single sanctioned beat-pulse moved onto the BPM numeral; the
>   All-Out drop and reduced-motion contract intact). Also repaired the stale browser smokes
>   (marketing→login entry via `openLogin`, post-signup onboarding dismissal, drifted class-row/duration/
>   connected-state selectors, sign-out via the Account dialog): functional **16/16**, narrow **19/19**.
> - **#165** fixes the builder **class-detail title collapsing to 0 width** — the non-shrinking actions
>   row consumed the flex row, so `truncate` clipped the title to nothing (present in the DOM but
>   invisible to users and absent from the a11y tree, which broke `getByRole('heading')`). The header now
>   wraps and the title block keeps a readable `min-w` floor at `sm+`.
> - **#166** makes the builder **energy arc the central "class shape" workbench** (arc ~64→~128px,
>   frameless, sharing one time axis with the timeline so each block sits under its crest; reduced card
>   fragmentation). Static, grayscale-readable, plasma only at the all-out crest.
>
> Rollback anchor: prior live `57b20736-3f15-40fd-8877-f35f9ac3eb7d`. Remote D1: **No migrations to
> apply** (no schema change in any of the three). Pre-deploy gate green (246 web tests / `tsc --noEmit` /
> eslint / `format:check` / web build; functional smoke 16/16, narrow 19/19). Post-deploy smoke on live
> `https://ritmofit.studio`: SPA `/` → `200` (serves `<title>Ritmo Studio</title>`), `/api/v1/health` →
> `200`, protected `/api/v1/classes` → `401`, SPA fallback `/app` → `200`. iOS parity items recorded in
> `web-ios-parity.md` for the Live re-stage and the energy-arc workbench (both presentation-only).

> **Session 2026-06-29 (Apple Music connect + PWA navigation fix) — two deploys.**
>
> **Deploy 1 — Worker `c3f0add1-0836-4ecb-a6d3-da469401a9bb`.** Shipped `main` (`6135339`) bringing
> **#157** live (Apple Music per-user connect via **MusicKit JS**, Slice B of 2 — the SPA mints a
> Music-User-Token and `POST`s it to `/providers/apple_music/connection`, stored encrypted; no redirect
> OAuth, no refresh). The PR landed with three review-driven fixes: the two new `apple_music` routes
> (`GET /config`, `POST /connection`) + their `AppleMusicClientConfig`/`ConnectAppleMusic` schemas were
> added to the OpenAPI spec (the generator hardcodes paths, so the no-drift gate could not catch the
> omission — iOS consumes this contract); an empty-page guard on `fetchAppleMusicLibrarySongs` so a
> non-advancing `next` cursor can't spin the pagination loop forever (mirrors the Spotify adapter, +
> regression test); and an integration test proving the real (non-mock) Apple Music likes path returns
> `409 NOT_CONNECTED` (the `userLikes` capability flip routes to the real path, not a `501`). Rollback
> anchor recorded: prior live `26930c2a`. Remote D1: **No migrations to apply**. Full pre-deploy gate
> green (271 unit / 76 integration / web build / openapi no-drift / contract-parity / design-system AA).
> Post-deploy smoke green (SPA `200`, health `200`, protected routes `401`, served asset hash matched the
> build); the SPA CSP now serves the MusicKit allowances (`js-cdn.music.apple.com`, `*.music.apple.com`,
> `*.mzstatic.com`, Apple auth frames). **Live-verified: Apple Music connect → "✓ Connected" in prod.**
>
> **Deploy 2 — Worker `57b20736-3f15-40fd-8877-f35f9ac3eb7d`.** Shipped `main` (`bc13cd5`) = **#161**
> (PWA navigation-fallback denylist). Surfaced during live verification: connecting **SoundCloud**
> dead-ended on the SPA **404**. Root cause was the service worker, not the API — the generated `sw.js`
> registered `NavigationRoute(createHandlerBoundToURL("index.html"))` with **no denylist**, so it served
> the cached app shell for *every* top-level navigation, including the same-origin OAuth redirect
> callbacks (`/api/v1/providers/:provider/callback`) and Better Auth social callbacks
> (`/api/auth/callback/*`). The provider's `?code` never reached the Worker (`curl` — which bypasses the
> SW — correctly returned the `302 → /?error=…`). Fix: `navigateFallbackDenylist: [/^\/api\//]` in the
> VitePWA workbox config. Rollback anchor: `c3f0add1`. No migrations. Gate green. Post-deploy: the
> deployed `/sw.js` carries `{denylist:[/^\/api\//]}`, and the SoundCloud callback now reaches the Worker.
> Apple Music connect was unaffected throughout (MusicKit authorizes **in-page**, so it is not a
> navigation the SW can intercept).
>
> **Open follow-up (SoundCloud/Spotify connect — token exchange):** with the SW fix in place, SoundCloud
> per-user connect now reaches the Worker but the **token exchange itself fails** (`connect_failed` —
> `secure.soundcloud.com/oauth/token` returns non-2xx; the callback's `catch` swallows the reason with no
> log). This was the first real end-to-end test of the SoundCloud exchange (Spotify shares the same
> redirect-OAuth machinery and is likewise unverified end-to-end). No `SOUNDCLOUD_REDIRECT_URI` /
> `SPOTIFY_REDIRECT_URI` override is set, so the `redirect_uri` defaults — in both authorize and exchange
> — to `https://ritmofit.studio/api/v1/providers/<provider>/callback`. Most likely cause: the registered
> redirect URI in the provider dashboard not matching that string, or a stale client secret. Tracked as a
> follow-up: add server-side logging to the callback failure path to capture the provider status, then
> verify the dashboard registration. **Apple Music connect is unaffected and verified working.**
>
> **Session 2026-06-29 (Spotify connect + onboarding tutorial + dev-plan docs) — deployed (Worker
> `26930c2a-684c-40c6-8839-56e0383d769b`).** Shipped current `main` (`76bda7b`) to production, bringing
> three merged PRs live: **#156** (Spotify per-user OAuth connect + likes — Authorization Code + PKCE,
> scope `user-library-read`; the "Connect Spotify" capability flips on, redirect URI registered in the
> Spotify dashboard by the owner), **#159** (in-app onboarding tutorial video — frontend-only: animated
> `TutorialVideo`, shown once after email sign-up via SSR-safe `localStorage` state, and embedded on the
> marketing landing page in place of the static energy-arc SVG), and **#158** (dev-plan docs audit +
> consolidation — archived the completed launch session-plan / live-test-report / cues-vs-notes records,
> reconciled the runbook + schema, fixed the index and stale framing).
>
> Each PR passed the full CI gate; #159 was branched off `main` after #156, so the two were CI-tested
> together. Remote D1 reported **"No migrations to apply"** before deploy (no schema change in any of the
> three). Pre-deploy: tree clean and `== origin/main`, prior live Worker `e60e5138-3248-4c0f-a926-997955016199`
> recorded as the rollback anchor. Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`;
> `/api/v1/health` → `200`; unauthenticated `/api/v1/classes`, `/explore`, `/teams`, class `shares`,
> `import-playlist`, provider `search`, and `providers/spotify/connect` all returned `401` from real
> protected handlers (not `404`); `/api/v1/auth/capabilities` reported Apple enabled; security headers
> present; live HTML had no `__CF$cv$params` injection marker; served asset `index-CvZxZwnG.js` matched
> the local build; purge cron (`17 3 * * *`) and D1/R2 bindings intact. No production test data was
> created. **#157** (Apple Music per-user connect via MusicKit JS) remained a draft, intentionally **not**
> deployed.
>
> **Session 2026-06-29 (Apple Sign In + provider credential deploy) — deployed (Worker
> `e60e5138-3248-4c0f-a926-997955016199`).** Shipped the credential-backed Apple Sign In slice plus
> dynamic Apple Music developer-token support on branch `codex/apple-signin-provider-config`. The Worker
> now generates the Apple Sign In client-secret JWT from `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and
> `APPLE_PRIVATE_KEY`; exposes `/api/v1/auth/capabilities`; shows the web "Continue with Apple" entry
> point only when Apple config is present; and can generate Apple Music developer tokens from
> `APPLE_MUSIC_TEAM_ID`, `APPLE_MUSIC_KEY_ID`, and `APPLE_MUSIC_PRIVATE_KEY` while preserving the
> existing `APPLE_MUSIC_DEVELOPER_TOKEN` fallback. Spotify and SoundCloud credentials remained
> server-side secrets.
>
> Remote D1 reported **"No migrations to apply"** before and after deploy. Production smoke on live
> `https://ritmofit.studio`: SPA `/` → `200`; `/api/v1/health` → `200`; `/api/v1/auth/capabilities`
> returned `{"socialProviders":{"apple":true}}`; unauthenticated `/api/v1/classes` and provider search
> routes returned `401`; served SPA asset `index-DiUG_dBK.js` matched the build; security headers were
> present; and `POST /api/auth/sign-in/social` for provider `apple` returned an Apple authorization URL
> with callback `https://ritmofit.studio/api/auth/callback/apple`. A Session 9 read-only check later the
> same day confirmed Wrangler's live deployment status at 100% on Worker
> `e60e5138-3248-4c0f-a926-997955016199`, remote D1 still reporting **"No migrations to apply"**, health
> `200`, and Apple auth capability enabled. No production test data was created.
>
> **Session 2026-06-29 (Session 8, Launch Candidate) — deployed (Worker
> `e3f17b56-b3bc-4684-bfad-eadf260e9195`).** Shipped current `main` (`d2b7b4f`) to production, bringing
> the Web Launch Readiness **Session 7** accessibility/responsive fixes live: Live Mode section-change
> screen-reader announcements (#150), the class-library load-error retry state (#151), and the Session 7
> close docs/prompt additions (#152).
>
> Remote D1 reported **"No migrations to apply"** before and after deploy. Pre-deploy launch gate was
> green: `pnpm format:check`, `pnpm -r typecheck`, `pnpm lint`, `pnpm test` (web 237 / api 257),
> `pnpm --filter @ritmofit/api test:integration` (69), `pnpm --filter @ritmofit/web build`,
> `pnpm --filter @ritmofit/api openapi`, OpenAPI no-drift, `pnpm audit:ci`, design-system
> `npm run verify` (AA contrast), and `pnpm --filter @ritmofit/api contract-parity` (only tracked iOS
> allowlisted lag). Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`;
> `/api/v1/health` → `200`; unauthenticated `/api/v1/classes`, `/explore`, `/teams`, `/shares`,
> playlist import, provider search/import, cover upload serving, and class tags all returned `401` from
> real protected handlers; security headers were present; SPA `Cache-Control` retained `no-transform`;
> live HTML contained no `__CF$cv$params` injection marker; and the served asset
> `index-72oZbOhu.js` matched the local build. No production test data was created, so no cleanup was
> required. Prior Worker `b59b2de9-f253-4b84-8e8e-4a089e7f6d3f` is the rollback anchor.
>
> **Session 2026-06-28 (Session 6, Live Mode & StructClub parity) — deployed (Worker
> `b59b2de9-f253-4b84-8e8e-4a089e7f6d3f`).** Shipped **#146** (`f5fec5f`) — the Web Launch Readiness
> **Session 6** Live Mode / StructClub parity pass. The pass was mostly verification (cue prompter,
> virtual interval timer, intensity, notes, trim/clip, beat pulse, cue colors, wake lock, and the
> no-in-app-playback constraint all confirmed via a browser walk at desktop and 320px); one gap was
> found and closed.
>
> - **Live Mode current-section indicator (web):** the live prompter dropped the energy-arc **sections**
>   the run-payload already carries (the builder and class-detail read view show them, Live did not). #146
>   adds a compact, view-independent section band under the Live header — current section as icon + tint +
>   label (never color alone) plus a muted countdown to the next section — computed from run-payload
>   `sections[]` via a new `liveSectionAt` helper, reusing the `SegmentBand` icon/tint language
>   (`SegmentIcon` now exported). A code-review follow-up (`9f98b68`, squashed into #146) made the bar
>   fully screen-reader accessible (sr-only "Current section:" / "Next:" framing instead of a
>   name-replacing container `aria-label`). **Client-only off the run-payload — no shared-contract, API,
>   OpenAPI, or migration change.** iOS parity follow-up tracked in `web-ios-parity.md`.
>
> Remote D1 reported **"No migrations to apply"** before deploy (web-only change). CI for #146 was green
> (`format · typecheck · lint · test · build · audit`). Local pre-deploy gate also covered Prettier,
> `pnpm -r typecheck`, `pnpm lint`, `pnpm test` (api 257 / web 233), API integration (69), web build,
> OpenAPI no-drift, `audit:ci`, design-system `npm run verify` (AA contrast), and `contract-parity`
> (no untracked drift). Post-deploy smoke on live `https://ritmofit.studio`: SPA `/` → `200`;
> `/api/v1/health` → `200`; unauthenticated `/api/v1/classes`, `/explore`, `/teams`, `/shares` → `401`;
> all six security headers present (HSTS, CSP, Permissions-Policy, Referrer-Policy, X-Content-Type-Options,
> X-Frame-Options); served SPA asset hash `index-NNdJRVHx.js` matches the build. Prior Worker
> `92d3904e-733a-4f39-8f3d-6fa156616757` is the rollback anchor.
>
> **Session 2026-06-28 (Session 5 follow-up) — deployed (Worker
> `92d3904e-733a-4f39-8f3d-6fa156616757`).** Shipped **#143** (`9427d07`, merge
> `0b1517c`) to close the remaining Session 5 launch-listed follow-ups:
> **manual visual verification + 320px overflow fix** and **settings/profile beyond sign-out**.
>
> - **Visual verification / 320px fix:** manually verified planning timeline tempo pulse cadence, the
>   source-level `prefers-reduced-motion` fallback, segment "Snap to tracks" drag/keyboard behavior, and
>   320px + desktop layouts. The check found a 320px track-list overflow in `Dashboard` song rows; #143
>   fixed it by letting the row and metadata wrap inside the available width instead of forcing
>   horizontal scroll.
> - **Account/profile surface:** the signed-in top nav now opens an Account dialog that fetches
>   `/auth/me`, shows the signed-in email, edits `displayName` + `imageUrl` through the new protected
>   `PATCH /auth/me`, and keeps sign-out reachable inside the dialog. Additive shared/API/OpenAPI change;
>   **no migration** (uses existing `users.display_name` / `users.image_url` columns). iOS parity follow-up
>   tracked in `web-ios-parity.md`.
>
> Remote D1 reported **"No migrations to apply"** before and after deploy. CI for #143 was green
> (`format · typecheck · lint · test · build · audit`). Local verification also covered tracked-files
> Prettier, `pnpm -r typecheck`, `pnpm lint`, `pnpm test`, API integration, web build, OpenAPI no-drift,
> audit, `git diff --check`, and local 320px/desktop browser checks. Post-deploy smoke on live
> `https://ritmofit.studio`: SPA `/` → `200` with `Cache-Control: ... no-transform` and no
> `__CF$cv$params` injection marker; `/api/v1/health` → `200`; unauthenticated `/api/v1/auth/me` → `401`
> standard envelope; remote D1 still no pending migrations. Prior Worker
> `c34515d1-39a2-4069-aed5-a00d2844953a` is the rollback anchor.
>
> **Session 2026-06-28 (Session 5, Builder Polish) — deployed across four steps; live Worker
> `c34515d1-39a2-4069-aed5-a00d2844953a`.** Closed all four Web Launch Readiness **Session 5** items
> (PRs #137–#140, each CI-green and squash-merged to `main`), plus the **#136** design-system/dev-plan
> docs reconciliation (`d6802e5`). Deploy chain: prior live `9519447a` → **`4eab08f3`** (#137 pulse) →
> **`431d5c6b`** (#138 + #139) → **`c34515d1`** (#140). **No migration** at any step — remote D1 reported
> "No migrations to apply" before each deploy.
>
> - **#137 — planning-timeline tempo pulse (web):** the active track's block in the planning
>   `TimelineStrip` carries the design system's *second* sanctioned tempo pulse (10 §2) — subtle
>   `scale 1.0→1.03` + a faint cyan border-luminance breath retimed per the track's BPM via `--rf-bpm`
>   (new `.rf-beat-pulse-subtle` keyframe). One pulse per screen, gated to a known tempo, removed under
>   `prefers-reduced-motion` (the static selection ring alone marks the active track). Client-only.
> - **#138 — rhythm-cycle seed vocabulary (api):** +7 cycle moves (Running, Hovers, Press-Ups, Crunches,
>   Oblique Twists, Pyramid, Sprint on a Hill) in `seed.sql` (stable UUIDs `…015`–`…01b`, idempotent
>   `INSERT OR IGNORE`); `schema.md` M1 seed table extended to match. Data, not schema — **no migration**.
>   Because `seed.sql` is not auto-applied on deploy, the **remote seed was re-run**
>   (`wrangler d1 execute ritmofit --remote --file=./src/db/seed.sql`); remote `moves` now **21 total /
>   15 cycle**.
> - **#139 — custom-move discipline + base-move editing (web):** the custom-move manager
>   (`CustomMovesDialog`) edit form now sets a move's `template` (discipline) and `baseMoveId` (link to a
>   global library move) via the existing `updateUserMove`, with both shown on the read row. UI-only — the
>   contract/API already supported both fields. The fast inline builder creation stays name-only.
> - **#140 — segment-band track-range snapping (web):** a "Snap to tracks" toggle (default on, edit-only)
>   snaps a dragged or arrow-keyed segment boundary to the nearest track edge (class start, each track's
>   `startOffsetMs`, class end); arrow keys jump between boundaries under snap for keyboard parity, and the
>   numeric editor stays exact. Authoring affordance, **no contract change** (sections still store a free
>   `startOffsetMs`).
>
> Pre-deploy gates green each step (web unit grew 206 → **224**, api integration 66, typecheck, lint,
> web build, format:check, audit). Post-deploy smoke on live `https://ritmofit.studio` at the final
> Worker `c34515d1`: SPA `/` → `200`, `/api/v1/health` → `200`, unauthenticated `/api/v1/classes` +
> `/explore` + `/teams` → `401`, all six security headers present, and served asset `index-DlGE-dL9.js`
> matches the local build. iOS parity follow-ups for all four web slices tracked in `web-ios-parity.md`.
> Prior Worker `431d5c6b-910a-4987-a6d1-76e595cc45fb` is the rollback anchor. Manual visual passes (pulse
> cadence + reduced motion, segment snap, 320px/desktop) remain recommended before the launch gate.
>
> **Session 2026-06-28 deployed (Worker `9519447a-dc0b-4b27-9f74-13783f1cf3f2`).**
> **Web Launch Readiness Sessions 2–4** landed to production (PRs #130, #131, #132, #134, squash-merged
> to `main`). **Session 2 (#130):** softened the unconfigured BPM lookup `503` to instructor-facing copy
> and gated TrackSearch's "Import Playlist" to Spotify via a new `playlistImport` capability flag.
> **Session 3 (#131):** `GET /classes` now returns additive Library-card aggregates (`trackCount`,
> `totalDurationMs`, `albumArtUrls`) via a new `ClassListItem` shape, and the Library rail renders a
> track-art collage, count + runtime, last-opened date, a duplicate action, and a create-class template
> chooser. **#132:** fixed the class-header title overflowing into the actions row (`min-w-0`).
> **Session 4 (#134):** read-only class detail (songs + placed moves + cues + section bands) reachable
> from a Library-card "View"; Songs-by-Move results gain "Start a class" (copies the choreographed
> class_track into a new class).
>
> **No migration** — remote D1 reported "No migrations to apply" before deploy (the list aggregates are
> computed at query time, no schema change). Pre-deploy gates green: format, typecheck, lint, unit
> (web 206 + api 257), integration 66, web build, OpenAPI no-drift, audit, design-system verify, and
> contract-parity. Post-deploy smoke (live `https://ritmofit.studio`): SPA `/` → `200`,
> `/api/v1/health` → `200`, unauthenticated `/api/v1/classes` + `/explore` + `/teams` +
> `POST /classes/x/import-playlist` → `401`, all six security headers present, SPA `Cache-Control`
> includes `no-transform`, live HTML contains no `__CF$cv$params` injection, and the served asset
> `index-BHeK3sAC.js` matches the local build. Prior Worker
> `dafa2638-4383-4145-8f50-531fcfb235ec` is the rollback anchor.
>
> **Session 2026-06-28 deployed (Worker `dafa2638-4383-4145-8f50-531fcfb235ec`).**
> Closed the remaining Web Launch Readiness Session 1 production-audit polish items from the `e6fb7c1a`
> deploy. **`d694b02`** — **web**: manual "Add track" duration now uses the same positive `m:ss`
> parser as the track inspector (`4:05` → `245000` ms for the API), with Dashboard regression coverage.
> **static assets/security headers**: `_headers` now adds
> `Cache-Control: public, max-age=0, must-revalidate, no-transform` on the SPA/static surface so
> Cloudflare JavaScript Detections do not inject the CSP-blocked inline `__CF$cv$params` challenge
> script into `index.html`. Updated `web-launch-readiness.md` with the confirmed Cloudflare JSD cause
> and deploy verification.
>
> No migration. Remote D1 reported "No migrations to apply" before and after deploy. Pre-deploy gates
> green: format, typecheck, lint, unit (web 185 + api 248), integration 64, web build, OpenAPI no-drift,
> audit, design-system verify, and contract-parity (tracked iOS lag only). Post-deploy smoke (live):
> SPA `/` → `200`, `/api/v1/health` → `200`, unauthenticated `/api/v1/classes` + `/explore` + `/teams`
> → `401`, mounted route probes for shares / playlist import / uploads / provider connections/search /
> class tags all reached auth (`401`, not `404`), all six security headers present, served asset
> `index-s2OQZ8O-.js` matches the local build, live HTML includes `no-transform`, and live HTML contains
> no `__CF` / `__CF$cv$params` injection. Prior Worker `e6fb7c1a-a208-4ba6-9ba7-39bc19be136d` is the
> rollback anchor.
>
> **Session 2026-06-27 deployed (Worker `e6fb7c1a-a208-4ba6-9ba7-39bc19be136d`).**
> **Web Launch Readiness Session 1 (Production Truth Audit) + the fix it surfaced.**
> Ran the full local CI-equivalent gate (green: format, typecheck, lint, 248 api + web unit, 64
> integration, web build, OpenAPI no-drift, audit) and production smoke on `https://ritmofit.studio`.
> Walked the full authenticated core instructor loop live (create class → manual tracks →
> intensity/cues/colors/moves/segments → Live Mode play+tabs → Share dialog → Explore); production test
> data created and purged (test class deleted, verified 0 classes). **Found and fixed one bug:** PWA
> stale-shell crash — a returning tab on an older service-worker-cached shell hard-crashes when it
> lazy-imports a chunk hash the new deploy removed (reproduced live: cached `index-CoC1rBbD.js` shell
> failing to fetch a gone `ChoreographyEditor-CoYYs4OY.js`). **#124** (`c0f5037`, squash-merged) —
> **web**: `lazyWithReload` drop-in for `React.lazy` that reloads once into the fresh shell on a
> dynamic-import failure (one-shot `sessionStorage` guard, 3 unit tests), swapped across all 9 Dashboard
> lazy boundaries. Web-only; no migration, no API/schema/OpenAPI/parity impact (remote D1 "No migrations
> to apply").
>
> Pre-deploy gates green (format, typecheck, lint, web 184 + api 248 unit, 64 integration, web build,
> OpenAPI no-drift, audit, contract-parity). Post-deploy smoke (live): SPA `/` → `200`,
> `/api/v1/health` → `200`, unauthenticated `/api/v1/classes` + `/explore` + `/teams` → `401`, all six
> security headers present, served asset `index-yWIThSNv.js` matches the local build, current
> `ChoreographyEditor-DfSufLw2.js` chunk serves as `text/javascript` (not the HTML fallback). Prior
> Worker `2d9e0830-9662-49ef-9c8e-0c45a946f16b` (session 2026-06-27, D15 #120 batch) is the rollback
> anchor. Open audit follow-ups (not deployed-blocking): CSP-blocked inline script (likely a Cloudflare
> zone setting) and the ms-duration manual-add field; see `web-launch-readiness.md`.
>
> **Session 2026-06-27 deployed (Worker `2d9e0830-9662-49ef-9c8e-0c45a946f16b`).**
> Shipped a five-PR batch (all squash-merged to `main`, each rebased onto the advancing tip and
> CI-green before merge), no migration (remote D1 already at head — "No migrations to apply"):
> **#120** (`129b7ae`) — **D15** public marketing landing page (`MarketingPage`: glass nav,
> heat-bloom hero with energy-arc SVG, feature cards, CTA strip; signed-out `/` renders it, CTAs flip
> to Login via state with a `← Back to home` link; documented web-leaning exception, no API/parity
> impact). **#117** (`c8fe89a`) — **api**: CI gate for web↔iOS run-payload DTO contract drift
> (`check-contract-parity.ts` + `contract-parity.ts`, wired into `.github/workflows/ci.yml`).
> **#115** (`7e5462e`) — **api**: default `sendEmail` to `boundFetch` so prod reset/verify email uses
> the Worker-bound fetch. **#116** (`79564cc`) — **web**: restore the keyboard focus ring on the
> intensity segmented control (accessibility). **#118** (`7e5f979`) — **web**: token-drive the
> timeline beat/bar gridlines in `TimelineStrip`.
>
> Pre-deploy gates green (typecheck, lint, unit web + api, integration, web build, OpenAPI no-drift).
> Post-deploy smoke (live): SPA `/` → `200`, `/api/v1/health` → `200`, unauthenticated
> `/api/v1/classes` → `401`, all six security headers present, served asset `index-yOu-ndqj.js`
> matches the local build. Prior Worker `23b27a25-00d1-4cc3-89c9-7e300a72f4a8` (session 2026-06-26,
> D14 #110) is the rollback anchor.
>
> **Session 2026-06-26 deployed (Worker `23b27a25-00d1-4cc3-89c9-7e300a72f4a8`).**
> Shipped **#110** (`a12cc55`, squash) — **decision D14**: per-track **RPM (cadence)** and
> **hold count**, authored independently of music tempo (RPM is *not* derived from BPM; a hold count of
> `0` is meaningful and distinct from unset/`null`). `displayRpm`/`holdCount` (nullable; `rpm > 0`,
> `holds >= 0`) added to the shared `classTrackSchema`, the class-track input contract, and the
> run-payload track entry; D1 columns + CHECK constraints; run-payload assembly passthrough; add/patch
> route wiring; regenerated OpenAPI. Web surfaces them on song rows, the builder track inspector (with
> editable RPM/Holds inputs), and the Live Mode NOW card / full-list rows.
>
> **Migration `0018` (applied to remote D1 first, before code).** drizzle-kit's generated table-rebuild
> copied the brand-new `display_rpm`/`hold_count` columns *from the old table* in its `INSERT…SELECT`;
> via SQLite's double-quoted-identifier fallback that would backfill every existing row with the literal
> strings `"display_rpm"`/`"hold_count"` instead of `NULL` (slipping past the `rpm > 0` CHECK on
> text/int comparison), and empty-DB integration tests never caught it. Hand-fixed to omit the new
> columns from the copy so they default to `NULL`. Remote D1 was at `0017` pre-deploy; prod
> `class_tracks` had **0 rows**, so no data was at risk — post-migration the columns exist with clean
> types. New `rpm-holds.integration.test.ts` covers add/patch round-trip, the `0`-vs-`null` hold
> distinction, and the constraints.
>
> Pre-deploy gates green (typecheck, lint, unit web + api 234, integration **64**, web build, OpenAPI
> no-drift); PR #110 CI green (format/typecheck/lint/test/build/audit). Post-deploy smoke (live): SPA
> `/` → `200`, `/api/v1/health` → `200`, unauthenticated `/api/v1/classes` → `401`, all six security
> headers present, served asset `index-CmOHEOQ_.js` matches the local build. Prior Worker
> `efa56513-d81d-4d9b-98d0-a6be2d18d8e6` (session 2026-06-26, M1 #106) is the rollback anchor.
>
> **Session 2026-06-25 deployed (Worker `efa56513-d81d-4d9b-98d0-a6be2d18d8e6`).**
> Shipped **#106** (`754569e`, squash) — backlog **M1** (intensity spin-zone vocabulary + segmented
> control, decision D17), frontend-only, no migration. `INTENSITY_LABEL` relabeled to the canonical
> zone words **None / Build / Push / Attack / All Out** (display-only; enum `none/easy/mod/hard/all_out`
> and the DB unchanged) — flows to the readout, the energy-arc summary, Songs-by-Move, and the
> move-intensity dropdowns. New accessible `IntensitySegmentedControl` (native radio inputs → free
> keyboard nav + screen-reader semantics; each segment shows "Z*n* · word"; the bar count doubles as
> the zone number per design-system `02-color-system.md`) replaces the raw-enum `<select>` in the
> **track** inspector + manual-add form. Deliberate follow-up: the two ChoreographyEditor
> **move-intensity** dropdowns stay as relabeled selects — they're optional/unset and sit in compact
> rows, so converting them needs an "unset" segment.
>
> Pre-deploy gates green: PR #106 CI (format/typecheck/lint/test/build/audit), plus local typecheck +
> web build pre-deploy (web 180 unit tests). Post-deploy smoke (live): SPA `/` → `200`,
> `/api/v1/health` → `200`, unauthenticated `/api/v1/classes` → `401`, all six security headers present,
> served asset `index-BQ0pRDiH.js` matches the local build. Prior Worker
> `d4e828c5-c50e-4515-bcc5-f569d6c95c02` (session 2026-06-25, P1/P2) is the rollback anchor.
>
> **Session 2026-06-25 deployed (Worker `d4e828c5-c50e-4515-bcc5-f569d6c95c02`).**
> Shipped **#104** (`3113ad0`, squash) — two mockup-parity **Polish** items, frontend-only, no migration.
> **P1 (empty-state-as-error, systemic):** the 2026-06-24 crawl's "Not found in danger-red + lingering
> Loading…" was the **failed-load** path — a list fetch error set the red alert while the list state
> stayed `null`, so the dialog showed "Loading…" forever with no retry. (The crawl most likely *hit* the
> error via the #100 prod-404, fixed the prior session.) New shared `PendingList` component renders
> "Loading…" only while genuinely pending, else a "Try again" retry; `error` is cleared at the start of
> each refresh. Wired into Explore / Teams (+ nested TeamMembers, given a local load-error for
> independent retry) / Share **and** Connections / CustomMoves (same conflation, beyond the audit's named
> three). **P2 (raw intensity enum):** the intensity `<select>`s now render `INTENSITY_LABEL[v]`
> (none/easy/moderate/hard/all-out) instead of the raw enum, across all **4** selects (`Dashboard.tsx` ×2,
> `ChoreographyEditor.tsx` ×2) — label text only; M1's segmented control + D17 zone vocab stay separate.
>
> Pre-deploy gates green: typecheck, lint, unit (web 177 + api 234), OpenAPI no-drift, web build; PR #104
> CI green (format/typecheck/lint/test/build/audit). Post-deploy smoke (live): SPA `/` → `200`,
> `/api/v1/health` → `200`, unauthenticated `/api/v1/classes` / `/explore` / `/teams` → `401` (handlers
> reached, **not** the pre-#100 `404`), all six security headers present, served asset
> `index-DKVcAK9r.js` matches the local build. Prior Worker `c269837d-3c24-4b87-886e-4f24df11c0ba`
> (session 2026-06-25) is the rollback anchor. Known minor follow-up (non-blocking): a TeamMembers
> retry that succeeds leaves the parent's prior red error banner up until the next action clears it —
> fold into a later Teams touch.
>
> **Session 2026-06-25 deployed (Worker `c269837d-3c24-4b87-886e-4f24df11c0ba`).**
> Shipped two merged PRs from `main` (`2c27da2`). **#99** (`585f134`, feat: "Songs by Move" reverse
> search — owner-scoped `GET /moves/:id/songs` + `/user-moves/:id/songs`, grouped by track; **plus**
> server-side class **tag/theme search** `GET /classes?tag=` as an EXISTS filter composing with the
> visibility CTE + keyset cursor; plus an in-builder entry point) and **#100** (`2c27da2`, fix: scope
> the dev-only mock-seam gate to `/mock/*`). **Migration `0017`** (additive indexes on
> `class_track_moves(move_id)` / `(user_move_id)`) applied to remote D1 **before** the code deploy;
> remote D1 now at `0017`. Prior Worker `c6b91a31-d981-4ece-9cd4-2e985e4fb424` (session 2026-06-24) is
> the rollback anchor.
>
> **#100 fixed a latent prod-404 bug on `main`** that the next deploy would have detonated: `mockRoutes`
> mounts at the api root (`api.route('/', mockRoutes)`) and gated itself with `mockRoutes.use('*', …)`,
> which returns `404 NOT_FOUND` in prod (`MOCK_PROVIDERS !== 'true'`). Because `*` matches every path and
> mock is registered **before** teams/shares/explore/uploads/playlist-import, the gate shadowed all of
> those siblings → `404` in production. **CI never caught it** — the integration suite runs with
> `MOCK_PROVIDERS='true'`, which makes the gate transparent. Production was healthy only because the live
> Worker predated the regression. Fix scopes both middlewares to `/mock/*`; added a plain-Hono unit test
> (`mock.test.ts`) and a real-worker integration test (`mock-gate-leak.integration.test.ts`), both run
> with `MOCK_PROVIDERS` unset to reproduce prod. Verified the regression: the unit test fails against the
> pre-fix `mock.ts`, passes with the fix.
>
> Pre-deploy gates green (both PRs): format, typecheck, lint, unit (api 234 + web 175), Worker/D1
> integration 61, web build, OpenAPI no-drift. Post-deploy smoke (live): SPA `/` → `200`, `/api/v1/health`
> → `200`, unauthenticated `/api/v1/classes` / `/api/v1/explore` / `/api/v1/teams` → `401` (handlers
> reached, **not** the pre-fix `404`), `/api/v1/mock/track-search` → `401` (seam not exposed), built asset
> `index-CZ9jMwA7.js` served, all six security headers present. Bindings confirmed: D1 `ritmofit`, R2
> `ritmofit-images`, `BETTER_AUTH_URL`/`WEB_ORIGIN` = `https://ritmofit.studio`.

> **Session 2026-06-23 deployed (Worker `d183ee42-eba4-40ae-9def-fc0bd313223e`).**
> Caught up the long undeployed delta (**PRs #85–#93**, ~28 commits) in one code-only deploy. PRs merged
> this session: **#91** (`44e7b6b`, chore: ESLint-ignore git-ignored DesignSync artifacts so local
> `pnpm lint` matches CI), **#92** (`3c3f1fd`, docs: sweep housekeeping — backlog section,
> self-contained `AGENTS.md`, removed obsolete `design-system-audits/`), **#93** (`8c70a6b`, feat:
> surface track `notes` in Live mode + the Cues-vs-Notes decision doc;
> [`archive/cues-vs-notes-decision.md`](./archive/cues-vs-notes-decision.md)), and **#94** (close-session docs).
> Deployed from `main` (`69dcdcd`); prior Worker `e3528c85` (PR #84) is the rollback anchor.
> **No migrations applied — remote D1 was already current at `0016`** (clip-window `0014`, `beat_anchor_ms`
> `0015`, free-timeline `0016` had been applied previously; the earlier "remote at `0013`" note was
> stale, not a pending-migration gap — `wrangler d1 migrations list ritmofit --remote` → "No migrations
> to apply"). Pre-deploy gates green: typecheck, lint, unit (api 231 + web 166), integration 49, web
> build, OpenAPI no-drift. Post-deploy smoke (live): `/api/v1/health` → `200` (`{"status":"ok"}`),
> `/` → `200` html, unauthenticated `/api/v1/explore` → `401`. Bindings confirmed: D1 `ritmofit`,
> R2 `ritmofit-images`, `BETTER_AUTH_URL`/`WEB_ORIGIN` = `https://ritmofit.studio`.

> **PR #81 follow-up hardening deployed (2026-06-21, PR #84, Worker `e3528c85`).**
> PR #84 merged to `main` as `51c5b9e` and deployed from a clean worktree. Browser pinch zoom is
> restored; class-cover uploads now enforce a shared 5 MiB limit, return a documented `413`, serve with
> `nosniff`, and best-effort delete replaced/deleted R2 objects; Spotify playlist import now paginates
> the provider's 50-item pages instead of silently truncating and rejects malformed later pages rather
> than returning a partial import. No schema or migration change; remote D1 remains through `0013` with
> no pending migrations. Pre-deploy gates: format, typecheck, lint, unit 330, Worker/D1/R2 integration
> 44, web build, OpenAPI no-drift, and `audit:ci` all green. Post-deploy smoke: SPA `200`, health `200`,
> unauthenticated `/classes` `401`, all six security headers present, built asset
> `index-BhYgwUet.js` served `200`, and production viewport metadata is
> `width=device-width, initial-scale=1.0`. Prior Worker `d625bc50` is the rollback anchor.
>
> **Class covers, tags, playlist import + PWA deployed (2026-06-20, PR #81, Worker `d625bc50`).**
> PR #81 (feat: class covers, tags, playlist import, and PWA assets) merged to `main` (merge commit
> `0aad7a4`) and deployed. Adds: per-class custom cover images stored in a **new R2 bucket**
> (`ritmofit-images`, bound as `IMAGES_BUCKET`) and served by the Worker at `/api/v1/uploads/covers/*`;
> a `class_tags` table with add/remove/clone-on-copy; Spotify playlist URL import (bounded concurrency,
> same-song dedup; SoundCloud import deliberately 501 pending `/resolve`); and PWA manifest + service
> worker + icon/favicon/OG assets. Two review fixes landed on the branch first: tags serialize via
> `json_group_array` (a comma in a tag no longer splits it in the list view), and `coverImageUrl`/`tags`
> were dropped from the create/update JSON contract (written only by their dedicated endpoints — `tags`
> isn't a `classes` column, so a PATCH carrying it would have broken), with `featuredCategory` now
> honored on create. **New infra prerequisite:** R2 had to be enabled on the Cloudflare account (owner
> dashboard opt-in) and the `ritmofit-images` bucket created before deploy — the runbook's environment
> matrix predates R2. **Migration `0013`** (`class_tags` + `classes.featured_category` /
> `classes.cover_image_url`, additive/non-breaking) applied to remote D1 before code; remote D1 now at
> `0013`. Migrations-before-code order followed. Pre-deploy gates green: typecheck, lint (repo source;
> untracked local `.ds-sync`/`.design-sync` tooling lints dirty but isn't in git or CI), unit 175 +
> web 150, integration 42, web build (PWA SW generated), OpenAPI no-drift. Post-deploy smoke: SPA 200,
> health 200, unauth `/classes` + `/explore` 401, security headers present, served asset hash
> `index-DPf04y_D.js` matches the build, `IMAGES_BUCKET` binding resolves in prod. The cover-serving
> route is session-gated (consistent with the fully-authenticated app — Explore itself requires auth);
> logged-in same-origin `<img>` requests carry the cookie, so covers render. Prior live version
> `12aa76f9` (2026-06-17) is the rollback anchor. Five non-blocking review follow-ups left as a PR
> comment (Spotify 100-track truncation, orphaned-cover cleanup, upload size limit, image `nosniff`,
> `user-scalable=no` a11y).
>
> **Web UI coverage closed + PR-preview decision deferred (2026-06-15, PRs #65–#66, not deployed).**
> PR #66 closes the last REVIEW.md "web UI coverage" SHOULD-FIX with jsdom + Testing Library component
> tests for Dashboard (incl. the keyed rapid-switch guard), the Connections/Share/Teams dialogs, and
> ErrorBoundary (web unit suite 103 → 118; total api 175 + web 118, integration 41). PR #65 recorded the
> integration-test matrix + audit disposition. Separately, evaluated linking the GitHub repo to Cloudflare
> for CI/preview deploys and **deferred PR preview environments** (recorded as a DEFERRED decision in
> REVIEW.md): the repo-link is rejected outright (duplicates CI + pushes toward auto-deploy, conflicting
> with the manual-deploy guardrail); previews revisited when a second reviewer joins or at launch, via a
> `wrangler versions upload` PR job (a version, not a deploy) if pursued. All test/docs-only — no schema,
> migration, API, shared-contract, or OpenAPI change, so **not a deploy**; production stays on Worker
> `768cdded` / remote D1 `0012`. Close-session gates green (typecheck, lint, unit 293, integration 41,
> web build, OpenAPI no-drift).
>
> **LiveMode timeline perf deployed (2026-06-15).** PR #62 closes the REVIEW.md NICE-TO-HAVE
> "avoid rebuilding the active event list on every animation frame": each track's cues/moves are now
> flattened/sorted once per payload, a primitive-returning `trackIndexAt` keeps frame-rate memos from
> invalidating unless the live track changes, and current/next come from a single O(log n) binary search
> over the stable pre-sorted array (`FullList` reuses the same precomputed events). Web-only — no schema,
> migration, API, shared-contract, or OpenAPI change; +8 LiveMode unit tests (suite 3 → 11). All
> CI-equivalent gates green (typecheck, lint, unit api 175 + web 103, 28 Worker/D1 integration, web
> build, OpenAPI no-drift). Worker `768cdded-78b4-4150-a017-d8c92042c750` is live at 100% (supersedes
> `7505f9aa`); remote D1 unchanged (no pending migrations, through `0012`). Post-deploy smoke: SPA `200`,
> `/health` `200`, `/explore` + `/classes` `401`, and the new `LiveMode-Bu73mx7n.js` chunk `200`.
>
> **Integration-test matrix completed + audit gate kept green (2026-06-15, PRs #63–#64, not deployed).**
> PR #63 closes the last REVIEW.md "Expand Worker/D1 integration tests" gaps: new `provider-callback`,
> `provider-disconnect`, and `password-reset` suites drive the mounted worker against Miniflare D1
> (integration suite 28 → 41), covering every OAuth-callback failure branch (state minted via the test
> `ENCRYPTION_KEY`), the disconnect → purge-enqueue side effect, and the full Better Auth reset flow
> (request → reset → sign-in, plus no-enumeration + invalid-token). PR #64 dispositions two
> newly-published dev/build-only vite advisories (`GHSA-fx2h-pf6j-xcff`, `GHSA-v6wh-96g9-6wx3`) that had
> started failing `audit:ci` on `main`. Both are test/tooling-only — no schema, migration, API,
> shared-contract, or OpenAPI change — so **neither is a deploy**; production stays on Worker `768cdded`
> / remote D1 `0012`. Merged after green CI. The integration-test matrix item is closed; at that point,
> the remaining code-level SHOULD-FIX from the review was the Better Auth trusted client-IP header.
>
> **Better Auth trusted client-IP hardening completed and deployed (PR #67, 2026-06-15).** Better Auth now
> keys auth rate limits only from Cloudflare's trusted `CF-Connecting-IP` header, removing
> `X-Forwarded-For` as a fallback because clients can supply values before Cloudflare appends to it. The
> Worker/D1 integration helper now supplies a production-shaped `cf-connecting-ip` header by default, and
> the password-reset suite proves spoofed `X-Forwarded-For` values do not create separate rate-limit
> buckets. No schema, migration, API contract, shared-contract, or OpenAPI change. Merged after green CI
> and deployed to production as Worker `035f196c-e11b-4507-81d7-b5320b42ff2b` (remote D1 unchanged at
> `0012`); smoke-tested SPA, `/api/v1/health`, and a protected route (401 without auth).
>
> **Web design-system reconciliation completed and deployed (PRs #69 + #70, 2026-06-16).** The web app
> now fully adopts the consolidated design system: `tokens.json` re-vendored from the source of truth
> (new primitives, `bg/live`, `radius.sheet`, corrected state colors, default BPM 120→122), Tailwind
> mappings for the `state.*`/`segment.*` channels, the danger channel corrected across 11 components (was
> borrowing the intensity ramp), the three OFL fonts self-hosted (Google Fonts CDN removed, CSP tightened
> to `font-src 'self'`, full per-family `*-OFL.txt` bundled), explicit provider connection states, Live on
> the `bg/live` surface, and an opt-in `[data-theme="light"]` token block. A high-effort code-review pass
> also fixed four pre-existing broken `--rf-*` token references. No schema, migration, API contract,
> shared-contract, or OpenAPI change. PR #69 (the reconciliation) shipped first as Worker `ce1b41e9`, then
> PR #70 (the OFL license bundle) as Worker `d4613501-c176-49cf-ad44-2e3f166bf3c8` (remote D1 unchanged at
> `0012`); both smoke-tested — SPA, `/api/v1/health`, a protected route (401), the self-hosted font assets,
> and the three OFL license texts (`200 text/plain`).
>
> **Standalone design-system synthesis completed (2026-06-15).** A reviewable reference package now
> lives at the workspace root in `ritmofit-design-system-final/`. It consolidates canonical tokens and
> guidance, adds a first-class Library-to-Builder creation flow, and includes framework-free mockups for
> marketing, Library, Builder, Live, share cards, iOS direction, sign-in, and explicitly future-facing
> Explore/Teams surfaces. This does not alter production components, API contracts, schema, migrations,
> or deployment state. Production adoption remains a separate reviewable implementation phase. **The
> canonical design system is still the in-repo [`../ritmofit_design_system/`](../ritmofit_design_system/);**
> the workspace-root `ritmofit-design-system-*` directories and HTML mockups are exploration artifacts,
> not the source of truth.
>
> **Pre-launch blocker remediation deployed (2026-06-14).** PR #45 shipped four audited launch fixes:
> production OAuth callbacks use the canonical web origin; shares and team grants require a verified
> target identity; Dashboard class detail is keyed by class/request and rejects stale responses; and
> provider disconnect purges clear unprovenanced artwork while retaining exhausted duties in a durable
> failed state. Remote D1 is migrated through `0009` (`failed_at` plus the active-queue index), and Worker
> version 46 (`aa26e286-c517-444a-952f-d5e410c9439f`) is live at 100%. Health, SPA, protected-route,
> code-split asset, and missing-state SoundCloud callback smokes passed; the callback now returns to
> `https://ritmofit.studio`.
>
> **Production transactional email verified (2026-06-14).** Resend verifies
> `ritmofit.studio`; public DNS resolves the sending MX/SPF/DKIM records and DMARC policy.
> Worker secret-only version 48 (`5bcf4a47-5795-4832-b8b0-bde95d651b3d`) supplies a
> sending-only, domain-restricted `RESEND_API_KEY` and explicit `EMAIL_FROM`. A real
> Gmail-alias signup received and completed email verification (`email_verified = 1`);
> the password-reset email also arrived, opened the valid reset form, and completed the
> password change. The temporary production account and its cascaded auth rows were
> removed after the test. The transactional-email launch blocker is closed.
>
> **Pre-launch hardening + verification (2026-06-15).** Three web-focused PRs: **#51** an accessible
> `Dialog` primitive (focus trap/return, `inert` background) adopted across all five dialogs, real form
> labels, and narrow-width (390 px) layout fixes; **#52** a dialog focus guard (keep focus inside when an
> in-dialog control is removed) plus committed Playwright browser smokes (`apps/web/smoke/`: narrow-width
> 18/18, functional 16/16) and a deploy/rollback runbook (`deployment-runbook.md`); **#53** release-gate
> hardening — Prettier boundary so `format:check` is green, the four dev/build-only `esbuild`/`vite` audit
> advisories dispositioned via `pnpm-workspace.yaml`, and both wired into CI (no deploy — tooling only).
> #51/#52 are live; Worker `1eb04d11-b676-43b5-a7be-7b62ffe83f6a` at 100%, remote D1 through `0010`.
> **0 launch blockers remain**; the Follow-Up Verification Checklist in `../REVIEW.md` is now green except
> a vite 5→6 upgrade (to clear the ignored advisories) and owner-only GitHub branch protection. Remaining
> SHOULD-FIX backend items: add the remaining lookup/cleanup indexes and broaden Worker/D1 integration
> tests.
>
> **Web hardening — class-library pagination deployed (2026-06-15, PR #54).** `GET /classes` now resolves
> ownership, direct/team shares, duplicate-path access rank, deterministic ordering, and optional
> keyset pagination inside D1. The web library loads 30 classes at a time; the unparameterized full-array
> response remains compatible with the current iOS client. Migration `0011` adds owner/share lookup
> indexes. Remote D1 migrated through `0011`; Worker `86c996ff-4b75-4ea0-bf8e-0ed59910c125` is live at
> 100% (supersedes `1eb04d11`). Post-deploy smoke: SPA `200`, `/health` `200`, `/classes` `401` (incl.
> `?limit=5`), 6/6 security headers present.
>
> **Backlog batch deployed (2026-06-15, PRs #55–#61).** The overnight hardening backlog merged to `main`
> and the runtime/schema changes shipped together. **#57** adds the `track_provider_ids.track_id` lookup
> index and the `rate_limit.last_request` pruning index via migration `0012` (index-only); **#56**
> lazy-loads/async-decodes non-critical album art; **#58** renders a 404 view for unknown SPA paths;
> **#60** adds owner-only inline class rename. **#55**/**#61** add choreography write-path and team-share
> detail-access Worker/D1 integration tests (suite 21 → 28); **#59** rewrites the README as a real entry
> point and drops the stale root `.dev.vars.example`. Remote D1 migrated through `0012`; Worker
> `7505f9aa-3655-4bef-b6b3-1b2085d627eb` is live at 100% (supersedes `86c996ff`). Gates green (api 175 +
> web 95 unit, 28 integration, build, OpenAPI no-drift, audit:ci). Post-deploy smoke: SPA `200`
> (`index-CMFEcIls.js`), `/health` `200`, `/classes` `401`, 6/6 security headers present. Remaining
> SHOULD-FIX: broaden the integration matrix (provider callback config, disconnect purge SQL, password
> reset) and the deferred LiveMode RAF memoization + Better Auth trusted client-IP header.
>
> **Web design-system build (builder UI) underway (2026-06-12).** The rich planning UI M1 deferred is
> now being built in vertical slices — the difference between the data-flow skeleton and the designed
> surface in [`../ritmofit_design_system/`](../ritmofit_design_system/). Slices 1–4 are merged (PR #8)
> and **deployed** (Worker version `4afed022`, no schema change): (1) the energy-arc **intensity ribbon**,
> (2) low-noise **song rows** (44px art, Martian-Mono BPM, intensity bars), (3) the **track inspector**
> (edit intensity/BPM/notes, remove), (4) **cue + placed-move authoring**. Also wired **vitest into
> `apps/web`** (geometry unit test). Slices 5–6 added drag/keyboard reorder and inline-edit of cues/moves
> (PRs #9–#10). **Slice 7** assembles it all into the spec'd **full 3-pane `09` layout** (library · class
> workspace · sticky inspector, with a class-header summary) — purely presentational, no schema/API/shared
> change; `pnpm test` = api 159 + web 17 = **176** *(merged PR #13, **deployed** 2026-06-12, Worker
> version `810f25d3`)*. **Slice 8** adds the **cue color picker** (rationed palette, no plasma; tags the
> existing `cues.color`; deployed, Worker `74a94ec5`). **Slice 9** adds **custom user-moves** (create +
> place reusable moves from the inspector; web-only — the `/user-moves` routes + run-payload name
> resolution already existed; *merged PR #17, **deployed 2026-06-12**, Worker `511af62c`*). **Slice 10**
> adds the **timeline-marker strip** beneath the ribbon (proportional track blocks + ▲ cue / ◆ move markers
> on a shared time axis; *merged PR #19, **deployed 2026-06-12**, Worker `ca91c8c5`*). **Slice 11** makes
> the timeline's blocks + markers **clickable/keyboard-selectable** (open a track in the inspector,
> cross-highlight its row; *merged PR #21, **deployed 2026-06-13**, Worker `755e3489`*). **Slice 12** makes
> a cue/move **marker click focus its row** in the inspector (*merged PR #23, deployed, Worker `802ebe48`*).
> **Slice 13** adds a **custom-moves manager** (rename / description / delete via a dialog from the Moves
> section; web-only over the existing `/user-moves` routes; *merged PR #25, **deployed 2026-06-13**, Worker
> `cc437560`*). **Slice 14** adds the signature **on-beat pulse** — the Live "Now" cue card breathes on the
> track's beat (CSS, reduced-motion-safe; *merged PR #27, **deployed 2026-06-13**, Worker `9a298d21`*).
> **Slice 15** adds the All-Out **"drop"** — a plasma glow bloom + cue crossfade on all-out cue advances in
> Live (CSS, reduced-motion-safe; *merged PR #29, **deployed 2026-06-13**, Worker `c3a502c0`*). **Slice 16**
> adds the **segment band** — a new `class_sections` table (**migration `0006`**) + fixed `segmentType` enum,
> full-stack (shared + CRUD routes + additive run-payload `sections[]` + a `SegmentBand` under the timeline);
> this is the first builder slice that **does** change schema + contract (*merged PR #31, **deployed
> 2026-06-13**, Worker `14d363cf`; remote D1 migrated to `0006`*). Slices 7–15 were no schema/API/shared change.
> **Slice 17** adds **stable cue/move `id`s to the run-payload** — an **additive** contract change (no
> schema/migration; `schemaVersion` stays 1) so the timeline marker→row focus correlates by id and two
> cues/moves at the same `anchorMs` disambiguate (closes the slice-12/16 caveat) — and hardens the
> contract iOS Phase 2 consumes; `pnpm test` = api 159 + web 49 = **208** (*merged PR #33, **deployed
> 2026-06-13**, Worker `7edfda8a`, no schema/migration*).
> Deferred: the planning-timeline pulse, the playhead/tap-to-seek, segment icons/drag-resize, custom-move
> `baseMoveId`/`template` editing, and a run-payload `id` on `sections[]` (symmetry, if iOS wants it). See
> the "Milestone build log" section below (and `archive/milestones.md`) for the full slice log.
>
> **Music frontend (the "M2 frontend") complete + deployed (2026-06-13).** M2's provider backend had
> shipped with **no UI** (tracks were hand-typed as Title/Artist/ms); that gap is now closed. **S1**
> track search → import → add (provider-picked, debounced, 44px song cards); **S2** provider-connection
> settings (connect/disconnect, clear states); **S3** "search my likes" (token-spending); **S4** a BPM
> lookup button. Then, when real credentials were first set, two **prod-only** bugs surfaced (the mock
> path never exercised live `fetch`/limits) and were fixed: a Workers `Illegal invocation` from passing
> the **bare global `fetch`** to adapters (→ a bound `fetch` wrapper) and **Spotify rejecting `limit=25`**
> with 400 "Invalid limit" (→ 10); provider failures now also map to **502** (typed `ProviderError`), not
> 500. **All three providers verified live in prod** (SoundCloud / Spotify / Apple Music — real search +
> import + album art; secrets set via `wrangler secret`, Apple developer-token minted by the new
> `apps/api/scripts/apple-dev-token.mjs`). `pnpm test` = api 159 + web 53 = **212**. PRs #35–#37; latest
> Worker after the error-mapping fix. **Open:** SoundCloud per-user *Connect* OAuth round-trip needs the
> redirect URI registered + a browser login to confirm (provider *search* via app-token is verified).
>
> **iOS Phase 2 underway — near complete (2026-06-15).** The native live surface in `ritmofit-ios`
> (built against this same backend/run-payload) has merged slices **1–10 plus slice 11 partials** to
> `main` (PRs #5–#13); only VoiceOver, error-boundary review, and a launch screen remain. iOS status is
> tracked in `ritmofit-ios/ritmofit_dev_plan/BUILD_ORDER.md`, the source of truth for that repo — this
> plan does not re-track iOS slices. The web *backend* build order is done; the web *UI* design-system
> build continues.
>
> **Web hardening — track-duration Live guard deployed (2026-06-14).** PR #49 adds
> class-specific `class_tracks.duration_ms_override` (migration `0010`), letting owners/editors repair an
> unknown or incorrect provider/library duration without mutating another user's private track.
> Sequencing, anchor validation, copies, and the run-payload use the effective duration
> (`override ?? track.duration_ms`). The builder labels missing durations, offers an `m:ss` correction
> in the inspector, and blocks Live mode until every track has a positive duration. Unit/component
> tests (241), Worker/D1 integration tests (17), CI, and fresh-D1 migration verification passed.
> Remote D1 was migrated through `0010` before Worker
> `0e9ab61b-acb8-480c-a45d-36ae455dc6c7` deployed at 100%. Health, SPA, auth enforcement,
> security-header, main-bundle, and Live-mode chunk smokes passed.
>
> **Web hardening — Live provider handoff deployed (2026-06-14).** PR #50 adds explicit
> provider-app/site handoff links for the active track in Cue-by-Cue and Full List views, using the
> run-payload's existing `providerRefs`. A web-only validator accepts Spotify
> track URIs and provider-owned HTTPS links for Spotify, Apple Music, and SoundCloud while suppressing
> null, malformed, cross-provider, and unsafe stored values. This does not embed, mix, or control
> playback and does not change schema, migrations, API behavior, shared contracts, or OpenAPI.
> Typecheck, lint, 246 unit/component tests, 17 Worker/D1 integration tests, the production web build,
> and OpenAPI drift verification passed. A local browser pass confirmed both Live views, 44px handoff
> targets, provider order/labels, external-link attributes, and suppression when no trusted URI remains.
> CI passed; merged `main` deployed as Worker `babcb3fe-9f7c-4e17-9e65-ab0c16b7784f` at 100%.
> Remote D1 remains through `0010`. Production health, SPA, auth enforcement, security headers, exact
> main/Live asset hashes, and browser runtime/CSP smokes passed.
>
> **Design system — audited final package integrated + deployed (2026-06-17).** PR #74 reconciled the
> in-repo `ritmofit_design_system` with the audited `ritmofit-design-system-final` as a union merge:
> `tokens.json` gains an oklch heat gradient and a light-theme sticky-header token (`headerLight`), now
> wired through the app emitter so `[data-theme="light"]` overrides the topbar; `build-tokens.mjs` /
> `lint-tokens.mjs` gain spacing-scale emission + a guard while keeping the web copy's `--check` / prose
> lint tooling; specs + README reconciled. No schema/API/migration change. `npm run verify`, typecheck,
> lint, **322** unit (web 147 + api 175) + **42** Worker/D1 integration tests, the web build, and OpenAPI
> no-drift passed; merged `main` deployed as Worker `12aa76f9-3a3f-4fc3-8950-f8096434dd31` at 100% (remote
> D1 unchanged through `0012`). Prod CSS verified SHA-256-identical to a fresh build; a live browser render
> confirmed the heat gradient, oklch bloom, and warm-white light header. A post-merge **integration audit**
> (9 dimensions + live render) found the token pipeline, emitters, tooling, and prod artifact clean, and
> surfaced three doc-accuracy issues fixed in PR #75 (docs-only, no redeploy): stale `light.html`
> "no light variant" copy, the brief's class-naming convention (the app uses an `rf-` component namespace,
> the mockups bare names), and a "web uses fluid `clamp()`" type claim true only of the mockups.

---

## Milestone build log (2026-06 → 2026-07; split from the archived milestones.md)

## Web design-system build (builder UI) — shipped & deployed

Not a numbered milestone: this is the **rich planning UI M1 deferred** ("layered on after the data flow
works"), turning the functional-but-skeleton builder into the surface specified in
[`../ritmofit_design_system/`](../ritmofit_design_system/). Built in small vertical slices on top of the
existing backend/run-payload — **no schema, API-contract, or shared-package change**. Slices 1–4 merged in
**PR #8** and **deployed** (2026-06-12, Worker version `4afed022`):

- ✅ **Slice 1 — energy-arc ribbon** (`IntensityRibbon`): the signature staircase area graph; height
  encodes each track's intensity zone (grayscale-safe, color is reinforcement), plasma kiss at all-out,
  static (reduced-motion-safe). Pure `computeRibbonSegments` helper. Also **wired vitest into `apps/web`**
  + a geometry unit test (root `pnpm test` now runs api 159 + web 5 = **164**).
- ✅ **Slice 2 — low-noise song rows** (`SongRow`): 44px album art, title/artist, BPM in Martian Mono,
  intensity as bars+label. Extracted the shared `IntensityReadout` out of `LiveMode` (one definition of
  the redundant-encoding rule).
- ✅ **Slice 3 — track inspector / detail editor** (`TrackInspector`): select a row → edit intensity,
  display-BPM override, notes; remove the track. Edits reshape the ribbon + rows live. Gated on
  owner/edit access. Added `updateClassTrack` / `deleteClassTrack` (existing `PATCH`/`DELETE
  /class-tracks/:id`).
- ✅ **Slice 4 — cue + placed-move authoring** (`ChoreographyEditor`): add/list/delete cues (anchor +
  text) and placed moves (a `GET /moves` library move or freeform `nameOverride`, anchored, optional
  intensity; honors the at-most-one-reference invariant). Added the cue/move/library client fns.
- ✅ **Slice 5 — drag + keyboard reorder of the track list** (merged, PR #9): the ordered song rows
  reorder by dragging a dedicated grip handle (kept off the selection button so click-to-select and drag
  never collide) and by keyboard (↑/↓ on the focused grip — native DnD isn't keyboard-operable). Persists
  via the existing `POST /classes/:id/tracks/reorder` (edit access) and reloads the detail so the ribbon +
  per-track offsets recompute; optimistic order with rollback on failure; view-only shows no grip. New
  pure `moveItem` helper (`lib/reorder.ts`, unit-tested) + `reorderTracks` client fn. No
  schema/API-contract/shared change.
- ✅ **Slice 6 — inline-edit existing cues & placed moves** (merged, PR #10): the `ChoreographyEditor`
  cue/move rows gain an **Edit** affordance (one row editable at a
  time, seeded from the persisted row, Save/Cancel) on top of slice 4's add/list/delete. Cues edit
  anchor + text; placed moves edit anchor + library-pick/custom-name + optional intensity. Backed by the
  existing `PATCH /cues/:id` + `PATCH /class-track-moves/:id` (edit access; the move route re-validates
  the at-most-one-reference invariant on the merged result). Switching a move's reference nulls the
  others; a "Keep current move" sentinel preserves a non-listable `userMoveId` untouched. `updateCue` +
  `updatePlacedMove` client fns; no schema/API-contract/shared change. `pnpm test` = api 159 + web 11 = **170**.
- ✅ **Slice 7 — the full 3-pane `09` layout**: replaced the 2-column inline-inspector builder with the
  spec'd workstation — a **persistent top bar**, then a `xl:grid-cols-[266px_1fr_340px]` grid (collapses
  to one stacked column below `xl`): a sticky **class library** rail (left), the **class workspace**
  center column (a new `ClassHeaderCard` with title + visibility + derived summary stats → energy ribbon
  → track list → add-track), and a **sticky right-hand inspector** (the `TrackInspector` + its nested
  cue/move authoring, with its own scroll and a "select a track" placeholder). The header summary
  (**track count · assembled total · avg BPM**, label+number not color alone) is derived from the
  existing run-payload via a pure, unit-tested `lib/class-summary.ts` (`avgBpm` + `formatDuration`) — no
  new data. Existing components were re-parented untouched; the workspace is keyed by class id so opening
  another class clears the track selection. No schema/API-contract/shared change. `pnpm test` = api 159 +
  web 17 = **176**.
- ✅ **Slice 8 — cue color picker**: cues can be tagged with a color in the inspector's `CuesSection`
  (add + inline-edit), persisted to the existing `cues.color` (no schema/API/shared change — the column,
  route, and run-payload were already wired). A new accessible `CueColorPicker` (radio-group, text-labelled
  swatches, cyan selected-ring) offers a **None** option + the rationed copper/cyan/amber/ember/bone
  palette and **never plasma** (`02-color-system.md`); rationing is enforced in the picker. A stored color
  outside the palette renders as a trailing "current" swatch so editing never silently drops it. Cue rows
  show a small color dot (decorative — time + text still carry the meaning). Palette + `tagLabel` live in
  pure, unit-tested `lib/cue-colors.ts`. A PR-review pass swapped the picker's `radiogroup`/`radio` roles
  for an `aria-pressed` toggle `group` (no arrow-key pattern to honor). `pnpm test` = api 159 + web 22 =
  **181**. **Merged PR #15, deployed 2026-06-12** (Worker version `74a94ec5`; no schema/migration).
- ✅ **Slice 9 — custom user-moves**: instructors can create reusable custom moves and place them from the
  inspector's `MovesSection`. The backend (`GET/POST /user-moves` owner-scoped; placed-move routes already
  validate an owned `userMoveId`; run-payload already resolves user-move names) needed **no change** — this
  is web-only: new `listUserMoves` / `createUserMove` client fns; `MovesSection` loads the caller's user
  moves, lists them as a "Your moves" `<optgroup>` beside the global "Library", and a **"＋ New custom
  move…"** option creates-and-places in one Add (then selects the new move so a repeat Add re-uses it).
  Picker values are source-prefixed (`m:`/`u:`) to disambiguate the two UUID spaces — a pure, unit-tested
  `lib/move-pick.ts` (`parseMovePick`/`pickForPlacement`). `nameOf` now resolves user-move names (was
  `(move)`). This also **retired the `KEEP` sentinel** (user moves are listable now) and **fixed the
  `TODO(select-fallback)`** (a fallback `<option>` for an unresolved id when the library/user-moves fetch
  fails). No schema/API-contract/shared change. `pnpm test` = api 159 + web 30 = **189**. **Merged PR #17,
  deployed 2026-06-12** (Worker version `511af62c`; no schema/migration).
- ✅ **Slice 10 — timeline-marker strip**: a thin **timeline** band beneath the energy ribbon that shares
  its time axis — proportional numbered **track blocks** with **cue (▲)** and **placed-move (◆)** markers at
  their absolute time (`trackStart + clamp(anchorMs, 0, trackDuration)`). Cues/moves are **distinct shapes**
  (not color alone, 09); cue markers carry the cue's color tag, move markers the intensity color — both
  decorative, with shape + position + a `time — text/name` title/aria carrying the meaning. New
  `TimelineStrip` component + a pure, unit-tested `computeTimeline` (same duration-share math as
  `computeRibbonSegments`, so the strip lines up under the ribbon; null/zero-duration tracks drop their
  block + markers). Rendered inside the ribbon card in `Dashboard`. **Static — no playhead** (a Live /
  on-beat concern, deferred); read-only this slice. No schema/API-contract/shared change. `pnpm test` =
  api 159 + web 37 = **196**. **Merged PR #19, deployed 2026-06-12** (Worker version `ca91c8c5`; no
  schema/migration).
- ✅ **Slice 11 — timeline selection**: the timeline strip's track blocks and cue/move markers are now
  **clickable + keyboard-operable** — selecting one opens that track in the inspector and cross-highlights
  its `SongRow` (the open track's block is ringed, `aria-pressed`). `computeTimeline` carries each
  block/marker's `classTrackId` + `position`; `TimelineStrip` gained optional `selectedTrackId` +
  `onSelectTrack` (a plain select, not toggle), with a non-interactive fallback preserved. `Dashboard`
  wires `onSelectTrack={setSelectedTrackId}`. Marker hit areas are padded around the glyph. No
  schema/API-contract/shared change. `pnpm test` = api 159 + web 39 = **198**. **Merged PR #21, deployed
  2026-06-13** (Worker version `755e3489`; no schema/migration).
- ✅ **Slice 12 — focus a cue/move from its marker**: clicking a timeline **cue (▲) / move (◆)** marker now
  selects the track *and* scrolls the matching inspector row into view with a brief highlight flash (clicking
  a track block still just selects). Markers carry the in-track `anchorMs`; `onSelectTrack` gained an optional
  `{ kind, anchorMs }`; `Dashboard` holds a `markerFocus` (`+ nonce` so re-clicking re-flashes) and threads it
  through `TrackInspector` to `CuesSection`/`MovesSection`. A shared `useFlashFocus` hook scrolls + transiently
  rings the row whose `anchorMs` matches (correlated by `anchorMs` since run-payload cues/moves carry **no
  id**). No schema/API-contract/shared change. `pnpm test` = api 159 + web 39 = **198**. **Merged PR #23,
  deployed 2026-06-13** (Worker version `802ebe48`; no schema/migration).
- ✅ **Slice 13 — manage custom moves**: a `CustomMovesDialog` (opened via a **Manage…** button in a track's
  Moves section) lists the caller's custom moves and lets them **rename**, edit the **description**, and
  **delete** (inline two-step confirm; deleting a referenced move is safe — the server snapshots its name
  into placements' `nameOverride`). Web-only: added `updateUserMove`/`deleteUserMove` client fns over the
  existing owner-scoped `PATCH`/`DELETE /user-moves/:id`. On a change, `MovesSection` refreshes the picker
  + this track's placements and bubbles `onChanged` (`TrackInspector` wires it to the class-detail reload,
  so the ribbon/timeline move names stay current). Creation stays in the picker; **`baseMoveId`/`template`
  editing deferred**. No schema/API-contract/shared change. `pnpm test` = api 159 + web 39 = **198**.
  **Merged PR #25, deployed 2026-06-13** (Worker version `cc437560`; no schema/migration).

- ✅ **Slice 14 — on-beat pulse (Live HUD)**: the focal **"Now" cue card** in Live mode breathes one cycle
  per beat (`--rf-beat = 60s / --rf-bpm`, `onBeat` easing `cubic-bezier(0.4,0,0.2,1)`) while playing — the
  design system's signature tempo cue (`10-rhythm-system.md`). CSS-driven (`rf-beat-pulse` keyframes in
  `index.css`, transform + box-shadow only); `LiveMode` adds the class + inline `--rf-bpm` to the Now card
  when `playing && displayBpm != null`. **Exactly one pulsing element**, and **fully removed under
  `prefers-reduced-motion`** (a user loses affect, not information — the cue stays legible). No
  schema/API-contract/shared change. `pnpm test` = api 159 + web 39 = **198**. **Merged PR #27, deployed
  2026-06-13** (Worker version `9a298d21`; no schema/migration).

- ✅ **Slice 15 — the All-Out "drop"** (10 §5, the one big motion spend): in Live mode, while the **live
  track's intensity is `all_out`**, each cue advance blooms a one-shot **plasma glow** (the `peak-glow`
  token) behind the "Now" card and the cue text **cross-fades in**. Rationed to all-out tracks (a handful
  of times per class); layers with the slice-14 beat pulse. CSS-driven (`rf-drop-bloom` + `rf-drop-in`
  keyframes, re-triggered by remounting the bloom/text on the current cue); **degrades to an instant,
  glow-free swap under `prefers-reduced-motion`**. No schema/API-contract/shared change. `pnpm test` =
  api 159 + web 39 = **198**. **Merged PR #29, deployed 2026-06-13** (Worker version `c3a502c0`; no
  schema/migration).
- ✅ **Slice 16 — segment band (fixed enum)** — *the first design-system-build slice that changes schema +
  the contract.* A new **`class_sections`** table (**migration `0006`**) holds time-anchored segment bands;
  a fixed `segmentType` enum (`warm_up`/`climb`/`sprint`/`recovery`/`cool_down`, lower_snake; labels/tints
  presentation-only). Full stack: shared `classSection` schemas + enum; CRUD routes (`GET/POST
  /classes/:id/sections`, `PATCH`/`DELETE /sections/:id`) class-scoped via a new `requireSectionAccess`
  (view reads, edit writes); the run-payload gains an **additive** `sections[]` (`schemaVersion` stays 1);
  OpenAPI regenerated. Web: a `SegmentBand` under the timeline tiles bands by start (pure, unit-tested
  `computeSegmentBands`; each band is **label + tint dot**, never color alone) + an edit-gated add/retime/
  retype/delete editor. **Start is a free anchor** (no bound to the assembled duration — it shifts as
  tracks change; render clamps + tiles). Deferred: Material-Symbol icons, drag-resize, track-range binding.
  `pnpm test` = api 159 + web 44 = **203**. **Merged PR #31, deployed 2026-06-13** (Worker version
  `14d363cf`; **remote D1 migrated to `0006` first** — additive `class_sections` table).
- ✅ **Slice 17 — stable cue/move ids in the run-payload** — *an additive contract change (no schema/
  migration).* The run-payload's cues and placed moves now carry a stable **`id`** (the existing
  `cues.id` / `class_track_moves.id` PKs, already selected during assembly — no new queries);
  `schemaVersion` stays **1**. Shared `runPayloadCue`/`runPayloadMove` schemas gain `id: uuidSchema`;
  OpenAPI regenerated (+two `id` fields only). Web: the timeline **marker→inspector-row focus** now
  correlates by **id** (pure, unit-tested `resolveFlashRowId`: exact id match → first-row-at-same-anchor
  fallback for legacy/changed ids), so **two cues/moves sharing an `anchorMs` disambiguate** — closing the
  slice-12/16 caveat. `id` threads through `TimelineMarker`/`computeTimeline` → `onSelectTrack` →
  `Dashboard` `markerFocus` → `Cues`/`MovesSection`. This also hardens the contract iOS Phase 2 consumes.
  `pnpm test` = api 159 + web 49 = **208**; typecheck (4 pkgs) · lint · web build green. **Merged PR #33,
  deployed 2026-06-13** (Worker version `7edfda8a`; **no schema/migration** — additive contract).

- ✅ **Slice 18 — Live timeline playhead/seek + segment drag-resize** (PR #73, deployed 2026-06-16):
  closes three of the deferred-backlog items below. The builder's static `TimelineStrip` is brought into
  Live mode as the transport **scrubber** — a new `LiveTimeline` reuses `computeTimeline()` for the
  proportional track blocks + cue (▲) / move (◆) markers, fills the played portion, and draws a moving
  **playhead** at the current class time; it replaces the plain `<input type=range>` with an accessible
  `role="slider"` (aria value text; pointer click/drag + ←/→ · PageUp/Dn · Home/End), seeking the existing
  virtual prompter clock only (no audio — the three music rules hold). Each segment boundary becomes a
  **drag-resize handle** (accessible slider) that re-times `startOffsetMs` via the existing
  `PATCH /sections/:id`, clamped between neighbors (1s min gap) so a drag can't reorder/collapse bands,
  committing on pointer-up/Enter/blur and reverting on failure; the numeric `SegmentEditor` stays the
  precise/secondary path. Adds a per-type inline-SVG **energy-arc icon** (label + icon + tint, never color
  alone; no font/CDN, so `font-src 'self'` is unaffected). Web-only: no schema, migration, API,
  shared-contract, or OpenAPI change. `pnpm test` = api 175 + web 147; CI green. **Deployed** in Worker
  `db6265f2-4ed0-48f0-8b8b-4c03801c0247` (alongside the additive API PR #72); remote D1 unchanged at `0012`.

**Deferred (flagged in code):** custom-move **`baseMoveId`/`template`** editing, the **playing-track pulse
in the planning timeline** (no "playing" state in the builder), and segment-band **track-range binding**
(snapping boundaries to track starts). *(Slice 18 closed the timeline **playhead** / tap-to-seek and the
segment-band **icons** + **drag-resize** items.)* The run-payload's
`sections[]` still carries **no id** (sections aren't part of marker→row focus; a symmetry follow-up if
iOS wants it). *(The slice-12/16 **marker→row `anchorMs` disambiguation caveat** was **resolved in slice
17** — cues/moves now carry ids; the PR #10 `TODO(select-fallback)` was resolved in slice 9.)*

---

## Music frontend ("M2 frontend") — built + deployed, all providers live (2026-06-13)

M2 shipped the provider **backend** with no UI — tracks were hand-entered (Title/Artist/ms). This wired
the music layer into the builder and took it to **real catalogs in prod**.

- ✅ **S1 — track search & import** (PR #35): provider-picked, debounced search → low-noise **44px song
  cards** → one-click import-and-add (`GET /providers/:p/search` → `POST /providers/track-import` → add by
  `trackId`). Manual entry kept as a de-emphasized fallback. `lib/providers.ts` (labels/order — SoundCloud
  first — + enum-drift guard); `TrackSearch.tsx`.
- ✅ **S2 — provider connections** (PR #36): `ConnectionsDialog` (top-bar **Connections**) — connect /
  disconnect with clear connected/disconnected state; mock seam links inline, live flow redirects to the
  authorize URL; disconnect is confirmed (triggers the 7-day metadata purge).
- ✅ **S3 — "my likes"** (PR #36): a **Search / My-likes** toggle in `TrackSearch` (`GET /providers/:p/likes`,
  spends the user token).
- ✅ **S4 — BPM lookup** (PR #36): a **Look up BPM** button in the inspector (`POST /tracks/:id/bpm-lookup`,
  never Spotify). S5 (album art on rows, empty/disconnected states) was already satisfied by existing code.
- ✅ **Prod hardening** (PR #37) — two bugs the mock path never exercised, found once **real creds** were
  set and fixed live: (1) **`TypeError: Illegal invocation`** on every provider — the **bare global `fetch`**
  passed to adapters loses its `this` in the Workers runtime (miniflare tolerated it); fixed with
  `lib/fetch.ts` `boundFetch` at all 8 call sites. (2) **Spotify search 400 "Invalid limit"** — Spotify's
  client-credentials search now rejects `limit=25` despite the documented 0–50; lowered to **10**. Also:
  adapters now throw typed **`ProviderError`** so provider failures map to **502** (logged), not an opaque
  500; the Apple developer token is minted by the new **`apps/api/scripts/apple-dev-token.mjs`** (ES256 JWT
  from the untracked `.p8`).
- **Verified live in prod** (`ritmofit.studio`): **SoundCloud**, **Spotify**, and **Apple Music** all return
  real search results and import with album art; throwaway test accounts deleted after each check. Secrets
  set via `wrangler secret put`. `pnpm test` = api 159 + web 53 = **212**; typecheck (4) · lint · build green.
- **Open:** the SoundCloud **per-user Connect** OAuth round-trip needs its **redirect URI registered**
  (`https://ritmofit.studio/api/v1/providers/soundcloud/callback`) + a browser login to confirm end-to-end
  (provider *search* via the app token is verified). Spotify/Apple are **search-only** by design.

---

## Post-launch web hardening

- ✅ **D1-ordered class-library pagination**: `GET /classes` now resolves ownership, direct shares,
  team shares, duplicate-path access rank, deterministic `(updated_at DESC, id DESC)` ordering, and
  optional keyset pagination inside D1. The web library loads 30 at a time with an accessible
  continuation control; unparameterized requests keep the legacy full-array contract for iOS.
  Migration `0011` adds owner/share lookup indexes.
- ✅ **Track-duration Live guard** (PR #49, deployed 2026-06-14): migration `0010` adds
  `class_tracks.duration_ms_override`; sequencing, anchor validation, copies, and the run-payload use
  the class-specific override before the library duration. The builder accepts `m:ss`, flags missing
  durations, and blocks Live mode until every track is timed. Remote D1 is through `0010`; Worker
  `0e9ab61b-acb8-480c-a45d-36ae455dc6c7` is live at 100%.
- ✅ **Live provider handoff** (PR #50, deployed 2026-06-14): Cue-by-Cue and Full List
  expose large, keyboard-accessible "Open in Provider" links for the active track. The links use the
  existing run-payload `providerRefs`; a provider-specific web validator accepts Spotify track URIs
  and trusted Spotify/Apple Music/SoundCloud HTTPS hosts, suppressing malformed or untrusted values.
  Playback remains wholly in provider applications/sites. Web-only; no schema, migration, API,
  shared-contract, or OpenAPI change. Typecheck, lint, 246 unit/component tests, 17 Worker/D1
  integration tests, web build, and OpenAPI drift verification passed; a local browser pass covered
  both Live views plus trusted and suppressed-link states. CI passed; Worker
  `babcb3fe-9f7c-4e17-9e65-ab0c16b7784f` is live at 100%, with remote D1 unchanged through `0010`.

---
