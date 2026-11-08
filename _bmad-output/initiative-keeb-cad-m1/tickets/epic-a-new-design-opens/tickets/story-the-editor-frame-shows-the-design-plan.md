---
title: 'The editor frame shows the design'
type: 'feature'
ticket: '8'
created: '2026-11-08'
status: done
baseline_revision: 'd276578abff75d4fc8917e80fb08d87797f6fe2c'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md'
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app opens a design but shows only an `h1` "keeb-cad" over the design's name and id: no shell, no workspace switching, no landmark focus.

**Approach:** Build EXPERIENCE.md › Global chrome's shell in `editor`: a top bar with the design name and the workspace tabs, a left rail with the Tree slide-out shell, the canvas landmark, a docked 320px inspector landmark and an empty status strip landmark, each a labelled landmark that F6 / Shift+F6 cycle. Keys 1–5, T, Esc, F6 and Shift+F6 are UiActions; a workspace switch moves the URL and sends `focus` through `workers`.

## Boundaries & Constraints

**Always:**
- Tabs follow `workspaceSchema`'s option order (Layout, Outline, PCB, Case, Firmware) on `ui`'s Tabs wrapper, `role=tablist`, each tab with a `UiKbd` hint given its `Show<W>` handle's raw `hotkeys[0]` (`UiKbd` formats it) (AD-26: "Every `kbd` hint is formatted by its formatter"). A switch changes the route's workspace segment (vue-router owns the design location) and `ModelWorkerLifecycle.focus(workspace)` sends `focus { workspace }`.
- Landmark roots (top bar, slide-out when open, canvas, inspector, status strip) are `tabindex="-1"` with an `aria-label`; F6 moves to the next in that order, Shift+F6 to the previous, wrapping, landing on a landmark even when it is empty; a closed slide-out is skipped.
- T opens the Tree slide-out (non-modal); Esc closes it. The empty Layout canvas shows `Add a group (G) or open the command palette (Ctrl+K).` verbatim; Outline, PCB, Case and Firmware show an empty canvas landmark with no text. G and Ctrl+K stay inert.
- The status strip is an empty labelled landmark; 23.23 fills it.
- Components reach services only through composables and run entries through `useInvoke()`.
- Landmark roots are `header` (top bar), `aside` (slide-out), `main` (canvas), `aside` (inspector) and `footer` (status strip), each with its `aria-label`, so tests find them by role and name.
- Every visible colour and size comes from `ui`'s tokens (DESIGN.md: top bar 42px, rail 44px, inspector 320px, status strip 30px, slide-out 260px), in both themes.

**Never:**
- Status-strip content (counts, running stage, failed state, Restart: 23.23), tab badges, the save state, File and Export menus, undo/redo, cursor and zoom, the Tree's nodes, Parameters and Parts tabs, the command palette, Design settings in the inspector.
- A hand-built ARIA widget; Tailwind's `dark:`; arbitrary Tailwind values; `vi.mock`.

**Decisions (Sergii):**
- Decision (Sergii): an `editor` service `DesignLocation` creates the router in its constructor and sends `ModelWorkerLifecycle.focus(workspace)` from its `afterEach` on a workspace change; `mountEditor` resolves it, `app.use`s its router and returns the router to `Launch`; the `DesignLocation = Router` alias is removed (not renamed: a second name for `Router` would be named after the library, AGENTS.md) and `mountEditor` returns vue-router's `Router`, so the class takes the glossary name. Not a `createToken` registered by `mountEditor`, because that is a spine edit (AD-25's token table) hiding only a creation order; not `Launch` wiring `focus`, because the focus rule would leave `editor` and its specs.
- Decision (Sergii): the work area is vue-router nested routes with named views, not Reka `TabsContent` panels choosing what shows. `/design/:id` renders the shell; one child per `workspaceSchema` option (`path` and `name` = the workspace) fills `default` (the canvas landmark's `<RouterView />`) and `inspector` (the inspector landmark's `<RouterView name="inspector" />`); an empty or unknown child segment redirects to `layout`, replacing the `resolveWorkspace` guard, whose spec rows stay as the requirement. The landmark roots stay fixed in the shell; only their contents swap. The tabs are `ui` wrapper parts (root, list, one panel): the root's model is the route's workspace, and one `UiTabPanel` whose `value` follows the route wraps the canvas and inspector landmarks. Because the router docs give this layout ("possible to create complex layouts using named views with nested views"), while Reka's documented setup has a `TabsContent` that "Contains the content associated with each trigger" (reka-ui.com/docs/components/tabs), and Reka panels would make a second owner of what shows beside "vue-router is the one owner of the open design and workspace".
- Decision (Sergii): five plain UiAction classes `ShowLayout` … `ShowFirmware` (ids `workspace.showLayout` …, labels `Layout` … `Firmware`, hotkeys `1` … `5`), one file each in that workspace's folder (`workspace/layout/show-layout.ts`), all `emptyInputSchema`; each calls `DesignLocation.openWorkspace` and is unavailable while its workspace is open. Not a `defineShowWorkspace` factory, because nothing in the repo registers factory-made handles and each workspace's folder then owns its own entry.
- Decision (Sergii): the Tree slide-out shows no text until 13.7, not EXPERIENCE's `[ASSUMPTION]` `No nodes. Add a group (G).`, because a hint's shortcut should come from its entry's `hotkeys` through the hotkey formatter, never hardcoded, and no Add group entry exists yet.
- Decision (Sergii): the empty Layout hint shows verbatim with `G` and `Ctrl+K` written out, as the ticket asks, not left out, because no Add group or palette entry exists yet to read them from; a `deferred-work.md` entry has 13.7 and the palette story render them from their handles' `hotkeys` through `formatHotkey`.
- Decision (Sergii): the F6 targets are **landmarks** (`landmarks/`, `Landmarks`, `use-landmark.ts`, `CanvasLandmark`, `InspectorLandmark`, `StatusStripLandmark`, `FocusNextLandmark` / `FocusPreviousLandmark`, ids `landmarks.focusNextLandmark` / `landmarks.focusPreviousLandmark`, labels `Next landmark` / `Previous landmark`) and the frame is the **shell** (`shell/`, `EditorShell`), not `region` / `frame`, because the spine's glossary already defines both ("Each term means exactly one thing"); a docs commit adds both words to EXPERIENCE's chrome-word list and rewords the spine's **canvas** row.
- Decision (Sergii): from any element inside a landmark, F6 moves to the next landmark and Shift+F6 to the previous; the left rail takes the slide-out's place in the order (from the rail, F6 goes to the slide-out when open, else the canvas; Shift+F6 to the top bar); from outside every landmark, F6 goes to the top bar. Not a sixth landmark for the rail, because that changes EXPERIENCE's order ("top bar, slide-out (when open), canvas, inspector, status strip"); not left out, because the behaviour would be untested.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Switch workspace | design open at layout; press 3 | tab PCB selected, URL `…/pcb`, worker receives `focus { workspace: 'pcb' }` | — |
| Same workspace | at layout; press 1 | nothing changes, no second `focus` | — |
| Slide-out | closed; T, then Esc | opens, holding no text; Esc closes; Esc while closed does nothing | — |
| F6 | focus on body / top bar / status strip | top bar / canvas (slide-out closed) / top bar | — |

</frozen-after-approval>

## Code Map

- `packages/editor/src/App.vue` -- `useShortcuts()`, `h1` "keeb-cad", a scoped block with `#ccc` (a deferred-work entry) and an unscoped `html, body, #app` reset. `App.spec.ts` (builds its own `createEditorRouter()`), `mount-editor.spec.ts` (container of `designModule` + `editorModule`; asserts `Lily58` and `lily-58`) and `app/e2e/vue.spec.ts` assert today's shell.
- `packages/editor/src/mount-editor.ts` -- calls `createEditorRouter()`, `provideInjectorOnApp`, `app.use(router)`, `useThemeChoice()`, mounts, returns the router typed `DesignLocation` (`types.ts`: `= Router`, re-exported by `index.ts`).
- `app/src/launch/launch.ts` (+spec) -- reads `currentRoute.value.name === 'design'` and `params.workspace`, then `replace({ name: 'design', params: { id, workspace } })` and `lifecycle.start(spawn, workspace)`. Static child routes have neither that name nor that param, so Launch changes.
- `packages/editor/src/router/` -- hash history; `/` and `/design/:id/:workspace?` render `DesignCanvas`; `resolve-workspace.ts`'s guard replaces a bad segment with `layout`. The spec's `arrange()` (`router.listening = false`, `history.replaceState` on finish) is the router-cleanup precedent. vue-router matches paths case-insensitively unless `sensitive: true`, and the spec's `/design/corne/Layout` row expects a redirect.
- `packages/editor/src/views/DesignCanvas.vue` (+spec) -- name and id "until 8"; goes.
- `packages/editor/src/design/use-open-design.ts` -- `useOpenDesign()`; the top bar's name.
- `packages/editor/src/ui-actions/`, `invoke/`, `shortcuts/` -- `registerUiAction(container, Handle)`; `UiAction { available(); apply(input) }` with statics `kind`, `id`, `label`, `input`, `hotkeys?`; `useInvoke()`; `ShortcutRegistry` reads every handle's `hotkeys`. `invoke.spec.ts`'s `arrange` shape is the precedent; not its repeated `unavailable` assertion.
- `packages/editor/src/testing/press.ts` -- letters only (`code: Key<L>`).
- `packages/editor/vitest.config.ts` -- browser mode, `setColorScheme`, `optimizeDeps.include`, no viewport (Vitest's default 414x896).
- `packages/workers/src/model-worker/model-worker-lifecycle.ts` -- `focus(workspace)` sends `focus` on every call while running. Don't change. `@keeb-cad/workers/testing`'s `FakeWorker` records `posted`; the lifecycle spec's `arrange()` shows the spawn wiring.
- `packages/commands/src/empty-input-schema.ts`, `types.ts` -- `emptyInputSchema`, `EmptyInput`; not exported from `index.ts`.
- `packages/ui/src/tabs/` -- `UiTabs.vue`: Reka `TabsRoot` > `TabsList` + a `TabsContent` per item. Reka 2.11's `TabsTrigger` sets `aria-controls` only for a value with a registered `TabsContent` (`reka-ui/dist/Tabs/TabsTrigger.js:36`). `Tabs.spec.ts` takes its expected labels from the state's props and keeps a module-level `ITEMS`; the moved specs don't copy either.
- `packages/ui/` -- `src/index.ts` exports every component; `workbench/widgets.ts` + `workbench/states/*-states.ts` register each; `icon/icons.ts` holds only `close`; `hotkeys/format-hotkey.ts`; `theme/theme.css` tokens (`chrome`, `panel`, `border`, `fill-on`, `selection`, `focus`, `font-ui`; spacing `top-bar`, `left-rail`, `inspector-width`, `status-strip`, `slide-out-width`; `overlay` shadow). `hotkeys/hotkey-layer.ts` calls `preventDefault()` on every match, available or not.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/ui/src/tabs/` -- `UiTabs` (`TabsRoot`, `v-model`, default slot), `UiTabList` (`items`; `TabsList` + `TabsTrigger`s, a per-item slot for the hint) and `UiTabPanel` (`value`; `TabsContent`), one file each, props in `types.ts`; specs per part. `src/index.ts` exports the parts and their prop types; `workbench/widgets.ts` and `states/tabs-states.ts` register them.
- [ ] `packages/ui/src/icon/icons.ts` -- add `tree` (lucide `ListTree`) and its `icon-states.ts` state.
- [ ] `packages/commands/src/index.ts` -- export `emptyInputSchema` and `EmptyInput` (AGENTS.md: an entry with no input "uses `commands`' shared `emptyInputSchema` and `EmptyInput`").
- [ ] `packages/editor/package.json` -- add `@keeb-cad/commands` and `@keeb-cad/workers`; `vitest.config.ts` -- `browser.viewport: { width: 1366, height: 768 }`, the new imports in `optimizeDeps.include`.
- [ ] `packages/editor/src/router/` -- `create-editor-router.ts` (function) builds the nested routes (Sergii decision) with `sensitive: true`, and `/` with `NoDesign.vue` (renders nothing); `resolve-workspace.ts` goes; the spec keeps its rows. `design-location.ts`: `DesignLocation` (service) calls `createEditorRouter()`, exposes the router, the current workspace (the matched child's name) and `openWorkspace(workspace)`; its `afterEach` calls `ModelWorkerLifecycle.focus` only when both the previous and the new route are design routes with different workspaces, so the first navigation calls nothing (Launch's `start` gives the first workspace). `types.ts`'s alias goes (the file goes if empty); `index.ts` drops its export; `mount-editor.ts` resolves the service and returns `Router`.
- [ ] `app/src/launch/launch.ts` (+spec) -- inject `DesignLocation` and read its `workspace` (none off a design route: `layout`); replace with `{ name: workspace, params: { id } }`; the stale guard comment goes.
- [ ] `packages/editor/src/workspace/` -- per workspace `<w>/`: `<W>Canvas.vue`, `<W>Inspector.vue` (only `LayoutCanvas` has content, the hint) and `show-<w>.ts` (service: UiAction class, Sergii decision); `use-workspace.ts` (function, composable): the current workspace, a switch through `invoke`, each tab's raw hotkey for `UiKbd`; `WorkspaceTabs.vue`.
- [ ] `packages/editor/src/landmarks/` -- `Landmarks` (service): landmark roots by name in EXPERIENCE's order; `use-landmark.ts` (function, composable) registers a template ref while mounted; `FocusNextLandmark` (`F6`; `landmarks.focusNextLandmark`, `Next landmark`), `FocusPreviousLandmark` (`shift+F6`; `landmarks.focusPreviousLandmark`, `Previous landmark`) (service: UiAction classes); the landmark name union in `types.ts`.
- [ ] `packages/editor/src/slide-out/` -- `SlideOut` (service: an `open` ref and the invoker); `OpenTree` (`T`; `slideOut.openTree`, `Open tree`; unavailable while open), `CloseSlideOut` (`Escape`; `slideOut.closeSlideOut`, `Close slide-out`; unavailable while closed) (service: UiAction classes); `use-slide-out.ts` (function, composable); `TreeSlideOut.vue` (260px, `chrome`, overlay shadow over the canvas edge, no text; focuses its root on open; closing returns focus to the invoker, else the canvas); `LeftRail.vue`: a `UiRailButton` (`tree` icon, label `Tree`) runs `OpenTree` / `CloseSlideOut`.
- [ ] `packages/ui/src/rail-button/` -- `UiRailButton.vue` (`icon`, `label`, `expanded` → `aria-expanded`; `fill-on` and the Mauve left bar through `aria-expanded:` variants; `target-min`), `types.ts`, spec, workbench state, `index.ts` export.
- [ ] `packages/editor/src/shell/{EditorShell,TopBar,CanvasLandmark,InspectorLandmark,StatusStripLandmark}.vue` + `App.vue` -- `EditorShell` is the `/design/:id` component: the grid inside `UiTabs`, one `UiTabPanel` around the canvas and inspector landmarks, which hold the named `RouterView`s; the top bar's `h1` is the design name. `App.vue` keeps `useShortcuts()` and a bare `RouterView`, no style blocks; the full-height reset moves to `styles.css` with `font-ui`. `DesignCanvas` and its spec go.
- [ ] `packages/editor/src/editor-module.ts` -- register the services and UiActions.
- [ ] `packages/editor/src/testing/press.ts` -- `pressKey(key: KeyPress)` (function) beside `press`; `KeyPress = { key; code; shift? }` in `testing/types.ts`.
- [ ] `packages/workers/src/testing/recording-model-worker-lifecycle.ts` -- `RecordingModelWorkerLifecycle` (service: a test fake extending `ModelWorkerLifecycle`, beside `FakeWorker`) records `focus` calls; exported from `workers/testing`; editor specs register it with `override` and read it after arrange.
- [ ] Editor specs (browser) -- the editor rows, each in its folder, in both themes (the ticket's verify). Copy only `invoke.spec.ts`'s and the lifecycle spec's `arrange({ options })` shape: register each part only when an option asks for it. `App.spec.ts` and `mount-editor.spec.ts` move to the shell (the top bar's name; `workersModule` or the fake registered).
- [ ] `app/e2e/vue.spec.ts` -- the `h1` is `Untitled design`.
- [x] Docs commit on main, before the code branch (d276578): `_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md` adds `landmark`, `shell`, `top bar` and `left rail` to its chrome-word list; the spine's **canvas** glossary row reads "inside the editor shell" (Sergii decision).
- [ ] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- close the `App.vue` `#ccc` entry; add: the Layout hint's `G` (13.7) and `Ctrl+K` (palette story) render from their handles' `hotkeys` through `formatHotkey`; `invoke.spec.ts` repeats its `unavailable` assertion in about seven tests (AGENTS.md: "Write a shared assertion once"), and its `arrange` registers `container.register(Recorder).useClass(Recorder)` for every test; `model-worker-lifecycle.spec.ts`'s `arrange` runs `registerCommand(container, RenameDesign)` for every test (AGENTS.md: "Arrange only what the test uses, passed as arguments to an `arrange` helper"); the hotkey layer swallows a key whose entry is unavailable.

**Acceptance Criteria:**
- Given each boundary-table row, when `pnpm test` runs, then a test named for it passes at its level, the editor rows in Chromium and Firefox and both themes.
- Given each toggled bug, its tests go red and green once restored: F6 not skipping a closed slide-out; a switch not calling `focus`; Esc available while closed; focus returning to the canvas instead of the invoker.
- Given `pnpm --filter app e2e` (the smoke), then the served app shows the shell at `/#/design/<id>/layout`.

## Implementation Notes

- Decision (Sergii): `eslint.config.ts`'s `keeb-cad/entry-parameters` override also covers `packages/editor/src/{workspace,landmarks,slide-out}/**/*.ts`, one folder per UiAction concept, with an "allows" row each in `tooling/lint/entry-parameters.spec.ts`; not all of `editor/src`, because the spec's existing row rejects `packages/editor/src/a.ts` and editing it is weakening a test; not a parameterless `apply()`, because AGENTS.md: "`implements` and `apply` use the type". A later UiAction folder adds itself to the glob and the spec.
- Decision (build): a `Show<W>` is unavailable off a design route, not available, because `/design/:id` needs an id and `router.push({ name: 'pcb' })` without one throws vue-router's missing-param error.
- Decision (build): a tab is named by its label alone, the hint `aria-hidden`, not `Layout1`, because EXPERIENCE.md names a tab's accessible name by its workspace (Tab badge: "Accessible name = the state text (`PCB: routing 41/56`)").
- Decision (build): empty views are `defineComponent({ render: () => null })`, not an empty `<template>`, because `eslint-plugin-vue`'s `vue/valid-template-root` rejects an empty template.
- Decision (build): `DesignLocation` stops the router listening on dispose, not each spec, because of the router spec's precedent: "A router left listening would answer a later test's hash change."
- Decision (build): the rail sits just before the slide-out in `Landmarks`' order, not in its place, so F6 from the rail reaches an open slide-out (Sergii's F6 decision).
- Decision (build): the Layout hint is `text-text`, not `text-text-muted`, because muted text on `canvas` measures about 4.27:1 and EXPERIENCE.md asks "WCAG AA text contrast … in both themes" (4.5:1).
- Decision (build): an empty segment redirects through a `''` child and an unknown one through `:unknown(.*)*`, not one catch-all, because with the `''` child removed, `pnpm vitest run src/router/create-editor-router.spec.ts` fails `replaces a missing one with layout` in Chromium and Firefox (tried 2026-11-08, restored).
- Decision (Sergii): the left rail is `<div role="group" aria-label="Left rail">`, not `<nav>` or a bare `<div>`, because a `nav` landmark would be one F6 skips and a bare `div` gives assistive tech no name for the rail's buttons.
- Decision (Sergii): `RecordingModelWorkerLifecycle.focus` records the workspace and does not call `super.focus`, not forwarding, because editor specs assert only what `DesignLocation` asked for and the app integration row proves the real send.
- Decision (Sergii): the same-workspace-key test asserts `invoke.available(ShowLayout)` is false and the URL and `focus` unchanged with no wait, not a one-macrotask wait or an `await router.push(current)`, because a refused key schedules nothing, a new push cancels a pending navigation, and a wrongly available key pushes a duplicate that changes neither URL nor `focus`: only the availability assertion fails on that bug.
- Decision (build): `UiTabPanel` re-registers its value with Reka's root context (`injectTabsRootContext().registerContent`) when it changes, not one `TabsContent` per trigger as Reka documents ("Contains the content associated with each trigger"), because Sergii's nested-routes decision has one panel follow the route, and with the re-register removed `TabPanel.spec.ts`'s second test goes red.
- Decision (build): a failed or cancelled navigation sends no `focus`, not the attempted workspace, because the open workspace didn't change.
- Decision (Sergii): closing the slide-out moves focus to the invoker, else the canvas, only when focus is inside the slide-out or on `body` at close; otherwise focus stays where the user put it. Not always returning focus, because a non-modal overlay doesn't own focus once the user leaves it. Patched in review, not looped back, with Sergii's consent; the boundary table gains the row "focus stays outside".
- Decision (Sergii): the colour-scheme steps live once in `src/testing/color-scheme.ts`, and `tsconfig.app.json` includes `browser-commands.d.ts` so `testing/` compiles; not five copies of the set, poll and reset steps, because they are identical in each spec. A triple-slash reference and an empty `import type {}` were rejected by lint.
- Decision (build): `optimizeDeps.include` gains `dexie` and `@bgotink/kdl`, which `commands` brings in, because the config's own comment: a dependency found mid-run re-bundles and loads Vitest's runner twice.

## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer; 0 findings dropped): high 0, medium 3, low 9, false 3, maybe-false 0.

| Lens | Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- | --- |
| quick | Editor rows run in one theme, not both | medium | patch | Only `EditorShell.spec.ts`'s box row calls `setColorScheme`; the plan's AC says "the editor rows in Chromium and Firefox and both themes". |
| quick | `UiTabPanel` is a Tab stop; F6 from it goes to the top bar | low | reject | Reka's `TabsContent.js:61` renders `tabindex: "0"`, its documented APG panel; F6 from it follows Sergii's "from outside every landmark, F6 goes to the top bar". Raised at the look. |
| quick | `registerContent` re-registration is an unlabelled departure from Reka's setup | low | patch | Recorded as a `Decision (build)` in Implementation Notes, with `TabPanel.spec.ts`'s toggled re-register as its evidence. |
| quick | `mountShell` registers the recording lifecycle for every caller | low | patch | AGENTS.md: "Arrange only what the test uses"; landmarks, canvas and shell specs never read it, and the real `focus` returns early when not running. |
| quick | `useWorkspace`, `useSlideOut` and `Landmarks.#targets` declare types inline | low | patch | AGENTS.md: "Put every type a folder declares … in that folder's `types.ts`"; precedent `InvokeFunctions` in `invoke/types.ts`. |
| quick | Comments that restate the code | low | patch | `// -1 when focus is in no place.`, `// To the invoker, else the canvas.`, `use-landmark.ts`'s and `mount-shell.ts`'s headers say what the next line does. |
| quick | Closing pulls focus to the invoker even after focus left the slide-out | medium | patch (Sergii: A, patch not loopback) | `onBeforeUnmount(returnFocus)` runs whatever holds focus; Esc from the canvas after T on the Layout tab lands on the tab. EXPERIENCE's "closing returns focus to the invoker, else the canvas" has two readings. |
| quick | The viewport is 1366x768, DESIGN.md says "1366×696 inside the browser" | low | defer | The ticket and the approved boundary row say 1366x768; the shell is flex, so 696 only shortens the canvas. |
| quick | `mount-editor.spec.ts` never disposes its container | medium | patch | Its `onTestFinished` unmounts but skips `container.dispose()`, so `DesignLocation`'s router keeps listening; it also leaves `#/design/lily-58/layout` in the hash. |
| test-reviewer | `toHaveTextContent('')` can't fail | false | reject | Vitest 5's matcher compares exactly: `pass: i === a` (`@vitest/browser/dist/expect-element.js`). |
| test-reviewer | `toBeVisible` after T-while-open adds nothing | low | reject | `invoke.available(OpenTree)` is the failing assertion; the extra line is harmless. |
| test-reviewer | The tree icon test hard-codes `Tree` | low | reject | The label is the requirement's (`label: 'Tree'`), not computed. |
| test-reviewer | Fallback when the invoker left the DOM is undocumented | false | reject | EXPERIENCE.md: "closing returns focus to the invoker, else the canvas". |
| test-reviewer | A failed navigation sends no `focus`; `useLandmark` throws on no root | low | patch | Recorded as a `Decision (build)`; the throw is a loud failure on an unreachable state, correct behaviour. |
| test-reviewer | `unregister` removes only the same element | low | reject | It keeps a remounted root registered when the old one unmounts after; correct and negligible. |

Pass 2 (quick, test-reviewer, on the files pass 1's patches touched; 0 dropped): high 0, medium 0, low 5, false 2, maybe-false 1.

| Lens | Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- | --- |
| quick | Rendered shell rows still run in one theme | low | patch | `EditorShell.spec.ts`'s top-bar-name and landmark-label rows set no scheme; `design-location.spec.ts` and the router spec render nothing, so a theme can't reach them. |
| quick | `EditorShell.spec.ts` and `mount-editor.spec.ts` copy the colour-scheme steps | low | patch | Their `afterEach` and set-and-poll lines match `emulateColorScheme` / `resetColorScheme` line for line; Sergii's decision puts them in `testing/color-scheme.ts`. |
| quick | `resetColorScheme` runs before the app unmounts, so `useColorMode` may write `data-theme` back | maybe-false | defer | Vitest runs `onTestFinished` after `afterEach`, so the reset does run while mounted; whether VueUse's listener rewrites `data-theme` on `setColorScheme(null)` needs a run that reads the attribute after teardown. Three green shuffled runs so far. |
| quick | `mount-editor.spec.ts` resets the hash twice | low | patch | The top-level `afterEach` and the new `onTestFinished` both call `history.replaceState`. |
| quick | `mountShell`'s overload builds `ShellArrangement & { recordFocus: true }` inline | low | patch | AGENTS.md: "Put every type a folder declares … in that folder's `types.ts`". |
| quick | `landmarks.ts`'s "From outside every place" and `use-slide-out.ts`'s focus comment restate code | low | reject | They state the rule behind a non-obvious fallback (Sergii's F6 and focus-return decisions), which `at === -1 ? undefined` doesn't say. |
| quick | `rounded-r-lg` on the slide-out has no requirement | false | reject | DESIGN.md › Components: the slide-out has "right corners `{rounded.lg}`". |
| test-reviewer | `toHaveTextContent(hint)` is a substring match | false | reject | Vitest 5's matcher: `let a=String(t); return {pass: i===a, …}`, exact after whitespace normalising. |

Pass 3 (quick, test-reviewer, on pass 2's patches; 0 dropped): high 0, medium 0, low 3, false 1, carried 2. Nothing patched.

| Lens | Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- | --- |
| quick | `mount-editor.spec.ts`'s top-bar test runs in one theme | low | reject | It is `mountEditor`'s container contract, not a boundary row; the "top bar name" row runs in both themes in `EditorShell.spec.ts`. |
| quick | The hash reset in `arrange`'s `onTestFinished` misses a setup that throws | low | reject | Only after a setup failure, which already fails that test; unlikely in everyday use. |
| quick | The deferred entry says "medium, unverified" but the log says `maybe-false` | false | reject | The workflow's defer rule: a `maybe-false` that would be medium is recorded "with that severity marked unverified". |
| quick | The reset-before-unmount race was cheap to fix | maybe-false | carried | carried: pass 2's deferred row, the same claim and the same code. |
| test-reviewer | `afterEach(resetColorScheme)` runs before unmount | maybe-false | carried | carried: pass 2's deferred row. |
| test-reviewer | Theme-looped rows have no theme-dependent `expect` | low | reject | The ticket's verify asks every row "in both themes"; the doubled run is the requirement's. |

## Design Notes

- **Decision (plan): 1366x768 is the editor browser config's viewport, not a per-test `page.viewport`,** because every editor row runs at it (ticket: "In Vitest browser mode at 1366x768") and AGENTS.md: "a helper never takes a hidden step the assertions depend on"; `browser.viewport` is Vitest's documented setting (vitest.dev/config/browser/viewport).
- **Decision (plan): opening the slide-out focuses its root, not leaving focus where it was,** because EXPERIENCE.md: "Opening an overlay focuses its first meaningful item", and the empty slide-out's root (`tabindex="-1"`) is its only focusable element.
- **Decision (plan): Esc is unavailable while the slide-out is closed, not a no-op apply,** because the I/O matrix: "Esc while closed does nothing", and the spine: "Its `available(handle)` is the one availability query the UI reads".
- **Decision (plan): T while open is unavailable, not a toggle,** because EXPERIENCE.md: "T opens it … Non-modal; Esc closes".
- **Decision (plan): landmark roots are `header`, `aside`, `main`, `aside`, `footer`, not `div`s with `role`,** because AGENTS.md: "Find elements by role, then label, then text", and the HTML elements carry those landmark roles natively.
- **Decision (plan): `/` renders an empty `NoDesign`, not the shell,** because the shell needs an open design and EXPERIENCE gives "No design open (the empty state)" to the Start screen, another story's; Launch always replaces `/`.
- **Decision (plan): the landmark labels are `Top bar`, `Tree`, `Canvas`, `Inspector`, `Status strip`, not workspace-specific names,** because they are EXPERIENCE.md's component names (Global chrome, Panels and overlays) and the landmarks stay fixed while workspaces swap.
- **Decision (plan): Shift+F6 from outside every landmark goes to the status strip, not the top bar,** because the order wraps ("Shift+F6 to the previous, wrapping") and F6 from there goes to the first.
- **Decision (plan): the rail button is a new `ui` part `UiRailButton`, not `UiButton` with overriding classes or a raw `button` in `editor`,** because the spine: "Callers pass a `ui` component only **outer layout classes** … never what the component styles itself", and "States … are styled through ARIA and data-attribute variants". It is a disclosure button, not one of the spine's Reka-listed widgets.
- **Decision (plan): the UiAction ids take `workspace.`, `landmarks.` and `slideOut.`,** the concept folders (`workspace/`, `landmarks/`, `slide-out/`), not the per-workspace subfolder, because the Naming row: "a command id is `<concept folder>.<verb+noun camelCase>`" and `layout.` belongs to the layout tree's commands.
- **Decision (plan): `focus` is asserted on a fake `ModelWorkerLifecycle` in editor specs, not on a `FakeWorker`'s posts,** because AGENTS.md: "Test wiring between packages as integration in `pipeline` or `app`"; the call is the behaviour, so `toHaveBeenCalledWith` fits. The app row proves the post.
- **Decision (plan): the e2e smoke stays, not dropped for the app integration rows,** because those rows don't run the built bundle (its worker, bundling, hash history) and AGENTS.md keeps an e2e test for "a boundary no lower level can fake"; it covers only the normal flow.

## Conformance Log

- `Shared dependencies go through the pnpm catalog` -- fixed (`@vueuse/core` dropped: nothing in 23.8 uses it).
- `Give every threshold three rows … an input that breaks an assumption` (Shift+F6 rows, F6 from inside a landmark and the rail) -- asked, fixed.
- `Put every type a folder declares … in that folder's types.ts` (`landmarks/`, `testing/`) -- fixed.
- `ui … only editor imports it, through its root` (new parts' `index.ts` exports, workbench registration) -- fixed.
- `A missing provider fails at the entry's first run` (`mount-editor.spec.ts`, `App.spec.ts`, `index.ts` unlisted) -- fixed.
- `vue-router is the one owner of the open design and workspace` (Launch reads `name === 'design'` and `params.workspace`) -- fixed.
- `Every kbd hint is formatted by its formatter` (tab hints) -- fixed; final pass: `UiKbd` formats the raw hotkey -- fixed.
- `Take expected values from the requirement` (both themes per the ticket's verify) -- fixed.
- `A choice no requirement made is a decision and is labelled as one` (T while open, ids and labels, focus return to the invoker, `/` route, landmark elements) -- fixed.
- `Give every test an expect that fails when the behaviour breaks` (focus-return row) -- fixed.
- `When nothing says what a boundary returns, ask` (trailing-slash row) -- fixed (row dropped); final pass: landmark labels, Shift+F6 from body, first navigation -- fixed.
- `Each term means exactly one thing` (`region`, `frame`) -- asked (Sergii: landmark, shell); final pass: `top bar`, `left rail` -- fixed.
- `Test wiring between packages as integration in pipeline or app` (`focus` on a FakeWorker) -- fixed.
- `Find elements by role, then label, then text` (landmark roles) -- fixed.
- `When a decision departs from a Stack dependency's documented setup, that documented setup is its Y, cited from the library's docs` (Reka tabs) -- fixed.
- `Give every decision its rejected alternative` (themes decision; final pass: e2e decision) -- fixed.
- `Write a shared assertion once` -- deferred (`packages/editor/src/invoke/invoke.spec.ts`, repeated `unavailable` assertion).
- `Arrange only what the test uses` -- deferred (`packages/editor/src/invoke/invoke.spec.ts:159` `container.register(Recorder).useClass(Recorder)`; `packages/workers/src/model-worker/model-worker-lifecycle.spec.ts:56` `registerCommand(container, RenameDesign)`).
- `Take expected values from the requirement` (`packages/ui/src/tabs/Tabs.spec.ts` labels from props, module-level `ITEMS`) -- fixed (the moved specs don't copy it).
- `(service) or (function)` tags (`pressKey`, `createEditorRouter`; final pass: the recording fake) -- fixed.
- `Callers pass a ui component only outer layout classes` (rail button) -- fixed (`UiRailButton`).
- `a command id is <concept folder>.<verb+noun camelCase>` -- fixed (decision names the concept folders).
- `never after the library it wraps` (`EditorRouter`) -- asked (Sergii: alias removed).
- gap: `@vueuse/core` in `packages/ui/package.json` and `packages/editor/package.json` -- fixed.
- gap: F6 from `packages/editor/src/slide-out/LeftRail.vue`'s button -- asked.
- gap: `packages/editor/src/landmarks/types.ts` -- fixed.
- gap: `packages/ui/src/index.ts`, `packages/ui/workbench/widgets.ts` -- fixed.
- gap: `packages/editor/src/index.ts`, `mount-editor.spec.ts`, `App.spec.ts` -- fixed.
- Dropped findings: 0.

## Verification

**Commands:**
- `pnpm test` -- expected: green, the editor browser rows in Chromium and Firefox.
- `pnpm check` -- expected: exit 0, lint, typecheck, dependency-cruiser, build and the e2e smoke included.

**Manual checks:**
- `pnpm --filter app dev`, open `/`: the shell at 1366x768 in both themes; 1–5, T, Esc, F6 behave as above.

## Boundary Table

| Group | Row | Input | Expected | Level |
| --- | --- | --- | --- | --- |
| rules | keys 1–5 | at layout; press 2 / 3 / 4 / 5, then 1 from firmware | that tab selected, URL segment that workspace, lifecycle `focus` called with it | unit (editor) |
| rules | same workspace key | at layout; press 1 | URL unchanged, `focus` not called | unit (editor) |
| rules | tab click | at layout; click the Case tab | URL `…/case`, lifecycle `focus('case')` | unit (editor) |
| rules | tab hints | the shell | hints `1` … `5`, from the handles' hotkeys | unit (editor) |
| rules | T and Esc | closed: T; open: Esc; closed: Esc | open, the slide-out holds no text; closed; still closed | unit (editor) |
| rules | T while open | open: T | still open | unit (editor) |
| rules | rail button | click Tree; click Tree | open, `aria-expanded=true`; closed, `false` | unit (editor) |
| rules | focus returns to the invoker | focus on the Layout tab, T, Esc | focus on the Layout tab | unit (editor) |
| rules | focus stays outside | focus on the Layout tab, T, focus on the canvas, Esc | focus on the canvas | unit (editor) |
| rules | focus falls back to the canvas | focus on body, T, Esc | focus on the canvas landmark | unit (editor) |
| rules | F6 order, closed slide-out | from body, F6 ×4, then a 5th | top bar, canvas, inspector, status strip; top bar | unit (editor) |
| rules | F6 order, open slide-out | slide-out open, from top bar, F6 | slide-out | unit (editor) |
| rules | Shift+F6 wraps | from top bar | status strip | unit (editor) |
| rules | Shift+F6 from outside | focus on body | status strip | unit (editor) |
| rules | first navigation | DesignLocation at `/`, then to `/design/corne/layout` | `focus` not called | unit (editor) |
| rules | Shift+F6, open slide-out | slide-out open, from the canvas | slide-out | unit (editor) |
| rules | Shift+F6, closed slide-out | from the canvas | top bar | unit (editor) |
| rules | F6 from inside a landmark | focus on the PCB tab | canvas | unit (editor) |
| rules | F6 from the rail, closed | focus on the Tree button, slide-out closed | canvas | unit (editor) |
| rules | F6 from the rail, open | focus on the Tree button, slide-out open | slide-out | unit (editor) |
| rules | Shift+F6 from the rail | focus on the Tree button | top bar | unit (editor) |
| rules | empty landmarks | F6 to the inspector, then the status strip | focus on each landmark root, which holds nothing | unit (editor) |
| rules | empty Layout hint | at layout | `Add a group (G) or open the command palette (Ctrl+K).` | unit (editor) |
| rules | empty other workspaces | at outline | canvas landmark with no text | unit (editor) |
| module boundaries | top bar name | design `Corne` open | top bar heading `Corne` | unit (editor) |
| module boundaries | tab order | the shell | tabs `Layout`, `Outline`, `PCB`, `Case`, `Firmware` in `role=tablist` | unit (editor) |
| module boundaries | shell boxes, each theme | 1366x768, dark / light | top bar 42px high, rail 44px wide, inspector 320px wide, strip 30px high, canvas 1002x696 (DESIGN.md's sizes at 1366x768); top bar, rail and strip `chrome`, inspector `panel` in that theme | unit (editor) |
| module boundaries | landmarks are labelled | the shell | `banner`, `main`, `complementary` (inspector), `contentinfo`, each `tabindex=-1` with its `aria-label` | unit (editor) |
| module boundaries | Tabs parts apart | `UiTabList` and one `UiTabPanel` in separate containers under `UiTabs` | the selected tab's `aria-controls` is the panel's id; the panel's `aria-labelledby` is that tab | unit (ui) |
| module boundaries | workspace URL forms | `/design/corne` / `/design/corne/bogus` / `/design/corne/Layout` | `/design/corne/layout` each (the router spec's existing rows) | unit (editor) |
| glue | switch reaches the worker | app container, launched; press 3 | the model worker receives `focus { workspace: 'pcb' }` | integration (app) |
| glue | launch at a workspace | stored design, URL `…/pcb` | Launch opens it at pcb, `start` given `pcb` | integration (app) |
| glue | launch shows the shell | served app at `/` | heading `Untitled design`, URL `/#/design/<id>/layout` | end to end |
