# spikes/ (throwaway)

Scratch project for **epic-risk-spikes**. It is its own pnpm workspace root, outside the repo's
root workspace, with the same strictness (`strictPeerDependencies: true`, `hoist: false`,
`publicHoistPattern: []`) and its own lockfile. Nothing in `app/`, `packages/` or `fixtures/`
depends on it. Delete the folder once the spike verdicts are recorded.

## One command

```sh
pnpm --dir spikes verify
```

It runs a frozen install, `playwright install chromium`, `tsc --noEmit` (browser project:
`src/`, `e2e/`, no Node types) and `tsc --noEmit -p scripts` (Node project: `scripts/` and the
Vite, Vitest and Playwright configs), `vitest run` (`pnpm test`), `vite build`, a headless
Playwright run (`e2e/route.spec.ts`) against `vite preview` on port 4174, and `pnpm kicad-drc`
(needs `kicad-cli`; see below). It exits 0 only if:

1. the Web Worker (`src/route.worker.ts`) routes both connections of `src/test-board.ts` with
   tscircuit's default `AutoroutingPipelineSolver`,
2. the Vitest tests pass: the unit tests (`src/**/*.test.ts`: routing input, drc, write-back)
   and `scripts/**/*.test.ts`, which spawn the kicad-drc script under Node with no `kicad-cli`
   on PATH and expect it to fail naming `sudo pacman -S kicad`,
3. `kicad-drc` finds `drc` and KiCad in agreement on every case, and
4. no request left `http://localhost:4174`. Playwright's `context.route('**/*')` blocks and logs
   every other request at the browser level. The `?probe` test makes the worker `fetch`
   `https://example.com/` and asserts that this URL, and only this URL, is logged. This proves
   that worker traffic reaches the logger.

A third control, the `?broken` test, sends `brokenBoard` (`connections: null`). tscircuit throws
`TypeError: e.connections is not iterable`. The test asserts that the page reports `failed`
with a non-empty error rather than hanging.

## Result (2026-10-27, tscircuit 0.0.1010, Node 26.12.1, headless Chromium from Playwright 1.64.1)

- **The worker runs fine.** Pipeline 9 runs in a module Web Worker with no Node or Bun APIs and
  no outbound requests. Both connections are solved.
- **Solver errors are reported, not hung.** The `?broken` board exercises the throw path: the
  worker catches tscircuit's `TypeError` and the page shows status `failed`.
- **Solve time is about 620 ms** (616 to 626 ms over three runs) for the two-connection,
  40 × 20 mm, 2-layer board. Both traces go through 2 vias and use the bottom layer.
- **The worker bundle is 2.49 MB minified.** `DEFAULT_HD_CACHE2_SERVER_URL` and the `_Networked`
  pipeline are tree-shaken out. The only absolute URLs left in the bundle are licence and doc
  comments, plus the probe URL.
- **Install caveat: strict peers fail out of the box.** tscircuit pulls in debug and visualisation
  packages through `@tscircuit/solver-utils` → `graphics-debug`. Under `strictPeerDependencies`,
  `pnpm install` fails on two counts:
  - `typescript ^5` is wanted by `@tscircuit/solver-utils`, `graphics-debug`,
    `@tscircuit/alphabet` and `stack-svgs`;
  - `react-dom@19` sits beside `react@18`.

  `pnpm-workspace.yaml` adds scoped `peerDependencyRules.allowedVersions` exemptions and keeps
  strict mode on. None of those packages is loaded on the routing path. The real app would need
  the same exemptions, or a tscircuit release that drops the dependencies.
- **Typecheck caveat: shared DOM and WebWorker libs.** TS 6.0.3 with `skipLibCheck` absorbs tscircuit's roughly 20
  undeclared type imports and makerjs's `/// <reference types>` to packages that aren't
  installed. The public types still resolve to real types, not `any`: `solver.error` is
  `string | null`, and `getOutputSimplifiedPcbTraces()` returns `SimplifiedPcbTraces`.
  `src/deps.ts` proves the same for clipper2-ts, flatbush and makerjs. The DOM and WebWorker
  libs share one `tsconfig.json` project, so `self` would type as the DOM `Window`.
  `src/route.worker.ts` therefore declares `self` as `DedicatedWorkerGlobalScope` explicitly.
  No `@types/node` was needed.
- **No install scripts**, so there is no `allowBuilds`.

## Corney routing input (story: Corney PCB to routing input, with the split rule)

```sh
pnpm --dir spikes test
```

`src/routing-input.ts` has `toRoutingInput(pcbText)`. It turns Corney's committed Ergogen
`.kicad_pcb` (wired and wireless, both in full) into an engine-neutral `RoutingInput`. That covers
the outline, pads, obstacles, fixed copper, keep-outs (none: the module zone is its fixed copper),
net classes, design rules and connections, in KiCad's frame (mm, y down). The split rule and the
id grammar are in [SPLIT-RULE.md](SPLIT-RULE.md). `src/move-key.ts` has
`moveKey(pcbText, key, {dx, dy})`, which makes the one-key-move variant that entries 7 and 10 use.
Tests are in `src/routing-input.test.ts`, under Vitest.

| | wired | wireless |
|---|---|---|
| pads / obstacles | 556 / 93 | 355 / 105 |
| nets (single-pad) | 119 (21) | 95 (21) |
| connections | 437 | 260 |
| key-cell / fixed-copper / routing | 63 / 104 / 270 | 63 / 108 / 89 |
| fixed copper segments | 224 | 228 |

Rules: power is GND, VCC, RAW, plus BAT_P on wireless, at 0.25 mm width and 0.20 mm clearance.
Signal is 0.15 / 0.15 mm. Board-edge clearance is 0.30 mm, the via is 0.56 mm with a 0.30 mm
drill, and the engine clearance is 0.20 mm.

The wired TRRS1 writes its pins 2, 3 and 4 twice as through-holes. The repeats get a file-order
suffix (`TRRS1.2.TH.2`), so they stay distinct pads joined by a visible connection.

## Routes written back and checked by drc (story: routes written back and checked by drc)

```sh
pnpm --dir spikes test        # drc, write-back and shape unit tests
pnpm --dir spikes kicad-drc   # KiCad cross-check; also the last step of `verify`
```

- `src/route-set.ts`: the engine-neutral `RouteSet` (traces per connection as polylines, vias),
  `fixedCopperNets` (the net of each pre-routed segment from its fixed-copper group) and the
  `Scorecard` type with `emptyScorecard()`.
- `src/write-back.ts`: `writeRoutes(pcbText, input, routes)` appends `segment` and `via` nodes
  with the board's net numbers and adds `(net N)` to each netless pre-routed segment; nothing
  else changes. `writeProject(input, stem)` gives the `.kicad_pro` (Default, power and signal
  classes with their nets, via 0.56/0.30, edge clearance 0.30). `writeRules(input)` gives a
  `.kicad_dru` with a minimum track width per class, because KiCad treats a net class's track
  width as a routing default, not a DRC limit.
- `src/shapes.ts`: kle-ng's core-plus-radius shapes and distances (MIT, kept at the top), plus
  exact distances to Edge.Cuts arcs and circles. `src/drc.ts`: `drc(input, routes)` with
  flatbush as the broad phase; rules come only from `netClasses` and `rules`. It checks traces,
  vias and pads against the edge, footprint cutouts included, and all copper against each NPTH
  hole's edge (`rules.holeClearance`, 0.25 mm, also written as `min_hole_clearance` into the
  `.kicad_pro`). Pad shapes use each pad's `roundrect_rratio` and chamfers (Corney's switch
  pads are chamfered towards their holes).
- `src/drc-cases.ts`: the matrix's boards, placed in free board area found from the pad, hole,
  fixed-copper and outline bounds.

### kicad-cli

kicad-cli comes from the system package: `sudo pacman -S kicad` (extra, 10.0.7 at the time of
writing). The script calls `kicad-cli` from PATH, records `kicad-cli version`, and fails, naming
that command, when it is missing. Per case it runs

```sh
kicad-cli pcb drc --format json --severity-all --units mm --output <out.json> <board>
```

on `spikes/out/<case>/<case>.kicad_pcb`, which picks up the `.kicad_pro` and `.kicad_dru` with
the same stem. Only the clearance family (`clearance`, `copper_edge_clearance`,
`shorting_items`, `tracks_crossing`, `hole_clearance`, `track_width`, `via_diameter`,
`annular_width`) counts; every other type, unconnected items included, is printed and written to
`spikes/out/kicad-drc.json` by type and count.

### Case results (2026-10-27, KiCad 10.0.7, after the renegotiated plan)

Each case is judged on what its copper **adds** over the bare board of its design (the
baseline). Every KiCad clearance-family error is matched one by one to a `drc` error, by type and
copper item (pad `REF.PIN.side`, track `net.layer`, via `net`). Any KiCad error `drc` does not
report fails the run, and so does any added `drc` error KiCad does not report (except the
recorded blind spot), and any baseline `drc` error it does not report unless KiCad is at its
limit for that type.

| case | `drc` baseline + added | KiCad baseline + added | notes |
|---|---|---|---|
| bare-wired | 216 + 0 | 199 + 0 | KiCad stops at its limit of 199 (17 not reported); 4 `invalid_outline` |
| bare-wireless | 0 + 0 | 0 + 0 | |
| clean | 216 + 0 | 199 + 0 | |
| violation | 216 + 1 `clearance`, power, 0.20 vs 0.17 | 199 + 1 `clearance` | |
| edge | 216 + 1 `edge-clearance` | 198 + 1 `copper_edge_clearance` | limit: 18 not reported |
| hole | 216 + 1 `hole-clearance`, 0.25 vs 0.20 | 199 + 1 `hole_clearance` | trace near mounting hole MH1 |
| short-touch | 216 + 1 `short` | 199 + 1 `shorting_items` | |
| short-crossing | 216 + 1 `short` | 199 + 0 | KiCad blind spot, recorded |
| width | 216 + 1 `track-width`, signal | 199 + 1 `track_width` | |
| same-net | 216 + 0 | 199 + 0 | |

- **Baseline.** Footprint Edge.Cuts (`readFootprintEdgeCuts` in `fixtures/src/kicad-pcb.ts`)
  join `RoutingInput.outline`, so wired gains 27 LED cutouts (108 sides). Each SK6812mini-e LED
  pad sits 0.21 mm from its own footprint's cutout, under the 0.30 mm rule: 27 LEDs × 8 pads =
  216 violations. `drc` reports one per copper item, against its nearest edge, as KiCad does. The
  run fails on any baseline violation that is not an LED pad against its own cutout.
- **KiCad's report limit.** KiCad 10.0.7 stops reporting some violation types at exactly 199
  (shown with 210 thin traces on wireless: exactly 199 `track_width` and 199 `track_dangling`).
  Not every type: a routed wired board reported 499 `clearance`. A type counts as `capped` only
  at exactly 199. So it reports
  199 of the 216, and which ones it drops changes as copper is added. The plan's "199" was this
  limit, not the real count. The script marks a type at the limit as `capped` and lists the
  `drc` errors KiCad did not report under `unreportedAtLimit` in `out/kicad-drc.json`. Every
  error KiCad does report still has to match one from `drc`.
- **KiCad blind spot.** KiCad 10.0.7 reports a different-net exact touch as `shorting_items`,
  but nothing for crossing or overlapping traces. `short-crossing` records that as
  `blindSpot` in the output. `drc` stays the gate (AD-20).
- Other KiCad types are printed per case and kept in the JSON: `lib_footprint_issues`,
  `invalid_outline` (front and back LED cutouts overlap), `track_dangling`, `unconnected_items`.

### Scorecard schema

`Scorecard` in `src/route-set.ts`, one JSON file per engine and design: `engine {name, version}`,
`design`, `kicadVersion`, `date`, `connections {total, routed, completionPct,
byRealisation{key-cell, fixed-copper, routing: {total, routed, completionPct}}}` (completion
leaves out `fixed-copper`, whose `completionPct` is null), `drc {errors, added, byClass{power,
signal, default}, byKind{clearance, short, track-width, edge-clearance, hole-clearance}}`, `kicad
{clearanceFamily, other, capped, added}` (type → count; `capped` lists types at KiCad's 199
limit), `baseline {drc, kicad}` (the bare board's counts, same shapes), `workerMs`,
`peakMemoryMb`, and for entries 7 and 10 an optional `reroute`: one entry per method,
`{method, movedKey, delta, run {status, error, capMs}, workerMs, movedConnections {total,
routed}, changedConnections, savedRoutes {unchanged, changed}, fixedCopperViolations, drc
{added}}` (`RerouteEntry`; see story 7 below). `method` is `preloaded-traces` or
`rect-obstacles` (tscircuit, story 7) or `fixed-obstacles` (custom router, story 10: the saved
routes' exact shapes, which the router cannot move or rip up). `fixed-obstacles` entries also
carry `savedConflicts {violations, connections}`: the `drc` violations the saved routes add over
the moved board with no routes, and the saved connections in them, which are rerouted with the
moved key (optional, so story 7's entries stay valid).

Optional fields since story 6: `run {status: solved|timeout|failed|threw, error, capMs}`,
`unrouted` (the scored connection ids the routes do not realise) and `crossCheck {drcOnly,
kicadOnly}` (clearance-family signatures on the routed board that only one checker reports). `kicad.addedUncertain` lists the types at exactly 199 on the bare or the routed board, whose
share of `kicad.added` is a sample difference.

## tscircuit routes full Corney and is scored (story 6)

```sh
pnpm --dir spikes score:tscircuit   # vite build, then scripts/score-tscircuit.ts; needs kicad-cli
```

The script serves `dist/` with Vite's `preview()` on port 4175. It opens
`/?corney=<design>&cap=600000` in headless Chromium, once per design. The page builds the SRJ
from the committed `.kicad_pcb` (`src/corney.ts`), and the Web Worker only solves:
`AutoroutingPipelineSolver` runs in `step()`s, with the 600 s cap (10× the bar) checked between
steps. It returns its status, the error, whatever traces `getOutputSimplifiedPcbTraces()` gives
(in a try/catch), and the solve time measured inside the worker. Then, in Node, the script:

1. rebuilds the same `RoutingInput` and maps `c<i>` back to `input.connections[i]`
   (`toRouteSet`),
2. scores completion with `src/completion.ts`,
3. runs `drc` on the bare and the routed board,
4. writes both boards with `writeRoutes`, `writeProject` and `writeRules` to
   `out/tscircuit-<design>/` (`bare-<design>.*`, `tscircuit-<design>.*`), and runs KiCad on each,
5. writes `scorecards/tscircuit-<design>.scorecard.json` and prints one summary line.

A cap, a solver failure or a throw is a result, not an exit failure. Whatever traces come back
are still scored. The exit code is 0 whenever both scorecards are written. An outbound request
(blocked at the browser level with `context.route`, as in `e2e/route.spec.ts`) fails the run and
names the URL. So does a missing `kicad-cli`, which names `sudo pacman -S kicad`
(`scripts/score-tscircuit.test.ts`). `score-tscircuit.ts --probe` loads the page's `?probe` control instead of a design. It
scores nothing and needs no kicad-cli. `scripts/score-tscircuit-probe.test.ts` builds `dist/`,
runs it, and asserts a non-zero exit naming `https://example.com/`. `e2e/corney-cap.spec.ts`
routes wireless with a 200 ms cap and asserts `timeout`, an error, and a stop near the cap.
`scripts/run-status.ts` maps the worker's response to the scorecard's `run.status`. The shared KiCad helpers are in `scripts/kicad.ts`. Since story 9 the engine-neutral steps (serving, blocking, heap sampling, steps 2–5, `--probe`) are in `scripts/score.ts`, shared with `score:custom`; `score-tscircuit.ts` keeps the adapter and the reroute. Since story 10 the `?external` session (`externalSession`, generic over the page path and the window function), the reroute's move and its summary line are there too. The
script is outside `verify` because a routing result is not a test outcome. The adapter and
completion unit tests are inside it.

### Adapter (`src/tscircuit-adapter.ts`)

| RoutingInput (KiCad, y down) | SimpleRouteJson (y up) |
|---|---|
| point (x, y) | (x, −y); a pad's rotation `r` is CCW on screen in both frames, so `ccwRotationDegrees = r` |
| top-level Edge.Cuts | `outline`: the largest closed loop of the graphics, arcs flattened with chords ≤ 0.005 mm; `bounds` from it |
| footprint Edge.Cuts cutouts (wired: 27 LED windows) | both-layer rect obstacles, grown by `boardEdgeClearance − engineClearance` (0.1 mm) on each side |
| pad | rect obstacle (`size`, `ccwRotationDegrees`), circle pads `shape: 'circle'`; F → `top`, B → `bottom`, TH → both; `connectedTo` = its net + the `c<i>` that end on it; `obstacleId` = pad id |
| obstacle pad (no net) | same, `connectedTo: []`; NPTH holes are the drill as `isNonPlatedHole` |
| fixed-copper segment | rotated rect covering its capsule (length + width × width), `connectedTo` = its group net (`fixedCopperNets`) |
| connection (`key-cell`, `routing`) | `c<index into input.connections>`, `netConnectionName` = net, `nominalTraceWidth` = class width, both pad centres (`layer` or `layers`), each with its own `pointId` `c<i>.A` / `c<i>.B` |
| `fixed-copper` connection | not sent |
| `engineClearance` (0.20) | `defaultObstacleMargin`, `minTraceToPadEdgeClearance`, `minViaEdgeToPadEdgeClearance`, `minPadEdgeToPadEdgeClearance`, `minViaHoleEdgeToViaHoleEdgeClearance`, `minPlatedHoleDrillEdgeToDrillEdgeClearance` |
| `boardEdgeClearance` (0.30) / `holeClearance` (0.25) | `minBoardEdgeClearance` / `minTraceToHoleEdgeClearance` |
| `via` 0.56 / 0.30 | `minViaPadDiameter` / `minViaHoleDiameter`; `minTraceWidth` = the widest class (0.25) |

Back from tscircuit (`toRouteSet`), each trace's wire points become one polyline per run on one
layer and width. A via ends a run and the next one starts at it. A layer change with no via starts
the next run fresh, so the gap stays visible. Names that map to no connection, and jumper or
through-obstacle hops, are reported in the run's error, never dropped silently.

**Why `pointId`.** tscircuit merges every connection that shares a point (the split rule's chains
share each inner pad) into one net and routes its own spanning tree. It then names the result
after the first member (`c253` for `c253__c254__c255_mst0_0`), so the connection ids are lost. A
`pointId` per connection end stops the merge, and tscircuit routes exactly the split rule's
pairs. This changes no rule.

**Completion (`src/completion.ts`, engine-neutral).** A connection is routed only when all of its
traces form one piece, and an end lies on padA's copper and an end on padB's copper, each on a
layer the pad has. Pieces join at an end on the same layer, or at a via of the net. A layer
change anywhere else is a gap. `connections.total` and `completionPct` cover `key-cell` and
`routing`. `fixed-copper` is never sent, so its `routed` is 0 and its `completionPct` is null.

### What tscircuit cannot take (listed, not worked around: C6)

- **Per-class clearance.** Each SRJ clearance field takes one value, so every one gets the
  strictest class (0.20 mm). Signal copper is held to 0.20 mm, not 0.15 mm. That is stricter, not
  looser.
- **Per-class minimum width.** There is one `minTraceWidth`, and tscircuit narrows a connection
  from its `nominalTraceWidth` towards it where the connection does not fit. So `minTraceWidth`
  is the widest class (0.25 mm, power), the strictest choice. Signal traces can come out wider
  than their 0.15 mm class. That is legal, because the class width is a minimum. It also uses
  more room, which shows up as clearance errors. With 0.15 mm, power traces came out at 0.15 mm
  (1812 `track-width` errors on wired), which is a loosened rule.
- **Board-edge clearance to footprint cutouts.** The SRJ has one outline polygon, so cutouts are
  obstacles grown to the edge clearance (above).
- **Pad shapes.** Roundrect, oval and chamfered pads are sent as their full rect. That is larger
  than the copper, which makes it stricter.
- **Via to NPTH hole.** There is no via-specific hole field. `minTraceToHoleEdgeClearance` is the
  only hole rule.
- **Pad layer at a connection's end.** tscircuit sometimes ends a trace at a pad's position on a
  layer the pad lacks. This happens with wireless RST1 and PWR1, whose F and B copies sit close
  together. Such traces count as unrouted.

### Memory and time

`workerMs` is measured inside the worker, from receipt of the SRJ to the end of solving. Building
the SRJ on the page and the message transfer are excluded. `peakMemoryMb` is the maximum, over
samples every 100 ms, of the worker's **V8 JS heap only** (`Runtime.getHeapUsage().usedSize`, in
MiB). It does not include process RSS, the page or ArrayBuffer backing stores.
`performance.memory` does not exist in Chromium workers. So the script calls
`Target.setAutoAttach {flatten: false}` on a CDP session of the page, and sends the call to the
worker target with `Target.sendMessageToTarget`. The run fails if it gets no sample.

### Results (2026-10-27, tscircuit 0.0.1010, Chromium 156 headless, KiCad 10.0.7, one run)

From the story 7 run, which also wrote the `reroute` entries below.

| | wired | wireless |
|---|---|---|
| run | solved, 244.3 s | solved, 26.5 s |
| routed (key-cell + routing) | 330 / 333 (99.1%) | 144 / 152 (94.7%) |
| key-cell / routing | 63/63, 267/270 | 63/63, 81/89 |
| peak worker JS heap | 790.9 MiB | 467.0 MiB |
| `drc` baseline + added | 216 + 3418 | 0 + 250 |
| `drc` on the routed board, by kind | clearance 2634, hole 419, edge 352 (216 of them baseline), short 229, track-width 0 | hole 142, clearance 96, short 12, track-width 0 |
| KiCad added (clearance family) | 950; `addedUncertain`: copper edge and hole clearance (at 199) | 240 |
| cross-check `drcOnly` / `kicadOnly` | 2712 / 91 | 17 / 7 |

- **Unrouted.**
  - Wired: `C3:S12.1.F~S19.1.B`, `R2:D25.1.F~D28.1.F` and `R1:D17.1.B~D23.1.F`. They fail
    the completion check. I did not diagnose each one on this run.
  - Wireless:
    - `GND:MCU1.123.TH~RST1.1.B`: the trace reaches the B.Cu-only RST1 pad on top copper.
    - The reversible RST1 and PWR1 F/B copies (`GND:RST1.1.B~RST1.1.F`,
      `GND:RST1.1.F~RST1.3.B`, `GND:RST1.3.B~RST1.3.F`, `RST:RST1.2.B~RST1.2.F`,
      `RST:RST1.2.F~RST1.4.B`, `RST:RST1.4.B~RST1.4.F`, `BAT_P:PWR1.1.F~PWR1.3.B`).
      tscircuit ends these on a layer the pad lacks, or joins F and B with no via.
  - All of these are scored as unrouted. None is dropped.
- **Added errors are clearance, hole and short errors**, and no longer `track-width`, since
  `minTraceWidth` is 0.25 mm. tscircuit does not keep its own clearances to the class rules
  here. These are results for story 13, not tuned away.
- **KiCad's limit.** On wired, `copper_edge_clearance` and `hole_clearance` stop at exactly 199,
  so their share of `kicad.added` is a difference of two truncated samples
  (`kicad.addedUncertain`). `clearance` is not limited (499 seen on an earlier run).
- **Cross-check.** `drcOnly` on wired is mostly the types KiCad stops at 199. A connection routed
  on both layers is named by the layer the violation is on: one every item of the violation has,
  and of those the one where its traces come nearest the violation's point (`drcSignatures` in
  `scripts/kicad.ts`). The remaining `kicadOnly` entries (wired 91, wireless 7) are listed in
  the scorecard and not yet explained.
- Solve time, heap and the KiCad and cross-check counts move between runs (story 6's run: wired
  247.2 s, 951.8 MiB, KiCad +963, cross-check 2689 / 81; wireless 26.6 s, 458.7 MiB, KiCad +241,
  16 / 7). Before the width change, wired solved in 143.9 s and 148.4 s.

## tscircuit reroutes one moved key (story 7)

Part of `pnpm --dir spikes score:tscircuit`. After each design's base run is scored, the script
moves `matrix_middle_home` by `{dx: 1.5, dy: -0.75}` mm with `moveKey` (story 4's test move) and
reroutes only that key's connections, once per method, in one worker. The saved routes come from
the scored base run itself, because tscircuit's output is not committed and a second base run
could differ.

- **Moved connections** (`movedConnections` in `src/reroute.ts`): the scored (`key-cell`,
  `routing`) connections with a pad on a moved footprint (S_n, D_n, D_{n+21}, LED_n). That gives
  19 on wired and 9 on wireless.
- **Saved routes** (`savedRoutes`): every other connection's traces and vias from the base run.
  A via is dropped only when every trace that ends on it belongs to a moved connection
  (`viaOwners` in `src/route-set.ts`: `RouteVia` carries no connection, so ownership is
  geometric). Saved routes that conflict with the moved key are kept, and their violations stay
  in the baseline.
- **SRJ** (`toRerouteJson` in `src/tscircuit-adapter.ts`): `toSimpleRouteJson(moved input)`
  with `connections` cut to the moved ones. Pad `connectedTo` still names every connection.
  - `preloaded-traces`: the saved routes are SRJ `traces` (`toSimplifiedPcbTraces`, one
    tscircuit trace per continuous run of a connection, `t<i>` then `t<i>_<k>`). tscircuit
    returns new traces plus every preloaded trace it changed, marked `__replaces_pcb_trace_id`.
    `mergeReroute` removes the replaced trace's copper from the saved routes and adds what came
    back, and the connection counts as changed even if its copper came back the same.
  - `rect-obstacles`: each saved segment is the rect that covers its capsule (`saved:<k>`), and
    each saved via is a circle on both layers (`saved-via:<k>`). Both are `connectedTo` their net
    and their connection's `c<i>`.
- **Page** (`?external`): it sets `window.routeBoard(request)` and marks `#result`
  `data-status="ready"`. The script builds the SRJ in Node, because the saved routes exist only
  there, and calls `routeBoard` with `page.evaluate`. The worker is unchanged, so `workerMs` is
  still solve time only. The cap (600 s, plus 120 s of grace) and the outbound-request block are
  the base run's. A run with no answer is `timeout`, and the page is reloaded for the next method.
  `e2e/route.spec.ts` routes the test board twice through `routeBoard`.
- **Diff** (`rerouteDiff`, engine-neutral, for entry 10 too) of the whole rerouted set (saved
  plus returned) against the saved routes on the moved board:
  - A connection is in `changedConnections` when its traces differ (points to 1e-6 mm), when the
    engine replaced it, or when a via it joins was added or removed and no other connection that
    joins the via already changed. The field lists only connections whose copper differs from
    the saved routes. A moved connection left unrouted, with no traces before or after, is not in
    it. An unrouted moved key shows in `movedConnections.routed` and `run.status` (on wired,
    `changedConnections` is `[]`).
  - `savedRoutes` counts the saved connections only.
  - `drc.added` is over `drc(moved input, saved routes)`, with vias matched by place, not by
    index.
  - `fixedCopperViolations` is the part of `drc.added` that has a `fixed:<i>` item. This is the
    module-zone check (the zone is its fixed copper, story 4).
- A build error, solver failure, cap or throw is recorded in the entry with its error. That
  includes a throw while scoring the returned traces, which is `threw` with none of them scored. Whatever
  traces came back are scored, and the exit code stays 0.

### Results (same run as the story 6 table above)

| | wired: preloaded-traces | wired: rect-obstacles | wireless: preloaded-traces | wireless: rect-obstacles |
|---|---|---|---|---|
| run | failed, 20.3 s | failed, 44.3 s | solved, 94.1 s | solved, 14.2 s |
| moved routed | 0 / 19 | 0 / 19 | 9 / 9 | 6 / 9 |
| changed connections | 0 | 0 | 45 (9 moved + 36 saved) | 9 (the moved ones) |
| saved routes unchanged / changed | 314 / 0 | 314 / 0 | 104 / 36 | 140 / 0 |
| `fixedCopperViolations` | 0 | 0 | 0 | 0 |
| `drc` added | 0 | 0 | 52 | 32 |

- **Wired: both methods fail and return no traces.** With preloaded traces, tscircuit's
  high-density stage finds no path for `c118` (`R1:D29.1.F~D32.1.F`, moved). With rect
  obstacles, its static reachability precheck finds no legal path for `c265`
  (`VCC:LED11.1.F~LED12.1.B`, moved). After a failed solve, `getOutputSimplifiedPcbTraces()`
  throws, so nothing comes back, and the saved routes stand unchanged. The full errors are in
  the scorecard. Story 13 has to judge this, not tune it away.
- **Wireless, `preloaded-traces`:** every moved connection is routed, but tscircuit re-routes
  36 of the 140 saved connections, all listed in `changedConnections`. It does not keep saved
  routes fixed.
- **Wireless, `rect-obstacles`:** no saved route changes, but 3 of the 9 moved connections are
  left unrouted. Their partial traces are still scored.
- No method adds a violation against the module's fixed copper on either design.
- A first run of this story counted one saved connection as changed under `rect-obstacles`. A
  new via joined both a moved trace and a saved trace of the same net, and a via went to the
  first trace that ended on it. The diff now assigns an added or removed via as described above
  (unit test in `src/reroute.test.ts`).


## Custom router routes the key matrix (story 8)

```sh
pnpm --dir spikes test   # src/custom-router.test.ts prints the routed count and the time
```

`src/custom-router.ts` has `routeConnections(input, ids, options?)`, which returns
`{ routes: RouteSet, unrouted: string[] }`. It is pure TypeScript with no Node or DOM APIs, so
story 9 can run it in the worker unchanged, and it is deterministic.

- **Field.** Pads, netless pads, NPTH holes, fixed copper (net from `fixedCopperNets`), every
  Edge.Cuts graphic (footprint cutouts included, arcs flattened to 0.002 mm) and the router's own
  earlier traces and vias are cores (`shapes.ts`). Each is inflated with clipper2-ts by its rule
  (`engineClearance` for copper, `holeClearance` for holes, `boardEdgeClearance` for the edge),
  plus the half width of what is placed (each class's `traceWidth`, or the via radius), plus a
  grid margin of step·√2/2 for traces, plus 0.0041 mm for chords and rounding. Each item keeps
  its net, and same-net copper never blocks. The inflated items are scan-filled into one raster
  per layer and per placed width, which the search reads. They are also kept in flatbush for
  the exact check of a pad stub. Every value comes from `RoutingInput`.
- **Search.** A* on a two-layer grid (default step 0.1 mm), with 8 directions, a via cost of
  1.5 mm and a bend cost of 0.2 mm. It runs from the grid points on one pad's copper to those on
  the other's. A via needs its spot free on both layers. It may not be at a start or right after
  another via. A stub to the pad centre is added only when no grid point lies on the pad.
  Collinear runs are simplified. Connections go shortest first (pad centre to pad centre), with
  ties broken by id. Each routed connection's copper joins the field before the next one. A
  connection with no path goes into `unrouted` and emits nothing. Unknown and `fixed-copper` ids
  throw, naming the id.
- **Chosen set** (`MATRIX_IDS` in the test, for story 9): every `key-cell` connection (63),
  every `routing` connection on `C0`–`C5` and `R0`–`R3` (63), and 5 MCU connections:
  `RST:MCU1.122.TH~RST1.1.TH`, `DAT:MCU1.102.TH~TRRS1.3.TH`, `SDA:DISP1.27.B~MCU1.105.B`,
  `SCL:DISP1.26.B~MCU1.106.B`, and the power one, `GND:MCU1.123.TH~RST1.2.TH`. That makes 131.

### Result (2026-10-27, Node 26.12.1, Vitest 4.1.12, wired Corney)

| | |
|---|---|
| routed (`routedConnections`) | 131 / 131, `unrouted` empty |
| `drc` added over the bare baseline (216) | 0 |
| copper | 247 traces, 116 vias, 2651.5 mm of trace (2548.7 mm pad to pad in a straight line) |
| time in Node | about 1.6 s (1588 to 1757 ms over runs) |

The test also routes two chained `R0` connections that share `D6.1.B` (both realised, 0 added),
boxes `D1.2.B` in a netless ring on both layers (`unrouted`, no traces or vias), checks the GND
traces are 0.25 mm wide, and checks that two runs give equal `RouteSet`s. The worker run, the
Chromium timing, peak memory and the scorecard belong to story 9.

## Custom router routes full Corney and is scored (story 9)

```sh
pnpm --dir spikes score:custom   # vite build, then scripts/score-custom.ts; needs kicad-cli
```

The same pipeline as `score:tscircuit`, through the same `scoreRoutes` in `scripts/score.ts`, so
the two scorecards compare field for field: port 4175, a 600 s cap plus 120 s of grace, every
off-origin request blocked and fatal, the worker's V8 heap sampled every 100 ms over CDP, `drc`
and KiCad on the bare and the routed board (`out/custom-<design>/`), `added`, `addedUncertain`,
`crossCheck` and `unrouted`. It writes `scorecards/custom-<design>.scorecard.json` with every R2
field (`reroute` since story 10, below), and prints one line per design. `engine.version` is the git blob
hash of `src/custom-router.ts` (`git hash-object`, 7 characters, or `spike` without git), so it
names the exact router source the scorecards came from.

- **Page and worker.** `/?corney=<design>&engine=custom&cap=<ms>`: the page builds the
  `RoutingInput` from `CORNEY[design]` and takes every `key-cell` and `routing` connection (wired
  333, wireless 152). It posts `{ input, ids, capMs }` to `src/custom.worker.ts`, its only
  worker (85 kB, no tscircuit). The page now makes each worker on first use, so an idle
  tscircuit worker never shows in the heap samples. The worker calls `routeConnections` and
  answers `{ status, error, routes, unrouted, ms }` (`CustomRouteResponse` in `src/protocol.ts`).
  `ms` is routing time only. A throw is `failed` with `thrown`, so `threw` in the scorecard.
  A run that ends past the cap (the deadline passed during the last search) is `timeout` too.
  A page failure answers in the same shape, with empty routes. `&probe` makes the custom worker
  fetch `https://example.com/` instead of routing. `score-custom.ts --probe` loads
  `/?corney=wireless&engine=custom&probe`, so the outbound-request test covers this worker.
- **Cap.** The router has no step loop, so the cap is a deadline (`deadlineMs` on an injected
  `now`) checked between connections. Past it, the router stops and returns what it placed, the
  rest in `unrouted`, and `timedOut`. The worker reports `timeout`.
  `e2e/corney-cap.spec.ts` routes wireless with a 50 ms cap.
- **Rip-up and reroute (decision 2026-10-27).** The first pass (story 8) gives wired 327/333.
  Each of the 6 left routes alone, so the order blocks them, not the rules. After the first pass,
  for up to 3 rounds (`ripUpRounds`), each unrouted connection is searched on the static field
  only. Each step onto the router's own copper of another net costs `crossCost` (3 mm) instead
  of being blocked. The placed connections its copper comes within `engineClearance` of are
  ripped up, it is placed, and they are rerouted in routing order. The attempt is kept only if
  every ripped connection reroutes; otherwise everything is put back. So the routed count only
  grows, and the result is deterministic. Clearances, widths and the connection set are
  untouched. Unit tests: a one-layer box where a crossing connection is blocked only by an
  earlier one and routes after the rip-up, and the deadline on a counting clock.
- **The rip-up is tuned on wired Corney, which is also the test (story 13 should weigh this).**
  The plan's "route it ignoring our copper" (no cost) placed 329/333: the shortest path cut 11 to
  14 connections, and one of them always failed to reroute. With a cost per step on our copper,
  wired gave 331 (0.3 mm), 332 (1 mm), **333 (3 mm)** and 332 (10 mm). I kept 3 mm. Our engine
  got this tuning; tscircuit was only adapted, not tuned.

### Results (2026-10-27, Chromium 156 headless, KiCad 10.0.7, one run), next to tscircuit's

| | custom wired | tscircuit wired | custom wireless | tscircuit wireless |
|---|---|---|---|---|
| run | solved, 13.0 s | solved, 244.3 s | solved, 2.6 s | solved, 26.5 s |
| routed (key-cell + routing) | 333 / 333 (100%) | 330 / 333 (99.1%) | 152 / 152 (100%) | 144 / 152 (94.7%) |
| key-cell / routing | 63/63, 270/270 | 63/63, 267/270 | 63/63, 89/89 | 63/63, 81/89 |
| peak worker JS heap | 96.4 MiB | 790.9 MiB | 27.5 MiB | 467.0 MiB |
| `drc` baseline + added | 216 + 0 | 216 + 3418 | 0 + 0 | 0 + 250 |
| KiCad added (clearance family) | 0; `addedUncertain`: copper edge clearance (at 199 on both boards) | 950 | 0 | 240 |
| cross-check `drcOnly` / `kicadOnly` | 17 / 0 | 2712 / 91 | 0 / 0 | 17 / 7 |

- **`drcOnly` on wired** is 17 baseline `copper_edge_clearance` pads (LED25 to LED27) that KiCad
  stops reporting at 199. No routed copper is in them.
- **Not in the clearance family, so not counted as errors, but new on the routed board (C6).**
  KiCad warns `hole_to_hole` (wired 45, wireless 2) and `holes_co_located` (wired 27). These are
  vias of one net from different connections that sit on or near each other: same-net copper
  never blocks, and `RoutingInput` has no via-to-via drill rule. tscircuit has the same kinds
  (wired 16 and 69). Story 13 should decide whether a hole-to-hole rule belongs in
  `RoutingInput`.
- **Time moves with the machine's state.** The committed cards are now story 10's run (router
  `0c0b6d9`, which adds only `fixedRoutes`): same routes and counts as story 9's `f96ff22` run,
  wired 13.2 s / 96.4 MiB, wireless 2.7 s / 27.5 MiB (story 9's: 13.0 s / 83.1 MiB and 2.6 s /
  30.6 MiB). Story 9's
  cards (router `f96ff22`) were from a run
  where story 8's Node test took 3.6–3.8 s instead of the 1.6 s it took at story 8, at the story-8
  commit too, so the machine, not the code, slowed down. An earlier run of the same router source
  took wired 5.4 s / 79.9 MiB and wireless 1.1 s / 22.4 MiB. Either way, wired
  takes about 3.5× story 8's Node time for 131 connections, because there are 2.5× more
  connections and the rip-up rebuilds the fields. tscircuit's times come from a different run.
- **The heap figure leaves out most of the custom router's memory.** `usedSize` is the V8 heap
  only, without ArrayBuffer backing stores (see Memory and time above). The router's grid is
  1359 × 939 points at 0.1 mm on both designs. Its 6 rasters (static and with-our-copper, for the
  via and the two trace widths, 2 layers each) take about 58 MiB, and the A* arrays about
  61 MiB, all typed arrays. So add roughly 120 MiB to the custom figures for a like-for-like
  comparison (an estimate from the array sizes, not a measurement). tscircuit's share of
  typed arrays is not known.

## Custom router reroutes one moved key (story 10)

Part of `pnpm --dir spikes score:custom`. After each design's base run is scored, the script
makes story 7's move (`matrix_middle_home` by `{dx: 1.5, dy: -0.75}` mm, `moveKey`) and
reroutes that key's connections in the custom worker, together with the saved routes that now
clash with the moved key, with every other base-run route as fixed obstacles. `movedConnections`,
`savedRoutes` and `rerouteDiff` (`src/reroute.ts`) are story 7's, unchanged, so the entry
compares with tscircuit's field for field. The cap (600 s, plus 120 s of grace) and the
outbound-request block are the base run's.

- **Saved conflicts** (`savedConflicts(input, saved)`, `src/reroute.ts`). The saved routes are
  the base run's, minus the moved connections'. On the moved board some of them clash with the
  moved key's pads: the `drc` violations `drc(moved input, saved)` adds over `drc(moved input,
  no routes)`. Their connections (a trace by its connection id, a via by `viaOwners`) are routed
  again with the moved key's, and every other saved route stays fixed. The entry records them as
  `savedConflicts {violations, connections}`. `rerouteDiff` still diffs against the full saved
  routes, so the rerouted conflicting connections show in `changedConnections` and
  `savedRoutes.changed`. Unit tests (`src/reroute.test.ts`): a short trace of another saved
  connection at a moved diode pad's new centre is a conflict and is not among the fixed routes;
  the same trace on the unmoved board is none; a via over the pad names the connection its stub
  joins.
- **Story 7's tscircuit entries count these conflicts in their baseline too.** Their `drc.added`
  and `fixedCopperViolations` are over `drc(moved input, saved)`, so a saved route that shorts a
  moved pad cancels out there (this run measures wireless 4 and wired 30 such violations on the
  custom base routes; tscircuit's base routes differ, so its counts are not these). Their cards
  are not regenerated by this story.
- **Method `fixed-obstacles`.** `routeConnections(input, ids, { fixedRoutes })`: each fixed
  trace segment (`traceShape`) and via (`viaShape`, both layers) is a static `copper` item of its
  own net, exactly as the router's own placed copper would be, with the same clearance. So
  same-net fixed copper does not block, and another net's does. Static items are in every field,
  including the rip-up's static-only search, and never in `placed`, so the router cannot cross,
  move or rip them up, and it returns copper only for the ids it is given (moved plus
  conflicting). `after` is fixed plus returned. The script notes any returned trace or via (by
  `viaOwners`) for an id it did not ask for (none), and any conflicting connection that is
  unrouted after the reroute, in `run.error`: `movedConnections` counts the moved ids only and
  `drc` has no unrouted kind, so without the note the entry would read clean. Unit tests
  (`src/custom-router.test.ts`, story 9's crossing box): another net's fixed route across the
  only path leaves the connection unrouted and is not returned; the same copper on the
  connection's own net, through its pad, does not block it; and `B` stays unrouted when `A` is
  fixed, while `[A, B]` routes both (B rips up the router's own A).
- **Page** (`?external&engine=custom`): it makes the custom worker and sets
  `window.routeCustom(request)` (`{ input, ids, capMs, fixedRoutes }`), one call at a time, then
  marks `#result` `data-status="ready"`. `?external` alone is still tscircuit's `routeBoard`.
  The `RoutingInput` and the fixed routes are built in Node and posted with `page.evaluate`;
  `workerMs` is routing time only. `e2e/route.spec.ts` routes wireless through `routeCustom`
  twice in one page: every scored connection, then three of them round the rest as
  `fixedRoutes`. Another test answers a 1 ms cap with `timeout`, then an unknown id with
  `failed` + `thrown`, in the same page.
- A router failure, cap or throw is recorded in the entry (`run.status` from `runStatus`), and
  the routes that came back are scored. A throw while scoring them is `threw` with none scored.
  The exit code stays 0.

### Results (2026-10-27, router `0c0b6d9`, Chromium 156 headless, one run), next to story 7's

| | custom wired: fixed-obstacles | tscircuit wired (both methods) | custom wireless: fixed-obstacles | tscircuit wireless: preloaded / rect |
|---|---|---|---|---|
| run | solved, 6.0 s | failed, 20.3 s / 44.3 s | solved, 0.6 s | solved, 94.1 s / 14.2 s |
| saved conflicts (violations, connections) | 30, 9 | not measured (in the baseline) | 4, 2 | not measured (in the baseline) |
| moved routed | 19 / 19 | 0 / 19 | 9 / 9 | 9 / 9, 6 / 9 |
| conflicting connections routed again | 7 / 9 | — | 2 / 2 | — |
| changed connections | 28 (19 moved + 9 conflicting) | 0 | 11 (9 moved + 2 conflicting) | 45, 9 |
| saved routes unchanged / changed | 305 / 9 | 314 / 0 | 141 / 2 | 104 / 36, 140 / 0 |
| `fixedCopperViolations` | 0 | 0 | 0 | 0 |
| `drc` added | 0 | 0 | 0 | 52, 32 |

- **Saved routes changed equals the conflict count by construction**, not a routing result: the
  router returns copper only for the ids it is given, and the conflicting connections' copper
  is always replaced. Story 13 should not read it as one. What the entry measures is whether the
  moved key and the conflicting connections still route (`movedConnections.routed`, and the
  `run.error` note for conflicts), the `drc` it adds, and the module-zone check
  (`fixedCopperViolations`). `drc` added 0 is over `drc(moved input, saved)`; a separate Node
  run of the same routing found no saved conflict left in `after` on either design.
- **Wired leaves two conflicting connections unrouted:** `ULED_1:LED22.2.F~LED23.4.B` and
  `ULED_1:LED23.4.B~LED23.4.F`, listed in `run.error`. Their saved routes clashed with the moved
  key and are gone from `after`, and the router finds no new path for them round the fixed
  routes and the moved key.
- **Wired's moved key now routes 19 / 19.** Attempt 1 of this story, which kept the conflicting
  routes fixed, left `LED_10:LED11.4.B~LED11.4.F` unrouted (the router's order and rip-up, not a
  fixed obstacle). With the conflicting routes rerouted it routes.
- Wireless's saved count is 143, not story 7's 140, because the saved routes are each engine's
  own base run (custom routes all 152, tscircuit 144).

## makerjs rebuilds Corney's outline (story 11)

`pnpm test` (`src/outline.test.ts`) and `pnpm route` (`e2e/outline.spec.ts`). AD-16 leaves the
flatten function and its tolerance to this spike: can makerjs, driven from our own shape model,
rebuild Corney's `_pcb_outline` within ±0.05 mm, and how long does it take on the main thread?

- **Shape model** (`src/outline-shapes.ts`). Shapes are data: `polygon` (vertices), `add` (union
  of `shape-ref`s, in order), `fillet` (`of` a `shape-ref`, `radius`). A vertex is an anchor (a
  point name) plus a shift in the anchor's frame (rotated by its `r`). A construction point is
  the intersection of two lines, each through a vertex at an angle in that vertex's frame (90 =
  its y axis, which is what Ergogen's `aggregate: intersect` uses); its frame has `r = 0`.
  `CORNEY_OUTLINE_SHAPES` is transcribed from `config.yaml` (`ks = kp = 19`): `_matrix_outline`
  (18 vertices), a 5-vertex plate polygon, `_plate_outline` = their `add`, the 4-vertex
  `_backplate_additional_outline`, `_backplate_outline` = `add` of those, and `_pcb_outline` =
  `fillet` 0.5 of that. Anchor poses come from `points.yaml` (`readPoints`, a line parser like
  `keysOf`), except the two construction points `mcu_cover_bottom_left` and
  `plate_additional_outline_bottom_left`, which are computed.
- **Evaluator** (`evaluate(shapes, id, points)`): `polygon` → `makerjs.models.ConnectTheDots`
  (closed), `add` → `makerjs.model.combineUnion`, `fillet` → `makerjs.chain.fillet` on every
  chain of `makerjs.model.findChains`. It returns a fresh makerjs model (exact lines and arcs,
  Ergogen frame), or a typed `{kind: 'construction-undefined', id, reason}` when a construction
  point it needs has parallel lines; nothing that depends on it is built and nothing throws.
- **Exact check**: `toSegments(model)` (`src/flatten.ts`) walks the paths into KiCad-frame
  `Segment`s (`(x, −y)`; arc mid at the mid-angle), then `compareSegments(edgeCuts, candidate)`
  against each design's Edge.Cuts (read from `CORNEY` with `readKicadPcb`).
- **Flatten** (`flatten(model | segments, tol)`): chains the segments into loops
  (`chainLoops`), keeps lines, and turns each arc into `n = ceil(sweep / (2·acos(1 − tol/r)))`
  equal chords, so no chord's sagitta exceeds `tol`. **Flattened check**
  (`flattenedDeviation(reference, polyline)`): the symmetric max distance between the polyline
  and the fixture's exact segments (exact point-to-line and point-to-arc distances), both ways,
  sampling each curve every 0.005 mm. The sampled max is a lower bound; `+ step/2` is an upper
  bound (distance is 1-Lipschitz along a curve), and the test asserts the upper bound ≤ 0.05 mm.
- **Negative control**: `matrix_outer_bottom`'s vertex shifted 0.06 mm in x (in the shape data)
  fails `compareSegments` and has a flattened deviation (lower bound) of 0.063 mm, so both
  checks can fail. Parallel lines (`mcu_cover_bottom_left` built from two `r = 0` y axes) give
  `construction-undefined` with no throw; the backplate union and the fillet are not called,
  and `_plate_outline`, which does not need that point, still evaluates.
- **Latency**: `?outline` runs 5 warm-up builds, then 30 timed builds (evaluate + flatten at
  the chosen tol) one by one on the page's main thread, and shows `{status, medianMs, maxMs,
  runs, vertices, loops, tol}`. `e2e/outline.spec.ts` blocks every non-local request and fails on
  any console error, warning or page error.

### Results (2026-10-28, makerjs 0.19.2, Node 26.12.1, Vitest 4.1.12, Chromium headless from Playwright 1.64.1)

Wired and wireless share one `_pcb_outline` (their Edge.Cuts are identical, 19 lines + 18
arcs), so every number below is the same for both.

| | wired | wireless |
|---|---|---|
| makerjs paths (before / after the collinear merge) | 38 / 37 | 38 / 37 |
| exact: `compareSegments` | pass, 37 / 37 | pass, 37 / 37 |
| exact: max deviation | 1.0e-7 mm | 1.0e-7 mm |
| construction points vs `points.yaml` | 2.1e-10 mm each | (same points) |
| flattened at tol 0.005: deviation (lower / upper bound) | 0.0046 / 0.0071 mm | 0.0046 / 0.0071 mm |
| flattened vertices (1 loop) | 115 | 115 |
| main thread, evaluate + flatten, 30 builds | median 1.70–6.90 ms, max 2.60–28.4 ms over six runs (spec alone or in `verify`; the high ones on a loaded machine, load average about 11) | (one build serves both) |

Tolerance sweep (`flatten` of the same segments, mean of 20 runs after a warm-up, Node):

| tol mm | vertices | flattened deviation mm | upper bound mm | flatten ms |
|---|---|---|---|---|
| 0.001 | 226 | 0.00091 | 0.00341 | 0.13–0.20 |
| 0.005 | 115 | 0.00457 | 0.00707 | 0.07–0.10 |
| 0.01 | 85 | 0.00967 | 0.01217 | 0.10–0.20 |
| 0.025 | 68 | 0.01704 | 0.01954 | 0.08 |

- **Latency**: the median is two to seven milliseconds a build, so a typical rebuild fits a
  16 ms frame on the main thread. The max is the noisy figure: 2.6 ms on a quiet run, but up to
  28.4 ms on a loaded machine (likely GC or scheduling), which would drop a frame. No worker is
  needed for Corney's outline, but the live latency target (architecture Deferred) should be set
  on the max, not the median.
- **Chosen tolerance: 0.005 mm, fixed.** Flattening then costs under 0.005 mm of the 0.05 mm
  budget (a tenth), leaving the rest for everything downstream (offsets, clipper booleans, KiCad
  export rounding). 0.001 doubles the vertex count (226) for no gain at this budget; 0.01 and
  0.025 save only 30–47 vertices while eating a fifth to a third of the budget. Flatten time is
  well under a millisecond at every value, so time does not decide it; vertex count (what every
  later polygon operation pays for) and budget share do. The flattened deviation is the arcs'
  sagitta: the exact paths match the fixture to 1e-7 mm, so flatten is the only error, as the
  plan's design note expected.
- **makerjs quirk: the union splits one edge.** `combineUnion(_plate_outline,
  _backplate_additional_outline)` breaks the plate's top edge (y = 52.99) at
  `mcu_cover_top_left` (205.113, 52.99), where the other polygon's vertex lies on it: 38 paths,
  and the fixture's line #17 is two collinear lines. Ergogen's own export of
  `_backplate_outline` (makerjs, `combine` with its own options) does not split there. Per the
  plan, `mergeCollinear` joins lines that share an end within 1e-6 mm and run the same way
  within 1e-6 rad, before `compareSegments`; it records each join (exactly one, at 205.113) and
  never drops or invents a segment. The fixture's own collinear-looking corner at (224.518,
  113.997) is a source polygon vertex 3.8e-5 rad off straight, so it is not merged, and makerjs
  leaves it unfilleted exactly as Ergogen did. The flattened polyline keeps the split's extra
  vertex (it is in the 115); a production flatten should merge collinear lines first.
- **makerjs quirk: `chain.fillet` leaves near-collinear corners sharp** (that corner above), and
  the fixture has the same sharp corner, so this matches Ergogen rather than being a defect here.
- **makerjs typings**: `IPoint` is an index signature, not a tuple, and `findChains` returns a
  union with its map form, so `src/` casts `IPathLine` / `IPathArc` / `IChain[]` after the type
  guards.
- ☝️ **Ergogen itself uses makerjs.** A pass shows that makerjs reproduces Corney when driven
  from our shape model, not that makerjs is sound on unusual arc booleans; entry 12's LambBT case
  covers that.

## Geometry verdict cases (story 12)

`pnpm test` (`src/circle-cut.test.ts`) and `pnpm route` (`e2e/outline.spec.ts`,
`?outline=lambbt`). Story 11 only showed makerjs rebuilding Corney, which Ergogen already builds
with makerjs. This entry checks makerjs's arc booleans against a reference that does not use
makerjs: LambBT's r = 150 mm concave cut, the vertex, tangent and re-cut edge cases, and the
cases the plan pins to makerjs issues #509, #377 and #387. The verdict is
`_bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/geometry-verdict.md`.

- **Shape model** (`src/outline-shapes.ts`): two new kinds. `circle` is an anchored centre
  (a `Vertex`) plus a radius, built as a makerjs `paths.Circle`. `subtract` is `from` minus each
  `cut` in order, built with `makerjs.model.combineSubtraction`. Corney's shapes and results are
  unchanged.
- **LambBT** (`LAMBBT_POSES`, `LAMBBT_OUTLINE_SHAPES`): no Ergogen run. The key poses come from
  `lambbtPoses()`, a transcription of Ergogen v4's column layout (spread 18, padding 17, stagger
  accumulating, each splay pushed as a rotation about its origin and applied to every later
  column, the thumb zone anchored on `matrix_inner_bottom` shifted `[0, −24]` in its −5° frame).
  The rotations come out as in `sources/README.md` §B: pinky 15, ring 5, middle 0, index −5,
  inner −5, thumbs −20 and −30. `board` is LambBT's 15-vertex `stack` polygon (simple, 9149 mm²,
  about 127 × 99 mm). Its fifth vertex `[{ref: matrix_inner_top, affect: r}, {shift: [0, 2.675py]}]`
  is the pose `board_thumb_rise`, the fourth vertex's position with `matrix_inner_top`'s
  rotation. `fillet: 1` is dropped, as the plan allows. `pcb` = `board` − `cutout_circle_small`
  (r = 150 at `matrix_middle_bottom` shifted `[−13, −188]`), as in LambBT.
- **Reference** (`src/circle-cut.ts`): `subtractCircle(polygon, centre, r)` gives the exact
  boundary of polygon − disc. Each edge is split where it meets the circle, and each piece is
  kept when its midpoint is outside the disc. The circle is split at those points, and each arc
  is kept when its mid-angle point is inside the polygon (even-odd). A vertex within 1e-9 mm of
  the circle is on it, and a line within 1e-9 mm of tangency touches it at its foot. Kept pieces
  that continue each other through a point that ends no other kept piece (a tangent touch) are
  joined back. `circleMinusPolygon` is the same with the keep tests swapped (disc − polygon, for
  #509). Six hand-computed unit tests cover them: a circle through (1, 0) and (9, 0) under a
  10 mm square, a quarter disc about a corner, a circle through two vertices, a tangent from
  outside, a hole and a miss, and disc − square.
- **Checks**, as in story 11. The exact check is
  `compareSegments(reference, mergeCollinear(toSegments(makerjs)))`. The flattened check is
  `flattenedDeviation(reference, flatten(makerjs, 0.005))`, with its upper bound ≤ 0.05 mm. The
  clipper2 check (`clipperSubtract`) subtracts the circle as `chordCount(150, 2π, 0.001)` equal
  chords with `differenceD` at 1e-6 mm. The symmetric deviation between that and makerjs's
  flattened loop must be ≤ 0.05 mm (upper bound).
- `toSegments` now emits a `circle` segment for a whole circle. `flatten` turns one into its own
  loop of `chordCount` chords, and `fromSegments` is its inverse (one flat makerjs model).
- **Latency**: `?outline=lambbt` is story 11's page (5 warm-up builds, then 30 timed builds on the
  main thread) on LambBT's `pcb`. `?outline` alone is still Corney. A build is now the pipeline
  the verdict prescribes: evaluate, `toSegments`, `mergeCollinear`, then flatten the segments
  (story 11's build flattened the model without the merge, so Corney now has 114 vertices, not
  115).
- **Offset timing** (#387): each run gets a fresh input built outside the timer, so the times
  are the offset alone (makerjs `model.outline`, or clipper2 `inflatePathsD` of an
  already-flattened outline). Each offset that passes must also enclose more area than the
  source (9204.6 mm²), so an inward 1.45 mm offset cannot pass the distance check.

### Results (2026-10-28, makerjs 0.19.2, clipper2-ts 2.0.1-18, Node 26.12.1, Vitest 4.1.12, Chromium headless from Playwright 1.64.1)

| Case | makerjs result | Check |
|---|---|---|
| LambBT cut | 16 paths (15 lines + 1 arc), 0 collinear joins, one closed chain | exact: pass, 16 / 16, max 1.6e-7 mm. Arc centre 4.6e-13 mm off, radius 4.0e-13 mm off |
| LambBT flattened, tol 0.005 | 1 loop, 57 vertices | 0.00485 mm (upper bound 0.00735) |
| clipper2 cross-check | 1 loop, 109 vertices | clipper2 vs makerjs 0.00485 mm (bound 0.00735); clipper2 vs reference 0.00100 mm (bound 0.00350) |
| Arc through a vertex (r = 150.194044, through the pinky bottom-left corner) | 15 paths, one chain, shortest 2.83 mm | exact: pass, 15 / 15, no duplicate or zero-length segment; the arc ends on the vertex |
| Tangent outside (r 150 touching the left edge at its midpoint) | 16 paths, 0 arcs: the touched edge comes back as two lines | raw: fail (one edge split). After `mergeCollinear`: pass, 15 / 15, one join 5.6e-8 mm from the touch point |
| Concentric re-cut ((board − circle) − circle) | 16 paths, one chain | exact: pass against the single cut, so the cut is idempotent |
| Mounting hole (board − r 1.1 circle at `matrix_middle_home`, wholly inside) | 16 paths: the 15 board lines + 1 whole `circle` path | exact: pass against `subtractCircle` (a hole), 16 / 16. Flattens to 2 loops, within 0.05 mm |
| #377 coincident edges (100² − 50² box sharing top and right) | 8 paths, open chain: A's shared edges stay, B's inner edges added | raw: fail. `model.simplify`: 6 paths, still fail (the shared edges stay) |
| #377 workaround (cutter extended 10 mm past the shared edges) | 6 lines, one loop | exact: pass, 6 / 6 |
| #509 stray lines (r 402.7 circle − triangle (300, 0), (400, ±100)) | 5 paths (2 arcs, 3 lines), 2 closed loops (the body and a 2.7 mm sliver right of x = 400) | every path on the true boundary (sampled every 0.5 mm, 1e-6 mm). Exact against `circleMinusPolygon`: pass, 5 / 5. Not reproduced |
| #387 `model.outline(_pcb_outline, 1.45)` | 6 loops of about 43 vertices round single corners, no outer loop | worst \|d − 1.45\| = 1.44 mm. Reproduced. Offset alone 73.4 ms median, 93.7 ms max (Node, 10 runs). `_plate_outline` (no split) gives 1 loop; `_backplate_outline` (split, no fillet) gives 0 loops (both asserted) |
| #387 flat model, split kept (`fromSegments(toSegments(…))`, no merge) | the same 6 loops | worst \|d − 1.45\| = 1.44 mm, still broken. 69.3 ms median, 76.6 ms max |
| #387 workaround (`fromSegments(mergeCollinear(…))` first) | 1 loop, 128 vertices, 9818.4 mm² | worst \|d − 1.45\| = 0.00499 mm, outward, pass. 71.1 ms median, 80.9 ms max |
| #387 alternative: clipper2 `inflatePathsD` of the flattened outline (round joins, arc tol 0.001) | 1 loop, 315 vertices, 9818.4 mm² | worst \|d − 1.45\| = 0.00444 mm, outward, pass. 1.5 ms median, 3.3 ms max |
| Negative control (circle centre moved 0.06 mm along y) | — | exact: fail (lines #2 and #3 and the arc, up to 0.176 mm). Flattened: 0.0600 mm > 0.05, fail |
| Latency, `?outline=lambbt` (evaluate + `toSegments` + `mergeCollinear` + flatten) | 1 loop, 57 vertices | median 0.60–0.70 ms, max 1.30–4.60 ms over 30 builds, two runs of the spec. Corney in the same runs: median 2.20–2.35 ms, max 4.20–5.30 ms, 114 vertices |

- **The LambBT cut is exact.** makerjs's intersection points agree with the reference to
  1.6e-7 mm (makerjs rounds intersections to about 7 decimals), and its arc lies on the cutting
  circle to 1e-12. The only error in the flattened loop is the arc's sagitta at tol 0.005, as on
  Corney. clipper2's polygon is within 0.001 mm of the reference, as built (its circle at tol
  0.001).
- **Finding: tangency splits an edge.** A circle touching an edge from outside removes nothing,
  but makerjs breaks the edge at the touch point. `mergeCollinear` (story 11) joins it back, so
  the evaluator's output should always go through it before anything compares or flattens it.
- **Finding #377, reproduced: coincident edges give a wrong, open result.** When the cutter
  shares edges with the shape, makerjs keeps the shape's shared edges where they should go, adds
  the cutter's inner edges, and leaves an open chain. `model.simplify` does not fix it. Extending
  the cutter past the shared edges gives the exact L. That is an authoring workaround, so an
  evaluator should check that every result chain closes and report a typed error when one does
  not.
- **#509, not reproduced** on the plan's case. A large circle minus a triangle whose vertical
  edge crosses the circle gives only boundary paths, in two closed loops (a thin sliver
  included).
- **Finding #387, reproduced: `model.outline` breaks on a split edge, and it is slow.** On
  Corney's `_pcb_outline` it returns six loops round single corners and no outer loop.
  `_backplate_outline` gives no loop, and `_plate_outline` works. The cause is the collinear
  split (story 11's union split at 205.113), not the nested model: the same paths in one flat
  model, split kept, fail the same way, and merging the split alone fixes it (exactly 1.45 mm,
  within 0.005 from flattening). The offset itself still takes about 70 ms in Node, more than
  four 16 ms frames. clipper2's `inflatePathsD` of the flattened outline is within 0.0044 mm and
  takes 1.5 ms.
- **#477 (slow union of many shapes)**: not tested, as the plan says. Corney's two unions take
  1.7 ms in all.
- ☝️ **Arc-against-arc is only partly covered.** LambBT's `fillet: 1` is dropped, so the r = 150
  circle cuts only lines. The re-cut (an arc on the same circle) and #509 (arcs on one circle) are
  the only arc-on-arc cases.
- ☝️ **#377 was tested in one configuration only**: a cutter sharing two whole edges (top and
  right) with the shape. There, makerjs's result is open, so a closed-chain check catches it. A
  cutter sharing one edge, or overlapping an edge only in part, was not tested and might give a
  closed but wrong shape that such a check would miss.
