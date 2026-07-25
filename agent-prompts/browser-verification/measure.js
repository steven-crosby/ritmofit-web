// Injected into the page. Two traps this run must not fall into:
//
//  1. FOCUS — Tailwind's `outline-none` emits `outline: 2px solid transparent` and
//     draws the real ring with `box-shadow`. Reading only `outline` reports "no
//     focus ring" on controls that plainly have one. We read BOTH.
//
//  2. GRADIENT FILLS — the copper primary paints a `linear-gradient` with a
//     transparent `background-color`. A naive ancestor walk finds the page
//     background and reports ~1:1 for ink-on-copper. We expand every gradient
//     stop into its own candidate backdrop and keep the WORST ratio, because the
//     ink label rides the whole fill and its worst stop is what has to clear.
window.__measure = (() => {
  const parseColor = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };

  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });

  const lin = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const ratio = (a, b) => {
    const [x, y] = [lum(a) + 0.05, lum(b) + 0.05];
    return Math.max(x, y) / Math.min(x, y);
  };

  // Every paint layer between `el` and an opaque backdrop, innermost first.
  // A gradient contributes all of its colour stops.
  const layersOf = (el) => {
    const out = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const stops = [];
      if (cs.backgroundImage && /gradient/.test(cs.backgroundImage)) {
        for (const m of cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []) {
          const c = parseColor(m);
          if (c && c.a > 0) stops.push(c);
        }
      }
      const bc = parseColor(cs.backgroundColor);
      if (bc && bc.a > 0) stops.push(bc);
      if (stops.length) {
        out.push(stops);
        if (stops.some((s) => s.a === 1)) break;
      }
    }
    return out;
  };

  // Worst-case backdrops: composite outward, expanding gradient stops.
  const backdrops = (el) => {
    const layers = layersOf(el);
    if (!layers.length) return [{ r: 0, g: 0, b: 0, a: 1 }];
    let base = layers[layers.length - 1].find((s) => s.a === 1) || layers[layers.length - 1][0];
    for (let i = layers.length - 2; i >= 1; i--) {
      base = over(layers[i][0], base);
    }
    // The innermost layer is the one the text actually sits on — every stop counts.
    return layers[0].map((s) => over(s, base));
  };

  const visibleText = (root = document.body) =>
    [...root.querySelectorAll('*')].filter((el) => {
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return false;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false;
      if (el.classList.contains('sr-only')) return false;
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join('');
      if (!own) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

  return {
    // Contrast of every text node under `root`, worst backdrop per node.
    contrast(rootSel) {
      const root = rootSel ? document.querySelector(rootSel) : document.body;
      if (!root) return { error: 'root not found: ' + rootSel };
      return visibleText(root).map((el) => {
        const cs = getComputedStyle(el);
        const fgRaw = parseColor(cs.color);
        const bds = backdrops(el);
        const fg = fgRaw.a < 1 ? over(fgRaw, bds[0]) : fgRaw;
        const ratios = bds.map((b) => ratio(fg, b));
        const px = parseFloat(cs.fontSize);
        const bold = +cs.fontWeight >= 700;
        // WCAG "large": >=24px, or >=18.66px bold.
        const large = px >= 24 || (px >= 18.66 && bold);
        return {
          text: el.innerText.trim().slice(0, 46).replace(/\s+/g, ' '),
          tag: el.tagName.toLowerCase(),
          color: cs.color,
          fontPx: px,
          bold,
          large,
          backdrops: bds.map((b) => `rgb(${[b.r, b.g, b.b].map(Math.round).join(',')})`),
          ratio: +Math.min(...ratios).toFixed(2),
          need: large ? 4.5 : 7.0,
          pass: Math.min(...ratios) >= (large ? 4.5 : 7.0),
        };
      });
    },

    // Focus treatment of a control — BOTH channels, never one.
    focus(el) {
      const cs = getComputedStyle(el);
      return {
        outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
        outlineOffset: cs.outlineOffset,
        boxShadow: cs.boxShadow,
      };
    },

    horizontalOverflow() {
      return {
        docWidth: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        overflows: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    },

    // Animations still running over `overMs`. The Live runtime must report zero
    // under prefers-reduced-motion (10-rhythm-system §6).
    animations(overMs = 50) {
      return document
        .getAnimations()
        .map((a) => ({
          name: a.animationName || null,
          duration: a.effect ? a.effect.getComputedTiming().duration : null,
          target: a.effect && a.effect.target ? String(a.effect.target.className) : null,
        }))
        .filter((a) => typeof a.duration === 'number' && a.duration > overMs);
    },
  };
})();
