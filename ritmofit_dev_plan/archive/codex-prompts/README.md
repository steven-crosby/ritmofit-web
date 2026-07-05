# Codex Review Prompts

These prompts provide a repeatable session, review, and hardening sequence for the Ritmo Studio web
application and backend. They use the repository trackers, including `REVIEW.md`, as persistent state.

## Recommended Order

1. **`00-start-session.md`**: Begin any new working session here. It performs read-only orientation,
   reconciles Git, PR, tracker, and relevant deployment state, then asks for or plans the session goal.
2. **`01-pre-launch-audit.md`**: Run for a fresh audit. It inspects the actual repository, runs safe
   verification, and creates or refreshes `REVIEW.md` with prioritized findings.
3. **`02-launch-blocker-fix.md`**: Fix exactly one launch blocker from `REVIEW.md`, verify it, update
   the review, and stop. Run this prompt again for each remaining blocker.
4. **`03-core-product-readiness.md`**: After blockers are cleared, review the complete instructor
   workflow across frontend, API, authentication, data, and music integrations.
5. **`04-should-fix-quality-pass.md`**: Address important quality, accessibility, resilience,
   performance, and maintainability issues that are not launch blockers.
6. **`05-final-beta-launch-verification.md`**: Perform the final read-only verification and produce a
   `GO`, `NO-GO`, or `GO FOR PRIVATE BETA ONLY` recommendation.

Start each working session with the orientation prompt. Use the audit prompt when a new comprehensive
review is actually needed; it establishes an evidence-based launch baseline. Resolve blockers one at a
time before spending effort on general improvements. Commit and review each fix separately where
practical.

The prompts do not authorize deployment, production migrations, or secret changes. Those operations
remain explicit owner decisions.
