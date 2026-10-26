---
title: 'pnpm check runs every check, with a pre-commit hook'
type: 'feature'
ticket: '3'
created: '2026-10-26'
status: 'built'
baseline_revision: '5d789a263cac5c5e5e7fa1caa9f11c7162708a52'
route: 'full'
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

**Problem:** `pnpm check` covers only typecheck, dependency-cruiser, unit tests and build. Lint and formatting are not checked, the Playwright smoke test never runs, ESLint covers only `app/`, and no hook stops a bad commit.

**Approach:**
- Move the ESLint config to the repo root, drop Oxlint, and add a root Prettier 3.9.10 config, with ESLint skipping formatting rules.
- Make `pnpm check` run typecheck → lint → format check → depcruise → unit tests → build → Playwright smoke on the `vite preview` build.
- Add a pre-commit hook that runs the fast part: lint, format check and depcruise.

## Boundaries & Constraints

**Always:**
- **Scope.** Lint and the format check cover `app/`, `packages/*`, `fixtures/`, `tooling/` and the root config files.
- **Excluded paths.** `spikes/`, `_bmad*/`, `.agents/`, `.claude/`, `pnpm-lock.yaml`, `skills-lock.json`, `dist/`, `coverage/`, `test-results/`, `playwright-report/` and `tooling/ad10/violations/**` stay out of both.
- **No auto-fix.** `pnpm check` and the hook never run `--fix` or `--write`; separate `lint:fix` and `format` scripts do.
- **Smoke test.** It runs against `vite preview` of the built `app/dist` on port 4173, headless, Chromium only.
- **Every step fails loudly.** Any failing step exits non-zero, and the failure names the step.
- **Node 26 in the hook.** The hook runs its commands through `mise exec --` when mise is on `PATH`, since dependency-cruiser refuses the global Node 25.
- **Formatting.** The Prettier style matches the existing code: `semi: false`, `singleQuote: true`, `printWidth: 100` (create-vue's default, and the existing `.editorconfig`). Reformatting existing files to that style is expected.

**Never:**
- No CI workflow (story 1.4).
- No new lint rules beyond the create-vue presets, `@eslint/js` `recommended` and unicorn `unopinionated`.
- No change to the AD-10 rules.
- No hosting.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| All green | `pnpm check` on a clean tree | every step runs in order and exits 0 | — |
| Lint error | an unused variable in `packages/model/src/index.ts` | `pnpm check` non-zero; hook refuses the commit | names the file and rule |
| Format drift | a mis-indented line in `fixtures/src/index.ts` | `pnpm check` non-zero; hook refuses the commit | names the file |
| AD-10 break | `plates` imports `pcb` | `pnpm check` non-zero; hook refuses the commit | names the rule |
| Type error / failing unit test / broken build | in any package or `app/` | `pnpm check` non-zero; the hook still allows the commit | — |
| Smoke fails | the editor shell text changes | `pnpm check` non-zero | Playwright names the test |
| Ignored path | badly formatted, lint-failing file in `spikes/` or `_bmad-output/` | `pnpm check` exits 0 | — |

**Decisions:**
- 2026-10-26 (user): ESLint is the only linter; Oxlint is removed.
  - It came in as create-vue's default, not a choice. One config keeps Vue template and type-aware rules.
  - `oxlint`, `eslint-plugin-oxlint`, `app/.oxlintrc.json` and the `pluginOxlint` line go away.
  - This departs from the ticket's "ESLint and Oxlint config" wording.
- 2026-10-26 (user): add `@eslint/js` `recommended` as the base preset.
  - The create-vue presets enable only 4 core rules; Oxlint's correctness category was supplying the rest (`no-unreachable`, `no-debugger`, `no-fallthrough`, ...).
  - This amends "no new lint rules beyond the create-vue presets".
- 2026-10-26 (user): add `eslint-plugin-unicorn` 79.0.0 with its `unopinionated` preset.
  - Its `recommended` set was rejected: `filename-case`, `prevent-abbreviations` and `no-null` fight Vue filenames and geometry code.
  - Existing code that trips it is fixed in the cleanup task, not by disabling rules.
- 2026-10-26 (user): the hook uses lefthook 2.2.2.
  - It is a root devDep, configured in `lefthook.yml` with a `pre-commit` running the fast part.
  - It is installed by a root `prepare` script (`lefthook install`).
  - Its commands run through `mise exec --` when mise is on `PATH`.

</frozen-after-approval>

## Code Map

- `app/eslint.config.ts` holds the create-vue presets:
  - `flat/essential`, `vueTsConfigs.recommended`;
  - Playwright for `e2e/**`, Vitest for `src/**/__tests__/*`;
  - a trailing `pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json')` -- delete it and its import.

  It moves to the root with paths re-based: `app/e2e/**`, plus `**/*.spec.ts` and `**/__tests__/**` for Vitest. Root tool files get a node env.
- `app/package.json`:
  - The `lint`, `lint:oxlint` and `lint:eslint` scripts use `--fix`; delete them.
  - ESLint devDeps move to the root, because `hoist: false` means the root config can only load the root's own deps: `eslint`, `eslint-plugin-vue`, `eslint-plugin-playwright`, `@vue/eslint-config-typescript`, `@vitest/eslint-plugin`, `jiti`, `vue-eslint-parser`. `oxlint` and `eslint-plugin-oxlint` are removed, not moved.
  - `test:e2e` stays.
- `app/playwright.config.ts`:
  - Today: three browsers, `webServer` = `pnpm dev`/`pnpm preview` switched by `CI`, `headless: !!CI`, `reporter: 'html'`.
  - Change to: Chromium only, `pnpm preview --port 4173 --strictPort`, `reuseExistingServer: false`, headless, `reporter: 'list'`.
- `app/e2e/vue.spec.ts` -- the smoke test (`h1` = `keeb-cad`, `empty-editor` test id). Keep it.
- Playwright browsers: `@playwright/test` resolves to 1.64.1. Run `pnpm --filter @keeb-cad/editor exec playwright install chromium` once on this machine; story 1.4 does the same in CI.
- `tsconfig.node.json` (root) -- add `eslint.config.ts` and `prettier.config.ts` (or `.prettierrc.json`) to `include`.
- `package.json` (root) -- `check` is currently `pnpm typecheck && pnpm depcruise && pnpm test && pnpm build`.
- `.dependency-cruiser.mts` and `tooling/ad10/**` -- lint and format these; ignore `tooling/ad10/violations/**`.
- `.gitignore` already covers `test-results/` and `playwright-report/`; Prettier 3 reads `.gitignore` as well as `.prettierignore`.
- `app/.editorconfig` (`max_line_length = 100`, 2-space, LF) and `app/.gitattributes` stay where they are; the explicit Prettier config is what governs `packages/`, `fixtures/` and `tooling/`.
- `npm-run-all2` stays in `app/` (its `build` uses `run-p`).
- `@vue/eslint-config-prettier` 10.2.0 peers `eslint` and `prettier`; both are root devDeps, so `strictPeerDependencies: true` is satisfied.
- Story 1.2's Design Notes: Node 26 comes only from mise, so the hook must activate it.

## Tasks & Acceptance

**Execution:**
- [x] `eslint.config.ts` (root) -- move from `app/`, re-base globs, drop the Oxlint import and line, add `js.configs.recommended` (`@eslint/js` 10.0.1) first and `unicorn.configs.unopinionated` (`eslint-plugin-unicorn` 79.0.0) after the TS preset, then `@vue/eslint-config-prettier/skip-formatting` (10.2.0) last, `globalIgnores` for every excluded path; delete `app/eslint.config.ts` and `app/.oxlintrc.json` -- one lint config
- [x] `prettier.config.ts` or `.prettierrc.json`, `.prettierignore` (root) -- the style above; the ignore lists every excluded path -- one format config
- [x] `package.json` (root) -- root-only work: one lint, format and smoke chain.
  - devDeps: `prettier` 3.9.10, `@vue/eslint-config-prettier`, `@eslint/js` 10.0.1, `eslint-plugin-unicorn` 79.0.0, plus the moved ESLint devDeps.
  - Scripts:
    - `lint` (`eslint .`)
    - `lint:fix`
    - `format:check` (`prettier --check .`)
    - `format`
    - `smoke` (`pnpm --filter @keeb-cad/editor test:e2e`)
    - `check:fast` (lint → format:check → depcruise)
    - `check` (typecheck → check:fast → test → build → smoke)
    - `prepare` (hook install)
- [x] `app/package.json`, `app/playwright.config.ts` -- drop the moved deps and `--fix` scripts; make the smoke config preview-only (see Code Map) -- smoke on the build
- [x] `lefthook.yml` (root) -- one `pre-commit` command: `if command -v mise >/dev/null; then mise exec -- pnpm check:fast; else pnpm check:fast; fi` (if/else, not `||`, so a failure is not re-run without mise) -- the fast checks run before every commit
- [x] Whole tree -- run `pnpm format` once and fix any lint errors the root config now reports in `packages`/`fixtures`/`tooling`, without loosening rules -- start green
- [x] `tooling/verify-checks.sh` -- the ticket's verify script:
  - Create a temporary `git worktree` on a scratch branch, then run `pnpm install --frozen-lockfile --offline` in it.
  - For each matrix break: apply it, run `pnpm check` and expect non-zero; for the fast ones, also try `git commit` and expect it refused; then revert.
  - Finally confirm the ignored-path row passes.
  - Print a pass/fail table, exit non-zero on any mismatch, and always remove the worktree and branch.
- [x] `pnpm-lock.yaml` -- regenerated

**Acceptance Criteria:**
- Given a fresh clone, when `pnpm install` runs, then the pre-commit hook is active (`git config core.hooksPath` or the installed hook file shows it).
- Given the clean tree, when `pnpm check` runs, then it exits 0, and the output shows lint, format check, depcruise, tests, build and the Chromium smoke test against port 4173.
- Given `tooling/verify-checks.sh` runs, then every matrix row reports the expected outcome, the script exits 0, and `git worktree list` and `git branch` show no leftovers.
- Given `grep -rn -- '--fix\|--write' package.json app/package.json`, then the matches are only in `lint:fix` and `format`.

## Implementation Notes

- `pnpm-workspace.yaml` gains `allowBuilds: { lefthook: false }`. pnpm 12 fails the install on lefthook's ignored postinstall (`ERR_PNPM_IGNORED_BUILDS`); the postinstall is redundant because `prepare` runs `lefthook install`.
- Node globals for root tool files are listed by hand in `eslint.config.ts` (`process`, `Buffer`, `console`, `URL`). The `globals` package would be a new root devDep the plan does not list. typescript-eslint turns `no-undef` off for TS files anyway, so the block has little practical effect.
- Prettier config is `.prettierrc.json`, so `tsconfig.node.json` gains only `eslint.config.ts`.
- `app/.vscode/extensions.json` recommends `esbenp.prettier-vscode` in place of `oxc.oxc-vscode`.
- Lint cleanup, no rules loosened: `String.raw` for two regex strings in `.dependency-cruiser.mts` (same values, AD-10 rules unchanged), `TypeError` and `toSorted` in `tooling/ad10/rules.spec.ts`, `new URL('src', ...)` in `app/vite.config.ts`. `pnpm format` reformatted `app/index.html`, `app/vite.config.ts` and `tooling/ad10/rules.spec.ts`.
- `tooling/verify-checks.sh`:
  - The worktree starts from HEAD plus the current uncommitted changes, so it verifies the tree as it stands, before or after commit.
  - It installs with `--ignore-scripts`, so `prepare` does not rewrite the hook every worktree shares.
  - It uses `--store-dir <real store> --package-import-method copy`, because the temp dir can be on another filesystem than the store and `--offline` then finds no store.
  - The AD-10 and type-error breaks make `pnpm check` fail at `vue-tsc` (an undeclared import does not typecheck). The rule name is asserted from the hook's output, which skips typecheck.
  - The smoke row's text change trips the App unit test first. The script also runs `pnpm build && pnpm smoke` on its own to show that Playwright names the test.

## Plan Change Log

## Review Triage Log

| # | Lens | Location | Finding | Verdict | Route | Evidence |
|---|------|----------|---------|---------|-------|----------|
| 1 | quick | `app/README.md` Check section | Says `pnpm check` runs only typecheck, tests and build; omits lint, format, depcruise, smoke, the hook and the fix scripts | low | patch | Confirmed in the file; it is the only developer-facing description of `pnpm check`. Fixed: section rewritten. |
| 2 | quick | `app/tsconfig.node.json` `include` | `eslint.config.*` matches nothing after the config moved to the root | low | patch | Confirmed; `app/eslint.config.ts` is deleted. Fixed: entry removed (Prettier re-wrapped the list). |

## Design Notes

- ESLint loads `eslint.config.ts` through `jiti`. Under `hoist: false`, every plugin the config imports must be a root devDep.
- The smoke test needs a built `app/dist`. `check` runs `build` first and then `smoke`, so `preview` always serves the current build.
- Story 1.4's CI runs `pnpm check` with `CI=true`. The Playwright config must not need a different server per environment; it only keeps the `forbidOnly` and `retries` differences.

## Verification

**Commands:**
- `mise exec -- pnpm install --frozen-lockfile` -- expected: exit 0, hook installed
- `mise exec -- pnpm check` -- expected: exit 0
- `mise exec -- sh tooling/verify-checks.sh` -- expected: exit 0, every row as expected
