---
title: 'di replaces ts-inject'
type: 'refactor'
ticket: '10'
created: '2026-11-03'
status: 'built'
baseline_revision: 'bde2486e0de4ab3cb444b15fb58cc577bc3cd47c'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `packages/di` is an `export {}` stub, and `@snap/ts-inject` is still in the catalog and in `app`'s and `model`'s manifests, though AD-25 names the obsidian-journal container as the wiring kernel. Every later story (23.2 onward) registers services into `di`.

**Approach:** Port `/home/ruyu/projects/obsidian-journal/src/infrastructure/di` and its tests into `packages/di`: the Vue-free container at the root, the Vue bridge as the `di/vue` subpath. Add the "di's root reaches no Vue" fence with a fixture, and remove `@snap/ts-inject` everywhere.

## Boundaries & Constraints

**Always:** Behaviour and public names of the container match the source (tokens, multi tokens, class tokens, `inject()`, modules, three lifetimes, scopes, `override`, `autoLoad`, `dispose`, the nine errors with resolution chains). Every source test is ported and passes. `di`'s root imports no workspace package and no Vue; only `di/vue` imports `vue`. DOM tests run in Vitest browser mode (Chromium and Firefox) with vitest-browser-vue. Shared third-party deps go through the catalog. Code follows keeb-cad's Prettier, ESLint and `*.spec.ts` conventions.

**Decision (2026-11-03):** `ts-pattern` joins the pnpm catalog and is a `di` dependency; the source's `match` calls are ported verbatim. The repo uses `ts-pattern` going forward.

**Never:** No services, modules or tokens registered anywhere (23.2 onward). No `@testing-library/vue`, jsdom or `@vue/test-utils`. No Vue runtime template compiler (rewrite test components with render functions). No port of obsidian-journal's `noProductionOverride` lint rule or its `AGENTS.md` (AD-25 makes "override only in tests and `main.ts`" a reviewer rule). No change to AD-10's `GRAPH` table.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Kernel use | a non-kernel package imports `@keeb-cad/di` | no violation | — |
| Root reaches bridge | a di root file reaches `src/vue/` through another di file | `di-root-reaches-no-vue` reports it, once | depcruise exits non-zero |
| Root imports vue | a di root file imports `vue` | `only-editor-ui-and-di-vue-import-vue` reports it | — |
| Bridge internals | `src/vue/index.ts` imports `vue` and di root files; `src/vue/vue.spec.ts` imports `./index` | no violation | — |
| Outside importer | `storage` imports `@keeb-cad/di/vue` | `only-editor-imports-di-vue` reports it | — |
| Missing provider | `useService` outside `provideInjector` | throws `MissingInjectorProviderError` | as source |

</frozen-after-approval>

## Code Map

- `/home/ruyu/projects/obsidian-journal/src/infrastructure/di/` -- source: 11 modules (`container`, `token`, `inject`, `injector`, `lifetime`, `module`, `scope`, `bindings`, `registration`, `errors`, `vue`) and 9 `*.test.ts` (~1.9k lines). Style differs (double quotes, semicolons); `container.ts`, `scope.ts`, `bindings.ts` use `ts-pattern`'s `match` (5 calls over `Lifetime` and `tokenKind`). `index.ts` re-exports the Vue functions from the root: drop them. `vue.test.ts` uses `@testing-library/vue` and `template:` strings.
- `packages/di/` -- stub: `package.json` (`exports` `.` → `src/index.ts`, `./vue` → `src/vue.ts`), composite `tsconfig.json` over `src`, stale `dist/` and `tsconfig.tsbuildinfo`.
- `packages/editor/{vitest.config.ts,tsconfig.vitest.json,package.json}` -- the browser-mode pattern to copy (playwright provider, Chromium + Firefox, `@vitejs/plugin-vue`, `vitest-browser-vue` types).
- `vitest.config.ts` (root) -- `projects: ['packages/*', …]`; a `packages/di/vitest.config.ts` is picked up as its own project.
- `.dependency-cruiser.mts` -- `entry(name, sub)` matches only `src/<sub>.ts`; `onlyOwnersImportEntry('only-editor-imports-di-vue', …)` includes `di` itself in `from`; the Vue rule's `pathNot` already allows `^packages/di/src/vue(\.ts$|/)`. Keep `GRAPH`, `KERNELS`, `OPEN_KERNELS`.
- `tooling/ad10/violations/packages/di/src/vue.ts` and `tooling/ad10/rules.spec.ts` lines ~53–55, 89 -- fixtures and expectations naming `packages/di/src/vue.ts`. `reports no import under two rules` keys on `from -> to`.
- `pnpm-workspace.yaml:15`, `app/package.json`, `packages/model/package.json` -- the only `@snap/ts-inject` references (no source imports it).
- `tooling/verify-checks.sh` -- rerun after the depcruise change (AGENTS.md).

## Tasks & Acceptance

**Execution:**
- [x] `packages/di/src/` -- port the root modules (Prettier style, `match` kept) and root tests as `*.spec.ts`; `index.ts` exports everything the source root does except the Vue functions; delete `src/vue.ts`.
- [x] `packages/di/src/vue/index.ts`, `packages/di/src/vue/vue.spec.ts` -- the bridge (`provideInjector`, `provideInjectorOnApp`, `useInjector`, `useService`) and its test rewritten for vitest-browser-vue with `defineComponent` + `h()` render functions.
- [x] `packages/di/{package.json,tsconfig*.json,vitest.config.ts}` -- `./vue` → `./src/vue/index.ts`; `ts-pattern` (catalog, added to `pnpm-workspace.yaml` at the source's version) and `vue` as dependencies, only the test devDeps di uses (no `@vue/tsconfig`); tsconfig split like editor's (lib excluding specs, a spec config with DOM lib and `vitest-browser-vue` types, a node config for `vitest.config.ts`); `vitest.config.ts` (project `di/vue`) runs only `src/vue/**/*.spec.ts` in browser mode, Chromium and Firefox.
- [x] `vitest.config.ts` (root) -- an inline Node project `di` (root `packages/di`, `src/**/*.spec.ts`, excluding `src/vue/**`) runs the root specs. Delete stale `dist/` and `tsconfig.tsbuildinfo` if untracked.
- [x] `.dependency-cruiser.mts` -- `entry()` also matches `src/<sub>/index.ts`; exclude `^packages/di/src/` (not all of `^packages/di/`) from `only-editor-imports-di-vue`'s `from`; add `di-root-reaches-no-vue` (from `^packages/di/src/`, pathNot `^packages/di/src/vue/`, to the whole bridge folder `^packages/di/src/vue/`, `reachable: true`). Add `packages/di/*.config.ts` to eslint's `NODE_FILES` if lint needs it.
- [x] `tooling/ad10/violations/packages/di/src/` -- move the bridge fixture to `vue/index.ts`; add `index.ts` → `./wiring.ts` → `./vue/index.ts` for the new rule. Update `rules.spec.ts` expectations.
- [x] `pnpm-workspace.yaml`, `app/package.json`, `packages/model/package.json`, `pnpm-lock.yaml` -- remove `@snap/ts-inject`; `pnpm install`.
- [x] `tooling/verify-checks.sh` -- add a row for the new rule if it lists rule names.

**Acceptance Criteria:**
- Given the workspace, when `pnpm check` runs, then it passes, and the di specs run in Chromium and Firefox with every ported source test present.
- Given `grep -r ts-inject` over manifests, lockfile and sources, then nothing matches.
- Given `rules.spec.ts`, when it runs, then the new fixture fires `di-root-reaches-no-vue` and no import is reported twice.
- Given `sh tooling/verify-checks.sh`, then every row passes.

Pass 2 (quick, after loop 1): high 0, medium 0, low 4, false 0, maybe-false 0.

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | Vue rule still exempts `packages/di/src/vue.ts`; a root file there could import vue unreported | low | patch | Real: `pathNot` keeps `vue(\.ts$|/)` after the bridge became a folder, and `di-root-reaches-no-vue` targets only `src/vue/`. Fix: exempt `^packages/di/src/vue/` only. |
| 2 | An unresolved bare `@keeb-cad/di/vue` from di's root matches neither rule | low | patch | Real: the owner fence now skips `^packages/di/src/` and the new rule's `to` has no bare-specifier alternative; fixtures keep bare imports unresolved. Fix: add `^@keeb-cad/di/vue$` to `to`, with a fixture line. |
| 3 | First AC says all di specs run in Chromium and Firefox | low | reject | Real but the fix edits this build's plan; the code follows the spine (Node for non-DOM). |
| 4 | `tsconfig.vitest.json` gives root specs DOM lib and browser types; comment says all specs run in browser mode | low | patch (comment only) | Real; a DOM use in a root spec still fails loudly at its Node run, and a third tsconfig is more than a direct correction, so only the stale comment is fixed. |

## Design Notes

Bridge under `src/vue/` so its spec sits inside the Vue-allowed folder; the fence needs `entry()` to recognise a folder entry. The new rule's `to` is the bridge folder only, so a direct `import 'vue'` stays the Vue rule's alone; di's own files leave `only-editor-imports-di-vue` so a root → bridge import reports once. The fence's `to` is the bridge folder, not its entry file, so a future bridge-internal file stays fenced. Root specs run on Node and only the bridge's specs in the browser: the spine's Verification layer 2 puts every non-DOM test on Node.

## Implementation Notes

- `noUncheckedIndexedAccess`: `Container.resolve` and `Scope.resolve` take `first = entries?.[0]` for the single case; `registration.spec.ts` reads `entries[0]?.factory()`. Lint autofixes: `() => {}` for `() => undefined` (unicorn/no-useless-undefined) and a ternary in `tokenName` (unicorn/prefer-ternary). Behaviour unchanged.
- `di`'s lib config uses `lib: ["ES2023", "ESNext.Disposable"]` (no DOM) for `Symbol.dispose`/`Symbol.asyncDispose`; the spec config adds DOM.
- `@vitest/browser-playwright` and `vitest-browser-vue` moved into the catalog (editor and di both declare them; `tooling/catalog.spec.ts`). `@vitejs/plugin-vue` is not a di dependency: no SFCs, render functions only.
- `only-editor-imports-di-vue` excludes di by adding `^packages/di/` to its owners (`pathNot`), with no new helper parameter.
- The bridge spec asserts `MissingInjectorProviderError` (the source asserted any throw); `render` is async, so it is `rejects.toThrow`.
- The violation tree also has `wiring.ts` import `vue` (matrix row "Root imports vue") and `vue/vue.spec.ts` → `./index`, `vue/index.ts` → `../errors` (matrix row "Bridge internals"), each asserted in `rules.spec.ts`.
- `verify-checks.sh` names no rule besides the AD-10 row, so no row was added.
- Loop 1: the root specs' Node project is inline in the root `vitest.config.ts` rather than a second config file in `packages/di` with a `packages/*/vitest.browser.config.ts` glob; one di config and no workspace-wide glob. The loop-1 task text failed to apply to the ticked list and was corrected afterwards to what was built.

## Plan Change Log

- Loop 1 (review pass 1). Trigger: Design Notes ran every di spec in browser mode, against the spine's Verification layer 2 ("everything else on Node"). Amended: Tasks (two Vitest projects, root `projects` entry), Design Notes; folded in pass-1 patches (fence `to` = bridge folder; exemption narrowed to `^packages/di/src/`; no `@vue/tsconfig` devDep). Known-bad state avoided: non-DOM kernel tests in browsers, setting the precedent for every later kernel. KEEP: the ported modules and specs, the Implementation Notes' deviations, the catalog moves, the tsconfig split, the fixtures and `rules.spec.ts` expectations, `entry()`'s folder match. The pass-1 tree is saved at `/tmp/claude-1000/-home-ruyu-projects-keeb-cad/6026a052-08d7-4896-bf58-a75eab923353/scratchpad/pass1-full.patch` (`git apply` it, then make only the amended changes).

## Review Triage Log

Pass 1 (quick): high 0, medium 1, low 3, false 0, maybe-false 0.

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | `packages/di/vitest.config.ts` runs non-DOM root specs in browsers and cites AD-26/layer 2 for it | medium | bad_plan | Real: spine line 942 says "everything else on Node"; the plan's Design Notes chose one browser config. |
| 2 | `di-root-reaches-no-vue` targets only `src/vue/index.ts`; a bridge-internal file importing vue escapes all three rules | low | patch (folded into loop 1) | Real: `entry()` matches the index only, Vue rule exempts `src/vue/`, di is exempt from the owner fence. Fix: `to` = `^packages/di/src/vue/`. |
| 3 | `only-editor-imports-di-vue` exempts all `^packages/di/`, the new rule covers only `src/` | low | patch (folded into loop 1) | Real: `pnpm depcruise packages` cruises `packages/di/*.config.ts`; narrow to `^packages/di/src/`. |
| 4 | `@vue/tsconfig` devDep unused in di | low | patch (folded into loop 1) | Real: no di tsconfig extends it. |

## Verification

**Commands:**
- `pnpm install && pnpm check` -- expected: all steps pass.
- `pnpm vitest run --project tooling` -- expected: `rules.spec.ts` passes.
- `sh tooling/verify-checks.sh` -- expected: every row PASS.
- `grep -rn ts-inject pnpm-workspace.yaml pnpm-lock.yaml app packages --include=* -l | grep -v node_modules` -- expected: no output.
