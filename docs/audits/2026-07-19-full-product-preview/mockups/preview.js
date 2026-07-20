/*
  Prototype component checkpoint
  Intent: an instructor is sourcing, shaping, rehearsing, or running a class; each view leads with that verb.
  Palette: espresso floor + bone notes + copper hardware + cyan console LEDs + amber rehearsal tape.
  Depth: surface shifts and quiet boundaries; lifted treatment is reserved for dialogs and sticky trays.
  Surfaces: floor → sunken → workbench → contained → raised.
  Typography: Bricolage display, Sora workhorse, Azeret time/data.
  Spacing: 4px base with 8/12/16/24/32/48 steps.
*/

const tracks = [
  ['Baianá', 'Bakermat', '3:00', '128', 1],
  ['Instinct', 'Lane 8', '4:00', '122', 2],
  ['Titanium', 'David Guetta', '4:05', '126', 2],
  ['Levels', 'Avicii', '3:23', '128', 3],
  ['Wake Me Up', 'Avicii', '4:07', '124', 2],
  ['Clarity', 'Zedd', '4:31', '128', 3],
  [
    'La Última Vuelta — Extended Rooftop Rehearsal Mix with Percussion Break',
    'Marisol Vega & The Very Long Collective Name',
    '5:18',
    '132',
    4,
  ],
  ['Midnight Resistance', 'Taller del Pulso', '4:42', '136', 4],
  ['Noches de Cobre', 'Círculo Norte', '4:08', '130', 3],
  ['Release / Breathe', 'Studio Sur', '3:36', '116', 1],
];

const views = [
  v(
    'PUB-01',
    'Public',
    'Public entry',
    'Recognize the creator promise and enter the private beta without a marketing detour.',
    'PUB-01-entry-desktop.png',
    'public',
    ['P1-06'],
    'Keep the existing public front door, but make the product loop concrete through a real Class Pulse instrument rather than a video-like miniature.',
    ['PUB-01', 'PUB-02', 'PUB-03', 'PUB-04', 'PUB-05', 'PUB-06'],
  ),
  v(
    'PUB-02',
    'Public',
    'Sign in / sign up',
    'Choose sign-in or invited-account creation with explicit beta trust language.',
    'PUB-02-sign-in-desktop.png',
    'auth',
    ['P1-06', 'P1-04'],
    'A two-part auth surface preserves trust and ties entry copy to the instructor’s actual creative job.',
    ['PUB-01', 'PUB-02', 'PUB-03'],
  ),
  v(
    'PUB-03',
    'Public',
    'Password recovery request',
    'Request a reset without losing product context or private-beta expectations.',
    'PUB-03-recovery-request-desktop.png',
    'recovery',
    ['P1-06', 'P0-08'],
    'Recovery is a calm product state, not an orphan utility form.',
    ['PUB-02', 'PUB-03', 'PUB-05'],
  ),
  v(
    'PUB-04',
    'Public',
    'Privacy and data',
    'Understand what Ritmo stores, what providers own, and how to control an account.',
    'PUB-04-privacy-desktop.png',
    'privacy',
    ['P1-06', 'P1-04'],
    'Use readable policy hierarchy and plain provider boundaries; avoid legal-wall styling.',
    ['PUB-01', 'PUB-04'],
  ),
  v(
    'PUB-05',
    'Public',
    'Set a new password',
    'Complete the emailed recovery link with an explicit safe-return path.',
    'PUB-05-reset-password-desktop.png',
    'reset',
    ['P0-08', 'P1-06'],
    'Make success, expired-link, and retry outcomes visually complete.',
    ['PUB-03', 'PUB-05'],
  ),
  v(
    'PUB-06',
    'Public',
    'Not found',
    'Recover to the product without guessing where the active experience lives.',
    'PUB-06-not-found-desktop.png',
    'notfound',
    ['P0-08', 'P1-04'],
    'A useful dead end points to the current product map and never advertises dormant surfaces.',
    ['PUB-01', 'PUB-06'],
  ),
  v(
    'PUB-07',
    'Public',
    'Invitation required',
    'Recover from a rejected private-beta signup without losing the entered intent or trust context.',
    'PUB-02-sign-up-desktop.png',
    'authRejected',
    ['P0-08', 'P1-06'],
    'Use the exact invitation boundary, preserve the entered email, and offer one safe correction plus sign-in.',
    ['PUB-02', 'PUB-07'],
  ),
  v(
    'SYS-01',
    'System',
    'App loading',
    'Know the authenticated workspace is loading rather than frozen.',
    'CLS-01-empty-library-desktop.png',
    'loading',
    ['P0-08'],
    'Preserve layout and name the work being restored instead of displaying a lone “Loading…” string.',
    ['SYS-01', 'SYS-02', 'SYS-03'],
  ),
  v(
    'SYS-02',
    'System',
    'Update available',
    'Reload into a fresh deploy without losing confidence or work context.',
    'PUB-01-entry-desktop.png',
    'update',
    ['P0-08'],
    'Use a compact, explicit recovery tray with Later and Reload; never hide the stale-client escape hatch.',
    ['SYS-01', 'SYS-02', 'SYS-03'],
  ),
  v(
    'SYS-03',
    'System',
    'Unexpected error recovery',
    'Recover from a stale chunk or render failure with a safe primary action.',
    'PUB-06-not-found-desktop.png',
    'error',
    ['P0-08'],
    'Explain what is safe, what will reload, and where the instructor returns.',
    ['SYS-01', 'SYS-02', 'SYS-03'],
  ),

  v(
    'CLS-00',
    'Classes',
    'First-run tutorial',
    'Learn the four-step loop, then get out of the way and start a real class.',
    'CLS-00-onboarding-desktop.png',
    'onboarding',
    ['P1-01', 'P1-06'],
    'Compress the tutorial into an inspectable count-in sequence with a permanent Skip.',
    ['CLS-00', 'CLS-01', 'CLS-03', 'CLS-04'],
  ),
  v(
    'CLS-01',
    'Classes',
    'Class library',
    'Scan recency, shape, readiness, and jump back into the next creative task.',
    'BLD-01-builder-populated-desktop.png',
    'classes',
    ['P1-01', 'P0-02'],
    'The library becomes a run-of-show shelf: class shape and next action matter more than card chrome.',
    ['CLS-01', 'CLS-03', 'CLS-04'],
  ),
  v(
    'CLS-02',
    'Classes',
    'Fresh signed-in account',
    'Orient a new instructor before any class or provider history exists.',
    'CLS-02-fresh-account-desktop.png',
    'fresh',
    ['P1-01', 'P1-06'],
    'A fresh account names the creative loop and offers equal starting points without inventing activity.',
    ['CLS-00', 'CLS-01', 'CLS-02', 'CLS-03'],
  ),
  v(
    'CLS-03',
    'Classes',
    'Empty class',
    'Choose the next legitimate starting point without being forced into one funnel.',
    'CLS-03-empty-class-desktop.png',
    'emptyclass',
    ['P0-04', 'P1-01'],
    'Offer music, playlist, manual, and movement-led starts as equal on-ramps.',
    ['CLS-01', 'CLS-03'],
  ),
  v(
    'CLS-04',
    'Classes',
    'Class summary',
    'Review the complete run-of-show without entering edit mode.',
    'CLS-04-class-summary-dialog-desktop.png',
    'summary',
    ['P1-05', 'P0-02'],
    'The summary leads with Class Pulse and rehearsal readiness, then the track run-of-show.',
    ['CLS-01', 'CLS-04'],
  ),
  v(
    'CLS-05',
    'Classes',
    'Class library unavailable',
    'Recover when the initial class list cannot load without mistaking failure for an empty account.',
    'CLS-01-empty-library-desktop.png',
    'classesError',
    ['P0-08', 'P1-04'],
    'Name the unavailable library, preserve creation as a separate safe action, and make retry explicit.',
    ['CLS-01', 'CLS-02', 'CLS-05'],
  ),

  v(
    'MUS-01',
    'Music',
    'Music home — disconnected',
    'Understand provider capability and reconnect before browsing.',
    'MUS-01-home-disconnected-desktop.png',
    'musicDisconnected',
    ['P0-06', 'P1-02'],
    'Separate catalog, library, and playback truth; disconnected cards remain useful and actionable.',
    ['MUS-01', 'MUS-02', 'MUS-03', 'MUS-05', 'MUS-06'],
  ),
  v(
    'MUS-02',
    'Music',
    'Music home — connected',
    'Resume from liked tracks or playlists and turn curiosity into a class.',
    'MUS-02-home-connected-desktop.png',
    'musicConnected',
    ['P1-02', 'P0-04'],
    'Provider shelves read like sourcing crates, with one clear route from browsing to building.',
    ['MUS-01', 'MUS-02', 'MUS-03', 'MUS-05'],
  ),
  v(
    'MUS-03',
    'Music',
    'Liked tracks selection',
    'Audition, select, and start a class while preserving source context.',
    'MUS-03-liked-tracks-dialog-desktop.png',
    'likes',
    ['P0-04', 'P1-02'],
    'A low-noise list and sticky selection tray replace the current all-or-nothing import dialog.',
    ['MUS-02', 'MUS-03', 'MUS-05', 'MUS-06'],
  ),
  v(
    'MUS-04',
    'Music',
    'Class created from source',
    'Confirm what was created and make the next creative action obvious.',
    'MUS-04-create-from-likes-confirmation-desktop.png',
    'created',
    ['P0-04', 'P1-04'],
    'Confirmation preserves provider provenance and routes directly into shaping the new class.',
    ['MUS-03', 'MUS-04', 'BLD-01'],
  ),
  v(
    'MUS-05',
    'Music',
    'Playlist detail',
    'Browse a saved playlist before choosing tracks or starting a class.',
    'BLD-09-saved-playlists-empty-desktop.png',
    'playlist',
    ['P0-04', 'P1-02'],
    'Playlist detail is a real browsable source surface, not an immediate import action.',
    ['MUS-02', 'MUS-03', 'MUS-05', 'MUS-06'],
  ),
  v(
    'MUS-06',
    'Music',
    'Catalog search and selection',
    'Search, preview, select, and route tracks into a new or open class.',
    'BLD-07-search-results-desktop.png',
    'musicSearch',
    ['P0-04', 'P1-02'],
    'Keep familiar music rows and persist selected context at the bottom.',
    ['MUS-03', 'MUS-05', 'MUS-06'],
  ),
  v(
    'MUS-07',
    'Music',
    'Connection status unavailable',
    'Keep last-known music sources legible when the capability check fails.',
    'MUS-02-home-connected-desktop.png',
    'musicError',
    ['P0-06', 'P0-08'],
    'Do not convert a failed status request into a false disconnect; retain last-known sources and offer retry.',
    ['MUS-01', 'MUS-02', 'MUS-07', 'CONN-02'],
  ),
  v(
    'CONN-01',
    'Music',
    'Connections — disconnected',
    'Connect the right capability without interpreting a vague provider wall.',
    'CONN-01-connections-disconnected-desktop.png',
    'connectionsOff',
    ['P0-06'],
    'Each provider names catalog, library, and playback capabilities independently.',
    ['CONN-01', 'CONN-02'],
  ),
  v(
    'CONN-02',
    'Music',
    'Connections — mixed/recovery',
    'See connected, reconnecting, permission, and retry states without color dependence.',
    'CONN-02-connections-partial-desktop.png',
    'connectionsMixed',
    ['P0-06', 'P0-08'],
    'Connection state uses icon + label + consequence + recovery, including Apple authorization in progress.',
    ['CONN-01', 'CONN-02'],
  ),

  v(
    'BLD-01',
    'Builder',
    'Builder — populated',
    'See class shape, readiness, and the editable track stack in one workbench.',
    'BLD-01-builder-populated-desktop.png',
    'builder',
    ['P0-01', 'P0-02', 'P1-03'],
    'Reorder the current reading stack into a sticky Class Pulse, compact readiness jumps, and a calm track workbench.',
    ['BLD-01', 'BLD-02', 'BLD-04', 'BLD-05', 'BLD-07', 'BLD-08', 'BLD-10', 'BLD-11', 'BLD-13'],
  ),
  v(
    'BLD-02',
    'Builder',
    'Track inspector — essentials',
    'Score intensity, BPM, cue, clip, and creator note without form fatigue.',
    'BLD-02-track-inspector-desktop.png',
    'inspector',
    ['P0-03', 'P1-03'],
    'Essentials become an intentional scoring strip; mobile opens this as a full-width task sheet.',
    ['BLD-01', 'BLD-02', 'BLD-05'],
  ),
  v(
    'BLD-03',
    'Builder',
    'Track inspector — advanced',
    'Reach timing and placement details without burdening every track edit.',
    'BLD-03-inspector-advanced-desktop.png',
    'inspectorAdvanced',
    ['P0-03', 'P1-03'],
    'Advanced fields stay one deliberate disclosure away and preserve the selected track context.',
    ['BLD-02', 'BLD-03'],
  ),
  v(
    'BLD-04',
    'Builder',
    'Free-placement timeline',
    'Place tracks, cues, and moves precisely while keeping the class arc readable.',
    'BLD-04-free-placement-desktop.png',
    'timeline',
    ['P0-01', 'P0-02'],
    'A dedicated timeline focus state spends width on placement precision without turning into a DAW.',
    ['BLD-01', 'BLD-04'],
  ),
  v(
    'BLD-05',
    'Builder',
    'Track preview — ready',
    'Audition the authored clip window without losing the selected track or class position.',
    'BLD-05-track-preview-ready-desktop.png',
    'previewReady',
    ['P0-03', 'P0-04', 'P0-08'],
    'Ready is visibly idle: the clip, provider, and deliberate start action are known before any audio begins.',
    ['BLD-05', 'BLD-06', 'BLD-14', 'BLD-15', 'BLD-16'],
  ),
  v(
    'BLD-06',
    'Builder',
    'Track preview — playing',
    'Confirm audible state, provider ownership, clip position, and a safe stop.',
    'BLD-06-track-preview-playing-desktop.png',
    'previewPlaying',
    ['P0-03', 'P0-04', 'P0-07'],
    'Playing is explicit in text and transport, not motion alone, and keeps the provider boundary visible.',
    ['BLD-05', 'BLD-06', 'BLD-14', 'BLD-15', 'BLD-16'],
  ),
  v(
    'BLD-07',
    'Builder',
    'Add music — search',
    'Search within the open class and add tracks without scrolling away from the workbench.',
    'BLD-07-search-results-desktop.png',
    'builderSearch',
    ['P0-01', 'P0-04'],
    'Discovery opens as a task drawer with selection continuity, not a section buried below the track stack.',
    ['BLD-07', 'BLD-08', 'BLD-10'],
  ),
  v(
    'BLD-08',
    'Builder',
    'Add music — likes',
    'Browse connected likes and add selected tracks to the open class.',
    'BLD-08-liked-tracks-desktop.png',
    'builderLikes',
    ['P0-04'],
    'The same source-list language works in Music and Builder, with a class-specific action tray.',
    ['BLD-07', 'BLD-08', 'BLD-10'],
  ),
  v(
    'BLD-09',
    'Builder',
    'Saved playlists — empty',
    'Recover when a connected provider has no saved playlists to browse.',
    'BLD-09-saved-playlists-empty-desktop.png',
    'playlistEmpty',
    ['P0-04', 'P0-06'],
    'Empty provider content explains the capability and keeps search, likes, and URL import available.',
    ['BLD-07', 'BLD-08', 'BLD-09', 'BLD-10'],
  ),
  v(
    'BLD-10',
    'Builder',
    'Import playlist URL',
    'Paste a supported playlist link with provider and outcome clarity.',
    'BLD-10-import-playlist-url-desktop.png',
    'importUrl',
    ['P0-06', 'P1-04'],
    'Name provider support, validation, and where tracks will land before import.',
    ['BLD-07', 'BLD-08', 'BLD-10'],
  ),
  v(
    'BLD-11',
    'Builder',
    'Custom moves library',
    'Manage reusable movement language without leaving the selected track.',
    'BLD-11-manage-moves-dialog-desktop.png',
    'moves',
    ['P0-03', 'P1-04'],
    'The move library uses modality-neutral vocabulary and an explicit empty/start state.',
    ['BLD-11', 'BLD-13'],
  ),
  v(
    'BLD-12',
    'Builder',
    'Songs by move — empty',
    'Understand why no prior song pairing exists and keep creating.',
    'BLD-12-songs-by-move-empty-desktop.png',
    'songsByMoveEmpty',
    ['P0-04', 'P1-04'],
    'The empty state teaches how pairings accumulate without blocking a movement-led start.',
    ['BLD-11', 'BLD-12', 'BLD-13'],
  ),
  v(
    'BLD-13',
    'Builder',
    'Songs by move',
    'Start from a movement idea and recover prior song pairings.',
    'BLD-13-songs-by-move-results-desktop.png',
    'songsByMove',
    ['P0-04', 'P1-04'],
    'Movement-led creation is treated as a first-class on-ramp rather than an obscure modal utility.',
    ['BLD-11', 'BLD-13'],
  ),
  v(
    'BLD-14',
    'Builder',
    'Track preview — paused',
    'Hold the clip position while keeping resume and stop unmistakable.',
    'BLD-06-track-preview-playing-desktop.png',
    'previewPaused',
    ['P0-03', 'P0-07', 'P0-08'],
    'Paused keeps the exact clip position and provider truth without suggesting audio is still moving.',
    ['BLD-05', 'BLD-06', 'BLD-14', 'BLD-15', 'BLD-16'],
  ),
  v(
    'BLD-15',
    'Builder',
    'Track preview — resume failed',
    'Recover from a provider resume that remains paused without losing class or track context.',
    'BLD-06-track-preview-playing-desktop.png',
    'previewFailed',
    ['P0-06', 'P0-08'],
    'Observed SoundCloud behavior becomes a bounded recovery state: start the clip again, stop, or inspect the provider—never spin silently.',
    ['BLD-05', 'BLD-06', 'BLD-14', 'BLD-15', 'BLD-16'],
  ),
  v(
    'BLD-16',
    'Builder',
    'Track preview — complete',
    'Recognize clip completion and replay deliberately from the authored start.',
    'BLD-06-track-preview-playing-desktop.png',
    'previewComplete',
    ['P0-03', 'P0-08'],
    'Clip completion is a stable stopped state with one replay action, not an ambiguous disappeared player.',
    ['BLD-05', 'BLD-06', 'BLD-14', 'BLD-15', 'BLD-16'],
  ),

  v(
    'LIVE-01',
    'Live',
    'Live queue',
    'Choose a runnable class and understand warnings before entering preflight.',
    'LIVE-01-queue-desktop.png',
    'liveQueue',
    ['P0-05', 'P1-05'],
    'The queue leads with readiness and last-rehearsed context, not duplicate cards and checklists.',
    ['LIVE-01', 'LIVE-02', 'LIVE-03', 'LIVE-04', 'LIVE-06', 'LIVE-09'],
  ),
  v(
    'LIVE-02',
    'Live',
    'Preflight — blocked playback',
    'Resolve playback gaps or deliberately choose prompter-only mode.',
    'LIVE-02-preflight-blocked-desktop.png',
    'preflight',
    ['P0-05', 'P0-06'],
    'Group pass/fix results and keep the prompter-only capability confident, never apologetic.',
    ['LIVE-01', 'LIVE-02', 'LIVE-03'],
  ),
  v(
    'LIVE-03',
    'Live',
    'Run — ready',
    'Enter the room with class shape, first action, and next cue already legible.',
    'LIVE-03-run-ready-desktop.png',
    'liveReady',
    ['P0-05', 'P0-02'],
    'Ready state is affirmative and useful before playback; no absence message gets the hero position.',
    ['LIVE-02', 'LIVE-03', 'LIVE-04', 'LIVE-06', 'LIVE-09'],
  ),
  v(
    'LIVE-04',
    'Live',
    'Run — active',
    'Read current cue, next cue, BPM, effort, and time while moving.',
    'LIVE-04-run-active-desktop.png',
    'liveActive',
    ['P0-05', 'P0-07'],
    'A single pressure hierarchy holds: cue, count, next, transport. Reduced motion adds a static Now playing label.',
    ['LIVE-03', 'LIVE-04', 'LIVE-06', 'LIVE-09'],
  ),
  v(
    'LIVE-05',
    'Live',
    'Run — paused',
    'Hold the room without losing the active cue, next action, or safe resume path.',
    'LIVE-05-run-paused-desktop.png',
    'livePaused',
    ['P0-05', 'P0-07'],
    'Paused is a first-class pressure state with a stable cue clock and an unmistakable resume action.',
    ['LIVE-04', 'LIVE-05', 'LIVE-06', 'LIVE-09'],
  ),
  v(
    'LIVE-06',
    'Live',
    'Run — full list',
    'Scan or jump the remaining run-of-show without losing transport control.',
    'LIVE-06-full-list-desktop.png',
    'liveList',
    ['P0-05', 'P1-05'],
    'The full list becomes a compact score with current position and rehearsal marks.',
    ['LIVE-03', 'LIVE-04', 'LIVE-06'],
  ),
  v(
    'LIVE-09',
    'Live',
    'Runtime playback recovery',
    'Retry, reconnect, hand off, or continue without music during a failure.',
    'LIVE-02-preflight-blocked-desktop.png',
    'liveError',
    ['P0-05', 'P0-06', 'P0-08'],
    'A danger alert never takes away the cue clock or the continue-without-music path.',
    ['LIVE-03', 'LIVE-04', 'LIVE-09'],
  ),

  v(
    'ACC-01',
    'Account',
    'Account workspace',
    'Confirm identity, defaults, provider summary, security, and privacy in one quiet surface.',
    'ACC-01-account-workspace-desktop.png',
    'account',
    ['P1-07', 'P1-03'],
    'Account is quieter than creation surfaces and uses one compact status ledger.',
    ['ACC-01', 'ACC-02'],
  ),
  v(
    'ACC-02',
    'Account',
    'Account connections',
    'Manage provider accounts with the same capability truth used in Music and Live.',
    'ACC-02-connections-dialog-desktop.png',
    'connectionsMixed',
    ['P0-06', 'P1-07'],
    'Connection language is shared rather than reinterpreted per workspace.',
    ['ACC-01', 'ACC-02'],
  ),
  v(
    'ACC-03',
    'Account',
    'Account status unavailable',
    'Recover when profile and connection status cannot load without implying account loss.',
    'ACC-01-account-workspace-desktop.png',
    'accountError',
    ['P0-08', 'P1-07'],
    'Keep the account shell and identity context, state that no settings changed, and offer retry.',
    ['ACC-01', 'ACC-02', 'ACC-03'],
  ),
];

function v(id, category, title, purpose, current, kind, backlog, decision, related) {
  return { id, category, title, purpose, current, kind, backlog, decision, related };
}

const h = String.raw;

function header(active = 'Classes') {
  const items = ['Classes', 'Music', 'Live', 'Account'];
  const targets = { Classes: 'CLS-01', Music: 'MUS-02', Live: 'LIVE-01', Account: 'ACC-01' };
  return h`<header class="rs-header">
    <div class="rs-brand"><span class="rs-mark">R</span><span>Ritmo Studio</span></div>
    <nav class="rs-nav" aria-label="Product">
      ${items.map((item) => `<button data-go="${targets[item]}" ${item === active ? 'aria-current="page"' : ''}>${item}</button>`).join('')}
    </nav>
    <span class="rs-user">Marisol Vega</span>
  </header>`;
}

function classRail(selected = 'Saturday Heat — 45') {
  const classes = [
    ['Saturday Heat — 45', 'Cycle · 10 tracks · 40:50', '66%'],
    ['Sunrise Source — Likes', 'Cycle · 2 tracks · 7:00', '24%'],
    ['Pilates Pulse · Core & Control', 'Pilates · draft', '42%'],
    ['HIIT Drop Set — 30', 'HIIT · empty', '8%'],
  ];
  return h`<aside class="rs-rail">
    <div class="rs-inline" style="justify-content:space-between"><p class="rs-eyebrow">Your classes</p><span class="rs-data rs-muted">4</span></div>
    <button class="rs-primary" style="width:100%;margin-bottom:12px" data-go="CLS-03">＋ New class</button>
    <label class="rs-field"><span class="rs-only">Search classes</span><input aria-label="Search classes" placeholder="Search classes" /></label>
    <div class="rs-stack" style="margin-top:14px">
      ${classes
        .map(
          ([
            name,
            meta,
            pos,
          ]) => `<button class="rs-card" data-go="${name.startsWith('Saturday') ? 'BLD-01' : 'CLS-03'}" style="text-align:left;cursor:pointer;${name === selected ? 'border-color:var(--cyan-control)' : ''}">
        <strong style="display:block;color:var(--bone-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</strong>
        <span class="rs-muted" style="display:block;margin:5px 0 10px;font-size:11px">${meta}</span>
        <span style="display:block;height:3px;background:var(--line-soft)"><span style="display:block;width:${pos};height:100%;background:var(--copper-action)"></span></span>
      </button>`,
        )
        .join('')}
    </div>
  </aside>`;
}

function pulse(playhead = '66%', compact = false) {
  return h`<div class="class-pulse" style="--playhead:${playhead};${compact ? 'min-height:74px' : ''}" role="img" aria-label="Class Pulse: warm, build, push, peak, cool">
    <div class="pulse-line"></div>
    <div class="pulse-labels"><span>Warm</span><span>Build</span><span>Push</span><span>Peak</span><span>Cool</span></div>
    <span class="pulse-badge">◇ derived · confirm</span>
  </div>`;
}

function readiness(compact = false) {
  return h`<section class="rs-panel" aria-label="Readiness">
    <div class="rs-inline" style="justify-content:space-between"><div><p class="rs-eyebrow">Readiness</p><h3 class="rs-heading">Runnable · 2 refinements</h3></div><button class="rs-quiet">Jump to ▾</button></div>
    <div class="rs-state"><span class="rs-state-icon">✓</span><div><strong>Durations set</strong>${compact ? '' : '<p>40:50 total is safe to run.</p>'}</div></div>
    <div class="rs-state is-warning"><span class="rs-state-icon">!</span><div><strong>Tempo needs confirmation</strong><p>9 carried manual tempos need confirmation before the pulse can keep time.</p></div><button class="rs-secondary" data-go="BLD-02">Fix</button></div>
    <div class="rs-state"><span class="rs-state-icon">✓</span><div><strong>Cues & moves set</strong>${compact ? '' : '<p>Rehearsal marks are present.</p>'}</div></div>
    <div class="rs-state is-warning"><span class="rs-state-icon">!</span><div><strong>4 tracks are prompter-only</strong><p>Link music or choose prompter-only at preflight.</p></div><button class="rs-secondary" data-go="CONN-02">Review</button></div>
  </section>`;
}

function trackList(count = 10, active = 7) {
  return h`<div class="rs-card" style="padding:0 14px">
    ${tracks
      .slice(0, count)
      .map(
        (
          t,
          index,
        ) => `<button class="track-row ${index + 1 === active ? 'is-active' : ''}" data-go="BLD-02" style="width:100%;border-left:0;border-right:0;border-bottom:0;background-color:transparent;text-align:left;cursor:pointer">
      <span class="rs-data rs-muted">${index + 1}</span><span class="track-art">${String(index + 1).padStart(2, '0')}</span>
      <span class="track-copy"><strong>${t[0]}</strong><span>${t[1]}</span></span>
      <span class="rs-data">${t[2]}</span><span class="rs-data">${t[3]} BPM</span><span class="zone" style="--zone:${t[4]}">Z${t[4]}</span>
    </button>`,
      )
      .join('')}
  </div>`;
}

function builderBody(mode = 'default') {
  const isPreview = mode.startsWith('preview');
  const main = h`<div class="rs-stack">
    <section>
      <div class="rs-inline" style="justify-content:space-between;align-items:end"><div><p class="rs-eyebrow">Cycle · editing</p><h2 class="rs-title">Saturday Heat — 45</h2><p class="rs-meta"><span class="rs-data">10</span> tracks · <span class="rs-data">40:50</span> · avg <span class="rs-data">127 BPM</span></p></div><button class="rs-primary" data-go="LIVE-02">Run live</button></div>
    </section>
    ${pulse(isPreview ? '24%' : '66%')}
    ${mode === 'timeline' ? timelinePanel() : readiness(true)}
    <section><div class="rs-inline" style="justify-content:space-between"><div><p class="rs-eyebrow">Run of show</p><h3 class="rs-heading">Track stack</h3></div><div class="rs-inline"><button class="rs-secondary" data-go="BLD-07">＋ Add music</button><button class="rs-quiet" data-go="BLD-04">Timeline</button></div></div>${trackList(mode === 'timeline' ? 6 : 10, isPreview ? 1 : 7)}</section>
  </div>`;
  if (mode === 'inspector')
    return h`<div class="rs-grid-2" style="grid-template-columns:minmax(0,1fr) 340px">${main}${inspectorPanel()}</div>`;
  if (isPreview) return `${main}${previewRail(mode.replace('preview', '').toLowerCase())}`;
  return main;
}

function timelinePanel() {
  return h`<section class="rs-panel"><div class="rs-inline" style="justify-content:space-between"><div><p class="rs-eyebrow">Placement focus</p><h3 class="rs-heading">Free placement · gaps allowed</h3></div><button class="rs-secondary">Back-to-back</button></div>
    <div class="rs-inset" style="margin-top:14px;overflow:auto"><div style="min-width:720px">
      <div class="rs-data rs-muted" style="display:grid;grid-template-columns:repeat(9,1fr);font-size:10px"><span>0:00</span><span>5:00</span><span>10:00</span><span>15:00</span><span>20:00</span><span>25:00</span><span>30:00</span><span>35:00</span><span>40:00</span></div>
      <div style="height:84px;position:relative;margin-top:10px;border-top:1px solid var(--line-soft);border-bottom:1px solid var(--line-soft)">
        ${tracks
          .slice(0, 8)
          .map(
            (t, i) =>
              `<button aria-label="Track ${i + 1} starts at ${i * 5}:00" style="position:absolute;left:${i * 11.6}%;top:${8 + (i % 2) * 30}px;width:11%;height:26px;border:1px solid var(--line-standard);border-radius:7px;background:var(--stage-raised);color:var(--bone-primary)">${i + 1}</button>`,
          )
          .join('')}
      </div>
      <div class="rs-inline" style="margin-top:12px"><span class="rs-chip">▲ Cue · 37:29</span><span class="rs-chip">◆ Recovery · 37:46</span><span class="rs-chip is-selected">Snap to beat ✓</span></div>
    </div></div>
  </section>`;
}

function inspectorPanel() {
  return h`<aside class="rs-panel"><p class="rs-eyebrow">Track 7 · scoring</p><h3 class="rs-heading" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">La Última Vuelta — Extended Rooftop Rehearsal Mix</h3>
    <div class="rs-stack" style="margin-top:16px"><div><span class="rs-data-label">Effort</span><div class="rs-inline">${['Z1 Build', 'Z2 Push', 'Z3 Attack', 'Z4 All Out'].map((x, i) => `<button class="rs-chip" aria-pressed="${i === 3}">${x}</button>`).join('')}</div></div>
    <div class="rs-grid-2"><label class="rs-field">BPM<input value="132" /></label><label class="rs-field">Clip window<input value="0:32–5:04" /></label></div>
    <label class="rs-field">One-tap cue<input value="Hands light. Let the hips lead." /></label>
    <div class="rs-card"><p class="rs-eyebrow">Rehearsal marks</p><div class="rs-state"><span class="rs-state-icon">▲</span><div><strong>Beat drop</strong><p><span class="rs-data">2:14</span> · copper tag</p></div></div><div class="rs-state"><span class="rs-state-icon">◆</span><div><strong>Standing climb</strong><p><span class="rs-data">3:08</span> · Z4</p></div></div></div>
    <button class="rs-secondary">Advanced fields ▾</button><button class="rs-primary">Save track</button></div></aside>`;
}

/*
  Playback-state component checkpoint
  Intent: an instructor auditioning one authored clip must know whether audio is idle, moving,
  held, failed, or complete—and recover without losing the selected track.
  Palette: cyan playback LED for confirmed transport, amber rehearsal tape for recoverable
  interruption, copper hardware for the deliberate primary action, bone for stable context.
  Depth: one raised sticky rail because transport must remain above the scrolling workbench.
  Surfaces: workbench beneath; contained rail; inset progress track; no new overlay.
  Typography: Sora actions/copy, Azeret time/provider telemetry, Bricolage stays with class titles.
  Spacing: 4px base; 8/12/16 rhythm inside the rail.

  Domain: audition, provider transport, clip window, cue timing, rehearsal, class pulse.
  Signature: preview position remains tied to the selected track and Class Pulse playhead.
  Rejecting: generic media bar → class-aware preview rail; transient toast → persistent recovery;
  indefinite spinner → bounded restart/stop/provider actions.
*/
function previewRail(state = 'ready') {
  const copy = {
    ready: {
      label: 'Preview ready',
      detail: 'SoundCloud connected · clip begins at 0:00',
      time: '0:00 / 3:00',
      icon: '▶',
      action: 'Play preview',
      go: 'BLD-06',
      provider: '✓ SoundCloud · ready',
    },
    playing: {
      label: 'Playing preview',
      detail: 'SoundCloud · class clip 0:00–3:00',
      time: '0:38 / 3:00',
      icon: 'Ⅱ',
      action: 'Pause preview',
      go: 'BLD-14',
      provider: '♪ SoundCloud · playing',
    },
    paused: {
      label: 'Preview paused',
      detail: 'Clip position held at 0:38',
      time: '0:38 / 3:00',
      icon: '▶',
      action: 'Resume preview',
      go: 'BLD-15',
      provider: 'Ⅱ SoundCloud · paused',
    },
    complete: {
      label: 'Preview complete',
      detail: 'The authored clip ended normally',
      time: '3:00 / 3:00',
      icon: '↺',
      action: 'Replay clip',
      go: 'BLD-06',
      provider: '✓ SoundCloud · clip complete',
    },
  }[state];

  if (state === 'failed') {
    return h`<div class="player-rail is-recovery" role="alert" aria-label="Track preview could not resume">
      <div class="preview-identity"><span class="track-art">01</span><div class="track-copy"><strong>Baianá</strong><span>SoundCloud · <span class="rs-data">0:38</span></span></div></div>
      <div class="preview-message"><span class="provider-state is-warning">! Playback still paused</span><strong>Couldn’t resume this preview.</strong><span>Your class edit is safe. Restart the clip or stop auditioning.</span></div>
      <div class="rs-actions"><button class="rs-primary" data-go="BLD-06">Start clip again</button><button class="rs-secondary" data-go="BLD-05">Stop</button><button class="rs-quiet" data-go="CONN-02">Provider status</button></div>
    </div>`;
  }

  const percent = state === 'ready' ? 0 : state === 'complete' ? 100 : 21;
  return h`<div class="player-rail" role="region" aria-label="Track preview: ${copy.label}">
    <div class="preview-identity"><span class="track-art">01</span><div class="track-copy"><strong>Baianá</strong><span>${copy.detail}</span></div></div>
    <div class="preview-transport"><button class="live-play" data-go="${copy.go}" aria-label="${copy.action}">${copy.icon}</button><div><strong>${copy.label}</strong><span class="rs-data">${copy.time}</span><span class="preview-progress" aria-hidden="true"><span style="width:${percent}%"></span></span></div></div>
    <div class="preview-provider"><span class="provider-state">${copy.provider}</span>${state === 'ready' ? '' : '<button class="rs-secondary" data-go="BLD-05">Stop</button>'}</div>
  </div>`;
}

function builderDrawer(kind) {
  const title =
    kind === 'likes'
      ? 'Spotify likes'
      : kind === 'url'
        ? 'Import playlist URL'
        : kind === 'empty'
          ? 'Saved playlists'
          : 'Search music';
  const rows = kind === 'url' || kind === 'empty' ? '' : trackList(kind === 'likes' ? 2 : 4, 0);
  return h`<div class="rs-app">${header('Classes')}<div class="rs-shell">${classRail('Sunrise Source — Likes')}<main class="rs-workspace"><div class="rs-inline" style="justify-content:space-between"><div><p class="rs-eyebrow">Add to Sunrise Source — Likes</p><h2 class="rs-title">${title}</h2></div><button class="rs-icon-button" data-go="BLD-01" aria-label="Close add music">×</button></div>
    <div class="rs-inline" style="margin:16px 0"><button class="rs-chip" aria-pressed="${kind === 'search'}">Search</button><button class="rs-chip" aria-pressed="${kind === 'likes'}">My likes</button><button class="rs-chip">Playlists</button><button class="rs-chip" aria-pressed="${kind === 'url'}">Playlist URL</button></div>
    ${kind === 'url' ? `<section class="rs-panel"><label class="rs-field">Public playlist URL<input placeholder="https://open.spotify.com/playlist/…" /></label><p class="rs-muted">Public Spotify, Apple Music, and SoundCloud playlist links are supported. Tracks land in the open class in source order.</p><div class="rs-actions"><button class="rs-primary">Import into Sunrise Source</button></div></section>` : kind === 'empty' ? `<section class="rs-panel"><div class="state-banner"><span>◇</span><div><strong>No saved playlists from this provider</strong><p class="rs-muted">The connection is working. Save a playlist in Spotify, or keep sourcing another way.</p></div></div><div class="rs-actions"><button class="rs-primary" data-go="BLD-07">Search music</button><button class="rs-secondary" data-go="BLD-08">Browse likes</button><button class="rs-secondary" data-go="BLD-10">Paste playlist URL</button></div></section>` : `<label class="rs-field"><span>${kind === 'likes' ? 'Filter likes' : 'Search Spotify'}</span><input class="rs-search" value="${kind === 'likes' ? '' : 'warm-up 126 bpm'}" placeholder="Title or artist" /></label><div style="margin-top:14px">${rows}</div><div class="selection-tray" role="status"><div><strong>2 selected</strong><span class="rs-muted"> · <span class="rs-data">7:28</span></span></div><div class="rs-inline"><button class="rs-secondary">Preview</button><button class="rs-primary">Add selected</button></div></div>`}
  </main></div></div>`;
}

function musicHome(connected) {
  const providers = [
    [
      'SoundCloud',
      'SC',
      connected ? 'Connected' : 'Not connected',
      connected ? '2 likes · 0 playlists' : 'Catalog available',
    ],
    [
      'Spotify',
      'SP',
      connected ? 'Connected' : 'Not connected',
      connected ? '2 likes · 3 playlists' : 'Catalog available',
    ],
    [
      'Apple Music',
      'AM',
      connected ? 'Authorization needed' : 'Not connected',
      connected ? 'Catalog only until authorized' : 'Catalog available',
    ],
  ];
  return h`<div class="rs-app">${header('Music')}<div class="rs-shell"><aside class="rs-rail"><p class="rs-eyebrow">Sources</p><button class="rs-card" style="width:100%;text-align:left" data-go="MUS-02">All music</button><button class="rs-card" style="width:100%;text-align:left;margin-top:8px" data-go="MUS-06">Search catalog</button><button class="rs-secondary" style="width:100%;margin-top:16px" data-go="CONN-02">Manage connections</button></aside><main class="rs-workspace"><p class="rs-eyebrow">Music sourcing</p><h2 class="rs-title">Browse music. Shape the room.</h2><p class="rs-subtitle">Provider libraries are raw material. Listen first, then carry the right tracks into a class.</p>
    <div class="rs-grid-3" style="margin-top:22px">${providers.map(([name, mark, state, detail]) => `<article class="rs-card connection-card"><div><span class="provider-mark">${mark}</span><h3 class="rs-heading" style="margin-top:12px">${name}</h3><span class="provider-state ${state.includes('Not') || state.includes('needed') ? 'is-warning' : ''}">${state.includes('Connected') ? '✓' : '!'} ${state}</span><p class="rs-muted">${detail}</p></div><button class="${connected && name !== 'Apple Music' ? 'rs-primary' : 'rs-secondary'}" data-go="${connected ? (name === 'Spotify' ? 'MUS-05' : 'MUS-03') : 'CONN-01'}">${connected && name !== 'Apple Music' ? 'Browse source' : 'Review access'}</button></article>`).join('')}</div>
    <section style="margin-top:26px"><p class="rs-eyebrow">Recent source material</p><div class="rs-grid-3"><article class="rs-card source-card"><div><strong>Saturday Heat source crate</strong><p class="rs-muted">10 tracks · mixed providers</p></div><button class="rs-secondary" data-go="BLD-01">Resume shaping</button></article><article class="rs-card source-card"><div><strong>After-hours climbs</strong><p class="rs-muted">Spotify playlist · 18 tracks</p></div><button class="rs-secondary" data-go="MUS-05">Open playlist</button></article><article class="rs-card source-card"><div><strong>Saved this week</strong><p class="rs-muted">4 new tracks</p></div><button class="rs-secondary" data-go="MUS-03">Browse likes</button></article></div></section>
  </main></div></div>`;
}

function musicList(kind) {
  const title =
    kind === 'playlist'
      ? 'After-hours climbs'
      : kind === 'likes'
        ? 'SoundCloud likes'
        : 'Search music';
  const subtitle =
    kind === 'playlist'
      ? 'Spotify · 18 tracks · saved 2 days ago'
      : kind === 'likes'
        ? 'SoundCloud · newest first'
        : 'Spotify + SoundCloud + Apple Music catalog';
  return h`<div class="rs-app">${header('Music')}<main class="rs-workspace"><div class="rs-inline" style="justify-content:space-between"><div><p class="rs-eyebrow">${kind === 'playlist' ? 'Saved playlist' : 'Source list'}</p><h2 class="rs-title">${title}</h2><p class="rs-muted">${subtitle}</p></div><button class="rs-secondary" data-go="MUS-02">Back to sources</button></div>
    <div class="rs-inline" style="margin:18px 0"><label class="rs-field" style="flex:1"><span class="rs-only">Filter tracks</span><input aria-label="Filter tracks" placeholder="Filter title or artist" /></label><button class="rs-chip" aria-pressed="true">All</button><button class="rs-chip">120–129 BPM</button><button class="rs-chip">Previewable</button></div>
    ${trackList(kind === 'likes' ? 6 : 10, 0)}<div class="selection-tray" role="status"><div><strong>3 selected</strong><span class="rs-muted"> · <span class="rs-data">12:12</span> · source order kept</span></div><div class="rs-inline"><button class="rs-secondary">Add to Saturday Heat</button><button class="rs-primary">Start a class</button></div></div>
  </main></div>`;
}

function connectionDialog(mixed) {
  const rows = mixed
    ? [
        ['SoundCloud', '✓', 'Connected', 'Library + playback ready', 'Disconnect', ''],
        ['Spotify', '✓', 'Connected', 'Premium playback ready', 'Disconnect', ''],
        [
          'Apple Music',
          '↻',
          'Waiting for authorization',
          'Finish in the Apple consent sheet',
          'Cancel',
          'is-warning',
        ],
      ]
    : [
        [
          'SoundCloud',
          '!',
          'Not connected',
          'Catalog works; likes and playback need access',
          'Connect',
          'is-warning',
        ],
        [
          'Spotify',
          '!',
          'Not connected',
          'Catalog works; likes and playback need access',
          'Connect',
          'is-warning',
        ],
        [
          'Apple Music',
          '!',
          'Not connected',
          'Catalog works; library and playback need access',
          'Connect',
          'is-warning',
        ],
      ];
  return h`<div class="rs-app">${header('Music')}<div class="dialog-backdrop"><section class="rs-dialog" role="dialog" aria-modal="true" aria-label="Music connections"><header class="rs-dialog-header"><div><p class="rs-eyebrow">Provider capability</p><h2 class="rs-title">Music connections</h2><p class="rs-muted">Catalog, library access, and playback are separate truths.</p></div><button class="rs-icon-button" data-go="MUS-02" aria-label="Close connections">×</button></header>
    ${rows.map(([name, icon, state, detail, action, cls]) => `<div class="rs-state ${cls}"><span class="rs-state-icon">${icon}</span><div><strong>${name} · ${state}</strong><p>${detail}</p></div><button class="rs-secondary">${action}</button></div>`).join('')}
    <div class="state-banner" style="margin-top:16px"><span>i</span><div><strong>Disconnect is recoverable for 7 days</strong><p class="rs-muted">Tokens are forgotten immediately. Imported provider references are scheduled for removal.</p></div></div>
  </section></div></div>`;
}

function liveQueue() {
  return h`<div class="rs-app">${header('Live')}<main class="rs-workspace"><p class="rs-eyebrow">Live queue</p><h2 class="rs-title">What are you teaching next?</h2><p class="rs-subtitle">Choose a class, scan its pressure risks, then enter preflight.</p>
    <div class="rs-grid-2" style="margin-top:22px"><article class="rs-panel"><div class="rs-inline" style="justify-content:space-between"><div><h3 class="rs-heading">Saturday Heat — 45</h3><p class="rs-muted">Cycle · last rehearsed today</p></div><button class="rs-primary" data-go="LIVE-02">Preflight</button></div>${pulse('0%', true)}<div class="rs-inline" style="margin-top:12px"><span class="provider-state">✓ Runnable</span><span class="provider-state is-warning">! 4 prompter-only</span><span class="rs-data">40:50</span></div></article><article class="rs-panel"><div class="rs-inline" style="justify-content:space-between"><div><h3 class="rs-heading">Sunrise Source — Likes</h3><p class="rs-muted">Cycle · not rehearsed</p></div><button class="rs-secondary" data-go="LIVE-02">Preflight</button></div>${pulse('0%', true)}<div class="rs-inline" style="margin-top:12px"><span class="provider-state">✓ Runnable</span><span class="provider-state is-warning">! BPM missing</span><span class="rs-data">7:00</span></div></article></div>
  </main></div>`;
}

function preflight() {
  return h`<div class="live-app"><header class="live-head"><div><p class="rs-eyebrow">Saturday Heat — 45</p><h1 class="rs-heading">Playback preflight</h1></div><button class="rs-quiet" data-go="LIVE-01">Exit</button></header><main class="rs-workspace"><div class="rs-inline" style="justify-content:space-between;align-items:end"><div><p class="rs-eyebrow">Runnable with warnings</p><h2 class="rs-title">4 tracks ready · 6 need a decision</h2><p class="rs-muted">Prompter-only remains a first-class run mode.</p></div><div class="rs-actions"><button class="rs-secondary" data-go="CONN-02">Manage connections</button><button class="rs-primary" data-go="LIVE-03">Run without music</button></div></div>
    <section class="rs-grid-2" style="margin-top:20px"><div class="rs-panel"><p class="rs-eyebrow">Playback ready</p>${tracks
      .slice(0, 4)
      .map(
        (t, i) =>
          `<div class="rs-state"><span class="rs-state-icon">✓</span><div><strong>#${i + 1} ${t[0]}</strong><p>Plays on ${i < 2 ? 'SoundCloud' : 'Spotify'}</p></div></div>`,
      )
      .join(
        '',
      )}</div><div class="rs-panel"><p class="rs-eyebrow">Fix or choose prompter-only</p>${tracks
      .slice(4, 8)
      .map(
        (t, i) =>
          `<div class="rs-state is-warning"><span class="rs-state-icon">!</span><div><strong>#${i + 5} ${t[0]}</strong><p>${i < 2 ? 'Apple Music authorization needed' : 'No provider link'}</p></div><button class="rs-secondary">Fix</button></div>`,
      )
      .join('')}</div></section>
  </main></div>`;
}

function liveRun(kind) {
  if (kind === 'list') return liveList();
  const ready = kind === 'ready';
  const error = kind === 'error';
  const paused = kind === 'paused';
  return h`<div class="live-app"><header class="live-head"><div><p class="rs-eyebrow">${ready ? 'Ready' : 'Now teaching'} · Saturday Heat — 45</p><h1 class="rs-heading">${ready ? 'Room set' : 'Track 7 of 10'}</h1></div><div class="rs-inline"><button class="rs-chip" data-go="LIVE-04" aria-pressed="true">Cue-by-cue</button><button class="rs-chip" data-go="LIVE-06">Full list</button><button class="rs-quiet" data-go="LIVE-01">Exit</button></div></header>
    <main class="live-grid"><section class="live-cue ${ready ? '' : 'live-pulse'}"><div><p class="rs-eyebrow">${ready ? 'First action' : 'Current cue'}</p><p class="rs-data-hero">${ready ? '4' : '8'}</p><h2 class="rs-display">${ready ? 'Count in. Own the first beat.' : 'Hands light. Hips lead.'}</h2><p class="rs-subtitle">${ready ? 'Baianá · Build · 128 BPM' : 'La Última Vuelta · All Out · 132 BPM'}</p></div><div class="live-next"><p class="rs-eyebrow">Next · <span class="rs-data">0:16</span></p><h3 class="rs-heading">Stand. Add resistance.</h3></div></section><aside class="rs-stack"><section class="rs-panel"><p class="rs-eyebrow">Class Pulse</p>${pulse(ready ? '0%' : '66%', true)}<div class="rs-stat-line" style="justify-content:space-between;margin-top:14px"><span>Track left</span><strong class="rs-data-lg">${ready ? '3:00' : '2:46'}</strong></div><div class="rs-stat-line" style="justify-content:space-between"><span>Class left</span><strong class="rs-data-lg">${ready ? '40:50' : '17:44'}</strong></div></section><section class="rs-panel"><p class="rs-eyebrow">Effort</p><p class="rs-data-lg">${ready ? 'Z1 · Build' : 'Z4 · All Out'}</p><p class="rs-muted">${ready ? 'Derived start · confirm after rehearsal' : '4 bars · peak'}</p></section>${error ? `<section class="state-banner is-error" role="alert"><span>!</span><div><strong>SoundCloud playback stopped</strong><p class="rs-muted">Your cues and clock are still running.</p><div class="rs-actions"><button class="rs-secondary">Retry</button><button class="rs-secondary" data-go="CONN-02">Reconnect</button><button class="rs-primary">Continue without music</button></div></div></section>` : ''}</aside></main>
    <footer class="live-transport"><button class="live-play" aria-label="${ready || paused ? 'Play' : 'Pause'}">${ready || paused ? '▶' : 'Ⅱ'}</button><div><span class="provider-state">${ready ? '♪ Music off · deliberate' : paused ? 'Ⅱ Paused · cue clock held' : '✓ SoundCloud · playing'}</span><div style="height:4px;background:var(--line-standard);margin-top:8px"><span style="display:block;width:${ready ? '0' : '66%'};height:100%;background:var(--cyan-control)"></span></div></div><div class="rs-data">${ready ? '0:00 / 40:50' : '23:06 / 40:50'}</div></footer></div>`;
}

function liveList() {
  return h`<div class="live-app"><header class="live-head"><div><p class="rs-eyebrow">Paused · Saturday Heat — 45</p><h1 class="rs-heading">Run of show</h1></div><div class="rs-inline"><button class="rs-chip" data-go="LIVE-04">Cue-by-cue</button><button class="rs-chip" aria-pressed="true">Full list</button><button class="rs-quiet" data-go="LIVE-01">Exit</button></div></header><main class="rs-workspace"><div class="rs-card" style="padding:0 14px">${tracks.map((t, i) => `<button class="track-row ${i === 6 ? 'is-active' : ''}" style="width:100%;border-left:0;border-right:0;border-bottom:0;background:transparent;color:inherit;text-align:left"><span class="rs-data">${i * 4}:0${i % 10}</span><span class="track-art">${i + 1}</span><span class="track-copy"><strong>${t[0]}</strong><span>${t[1]}${i === 9 ? ' · cue + move' : ''}</span></span><span class="rs-data">${t[2]}</span><span class="rs-data">${t[3]} BPM</span><span class="zone" style="--zone:${t[4]}">Z${t[4]}</span></button>`).join('')}</div></main><footer class="live-transport"><button class="live-play">▶</button><div><span class="provider-state">♪ Music off</span><div style="height:4px;background:var(--line-standard);margin-top:8px"><span style="display:block;width:66%;height:100%;background:var(--cyan-control)"></span></div></div><span class="rs-data">23:06 / 40:50</span></footer></div>`;
}

function account(error = false) {
  return h`<div class="rs-app">${header('Account')}<div class="rs-shell"><aside class="rs-rail"><p class="rs-eyebrow">Account</p>${['Profile', 'Preferences', 'Music connections', 'Security'].map((x, i) => `<button class="rs-quiet" style="width:100%;text-align:left;${i === 0 ? 'color:var(--bone-primary);background:rgba(251,247,240,.06)' : ''}">${x}</button>`).join('')}</aside><main class="rs-workspace"><p class="rs-eyebrow">Personal workspace</p><h2 class="rs-title">Marisol Vega</h2><p class="rs-muted">marisol.audit.20260719@example.com</p>${error ? '<div class="state-banner is-error" role="alert" style="margin-top:18px"><span>!</span><div><strong>Account status is unavailable</strong><p class="rs-muted">No profile or connection setting changed. Check the status again when the connection returns.</p><div class="rs-actions"><button class="rs-primary">Try again</button><button class="rs-secondary" data-go="CLS-01">Return to Classes</button></div></div></div>' : ''}<div class="rs-grid-2" style="margin-top:22px"><section class="rs-panel"><h3 class="rs-heading">Profile</h3><div class="rs-stack" style="margin-top:14px"><label class="rs-field">Display name<input value="Marisol Vega" ${error ? 'disabled' : ''} /></label><label class="rs-field">Profile image URL<input placeholder="https://…" ${error ? 'disabled' : ''} /></label><button class="rs-primary" ${error ? 'disabled' : ''}>Save profile</button></div></section><section class="rs-panel"><h3 class="rs-heading">Workspace defaults</h3><div class="rs-state"><span class="rs-state-icon">◈</span><div><strong>Templates</strong><p>Cycle · Pilates · HIIT</p></div></div><div class="rs-state"><span class="rs-state-icon">Ⅱ</span><div><strong>Preview</strong><p>Manual start · no auto-advance</p></div></div><div class="rs-state"><span class="rs-state-icon">1</span><div><strong>Workspace</strong><p>Solo-first</p></div></div></section><section class="rs-panel"><div class="rs-inline" style="justify-content:space-between"><h3 class="rs-heading">Music connections</h3><button class="rs-secondary" data-go="ACC-02">Manage</button></div><div class="rs-state"><span class="rs-state-icon">✓</span><div><strong>SoundCloud</strong><p>Library + playback</p></div></div><div class="rs-state"><span class="rs-state-icon">✓</span><div><strong>Spotify</strong><p>Library + Premium playback</p></div></div><div class="rs-state is-warning"><span class="rs-state-icon">!</span><div><strong>Apple Music</strong><p>Authorization needed</p></div></div></section><section class="rs-panel"><h3 class="rs-heading">Security and data</h3><p class="rs-muted">Email, password, and social sign-in remain with the active sign-in provider—not the music connection.</p><div class="rs-actions"><button class="rs-secondary" data-go="PUB-04">Privacy notice</button><button class="rs-danger">Sign out</button></div></section></div></main></div></div>`;
}

function publicEntry() {
  return h`<div class="rs-app public-layout">${header('')}<main class="public-hero"><section><p class="rs-eyebrow">Built for instructors who create</p><h2 class="rs-display">Find the class inside the music.</h2><p class="rs-subtitle">Source the right tracks. Shape the energy. Score the movement. Walk into Live knowing what comes next.</p><div class="rs-actions"><button class="rs-primary" data-go="PUB-02">Start building</button><button class="rs-secondary" data-go="MUS-02">See the workflow</button></div><p class="rs-muted" style="margin-top:18px">Private beta · provider-authorized playback only</p></section><section class="hero-instrument"><div class="rs-inline" style="justify-content:space-between"><div><p class="rs-eyebrow">Saturday Heat — 45</p><h3 class="rs-heading">The class has a shape.</h3></div><span class="rs-data-lg">40:50</span></div>${pulse('66%')}<div class="count-strip" aria-label="Eight count"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><div class="rs-grid-3"><div><p class="rs-data-label">Find</p><strong>Music</strong></div><div><p class="rs-data-label">Shape</p><strong>Movement</strong></div><div><p class="rs-data-label">Lead</p><strong>Live</strong></div></div></section></main></div>`;
}

function auth(kind) {
  const isRecovery = kind === 'recovery';
  const isReset = kind === 'reset';
  const isRejected = kind === 'rejected';
  const title = isRecovery
    ? 'Reset your password'
    : isReset
      ? 'Choose a new password'
      : isRejected
        ? 'Use your invited email'
        : 'Welcome back, instructor.';
  return h`<div class="rs-app auth-layout"><section class="auth-story"><div class="rs-brand"><span class="rs-mark">R</span><span>Ritmo Studio</span></div><div><p class="rs-eyebrow">Your creative loop is waiting</p><h2 class="rs-display">The room starts here.</h2><p class="rs-subtitle">Music, class shape, rehearsal, and Live—one personal workspace.</p>${pulse('34%', true)}</div><p class="rs-muted">Private beta · invited instructors only</p></section><main class="auth-form"><div><p class="rs-eyebrow">${isRecovery || isReset ? 'Account recovery' : isRejected ? 'Invitation required' : 'Sign in'}</p><h1 class="rs-title">${title}</h1><p class="rs-muted">${isRecovery ? 'We’ll send one secure reset link.' : isReset ? 'Use at least 12 characters.' : isRejected ? 'Your name and email stay in the form while you correct the invitation.' : 'Continue to your personal class workspace.'}</p></div><div class="rs-stack">${isRejected ? '<div class="state-banner is-error" role="alert"><span>!</span><div><strong>Ritmo Studio is currently available by invitation only.</strong><p class="rs-muted">Use the email that received your invitation, or sign in to an existing account.</p></div></div><label class="rs-field">Name<input value="New Instructor" /></label>' : ''}${isReset ? '' : `<label class="rs-field">Email<input type="email" value="${isRejected ? 'instructor@example.com' : 'marisol.audit.20260719@example.com'}" /></label>`}${isRecovery ? '' : '<label class="rs-field">Password<input type="password" value="not-a-real-password" /></label>'}${isReset ? '<label class="rs-field">Confirm password<input type="password" value="not-a-real-password" /></label>' : ''}<button class="rs-primary">${isRecovery ? 'Send reset link' : isReset ? 'Set password' : isRejected ? 'Create invited account' : 'Sign in'}</button>${isRejected ? '<button class="rs-quiet" data-go="PUB-02">Back to sign in</button>' : !isRecovery && !isReset ? '<button class="rs-quiet" data-go="PUB-07">Need an invited account? Sign up</button><button class="rs-quiet" data-go="PUB-03">Forgot password?</button>' : '<button class="rs-quiet" data-go="PUB-02">Back to sign in</button>'}</div></main></div>`;
}

function classesError() {
  return h`<div class="rs-app">${header('Classes')}<div class="rs-shell">${classRail()}<main class="rs-workspace"><p class="rs-eyebrow">Classes</p><h2 class="rs-title">Your library is temporarily unavailable.</h2><p class="rs-subtitle">Ritmo could not read the class list. This is not an empty account, and no class was removed.</p><section class="rs-panel" role="alert" style="max-width:720px;margin-top:24px"><div class="state-banner is-error"><span>!</span><div><strong>Couldn’t load your classes</strong><p class="rs-muted">Try the library again. You can also start a new draft without treating this error as an empty state.</p></div></div><div class="rs-actions"><button class="rs-primary">Try again</button><button class="rs-secondary" data-go="CLS-03">Start a new draft</button></div></section></main></div></div>`;
}

function musicError() {
  return h`<div class="rs-app">${header('Music')}<div class="rs-shell"><aside class="rs-rail"><p class="rs-eyebrow">Sources</p><button class="rs-card" style="width:100%;text-align:left">All music</button><button class="rs-card" style="width:100%;text-align:left;margin-top:8px" data-go="MUS-06">Search catalog</button><button class="rs-secondary" style="width:100%;margin-top:16px" data-go="CONN-02">Manage connections</button></aside><main class="rs-workspace"><p class="rs-eyebrow">Music sourcing</p><h2 class="rs-title">Browse music. Shape the room.</h2><div class="state-banner is-error" role="alert" style="margin-top:18px"><span>!</span><div><strong>Couldn’t check music connections</strong><p class="rs-muted">Showing your last-known sources. Their current playback status is not confirmed.</p><div class="rs-actions"><button class="rs-primary">Try again</button><button class="rs-secondary" data-go="CONN-02">Review connections</button></div></div></div><div class="rs-grid-3" style="margin-top:22px"><article class="rs-card"><span class="provider-mark">SC</span><h3 class="rs-heading">SoundCloud</h3><p class="provider-state is-warning">? Last known connected</p><p class="rs-muted">Library and playback need a fresh check.</p></article><article class="rs-card"><span class="provider-mark">SP</span><h3 class="rs-heading">Spotify</h3><p class="provider-state is-warning">? Last known connected</p><p class="rs-muted">Saved playlists remain visible but unverified.</p></article><article class="rs-card"><span class="provider-mark">AM</span><h3 class="rs-heading">Apple Music</h3><p class="provider-state is-warning">? Status unavailable</p><p class="rs-muted">Authorization state is not known.</p></article></div></main></div></div>`;
}

function utility(kind) {
  const copy = {
    privacy: [
      'Privacy without mystery.',
      'Ritmo stores your classes, choreography, and provider references. Your music provider owns the audio stream and authorization.',
      'Review provider data boundaries',
    ],
    notfound: [
      'This beat is off the map.',
      'The page does not exist. Your classes and connected music are still safe.',
      'Back to Ritmo Studio',
    ],
    loading: [
      'Restoring your workspace…',
      'Classes, provider truth, and the last open workbench are loading.',
      'Loading',
    ],
    update: [
      'A fresh build is ready.',
      'Reload to update Ritmo Studio. Your saved class work remains on the server.',
      'Reload now',
    ],
    error: [
      'The workspace lost the beat.',
      'Reload the current build. If a class was open, Ritmo will return to the library safely.',
      'Reload safely',
    ],
  }[kind];
  return h`<div class="rs-app">${header('')}<main class="utility-page"><p class="rs-eyebrow">${kind === 'privacy' ? 'Privacy & data' : kind === 'notfound' ? '404' : 'Recovery'}</p><h2 class="rs-display">${copy[0]}</h2><p class="rs-subtitle">${copy[1]}</p><div class="rs-panel" style="max-width:720px;margin-top:28px">${kind === 'privacy' ? '<div class="rs-state"><span class="rs-state-icon">1</span><div><strong>Ritmo owns your score</strong><p>Class structure, cues, moves, timing, and manual BPM.</p></div></div><div class="rs-state"><span class="rs-state-icon">2</span><div><strong>Providers own audio</strong><p>No audio is cached, proxied, decoded, or remixed.</p></div></div><div class="rs-state"><span class="rs-state-icon">3</span><div><strong>You control connections</strong><p>Disconnect from Account or Music at any time.</p></div></div>' : kind === 'loading' ? '<div class="spinner" aria-label="Loading"></div><div class="skeleton" style="margin-top:18px;width:72%"></div><div class="skeleton" style="width:54%"></div>' : `<div class="state-banner ${kind === 'error' ? 'is-error' : ''}"><span>${kind === 'update' ? '↻' : '!'}</span><div><strong>${copy[2]}</strong><p class="rs-muted">This action does not delete classes or provider connections.</p></div></div>`}<div class="rs-actions"><button class="rs-primary" data-go="${kind === 'privacy' ? 'PUB-01' : 'CLS-01'}">${copy[2]}</button>${kind === 'update' ? '<button class="rs-quiet">Later</button>' : ''}</div></div></main></div>`;
}

function onboarding() {
  return h`<div class="rs-app">${header('Classes')}<div class="dialog-backdrop"><section class="rs-dialog" role="dialog" aria-modal="true" aria-label="First class walkthrough"><header class="rs-dialog-header"><div><p class="rs-eyebrow">Start here · 60 seconds</p><h2 class="rs-title">Build one class in four counts.</h2><p class="rs-muted">Captioned, keyboard-operable, and always skippable.</p></div><button class="rs-icon-button" data-go="CLS-01" aria-label="Close tutorial">×</button></header><div class="count-strip" aria-label="Four-step tutorial"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><div class="rs-grid-4"><div class="rs-card"><span class="rs-data-lg">1</span><h3 class="rs-heading">Find</h3><p class="rs-muted">Start with a class, track, playlist, or move.</p></div><div class="rs-card"><span class="rs-data-lg">2</span><h3 class="rs-heading">Shape</h3><p class="rs-muted">Order tracks and claim the energy arc.</p></div><div class="rs-card"><span class="rs-data-lg">3</span><h3 class="rs-heading">Score</h3><p class="rs-muted">Add cues, moves, and clip windows.</p></div><div class="rs-card"><span class="rs-data-lg">4</span><h3 class="rs-heading">Lead</h3><p class="rs-muted">Preflight, press play, recover safely.</p></div></div><div class="rs-actions"><button class="rs-primary" data-go="CLS-03">Start a class</button><button class="rs-quiet" data-go="CLS-01">Skip tutorial</button></div></section></div></div>`;
}

function classes() {
  return h`<div class="rs-app">${header('Classes')}<div class="rs-shell">${classRail()}<main class="rs-workspace"><div class="rs-inline" style="justify-content:space-between;align-items:end"><div><p class="rs-eyebrow">Classes</p><h2 class="rs-title">Pick up where the energy left off.</h2><p class="rs-subtitle">Recent classes are ordered by creative next step, not just date.</p></div><button class="rs-primary" data-go="CLS-03">New class</button></div><div class="rs-grid-2" style="margin-top:22px"><article class="rs-panel"><div class="rs-inline" style="justify-content:space-between"><div><p class="rs-eyebrow">Continue shaping</p><h3 class="rs-heading">Saturday Heat — 45</h3></div><span class="rs-data-lg">40:50</span></div>${pulse('66%', true)}<div class="rs-inline" style="margin-top:12px"><span class="provider-state">✓ Runnable</span><span class="provider-state is-warning">! 2 refinements</span></div><div class="rs-actions"><button class="rs-primary" data-go="BLD-01">Resume Builder</button><button class="rs-secondary" data-go="CLS-04">Preview</button></div></article><article class="rs-panel"><p class="rs-eyebrow">Source ready</p><h3 class="rs-heading">Sunrise Source — Likes</h3>${pulse('18%', true)}<p class="rs-muted">2 tracks · needs BPM and first cue</p><div class="rs-actions"><button class="rs-primary" data-go="BLD-01">Shape this class</button></div></article></div><section style="margin-top:26px"><p class="rs-eyebrow">Templates</p><div class="rs-grid-3"><button class="rs-card" data-go="CLS-03"><strong>Cycle</strong><p class="rs-muted">45-minute energy arc</p></button><button class="rs-card" data-go="CLS-03"><strong>Pilates</strong><p class="rs-muted">30-minute control flow</p></button><button class="rs-card" data-go="CLS-03"><strong>HIIT</strong><p class="rs-muted">30-minute interval set</p></button></div></section></main></div></div>`;
}

function freshAccount() {
  return h`<div class="rs-app">${header('Classes')}<main class="utility-page"><p class="rs-eyebrow">First workspace</p><h2 class="rs-display">Your first class can start anywhere.</h2><p class="rs-subtitle">Bring a track, a playlist, a movement idea, or a blank template. Ritmo will help shape the run of show.</p><div class="rs-grid-3" style="margin-top:24px"><button class="rs-panel" data-go="MUS-06" style="text-align:left;color:inherit"><p class="rs-eyebrow">Music first</p><h3 class="rs-heading">Find a track</h3><p class="rs-muted">Search provider catalogs before connecting.</p></button><button class="rs-panel" data-go="CLS-03" style="text-align:left;color:inherit"><p class="rs-eyebrow">Template first</p><h3 class="rs-heading">Start Cycle, Pilates, or HIIT</h3><p class="rs-muted">Name the class and fill it in later.</p></button><button class="rs-panel" data-go="BLD-13" style="text-align:left;color:inherit"><p class="rs-eyebrow">Movement first</p><h3 class="rs-heading">Start with the move</h3><p class="rs-muted">Create a pairing the library can remember.</p></button></div><div class="rs-actions"><button class="rs-primary" data-go="CLS-03">Create first class</button><button class="rs-secondary" data-go="CONN-01">Connect music</button></div></main></div>`;
}

function createdConfirmation() {
  return h`<div class="rs-app">${header('Music')}<main class="utility-page"><p class="rs-eyebrow">Class created</p><h2 class="rs-display">Sunrise Source — Likes is ready to shape.</h2><p class="rs-subtitle">2 SoundCloud likes · 7:00 · source order preserved. Provider audio remains with SoundCloud.</p><section class="rs-panel" style="max-width:760px;margin-top:24px">${pulse('18%', true)}<div class="rs-state"><span class="rs-state-icon">✓</span><div><strong>Tracks carried into the class</strong><p>Titles, artists, duration, artwork reference, and provider links.</p></div></div><div class="rs-state is-warning"><span class="rs-state-icon">!</span><div><strong>Creative scoring still belongs to you</strong><p>Add BPM, effort, cues, and movement in Builder.</p></div></div><div class="rs-actions"><button class="rs-primary" data-go="BLD-01">Shape this class</button><button class="rs-secondary" data-go="MUS-02">Keep browsing</button></div></section></main></div>`;
}

function emptyClass() {
  return h`<div class="rs-app">${header('Classes')}<div class="rs-shell">${classRail('HIIT Drop Set — 30')}<main class="rs-workspace"><p class="rs-eyebrow">HIIT · new draft</p><h2 class="rs-title">HIIT Drop Set — 30</h2><p class="rs-subtitle">Start with what you already know. There is no required first move.</p><div class="rs-grid-2" style="margin-top:22px"><button class="rs-panel" data-go="MUS-06" style="text-align:left;color:inherit"><p class="rs-eyebrow">Start with music</p><h3 class="rs-heading">Search a specific track</h3><p class="rs-muted">Carry selected music into this class.</p></button><button class="rs-panel" data-go="MUS-05" style="text-align:left;color:inherit"><p class="rs-eyebrow">Start with a source</p><h3 class="rs-heading">Open a playlist or likes</h3><p class="rs-muted">Browse first; add only what belongs.</p></button><button class="rs-panel" data-go="BLD-13" style="text-align:left;color:inherit"><p class="rs-eyebrow">Start with movement</p><h3 class="rs-heading">Find songs by move</h3><p class="rs-muted">Reuse a proven song–movement pairing.</p></button><button class="rs-panel" data-go="BLD-07" style="text-align:left;color:inherit"><p class="rs-eyebrow">Start from memory</p><h3 class="rs-heading">Add a track manually</h3><p class="rs-muted">Title, artist, and duration are enough.</p></button></div><div class="state-banner" style="margin-top:20px"><span>◇</span><div><strong>Class Pulse will derive after two tracks</strong><p class="rs-muted">Ritmo uses order, duration, and effort you already enter—never provider audio analysis.</p></div></div></main></div></div>`;
}

function summaryDialog() {
  return h`<div class="rs-app">${header('Classes')}<div class="dialog-backdrop"><section class="rs-dialog" role="dialog" aria-modal="true" aria-label="Class summary"><header class="rs-dialog-header"><div><p class="rs-eyebrow">Read-only rehearsal view</p><h2 class="rs-title">Saturday Heat — 45</h2><p class="rs-muted">Cycle · <span class="rs-data">40:50</span> · <span class="rs-data">127 BPM</span> average</p></div><button class="rs-icon-button" data-go="CLS-01" aria-label="Close summary">×</button></header>${pulse('0%')}<div class="rs-inline" style="margin:14px 0"><span class="provider-state">✓ Runnable</span><span class="provider-state is-warning">! 4 prompter-only</span><button class="rs-primary" data-go="BLD-01">Open in Builder</button></div>${trackList(6, 0)}</section></div></div>`;
}

function movesDialog(kind) {
  const songs = kind === 'songs';
  const songsEmpty = kind === 'songsEmpty';
  return h`<div class="rs-app">${header('Classes')}<div class="dialog-backdrop"><section class="rs-dialog" role="dialog" aria-modal="true" aria-label="${songs || songsEmpty ? 'Songs by move' : 'Custom moves'}"><header class="rs-dialog-header"><div><p class="rs-eyebrow">Movement language</p><h2 class="rs-title">${songs || songsEmpty ? 'Songs by move' : 'Custom moves'}</h2><p class="rs-muted">${songs || songsEmpty ? 'Recover song pairings you have already taught.' : 'Reusable, modality-neutral movement names.'}</p></div><button class="rs-icon-button" data-go="BLD-02" aria-label="Close dialog">×</button></header>${songs ? `<label class="rs-field">Move<select><option>Recovery</option><option>Climb</option><option>Tap Back</option></select></label><article class="rs-card" style="margin-top:14px"><div class="rs-inline" style="justify-content:space-between"><div><strong>Release / Breathe</strong><p class="rs-muted">Studio Sur · used in Saturday Heat — 45</p></div><span class="rs-data">0:32 · Z1</span></div><div class="rs-actions"><button class="rs-primary">Start class with this track</button><button class="rs-secondary" data-go="BLD-01">Open source class</button></div></article>` : songsEmpty ? `<label class="rs-field">Move<select><option>Tap Back</option><option>Climb</option><option>Recovery</option></select></label><div class="state-banner" style="margin-top:14px"><span>◇</span><div><strong>No taught pairing for Tap Back yet</strong><p class="rs-muted">Add Tap Back while scoring any track and it will appear here next time.</p></div></div><div class="rs-actions"><button class="rs-primary" data-go="MUS-06">Find a track</button><button class="rs-secondary" data-go="BLD-02">Score the selected track</button></div>` : `<div class="state-banner"><span>＋</span><div><strong>No custom moves yet</strong><p class="rs-muted">Create one while scoring a track; it will stay available across Cycle, Pilates, and HIIT.</p></div></div><div class="rs-actions"><button class="rs-primary">Create custom move</button><button class="rs-secondary">Browse standard moves</button></div>`}</section></div></div>`;
}

function render(view) {
  switch (view.kind) {
    case 'public':
      return publicEntry();
    case 'auth':
      return auth('auth');
    case 'authRejected':
      return auth('rejected');
    case 'recovery':
      return auth('recovery');
    case 'reset':
      return auth('reset');
    case 'privacy':
      return utility('privacy');
    case 'notfound':
      return utility('notfound');
    case 'loading':
      return utility('loading');
    case 'update':
      return utility('update');
    case 'error':
      return utility('error');
    case 'onboarding':
      return onboarding();
    case 'classes':
      return classes();
    case 'classesError':
      return classesError();
    case 'fresh':
      return freshAccount();
    case 'emptyclass':
      return emptyClass();
    case 'summary':
      return summaryDialog();
    case 'musicDisconnected':
      return musicHome(false);
    case 'musicConnected':
      return musicHome(true);
    case 'musicError':
      return musicError();
    case 'likes':
      return musicList('likes');
    case 'created':
      return createdConfirmation();
    case 'playlist':
      return musicList('playlist');
    case 'musicSearch':
      return musicList('search');
    case 'connectionsOff':
      return connectionDialog(false);
    case 'connectionsMixed':
      return connectionDialog(true);
    case 'builder':
      return `<div class="rs-app">${header('Classes')}<div class="rs-shell">${classRail()}<main class="rs-workspace">${builderBody('default')}</main></div></div>`;
    case 'inspector':
      return `<div class="rs-app">${header('Classes')}<div class="rs-shell">${classRail()}<main class="rs-workspace">${builderBody('inspector')}</main></div></div>`;
    case 'inspectorAdvanced':
      return `<div class="rs-app">${header('Classes')}<div class="rs-shell">${classRail()}<main class="rs-workspace">${builderBody('inspector')}<section class="rs-panel" style="margin-top:16px"><p class="rs-eyebrow">Advanced timing</p><div class="rs-grid-3"><label class="rs-field">Class start<input value="24:32" /></label><label class="rs-field">Preview fade in<input value="0:00" /></label><label class="rs-field">Preview fade out<input value="0:08" /></label></div></section></main></div></div>`;
    case 'timeline':
      return `<div class="rs-app">${header('Classes')}<div class="rs-shell">${classRail()}<main class="rs-workspace">${builderBody('timeline')}</main></div></div>`;
    case 'previewReady':
      return `<div class="rs-app">${header('Classes')}<div class="rs-shell">${classRail('Sunrise Source — Likes')}<main class="rs-workspace">${builderBody('previewReady')}</main></div></div>`;
    case 'previewPlaying':
      return `<div class="rs-app">${header('Classes')}<div class="rs-shell">${classRail('Sunrise Source — Likes')}<main class="rs-workspace">${builderBody('previewPlaying')}</main></div></div>`;
    case 'previewPaused':
      return `<div class="rs-app">${header('Classes')}<div class="rs-shell">${classRail('Sunrise Source — Likes')}<main class="rs-workspace">${builderBody('previewPaused')}</main></div></div>`;
    case 'previewFailed':
      return `<div class="rs-app">${header('Classes')}<div class="rs-shell">${classRail('Sunrise Source — Likes')}<main class="rs-workspace">${builderBody('previewFailed')}</main></div></div>`;
    case 'previewComplete':
      return `<div class="rs-app">${header('Classes')}<div class="rs-shell">${classRail('Sunrise Source — Likes')}<main class="rs-workspace">${builderBody('previewComplete')}</main></div></div>`;
    case 'builderSearch':
      return builderDrawer('search');
    case 'builderLikes':
      return builderDrawer('likes');
    case 'playlistEmpty':
      return builderDrawer('empty');
    case 'importUrl':
      return builderDrawer('url');
    case 'moves':
      return movesDialog('moves');
    case 'songsByMove':
      return movesDialog('songs');
    case 'songsByMoveEmpty':
      return movesDialog('songsEmpty');
    case 'liveQueue':
      return liveQueue();
    case 'preflight':
      return preflight();
    case 'liveReady':
      return liveRun('ready');
    case 'liveActive':
      return liveRun('active');
    case 'livePaused':
      return liveRun('paused');
    case 'liveList':
      return liveRun('list');
    case 'liveError':
      return liveRun('error');
    case 'account':
      return account();
    case 'accountError':
      return account(true);
    default:
      return utility('error');
  }
}

const state = { view: 'PUB-01', device: 'desktop', current: false, annotations: false };
const nav = document.querySelector('#surface-nav');
const prototype = document.querySelector('#prototype-screen');
const compareGrid = document.querySelector('.compare-grid');
const currentPanel = document.querySelector('#current-panel');
const currentImage = document.querySelector('#current-image');

function buildNav(filter = '') {
  const groups = [...new Set(views.map((view) => view.category))];
  nav.innerHTML = groups
    .map((group) => {
      const matches = views.filter(
        (view) =>
          view.category === group &&
          `${view.id} ${view.title}`.toLowerCase().includes(filter.toLowerCase()),
      );
      if (!matches.length) return '';
      return `<p class="nav-group-title">${group}</p>${matches.map((view) => `<button class="surface-link ${view.id === state.view ? 'is-active' : ''}" data-go="${view.id}"><span class="surface-id">${view.id}</span><span>${view.title}</span></button>`).join('')}`;
    })
    .join('');
}

function showView(id, push = true) {
  const view = views.find((item) => item.id === id) || views[0];
  state.view = view.id;
  prototype.innerHTML = render(view);
  prototype.dataset.device = state.device;
  document.querySelector('#surface-category').textContent = `${view.category} · ${view.id}`;
  document.querySelector('#surface-title').textContent = view.title;
  document.querySelector('#surface-purpose').textContent = view.purpose;
  document.querySelector('#decision-copy').textContent = view.decision;
  document.querySelector('#decision-ids').textContent = view.backlog.join(', ');
  currentImage.src = `../screenshots/current/${state.device === 'mobile' ? view.current.replace('-desktop', '-mobile') : view.current}`;
  currentImage.onerror = () => {
    currentImage.src = `../screenshots/current/${view.current}`;
  };
  document.querySelector('#state-switcher').innerHTML = view.related
    .map((relatedId) => {
      const related = views.find((item) => item.id === relatedId);
      return related
        ? `<button class="state-button ${related.id === view.id ? 'is-active' : ''}" data-go="${related.id}">${related.id}</button>`
        : '';
    })
    .join('');
  buildNav(document.querySelector('#surface-search').value);
  if (push) history.replaceState(null, '', `#${view.id}`);
  document.querySelector('#preview').focus({ preventScroll: true });
}

document.addEventListener('click', (event) => {
  const go = event.target.closest('[data-go]');
  if (go) showView(go.dataset.go);
  const toggler = event.target.closest('[aria-pressed]');
  if (
    toggler &&
    !toggler.matches('#device-desktop,#device-mobile,#compare-toggle,#annotations-toggle')
  ) {
    toggler.setAttribute('aria-pressed', String(toggler.getAttribute('aria-pressed') !== 'true'));
  }
});

document.querySelector('#device-desktop').addEventListener('click', () => setDevice('desktop'));
document.querySelector('#device-mobile').addEventListener('click', () => setDevice('mobile'));

function setDevice(device) {
  state.device = device;
  prototype.dataset.device = device;
  document.querySelector('#device-desktop').classList.toggle('is-active', device === 'desktop');
  document.querySelector('#device-mobile').classList.toggle('is-active', device === 'mobile');
  document
    .querySelector('#device-desktop')
    .setAttribute('aria-pressed', String(device === 'desktop'));
  document
    .querySelector('#device-mobile')
    .setAttribute('aria-pressed', String(device === 'mobile'));
  showView(state.view, false);
}

document.querySelector('#compare-toggle').addEventListener('click', (event) => {
  state.current = !state.current;
  currentPanel.hidden = !state.current;
  compareGrid.classList.toggle('has-current', state.current);
  event.currentTarget.classList.toggle('is-active', state.current);
  event.currentTarget.setAttribute('aria-pressed', String(state.current));
  event.currentTarget.textContent = state.current ? 'Hide current' : 'Show current';
});

document.querySelector('#annotations-toggle').addEventListener('click', (event) => {
  state.annotations = !state.annotations;
  document.querySelector('#decision-layer').hidden = !state.annotations;
  event.currentTarget.classList.toggle('is-active', state.annotations);
  event.currentTarget.setAttribute('aria-pressed', String(state.annotations));
  event.currentTarget.textContent = state.annotations ? 'Hide decisions' : 'Show decisions';
});

document
  .querySelector('#surface-search')
  .addEventListener('input', (event) => buildNav(event.target.value));

const initial = location.hash.slice(1);
showView(views.some((view) => view.id === initial) ? initial : 'PUB-01', false);
