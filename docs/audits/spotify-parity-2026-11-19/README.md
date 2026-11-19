# Spotify parity research for RitmoFit (2026-11-19)

Research made for the owner's goal, stated 2026-11-19: "1:1, or nearly 1:1 feature and design
parity for macos/ios and the web-app", with Spotify's web player vs desktop app as the bar.
Web research only, by a Neo session (Claude Code). Claims carry a source number; "unconfirmed" means
no primary source was found. spotify.design now redirects, so Encore articles were read through
reposts ([6], [7]).

**Outcome:** the owner chose "Mac matches web", recorded as
[D28](../../../ritmofit_dev_plan/decisions.md#d28--native-parity-with-the-web-at-spotifys-bar-the-mac-matches-the-web-resolved-2026-11-19)
(RF-227). Section 5 below is the research's recommendation; D28 is the decision.

## 1. How Spotify gets web/desktop 1:1

- **They share one codebase.** The desktop app (Windows and macOS) is a native shell built on
  Chromium Embedded Framework (CEF). It runs the same React UI as the web player
  (open.spotify.com). From late 2018 Spotify grew the web player until it matched the old desktop
  client, consolidated the code in early 2021, and shipped one redesign to both on 2021-03-25
  [1][3][6].
- **A "Platform APIs" layer hides the differences.** It is written in TypeScript, and React hooks
  tell the UI which functions each platform has. Desktop-only native features plug in through it:
  downloads, offline mode, local files, the C++ playback stack and native login [1].
- **What it cost:**
  - separating the web player from Spotify's web servers;
  - reconciling OAuth with native login;
  - two incompatible playback stacks;
  - building the desktop-only features into the shared UI;
  - Spotify says they "had to iterate longer than we'd hoped" [1].
- **What it bought:** inside about a year the shared UI had every old desktop feature, plus some
  that had only existed on mobile. It was more consistent and more accessible, and it deploys
  continuously [1].
- **Mobile was not merged.**
  - iOS and Android stay native apps on a weekly app-store release train [4].
  - They share the backend, a shared C++ client core [3][5] and the Encore design system.
  - No source says they share UI code with web or desktop (unconfirmed).
  - The 2023-06-20 desktop redesign moved desktop toward mobile instead: Your Library on the left
    and a Now Playing view on the right [8].

## 2. Spotify's design system: Encore, "cohesion, not consistency"

- **Encore** (2019) replaced 22 separate design systems with a "system of systems" [6][10]:
  - Foundation: tokens for colour, type, motion, spacing and accessibility. This is the minimum
    bar for every product.
  - Web components (which include the desktop client) and Mobile components on top of it.
  - Local, product-specific systems on the outside.
- **Each platform builds its own components; no component code is shared.** Mobile fell behind,
  so in 2022 Spotify formed a team to reach "rough parity with web" [6][7].
- **Spotify's stated aim is "cohesion":** "the middle path between perfect consistency and total
  platform independence" [7]. Each component spec names what can't change and what each platform
  decides.
  - Example: buttons share their hierarchy, sizes and names across platforms. Focus states and
    adaptation to input type are each platform's call.
- **How they reach agreement:** representatives from every platform audit each component
  together, agree its glossary, anatomy, variants and accessibility, and then design every
  platform at the same time [7].
- **Measuring adoption:** daily queries across Spotify's repos report how often tokens and
  components are used and how fast teams upgrade. Semantic tokens were added after changes to raw
  tokens caused regressions [6].
- **Pixel parity only for shared assets:** Wrapped moved to "Lottie-first" in 2023 because
  "Lottie provides visual parity across all platforms" [10b].

## 3. How features ship and are checked

- Feature teams build each feature for every platform [11][12] (old, secondary sources).
- A feature's flag exists before its code. Remote Configuration declares client properties in
  YAML next to the code and publishes their defaults per client and version [9][11].
- Mobile ships weekly: first to a small percentage of users, then to everyone. Big features wait
  behind backend flags for several releases [4].
- Spotify publishes no formal definition of "parity" (unconfirmed). Its practice is matching
  features and core experience, with deliberate platform differences.
- Verification:
  - per-platform snapshot tests (about 1,600 iOS snapshot images, around 2020) [14];
  - manual regression by each team every release [4].
  - No public evidence of cross-platform screenshot diffing.

## 4. Where Spotify itself is NOT at parity (documented exceptions)

| Gap | Web player | Desktop | iPhone | Why |
| --- | --- | --- | --- | --- |
| Audio quality | AAC 128/256, fixed, no lossless | ~320 kbps plus lossless | ~320 kbps plus lossless | Browser DRM path vs native stack [12][13] |
| EQ, crossfade, Automix | Not documented | Yes | Yes | OS audio access [21][22] |
| Offline downloads | No | Yes (Premium) | Yes (Premium) | Platform capability, licensing caps [15] |
| Local files | No | Yes | Yes | File system access [16] |
| Connect as controller | Limited | Yes | Yes | Browsers can't discover devices on the local network (inference) [18] |
| Jam | No | Yes | Yes | No reason given [36] |
| Friend Activity | No | Yes | Via Messages (2026) | Product choice [29][30] |
| DJ, Prompted Playlist, Smart Shuffle | No | No | Yes | Mobile-first product choice [31][33][35] |
| Miniplayer | Yes (PiP) | Yes (Premium) | No | Monetisation [25][26] |
| Notifications, tray | No | Yes | Push | OS integration [27] (community source) |
| Fitness hub (Peloton, 2026-04-27) | Not named | Yes | Yes | No reason given [40] |
| Sign-in | OAuth | Native, browser handoff | Native | Platform [1][41] |

These are identical on web and desktop:
- layout (Library sidebar, Home, Search, the right-hand Now Playing view);
- queue, lyrics and video;
- keyboard shortcuts [20];
- playlist folders and drag-and-drop to playlists [28];
- the accessibility claims [43], which AppleVis disputes [44].

## 5. What this means for RitmoFit

- RitmoFit is a React web app plus one native SwiftUI app for iPhone and Mac. That is
  structurally Spotify's **mobile-vs-web** setup, not its **desktop-vs-web** one.
- Literal 1:1 needs a shared codebase, meaning the web app in a Mac shell. D26 chose native
  SwiftUI over that on 2026-11-07.
- The realistic Spotify-grade target for native code:
  - **Mac:** the desktop bar. The same information architecture, layout, icons, type and
    components as the web, rebuilt in SwiftUI. Only OS conventions may differ: the menu bar,
    window chrome, keyboard shortcuts and pointer hover.
  - **iPhone:** the mobile bar, "cohesion". The same features, tokens and component specs as the
    web, with iPhone grammar: a tab bar, sheets, gestures and Live in full screen.
  - **Both:** one written exception list, each entry with a platform reason. Parity is checked
    per component and per surface, not per screen alone.
- Recommended mechanisms, ranked:
  1. A Mac column in the design rules (`08-ios-web-alignment.md`).
  2. A shared component inventory: one spec per component, with web and SwiftUI implementations
     and an "allowed to differ" column.
  3. A two-way parity matrix: native features the web lacks are gaps too, as Spotify's shortcuts
     are on both.
  4. Per-surface screenshot fixtures on both sides, with a side-by-side report for human review
     (not a pixel-diff gate).
  5. One RF task per feature covering both platforms, with a server flag so the web can ship
     first without native showing broken entry points.

## Sources

1. https://engineering.atspotify.com/2021/4/building-the-future-of-our-desktop-apps (2021-04-07)
2. https://engineering.atspotify.com/2019/3/building-spotifys-new-web-player (2019-03-25)
3. https://engineering.atspotify.com/2020/05/spotify-modernizes-client-side-architecture-to-accelerate-service-on-all-devices
4. https://engineering.atspotify.com/2025/4/how-we-release-the-spotify-app-part-1 (2025-04-17)
5. https://jobs.lever.co/spotify/813b4b62-429c-42e9-a8f7-59e9412fb287 (undated)
6. https://www.shaunbent.co.uk/blog/encore-design-system-three-years-on/ (repost of the spotify.design article, Dec 2022)
7. https://www.figma.com/blog/creating-coherence-how-spotifys-design-system-goes-beyond-platforms/ (2023-08-31)
8. https://newsroom.spotify.com/2023-06-20/spotify-desktop-experience-redesign-your-library-now-playing-views-customize/
9. https://engineering.atspotify.com/2020/10/spotifys-new-experimentation-platform-part-1/
10. https://spotify.design/article/reimagining-design-systems-at-spotify (redirects; read through secondary quotes)
10b. https://engineering.atspotify.com/2024/1/exploring-the-animation-landscape-of-2023-wrapped
11. https://api.sambuz.com/doc/mobile-at-scale-ppt-presentation-977420 (GOTO 2015 slides, secondary)
12. https://support.spotify.com/us/article/audio-quality/
13. https://support.spotify.com/us/article/lossless-audio-quality/
14. https://github.com/MobileNativeFoundation/discussions/discussions/6
15. https://support.spotify.com/us/article/listen-offline/
16. https://support.spotify.com/us/article/local-files/
18. https://support.spotify.com/us/article/spotify-connect/
20. https://support.spotify.com/us/article/keyboard-shortcuts/
21. https://support.spotify.com/us/article/equalizer/
22. https://support.spotify.com/us/article/tracks-transitions/
25. https://developer.chrome.com/blog/spotify-picture-in-picture
26. https://mobilesyrup.com/2024/04/02/spotify-new-desktop-miniplayer-makes-changing-music-while-working-easier/
27. https://community.spotify.com/t5/Desktop-Linux/Close-button-should-minimize-the-Spotify-window-Spotify-won-t/m-p/5225078 (community)
28. https://support.spotify.com/us/article/playlist-folders/
29. https://community.spotify.com/t5/Live-Ideas/Web-Player-Friend-Activity-on-web-player/idi-p/4941324/page/2 (community)
30. https://www.macrumors.com/2026/01/07/spotify-listening-activity-friends-feature-ios/
31. https://support.spotify.com/us/article/dj/
33. https://support.spotify.com/us/article/prompted-playlists/
35. https://support.spotify.com/us/article/smart-shuffle/
36. https://9to5mac.com/2024/03/14/spotify-jam-feature-desktop/
40. https://newsroom.spotify.com/2026-04-27/spotify-fitness-workouts-peloton/
41. https://community.spotify.com/t5/Desktop-Windows/Spotify-Windows-Desktop-Forces-Login-Through-Browser/td-p/5576699/page/3 (community)
43. https://support.spotify.com/us/article/accessibility/
44. https://applevis.com/blog/announcing-our-new-campaign-month-spotify
