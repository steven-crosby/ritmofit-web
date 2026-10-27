## What and why

<!-- Behavior change in one or two sentences. Link the RF task: RF-N. Its record must change in this
PR, cite this PR's URL as `pr` evidence and carry the final state (usually Done); CI's RF-trace step
enforces this for apps/, packages/ and e2e/ changes. -->

## Owner gate

<!-- CI's owner-gate step lists owner-gated paths. If it lists any, add the `needs-owner` label and do
not merge; the owner reviews, applies `owner-approved` and merges. -->

- [ ] Not owner-gated — agent may squash-merge on green
- [ ] Owner-gated (migrations / auth / provider-playback / CI-deploy / agent rules) — `needs-owner`

## Verification

<!-- What actually ran, with results. Say what was skipped and why. -->

## Screenshots

<!-- UI changes: before/after, or point to the run's `e2e-screenshots` artifact for surfaces the
smoke covers (classes, builder, live at rest, live running, account at 1440 and 390). -->

## What CI cannot prove

<!-- Real provider playback, real devices, production behavior, or "nothing for this change". If
something remains, name the exact manual check. -->

## Impact

<!-- Schema/migration, shared contract/OpenAPI, config, secrets, deploy needed? "None" is fine. -->
