---
title: 'The editor frame shows the design'
type: 'feature'
ticket: '8'
created: '2026-11-08'
status: 'draft'
baseline_revision: ''
route: 'full'
route_source: 'auto'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md'
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app opens a design but shows only an `h1` "keeb-cad" over the design's name and id: no frame, no workspace switching, no region focus, and nothing tells the user what the model worker is doing or that it has given up. `workers` holds a bare `'failed'`, keeps only the issues list (no seq), and resets its crash count on `stage-started` and `derived-files`, against AD-11.

**Approach:** Build EXPERIENCE.md › Global chrome in `editor` (top bar with the design name and the workspace tabs, left rail with the Tree slide-out shell, canvas region, docked 320px inspector region, status strip), each region a labelled landmark that F6 / Shift+F6 cycle. Keys 1–5, T, Esc, F6 and Shift+F6 are UiActions. `workers` keeps the issues with their seq, the running stage with its arrival time, and a `WorkerFailed`; its crash count resets only on an `issues` post; `commands` gains `RestartModelWorker`, which the strip offers.

## Boundaries & Constraints

**Always:**
- Tabs follow `workspaceSchema`'s option order (Layout, Outline, PCB, Case, Firmware) on `ui`'s Tabs wrapper, `role=tablist`. A switch changes the route's workspace segment (vue-router owns the design location) and `workers` sends `focus { workspace }` for it.
- Region roots (top bar, slide-out when open, canvas, inspector, status strip) are `tabindex="-1"` with an `aria-label`; F6 moves to the next in that order, Shift+F6 to the previous, wrapping, landing on a region even when it is empty; a closed slide-out is skipped.
- T opens the Tree slide-out (non-modal) showing `No nodes. Add a group (G).`; Esc closes it. The empty Layout canvas shows `Add a group (G) or open the command palette (Ctrl+K).` verbatim; Outline, PCB, Case and Firmware show an empty canvas region with no text. G and Ctrl+K stay inert.
- Status strip counts: errors and warnings from the last posted `issues`, `0` before the first; dimmed with `◌` while that issues' seq is behind the open design's seq (AD-11).
- Running stage: shown only when more than 1000 ms have passed since its `stage-started` arrived on main: its `StageId`, the elapsed whole seconds (`2 s`) and Restart, until the next accepted post clears it.
- The crash count resets only on an accepted `issues` post (and, later, a stage output). `stage-started` and `derived-files` never reset it. At the third consecutive crash the status is failed with `WorkerFailed { message, stage? }`: `message` is the `ErrorEvent`'s message, or `workers`' fixed text for a message that fails to deserialize; `stage` is set only when a `stage-started` arrived in the crashing epoch with no accepted post after it. The strip shows `failed: <message>`, naming that stage when set, with Restart, until Restart.
- Restart runs `RestartModelWorker` (a `commands` action) through `useInvoke()`; components reach services only through composables.
- Every visible colour and size comes from `ui`'s tokens (DESIGN.md: top bar 42px, rail 44px, inspector 320px, status strip 30px, slide-out 260px), in both themes.

**Never:**
- Tab badges, the save state, File and Export menus, undo/redo, the violations panel, cursor and zoom, the Tree's nodes, Parameters and Parts tabs, the command palette, Design settings in the inspector.
- A `failed` message in the violations panel (ticket's open question, Sofia's pick: a worker crash is not a Violation).
- A hand-built ARIA widget; Tailwind's `dark:`; arbitrary Tailwind values; `vi.mock`; a clock registered for tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Switch workspace | design open at layout; press 3 | tab PCB selected, URL `…/pcb`, worker receives `focus { workspace: 'pcb' }` | — |
| Same workspace | at layout; press 1 | nothing changes, no second `focus` | — |
| Slide-out | closed; T, then Esc | opens with the empty text; Esc closes; Esc while closed does nothing | — |
| F6 | focus on body / top bar / status strip | top bar / canvas (slide-out closed) / top bar | — |
| Counts | no issues yet; issues at seq 2 while design at seq 3 | `0`/`0` undimmed per Open Question 3; dimmed with `◌` | — |
| Running stage | `stage-started` parts, fake timers | nothing at 999 and 1000 ms; `parts`, `1 s`, Restart at 1001 ms | — |
| Crash cap | 3 crashes, each after `stage-started` plates | `failed: <message>` naming plates, Restart | no auto-restart |
| Crash cap, no stage | 3 crashes, no `stage-started`, or one followed by `derived-files` | `failed: <message>`, no stage | — |
| Deserialize failure | 3 `messageerror`s | `failed: <workers' fixed text>` | — |

</frozen-after-approval>

## Code Map

- `packages/workers/src/model-worker/types.ts` -- `ModelWorkerStatus = 'idle' | 'running' | 'failed'` (bare); `SpawnedWorker`'s `'error' | 'messageerror'` listener takes `Event`. `Running` stays private.
- `packages/workers/src/model-worker/model-worker-lifecycle.ts` -- `start(spawn, workspace = 'layout')` L21, `focus(workspace)` L29 (stores it; sends when running; no caller outside specs yet), `restart()` L41 (throws before start, zeroes the count, respawns). `#spawnFromStore` L82 bumps the epoch and `dispatcher.restart(epoch)`. `#watch` L115–144: `issues` sets `#issues` and resets, `'stage-started': resetCrashes`, `derived-files` resets and calls `store.acceptDerivedFiles`; `onError(event: Event)` calls `preventDefault()` then `#crash()`, `onMessageError` calls `#crash()`. `#crash` L146: cap 3, then `'failed'`. Reactive state is private `shallowRef`s behind getters.
- `packages/workers/src/model-worker/model-worker-lifecycle.spec.ts` -- `arrange()` L54 (real `designModule` + `workersModule`, `spawn` pushing `FakeWorker`s), helpers `issuesAt`, `derivedFilesAt`, `aViolation`, `latest`. Rows "starts counting again after a stage-started at the latest seq" and the derived-files reset contradict AD-11 now; the requirement changed, so they change (not weakened).
- `packages/workers/src/testing/fake-worker.ts` -- `crash()` dispatches a plain `Event('error')`; `failToDeserialize()`; `post(msg)`.
- `packages/messaging/src/dispatcher/dispatcher.ts` -- the gate; accepted posts only reach `#watch`'s handlers. Don't change.
- `packages/protocol/src/model-worker/types.ts` -- `issues { violations }`, `stage-started { stage }`, `derived-files`, all `Stamp`ed (`epoch`, `seq`). No stage-output kind. Don't change.
- `packages/schema/src/{workspace.ts,stage-id.ts,types.ts}` -- `workspaceSchema` (tab order), `stageIdSchema`, `Violation.severity: 'error' | 'warning'`; `schema/testing` has `aWorkspace`, `aStageId`.
- `packages/commands/src/design/new-design.ts` -- the action shape to copy (`kind`, `id`, `label`, `input = emptyInputSchema`, `available(current)`, `apply` returning `AsyncResult`, `#x = inject(...)`); `design-actions-module.ts` the module shape; `src/empty-input-schema.ts`, `src/types.ts` not exported yet. NewDesign names a design `Untitled design`.
- `packages/editor/src/App.vue` -- `useShortcuts()`, `h1` "keeb-cad", scoped CSS with `#ccc` (deferred-work entry; this story replaces it). `App.spec.ts` and `app/e2e/vue.spec.ts` assert that `h1`.
- `packages/editor/src/mount-editor.ts` -- creates the router (`createEditorRouter()`), `provideInjectorOnApp`, `useThemeChoice()`, mounts, returns `DesignLocation` (= `Router`, `types.ts`), which `app/src/launch/launch.ts` uses (`isReady`, `currentRoute`, `replace`) and then calls `lifecycle.start(spawn, workspace)`.
- `packages/editor/src/router/{create-editor-router.ts,resolve-workspace.ts}` -- hash history, `/design/:id/:workspace?`, a bad segment replaced with `layout`.
- `packages/editor/src/views/DesignCanvas.vue` (+spec) -- `useOpenDesign()`, shows name and id "until 8"; becomes the canvas region's content.
- `packages/editor/src/{ui-actions,invoke,shortcuts,design}/` -- `registerUiAction(container, Handle)`, `useInvoke()`, `ShortcutRegistry` (layer id `<handle id>#<index>`, refusals dropped), `useOpenDesign()`. No real UiAction yet. `invoke.spec.ts` and `shortcut-registry.spec.ts` are the arrange precedent.
- `packages/editor/src/testing/press.ts` -- letters only (`code: Key<L>`); 1–5, F6, Shift+F6 and Escape need their own key and code.
- `packages/editor/vitest.config.ts` -- browser mode, `setColorScheme` command, no viewport (Vitest's default is 414x896).
- `packages/ui/src/tabs/UiTabs.vue` -- Reka `TabsRoot` > `TabsList` + one `TabsContent` per item with a named slot; `TabItem = { value, label }`, `v-model`. List and panels can't sit in different parts of the frame today (Open Question 2).
- `packages/ui/src/icon/` -- `IconName` map holds only `close`; the rail's Tree button needs one more lucide icon. `ui`'s `UiButton` (`disabledReason`), `UiTooltip`, `src/testing/css-rgb.ts`, `theme/theme.css` tokens (`chrome`, `panel`, `border`, `text`, `text-muted`, `error`, `warning`, `focus`, spacing `top-bar`, `left-rail`, `inspector-width`, `status-strip`, `slide-out-width`, `target-min`, `focus-offset`).
- `packages/ui/src/hotkeys/hotkey-layer.ts` -- calls `preventDefault()` on a matched entry, so F6 never reaches the browser's own F6.
- `app/src/main-modules.ts` -- gains `commands`' new module.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/workers/src/model-worker/types.ts` -- `WorkerFailed = { message: string; stage?: StageId }`; `ModelWorkerStatus = { kind: 'idle' } | { kind: 'running' } | { kind: 'failed'; failure: WorkerFailed }`; `PostedIssues = { seq: number; violations: Frozen<Violation[]> }`; `RunningStage = { stage: StageId; arrivedAt: number }`; `SpawnedWorker`'s `error` listener takes `ErrorEvent`, `messageerror` keeps `Event`.
- [ ] `packages/workers/src/model-worker/unreadable-message-text.ts` -- the fixed text (Open Question 4).
- [ ] `packages/workers/src/model-worker/model-worker-lifecycle.ts` (service) -- `issues: Option<PostedIssues>` (none before the first); `runningStage: Option<RunningStage>`, set on `stage-started` with `Date.now()`, cleared by an accepted `issues` or `derived-files` post, by a respawn and by `restart()`; `#crashes` reset only by `issues`; `#crash(message)` records the message; at the cap, status failed with `stage` from `runningStage` of the crashing epoch.
- [ ] `packages/workers/src/testing/fake-worker.ts` -- `crash(message)` dispatches a cancelable `ErrorEvent` carrying it.
- [ ] `packages/workers/src/model-worker/model-worker-lifecycle.spec.ts` -- the workers rows of the boundary table; rewrite the stage-started and derived-files reset rows to AD-11.
- [ ] `packages/workers/src/index.ts` -- export the new types and the fixed text.
- [ ] `packages/commands/src/model-worker/{restart-model-worker.ts,restart-model-worker.spec.ts,model-worker-module.ts}` -- `RestartModelWorker` (service: an action class), id `model-worker.restartModelWorker`, label `Restart`, `emptyInputSchema`; `available` is false while the lifecycle is idle (its `restart()` throws before `start`); `apply` calls `lifecycle.restart()`. `modelWorkerModule` registers it. `index.ts` exports both, `emptyInputSchema` and `EmptyInput`; `package.json` gains `@keeb-cad/workers`.
- [ ] `app/src/main-modules.ts` -- add `modelWorkerModule`.
- [ ] `packages/ui/src/tabs/` -- per Open Question 2; its workbench states and spec follow.
- [ ] `packages/ui/src/icon/` -- add a `tree` icon (lucide `ListTree`) to the map and its workbench state.
- [ ] `packages/editor/package.json` -- add `@keeb-cad/commands`, `@keeb-cad/workers`, `@vueuse/core` (14.4.0, as `ui`). `vitest.config.ts` -- `browser.viewport: { width: 1366, height: 768 }`; pre-bundle what the new imports need.
- [ ] `packages/editor/src/router/` -- per Open Question 1: the router reachable from a UiAction; on a workspace change `ModelWorkerLifecycle.focus(workspace)`.
- [ ] `packages/editor/src/workspace/` -- five UiActions (Open Question 5), hotkeys `1`…`5`, unavailable when already on that workspace; `use-workspace.ts` (function, composable): the current workspace and a switch through `invoke`; `WorkspaceTabs.vue`.
- [ ] `packages/editor/src/regions/` -- `Regions` (service): region root elements by name in EXPERIENCE's order; `use-region.ts` (function, composable) registers a template ref while mounted; `FocusNextRegion` (`F6`) and `FocusPreviousRegion` (`shift+F6`) UiActions (service: UiAction classes) over it, three files each with `emptyInputSchema`.
- [ ] `packages/editor/src/tree/` -- `SlideOut` (service: an `open` ref); `OpenTree` (`T`, unavailable while open) and `CloseSlideOut` (`Escape`, unavailable while closed) UiActions; `use-slide-out.ts` (function, composable); `TreeSlideOut.vue` (260px, floats over the canvas edge, overlay shadow, focused on open; focus returns to the element focused before, else the canvas, per EXPERIENCE.md › Focus and regions); `LeftRail.vue` with a Tree button (`aria-expanded`) running `OpenTree`/`CloseSlideOut`.
- [ ] `packages/editor/src/status-strip/` -- `use-status-strip.ts` (function, composable): error and warning counts, `behind` (issues seq < open design's seq), the running stage once past 1000 ms with whole seconds (VueUse for the tick), the failure; `StatusStrip.vue` with Restart (`UiButton`, `invoke(RestartModelWorker)`).
- [ ] `packages/editor/src/frame/{TopBar.vue,InspectorRegion.vue,CanvasRegion.vue}` + `App.vue` -- the frame grid; the top bar's `h1` is the design's name; `CanvasRegion` replaces `DesignCanvas` (hint for Layout, nothing for 2–5). Drop `App.vue`'s scoped CSS.
- [ ] `packages/editor/src/editor-module.ts` -- register the services and the UiActions.
- [ ] `packages/editor/src/testing/press.ts` -- a key helper taking `key`, `code` and Shift.
- [ ] Editor specs (browser) -- the editor rows of the boundary table, each in the folder of what it tests; `App.spec.ts` for the frame rows, in both themes.
- [ ] `app/e2e/vue.spec.ts` -- the `h1` is `Untitled design` (the requirement moved the name into the top bar).
- [ ] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- mark the `App.vue` `#ccc` entry closed by this story.

**Acceptance Criteria:**
- Given each boundary-table row, when `pnpm test` runs, then a test named for it passes at its level, the editor rows in Chromium and Firefox.
- Given each toggled bug, its tests go red and green once restored: `stage-started` resets the count again; `runningStage` not cleared by a post; the 1000 ms check uses `>=`; F6 skipping no closed slide-out; a switch not sending `focus`.
- Given `pnpm --filter app e2e` (the smoke), then the served app shows the frame at `/#/design/<id>/layout`.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

- **Decision (plan): `ModelWorkerStatus` is a union discriminated by `kind`, not `'idle' | 'running' | WorkerFailed`,** because the spine's Data Schema discriminates every union by `kind` (`Rejection`: `input-invalid`, `unavailable`, `stale`).
- **Decision (plan): the running stage is cleared by any accepted post (`issues`, `derived-files`), not only by `issues`,** because AD-11 says "until the next post clears it" and "a stage was running at the last crash (its `stage-started` in the crashing epoch with no later post)", and the ticket's no-stage row is "one followed by a derived-files post".
- **Decision (plan): `workers` stamps arrival with `Date.now()`, not an injected clock,** because AGENTS.md: "Set time with Vitest's fake timers; never register a clock only so tests can control it", and Vitest's fake timers fake `Date`.
- **Decision (plan): `RestartModelWorker` is a design-store action in `commands`, not a UiAction,** because the ticket says "a RestartModelWorker action class in commands" and AD-10 says commands "imports workers".
- **Decision (plan): only the frame rows run in both themes; behaviour rows run once,** not every row twice, because AD-26: "Themes swap token values; components never use Tailwind's `dark:` variant", so a theme can change only colours.
- **Decision (plan): 1366x768 is the editor browser config's viewport, not a per-test `page.viewport`,** because every editor row runs at it (ticket: "In Vitest browser mode at 1366x768") and AGENTS.md: "a helper never takes a hidden step the assertions depend on". Vitest's documented `browser.viewport` (vitest.dev/config/browser/viewport) is that setting.
- **Decision (plan): VueUse ticks the elapsed time, not a hand-written `setInterval`,** because AD-26: "**VueUse** covers low-level Vue utilities".
- **Decision (plan): a workspace key on the open workspace is unavailable, not a second navigation,** because vue-router resolves a navigation to the current location as a no-op and the I/O matrix's "Same workspace" sends no second `focus`.

## Open Questions

1. **How a workspace UiAction reaches the router.** The router is created inside `mountEditor`, after the container; a UiAction is a `di` class. Spine: "vue-router is the one owner of the open design and workspace" and "UI state … lives in small `di` services". (A, recommended) an `editor` service that creates the router in its constructor; `mountEditor` resolves it and `app.use`s it, still returning the router to `Launch`; it also sends `focus` on a workspace change. (B) `mountEditor` registers the created router into the container through a new `createToken` (a spine edit: AD-25's token table). (C) `Launch` in `app` wires `focus` from `router.afterEach`, with (A) for the UiActions.
2. **The Tabs wrapper.** `UiTabs` renders its list and panels together; the list goes in the top bar, the panel in the canvas region. Spine: "Every ARIA widget (… tabs …) is a Reka UI primitive, never hand-built. Reka is wrapped in `ui`". (A, recommended) split it into `UiTabs` (root, default slot), `UiTabList` (`items`) and `UiTabPanel` (`value`), each a thin Reka wrapper; story 6's spec and workbench move to the parts. (B) keep `UiTabs` and add a `UiTabList`-only wrapper with no panels (Reka then points `aria-controls` at no panel). (C) leave it out: tabs as plain buttons with `role` attributes (hand-built, against AD-26).
3. **Counts before the first `issues`.** Spine: "the error and warning counts show the last known numbers, dimmed with `◌` while their seq is behind main's, and `0` before the first `issues`". It doesn't say whether that `0` is dimmed. (A, recommended) dimmed with `◌`: no numbers are known yet. (B) undimmed. (C) leave it out: no row for it.
4. **Failure texts.** Spine: "`message` is the error event's message, or a fixed text from `workers` for a message that failed to deserialize". (a) the fixed text: recommended `the model worker sent a message that could not be read`. (b) an `ErrorEvent` with an empty message: (A, recommended) use `the model worker stopped with no message`; (B) show `failed: ` with nothing after it; (C) leave it out. (c) the strip's text naming a stage: recommended `plates · failed: <message>`; and elapsed seconds rounded down (`1999 ms` → `1 s`), not to nearest, since the strip reports seconds passed.
5. **The five workspace UiActions.** AGENTS.md: "Give each command or action three files in its concept folder" and "tokens, errors and `define*` factories each get their own file". (A, recommended) five plain classes `ShowLayout` … `ShowFirmware` (`workspace.showLayout`, …), one file each, all `emptyInputSchema`, no factory. (B) one `defineShowWorkspace(workspace, hotkey)` factory and five handles from it.

## Verification

**Commands:**
- `pnpm test` -- expected: green, the editor and workers browser rows in Chromium and Firefox.
- `pnpm check` -- expected: exit 0, lint, typecheck, dependency-cruiser, build and the e2e smoke included.

**Manual checks:**
- `pnpm --filter app dev`, open `/`: the frame at 1366x768 in both themes; 1–5, T, Esc, F6 behave as above.

## Boundary Table

| Group | Row | Input | Expected | Level |
| --- | --- | --- | --- | --- |
| production bugs | stage-started resets nothing | 2 crashes, `stage-started` at latest seq, 1 crash | failed | unit (workers) |
| production bugs | derived-files resets nothing | 2 crashes, `derived-files` at latest seq, 1 crash | failed | unit (workers) |
| production bugs | issues resets | 2 crashes, `issues` at latest seq, 2 crashes | running | unit (workers) |
| production bugs | below / on the cap | 2 / 3 consecutive crashes | running / failed | unit (workers) |
| production bugs | second crash restarts | 2 consecutive crashes | a third worker spawned, running | unit (workers) |
| rules | failure names the stage | 3 crashes, each after `stage-started` plates | `{ kind: 'failed', failure: { message, stage: 'plates' } }` | unit (workers) |
| rules | no stage started | 3 crashes, no `stage-started` | failure without `stage` | unit (workers) |
| rules | stage then derived-files | 3 crashes, the last after `stage-started` plates then `derived-files` | failure without `stage` | unit (workers) |
| rules | stage from an older epoch | `stage-started` plates, crash, then 2 crashes with none | failure without `stage` | unit (workers) |
| rules | deserialize failure | 3 `messageerror`s | failure `message` = the fixed text | unit (workers) |
| rules | error message | 3 crashes with `ErrorEvent` message `boom` | failure `message: 'boom'` | unit (workers) |
| rules | empty error message | `ErrorEvent` message `''` | per Open Question 4b | unit (workers) |
| rules | issues held with seq | `issues` at seq 2 | `issues` some `{ seq: 2, violations }` | unit (workers) |
| rules | running stage | `stage-started` parts at t; then `issues` | some `{ stage: 'parts', arrivedAt: t }`; then none | unit (workers) |
| rules | restart clears failure | failed; `restart()` | running, a new worker | unit (workers) |
| rules | Restart available | lifecycle idle / running / failed | false / true / true | unit (commands) |
| rules | Restart applies | failed; run `RestartModelWorker` | lifecycle running | unit (commands) |
| rules | counts before issues | no `issues` | `0` errors, `0` warnings, dimmed per Open Question 3 | unit (editor) |
| rules | counts current | issues at the design's seq: 1 error, 2 warnings | `1` / `2`, not dimmed | unit (editor) |
| rules | counts behind | issues at seq n−1, design at n | dimmed with `◌` | unit (editor) |
| rules | running stage threshold | `stage-started` parts; advance 999 / 1000 / 1001 ms | nothing / nothing / `parts`, `1 s`, Restart | unit (editor) |
| rules | elapsed seconds | advance 1999 / 2000 ms | `1 s` / `2 s` | unit (editor) |
| rules | post clears stage | at 1001 ms, `issues` at latest seq | no stage, no Restart | unit (editor) |
| rules | failed with stage | 3 crashes after `stage-started` plates | `failed: boom` naming `plates`, Restart | unit (editor) |
| rules | failed, no stage | 3 crashes, no stage | `failed: boom`, no stage name, Restart | unit (editor) |
| rules | failed, deserialize | 3 `messageerror`s | `failed: ` + the fixed text | unit (editor) |
| rules | Restart click | failed; click Restart | strip clears, a new worker spawned | unit (editor) |
| rules | keys 1–5 | at layout; press 2 / 3 / 4 / 5 / 1 | tab selected, URL segment, worker's last `focus` = that workspace | unit (editor) |
| rules | same workspace key | at layout; press 1 | URL unchanged, no new `focus` | unit (editor) |
| rules | T and Esc | closed: T; open: Esc; closed: Esc | open with `No nodes. Add a group (G).`; closed; still closed | unit (editor) |
| rules | T while open | open: T | still open | unit (editor) |
| rules | F6 order, closed slide-out | from body, press F6 ×4 | top bar, canvas, inspector, status strip; a 5th: top bar | unit (editor) |
| rules | F6 order, open slide-out | slide-out open, from top bar, F6 | slide-out | unit (editor) |
| rules | Shift+F6 | from top bar | status strip | unit (editor) |
| rules | empty inspector | F6 to the inspector | focus on the inspector region, which holds nothing | unit (editor) |
| rules | empty Layout hint | at layout | `Add a group (G) or open the command palette (Ctrl+K).` | unit (editor) |
| rules | empty other workspaces | at outline | canvas region with no text | unit (editor) |
| module boundaries | top bar name | design `Corne` open | top bar heading `Corne` | unit (editor) |
| module boundaries | frame boxes, each theme | 1366x768, dark / light | top bar 42px high, rail 44px wide, inspector 320px wide, strip 30px high, canvas the rest; top bar and strip `chrome`, inspector `panel` in that theme | unit (editor) |
| module boundaries | regions are labelled landmarks | the frame | each region root `tabindex=-1` with its `aria-label` | unit (editor) |
| glue | Restart reaches workers | `modelWorkerModule` in `mainModules` | `RestartModelWorker` registered (the store runs it) | integration (app) |
| glue | launch shows the frame | served app at `/` | heading `Untitled design`, URL `/#/design/<id>/layout` | end to end |
