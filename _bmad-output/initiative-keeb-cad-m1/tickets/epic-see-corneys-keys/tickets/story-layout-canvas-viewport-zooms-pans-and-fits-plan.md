---
title: 'Layout canvas viewport zooms, pans and fits'
type: 'feature'
ticket: 23
created: '2026-11-10'
status: 'ready-for-dev'
baseline_revision: ''
route: 'full'
route_source: 'auto'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
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
- Decision (Sergii 2026-11-10): 100% zoom is 96/25.4 px per mm, the CSS `mm` (1in = 96px = 25.4mm), so 100% shows the board at nominal real size; not 1 px/mm (a key is 18 px at 100%, and 10% is unusable) and not 13.7's 4 px/mm (an opening value never meant to be shown).
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
- [ ] Spine, on main first -- the Stack and Numbers lines above.
- [ ] `packages/editor/package.json` -- `@use-gesture/vanilla` 10.3.1 (one user, so no catalog entry: `tooling/catalog.spec.ts` asks `catalog:` only of shared deps).
- [ ] `viewport/viewport-limits.ts` -- `minZoomPercent` 10, `maxZoomPercent` 2000, `wheelStep` 1.1, `notchMinDeltaPx` 50, `fitPaddingPx` 24, `viewportWriteIntervalMs` 250, `pxPerMmAt100` 96/25.4; delete `fit-padding.ts`.
- [ ] `viewport/{zoom-at.ts,pan-by.ts,clamp-zoom.ts,zoom-percent.ts,fitted-viewport.ts,viewport-transform.ts}` (function) -- `zoomAt(value, screenPoint, factor, size)`, `panBy(value, screenDelta)`, `clampZoom`, `zoomPercent`, `viewportForBounds`, `screenToModel`. Rows 1–11a, 25c–25d.
- [ ] `viewport/read-wheel.ts` (function) -- `readWheel(event): WheelReading` (`{ kind: 'notch'; direction: 'in' | 'out' } | { kind: 'pan'; delta: Point } | { kind: 'none' }` in `viewport/types.ts`). Rows 29–31.
- [ ] `viewport/viewport-value-schema.ts` -- the stored and devtools schema: `{ centre: { x, y }, zoom }`, zoom in the range.
- [ ] `viewport/viewport.ts` (service) -- injects `DesignStore` for the open design's id; `useStorage(() => key, null, undefined, { serializer, writeDefaults: false })` in a detached scope stopped by `[Symbol.dispose]` (as `switch-grace.ts`); `zoomAt`, `panBy`, `setCentre`, `setZoom` (clamped), `fitOnce(bounds, size)`, `fitNodes(ids)` (expands each id with `subtreeIds` of its node in the open design, takes `CanvasItems.bounds`, else every slot on the canvas; a fit that can't run changes nothing); with no design open the value is `Viewport.initial` in memory and nothing is written. Rows 13–17c.
- [ ] `viewport/use-viewport-controls.ts` (function) -- the one `Gesture` on the `<svg>`: `onMove`/`onHover` → `CanvasCursor`, `onPinch` → `zoomAt`, `onDrag` (middle button, or Space held) → `panBy`, `onWheel` → `readWheel`; destroyed on unmount. Space held comes from VueUse `onKeyStroke(' ', …)` keydown/keyup, counted only with focus in the canvas landmark or on `body` and `preventDefault`ed there; a click that ends a pan drag is stopped in the capture phase so it selects nothing. Rows 18–22, 20a.
- [ ] `viewport/{canvas-items.ts,use-canvas-item.ts,use-canvas-items-root.ts}` (service, function, function) -- `CanvasItems`: the canvas registers its `<svg>` and keys group; each `CanvasSlot` registers its element under its node id (several per id, for 13.8's right half); `bounds(ids): Option<Bounds>` unions every registered element of those ids; `size()`.
- [ ] `viewport/fit-viewport.ts` (service; UiAction `FitViewport`, id `viewport.fitViewport`, label `Fit the viewport`, hotkey `F`, `emptyInputSchema`; `apply` returns `void` per today's `ui-actions/types.ts`, which 13.24 changes for every UiAction) -- available on Layout with a drawn key; `apply` calls `fitNodes` with the selection. Rows 23–25b, 32–33.
- [ ] `viewport/canvas-cursor.ts` (service) -- holds the pointer's screen point and canvas size (`Option`), set by the controls, none on leave and on unmount; `model` is `screenToModel` of it through the current viewport, so a pan or fit under a still pointer updates the readout. Rows 26a, 28.
- [ ] `status-strip/{CursorReadout.vue,ZoomReadout.vue}`, `use-cursor-readout.ts`, `use-zoom-readout.ts` (function, function) -- added to `StatusStripLandmark.vue`; each `min-w-40` (Tailwind's 4px grid, 160 px; AD-26 "Spacing is Tailwind's 4px grid", no arbitrary value). Rows 11, 11a, 26, 28.
- [ ] `ui/src/format/{format-number.ts,types.ts}` + spec -- `'percent'` (`%`, no space) and `formatNumber(value, unit, { readout: true })`. Row 12.
- [ ] `.dependency-cruiser.mts` -- `onlyImports('only-editor-imports-use-gesture', '^packages/editor/', …)` beside `only-editor-and-ui-import-vueuse`; a refused fixture under `tooling/ad10/violations/packages/ui/src/` and a `rules.spec.ts` row.
- [ ] `devtools/viewport-inspectable.ts` (zoom on `viewportValueSchema`'s range; row 27), `services-classified.spec.ts`, `editor-module.ts` -- register `CanvasItems`, `CanvasCursor`, `FitViewport`; classify the first two `notShown`.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row passes at its level.
- Given each browser group, when its toggled bug is applied, then its rows go red and pass once restored (named in the PR): zoom about the centre (18, 18a), no clamp (1–6, 18a), storage key ignoring the design (17), Space ignoring focus (22), the pan click not stopped (20a), F always fitting every key (23, 32), cursor kept on unmount (28).

## Implementation Notes

## Plan Change Log

## Review Triage Log

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
