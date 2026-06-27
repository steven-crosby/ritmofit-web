# Test-coverage gap-filler

> **Remote ephemeral sandbox.** You run unattended in an isolated, ephemeral cloud sandbox —
> not the owner's machine. The repository is a fresh clone and the container is discarded when
> the session ends, so **nothing you do survives unless it is committed and pushed**: push any
> branch and draft PR to the remote, and commit every report into the git-tracked
> `agent-reports/`. No human is watching in real time — never block on interactive input;
> decisions that belong to the owner become written recommendations.

> **Follow the house rules first:**
> `agent-prompts/remote-prompts/00-house-rules.md`
> **ADDITIVE ONLY** — you add tests, you do not change product behavior.

**REPO:** `ritmofit-web`

**Use when:** you want meaningful additive tests around high-blast-radius code without changing
product behavior.
**Do not use when:** writing the test reveals a real bug that needs a product-code fix; stop and
hand that to `stability.md`.

`stability.md` finds what's breaking; this builds the net *before* it breaks. Find the
highest-value UNTESTED paths and cover them.

- Rank candidates by blast radius: implemented auth paths (the configured Better Auth
  providers — include a provider only where current source implements it), the
  music-provider adapters (SoundCloud / Spotify / Apple), run-payload generation, and D1
  read/write paths.
- Write focused tests that would FAIL if the behavior regressed — assert real outcomes,
  not implementation detail. No snapshot-everything padding.
- Keep provider tests hermetic — stub the `boundFetch` seam rather than hitting live
  provider APIs.

One PR per area, each adding green, meaningful tests. If covering a path reveals a real
bug, STOP and report it — that's a job for `stability.md`, not a silent fix here.
