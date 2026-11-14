---
title: 'Both halves drawn'
type: 'feature'
ticket: 8
created: '2026-11-14'
status: 'built'
baseline_revision: '44d388bbbb16e27cef6fb0160414ee9bba566e23'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The canvas draws the posted right half (13.6) but cannot tell it from the left: selection and hover hold node ids, so both halves select, fit and show group borders together, the right half can be deleted through, and nothing shows the mirror axis or that the right half is derived.

**Approach:** Selection (`Selection`) and hover (`HoveredGroup`, still its own service) hold `PlacementId`, a new `schema` kind the spine's Data Schema defines, and each drops ids the design no longer holds after a commit. Canvas keys, borders, tabs and fit work by the posted row id; the Tree maps node ids to the authored side; Delete and Ctrl+D are unavailable on a `right/` selection; G and S add to the authored group behind it and select the new node on the side the person was on. The canvas draws center's y-axis as a dashed mirror axis and the right half's key body and top face at 70% until selected.

## Boundaries & Constraints

**Always:**
- Selection and hover hold `PlacementId`s, made only from a posted row id or by `sideQualifiedId` (spine Editor state). A canvas item selects and points at its own row id; a slot points at its nearest group on its own side. Hover still holds a group; recording the pointed key is 13.35's.
- The Tree shows row `x` selected when any side of `x` is, and selects and points at the authored side's id (`left/x` split, `whole/x` unibody).
- After each commit, selection and hover drop every id whose node or side the design no longer holds (one `holdsPlacement` check); an id with no posted row draws, dims and fits nothing (F fits as with nothing selected).
- Keys, border groups, tabs and ⊕ are named by the side-qualified id (`right/thumbfan-near-home`, `right/thumbfan border`); drawn tab text and legends keep the authored id (DESIGN.md Canvas keys).
- Delete and Ctrl+D are unavailable while the selection holds a `right/` id (spine AD-26 select-only rule), through one shared check later operations reuse, so the key is not claimed; G, Shift+G and S stay available.
- A `right/` fitted key's body and top face fill at 70% (DESIGN.md `components.right-half.body-opacity`) until selected; edges, legends and marks stay at 100%; grayed and unfitted bodies are unchanged.
- Decision (Sergii, 2026-11-14): hover stays in `HoveredGroup`, not folded into `Selection`, because he does not want hover and selection combined in one service; the spine's Editor state sentence "Hover holds a `PlacementId` in the same service" is corrected on main to its own service, pruned after each commit by the same check.
- Decision (Sergii, 2026-11-14): the axis is a fixed line from −10 000 to +10 000 mm along the local y-axis, placed by center's frame transform, not clipped to the canvas edges each viewport change, because AD-22 says canvases "compute no geometry"; at the 10% minimum zoom its end lies 3 780 px from center's origin.
- The mirror axis shows only when the set posts `right/<center>` (center is the layout root, glossary **center**): a 1px dashed `--color-mirror-axis` line in `<g role="img" aria-label="Mirror axis">` along the posted `left/<center>` frame's y-axis, placed by `translate(x, y) rotate(rot)` in model mm (AD-22), beneath borders and keys, `pointer-events="none"`, non-scaling stroke.

**Never:**
- The Fitted toggle, read-only derived-from fields (14.5), the e2e journey and its Firefox project (13.34), ids, anchor links and key hover on the canvas (13.35), multi-select.
- A test that selects several ids by click or command (none can: AGENTS "Arrange only a state real commands could reach").

## Boundary table

| # | Group | Input / state | Expected | Level |
|---|---|---|---|---|
| 1 | production bugs | split design, group `thumbfan` ⊃ slot `thumbfan-near-home`, both sides posted; click key `right/thumbfan-near-home` | selection `['right/thumbfan-near-home']`; that key pressed, `left/thumbfan-near-home` not; Tree row `thumbfan-near-home` selected | unit, editor |
| 1a | production bugs | same; click key `left/thumbfan-near-home` | selection `['left/thumbfan-near-home']`; Tree row selected; `right/…` not pressed | unit, editor |
| 2 | production bugs | same; click Tree row `thumbfan-near-home` | selection `['left/thumbfan-near-home']`; only the left key pressed | unit, editor |
| 2a | rules | unibody design (loaded through `replaceDesign`), slot `k`; click Tree row `k` | selection `['whole/k']` | unit, editor |
| 3 | production bugs | pointer over key `right/thumbfan-near-home` | `right/thumbfan border` stroked, no `left/thumbfan border`; one tab, named `right/thumbfan`, text `⠿ thumbfan` | unit, editor |
| 3a | module boundaries | pointer over Tree row `thumbfan` | `left/thumbfan border` stroked, no `right/thumbfan border` | unit, editor |
| 3b | rules | click tab `right/thumbfan` | selection `['right/thumbfan']`; `right/thumbfan border` 2px selection; `left/thumbfan border` absent | unit, editor |
| 4 | production bugs | keys `left/thumbfan-near-home` at (−60, 0), `right/…` at (60, 0); selection `['right/thumbfan-near-home']`, F | viewport centre (60, 0) mm | unit, editor |
| 4a | rules | right `thumbfan` keys at (60, 0) and (70, 0), left at (−60, 0) and (−70, 0); selection `['right/thumbfan']`, F | viewport centre (65, 0) mm | unit, editor |
| 4b | rules | selection `['right/new']` whose row is not posted, F | the same viewport as F with nothing selected | unit, editor |
| 5 | production bugs | key `right/k`, fitted, unselected | body and top-face fill at 70% alpha; edge stroke at 100% | unit, editor |
| 5a | production bugs | key `right/k` selected | body and top-face fill at 100% | unit, editor |
| 5b | rules | key `left/k` unselected | body and top-face fill at 100% | unit, editor |
| 5c | rules | key `right/k` unselected while grayed (switch grace) | body fill `stale` at 100% | unit, editor |
| 5d | rules | key `right/k` posted `fit: 'empty'`, unselected | no body fill, dashed outline at 100% | unit, editor |
| 6 | production bugs | center posted as `left/root` and `right/root`, frame (0, 0, 0°) | one `Mirror axis` image, dashed `mirror-axis`, its line on screen vertical through the screen x of model x = 0 | unit, editor |
| 6a | rules | same, `left/root` frame (10, 0, 90°) | the line horizontal on screen through model (10, 0) | unit, editor |
| 6b | rules | only `left/root` posted | no `Mirror axis` | unit, editor |
| 6c | rules | row 6 at 10% zoom, centre (0, 0) | the line's screen ends lie beyond the canvas's top and bottom edges | unit, editor |
| 7 | production bugs | selection `['right/thumbfan-near-home']`, canvas focused, Delete | design unchanged; keydown not `defaultPrevented` | unit, editor |
| 7a | production bugs | same, Ctrl+D | design unchanged; keydown `defaultPrevented` (no bookmark dialog) | unit, editor |
| 7c | rules | `selectsRightHalf` of `[]`, `['left/a']`, `['whole/a']`, `['right/a']`, `['left/a', 'right/b']` | false, false, false, true, true | unit, editor |
| 7b | rules | selection `['left/thumbfan-near-home']`, Ctrl+D | copy `thumbfan-near-home-2` added; selection `['left/thumbfan-near-home-2']` | unit, editor |
| 8 | production bugs | selection `['right/thumbfan-near-home']`, S, empty Id, Add | `thumbfan` gains one slot, its last child `<new>` read from the design after Add; selection `['right/<new>']` | unit, editor |
| 8a | rules | selection `['left/thumbfan-near-home']`, S, Id `n`, Add | `thumbfan` gains `n`; selection `['left/n']` | unit, editor |
| 8b | rules | selection `['right/thumbfan']`, G, Id `g`, Add | chain group `g` in `thumbfan`; selection `['right/g']` | unit, editor |
| 8c | rules | nothing selected, S, Id `n`, Add | root gains `n`; selection `['left/n']` | unit, editor |
| 8d | rules | `addedSide` on a split design of `[]`, `['right/x']`, `['left/x']`, `['left/x', 'right/y']` | `left`, `right`, `left`, `left` | unit, editor |
| 9 | rules | pointer over `right/thumbfan-near-home` (hover `right/thumbfan`), selection `['right/thumbfan-near-home']`; DeleteNode `thumbfan` committed through the store | selection `[]`; no border stroked, at once (fake timers, no advance) | unit, editor |
| 9a | rules | same, DeleteNode of an unrelated slot | selection and hover kept | unit, editor |
| 10 | rules | split design holding `k`: `holdsPlacement` of `left/k`, `right/k`, `whole/k`, `left/gone` | true, true, false, false | unit, model |
| 10a | rules | unibody design holding `k`: `whole/k`, `left/k` | true, false | unit, model |
| 11 | rules | `placementSides` and `authoredSide` of split reversible, split mirrored, unibody | `[left, right]`/`left`, `[left, right]`/`left`, `[whole]`/`whole` | unit, model |
| 12 | rules | `placementIdSchema` on `left/a`, `right/a`, `whole/a`, `a`, `left/`, `top/a`, `left/A`, `` | ok, ok, ok, refused × 5 | unit, schema |
| 12a | rules | `aPlacementId()`, `aPlacementId('right/x')`, `aPlacementId('top/x')` | `left/id`, `right/x`, throws | unit, schema |
| 13 | module boundaries | split design holding `k`; devtools edit of the selection to `['right/k']`, `['whole/k']`, `['k']` | `['right/k']`; `[]`; unchanged (the schema refuses `k`) | unit, editor |
| 14 | glue | real model worker, launch, Corney's script then `corneyIslandTestOverrides` | key `right/thumbfan-far-home` drawn unfitted (no fill, dashed outline), `left/thumbfan-far-home` fitted | integration, app |

</frozen-after-approval>

## Code Map

- `packages/schema/src/side-id.ts`, `side-id.spec.ts`, `testing/side-id.ts`, `testing/side-id.spec.ts` -- the pattern for `placementIdSchema`, its spec, builder and builder spec; exports in `types.ts:105`, `index.ts:56,123`, `testing/index.ts:39`.
- `packages/model/src/ids/side-qualified-id.ts:7-30` -- `sideQualifiedId` returns `string`; `nodeIdOf`, `sideOf` take `string` (posted ids stay `string[]`, spine `LayoutOutput.ids`). `form/is-supported-form.ts` -- a form function. `main.ts:4,22-28` -- exports.
- `packages/editor/src/selection/selection.ts:23-32` -- the commit prune by `subtreeIds`; `use-selection.ts:13-16` parses with `idSchema` ("one that fails is a bug"). `group-border/hovered-group.ts:11-64` -- `id: Option<Id>`, `point`, `leave`, grace, `clear`, `clearSetBy`; no commit subscription yet. `use-hovered-group.ts:15-33`.
- By node id today, by row id after: `group-border/{use-group-borders.ts:28-29,GroupBorder.vue:32-39,GroupBorderTab.vue:41-46,GroupOriginMark.vue}`, `workspace/layout/{use-placed-nodes.ts:19-27,types.ts,CanvasSlot.vue:15-44}`, `viewport/{canvas-items.ts:9,18-35,types.ts:27,viewport.ts:87-95}`, `selection/{delete-selection.ts:44-48,duplicate-selection.ts:51-63}`, `add-flow/{parent-for-selection.ts,add-slot-flow.ts:18-22,add-group-flow.ts:18-22}`, `slide-out/TreeSlideOut.vue:14-15,33-53`, `devtools/selection-inspectable.ts:17-25`. Stale comments naming node ids: `canvas-items.ts:9,18`, `group-border/types.ts:12`, `workspace/layout/types.ts:9`, `hovered-group.ts:9-10`. `ui`'s `UiTree` is unchanged.
- `workspace/layout/LayoutCanvas.vue:88-94` -- transform group: borders, then `keys`. `testing/layout-canvas.ts:36-47` -- `layoutOf` adds only `left/root`; `group-borders.spec.ts` `freezeTime()` -- the fake-timer helper.
- `packages/ui/src/theme/theme.css:6-13,63` -- `@theme static` emits every variable; `--color-mirror-axis`, unused so far.
- `app/src/right-half.spec.ts:38-64` -- copy only the real-worker spawn and `runCorneyScript`, not its `reflected` or `sideOf` helpers (expected values computed as production does; deferred-work.md). `app/src/launch/launch.spec.ts:122-175` -- `Launch.run(selector, spawn)`. `reference-designs/src/scripts/corney-island-test-overrides.ts`.
- Specs moving to placement ids: `selection/*.spec.ts`, `group-border/group-borders.spec.ts` (`:349`, "strokes both halves' borders", is the superseded rule and becomes row 3), `LayoutCanvas.spec.ts`, `viewport/{viewport,use-viewport-controls,fit-viewport}.spec.ts`, `slide-out/slide-out.spec.ts:123`, `add-flow/*.spec.ts`, `devtools/devtools-module.spec.ts`.

## Tasks & Acceptance

**Execution:**
- [x] Spine, on main first (docs, done in 13fe178) -- Editor state: "Hover holds a `PlacementId` in the same service" → "Hover holds a `PlacementId` in its own service (`HoveredGroup`), dropped after each commit by the same check, not in the selection's service, because hover and selection stay apart" (Sergii's decision; no review pass).
- [x] `packages/schema/src/{placement-id,placement-id.spec,types,index}.ts`, `testing/{placement-id,placement-id.spec,index}.ts` -- `placementIdSchema` (`left/`, `right/`, `whole/` before an `idSchema` id), `PlacementId` inferred, `aPlacementId(text = 'left/id')` (function). Rows 12–12a.
- [x] `packages/model/src/ids/side-qualified-id.ts` -- `sideQualifiedId(side, id): PlacementId` (function), through `placementIdSchema`. `form/placement-sides.ts` -- `placementSides(form): PlacementSide[]` and `authoredSide(form)`, the first of them (functions, one concept). `ids/holds-placement.ts` -- `holdsPlacement(design, id: PlacementId): boolean` (function): `nodeIdOf(id)` in `subtreeIds(design.layout)` and `sideOf(id)` in `placementSides(design.meta.form)`. All exported from `model/main`. Rows 10–11.
- [x] `packages/editor/src/selection/{selection,types,use-selection}.ts` -- `ids: readonly PlacementId[]`, `select(ids: readonly PlacementId[])` in both service and composable, no parse; the prune keeps ids `holdsPlacement` accepts. Row 9.
- [x] `packages/editor/src/group-border/{hovered-group,use-hovered-group,types}.ts` -- `HoveredGroup` (service) holds `Option<PlacementId>` and subscribes to the store's commit event itself, clearing at once a hover `holdsPlacement` refuses (it becomes `Disposable` over that subscription too). `pointAtSlot(key)` → `sideQualifiedId(sideOf(key), nearestGroupId(…, nodeIdOf(key)))`; `pointAtGroup(key)`; `pointAtTreeGroup(nodeId)` points at `authoredSide`'s id with source `'tree'`, and `leave`, `clear`, `clearTreeHover` stay as they are. Rows 3, 3a, 9, 9a.
- [x] `packages/editor/src/group-border/{use-group-borders.ts,GroupBorder.vue,GroupBorderTab.vue,GroupOriginMark.vue,types.ts}` -- `shown`, select, point and accessible names by `key`; tab text stays `⠿ <id>`. Row 3b.
- [x] `packages/editor/src/slide-out/{use-tree-selection.ts,use-tree-selection.spec.ts,types.ts,TreeSlideOut.vue}` -- `useTreeSelection()` (function) returns `UseTreeSelectionResult`: `selected` (node ids with any side selected), `select(nodeIds)` on `authoredSide`; Tree hover stays on `useHoveredGroup`. Rows 1–2a.
- [x] `packages/editor/src/workspace/layout/{use-placed-nodes,types}.ts`, `CanvasSlot.vue` -- `usePlacedNodes` is the one place a posted id becomes `key: PlacementId` (`v.parse(placementIdSchema, …)`); `CanvasSlot` registers, labels, selects, points and checks `selected` by `key`; an unselected, ungrayed, fitted `right` key's body and top-face fills take the `/right-half-body` modifier (`fill-key-body/right-half-body`). `theme.css` -- `--opacity-right-half-body: 70%`. Rows 1, 1a, 5–5d.
- [x] `packages/editor/src/mirror-axis/{use-mirror-axis.ts,use-mirror-axis.spec.ts,MirrorAxis.vue,mirror-axis-length.ts,types.ts}`, `workspace/layout/LayoutCanvas.vue` -- `useMirrorAxis()` (function): `Option` of the posted `left/<center>` frame when `right/<center>` is posted; `mirrorAxisLengthMm = 10_000`; `MirrorAxis.vue` (component, props in `types.ts`) drawn first in the transform group. Rows 6–6c.
- [x] `packages/editor/src/viewport/{canvas-items,types,viewport,fit-viewport}.ts` -- items by `PlacementId`; `fitNodes` expands each id to its node's subtree on the same side. Rows 4–4b.
- [x] `packages/editor/src/selection/{selects-right-half.ts,selects-right-half.spec.ts,delete-selection.ts,duplicate-selection.ts}` -- `selectsRightHalf(ids): boolean` (function), the select-only rule's one check; both `#input()`s are none when it holds; commands get `nodeIdOf` ids; the copy is selected on the original's side. Rows 7–7c.
- [x] `packages/editor/src/add-flow/{parent-for-selection,added-side,add-slot-flow,add-group-flow}.ts` -- `parentForSelection` reads `nodeIdOf`; `addedSide(design, selected)` (function): the side of the only selected id, else `authoredSide`; `finished` selects `sideQualifiedId(addedSide(…), addedNodeId(…))`. Rows 8–8d.
- [x] `packages/editor/src/devtools/selection-inspectable.ts` -- `v.array(placementIdSchema)`, kept by `holdsPlacement`. Row 13.
- [x] The Code Map's specs and stale comments -- placement ids through `aPlacementId`, whole-value asserts; comments naming node ids updated or dropped; `group-borders.spec.ts` test names that carry `1px`/`2px` (`:220`, `:519`) name the role instead.
- [x] `app/src/both-halves.spec.ts` -- row 14 through `Launch.run` with the real model worker, the steps run by `runById`, keys found by role and name, expectations as row 14 states them.
- [x] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- `app/src/right-half.spec.ts`'s `reflected` (expected values computed as production does) and local `sideOf`; `use-hovered-group.ts` and `use-placed-nodes.ts` have no spec of their own.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row passes at its level in Chromium and Firefox.
- Given each toggled bug, applied alone, then its rows go red and pass once restored (named in the PR): `CanvasSlot` selecting `nodeIdOf(key)` (1, 1a, 5a); the Tree selecting the right side (2); `authoredSide` always `left` (2a, 8c); `pointAtSlot` dropping the side (3); the Tree pointing at `right/` (3a); the tab selecting `left/` (3b); `fitNodes` ignoring the side (4, 4a); `fitNodes` throwing on an unposted id (4b); the dim on every side (5b); the dim when grayed (5c) or unfitted (5d); `useMirrorAxis` ignoring `right/<center>` (6b); the axis without its `rotate` (6a) or at 1 mm long (6, 6c); `selectsRightHalf` always false (7, 7a); the copy selected on `right/` (7b); `addedSide` always authored (8, 8b) or always `right` (8a); hover's commit subscription removed (9) or clearing on every commit (9a); the inspectable skipping `holdsPlacement` (13); `CanvasSlot` drawing every fit as fitted (14).

## Implementation Notes

- Row 7a conflicts with the spine: AD-26/Shortcuts says a matched Ctrl or Meta chord outside a text field is always prevented, and `ui`'s `hotkey-layer.ts:48` (`alwaysClaimed`) plus `duplicate-selection.spec.ts` "claims the chord with nothing selected" hold it. Built per the spine: Ctrl+D on a right selection is unavailable and changes nothing, but its keydown is prevented. Row 7 (Delete) is not prevented, as planned. Settled: Sergii renegotiated row 7a (Plan Change Log).
- The toggle "`authoredSide` always `left`" turns row 2a red, and `added-side.spec.ts`'s unibody case (nothing selected gives `whole`); row 8c runs on a split design, where the authored side is `left` anyway.

- Real-host run: the editor specs post sets through `workers/testing`'s `FakeWorker`, the repo's own fake of the model worker, which `app` specs check against the real one; row 14 (`app/src/both-halves.spec.ts`) runs the real model worker through `Launch.run` and passed in Chromium and Firefox (`pnpm test`: 670 files, 5317 tests, exit 0).
- No unplanned structural change: the diff since `baseline_revision` touches no `tsconfig*.json`, `package.json`, `pnpm-workspace.yaml`, or Vitest, ESLint, Stryker or dependency-cruiser config, and adds no `declare global` or `declare module`.

## Plan Change Log

- Build, Sergii (2026-11-14): frozen row 7a renegotiated from "keydown not `defaultPrevented`" to "keydown `defaultPrevented` (no bookmark dialog)", because the spine's Shortcuts rule (13.24) says "outside a text field, a matched chord with Ctrl or Meta … is always prevented, so an unavailable Ctrl+D never opens the browser's bookmark dialog" (`hotkey-layer.ts:48`); the planner had copied row 7's Delete expectation. KEEP: everything else.

## Review Triage Log

Pass 1 (quick, test-reviewer; 0 findings dropped for a missing quote). Verdicts: high 0, medium 1, low 4, false 1 (part of one), maybe-false 0.
- medium, patch -- `duplicate-selection.spec.ts` "with %s, is unavailable and changes nothing" drops `pressKey(CTRL_D)`'s event, so row 7a's prevented keydown is never asserted for a right-half selection (both lenses). Patch: assert `defaultPrevented` for every row.
- low, patch -- `LayoutCanvas.spec.ts` `alphaOf` returns `FULL_ALPHA` for any unparsed colour, so rows 5a, 5b and the edge assertion could pass unmeasured. Patch: throw on an unreadable colour.
- low, patch -- AC toggle "`authoredSide` always `left` (2a, 8c)" cannot turn 8c red on a split design (quick). Patch: a unibody row in `added-side.spec.ts`.
- low, rejected -- `use-mirror-axis.spec.ts` `MIRROR_AXIS` equals the group border's colour, so a swapped token passes; unlikely in use, and the colour is Sergii's hitl check at the look.
- low, rejected (decisions, not defects) -- no-design branches in `pointAtTreeGroup` and `useTreeSelection.select`, and no axis when `left/<center>` is missing: listed as build decisions at the look. False part: "with no design, hover is kept" -- `HoveredGroup.#prune` maps the hovered id to `design !== undefined && …`, which is `some(false)` with no design, so `getOr(true)` is false and it clears.

Pass 2 (quick, test-reviewer on the three patched specs; 0 dropped). Verdicts: high 0, medium 0, low 4, rejected 1. Nothing above low and no frozen line broken: the review ends; lows logged, not patched.
- low, logged -- `CanvasSlot.vue` `dimmed`'s `!props.grayed` is dead (`bodyFill` and `topFaceFill` return `fill-stale` first), so deleting it leaves row 5c green; the 5c and 5d toggles are the branch order in `bodyFill`, to be named so in the PR.
- low, logged -- row 5c's test reads only the body rect; a grayed right key's top face is unguarded (row 5c names the body only).
- low, logged -- the same test reads the body through a ternary rather than `keyAlphas`' throwing lookup; it still fails when the rect is missing.
- low, logged -- `LayoutCanvas.spec.ts` comments on `keyAlphas` and `bothHalves` restate their names.
- rejected (fix edits the plan) -- the AC's toggle line still names 8c for "`authoredSide` always `left`"; the PR names 2a and `added-side.spec.ts`'s unibody test instead.
- note -- the dim rows compare alpha to exactly 0.7; both browsers serialise it so today.

## Design Notes

- Decision (plan): `HoveredGroup` prunes in its own commit subscription with `holdsPlacement`, not `Selection` reaching into it, because Sergii keeps the two services apart and the spine prunes "every selected or hovered id … from the design store's commit event", which each service can do for its own.
- Decision (plan): `holdsPlacement`, `placementSides` and `authoredSide` live in `model`, not `editor`, because the spine reads a node "through `nodeIdOf(id)`, its side through `sideOf(id)` … all three in `model/main`", AGENTS says "Put code in the package that owns the concept", and the spine rejects "filtering stale ids in every reader".
- Decision (plan): a posted id becomes a `PlacementId` only in `usePlacedNodes`, by `v.parse`, not a cast, and `select` takes `PlacementId[]` without parsing again, because "a brand comes from its schema" (spine Shared kinds) and every canvas caller already holds a `key`; a failed parse throws, a bug, as `use-selection.ts:13` says of a node id today.
- Decision (plan): accessible names are side-qualified, not bare, because the ticket's ids are "side-qualified" and its verify clicks "right/thumbfan-near-home"; drawn text stays authored (DESIGN.md Canvas keys).
- Decision (plan): the Tree maps sides in `editor`'s `useTreeSelection`, not in `UiTree`, because `ui` imports no workspace package but `result` (spine AD-10) and the Tree "has no side" (Editor state).
- Decision (plan): the added node's side is that of the only selected id, else the authored side, not the first selected id's, because it follows `parentForSelection`'s one-id rule (`parent-for-selection.ts:4-10`) and the spine's "`right/<id>` from a right-side selection, else the authored side's id"; row 8d tests the function directly, as no click selects several.
- Decision (plan): the select-only check is one `selectsRightHalf` function, not a test in each UiAction, because AD-26 rejects "a sentence per operation" since "drag and the Inspector would each decide it again".
- Decision (plan): dimming is the named modifier `fill-key-body/right-half-body` over `--opacity-right-half-body`, not the documented `/(--opacity-right-half-body)` form (tailwindcss.com/docs/colors, "Adjusting opacity"), because the spine's "No arbitrary values … checked by lint" refuses any class holding a parenthesis (`eslint.config.ts:114-119`); Tailwind 4.3.3 resolves the named form from the `--opacity` namespace (`compile(...).build(['fill-key-body/right-half-body'])` → `fill: color-mix(in oklab, var(--color-key-body) var(--opacity-right-half-body), transparent)`). Not an inline `fill-opacity` style either, since AD-26 has classes and the canvas read one token source. It dims fills only, so edges keep 3:1 (DESIGN.md Right half).
- Decision (plan): the axis dashes `5 3`, as the group border, not `CanvasSlot`'s `4 3`, because DESIGN.md calls both "1px dashed" and 13.32 took `5 3` from its named mockups. It is drawn from `left/<center>`, not `right/<center>`: both give one line (glossary: the rows "share only the y-axis"), and `left` is the authored side the Tree and add flow use.
- Decision (plan): the axis lives in `mirror-axis/`, not `workspace/layout/`, because DESIGN.md draws it "in every 2D workspace that draws both halves", as `group-border/` sits outside one workspace.
- Decision (plan): row 14 mounts the app through `Launch`, not `editor`'s fake sets, because the ticket puts it "in app's tests" and an override reaches the canvas only through the worker.

Visible: `pnpm --filter app dev`, `/?seed=corney`: a dashed axis between the halves; right keys paler until clicked; a click on a right key lights only it and its Tree row; pointing at a right key shows only the right group's border; F on a right key fits that key; Delete and Ctrl+D do nothing on a right key; S on a right key adds to its group and selects the new right key once posted.

## Conformance Log

Pass 1 (two readers, 19 findings, union; 0 dropped) and gap reviewer (9, 0 dropped):
- `Arrange only a state real commands could reach` (row 13 several ids vs Never) -- fixed
- `Prove a test Stryker can't reach … with a toggled bug` (rows without toggles) -- fixed
- `Give every threshold three rows` (axis length) -- fixed (row 6c)
- spine Test builders: `A scalar builder … refuses a value its schema refuses` (no `testing/placement-id.spec.ts`) -- fixed
- spine Editor state `an id is made only from a posted row's id` (where parsing happens) -- fixed
- Naming `Glossary terms only` (`root` for center) -- fixed
- hover methods "moved in unchanged" while renamed -- fixed (hover stays in `HoveredGroup`, Sergii)
- precedent `app/src/right-half.spec.ts` `reflected`, local `sideOf` -- deferred
- `Put every type a folder declares … in that folder's types.ts` (new composables, axis props) -- fixed
- `add … an input that breaks an assumption` (grayed and unfitted right keys) -- fixed (5c, 5d)
- `Give every decision its rejected alternative` (axis side, several-ids side) -- fixed
- `A choice no requirement made is a decision` (parse failure) -- fixed
- `Write a comment only for a why` (stale node-id comments) -- fixed
- untagged form-sides helper -- fixed (`placementSides`)
- gap: `fit-viewport.spec.ts`, `slide-out.spec.ts` selecting by node id -- fixed
- gap: composables "tested on their own" (`use-tree-selection`, `use-mirror-axis`) -- fixed; precedent `use-hovered-group.ts`, `use-placed-nodes.ts` -- deferred
- gap: Stack dependency cited from source, not docs (Tailwind) -- fixed
- gap: AD-26 one select-only rule (`delete-selection.ts`, `duplicate-selection.ts`) -- fixed (`selectsRightHalf`)
- gap: mirror axis for other 2D workspaces (`workspace/layout/`) -- fixed (`mirror-axis/`)
- asked: hover in `Selection` vs its own service -- Sergii: own service

Final pass (9 findings, 0 dropped; these fixes no reviewer has read):
- spine `No arbitrary values … checked by lint` (`/(--…)` modifier) -- fixed (named modifier, probe run)
- `Give every decision its rejected alternative` (new spine sentence) -- fixed
- `Test a rule where it is defined` (`selectsRightHalf`) -- fixed (row 7c)
- `Give every threshold three rows` (`addedSide` above one id) -- fixed (row 8d)
- `Assert relative to the arranged state` (row 8's minted id) -- fixed
- `add empty input` (row 12) -- fixed
- `numbers go in parameters` (precedent `group-borders.spec.ts:220,519`) -- fixed (renamed in this work)
- `helpers over one concept share a file` (placement sides) -- fixed
- Tree hover API left open -- fixed

## Verification

**Commands:**
- `pnpm test` -- expected: every project green, Chromium and Firefox.
- `pnpm typecheck && pnpm lint` -- expected: clean.

**Manual checks:**
- Design Notes' Visible list in both browsers; Sergii confirms the 70% opacity and the axis colour (hitl).
