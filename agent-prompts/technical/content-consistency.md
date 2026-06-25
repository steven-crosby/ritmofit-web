# Content & terminology consistency

> **Follow the house rules first:**
> `/Users/stevencrosby/Repos/RitmoFit/ritmofit-web/agent-prompts/00-house-rules.md`
> Reads the sibling `ritmofit-ios` repo **read-only** for cross-surface comparison; you
> branch only here in `ritmofit-web`. Cross-surface copy drift is the bug here.

Check the web app's user-facing text, using the iOS client as the parity reference:

- **Terminology parity:** the same concept is named identically on both surfaces —
  classes, sessions, runs, Intensity, Tempo, rhythm signature, the provider names. Flag
  anywhere the web copy diverges from iOS (or vice-versa).
- **Microcopy quality:** typos, grammar, inconsistent capitalization / casing of feature
  names, button & label voice on the web surface. Keep it on-brand and tight.
- **Formatting:** numbers / units / dates / times formatted consistently with the iOS app.
- **State copy:** empty / error / loading text that's missing, placeholder, or off-tone.
- **i18n** (if any localization exists): missing or mismatched keys.

Open PRs for safe web-side copy fixes, one area per PR. Genuine naming decisions (should it
be "class" or "session" *everywhere*?) span both surfaces → report with a recommendation;
don't pick unilaterally or edit the iOS repo from here.
