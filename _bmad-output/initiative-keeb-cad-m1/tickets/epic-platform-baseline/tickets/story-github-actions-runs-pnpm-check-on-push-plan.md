---
title: 'GitHub Actions runs pnpm check on push'
type: 'feature'
ticket: '4'
created: '2026-10-26'
status: done
baseline_revision: '644337025c402acd66dde24c1da71ff50a6fd414'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `pnpm check` runs only locally and in the pre-commit hook's fast subset, so a push to the public repo `KeebCAD/keeb-cad` that breaks typecheck, tests, build or the smoke test goes unnoticed (epic R5).

**Approach:** Add one GitHub Actions workflow, triggered on every push to any branch. It sets up the pinned pnpm (`packageManager`) and Node (`mise.toml`), installs with a frozen lockfile, installs Playwright's Chromium, and runs `pnpm check`, so a failing check turns the run red.

</frozen-after-approval>

## Implementation Notes

Oneshot: one new ~35-line workflow file, with no code changes elsewhere.

- `.github/workflows/check.yml`, `on: push` (all branches), one `ubuntu-latest` job:
  - `actions/checkout` v7.0.1
  - `pnpm/action-setup` v6.1.0 with no `version`; it reads `packageManager: pnpm@12.15.0`
  - `actions/setup-node` v7.1.0 with `node-version-file: mise.toml` (supported in v7) and `cache: pnpm`
  - `pnpm install --frozen-lockfile`
  - `pnpm --filter @keeb-cad/editor exec playwright install --with-deps chromium`
  - `pnpm check`
- Pin each action by full commit SHA with a version comment, since the repo is public and third-party tags can move. SHAs: checkout `3d3c42e5aac5ba805825da76410c181273ba90b1`, action-setup `ea17c68df8912ef543352723c149a84f56e3d413`, setup-node `949feb2413d6458794dcd2491c4babbbce0c15c1`.
- Use `permissions: contents: read`, and cancel superseded runs on the same ref with `concurrency`.
- Do not use mise in CI: `mise.toml` pins only Node, and setup-node reads it directly. `CI=true` is set by Actions, and the Playwright config already uses it only for `forbidOnly`/`retries`/`workers`.
- `prepare` (`lefthook install`) runs during install. It is harmless in CI.
- No hosting and no deploy (epic Boundaries).

## Verification

**Commands:**
- `mise exec -- pnpm check` -- expected: exit 0 (the workflow YAML is covered by `prettier --check .`)
- Push `main` with the workflow, then run `gh run watch` -- expected: green run
- Push a scratch branch with one broken check (e.g. a format error in `fixtures/src/index.ts`, committed with `--no-verify`), then `gh run watch` -- expected: red run naming the failing step; then delete the scratch branch locally and on the remote

Pushing is outward-facing, so both pushes wait for user confirmation.

## Review Triage Log

Quick lens: no findings. It confirmed the action SHAs match their tags, that setup-node v7.1.0 accepts `mise.toml`, and that the step order suits `cache: pnpm`. The R5 "fails visibly" criterion is left to the two verification pushes.
