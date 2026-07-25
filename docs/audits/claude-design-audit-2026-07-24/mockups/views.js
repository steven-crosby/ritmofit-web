/* Ritmo Studio — proposed product preview: fixture data + view builders.
   One instructor, one library, one story, matching agent-prompts/design-audit/fixtures.md. */

/* ---------------------------------------------------------------- fixtures */

export const ME = { name: 'Marisol Vega', email: 'marisol.audit@example.com' };

const LONG_TITLE = 'Ritmo del Amanecer — Edición Extendida (Versión Instrumental) 日の出のリズム';
const LONG_ARTIST = 'Orquesta Sinfónica de la Madrugada feat. Los Hermanos Delgado';

export const SUNRISE_TRACKS = [
  { n: 1, t: 'Baianá', a: 'Bakermat', bpm: 112, z: 1, d: '3:00', p: 'SoundCloud' },
  { n: 2, t: 'Instinct', a: 'Lane 8', bpm: 118, z: 1, d: '4:00', p: 'SoundCloud', clip: '0:30–3:30' },
  { n: 3, t: 'Titanium', a: 'David Guetta', bpm: 124, z: 2, d: '4:05', p: 'Spotify' },
  { n: 4, t: LONG_TITLE, a: LONG_ARTIST, bpm: 128, z: 2, d: '3:23', p: 'Spotify' },
  { n: 5, t: 'Wake Me Up', a: 'Avicii', bpm: 132, z: 3, d: '4:07', p: 'Apple Music' },
  { n: 6, t: 'Clarity', a: 'Zedd', bpm: 138, z: 3, d: '4:31', p: 'Apple Music', clip: '0:15–3:20' },
  { n: 7, t: 'Sun Is Shining', a: 'Axwell Ingrosso', bpm: 142, z: 4, d: '3:30', p: 'SoundCloud' },
  { n: 8, t: 'Rather Be', a: 'Clean Bandit', bpm: 130, z: 2, d: '3:47', p: 'Spotify' },
  { n: 9, t: 'Latch', a: 'Disclosure', bpm: 119, z: 1, d: '3:56', p: 'Apple Music' },
  { n: 10, t: 'Midnight City', a: 'M83', bpm: null, z: 0, d: '4:04', p: 'SoundCloud' },
];

export const CLASSES = [
  {
    id: 'sunrise', title: 'Sunrise Climb', template: 'Cycle', tracks: 10, dur: '35:57',
    zones: [1, 1, 2, 2, 3, 3, 4, 2, 1, null], avgBpm: 127,
    next: 'Add tempo to Midnight City', verdict: 'Runnable', gaps: 1, ready: 'near',
  },
  {
    id: 'heat', title: 'Heat Check — Thursday Express Interval Session (Studio B, Summer Series)',
    short: 'Heat Check', template: 'HIIT', tracks: 6, dur: '23:06',
    zones: [1, 2, 3, 4, 2, 1], avgBpm: 133, next: 'Add cues', verdict: 'Runnable', gaps: 1, ready: 'near',
  },
  {
    id: 'slow', title: 'Slow Burn', template: 'Pilates', tracks: 5, dur: '18:35',
    zones: [1, 2, 3, 2, 1], avgBpm: 102, next: 'Add cues', verdict: 'Runnable', gaps: 1, ready: 'near',
  },
  {
    id: 'tue', title: 'Tuesday 6AM — Test', template: 'Cycle', tracks: 3, dur: '11:05',
    zones: [1, 1, 1], derived: true, avgBpm: 124,
    next: 'Add cues', verdict: 'Runnable', gaps: 1, ready: 'near',
  },
  {
    id: 'untitled', title: 'Untitled class', template: 'Cycle', tracks: 0, dur: '0:00',
    zones: [], next: 'Add the first track', verdict: 'Empty draft', gaps: 1, ready: 'empty',
  },
];

export const PROVIDERS = {
  disconnected: [
    { name: 'SoundCloud', state: 'none', label: '○ Not connected', catalog: true, likes: 0 },
    { name: 'Spotify', state: 'none', label: '○ Not connected', catalog: true, likes: 0 },
    { name: 'Apple Music', state: 'none', label: '○ Not connected', catalog: true, likes: 0 },
  ],
  mixed: [
    { name: 'SoundCloud', state: 'ok', label: '✓ Connected', catalog: true, likes: 2 },
    { name: 'Spotify', state: 'warn', label: '⧖ Session expired', catalog: true, likes: 0 },
    { name: 'Apple Music', state: 'none', label: '○ Not connected', catalog: true, likes: 0 },
  ],
  unavailable: [
    { name: 'SoundCloud', state: 'muted', label: '? Status unavailable', catalog: true, likes: 0 },
    { name: 'Spotify', state: 'muted', label: '? Status unavailable', catalog: true, likes: 0 },
    { name: 'Apple Music', state: 'muted', label: '? Status unavailable', catalog: true, likes: 0 },
  ],
};

const CATALOG = [
  { t: 'Baianá', a: 'Bakermat', bpm: 112, d: '3:00', p: 'SoundCloud' },
  { t: 'Instinct', a: 'Lane 8', bpm: null, d: '4:00', p: 'SoundCloud' },
  { t: 'Titanium', a: 'David Guetta', bpm: null, d: '4:05', p: 'Spotify' },
  { t: 'Levels', a: 'Avicii', bpm: null, d: '3:23', p: 'Spotify' },
  { t: 'Wake Me Up', a: 'Avicii', bpm: null, d: '4:07', p: 'Apple Music' },
  { t: 'Clarity', a: 'Zedd', bpm: null, d: '4:31', p: 'Apple Music' },
];

/* ------------------------------------------------------------------ helpers */

const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ZONE_WORD = ['None', 'Build', 'Push', 'Attack', 'All Out'];

export function zone(z) {
  if (z === null || z === undefined) {
    return `<span class="zone" data-z="0"><span class="n">—</span><span class="bars"><i></i><i></i><i></i><i></i></span><span class="w">Unscored</span></span>`;
  }
  return `<span class="zone" data-z="${z}"><span class="n">Z${z}</span><span class="bars"><i></i><i></i><i></i><i></i></span><span class="w">${ZONE_WORD[z]}</span></span>`;
}

export function pulse(zones, { derived = false, sm = false, cap = null, confirmable = true } = {}) {
  if (!zones.length) {
    return `<div class="pulse">
      <div class="pulse-head"><span class="pulse-label">Class Pulse</span>
        <span class="pulse-mark">◇ derived · confirm</span></div>
      <div class="pulse-graph ${sm ? 'sm' : ''}" style="align-items:center;justify-content:center">
        <p class="pulse-cap" style="margin:0">Add a track and the shape appears here.</p>
      </div>
    </div>`;
  }
  // P0-07: never a flat slab. A single-effort class renders a documented derived arc.
  const flat = zones.every((z) => z === zones[0] && z !== null);
  const shaped = flat ? zones.map((_, i) => [1, 2, 3, 2, 1][Math.floor((i / zones.length) * 5)] ?? 2) : zones;
  const heights = { 0: 18, 1: 34, 2: 52, 3: 70, 4: 92 };
  const bars = shaped
    .map((z, i) => {
      const orig = zones[i];
      if (orig === null) return `<div class="pulse-bar unscored" style="height:34%"></div>`;
      return `<div class="pulse-bar z${z}" style="height:${heights[z]}%"></div>`;
    })
    .join('');
  const caption = cap ?? (flat
    ? 'Derived shape — every track shares one effort, so order and duration set the arc.'
    : 'All track durations and efforts contribute.');
  return `<div class="pulse">
    <div class="pulse-head"><span class="pulse-label">Class Pulse</span>
      ${confirmable ? `<button class="pulse-mark" aria-pressed="false">◇ derived · confirm</button>` : `<span class="pulse-mark">◇ derived</span>`}</div>
    <div class="pulse-graph ${sm ? 'sm' : ''}">${bars}</div>
    <p class="pulse-cap">${h(caption)}</p>
  </div>`;
}

export function shell(active, inner, { who = ME.name } = {}) {
  const dest = ['Classes', 'Music', 'Live', 'Account'];
  return `<div class="app">
    <header class="app-header">
      <span class="brandmark"><span class="dot">R</span><span class="name">Ritmo Studio</span></span>
      <nav class="nav" aria-label="Primary">
        <span class="who">${h(who)}</span>
        ${dest.map((d) => `<a href="#" ${d === active ? 'aria-current="page"' : ''}>${d}</a>`).join('')}
      </nav>
    </header>
    <div style="padding:var(--s5)">${inner}</div>
  </div>`;
}

function providerRail(list, { title = 'Sources', active = 0 } = {}) {
  return `<div class="card" style="padding:var(--s3)">
    <p class="mono-sm" style="margin:0 0 var(--s2)">${h(title.toUpperCase())}</p>
    <div class="rail">
      ${list.map((p, i) => `<button class="rail-item" aria-pressed="${i === active}">
        <span class="grow"><span style="font-weight:600">${h(p.name)}</span></span>
        <span class="pstate ${p.state}">${h(p.label)}</span>
      </button>`).join('')}
    </div>
    <div style="margin-top:var(--s3);display:grid;gap:6px">
      <button class="rail-item"><span class="grow">Search catalog</span><span class="pstate ok">all providers</span></button>
      <button class="rail-item"><span class="grow">Liked tracks</span><span class="pstate ${list[0].likes ? 'ok' : 'none'}">${list[0].likes || '—'}</span></button>
      <button class="rail-item"><span class="grow">Saved playlists</span><span class="pstate none">—</span></button>
      <button class="rail-item"><span class="grow">Import from URL</span><span class="pstate none"></span></button>
    </div>
    <button class="btn btn-secondary btn-sm" style="width:100%;margin-top:var(--s3)">Manage connections</button>
  </div>`;
}

function srcRow(t, { selected = false } = {}) {
  return `<div class="srcrow" data-selected="${selected}">
    <input type="checkbox" ${selected ? 'checked' : ''} aria-label="Select ${h(t.t)}" style="width:20px;height:20px;accent-color:var(--cyan-400)">
    <span class="art">♪</span>
    <span style="min-width:0"><span class="title">${h(t.t)}</span><br><span class="artist">${h(t.a)}</span></span>
    <span class="bpm">${t.bpm ?? '—'}<span class="mono-sm"> BPM</span></span>
    <span class="dur">${h(t.d)}</span>
    <button class="btn btn-quiet btn-sm">▶ Preview</button>
  </div>`;
}

function trackRow(t, { selected = false } = {}) {
  return `<div class="trackrow" data-selected="${selected}">
    <span class="pos">${t.n}</span>
    <span class="art">♪</span>
    <span style="min-width:0"><span class="title" style="font-weight:600;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(t.t)}</span>
      <span class="artist" style="font-size:12.5px;color:var(--text-secondary);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(t.a)}${t.clip ? ` · clip ${h(t.clip)}` : ''}</span></span>
    ${zone(t.z)}
    <span class="data" style="font-size:14px">${t.bpm ?? '<span style="color:var(--caution)">BPM needed</span>'}</span>
    <span class="grip" aria-label="Reorder ${h(t.t)}, position ${t.n} of 10. Use arrow up and down.">⠿</span>
  </div>`;
}

function readiness(c) {
  const rows = [];
  rows.push(`<li><span class="ok">✓</span><span>Durations set</span></li>`);
  if (c.id === 'sunrise') {
    rows.push(`<li><span class="warn">!</span><span><b>Tempo incomplete</b></span></li>
      <p class="consequence">No beat pulse where BPM is missing (1 track).</p>
      <button class="fixchip">Midnight City →</button>`);
  } else {
    rows.push(`<li><span class="ok">✓</span><span>Tempo ready</span></li>`);
  }
  if (c.id === 'sunrise') rows.push(`<li><span class="ok">✓</span><span>Cues &amp; moves set</span></li>`);
  else rows.push(`<li><span class="warn">!</span><span><b>No cues or moves yet</b></span></li>
    <p class="consequence">Live runs as a bare prompter without them.</p>`);
  rows.push(`<li><span class="ok">✓</span><span>Music ready</span></li>`);
  return `<div class="readiness">
    <div class="readiness-head"><span class="t">Readiness</span><span class="v">${h(c.verdict)} · ${c.gaps} to finish</span></div>
    <ul>${rows.join('')}</ul>
  </div>`;
}

/* P0-03: the primary verb comes from the readiness derivation, not a constant. */
function primaryVerb(c) {
  if (c.tracks === 0) return 'Add the first track';
  if (c.id === 'sunrise') return 'Add tempo';
  return 'Add cues';
}

function classCard(c, { compact = false } = {}) {
  return `<div class="card stack">
    <div class="spread">
      <div style="min-width:0">
        <p class="eyebrow" style="margin:0">${c.ready === 'empty' ? 'Start shaping' : 'Ready to teach'}</p>
        <h3 style="font-family:var(--font-display);font-size:19px;margin:2px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(c.short ?? c.title)}</h3>
        <p class="mono-sm" style="margin:2px 0 0">${h(c.template)} · ${c.tracks} tracks${c.tracks ? ` · ${h(c.dur)}` : ''}${c.avgBpm ? ` · avg ${c.avgBpm} BPM` : ''}</p>
      </div>
      <span class="data" style="font-size:17px">${h(c.dur)}</span>
    </div>
    ${pulse(c.zones, { sm: compact })}
    <div class="spread">
      <span class="statelabel ${c.ready === 'empty' ? 'muted' : 'ok'}"><span class="g">${c.ready === 'empty' ? '○' : '✓'}</span>${h(c.verdict)}</span>
      <div class="row" style="gap:var(--s2)">
        <button class="btn btn-secondary btn-sm">Rehearsal view</button>
        <button class="btn btn-primary btn-sm">${h(primaryVerb(c))}</button>
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------- views */

export const VIEWS = [];
const V = (o) => VIEWS.push(o);

V({
  id: 'foundations', group: 'System', title: 'Shared foundations',
  ids: ['all'], badges: ['P1-01', 'P1-08', 'P0-04'],
  note: 'The primitives every other view is built from. Meaning is checked in greyscale here, so no view below depends on colour alone.',
  evidence: 'No single current screenshot — this is the system layer.',
  render: () => `<div class="app" style="padding:var(--s5)"><div class="stack">
    <div class="card stack">
      <p class="eyebrow">Buttons — one copper primary per surface</p>
      <div class="row">
        <button class="btn btn-primary">Run live</button>
        <button class="btn btn-secondary">Rehearsal view</button>
        <button class="btn btn-quiet">+ Add cue</button>
        <button class="btn btn-danger">⊘ Remove track</button>
        <button class="btn btn-secondary" disabled>Disabled</button>
      </div>
      <p class="tiny muted">P1-02: provider connect actions are secondary, never a saturated cyan fill competing with the primary.</p>
    </div>
    <div class="card stack">
      <p class="eyebrow">Intensity — P1-01 proposed selection treatment</p>
      <div class="segmented">
        ${[0, 1, 2, 3, 4].map((z) => `<button class="seg" aria-pressed="${z === 1}"><span class="zn">Z${z}</span><span class="zw">${ZONE_WORD[z]}</span></button>`).join('')}
      </div>
      <p class="tiny muted">Neutral fill + 3px cyan indicator per 09-class-builder-guidelines. Zone number and word are separated, and "All Out" no longer orphans onto a second row.</p>
      <div class="row">${[0, 1, 2, 3, 4].map((z) => zone(z)).join('')}</div>
    </div>
    <div class="card stack">
      <p class="eyebrow">Provider capability states — glyph + label</p>
      <div class="row">
        <span class="pstate ok">✓ Connected</span><span class="pstate ok">↻ Reconnecting</span>
        <span class="pstate warn">! Disconnected</span><span class="pstate warn">⧖ Session expired</span>
        <span class="pstate err">⊘ Permission</span><span class="pstate err">× Provider error</span>
      </div>
    </div>
    <div class="card stack">
      <p class="eyebrow">Greyscale proof — meaning survives without colour</p>
      <div class="greyscale row" style="align-items:flex-start;gap:var(--s5)">
        <div style="flex:1">${pulse([1, 2, 3, 4, 2, null], { sm: true })}</div>
        <div class="stack" style="flex:1">
          ${[1, 3, 4].map((z) => zone(z)).join('<br>')}
          <span class="pstate warn">⧖ Session expired</span>
        </div>
      </div>
      <p class="tiny muted">Height encodes zone; hatching encodes unscored; glyph + word encode state. Nothing above needs hue to be read.</p>
    </div>
    <div class="card stack">
      <p class="eyebrow">Focus — P1-08, one ring token everywhere</p>
      <div class="row"><button class="btn btn-secondary" style="outline:3px solid var(--focus-ring);outline-offset:2px">Focused control</button>
      <span class="tiny muted">3px <span class="data">#74D6E5</span> (interactive/focus-ring), 2px offset — applied to every focusable control, replacing today's two competing treatments.</span></div>
    </div>
  </div></div>`,
});

/* ---- Public ---- */

V({
  id: 'pub-entry', group: 'Public', title: 'Public entry', ids: ['PUB-01'], badges: [],
  note: 'Kept close to the shipped page — it is already the clearest statement of the product. The demo class now carries a real arc rather than an engineering label.',
  evidence: 'PUB-01-marketing-desktop.jpg', compare: 'PUB-01-marketing-desktop.jpg',
  render: () => `<div class="app"><header class="app-header">
      <span class="brandmark"><span class="dot">R</span><span class="name">Ritmo Studio</span></span>
      <nav class="nav"><a href="#">Product</a><a href="#">Method</a><a href="#">Live mode</a>
      <button class="btn btn-secondary btn-sm">Sign in</button><button class="btn btn-primary btn-sm">Start building</button></nav>
    </header>
    <div class="split-2" style="padding:var(--s9) var(--s7);align-items:center">
      <div>
        <p class="eyebrow">Built for instructors who create</p>
        <h1 style="font-family:var(--font-display);font-size:52px;line-height:1.04;letter-spacing:-0.04em;margin:0 0 var(--s4)">Find the class inside the <span style="color:var(--brand)">music.</span></h1>
        <p class="muted" style="font-size:16px;max-width:44ch;margin:0 0 var(--s5)">Source the right tracks. Shape the energy. Score the movement. Walk into Live knowing what comes next.</p>
        <div class="row"><button class="btn btn-primary">Start building</button><button class="btn btn-secondary">Learn the workflow</button></div>
        <p class="mono-sm" style="margin-top:var(--s4)">Private beta · playback uses your connected provider account</p>
      </div>
      <div class="card stack">
        <div class="spread"><p class="eyebrow" style="margin:0">A class taking shape</p><span class="data" style="font-size:17px">40:50</span></div>
        <h3 style="font-family:var(--font-display);font-size:21px;margin:0">Saturday Heat — 45</h3>
        ${pulse([1, 2, 3, 2, 4, 2], { confirmable: false })}
        <div class="grid2" style="gap:var(--s2)">
          ${[['01', 'Find', 'Source music'], ['02', 'Shape', 'Order the arc'], ['03', 'Score', 'Add cues'], ['04', 'Lead', 'Run Live']]
            .map(([n, t, s]) => `<div style="border:1px solid var(--border-subtle);border-radius:var(--r-control);padding:var(--s3)">
            <span class="mono-sm">${n}</span><div style="font-weight:600">${t}</div><div class="tiny muted">${s}</div></div>`).join('')}
        </div>
      </div>
    </div></div>`,
});

V({
  id: 'pub-auth', group: 'Public', title: 'Sign in / sign up', ids: ['PUB-02'], badges: ['P1-05'],
  note: 'The invite-only line is derived from the active access gate rather than a hardcoded literal, so it can never claim a restriction that is not in force.',
  evidence: 'PUB-02-signin-desktop.jpg', compare: 'PUB-02-signin-desktop.jpg',
  render: () => `<div class="app split-2" style="min-height:560px;gap:0">
    <div style="padding:var(--s7);border-right:1px solid var(--border-subtle)">
      <span class="brandmark"><span class="dot">R</span><span class="name">Ritmo Studio</span></span>
      <p class="eyebrow" style="margin-top:var(--s8)">Your creative loop is waiting</p>
      <h1 style="font-family:var(--font-display);font-size:42px;line-height:1.06;margin:0 0 var(--s3)">The room starts here.</h1>
      <p class="muted">Music, class shape, rehearsal, and Live — one private creator workspace.</p>
      <div style="margin-top:var(--s6)">${pulse([1, 2, 3, 2, 4, 2], { confirmable: false })}</div>
    </div>
    <div style="padding:var(--s7)">
      <button class="btn btn-quiet" style="padding:0">← Back to home</button>
      <p class="eyebrow" style="margin-top:var(--s4)">Sign in</p>
      <h2 style="font-family:var(--font-display);font-size:28px;margin:0 0 var(--s2)">Welcome back, instructor.</h2>
      <p class="muted" style="margin:0 0 var(--s5)">Continue to your personal class workspace.</p>
      <label style="display:block;font-size:13px;margin-bottom:6px">Email</label>
      <input style="width:100%;min-height:44px;border-radius:var(--r-input);border:1px solid var(--border-default);background:var(--bg-sunken);color:inherit;padding:0 var(--s3);font-family:inherit" value="marisol.audit@example.com">
      <label style="display:block;font-size:13px;margin:var(--s3) 0 6px">Password</label>
      <input type="password" style="width:100%;min-height:44px;border-radius:var(--r-input);border:1px solid var(--border-default);background:var(--bg-sunken);color:inherit;padding:0 var(--s3)" value="········">
      <button class="btn btn-primary" style="width:100%;margin-top:var(--s4)">Sign in</button>
      <div class="row" style="margin-top:var(--s3)"><button class="btn btn-quiet btn-sm">Forgot password?</button><button class="btn btn-quiet btn-sm">Need an invited account? Sign up</button></div>
      <p class="tiny muted" style="border-top:1px solid var(--border-subtle);padding-top:var(--s3);margin-top:var(--s4)">Private beta · new accounts require an invitation. <a href="#" style="color:var(--interactive)">Privacy and data</a></p>
    </div></div>`,
});

V({
  id: 'pub-recovery', group: 'Public', title: 'Account recovery', ids: ['PUB-03', 'PUB-05'], badges: [],
  note: 'Unchanged in substance — the neutral response is correct anti-enumeration behaviour and is preserved deliberately.',
  evidence: 'PUB-03-recovery-sent-desktop.jpg', compare: 'PUB-03-recovery-sent-desktop.jpg',
  render: () => `<div class="app" style="padding:var(--s8);display:grid;place-items:center;min-height:420px">
    <div class="card stack" style="max-width:460px;width:100%">
      <p class="eyebrow">Account recovery</p>
      <h2 style="font-family:var(--font-display);font-size:26px;margin:0">Reset your password</h2>
      <p class="muted" style="margin:0">We will send one secure reset link if the account exists.</p>
      <span class="statelabel ok"><span class="g">✓</span>Link sent</span>
      <p class="muted" style="margin:0">If that email has an account, a reset link is on its way.</p>
      <button class="btn btn-secondary">Back to sign in</button>
    </div></div>`,
});

V({
  id: 'pub-invite', group: 'Public', title: 'Invitation required', ids: ['PUB-07', 'PUB-06'], badges: [],
  note: 'The strongest error surface in the current product; preserved as the model the rest of the recovery grammar should match.',
  evidence: 'PUB-07-invite-rejected-desktop.jpg', compare: 'PUB-07-invite-rejected-desktop.jpg',
  render: () => `<div class="app" style="padding:var(--s8);display:grid;place-items:center;min-height:420px">
    <div class="statepanel stack" style="max-width:520px;width:100%">
      <span class="statelabel caution"><span class="g">!</span>Invitation required</span>
      <h3 style="margin:0">Use your invited email</h3>
      <p class="muted" style="margin:0">Ritmo Studio is currently available by invitation only.</p>
      <p class="safety">Your name and email stay here if the invitation needs attention.</p>
      <div class="row"><button class="btn btn-primary">Try another email</button><button class="btn btn-secondary">Back to sign in</button></div>
    </div></div>`,
});

/* ---- System ---- */

V({
  id: 'sys-states', group: 'System', title: 'Loading, update, recovery', ids: ['SYS-01', 'SYS-02', 'SYS-03'], badges: [],
  note: 'Loading preserves the workspace silhouette and names what it is restoring — already correct, shown here so the grammar is reviewable in one place.',
  evidence: 'SYS-01-workspace-loading-desktop.jpg', compare: 'SYS-01-workspace-loading-desktop.jpg',
  unverified: 'SYS-02 and SYS-03 are code-confirmed only in this run — a real service-worker update cycle and a forced render throw could not be induced. Treat these two panels as proposals, not as observed current behaviour.',
  render: () => shell('Classes', `<div class="stack">
    <div class="card stack">
      <span class="statelabel muted"><span class="g">◌</span>Loading your class library</span>
      <p class="muted" style="margin:0">Reading your next run of show…</p>
      <p class="tiny muted" style="margin:0">Ritmo is checking classes before it suggests a next step.</p>
    </div>
    <div class="statepanel stack">
      <span class="statelabel ok"><span class="g">↑</span>Update available</span>
      <h3 style="margin:0">A newer version is ready.</h3>
      <p class="safety">Your open class is saved. Reloading keeps you on the same screen.</p>
      <div class="row"><button class="btn btn-primary">Reload now</button><button class="btn btn-secondary">Later</button></div>
    </div>
    <div class="statepanel stack">
      <span class="statelabel danger"><span class="g">×</span>Something failed to render</span>
      <h3 style="margin:0">This screen could not load.</h3>
      <p class="safety">No class was changed. Reloading restores the workspace you had open.</p>
      <div class="row"><button class="btn btn-primary">Reload</button><button class="btn btn-secondary">Back to classes</button></div>
    </div>
  </div>`),
});

/* ---- Classes ---- */

V({
  id: 'classes-home', group: 'Classes', title: 'Classes — run of show', ids: ['CLS-01'], badges: ['P0-02', 'P0-03', 'P0-07', 'P0-08', 'P1-06', 'P1-07', 'P2-02'],
  note: 'Ordering is explicit and switchable, and "Ready to teach" wins by default so the most finished class is never buried. Each card\'s primary verb comes from its own readiness gap. On mobile the creation form collapses behind one control so a class is visible immediately.',
  evidence: 'CLS-01-library-desktop.jpg', compare: 'CLS-01-library-desktop.jpg',
  states: ['Ready to teach', 'Needs work'],
  render: (state) => {
    const order = state === 'Needs work'
      ? ['untitled', 'tue', 'slow', 'heat', 'sunrise']
      : ['sunrise', 'heat', 'slow', 'tue', 'untitled'];
    const list = order.map((id) => CLASSES.find((c) => c.id === id));
    return shell('Classes', `<div class="split" style="--rail:260px">
      <aside class="stack">
        <button class="btn btn-primary" style="width:100%">+ New class</button>
        <div class="card" style="padding:var(--s3)">
          <p class="mono-sm" style="margin:0 0 var(--s2)">YOUR CLASSES · 5</p>
          <div class="rail">
            ${list.map((c) => `<button class="rail-item" aria-pressed="${c.id === order[0]}">
              <span class="grow"><span style="font-weight:600;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(c.short ?? c.title)}</span>
              <span class="mono-sm">${h(c.template)} · ${c.tracks} tracks</span></span></button>`).join('')}
          </div>
        </div>
      </aside>
      <div>
        <p class="eyebrow">Classes</p>
        <div class="spread" style="align-items:flex-end">
          <div><h2 class="screen-title">Pick up where the energy left off.</h2>
          <p class="screen-sub">Ordered by <b>${h(state.toLowerCase())}</b>.</p></div>
          <div class="row" style="gap:var(--s2)">
            <button class="state-btn" aria-pressed="${state === 'Ready to teach'}">Ready to teach</button>
            <button class="state-btn" aria-pressed="${state === 'Needs work'}">Needs work</button>
          </div>
        </div>
        <div class="grid2" style="margin-top:var(--s4)">
          ${list.slice(0, 4).map((c) => classCard(c, { compact: true })).join('')}
        </div>
      </div>
    </div>`);
  },
});

V({
  id: 'classes-fresh', group: 'Classes', title: 'Fresh account', ids: ['CLS-02', 'CLS-00'], badges: ['P0-03', 'P1-05'],
  note: 'All four entry points survive — D20 forbids forcing one order — but one is recommended, so a first-run instructor is not asked to arbitrate between four peers.',
  evidence: 'CLS-02-fresh-desktop.jpg', compare: 'CLS-02-fresh-desktop.jpg',
  unverified: 'CLS-00 (the first-run tutorial overlay) never fired in this run: the pending flag is written only by the in-app sign-up path and the fixture accounts were created through the API.',
  render: () => shell('Classes', `<div class="stack" style="max-width:900px">
    <p class="eyebrow">First workspace</p>
    <h2 class="screen-title">Your first class can start anywhere.</h2>
    <p class="screen-sub">Bring music, a template, a movement idea, or a manual track. Ritmo will help shape the run of show.</p>
    <div class="card stack" style="border-color:var(--border-default)">
      <div class="spread"><div><p class="eyebrow" style="margin:0">Recommended</p>
      <h3 style="font-family:var(--font-display);font-size:22px;margin:2px 0 0">Find a track or source</h3>
      <p class="muted tiny" style="margin:2px 0 0">Browse provider catalogs and carry the choice into a class. Most instructors start here.</p></div>
      <button class="btn btn-primary">Browse music</button></div>
    </div>
    <div class="grid3">
      ${[['Template first', 'Start Cycle, Pilates, or HIIT', 'Name the class and choose its discipline.'],
         ['Movement first', 'Start with a move', 'Reuse a song–movement pairing you already teach.'],
         ['Manual first', 'Start from memory', 'Enter title, artist, duration, and effort yourself.']]
        .map(([e, t, s]) => `<div class="card"><p class="eyebrow" style="margin:0">${e}</p>
        <div style="font-weight:600;margin:4px 0">${t}</div><p class="tiny muted" style="margin:0">${s}</p>
        <button class="btn btn-secondary btn-sm" style="margin-top:var(--s3);width:100%">Start</button></div>`).join('')}
    </div>
  </div>`, { who: 'Sofía Ramos' }),
});

V({
  id: 'class-empty', group: 'Classes', title: 'Empty class', ids: ['CLS-03'], badges: ['P0-08', 'P1-05'],
  note: 'The empty Class Pulse states its invitation exactly once — today the same sentence renders twice, inside the graph area and again as the caption.',
  evidence: 'CLS-03-empty-class-desktop.jpg', compare: 'CLS-03-empty-class-desktop.jpg',
  render: () => shell('Classes', `<div class="stack" style="max-width:860px">
    <div class="spread"><div><h2 class="screen-title" style="font-size:26px">Untitled class</h2>
    <p class="mono-sm" style="margin:0">Cycle · 0 tracks</p></div>
    <button class="btn btn-primary">Add the first track</button></div>
    ${pulse([])}
    ${readiness(CLASSES.find((c) => c.id === 'untitled'))}
    <div class="card stack"><p class="eyebrow" style="margin:0">Start with the strongest source</p>
    <div class="grid2"><button class="btn btn-primary">Browse music</button><button class="btn btn-secondary">Start from a move</button></div></div>
  </div>`),
});

V({
  id: 'class-rehearsal', group: 'Classes', title: 'Rehearsal view', ids: ['CLS-04'], badges: ['P0-07'],
  note: 'Read-only review with the real arc, the run of show, and one escape into Builder. Preserved from the current build; the Pulse is now never flat.',
  evidence: 'CLS-04-rehearsal-populated-desktop.jpg', compare: 'CLS-04-rehearsal-populated-desktop.jpg',
  render: () => `<div class="app" style="padding:var(--s6);display:grid;place-items:center">
    <div class="dialog stack" style="max-width:760px;width:100%">
      <div class="dialog-head"><div><p class="eyebrow" style="margin:0">Read-only rehearsal view</p>
      <h3>Sunrise Climb</h3><p class="mono-sm" style="margin:2px 0 0">Cycle · 10 tracks · 35:57 · avg 127 BPM</p></div>
      <button class="btn btn-quiet">✕</button></div>
      ${pulse(CLASSES[0].zones)}
      ${readiness(CLASSES[0])}
      <div><p class="eyebrow">Run of show</p>
      ${SUNRISE_TRACKS.slice(0, 4).map((t) => trackRow(t)).join('')}
      <p class="tiny muted" style="margin-top:var(--s2)">6 more tracks</p></div>
      <div class="row"><button class="btn btn-primary">Open in Builder</button><button class="btn btn-secondary">Run live</button></div>
    </div></div>`,
});

V({
  id: 'class-library-error', group: 'Classes', title: 'Library unavailable', ids: ['CLS-05'], badges: ['P1-05'],
  note: 'The recovery grammar is already excellent and is kept verbatim — with one change: the raw upstream message is no longer interpolated into user-facing copy.',
  evidence: 'CLS-05-library-error-desktop.jpg', compare: 'CLS-05-library-error-desktop.jpg',
  render: () => shell('Classes', `<div class="statepanel stack" style="max-width:760px">
    <span class="statelabel caution"><span class="g">!</span>Class library unavailable</span>
    <h3 style="margin:0">Your library is temporarily unavailable.</h3>
    <p class="muted" style="margin:0">Ritmo could not read the class list. The service did not respond.</p>
    <p class="safety">No class was removed. A new draft remains a separate, safe starting point.</p>
    <div class="row"><button class="btn btn-primary">Try the library again</button><button class="btn btn-secondary">Start a new draft</button></div>
    <p class="tiny muted" style="margin:0">Reference code <span class="data">RF-CLS-503</span> — quote this if you contact support.</p>
  </div>`),
});

/* ---- Music ---- */

V({
  id: 'music-home', group: 'Music', title: 'Music — sourcing workspace', ids: ['MUS-01', 'MUS-02', 'MUS-06'], badges: ['P0-01', 'P0-06', 'P1-02'],
  note: 'The largest proposed change. Catalog browsing needs no connection and the product already says so, so Music leads with results and demotes connection status to a one-line rail item. The three status cards and the empty lower viewport are gone.',
  evidence: 'MUS-01-music-disconnected-desktop.jpg / MUS-02-music-mixed-desktop.jpg',
  compare: 'MUS-02-music-mixed-desktop.jpg',
  states: ['Mixed', 'Disconnected', 'Status unavailable'],
  render: (state) => {
    const key = state === 'Disconnected' ? 'disconnected' : state === 'Status unavailable' ? 'unavailable' : 'mixed';
    const list = PROVIDERS[key];
    const banner = key === 'unavailable'
      ? `<div class="statepanel stack" style="margin-bottom:var(--s3)">
          <span class="statelabel muted"><span class="g">?</span>Connection status unavailable</span>
          <p class="muted" style="margin:0">Catalog search still works. Liked tracks and saved playlists are unavailable until status returns.</p>
          <div class="row"><button class="btn btn-secondary btn-sm">Retry status</button></div></div>`
      : key === 'disconnected'
        ? `<p class="tiny muted" style="margin:0 0 var(--s3)">No account is linked yet — catalog search below works anyway. Link an account to reach your likes and saved playlists.</p>`
        : '';
    return shell('Music', `<div class="split" style="--rail:250px">
      ${providerRail(list)}
      <div>
        <p class="eyebrow">Music</p>
        <div class="spread" style="align-items:flex-end">
          <div><h2 class="screen-title">Browse music, then shape it into class.</h2>
          <p class="screen-sub">Provider libraries are the raw material. Selection carries straight into a class.</p></div>
        </div>
        <div style="margin:var(--s4) 0 var(--s3)">
          <input placeholder="Search every connected catalog…" style="width:100%;min-height:44px;border-radius:var(--r-input);border:1px solid var(--border-default);background:var(--bg-sunken);color:inherit;padding:0 var(--s4);font-family:inherit" value="a">
        </div>
        ${banner}
        <div class="card" style="padding:var(--s2)">
          ${CATALOG.map((t, i) => srcRow(t, { selected: i < 2 })).join('')}
        </div>
        <div class="tray">
          <span class="data" style="font-size:15px">2 selected</span>
          <span class="mono-sm">7:00 total</span>
          <span style="flex:1"></span>
          <button class="btn btn-secondary btn-sm">Add to open class</button>
          <button class="btn btn-primary btn-sm">Start class</button>
        </div>
      </div>
    </div>`);
  },
});

V({
  id: 'music-likes', group: 'Music', title: 'Liked tracks → class', ids: ['MUS-03', 'MUS-04', 'MUS-05'], badges: ['P0-01'],
  note: 'The same source-list component as Music home and Builder Add music — one row model, one selection tray, one pair of destination actions.',
  evidence: 'MUS-03-likes-desktop.jpg', compare: 'MUS-03-likes-desktop.jpg',
  unverified: 'MUS-05 (populated saved-playlist detail) could not be exercised: the local mock provider seam returns an empty playlist array by design, so only the empty state exists today. The playlist layout below is a proposal that current evidence cannot validate.',
  render: () => shell('Music', `<div class="split" style="--rail:250px">
    ${providerRail(PROVIDERS.mixed, { active: 0 })}
    <div>
      <p class="eyebrow">SoundCloud · liked tracks</p>
      <h2 class="screen-title" style="font-size:26px">2 tracks you have liked</h2>
      <div class="card" style="padding:var(--s2);margin-top:var(--s3)">
        ${srcRow(CATALOG[0], { selected: true })}${srcRow(CATALOG[1], { selected: true })}
      </div>
      <div class="tray">
        <span class="data" style="font-size:15px">2 selected</span><span class="mono-sm">7:00 total</span>
        <span style="flex:1"></span>
        <button class="btn btn-secondary btn-sm">Add to open class</button>
        <button class="btn btn-primary btn-sm">Start class</button>
      </div>
      <div class="card stack" style="margin-top:var(--s4)">
        <span class="statelabel ok"><span class="g">✓</span>Class created</span>
        <h3 style="font-family:var(--font-display);font-size:20px;margin:0">"SoundCloud likes" is ready to shape.</h3>
        <p class="muted tiny" style="margin:0">2 tracks carried over in the order you selected them.</p>
        <div class="row"><button class="btn btn-primary btn-sm">Open in Builder</button><button class="btn btn-secondary btn-sm">Keep browsing</button></div>
      </div>
    </div></div>`),
});

V({
  id: 'connections-dialog', group: 'Music', title: 'Connections', ids: ['CONN-01', 'CONN-02', 'MUS-07', 'ACC-03'], badges: ['P0-06'],
  note: 'Each control names the provider it acts on, so no two buttons share the accessible name "Connect". The capability ledger is preserved unchanged — it is the clearest expression of the D19/D21 constraint in the product.',
  evidence: 'CONN-02-mixed-desktop.jpg', compare: 'CONN-02-mixed-desktop.jpg',
  states: ['Mixed', 'Disconnected'],
  render: (state) => {
    const list = PROVIDERS[state === 'Disconnected' ? 'disconnected' : 'mixed'];
    const cap = (p) => [
      ['Catalog', '✓ Browse catalog', 'ok'],
      ['Library', p.state === 'ok' ? '✓ Likes & playlists ready' : p.state === 'warn' ? '→ Reconnect account' : '→ Connect account', p.state === 'ok' ? 'ok' : 'warn'],
      ['Playback', p.state === 'ok' ? '✓ Public widget ready' : p.state === 'warn' ? '→ Reconnect for playback' : '→ Connect account', p.state === 'ok' ? 'ok' : 'warn'],
    ];
    return `<div class="app" style="padding:var(--s6);display:grid;place-items:center">
      <div class="dialog stack" style="max-width:640px;width:100%">
        <div class="dialog-head"><div><h3>Music connections</h3>
        <p class="muted tiny" style="margin:4px 0 0">Catalog, library, and playback permissions stay distinct.</p></div>
        <button class="btn btn-quiet" aria-label="Close connections dialog">✕</button></div>
        ${list.map((p) => `<div class="card stack" style="gap:var(--s2)">
          <div class="spread"><span style="font-weight:600">${h(p.name)}</span>
          <span class="pstate ${p.state}">${h(p.label)}</span></div>
          ${cap(p).map(([k, v, s]) => `<div class="spread tiny"><span class="muted">${k}</span><span class="pstate ${s}">${h(v)}</span></div>`).join('')}
          <button class="btn ${p.state === 'ok' ? 'btn-secondary' : 'btn-secondary'} btn-sm" style="align-self:flex-start">
            ${p.state === 'ok' ? `Disconnect ${h(p.name)}` : p.state === 'warn' ? `Reconnect ${h(p.name)}` : `Connect ${h(p.name)}`}</button>
        </div>`).join('')}
        <p class="tiny muted" style="margin:0">Disconnecting forgets your tokens immediately and schedules removal of that provider's imported references within 7 days.</p>
      </div></div>`;
  },
});

/* ---- Builder ---- */

V({
  id: 'builder-workbench', group: 'Builder', title: 'Builder workbench', ids: ['BLD-01', 'BLD-04'], badges: ['P0-07', 'P1-07'],
  note: 'Structurally preserved — the shipped Builder hierarchy is good. The changes are the never-flat Pulse, one vocabulary for opening a class, and a mobile column that stacks rather than compresses.',
  evidence: 'BLD-01-builder-desktop.jpg', compare: 'BLD-01-builder-desktop.jpg',
  states: ['Sequential', 'Free placement'],
  render: (state) => {
    const free = state === 'Free placement';
    const tracks = free ? SUNRISE_TRACKS.slice(0, 5).map((t, i) => ({ ...t, n: i + 1, bpm: [98, 104, 110, 102, 94][i], z: [1, 2, 3, 2, 1][i] })) : SUNRISE_TRACKS;
    const c = free ? CLASSES.find((x) => x.id === 'slow') : CLASSES[0];
    return shell('Classes', `<div class="split-r" style="--rail:300px">
      <div class="stack">
        <div class="spread">
          <div><h2 class="screen-title" style="font-size:26px">${h(c.short ?? c.title)}</h2>
          <p class="mono-sm" style="margin:2px 0 0">${h(c.template)} · ${c.tracks} tracks · ${h(c.dur)} · avg ${c.avgBpm} BPM${free ? ' · free placement' : ''}</p></div>
          <div class="row"><button class="btn btn-secondary btn-sm">Rehearsal view</button><button class="btn btn-primary">▶ Run live</button></div>
        </div>
        ${readiness(c)}
        ${pulse(c.zones)}
        ${free ? `<div class="card"><p class="eyebrow" style="margin:0 0 var(--s2)">Timeline</p>
          <div class="row" style="gap:2px;align-items:stretch;height:40px">
            <div style="flex:3;background:var(--zone-1);border-radius:var(--r-control)"></div>
            <div style="flex:4;background:var(--zone-2);border-radius:var(--r-control)"></div>
            <div style="flex:4;background:var(--zone-3);border-radius:var(--r-control)"></div>
            <div style="flex:1;background:repeating-linear-gradient(45deg,rgba(251,247,240,.18) 0 3px,transparent 3px 7px);border:1px dashed var(--border-strong);border-radius:var(--r-control)" title="45s silence"></div>
            <div style="flex:4;background:var(--zone-2);border-radius:var(--r-control)"></div>
            <div style="flex:3;background:var(--zone-1);border-radius:var(--r-control)"></div>
          </div>
          <p class="tiny muted" style="margin:var(--s2) 0 0">Hatched span = authored silence (0:45). Gaps are deliberate, not missing data.</p></div>` : ''}
        <div class="card" style="padding:var(--s2)">
          <div class="spread" style="padding:0 var(--s2) var(--s2)"><p class="eyebrow" style="margin:0">Run of show</p>
          <button class="btn btn-quiet btn-sm">+ Add music</button></div>
          ${tracks.map((t, i) => trackRow(t, { selected: i === 0 })).join('')}
        </div>
      </div>
      <aside class="stack">
        <div class="card stack">
          <div class="spread"><span style="font-weight:600">Baianá</span><span class="mono-sm">TRACK 1</span></div>
          <div><p class="eyebrow" style="margin:0 0 var(--s2)">Effort</p>
          <div class="segmented">${[0, 1, 2, 3, 4].map((z) => `<button class="seg" aria-pressed="${z === 1}"><span class="zn">Z${z}</span><span class="zw">${ZONE_WORD[z]}</span></button>`).join('')}</div></div>
          <div class="grid2">
            <div><p class="mono-sm" style="margin:0 0 4px">DISPLAY BPM</p>
            <input class="data" value="112" style="width:100%;min-height:44px;border-radius:var(--r-input);border:1px solid var(--border-default);background:var(--bg-sunken);color:inherit;padding:0 var(--s3)"></div>
            <div><p class="mono-sm" style="margin:0 0 4px">DURATION</p>
            <input class="data" value="3:00" style="width:100%;min-height:44px;border-radius:var(--r-input);border:1px solid var(--border-default);background:var(--bg-sunken);color:inherit;padding:0 var(--s3)"></div>
          </div>
          <button class="btn btn-quiet" style="justify-content:flex-start;padding:0">Advanced timing and placement ▸</button>
        </div>
      </aside>
    </div>`);
  },
});

V({
  id: 'builder-inspector', group: 'Builder', title: 'Inspector — essentials & advanced', ids: ['BLD-02', 'BLD-03', 'BLD-05', 'BLD-06', 'BLD-14', 'BLD-15', 'BLD-16'], badges: ['P1-01'],
  note: 'Essentials first, advanced disclosed. The intensity control returns to the canon treatment: neutral fill with a cyan indicator, zone number separated from the word, and no orphaned "All Out" row. Save now terminates the form it saves.',
  evidence: 'BLD-02-inspector-desktop.jpg', compare: 'BLD-02-inspector-desktop.jpg',
  unverified: 'BLD-15 (preview resume failed) and BLD-16 (clip complete) could not be induced — the local mock seam has no resume-failure path and headless playback does not progress audio. Both panels below are proposals.',
  render: () => shell('Classes', `<div style="max-width:760px" class="stack">
    <div class="card stack">
      <div class="spread"><span style="font-weight:600">Baianá</span><span class="mono-sm">TRACK 1 · SoundCloud</span></div>
      <div><p class="eyebrow" style="margin:0 0 var(--s2)">Effort</p>
      <div class="segmented">${[0, 1, 2, 3, 4].map((z) => `<button class="seg" aria-pressed="${z === 1}"><span class="zn">Z${z}</span><span class="zw">${ZONE_WORD[z]}</span></button>`).join('')}</div></div>
      <div class="grid3">
        <div><p class="mono-sm">DISPLAY BPM</p><div class="data" style="font-size:22px">112</div></div>
        <div><p class="mono-sm">DURATION</p><div class="data" style="font-size:22px">3:00</div></div>
        <div><p class="mono-sm">CLIP WINDOW</p><div class="data" style="font-size:22px">— </div></div>
      </div>
      <div><p class="mono-sm">CUES</p>
        <div class="spread" style="border:1px solid var(--border-subtle);border-radius:var(--r-control);padding:var(--s2) var(--s3)">
          <span class="data tiny">0:00</span><span style="flex:1;margin:0 var(--s3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Settle in — find the beat, shoulders down, eyes up.</span>
          <button class="btn btn-quiet btn-sm">Edit</button></div>
      </div>
      <details><summary style="cursor:pointer;color:var(--interactive);font-size:13.5px">Advanced timing and placement</summary>
        <div class="grid3" style="margin-top:var(--s3)">
          <div><p class="mono-sm">RPM</p><div class="data">—</div><p class="tiny muted">Cadence — not derived from BPM</p></div>
          <div><p class="mono-sm">HOLDS</p><div class="data">—</div><p class="tiny muted">Hold count for this track</p></div>
          <div><p class="mono-sm">DOWNBEAT</p><div class="data">m:ss</div><p class="tiny muted">Sets the 112 BPM grid (4/4)</p></div>
        </div></details>
      <div class="row" style="border-top:1px solid var(--border-subtle);padding-top:var(--s3)">
        <button class="btn btn-primary btn-sm">Save track</button><button class="btn btn-danger btn-sm">⊘ Remove track</button></div>
    </div>
    <div class="card stack">
      <p class="eyebrow" style="margin:0">Selected-track preview</p>
      <div class="spread"><div><div style="font-weight:600">Baianá</div><span class="mono-sm">SoundCloud · 0:42 / 3:00 · clip 0:00–3:00</span></div>
      <span class="live-chip" style="color:var(--interactive)">▶ Now playing</span></div>
      <div class="row"><button class="btn btn-primary btn-sm">⏸ Pause</button><button class="btn btn-secondary btn-sm">■ Stop</button></div>
      <div class="statepanel stack" style="padding:var(--s3)">
        <span class="statelabel caution"><span class="g">!</span>Preview could not resume</span>
        <p class="muted tiny" style="margin:0">SoundCloud stopped responding. Your clip window is unchanged.</p>
        <div class="row"><button class="btn btn-secondary btn-sm">Try again</button><button class="btn btn-quiet btn-sm">Reconnect SoundCloud</button></div>
      </div>
      <div class="row"><span class="statelabel ok"><span class="g">✓</span>Clip complete</span>
      <span class="tiny muted">Played 0:00–3:00, the full authored window.</span></div>
    </div>
  </div>`),
});

V({
  id: 'builder-addmusic', group: 'Builder', title: 'Add music', ids: ['BLD-07', 'BLD-08', 'BLD-09', 'BLD-10'], badges: ['P0-01', 'P0-08'],
  note: 'The identical source-list component the Music workspace uses, with the destination named before the action. The saved-playlists empty message appears once.',
  evidence: 'BLD-07-addmusic-desktop.jpg', compare: 'BLD-07-addmusic-desktop.jpg',
  render: () => `<div class="app" style="padding:var(--s6);display:grid;place-items:center">
    <div class="dialog stack" style="max-width:720px;width:100%">
      <div class="dialog-head"><div><h3>Add music</h3>
      <p class="mono-sm" style="margin:4px 0 0">DESTINATION · Sunrise Climb</p></div><button class="btn btn-quiet">✕</button></div>
      <div class="row" style="gap:var(--s2)">
        <button class="state-btn" aria-pressed="true">Search</button><button class="state-btn">My likes</button>
        <button class="state-btn">Saved playlists</button><button class="state-btn">Import URL</button></div>
      <div class="card" style="padding:var(--s2)">${CATALOG.slice(0, 4).map((t, i) => srcRow(t, { selected: i === 0 })).join('')}</div>
      <div class="card" style="padding:var(--s3)"><span class="statelabel muted"><span class="g">○</span>No saved playlists on this account</span>
      <p class="tiny muted" style="margin:var(--s2) 0 0">Import one by URL, or link another provider.</p></div>
      <div class="tray"><span class="data">1 selected</span><span style="flex:1"></span>
      <button class="btn btn-primary btn-sm">Add to Sunrise Climb</button></div>
    </div></div>`,
});

V({
  id: 'builder-moves', group: 'Builder', title: 'Moves', ids: ['BLD-11', 'BLD-12', 'BLD-13'], badges: ['P1-04'],
  note: 'Moves are grouped by discipline with the open class\'s template first and other disciplines collapsed — visible, not hidden (PDR-03). Custom moves are their own group.',
  evidence: 'BLD-11-custom-moves-desktop.jpg', compare: 'BLD-12-songs-by-move-desktop.jpg',
  render: () => `<div class="app" style="padding:var(--s6);display:grid;place-items:center">
    <div class="dialog stack" style="max-width:640px;width:100%">
      <div class="dialog-head"><div><h3>Add a move</h3>
      <p class="muted tiny" style="margin:4px 0 0">Sunrise Climb is a <b>Cycle</b> class.</p></div><button class="btn btn-quiet">✕</button></div>
      <div class="card stack" style="gap:var(--s2)">
        <p class="eyebrow" style="margin:0">Cycle · 15 moves</p>
        <div class="row" style="gap:6px">${['Climb', 'Jumps', 'Push', 'Sprint', 'Sprint Hold', 'Tap Back', 'Recovery', 'Run']
          .map((m) => `<button class="state-btn" aria-pressed="${m === 'Climb'}">${m}</button>`).join('')}</div>
        <p class="tiny muted" style="margin:0">"Sprint", "Sprint Hold", and "Sprint on a Hill" differ by duration — hover any move for its description.</p>
      </div>
      <div class="card stack" style="gap:var(--s2)">
        <p class="eyebrow" style="margin:0">Your custom moves · 1</p>
        <div class="spread"><div><span style="font-weight:600">Hover Pulse</span>
        <p class="tiny muted" style="margin:2px 0 0">Hover just off the saddle and pulse on the half beat.</p></div>
        <button class="btn btn-secondary btn-sm">Place</button></div>
      </div>
      <details><summary style="cursor:pointer;color:var(--interactive);font-size:13.5px">Other disciplines (HIIT · Pilates)</summary>
        <p class="tiny muted" style="margin-top:var(--s2)">Borrowing across disciplines stays available — it is demoted, never hidden.</p></details>
      <div class="card stack" style="gap:var(--s2)">
        <p class="eyebrow" style="margin:0">Songs you have taught "Climb" with</p>
        <div class="spread"><div><span style="font-weight:600">Baianá</span> <span class="muted tiny">Bakermat</span>
        <p class="mono-sm" style="margin:2px 0 0">Sunrise Climb · at 0:30</p></div>
        <button class="btn btn-secondary btn-sm">Start a class</button></div>
      </div>
    </div></div>`,
});

/* ---- Live ---- */

V({
  id: 'live-queue', group: 'Live', title: 'Live queue', ids: ['LIVE-01'], badges: ['P0-02', 'P0-03', 'P0-07', 'P1-03'],
  note: 'A scan surface, not four stacked detail pages. Each class is one row: shape, verdict, one action. Readiness detail is one disclosure away. Four classes are visible at once instead of 1.7.',
  evidence: 'LIVE-01-queue-desktop.jpg', compare: 'LIVE-01-queue-desktop.jpg',
  render: () => shell('Live', `<div class="split-r" style="--rail:280px">
    <div>
      <p class="eyebrow">Live queue</p>
      <h2 class="screen-title">What are you teaching next?</h2>
      <p class="screen-sub">Ordered by readiness to teach. Scan, then enter preflight.</p>
      <div class="stack" style="margin-top:var(--s4)">
        ${['sunrise', 'heat', 'slow', 'tue'].map((id) => {
          const c = CLASSES.find((x) => x.id === id);
          return `<div class="card" style="padding:var(--s3)">
            <div class="row" style="gap:var(--s4);align-items:center">
              <span class="statelabel ok" style="min-width:104px"><span class="g">✓</span>${h(c.verdict)}</span>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(c.short ?? c.title)}</div>
                <span class="mono-sm">${h(c.template)} · ${c.tracks} tracks · ${h(c.dur)}</span>
              </div>
              <div style="width:150px">${pulse(c.zones, { sm: true, confirmable: false, cap: ' ' })}</div>
              <span class="data" style="font-size:17px">${h(c.dur)}</span>
              <button class="btn btn-secondary btn-sm">Edit</button>
              <button class="btn btn-primary btn-sm">Preflight</button>
            </div>
            <details style="margin-top:var(--s2)"><summary style="cursor:pointer;font-size:12.5px;color:var(--interactive)">${c.gaps} to finish</summary>
            <div style="margin-top:var(--s2)">${readiness(c)}</div></details>
          </div>`;
        }).join('')}
      </div>
    </div>
    <aside class="card stack" style="align-self:start">
      <p class="eyebrow" style="margin:0">Queue readiness</p>
      ${[['Runnable', '4 of 4'], ['Needs a duration', '0'], ['Music', 'All linked']].map(([t, v]) =>
        `<div><p class="mono-sm" style="margin:0">${t.toUpperCase()}</p><div class="data" style="font-size:22px">${v}</div></div>`).join('')}
    </aside>
  </div>`),
});

V({
  id: 'live-preflight', group: 'Live', title: 'Preflight', ids: ['LIVE-02'], badges: [],
  note: 'Preserved. Per-track verdicts with the fix inline, and the prompter-only path presented as a capability rather than a fallback — already correct in the shipped build.',
  evidence: 'LIVE-02-preflight-desktop.jpg', compare: 'LIVE-02-preflight-desktop.jpg',
  render: () => `<div class="app" style="padding:var(--s6)"><div class="stack" style="max-width:760px;margin:0 auto">
    <p class="eyebrow">Preflight · Sunrise Climb</p>
    <h2 class="screen-title" style="font-size:26px">Check playback before the room fills.</h2>
    <div class="card stack" style="gap:var(--s2)">
      ${SUNRISE_TRACKS.slice(0, 5).map((t, i) => `<div class="spread">
        <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.n}. ${h(t.t)}</span>
        <span class="pstate ${i === 3 ? 'warn' : 'ok'}">${i === 3 ? '⊘ No connected provider can play this' : `✓ Plays on ${h(t.p)}`}</span>
      </div>`).join('')}
    </div>
    <div class="statepanel stack">
      <span class="statelabel caution"><span class="g">!</span>1 track cannot play</span>
      <p class="safety">The class still runs. Prompter-only keeps every cue, timer, and effort reading intact.</p>
      <div class="row"><button class="btn btn-secondary">Manage connections</button><button class="btn btn-primary">Run without music</button></div>
    </div>
    <p class="tiny muted">Apple Music connects here without leaving preflight. Spotify and SoundCloud authorization open a provider page; when you return, reopen this class in Live.</p>
  </div></div>`,
});

const liveHUD = (mode) => {
  const paused = mode === 'Paused';
  const failed = mode === 'Playback failed';
  return `<div class="live">
    <div class="live-top">
      <div><span class="lbl">${failed ? 'Playback error' : paused ? 'Paused' : 'Now teaching'} · Track 7 of 10</span>
      <div class="cls">Sunrise Climb</div></div>
      <span class="clock data">21:14 / 35:57</span>
      <span style="flex:1"></span>
      <button class="state-btn" aria-pressed="true">Cue-by-Cue</button><button class="state-btn">Full list</button>
      <button class="btn btn-secondary btn-sm">Exit</button>
    </div>
    <div class="live-body">
      <div class="live-hero">
        <span class="cuelabel">Current cue</span>
        <p class="cue">Last thirty — empty the tank, then recover tall.</p>
        <p class="track">♫ Sun Is Shining · Axwell Ingrosso</p>
        ${failed ? `<div class="statepanel stack" style="background:transparent;border-color:var(--danger)">
          <span class="statelabel danger"><span class="g">⚠</span>Playback stopped</span>
          <p class="muted" style="margin:0">SoundCloud stopped responding. The class clock and every cue keep running.</p>
          <div class="row"><button class="btn btn-primary btn-sm">Retry playback</button><button class="btn btn-secondary btn-sm">Continue without music</button></div>
        </div>` : ''}
        <div class="live-next">
          <div><span class="nx">Next cue</span><div class="nxt">Recover tall — 0:24</div></div>
          <div style="text-align:right"><div class="bpm-hero">142</div><span class="bpm-unit">BPM · All Out</span></div>
        </div>
      </div>
      <div class="live-side">
        <div class="live-tile"><span class="t">Track left</span><div class="v">0:41</div></div>
        <div class="live-tile"><span class="t">Class left</span><div class="v">14:43</div></div>
        <div class="live-tile"><span class="t">Effort</span><div style="margin-top:6px">${zone(4)}</div></div>
        <div class="live-tile">${pulse(CLASSES[0].zones, { sm: true, confirmable: false, cap: ' ' })}</div>
      </div>
    </div>
    <div class="live-transport">
      <button class="btn btn-primary">${paused ? '▶ Resume' : '⏸ Pause'}</button>
      <button class="btn btn-secondary">Reset</button>
      <span class="live-chip">${failed ? '⚠ Playback error' : paused ? '♪ Paused' : '♪ SoundCloud'}</span>
      <span class="live-chip">⊘ Screen may dim</span>
    </div>
  </div>`;
};

V({
  id: 'live-run', group: 'Live', title: 'Live runtime', ids: ['LIVE-03', 'LIVE-04', 'LIVE-05', 'LIVE-09'], badges: ['P0-04', 'P2-01'],
  note: 'Every supporting label steps from text/tertiary to text/secondary on the Live ground: measured 11.30:1 against the AAA target of 7:1, where the shipped build measures 5.84–6.79:1. The next cue and time-to-next now occupy space the current build leaves empty.',
  evidence: 'LIVE-04-run-active-dense-desktop.jpg', compare: 'LIVE-04-run-active-dense-desktop.jpg',
  states: ['Running', 'Paused', 'Playback failed'],
  frameClass: 'live',
  unverified: 'LIVE-09 (runtime playback failure) could not be induced: the fixture class runs prompter-only, so no provider stream was ever requested and no failure surface appeared. The "Playback failed" state below is a proposal.',
  render: (state) => liveHUD(state),
});

V({
  id: 'live-run-of-show', group: 'Live', title: 'Full run of show', ids: ['LIVE-06'], badges: ['P0-04'],
  note: 'The whole class as one scannable score, at Live contrast. Long titles truncate without pushing the numbers out of alignment.',
  evidence: 'LIVE-06-run-of-show-desktop.jpg', compare: 'LIVE-06-run-of-show-desktop.jpg',
  frameClass: 'live',
  render: () => `<div class="live">
    <div class="live-top"><div><span class="lbl">Full list · Track 7 of 10</span><div class="cls">Sunrise Climb</div></div>
    <span class="clock data">21:14 / 35:57</span><span style="flex:1"></span>
    <button class="state-btn">Cue-by-Cue</button><button class="state-btn" aria-pressed="true">Full list</button>
    <button class="btn btn-secondary btn-sm">Exit</button></div>
    <div style="padding:var(--s5)">
      ${SUNRISE_TRACKS.map((t) => `<div class="trackrow" data-selected="${t.n === 7}" style="border-color:var(--border-subtle)">
        <span class="pos">${t.n}</span><span class="art">♪</span>
        <span style="min-width:0"><span style="font-weight:600;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(t.t)}</span>
        <span style="font-size:12.5px;color:var(--live-label);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(t.a)}</span></span>
        ${zone(t.z)}
        <span class="data">${t.bpm ?? '—'}</span>
        <span class="data" style="color:var(--live-label)">${h(t.d)}</span>
      </div>`).join('')}
    </div></div>`,
});

/* ---- Account ---- */

V({
  id: 'account', group: 'Account', title: 'Account', ids: ['ACC-01', 'ACC-02'], badges: ['P1-05', 'P0-06'],
  note: 'The provider ledger is reused verbatim from Music so connection truth cannot diverge. "Profile verified" is replaced by what the system actually knows: the profile loaded, and the email is not yet verified.',
  evidence: 'ACC-01-account-disconnected-desktop.jpg', compare: 'ACC-01-account-disconnected-desktop.jpg',
  render: () => shell('Account', `<div class="split" style="--rail:200px">
    <aside><p class="eyebrow">Account</p>
      <div class="rail">${['Profile', 'Preferences', 'Music connections', 'Security'].map((x, i) =>
        `<button class="rail-item" aria-pressed="${i === 0}"><span class="grow">${x}</span></button>`).join('')}</div></aside>
    <div class="stack">
      <div class="card stack">
        <div class="spread"><div><p class="eyebrow" style="margin:0">Personal workspace</p>
        <h2 class="screen-title" style="font-size:26px">Marisol Vega</h2>
        <p class="mono-sm" style="margin:0">marisol.audit@example.com</p></div>
        <span class="statelabel caution"><span class="g">!</span>Email not verified</span></div>
        <p class="tiny muted" style="margin:0">Verify your email so password recovery can reach you. <button class="btn btn-quiet btn-sm" style="min-height:0;padding:0">Resend link</button></p>
      </div>
      <div class="card stack">
        <p class="eyebrow" style="margin:0">Music connections</p>
        <p class="tiny muted" style="margin:0">Catalog, library, and playback remain separate capabilities.</p>
        ${PROVIDERS.mixed.map((p) => `<div class="spread" style="border-top:1px solid var(--border-subtle);padding-top:var(--s2)">
          <span style="font-weight:600">${h(p.name)}</span><span class="pstate ${p.state}">${h(p.label)}</span>
          <button class="btn btn-secondary btn-sm">${p.state === 'ok' ? `Disconnect ${h(p.name)}` : p.state === 'warn' ? `Reconnect ${h(p.name)}` : `Connect ${h(p.name)}`}</button>
        </div>`).join('')}
      </div>
    </div></div>`),
});
