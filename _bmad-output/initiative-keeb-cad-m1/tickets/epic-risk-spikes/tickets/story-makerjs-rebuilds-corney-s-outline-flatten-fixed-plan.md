---
title: "makerjs rebuilds Corney's outline, flatten fixed"
type: 'feature'
ticket: '11'
created: '2026-10-28'
status: 'built'
baseline_revision: '2425cd0f9733b03a3e3f511846ea4bd2669170fe'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** AD-16 makes makerjs the single shape evaluator with exact paths, and leaves the flatten function and tolerance to this spike. Nobody has shown makerjs rebuilding Corney's outline from model shapes within ±0.05 mm, or measured how long that takes on the main thread (R5, R6).

**Approach:** In `spikes/`, describe Corney's `_pcb_outline` as AD-16 model shapes: polygons of anchored vertices, two line-intersection construction points, an add, and a 0.5 mm fillet. Evaluate them with makerjs into exact paths, then flatten. Compare both the exact paths and the flattened polyline against the wired and wireless Edge.Cuts fixtures. Time the build on a browser main thread, and record deviations, latency and the chosen tolerance in the README.

## Boundaries & Constraints

**Always:**
- Shapes are data: `polygon` (vertices), `add`, `fillet` and `shape-ref` by id. A vertex is an anchor (a point name) plus a shift taken in the anchor's frame. A construction point is the intersection of two lines. One evaluator turns the shapes into makerjs exact paths.
- Do not replay Ergogen's outline code. Anchor point poses come from `points.yaml`, because layout is not this spike's job. The two `aggregate: intersect` points (`mcu_cover_bottom_left`, `plate_additional_outline_bottom_left`) are computed as construction points and checked against `points.yaml`.
- Frame: Ergogen points are y-up. They map to KiCad as `(x, −y)`. Tolerance is 0.05 mm, inclusive.
- Exact check: makerjs paths become entry 2's `Segment`s (line, or arc as start/mid/end). `compareSegments(loadOutline(design), candidate)` must pass for both designs.
- Flatten: there is one `flatten(paths, tol)`. Lines stay as they are. Each arc gets `n = ceil(sweep / (2·acos(1 − tol/r)))` equal chords, so chord deviation ≤ tol. The flattened check is the symmetric max distance between the flattened polyline and the fixture's exact outline. It is measured both ways, densely enough to bound the true value.
- Tolerance: start at 0.005 mm. A sweep records vertex count, flattened deviation and flatten time for each value. The README records the chosen value and why.
- Latency is median and max over ≥ 20 builds (evaluate + flatten) on the page's main thread in headless Chromium, after a warm-up.

**Never:** No LambBT circle subtraction or geometry verdict (that is entry 12). No change outside `spikes/`, apart from this plan. No new dependency. Mismatches are not hidden by loosening the tolerance, and makerjs output is not hand-patched. A failure is recorded as a finding.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Exact outline | Corney shapes, wired and wireless | `compareSegments` passes: 37 segments, each deviation reported | On failure, the test prints `formatItemComparison` |
| Construction points | Two intersect points | Each lies within 0.01 mm of `points.yaml` | Fails, naming the point |
| Parallel lines | Construction point from parallel lines | Typed `construction-undefined` result, no throw | Dependents are not evaluated |
| Flattened outline | tol 0.005, both designs | Symmetric deviation ≤ 0.05 mm. Every chord stays within tol of its arc | Fails, naming the worst arc |
| Flatten bounds | Arc r 0.5, 90°, tol 0.005 | Chord count as the formula gives; max chord sagitta ≤ tol | — |
| Moved vertex (negative control) | One vertex shifted 0.06 mm | Exact and flattened checks both fail | Proves that both checks can fail |
| Latency | `?outline` page | `#result` reports median and max ms, plus vertex count | Status `failed` with the error |

</frozen-after-approval>

## Code Map

- `fixtures/corney-island/source/config.yaml` (lines 508–620) is the source of truth for the shapes:
  - `_matrix_outline` is an 18-vertex polygon. Its shifts use `ks = kp = 19` (the `choc_v2` preset extends `choc_v1` with `u`).
  - `_plate_outline` is the matrix outline plus a 5-point polygon.
  - `_backplate_outline` adds the 4-point `_backplate_additional_outline`.
  - `_pcb_outline` is `_backplate_outline` with `fillet: fillet_radius` (0.5).
  - The intersect points are defined at lines 363–394.
- `fixtures/corney-island/ergogen/points/points.yaml` holds the anchor poses `{x, y, r}` (y-up). `spikes/` has no YAML dependency, so imitate the line parser in `keysOf` (`spikes/src/corney.ts`). It is loaded there as `?raw`.
- `fixtures/corney-island/ergogen/outlines/_matrix_outline.yaml`, `_plate_outline.yaml`, `_backplate_outline.yaml` and `_pcb_outline.yaml` are Ergogen's makerjs exports of each step. Use them to debug the intermediate shapes only. The acceptance check is Edge.Cuts.
- `fixtures/src/kicad-pcb.ts`: `readKicadPcb`, `Segment`. `fixtures/src/pcb-geometry.ts`: `compareSegments`, `formatItemComparison`, `PCB_TOLERANCE`, `segmentDeviation`.
  - Import these by relative path (`../../fixtures/src/...`), as `src/shapes.ts` and `src/drc.test.ts` do.
  - In tests and the browser, read the PCBs through `CORNEY` in `src/corney.ts` (`?raw`). Do not use `corney-pcb.ts`, which uses `node:fs`.
  - `compareSegments` only pairs segments of the same kind, so it cannot judge the flattened polyline.
- `spikes/src/main.ts` is the query-param dispatcher that writes `#result` and `data-status`. Add an `?outline` branch. `spikes/e2e/corney-cap.spec.ts` shows the pattern for the network-blocked spec and reading `ms`.
- `spikes/src/deps.ts` holds the makerjs smoke import. `spikes/tsconfig.json` covers `src` without Node globals (`typeRoots`).
- `spikes/README.md` writes up each story as a section with a dated `### Results`. Add `## makerjs rebuilds Corney's outline (story 11)` after the story 10 section.

## Tasks & Acceptance

**Execution:**
- [x] `spikes/src/outline-shapes.ts`:
  - Shape and vertex types, and `readPoints(pointsYaml)`.
  - `CORNEY_OUTLINE_SHAPES`, transcribed from the config.
  - `resolveConstruction(...)`.
  - `evaluate(shapes, id, points)`, which returns a makerjs model or a typed `construction-undefined`.
- [x] `spikes/src/flatten.ts`:
  - `toSegments(model)`, which converts makerjs paths to KiCad-frame `Segment[]`. Arc mid is at the mid-angle.
  - `flatten(model | segments, tol)`, which returns the polyline loop(s).
  - `flattenedDeviation(reference: Segment[], polyline)`, the symmetric max distance.
- [x] `spikes/src/outline.test.ts`: one test per I/O matrix row except Latency, for both designs. It also covers the tolerance sweep (0.001, 0.005, 0.01, 0.025), printing a table of vertices, deviation and ms.
- [x] `spikes/src/main.ts`: an `?outline` branch that warms up, then runs ≥ 20 builds on the main thread and shows `{status, medianMs, maxMs, runs, vertices, tol}`.
- [x] `spikes/e2e/outline.spec.ts`: network-blocked like `corney-cap.spec.ts`. It asserts `solved` and an empty log, and prints the latency.
- [x] `spikes/README.md`: a story 11 section covering the shape model, deviations (exact and flattened, per design), latency, the tolerance sweep, the chosen tolerance, and any makerjs quirks found.

**Acceptance Criteria:**
- Given `spikes/`, when running `pnpm --dir spikes verify`, then it exits 0, and the new vitest and Playwright tests pass among the others.
- Given the README section, when read, then it states, per design, the exact and flattened max deviation, the main-thread median and max ms, and the fixed flatten tolerance with its rationale.

## Implementation Notes

- The union `combineUnion(_plate_outline, _backplate_additional_outline)` splits the top edge at `mcu_cover_top_left` (205.113, 52.99): 38 makerjs paths. Handled per the Collinear splits note with `mergeCollinear` (one join), recorded in the README. The fixture's other collinear-looking corner (224.518, 113.997) is 3.8e-5 rad off straight and is not merged.
- `points.yaml` is exposed as `CORNEY_POINTS` from `src/corney.ts` for the `?outline` page.
- Results: exact max deviation 1e-7 mm; flattened at tol 0.005: 0.0046 mm (upper bound 0.0071), 115 vertices; main thread median 1.7 ms, max 2.6 ms (spec alone). Chosen tol 0.005.

## Plan Change Log

## Review Triage Log

### Pass 1 (quick) — high 0, medium 0, low 5, false 0, maybe-false 0

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | Exact test logs only the max deviation; matrix says each is reported | low | patch | Confirmed: per-item deviations only reach the assertion message on failure. Fix: log `formatItemComparison` on pass. |
| 2 | Flattened deviation failure names a point, not the worst arc | low | rejected | True, but the point locates the arc on the board and the separate chord check names the arc index; mapping the point to a segment adds a helper for a failure not seen in use. |
| 3 | Chord check re-flattens via `worstChord` and never inspects the judged `loops` | low | patch | Confirmed: a mis-splice in `flatten` would be caught only by the 0.05 mm bound. Fix: assert the loops' own `polylineToReference` ≤ tol. |
| 4 | Collinear join count is only logged | low | patch | Confirmed: a new makerjs split would merge silently, leaving the README's "exactly one join" unchecked. Fix: assert one join at (205.113, 52.990). |
| 5 | README "One command" summary omits the outline test and spec | low | defer | Pre-existing drift: stories 4–10 also left that section unchanged; recorded in deferred-work.md. |

## Design Notes

- **Why exact comparison first:** AD-16's resolved type is exact paths. If makerjs paths match the fixture segment for segment, then flatten error is the only extra error, and it is bounded by tol.
- **Collinear splits:** a union may split one fixture line in two. If that happens, record it, merge collinear neighbours (within 1e-6 rad and 1e-6 mm) before `compareSegments`, and say so in the README. Do not drop or invent segments.
- ☝️ **Ergogen itself uses makerjs.** A pass shows that makerjs reproduces Corney when driven from our shape model. It does not test makerjs on unusual arc booleans; entry 12's LambBT case covers that.

## Verification

**Commands:**
- `pnpm --dir spikes test` -- expected: all pass, and the sweep table is printed.
- `pnpm --dir spikes verify` -- expected: exit 0, and the outline spec prints the median and max ms.
- `git status --short` -- expected: changes only under `spikes/` plus this plan.
