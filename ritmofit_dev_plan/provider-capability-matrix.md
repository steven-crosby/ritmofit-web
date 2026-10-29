# Provider capability matrix: Apple Music, Spotify, SoundCloud × device

<!-- Claude Code, 2026-10-28: Desk research for D25 (owner-approved research pass). Not a decision; not legal advice. -->

**Date:** 2026-10-28 · **Sources checked on:** 2026-10-28 · **Scope:** desk research only. Nothing was tested on a device.
**Not legal advice.** The terms section summarizes public developer terms as written. A lawyer, or the provider in writing, must confirm any reading of them (see the end of §4).

Legend: **"unverified"** means no official source confirmed the point, and the item appears again in §6. "Forum" means a developer-forum post, which is a secondary source and not a ruling from the provider.

---

## 1. Findings that most affect product decisions

1. **Spotify's Developer Policy names dance studios as a prohibited setting.** Policy III.10 says Spotify is for personal, non-commercial use and "can't be broadcast or played publicly from a business," and its examples include *"dance studios"*. It also says "Do not build products or services which are targeted for use by businesses." IV.2 says "commercial uses are not permitted for SDAs" (SDA = Spotify Developer App), and the Web Playback SDK page says it "must not be used in commercial projects without Spotify's prior written approval." An instructor teaching a class with Spotify inside Ritmo conflicts with these terms as written, so this needs a written answer from Spotify. Sources: https://developer.spotify.com/policy and https://developer.spotify.com/documentation/web-playback-sdk
2. **Spotify will not grant Ritmo more than 5 users in the near term.** Development mode allows 5 users per app, and the app owner must hold an active Premium subscription. These rules apply to new apps from 2026-02-11 and to existing apps from 2026-03-09. Extended quota is open only to organizations (since 2025-05-15) and requires "at least 250k MAUs" (monthly active users), a launched service and commercial viability. Review "can take up to six weeks." Sources: https://developer.spotify.com/documentation/web-api/concepts/quota-modes and https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide
3. **Apple's terms restrict timed playback, editing and synchronization.** Apple Developer Program License Agreement (DPLA) §3.3.6(D), last updated 2026-10-13, has four relevant rules:
   - Users may not "download, upload, or modify any MusicKit Content."
   - MusicKit Content "cannot be synchronized with any other content."
   - Users "must initiate playback" and must have standard play/pause/skip controls.
   - Developers may not "indirectly monetize access to the Apple Music service."

   App Review Guideline 4.5.2(ii), last updated 2026-10-16, says that to "play a specific song at a particular moment" an app needs licenses from rights-holders, such as synchronization rights. Clip windows and choreography timed to the music are close to that wording. Sources: https://developer.apple.com/support/terms/apple-developer-program-license-agreement and https://developer.apple.com/app-store/review/guidelines/#apple-music
4. **Apple Music's consumer terms are personal and noncommercial.** The Apple Media Services Terms, last updated 2026-09-14, say content may be used "only for personal, noncommercial purposes." A public fitness class needs public-performance licensing, which is separate from any developer terms. Source: https://www.apple.com/legal/internet-services/itunes/us/terms.html
5. **Spotify's docs now claim the Web Playback SDK works on mobile browsers.** The page says it works in Chrome, Firefox, Safari and Edge "in both mobile (Android and iOS) and Desktop." It also warns that "Safari on iOS and other mobile browsers have restrictions for autoplay," which `activateElement()` handles from a user gesture. Mobile-only Premium plans are excluded. A forum thread titled "The Web Playback SDK seems to no longer work on Android" means real-world reliability is unverified. Sources: https://developer.spotify.com/documentation/web-playback-sdk, https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started and https://community.spotify.com/t5/Spotify-for-Developers/The-Web-Playback-SDK-seems-to-no-longer-work-on-Android/td-p/6640921
6. **Apple Music on Android has no well-documented path.** MusicKit JS docs list no supported browsers and never mention Android or Chrome. The bundled docs were searched and returned zero hits for "Android" or "supported browser" (https://js-cdn.music.apple.com/musickit/v3/docs/index.html). MusicKit for Android exists, with an authentication library and a media-playback library (https://developer.apple.com/musickit/). A 2023 forum post says its last release was December 2021 (https://developer.apple.com/forums/thread/734577), and older posts report slow seeking and no start position in the queue (https://developer.apple.com/forums/thread/126178). D25's "Android + Apple Music" case is the weakest cell in the matrix.
7. **Native iOS gives the most control over Apple Music.** `ApplicationMusicPlayer` "plays music specifically for your app" without changing the Music app's state. It keeps playing in the background when the app declares the audio background mode, and `playbackTime` can be set to seek. On native iOS, Spotify only offers remote control of the Spotify app (App Remote), and on-demand play by URI requires Premium. Sources: https://developer.apple.com/documentation/musickit/applicationmusicplayer, https://developer.apple.com/documentation/musickit/musicplayer/playbacktime and https://github.com/spotify/ios-sdk
8. **Spotify playback control is loosely timed and can mix tracks.** For the Web API Start/Resume endpoint, "The order of execution is not guaranteed" when it is combined with other Player endpoints (https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback). The Web Playback SDK's `player_state_changed` event "may be also executed in random intervals," so it is not a position clock (https://developer.spotify.com/documentation/web-playback-sdk/reference). Android App Remote exposes `getCrossfadeState()`, so the user's own Spotify crossfade setting can apply and Ritmo can read it but not set it (https://spotify.github.io/android-sdk/app-remote-lib/docs/com/spotify/android/appremote/api/PlayerApi.html). That bears on our "never crossfade" rule.

---

## 2. Apple Music matrix

All cells need an Apple Music subscription for full tracks. Without authorization, MusicKit JS plays "non-DRM preview assets" (https://js-cdn.music.apple.com/musickit/v3/docs/index.html). Every Apple path also needs a developer token signed with a MusicKit key (https://developer.apple.com/musickit/).

| Platform | Playback path | Where audio plays | Auth + tier | Precision | Gaps |
|---|---|---|---|---|---|
| Desktop web (Mac/Win: Chrome, Edge, Safari) | MusicKit JS v3 in the page | In our page (DRM via the browser) | `music.authorize()` sign-in popup, which issues a Music User Token (MUT) · subscription | `setQueue({startTime})` gives "seconds to seek to … after it is created" · `seekToTime(sec)` · `playbackTimeDidChange` event (docs give no rate) | No official browser list. Forum (2021): Chromium got only 30-second previews (https://developer.apple.com/forums/thread/683958). Encrypted playback needs https (https://developer.apple.com/forums/thread/108376). Our own testing: desktop uses MSE blob: URLs. |
| iOS/iPadOS Safari web | MusicKit JS v3 | In our page (native HLS `<audio>`, from our testing tonight) | Same as desktop | Same API. iOS needs a user gesture for audio, and `play()` without one is refused (https://webkit.org/blog/6784/new-video-policies-for-ios/). Apple's terms also require that "users must initiate playback." | setQueue apparently needs a gesture (our testing tonight; docs say nothing). Behavior with the screen locked or the page in the background is unverified. |
| Installed PWA, iOS | MusicKit JS in a standalone web app | In our web app | Same. Whether the authorize popup works in standalone mode is unverified. | Same as Safari, presumably | Background audio, EME/DRM support and the auth popup in standalone mode are all unverified. |
| Android Chrome web / installed PWA | MusicKit JS | In our page (Widevine) | Same | Unverified | No official statement on Android support. Forums report Android WebView and Android 12 failures (https://developer.apple.com/forums/thread/704953). |
| Native iOS app | MusicKit Swift `ApplicationMusicPlayer` (or `SystemMusicPlayer`) | `ApplicationMusicPlayer`: in our app. `SystemMusicPlayer`: in the Music app, "controlling the Music app's state" (https://developer.apple.com/documentation/musickit/systemmusicplayer) | MusicKit authorization · subscription · automatic token management on Apple platforms (https://developer.apple.com/videos/play/wwdc2022/10148/) | Settable `playbackTime`, a queue API, and background audio with the audio mode | Best documented path. Seek latency is unverified. |
| Native Android app | MusicKit for Android (auth library + media-playback library) | "Play music directly from your app" (https://developer.apple.com/musickit/). Whether audio actually plays through the Apple Music app is unverified (https://developer.apple.com/forums/thread/835707). | Sign-in goes through the Apple Music app. Per a search snippet of Apple's page, the auth library helps the user download Apple Music if it is missing. Subscription required. | Forum: seek "extremely flawed" and no start position in the queue as of SDK 1.0 (https://developer.apple.com/forums/thread/126178). Playback delay (https://developer.apple.com/forums/thread/131269). | SDK appears stale (last release December 2021 per a 2023 forum post). Current version and requirements are unverified. The download page (https://developer.apple.com/download/all/?q=Android%20MusicKit) needs a sign-in, which we did not do. |

---

## 3. Spotify matrix

Every playback path needs **Premium**. The Web Playback SDK excludes "mobile only types of premium subscriptions," and Web API player endpoints say "only works for users who have Spotify Premium" (https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback). The quota limits and business-use terms from §1 apply to every cell.

| Platform | Playback path | Where audio plays | Auth + tier | Precision | Gaps |
|---|---|---|---|---|---|
| Desktop web | Web Playback SDK, which acts as a Connect device in the page, plus Web API Connect endpoints | In our page | OAuth with token refresh (SDK tokens last up to 60 minutes) · Premium · no Spotify app needed | `seek(ms)` · `getCurrentState()` · Web API `position_ms` / `offset` · state events at "random intervals" · ordering across Player endpoints "not guaranteed" | Commercial use needs prior written approval. Iframes need the encrypted-media and autoplay permissions. Blocker extensions can break loading (https://developer.spotify.com/documentation/web-playback-sdk). |
| iOS/iPadOS Safari web | (a) Web Playback SDK in the page, or (b) the Web API remote-controlling the Spotify app | (a) In our page · (b) in the Spotify app | Premium. Option (b) needs the Spotify app open and acting as an active device. | (a) Call `activateElement()` from a gesture before transfer, otherwise playback starts paused. iOS volume "always under the user's physical control." · (b) Same as Web API. | (a) Officially "supported"; screen-lock and background behavior unverified · (b) whether the Spotify app stays an active Connect device while in the background is unverified. |
| Installed PWA (iOS / Android) | Same as the mobile web paths | Same | Same | Same | Standalone-mode DRM, background and OAuth redirect behavior unverified. |
| Android Chrome web | Same as iOS web, (a) or (b) | Same | Same | Same | Forum report of the SDK breaking on Android (§1, item 5). Unverified. |
| Native iOS app | iOS SDK: App Remote plus auth (https://developer.spotify.com/documentation/ios) | In the Spotify app: "the Spotify app must be installed since it handles the actual music playback" (https://github.com/spotify/ios-sdk) | Spotify app installed · Premium for on-demand play by URI | Play by URI, pause/resume, skip, seek, shuffle, player-state subscription. No queue API is mentioned in the README. | Music must be playing when App Remote connects, so the Spotify app is not suspended. The README advises disconnecting when our app goes to the background. The repo has many open issues and no stated maintenance status. |
| Native Android app | Android SDK (Beta): auth library plus App Remote (https://developer.spotify.com/documentation/android) | In the Spotify app ("Playback always in sync with Spotify app") | Spotify app implied · Premium, presumably as on iOS (unverified for Android) | `play`, `queue`, `seekTo`, `seekToRelativePosition`, `skipNext`/`skipToIndex`, `subscribeToPlayerState`, `getCrossfadeState` | Beta, and "likely to change significantly without warning." Latency is undocumented. |

## 3b. SoundCloud (brief)

| Platform | Path | Where audio plays | Precision | Notes |
|---|---|---|---|---|
| All web, PWA and native WebView | HTML5 Widget iframe + Widget API (https://developers.soundcloud.com/docs/api/html5-widget) | In the embedded widget | `seekTo(ms)`, async `getPosition(cb)`, `PLAY_PROGRESS` event with `currentPosition` | The docs say nothing about mobile. Gesture rules presumably follow the browser (unverified). Per SoundCloud's help center (https://help.soundcloud.com/hc/en-us/articles/115003446727), the public APIs generally can't be used commercially. The page returned 403 when fetched, so this rests on a search snippet and is unverified. Developer policies: https://developers.soundcloud.com/policies |

---

## 4. Terms that bear on Ritmo (not legal advice)

| Topic | Spotify | Apple Music | Source |
|---|---|---|---|
| Commercial use | Not permitted for Streaming SDAs (Policy IV.2). Web Playback SDK needs prior written approval. The Developer Terms limit the license to "private personal use" (III.1(a)). | No "indirectly monetize access" to Apple Music, with in-app purchase and ads given as examples. Unclear whether a paid tool that only *uses* MusicKit counts. Forum developers ask exactly this and have no Apple answer (https://developer.apple.com/forums/thread/852708). | https://developer.spotify.com/policy · https://developer.spotify.com/terms · DPLA §3.3.6(D) |
| Business or public use (fitness classes) | III.10: no products "targeted for use by businesses." Content can't be played publicly from a business, and dance studios are named. Not for "several simultaneous listeners" (webcasting clause). | Consumer terms are "personal, noncommercial purposes." The developer terms say nothing explicit about public performance. | https://developer.spotify.com/policy · https://www.apple.com/legal/internet-services/itunes/us/terms.html |
| Sync with visuals or other content | III.6: "Do not synchronize any sound recordings with any visual media." | "Cannot be synchronized with any other content." Guideline 4.5.2(ii) says "a specific song at a particular moment" needs sync rights. | Same as above · https://developer.apple.com/app-store/review/guidelines/ |
| DJ, mixing, crossfade | III.7: no "segue, mix, re-mix, or overlap" with other audio | Covered by the no-modify rule | Same |
| Modifying or segmenting playback (clip windows) | Terms IV.2(b)(ii): no "modifying, editing, altering". Starting at an offset or seeking is not explicitly addressed. | "Full songs must be enabled for playback," and no modifying. Whether an app-driven start/end window counts as modification is not addressed. | Same |
| Audio analysis or BPM | III.13: "Do not analyze the Spotify Content." Matches our no-BPM-from-Spotify rule. | Only "facilitating access" to subscriptions is permitted. | Same |
| Caching, download, re-hosting | Caching only where "strictly necessary" (Terms IV.3(b)) | No download or upload. MusicKit JS may not be recombined with other code or re-hosted. | Same |
| Branding | Attribute with Spotify Marks. Show cover art and metadata during playback (II.4–II.5). App name must not start with "Spot." | Follow the Apple Music Identity Guidelines | https://developer.spotify.com/documentation/design · https://marketing.services.apple/apple-music-identity-guidelines |
| Quota and review | 5 users in dev mode, owner needs Premium, extended quota needs an org with 250k+ MAU, review up to 6 weeks, extra quota "only for the use case" reviewed (VII.3.5) | App Review for the native apps. No user cap found for MusicKit JS (unverified). | §1, item 2 |

**What a lawyer or the provider must confirm:**
- (a) Whether an instructor playing their own Spotify or Apple Music account in a paid or public class is allowed at all, and which public-performance licenses apply. Gym music licenses are typically separate from provider terms (unverified).
- (b) Whether clip windows, meaning a start offset plus an app-triggered stop, count as "modify" or "segment."
- (c) Whether cues or choreography timed to the music count as "synchronization with other content" or "visual media."
- (d) Whether charging for Ritmo counts as "indirect monetization" (Apple) or a "commercial use" (Spotify).
- (e) What a Spotify commercial or partner agreement would require.
- (f) Whether Ritmo is a product "targeted for use by businesses" (Spotify III.10).

---

## 5. Implications for Ritmo's per-device shape under D25 (options only, no decision)

D25 asks for "works wherever Apple or Spotify apps run." The pieces that satisfy it are:

| Device | Apple Music options | Spotify options | Trade-offs |
|---|---|---|---|
| Mac / Windows desktop | MusicKit JS in the web app (current) | Web Playback SDK (current) | Best-understood path. Apple coverage in Chromium needs re-testing (2021 report of previews only). |
| iPhone / iPad | A. Native SwiftUI app with `ApplicationMusicPlayer` · B. Safari web with gesture-gated MusicKit JS | A. Native app plus App Remote, with audio in the Spotify app · B. Web Playback SDK in Safari · C. Web or native app driving the Spotify app through the Connect Web API | Native Apple gives in-app audio, background play and settable `playbackTime`. Native Spotify puts the audio in another app, and the connection is lost if that app is suspended. Web on iOS needs a gesture for each start, and its screen-lock behavior is unknown. |
| Android phone / tablet | A. MusicKit JS in Chrome or a PWA (unsupported or unverified) · B. Native Android app with MusicKit for Android (stale SDK, weak seeking per forums) · C. No in-app Apple path, so hand off to the Apple Music app (does not meet D25's intent) | A. Web Playback SDK in Chrome (officially supported) · B. Native Android app plus App Remote (Beta) · C. Connect Web API driving the Spotify app | Spotify on Android is reachable from the web. Apple on Android is the gap and may force a native Android app, or a documented "best effort" exception to D25. |
| Any device, Spotify at scale | n/a | Every path above | All Spotify paths stay at 5 users in dev mode, and business use conflicts with the Policy until Spotify grants written approval or partnership. That is a gate on the business, not a technical one. |

Cross-cutting choices:
1. **Web everywhere plus native iOS.** This is the current setup. It leaves Apple on Android unverified.
2. **Add native Android.** This covers Apple via MusicKit for Android, but that SDK may be unmaintained.
3. **Remote-control mode as a universal fallback.** Ritmo would drive the provider's own app via Connect or App Remote. Coverage is broad, but timing is loose and the provider app's own settings (such as crossfade) leak into playback.
4. **Reduce timing-sensitive features per provider,** for example by treating clip windows as cue hints rather than enforced stops, if the terms review makes that necessary.

---

## 6. Open questions to verify on device or with the provider

**On device**
1. iOS Safari with MusicKit JS: does `setQueue` or `play` need a fresh gesture for each track change mid-class? Does audio survive screen lock, app switching and Control Center?
2. iOS installed PWA: do MusicKit JS authorize, DRM playback and background audio work? Same questions for the Spotify Web Playback SDK, including the OAuth redirect.
3. Android Chrome and Android PWA: does MusicKit JS play full tracks or only previews? Does the Spotify Web Playback SDK work today?
4. Desktop Chrome and Edge: does MusicKit JS play full tracks for subscribers, given the 2021 report of previews only?
5. Measured latency and jitter for each path: start-at-offset accuracy, seek-to-audible time, how often position events arrive, and the delay between issuing pause and audio stopping.
6. Spotify App Remote (iOS and Android): connection stability during a 45 to 60 minute class with our app in the foreground and the Spotify app in the background. Does the user's crossfade or gapless setting apply to our queue?
7. Spotify Connect Web API driving the Spotify mobile app: does the app stay an active device while in the background or with the screen locked?
8. MusicKit for Android: current version, minimum Android version, whether the Apple Music app is required, and whether audio plays in-app or in the Apple Music app. This requires signing in to the download page.

**With the provider or counsel**
9. Spotify: is a written commercial approval or partnership available for a fitness-instructor tool, given Policy III.10 (dance studios), IV.2 and the SDK's commercial clause? What criteria apply below 250k MAU?
10. Apple: does a paid instructor tool count as "indirectly monetize access"? Do clip windows count as "modify"? Do timed cues count as "synchronized with other content" or as needing 4.5.2(ii) sync rights?
11. Apple and Spotify: does either have an official business or fitness music offering we should route instructors to instead? (Unverified; none was found on the pages checked.)
12. SoundCloud: the full API Terms of Use and the commercial clause (https://developers.soundcloud.com/docs/api/terms-of-use was not retrieved).
13. Public-performance licensing (PROs, gym blanket licenses) per market. This is separate from all of the provider terms above.
