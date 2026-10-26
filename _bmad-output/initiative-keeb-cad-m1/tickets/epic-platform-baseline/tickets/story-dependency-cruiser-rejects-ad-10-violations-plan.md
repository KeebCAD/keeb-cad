---
title: 'dependency-cruiser rejects AD-10 violations'
type: 'feature'
ticket: '2'
created: '2026-10-26'
status: 'built'
baseline_revision: 'deaa74e8de97bb1a88e30666cb0d53d34c3fceec'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** AD-10's dependency direction is only written down. Nothing stops a stage importing another stage, `model` importing a workspace package, a library importing Vue, or anything importing `editor`.

**Approach:** Encode AD-10 as dependency-cruiser 18.7.0 `forbidden` rules in one root config, run it over the real workspace as a `pnpm check` step, and prove each rule with a Vitest test that cruises a committed tree of deliberate violations through the dependency-cruiser API.

## Boundaries & Constraints

**Always:**
- dependency-cruiser is pinned at 18.7.0 (Stack) as a root devDependency.
- Every rule has `severity: "error"` and a kebab-case `name`, which the depcruise output prints.
- Stages are plates, pcb, routing, drc, case, firmware and exports.
- A rule matches a workspace target by resolved path (`packages/<name>/`, `app/`, `fixtures/`) **and** by bare specifier (`@keeb-cad/<name>`), so undeclared or unresolved imports are caught too.
- Each forbidden import reports under exactly one rule. Rules exclude each other's targets so nothing double-reports.
- Type-only imports count (`tsPreCompilationDeps: true`).
- "Vue" means `vue`, `@vue/*`, `vue-router`, `pinia` and `*.vue` files, both as bare specifiers and as pnpm-resolved `node_modules/` paths.
- The real cruise covers `packages`, `app/src` and `fixtures`. It never covers `spikes/`, `dist/`, `node_modules/` or the violation tree.

**Never:**
- No lint, Prettier, pre-commit hook or Playwright work (story 1.3).
- No CI workflow (story 1.4).
- No real cross-package imports added to the workspace.
- Workspace package count stays 13; the test lives outside any package.
- No `allowed` rules, because their violations are all named `not-in-allowed`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean workspace | `pnpm check` on the current empty packages | depcruise reports 0 violations; check exits 0 | — |
| Stage → stage | `plates` imports `pcb` (relative path or bare `@keeb-cad/pcb`) | one `stage-imports-only-model` error each | depcruise exits non-zero |
| Routing exception | `routing` imports `drc` and `model` | no violation | — |
| Routing → other | `routing` imports `pcb` | one `routing-imports-only-model-and-drc` error | exits non-zero |
| Model → workspace | `model` type-imports `library` | one `model-imports-no-workspace-package` error | exits non-zero |
| Library/storage → other | `library` imports `storage` | one `library-and-storage-import-only-model` error | exits non-zero |
| Pipeline → storage | `pipeline` imports `storage` | one `pipeline-imports-no-storage` error | exits non-zero |
| Vue outside editor | `storage` imports `vue` (resolved or not) | one `only-editor-imports-vue` error | exits non-zero |
| Import editor | `pipeline` or `plates` imports `app/src/...` or `@keeb-cad/editor` | one `nothing-imports-editor` error | exits non-zero |
| Editor → stage | `app/src` (`.ts` or `.vue`) imports `plates` | one `editor-imports-no-stage` error | exits non-zero |
| Fixtures in source | `model/src/index.ts` imports `@keeb-cad/fixtures` | one `fixtures-only-in-tests` error | exits non-zero |
| Fixtures in a test | `model/src/x.spec.ts` imports `@keeb-cad/fixtures` | no violation | — |
| Spike | a file in `spikes/` imports `vue` and a stage | not cruised; check unaffected | — |

**Decisions:**
- 2026-10-26 (user): pin Node 26.
  - Why: dependency-cruiser 18.7.0 refuses Node 25 (`engines ^22||^24||>=26`), and Node 25 is past end of life.
  - How: add a repo `mise.toml` with `node = "26.12.1"`, and set root and `app` `engines.node` to `>=26`.
  - Story 1.4's workflow uses the same version.
- 2026-10-26 (user): enforce the full AD-10 diagram. Add `library-and-storage-import-only-model`: `library` or `storage` importing anything in the workspace except `model` is a violation. Also add `pipeline-imports-no-storage`.
- 2026-10-26 (user, plan review): fixtures are for tests only. `fixtures-only-in-tests` forbids any `packages/` or `app/` file other than `*.spec.ts`, `*.test.ts` or `__tests__/**` from importing `fixtures`. Other rules leave `fixtures` targets to this one. `fixtures`' own source falls under only the Vue and editor rules.
- 2026-10-26 (user, plan review): the editor's outbound edges are enforced too. `editor-imports-no-stage` forbids `app/` importing any stage. A root devDep `@vue/compiler-sfc` 3.5.44 lets dependency-cruiser parse `.vue` files, so imports inside components are checked.

</frozen-after-approval>

## Code Map

- `package.json` -- root scripts. `check` = `pnpm typecheck && pnpm test && pnpm build`. Root devDeps use `catalog:`; dependency-cruiser and `@vue/compiler-sfc` are root-only, so pin them directly.
- `vitest.config.ts` -- `test.projects: ['packages/*', 'fixtures', 'app']`. Add an inline project: name `tooling`, `environment: 'node'`, `include: ['tooling/**/*.spec.ts']`.
- `tsconfig.node.json` -- root tool configs, `noEmit`, includes only `vitest.config.ts`. Add `tooling/**/*.ts` and `.dependency-cruiser.mts`, exclude `tooling/**/violations/**`, and add `types: ["node"]` with root `@types/node` `^24.13.4` (matching `app` and `fixtures`). There is no `allowJs`, which is why the config is `.mts`.
- `packages/<name>/src/index.ts` -- each is `export {}` with no inter-package deps, so the real tree cruises clean.
- `app/src/` -- `main.ts`, `App.vue`, `router/`, `views/`. The `@/*` alias comes from `app/tsconfig.app.json`.
- dependency-cruiser 18.7.0 facts, checked against its source:
  - `$1` from-groups substitute into `to.path`/`pathNot` (`src/validate/matchers.mjs:99`).
  - An unresolved import's `resolved` is the bare name (`src/extract/resolve/resolve-cjs.mjs:46`).
  - `.mts` configs load (`read-config.mjs`).
  - `ruleSet.options` deep-merges into the API's cruise options (`src/main/options/assert-validity.mjs:129`).
  - `exportsFields` defaults to `[]` (`src/main/resolve-options/normalize.mjs:34`).
  - The CLI throws outside its Node engines (`src/cli/assert-node-environment-suitable.mjs`).
  - `@vue/compiler-sfc` must resolve from the root `node_modules`.
  - `cruise(paths, { baseDir, ruleSet, ... })` (`types/dependency-cruiser.d.mts:75`). `baseDir` (`types/options.d.mts:192`) lets the test run the real rules on the violation tree.
- Baseline commit: `deaa74e8de97bb1a88e30666cb0d53d34c3fceec`.

## Tasks & Acceptance

**Execution:**
- [x] `mise.toml`, `package.json`, `app/package.json` -- dependency-cruiser runs.
  - Add `[tools] node = "26.12.1"` and run `mise install`.
  - Set `engines.node` to `>=26` in both `package.json` files.
- [x] `package.json` -- R2 in `pnpm check`.
  - devDeps: `dependency-cruiser` `18.7.0`, `@vue/compiler-sfc` `3.5.44`, `@types/node`.
  - Script `depcruise` = `depcruise packages app/src fixtures --config .dependency-cruiser.mts`.
  - `check` runs typecheck → depcruise → test → build.
- [x] `.dependency-cruiser.mts` -- typed `IConfiguration` default export, the single source of truth for the CLI and the test.
  - Nine rules from the matrix, built from `STAGES`/package-name lists by a helper, so the regexes are never hand-copied.
  - Options:
    - `doNotFollow: { path: 'node_modules' }`
    - `exclude: '(^|/)(dist|node_modules)/'`
    - `tsPreCompilationDeps: true`
    - `tsConfig: { fileName: 'app/tsconfig.app.json' }`
    - `enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'types', 'default'], extensions: ['.ts', '.vue', '.mjs', '.js', '.json'] }`
- [x] `tooling/ad10/violations/{packages,app,fixtures}/...` -- the test tree, with minimal stub `src/index.ts` files and one deliberate violation per matrix row:
  - mostly relative imports;
  - one bare `@keeb-cad/pcb` import from a stage;
  - a `model → library` `import type`;
  - bare `vue` and `@keeb-cad/editor` imports;
  - the allowed `routing → drc`/`model` and `model` `*.spec.ts → fixtures` imports.
- [x] `tooling/ad10/rules.spec.ts` -- the ticket's verify. One `cruise()` over the tree with `baseDir`, the config's `ruleSet` and its resolve options. It asserts:
  - the exact sorted `{rule, from, to}` list;
  - the set of reported rule names equals the config's `forbidden` names;
  - no violation from `routing` to `drc`/`model`.

  A table-driven block checks the Vue regex against literal paths: `node_modules/.pnpm/vue@3.5.44/node_modules/vue/index.js`, `.../@vue/shared/...`, `vue-router`, `pinia`, `x.vue`, and a non-match such as `vuex-like`.
- [x] `vitest.config.ts`, `tsconfig.node.json` -- register the `tooling` project; typecheck `tooling/**` except `violations/`.
- [x] `pnpm-lock.yaml` -- regenerated.

**Acceptance Criteria:**
- Given the current workspace, when `pnpm check` runs, then it exits 0 and the depcruise step reports 0 violations and cruises the `.vue` files under `app/src`.
- Given `packages/plates` declares `"@keeb-cad/pcb": "workspace:*"` and imports it, when `pnpm depcruise` runs, then it exits non-zero and prints `stage-imports-only-model`. Reverting restores exit 0.
- Given `packages/storage` declares `vue` and imports it, when `pnpm depcruise` runs, then it exits non-zero and prints `only-editor-imports-vue`. Reverting restores exit 0.
- Given `app/src/App.vue` imports `@keeb-cad/plates` (declared), when `pnpm depcruise` runs, then it exits non-zero and prints `editor-imports-no-stage`. Reverting restores exit 0.
- Given `pnpm ls -r --depth -1`, then there are still exactly 13 `@keeb-cad/*` packages.

## Implementation Notes

- `tsConfig.fileName` is absolute (`fileURLToPath(new URL('app/tsconfig.app.json', import.meta.url))`). With the plan's relative `'app/tsconfig.app.json'`, dependency-cruiser hands TypeScript a cwd-relative name and TypeScript resolves the tsconfig's `extends: "../tsconfig.base.json"` to `app/tsconfig.base.json`, so the CLI fails (TS5083).
- `exclude` is `'^(packages/[^/]+|app|fixtures)/(dist|node_modules)/'`, not `'(^|/)(dist|node_modules)/'`. `exclude` also drops resolved dependencies, so the unanchored form removed every npm target (e.g. `node_modules/.pnpm/vue@3.5.44.../vue/dist/vue.d.mts`) and `only-editor-imports-vue` could never fire on a resolved `vue` import.
- The API cruise in `rules.spec.ts` needs `validate: true`; without it `ruleSet` is ignored and no violations are reported.
- The `tooling` Vitest project excludes `tooling/**/violations/**`, because its `include` would otherwise collect the deliberate `x.spec.ts` stub.
- `tsconfig.node.json` sets `allowImportingTsExtensions` (it is `noEmit`) so the spec can import `../../.dependency-cruiser.mts`.
- The config also exports `STAGES`, `ws`, `EDITOR`, `FIXTURES` and `VUE`; the spec uses `VUE` for its regex table.
- Verified: `pnpm install --frozen-lockfile`, `pnpm depcruise` (0 violations, `.vue` files parsed), `pnpm vitest run --project tooling` (17 tests), `pnpm check` exit 0; each AC break gave exit 1 with the named rule and reverting gave exit 0 with an identical lockfile; 13 `@keeb-cad/*` packages.
- Matrix audit (orchestrator):
  - `tooling/ad10/rules.spec.ts` covers every rule row through its exact `{rule, from, to}` list, along with the allowed `routing` and spec-to-fixtures rows. It ran under `pnpm check` (18 tests in total, Node 26.12.1).
  - "Clean workspace" is covered by `pnpm check` itself: exit 0, "no dependency violations found".
  - "Spike" was a scripted check, not a committed test. A temporary `spikes/stray.ts` that imported `vue` and `@keeb-cad/plates` and contained a type error left `pnpm check` at exit 0, and the file was removed afterwards. `spikes/` does not exist yet, so a committed test would only cover an empty directory.

## Plan Change Log

## Review Triage Log

- Pass 1 (quick): high 0, medium 1, low 3, false 0, maybe-false 0.
  - medium · patch · Every bare import in the violation tree is unresolved. `hoist: false` and no `node_modules` in the tree are the cause, as the expected `to: 'vue'` and `to: '@keeb-cad/pcb'` entries show. So no committed test guards the anchored `exclude` or the resolve options, and reverting `exclude` would silently disable `only-editor-imports-vue` on a resolved `vue`. Fix: assert on the real `app/src/main.ts` → `vue` edge.
  - low · patch · The allowed `x.spec.ts → @keeb-cad/fixtures` edge is proved only by its absence; the routing edges have a "was cruised" check, this one does not. Fix: add the same check.
  - low · rejected (fix edits this plan) · The Execution checklist still lists the superseded `exclude` and relative `tsConfig` values. The shipped values and the reasons for them are recorded in Implementation Notes.
  - low · defer · `mise.toml` pins only `node`; Node 26 ships no corepack. Under `mise exec`, pnpm comes from the global mise install and self-switches to 12.15.0 (checked: `pnpm -v` → 12.15.0). Node 25 had no corepack either, so the problem predates this change. It matters for story 1.4's CI.

- Plan review (subagent, pre-approval): 12 findings, all accepted.
  - Findings #3 and #4 became user decisions (fixtures-only-in-tests; editor-imports-no-stage plus `@vue/compiler-sfc`).
  - These were patched into the plan:
    - #1: the Vue acceptance criterion used `pnpm check`, but typecheck fails first, so the AC now uses `pnpm depcruise`.
    - #2: the resolved Vue regex and its tests.
    - #5: a type-only fixture.
    - #6: exact-list assertions.
    - #7: no double-reporting.
    - #8: the config moved to `.mts`.
    - #9: the resolve options are spelled out.
    - #10: a bare-specifier fixture and the `(/|$)` boundary.
    - #11: a mise-activation note.
    - #12: SFC parsing.

## Design Notes

- Target helpers. Real imports resolve through pnpm symlinks to `packages/<name>/src/...`; unresolved ones keep the bare name:
  ```ts
  const ws = (names: string) =>
    `^(packages/(${names})/|@keeb-cad/(${names})(/|$))`
  const EDITOR = '^(app/|@keeb-cad/editor(/|$))'
  const FIXTURES = '^(fixtures/|@keeb-cad/fixtures(/|$))'
  const VUE = '(^|/)node_modules/(vue|vue-router|pinia|@vue/[^/]+)/|^(vue|vue-router|pinia|@vue/[^/]+)(/|$)|\\.vue$'
  // stage rule: from ^packages/(plates|pcb|drc|case|firmware|exports)/
  //   to.path ws('[^/]+'), to.pathNot [ws('model|$1'), EDITOR, FIXTURES]
  ```
  `ws('[^/]+')` also matches `@keeb-cad/editor` and `@keeb-cad/fixtures`, so every package rule puts `EDITOR` and `FIXTURES` in its `pathNot`. That way editor imports belong to `nothing-imports-editor` and fixtures imports to `fixtures-only-in-tests`. `$1` lets a package import its own files. Routing has its own rule, because one regex cannot express the `drc` exception and still keep a distinct name.
- Node 26 comes only from mise. Story 1.3's git hook and story 1.4's workflow must activate it (`mise exec` or `jdx/mise-action`), or dependency-cruiser's CLI refuses to run. `@types/node` and `@tsconfig/node24` stay on 24; bump them in a later story.
- Story 1.3 must add `tooling/ad10/violations/**` to the ESLint and Prettier ignores.

## Verification

**Commands:**
- `pnpm install --frozen-lockfile` -- expected: exit 0
- `pnpm depcruise` -- expected: exit 0, "no dependency violations found"
- `pnpm vitest run --project tooling` -- expected: the AD-10 spec passes
- `pnpm check` -- expected: exit 0

**Manual checks (if no CLI):**
- Apply each AC's temporary break, confirm the named rule and non-zero exit, then revert.
