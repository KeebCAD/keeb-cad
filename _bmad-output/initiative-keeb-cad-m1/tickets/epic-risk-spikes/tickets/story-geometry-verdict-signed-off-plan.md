---
title: 'Geometry verdict signed off'
type: 'feature'
ticket: '12'
created: '2026-10-28'
status: done
baseline_revision: '35b70704493239794bcd88c7d28c071af0943d52'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** AD-16 depends on makerjs doing arc booleans correctly, and nobody has checked that. Story 11 only showed makerjs rebuilding Corney, which Ergogen already builds with makerjs. LambBT's r = 150 mm concave cut, the coincident and tangent cases, and the open makerjs issues #509, #377, #387 and #477 are still untested. No geometry verdict exists either (R5, R8).

**Approach:** In `spikes/`, add `circle` and `subtract` to the story 11 shape model. Test makerjs on a LambBT-style polygon minus a circle of r = 150 mm, plus edge cases. Check the results against an independent exact polygon-minus-circle reference, with clipper2-ts as a third opinion. Measure latency, then write the geometry verdict from these results and story 11's for the user to sign off.

## Boundaries & Constraints

**Always:**
- Decision (2026-10-28, user): the reference is A. A LambBT-scale splayed polygon is authored in `spikes/`, with the circle placed the LambBT way (r = 150, `shift: [-13, -188]` from the middle-bottom key's pose). The expected exact boundary comes from our own polygon-minus-circle routine, not from Ergogen. No Ergogen run, no network.
- Exact check: `compareSegments(expected, toSegments(makerjs))` (after `mergeCollinear`). Flattened check: `flattenedDeviation` against the expected segments, at tol 0.005. Both use 0.05 mm, inclusive.
- clipper2-ts cross-check: subtract a 0.001 mm-flattened circle from the polygon. The symmetric deviation between its result and makerjs's flattened result is ≤ 0.05.
- Latency: median and max over ≥ 20 builds (evaluate + flatten) on the page's main thread, after a warm-up, as in story 11.
- When makerjs fails a case, record it as a finding with its workaround, or with a recommendation to switch to clipper2. Never hide it.
- The verdict goes in `_bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/geometry-verdict.md`. It states: makerjs kept or clipper2 adopted (with the loss of exact arcs), accuracy per case, latency, the fixed flatten function and tolerance, an issue-by-issue table (#509, #377, #387, #477), the AD-16 change list for `bmad-architecture`, and a draft dated Decision line for the epic's Notes.

**Never:** No edits to the epic or ticket files; the user adds the sign-off line. No edits to the architecture document (the changes are listed for `bmad-architecture`). No changes outside `spikes/`, the verdict and this plan. No new dependency. makerjs output is never hand-patched, and no tolerance is loosened.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| LambBT cut | Splayed polygon − r 150 circle | Exact and flattened checks pass. One closed chain, arc centre and radius within 1e-6 | Test prints `formatItemComparison` |
| Arc through a vertex | Circle passes exactly through a polygon vertex | Matches the reference. No zero-length or duplicate segment | Finding recorded |
| Tangent outside | Circle touching one edge from outside | Polygon comes back unchanged (same segments) | Finding recorded |
| Concentric re-cut | (polygon − circle) − the same circle | Same as a single cut (idempotent) | Finding recorded |
| #377 coincident edges | 100² box − 50² box sharing its top and right edges | L-shape, 6 lines, no leftover split segments | Finding plus workaround tested |
| #509 stray lines | r 402.7 circle − triangle whose right edge is vertical | Every output segment lies on the true boundary, closed chains only | Finding recorded |
| #387 offset | `model.outline` of Corney's PCB outline at +1.45 mm (wall + tolerance) | No throw. Every flattened point is 1.45 ± 0.05 mm from the source. Time reported | Finding plus time |
| Negative control | Circle centre moved 0.06 mm | The exact check fails | Proves the check can fail |
| Latency | `?outline=lambbt` page | `#result` shows median and max ms | Status `failed` |

</frozen-after-approval>

## Code Map

- `spikes/src/outline-shapes.ts`: `Shape` union, `evaluate` (makerjs `combineUnion`, `chain.fillet`), and `place` for vertices. Add `circle` (an anchored centre and a radius) and `subtract` (`combineSubtraction`). Keep Corney's behaviour unchanged.
- `spikes/src/flatten.ts`: `toSegments`, `flatten`, `flattenedDeviation`, `mergeCollinear`, `distanceToSegment` and `arcGeometry`. Reuse them all. `toSegments` must handle full circles if makerjs ever emits one.
- `fixtures/src/pcb-geometry.ts`: `compareSegments`, `formatItemComparison`, `PCB_TOLERANCE`. Import by relative path, as `outline.test.ts` does.
- `spikes/src/outline.test.ts`: a pattern to copy (story 11 tests, Corney model helper, sweep table).
- `spikes/src/main.ts`: the `?outline` branch. Extend it to take the value `lambbt`. `spikes/e2e/outline.spec.ts` follows the network-blocked spec pattern.
- `clipper2-ts` is already a dependency (used by `custom-router.ts`). See its imports there.
- Corney expand distance: `case_wall_thickness` 1.2 + `pcb_to_case_wall_tolerance` 0.25 (`fixtures/corney-island/source/config.yaml` lines 87–88, 588).
- LambBT source: `_bmad-output/layout-model/sources/lambbt.yaml`. Splay table in `sources/README.md` §B; `board` at lines 149–190; `pcb: [+board, -cutout_circle_small]` at line 349. Its `stack` polygon and `fillet: 1` may be simplified, as long as the polygon keeps the scale and splay.
- `spikes/README.md`: add `## Geometry verdict cases (story 12)` after the story 11 section (line 629 on).

## Tasks & Acceptance

**Execution:**
- [x] `spikes/src/outline-shapes.ts`: add the `circle` and `subtract` shapes, `LAMBBT_POSES` and `LAMBBT_OUTLINE_SHAPES`.
- [x] `spikes/src/circle-cut.ts`: `subtractCircle(polygon, centre, r)`, the exact reference. It handles vertices on the circle and tangency with a 1e-9 epsilon. Also `clipperSubtract(...)` for the cross-check.
- [x] `spikes/src/circle-cut.test.ts`: one test per matrix row except Latency. Also unit tests of `subtractCircle` on hand-computed cases (a square cut by a circle through two known points).
- [x] `spikes/src/main.ts` and `spikes/e2e/outline.spec.ts`: add `?outline=lambbt` and a spec that prints its latency.
- [x] `spikes/README.md`: a story 12 section with per-case results, latency and findings.
- [x] `geometry-verdict.md`: the verdict, as specified in Always.

**Acceptance Criteria:**
- Given `spikes/`, when running `pnpm --dir spikes verify`, then it exits 0, and story 11's tests still pass.
- Given the verdict, when read, then each makerjs issue has an outcome (reproduced or not, its impact and its workaround), and the verdict follows from the recorded numbers.
- Given the finished work, when presented, then the user reads the verdict and either signs it off or asks for changes (HITL).

## Implementation Notes

- LambBT poses: `lambbtPoses()` transcribes Ergogen v4's column layout (no Ergogen run). The fifth `board` vertex, a two-step anchor, is the pose `board_thumb_rise`. `fillet: 1` is dropped. The polygon is simple (no self-intersection), 9149 mm².
- Negative control: the centre is moved 0.06 mm along y, the arc's normal at its middle. A 0.06 mm move along x slides the circle almost along its own top and passed both checks, which is correct geometry, not a weak check.
- Tangent outside: makerjs splits the touched edge at the touch point. The test asserts the raw split (the finding) and that `mergeCollinear` gives back the 15 board segments.
- #377 and #387 "as is" tests assert that the bug reproduces (they go red if makerjs changes). Their workaround tests assert a pass. #387 also measures clipper2 `inflatePathsD` as the alternative.
- `flatten.ts` additions: `toSegments` emits whole circles, `flatten` and `sampleSegment` handle them, and `fromSegments` is the inverse of `toSegments` (used by the #387 workaround).
- `?outline` with no value is still Corney. The e2e spec runs both outlines.
- Review fixes:
  - The `?outline` build now runs `toSegments` → `mergeCollinear` → `flatten`, which is the verdict's pipeline.
  - #387: the offset alone is timed, with the input built outside the timer. A flat model with the split kept isolates the split as the cause. The `_backplate_outline` zero-loop result is asserted. An outward area check is added.
  - A mounting-hole case shows that makerjs leaves an inner circle whole.
  - The #377 claims are scoped to the one configuration tested.

## Plan Change Log

## Review Triage Log

### Pass 1 (quick) — high 0, medium 7, low 2, false 0, maybe-false 0

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | Verdict says "makerjs never needed [clipper2] for a boolean" despite #377 failing | medium | patch | Confirmed: the same doc records #377 as a reproduced fail. Fix: reword the keep reasoning around the guard and the workaround. |
| 2 | Closed-chain guard claimed sufficient from one #377 configuration | medium | patch | Confirmed: only the two-shared-edge case is tested. Fix: state the limit and hand other coincident cases to epic-shapes-and-plates. |
| 3 | #387 cause (split edge) not isolated from model flattening | medium | patch | Confirmed: the workaround applies merge and `fromSegments` flattening together, and the plate control differs too. Fix: add an unmerged `fromSegments(toSegments(...))` control and drop the untested backplate claim. |
| 4 | #387 timings include the Corney model build | medium | patch | Confirmed: `timed` closures call `corneyModel()`, and clipper2's also calls `flatten`. Fix: build the inputs outside `timed`. |
| 5 | Latency page omits the `mergeCollinear` the verdict prescribes | medium | patch | Confirmed: `main.ts` `build` is evaluate → flatten only. Fix: include the merge. |
| 6 | Summary and Decision line quote medians only; max 28.4 ms > 16 ms frame | medium | patch | Confirmed in the verdict text. Fix: state median and max. |
| 7 | AD-16 item 3 asserts makerjs keeps whole circles; never observed | medium | patch | Confirmed: no test feeds a makerjs whole circle through the new branches. Fix: add an inside-hole test and state what was observed. |
| 8 | `worstOffsetError` unsigned; an inward offset would pass | low | patch | Confirmed: it uses `Math.abs(dist − 1.45)` and checks no direction. Fix: assert the area grows (one direct assertion). |
| 9 | Stale header and docstrings in `outline-shapes.ts` and `flatten.ts` | low | patch | Confirmed: they name only Corney, polygon/add/fillet, and lines/arcs. Direct correction. |

## Design Notes

- **Why our own reference:** Ergogen's outline is makerjs too. An exact reference that is short and hand-tested is the only independent check. clipper2 adds a third, flattened opinion.
- **#477** (slow union on many shapes) is answered by latency. Story 11's Corney union took 1.7 ms. The verdict states the scale at which the O(n²) union would matter (for example, many cutouts on a plate) and flags it for the plates epic. It is not tested here.

## Verification

**Commands:**
- `pnpm --dir spikes test` -- expected: all pass. The case results are printed.
- `pnpm --dir spikes verify` -- expected: exit 0. The LambBT latency is printed.
- `git status --short` -- expected: changes only under `spikes/`, plus the verdict and this plan.
