---
title: 'Routes written back and checked by drc'
type: 'feature'
ticket: '5'
created: '2026-10-27'
status: done
baseline_revision: '91867ab6dd575afdcbe431e1e881398e89ca431c'
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

**Problem:** Entries 6–10 need one way to turn a router's result into a KiCad board, one keeb-cad `drc` that checks it per net class (R7, AD-20), KiCad's own DRC as an independent cross-check, and a scorecard shape that both routers fill in the same way (R2). None of these exist, and `kicad-cli` is not installed.

**Approach:** In `spikes/`, define an engine-neutral `RouteSet` (traces and vias per connection). Add `writeRoutes` to append it to the `.kicad_pcb`, and `writeProject` to emit the matching `.kicad_pro` with Corney's net classes. Add a pure `drc(input, routes)` that reports violations per net class, using kle-ng's core-plus-radius shape model. Add a Node script that runs `kicad-cli pcb drc` on the written board. Define the `Scorecard` type with the reroute fields that 7 and 10 fill.

## Boundaries & Constraints

**Always:**
- Rules come from `RoutingInput.netClasses` and `rules`, never from literals in `drc`. Two items on different nets need the larger of their two classes' clearances. Each violation names the class whose rule failed, along with the item ids (pad ids, connection ids, `fixed:<i>`), the required and actual distances, and a location.
- `drc` checks copper clearance on a shared layer between different nets (trace, via, pad and fixed copper, all pairwise), shorts (distance 0 between different nets), trace width below the class width, and trace, via or pad to the board edge (Edge.Cuts lines, arcs and circles, footprint cutouts included). Through-hole pads and vias count on both layers. Items on one net are never checked against each other.
- Shapes are a core (point, segment or convex polygon) plus a radius. Circle: point + r. Trace and oval: segment + r. Rect: polygon + 0. Roundrect: inset polygon + corner radius. Pad rotation is applied. Distance is core-to-core distance minus both radii. Use flatbush for the broad phase.
- Port the shape and distance maths from kle-ng `src/utils/pcb-tracks/{drc,distance,shapes}.ts` (MIT, © 2025 adamws, commit `0c762f6d69aee77627b44d2a4038095ea3c9855b`). Keep the MIT notice at the top of the ported file.
- Write-back is text-additive. It appends `segment` and `via` nodes before the final `)`, with each item's net number from the board's net table. Each netless pre-routed segment gets the net of its fixed-copper group (story 4's union-find). It changes no geometry.
- `writeProject` puts the power and signal classes, their nets, the via size and the 0.30 mm edge clearance into the `.kicad_pro` that sits beside the board, so KiCad checks the same rules as `drc`.
- The KiCad cross-check counts only clearance-family violation types (`clearance`, `copper_edge_clearance`, `shorting_items`, `tracks_crossing`, `hole_clearance`, `track_width`, `via_diameter`, `annular_width`). It records every other type, unconnected items included, by type and count in its output, so nothing is hidden (C6).
- Decision (2026-10-27, after implementation): wired Corney's own LED pads sit 0.21 mm from their footprints' Edge.Cuts cutouts (rule 0.30 mm), so the bare board fails KiCad 199× `copper_edge_clearance`, plus 4 `invalid_outline` where front and back cutouts overlap. Footprint Edge.Cuts (`fp_rect`, `fp_line`, `fp_arc`, `fp_circle`, `fp_poly`) join the routing input's outline, so routers avoid the cutouts and `drc` reports the same violations. The bare board's violations are a baseline, recorded visibly in the output and in the scorecard (`baseline` field). Each case, and later each router, is judged on the violations its new copper adds, which must be 0 for clean. No rule is loosened. Story 13 must word the bar as "zero added errors over the recorded baseline" and get that signed off.
- Decision (2026-10-27, after implementation): KiCad 10.0.7 reports a different-net exact touch as `shorting_items`, but reports nothing for crossing or overlapping traces. The short cases are both an exact touch, which both checkers flag, and a crossing, which only `drc` flags. The crossing's empty KiCad result is recorded as a known KiCad blind spot in the output and README, not counted as a disagreement. `drc` stays the gate (AD-20).
- Decision (2026-10-27, after implementation): KiCad 10.0.7 reports at most 199 violations of each type, so the two checkers are compared error by error (type and copper item), not by count. Story 13 must note the cap where it words the bar.
- Decision (2026-10-27, at review): `drc` also checks hole clearance: traces, vias and copper pads on different nets to each NPTH hole's edge must be at least 0.25 mm apart (KiCad's default). The value is written explicitly into the `.kicad_pro`, so both checkers read one value, and it maps to KiCad `hole_clearance`.
- Decision (2026-10-27): kicad-cli comes from the system `kicad` package (pacman, extra, 10.0.7), installed by the user with `sudo pacman -S kicad`. The script calls `kicad-cli` from PATH and records `kicad-cli version` in its output and in the scorecard, because the version moves with system updates.
- The scorecard is a typed JSON file per engine and design: engine and version, KiCad version, date, connections (total, routed and completion % per `realisedBy`; completion leaves out `fixed-copper`), `drc` errors by class and kind, KiCad clearance-family errors by type, other KiCad types, worker time in ms and peak memory in MB. Optional `reroute` fields: moved key, changed connection ids, saved routes unchanged or changed, and violations against the module's fixed copper.

**Never:**
- No routing and no scorecard filled with real router results (entries 6–10).
- No loosened clearance and no suppressed or filtered-out KiCad violation (C6).
- No changes outside `spikes/`, except `.gitignore` lines for written boards and an additive pure export in `fixtures/src/kicad-pcb.ts` for footprint Edge.Cuts (existing exports unchanged).
- No `kicad-cli` call from the browser bundle or the unit tests' pure modules.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bare baseline | Wired and wireless with an empty `RouteSet` | Wireless: 0 in both. Wired: `drc` reports all 216 LED pad-to-cutout edge violations (27 LEDs × 8 pads); KiCad reports them up to its cap of 199 per type, plus 4 `invalid_outline`. These are recorded as the baseline | Any baseline violation that is not an LED pad against its own footprint's cutout fails the run. So does any KiCad error that no `drc` error matches by type and copper item, and any `drc` error KiCad omits, unless that type is at KiCad's cap, where it is listed as `unreportedAtLimit` |
| Clean | Wired plus two parallel signal traces in free board area, 0.17 mm apart | `drc` 0 errors; KiCad 0 clearance-family errors (KiCad's default 0.20 mm would flag this pair, which proves the classes loaded) | — |
| One violation | The same, but one trace on GND (power, needs 0.20 mm) | Over the baseline: exactly one `drc` violation, class `power`, required 0.20, actual ≈ 0.17, naming both traces; exactly one KiCad `clearance` | — |
| Edge | A trace 0.2 mm from an Edge.Cuts line | One `drc` edge violation, plus KiCad `copper_edge_clearance` | — |
| Short (touch) | Two traces on two nets whose edges exactly touch | `drc` `short`; KiCad `shorting_items` | — |
| Short (crossing) | Crossing traces on two nets | `drc` `short`; KiCad reports nothing, recorded as a known blind spot | Not a disagreement |
| Width | A 0.10 mm signal trace | `track-width` with class `signal`; KiCad `track_width` | — |
| Same net | Two GND traces overlapping | No violation | — |
| Hole | A trace 0.2 mm from a Corney NPTH mounting hole's edge | One `drc` `hole-clearance` (required 0.25); KiCad `hole_clearance` | — |
| Unknown net | A `RouteSet` trace whose net is not in the board | `writeRoutes` throws, naming it | — |
| No kicad-cli | Cross-check run with no KiCad available | Fails with a message naming the setup command | Never skipped silently |

</frozen-after-approval>

## Code Map

- `spikes/src/routing-input.ts` -- `RoutingInput`, `RoutingPad` (world x/y/r, unrotated `size`, `shape`, `layers`), `FixedTrace` (`net` may be undefined), `NetClass`, `DesignRules`, and `fixedCopperGroups(pads, traces)` (pad id → group). Reuse these as is. `toRoutingInput` gives `outline: Segment[]` (line, arc with mid, circle).
- `fixtures/src/kicad-pcb.ts` -- `parseSexpr`, for reading the net table (`(net N "name")` at the top level, from line 84). Do not modify it.
- Corney boards -- format `20240108` (KiCad 8; KiCad 10 upgrades them in memory). There are no vias, and the pre-routed segments have no `(net)`. Pad shapes: smd rect and roundrect; thru_hole circle and oval; np_thru_hole circle (holes only, in `obstacles`).
- `spikes/src/corney.ts` -- `CORNEY` raw texts. `spikes/vitest.config.ts` collects `src/**/*.test.ts`. `spikes/tsconfig.json` sets `types: []`.
- kle-ng saved copy: `/tmp/claude-1000/-home-ruyu-projects-keeb-cad/693fe8af-c99b-4ecc-9717-0ca8c4a208a3/scratchpad/kle-ng/drc.ts`. Fetch `distance.ts` and `shapes.ts` from the same commit. Its 1e-3 mm margin, its O(n²) loop and its single global rule are not to be copied: use net classes and flatbush.
- `kicad-cli pcb drc --format json --severity-all --units mm --output <out.json> <board>` -- reads the `.kicad_pro` with the same stem beside the board.

## Tasks & Acceptance

**Execution:**
- [x] `spikes/src/route-set.ts` -- `RouteSet` types: a trace has a connection id, net, layer, width and polyline; a via has a position, diameter, drill and net. Also the `Scorecard` type and `emptyScorecard()`.
- [x] `spikes/src/write-back.ts` -- `writeRoutes(pcbText, input, routes)` and `writeProject(input)`.
- [x] `spikes/src/shapes.ts` -- the ported shape and distance maths, with the MIT notice.
- [x] `spikes/src/drc.ts` -- `drc(input, routes): DrcReport`, with violations plus `byClass` and `byKind` counts.
- [x] `spikes/src/drc-cases.ts` -- the matrix's test boards as `RouteSet`s over wired Corney. Pick free board areas from pad and outline bounds, not by hand.
- [x] `spikes/src/drc.test.ts` -- the matrix rows on `drc` and `writeRoutes`, plus shape unit tests (rotated rect, roundrect, oval).
- [x] `spikes/scripts/kicad-drc.ts` and `spikes/package.json` -- `pnpm kicad-drc` writes every case board and its `.kicad_pro` to `spikes/out/`, runs kicad-cli on each, compares the result with `drc` per case, and exits non-zero on disagreement. Add it to `verify`. `@types/node`, pinned, is allowed for this script only.
- [x] `spikes/README.md` -- the kicad-cli setup and command, the case results, and the scorecard schema.

**Acceptance Criteria:**
- Given kicad-cli set up, when running `pnpm --dir spikes verify`, then the typecheck, the unit tests, the existing route test and `kicad-drc` all pass, and `kicad-drc` prints for each case the `drc` count and the KiCad count, which agree.
- Given the repo root, when running `pnpm check`, then it passes.

## Implementation Notes

- Blocked on the matrix's first row (2026-10-27, KiCad 10.0.7): the bare wired board has 199 KiCad `copper_edge_clearance` errors (every LED pad 0.21 mm from its footprint's own Edge.Cuts cutout, rule 0.30). `drc` reports 0 because `RoutingInput.outline` is top-level Edge.Cuts only and `drc` checks traces and vias, not pads, against the edge. Per the matrix, stopped and reported; `pnpm --dir spikes verify` exits 1 at `kicad-drc`. Wireless is clean on both.
- KiCad 10.0.7 reports nothing for overlapping or crossing traces of two nets (only a 0 mm touch gives `shorting_items`, a gap gives `clearance`), so the short row cannot agree. Over wireless, the other cases agree.
- `writeProject(input, stem)` takes the stem for `meta.filename`. Added `writeRules(input)` (`.kicad_dru`, minimum track width per class), because KiCad does not enforce a net class's track width; without it the width row would not be checked by KiCad.
- Default class (netless copper) uses `rules.engineClearance` in both `drc` and the `.kicad_pro`.
- Roundrect pads use ratio 0 in `drc` (RoutingPad has no `roundrect_rratio`): conservative, and exact for Corney, whose roundrects all have ratio 0.
- `closeOf`/`childLists` moved from `move-key.ts` to `sexpr-text.ts` so `write-back.ts` loads in Node without `corney.ts`'s `?raw` imports.
- The script runs under Node's type stripping with `scripts/ts-resolve.mjs` (extensionless imports retried with `.ts`). `scripts/tsconfig.json` is the only config with `@types/node` (26.6.5); `typecheck` runs both projects.
- After the renegotiation (2026-10-27):
  - `fixtures/src/kicad-pcb.ts` gained one additive export, `readFootprintEdgeCuts` (fp_line/arc/circle as is, fp_rect/fp_poly as their sides, world coordinates). `toRoutingInput` appends them to `outline` (wired 37 → 145; snapshot updated). `drc` now checks every copper item (pads, obstacle copper, fixed copper, traces, vias) against the edge, one violation per item against its nearest edge graphic, as KiCad reports it. `edgeGap` handles polygon cores.
  - Shorts: touching copper (gap within 1e-9 mm) is a `short` with actual 0. Cases `short-touch` (both checkers) and `short-crossing` (`kicadBlindSpot`, drc only) replace `short`.
  - Baseline: `addedViolations(baseline, report)` (multiset difference). Cases are judged on added violations. The script fails on any baseline violation that is not an LED pad against its own footprint's cutout. `Scorecard` gained `baseline {drc, kicad}`, `drc.added`, `kicad.added` and `kicad.capped`.
  - ☝️ New finding: the wired baseline is 216 in `drc`, not 199. KiCad 10.0.7 reports at most 199 violations of each type (confirmed with 210 thin traces on wireless: exactly 199 `track_width`), so the 199 in the matrix row is KiCad's limit. Comparing counts can't work at the limit, so the script matches KiCad errors one by one to `drc` errors by type and copper item. Any unmatched KiCad error fails. A `drc` error KiCad does not report fails too, unless its type is at the limit; those are listed as `unreportedAtLimit` and printed. This is my reading of "mismatch between the two checkers' baseline counts" and needs the user's sign-off. In the edge case KiCad reported the added trace, so it is confirmed even under the limit.
  - Results: `pnpm --dir spikes verify` exit 0 and `pnpm check` exit 0. Per case, drc baseline+added / KiCad baseline+added: bare-wired 216+0 / 199+0, bare-wireless 0+0 / 0+0, clean 216+0 / 199+0, violation 216+1 / 199+1, edge 216+1 / 198+1, short-touch 216+1 / 199+1, short-crossing 216+1 / 199+0 (blind spot), width 216+1 / 199+1, same-net 216+0 / 199+0.
- Matrix audit (2026-10-27): the code and README already match the adopted baseline row and the 199-cap decision, so nothing changed there. Added `spikes/scripts/kicad-drc.test.ts` for the No kicad-cli row: it runs the real script under Node with PATH holding only a `node` symlink and asserts a non-zero exit and that stderr names `sudo pacman -S kicad`. `vitest.config.ts` now includes `scripts/**/*.test.ts`, and `scripts/tsconfig.json` typechecks it. Results: verify exit 0 (51 tests), `pnpm check` exit 0.
- Review fixes (2026-10-27):
  - `kicadSignature` parses `PTH pad 1 [RST] of RST1` and `NPTH pad of MH1` as `pad:REF.PIN.TH`.
  - A missing added error now always fails; only baseline errors are excused at KiCad's cap.
  - Obstacle ids get file-order suffixes (`obstacleIds`).
  - `writeRoutes` replaces a pre-routed `(net 0)` with the group net.
  - Hole clearance: new kind `hole-clearance` covering all copper against NPTH hole edges, using `rules.holeClearance` 0.25 written as `min_hole_clearance` and mapped to KiCad `hole_clearance`. New `hole` case near MH1: drc 216+1, KiCad 199+1.
  - ☝️ The first hole check flagged 42 baseline errors: each switch's pad 1 against its own footprint's hole, gap 0. The cause was the conservative rect model. Corney's pad 1 is chamfered (`chamfer_ratio 0.455`, `bottom_right`/`bottom_left`), and with the chamfer the real gap is about 0.27 mm, which KiCad passes. So routing-input now reads `roundrect_rratio` and chamfers into `RoutingPad`/`PadObstacle` (`readPadShapeExtras`), `padShape` cuts chamfers, and the ROUNDRECT_RATIO 0 constant is gone.
  - Node types: the vite/vitest/playwright configs moved to `scripts/tsconfig.json`. That alone did not stop the leak. A temporary `process.env` line in `src/` still passed, because makerjs's `@types/pdfkit`/`@types/fontkit` reference `node`, and that was already true before this story (they used @types/node 7.10.14). The main tsconfig now sets `typeRoots: ["./types-browser"]`, whose empty `node` stub shadows @types/node. With it the probe fails with TS2591 (probe removed); `scripts/` sets its own typeRoots.
  - README "One command" updated; `fixtures/src/kicad-pcb.test.ts` tests `readFootprintEdgeCuts`.
  - Tests run: spikes `pnpm test` (55 passed), `pnpm kicad-drc` (all 10 cases ok), fixtures kicad-pcb test (9 passed), typecheck of both spikes projects.

## Plan Change Log

- 2026-10-27: user renegotiated the frozen block after implementation. (1) Footprint Edge.Cuts join the outline, `drc` checks pads to the edge, and the bare wired board's LED violations become a recorded baseline, with cases judged on added violations. (2) The short case splits into an exact touch (both checkers) and a crossing (`drc` only, KiCad blind spot recorded). The bare-baseline, short and width matrix rows were rewritten, and the Never line allows one additive export in `fixtures/src/kicad-pcb.ts`. KEEP: `RouteSet`, write-back, `.kicad_pro`/`.kicad_dru`, the shapes port, flatbush, the clean/violation/edge/width/same-net cases and the scorecard.

- 2026-10-27: user renegotiated the baseline row. KiCad caps each type at 199, and the real wired baseline is 216, so the checkers are compared error by error, with capped omissions listed. KEEP everything else.

## Review Triage Log

### Pass 1 (quick): high 0, medium 3, low 5, false 0, maybe-false 0. 8 patched (1 after a user decision), 1 rejected.

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | `kicadSignature` misses KiCad's `PTH pad N [net] of REF` wording | medium | patch | Confirmed: 105 `PTH pad` items in `out/*/kicad-drc.json`, all of which fall to `?…`. A clearance error at a TH pad would be a false disagreement. Fix: parse the PTH form as `.TH`. |
| 2 | The cap excuses `addedMatch.missing`, so added errors of a capped type are never confirmed by KiCad | medium | patch | Confirmed at `scripts/kicad-drc.ts:216`. The edge case (198+1 = 199) would pass even if KiCad missed the added trace. Fix: excuse only baseline omissions. |
| 3 | `@types/node` reaches `src/` through vite's `/// <reference types="node" />` | low | patch | Confirmed: a `process.env` line in `src/` typechecks under the main tsconfig. Fix: type the config files in the scripts project, not the main one, so `src/` stays without node types. |
| 4 | `drc` has no copper-to-NPTH-hole check; KiCad checks `hole_clearance` | medium | patch (user decision) | Confirmed: `drc.ts:72` skips NPTH, and `KICAD_TYPE` has no hole mapping. Against "KiCad checks the same rules as drc". The user chose 0.25 mm, written into `.kicad_pro`, with a new matrix row (frozen block amended). |
| 5 | Unnumbered obstacle ids collide (`obstacle:REF.-`) | low | patch | Not reachable on Corney (every unnumbered pad is NPTH and skipped), but the fix is a direct suffix. Fix: file-order suffix as for pad ids. |
| 6 | `writeRoutes` keeps `(net 0)` segments netless while `drc` gives them a group net | low | patch | Confirmed in `write-back.ts:72`. Corney has none. Fix: treat `(net 0)` as netless. |
| 7 | README "One command" is stale | low | patch | Confirmed. Fix: add `tsc -p scripts`, the `scripts/` tests and `kicad-drc`. |
| 8 | `readFootprintEdgeCuts` is untested in the fixtures package | low | patch | Confirmed: root `pnpm check` never runs spikes/. Fix: a small test in fixtures. |
| 9 | Acceptance criterion 1 says the counts "agree" | low | reject | The fix is editing this build's plan. The user's error-by-error decision in the frozen block already settles the reading. |

## Design Notes

The clean and violation cases use a 0.17 mm gap on purpose. That is legal for signal (0.15 mm), illegal for power (0.20 mm), and illegal under KiCad's Default class (0.20 mm). So one pair of cases proves three things: `drc` applies per-class rules, KiCad loaded our `.kicad_pro`, and the two checkers agree.

kle-ng's `drc.ts` checks one key's track preset in switch-local coordinates with one global rule. Only its shape model and distance maths carry over. Board edge, pad-to-pad, net classes and the spatial index are new here.

## Verification

**Commands:**
- `pnpm --dir spikes verify` -- expected: exit 0, with the per-case counts printed.
- `pnpm check` -- expected: exit 0.
