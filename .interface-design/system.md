# Ritmo Studio interface memory

Last updated: 2026-07-19

This file preserves reusable interface decisions for design sessions. The canonical design system in
`ritmofit_design_system/` and written product decisions remain authoritative if this summary drifts.

## Direction and feel

- Design for an individual rhythm-fitness instructor building, rehearsing, and preparing to teach a
  class. The interface should feel like a focused creator workbench, not a generic admin dashboard.
- Protect the instructor's place in the creative loop. Recovery language should say what happened,
  distinguish saved server state from possibly unsaved view state, and make the safe next action obvious.
- Favor faster class building, familiar music-workstation structure, and calm operational clarity over
  ornamental polish.
- Use studio vocabulary when it improves comprehension: score, cue, count-in, rehearsal, playback,
  workbench, and beat. Do not force metaphors into routine labels.
- Signature: **preserve the beat**. Loading and recovery states should visibly help instructors regain
  their place in the class workbench rather than dropping them into a generic spinner or error page.

## Visual system

- Color world: espresso/warm ink and bone form the working environment; copper marks the primary action;
  cyan marks interaction, focus, and confirmed truth; amber marks caution; ember marks danger. Always use
  semantic tokens rather than raw values, and never rely on color alone.
- Depth strategy: border-led, with quiet stepped surfaces (`base` → `raised` → `overlay`). Use subtle or
  default borders for structure and reserve strong borders for meaningful emphasis. Avoid decorative
  gradients and competing shadows on operational states.
- Spacing: use the existing 4px grid. Keep operable controls at least 44×44px.
- Typography: Bricolage Grotesque for expressive display headings, Sora for UI and prose, and Azeret Mono
  for measured or data-like values. Typography should reinforce hierarchy without adding extra chrome.

## Shared state patterns

### Status labels

- Every status combines a glyph with a visible text label; semantic color only reinforces the meaning.
- Supported shared kinds are `loading`, `empty`, `unavailable`, `error`, `update`, `disabled`, `retrying`,
  and `recovered`.
- A status label is not independently live. Its owning surface decides whether the complete message is a
  polite status or an urgent alert so assistive technology receives one coherent announcement.

### Recovery surfaces

- Keep this reading order: what happened → data-safety statement → primary recovery action → secondary
  escape or deferral action.
- State saved and unsaved consequences precisely. Never promise that unsaved view state survived.
- Give the safe recovery action copper-primary treatment. Keep dismiss, defer, or escape actions
  subordinate but clearly available.
- Use `role="status"` with polite announcements for non-urgent update/retry states and `role="alert"` for
  render failures that need immediate attention.

### Workspace loading

- Use a workspace-shaped skeleton that preserves the expected class-workbench rhythm instead of fake
  content or an isolated spinner.
- Give the surface a named loading label, `aria-busy="true"`, and one polite live region. Hide decorative
  placeholders from assistive technology.
- Loading remains understandable without animation and must respect reduced-motion preferences.

## Consistency checks

- Verify at 320px and 390px mobile widths plus a representative desktop width; no horizontal overflow.
- Exercise long and multilingual content, keyboard focus, 44px targets, reduced motion, and semantic
  announcements.
- Preserve the behavior behind recovery controls: reload, dismiss, retry, service-worker update, and
  authentication/session transitions must not change merely because their presentation is shared.
