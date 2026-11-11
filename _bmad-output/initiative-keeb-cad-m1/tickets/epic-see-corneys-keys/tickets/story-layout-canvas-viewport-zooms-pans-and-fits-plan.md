---
title: 'Layout canvas viewport zooms, pans and fits'
type: 'feature'
ticket: 23
created: '2026-11-10'
status: 'built'
baseline_revision: 'd2c6cdf9160fa0e9a62f40ffac06b1151b7b8a5e'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 5
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 13.7's viewport opens fitted and never moves: the user can't zoom, pan or refit, a reload forgets the view, and the status strip shows neither cursor coordinates nor zoom.

**Approach:** The `Viewport` service gains clamped zoom toward a screen point, pan by a screen delta and per-design persistence in `localStorage` through VueUse's `useStorage`; `useViewportControls` turns wheel, pinch, middle-drag and Space+drag on the Layout `<svg>` into those calls through `@use-gesture/vanilla`; a `FitViewport` UiAction (F) fits what is drawn for the selection, else every slot on the canvas, measured by the browser; the strip gains the cursor readout (a new readout form of `formatNumber`) and the zoom as a whole percent.

## Boundaries & Constraints

**Always:**
- Decision (Sergii 2026-11-10): 100% zoom is 96/25.4 CSS px per mm, the browser's `mm` (1in = 96px = 25.4mm); it matches physical size only on a screen whose scaling makes a CSS inch a real inch (KiCad's Z 1.0 has the same limit and adds calibration separately; a calibration would be its own story); not 1 px/mm (a key is 18 px at 100%, and 10% is unusable) and not 13.7's 4 px/mm (an opening value never meant to be shown).
- Decision (Sergii 2026-11-10): `@use-gesture/vanilla` (10.3.1, `editor` dependency; the spine's Stack table gains it as canvas input, beside "2D canvas: inline SVG via Vue templates (no library)", which stays about drawing) is the input layer: `onPinch` (Ctrl+wheel and Safari gesture events) zooms continuously toward the pointer, `onDrag` filtered to the middle button or Space held pans, `onWheel` applies the notch rule below. Not hand-written listeners (Sergii: use a library for the plumbing), not d3-zoom (keeps its own transform on the element, a second copy of the viewport, and zooms on trackpad scroll), not panzoom (writes its own CSS transform, against AD-22's one y-flip). No library tells a mouse from a trackpad (W3C pointerevents #596), so the notch rule stays ours and Sergii's look is its real-hardware check.
- Notch rule (Sergii 2026-11-10, part of the input-layer pick above): a plain (no Ctrl) wheel event is one mouse notch when `deltaMode` is lines or pages and `deltaY` ≠ 0, or when `deltaMode` is pixels, `deltaX` is 0 and `|deltaY|` is a whole number ≥ 50; `deltaY` < 0 zooms in ×1.1, > 0 out ÷1.1, toward the cursor. Any other plain pixel-mode event pans as a page scrolls (MDN: positive `deltaY` scrolls down): the centre moves by (`deltaX`, −`deltaY`) / zoom mm. A lines or pages event with `deltaY` 0 changes nothing.
- Decision (Sergii 2026-11-10): the verify's hit-radius check (handles at 8 px at 50%, 100%, 400%) is not built here; it moves to the first story that draws a handle (deferred-work.md), not a keycap check (keys scale by design) and not a helper with nothing to check, because no handle exists on the canvas after 13.7 and 13.23. Sofia drops the clause from 13.23.
- Decision (Sergii 2026-11-10): F fits everything drawn for the selected nodes and their descendants (`subtreeIds`), and every slot on the canvas when that draws nothing (an empty group, unplaced nodes); not a group fitting everything, and not F unavailable, because EXPERIENCE.md says "F fits the selection (or the whole board)". Canvas items register by node id, so 13.26's group outline, registered with its group id, joins the union with no change here.
- Decision (Sergii 2026-11-10): the cursor entry shows `x – y –` (U+2013) while the pointer is off the canvas, before it first enters and after the canvas unmounts; not blank (reads as broken) and not the last position (looks live and isn't).
- Decision (Sergii 2026-11-10): the reload check reloads the design's own URL without `?seed` (`/#/design/<id>/layout`), which launch reopens from storage; not under `?seed=corney`, whose every load runs `NewDesign` with a fresh id (`app/src/dev-seed/corney-seed.ts:15`), and not a seed that reuses its design (reverses 13.7's seed decision). Sofia rewords 13.23's verify.
- Decision (Sergii 2026-11-10): a refused `localStorage` write is left to `useStorage`'s documented `onError` (logs to `console.error`); the view keeps moving in memory and the next load fits. No row and no `di` storage token, because only a view F rebuilds is lost and the ticket names no failure behaviour.
- Decision (Sergii 2026-11-10): the cursor and zoom entries never compress; each has a fixed width with tabular digits and is a labelled group (`Cursor`, `Zoom`), not a live region; not a compact cursor form now (nothing overflows the strip yet) and not hiding the cursor on overflow, because DESIGN.md's compression shortens output state text and these entries are bare numbers.
- Decision (Sergii 2026-11-10): the fit is the service method `Viewport.fitNodes(ids)`, which F's `apply` calls with the selection, so 14.6 calls it with a violation's ids; how 14.6 waits for the canvas to register after a workspace switch is 14.6's design, not a pending fit built here, because nothing in 13.23 reaches that state (F is unavailable off Layout).
- Decision (Sergii 2026-11-10): the viewport is written to storage throttled, not on every change and not debounced: VueUse's `watchThrottled` with `leading` and `trailing`, every `viewportWriteIntervalMs` = 250 (VueUse's `useThrottleFn` docs: "values around 100 or 250 … are most useful"), so a pan writes at its start, at most every 250 ms, and once more at its end. A pending write lands under the design it belongs to when another design opens or the service is disposed.
- Every zoom change from the wheel, pinch, fit or `setZoom` is clamped into 10%–2000% and a step past a limit stops at the limit (EXPERIENCE.md: "Zoom 10%–2000%"); a stored value or a devtools edit outside the range is refused instead (rows 13, 27). A clamped zoom toward a point still keeps that point fixed.
- Zoom range, wheel step, notch minimum and fit padding are constants in one file, `viewport/viewport-limits.ts` (EXPERIENCE.md 2026-11-05: the tunable constants sit in one place); `fit-padding.ts` folds into it.
- Bounds come from the browser (each drawn element's `getBBox` corners through its CTM into the keys group's space), never posted frames: canvases "compute no geometry" (AD-22).
- The viewport is stored per design id under `keeb-cad.viewport.<design-id>` (the `keeb-cad.theme` pattern, spine Themes). A stored value replaces the opening fit. A stored value the schema refuses reads as none, so the design fits and the fit's result overwrites it: it is view state the fit recomputes. A fit that can't run writes nothing.
- Cursor readout `x <n> y <n>`, each `formatNumber(n, 'none', { readout: true })`: no `≈`, no unit, U+2212 minus, at most 2 decimals, no trailing zeros, `-0` prints `0`. Zoom is `formatNumber(Math.round(percent), 'percent')` → `100%`.
- Strip order: counts, cursor, zoom (DESIGN.md Status strip).
- Spine edits (Stack row; Numbers gains the readout form, the `percent` unit and the formatter's options argument) are docs-only and go to main before the code branch.

**Never:**
- Drag of keys, box select, Shift-click, group frames, the nudge-step control, isolated part mode's zoom, the 3D camera.
- A component calling `useService`; jsdom; `vi.mock`; `vi.spyOn` on a global; snapshots.
- F off the Layout workspace, with no drawn key, or while a field has focus (the last is `hotkey-layer`'s rule, proven in `hotkey-layer.spec.ts:61-66`).

## Boundary table

| # | Group | Input / state | Expected | Level |
|---|---|---|---|---|
| 1 | rules | zoom 11%, one notch out | 10% | unit, editor |
| 2 | rules | zoom 10.9%, one notch out | 10% | unit, editor |
| 3 | rules | zoom 11.1%, one notch out | 10.0909…% (`expectedPercent` = 10.090909) | unit, editor |
| 4 | rules | zoom 1800%, one notch in | 1980% | unit, editor |
| 5 | rules | zoom 2000% ÷ 1.1, one notch in | 2000% | unit, editor |
| 6 | rules | zoom 1900%, one notch in | 2000% | unit, editor |
| 7 | rules | a notch in at screen point p; row 6's clamped notch at p | `screenToModel(p)` unchanged, both | unit, editor |
| 8 | rules | pan by (30, −20) px at 4 px/mm, centre (0, 0) | centre (−7.5, −5) | unit, editor |
| 9 | rules | fit result 9.9%, 10%, 10.1% | 10%, 10%, 10.1% | unit, editor |
| 10 | rules | fit result 1999%, 2000%, 2001% | 1999%, 2000%, 2000% | unit, editor |
| 11 | rules | zoom 99.49%, 99.5%, 99.51% | `99%`, `100%`, `100%` | unit, editor |
| 11a | rules | zoom 96/25.4 px/mm; 4 px/mm (13.7's opening value) | `100%`; `106%` | unit, editor |
| 12 | rules | readout 12.34, −5.67, 1.005, 1.004, −0.004, 1.1 | `12.34`, `−5.67`, `1.01`, `1`, `0`, `1.1` | unit, ui |
| 13 | rules | stored zoom just below 10%, 10%, 2000%, just above 2000% | fit, used, used, fit | unit, editor |
| 14 | rules | stored value not JSON; wrong shape | fit, written over | unit, editor |
| 15 | module boundaries | design A with a stored viewport opens | viewport is the stored value; no fit | unit, editor (browser) |
| 16 | module boundaries | pan, then Outline and back | viewport unchanged | unit, editor (browser) |
| 17 | module boundaries | pan A, open B (nothing stored), open A | B fitted; A at its stored pan | unit, editor (browser) |
| 17b | rules | a pan at t0, another at t0 + 100 ms | stored is the first at t0 + 249 ms, the second at t0 + 250 ms | unit, editor (fake timers) |
| 17c | module boundaries | pan A, then open B within 250 ms | A's stored value is that pan | unit, editor (browser) |
| 17a | module boundaries | canvas too small to fit, then reload | design still fits once the canvas is large enough | unit, editor (browser) |
| 18 | module boundaries | wheel notch over the canvas | zoom ×1.1, point under the cursor fixed | unit, editor (browser) |
| 18a | module boundaries | pinch (Ctrl+wheel) out past 2000% at p | 2000%, `screenToModel(p)` unchanged | unit, editor (browser) |
| 19 | module boundaries | middle-drag by (30, −20) px | row 8's pan | unit, editor (browser) |
| 20 | module boundaries | Space held, left-drag (30, −20) from empty canvas | row 8's pan | unit, editor (browser) |
| 20a | module boundaries | Space held, left-drag (30, −20) starting on key `a`, selection `[]` | row 8's pan; selection `[]` | unit, editor (browser) |
| 21 | module boundaries | left-drag on empty canvas, no Space | viewport unchanged | unit, editor (browser) |
| 22 | module boundaries | Space with focus in the tree slide-out, left-drag | viewport unchanged | unit, editor (browser) |
| 23 | module boundaries | F, selection `['a']` | fitted to `a`'s drawn bounds, 24 px padding | unit, editor (browser) |
| 24 | module boundaries | F, selection empty | fitted to every slot on the canvas | unit, editor (browser) |
| 25 | module boundaries | F on Outline | unavailable; viewport unchanged | unit, editor (browser) |
| 25a | module boundaries | F on Layout with no drawn key | unavailable | unit, editor (browser) |
| 25b | module boundaries | F, canvas sides ≤ 48 px | viewport unchanged | unit, editor (browser) |
| 25c | rules | one 18 mm key, canvas width 47 / 48 / 49 px (height 448); height 47 / 48 / 49 px (width 648) | none, none, zoom 1/18 px/mm, each way | unit, editor |
| 25d | rules | bounds with no extent | none | unit, editor |
| 25e | module boundaries | F, selection holds only an unplaced node | fitted to every slot on the canvas | unit, editor (browser) |
| 26 | module boundaries | pointer at model (12.34, −5.67) | strip `x 12.34 y −5.67` | unit, editor (browser) |
| 26a | module boundaries | row 26, then a pan of (30, −20) px with the pointer still | strip shows the model point now under the pointer, (12.34 + 7.5, −5.67 + 5) | unit, editor (browser) |
| 27 | rules | devtools zoom edit just below 10%, 10%, 2000%, just above 2000% | unchanged, 10%, 2000%, unchanged | unit, editor |
| 28 | rules | pointer never entered; left after row 26; row 26 then `2` (canvas unmounts) | `x – y –` each time | unit, editor (browser) |
| 29 | rules | pixels, `deltaX` 0, `deltaY` 49 / 50 / 51 | pan / notch out / notch out | unit, editor |
| 29a | rules | pixels, `deltaX` 0, `deltaY` −49 / −50 / −51 | pan / notch in / notch in | unit, editor |
| 30 | rules | lines, `deltaY` 3; lines, `deltaY` −3; pages, `deltaY` 1 | notch out; notch in; notch out | unit, editor |
| 30a | rules | lines, `deltaY` 0, `deltaX` 3 | nothing | unit, editor |
| 31 | rules | pixels, `deltaX` 2, `deltaY` 100; `deltaY` 50.5 | pan (2, 100) px; pan (0, 50.5) px | unit, editor |
| 32 | module boundaries | F, selection holds group `g` with slots `a`, `b` | fitted to `a` ∪ `b`'s drawn bounds | unit, editor (browser) |
| 33 | module boundaries | F, selection holds an empty group | fitted to every slot on the canvas | unit, editor (browser) |

</frozen-after-approval>

## Code Map

- `packages/editor/src/viewport/viewport.ts:7-44` -- `Viewport`: `shallowRef` value, `setCentre`, `setZoom`, `fitOnce(designId, bounds, size)` keyed by `#fittedFor`. `#fittedFor` goes: "fitted" becomes "a value is stored for the open design".
- `viewport/fit-viewport.ts:7-23` -- pure `fitViewport`; renamed `viewportForBounds` in `viewport-for-bounds.ts`, freeing `fit-viewport.ts` for the UiAction class (`show-layout.ts` holds `ShowLayout`). `viewport-transform.ts:4-16` (`modelToScreen`), `types.ts`, `use-viewport.ts:8-17` and `types.ts` `UseViewportResult.fitOnce` -- `fitOnce` drops its `designId` (edited).
- `viewport/viewport.spec.ts` -- builds `new Viewport()` and names tests with numbers (`'fits a 648 by 448 canvas less 24 px padding where %s'`); its fit rows move to `viewport-for-bounds.spec.ts` (rows 12–14g of 13.7, 25c–25d) with role names, and the `#fittedFor` tests are replaced by rows 15–17a.
- `workspace/layout/LayoutCanvas.vue:14-48` -- `useElementSize(svg)`, `keys` group ref, the fit `watch`; controls, cursor and drawn-node registration attach here.
- `workspace/layout/CanvasSlot.vue:31-38` -- `UiCanvasToggle`; no `tabindex` (13.7), so Space never activates a key.
- `workspace/layout/use-placed-nodes.ts` -- `PlacedNode.id` is the node id without its side; `key` is the side-qualified row id.
- `landmarks/landmarks.ts:6-16`, `use-landmark.ts:8-24` -- register/unregister an element precedent.
- `workspace/layout/show-layout.ts`, `slide-out/open-tree.ts` -- UiAction precedent; `editor-module.ts:22-40` registers.
- `workspace/layout/switch-grace.ts:9-59` -- a service running VueUse in a detached `effectScope(true)`, with its reason in a comment.
- `ui/src/theme/use-theme-choice.ts:11-15` -- `useStorage` with a validating `serializer.read`.
- `selection/selection.ts:3,29` -- imports `subtreeIds` from `@keeb-cad/model/main`; `model/src/layout-editing/node-tree.ts:26` `subtreeIds(node: Frozen<Node>)` takes a node.
- `ui/src/format/format-number.ts:4-21`, `types.ts:1` -- `DisplayUnit`.
- `shell/StatusStripLandmark.vue:25-29` -- strip entries; `devtools/viewport-inspectable.ts:20-27` zoom `gtValue(0)`; `devtools/services-classified.spec.ts:23-32`.
- `ui/src/hotkeys/hotkey-layer.ts:36` -- `enableOnFormTags: false`.
- `@vueuse/core` 14.4.0 `index.d.ts:1161` -- `useStorage(key: MaybeRefOrGetter<string>, …)`; options `writeDefaults` (default true), `listenToStorageChanges` (default true), `deep` (default true), `onError` (default `console.error`).

## Tasks & Acceptance

**Execution:**
- [x] Spine, on main first -- the Stack and Numbers lines above (done in d2c6cdf).
- [x] `packages/editor/package.json` -- `@use-gesture/vanilla` 10.3.1 (one user, so no catalog entry: `tooling/catalog.spec.ts` asks `catalog:` only of shared deps).
- [x] `viewport/viewport-limits.ts` -- `minZoomPercent` 10, `maxZoomPercent` 2000, `wheelStep` 1.1, `notchMinDeltaPx` 50, `fitPaddingPx` 24, `viewportWriteIntervalMs` 250, `pxPerMmAt100` 96/25.4; delete `fit-padding.ts`.
- [x] `viewport/{zoom-at.ts,pan-by.ts,clamp-zoom.ts,zoom-percent.ts,fitted-viewport.ts,viewport-transform.ts}` (function) -- `zoomAt(value, screenPoint, factor, size)`, `panBy(value, screenDelta)`, `clampZoom`, `zoomPercent`, `viewportForBounds`, `screenToModel`. Rows 1–11a, 25c–25d.
- [x] `viewport/read-wheel.ts` (function) -- `readWheel(event): WheelReading` (`{ kind: 'notch'; direction: 'in' | 'out' } | { kind: 'pan'; delta: Point } | { kind: 'none' }` in `viewport/types.ts`). Rows 29–31.
- [x] `viewport/viewport-value-schema.ts` -- the stored and devtools schema: `{ centre: { x, y }, zoom }`, zoom in the range.
- [x] `viewport/viewport.ts` (service) -- injects `DesignStore` for the open design's id; `useStorage(() => key, null, undefined, { serializer, writeDefaults: false })` in a detached scope stopped by `[Symbol.dispose]` (as `switch-grace.ts`); `zoomAt`, `panBy`, `setCentre`, `setZoom` (clamped), `fitOnce(bounds, size)`, `fitNodes(ids)` (expands each id with `subtreeIds` of its node in the open design, takes `CanvasItems.bounds`, else every slot on the canvas; a fit that can't run changes nothing); with no design open the value is `Viewport.initial` in memory and nothing is written. Rows 13–17c.
- [x] `viewport/use-viewport-controls.ts` (function) -- the one `Gesture` on the `<svg>`: `onMove`/`onHover` → `CanvasCursor`, `onPinch` → `zoomAt`, `onDrag` (middle button, or Space held) → `panBy`, `onWheel` → `readWheel`; destroyed on unmount. Space held comes from VueUse `onKeyStroke(' ', …)` keydown/keyup, counted only with focus in the canvas landmark or on `body` and `preventDefault`ed there; a click that ends a pan drag is stopped in the capture phase so it selects nothing. Rows 18–22, 20a.
- [x] `viewport/{canvas-items.ts,use-canvas-item.ts,use-canvas-items-root.ts}` (service, function, function) -- `CanvasItems`: the canvas registers its `<svg>` and keys group; each `CanvasSlot` registers its element under its node id (several per id, for 13.8's right half); `bounds(ids): Option<Bounds>` unions every registered element of those ids; `size()`.
- [x] `viewport/fit-viewport.ts` (service; UiAction `FitViewport`, id `viewport.fitViewport`, label `Fit the viewport`, hotkey `F`, `emptyInputSchema`; `apply` returns `void` per today's `ui-actions/types.ts`, which 13.24 changes for every UiAction) -- available on Layout with a drawn key; `apply` calls `fitNodes` with the selection. Rows 23–25b, 32–33.
- [x] `viewport/canvas-cursor.ts` (service) -- holds the pointer's screen point and canvas size (`Option`), set by the controls, none on leave and on unmount; `model` is `screenToModel` of it through the current viewport, so a pan or fit under a still pointer updates the readout. Rows 26a, 28.
- [x] `status-strip/{CursorReadout.vue,ZoomReadout.vue}`, `use-cursor-readout.ts`, `use-zoom-readout.ts` (function, function) -- added to `StatusStripLandmark.vue`; each `min-w-40` (Tailwind's 4px grid, 160 px; AD-26 "Spacing is Tailwind's 4px grid", no arbitrary value). Rows 11, 11a, 26, 28.
- [x] `ui/src/format/{format-number.ts,types.ts}` + spec -- `'percent'` (`%`, no space) and `formatNumber(value, unit, { readout: true })`. Row 12.
- [x] `.dependency-cruiser.mts` -- `onlyImports('only-editor-imports-use-gesture', '^packages/editor/', …)` beside `only-editor-and-ui-import-vueuse`; a refused fixture under `tooling/ad10/violations/packages/ui/src/` and a `rules.spec.ts` row.
- [x] `devtools/viewport-inspectable.ts` (zoom on `viewportValueSchema`'s range; row 27), `services-classified.spec.ts`, `editor-module.ts` -- register `CanvasItems`, `CanvasCursor`, `FitViewport`; classify the first two `notShown`.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row passes at its level.
- Given each browser group, when its toggled bug is applied, then its rows go red and pass once restored (named in the PR): zoom about the centre (18, 18a), no clamp (1–6, 18a), storage key ignoring the design (17), Space ignoring focus (22), the pan click not stopped (20a), F always fitting every key (23, 32), cursor kept on unmount (28).

## Implementation Notes

- Decision (build): `useStorage`'s `flush: 'sync'`, not its documented default `'pre'`, because a pending write must land under its own design's key before the key moves to the next design; with `'pre'` the write watcher runs after the key has changed and writes design A's view under B. Tried: `flush: 'pre'` fails 8 tests in `viewport.spec.ts` (stored min/max used, reopen at stored pan, pending writes on switch and dispose).
- `useStorage`'s `shallow` option is left at VueUse's default: `shallow: true` was tried and dropped, since all 60 viewport tests pass either way, so it was a choice no requirement made.
- Decision (build): `@use-gesture`'s drag `pointer.capture: false`, not its default `setPointerCapture` (`config.d.ts`: "Doesn't use setPointerCapture when false and delegate drag handling to window"), because capture throws in Firefox for a pointer the browser didn't press ("Invalid pointer id"), which the browser-mode tests' synthetic drags are; window delegation still follows a drag that leaves the canvas. Tried: `capture: true` fails the middle-drag and both Space+drag tests (rows 19, 20, 20a).
- Decision (build): the pinch zooms by the ratio of each step's gesture scale to the last (`from: [1, 0]` per gesture), not the library's offset across gestures, so the viewport's own clamp decides the limits (row 18a; a library `scaleBounds` would hide the "no clamp" toggled bug). A step whose scale is not positive is ignored; a notch-shaped Ctrl+wheel step no longer reaches it (Sergii's Ctrl-notch decision below).
- Decision (build): a plain wheel event is `preventDefault`ed (`wheel.eventOptions.passive: false`), not left passive, so a sideways trackpad swipe over the canvas pans instead of navigating back; a middle-button press is `preventDefault`ed, not left, so it starts no autoscroll.
- Decision (build): `CanvasSlot` registers its body `<rect>` in `CanvasItems`, not the `UiCanvasToggle` root, because the component's `$el` is not the drawn `<g>` (Reka's `Primitive`), and the rect is the key's drawn extent without its stroke.
- Decision (build): `FitViewport` is available on Layout while `CanvasItems` holds a canvas and at least one item (`drawsAny`), not by reading the posted set, because "a drawn key" is what the browser drew.
- Decision (build): "a value is stored for the open design" counts an edit not yet written (the throttle's pending one), not only `localStorage`, so a pan inside a throttle window still keeps the opening fit away.
- Decision (build): Space is released on any keyup of Space and on window blur, not only where it was pressed, so a held Space never sticks after focus moves.
- Decision (build): the canvas test helpers (`designWith`, `layoutOf`, `arrangeLayoutCanvas`, sizing) moved from `LayoutCanvas.spec.ts` into `testing/layout-canvas.ts`, not copied into each new spec, because four specs now arrange the same canvas.
- Note: `@use-gesture/vanilla` joins the pre-bundled deps in `packages/editor/vitest.config.ts` and `app/vitest.config.ts` (their comments: a dep found mid-run re-bundles and loads two Vitest runners), and `eslint.config.ts`'s entry-parameters glob gains `viewport` for `FitViewport.apply(_input)`.
- Note: row 26a's expected (12.34 + 7.5, −5.67 + 5) is what a trackpad scroll of (30, −20) px gives (the centre moves by (`deltaX`, −`deltaY`) / zoom); a drag pan of (30, −20) px, by row 8, gives (12.34 − 7.5, −5.67 − 5). The test drives 26a with the scroll, so both rows hold as written.
- Note: the specs wait two ticks after a write before writing again at once (`writeSettled`): VueUse's own storage event pauses its write watch until the next tick (`listenToStorageChanges`, kept at its default `true`). In the app an edit and a design switch in the same tick would lose the switch's flush; a person's input never lands in the same tick.
- Resolved (Sergii's 1366×696 decision below): `app/src/launch/launch.spec.ts`'s two "status strip Restart" tests fail. The app's browser tests run at Vitest's default 414 px viewport, where the two never-compressing 160 px readouts push the worker failure text and the Restart button out of the strip (editor's specs run at the 1366 px floor and pass). Fixing it is a person's call: run app's browser tests at the 1366 × 696 floor as `packages/editor/vitest.config.ts` does (runner config), or let the readouts compress on overflow (reverses the frozen strip decision).

- Decision (Sergii 2026-11-10): `app/vitest.config.ts` runs its browser specs at 1366×696, as `packages/editor/vitest.config.ts:48` does ("DESIGN.md's laptop floor"), not Vitest's default 414 px width, at which the two 160 px readouts pushed the worker-failure Restart out of the strip (`launch.spec.ts`'s two Restart tests, 4 failures in both browsers); not compressing the readouts (reverses his strip decision for a width DESIGN.md doesn't support).
- Decision (build): `@use-gesture/vanilla` joins both Vitest configs' `optimizeDeps.include`, not left for Vite to find, because their comment says "if Vite discovers them mid-run it re-bundles, and a browser that already loaded the old chunks ends up with two copies of Vitest's runner".
- Decision (build): `eslint.config.ts`'s entry-parameter glob gains `viewport`, because its comment says "editor's UiActions are entries too" and `FitViewport` lives in `viewport/`.

- Decision (Sergii 2026-11-10): a Ctrl+wheel event shaped like a notch (by `readWheel`) zooms one notch ×1.1 toward the cursor, as without Ctrl; trackpad pinches keep the library's continuous zoom. Not the library's pinch scale for it, which multiplies by `1 - deltaY / 100` (`@use-gesture/core` 10.3.1 `actions-fe213e88.esm.js:1217`) and so reaches zero or below for a mouse notch of 100 px or more, zooming nothing; not a continuous formula of our own (a new tuning constant, and a notch would no longer be ×1.1). The pinch-limit test now uses a fractional step (−30.5), since −50 would read as a notch. Toggled bug: the notch branch disabled → the two Ctrl-notch tests red in both browsers (4), green once restored.

- Real-host run (2026-11-11): Playwright 1.64.1's trusted `mouse.wheel`, `mouse.down({ button: 'middle' })`, `keyboard.down('Space')` and `keyboard.press('f')` against `vite --port 5199`, `/?seed=corney`, in Chromium 156 and Firefox 157 (script: scratchpad `real-host.cjs`). Before the fixes below, both browsers went from 306% to 370% on one Ctrl+wheel notch (two notches), and Chromium logged "Unable to preventDefault inside passive event listener invocation." twice, once per drag. After them, both browsers: notch 306% → 337% → 306% with the point under the pointer fixed; scroll (10, 20) px pans by (10, 20) / zoom; middle-drag (60, −40) moves the model point under a fixed screen spot by (−5.19, −3.46) mm at 306%; Space+drag from a key presses no key; Ctrl+wheel notch 306% → 337%; F refits to 306%; no console errors. The specs' synthetic events stay; real mouse and trackpad hardware (the notch rule) remain Sergii's look.
- Decision (build): `onPinch` returns at once when the gesture is not `active`, not left to zoom on every emit, because a wheel pinch's end emits once more with its last event (`@use-gesture/core` 10.3.1 `actions-fe213e88.esm.js:1224-1229`, `wheelEnd` calls `compute()` with no event, so `state.event` is the last wheel event) and the real-host run zoomed two notches. The four wheel tests now let the library's 140 ms gesture-end timer (`use-gesture-core.esm.js:154`) run on Vitest's fake timers before asserting; the two Ctrl-notch tests went red in both browsers (4) before the fix.
- Decision (build): the drag binds its listeners with `eventOptions: { passive: false }`, not the library's shared default `passive: true` (`use-gesture-core.esm.js:46-53`), because the drag starts on the `pointerdown` itself (`actions-fe213e88.esm.js:665-671`) and a passive listener can't prevent it; Chromium logged the passive warning, so the middle press could still autoscroll. Toggled bug: `passive: true` → "prevents the default of the middle press that starts a pan" red in both browsers (2), green once restored.
- Decision (Sergii 2026-11-11): a plain wheel event over the canvas is `preventDefault`ed, not left passive and not passive with `overscroll-behavior: none`, because EXPERIENCE.md's 2D pointer map says "trackpad two-finger scroll pans" and a sideways swipe that navigates Back breaks it; his look on a real trackpad is the check.
- Decision (Sergii 2026-11-11): Space is released on any Space keyup and on window blur, not only on a keyup with focus on the canvas or `body`, because the narrower release leaves Space stuck after focus moves mid-hold, and the next left-drag would pan.
- Decision (Sergii 2026-11-11): an edit still pending in the write throttle counts as stored for the opening fit, not only `localStorage`, so a re-run of the fit watch inside the first 250 ms never undoes a pan.
- Decision (build): `CanvasSlot` registers its body `<rect>`, not the `UiCanvasToggle` group: the face `<rect>` (`CanvasSlot.vue:52-60`, `keycapProportions`) lies inside the body (`:43-51`), so the group's bounds equal the body's, and the rect is reachable by template ref without the component exposing its root.

- Test gap closed: rows 9–10 now also run through `Viewport.fitOnce` (`viewport.spec.ts`, "clamps a fitted zoom …"); before, only `clampZoom` was tested and removing it from `#fit` left every test green. Toggled bug: `#fit` without `clampZoom` → the two rows past a limit red in both browsers (4), green once restored.
- Decision (Sergii 2026-11-11): `subtreeIdsOf` returns tree order, not request order, listing a node inside another asked-for group once, as `subtreeIds` is tree order and a reordered selection then fits the same; not order left out of the contract (a set comparison).

## Plan Change Log

- 2026-11-11, review pass 1 (Sergii's pick, not the `bad_plan` loopback's revert): the quick lens found `withDescendants` below the `Viewport` class, walking the layout by hand with `'children' in node` beside model's `isGroup` (`'arrangement' in node`, `node-tree.ts:20-24`). Amended: `subtreeIdsOf(root, ids)` joins `packages/model/src/layout-editing/node-tree.ts` (function) with `node-tree.spec.ts`, exported from `@keeb-cad/model/main` beside `subtreeIds`; `Viewport.fitNodes` calls it. Known-bad state avoided: a second group test in `editor` that drifts when a group kind changes. KEEP: everything else in the diff; no code was reverted.

## Review Triage Log

Pass 1 (quick, test-reviewer; 0 dropped for a missing quote):
- quick: `withDescendants` in the class file, duplicating model's tree walk -- medium, real (`viewport.ts:144-148`); routed by Sergii to a patch with a model export (Plan Change Log).
- quick + test-reviewer: notch tests expect `before.zoom * wheelStep`, so any `wheelStep` passes -- medium, real (`zoomAt` takes the factor; only `zoomByNotch` reads `wheelStep`); patched: `NOTCH = 1.1` from EXPERIENCE.md in `zoom-at.spec.ts` and `use-viewport-controls.spec.ts`.
- quick + test-reviewer: row 32 expects `EVERY_SLOT_FITTED` while slot `c` is outside -- low, real (name only; the value is a ∪ b); patched: `KEYS_A_AND_B_FITTED`.
- quick: `onPinch`'s notch branch returns `previous` while the library's offset moved by the notch's `1 - deltaY/100` -- low, real (`actions-fe213e88.esm.js:1217`; a later fractional step in the same gesture zoomed ×2); patched: returns `scale`; test "keeps a pinch step after a notch-shaped step …", red in both browsers with `previous` (2). A notch-out step of 100 px still zeroes the library's offset for the rest of that gesture: rejected, low, needs a mouse notch inside a trackpad pinch, and no direct fix (the offset is the library's).
- quick: the cursor readout keeps the size and rect offset of the last pointer event, so a resize under a still pointer shows a stale point -- low, real; rejected: rare (the next move corrects it) and the fix adds a size source to `CanvasCursor`.
- quick: test names cite 13.7 -- low, real; patched: "the initial 4 px per mm".
- quick: `minZoom`/`maxZoom` constants in the function file `clamp-zoom.ts` -- low, real (one kind of thing per file); patched: `zoom-range.ts` (not `viewport-limits.ts`: `zoomForPercent` imports from it, a cycle).
- quick: comments restating code in `use-canvas-item.ts`, `use-canvas-items-root.ts`, `use-viewport-controls.ts`, `viewport.ts`, `viewport-limits.ts` -- low, real; patched: deleted.
- test-reviewer: reopen, throttle and pending-write tests expect values read back from the subject -- low, real (a no-op `panBy` would pass the reopen row); patched: `panBy(ONE_KEY_FITTED, PAN)` and `panBy(panBy(Viewport.initial, PAN), PAN)` (`panBy` is row 8's function with its own spec).
- test-reviewer: the no-design test reads only the centre -- low, real; patched: whole `viewport.value`.
- test-reviewer: row 17a's reload clears storage in `arrange` -- low; rejected: `written: undefined` already proves storage was empty, so the clear changes nothing the assertion depends on, and the fix adds an `arrange` option.
- test-reviewer: zoom-at row named "just above the minimum" lands on it -- low, real; patched: rows named on / would pass / above.
- test-reviewer: `isNone()).toBe(true)` narrows -- low, real; patched: `toEqual(Option.none())`.
- test-reviewer: rows 11, 11a ("unit, editor") tested only through the mounted shell -- low, real (breaks the frozen level column); patched: `status-strip/zoom-readout.ts` (function) with `zoom-readout.spec.ts`; the strip spec keeps one wiring test.
- test-reviewer: row 25a passes because no canvas root registers, leaving `drawsAny`'s item count untested -- false: a registered root with no items is unreachable (the keys group renders only when a slot is placed, `LayoutCanvas.vue` `v-if="!showsHint"`), and AGENTS.md says "Arrange only a state real commands could reach".
- test-reviewer: finite-centre refusal in `viewport-value-schema.ts` and `corners-in.ts` skipping an element with no CTM are unstated -- low, real; rejected as findings (the fix is a plan edit); listed as decisions at the look.


Pass 2 (quick, test-reviewer, on the diff since pass 1; 0 dropped):
- quick: the strip's one wiring test set zoom 4, which is `Viewport.initial`'s (`viewport.ts:19`), so a readout that never updates passed -- medium, real; patched: sets 96/25.4 and expects `100%`. Toggled bug: a non-reactive readout → red in both browsers (2), green once restored.
- quick: no `subtreeIdsOf` row asks for a node inside a group not asked for -- low, real (a root-children-only walk survived); patched: rows `['g-child']` and `['g-child', 'a']` → tree order.
- quick: `node-tree.spec.ts` writes out the builder's default root id -- low, real; patched: dropped.
- quick: the notch comment said the library scales by −deltaY / 100; it multiplies by 1 − deltaY / 100 (`actions-fe213e88.esm.js` `wheelChange`) -- low, real; patched: comment corrected.
- test-reviewer: `KEYS_A_AND_B_FITTED` aliased `EVERY_SLOT_FITTED` -- low, real; patched: the a ∪ b literal carries the name, `EVERY_SLOT_FITTED` aliases it for the two-key layout.
- test-reviewer: `subtreeIdsOf`'s tree order and de-duplication are unstated -- low; rejected as a finding (the fix is a plan edit); listed as a decision at the look.

Pass 3 (quick, test-reviewer, on the diff since pass 2; 0 dropped):
- quick: "shows the zoom in the strip as it changes" asserts only the value after the change, relying on the initial 4 px/mm unasserted -- low, real; patched: asserts `106%` at 4, then `100%`.
- quick + test-reviewer: `subtreeIdsOf`'s tree-order row takes its expected value from the code -- low, real; asked (AGENTS.md "When nothing says what a boundary returns, ask"): Sergii chose tree order with each id once (Implementation Notes).
- Reopened (pass 1's stale-cursor finding, flagged to Sergii by a side note): it breaks the frozen cursor decision ("not the last position (looks live and isn't)"), so it is not a low to reject, and the side-panel case is false (`TreeSlideOut` is an absolute overlay, `EditorShell.vue:24`); the window-resize case is real. Patched: the controls keep the pointer's last client point and re-sample the cursor on a canvas size change. Test "shows the model point now under a still pointer after the canvas resizes" lets the library's move end (a 140 ms timer that re-samples with the current size, which first hid the toggled bug) on fake timers before resizing. Toggled bug: the size watch removed → red in both browsers (2), green once restored.

Pass 4 (quick, test-reviewer, on the diff since pass 3; 0 dropped):
- quick: no findings.
- test-reviewer: the resize test has no boundary-table row (row 26a is a pan) -- low, real; rejected as a finding (the fix is a plan edit; the frozen table takes no rows); the test follows the frozen cursor decision.
- test-reviewer: a canvas that shrinks out from under a still pointer kept showing a model point -- low, real, and against the frozen cursor decision (dashes "while the pointer is off the canvas"); patched: the size watch shows dashes when the held point falls outside the canvas. Test "shows dashes once the canvas shrinks out from under a still pointer" (whole-pixel sizes: layout rounds to 1/64 px). Toggled bug: the on-canvas check removed → red in both browsers (2), green once restored.

Pass 5 (quick, test-reviewer, on the diff since pass 4; 0 dropped):
- quick: `onMove` had no `active` guard, so the move's end emit (`actions-fe213e88.esm.js:1305`, `:1324-1329`, 140 ms after the last move) put a model point back after the size watch showed dashes -- low, real, against the frozen cursor decision; patched: `onMove` returns when not `active`. Test "shows dashes once the canvas shrinks off the pointer before its move has ended" (fake `setTimeout` only, so the size poll still runs). Toggled bug: guard removed → red in both browsers (2), green once restored.
- quick + test-reviewer: the shrink test moved both axes at once, so dropping either axis's check passed -- low, real; patched: `it.each` rows narrower only and shorter only. Toggled bug: height check dropped → the shorter row red in both browsers (2), the narrower row green.
- quick: the timer-draining preamble was duplicated without its reason -- low, real; patched: `pointStillAtModel` helper with the reason.
- quick + test-reviewer: the canvas edge counts as on the canvas (`<=`), unstated, and has no on-edge row -- low; rejected as a finding (a plan edit; an exact on-edge row is out of reach because layout rounds sizes to 1/64 px while the pointer sits at fractional pixels); listed as a decision at the look.

Pass 6 (quick, test-reviewer, on the diff since pass 5; 0 dropped) -- nothing above low, no frozen line broken: the review ends; its lows are logged, not patched:
- quick + test-reviewer: `pointStillAtModel` restores real timers only when it finishes, so a throw inside it leaves later tests on fake timers -- low (only after a test has already failed).
- test-reviewer: the shrink rows sit 1.36 and 1.68 px short of the pointer, with no on-edge or just-past row -- low (an exact on-edge row is out of reach while layout rounds to 1/64 px).
- test-reviewer: the inclusive canvas edge is unstated -- low; listed as a decision at the look.
- test-reviewer: "shows dashes once the canvas shrinks off the pointer before its move has ended" names its arrange; the act is the move's end -- low.

Final: `pnpm test` 533 files, 4257 tests, no type errors. Real-host run repeated on the final code in Chromium 156 and Firefox 157: the same readings as above, no console errors.

## Design Notes

- Decision (plan): persistence through VueUse's `useStorage`, not hand `localStorage` calls, because AD-26 says "**VueUse** covers low-level Vue utilities" and `useStorage` takes a getter key and re-reads on change (`index.d.ts:1161`).
- Decision (plan): `useStorage` runs in the service's detached `effectScope(true)`, not in a component's setup as VueUse documents composables, because the viewport outlives any one canvas (the strip reads zoom on every workspace); `switch-grace.ts:56-58` gives the same reason.
- Decision (plan): `writeDefaults: false`, not VueUse's default `true`, because a written default would read as "stored" and skip the fit (`index.d.ts`: "Write the default value to the storage when it does not exist … @default true"). `listenToStorageChanges` stays at its documented default `true`.
- Decision (plan): `Viewport` injects `DesignStore` for the key, not the canvas passing a design id per call, because the stored value must load when a design opens, before any canvas mounts.
- Decision (plan): viewport controls call `Viewport` directly, not through `invoke`, because `invoke(handle, input?)` runs registered entries and a pan is UI state like a selection (spine Editor state); `CanvasSlot.vue` calls `select` directly.
- Decision (plan): drawn elements register by node id in `CanvasItems`, as `Landmarks` registers roots, not a lookup by `aria-label`, because the label is user-facing text.
- Decision (plan): Space pans only with focus in the canvas or on `body`, not on any focus, because EXPERIENCE.md gives Space to the tree ("arrows move, Space toggles").
- Decision (plan): Space held is read with VueUse's `onKeyStroke` keydown and keyup, not a registry hotkey, because the registry holds entries a handle declares ("a handle declares its keys in an optional static `hotkeys` list", AD-26) and Space here is a held modifier of a pointer drag that runs no entry.
- Decision (plan): a click that ends a pan drag is stopped by a capture-phase listener on the `<svg>`, not undone by deselecting afterwards, because capture listeners on an ancestor run before the target's (DOM event order) and row 20a requires the selection unchanged, never changed and restored.
- Decision (plan): the specs use the browser's real `localStorage`, cleared per test as `packages/editor/src/testing/color-scheme.ts:16` does, not a `di` fake, because every `editor` spec runs in Vitest browser mode (`packages/editor/vitest.config.ts`) and the plan adds no storage token (Sergii's storage decision).
- Decision (plan): the percent is `Math.round` of the raw value, not rounded to 9 decimals first, because `node -e` on 99.49, 99.5, 99.51 % through 96/25.4 and back gave exactly 99.49, 99.5, 99.51, rounding to 99, 100, 100.
- Decision (plan): `CanvasItems`, not `DrawnNodes`, because AD-22 says "Canvas items are DOM elements" and the glossary's **fitted** and **drawn shape** mean other things; `viewportForBounds`, not `fittedViewport`, for the same clash.
- Decision (plan): the cursor comes from `@use-gesture`'s `onMove`/`onHover` on the same `Gesture`, not VueUse's `useMouseInElement`, because the controls already bind that element through one input layer (Sergii's library decision).
- Decision (plan): a stored value outside the range reads as none, not clamped, following `use-theme-choice.ts:12` ("A stored value that is no choice reads as `auto`").
- Decision (plan): F's label is `Fit the viewport`, not EXPERIENCE.md's "Fit selection or board", because the spine's Naming row says "Glossary terms only", the glossary's **board** is "One physical PCB", and **fit the viewport** is the glossary row for F.
- Decision (plan): F is available only on Layout, not on every 2D workspace that shares the viewport (AD-22), because only Layout draws (EXPERIENCE.md: other workspaces are "an empty canvas region … until each workspace's first story").

## Conformance Log

Pass 1 (two readers, union; 0 dropped for a missing quote; one quote, "low-level Vue utilities", sat in AD-26 not the Stack row: re-cited):
- `Give every threshold three rows` -- negative `deltaY`, `deltaMode` pages, pinch, clamped point, F with no key / too small: fixed (rows 7, 18a, 25a–25b, 29a, 30–30a).
- `Command and action classes are verb+noun PascalCase` -- `viewport.fit`: fixed (`FitViewport`, `viewport.fitViewport`).
- `Glossary terms only` -- "board" in the label: fixed (`Fit the viewport`).
- Clamp vs refuse contradiction for stored and devtools values: fixed.
- `When a decision departs from a Stack dependency's documented setup` -- detached scope, `writeDefaults`: fixed (Decisions).
- `A choice no requirement made is a decision` -- `aria-label` lookup, `DesignStore` injection, gestures bypassing `invoke`: fixed.
- `Put every type a folder declares … in that folder's types.ts` -- `WheelReading`: fixed.
- Untagged composables and schema file: fixed.
- `the formatter takes (value, unit)` -- spine edit covers `percent` and the options argument: fixed.
- Precedent `viewport.spec.ts` numbered test names: fixed (rewritten). Precedent `use-theme-choice.ts` guard beside composable: deferred.
- Check 6, rows 13–14 overwrite a refused stored value: fixed (stated in the row; view state the fit recomputes).
- Write cadence: asked (Sergii: throttle).

Gap review (0 dropped):
- gap: reload under `?seed=corney` (`app/src/dev-seed/corney-seed.ts`) -- asked (Sergii: reload the design URL).
- gap: cursor after the canvas unmounts (`LayoutCanvas.vue`) -- fixed (row 28).
- gap: wheel sign and `deltaMode` members -- fixed.
- gap: pinch rows -- fixed.
- gap: types placement -- fixed.
- gap: labelled decisions (`DesignStore`, `invoke`) -- fixed.
- gap: strip overflow (`StatusStripLandmark.vue`) -- asked (Sergii: never compress).
- gap: no design open -- fixed (in-memory initial, nothing written).
- gap: Space+drag from a key (`CanvasSlot.vue`) -- fixed (row 20a, capture-phase click stop).
- gap: right half shares node ids (`use-placed-nodes.ts`) -- fixed (several items per id).
- gap: 14.6 after a switch -- asked (Sergii: `fitNodes(ids)`, waiting is 14.6's).
- gap: storage write failure -- asked (Sergii: `onError` default, no row).

Final pass (1 reader; 0 dropped; these fixes no reviewer has read):
- `A choice no requirement made is a decision` -- notch rule (Sergii's pick), percent rounding (tried: `node -e`), pan-click stop, Space via `onKeyStroke`: fixed.
- `Give every decision its rejected alternative` -- Space focus, F on Layout only: fixed.
- `Substitute through di` -- specs' `localStorage`: fixed (real, cleared per test; browser mode).
- Stale cursor under a still pointer (frozen 'not the last position'): fixed (screen point held, row 26a).
- Glossary UiAction `apply` returning `AsyncResult` -- fixed (`void` per today's types; 13.24 changes it, spine AD-26).
- One `Gesture` vs two; `use-viewport.ts` signature; strip width (`min-w-40`); npm fence for `@use-gesture/vanilla`; dispose; `corney-seed.ts:15`; readout unit `'none'`: fixed.
- `Glossary terms only` -- `fitted`, `drawn`: fixed (`CanvasItems`, `viewportForBounds`, "every slot on the canvas").
- Rows: 100% and 106%, padding 47/48/49, zero extent, unplaced node, row 3 as a number: fixed.
- Write cadence (📐): asked (Sergii: throttle, rows 17b–17c).

## Verification

**Commands:**
- `pnpm test` -- expected: all pass.

**Manual checks:**
- `pnpm --filter app dev`, `/?seed=corney`: wheel zooms toward the cursor ×1.1 per notch and stops at 10% and 2000%; trackpad scroll pans and pinch zooms; middle-drag and Space+drag pan; F with a key selected fits it, with none fits every key; the strip shows `x … y …` and the zoom; Outline and back keeps the view; then reload `/#/design/<id>/layout` without `?seed`: the same view.
