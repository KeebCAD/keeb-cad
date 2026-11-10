---
title: 'Layout canvas draws resolved keys with selection'
type: 'feature'
ticket: 7
created: '2026-11-10'
status: 'built'
baseline_revision: '5e96667a97cbd0be229e121890ddad92f08c235c'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Layout workspace shows a hint instead of the keys: nothing draws the posted Layout set, there is no viewport or selection, and the tree slide-out is empty. Checking a canvas story by hand needs real keys, which today only tests produce.

**Approach:** An inline SVG canvas in `editor` draws the posted Layout set at one seq through a viewport service (the one y-flip) that opens fitted to the board; a selection service (node ids) is shared by canvas clicks and a `ui` Tree over Reka's tree in the slide-out; a late set after a workspace switch draws grayed with `updating` in the status strip. A dev-only `?seed=corney` runs Corney's script at launch, and the reference-designs fence gains that one dev file.

## Boundaries & Constraints

**Always:**
- The canvas reads only the design and `ModelWorkerLifecycle`'s `layout` and `parts` snapshots; it computes no geometry (AD-22). A part rectangle is placed with `translate(x, y) rotate(rot) scale(mirrored ? -1 : 1, 1)` in model mm inside the viewport's one y-flipped group, `vector-effect: non-scaling-stroke`, `rot` as posted.
- Rows with `placed: false` draw nothing. Slots draw a keycap (`fitted`) or a dashed faint outline (`empty`, `stand-in`); every placed non-root node an anchor link from `anchorAt` to its frame point (DESIGN.md Canvas marks).
- Decision (Sergii 2026-11-10): the board extent for the fit is the browser's SVG `getBBox()` of the drawn keys, not a posted extent, because it is measured relative to the browser.
- Decision (Sergii 2026-11-10): group frames leave 13.7; a group's frame should follow its columns' stagger, not be a rectangle, which needs a posted outline (deferred-work.md, 2026-11-10). Groups stay selectable in the tree.
- Decision (Sergii 2026-11-10): with no placed slot the canvas shows EXPERIENCE.md's `empty: new design` hint (`Add a group (G) or open the command palette (Ctrl+K).`) and skips the fit, so the viewport keeps its initial value; the first set that draws a key fits once. Not centring (0, 0) without the hint, because that drops the UX row; not leaving it out, because fitting a 0×0 box makes the zoom infinite on every new design.
- Decision (Sergii 2026-11-10): the viewport stores zoom as screen px per model mm, the number `scale(zoom, -zoom)` uses, not a percent, because 100% is defined by 13.23, which first shows zoom and clamps it to 10%–2000%. The initial zoom is 4 px/mm, never shown in 13.7.
- Decision (Sergii 2026-11-10): when either canvas side is at most twice the padding (48 px), the fit does nothing and the viewport keeps its value, not a zero or negative zoom, because the shell has no minimum size and 13.23 owns the zoom clamp.
- Selection is one `di` service holding `Id[]` in selection order, session-only; after each commit it drops ids the design no longer holds (spine Editor state).
- Rows 10–11 were removed with the contrast check (Sergii 2026-11-10); the numbering keeps its gap so references stay stable.
- Decision (Sergii 2026-11-10): `Selection` and `Viewport` are shown in the devtools inspector with editable fields, `SwitchGrace` is classified not shown (its `grayed` is derived from a timer and the lifecycle, like `Landmarks`), not all three left unshown, because live UI state is shown today (`SlideOut`, `DesignLocation` in `services-classified.spec.ts:20-26`).
- Decision (Sergii 2026-11-10): each drawn slot is a pressed-state button, `role="button"`, `aria-label="<slot id>"`, `aria-pressed`, with no `tabindex`, not a `listbox`/`option`, because the canvas defines no arrow-key navigation a listbox would promise, and EXPERIENCE.md makes "the canvas … one focusable region". Anchor links are `aria-hidden`. Tests find slots with `getByRole('button', { name })`.
- Decision (Sergii 2026-11-10): that button is `ui`'s `UiCanvasToggle`, Reka's `Toggle` rendered `as="g"`, not a hand-built `<g>` in `editor`, because AD-26 says every toggle "is a **Reka UI** primitive, never hand-built". It is controlled by `pressed` and emits `press` on every click, so clicking a selected slot keeps it selected. If Reka's `Toggle` cannot render a `<g>` inside SVG, the build halts and asks Sergii.
- Decision (Sergii 2026-11-10): before the first Layout set arrives, the canvas shows the hint only when the design holds no slot; a design with slots draws nothing yet (no hint, no fit), not the hint, because a stored design with keys must not read 'Add a group…' while the worker starts.
- Decision (Sergii 2026-11-10): `nodeIdOf` throws `InvariantError` on an id with no side prefix, an empty side or an empty node id, not returning it unchanged, because every posted row id is `${SIDE}/${node.id}` (`place-layout.ts:47`), so such an id is a bug that must surface.
- Decision (Sergii 2026-11-10): a grayed snapshot uses the `--color-stale` tint only, not DESIGN.md's `stale-hatch` pattern and `stale · rev <hash>` label, because the ticket and AD-11 say it "grays", the strip's `updating` gives the reason, and a hatch would flash for a sub-second wait.
- Decision (Sergii 2026-11-10): a `stand-in` slot draws the dashed outline only, not its ▲/● badge, because the badge shows an `unresolvable-reference` severity from the posted issues and belongs with the story that draws violations on the canvas (deferred-work.md, 2026-11-10).
- Decision (Sergii 2026-11-10): `fit` (viewport) and `seed` stay as the ticket and EXPERIENCE.md use them, not renamed, and the spine glossary gains two rows: "**fit the viewport** | set the viewport's centre and zoom so given bounds fill the canvas less padding (F); not the constraint-region fit" and "**dev seed** | a dev-server-only script run at launch from `?seed=<name>`".
- Colours come only from `theme.css` tokens through `var(--color-…)`.
- Decision (Sergii 2026-11-10): no check in code of design values; 3:1 contrast is DESIGN.md's property of its tokens, not a runtime or unit check, so the ticket verify's 'automated check on current snapshots finds every canvas mark at 3:1' is not built (Sofia to drop that clause from 13.7). Not a token-level spec in `ui` and not a canvas measurement.
- The seed loads only through a dynamic import behind `import.meta.env.MODE === 'development'` in `app/src/start-main.ts`.

**Never:**
- Group frames; zoom, pan, F, cursor readout, keeping the viewport per design (13.23); G, S, Ctrl+D, Delete (13.24, 13.25); the right half (13.8); multi-select, box select, Shift-click, hover.
- A component calling `useService`; jsdom; `vi.mock`; snapshots or screenshot baselines.
- Any app file other than the one dev seed file importing `reference-designs`.

## Boundary table

| # | Group | Input / state | Expected | Level |
|---|---|---|---|---|
| 1 | production bugs | slot row at `rot` +15, unmirrored | the keycap's screen rotation is 15° counter-clockwise (screen angle −15°) | unit, editor (browser) |
| 2 | production bugs | slot row at `rot` −15 | 15° clockwise on screen | unit, editor |
| 3 | production bugs | slot row at `rot` 0, `mirrored` true (posted by the right half, spine AD-6, 13.8) | keycap drawn with x scale −1 at its frame | unit, editor |
| 4 | rules | a row with `placed: false` (a loaded file's cycle members, spine AD-5 'the cycle's members and their dependants are not placed') beside a placed one | only the placed row is drawn | unit, editor |
| 5 | rules | slot rows `fitted`, `empty` (a per-side override, spine AD-6), `stand-in` | keycap; dashed outline; dashed outline | unit, editor |
| 6 | rules | a commit advances main's seq with no set posted for it, then a switch to Layout; the set arrives 199 ms after the switch | never grayed, no `updating` | unit, editor (fake timers) |
| 7 | rules | same, no set at 200 ms | not grayed (grace is "within") | unit, editor |
| 8 | rules | same, no set at 201 ms | marks grayed (`--color-stale`), strip shows `◌ updating` | unit, editor |
| 9 | rules | row 8's state, then the set arrives | ungrayed, `updating` gone | unit, editor |
| 9a | rules | the set at main's seq has arrived, then a switch, 201 ms pass | not grayed | unit, editor |
| 12 | rules | board bounds 100×50 mm, canvas 648×448 px, padding 24 | zoom 6 px/mm, centre at the bounds' centre | unit, editor |
| 13 | rules | bounds 50×100 mm, canvas 648×448 px | zoom 4 px/mm (height limits) | unit, editor |
| 14 | rules | a set whose only placed row is the root group | the hint `Add a group (G) or open the command palette (Ctrl+K).` shows, no keycap drawn, viewport equals its initial value | unit, editor |
| 14j | rules | no set yet, the design holds no slot | the hint shows | unit, editor |
| 14k | rules | no set yet, the design holds slots | nothing drawn, no hint, viewport at its initial value | unit, editor |
| 14a | rules | row 14's state, then a set with one placed slot | hint gone; viewport fitted to that key | unit, editor |
| 14b | rules | bounds of one 18×18 mm key, canvas 47×448 px | viewport keeps its initial value | unit, editor |
| 14c | rules | same, canvas 48×448 px | viewport keeps its initial value | unit, editor |
| 14d | rules | same, canvas 49×448 px | fitted, zoom `expectedZoom` = 1/18 px/mm | unit, editor |
| 14e | rules | same, canvas 648×47 px | viewport keeps its initial value | unit, editor |
| 14f | rules | same, canvas 648×48 px | viewport keeps its initial value | unit, editor |
| 14g | rules | same, canvas 648×49 px | fitted, zoom `expectedZoom` = 1/18 px/mm | unit, editor |
| 14h | rules | Layout fitted, then a switch to Outline and back | viewport unchanged (no refit) | unit, editor |
| 14i | rules | Layout fitted for design A, then design B with keys opens | viewport fitted to B | unit, editor |
| 15 | module boundaries | click a keycap of slot `a` | selection `['a']`; the tree row `a` is selected | unit, editor |
| 16 | module boundaries | select tree row `a` | selection `['a']`; button `a` is `aria-pressed="true"` and drawn with the selection outline | unit, editor |
| 17 | module boundaries | selection `['a','b']`, DeleteNode `{ ids: ['a'] }` through the design store | selection `['b']` | unit, editor |
| 18 | module boundaries | selection `['a']`, a commit that keeps `a` | selection `['a']` | unit, editor |
| 19 | module boundaries | selection `['a']`, `replaceDesign` with a design without `a` | selection `[]` | unit, editor |
| 19a | rules | devtools edit of Selection `ids` to `['a']`, `a` in the design | selection `['a']` | unit, editor |
| 19b | rules | devtools edit of Selection `ids` to `['a','gone']`, `gone` not in the design | selection `['a']` | unit, editor |
| 19c | rules | devtools edit of Selection `ids` to `'a'` (not an array) | selection unchanged | unit, editor |
| 19d | rules | devtools edit of Viewport `zoom` to −1 | zoom unchanged | unit, editor |
| 19e | rules | devtools edit of Viewport `zoom` to 0 | zoom unchanged | unit, editor |
| 19f | rules | devtools edit of Viewport `zoom` to 1 | zoom 1 | unit, editor |
| 19g | rules | devtools edit of Viewport `centre` to `{ x: 3, y: -2 }` | centre (3, −2) | unit, editor |
| 20 | module boundaries | `nodeIdOf('left/thumb-far')` | `thumb-far` | unit, model |
| 20b | module boundaries | `nodeIdOf('thumb-far')` (no prefix) | throws `InvariantError` | unit, model |
| 20c | module boundaries | `nodeIdOf('left/')` (empty node id) | throws `InvariantError` | unit, model |
| 20d | module boundaries | `nodeIdOf('/thumb-far')` (empty side) | throws `InvariantError` | unit, model |
| 20e | rules | `modelToScreen({ x: cx, y: cy }, viewport at centre (cx, cy) zoom 4, 648×448)` | `{ x: 324, y: 224 }` | unit, editor |
| 20f | rules | `modelToScreen({ x: cx + 1, y: cy + 1 }, same)` | `{ x: 328, y: 220 }` (y up in the model is up on screen) | unit, editor |
| 20g | module boundaries | `UiCanvasToggle` inside an `<svg>`, `pressed` false, clicked | renders a `<g>` with `role="button"`; emits `press`; `aria-pressed="false"` until the parent sets `pressed` | unit, ui (browser) |
| 20h | module boundaries | `UiCanvasToggle` with `pressed` true, clicked | emits `press`, stays `aria-pressed="true"` | unit, ui (browser) |
| 20a | module boundaries | `sideQualifiedId('left', 'thumb-far')` | `left/thumb-far` | unit, model |
| 21 | glue | `?seed=corney` with the seed module registered, storage holding another design | the open design holds the script's nodes, the route names its id, and the model worker's first `design` message is that design | integration, app |
| 22 | glue | no `seed` parameter, seed module registered, storage holding designs A (older) and B (newest) | the open design's id is B's | integration, app |
| 23 | glue | `?seed=other`, storage as row 22 | the open design's id is B's | integration, app |
| 24 | glue | `app/src/dev-seed/corney-seed.ts` imports `@keeb-cad/reference-designs/scripts` | no violation | unit, tooling/ad10 |
| 25 | glue | another app file imports it | `reference-designs-only-in-tests` violation | unit, tooling/ad10 |
| 26 | glue | `pnpm build` then `check:dist` | no file in `app/dist` holds a slot id from `corneyIslandLayout` (`outer-bottom`, `outer-home`, `outer-top`) | check-dist |

</frozen-after-approval>

## Code Map

- `packages/editor/src/workspace/layout/LayoutCanvas.vue` + `.spec.ts` -- today only a hint `<p>`; becomes the SVG canvas. Rendered as the `layout` route's default view (`router/create-editor-router.ts:23-29,43-47`) inside `shell/CanvasLandmark.vue`'s `<main>`.
- `packages/workers/src/model-worker/model-worker-lifecycle.ts:42-59` -- `parts`, `layout` (`Option<Posted<Packed…>>`), `layoutSetArrived`, `layoutRow(id)`. Ids are `output.ids`; rows by index with `protocol`'s `readLayoutRow`/`readPartsRow` (`protocol/src/index.ts:8-14`; editor may import `protocol`, spine AD-10 `editor` bullet).
- `packages/workers/src/testing/fake-worker.ts` -- `post(message)` arranges a `layout-set`; `RecordingModelWorkerLifecycle` has no snapshot setter, so specs use the real lifecycle with a `FakeWorker` (as `packages/editor/src/testing/mount-shell.ts:50-56` does).
- `packages/protocol/src/layout-output/layout-output-codec.ts:5`, `parts-output/parts-output-codec.ts` -- `packLayoutOutput`/`packPartsOutput` to build posted sets in specs from `schema/testing`'s `aLayoutOutput`, `aPartsOutput`.
- `packages/schema/src/layout-output.ts:3-20` -- row `{ kind, frame: { x, y, rot, mirrored }, anchorAt: { x, y }, part, fit, placed }`; groups have `part: -1`.
- `packages/model/src/placement/place-layout.ts:28,47` -- builds `` `${SIDE}/${node.id}` `` by hand; only `left/` rows exist today.
- `packages/model/src/layout-editing/node-tree.ts:26` -- `subtreeIds(node: Mutable<Node>)`; not exported from `model/src/main.ts` (exports listed there).
- `packages/design/src/store/design-store.ts:41,50,121,170` -- `events.on('commit', …)` returns an unsubscribe; payload `{ kind: 'patches', … } | { kind: 'whole', committed }` (`store/types.ts:23-25`), so read `current` after it.
- `packages/editor/src/router/design-location.ts:11-28` -- `workspace` getter reads `router.currentRoute.value` (line 27), so it is reactive; the router's `afterEach` (lines 12-20) calls `focus` on a switch. `SwitchGrace` watches the getter.
- `packages/editor/src/status-strip/` -- `ViolationCounts.vue`'s dimmed `◌` (`use-violation-counts.ts:12-18`) is the precedent for a muted entry; `shell/StatusStripLandmark.vue:13-23` lists entries.
- `packages/editor/src/slide-out/TreeSlideOut.vue:10,16-22` -- empty `<aside aria-label="Tree">`, focused on open because it is empty (its comment); mounted by `shell/EditorShell.vue:24`.
- `packages/editor/src/status-strip/use-running-stage.ts:4,23` -- `useTimeoutFn` from `@vueuse/core` (`editor` dependency, `package.json:22`): the timer precedent.
- `packages/editor/src/slide-out/slide-out.ts:5-27` -- UI-state service precedent (private `shallowRef` behind getters).
- `packages/editor/src/editor-module.ts:19-36` -- service registration; `devtools/services-classified.spec.ts:20-26` fails unless each new service is classified.
- `packages/ui/src/tabs/UiTabs.vue` -- Reka wrapper precedent; `reka-ui` 2.11.0 ships `TreeRoot`/`TreeItem`; `TreeRootProps` (`reka-ui/dist/index3.d.ts:11176-11205`): `items`, `getKey`, `getChildren`, `modelValue` holding item objects, `multiple`. `packages/ui/workbench/states/*-states.ts` + `widgets.ts:17-25` -- workbench registration.
- `packages/ui/src/theme/theme.css` -- `--color-canvas`, `key-body`, `key-edge`, `key-top-face`, `key-legend`, `key-outline-faint`, `selection`, `group-frame`, `anchor-link`, `stale`; `--text-canvas-label`.
- `app/src/launch/launch.ts:12-23,31-60` -- `run` mounts, opens, then `router.replace`, then `lifecycle.start`; `#open` is the pick. Spec `launch.spec.ts:107-152` (`arrange`, `history.replaceState`, `MemoryBackend`, `FakeWorker`).
- `app/src/start-main.ts:8-9` -- the devtools `MODE` gate to copy.
- `app/src/layout-set.spec.ts:43-44` -- `await store.run(NewDesign, {})` then `runById` per script step; its `.layoutRow(`left/${node}`)` moves to `sideQualifiedId`. Don't copy its `KEY_RUN` (computed the way production computes it; deferred-work.md).
- `reference-designs/src/scripts/index.ts` -- `corneyIslandLayout: LayoutScript` (`{ command: string; input: unknown }[]`).
- `.dependency-cruiser.mts:97-98,435-440` -- GRAPH comment and the `reference-designs-only-in-tests` rule (`pathNot: TEST_FILE`).
- `tooling/ad10/rules.spec.ts:169-198,366-371` and `tooling/ad10/violations/` -- hand-written refused/allowed fixtures.
- `tooling/check-dist/devtools-problems.ts:3,6-11`, `files-containing.ts` (raw substring match), `check-dist.ts` -- dist trace precedent; Node runs it with type stripping, so imports carry `.ts` (`devtools-problems.ts:3` imports `plugin-id.ts` by relative path). `reference-designs/src/scripts/index.ts` re-exports without an extension, so import `corney-island-layout.ts` directly. Today's `app/dist` already holds `outer` (`outerHTML`, `-webkit-outer-spin-button`) and none of `outer-bottom|home|top` (grep, 2026-11-10).
- Spine lines 349 (AD-10 `app` bullet), 380 (mermaid edge), 1074 (Reference designs row) say "tests only"; AD-25 says a dev-only `app` module fills `inspectables`.

## Tasks & Acceptance

**Execution:**
- [x] `packages/model/src/ids/side-qualified-id.ts` -- `sideQualifiedId(side, id)` and `nodeIdOf(qualified): Id` (function); `place-layout.ts:47` uses `sideQualifiedId`; exported from the pure root `model/src/index.ts`, as `mintId` is, and re-exported from `model/main` for `editor`. `app/src/layout-set.spec.ts` keeps its hand-built `left/` (`app` reaches `model` only through `worker`, `.dependency-cruiser.mts:112`; deferred-work.md). Spec rows 20–20d.
- [x] `packages/model/src/layout-editing/node-tree.ts` -- `subtreeIds` (function) takes a read-only `Node`; export from `model/main`.
- [x] `packages/ui/src/canvas-toggle/UiCanvasToggle.vue` -- Reka `Toggle` `as="g"`, `role="button"`, props `label`, `pressed`, emits `press`; export from `ui/index.ts`; `workbench/states/canvas-toggle-states.ts` + `widgets.ts`. Rows 20g–20h.
- [x] `packages/ui/src/tree/{UiTree.vue,types.ts}` -- `UiTree` over Reka `TreeRoot`/`TreeItem`, taking `rows: TreeRow[]` (`TreeRow = { id; label; kind: 'group' | 'slot'; children: TreeRow[] }`) and `v-model:selected: string[]`, passed to Reka as `items`, `getKey: n => n.id`, `getChildren: n => n.children`, single select; mono ids with group/slot glyphs (DESIGN.md Left rail). Export from `ui/index.ts`; `workbench/states/tree-states.ts` + `widgets.ts`; spec: click selects, keyboard arrows move, selected row is `aria-selected`.
- [x] `packages/editor/src/selection/{selection.ts,types.ts,use-selection.ts}` -- `Selection` (service, `Disposable`: its dispose calls the commit subscription's unsubscribe, as `design-location.ts:35-37` disposes): `ids`, `select(ids)`; subscribes to the store's commit event and keeps only ids in `subtreeIds(design.layout)`. `useSelection()` (function) returns `ids` and `select`. Rows 17–19.
- [x] `packages/editor/src/viewport/{viewport.ts,fit-viewport.ts,viewport-transform.ts,use-viewport.ts,types.ts}` -- `Viewport` (service): `centre` (initially (0, 0)), `zoom` (px per mm, initially 4), `fitOnce(designId, bounds, size)`, which fits only when it has not yet fitted for that design id; `fitViewport(bounds, size, padding)` returns `Option<{ centre, zoom }>`, none for empty bounds or a side ≤ 2×padding, and `viewportTransform(viewport, size)` is `translate(w/2, h/2) scale(zoom, -zoom) translate(-cx, -cy)` and `modelToScreen(point, viewport, size)` is the same mapping for one point, the only way text is placed (all function). `useViewport()` (function) returns the transform and `modelToScreen` for a size, and `fitOnce`. Rows 12–14k, 20e–20f.
- [x] `packages/editor/src/workspace/layout/{switch-grace.ts,switch-grace-delay.ts,use-switch-grace.ts}` -- the 200 ms constant in its own file, as `devtools/state-refresh-delay.ts`; `SwitchGrace` (service, `Disposable`: stops its watch and its pending timer): watches `DesignLocation.workspace`; each change restarts a `useTimeoutFn` of 200 ms; `grayed` is the timer having fired since the last switch and `!layoutSetArrived`. `useSwitchGrace()` (function) returns `grayed`. Rows 6–9a.
- [x] `packages/editor/src/workspace/layout/{LayoutCanvas.vue,CanvasSlot.vue,AnchorLink.vue,use-placed-nodes.ts,types.ts}` -- `usePlacedNodes()` (function) returns `PlacedNode[]` (declared in `types.ts`): the placed rows with node id (`nodeIdOf`), frame, `anchorAt`, part `w`/`h`, fit; the canvas measures its size with `@vueuse/core`'s `useElementSize` on the `<svg>` and, after a set draws a key, calls `fitOnce(openDesignId, getBBox() of the slots' group, size)`; `CanvasSlot` is a `UiCanvasToggle` whose `press` calls `select([id])`; slot id legend at `modelToScreen` of the key centre (`--text-canvas-label`); with no set yet, the hint shows only when the design holds no slot. Rows 1–5, 14, 14a, 14j–14k, 15–16.
- [x] `packages/editor/src/status-strip/UpdatingIndicator.vue` -- `◌ updating` while `grayed`; added to `StatusStripLandmark.vue`. Row 8.
- [x] `packages/editor/src/slide-out/{TreeSlideOut.vue,use-layout-tree.ts}` -- `useLayoutTree()` (function) returns the design's layout as `TreeRow[]`; `UiTree`'s `selected` is bound to `useSelection()`. On open, focus goes to the tree's selected row, else its first row, else the `<aside>`; the 'Empty, its root…' comment goes. Row 16.
- [x] `packages/editor/src/editor-module.ts`, `devtools/services-classified.spec.ts` -- register `Selection`, `Viewport`, `SwitchGrace`; classify `Selection` and `Viewport` `shownAs`, `SwitchGrace` `notShown`.
- [x] `packages/editor/src/devtools/{selection-inspectable.ts,viewport-inspectable.ts,devtools-module.ts}` -- `SelectionInspectable` (service): `ids` editable, schema an array of ids, `set` keeps only ids the design holds; `ViewportInspectable` (service): `centre` (`{ x: number, y: number }`) and `zoom` (number > 0) editable; both registered under `inspectables`, as `slide-out-inspectable.ts` and `devtools-module.ts:14` are. Rows 19a–19g in `devtools-module.spec.ts`, as its slide-out rows (lines 116-127).
- [x] `packages/editor/src/testing/post-layout-set.ts` -- `postLayoutSet(worker, { seq, layout, parts })` (function) packs and posts a set.
- [x] `app/src/launch/{tokens.ts,types.ts,launch.ts}` -- multi token `devSeeds` of `DevSeed = { requested(): boolean; open(): Promise<void> }`; `#open` awaits the first requested seed in place of its pick, then returns `#openId()`. Rows 22–23 in `launch.spec.ts`.
- [x] `app/src/dev-seed/{corney-seed.ts,dev-seed-module.ts}` -- `CorneySeed` (service): `requested()` reads `seed=corney` from `location.search`; `open()` runs `NewDesign` then each script step through `runById`, throwing `InvariantError` on a rejection. `dev-seed-module.ts` only registers `CorneySeed` under `devSeeds`; `start-main.ts` adds it behind the `MODE` gate. Row 21 in `app/src/dev-seed/corney-seed.spec.ts`.
- [x] `.dependency-cruiser.mts` -- the rule's `pathNot` gains `^app/src/dev-seed/corney-seed\.ts$`; GRAPH comment names the dev file. `tooling/ad10/violations/app/src/{dev-seed/corney-seed.ts,other.ts}` + `rules.spec.ts` rows 24–25.
- [x] `tooling/check-dist/reference-designs-problems.ts` -- `referenceDesignsProblems()` (function; it reads `app/dist`, but tooling scripts have no container: `check-dist.ts` calls `devtoolsProblems()` directly) imports `../../reference-designs/src/scripts/corney-island-layout.ts` and searches `app/dist` for each `layout.addSlot` input's `id`, not the group id `outer`, which today's dist holds by chance; wired into `check-dist.ts`. No spec of its own, as `devtools-problems.ts` has none; row 26's toggled bug proves it.
- [x] Spine lines 349, 380, 1074 -- "tests only" gains "and the one dev seed file `app/src/dev-seed/corney-seed.ts`"; AD-25's dev-only `app` module sentence gains "or `devSeeds`"; the glossary gains the `fit the viewport` and `dev seed` rows.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row has a passing test at its level.
- Given row 26, when the `MODE` gate around the seed module is removed and `pnpm build && pnpm check:dist` runs, then the check fails; restored, it passes (toggled bug, named in the PR).
- Given each browser or integration group, when its toggled bug is applied, then its rows go red and pass once restored (named in the PR): `rotate(rot)` → `rotate(-rot)` (rows 1–3); the `placed` filter removed (4); the `fit` switch drawing every slot as a keycap (5); `grayed` ignoring the timer (6–9a); `fitOnce` refitting every call (14h–14i); `select` a no-op (15–16); the commit prune removed (17–19); `#open` ignoring seeds (21–23).

## Implementation Notes

- Decision (build): `SwitchGrace` clears its late flag once the set for main's seq arrives, not only on the next switch, because otherwise every later commit on the same workspace would gray the canvas for the moment its set takes; and the first arrival on a design route starts no grace, matching `DesignLocation`'s rule that the first navigation is no switch. The timer runs `switchGraceDelayMs + 1`, so a set on the 200 ms mark is within the grace (row 7).
- Decision (build): the canvas fits only when `layoutSetArrived` holds, not on any posted set, because after `replaceDesign` the previous design's set is still posted and would fit the new design to the old keys (row 14i).
- Decision (build): `fitOnce` records a design as fitted only when the fit ran, not on every call, so a canvas too small at first (rows 14b–14f) still fits once it grows.
- Decision (build): `usePlacedNodes` leaves the root row out, not drawing it, because the root has no anchor link and group frames left 13.7; `useNewDesignHint` and `useLayoutSetArrived` are composables of their own beside it.
- Decision (Sergii 2026-11-10): a grayed keycap tints its body, top face and edge `--color-stale`, not the body and edge only, so a grayed key reads as one muted shape; the slot-id legend and the Mauve selection outline stay. Proven by `switch-grace.spec.ts`'s `topFace` (toggled: top face never grayed → 2 red).
- Decision (Sergii 2026-11-10): the keycap's top face follows the solid keycap of `ux-editor/.working/key-rendering-1.html` (44×42 of a 56 body, 4 from the back and 10 from the front), as fractions of the key size in `keycap-proportions.ts`; corners stay square, not the mockup's radii, because DESIGN.md:410 says "keycap radius is part geometry, not a UI token" and no output posts one yet.
- Decision (build): anchor links and legends are drawn in screen space through `modelToScreen`, not inside the y-flipped group, so the anchor dot and the dashes keep their pixel size (AD-22's text-and-handles rule).
- Decision (build): `UiTree` uses Reka's `selection-behavior="replace"`, not the default `toggle`, so clicking a selected row keeps it selected, as Sergii decided for a canvas click; it takes a `label` prop for the tree's accessible name. Decision (Sergii 2026-11-10): groups start expanded, not collapsed, so a canvas selection's row is always visible.
- Decision (build): the tree lists the root's children, not the root, because EXPERIENCE.md's empty Tree reads "No nodes. Add a group (G)." for a new design that holds its root.
- Decision (Sergii 2026-11-10): `PlacementSide` (`'left' | 'right' | 'whole'`) stays in `model/src/ids/types.ts`, not a `SideId` schema kind now, because nothing stored or posted carries it; `SideId` arrives with the story that first stores or names one (spine line 767). Renamed from `Side` to avoid the clash.
- Decision (build): `packages/editor/package.json` gains `@keeb-cad/model` and `@keeb-cad/protocol` (and `pnpm-lock.yaml` follows), not imports without declared dependencies, because spine AD-10's `editor` bullet allows both imports and pnpm's docs: "pnpm creates a non-flat node_modules … a package can only access dependencies that are specified in its package.json".
- Decision (build): rows 4 and 14 post `placed: false` rows for a design with no anchor cycle, not a design whose anchors form one, because no anchor field exists yet (`grep -n anchor packages/schema/src/offset.ts packages/schema/src/layout*.ts`: no match) and 13.3 is the story that posts `placed: false` (`epic-see-corneys-keys/tickets/tickets.toml:98-99`); AGENTS: "Arrange only a state real commands could reach; it need not be built through them."
- Decision (Sergii 2026-11-10): after another design opens (a whole commit), a set posted before that commit counts as no set, not drawn grayed or clickable, so the canvas follows the before-first-set rule (hint only when the design holds no slot) and never draws or selects another design's keys.
- Decision (build): `ModelWorkerLifecycle` clears `#layout` and `#parts` on a `whole` commit, not a filter in `editor`, so its `layout`/`parts` getters always describe the open design (Sergii's other-design rule); `switch-grace.spec.ts` arranges its no-set commit with `AddSlot`, a patch commit, so `testing/mount-shell.ts` registers `layoutCommandsModule`.
- Toggled bugs after review (each red, then green once restored): `grayed` always false (row 8, and the unmount test); the getter ignoring `layoutSetArrived` with the arrival watch removed (row 9); the getter ignoring `layoutSetArrived` with the timer always marking late (rows 9a, 6); `fitOnce` fitting only the first design (14i and the viewport unit); the prune dropping every id (18, 17); `effectScope()` not detached (the unmount test); the timer started on any workspace (the off-Layout test); no clearing on a whole commit (the lifecycle row and both other-design canvas rows).
- Fix after Sergii's look (2026-11-10, "editing selection in dev-tool does not work"): the panel edits a list item or object member by its full path (`['ids', '0']`, `['centre', 'x']`; vite-plugin-vue-devtools 8.2.1 client), and `DevtoolsPlugin.#edit` refused every path deeper than one key, while the specs' fake payload sent only top-level paths. Decision (build): `#edit` applies the edit to a copy of the field's value with the kit's `payload.set` and validates the whole result with the field's schema, not a path walker of its own, because `payload.set` is how the kit's own plugins apply edits (`@vue/devtools-kit` `dist/index.js:2166`, `2373-2384`); a top-level removal is still refused, not applied, because removing a whole field leaves the service with no value (unchanged from before the fix); a nested removal is applied, not refused, because removing a list item is an edit of the field's value and its schema still judges the result; a value that can't be copied or a path through a primitive changes nothing, not an error out of the kit's handler, because the plugin answers every edit (spine Editor state). Nested edits replace, append (`newKey`) or remove as the kit's `StateEditor` does, not rules of our own, so their expected values are the kit's contract. The spec fakes apply edits with `testing/apply-panel-edit.ts`, which mirrors the kit's `StateEditor.set` and `createDefaultSetCallback` (`index.js:494-541`; the kit doesn't export `StateEditor`). Toggled bug: restoring the one-key refusal fails 10 tests (5 rows, both browsers).
- Real-host run (devtools): `pnpm --filter app dev`, `/?seed=corney`, then the panel's own call `__VUE_DEVTOOLS_KIT_CONTEXT__.api.editInspectorState(...)` from the page: replacing `ids/0`, adding with `newKey`, removing `ids/0` and setting `centre/x` each changed the service (`["outer-top"]` with that key `aria-pressed`; `[]`; centre `{ x: 3, y: 19 }`).
- Real-host run: `pnpm --filter app vitest run src/layout-set.spec.ts` (the real model worker posting `layout-set` through `ModelWorkerLifecycle`): 2 files, 6 tests passed, 2026-11-10; `postLayoutSet` packs with the same `packLayoutOutput`/`packPartsOutput` the worker uses.
- Added `aLayoutRow` to `schema/testing` (with its builder tests) so the canvas specs build rows they don't read; `mountShell` now also returns the container's `injector`; `postLayoutSet` takes an optional epoch (default 1, the single spawn's).
- Toggled bugs, each red then green once restored: `rotate(-rot)` (rows 1–2); the `placed` filter removed (4); every slot drawn as a keycap (5); `grayed` ignoring the timer (6–7); `fitOnce` refitting every call (14h, after waiting two animation frames); `select` a no-op (15–16); the commit prune removed (17, 19); `#open` ignoring seeds (21); the seed module's `MODE` gate removed (row 26: `check:dist` names `outer-bottom|home|top` in `dev-seed-module-*.js`).

## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer; 0 test-reviewer findings dropped for a missing quote):

| # | Lens | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 1 | quick | `SwitchGrace`'s `watch` and `useTimeoutFn` attach to the first resolving component's scope | high | patch | `packages/di/src` and `packages/editor/src` hold no `effectScope`; on a reload at `/layout`, `LayoutCanvas` resolves it first, and leaving Layout unmounts it, stopping the grace for the session. |
| 2 | quick | `◌ updating` shows on Outline/PCB/… after a commit-then-switch | medium | patch | `switch-grace.ts` restarts on every workspace change and `grayed` reads only `layoutSetArrived`; the ticket ties graying and `updating` to the Layout snapshot. |
| 3 | quick | `fitOnce` keeps one `#fittedFor`, so A→B→A refits A | low | reject | Fix edits the plan; refitting a reopened design matches the ticket's "the canvas opens fitted", and 13.23 owns keeping the viewport per design. |
| 4 | quick + test-reviewer | rows 14/14a arrange a root-only set for a design holding a slot, and row 14's test cannot tell a set from no set | medium | patch | `LayoutCanvas.spec.ts` posts `layoutOf({})` for `designWith(a)` (unreachable) and row 14 uses a slotless design, where `useNewDesignHint` shows the hint without any set. |
| 5 | quick | row 4 posts `placed: false` for a design with no anchor cycle | low | patch → not applied | The plan's row 4 cites a loaded cycle (spine AD-5); the arranged design has none (AGENTS "Arrange only a state real commands could reach"). |
| 6 | quick | keycap radii computed in the canvas | medium | patch | DESIGN.md:410 "keycap radius is part geometry, not a UI token"; Sergii 2026-11-10: square corners, keep the face proportions. |
| 7 | quick | `holds-slot.ts` is a second node-tree walk in `editor` | low | reject | Real against "Put code in the package that owns the concept", but a one-line walk; the fix adds `model/main` surface (more than a direct correction). |
| 8 | quick | legends only on fitted slots, unrecorded | false | reject | DESIGN.md:468 puts slot ids "on the top face", which only a fitted keycap has; DESIGN.md:472's unfitted slot has no legend. |
| 9 | quick | `UpdatingIndicator` first in the strip, unrecorded | low | reject | DESIGN.md:428 orders output entries then counts and puts only pick-mode hints at the left; no harm named. |
| 10 | quick | `Viewport.initial` (public static) sits among private fields | low | patch | AGENTS "Order a class top-down: public API first". |
| 11 | test-reviewer | `CanvasToggle.spec.ts` name claims the parent-set pressed state; the test never sets it | low | patch | Row 20h covers `pressed` true in another test; the name over-claims. |
| 12 | test-reviewer | row 14h proves an absence after two animation frames | low | reject | The toggled bug turns it red today; a positive signal adds machinery. |
| 13 | test-reviewer | `shown()` finds the top face as the second `<rect>` | low | reject | Coupling to element order; any sturdier hook adds a test id or role the face shouldn't carry. |
| 14 | test-reviewer | undocumented behaviours: one-zero-side bounds, stroke width 2, `strictObject` centre, no zoom clamp, first seed wins, `nodeIdOf('a/b/c')` | low | reject | Listed in the end-of-task decisions; `nodeIdOf('a/b/c')` is unreachable, as `idSchema` is kebab-case with no `/` (`schema/src/id.ts:3-6`). |
| 15 | test-reviewer | `selection.spec.ts` test name garbled | low | patch | `drops an id the design replaced in replaceDesign no longer holds`. |

Pass 2 (quick, test-reviewer, on the patched files; 0 dropped):

| # | Lens | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 16 | quick | after `replaceDesign` the previous design's set is drawn, clickable, or shows the hint over a design with keys | medium | patch | `model-worker-lifecycle.ts:112-114` sends the whole design but keeps `#layout`/`#parts`; `usePlacedNodes` draws them. Sergii 2026-11-10: a set from before the last whole commit counts as no set. |
| 17 | quick | row 14i never confirms A was fitted before opening B | medium | patch | A's frame (0, 0) equals the initial centre and the SVG measures 0×0 until the ResizeObserver fires, so a fit-only-the-first-design bug passes. |
| 18 | quick | toggled bugs named in the AC don't turn rows 8–9a, 14i, 18 red | medium | patch | `grayed` ignoring the timer still fails only 6–7; `fitOnce` refitting every call still fits B; removing the prune can't fail row 18. |
| 19 | quick | pass-2 tests in `switch-grace.spec.ts` have no recorded toggle | low | patch | The implementer reported both red under their toggles; Implementation Notes didn't record it. |
| 20 | quick | `SwitchGrace`'s constructor sits below its private fields | low | patch | AGENTS "Order a class top-down: public API first"; `design-location.ts:11-21` puts its constructor first. |
| 21 | quick | Implementation Notes still records the mockup radii | low | patch | Triage #6 dropped both radii; the note was stale (corrected in the plan). |
| 22 | test-reviewer | `empty` and `stand-in` rows assert the same mark | low | reject | Row 5 gives both the same dashed outline. |
| 23 | test-reviewer | colour constants copied from Frappé's tokens | low | reject | The specs check the token reaches the mark; the comment names the source. |
| 24 | test-reviewer | module-level `DESIGN` handed to the store | low | reject | Immutable test data, as AGENTS allows; `replaceDesign` validates and doesn't mutate its input. |

Pass 3 (quick, test-reviewer, on the pass-2 patches; 0 dropped; test-reviewer: 33 cases, no findings):

| # | Lens | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 25 | quick | row 14a's hint is dropped by the design, not the set | medium | halt → Sergii: patch tests, 4th pass; fixed | It opens `designWith('a')` by `replaceDesign`, a whole commit that now clears the set; `use-new-design-hint.ts` then reads the design, which holds a slot, so `not.toHaveTextContent(HINT)` passes with no set. |
| 26 | quick | row 14a's 648×448 size may not be measured before the fit | maybe-false | log | `sizeCanvas` sets styles and `useElementSize` reports a frame later; green in both browsers on every run so far. |
| 27 | quick | `switch-grace.spec.ts`'s `arrange` performs the switch the assertions time from | low | log | AGENTS "a helper never takes a hidden step the assertions depend on"; its comment doesn't name the switch. |
| 28 | quick | lifecycle test name claims another design; it reloads the same one | low | log | `load(store)` defaults to `aDesign()`. |
| 29 | quick | row 14i opens `lily58` under a route naming `corne` | low | log | Launch's open is followed by `router.replace`; the canvas reads the open design, not the route. |

Pass 4 (quick, test-reviewer, on the three spec files; 0 dropped):

| # | Lens | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 30 | test-reviewer | row 14 (and 14k) assert the initial viewport on an unsized canvas | medium | halt → Sergii: patch all, one test pass; fixed | A 0×0 SVG never fits (`fitViewport` none), so the skip-the-fit rule could break unnoticed. |
| 31 | quick | grace tests check fill and top face only; the edge stroke and anchor links also gray | medium | halt → Sergii: patch all, one test pass; fixed | `CanvasSlot.vue` `stroke-stale` and `AnchorLink`'s `grayed` can be removed with every grace test green; Sergii's decision names the edge. |
| 32 | both | row 14h asserts zoom only, not the whole viewport | low | fixed (Sergii: patch all) | Row 14h says "viewport unchanged". |
| 33 | quick | row 14k's name omits the viewport it asserts | low | fixed (Sergii: patch all) | AGENTS "Make a test's name and its `expect`s claim the same thing." |
| 34 | quick | the keys-and-viewport assertion is written twice; the rows 15–16 arrange is copied | low | fixed (Sergii: patch all) | AGENTS "Write a shared assertion once." |
| 35 | test-reviewer | lifecycle test doesn't assert the set was accepted before the whole commit | low | fixed (Sergii: patch all) | Both getters start none. |
| 36 | quick | `arrange` comment says "drawn" on Outline | low | fixed (Sergii: patch all) | Outline doesn't mount the Layout canvas. |

Pass 5 (test-reviewer only, Sergii's choice; 24 cases; nothing above low, so the review ends and these are logged, not patched):

| # | Lens | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 37 | test-reviewer | row 14i asserts `centre.x` only | low | log | The centre moving from −50 to 100 shows the refit; both keys are 18 mm. |
| 38 | test-reviewer | lifecycle test name says "any whole commit" but runs `load` only | low | log | `replaceDesign` is the same `whole` event (`model-worker-lifecycle.ts:112`). |
| 39 | test-reviewer | row 14h proves an absence after two frames | low | log | Already rejected as #12; red under its toggled bug. |

Devtools fix after the look (quick, test-reviewer; 0 dropped):

| # | Lens | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 40 | quick | the nested-edit rule is tested only through the real inspectables, not in `devtools-plugin.spec.ts` | medium | patch, fixed | AGENTS "Test a rule where it is defined"; five nested rows added with a generic inspectable, red when the one-key refusal returns (8 failures). |
| 41 | quick | `structuredClone` outside the `try` | low | patch, fixed | A value that can't be copied would throw out of the handler; today's fields are plain. |
| 42 | quick | centre rows assert values from `Viewport.initial` | low | patch, fixed | Now arranged at (5, −2). |
| 43 | quick | selection arrange copied into two blocks | low | patch, fixed | `arrangeSelection({ holds, selected })`. |
| 44 | quick | `applyPanelEdit` differs from the kit (`??` vs `||`, `=== true`, path not consumed) | low | patch, fixed | Now mirrors `index.js:494-541`, including consuming `path`. |
| 45 | quick + test-reviewer | nested expected values and decisions lack a requirement or a rejected alternative | low | patch, fixed | Implementation Notes now cites the kit's contract and states each X, not Y. |
| 46 | test-reviewer | zoom rows repeat the literal `2` | low | log | Arranged and expected in the same table. |
| 47 | test-reviewer | `gtValue(0)` accepts `Infinity`; centre accepts `Infinity`; selection keeps duplicates | low | log | The panel parses with `JSON.parse`, which yields no `Infinity`; listed in the end-of-task decisions. |
| 48 | — | adding to an empty list in the panel shows no input | false | reject | vite-plugin-vue-devtools 8.2.1 draws the new-item input only under a row with children; no edit reaches the plugin. The row's "Edit value" with `["id"]` works. |

## Design Notes

- Decision (plan): side-qualified ids are built and parsed by one `model` file, not by a template in `editor`, because "Put code in the package that owns the concept" (AGENTS) and `model` already builds them (`place-layout.ts:47`).
- Decision (plan): the selection prunes against `subtreeIds` exported from `model/main`, not a second tree walk in `editor`, for the same AGENTS rule; `editor` imports `model/main` (spine AD-10 `editor` bullet).
- Decision (plan): a click selects only keycaps, not group frames or empty space, because the ticket says "a click on a key selects its slot's id" and the pointer map's other gestures are not in its verify.
- Decision (plan): the seed reaches launch through a `devSeeds` multi token, not an import in `launch.ts`, because a multi token resolves to `[]` with nothing registered (`di/src/container.ts:72`) and the production `app` must hold no reference to `reference-designs` (ticket).
- Decision (plan): at exactly 200 ms the set is still within the grace, so graying starts after it, not at it, because the ticket says "if the set hasn't arrived within the switch grace (~200 ms)".
- Decision (plan): a seed whose script step is rejected throws `InvariantError`, not a notice, as launch's `#newDesign` does on a failed `NewDesign` (`app/src/launch/launch.ts:49-54`).
- Decision (plan): grayed marks use `--color-stale`, not opacity, because DESIGN.md names `stale` "desaturation tint".
- Decision (plan): the grace timer is `@vueuse/core`'s `useTimeoutFn`, not a hand `setTimeout`, because the Stack table lists `@vueuse/core` for `editor` and `use-running-stage.ts:23` already times the strip's 1000 ms delay with it; the canvas size is VueUse's `useElementSize`, not a hand `ResizeObserver`, for the same Stack row.
- Decision (plan): `grayed` needs both the timer and `!layoutSetArrived`, not the timer alone, because `layoutSetArrived` compares posted and main's seq (`model-worker-lifecycle.ts:50-53`), so a set already arrived at the switch is never late (row 9a).
- Decision (plan): the fit runs once per open design id, kept in `Viewport`, not once per canvas mount, because EXPERIENCE.md says the 2D workspaces' viewport persists across switches ("zoom, pan and design coordinates persist across switches") while the ticket opens each design fitted.
- Decision (plan): the initial viewport is centre (0, 0) at 4 px/mm, not an unset `Option`, because the transform always needs a value and with no key the hint covers the canvas (Sergii's empty-board decision), so the value is never seen.
- Decision (plan): `UiTree` exposes `selected` as ids and maps them to Reka's item-object `modelValue`, not Reka's documented item-object `v-model` (`TreeRootProps.modelValue?: U`, `index3.d.ts:11178`), because the selection holds "node ids only (`Id[]`…)" (spine Editor state).
- Decision (plan): rows 17–19 are units in `editor` with the real design store, not integration in `app`, because the pruning rule is defined in `Selection` ("Test a rule where it is defined", AGENTS) and the ticket's test names DeleteNode "through the design store".
- Decision (plan): a devtools edit of the selection keeps only ids the design holds, not any id, because the spine says "a selection names only existing nodes" (Editor state); a zoom edit must be > 0, not any number, because a zero or negative zoom flips or empties the canvas (Sergii's tiny-canvas decision).
- Decision (plan): each workspace switch restarts the grace timer, not keeping the first one, because the spine's grace runs "after a workspace switch" (Switch grace row), so each switch starts its own.
- Decision (plan): on open the Tree slide-out focuses the selected row, else the first, else the `<aside>`, not always the `<aside>`, because EXPERIENCE.md says "Opening an overlay focuses its first meaningful item"; the `<aside>` stays for an empty tree, per `TreeSlideOut.vue`'s comment.
- Decision (plan): `referenceDesignsProblems` imports `corney-island-layout.ts` by relative path, not `@keeb-cad/reference-designs/scripts`, because the root package cannot resolve it (`node` on a probe importing it: `ERR_MODULE_NOT_FOUND: Cannot find package '@keeb-cad/reference-designs'`) and its `index.ts` re-exports without `.ts`; `devtools-problems.ts:3` does the same (deferred-work.md).
- Decision (plan): `PlacedNode`/`usePlacedNodes`, not `LayoutMark`, because "placed" and "node" are spine terms and "mark" is only DESIGN.md's; `TreeRow`, not `TreeNode`, because a tree row is not the glossary's node; `DevSeed`/`devSeeds`, matching the new `dev seed` glossary row.
- Decision (plan): `CanvasSlot`, not `CanvasKey`, because it also draws `empty` and `stand-in` slots and the glossary's key is "a slot whose part has a `switch` component".

## Conformance Log

Pass 1 (two readers, union; 0 dropped for a missing quote):
- `A component never calls useService itself` -- no `use-viewport.ts`: fixed.
- `When a decision builds by hand the main job of a dependency in the spine's Stack table` -- grace timer, canvas size: fixed (`useTimeoutFn`, `useElementSize`).
- `A choice no requirement made is a decision` -- initial viewport, fit-once scope, Selection unsubscribe: fixed.
- `Arrange only a state real commands could reach` -- rows 6–9 arranged an arrived set: fixed (rows 6–9a).
- Devtools classification without evidence: asked (Sergii: show Selection, Viewport).
- `Prove a test Stryker can't reach … with a toggled bug` -- only two groups: fixed.
- `Canvas items are DOM elements: focus, aria-*` / `Find elements by role` -- asked (Sergii: button + aria-pressed).
- `Give every threshold three rows` -- height side of the 48 px fit: fixed (14e–14g).
- `test wiring between packages as integration` -- rows 17–19: fixed (Decision, rule defined in Selection).
- `Give every test an expect that fails when the behaviour breaks` -- row 26 matched `outer` in today's dist: fixed.
- `DesignSeed.open(): void` vs async `NewDesign`: fixed.
- `Glossary terms only` -- `CanvasKey`: fixed; `fit`, `seed`: asked (Sergii: glossary rows); `UpdatingEntry`: fixed.
- Untagged composables and helpers (AD-25 split): fixed.
- Grayed stale hatch/label (DESIGN.md): asked (Sergii: tint only). Stand-in badge: asked (Sergii: leave out, deferred).
- `When nothing says what a boundary returns, ask` -- `nodeIdOf` without prefix: asked (Sergii: throw).
- AD-25 dev-only module sentence out of date: fixed (spine edit).
- Precedent `TreeSlideOut.vue` focus comment: fixed. Precedent `layout-set.spec.ts` `KEY_RUN`: deferred.
- Precedent `LayoutCanvas.vue` hardcoded hint: no AGENTS or spine rule; noted only.
- Contrast check vs AD-22: Sergii's decision; ticket clause to Sofia.

Gap review (0 dropped):
- gap: `packages/editor/src/viewport/use-viewport.ts` -- fixed.
- gap: `packages/editor/src/workspace/layout/types.ts` -- fixed.
- gap: height rows of the fit threshold -- fixed.
- gap: `UiTree` vs Reka's documented item-object `v-model` -- fixed (Decision).
- gap: `CanvasSlot` role and label -- asked.
- gap: `sideQualifiedId` users (`model-worker-lifecycle.ts:55` `layoutRow`) -- fixed (exported).
- gap: `tooling/check-dist` import path and `outer` collision -- fixed.
- gap: rows 3–5 reachability -- fixed (cited spine AD-5 cycle, AD-6 right half and overrides).

Final pass (1 reader; 0 dropped):
- `.dependency-cruiser.mts:112` `app: { model: 'worker' }` -- `layout-set.spec.ts` importing `model/main`: fixed (root export; spec deferred).
- AD-26 `every … toggle is a Reka UI primitive` -- asked (Sergii: `UiCanvasToggle` over Reka `Toggle`).
- AD-22 `Text and handles are positioned through that transform` -- fixed (`modelToScreen`, rows 20e–20f).
- `Glossary terms only` -- `LayoutMark`, `DesignSeed`, `TreeNode`: fixed.
- AD-25 split -- `referenceDesignsProblems` reads files: fixed (Decision).
- `A choice no requirement made is a decision` -- timer restart, slide-out focus, deep import: fixed.
- AD-25 `closes its public surface through package exports` -- precedent `devtools-problems.ts:3`: deferred.
- Precedents `layout-set.spec.ts` loop, `launch.spec.ts` unfailable expect, `use-running-stage.ts` file kinds: deferred.
- `add empty input` -- canvas before any set: asked (Sergii: hint only with no slot); `/thumb-far`: fixed (20d); 14d/14g concrete: fixed; SwitchGrace timer on dispose: fixed.

## Verification

**Commands:**
- `pnpm test` -- expected: all pass, no type errors.
- `pnpm depcruise` -- expected: no violations.
- `pnpm build && pnpm check:dist` -- expected: no problems.

- `getBBox()` of a group holding an 18 mm key rotated 45° measured 25.46 × 25.46 in Chromium (2026-11-10, devtools); the canvas spec runs it in Firefox too.

**Manual checks:**
- `pnpm --filter app dev`, open `/?seed=corney`: Corney's three-key column drawn fitted with 24 px padding in both themes; click a key, the tree (rail Tree button) selects it; select in the tree, the key outlines in Mauve; reload without `?seed` shows the same design.
