---
title: 'Components reach services only through composables'
type: 'refactor'
ticket: '20'
created: '2026-11-08'
status: 'ready-for-dev'
baseline_revision: '2f74d177bad2618dcf805c16f97f210caff8207e'
route: 'full'
route_source: 'auto'
risk: 'low'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `DesignCanvas.vue` calls `useService(DesignStore)` itself. That hands a component the whole store, writers included, and nothing stops the next component from doing the same (spine Editor state row: "A component never calls `useService` itself").

**Approach:** Add a lint ban on `di` and `di/vue` value imports in `.vue` files. Add editor's first composable that returns a value, `useOpenDesign()`, returning the open design as a computed, and move `DesignCanvas` onto it.

## Boundaries & Constraints

**Always:**
- The ban is typescript-eslint's `@typescript-eslint/no-restricted-imports` on `**/*.vue`, with `allowTypeImports: true` for both `@keeb-cad/di` and `@keeb-cad/di/vue`. It restricts nothing else (spine: "That ban is the whole rule").
- `useOpenDesign()` (function) takes no argument and returns `ComputedRef<Option<Frozen<Design>>>` over `DesignStore.current`. It never returns the store.
- No editor file re-exports `useService` or `di/vue`. No composable returns a function that calls `run`, `replaceDesign`, `acceptDerivedFiles`, `undo` or `redo`. Both are reviewer rules.

**Never:**
- No lint for the reviewer rules. No `useInvoke` (23.21), no devtools (23.22).
- No change to `DesignCanvas.spec.ts`'s assertions: it is the regression proof that the canvas still shows the name and id.
- `useOpenDesign()` lives in `packages/editor/src/design/`. Decision (Sergii, 2026-11-08): `design/`, not `design-store/` or `views/`, because the folder is named for the concept it serves, the design. `design-store/` would name it after the service it hides.
- `use-open-design.spec.ts` runs on Node. Decision (Sergii, 2026-11-08): an `editor` Node project in the root `vitest.config.ts` that includes only listed folders (`src/design/**` to start), not browser mode as the ticket's verify line says, and not a file-suffix convention. Reasons: the spine's Verification row says "every test that touches the DOM … runs in Vitest browser mode … everything else on Node", and the composable touches no DOM. A folder list reuses `di`'s and `storage`'s root-project pattern without a new naming rule. A DOM-touching spec placed in a listed folder fails loudly on Node (`document is not defined`).
- `.ts` files and specs are not restricted. Specs keep `provideInjectorOnApp`, and `use-shortcuts.ts` keeps `useService`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Component imports a service hook | `.vue` with `import { useService } from '@keeb-cad/di/vue'` | lint error | `pnpm lint` fails |
| Component imports only types | `.vue` with `import type { Injector } from '@keeb-cad/di'` | no error | — |
| No design open | `useOpenDesign()` before any commit | `.value` is none | — |
| Design committed | after `replaceDesign` | `.value` is some(that design) | — |

</frozen-after-approval>

## Code Map

- `packages/editor/src/views/DesignCanvas.vue` -- `useService(DesignStore)`, then `computed(() => store.current.getOrUndefined()?.design.meta)`. This is the only `.vue` file that imports `di` today (grep over `packages`, `app`).
- `packages/editor/src/views/DesignCanvas.spec.ts` -- arranges a real `designModule` container and `provideInjectorOnApp`, then asserts empty, or name and id. It stays unchanged.
- `packages/editor/src/shortcuts/use-shortcuts.ts` -- editor's existing composable over `useService`. It sits in the folder of the service it reads (`ShortcutRegistry`) and returns void.
- `packages/design/src/store/design-store.ts:50` -- `get current(): Option<Committed>` is built per read from a private `shallowRef`, so a `computed` over it tracks commits. `Committed.design` is `Frozen<Design>` (`store/types.ts`).
- `packages/di/src/vue/{use-service.ts,provide-injector.ts}` -- `useService` calls Vue's `inject`. `provideInjectorOnApp(app, injector)`.
- `eslint.config.ts` -- exported message constants (`TEST_ID_MESSAGE`, `TYPE_SPEC_MESSAGE`) that specs import. Rules blocks come before "File overrides go last". The `@typescript-eslint` plugin is already active on `.vue` files, and neither `no-restricted-imports` is set there (checked with `calculateConfigForFile`).
- `vitest.config.ts` (root) -- the `di` and `storage` Node projects (`root`, `environment: 'node'`, `include`, `exclude` with `TYPE_SPECS`) are the pattern for editor's. `packages/editor/vitest.config.ts` has no `include` today and runs every editor spec in Chromium and Firefox.
- `tooling/lint/{rule-messages.ts,cold-config-timeout.ts,type-specs.spec.ts,no-test-ids.spec.ts}` -- `ruleMessages(ruleId, code, filePath)` lints text under the real config. `no-test-ids.spec.ts` lints `.vue` text at `packages/x/src/A.vue`.

## Tasks & Acceptance

**Execution:**
- [ ] `eslint.config.ts` -- export `SERVICE_IMPORT_MESSAGE` ("A component reaches services only through editor's composables; import a composable instead of di or di/vue."). Add a block `keeb-cad/no-services-in-components` with `files: ['**/*.vue']`: `'@typescript-eslint/no-restricted-imports': ['error', { paths: [{ name: '@keeb-cad/di', message, allowTypeImports: true }, { name: '@keeb-cad/di/vue', message, allowTypeImports: true }] }]`.
- [ ] `tooling/lint/no-services-in-components.spec.ts` -- the lint rows of the boundary table, each through `ruleMessages('@typescript-eslint/no-restricted-imports', …)` on `packages/x/src/A.vue` text with a `<script setup lang="ts">` block. Each rejected row expects `[expect.stringContaining(SERVICE_IMPORT_MESSAGE)]`, and each accepted row expects `[]`.
- [ ] `packages/editor/src/design/use-open-design.ts` (function) -- `useOpenDesign(): ComputedRef<Option<Frozen<Design>>>`: `const store = useService(DesignStore)`, then `computed(() => store.current.map((committed) => committed.design))`.
- [ ] `vitest.config.ts` (root) -- add a project `{ test: { name: 'editor', root: 'packages/editor', environment: 'node', include: ['src/design/**/*.spec.ts'], exclude: [...configDefaults.exclude, TYPE_SPECS] } }`, with a comment like `di`'s saying why. `packages/editor/vitest.config.ts` -- add `'src/design/**'` to its `exclude`, so no spec runs twice.
- [ ] `packages/editor/src/design/use-open-design.spec.ts` (Node) -- the composable rows. `arrange` (function) builds `new Container().addModule(designModule)`, then `autoLoad`, and returns `{ app, commit }`. `app` is `createApp({})` after `provideInjectorOnApp`, and `commit(design)` is `expectOk(store.replaceDesign({ design, unreadable: [] }))`. The no-design row takes only `app`. Each test calls `app.runWithContext(() => useOpenDesign())` itself, so no hidden step sits in the helper. Commits go through `store.replaceDesign({ design, unreadable: [] })`, the path `NewDesign` and `OpenStoredDesign` take. The test asserts `toEqual(Option.none())` and `toEqual(Option.some(design))`. Designs are built with `aDesign`, and the later-commit row's two designs differ only in `meta: aMeta({ id: anId(…), name })`, the data that row is about.
- [ ] `packages/editor/src/views/DesignCanvas.vue` -- `const openDesign = useOpenDesign()`, then `computed(() => openDesign.value.getOrUndefined()?.meta)`. Drop the `di` and `design` imports.
- `useOpenDesign` is not exported from `packages/editor/src/index.ts`: only editor's own components use it, and nothing outside editor renders them.
- [ ] `packages/editor/package.json` -- no change. `@keeb-cad/result` (for `Option`), `schema`, `design` and `di` are already dependencies.

**Acceptance Criteria:**
- Given each boundary-table row, when `pnpm test` runs, then a test named for it passes at its level.
- Given the lint block removed (toggled bug), when `tooling/lint/no-services-in-components.spec.ts` runs, then its rejected rows go red, and green once restored.
- Given `useOpenDesign` reading `store.current` once and returning `computed(() => thatValue.map(…))` (toggled bug; the type still compiles), when its spec runs, then the later-commit row goes red.
- Given the migrated `DesignCanvas.vue`, when `pnpm lint` runs, then it reports nothing, and with `useService` put back it reports the ban.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

- **Decision (plan): `Option<Frozen<Design>>`, not `Design | undefined`,** because the ticket says it "holds none before a design is committed", and the store's `current` is already an `Option`.
- **Decision (plan): the open design is `Committed.design`, not the whole `Committed`,** because the ticket says "returns the open design", and the glossary's **design store** holds "the design bundle (with its seq and revision, as one `Committed` value)". The bundle is more than the design.
- **Decision (plan): the composable spec runs it in `app.runWithContext`, not vitest-browser-vue's documented `render(Component, { global: { plugins } })` of a host component (the setup `DesignCanvas.spec.ts` uses), since the spec renders nothing,** because the spine says composables are "tested on their own", and Vue's docs describe `runWithContext` as "Execute a callback with the current app as injection context" (vuejs.org/api/application#app-runwithcontext). `useService` needs only `inject`.
- **Decision (plan): `use-open-design.spec.ts` resolves the real `DesignStore` from `designModule`, not a fake store registered through `di`, and is a unit row in editor, not integration in `app`.** AGENTS.md says "Test calculations as units in the package that owns them": `useOpenDesign` is editor's. It also says "Arrange only a state real commands could reach". The real store reaches it through `replaceDesign`, and a fake store would hand-build the `Option<Committed>` the composable maps. `DesignCanvas.spec.ts` already arranges this way.
- **Decision (plan): one `SERVICE_IMPORT_MESSAGE` for both paths, not one per path,** because the fix is the same for both (import a composable). The wording is the plan's own, and the spec reads the constant.
- **Decision (plan): the ban sits on `**/*.vue`, not only on editor's `.vue` files,** because the spine says "A component imports neither `di` nor `di/vue` as a value … on `.vue` files". `ui`'s components fall under it too. `.dependency-cruiser.mts` already keeps `ui` off `di`, so the rule costs `ui` nothing.

## Conformance Log

- `Test calculations as units in the package that owns them` (real `designModule` in an editor unit spec) -- fixed (decision)
- wording: "first service composable" against `use-shortcuts.ts` -- fixed
- `Every class or function the plan adds carries a (service) or (function) tag` (spec `arrange`) -- fixed
- `Prove a test Stryker can't reach … with a toggled bug` (a plain `Option` toggle wouldn't compile) -- fixed
- `A choice no requirement made is a decision and is labelled as one` (one shared message) -- fixed (decision)
- `a helper never takes a hidden step the assertions depend on` (where the composable call sits) -- fixed
- gap: `packages/editor/src/design/use-open-design.spec.ts`, built with `aDesign`/`aMeta` -- fixed
- gap: `runWithContext` decision missing vitest-browser-vue's documented `render` as its Y -- fixed
- Sergii, 2026-11-08: the plan's "(browser)" for `use-open-design.spec.ts` contradicted the spine's "everything else on Node", which no reviewer caught -- fixed (Node project, decision). Read by no reviewer.
- Final pass, read by no reviewer: `Arrange only what the test uses` (`arrange` returned an unused `store`) -- fixed (`{ app, commit }`); the unlabelled non-export of `useOpenDesign` from `index.ts` -- fixed.

## Verification

**Commands:**
- `pnpm test` -- expected: all projects green. Editor's browser specs run in Chromium and Firefox, and `use-open-design.spec.ts` runs once, in the `editor` Node project.
- `pnpm check` -- expected: typecheck, lint, format, depcruise and build all pass.

**Manual checks:**
- Nothing visible changes: `DesignCanvas` shows the same name and id through a different path. `pnpm dev` and the app's `/#/design/<id>/layout` show what they show on main.

## Boundary Table

| Group | Boundary | Input | Expected | Level |
| --- | --- | --- | --- | --- |
| production bugs | no design open | `useOpenDesign()` before any commit | `.value` equals `Option.none()` | unit (editor, Node) |
| production bugs | later commit | one `replaceDesign`, then a second with another design | `.value` is some(the second design) | unit (editor, Node) |
| rules | design committed | `replaceDesign` with a design | `.value` equals `Option.some(that design)` | unit (editor, Node) |
| rules | value import from di/vue | `.vue`: `import { useService } from '@keeb-cad/di/vue'` | one ban message | unit (tooling/lint) |
| rules | value import from di | `.vue`: `import { Container } from '@keeb-cad/di'` | one ban message | unit (tooling/lint) |
| rules | type import, declaration form | `.vue`: `import type { Injector } from '@keeb-cad/di'` / `import type { useService } from '@keeb-cad/di/vue'` | none / none | unit (tooling/lint) |
| rules | type import, inline form | `.vue`: `import { type Injector } from '@keeb-cad/di'` | none | unit (tooling/lint) |
| rules | mixed import | `.vue`: `import { type Injector, Container } from '@keeb-cad/di'` | one ban message | unit (tooling/lint) |
| rules | side-effect import | `.vue`: `import '@keeb-cad/di/vue'` | one ban message | unit (tooling/lint) |
| module boundaries | composables stay open | `.ts`: `import { useService } from '@keeb-cad/di/vue'` at `packages/x/src/use-x.ts` | none | unit (tooling/lint) |
| module boundaries | other imports stay open | `.vue`: `import { DesignStore } from '@keeb-cad/design'` | none | unit (tooling/lint) |
| glue | canvas on the composable | `DesignCanvas` with a committed design / with none | its name and id / empty (existing `DesignCanvas.spec.ts`) | unit (editor, browser) |
