## What and why

<!-- Behavior change in one or two sentences. Link the RF task: RF-N. Its record must change in this
PR, cite this PR's URL as `pr` evidence and carry the final state (usually Done); CI's RF-trace step
enforces this for apps/, packages/ and e2e/ changes. -->

## Owner gate

<!-- Every PR: when CI is green (owner-gated: everything except the final owner-gate step), the
agent asks the owner before its final review and squash-merge (PR comment + `ready-to-merge` if the
owner is not in the session). If CI's last step lists owner-gated paths, also add `needs-owner`.
`owner-approved` comes from the owner, or from the agent only on the owner's explicit in-session
instruction recorded as a PR comment; it counts only for the commit it was given on. -->

- [ ] Not owner-gated
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
