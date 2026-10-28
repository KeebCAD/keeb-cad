---
title: 'Geometry verdict'
epic: epic-risk-spikes
stories: ['11', '12']
date: '2026-10-28'
status: 'signed off 2026-10-28'
covers: [R5, R6, R8]
---

# Geometry verdict

**Verdict: keep makerjs** as AD-16's single shape evaluator, with exact paths. Two conditions
apply. Every boolean result is normalised and checked: collinear lines are merged, and a chain
that does not close is a typed error. Offsets do not use makerjs: they run in clipper2 on the
flattened polygon.

makerjs is within ±0.05 mm on both of the epic's cases (R5). On Corney's outline, built from
model shapes, the error is 1.0e-7 mm. On the LambBT r = 150 mm subtraction, checked against our
own exact reference, it is 1.6e-7 mm. On the main thread, Corney's outline builds in a median
of 1.7–6.9 ms with a max of 2.6–28.4 ms, and LambBT's in a median of 0.6–0.7 ms with a max of
1.3–4.6 ms. The 28.4 ms max, on a loaded machine, is more than a 16 ms frame.

makerjs does fail one boolean: #377, where a cutter shares two whole edges with the shape, gives a
wrong, open result. The closed-chain check detects that failure in the tested configuration, and
an authoring workaround avoids it: extend the cutter past the shared edges. clipper2 is not
adopted because it would trade that failure for losing every exact arc, which the PCB Edge.Cuts
and the KiCad export rely on. Its flattened booleans agreed with makerjs within 0.0074 mm. The
flatten function and tolerance are fixed (R6).

Evidence: `spikes/README.md`, sections "makerjs rebuilds Corney's outline (story 11)" and
"Geometry verdict cases (story 12)". Tests: `spikes/src/outline.test.ts`,
`spikes/src/circle-cut.test.ts` and `spikes/e2e/outline.spec.ts`. `pnpm --dir spikes verify`
exits 0.

## Accuracy per case

Tolerance is 0.05 mm, inclusive. The exact check runs `compareSegments` on makerjs paths after
`mergeCollinear`. The flattened check runs `flattenedDeviation` at tol 0.005 mm and gives an
upper bound.

| Case | Reference | Exact (max) | Flattened (upper bound) | Outcome |
|---|---|---|---|---|
| Corney wired `_pcb_outline` (story 11) | Ergogen Edge.Cuts, 37 segments | 1.0e-7 mm, 37 / 37 | 0.0071 mm | pass, after one collinear join |
| Corney wireless (story 11) | the same outline | 1.0e-7 mm | 0.0071 mm | pass |
| LambBT board − r 150 circle | `subtractCircle` (own, exact) | 1.6e-7 mm, 16 / 16. Arc centre and radius within 5e-13 | 0.0074 mm | pass |
| clipper2 third opinion (LambBT) | clipper2 `differenceD`, circle at 0.001 | — | vs makerjs 0.0074 mm; vs reference 0.0035 mm | pass: all three agree |
| Arc through a vertex | `subtractCircle` | 15 / 15, shortest path 2.83 mm, no duplicate | — | pass |
| Tangent outside | the unchanged board | raw: one edge split at the touch point. After `mergeCollinear`: 15 / 15 | — | pass after the merge (finding) |
| Concentric re-cut | the single cut | 16 / 16 | — | pass (idempotent) |
| #377 coincident edges (two whole shared edges, the only configuration tested) | the L, 6 lines | wrong and open; `model.simplify` does not fix it | — | **fail** (finding). The workaround passes |
| Mounting hole (r 1.1 circle wholly inside LambBT) | `subtractCircle` (a hole) | 16 / 16: 15 lines + 1 whole circle path | within 0.05 mm, 2 loops | pass |
| #509 stray lines | `circleMinusPolygon` plus an on-boundary test | 5 / 5, 2 closed loops, nothing off the boundary | — | pass, not reproduced |
| #387 offset +1.45 mm (Corney) | distance to the source outline, plus an outward area check | — | as is, or flat with the split kept: 1.44 mm off (broken). Merged first: 0.0050 mm, outward | **fail as is** (finding). The workaround passes |
| Negative control (circle 0.06 mm off) | `subtractCircle` | fails, 0.176 mm | 0.060 mm (fails) | the checks can fail |

## Latency

Builds on the page's main thread (Chromium headless), 30 builds after 5 warm-ups.

| Outline | Build | Median | Max | Vertices |
|---|---|---|---|---|
| Corney `_pcb_outline` (2 unions, fillet) | evaluate + flatten (story 11, six runs) | 1.70–6.90 ms | 2.60–28.4 ms (the 28.4 on a loaded machine, load average about 11) | 115 |
| Corney `_pcb_outline` | evaluate + `toSegments` + `mergeCollinear` + flatten (story 12, two runs) | 2.20–2.35 ms | 4.20–5.30 ms | 114 |
| LambBT `pcb` (polygon − circle) | evaluate + `toSegments` + `mergeCollinear` + flatten (story 12, two runs) | 0.60–0.70 ms | 1.30–4.60 ms | 57 |

Offsets (Node, Corney, 10 runs, the offset alone, input built outside the timer): makerjs
`model.outline` takes 71 ms median and 81 ms max, even with the workaround. clipper2
`inflatePathsD` of the already-flattened outline takes 1.5 ms median and 3.3 ms max.

Median builds fit a 16 ms frame on the main thread. The max does not always: under load,
Corney's reached 28.4 ms, nearly two frames. A makerjs offset never fits. The live latency
target (architecture Deferred) should be set on the max, not the median, and the evaluator
should be ready to move off the main thread if it misses.

## Flatten function and tolerance (fixed)

- **Tolerance: 0.005 mm**, the maximum chord deviation (sagitta). It uses a tenth of the
  0.05 mm budget. 0.001 mm doubles the vertex count for no gain at this budget, and 0.01–0.025 mm
  saves only 30–47 vertices on Corney while using a fifth to a third of the budget (story 11
  sweep).
- **Function**: `flatten(segments, tol)`. It chains the segments into closed loops, keeps
  lines, and turns each arc into `n = ceil(|sweep| / (2·acos(1 − tol/r)))` equal chords, ends
  exact. A full circle is its own loop of `chordCount(r, 2π, tol)` chords. Its input is the
  evaluator's output after `mergeCollinear`, so a split edge never adds a vertex (story 11 found
  one such vertex in Corney's 115).

## makerjs issues

The cases are the plan's (story 12). ☝️ This spike did not check them against the upstream
GitHub threads (it ran with no network). Each row names the case tested.

| Issue | Case tested | Reproduced? | Impact on keeb-cad | Workaround |
|---|---|---|---|---|
| #509 stray lines after a subtraction | r 402.7 circle − triangle whose vertical right edge crosses the circle | **No.** 5 paths, all on the true boundary, 2 closed loops, exact against the reference | None seen | None needed. The evaluator's closed-chain check (below) would catch a stray line |
| #377 coincident edges | 100² box − 50² box sharing its top and right edges. Only this configuration was tested | **Yes.** 8 paths, open chain. The shared edges stay and the cutter's inner edges are added. `model.simplify` leaves the shared edges | A plate or outline cutout that is flush with an edge gives a wrong shape. Likely when a user aligns a cutout with the board edge, such as a notch | Tested: extending the cutter 10 mm past the shared edges gives the exact L. In production, `model.resolve` checks that every result chain closes and reports a typed error (such as `shape-boolean-failed`, naming the shapes). That check caught the tested configuration, whose result is open. It is not shown to be enough: one shared edge or a partial overlap might give a closed but wrong shape (see Limits) |
| #387 `model.outline` (offset) | Corney `_pcb_outline` expanded by 1.45 mm (case wall 1.2 + tolerance 0.25) | **Yes.** Six small loops round single corners and no outer loop (1.44 mm off). The cause is story 11's collinear split from the union, not the nested model. The same paths in one flat model with the split kept fail the same way, and merging the split alone fixes it. `_plate_outline` (no split) offsets cleanly, and `_backplate_outline` (split) gives no loop. About 70 ms | Any case or wall offset of a union-built outline | Tested: `mergeCollinear` then `fromSegments` before `model.outline` gives one outward loop within 0.005 mm, but the offset alone still takes about 71 ms. **Recommended**: clipper2 `inflatePathsD` on the flattened outline (round joins), within 0.0044 mm in 1.5 ms. The case stage needs polygons anyway (AD-18) |
| #477 slow union of many shapes | Not tested (plan) | — | Corney's two unions take 1.7 ms in all. makerjs's combine tests every path against every other path, O(n²), so cost grows with the square of the path count. It would matter for a plate with many cutouts combined one by one: about 50 switch cutouts of 4 paths each is about 200 paths, and every subtraction rescans the growing result | **Flagged for epic-shapes-and-plates**: measure a 50-key plate early. Mitigation: a cutout wholly inside the outline needs no boolean, because it is an extra closed loop (a hole). Only cutouts that cross the outline need `combineSubtraction` |

Other makerjs behaviour found:

- A union splits an edge where the other shape's vertex lies on it (story 11).
- A tangent circle splits the touched edge at the touch point (story 12).
- Both are fixed by `mergeCollinear`, which joins lines that share an end within 1e-6 mm and run
  the same way within 1e-6 rad. It never drops or invents a segment.
- `chain.fillet` leaves near-collinear corners sharp, as Ergogen does.
- makerjs rounds intersection points to about 1e-7 mm.

## Limits of this evidence

- 📐 **#377 was tested in one configuration**: a cutter sharing two whole edges with the shape,
  where makerjs's result is open. A cutter sharing a single edge, or overlapping an edge only in
  part, was not tested. Either might give a closed but wrong shape, which the closed-chain check
  would not catch. These cases go to epic-shapes-and-plates, to test before relying on the
  check, and to compare against clipper2 there.

- 📐 **Arc against arc is barely covered.** LambBT's `fillet: 1` was dropped, as the plan
  allowed, so the r = 150 circle cuts only straight edges. The only arc-on-arc cases are the
  concentric re-cut and the two arcs of #509, which all lie on one circle. A cut through a fillet
  arc (two different circles) is untested. epic-shapes-and-plates should add one case before it
  relies on it.
- LambBT's key poses come from our own transcription of Ergogen v4's layout, not from an Ergogen
  run (Decision 2026-10-28). That does not affect the accuracy check, because the reference and
  makerjs are given the same polygon. It does mean "LambBT-style", not "LambBT exactly".
- The latencies come from one machine and a handful of runs. The Corney max varied from 2.6 to
  28.4 ms with machine load.

## AD-16 change list (for `bmad-architecture`)

1. Under Rule, "single shape evaluator, using `makerjs`": keep it, and add that `model.resolve`
   normalises every boolean result with a collinear merge. Lines sharing an end within 1e-6 mm and
   running the same way within 1e-6 rad are joined. The merge never drops or invents a segment.
2. Add a typed failure. After each boolean, every chain of the result must close. If one does not
   (makerjs #377: coincident edges), `model.resolve` reports `shape-boolean-failed`, naming the
   shape and its operands, and never outputs the shape. The check is shown for one #377
   configuration only (two whole shared edges). Single-shared-edge and partial-overlap cutters
   are untested and may need a stronger check; epic-shapes-and-plates tests them.
3. The resolved shape type stays exact paths (lines, arcs, circles). Observed: when a circle lies
   wholly inside the shape it is cut from (a r 1.1 mounting hole in LambBT), makerjs's
   `combineSubtraction` returns it as one whole circle path, not as arcs. It matches the exact
   reference and flattens to its own loop. The flatten function must therefore take full circles.
4. Flatten: fix the one flatten function exported by `model` at tolerance **0.005 mm** maximum
   chord deviation, with the chord-count formula above, run after the collinear merge. This
   closes the "Flatten tolerance value" row in Deferred.
5. Offsets (case wall, tolerances): they are not evaluated by makerjs `model.outline` (#387:
   broken by split edges, and about 70 ms). An offset is a polygon operation: the stage flattens
   at its boundary, then offsets with clipper2 `inflatePathsD` using round joins and an arc
   tolerance of 0.001 mm. Cross-reference AD-18's offset operation.
6. Plates (the AD-16 plate rule): a part cutout wholly inside the plate shape is added as a hole
   loop with no boolean. Only cutouts that cross the outline are subtracted (#477 mitigation),
   pending the plates epic's measurement.
7. Deferred: remove the "Geometry spike" row, which is answered by this verdict. Record that
   arc-against-arc booleans (a cut through a fillet), the #377 single-edge and partial-overlap
   cases, and #477 at plate scale move to epic-shapes-and-plates.

## Decision line for the epic's Notes

> - Decision (2026-10-28, geometry verdict, stories 11–12): makerjs stays AD-16's single shape evaluator with exact paths. Corney's outline is within 1.0e-7 mm, and LambBT's r = 150 mm subtraction is within 1.6e-7 mm of an independent exact reference. Main-thread builds take a median of 0.6–6.9 ms and a max of 1.3–28.4 ms; the 28.4 ms max under load is more than a 16 ms frame, so the live latency target is set on the max. The flatten tolerance is fixed at 0.005 mm. Boolean results are collinear-merged and must close, or they are a typed error. makerjs #377 was reproduced (two shared edges, an open result). The single-edge and partial-overlap cases are untested. Offsets run in clipper2 on flattened polygons (makerjs #387 reproduced, caused by collinear splits, about 70 ms). #509 was not reproduced. #477, arc-on-arc cuts and the remaining #377 cases move to epic-shapes-and-plates. AD-16 changes go to `bmad-architecture` (`geometry-verdict.md`). Signed off by the user on 2026-10-28.
