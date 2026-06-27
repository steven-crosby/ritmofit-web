# Content & terminology consistency

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing you do survives unless it is committed and pushed**: push any
> branch and draft PR to the remote, and commit every report into the git-tracked
> `agent-reports/`. No human is watching in real time — never block on interactive input;
> decisions that belong to the owner become written recommendations.

> **Follow the house rules first:**
> `agent-prompts/remote-prompts/00-house-rules.md`
> You branch only here in `ritmofit-web`. The web-internal copy checks always run. The
> cross-surface comparison against iOS needs the iOS client's copy, which is **not** vendored
> here (it lives in fast-moving SwiftUI views that drift too quickly to snapshot usefully) —
> see "Cross-surface vs iOS" below.

**Use when:** terminology, labels, state copy, formatting, or microcopy may differ between web
and iOS, or web copy may just be internally inconsistent.
**Do not use when:** payload shapes or endpoint behavior may differ; use
`api-contract-parity.md` instead.

## Web-internal consistency (always runnable)

Check `ritmofit-web`'s own user-facing text — no iOS source required:

- **Internal terminology consistency:** the same concept is named identically across the web
  surface — classes, sessions, runs, Intensity, Tempo, rhythm signature, the provider names.
- **Microcopy quality:** typos, grammar, inconsistent capitalization / casing of feature
  names, button & label voice. Keep it on-brand and tight.
- **Formatting:** numbers / units / dates / times formatted consistently across the web app.
- **State copy:** empty / error / loading text that's missing, placeholder, or off-tone.
- **i18n** (if any localization exists): missing or mismatched keys.

## Cross-surface vs iOS

The authoritative parity reference is the iOS client's copy under its `Features/`, which is
**not vendored** in this repo. Because this repo is self-contained and we no longer rely on sibling
directory checks, you cannot verify iOS copy parity directly from this workspace.

**Do not guess** at iOS copy or infer drift. Run the web-internal checks above and record this line verbatim in
the after-action report: `cross-surface copy parity vs iOS: not run — no iOS source vendored in this
checkout`. (Contract/enum parity, which *is* snapshotted, belongs to `api-contract-parity.md`.)

## Output

Open PRs for safe web-side copy fixes, one area per PR. Genuine naming decisions (should it
be "class" or "session" *everywhere*?) span both surfaces → report with a recommendation;
don't pick unilaterally or edit the iOS repo from here.
