---
title: 'The thread plumbing matches the spine'
type: 'refactor'
ticket: '1'
created: '2026-11-03'
status: done
baseline_revision: '75ca4eea2f20bfd7e3f706307ebc659810b57de8'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The workspace still has the old 14-package graph (everything imports `model`, the Vue app sits in `app/`, worker code is fenced by a `*.worker.ts` name rule). AD-10 and AD-25 now draw 28 packages, four thread entries in `app`, and per-entry fences; later stories (23.10, 23.2 onward) are built against that layout.

**Approach:** Structure only, no behaviour change. Scaffold the missing packages as `export {}` stubs with package `exports` (subpaths included), move the Vue app to `packages/editor`, make `app` the composition package with the four thread entries, and rewrite `.dependency-cruiser.mts` so every drawn AD-10 edge is an imports-only rule plus the AD-25 entry fences, each proven by a fixture in `tooling/ad10/violations`.

## Boundaries & Constraints

**Always:** Rules come from AD-10's graph and AD-25's fences as written; every forbidden rule is proven to fire (a generated or hand-written violation), no import is reported under two rules, and every configured rule is exercised. Shared third-party deps go through the catalog (`tooling/catalog.spec.ts`). The editor still renders the same shell at `/` (the smoke test and component test pass unchanged in content).

**Decision (2026-11-03):** `blueprint` (with `blueprint/worker` and `blueprint/authoring` subpaths) and `viewer3d` are scaffolded here as stubs too, so the tree holds all 28 packages; the ticket's scaffold list had omitted them.

**Decision (2026-11-03):** the seven kernels (`expr`, `reactive`, `messaging`, `hashing`, `geometry`, `di`, `ui`) import no workspace package at all, `di` and `reactive` included; the "any package may import" openness of `di` and `reactive` applies to the other 21.

**Decision (2026-11-03):** table-driven rules. AD-10's graph is one data table in `.dependency-cruiser.mts` (package → allowed packages); the imports-only rules are generated from it, and the test generates one forbidden import per package from the same table and checks its rule fires. Hand-written fixtures remain only for the subpath rules, the entry fences and the npm rules. No exact-violation-list assertion; each rule is proven able to fire, and an allowed edge reports nothing.

**Never:** No runtime code in the stubs (no di container, no Immer, no worker spawning, no routing change); the worker entries are not spawned or bundled yet (story 4). No design-file field or schema. No removal of `@snap/ts-inject` (23.10). No `library/blueprints-src` fences (13.x owns them). No npm-only rules beyond moving immer and splitting the Vue rule (quickjs-wasi, three, clipper2-ts, flatbush, valibot fences wait for their packages' stories).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Drawn edge | a package imports one it is drawn to (e.g. `pipeline` → `design/worker`) | no violation | — |
| Undrawn edge | a package imports one not drawn (e.g. `plates` → `pcb`) | its imports-only rule reports it | depcruise exits non-zero |
| Wrong subpath | `editor` → `@keeb-cad/model` root; `pipeline` → `model/main`; `design` → `library/worker` | subpath rule reports it | — |
| Main fence | `app/src/main.ts` reaches `pipeline`, a stage, `blueprint` or `quickjs-wasi` through any chain | reported | — |
| Worker fence | a worker entry reaches `ui`, `editor`, `di/vue` or `vue` | reported | — |
| Case worker | `case.worker.ts` reaches `model` | reported | — |
| Open kernels | any non-kernel package imports `di` root or `reactive` | no violation | — |
| Closed kernels | a kernel (e.g. `geometry`) imports `reactive` or `di` | its kernel rule reports it | — |

</frozen-after-approval>

## Code Map

- `.dependency-cruiser.mts` -- the rules; keep `ws`, `npm`, `VUE`, `VUE_REACTIVITY`, `importsOnly`, `onlyImports` helpers and the `options` block. Today's rules encode the old graph (stages import `model`); `EDITOR` = `^app/`; `tsConfig` points at `app/tsconfig.app.json`.
- `tooling/ad10/rules.spec.ts` -- exact-set assertion of fixture violations, "no import under two rules", "every rule exercised", allowed-edge checks, a real-tree cruise of `app/src/main.ts` proving `vue` resolves.
- `tooling/ad10/violations/{packages,app,fixtures}/` -- fixture tree, cruised with no node_modules (bare specifiers stay unresolved, so rules match both `packages/x/` and `@keeb-cad/x`).
- `tooling/verify-checks.sh` -- rows name `plates-and-pcb-import-only-model-geometry-reactive`, `app/index.html`, `app/src/views/HomeView.vue`.
- `packages/*` -- 14 stubs (`src/index.ts` = `export {}`, `tsconfig.json` composite, `package.json` with `exports: { ".": "./src/index.ts" }`); `model` has deps `@snap/ts-inject`, `immer`, `valibot`.
- `app/` -- today the editor (`@keeb-cad/editor`): `src/main.ts` (createApp + router + mount), `App.vue`, `App.spec.ts`, `router/`, `views/HomeView.vue`, `vitest.config.ts` (browser mode, Chromium + Firefox), `vite.config.ts`, `playwright.config.ts`, `e2e/vue.spec.ts`, `index.html`, tsconfigs.
- `package.json` (root) -- `depcruise: depcruise packages app/src fixtures`, `build`/`smoke` filter `@keeb-cad/editor`.
- `tsconfig.json` (root) -- project references per package. `vitest.config.ts` (root) -- projects `packages/*`, `fixtures`, `app`, tooling.
- `eslint.config.ts` -- `NODE_FILES` names `app/*.config.ts`, `app/e2e/**`. `.github/workflows/check.yml` -- installs browsers via `--filter @keeb-cad/editor`. `AGENTS.md` -- names `app/vitest.config.ts`.
- `pnpm-workspace.yaml` -- catalog; `vite`, `@vitejs/plugin-vue`, `@tsconfig/node26`, `@vue/tsconfig` become shared once `app` and `editor` both declare them.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/{expr,messaging,hashing,di,schema,design,design-file,protocol,commands,workers}/` -- add stub packages (package.json, tsconfig.json, `src/index.ts`) like the existing stubs; subpaths `di/vue` (`src/vue.ts`), `design/worker` (`src/worker.ts`) -- AD-10/AD-25 package list.
- [ ] `packages/blueprint/`, `packages/viewer3d/` -- stub packages; `blueprint/worker` (`src/worker.ts`) and `blueprint/authoring` (`src/authoring.ts`) subpaths -- Decision 2026-11-03.
- [ ] `packages/model/`, `packages/library/` -- add subpaths `model/main`, `model/worker`, `library/worker` (`src/main.ts`, `src/worker.ts`).
- [ ] `packages/editor/` -- `git mv` the Vue app (src, `App.spec.ts`, `env.d.ts`, `vitest.config.ts` with the vue plugin inline, tsconfigs for app/vitest); `src/index.ts` exports `mountEditor(selector)` doing today's createApp + router + mount; package `@keeb-cad/editor` -- the editor is UI only.
- [ ] `app/` -- rename to `@keeb-cad/app`; `src/main.ts` calls `mountEditor('#app')`; add `src/model.worker.ts`, `src/case.worker.ts`, `src/routing.worker.ts` (`export {}` with a one-line thread comment); keep `index.html`, `vite.config.ts`, `playwright.config.ts`, `e2e/`; update `README.md` -- composition package.
- [ ] `pnpm-workspace.yaml`, manifests -- catalog the newly shared deps; `pnpm install` updates the lockfile.
- [ ] `package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.ts`, `.github/workflows/check.yml`, `AGENTS.md` -- new package paths and names.
- [ ] `.dependency-cruiser.mts` -- rewrite the rule set per Design Notes; drop `worker-imports-no-reactive`, `editor-imports-no-stage`, `nothing-imports-editor`, `only-editor-imports-ui`, `pipeline-imports-no-storage` (covered by imports-only), the old stage rules and routing's "one stage-to-stage import" wording; `only-register-imports-immer` becomes `only-design-imports-immer`.
- [ ] `tooling/ad10/rules.spec.ts` -- for each table row, write a temp tree (in a vitest tmpdir) where the package imports one package not in its allowed list, plus one that imports every allowed one; cruise it with the real config; expect exactly that row's rule to fire on the first and nothing on the second. Keep "no import under two rules", "every configured rule exercised", the Vue/npm regex unit tests, and the real-tree cruise (now of `packages/editor/src/index.ts`).
- [ ] `tooling/ad10/violations/` -- shrink to hand-written fixtures for the subpath rules, the entry fences (reachable through an intermediate module), the kernel rule and the npm rules; delete the rest.
- [ ] `tooling/verify-checks.sh` -- new rule name and editor paths.

**Acceptance Criteria:**
- Given the real workspace, when `pnpm check` runs, then typecheck, lint, format, depcruise, unit tests (editor component test in Chromium and Firefox), build and smoke pass.
- Given the graph table, when `rules.spec.ts` runs, then every row's generated forbidden import fires that row's rule, its allowed imports report nothing, every hand-written fixture fires its rule, and no import is reported twice.
- Given a row's allowed list is edited in the table, when the test runs, then no fixture needs a hand edit.
- Given `sh tooling/verify-checks.sh`, when it runs, then every row passes.
- Given `ls packages`, then it lists 27 packages and `app` is the 28th, matching AD-10.

## Design Notes

Rule shape: an exported `GRAPH` table, `{ package: allowed[] }` for all 28 plus `fixtures` (allowed = drawn targets; `di` root and `reactive` added for every non-kernel row by the generator), one generated `importsOnly` rule per row named `<package>-imports-only-drawn-edges` (`app` matches `^app/src/`), then hand-written subpath and entry rules:

- `editor`, `commands`, `design` → `model` only through `model/main`; `pipeline` → `model` root only; `pipeline` → `design` only through `design/worker`; `design`, `pipeline`, `commands` → `library` main only.
- `only-model-worker-entry-imports-model-worker`; `only-model-worker-entry-and-pipeline-import-design-worker`; `only-worker-entries-import-library-worker` (model and case); `only-editor-imports-di-vue`; model's root and `model/main` never reach `blueprint` (the "model/worker only" label).
- Entry fences use `reachable: true` from `^app/src/main\.ts$` and `^app/src/(model|case|routing)\.worker\.ts$`.
- Vue: `vue`, `vue-router`, `@vue/*` from `editor`, `ui`, `di/vue`; `@vueuse/core` from `editor` and `ui` only.
- `app` (at `app/src/`) gets its own imports-only rule: editor, design, commands, workers, storage, schema, pipeline, model, library, blueprint, case, routing.

The worker entries import nothing yet: the fences are proven on the fixture tree, and story 4 gives them real imports.

## Verification

**Commands:**
- `pnpm install --frozen-lockfile=false && pnpm check` -- expected: all steps pass.
- `pnpm vitest run --project tooling` -- expected: `rules.spec.ts` and `catalog.spec.ts` pass.
- `sh tooling/verify-checks.sh` -- expected: every row PASS.

## Implementation Notes

- `@snap/ts-inject` stays on `app` (23.10 removes it from app and model); the implementer had moved it to editor, restored by hand.
- `immer` moved from model's manifest to design's, matching `only-design-imports-immer`.
- `verify-checks.sh` breaks on untracked `.claude/worktrees/` in the checkout (pre-existing); run with that path in `.git/info/exclude`.

## Plan Change Log

## Review Triage Log

Pass 1 (quick): high 0, medium 1, low 3, false 0, maybe-false 0; plus 1 deferred (agent-context file).

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | A direct forbidden import from an entry (e.g. `case.worker.ts` → `model/worker`, a worker → `vue`) is reported by its fence and by another rule | low | reject | Real: reachable fences also match depth-1 imports and dependency-cruiser cannot exclude them. Only a duplicated error line, the import still fails; fixing needs per-entry carve-outs in several rules. Rare in use. |
| 2 | `GRAPH.app` allows `model` and `library` whole; AD-10 draws them only as `model/worker` and `library/worker` | medium | patch | Real: `main.ts` → `@keeb-cad/model/main` or `@keeb-cad/library` passes every rule; the generated `allowed.ts` asserts it. Fix: an `ENTRY_ONLY` row for app, with the worker fences still covering app's non-entry files. |
| 3 | AC "editing a row needs no fixture edit" fails for hand-written fixtures that rely on drawn edges | low | reject | Real for subpath-fence fixtures (e.g. pipeline → model root), which must import through a drawn edge to test the subpath; generated rows meet the AC. Inherent to the hand-written rules the decision kept. |
| 4 | `tooling/ad10/violations/fixtures/src/index.ts` is unused | low | patch | Real: every fixture imports `@keeb-cad/fixtures` by bare specifier, unresolved; nothing reaches the file. Delete it. |
| 5 | AGENTS.md line 17 still says the rules are proven by the violation tree | low | defer | Real; fix edits an agent-context file. |
