---
title: 'Custom router routes the key matrix'
type: 'feature'
ticket: '8'
created: '2026-10-27'
status: done
baseline_revision: 'f5c84b43b514850931fcc3f34406a88e4cbae17a'
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

**Problem:** The routing verdict (story 13) compares tscircuit with a custom keyboard router, but the custom router does not exist yet. tscircuit routed 99% of wired Corney, but with 3418 added `drc` errors and in 244 s, so whether a small purpose-built router can route cleanly is the open risk (R2). Story 8 answers it first on the key matrix.

**Approach:** Add a pure TypeScript router, `routeConnections(input, ids)`, in `spikes/src/`. It works on the 2-layer grid with A*, octilinear moves and vias. It builds obstacles from pads, NPTH holes, fixed copper, the board edge and its own earlier traces, with clipper2-ts inflation and a flatbush index. It routes the chosen connections one by one at the strictest net-class clearance, using each class's trace width, and returns a `RouteSet`. A Vitest test routes the matrix plus 5 MCU connections on wired Corney, then checks them with story 4's `routedConnections` and story 5's `drc`.

## Boundaries & Constraints

**Always:**
- Clearance between copper of different nets is `rules.engineClearance` (0.20 mm, the strictest class's value) everywhere. Each trace uses its own net class's `traceWidth`: signal 0.15 mm, power 0.25 mm. Vias use `rules.via`. Copper keeps `rules.boardEdgeClearance` from every `outline` segment, footprint cutouts included, and `rules.holeClearance` from NPTH holes. All of these values come from `RoutingInput`, never from literals (R7, C6).
- Copper of the same net is never an obstacle: pads, fixed copper (net from `fixedCopperNets`), and the router's own earlier traces of that net.
- Chosen set (spike decision, recorded for story 9): every `key-cell` connection, every `routing` connection on nets `C0`–`C5` and `R0`–`R3`, and these 5 MCU connections. 4 are signal: `RST:MCU1.122.TH~RST1.1.TH`, `DAT:MCU1.102.TH~TRRS1.3.TH`, `SDA:DISP1.27.B~MCU1.105.B` and `SCL:DISP1.26.B~MCU1.106.B`. The 5th, `GND:MCU1.123.TH~RST1.2.TH`, is power and exercises the power width. The total is 131 connections.
- Every trace carries its `Connection.id`, and a connection's traces and vias pass story 4's `realises` (continuous copper, ends on both pads' copper, vias of the net at layer changes).
- The router is pure and deterministic. It imports no Node and no DOM APIs, so story 9 can run it in the worker unchanged. The same input always gives the same `RouteSet`.
- Decision (2026-10-27): the worker wiring, the Chromium run and the timing are deferred to story 9, whose scorecard needs worker time and peak memory. This story proves the router in Vitest under Node and keeps it worker-ready.
- A connection the router cannot route is left out of the `RouteSet` and listed in a returned `unrouted` array. It is never forced through an obstacle (C6).

**Never:**
- No routing of the remaining connections (LED, VCC, GND chain) or of wireless, no scorecard, and no reroute. Those are stories 9 and 10.
- No use of tscircuit code, and no change to `drc`, `routing-input`, `route-set`, `completion`, `write-back` or any file outside `spikes/`.
- No relaxing of clearances to make the test pass. No skipping of the test.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Matrix | Wired Corney, the 131 chosen ids | `unrouted` is empty. `routedConnections` contains all 131. `addedViolations(bare baseline, drc)` is empty | — |
| Power width | The GND connection | Every one of its traces is 0.25 mm wide | — |
| Same-net reuse | Two chained connections of one net that share a pad (e.g. `R0`) | Both route, and `drc` reports nothing between them | — |
| Blocked | A connection whose pad is boxed in by a synthetic obstacle ring | It appears in `unrouted`, and no trace of it is emitted | — |
| Unknown id | An id not in `input.connections`, or one realised by `fixed-copper` | Throws, naming the id | — |

</frozen-after-approval>

## Code Map

- `spikes/src/routing-input.ts` -- `RoutingInput` and `Connection.realisedBy`. `pads` carries world x/y/r, an unrotated `size`, `shape`, `layers`, `roundrectRatio` and `chamfer`. `obstacles` holds NPTH and netless pads. `outline` is `Segment[]` (line, arc, circle), and `rules` gives `engineClearance` 0.2, `boardEdgeClearance` 0.3, `holeClearance` 0.25 and `via` 0.56/0.3. Read only.
- `spikes/src/shapes.ts` -- reuse `padShape` (core + radius, rotation and chamfers applied), `traceShape`, `viaShape`, `shapeGap`, `shapeBounds`, `edgeGap`, `edgeBounds` and `flattenEdge` (arc to polyline) for obstacle building and exact clearance checks.
- `spikes/src/route-set.ts` -- `RouteSet`, `RouteTrace` (connection, net, layer, width, points) and `RouteVia`. Use `fixedCopperNets(input)` to get each fixed trace's net.
- `spikes/src/completion.ts` -- `routedConnections(input, routes)` is the test's oracle for "routed".
- `spikes/src/drc.ts` and `spikes/src/drc-cases.ts` -- use `drc(input, routes)` and `addedViolations(baseline, report)`. The wired bare baseline is 216 LED edge violations, from `drc(input, EMPTY_ROUTES)`.
- `spikes/src/deps.ts` -- the clipper2-ts API already typed here: `inflatePathsD`, `JoinType.Round`, `EndType.Polygon`/`Round`. Flatbush is used the same way in `drc.ts`.
- `spikes/src/corney.ts` -- `CORNEY.wired` raw text (Vite `?raw`, which Vitest handles).
- Board size: pads span x 92–222 mm and y 49–131 mm. The MCU pitch is 2.54 mm, and diode and switch pads are in the 1–2.5 mm range.

## Tasks & Acceptance

**Execution:**
- [x] `spikes/src/custom-router.ts` -- `routeConnections(input, ids, options?): { routes: RouteSet; unrouted: string[] }`. It builds a per-layer obstacle field from pads, obstacles, fixed copper and the outline, each tagged with its net. The field is clipper2-inflated by clearance plus half the width plus a grid margin, and indexed in flatbush. The router runs a two-layer grid A* (8 directions, a via cost, a bend cost, and the board interior only), from a pad's copper to the other pad's copper. It simplifies collinear runs, then adds the routed copper to the field before the next connection. The order is shortest connection first, with ties broken by id. The grid step is an option, with a default the implementer picks for Corney's pitch.
- [x] `spikes/src/custom-router.test.ts` -- the matrix rows. `MATRIX_IDS` is exported, built from the chosen-set rule, and checked to be 131 long.
- [x] `spikes/README.md` -- a short section: the router, the chosen set, the command and the result (connections, time in Node).

**Acceptance Criteria:**
- Given the spikes project, when running `pnpm --dir spikes test`, then the custom-router test passes in under 120 s in Node, and it prints the routed count and the elapsed time.
- Given the spikes project, when running `pnpm --dir spikes typecheck`, then `custom-router.ts` typechecks under the browser tsconfig, which has no Node types.

## Implementation Notes

- The search reads a raster, not flatbush: each inflated item is scan-filled (even-odd) into one `Int32Array` per layer and per placed width (signal trace, power trace, via). A cell holds 0 (free), a net code (blocked for every other net), or -1 (blocked for all). Flatbush indexes the static inflated items for the exact segment check of a pad stub; the router's own copper is a short list next to it, because flatbush cannot grow after `finish()`.
- Grid margin is step·√2/2 for trace fields (any point of a segment between two neighbouring free grid points is that close to one of them), 0 for the via field (vias sit on grid points). `TOL` = clipper arc tolerance 0.002 + rounding 1e-4 + edge flattening 0.002 is added outwards.
- No explicit interior test: the inflated outline is a closed wall at least 0.9 mm thick, so the search cannot leave the board from a pad inside it. A check with `insideOutline` found no trace point or via outside.
- A via is not allowed at a start node or right after another via, and a goal reached by a via does not end the search. This stops one-point runs, which `realises` would reject on an SMD pad.
- Default step 0.1 mm, via cost 1.5 mm, bend cost 0.2 mm. First run: 131/131, 0 added `drc` violations, about 1.6 s in Node. No tuning was needed. Shifting every trace by 0.2 mm adds 147 violations, so `drc` does see the traces.

## Plan Change Log

## Review Triage Log

### Pass 1 (quick): high 0, medium 1, low 5, false 1, maybe-false 0. 3 patched, 4 rejected.

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | A found path that emits no trace (start node is also a goal node, or every run simplifies below 2 points) leaves the connection in neither `routes` nor `unrouted`, and its vias are still emitted | medium | patch | Confirmed: `flush` drops runs under 2 points, and `unrouted` is only pushed when `found < 0`. That hides an unrouted connection (C6). Not hit on the 131. Fix: no traces, so the id goes to `unrouted` and nothing is emitted. |
| 2 | A* node is (layer, cell), so a goal node first reached by a via is closed and a later same-layer arrival is dropped | low | patch | Confirmed: `closed[next] === gen` returns early. Masked on Corney by many grid points inside each pad. Fix is one condition: no via move into a goal node. Starts refusing vias is by design ("not at a start"). |
| 3 | `padNodes` scan window uses `max(w, h)/2` of the unrotated size, missing the corners of rotated pads | low | patch | Confirmed: `padShape` rotates by `pad.r`, so the corners reach `hypot(w, h)/2`. Fix: use the hypot. |
| 4 | `segmentFree` treats a ring's inner hole path as solid, so a stub inside a circular cutout is over-blocked | low | reject | Real but only over-blocks (safe), and only for the rare stub fallback inside a circle cutout. Corney's cutouts are rects. The fix needs an even-odd test, which adds complexity. |
| 5 | The Blocked test does not prove the connection is unrouted because the path is boxed in, rather than because there are no start nodes | low | reject | The matrix row asks only that a boxed-in pad end up in `unrouted` with nothing emitted, and either cause meets it. With the ring at ±1 mm and an inflation of about 0.35 mm, the pad centre stays free. |
| 6 | Keep-out clearance is the literal 0 | false | reject | `KeepOut` is an area no copper may enter. 0 is "the area itself", not a clearance rule, and the placed copper's radius and margin are still added. `RoutingInput` has no keep-out clearance to read. |
| 7 | `chosen` drops duplicate ids silently | low | reject | Routing an id once is the correct result, and nothing is hidden. |

## Design Notes

A grid point is free when it lies outside every inflated obstacle on that layer. Two things can still make a segment between neighbouring points clip a corner: diagonals, and the grid margin. That is why `drc` is the gate, not the field. If `drc` reports a violation, fix the cause in the field (margin, arc flattening or pad shape). Never post-filter the result.

Connections end on pad copper, not on the grid. Each pad's own-net area is free on its layers, so the search starts and ends at the grid points inside the pad. A short stub to the pad centre is added only when no grid point lies inside the pad.

## Verification

**Commands:**
- `pnpm --dir spikes typecheck` -- expected: exit 0.
- `pnpm --dir spikes test` -- expected: exit 0. The custom-router test reports 131/131 routed and 0 added `drc` violations.
- `pnpm check` -- expected: exit 0 (repo root, unchanged by this story).

