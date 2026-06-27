# Design-system consistency

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing you do survives unless it is committed and pushed**: push any
> branch and draft PR to the remote, and commit every report into the git-tracked
> `agent-reports/`. No human is watching in real time — never block on interactive input;
> decisions that belong to the owner become written recommendations.

> **Follow the house rules first:**
> `agent-prompts/remote-prompts/00-house-rules.md`

**REPO:** `ritmofit-web`

**Use when:** UI implementation may have drifted from tokens, components, typography, states, or
cross-platform design guidance.
**Do not use when:** the main concern is WCAG-level interaction or assistive-technology behavior;
use `accessibility.md` instead.

Canonical source is the in-repo `ritmofit_design_system`, especially `README.md`,
`03-typography.md`, and `tokens.json`. Read those for the live values rather than trusting
any font/color names quoted here. Fix:
- Hardcoded hex / spacing / font values that should be tokens.
- Wrong fonts: confirm UI / display / data faces against `tokens.json` +
  `03-typography.md` (currently Sora UI, Bricolage Grotesque display, Azeret Mono data)
  rather than hardcoding a face the docs have since moved off.
- Components drifting from the canonical reference; inconsistent radii / shadows;
  missing states (hover / focus / disabled / empty / loading).
- a11y basics: alt / labels, contrast, focus order, semantic markup.
- `success` must read **cyan**, not green.

The cross-platform target lives in `ritmofit_design_system/08-ios-web-alignment.md`; when
you touch shared tokens, flag any drift it introduces for the iOS client rather than
silently diverging — but do not edit the iOS repo from here.

Do not infer visual correctness from source alone. For a visible change, launch the
surface and capture a browser screenshot, then compare the rendered result with the
canonical guidance. If runtime inspection is blocked, report the limitation and do not
open a visual PR. One PR per component or token family; include before/after screenshots
or a precise reason screenshots were impossible.
