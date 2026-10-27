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
`peakMemoryMb`, and for entries 7 and 10 an optional
`reroute {movedKey, delta, changedConnections, savedRoutes{unchanged, changed},
fixedCopperViolations}`.

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
`scripts/run-status.ts` maps the worker's response to the scorecard's `run.status`. The shared KiCad helpers are in `scripts/kicad.ts`. The
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

| | wired | wireless |
|---|---|---|
| run | solved, 247.2 s | solved, 26.6 s |
| routed (key-cell + routing) | 330 / 333 (99.1%) | 144 / 152 (94.7%) |
| key-cell / routing | 63/63, 267/270 | 63/63, 81/89 |
| peak worker JS heap | 951.8 MiB | 458.7 MiB |
| `drc` baseline + added | 216 + 3418 | 0 + 250 |
| `drc` on the routed board, by kind | clearance 2634, hole 419, edge 352 (216 of them baseline), short 229, track-width 0 | hole 142, clearance 96, short 12, track-width 0 |
| KiCad added (clearance family) | 963; `addedUncertain`: copper edge and hole clearance (at 199) | 241 |
| cross-check `drcOnly` / `kicadOnly` | 2689 / 81 | 16 / 7 |

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
  `scripts/kicad.ts`). The remaining `kicadOnly` entries (wired 81, wireless 7) are listed in
  the scorecard and not yet explained.
- Solve time and heap move between runs. Before the width change, wired solved in 143.9 s and
  148.4 s.
