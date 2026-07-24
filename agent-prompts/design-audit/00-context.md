# Ritmo Studio full-product design preview: shared context

**Pack version:** 6
**Product name in review copy:** Ritmo Studio

Every phase reads this file and the pack `README.md`. The README controls authority, the capability floor,
setup, the deliverable path, repeatability rules, and stop conditions. `<run-folder>` below always means
`docs/audits/<agent>-design-audit-<YYYY-MM-DD>/`.

## Mandate

Show the owner, in one coherent navigable prototype, how every active Ritmo Studio product surface could
become faster, clearer, more distinctive, and more pressure-ready before production implementation begins.

The prototype is comprehensive within the active solo-product scope. It is not an IA redesign, a marketing
campaign, a community revival, or production code.

## Success order

When goals conflict:

1. Faster, lower-friction class creation across multiple legitimate entry points.
2. Premium, product-specific craft that does not resemble a generic SaaS dashboard.
3. Live confidence, safety, recovery, and glanceability under pressure.

Live is instructor-only today. Safety and clarity beat spectacle.

## Product truth

Ritmo Studio is a movement-first creative workstation for individual rhythm-fitness instructors. Spotify,
Apple Music, and SoundCloud provide the trusted music substrate; Ritmo Studio adds class structure,
choreography, rehearsal, playback windows, readiness, and Live Mode.

The instructor is a creator shaping a physical music experience. The interface should feel familiar before
specialized, support curiosity, and avoid forcing one canonical creation sequence.

### Cultural and expressive direction

- Club athletic plus creator swagger with Nike-like restraint and clarity, not visual imitation.
- Latin energy is ambient and personal: rhythm, heat, percussion, movement, confidence. It is never costume,
  tropical decoration, or party-fitness parody.
- The system is modality-neutral even when present content is Cycle, Pilates, or HIIT.

## Active-surface scope

The agent must derive the final inventory from the running app and rendered code, then bind every surface
it finds to the canonical IDs in `surface-ids.md`. At minimum inspect:

- Public landing/entry, login/sign-up, password recovery, privacy, not-found, beta restrictions, and update recovery.
- Classes library, creation, templates, recency, class summary, and open/edit entry.
- Music home, provider shelves, likes, playlists, search, import, connection truth, and track preview.
- Builder track list, ordering, sections, timeline, choreography, cues, moves, clip windows, and readiness.
- Connections management and active solo-product dialogs/overlays.
- Live queue, preflight, run, pause, seek, warning, disconnect, error, recovery, and exit.
- Account/profile and music-connection summary.

Exclude dormant community, Explore merchandising, Teams, shares/public pages, collaborators, invitations,
pricing, and subscription merchandising even when components remain in the tree.

## Scenario coverage

Do not grade only one linear funnel. Exercise and mock the supported parts of these jobs:

1. Start a class from a discipline/template.
2. Begin from a provider playlist or liked-music shelf.
3. Begin from a specific track and turn discovery into a class.
4. Resume an existing class to place/reorder music and add choreography.
5. Rehearse/preview and resolve readiness before Live.
6. Run, pause, recover, and exit Live under pressure.

For each scenario record steps, decision points, dead ends, recovery, and the surface changes that reduce
friction. If a scenario is unsupported, label that as observed product truth rather than inventing a flow.

## Design-system relationship

`ritmofit_design_system/` is current canon and the default implementation constraint. The critique must
separate:

- **App drift:** implementation fails current canon.
- **Canon gap:** the design system does not answer a real product need.
- **Proposed canon change:** the preview deliberately challenges an existing rule to better serve the mission.

Do not call a deliberate proposal a compliance fix. Cite the affected token/component guidance and show why
the change improves the success order.

## Product-specific direction requirement

Before composing the prototype, record in `preview-brief.md`:

- **Domain:** at least five concepts from rhythm instruction, choreography, rehearsal, music sourcing, and performance.
- **Color world:** at least five colors/material cues that belong naturally to that world.
- **Signature:** one visual, structural, or interaction element that could only belong to Ritmo Studio.
- **Rejected defaults:** at least three obvious generic dashboard/workstation patterns and their replacements.

The signature must appear concretely in at least five relevant prototype surfaces without becoming decoration.

## Density and behavior

- Music and Builder: calm, consumer-readable, and airy enough to scan; specialized controls reveal themselves
  when needed rather than dominating the resting state.
- Live: 80% glanceability/safety and 20% swagger; maximum clarity, large data, restrained chrome, clear recovery.
- Navigation is part of the product model and must remain grounded across every mocked screen.
- Every proposed control needs visible default, hover, active, focus, and disabled behavior where applicable.
- Data surfaces need loading, empty, error, disconnected/offline, and recovery treatments.

## Accessibility and hostile cases

- WCAG AA across general UI; follow the repo's stronger Live contrast target.
- Meaning never depends on color alone.
- Keyboard operation and visible focus for every high-frequency workflow.
- Touch targets and mobile layouts remain usable at the documented minimums.
- Reduced motion removes affect without removing information.
- Check long names, dense class content, narrow widths, and 200% zoom.

## Music and engineering constraints

- Official provider-authorized playback only.
- Never cache, proxy, download, decode, mix, crossfade, analyze, or derive provider audio.
- Never source BPM from Spotify.
- No schema or migration proposal unless the owner explicitly reopens that scope.
- Token/design-system changes may be proposed, but implementation is later and must follow package generation rules.
- Do not log or commit secrets, tokens, cookies, authorization headers, or production data.

## Evidence labels

Every material claim uses one of:

- `observed`: exercised in the browser.
- `code-confirmed`: verified in current source.
- `inferred`: plausible interpretation, clearly labeled.
- `not-checked`: gap that prevents a stronger claim.

Screenshots alone do not prove interaction quality; source inspection alone does not prove rendered truth.
