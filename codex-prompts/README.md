# Codex Review Prompts

These prompts provide a repeatable review and hardening sequence for the RitmoFit web application and
backend. They use `REVIEW.md` as the persistent audit record.

## Recommended Order

1. **`01-pre-launch-audit.md`**: Run first. It inspects the actual repository, runs safe verification,
   and creates or refreshes `REVIEW.md` with prioritized findings.
2. **`02-launch-blocker-fix.md`**: Fix exactly one launch blocker from `REVIEW.md`, verify it, update
   the review, and stop. Run this prompt again for each remaining blocker.
3. **`03-core-product-readiness.md`**: After blockers are cleared, review the complete instructor
   workflow across frontend, API, authentication, data, and music integrations.
4. **`04-should-fix-quality-pass.md`**: Address important quality, accessibility, resilience,
   performance, and maintainability issues that are not launch blockers.
5. **`05-final-beta-launch-verification.md`**: Perform the final read-only verification and produce a
   `GO`, `NO-GO`, or `GO FOR PRIVATE BETA ONLY` recommendation.

Start with the audit even if the repository appears healthy. It establishes a current, evidence-based
baseline. Resolve blockers one at a time before spending effort on general improvements. Commit and
review each fix separately where practical.

The prompts do not authorize deployment, production migrations, or secret changes. Those operations
remain explicit owner decisions.
