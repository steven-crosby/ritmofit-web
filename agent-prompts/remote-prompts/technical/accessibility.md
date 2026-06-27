# Accessibility (a11y) audit

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing you do survives unless it is committed and pushed**: push any
> branch and draft PR to the remote, and commit every report into the git-tracked
> `agent-reports/`. No human is watching in real time — never block on interactive input;
> decisions that belong to the owner become written recommendations.

> **Follow the house rules first:**
> `agent-prompts/remote-prompts/00-house-rules.md`

**REPO:** `ritmofit-web`

**Use when:** keyboard, screen reader, contrast, focus, semantics, or reduced-motion behavior needs
verification.
**Do not use when:** the concern is only token/component visual fidelity; start with
`design-system.md` instead.

Go deeper than the `design-system` pass. Audit the React/Vite SPA against WCAG 2.2 AA.

- Keyboard: full operability, visible focus rings, logical tab order, no focus traps,
  skip-links.
- Screen reader: semantic landmarks / headings, alt text, real form labels, ARIA only
  where native semantics fall short, live regions for async status (search / import).
- Contrast: text + UI against the espresso / cyan / plasma palette; never rely on color
  alone — esp. `success` = cyan, so pair it with an icon or label.
- Motion: honor `prefers-reduced-motion` on any animated / share-card / marketing flourish.

Open PRs for safe, isolated fixes (a missing label, a contrast-token swap). Anything that
reshapes a layout → report with a recommendation.

Source inspection alone is insufficient for claims about focus order, contrast, or
truncation. Exercise the reachable UI in a browser and attach evidence (the `web-perf` /
Chrome DevTools tooling helps here). If credentials block verification, report the exact
unverified claim instead of opening a visual/interaction PR.
