/* Review shell: index, viewport switch, per-view state switch, annotation toggle,
   and current-screenshot comparison. The chrome never touches the proposed UI. */

import { VIEWS } from './views.js';

const GROUP_ORDER = ['System', 'Public', 'Classes', 'Music', 'Builder', 'Live', 'Account'];

const state = {
  viewport: 'desktop', // 'desktop' | 'mobile'
  annotations: true,
  perView: {}, // view id -> chosen state label
};

function buildIndex() {
  const nav = document.getElementById('index-nav');
  const groups = new Map();
  for (const v of VIEWS) {
    if (!groups.has(v.group)) groups.set(v.group, []);
    groups.get(v.group).push(v);
  }
  const ordered = [...groups.keys()].sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
  nav.innerHTML = ordered
    .map(
      (g) => `<div class="review-group"><p>${g}</p>${groups
        .get(g)
        .map((v) => `<a href="#${v.id}" data-id="${v.id}">${v.title}</a>`)
        .join('')}</div>`,
    )
    .join('');
}

function renderView(v) {
  const chosen = state.perView[v.id] ?? (v.states ? v.states[0] : null);
  const frameCls = `frame ${state.viewport === 'mobile' ? 'mobile' : ''} ${v.frameClass ?? ''}`;
  const badges = (v.badges ?? []).map((b) => `<span class="badge${b.startsWith('PDR') ? ' warn' : ''}">${b}</span>`).join('');
  const stateRow = v.states
    ? `<div class="state-row">${v.states
        .map((s) => `<button class="state-btn" data-view="${v.id}" data-state="${s}" aria-pressed="${s === chosen}">${s}</button>`)
        .join('')}</div>`
    : '';
  const unverified = v.unverified
    ? `<p class="unverified"><b>Current behaviour not verified in this run.</b> ${v.unverified}</p>`
    : '';
  const compare = v.compare
    ? `<details class="compare"><summary>Show the current screenshot this replaces (${v.compare})</summary>
        <img loading="lazy" src="../screenshots/current/${v.compare}" alt="Current ${v.title}"></details>`
    : '';
  return `<section class="view" id="${v.id}">
    <div class="view-head">
      <h2>${v.title}</h2>
      <div class="ids">${v.ids.map((i) => `<b>${i}</b>`).join(' · ')}</div>
      <div class="badges">${badges}</div>
      <p class="view-note">${v.note}</p>
      <p class="evidence">Current evidence: ${v.evidence}</p>
    </div>
    ${stateRow}
    ${unverified}
    <div class="${frameCls}">${v.render(chosen)}</div>
    ${compare}
  </section>`;
}

function renderAll() {
  document.getElementById('views').innerHTML = VIEWS.map(renderView).join('');
  document.body.classList.toggle('no-annotations', !state.annotations);
}

function wire() {
  document.getElementById('vp-desktop').addEventListener('click', () => {
    state.viewport = 'desktop';
    syncControls();
    renderAll();
  });
  document.getElementById('vp-mobile').addEventListener('click', () => {
    state.viewport = 'mobile';
    syncControls();
    renderAll();
  });
  document.getElementById('ann-toggle').addEventListener('click', () => {
    state.annotations = !state.annotations;
    syncControls();
    document.body.classList.toggle('no-annotations', !state.annotations);
  });

  // per-view state switches (delegated, so they survive re-render)
  document.getElementById('views').addEventListener('click', (e) => {
    const btn = e.target.closest('.state-btn[data-view]');
    if (!btn) return;
    state.perView[btn.dataset.view] = btn.dataset.state;
    const y = window.scrollY;
    renderAll();
    window.scrollTo(0, y);
  });

  // index highlighting
  const obs = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        document.querySelectorAll('#index-nav a').forEach((a) => a.classList.remove('active'));
        const link = document.querySelector(`#index-nav a[data-id="${en.target.id}"]`);
        if (link) link.classList.add('active');
      }
    },
    { rootMargin: '-10% 0px -80% 0px' },
  );
  setTimeout(() => document.querySelectorAll('.view').forEach((v) => obs.observe(v)), 100);
}

function syncControls() {
  document.getElementById('vp-desktop').setAttribute('aria-pressed', String(state.viewport === 'desktop'));
  document.getElementById('vp-mobile').setAttribute('aria-pressed', String(state.viewport === 'mobile'));
  document.getElementById('ann-toggle').setAttribute('aria-pressed', String(state.annotations));
}

buildIndex();
renderAll();
wire();
syncControls();

// Expose for the screenshot harness: select a view + state + viewport deterministically.
window.__preview = {
  setViewport(v) {
    state.viewport = v;
    syncControls();
    renderAll();
  },
  setState(viewId, s) {
    state.perView[viewId] = s;
    renderAll();
  },
  setAnnotations(on) {
    state.annotations = on;
    document.body.classList.toggle('no-annotations', !on);
  },
  views: VIEWS.map((v) => ({ id: v.id, ids: v.ids, states: v.states ?? null })),
};
