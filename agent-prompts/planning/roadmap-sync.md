# Roadmap sync — weekly ritmofit-web prioritization (read-only)

> **READ-ONLY.** Produce a brief. Self-label with agent + date. Reads the sibling
> `ritmofit-ios` repo read-only only to map dependencies.

Answer: **what should I focus on in `ritmofit-web` this week?**

- **Current state:** milestone / slice from the live source of truth
  (`ritmofit_dev_plan/DEVELOPMENT_PLAN.md`).
- **Dependency map:** what work on the iOS client is blocked on this backend (an endpoint,
  a contract change, an auth capability)? For Apple auth, recognize that bundle-ID support
  shipped; treat secret provisioning and device-level end-to-end verification as separate
  operational dependencies owned elsewhere.
- **Risk / debt radar:** anything accumulating in this repo — failing tests, a pile of open
  `auto-maintenance` PRs, design drift, deferred items — that should jump the queue.
- **Recommendation:** a ranked week plan — "land these, in this order, because…" — and
  what to explicitly defer. Call out anything you should ship *first* because the iOS app
  is waiting on it.

One page max. Lead with the single most important call for the week.
