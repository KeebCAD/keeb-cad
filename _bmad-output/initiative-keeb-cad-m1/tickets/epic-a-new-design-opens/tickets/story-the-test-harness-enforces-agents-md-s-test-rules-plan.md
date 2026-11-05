---
title: 'The test harness enforces AGENTS.md''s test rules'
type: 'chore'
ticket: '13'
created: '2026-11-05'
status: 'built'
baseline_revision: 'e456fc0f14e2bbdf7101e82afb0b31557ae5dc51'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** AGENTS.md's Tests rules bind only by prose and review: nothing stops an agent from updating a snapshot, skipping hooks, leaving `getByTestId` in, ending a session without the whole suite, or shipping priority-package logic its tests don't pin.

**Approach:** Adapt the ninja-testing plugin (`~/Downloads/javascript-ninja-testing-skills`, MIT, `Copyright (c) 2026 Illya Klymov`; keep that notice in any file that copies its code) into five parts in one PR: Claude Code hooks, test-lint rules in ESLint plus shuffle and a lint cache, Stryker with a CI gate, two BMad overrides, and two ported skills.

**Decision (2026-11-05, Sergii):** all five parts ship in one plan and PR, not split.

**Decision (2026-11-05, Sergii):** `mutate` is one glob per priority package (`packages/<p>/src/**/*.ts` minus `*.spec.ts`, `types.ts`, `index.ts`), so new pure files are picked up without an edit. Browser or I/O files are kept out by an explicit exclude list in `stryker.config.json` (`!packages/storage/src/<file>.ts`), which the story that adds such a file extends; no naming convention. Today the globs match nothing, so the gate is proven on a throwaway branch with a scratch pure file whose tests leave survivors.

**Decision (2026-11-05, Sergii):** the ported spec rules are snapshot matchers banned (`vitest/no-restricted-matchers`), `vi.mock`/`vi.doMock` banned, `vitest/no-conditional-in-test`, `vitest/no-conditional-expect`, `try` banned in test bodies, `vitest/no-focused-tests` and `vitest/no-disabled-tests`, plus `getByTestId` and `data-testid`. No rule on digits in titles. Existing specs the rules flag are rewritten to comply, keeping what they assert.

**Decision (2026-11-05, Sergii):** the test lens goes in both `_bmad/custom/bmad-code-review.toml` and `_bmad/custom/bmad-build.toml`, under one `id`, in both the quick and thorough sets, so a build's own review runs it too.

## Boundaries & Constraints

**Always:**
- Hooks: `.claude/settings.json` (new) wires three TypeScript scripts in `tooling/hooks/`, run by `node` (Node 26 strips types). Commands and patterns are constants in the scripts; no config file. Each script's decision logic is a pure exported function with a spec in `tooling/hooks/`; the entry only reads stdin and prints.
- Guard (PreToolUse, `Bash|Edit|Write|MultiEdit`) **denies**: `vitest`/`pnpm test*` with `-u`/`--update`; `playwright … --update-snapshots`; `--no-verify`; `git push` with `--force`/`-f`/`--force-with-lease`; `rm`/`git rm` of a `*.spec.*`/`*.test.*` file; `stryker … --break`/`--thresholds`; edits to `__snapshots__/`, `*.snap` and `*-snapshots/`. It **asks** before edits to `vitest|vite|playwright|stryker` config files and before new text containing `Stryker disable` or `Stryker restore`. Everything else passes.
- Stop hook: when the session changed a spec or a non-spec source file under `packages/`, `app/`, `fixtures/` or `tooling/`, and the transcript shows no full `pnpm test` after the last such change, it blocks once per prompt asking for `pnpm test`.
- PostToolUse (`Edit|Write|MultiEdit`): lints the edited file with `new ESLint({ cache: false })`, skips it when `isPathIgnored`, and on errors exits 2 with the formatted output; clean → exit 0, silent.
- Lint: the ported rules (see the decision above) live in `eslint.config.ts` with one spec each in `tooling/lint/` through the real config; `getByTestId` and a `data-testid` attribute are errors. The five testId uses become `getByRole('main')` and `getByText('No design open.')`.
- `sequence.shuffle: true` reaches every Vitest project. `pnpm lint` becomes `eslint . --cache --cache-location node_modules/.cache/eslint/`; a comment in `eslint.config.ts` says type-aware rules would make that cache stale.
- Stryker (globs and exclude list as decided above): `@stryker-mutator/core` and `@stryker-mutator/vitest-runner`, `stryker.config.json`, testing through Node projects only; `pnpm test:mutation`; thresholds high 90, low 80, break 90; a CI job `mutation` runs it. `tooling/check-steps.spec.ts` is updated for each changed script and CI line.
- bmad-build override (`_bmad/custom/bmad-build.toml`): a persistent fact that the plan carries a boundary table, with rows for below, on and above each threshold, sorted into production bugs, rules, module boundaries and glue, and a level column on every row. The table is frozen as acceptance at plan approval, and its rows don't count toward the 3000-token cap.
- Test lens (`_bmad/custom/bmad-code-review.toml`, new): a context-free Sonnet subagent, gated by `when` on a diff that touches `*.spec.*` or `*.test.*`. It runs ninja's test-reviewer checks 1–6 and 8 against AGENTS.md. It has no finding floor ("checked N tests, no findings" is a full answer), and every finding quotes the test name, the `expect` line and the check number verbatim, so triage drops any quote not found in the diff.
- Skills `mutation-loop` (scoped runs, a verdict per survivor: test gap, implementation boundary, or equivalent proposed for a person) and `flaky-triage` (diagnosis steps 1–6; refuses an unnamed timeout raise, removing an intermediate check, slowing the backend, and retrying without reading the log), rewritten against AGENTS.md.

**Never:** No `vi.mock`, jsdom or snapshot in any new spec. No change to production code beyond the two testId templates. No lowered threshold, excluded mutator or runner-config change to get green. No rule beyond those decided. No hook that edits files.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Snapshot update | Bash `pnpm vitest run -u` | deny, reason names snapshots | — |
| Baseline update | Bash `pnpm exec playwright test --update-snapshots` | deny | — |
| Force push | Bash `git push --force origin x` | deny | — |
| Plain push | Bash `git push origin x` | allow | — |
| Hooks bypass | Bash `git commit --no-verify -m x` | deny | — |
| Delete a spec | Bash `rm packages/x/src/a.spec.ts` | deny | — |
| Delete a source | Bash `rm packages/x/src/a.ts` | allow | — |
| Threshold flag | Bash `pnpm stryker run --break 50` | deny | — |
| Snapshot edit | Edit `src/__snapshots__/a.snap` | deny | — |
| Baseline edit | Write `app/e2e/a.spec.ts-snapshots/x.png` | deny | — |
| Runner config | Edit `packages/editor/vitest.config.ts` | ask | — |
| Disable comment | Edit adding `// Stryker disable next-line all` | ask | — |
| Lint on edit, violation | Edit leaves `getByTestId` in a spec | exit 2, ESLint output | — |
| Lint on edit, ignored | Edit `_bmad-output/x.md` | exit 0, silent | — |
| Stop, logic changed, no run | spec edited, no `pnpm test` since | block once with the ask | second stop passes |
| Stop, docs only | only `*.md` changed | pass | — |
| Mutation gate | score below 90 | `pnpm test:mutation` exits non-zero | CI job red |

</frozen-after-approval>

## Code Map

- `eslint.config.ts` -- `defineConfigWithVueTs(...)`, not type-aware. The vitest block is on `**/*.spec.ts`, ignoring `app/e2e/**` (:131-151). Playwright `flat/recommended` is on `app/e2e/**` (:126-129). The `no-restricted-syntax` objects (:163-187) replace each other's options per file, so a new spec selector must join `SHARED_SPEC_STATE`'s object or repeat it. `skipFormatting` stays last. `IGNORED` already has `.claude`.
- `tooling/lint/restricted-syntax.ts` -- `restrictedSyntax(code, filePath)` returns only `no-restricted-syntax` messages. Generalise it to take a rule id (or add a sibling) for plugin rules. Spec pattern: `it.each` over `[description, path, code]`.
- `packages/editor/src/App.vue:6`, `views/HomeView.vue:2`, `App.spec.ts:14,16`, `app/e2e/vue.spec.ts:6` -- the five testId uses.
- `vitest.config.ts` -- root projects: `'packages/*'` (only `di` and `editor` have their own config), `fixtures`, and inline `di` and `tooling`; no `sequence`. Inline projects need `extends: true` or their own `sequence`, and file projects (`packages/editor`, `packages/di`) set it in their configs. Prove it from the seed Vitest prints.
- `package.json` -- `lint: 'eslint .'`; add `test:mutation: 'stryker run'`. eslint deps are literals here (not in the catalog); Stryker joins the same way, and `tooling/catalog.spec.ts` must still pass.
- `.github/workflows/check.yml` -- `on: push`, one job `check`, actions pinned by SHA. Add job `mutation` (same setup steps, no browsers). Making it a required check is a GitHub branch-protection setting outside the repo: name it in the PR.
- `tooling/check-steps.spec.ts:14-41` -- exact script and run-line strings; update the `lint` string, add `test:mutation` and the mutation job's lines.
- `packages/{pcb,plates,case,exports,design-file,storage}/src/index.ts` -- all `export {}` stubs, so the globs match nothing today.
- `_bmad/custom/bmad-build.toml` -- existing `activation_steps_append` and `persistent_facts`; append the boundary-table fact. `.agents/skills/bmad-code-review/customize.toml` -- lens shape (`[[workflow.quick_lenses]]` and `[[workflow.thorough_lenses]]`, with `id`, `name`, `when` and `instruction`; arrays of tables merge by `id`).
- Ninja sources: `scripts/hooks/guard.mjs` (the deny regexes to start from), `stop-check.mjs` (transcript plus `git status` detection, a once-per-prompt counter in tmpdir), `agents/test-reviewer.md` (checks 1–8), `skills/mutation-loop/`, `skills/flaky-triage/`. Its `test-lint.mjs` is a regex linter, not ESLint: port behaviours, not code.
- `.claude/skills/` -- symlinks into `.agents/skills/` (BMad's install target). Put the two ported skills as real folders in `.claude/skills/`.

## Tasks & Acceptance

**Execution:**
- [x] `tooling/hooks/{guard,stop-check,lint-edited}.ts` + specs -- pure decision functions and thin stdin/stdout entries; specs cover every I/O row for their hook.
- [x] `.claude/settings.json` -- wire the three hooks with `node "$CLAUDE_PROJECT_DIR"/tooling/hooks/<name>.ts`.
- [x] `eslint.config.ts`, `tooling/lint/*` -- ported rules, a spec per rule, the cache comment.
- [x] `packages/editor/src/{App.vue,views/HomeView.vue,App.spec.ts}`, `app/e2e/vue.spec.ts` -- testIds out.
- [x] `vitest.config.ts`, `packages/{di,editor}/vitest.config.ts` -- shuffle everywhere.
- [x] `package.json`, `stryker.config.json`, `.github/workflows/check.yml`, `tooling/check-steps.spec.ts`, `.gitignore` (`reports/mutation/`, `.stryker-tmp/`) -- Stryker and the gate.
- [x] `_bmad/custom/bmad-build.toml`, `_bmad/custom/bmad-code-review.toml` -- boundary-table fact (build), test lens (both, quick and thorough).
- [x] `.claude/skills/{mutation-loop,flaky-triage}/SKILL.md` -- ported skills, MIT notice in each.

**Acceptance Criteria:**
- Given the workspace, when `pnpm check` runs, then it passes with shuffle and the ported rules on.
- Given `grep -rn 'getByTestId\|data-testid' packages app --include='*.vue' --include='*.ts'`, then no output.
- Given a live session, when the agent runs `pnpm vitest run -u`, `pnpm exec playwright test --update-snapshots` and `git push --force`, then each is denied, shown once in the PR.
- Given a spec edit with a lint violation, then the hook returns ESLint's output to the agent.
- Given a spec diff, the test lens reports; given a docs-only diff, it doesn't launch.
- Given the throwaway gate branch, the `mutation` job fails below break 90.

## Implementation Notes

- Shuffle: a directory listed as a project with no config of its own inherits nothing from the root, so `'packages/*'` and `'fixtures'` became `'packages/*/vitest.config.ts'` plus one generated inline project per config-less directory (names unchanged). Each config load drew its own seed, so the root shares one through `KEEB_CAD_TEST_SEED`, which `di` and `editor` read; seeds 1 and 2 reorder tooling and di.
- Lint specs through the real config timed out at 5 s when run together (cold config load about 3 s, longer under parallel workers): `COLD_CONFIG_TIMEOUT = 15_000` with that cause in `tooling/lint/rule-messages.ts`, no runner config change.
- Stryker 10.1.1: `vitest.mutation.config.ts` keeps only inline Node projects minus `tooling`; `vitest.related: false` so a pure file with no tests fails the gate; `ignorePatterns` leaves out `.claude`, `.agents`, `_bmad`, `_bmad-output`, `spikes` (symlinked skills broke the sandbox copy). Local gate proof: a scratch `plates` file with a weak spec scored 57.14 and exited 1; with no spec, 0 and exit 1; both deleted. On main the score is NaN and the run exits 0.
- `getByTestId` uses `no-restricted-properties` on all files (e2e included); `data-testid` uses `vue/no-restricted-static-attribute` and `vue/no-restricted-v-bind`. The `try` ban joined the spec `no-restricted-syntax` list. `no-focused-tests` and `no-conditional-expect` were already errors in the plugin's recommended set, so toggling them off in the override does not turn their specs red.
- Five type-narrowing tests in `result` lost their `if` for a ternary inside `expectTypeOf`, asserting the same narrowing.
- Guard decisions beyond the matrix: also the smoke and e2e scripts with the baseline flag, and the mutation script with threshold flags; the config ask matches `vitest.mutation.config.ts`; the disable-comment match is case-insensitive. Left open: playwright's short update flag, `git commit -n`, a recursive `rm` of a spec folder, snapshot files written through Bash.
- Stop hook: once per prompt via `stop_hook_active`; a full run is unscoped `pnpm test` or `pnpm check` (optionally via `mise exec`, redirected or chained), pass/fail not read; only Edit/Write/MultiEdit on code extensions inside the project count.
- Live in the implementing session: the guard denied the three AC commands and an `rm` of a scratch spec; a Write leaving `getByTestId` got ESLint's output back. Still owed: the stop hook live (subagents fire no Stop), the test lens in a live review, the mutation job red in CI on a pushed throwaway branch, and the required-check setting in branch protection.
- Review patches: `.guards` resolves to `never` for `this is` predicates, so the four narrowing tests use `expectTypeOf([x].filter((o) => o.isSome())).toEqualTypeOf<Some<number>[]>()` and the iterator test `extract<IteratorYieldResult<unknown>>().toHaveProperty('value')`. The stop hook also reads `git status --porcelain -uall` with mtimes, so with no full run in the session any dirty logic file blocks once, including edits not made by the agent. `stryker run <any config>` is denied, the real one included. The stop hook fired live in the orchestrating session after the patch round, listing Bash- and subagent-changed files.
- Found while verifying: the guard matched the snapshot-update text inside a heredoc body of an unrelated Bash command and denied it (the Bash patterns scan the whole command string, data included).

## Review Triage Log

Pass 1 (quick + test-reviewer): high 0, medium 6, low 13, false 0, maybe-false 0; 15 patched, 3 deferred, 2 rejected. The test-reviewer lens fired on this spec diff (its live trial); every quote it gave was found in the diff.

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | Stryker 10.1.1 has no `--break`/`--thresholds` CLI flags; a positional config file (`stryker run lax.json`) swaps thresholds unguarded, and writing such a file isn't asked | medium | patch | `stryker-cli.js:31,49` adds `[configFile]`, no threshold options. Keep the frozen row; deny a `stryker run` with a positional config, widen the ask to any `stryker*.{json,[cm][jt]s}`; fix the skill's wording. |
| 2 | e2e specs get skip/conditional rules only as warnings (playwright `flat/recommended`), so they pass lint and the hook | medium | patch | Vitest block ignores `app/e2e/**`; the decided behaviours apply to every spec. Raise `playwright/no-skipped-test`, `no-focused-test`, `no-conditional-in-test`, `no-conditional-expect` to error, a spec row each. |
| 3 | Stop hook counts only Edit/Write/MultiEdit; files changed through Bash never trigger it | medium | patch | Boundaries say "the session changed"; Code Map named ninja's `git status` detection. Also count logic files `git status` reports changed whose mtime is after the last full run's transcript timestamp. |
| 4 | Vitest browser-mode screenshot baselines (`__screenshots__/`) aren't denied | medium | patch | `toMatchScreenshot` stores references there; AGENTS: an agent never updates a baseline. Add to `DENIED_PATHS` with a row. |
| 5 | Mutation runs inherit shuffle; each Stryker worker draws its own seed, so kill results for an order-sensitive test vary between runs | medium | patch | `vitest.mutation.config.ts` spreads `workspace.test`. Set `sequence.shuffle: false` there with a why-comment. |
| 6 | Five rewritten `result` narrowing tests swap `if` for a ternary (still a conditional) and assert a weaker `… \| undefined` type | medium | patch | Plan: "keeping what they assert". Use `expectTypeOf(x.isSome).guards.toEqualTypeOf<…>()` (and an equivalent no-conditional form for the iterator yield). |
| 7 | Per-project `seed` and the `KEEB_CAD_TEST_SEED` plumbing do nothing; an exported env var pins order silently | low | patch | Vitest 5.0.5 `index.1TqnEahn.js:4092-4094` takes `seed` from the root config. Drop the env var and per-project `seed`; keep `shuffle: true` per project. |
| 8 | Guard Bash patterns scan heredoc bodies, denying unrelated commands that carry the text as data | low | patch | Seen live in this run. Strip heredoc bodies before matching, with a row. |
| 9 | Force-push variants pass: `-fu`, `git -C dir push -f` | low | patch | Direct regex correction, rows added. `+refspec` left open, listed as a decision. |
| 10 | `getByText('No design open.')` is a substring match; the old assertions checked exact text | low | patch | Add `{ exact: true }` in both specs. |
| 11 | "passes a file with warnings only" takes the ignored-path return; the warnings branch is untested | low | patch | `README.md` has no config, so `isPathIgnored` is true. Use text that yields only a warning. |
| 12 | "allows a test id behind a disable comment with a reason" claims a reason matters; nothing requires it | low | patch | Rename to what it tests; enforcing the reason is deferred (#18). |
| 13 | `stop-check.ts` entry parses the transcript itself, with a local helper | low | patch | Plan: the entry only reads stdin and prints. Move to `read-transcript.ts`. |
| 14 | `rule-messages.ts` holds a token beside functions | low | patch | AGENTS: tokens get their own file. Move `COLD_CONFIG_TIMEOUT` out. |
| 15 | PostToolUse entry parses stdin as `PreToolUseInput`; the lens `when` says "adds or changes" not "touches" (a spec deletion may not launch it); MIT permission notice missing in the two hook files and the two TOML lenses; `.prettierignore` not kept in step with `IGNORED`; `startsWith('..')` misreads a `..foo` entry | low | patch | Each a direct correction: rename to `ToolHookInput`; "adds, changes or deletes"; full notice; add the two ignores; compare the first segment to `..`. |
| 16 | `vitest/no-conditional-in-test` flags only a top-level `if`; loops, `switch`, ternaries and nested ifs around `expect` pass | medium | defer | Plugin `index.mjs:2681`. A wider selector is a new rule beyond those decided: a question for Sergii. |
| 17 | `eslint.config.ts` isn't on the guard's ask list, so the rules can be switched off unprompted | low | defer | Adding a path to the ask list is a new guard rule: a question for Sergii. |
| 18 | A bare `eslint-disable-next-line` (no `-- reason`) silences any ported rule | medium | defer | AGENTS asks for the reason; enforcing it needs a new rule (`eslint-comments/require-description`): a question for Sergii. |
| 19 | Module-level `ESLint` instance in `lint-decision.spec.ts` and `rule-messages.ts` | low | reject | Same as 23.12's triage #8: a read-only configured tool reused to avoid reloading the config per lint; nothing mutates it. |
| 20 | `vitest.mutation.config.ts` drops string projects, so a priority package with its own config loses its tests in mutation runs | low | reject | Fails loudly: its files go NoCoverage and the gate turns red, naming the files. |

## Verification

**Commands:**
- `pnpm install && pnpm check` -- expected: all steps pass.
- `pnpm vitest run --project tooling` -- expected: hook, lint and check-steps specs pass.
- `pnpm test:mutation` -- expected: runs and exits 0 on main.
- `pnpm test` -- expected: whole suite passes, a seed printed.

**Manual checks:**
- Toggle-bug the PostToolUse hook and the stop hook in a live session; say so in the PR.
