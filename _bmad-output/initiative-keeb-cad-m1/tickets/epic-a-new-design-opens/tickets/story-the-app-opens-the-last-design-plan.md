---
title: 'The app opens the last design'
type: 'feature'
ticket: '7'
created: '2026-11-07'
status: 'built'
baseline_revision: '9a20a761859931736f4c7a7014ac839008f7ec7a'
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

**Problem:** `app/src/start-main.ts` builds the container but hands it to nobody. Editor's router uses web history and shows only "No design open.", and nothing opens a design at launch. The model worker is never spawned in production, and Vite's default `iife` worker format can't hold its start file's top-level await.

**Approach:** Editor takes the container and provides it through `di/vue`. vue-router moves to hash history at `/#/design/<id>/<workspace>`, and a guard sends a missing or bad workspace to `layout`. A new `Launch` service in `app` picks the design to open: the URL's, else the newest stored, else a new one, and then replaces the URL. It opens a stored design through a new `OpenStoredDesign` action over 23.5's load flow, and then starts the model worker on the URL's workspace with the spawn the start file hands it. Split (Sergii, 2026-11-07): the UiAction and shortcut registry, and devtools with its lint rule, are separate stories (`deferred-work.md`).

## Boundaries & Constraints

**Always:**
- A stored design that fails to open keeps its id and stays byte-for-byte unchanged in storage.
- Launch tries only the newest stored design after the URL's, never further back (AD-13: "the URL's design opens when it is stored and loads, otherwise the first, otherwise a new design").
- A failed `reset` save opens a new design, not the newest.
- Every design opens through `DesignStore.run` on a registered action (AD-2), never through `replaceDesign` called from `app`.

**Never:**
- UiActions, hotkeys, the shortcut registry, `devtools.ts`, the service-import lint rule (split off).
- Notices (16.1), the Start screen, and in-session navigation to another design id.
- The editor frame and its chrome, and the model worker's `focus` following a workspace change after launch (23.8's workspace keys).
- A design-file or schema change.
- A Firefox Playwright project, or an end-to-end test for NewDesign.

**Decision (Sergii, 2026-11-07):** NewDesign's test is the `app` integration row "empty storage" in Vitest browser mode, not a Playwright test on the served build, because AGENTS.md writes an end-to-end test "only for an action that is irreversible, costs the user material or work, or crosses a boundary no lower level can fake", and browser mode runs real IndexedDB and a real worker. The smoke test stays a built-bundle check; the ticket's unknown is settled.

**Decision (Sergii, 2026-11-07):** any `storage-unavailable` launch sees, from `listDesigns`, `load` or the `reset` save, opens a new design with no new kind, not a kind of its own for the save's half, because the new design's first autosave fails with the same kind anyway and 23.5's `LoadFlowError` stays as the spine has it.

**Decision (Sergii, 2026-11-07):** launch sets no failure state of its own; autosave's failed save of the new design sets it, not a `reportFailure` call from `Launch`, because that save fails with the same `storage-unavailable` and message, and a later successful save clears either, so launch's call changes no state a test or user can see (gap reader, reachable states). The ticket's wording goes to the PO (`deferred-work.md`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Empty storage | no stored design, any URL | new design, URL `/#/design/<new id>/layout` | — |
| URL's design | URL names a stored design that loads | that design, URL unchanged | — |
| Unknown id | URL names an id not stored, two stored | newest opens, URL replaced with its id | `not-found` swallowed |
| Broken design | the only stored design fails to load (`LoadError`, `DesignInvalid`) | new design, stored one unchanged | error swallowed until 16.1 |
| Reset save refused | routing unreadable, reset save refused for space | new design, stored one unchanged | the action returns `quota-exceeded` |
| Storage can't open | `IDBFactory.open` throws | new unsaved design; its failed autosave leaves `Autosave.failure` holding `storage-unavailable` with its message | — |
| Bad workspace | `/#/design/<id>/bogus` or `/#/design/<id>` | layout; URL replaced with `/#/design/<id>/layout` | — |

</frozen-after-approval>

## Code Map

- `app/src/autosave/autosave.ts` -- the `failure` getter over a private `shallowRef`, set by a failed save; unchanged.
- `app/src/autosave-round-trip.spec.ts` -- precedent for the real-container browser spec: a database name per test through `BrowserStorageAccess`, deleted after the test.
- `app/src/model-worker-entry.spec.ts:26-32` -- the real spawn: `new Worker(new URL('model.worker.ts', import.meta.url), { type: 'module' })`.
- `app/vitest.config.ts:6-7` -- `worker: { format: 'es' }` with its why-comment. `app/vite.config.ts` copies it.
- `app/e2e/vue.spec.ts` -- the Playwright smoke test on the built `dist/`. It asserts "No design open.", which this story removes.
- `packages/editor/src/mount-editor.spec.ts` -- precedent for unmounting through `__vue_app__`.
- `packages/di/src/vue/{provide-injector.ts,use-service.ts}` -- `provideInjectorOnApp(app, injector)` and `useService`. Get the injector with `container.resolve(InjectorToken)`, as `vue.spec.ts` does.
- `packages/commands/src/load/load-flow.ts` -- `LoadFlow.load(id): AsyncResult<LoadOutcome, LoadFlowError>`. Reuse it, don't change it.
- `packages/commands/src/design/{new-design.ts,design-actions-module.ts,new-design.spec.ts}` -- the action shape (statics `kind`, `id`, `label`, `input`; `available`, `apply`), its module and its spec.
- `packages/storage/src/design-storage/design-storage.ts:65` -- `listDesigns(): AsyncResult<DesignSummary[], StorageUnavailable>`, newest first.
- `packages/storage/src/testing` -- `MemoryBackend({ capacity })` and the `storageBackend` token.
- `packages/storage/src/browser/browser-storage-access.ts` -- `{ factory, keyRange, name }`. A spec's factory whose `open` throws a `SecurityError` gives `storage-unavailable`.
- `packages/workers/src/model-worker/model-worker-lifecycle.ts` -- `start(spawn, workspace)` and `focus(workspace)`.
- `.dependency-cruiser.mts` -- `GRAPH.editor` already allows `design`, `commands`, `workers`, `storage` and `schema`. `di` is open to non-kernels, and only editor may import `di/vue`.

## Tasks & Acceptance

**Execution:** two phases, with `pnpm test` green after each: (1) commands and editor, (2) app.
- [x] `packages/commands/src/load/{open-stored-design.ts,open-stored-design-input-schema.ts,types.ts,load-module.ts}` + `open-stored-design.spec.ts`, `packages/commands/src/index.ts`:
  - `OpenStoredDesign` (service, action): id `load.openStoredDesign`, label `Open stored design`, input `{ id }` through `openStoredDesignInputSchema` (`v.object({ id: idSchema })`). It is always available.
  - `apply` runs `LoadFlow.load(id)` and passes its error through. Its spec asserts on the real store's `current`, not on what a fake store was handed (`new-design.spec.ts` does the latter; `deferred-work.md`).
  - `OpenStoredDesignInput` goes in `types.ts`, and `loadModule` gains `registerAction(container, OpenStoredDesign)`.
- [x] `packages/editor/src/router/{create-editor-router.ts,resolve-workspace.ts}` + `create-editor-router.spec.ts`, `packages/editor/src/{types.ts,index.ts}`:
  - `createWebHashHistory()`. Route `design` at `/design/:id/:workspace?` renders `DesignCanvas`; `/` renders `DesignCanvas` too.
  - `resolveWorkspace` (function, a global `beforeEach`): for `to.name === 'design'`, when `v.is(workspaceSchema, to.params.workspace)` fails, it returns `{ name: 'design', params: { id, workspace: 'layout' }, replace: true }`.
  - `types.ts`: `type DesignLocation = Router` (vue-router's), exported from editor's `index.ts`, so `app` names the router without importing vue-router.
- [x] `packages/editor/src/views/{DesignCanvas.vue}`, delete `HomeView.vue`, `packages/editor/src/App.spec.ts`:
  - `DesignCanvas` shows the open design's name and id as plain text, read through `useService(DesignStore)` (the store's `current` is a `shallowRef`, so it updates), and nothing while none is committed; 23.8 replaces the text with the frame.
  - `DesignCanvas.spec.ts` (browser): rendered with an injector whose store holds a design, it shows that design's name and id.
  - App.spec provides an injector with an empty store (`DesignCanvas` resolves `DesignStore`) and asserts the shell's `main` and `h1` only.
- [x] `packages/editor/src/mount-editor.ts` + spec, `packages/editor/package.json` (`@keeb-cad/di`, `@keeb-cad/design` and `@keeb-cad/schema` as `workspace:*`, `valibot` as `catalog:`):
  - `mountEditor(selector, injector): DesignLocation` calls `provideInjectorOnApp(app, injector)` and returns the router it installed.
- [x] `app/src/launch/{launch.ts,launch-module.ts}`, `app/src/main-modules.ts`, `app/package.json` (`valibot: catalog:`):
  - `Launch` (service): `run(selector: string, spawn: Spawn): Promise<void>`.
  - Step 1: mount with `inject(InjectorToken)`, `await router.isReady()`, then read the route's `id` (parsed by `idSchema`; one that fails to parse counts as no id) and its `workspace` (`layout` on any route but `design`).
  - Step 2: open the requested design, else `listDesigns()[0]` when its id differs from the requested one, else `NewDesign`, each through `store.run`.
  - Step 3: on any `storage-unavailable` (from `listDesigns` or from the action) or `quota-exceeded`, go straight to `NewDesign`.
  - Step 4: `router.replace({ name: 'design', params: { id: opened id, workspace } })`, then `lifecycle.start(spawn, workspace)`.
- [x] `app/src/start-main.ts` -- `await container.resolve(Launch).run('#app', () => new Worker(new URL('./model.worker.ts', import.meta.url), { type: 'module' }))`.
- [x] `app/vite.config.ts` -- `worker: { format: 'es' }` with `app/vitest.config.ts`'s comment.
- [x] `app/src/launch/launch.spec.ts` (browser, Chromium and Firefox):
  - Each row of the boundary table at level `integration (app)` runs on the real container.
  - Storage is a `MemoryBackend` through `override(storageBackend)` (capacity 2 for the reset row: two one-version designs fill it), or a database of its own per test through `BrowserStorageAccess` for the reload and storage-unavailable rows.
  - `spawn` returns a `FakeWorker` (`workers/testing`), so no row starts a real worker.
  - Every row sets `location.hash` in arrange, `''` for a row with no id (the config shuffles); each test mounts on a `div` of its own and unmounts it through `__vue_app__` (typed `{ unmount(): void }`, since `app` imports no Vue), as `mount-editor.spec.ts` does; an `afterEach` clears `localStorage` and `data-theme`, as that spec does, since `mountEditor` applies the theme.
  - The reload row polls until `listDesigns` holds the first launch's id (as `autosave-round-trip.spec.ts` polls `storage.load(id)`), before the second launch.
  - Stored designs are written with `DesignStorage.save(label, texts, 'autosave')` over `writeBundle(aDesign…)`. The broken texts are the design file with a field its schema rejects, text that isn't KDL, and `format-version 2`.
- [x] `app/e2e/vue.spec.ts` -- the smoke test asserts `getByRole('heading', { level: 1 })` and a URL matching `/#/design/<id>/layout`, in place of "No design open.", which this story removes.

**Acceptance Criteria:**
- Given each boundary-table row, when `pnpm test` runs, then a test named for it passes at its level.
- Given each integration test, when its toggled bug is in place, then it goes red, and green once restored:
  - launch skips the newest fallback;
  - launch falls back to the newest on `quota-exceeded`;
  - autosave's `err` branch not recording the failure;
  - the guard is removed (editor unit rows);
  - `router.replace` is skipped;
  - `start` is called with `'layout'`.
- Given `app/vite.config.ts` without `worker.format`, when `pnpm build` runs, then it fails on the model worker's top-level await, and it passes once restored.

## Implementation Notes

- `app/vitest.config.ts` gains `plugins: [vue(), tailwindcss()]` and an `optimizeDeps.include` of the editor's deps (the `>` form, as `packages/editor/vitest.config.ts` has it), because `mainModules` now reaches `App.vue` through `Launch`, and every app spec failed to import without the Vue plugin. Decision (build): the plugin in app's Vitest config, not `Launch` kept out of `mainModules`, because the plan puts `launchModule` there and `launch.spec.ts` imports `Launch` anyway.
- Decision (Sergii, 2026-11-07): accept `app/vitest.config.ts`'s Vue and Tailwind plugins and its `optimizeDeps.include` of editor's deps, not `Launch` registered only in `start-main.ts`, because the plan puts `launchModule` in `mainModules` and `launch.spec.ts` needs the plugin either way; `packages/editor/vitest.config.ts` has the same setup.
- `packages/editor/tsconfig.{app,vitest}.json` gain `ESNext.Disposable` in `lib`, as `app/tsconfig.app.json` has it, because editor now type-checks `di`'s `Symbol.dispose` source.
- Decision (Sergii, 2026-11-07): accept `ESNext.Disposable` in editor's `tsconfig.app.json` and `tsconfig.vitest.json`, not the whole `ESNext` lib, because without it `vue-tsc -p packages/editor/tsconfig.app.json` fails with `packages/di/src/disposal.ts(24,46): error TS2550: Property 'dispose' does not exist on type 'SymbolConstructor'`, and `app/tsconfig.app.json` and `packages/workers/tsconfig.lib.json` add only that lib.
- Decision (Sergii, 2026-11-07): accept `@keeb-cad/result` as an editor devDependency, not specs checking `isOk()` with a plain `expect`, because editor's specs use `result/testing`'s `expectOk` and AGENTS.md: "Write a shared assertion once"; under `hoist: false` the import resolves only when editor declares it.
- `launch.spec.ts` sets the URL with `history.replaceState(null, '', hash)`, not `location.hash = hash`. Decision (build): because Firefox delivers a hash write's `popstate` a task later, after the router (created on microtasks only, over `MemoryBackend`) listens, and that late pop navigation overwrote launch's `replace` (seed `1794068493811` reproduced it). `replaceState` fires no event.
- The start file's worker URL is `new URL('model.worker.ts', import.meta.url)`, not `'./model.worker.ts'`, because `unicorn/relative-url-style` refuses the `./` prefix; it resolves the same.
- `Launch` reads the workspace with `v.parse(workspaceSchema, …)` on the `design` route, not `v.is` with a `layout` fallback. Decision (build): because the router's guard already replaced a bad one, so a parse failure there is a removed guard, which should throw, not hide.
- Decision (Sergii, 2026-11-07): `Launch` throws on a workspace that fails `workspaceSchema`, not `v.is` with a `layout` fallback, because only a removed or broken `resolveWorkspace` guard can leave one, and that should fail loudly at launch.
- Decision (Sergii, 2026-11-07): editor's router specs set `router.listening = false` when each test finishes, not leaving routers listening, because every test in a file shares one page under `sequence.shuffle`, so a leftover router would answer a later test's URL change; five shuffled runs without it passed (22/22, Chromium and Firefox), so it guards a hazard, as the Firefox hash race in `launch.spec.ts` showed one.
- `Launch` reads the opened id from the store's `current` after each open, not from the action's input, so the URL carries the id of the design actually open.
- `mount-editor.spec.ts` asserts the provided container through the page (design name and id); no row asserts the returned router on its own, since a hash push proves nothing about which router it was. `Launch`'s rows use it (`isReady`, `replace`).

## Plan Change Log

## Review Triage Log

- 2026-11-07, pass 1 (lenses: quick, test-reviewer; quotes checked against the diff, none dropped). Verdicts: high 0, medium 1, low 6, false 2, maybe-false 0; 2 notes not findings.
  - medium, patch -- `packages/editor/src/App.spec.ts`: `getByRole('main')` went from `toBeVisible()` to `toBeInTheDocument()` with no recorded cause (both lenses). Real: an empty `DesignCanvas` leaves `main` with no content, so the shell's visible check was weakened, against "Never … weaken a failing test". Fix: arrange a design so `main` holds the canvas text and keep `toBeVisible()`.
  - low, patch -- `app/src/launch/launch.spec.ts`: `aNewDesign = { name: 'Untitled design' }` takes its expected value from `NewDesign`'s code, not the requirement, and a stored design of that name would pass. Fix: assert the opened id is none of the arranged stored ids.
  - low, patch -- `launch.spec.ts` "starts the model worker on the URL's workspace": `toMatchObject([{ kind: 'design' }, { kind: 'focus', … }])` pins the whole message sequence where the row asks only for the focus. Fix: `toContainEqual(expect.objectContaining({ kind: 'focus', workspace: 'pcb' }))`.
  - low, patch -- `launch.spec.ts` `keptTexts`: `expectOk(read)` inside `versions.value.map`, against "No `if` or loop around `expect`". Fix: return the reads and assert the whole list with `toEqual`.
  - low, patch -- `packages/commands/src/load/open-stored-design.spec.ts`: `store.current.getOrUndefined()?.design` narrows, against "assert whole values". Fix: `toMatchObject({ design: corne })` on the unwrapped `current`.
  - low, patch -- comments restating code in `app/src/launch/launch.ts` (class header, `#open`) and `packages/editor/src/router/resolve-workspace.ts`, against "Write a comment only for a why the code can't say". Fix: delete them; `types.ts`'s line says why the router is named `DesignLocation`, so it stays.
  - low, reject -- the editor specs' `history.replaceState` reset is an undocumented decision; its only fix edits this plan, which triage rejects. It is listed in the build's decisions.
  - false -- `launch.spec.ts` `arrange` resolving `autosave` for every test: `autosaveModule` registers `Autosave` `.eager()`, so `autoLoad()` already built it; resolving returns that instance and builds nothing.
  - false -- an empty Review Triage Log: this entry is that log, written in this pass.
  - notes -- the reload row is sound (`mintId` gives a fresh id, so a failed reopen fails); the smoke test's id pattern duplicates `idSchema`'s shape (low, rejected: unlikely to bite, and the e2e can't share the schema without a new import).


## Design Notes

- **Decision (plan): `Launch` is an `app` service, not editor code,** because the spine's `app` row lists "the newDesign action at launch on empty storage".
- **Decision (plan): `Launch` mounts the editor before it opens a design, not after,** because it reads the requested id through the router (spine: "vue-router is the one owner of the open design and workspace"), which parses the URL only once installed (`router.isReady()`); the shell shows empty for that moment, as AD-11's "shows each stage as computing until its first post" allows.
- **Decision (plan): `NewDesign` failing at launch throws `InvariantError` and starts no worker, not a further fallback,** because it builds one fixed design its spec proves valid (`new-design.spec.ts`), so a `DesignInvalid` there is a bug, as `acceptDerivedFiles` treats nothing committed.
- **Decision (Sergii, 2026-11-07): `DesignCanvas` shows the open design's name and id as plain text, not an empty region,** because only then does a look at the page (and a reload) show which design launch opened, and it gives `mountEditor`'s container a real consumer in its test; 23.8 replaces it.
- **Decision (plan): `HomeView` and "No design open." go, replaced by `DesignCanvas`, not kept for `/`,** because every launch opens a design (epic Done when: "Launch with empty storage opens a new design in the editor frame"), so no route shows an empty editor.
- **Decision (plan): a stored design opens through the `OpenStoredDesign` action, not a direct `LoadFlow` call.** AD-13 says: "Launch runs it through the same action as the recent list". Its error reaches launch because `Action.apply` returns `AsyncResult<void, E>` (`packages/design/src/entries/types.ts:18`), so "return no value" still carries the error.
- **Decision (plan): `mountEditor` returns the router as editor's `DesignLocation` type, not void, and not vue-router's `Router` imported in `app`.** `Launch` needs `isReady()` and `replace()` on the router editor installs (spine: "vue-router is the one owner of the open design and workspace"), and `.dependency-cruiser.mts`'s `only-editor-ui-and-di-vue-import-vue` (`tsPreCompilationDeps: true`) refuses `app` a type import from vue-router.
- **Decision (plan): the start file builds `spawn` and hands it to `Launch.run`, not `Launch` building the `Worker`,** because `new URL(…, import.meta.url)` resolves against its own file, and `ModelWorkerLifecycle.start(spawn)` already takes it as a parameter, so specs pass a `FakeWorker` with no `vi.mock` (AGENTS.md: "never `vi.mock`").
- **Decision (plan): any route but `design` (`/`) opens `layout`, not a route-specific default,** because AD-13: "an unknown or missing one being `layout`".
- **Decision (plan): an id segment that fails `idSchema` counts as no id, not an error.** AD-13: "the URL's design opens when it is stored": an id that doesn't parse can't be stored.
- **Decision (plan): a global `beforeEach` guard in editor parses the workspace, not `Launch`, and not a `beforeEnter`,** because the ticket says "the router parses the segment with schema's workspaceSchema", and vue-router's docs: "`beforeEnter` guards only trigger when entering the route, they don't trigger when the `params`, `query` or `hash` change" (router.vuejs.org/guide/advanced/navigation-guards#Per-Route-Guard), so a hash edited to `/design/a/bogus` would pass a `beforeEnter`.
- **Decision (plan): the "reports quota-exceeded" half of the reset row is a unit row of `OpenStoredDesign`, not an app assertion on the action's error,** because AGENTS.md: "Test a rule where it is defined"; the app row asserts the outcome, and the load flow's notice arrives with 16.1.
- **Decision (plan): `worker.format: 'es'`, not Vite's documented default `'iife'`** (vite.dev/config/worker-options#worker-format: "Default: `'iife'`"), because the ticket: "Vite's default 'iife', which can't hold the model-worker start file's top-level await". It is proven by `pnpm build` failing without it, not a spec reading the build output; the implementer records the command and its result.
- **Decision (Sergii, 2026-11-07): `Launch`, `OpenStoredDesign`, `resolveWorkspace`, `DesignLocation` and `DesignCanvas`, not `workspaceGuard`, `EditorRouter` and `DesignView`,** because the Naming row: "Glossary terms only", and AGENTS.md: "never after the library it wraps" (vue-router's guard and `Router`). The glossary gains **workspace**, **design location**, **canvas**, **stored design** and **launch** in one docs-only spine commit on main before the build.

## Conformance Log

First pass: two conformance readers and one gap reader (Sonnet, context-free); then one final conformance pass. Dropped 2 findings whose quoted rule was not in `AGENTS.md` or the spine (a plan line quoted as the rule for the guard; the dependency-cruiser comment "Only editor, ui and di/vue import Vue (AD-10)", whose substance was fixed anyway).

- `a command id is <concept folder>.<verb+noun camelCase>` (`design.openStoredDesign` in `load/`) -- fixed (`load.openStoredDesign`)
- `Give every decision its rejected alternative: "X, not Y, because Z"` (reports-quota decision) -- fixed
- `When a decision departs from a Stack dependency's documented setup, that documented setup is its Y, cited from the library's docs` (Vite `worker.format`) -- fixed (vite.dev citation)
- `Add or change a design-file field, schema or shared kind only after the spine's Data Schema section defines it` ("a new kind for the save's half") -- fixed (decision reworded: no new kind)
- `beforeEnter guards only trigger when entering the route` (vue-router docs; guard claimed to cover a typed URL) -- fixed (global `beforeEach`, in-session row)
- `Substitute through di … never vi.mock` (no source for `spawn`, real workers in every row) -- fixed (start file hands `spawn`; specs pass a `FakeWorker`)
- `Find elements by role, then label, then text` (`app/e2e/vue.spec.ts`: `page.locator('h1')`) -- fixed (the smoke test the plan rewrites uses `getByRole`)
- `Arrange only what the test uses` (`app/src/autosave/autosave.spec.ts`'s `arrange` resolves five services for every test) -- deferred
- `Arrange only a state real commands could reach` (`MemoryBackend({ capacity: 1 })` with two designs) -- fixed (capacity 2)
- `Test a rule where it is defined` (`input-invalid` row in commands) -- fixed (row dropped; `design` owns it)
- `an unknown or missing one being layout` (workspace on `/`) -- fixed (decision)
- `A third-party package declared by more than one workspace package is declared there once, and each package uses catalog:` (`valibot`; `app/package.json`) -- fixed
- `Put every type a folder declares … in that folder's types.ts` (empty `types.ts` files) -- fixed (dropped; `DesignLocation` in editor's `types.ts`)
- reload race (`autosave-round-trip.spec.ts` polls) -- fixed
- `mountEditor` row with no assertable consumer -- fixed (probe route)
- `Glossary terms only` (`Launch`, `OpenStoredDesign`, `DesignView`, `workspaceGuard`, `EditorRouter`) -- asked (Sergii: rename three, glossary gains five terms)
- gap: `packages/workers/src/model-worker/model-worker-lifecycle.ts` `focus` after launch -- fixed (Never: 23.8)
- gap: `app/src/launch/launch.ts` typing vue-router's `Router` under the Vue fence -- fixed (`DesignLocation`)
- gap: `packages/storage/src/testing/memory-backend.ts` capacity counts all designs -- fixed (capacity 2)
- gap: `app/src/autosave/autosave.ts` `#save` sets the same failure, so `reportFailure` is unobservable -- asked (Sergii: drop it; ticket wording to the PO)
- gap: storage-unavailable from the action's `load` unreached by any row -- fixed (row added)
- Final pass (6 findings): names -- asked (above); design note contradicting the frozen decision -- fixed; mount order, `NewDesign` failure, `HomeView` removal -- fixed (decisions); `location.hash` and theme state across shuffled tests -- fixed; the precedent's poll condition misquoted -- fixed; `new-design.spec.ts`'s `expect(handed).toEqual([` asserting a fake's input (`Assert what a function returns or a visible effect`) -- deferred. These final-pass fixes are read by no reviewer.

## Verification

**Commands:**
- `pnpm test` -- expected: all projects green, `app`'s in Chromium and Firefox.
- `pnpm check` -- expected: typecheck, lint, format, depcruise, build and smoke pass.

**Results (2026-11-07):**
- `pnpm check` -- exit 0: 239 test files, 1999 tests, no type errors; build, workbench build and smoke pass.
- Toggled bugs, each red then green once restored (`launch.spec.ts`, Chromium): skipping the newest fallback (5 rows red); falling back to the newest on `quota-exceeded` (reset row red); autosave's `err` branch not recording (both storage-unavailable rows red); `router.replace` skipped (4 rows red); `start(spawn, 'layout')` (worker workspace row red); the guard removed (`create-editor-router.spec.ts`, 4 rows red in each browser).
- `pnpm build` without `worker.format`: fails with `[UNSUPPORTED_FEATURE] Top-level await is currently not supported with the 'iife' output format` at `start-model-worker.ts`'s `await container.autoLoad()`; passes once restored.

## Boundary Table

| Group | Boundary | Input | Expected | Level |
| --- | --- | --- | --- | --- |
| production bugs | broken stored design, `DesignInvalid` | the only stored design's file fails its schema | new design opens; stored texts unchanged | integration (app) |
| production bugs | broken stored design, not KDL | the only stored design's file isn't KDL | new design; stored unchanged | integration (app) |
| production bugs | broken stored design, newer format | `format-version 2` | new design; stored unchanged | integration (app) |
| production bugs | reset save refused | URL names a design with routing unreadable, a second design stored, `MemoryBackend({ capacity: 2 })` | new design, not the second; stored unchanged | integration (app) |
| production bugs | reset save refused | the same, through `OpenStoredDesign` | `quota-exceeded`; the open design unchanged | unit (commands) |
| production bugs | storage can't open, at `listDesigns` | no id; `open` throws `SecurityError` | new design; `failure` is `storage-unavailable` with the DOMException's name and text | integration (app) |
| production bugs | storage can't open, at the action's `load` | URL names an id; `open` throws `SecurityError` | new design; `failure` is `storage-unavailable` with the DOMException's name and text | integration (app) |
| production bugs | reload | launch, then a second container on the same database with the first's hash | the same id; `listDesigns` holds one design | integration (app) |
| rules | stored designs | 0 stored, no id | new design, `/#/design/<new>/layout` | integration (app) |
| rules | stored designs | 1 stored, no id | that design | integration (app) |
| rules | stored designs | 2 stored, no id | the newer | integration (app) |
| rules | URL id | names the older of 2 | the older; URL unchanged | integration (app) |
| rules | URL id | unknown, 2 stored | the newer; URL replaced with its id | integration (app) |
| rules | URL id | fails `idSchema`, 1 stored | that design; URL replaced | integration (app) |
| rules | URL id broken | names the broken older; newer loads | the newer | integration (app) |
| rules | URL id broken | names the broken newest; older loads | new design (only the first is tried) | integration (app) |
| rules | newest broken, no id | newer broken, older loads | new design | integration (app) |
| rules | workspace | `layout` / `firmware` (first and last option) | kept | unit (editor) |
| rules | workspace | `bogus` / `Layout` / missing | replaced with `/design/<id>/layout` | unit (editor) |
| rules | workspace, in session | from `/design/a/layout` to `/design/a/bogus` | replaced with `/design/a/layout` | unit (editor) |
| rules | workspace at launch | `/#/design/<id>/bogus`, `/#/design/<id>` | layout; URL `/#/design/<id>/layout` | integration (app) |
| module boundaries | `OpenStoredDesign` | a stored id that loads | ok; `current` holds it | unit (commands) |
| module boundaries | `OpenStoredDesign` | unknown id | `not-found` naming it | unit (commands) |
| module boundaries | `mountEditor` | a real container whose store holds a design built with `aDesign` | the mounted page shows that design's name and id | unit (editor) |
| module boundaries | `DesignCanvas` | nothing committed / a committed design | no name / its name and id | unit (editor) |
| glue | launch on screen | the reload row's second launch | the page shows the first launch's design id | integration (app) |
| glue | worker workspace | `/#/design/<id>/pcb` with a stored design | the `FakeWorker`'s first `focus` message names `pcb` | integration (app) |
| glue | worker format | `pnpm build` with and without `worker.format 'es'` | builds / fails on top-level await | build |
