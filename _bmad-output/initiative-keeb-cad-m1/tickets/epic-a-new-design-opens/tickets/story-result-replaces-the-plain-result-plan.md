---
title: 'result replaces the plain Result'
type: 'feature'
ticket: '11'
created: '2026-11-03'
status: 'built'
baseline_revision: 'c36053acb57c50797c6d92908f6d30e8b75a0df4'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** AD-24 says `Result` and `Option` come from a kernel `result`, ported from obsidian-journal at 1c4e267, but no such package exists. 23.2's rebuild and every later story return `Result`s, and 23.2's specs need `expectOk`/`expectErr`.

**Approach:** Port `/home/ruyu/projects/obsidian-journal/src/infrastructure/result` (unchanged since 1c4e267) and its four test files into a new kernel package `packages/result`, laid out by AGENTS.md's code layout rules, without `fromValibot`. Add a zero-argument `Result.ok()` and a `result/testing` subpath for `expectOk`/`expectErr` that only spec files may import. Register the kernel in AD-10's tooling.

## Boundaries & Constraints

**Always:** Public names and behaviour match the source: `Result` (`ok`, `err`, `fromThrowing`, `fromOption`), `Ok`, `Err`, `Option` (`some`, `none`, `fromNullable`), `Some`, `None`, `AsyncResult`, `attempt` (with `attempt.in`), `InvariantError`. Every source test is ported as `*.spec.ts` (111 `it`s minus the 3 `fromValibot` ones) and passes. `result` imports no workspace package and no npm package; any package may import it with no edge drawn. Specs run on Node. New code follows AGENTS.md: one kind of thing per file, types in `types.ts`, `index.ts` only re-exports, comments only for a why. Prettier style of the repo (single quotes, no semicolons).

**Decision (plan):** `None` is not one shared instance: the source makes one per call, a shared one would need a cast to `None<T>` and a module-level instance, and nothing measures the allocation.

**Decision (2026-11-03, Sergii):** a type that pairs with a same-named value stays in that value's file: `export type Result<T, E> = Ok<T, E> | Err<T, E>` beside `export const Result` in `result.ts`, the same for `Option` in `option.ts`, since TypeScript merges the pair only within one file. AGENTS.md's code layout gains this exception; 23.12's lint must allow it.

**Never:** No `fromValibot`, no valibot dependency. No consumer migrated (23.2 does that). No vitest import in `result/testing` (the helpers throw plain `Error`s, as in the source). No new design-file field or shared kind. No change to `messaging`'s plain-value rule.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Void ok | `Result.ok()` | value `undefined`, type `Result<void, never>` | — |
| Valued ok | `Result.ok(1)` | type `Result<number, never>` (unchanged from source) | — |
| Kernel import | `storage` imports `@keeb-cad/result` | no violation | — |
| Kernel reaches out | a `result` file imports `@keeb-cad/di` or `valibot` | kernel / npm rule reports it | depcruise non-zero |
| Testing from a spec | `packages/storage/src/x.spec.ts` imports `@keeb-cad/result/testing` | no violation | — |
| Testing from source | `packages/storage/src/index.ts` imports `@keeb-cad/result/testing` | `only-specs-import-result-testing` reports it, once | depcruise non-zero |

</frozen-after-approval>

## Code Map

- `/home/ruyu/projects/obsidian-journal/src/infrastructure/result/` -- source (1382 lines): `result.ts` (`ErrYield`, `Ok`, `Err`, `Result` type + const; `fromValibot` at 130–135 with its type import on line 4), `option.ts` (`Some`, `None`, `Option` type + const; `None` built per call), `async-result.ts` (class, `_fromPromiseOfResult`), `attempt.ts` (private `SyncGen`/`AsyncGen` types, `runSync`/`runAsync`/`isAsyncGenerator`/`dispatch`, overloaded `attemptCall`/`attemptIn`), `errors.ts` (`InvariantError`), `testing.ts` (`expectOk`, `expectErr`), 4 `*.test.ts`. `result.test.ts` lines 1 and 97–124 are the valibot import and `fromValibot` block: drop them. Double quotes and semicolons: reformat. No ts-pattern.
- `packages/di/{package.json,tsconfig*.json}` -- template for a kernel with Node specs (lib/vitest/node tsconfig split, `catalog:` devDeps); `result` needs no `vue`, `ts-pattern` or browser deps, and no `ESNext.Disposable`.
- `vitest.config.ts` (root) -- `'packages/*'` plus an inline Node project for `di`; make sure `result`'s specs are collected exactly once, on Node.
- `tsconfig.json` (root) L4–10 -- kernel references; add `./packages/result`.
- `.dependency-cruiser.mts` -- `KERNELS` L6–7 (comment "seven kernels"), `OPEN_KERNELS` L10, `GRAPH` L16–88 (kernel rows `[]`, header comment counts packages), `entry()` L123–126, `TEST_FILE` L145, `onlyOwnersImportEntry` L213–231, `fixtures-only-in-tests` L348–354 (model for the testing fence).
- `tooling/ad10/rules.spec.ts` -- package count L110–111 (`toHaveLength(29)` → 30), kernel `allowedTargets` check L133–138, expected-violations list L146–240, every-rule-fires L249–255, allowed-edge `it.each` L257–330.
- `tooling/ad10/violations/packages/` -- `storage/src/index.ts` (non-kernel importer), `geometry/src/index.ts` (kernel violation pattern), `di/src/vue/vue.spec.ts` (allowed spec import pattern).
- `packages/schema/src/index.ts` -- `export {}` on main; the plain `Result` union lived only in PR #6 and in untracked `dist/`. Nothing to remove in source; `schema exports no Result` already holds.

## Tasks & Acceptance

**Execution:**
- [x] `packages/result/{package.json,tsconfig.json,tsconfig.lib.json,tsconfig.vitest.json,tsconfig.node.json?}` -- kernel package, exports `.` → `./src/index.ts`, `./testing` → `./src/testing/index.ts`; no dependencies; devDeps from the catalog.
- [x] `packages/result/src/` -- port: `ok.ts`, `err.ts`, `some.ts`, `none.ts`, `async-result.ts` (one class each), `invariant-error.ts`, `attempt.ts`, `result.ts` and `option.ts` (the `Result`/`Option` objects), `types.ts` (`ErrYield`, `SyncGen`, `AsyncGen`; the `Result` and `Option` unions stay beside their values), `index.ts` re-exports the source root's names. Source comments kept only where they say a why.
- [x] `packages/result/src/result.ts` -- `Result.ok()` with no argument returns `Ok<void, never>` typed `Result<void, never>`; `Result.ok(x)` keeps its source type.
- [x] `packages/result/src/testing/{expect-ok.ts,expect-err.ts,index.ts}` -- the two assertion functions.
- [x] `packages/result/src/*.spec.ts` -- the four ported test files (helpers from `./testing`), minus `fromValibot`; add `Result.ok()` runtime and `expectTypeOf` cases.
- [x] `AGENTS.md` -- add the same-named type exception to Code layout's `types.ts` rule.
- [x] `vitest.config.ts`, `tsconfig.json` (root), `eslint.config.ts` if a config file is added -- wire the package in.
- [x] `.dependency-cruiser.mts` -- `result` in `KERNELS` and `OPEN_KERNELS`, `result: []` in `GRAPH`, updated counts in comments; rule `only-specs-import-result-testing` (from not `TEST_FILE`, not `^packages/result/src/`; to `entry('result','testing')`).
- [x] `tooling/ad10/violations/packages/` -- fixtures: `result/src/index.ts` importing a workspace package and an npm package; `storage/src/index.ts` importing `@keeb-cad/result` (allowed) and `@keeb-cad/result/testing` (violation); a storage spec importing `@keeb-cad/result/testing` (allowed).
- [x] `tooling/ad10/rules.spec.ts` -- counts, kernel check includes `result`, expected violations and allowed edges for the fixtures.
- [x] `tooling/verify-checks.sh` -- run; add a row only if it lists rule names.

**Acceptance Criteria:**
- Given the workspace, when `pnpm check` runs, then it passes and the `result` specs run once, on Node, with every ported source test present except the three `fromValibot` ones.
- Given `rules.spec.ts`, when it runs, then the new fixtures fire the kernel, npm and `only-specs-import-result-testing` rules, and no import is reported twice.
- Given `@keeb-cad/result`'s root, then it exports no `expectOk`/`expectErr`; given `@keeb-cad/schema`, then it exports no `Result`.
- Given `sh tooling/verify-checks.sh`, then every row passes.

## Implementation Notes

- No rule stopped a kernel importing an npm package, so the matrix's "kernel / npm rule" row needed one: `result-imports-no-npm-package` (from `^packages/result/` except specs; to any bare or `node_modules` target that is not a workspace package or fixtures).
- `eslint.config.ts`: `vitest/expect-expect` counts `expectTypeOf`, `expectOk`, `expectErr` as assertions in every spec; `packages/result/src/**` allows unused `_`-prefixed parameters (the side of `Ok`/`Err`, `Some`/`None` that ignores a callback keeps it so type arguments infer).
- Lint-driven edits, behaviour unchanged: `async-result.ts` disables `unicorn/no-thenable` and `unicorn/prefer-await` file-wide with a one-line why; `attempt.ts`'s runners use ternaries; spec `tap(() => undefined)` became `() => {}`.
- `AsyncResult.ok()` got the same zero-argument overload as `Result.ok()`, for symmetry.
- `vitest.config.ts` unchanged: `'packages/*'` collects the specs once, on Node, as project `@keeb-cad/result` (111 tests: 108 ported + 3 new). No `tsconfig.node.json`, since there is no config file.
- `attempt.ts` keeps its private runner functions beside `attempt`; whether AGENTS.md's "helper functions each get their own file" wants them split is left to 23.12.
- `tooling/verify-checks.sh` failed at setup: untracked, unignored Claude Code agent worktrees under `.claude/worktrees/` reached its `ls-files --others` copy, and `cp` without `-r` refuses a nested checkout. Fixed at the root by ignoring `.claude/worktrees/` in `.gitignore`; the checked-in script then passes every row. Its copy step still assumes untracked entries are files.

## Plan Change Log

## Review Triage Log

Pass 1 (quick): high 0, medium 0, low 8, false 0, maybe-false 1.

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | `only-specs-import-result-testing` exempts all of `^packages/result/src/`, so production result code may import the helpers | low | patch | Real: specs are already exempt via `TEST_FILE`, and the testing files never import the testing entry; narrow to the testing folder. The plan's task line carried the same over-wide exemption. |
| 2 | Same rule fences only the testing entry, not the folder | low | patch | Real: `entry()` matches `src/testing/index.ts` and the bare specifier only; a resolved `src/testing/expect-ok.ts` import passes, unlike the `di-root-reaches-no-vue` precedent. Merged with 1 into one rule fix. |
| 3 | `attempt.ts` (four runners, two overloads) and `result.ts` (`ok`) hold helper functions beside their export | maybe-false | defer | AGENTS.md's "tokens, errors, `define*` factories and helper functions each get their own file" reads as each kind in its own file or as each function in its own; the plan listed `attempt.ts` as one file. Settling it edits AGENTS.md; for Sergii and 23.12. |
| 4 | `AsyncResult`'s private field and constructor sit before its public methods | low | patch | Real: AGENTS.md "public API first, private details below". |
| 5 | `AsyncResult`'s "#promise never rejects" comment is false | low | patch | Real: `attempt.spec.ts`'s sync-throw case asserts a rejection; throwing callbacks reject too. Deleted. |
| 6 | `_fromPromiseOfResult` JSDoc names only `attempt.in` | low | patch | Real: `dispatch` uses it for `attempt` too; the comment restates usage. Deleted. |
| 7 | New `Result.ok()` test narrows with `expectOk` then reads `.value` | low | patch | Real: AGENTS.md "assert whole values"; new code, not a port. |
| 8 | AC "verify-checks.sh, every row passes" unmet with the checked-in script | low | patch | Real: untracked `.claude/worktrees/` broke the script's copy step; `.gitignore` now ignores it and the checked-in script passes every row. |
| 9 | `result-imports-no-npm-package` exempts result's specs entirely, so a spec may import any npm package | low | reject | Real but unlikely in use (specs import vitest only), and the fix adds a vitest-specific allow-list to the rule. |

## Design Notes

`result/testing` is a subpath, not part of the root, so a production import of `expectOk` is caught by depcruise rather than by review. The fence mirrors `fixtures-only-in-tests`: spec files anywhere may import it, and `result`'s own `src/` may (its specs and the testing folder).

Zero-argument `ok` needs overloads (`(): Result<void, never>` and `<T>(value: T): Result<T, never>`); an optional parameter would let `Result.ok<number>()` type-check.

## Verification

**Commands:**
- `pnpm install && pnpm check` -- expected: all steps pass.
- `pnpm vitest run --project tooling` -- expected: `rules.spec.ts` passes.
- `pnpm vitest run packages/result` -- expected: 108 + new tests pass, on Node only.
- `sh tooling/verify-checks.sh` -- expected: every row PASS.
- `grep -rn valibot packages/result` -- expected: no output.
