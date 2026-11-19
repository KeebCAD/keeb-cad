---
title: 'Slot space replaces the rectangle'
type: 'refactor'
ticket: '18'
created: '2026-11-19'
status: 'built'
baseline_revision: '0d73f73c83c2296f966ccc98fadff09ac0705c3e'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: [quick, test-reviewer]
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The built code steps, attaches, borders and draws every slot by a centred `{ w, h }` rectangle under the role `rectangle`, while the spine (AD-5, AD-4, AD-16, Data Schema `PartsOutput`, `PolygonRegion`; e1fc4b0) now says a part's one `slot-space` output is any `PolygonRegion[]` in the slot's frame, its origin the part's own origin.

**Approach:** Rename the role to `slot-space` in the library, its build check and the parts lane; let a one-count lane output carry an array; carry `PolygonRegion[]` through `PartsOutput.rows` with one region codec in `protocol` shared with the layout output's borders; step, attach, border and draw from the polygon. Corney places and looks exactly as before.

## Boundaries & Constraints

**Always:**
- A chain steps by the slot space's extent along its axis in the child's frame before its rotation (AD-4: "`near` and `far` are the low and high ends…"); a group's extent is its placed slots' slot spaces together, as today.
- Attach points, `center` included, sit on the slot space's bounding box in the slot's frame (glossary **attach point**: "A named point on the bounding box of the slot's slot space"), so `center` is the box's centre, not the frame origin.
- The slot's frame origin is the part's origin; offsets turn about it as today (`place-slot.ts:6-12`, the pivot reading 0 when absent, `read-offset.ts:15,29`).
- Group borders grow each slot's slot space, mirrored with its row (`frame.mirrored`), by margin × levels (AD-16).
- The canvas draws the slot space as a path at the slot's frame with the existing SVG transform and computes no geometry (AD-22: "they compute no geometry").
- The app-defined stand-in run `stand-in` is an 18 × 18 mm rectangle centred on its frame (AD-5).
- `lib:blueprint/choc-key` version 1 is edited in place to return a centred 18·factor × 18 mm rectangle, not a version 2, because AD-5 says "Before the first public preview, library versions are mutable".
- Decision (Sergii 2026-11-19): the parts lane refuses a slot space that breaks the Data Schema's `PolygonRegion` contract, as `lane-failed` with cause `role`: not an array of regions of finite numbers, no region, a loop under 3 points, an outer loop with signed area ≤ 0, a hole with signed area ≥ 0; not rewinding loops, which fixes a mistyped shape unannounced, nor leaving it out, which fails later in borders or drawing.
- Decision (plan): a loop whose last point equals its first is refused too, not accepted, because the same contract says "a loop does not repeat its first point" and Sergii's decision refuses what breaks it.
- Decision (plan): the region checks (loop size, repeated first point, winding) live in `geometry` as `isWellFormed`, and `model`'s `isSlotSpace` adds the schema and finite checks before calling it, not all in `model`, because AD-16 puts "normalise-and-check… and the region type" in `geometry`, and `geometry` has no Valibot (`geometry/package.json` depends only on `result` and `clipper2-ts`).
- Decision (plan): `checkLaneOutputs` and `BlueprintVm`'s conversion read the declared count, not whether the value is an array: a `one` output takes its value whole, an array included, and converts it once; an `any` output must be an array and converts each item. Not wrapping the shape in an object, because the Data Schema types a shape output's value as `PolygonRegion[]`, and not declaring `slot-space` with count `any`, because "Every part produces exactly one `slot-space`". This reverses `check-lane-outputs.spec.ts:15-16`'s refusal of a list for a one output.
- Decision (plan): `borderSchema`/`Border`/`aBorderRegion` become `polygonRegionSchema` (one region), `PolygonRegion`, `aPolygonRegion`, and tests write `[aPolygonRegion(…)]` where they called `aBorder`, not keeping `Border` beside a new name, because the Data Schema calls `PolygonRegion` "the one 2D value: slot spaces, volume regions, group borders".
- Decision (plan): the codec moves out of `layout-output-codec.ts` into `protocol/src/polygon-regions/`, used by both outputs, its tests with it, because the ticket says "extracted from the layout output's border packing… which both outputs then use, not a second copy". Its columns keep their names (`rowLoops`, `loopPoints`, `loopHole`, `points`), not new ones, because the Data Schema's `LayoutOutput` codec note names them.
- Decision (plan): a region's outer and hole loops are inflated in one call, not each loop alone, because a hole inflated alone grows as a solid instead of shrinking; every loop of a mirrored slot space, holes included, is reversed after the reflection, not left as reflected, because a reflection flips every loop's winding and the Data Schema requires outer counter-clockwise, holes clockwise.
- Decision (plan): `geometry`'s `GrownEnvelope` becomes `GrownRegions { regions; distance }`, not keeping the name, because AD-16 says "the former M1 rule that a part's envelope is its rectangle is gone". `signedArea` gets its own file but stays out of `geometry`'s `index.ts`, since only `geometry` reads it; `Box` (`{ minX; minY; maxX; maxY }`) is exported because `boundingBox` returns it. `isWellFormed(regions): boolean`; `isSlotSpace(value): value is SlotSpace`, and `convertHandle` refuses with `The slot space is not well-formed polygon regions.`, as today's rectangle message.
- Decision (plan): `boundingBox([])` is a point at the origin, as AD-4's "a group with no placed slots is a point at its origin (`near = far = 0`)", not a failure; the parts lane never posts an empty slot space.
- Decision (plan): the canvas draws a slot space's holes (fill rule `nonzero`), not only its outer loop as AD-22 does for group borders, because the ticket says "the canvas draws each slot space as its polygon".
- Decision (plan): `borderPath` moves to `editor/src/viewport/loop-path.ts` as `loopPath`, used by group borders and slots, not a second loop-to-path function, because AGENTS.md says "helpers over one concept share a file named for it".
- Decision (plan): the key's top face is the slot-space path again, scaled by `keycapProportions` about its own box and shifted 3/56 of its height toward the back by CSS (`transform-box: fill-box`), so the browser finds the box; not the canvas computing a bounding box, because AD-22 says canvases "compute no geometry", and not a face posted by `model`, because `PartsOutput` has no face field. On a centred rectangle this is today's face.

**Never:**
- No design-file, `LibraryPart`, volume or `OutputKind` change: 14.7 and 14.4 own them (`lane-declaration.ts:15`'s `'envelope'` stays).
- No new dependency, no package-graph change; `editor` keeps not importing `geometry`.

## Boundary table

Frozen as acceptance. L = an L-shaped slot space, outer `(-9,-9) (27,-9) (27,9) (9,9) (9,27) (-9,27)`, box x −9…27, y −9…27. Off = a rectangle x 0…18, y −9…9. Gap 1 mm on x and y unless stated. L and Off reach a slot through any library part blueprint returning them (AD-5: "for anything else the author picks it", ISO Enter); unit tests arrange them as resolved parts.

| Group | Row | Input | Expected | Level |
|---|---|---|---|---|
| Production bugs | Corney unchanged | Corney's script | key frames match `key-centres.test.ts`'s goldens; group border region counts as `app/src/layout-set.spec.ts:112-123`; every posted choc row is a centred 18 × 18 or 27 × 18 rectangle (AD-5) | integration `reference-designs`, `app` |
| Production bugs | 1u canvas key unchanged | slot, `key@a` = 18 × 18 centred, frame 0,0,0 | body bounds 18 × 18 centred; face 44/56 · 18 wide, 42/56 · 18 high, bottom at −18/56 · 18 | browser `editor` |
| Rules | L steps its sibling | x-chain [L slot, 18 × 18 slot] | sibling frame x = 27 + 1 − (−9) = 37 | unit `model` |
| Rules | L's corner-bl | slot anchored to the L slot at `corner-bl` | anchor at L frame + (−9, −9) | unit `model` |
| Rules | L's corner-tr | as above, `corner-tr` | + (27, 27) | unit `model` |
| Rules | L's center | as above, `center` | + (9, 9), the box centre | unit `model` |
| Rules | Off turns about its origin | Off slot, offset rotation 90°, no pivot | frame x, y equal the unrotated frame's; rot 90 | unit `model` |
| Rules | Off steps by its extent | x-chain [Off slot, 18 × 18 slot] | sibling x = 18 + 1 − (−9) = 28 | unit `model` |
| Rules | Stand-in steps 18 | x-chain [two slots whose part and default part don't resolve] | second x = 19; parts row `stand-in` is the 18 × 18 centred rectangle | unit `model` |
| Rules | L border | group of one L slot, margin 1 | one region; box x −10…28, y −10…28; (18, 18), 9 from both arms, lies outside | unit `model` |
| Rules | Mirrored Off border | Off slot at left frame x −30, root at origin, margin 1 | right border's box x 11…31, left's −31…−11 | unit `model` |
| Rules | Mirrored L placed | L at frame (5, 0, rot 90, mirrored) | each point is translation · rotation · reflection of L's; outer signed area > 0 | unit `model` |
| Rules | Mirrored holed square placed | square with a hole at frame (0, 0, rot 0, mirrored) | outer signed area > 0, hole signed area < 0 | unit `model` |
| Rules | Turned L placed | L at frame (5, 0, rot 90, not mirrored) | points translated and turned, order kept | unit `model` |
| Rules | Hole kept | square 0…10, hole 4…6, distance 0 | the region unchanged, as one `toEqual` | unit `geometry` |
| Rules | Hole shrinks | same, distance 0.5 | outer box −0.5…10.5; hole box 4.5…5.5 | unit `geometry` |
| Rules | Bounding box: L | L | x −9…27, y −9…27 | unit `geometry` |
| Rules | Bounding box: empty | `[]` | x 0…0, y 0…0 | unit `geometry` |
| Rules | Signed area | counter-clockwise unit square; clockwise; 3 collinear points | 1; −1; 0 | unit `geometry` |
| Rules | Well formed: outer 2 / 3 / 4 points | counter-clockwise loops | refused / accepted / accepted | unit `geometry` |
| Rules | Well formed: hole 2 / 3 points | square with a clockwise hole of 2 / 3 points | refused / accepted | unit `geometry` |
| Rules | Well formed: outer area | square counter-clockwise; 3 collinear; clockwise | accepted; refused; refused | unit `geometry` |
| Rules | Well formed: hole area | clockwise hole; 3 collinear; counter-clockwise | accepted; refused; refused | unit `geometry` |
| Rules | Well formed: repeated first point | square whose 5th point equals its 1st | refused | unit `geometry` |
| Rules | Well formed: empty | `[]` | refused | unit `geometry` |
| Rules | Library check: none / one / two / count any | part blueprint declaring 0, 1, 2 `slot-space`s of count `one`, or 1 of count `any` | `…declares exactly one slot-space of count one, found: ` / no problem / `found: one, one` / `found: any` | unit `library` |
| Rules | choc-key 1u / 1.5u | size `1u`, `1.5u` | `slot-space`: centred 18 × 18 / 27 × 18, outer counter-clockwise from (−w/2, −9) | unit `library` |
| Module boundaries | One output given a list | `count: 'one'`, value `[]`; `[7]`; `[1, 2]` | accepted as given, converted once (`check-lane-outputs.spec.ts:13,15,16` flip) | unit `blueprint` |
| Module boundaries | Any output given a bare value | `count: 'any'`, value `7` | refused, naming the output (as today) | unit `blueprint` |
| Module boundaries | Codec: no rows / a row with no regions / holed and two rows | `[]`; `[[]]`; `[[L], [square with a hole]]` | each reads back equal | unit `protocol` |
| Module boundaries | Codec: first loop a hole | packed row whose first loop has hole = 1 | throws `RangeError` | unit `protocol` |
| Module boundaries | Lane check: well formed | the L | accepted, value unchanged | unit `model` |
| Module boundaries | Lane check: not well formed | clockwise square | refused | unit `model` |
| Module boundaries | Lane check: not finite | a point with x `Infinity`; x `NaN` | refused | unit `model` |
| Module boundaries | Lane check: empty | `[]` | refused | unit `model` |
| Module boundaries | Lane check: not regions | `{ w: 18, h: 18 }` | refused | unit `model` |
| Glue | L draws as an L | slot with L at frame 0,0,0 | body bounds 36 × 36 from (−9, −9); (18, 18) is not inside the body | browser `editor` |
| Glue | Slot path | L; a square with a hole; two regions | `d` holds one `M … Z` per loop, in order | unit `editor` |
| Glue | Parts set posts polygons | one choc slot through the real sandbox and pipeline | the posted parts columns hold points `[-9,-9, 9,-9, 9,9, -9,9]`, one loop, not a hole | integration `app` (Decision (Sergii 2026-11-19): moved from `pipeline`, which may not import `model/worker` or `library/worker`, `.dependency-cruiser.mts:113,272-290`; read from the typed arrays, since `app` may not import `protocol`) |

</frozen-after-approval>

## Code Map

- `packages/blueprint/src/lane/check-lane-outputs.ts:28` -- refuse only a non-array for `any`; `pool/blueprint-vm.ts:247-256` `#convert` converts each item only for an `any` output (looks up the contract's count). Specs: `check-lane-outputs.spec.ts:12-21`.
- `packages/schema/src/border.ts` → `polygon-region.ts` -- `polygonRegionSchema`; `layout-output.ts:23` `v.array(polygonRegionSchema)`; `parts-output.ts:5` rows `v.array(v.array(polygonRegionSchema))`; `types.ts:105` `Border` → `PolygonRegion`; `index.ts`.
- `packages/schema/src/testing/border.ts` (+ spec) → `polygon-region.ts` -- `aPolygonRegion` (was `aBorderRegion`) (function), `aSlotSpace({ width = 18, height = 18 })` centred rectangle (function); spec shows both parse. `testing/index.ts`; `parts-output.ts:5` default `[aSlotSpace()]`; `lane-declaration.ts:7` `{ name: 'slot-space', role: 'slot-space', kind: 'shape', count: 'one' }`.
- `packages/geometry/src/` -- `signedArea` (function) from `normalise-polygon-regions.ts:24-31` to `signed-area.ts`; `grow-and-unite.spec.ts:38`'s copy imports it. New `bounding-box.ts` `boundingBox` over every point (function), `Box` in `types.ts`; new `well-formed.ts` `isWellFormed(regions)` (function); `grow-and-unite.ts:23` takes `GrownRegions { regions; distance }` (was `GrownEnvelope`). `boundingBox`, `Box`, `isWellFormed`, `GrownRegions` exported from `index.ts`. New rows in `grow-and-unite.spec.ts` assert whole values; its older boolean-narrowing tests are logged in `deferred-work.md`, not rewritten here.
- `packages/protocol/src/` -- `layout-output/layout-output-codec.ts:42-92` → `polygon-regions/polygon-regions-codec.ts` `packPolygonRegions(rows)` / `readPolygonRegions(columns, row)` (functions); `layout-output/types.ts:15-24` `BorderColumns` → `polygon-regions/types.ts` `PolygonRegionColumns`. Border tests in `layout-output-codec.spec.ts` move to `polygon-regions-codec.spec.ts`, one layout row keeps a border. `parts-output/` codec and types: `{ ids } & PolygonRegionColumns`.
- `packages/model/src/parts/` -- `types.ts:16` `Rectangle` → `SlotSpace`; `parts-lane-calls.ts` `slotSpaceOutputOf` (function) and `convertHandle` using new `is-slot-space.ts` `isSlotSpace` (function); `rectangle-of.ts` → `slot-space-of.ts` `slotSpaceOf` (function); `create-derivations.ts:44-45,75,107-151`; `parts-output-of.ts`.
- `packages/model/src/placement/` -- `types.ts` `PlacedSlotSpace { frame; slotSpace }`, `SlotPart.slotSpace`; `extent.ts` maps every point through its frame; `attach-point.ts` `attachPointAt(attach, box)` (function); `slot-part.ts`; `group-frames.ts:49`.
- `packages/model/src/borders/envelope-corners.ts` (+ spec) → `placed-slot-space.ts` `placedSlotSpace(frame, slotSpace)` (function); `group-borders.ts:30-34`.
- `packages/library/` -- `blueprints-src/choc-key/1.ts`, `compile/check-library-rules.ts:7-16`, `compile/fixtures/two-lanes/helper.ts`; specs `choc-key`, `check-library-rules`, `compile-library`.
- `packages/editor/src/` -- `workspace/layout/types.ts:14-19` `PlacedSlot.slotSpace`; `use-placed-nodes.ts:30`; `CanvasSlot.vue` `<path>` (ref `SVGPathElement`) and face; new `workspace/layout/slot-space-path.ts` `slotSpacePath` (function) over `loopPath`; `group-border/border-path.ts` (+ spec) → `viewport/loop-path.ts` `loopPath` (function; "loop" as the Data Schema's `PolygonRegion` note uses it), `GroupBorder.vue:6,14`; `group-border/tab-point.ts:8` takes `readonly PolygonRegion[]`.
- Specs switching from `{ w, h }`, `w`/`h` columns or `aBorder`: `app/src/{default-key-part,blueprint-inputs,layout-set:85,right-half:115}.spec.ts`; editor `testing/{layout-canvas,layout-rows}.ts`, `group-border/{group-borders,tab-point,use-group-borders}.spec.ts`, layout specs (`switch-grace`, `use-placed-nodes`, `use-pointed-and-selected-nodes`, `use-slot-id-labels`); `pipeline-stages.spec.ts`; `model-worker-lifecycle.spec.ts`; protocol `buffers-of.spec.ts:2,29-35`, `parts-output-codec.spec.ts`; schema `layout-output.spec.ts`, `testing/{layout-output,parts-output}.spec.ts`; model `place-layout`, `group-borders`, `create-derivations` specs.

## Tasks & Acceptance

**Execution:**
- [x] `packages/blueprint` -- count decides; rows.
- [x] `packages/schema` -- region schema, type, builders.
- [x] `packages/geometry` -- `signedArea`, `boundingBox`, `isWellFormed`, `growAndUnite`; rows.
- [x] `packages/protocol` -- shared codec; rows.
- [x] `packages/library` -- choc-key, rule, fixture; rows.
- [x] `packages/model` -- parts, placement, borders; rows.
- [x] `packages/editor` -- `loopPath`, placed slot, path, face; browser rows in Chromium and Firefox.
- [x] remaining specs.

**Acceptance Criteria:**
- Given Corney, when it loads, then key frames, border counts and canvas keys are unchanged.
- Given a part declaring the L, when placed, then it steps, attaches, borders and draws as the table says.

## Implementation Notes

- Decision (build): the Layout canvas fits the viewport to the union of the registered key bodies (`useCanvasItemsRoot` now returns a reader of `CanvasItems.allBounds()`), not the keys group's `getBBox()`, because Firefox grows a group's `getBBox()` by a child's CSS transform (measured: 18 × 18.964 for an 18 × 18 key with its face), which broke the 1u fit row in Firefox only; the bodies' own `getBBox()` is exact in both browsers.
- Decision (build): the face row measures the body with `getBBox()` and the face with `getBoundingClientRect()` mapped back through the key's screen CTM, not both by client rect, because Firefox counts the stroke into a stroked path's client rect (and `getBBox()` ignores CSS transforms, so the face needs the client rect; the face has no stroke).
- Decision (build): the stand-in's 18 × 18 slot space is a constant in `model/src/parts/stand-in-slot-space.ts`, not the inline literal in `create-derivations.ts`, because AGENTS.md says "tokens, errors and `define*` factories each get their own file".
- Decision (build): the lane-check rows live in `parts-lane-calls.spec.ts` against `convertHandle` (the rule's home), and `create-derivations.spec.ts` keeps two wiring rows (accepted, refused as `lane-failed`), not the whole table twice.
- Decision (build): the Corney "every posted choc row" row is in `app/src/default-key-part.spec.ts` on `createDerivations` with the real sandbox, not on the posted packed set in `layout-set.spec.ts`, because `app` may not import `protocol` (`.dependency-cruiser.mts`'s `app` list has no `protocol`; the plan says "no package-graph change"); the codec's round trip is proven in `protocol` and `pipeline`.
- Toggled bugs (for the PR), each restored byte-identical (`cmp`) and green again: skipping the mirror reversal in `placedSlotSpace` turned both mirrored rows red; packing every parts row as empty turned `pipeline-stages.spec.ts`'s read-back row red; dropping the face's `translate` turned the 1u canvas key row red; drawing only each loop's first 4 points in `slotSpacePath` turned "draws an L slot space's body over its bounding box…" red; converting by `Array.isArray` instead of the count turned "converts a one output given a list once" red, and never converting item by item turned "converts each item of an any output" red (both browsers); growing choc-key's half height by 0.5 mm (library rebuilt, then rebuilt after restore) turned the Corney sandbox row in `default-key-part.spec.ts` red; fitting to the keys group's `getBBox()` again turned "drops the hint and fits once a set draws a key" red in Firefox.
- Decision (build): the fit's watch tracks `CanvasItems.registrations` (a count that only grows) and measures `allBounds()` inside the callback after its guards, not `allBounds()` as a watch source, because a source would measure every key on every slots change and resize.
- "Parts set posts polygons" (moved to `app` by Sergii): `app/src/default-key-part.spec.ts` > "posts a choc slot's parts row as its centred 18 × 18 mm keycap, one counter-clockwise loop" runs one choc slot through the real model worker (sandbox and pipeline) and reads `ModelWorkerLifecycle.parts`' `ids` (the choc run, `key@` + the hash of `{ size: '1u' }`) and packed columns directly (`rowLoops` [0, 1], `loopPoints` [0, 4], `loopHole` [0], `points` [-9,-9, 9,-9, 9,9, -9,9]), since `app` may not import `protocol`; the ids tell it from the app-defined stand-in, which has the same four points. Toggled bugs: packing every parts row as empty in `packPartsOutput` turned it red; making `slotSpaceOf` answer no slot space, so every slot stands in, turned it red. Each restored byte-identical (`cmp`) and green.
- Real-host run: no spec in the diff adds a fake of a third-party host (`git diff <baseline> -- '*.spec.ts' | grep -E "^\+.*(fake|Fake|vi\.fn|stub|Stub)"` prints nothing); Clipper, QuickJS and both browsers run real in the rows that rely on them.
- Full-suite note: the last complete `pnpm test` had one Firefox failure, `group-borders.spec.ts` > "after the pointer leaves a group's row and crosses slot rows…" (`locator.hover` timeout 3646 ms); it passed twice in isolation; a confirming full rerun was stopped by the system for low memory.

## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer; 0 test-reviewer findings dropped for quotes): high 0, medium 2, low 8, false 1, maybe-false 1.

| Lens | Finding | Verdict | Route | Evidence / action |
|---|---|---|---|---|
| quick | `pipeline-stages.spec.ts:293-339` doesn't meet the frozen "Parts set posts polygons" row (FakeRunner, ready-made 22.728 row, not a choc slot) | medium | patch | Read the test: it reuses the fake-runner pipeline test, so no choc slot runs. Patch: a pipeline test with a real `LaneRunner` and `libraryData`, as `app/src/default-key-part.spec.ts` does, reading the posted row back with `readPartsRow` as the centred 18 × 18 rectangle. |
| quick | No green full suite | false | reject | My `pnpm test` after the implementer returned: 901 files, 6736 tests passed, exit 0, Firefox `group-borders.spec.ts` included. |
| quick | Toggled bugs recorded for only three rows | medium | patch | Plan's Manual checks ask for each browser and integration row; missing: L draws as an L, the two `blueprint-vm.browser.spec.ts` rows, the Corney sandbox row, the viewport fit, and the new pipeline test. |
| quick | `LayoutCanvas.vue:59-66` measures every key (`getCTM`, `getBBox`) on every watch trigger, for the canvas's life | low | patch | `drawnBounds` is a watch source, so `CanvasItems.allBounds()` (`canvas-items.ts:45-48`, `#union` reads every item) runs on each `slots` change (every command) and resize, and a new `Option` each time. Patch: measure in the callback after the guards; the source is a cheap tracked read that changes when keys register. |
| quick | Comments restating code (`loop-path.ts:3`, `slot-space-path.ts:5`, `use-canvas-items-root.ts:8`, `well-formed.ts:6-7`, `GrownRegions`) | low | patch | AGENTS.md "no restating a signature". Delete them. |
| test-reviewer | `reads back %s as packed`: the `no rows` row (`expect(roundTrip(rows)).toEqual(rows)`) can't fail | low | patch | `roundTrip([])` never calls the reader. Drop the row; `packs no rows into one offset per offset column` covers it. |
| test-reviewer | `draws %s as one closed subpath per loop, in order`: `HOLED_SQUARE` has a 3-point outer | low | patch | Give it a 4-point outer and a matching expected `d`. |
| test-reviewer | `draws an L slot space as an L, leaving its notch out of the body` asserts bounds and corner too | low | patch | Rename to claim the bounds and the notch. |
| test-reviewer | `drawnBox`'s `BOX_DIGITS = 2` comment assumes whole-pixel client rects | maybe-false | reject | Would only be low; settled by checking whether `getBoundingClientRect` returns fractional values in both browsers at the test's size. |
| test-reviewer | `app/src/{layout-set,right-half}.spec.ts` count `output.points.length` (floats), not rows | low | patch | Count rows as `output.rowLoops.length - 1`. |
| test-reviewer | `refuses %s`: the `NaN` row can't isolate the finite check | low | patch | Valibot `v.number()` refuses NaN (`v.is(v.number(), NaN)` → `false`, run in planning). Keep the row; its comment says it guards the schema's refusal. |

Pass 2 (quick, test-reviewer, on the diff since pass 1; 0 dropped): high 0, medium 2, low 4, false 2.

| Lens | Finding | Verdict | Route | Evidence / action |
|---|---|---|---|---|
| quick, test-reviewer | `app/src/default-key-part.spec.ts:172-195` passes without the sandbox: no `ids` asserted, and the stand-in row has choc-key 1u's exact points | medium | patch | `stand-in-slot-space.ts` and `choc-key/1.ts` both give `(-9,-9) (9,-9) (9,9) (-9,9)`; `create-derivations.ts:147,151` posts the stand-in when choc fails. Patch: assert the choc run id. |
| quick | Dropping `['no rows', []]` breaks the frozen row "Codec: no rows" | medium | patch | The frozen table lists `[]` reading back equal; pass 1's low tautology finding doesn't outrank it. Restore the row. |
| quick | `is-slot-space.ts:9` says the schema takes NaN | low | patch | `v.is(v.number(), NaN)` → `false`. Correct the comment. |
| quick | Numbers in test names (`LayoutCanvas.spec.ts:228`, `default-key-part.spec.ts:172`) | low | patch | AGENTS.md "numbers go in parameters or `expected*` constants". Rename by role. |
| quick | `polygon-regions-codec.spec.ts:19-33` hole is counter-clockwise | false | reject | Shoelace of `(4,4) (4,6) (6.25,6)`: 8 − 13.5 + 1 = −4.5, area −2.25, clockwise as the Data Schema requires (my patch order was wrong; the implementer checked and left it). |
| quick | Fit doesn't re-run on root registration | false | reject | The root's `watchEffect` belongs to `LayoutCanvas`, which flushes before its children's `useCanvasItem` effects in the same post flush; "drops the hint and fits once a set draws a key" passes in both browsers, and its toggled bug went red. |

Pass 3 (quick, test-reviewer, on the diff since pass 2; 0 dropped): high 0, medium 0, low 2. Nothing above low and no frozen line broken: the review ends; lows logged, not patched.

| Lens | Finding | Verdict | Route | Evidence / action |
|---|---|---|---|---|
| quick, test-reviewer | `polygon-regions-codec.spec.ts:42` `['no rows', []]` can't fail (`roundTrip([])` never calls the reader) | low | carried | Same location and claim as pass 1's row; kept for the frozen "Codec: no rows" row (pass 2); `packs no rows into one offset per offset column` covers packing. A later fix: count rows from `columns.rowLoops.length - 1` in `roundTrip`. |
| quick | `LayoutCanvas.spec.ts:230` and `default-key-part.spec.ts:173-174` comments restate their literals | low | logged | AGENTS.md "Write a comment only for a why the code can't say". |

## Design Notes

Nothing visible changes on Corney: choc keycaps are rectangles centred on their frames. The new drawing shows only in the L browser row (`LayoutCanvas.spec.ts`); `pnpm dev` with Corney shows the same keys as before.

## Conformance Log

Pass 1 (two readers, union; 0 dropped) and gap review (0 dropped):
- `Put code in the package that owns the concept` / AD-16 "normalise-and-check… in `geometry`" (region checks in `model`): fixed, `isWellFormed` in `geometry`.
- Data Schema "a loop does not repeat its first point" missing from the lane check: fixed, decision and row.
- `Give every threshold three rows…`: fixed, hole, 2-point hole, zero-area hole, `boundingBox([])`, `signedArea` rows.
- Code Map path of `tab-point.ts` and the `aBorder` users: fixed.
- `A choice no requirement made is a decision…` (mirror reversal, loop inflation, hole drawing, bounding box): fixed, decisions added.
- Untagged `slotSpaceOutputOf`: fixed.
- `place-slot.ts:36-43` and "AD-10 line 667" mis-cited: fixed (`place-slot.ts:6-12`, `read-offset.ts`, AD-22).
- Stand-in row didn't arrange the default part: fixed.
- `Prove a test Stryker can't reach… with a toggled bug`: fixed, manual check.
- `count: 'one'` refuses an array (`check-lane-outputs.ts:28`), which blocks `PolygonRegion[]`: fixed, blueprint decision and rows.
- `helpers over one concept share a file` (`border-path.ts` duplicated): fixed, `loopPath`.
- `no expected value computed the way production computes it` (`grow-and-unite.spec.ts:38` copies `signedArea`): fixed, it imports the function.
- `Test a rule where it is defined` (border tests in `layout-output-codec.spec.ts`): fixed, they move with the codec.
- `Build schema values… with the concept's test builder` (`aBorder`'s replacement): fixed, `[aPolygonRegion(…)]`.
- valibot `v.number()` accepts `Infinity` (`node -e "v.is(v.number(),Infinity)"` → `true`): fixed, `isSlotSpace` checks finiteness.
- gap: `app/src/layout-set.spec.ts:85`, `app/src/right-half.spec.ts:115`, schema and protocol specs, `envelope-corners.spec.ts`, `testing/border.spec.ts`, `layout-output/types.ts`: fixed, listed.
- gap: `geometry/src/index.ts` exports: fixed.
- gap: `choc-key/1.ts` edited without a version bump: fixed, decision citing AD-5 "library versions are mutable".
- gap: mirror reversal and multi-loop path untested: fixed, rows.
- gap: `isSlotSpace` not reaching 14.7's fixed runs: fixed, it is a `model` function the parts lane can call for them; library-build checks of `LibraryPart` stay 14.7's.
- gap: L and Off states reachable (`Arrange only a state real commands could reach`): fixed, any library part blueprint returning them (AD-5), noted above the table.
- gap: Corney row's oracle: fixed, `key-centres.test.ts` goldens, `layout-set.spec.ts:112-123` counts, AD-5 sizes.

Final pass (one reader):
- `Give every threshold three rows…` (hole closing at exactly distance 1, a Clipper result no requirement states): fixed, the closing rows dropped; the work relies on holes shrinking, now distance 0 and 0.5.
- `add empty input` for a one output and the lane check: fixed, rows.
- `"X, not Y, because Z"` (mirror reversal, column names, `GrownRegions`, exports, `isWellFormed` shape): fixed.
- Precedent `grow-and-unite.spec.ts` (`repeatsFirst: outer.at(-1)?.x === …`, boolean narrowing) against `assert whole values`: deferred.
- Untagged `loopPath`, `attachPointAt`: fixed.
- `helpers over one concept share a file` (`aSlotSpace` in `testing/polygon-region.ts`): not changed, because the spine's Test builders row says "A builder's file takes its schema file's name", and a slot space has no schema of its own (it is `PolygonRegion[]`).
- `loopPath` against the glossary: fixed, noted where the word comes from.

Final-pass fixes no reviewer has read: all of the above under "Final pass".

## Verification

**Commands:**
- `pnpm build:library && pnpm typecheck && pnpm check:fast` -- expected: clean.
- `pnpm test` -- expected: all pass, Chromium and Firefox included.

**Manual checks:**
- Toggled bug for each browser and integration row: break the code it covers (skip the mirror reversal, drop the face shift, pack rows as before), watch the row go red, restore, and record it in Implementation Notes for the PR.
