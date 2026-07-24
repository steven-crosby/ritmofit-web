/* Ritmo Studio Proposed Navigable Prototype Logic
   Audit Run ID: gemini-design-audit-2026-07-24
   Agent: gemini
*/

(function() {
  const state = {
    currentDestination: 'classes',
    viewportMode: 'desktop', // 'desktop' | 'mobile'
    dataState: 'populated',  // 'populated' | 'empty' | 'error'
    showAnnotations: true,
    showComparison: false
  };

  const views = {
    classes: renderClassesView,
    music: renderMusicView,
    builder: renderBuilderView,
    live: renderLiveView,
    account: renderAccountView,
    auth: renderAuthView
  };

  function init() {
    setupEventListeners();
    render();
  }

  function setupEventListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dest = e.currentTarget.dataset.dest;
        if (dest) {
          state.currentDestination = dest;
          updateNavState();
          render();
        }
      });
    });

    document.getElementById('toggle-viewport')?.addEventListener('click', () => {
      state.viewportMode = state.viewportMode === 'desktop' ? 'mobile' : 'desktop';
      const btn = document.getElementById('toggle-viewport');
      btn.textContent = state.viewportMode === 'desktop' ? '📱 Mobile 390px' : '🖥️ Desktop';
      document.querySelector('.main-viewport').classList.toggle('mobile-view', state.viewportMode === 'mobile');
    });

    document.getElementById('toggle-state')?.addEventListener('click', () => {
      const states = ['populated', 'empty', 'error'];
      const nextIndex = (states.indexOf(state.dataState) + 1) % states.length;
      state.dataState = states[nextIndex];
      document.getElementById('toggle-state').textContent = `State: ${state.dataState.toUpperCase()}`;
      render();
    });

    document.getElementById('toggle-annotations')?.addEventListener('click', () => {
      state.showAnnotations = !state.showAnnotations;
      document.body.classList.toggle('hide-annotations', !state.showAnnotations);
    });

    document.getElementById('toggle-comparison')?.addEventListener('click', () => {
      state.showComparison = !state.showComparison;
      document.getElementById('comparison-drawer').classList.toggle('active', state.showComparison);
    });
  }

  function updateNavState() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.dest === state.currentDestination);
    });
  }

  function render() {
    const mainEl = document.getElementById('prototype-content');
    if (!mainEl) return;
    
    const renderFn = views[state.currentDestination] || renderClassesView;
    mainEl.innerHTML = renderFn(state);
    
    // Attach inside-view action handlers
    attachViewHandlers();
  }

  function renderClassesView(s) {
    if (s.dataState === 'empty') {
      return `
        <div style="text-align: center; padding: 64px 16px;">
          <div style="font-size: 3rem; margin-bottom: 16px;">🚴</div>
          <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">No Classes Built Yet</h2>
          <p style="color: var(--text-muted); max-width: 440px; margin: 0 auto 24px;">Start your creator flow by picking a discipline template, importing a provider playlist, or starting from a hero track.</p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="btn-primary" onclick="window.setDestination('builder')">+ Create Cycle Class</button>
            <button class="btn-secondary" onclick="window.setDestination('music')">Browse Saved Playlists</button>
          </div>
        </div>
      `;
    }

    if (s.dataState === 'error') {
      return `
        <div style="text-align: center; padding: 64px 16px;">
          <div style="font-size: 3rem; margin-bottom: 16px; color: var(--accent-crimson);">⚠️</div>
          <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">Failed to Load Library</h2>
          <p style="color: var(--text-muted); margin-bottom: 24px;">Network query failed. Local data cache unavailable.</p>
          <button class="btn-secondary" onclick="window.location.reload()">Retry Connection</button>
        </div>
      `;
    }

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em;">Classes Library</h1>
          <p style="color: var(--text-muted);">Manage, choreograph, and launch your active rhythm classes.</p>
        </div>
        <button class="btn-primary" onclick="window.setDestination('builder')">+ New Class ${s.showAnnotations ? '<span class="annotation-tag">P0-03</span>' : ''}</button>
      </div>

      <div class="card-grid">
        <div class="ritmo-card">
          <div class="card-header">
            <div>
              <span class="badge badge-amber">Cycle • 45 Min</span>
              <h3 class="card-title" style="margin-top: 6px;">Underground Techno Ride</h3>
            </div>
            <span class="badge badge-cyan">Ready</span>
          </div>
          <p class="card-subtitle">12 Tracks • 138 Avg BPM • High Intensity</p>
          
          <div class="energy-ribbon">
            <svg class="waveform-svg" viewBox="0 0 300 32" preserveAspectRatio="none">
              <path d="M0,20 Q30,5 60,18 T120,10 T180,25 T240,8 T300,20" fill="none" stroke="var(--accent-amber)" stroke-width="2"/>
            </svg>
            <div class="cue-pin" style="left: 20%;"><span class="cue-label">CLIMB</span></div>
            <div class="cue-pin" style="left: 65%;"><span class="cue-label">SPRINT</span></div>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button class="btn-primary" style="flex: 1; justify-content: center; font-size: 0.85rem;" onclick="window.setDestination('builder')">Choreograph</button>
            <button class="btn-secondary" style="font-size: 0.85rem;" onclick="window.setDestination('live')">Run Live</button>
          </div>
        </div>

        <div class="ritmo-card">
          <div class="card-header">
            <div>
              <span class="badge badge-cyan">Pilates • 50 Min</span>
              <h3 class="card-title" style="margin-top: 6px;">Deep Core & Sculpt Flow</h3>
            </div>
            <span class="badge badge-amber">Draft</span>
          </div>
          <p class="card-subtitle">9 Tracks • 112 Avg BPM • Moderate Flow</p>
          
          <div class="energy-ribbon">
            <svg class="waveform-svg" viewBox="0 0 300 32" preserveAspectRatio="none">
              <path d="M0,25 Q40,15 80,20 T160,12 T240,18 T300,22" fill="none" stroke="var(--accent-cyan)" stroke-width="2"/>
            </svg>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button class="btn-primary" style="flex: 1; justify-content: center; font-size: 0.85rem;" onclick="window.setDestination('builder')">Edit Choreography</button>
          </div>
        </div>

        <div class="ritmo-card">
          <div class="card-header">
            <div>
              <span class="badge badge-crimson">HIIT • 30 Min</span>
              <h3 class="card-title" style="margin-top: 6px;">Maximum Cadence Sprint</h3>
            </div>
            <span class="badge badge-cyan">Ready</span>
          </div>
          <p class="card-subtitle">8 Tracks • 150 Avg BPM • Peak Effort</p>
          
          <div class="energy-ribbon">
            <svg class="waveform-svg" viewBox="0 0 300 32" preserveAspectRatio="none">
              <path d="M0,15 Q25,2 50,28 T100,5 T150,25 T200,2 T300,15" fill="none" stroke="var(--accent-crimson)" stroke-width="2"/>
            </svg>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button class="btn-primary" style="flex: 1; justify-content: center; font-size: 0.85rem;" onclick="window.setDestination('builder')">Choreograph</button>
            <button class="btn-secondary" style="font-size: 0.85rem;" onclick="window.setDestination('live')">Run Live</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderMusicView(s) {
    return `
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.8rem; font-weight: 800;">Music Substrate Workspace ${s.showAnnotations ? '<span class="annotation-tag">P1-02</span>' : ''}</h1>
        <p style="color: var(--text-muted);">Browse Spotify, Apple Music, and SoundCloud playlists or search tracks to convert into a class.</p>
      </div>

      <div style="display: flex; gap: 12px; margin-bottom: 20px;">
        <input type="text" placeholder="Search tracks, artists, or BPM..." style="flex: 1; background: var(--bg-raised); border: 1px solid var(--border-medium); padding: 12px 16px; border-radius: var(--radius-md); color: var(--text-primary);" value="Techno Rhythm 138 BPM" />
        <button class="btn-primary">Search</button>
      </div>

      <h3 style="font-size: 1.1rem; font-weight: 700; margin: 24px 0 12px;">Discovered Tracks & Provider Audio Windows</h3>
      
      <div class="track-row">
        <div class="track-info">
          <span class="track-number">01</span>
          <div class="track-meta">
            <span class="track-title">Kinetic Energy (Original Mix)</span>
            <span class="track-artist">SoundCloud Provider • Electronic</span>
          </div>
        </div>
        <div class="track-metrics">
          <span class="bpm-tag">138 BPM</span>
          <span>3:45</span>
          <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.75rem;">▶ Audition Clip</button>
          <button class="btn-primary" style="padding: 6px 12px; font-size: 0.75rem;" onclick="window.setDestination('builder')">+ Add to Class</button>
        </div>
      </div>

      <div class="track-row">
        <div class="track-info">
          <span class="track-number">02</span>
          <div class="track-meta">
            <span class="track-title">Sub-Bass Resistance</span>
            <span class="track-artist">Spotify Premium SDK • Techno</span>
          </div>
        </div>
        <div class="track-metrics">
          <span class="bpm-tag">140 BPM</span>
          <span>4:12</span>
          <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.75rem;">▶ Audition Clip</button>
          <button class="btn-primary" style="padding: 6px 12px; font-size: 0.75rem;" onclick="window.setDestination('builder')">+ Add to Class</button>
        </div>
      </div>
    `;
  }

  function renderBuilderView(s) {
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <span class="badge badge-amber">Cycle Workstation</span>
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-top: 4px;">Underground Techno Ride ${s.showAnnotations ? '<span class="annotation-tag">P0-02</span>' : ''}</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" onclick="window.setDestination('music')">+ Add Track</button>
          <button class="btn-primary" onclick="window.setDestination('live')">🚀 Preflight & Run Live</button>
        </div>
      </div>

      <div style="background: var(--bg-raised); border: 1px solid var(--border-medium); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
        <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px;">CLASS ENERGY ARC & CHOREOGRAPHY TIMELINE</h3>
        <div class="energy-ribbon" style="height: 64px;">
          <svg class="waveform-svg" viewBox="0 0 600 48" preserveAspectRatio="none">
            <path d="M0,35 Q60,10 120,30 T240,15 T360,40 T480,8 T600,30" fill="none" stroke="var(--accent-amber)" stroke-width="3"/>
          </svg>
          <div class="cue-pin" style="left: 15%; height: 56px;"><span class="cue-label">0:45 CLIMB</span></div>
          <div class="cue-pin" style="left: 45%; height: 56px; background: var(--accent-cyan);"><span class="cue-label" style="background: var(--accent-cyan);">2:10 TAP BACK</span></div>
          <div class="cue-pin" style="left: 80%; height: 56px; background: var(--accent-crimson);"><span class="cue-label" style="background: var(--accent-crimson);">3:50 MAX SPRINT</span></div>
        </div>
      </div>

      <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 12px;">Track Score & Cue Placement</h3>

      <div class="track-row" style="background: var(--bg-raised); border-color: var(--accent-amber);">
        <div class="track-info">
          <span class="track-number">01</span>
          <div class="track-meta">
            <span class="track-title">Kinetic Energy (Original Mix)</span>
            <span class="track-artist">Cues: Heavy Climb (0:45), Tap Back (2:10)</span>
          </div>
        </div>
        <div class="track-metrics">
          <span class="bpm-tag">138 BPM</span>
          <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.75rem;">Edit Cues</button>
        </div>
      </div>
    `;
  }

  function renderLiveView(s) {
    return `
      <div style="max-width: 800px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <span class="badge badge-crimson">LIVE STUDIO MODE ${s.showAnnotations ? '<span class="annotation-tag">P0-01</span>' : ''}</span>
            <h2 style="font-size: 1.5rem; font-weight: 800; margin-top: 4px;">Underground Techno Ride</h2>
          </div>
          <button class="btn-secondary" onclick="window.setDestination('classes')">Exit Live</button>
        </div>

        <div class="live-prompter-container">
          <div style="font-family: var(--font-mono); font-size: 1rem; color: var(--accent-cyan); font-weight: 700;">TRACK 01 OF 12 • 138 BPM</div>
          <div class="prompter-timer">00:42</div>
          <div class="prompter-cue">🔥 HEAVY STANDING CLIMB</div>
          <div class="prompter-next">NEXT CUE: TAP BACK TO THE BEAT (IN 00:18)</div>
          
          <div style="display: flex; gap: 16px; justify-content: center; margin-top: 32px;">
            <button class="btn-primary" style="font-size: 1.2rem; padding: 16px 36px;">⏸ PAUSE RUN</button>
            <button class="btn-secondary" style="font-size: 1.2rem; padding: 16px 28px;">⏭ NEXT CUE</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderAccountView(s) {
    return `
      <div style="max-width: 700px;">
        <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 24px;">Instructor Account & Music Connections ${s.showAnnotations ? '<span class="annotation-tag">P2-02</span>' : ''}</h1>

        <div class="ritmo-card" style="margin-bottom: 20px;">
          <h3 class="card-title">Profile & Workstation</h3>
          <p class="card-subtitle" style="margin-bottom: 16px;">Primary Discipline: Cycle & HIIT</p>
          <div style="font-size: 0.9rem; color: var(--text-secondary);">Instructor ID: dev-instructor-01</div>
        </div>

        <div class="ritmo-card">
          <h3 class="card-title" style="margin-bottom: 16px;">Music Service Authorization</h3>
          
          <div class="track-row" style="margin-bottom: 12px;">
            <div class="track-info">
              <span style="font-size: 1.2rem;">🟢</span>
              <div class="track-meta">
                <span class="track-title">SoundCloud Widget Integration</span>
                <span class="track-artist">Active • Public & User Catalog Authorized</span>
              </div>
            </div>
            <span class="badge badge-cyan">Connected</span>
          </div>

          <div class="track-row" style="margin-bottom: 12px;">
            <div class="track-info">
              <span style="font-size: 1.2rem;">🟢</span>
              <div class="track-meta">
                <span class="track-title">Spotify Web Playback SDK</span>
                <span class="track-artist">Active • Premium Playback Scopes Granted</span>
              </div>
            </div>
            <span class="badge badge-amber">Connected</span>
          </div>

          <div class="track-row">
            <div class="track-info">
              <span style="font-size: 1.2rem;">🟢</span>
              <div class="track-meta">
                <span class="track-title">Apple Music MusicKit API</span>
                <span class="track-artist">Active • User Token Valid</span>
              </div>
            </div>
            <span class="badge badge-cyan">Connected</span>
          </div>
        </div>
      </div>
    `;
  }

  function attachViewHandlers() {
    window.setDestination = function(dest) {
      state.currentDestination = dest;
      updateNavState();
      render();
    };
  }

  document.addEventListener('DOMContentLoaded', init);
})();
