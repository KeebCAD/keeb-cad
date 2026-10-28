---
review: adversary
target: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
scope: update 2026-10-28 (AD-16 merge, closed-chain check, whole circles, shape offset, flatten, plate hole loops; AD-18 case offset; Violations `shape-boolean-failed`; Deferred rows)
evidence: _bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/geometry-verdict.md, spikes/src/flatten.ts, spikes/src/circle-cut.ts, spikes/src/circle-cut.test.ts
date: 2026-10-28
method: for each hole, two units one level down that each obey every AD to the letter and still build incompatible software
---

# Adversarial review: the 2026-10-28 geometry update

## Verdict

**Not build-ready for epic-shapes-and-plates and epic-tray-case. One tightening pass fixes it; nothing has to be redesigned.** The verdict is applied faithfully: makerjs stays the evaluator, the merge epsilon, the flatten formula and the tolerance are copied exactly, and the Deferred rows record the limits honestly. The holes come from where the new rules are placed, not from what they say:

1. **Plate composition has no owner.** AD-16 says what a plate is, but not whether `model` or `plates` runs the cutout booleans. If `plates` runs them, a second makerjs evaluator appears, and it cannot report `shape-boolean-failed`, which `model` owns.
2. **The flattened output has no shape.** `flatten` returns loops with no orientation, no outer/hole roles and no order (the spike's `flatten` returns `Point[][]`). Every consumer (plates DXF/gerber, case clipper2, replicad sketch, SVG preview) re-derives the nesting its own way.
3. **Merge and the closed-chain check run "after every boolean", not on every resolved shape.** Unmerged shapes still reach offset and flatten, and the one failure the offset was measured to have (#387) produces closed loops, which the check cannot see.
4. **There are now two offset implementations with two corner-style vocabularies.** That brings back the "disagreeing on one offset" problem that AD-16's Prevents line exists to stop.
5. **The rules don't say what failure means downstream.** Nobody defines what a stage receives for a shape that was "not output", or which export slices that blocks.

Severity scale (as in the 2026-10-25 review): **critical**: the units can't be integrated, or a golden fixture can't pass, without an architecture change. **High**: they integrate but give wrong outputs or lose work. **Medium**: divergent behaviour that tests catch late. **Low**: cosmetic.

---

## A. Who evaluates plates, and with what

### A1. Plate composition has two possible owners. **Critical**
- **Units:** `model` (resolve) and `plates` (stage).
- **Build 1:** The `model` team reads AD-10 ("shared derivations live in `model.resolve`: shapes") and AD-16 ("single shape evaluator ... no stage re-evaluates a shape"). It treats a plate as *not a shape*: a plate is a named definition (glossary), so `resolve` emits the plate's shape plus a list of resolved cutouts per role. The `plates` team reads AD-16's last bullet ("a plate is its shape minus the part cutouts ... Every other cutout is subtracted") as the plates stage's own job, since AD-10 types `PlatesOutput` as a stage output and AD-11 lists plates as a live stage. It calls makerjs `combineSubtraction` itself.
- **Build 2:** The `model` team computes the plate geometry in `resolve` (the memlog Decision says "Binds model, plates"), so `plates` only packages it.
- **Clash:** In build 1, `plates` imports makerjs, which the Structural Seed lists only under `model`. It runs booleans outside the merge and closed-chain wrapper. When a flush cutout hits #377, the failure can't be reported: `shape-boolean-failed` is `model`'s kind, and "a stage reports only its own kinds". So `plates` either throws (forbidden: "design problems never throw") or invents a new kind. The two builds also disagree on what the `PlatesOutput` cache key hashes (AD-11).
- **Tightening (AD-16 + AD-10):** "`model.resolve` evaluates every plate: shape, minus the selected cutouts, under the same merge and closed-chain wrapper as any shape boolean. The resolved design carries each plate as a resolved region set (see B1). The `plates` stage never imports makerjs; it only converts to output form. dependency-cruiser forbids `makerjs` outside `model`."

### A2. PCB and drc edges don't follow the plate rule. **High**
- **Units:** `pcb` (Edge.Cuts, NPTH) and `drc` (edge clearance), with `exports` (the plate gerber "uses the same writer as the PCB", AD-15).
- **Build 1:** `pcb` applies the hole-loop rule to part cutouts with target `pcb` (for example an `mcu-window`): interior ones become extra Edge.Cuts loops, and ones that cross the outline are subtracted.
- **Build 2:** AD-16 states the hole-loop and subtract rule **for plates only**. So `pcb` writes every pcb-target cutout as its own Edge.Cuts loop, including one that crosses the outline. That gives KiCad overlapping edge loops, and the shared gerber writer then emits an invalid board edge.
- **Clash:** `drc` measures edge clearance against the outline alone, or against the outline plus loops, depending on which build it follows. A route that `drc` passes then fails KiCad's own DRC, or the reverse.
- **Tightening (AD-16):** "`model.resolve` also produces the **board edge** of each board: the outline minus the pcb-target cutouts, by the plate rule. `pcb`, `drc` and the edge layer in `exports` read only that board edge. No stage combines the outline with cutouts itself."

### A3. "Strictly inside" and "touches" have no tolerance. **High**
- **Units:** `model`/`plates` (the classifier) and `exports` / `case` (consumers of flattened loops).
- **Build 1:** The classifier tests "strictly inside" exactly: zero distance counts as touching, and 1e-9 mm counts as inside. A screw cutout 0.003 mm from the plate edge (an anchored vertex plus an expression can produce one) is added as a hole loop.
- **Build 2:** Each consumer flattens at 0.005 mm. The hole circle's chords lie inside its true arc, and the outline's chords lie inside its true arc. Near a concave outline arc, the flattened hole loop can cross the flattened outline. DXF then carries intersecting loops, clipper2 in the case reads them with its fill rule and gets a different region, and gerber gets an edge that crosses itself. These are exactly the "overlapping hole loops" that AD-16's Prevents line rules out.
- **Clash:** The two units are separated by epsilon (1e-6 mm in the merge, 0 in the classifier, 0.005 mm in flatten), and no AD links those three values.
- **Tightening (AD-16):** "A cutout is a hole loop only if its distance to the plate boundary and to every other cutout is greater than 2 × flatten tol (0.01 mm), measured on exact paths in `model`. Otherwise it is subtracted. Two cutouts closer than that are united before the subtraction." State whether user cutout shapes ("plus any user cutout shapes") follow the same rule. The current wording ("plus") reads as adding geometry, not removing it.

### A4. Subtraction order is unstated, so output bytes depend on the build. **Medium**
- **Units:** two `model` builds.
- **Build:** one subtracts crossing cutouts in catalogue order, another in side-qualified slot-id order. makerjs results (path order, start points, and which edge a split lands on before the merge) depend on operand order. Both are deterministic, so the "Stable outputs" convention holds within each build. Golden files still differ between the builds, and changing the order later rewrites every DXF.
- **Tightening (AD-16):** "Cutouts are subtracted in ascending side-qualified id order. Resolved loops are emitted in a canonical order and start point (see B1)."

---

## B. The shape of the data `flatten` returns

### B1. Loops carry no orientation, no outer/hole role and no order. **Critical**
- **Units:** `case` (clipper2 `inflatePathsD`, then replicad) and `exports` (DXF, SVG, plate gerber), with the `editor` preview.
- **Evidence:** the spike's `flatten(input, tol): Point[][]` returns bare loops. The spine says only "a full circle becomes its own loop".
- **Build 1:** `case` assumes `flatten` gives the outer loop CCW and holes CW (y up, AD-7). It calls `inflatePathsD(..., EndType.Polygon)`, which uses orientation to decide which way is outward. That grows the outer loop and shrinks the holes.
- **Build 2:** `flatten` emits loops in whatever direction makerjs's `findChains` walks them, and makerjs's whole-circle hole comes out CCW like the outer loop. clipper2 then grows the screw hole too. The case wall offset (AD-18) closes the screw boss. `exports` (DXF) is unaffected, since DXF doesn't care about winding, so the plate passes its golden test while the case fails.
- **Clash:** each consumer re-derives nesting, a second geometric evaluation that AD-16 forbids in spirit. The SVG preview (`fill-rule`) does it a third way.
- **Tightening (AD-16):** define the resolved shape type as **regions**: `Region = { outer: Loop, holes: Loop[] }`, where a loop is closed exact paths. Outer loops are CCW and holes CW in model coordinates. Loops are sorted (outer first, then by start point lexicographically), and each starts at its lowest-x, then lowest-y vertex. `flatten(region) → { outer: Point[], holes: Point[][] }` keeps both. A stage that reverses y (AD-7) re-orients at its own boundary.

### B2. `flatten(paths, tol)` lets each stage pick its own tolerance. **High**
- **Units:** `exports` (SVG) and `case`.
- **Build:** `exports` passes `tol = 0.01` "for SVG, which is only a picture". `case` passes 0.005. Both call "the one flatten function", which is all AD-16 requires, since `tol` is a parameter. The plate SVG and DXF now differ, and the acceptance tolerance budget (±0.05 mm) is spent differently per output.
- **Tightening (AD-16):** "`flatten(region)` takes no tolerance. `FLATTEN_TOL = 0.005 mm` is a constant inside `model`." Or keep the parameter and add a lint rule that bans any value other than the exported constant. The first option is simpler.

### B3. The input is "merged paths", but only boolean results are merged. **High**
- **Units:** `model` (shape evaluation) and `case` / `exports`.
- **Build:** a user authors a polygon whose vertices 2, 3 and 4 are collinear (anchored vertices often line up; Corney's union split is the same situation). The `model` team merges only "after every boolean", as written, so this polygon is not merged. AD-16 says a stage flattens "on merged paths", so the `case` team merges first, writing its own merge because `model` exports none. The `exports` team doesn't, and keeps an extra vertex. Worse, a shape `offset` of that polygon runs on unmerged paths, which is the exact #387 trigger.
- **Tightening (AD-16):** "Every resolved shape (primitive, boolean or offset result) is merged and closed-chain-checked before `resolve` outputs it. The resolved shape type guarantees that it is merged and closed; stages never merge." Remove "on merged paths" from the stage-facing sentence, since it becomes a property of the type.

---

## C. Offset: two engines, two corner vocabularies, one unguarded failure

### C1. A shape offset's #387 failure gives closed loops, which the closed-chain check can't see. **High**
- **Units:** `model` (offset) and every consumer of the outline.
- **Evidence:** verdict, #387 row: the broken result is "six small loops round single corners and no outer loop". Every one of those loops is closed.
- **Build:** the `model` team runs the closed-chain check "after every boolean", as written. Offset is not a boolean, so nothing is checked. Even if they extend the check to offsets, the loops close and it passes. The outline becomes six corner blobs, the PCB edge is wrong, and no violation is raised.
- **Clash:** AD-16 now claims to prevent "a wrong boolean result passed on silently". It still lets a wrong offset through silently, and offset is the operation with the reproduced failure.
- **Tightening (AD-16):** "After an offset, `model` checks that the result has the same number of outer regions as its input, that its signed area moved in the direction of the offset sign, and that every resulting vertex lies within tol of |d| from the source. If any check fails, it reports `shape-boolean-failed` (rename it `shape-op-failed`, or add `shape-offset-failed`)." Also say whether "after every boolean" covers fillet, which is part of the offset operation in the glossary.

### C2. Corner styles: makerjs joints and clipper2 JoinType are different enums. **High**
- **Units:** `model` (shape offset, makerjs `model.outline`, whose `joints` parameter takes 0 round, 1 pointed, 2 beveled) and `case` (clipper2 `JoinType`: Round, Square, Bevel, Miter with a miter limit).
- **Build:** `model` defines the authored corner style as `round | sharp | bevel` and maps `sharp` to makerjs pointed, which has no limit. `case` maps `sharp` to `JoinType.Miter` with clipper2's default miter limit of 2, which squares off any corner sharper than about 60°. Corney's thumb-cluster outline has such corners. A shape offset and a case offset of the same outline, both "sharp", now differ by millimetres at those corners. The spine also doesn't state clipper2's `precision` argument: its default is 2 decimals, which snaps the case to a 0.01 mm grid, against 6 in the spike (`CLIPPER_PRECISION = 6`).
- **Tightening (AD-16 + AD-18):** "`model` owns one corner-style enum, `round | sharp | bevel`, with one mapping table to makerjs and clipper2. `sharp` = unlimited miter (clipper2 Miter with miterLimit ≥ 1e3) or a stated limit used by both. clipper2 runs at precision 6 (1e-6 mm, matching the merge epsilon) with arc tolerance 0.001 mm." Put the mapping in `model`, so `case` imports it instead of writing its own.

### C3. One geometric offset can be authored two ways. **High**
- **Units:** `library` (the `tray` template) and an epic-shapes-and-plates story.
- **Build 1:** the `tray` template authors the wall as a case `offset` operation of the outline (clipper2, polygonal, in the case worker).
- **Build 2:** a shapes story authors `case-outline` as a shape `offset` of the outline (makerjs, exact, in `model`), which the plate or a PCB keep-out also reads. The template's extrude references it.
- **Clash:** both satisfy every AD. Wall clearance and plate-to-case fit are now computed by two engines that differ by up to the flatten tolerance plus the precision grid. Worse, a user switching between the two gets a different body for "the same" design. This breaks the principle "one way to do each thing", and AD-16's Prevents line ("plate, PCB edge, case ... disagreeing on one offset").
- **Tightening (AD-18):** "A case `offset` applies only to geometry that no other stage reads (walls, clearances inside the case). An offset that a plate, the PCB or drc also needs is a shape offset, and the case references the shape." Or the reverse: forbid shape offsets of the outline in M1. Pick one and say which.

---

## D. Failure semantics: `shape-boolean-failed` vs stages and AD-15

### D1. "Not output" has no representation that stages receive. **High**
- **Units:** `case` (interpreter) and `plates`.
- **Build 1:** `model` drops a failed shape from `resolved.shapes`. The `case` interpreter looks up the shape id an `extrude` references, gets `undefined`, and throws, which violates "design problems never throw". Or it skips the operation, so a body silently disappears and the 3D viewer shows a case missing a wall as current.
- **Build 2:** `model` keeps the id with `{ status: 'failed' }`. `plates` emits an empty plate.
- **Clash:** "the shape and its dependents are not output" names dependents through the dependency graph. The glossary's graph covers anchors, shape references, construction inputs and parameters, but **not** plates or case operations. So a plate or a case op that references a failed shape is not a "dependent", and nothing says it is suppressed.
- **Tightening (Violations + AD-16):** "A failed shape stays in the resolved design as `{ id, failed: true }`, with no geometry. Plates, board edges and case operations that read it, directly or through another case operation, are dependents. A stage outputs nothing for a dependent and raises no violation of its own; the `model` violation names the cause." This is the same pattern as `construction-undefined`, so write it once for both.

### D2. AD-15's "slice it reads" and the KiCad escape hatch when the outline fails. **Medium**
- **Units:** `pipeline` (export gate) and `pcb` (KiCad writer).
- **Build:** the outline hits #377. AD-15 blocks gerber, plates and case (their slices read the outline). The KiCad board "exports whatever resolved". One `pcb` build writes a board with no Edge.Cuts, which KiCad opens but can't fabricate or DRC. Another falls back to the last good outline, which AD-11's "last good output" pattern allows for stage outputs but which is stale geometry exported as current. Both obey the spine.
- **Tightening (AD-15):** "When the outline is failed, the KiCad board is written without Edge.Cuts and the export reports `blocked: shape-boolean-failed` as a warning on the dialog. It never falls back to a stale outline." Also say that firmware export (which reads no shapes) is not blocked by a shape failure.

### D3. The ids for a plate-cutout boolean failure aren't defined. **Low**
- **Units:** `model` and `editor` (selection from a violation).
- **Build:** "ids name the shape and its operands". For a failed plate subtraction the operand is a part cutout, which has no id form in the Ids convention (it is a side-qualified slot + component? + role). One build names `left/k-3`, another `left/k-3.switch`. Editor selection from the warning lands on different things.
- **Tightening (Ids):** add a cutout id form, for example `<side>/<slot-id>.cutout.<role>`, and the plate id for a plate result.

---

## E. Caching and versions

### E1. A geometry-kernel change doesn't change any cache key. **Medium**
- **Units:** `pipeline` (cache) and `model` (flatten, merge, makerjs version).
- **Build:** AD-11's key is stage id + stage version + catalogue versions + resolved-slice hash. The case solid is cached in browser storage across app updates. An update changes `FLATTEN_TOL`, the merge epsilon, the clipper2 version or makerjs. The resolved exact paths are unchanged, so the slice hash is too, and so is the `case` stage version. The cache returns the old STEP. AD-11's Prevents line ("cache false hits after an app update") is broken for the case worker.
- **Tightening (AD-11):** "The cache key includes a `geometry kernel version` exported by `model` (makerjs version, merge epsilon, flatten tol, offset mapping), plus the clipper2 version for `case`." Or simply the app build id for persisted entries.

### E2. Do booleans run once and get reflected, or run per side? **Low**
- **Units:** two `model` builds.
- **Build:** one evaluates shapes on the left and reflects the result (AD-6: "shapes are reflected together"). Another reflects the operands and evaluates per side. makerjs's numerics differ (about 1e-7 mm). A boolean could fail on one side only, and the violation id would need a side, which the `shape-boolean-failed` text doesn't give.
- **Tightening (AD-16):** "Shapes are evaluated once in authored coordinates, and the result is reflected. Shape violations carry unqualified shape ids."

---

## F. Notes (not holes)

- ☝️ The `shape-boolean-failed` check is necessary but, as the Deferred row admits, not sufficient (#377 with one shared edge may close and still be wrong). Nothing marks a design that could hit an *undetected* failure. A cheap guard: an area-sanity check after every subtraction, where the result area must be ≤ the minuend area and ≥ minuend − subtrahend. It catches "closed but wrong" in most of those cases without clipper2.
- The Deferred row for shape-offset latency is right, but AD-11 lists `resolve` as live and AD-2 sends every gesture update through it. One outline with an offset makes each drag frame about 70 ms. Consider stating now that an offset shape is resolved at committed revisions only, and shown stale during a gesture. That reuses AD-11's stale marking and needs no new mechanism.
- 📐 The update fixed what the spikes measured (Corney, LambBT outlines). The incompatibilities above sit almost entirely in what the spikes **didn't exercise**: plates with many cutouts, holes going through clipper2, corner styles other than round, and failure propagation. The plates and case epics will hit them first.
