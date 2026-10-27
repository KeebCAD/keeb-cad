---
title: 'Harness compares outline, cutouts and footprints'
type: 'feature'
ticket: '2'
created: '2026-10-27'
status: 'built'
baseline_revision: 'a5b186817eb46dfe373f7424337e6b2285c63258'
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

**Problem:** The Corney harness (entry 1) compares key poses only. R1 also needs outline vertices and arcs, plate cutouts and footprint positions within ±0.05 mm, for wired and wireless; entry 4 needs a `.kicad_pcb` reader and entry 11 an outline comparison.

**Approach:** Add a small `.kicad_pcb` reader (s-expression parser plus extraction of Edge.Cuts graphics and footprints) to `@keeb-cad/fixtures`, loaders for the committed Ergogen PCBs, and data-to-data comparisons that report every item's deviation and fail by item name, in the style of `key-centres.ts`.

## Boundaries & Constraints

**Always:** Read only the committed fixtures; no regeneration. Frame is KiCad's (mm, y down, rotation in degrees as written in `(at x y r)`); Ergogen points map to it as `(x, −y)`. Tolerance 0.05 mm per point, inclusive, Euclidean.
- Outline: the design's `.kicad_pcb` Edge.Cuts (`gr_line`, `gr_arc` start/mid/end, `gr_circle` centre/radius). A segment's deviation is the max distance over its defining points (circle: centre and |Δradius|), direction-insensitive. Segments are matched geometrically (nearest same-kind candidate), not by index, so a makerjs candidate (entry 11) may order them differently. Unmatched candidate segments are extra.
- Plate cutouts: `frontplate.kicad_pcb` Edge.Cuts chained into closed loops; the loop with the largest bounding box is the plate edge, every other loop (21 switch cutouts, 5 screw holes) is a cutout. A cutout is named after the nearest Ergogen point to its centroid (e.g. `matrix_middle_home`), else its centroid. Shared by wired and wireless.
- Footprints: every footprint in the design's `.kicad_pcb`, keyed by its `Reference` (unique per file). Position checked as centre distance; side (`F.Cu`/`B.Cu`) must match. Decision (2026-10-27): rotation is checked in mm too, as `|Δr| (rad) × reach` against 0.05 mm, where reach is the distance of the footprint's farthest pad (its `(at x y)`) from the footprint origin; reach travels with each footprint.
- Failures name the item; missing, extra and duplicate items fail too (never silently ignored).

**Never:** No case or tray dimensions. No production code importing fixtures (AD-10). No parsing of tracks, zones or pad shapes; pads only for their position. No new runtime dependency besides what `fixtures` already has.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Identity | Candidate = reference, wired and wireless | Outline, cutouts, footprints all pass | No error expected |
| Outline vertex | One line's endpoint moved 0.06 mm | Fails, naming that segment and its deviation | Only that segment fails |
| Cutout | One switch cutout moved 0.06 mm | Fails, naming the cutout by key name | — |
| Footprint | One footprint (e.g. `S1`) moved 0.06 mm | Fails, naming `S1` | — |
| Rotated footprint | One switch footprint's r changed so its reach moves 0.06 mm | Fails, naming it | — |
| At tolerance | Any item moved exactly 0.05 mm | Passes | — |
| Reversed segment | Line given end→start | Passes | — |
| Missing / extra | Candidate drops a segment, cutout or footprint, or adds one | Fails, naming each | — |

</frozen-after-approval>

## Code Map

- `fixtures/src/key-centres.ts` -- style to follow: `load*` / `compare*` / `format*`, `DEFAULT_TOLERANCES`, inclusive `EPSILON = 1e-9`, `FIXTURE_DIR`, `DESIGN_PCB` (reuse it; don't redefine paths), `readYaml` for `points/points.yaml`.
- `fixtures/corney-island/ergogen/pcbs/corney_island.kicad_pcb`, `corney_island_wireless.kicad_pcb` -- 18 `gr_line` + 18 `gr_arc` on Edge.Cuts each (same `_pcb_outline`); 101 / 75 footprints, refs unique, `(at x y [r])` with r optional, `(layer "F.Cu")`, `(property "Reference" "S1" …)`. Graphics are one-liners like `(gr_arc (start …) (mid …) (end …) (layer Edge.Cuts) …)` — layer may be quoted or bare; the parser must accept both.
- `fixtures/corney-island/ergogen/pcbs/frontplate.kicad_pcb` -- Edge.Cuts: 102 `gr_line`, 18 `gr_arc`, 5 `gr_circle`.
- `fixtures/corney-island/ergogen/points/points.yaml` -- Ergogen point names for naming cutouts (y negated into KiCad frame).
- `fixtures/src/index.ts` -- re-exports; add the new modules.

## Tasks & Acceptance

**Execution:**
- [x] `fixtures/src/kicad-pcb.ts` -- `parseSexpr(text)` (lists, atoms, quoted strings with escapes); `readKicadPcb(text)` → `{ edgeCuts: Segment[], footprints: Footprint[] }` with `Segment = line | arc | circle` and `Footprint = { reference, library, side, x, y, r, reach }`. Pure: no fs, no fixture paths — entry 4 reuses it.
- [x] `fixtures/src/pcb-geometry.ts` -- `segmentDeviation`, `chainLoops(segments)` (endpoint tolerance 1e-3 mm; throws on an open chain), `compareSegments` and `compareCutouts` (geometric matching), `compareFootprints` (by reference), each returning `{ pass, items: {name, deviation, pass}[], missing, extra, duplicate }`, plus one `formatItemComparison`. Entry 11 reuses `compareSegments`.
- [x] `fixtures/src/corney-pcb.ts` -- `loadOutline(design)`, `loadPlateCutouts()`, `loadFootprints(design)` from the committed files.
- [x] `fixtures/src/corney-pcb.test.ts` -- one test per I/O matrix row, both designs; counts (36 outline segments, 26 cutouts, 101 / 75 footprints); asserts the 0.06 mm failure messages name the item.
- [x] `fixtures/src/kicad-pcb.test.ts` -- parser: nesting, quoted strings with escaped quotes, bare vs quoted layer, `(at x y)` without rotation.
- [x] `fixtures/src/index.ts` -- export the new modules.

**Acceptance Criteria:**
- Given the committed fixtures, when running `pnpm vitest run --project @keeb-cad/fixtures`, then it passes for wired and wireless.
- Given the repo, when running `pnpm check`, then it passes.

## Implementation Notes

- Geometric matching is exclusive: all same-kind (reference, candidate) pairs with a finite deviation are sorted by deviation and paired greedily, each candidate used once. A reference left without a candidate is `missing` (so a dropped segment or cutout reports as missing, not as a large deviation against a neighbour's candidate); an unpaired candidate is `extra`; a candidate coinciding (≤ 1e-9 mm) with an earlier one is `duplicate`. Cutouts with different segment counts never pair.
- Outline names count per kind from 1: `outline line #1 at (x, y)` (anchor = start, circle centre). Extra candidates are `candidate <kind> #<n> at (x, y)` / `candidate cutout at (x, y)`.
- A cutout's "centroid" is its bounding-box centre; it is named after the nearest unused Ergogen point within 0.5 mm. All 21 switch cutouts get their key name and the 5 screw holes their `screw_pcb_*` name.
- `chainLoops` follows the nearest endpoint and never lets a single line/arc close on itself: `frontplate.kicad_pcb` has a degenerate 0.0002 mm arc at (204.083, 52.990) that would otherwise become a 27th "cutout". The plate edge is 36 segments.
- `readKicadPcb` throws on any top-level Edge.Cuts graphic other than `gr_line`/`gr_arc`/`gr_circle`, rather than dropping it. Footprint `fp_*` graphics on Edge.Cuts are not part of the outline.
- Footprint items report `deviation = max(position, rotation)` with position, Δr, reach, rotation and side in the detail; `PCB_TOLERANCE = 0.05` (named apart from `DEFAULT_TOLERANCES` to avoid an `index.ts` export clash).
- `fixtures/src/fixture-files.ts` (internal, not re-exported) now holds `FIXTURE_DIR`, `readFixture`, `readYaml`, shared by `key-centres.ts` and `corney-pcb.ts`.

## Plan Change Log

- 2026-10-27: outline count corrected from 36 to 37. Both design PCBs have 19 `gr_line` + 18 `gr_arc` on Edge.Cuts (two lines meet without an arc near (224.518, 113.997)); the test asserts 37.

## Review Triage Log

**Pass 1 (quick):** high 0, medium 0, low 3, false 0; patch 1, rejected 2.

| Finding | Verdict | Route | Evidence / action |
|---|---|---|---|
| Design Notes describe per-reference nearest matching; code matches exclusively and greedily (also stale "18 gr_line" / "36 segments") | low | reject (plan edit) | True: Implementation Notes and `matchGeometric` record the exclusive matching; the fix is a plan edit. |
| No test for a duplicate outline segment, though the frozen block says duplicates fail | low | patch | Confirmed: cutouts and footprints have duplicate cases, outline does not; `matchGeometric` duplicate branch unexercised for segments. Patch: add the case. |
| Side-mismatched footprint reports `FAIL S1: 0.0000 mm` | low | reject | The same line says FAIL and `side F.Cu ≠ B.Cu`, and `failing:` names it; cosmetic, and a fix adds a branch to the deviation. |

## Design Notes

Geometric matching for outline and cutouts: for each reference item, the candidate of the same kind with the smallest deviation; a candidate chosen by no reference is extra; a reference whose best match exceeds tolerance fails under the reference's name. Outline segments are named `outline <kind> #<index> at (x, y)` from the reference file order. Cutout deviation = segment-count match, then max over its segments of the nearest-segment deviation in the candidate loop.

## Verification

**Commands:**
- `pnpm vitest run --project @keeb-cad/fixtures` -- expected: all pass.
- `pnpm check` -- expected: exit 0.
