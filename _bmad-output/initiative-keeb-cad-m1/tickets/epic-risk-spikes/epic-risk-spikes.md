---
type: epic
title: "Routing and geometry risks answered"
parent: initiative-keeb-cad-m1
covers: []
sources: [_bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md]
companions: [_bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/research-browser-pcb-autorouters/research-browser-pcb-autorouters.md]
after: []
refined: true
risk: high
---

# Routing and geometry risks answered

## Description

Corney Island golden fixtures (Ergogen reference output for wired and wireless, plus a comparison harness) exist. The routing spike has run tscircuit's capacity-autorouter and a custom keyboard-router prototype against one bar on Corney's Ergogen-generated PCB. It has then either picked a browser engine that routes incrementally around fixed routes and a pre-routed module zone, or triggered the SM-3 KiCad fallback, and it has fixed the connection split rule. The geometry spike has confirmed makerjs on Corney's outline and a LambBT circle subtraction (or switched to clipper2) and fixed the flatten tolerance.

## Outcome

The two highest risks are answered before the epics that depend on them start.

## Requirements

- R1 (initiative C4): Corney Island golden fixtures exist for wired and wireless, both from one pinned Ergogen run. A harness reports each item's deviation against ±0.05 mm and fails when one is exceeded. The items are key centres and rotations, outline vertices and arcs, plate cutouts, and footprint positions from the `.kicad_pcb`.
- R2 (architecture AD-12, Deferred; research Recommendations): tscircuit `@tscircuit/capacity-autorouter` and a custom keyboard-router prototype are each scored on Corney wired and wireless against the bar in Notes.
  - Each is graded pass, pass with fallback, or fail.
  - Each result records completion %, DRC errors at Corney rules, Web Worker time and peak memory, and the reroute diff after a single-key move.
- R3 (architecture AD-12; initiative R12): Incremental routing is shown. After a single-key move, only that key's connections reroute, saved routes passed in as fixed obstacles come back unchanged, and no copper enters the pre-routed module zone. For tscircuit, both preloaded traces and the rect-obstacle workaround are measured.
- R4 (architecture AD-14): The connection split rule is written down. It depends only on ids and the netlist, a connection id is the net id plus its two pads in canonical order, and every connection id stays stable across a key move.
- R5 (architecture AD-16, Deferred): A geometry verdict covers Corney's outline, built from model shapes the AD-16 way, and a LambBT r = 150 mm circle subtraction. Either makerjs is within ±0.05 mm on both, with main-thread latency measured, or the switch to clipper2 is recorded along with the loss of exact arcs.
- R6 (architecture AD-16, Deferred): The flatten function and tolerance are fixed, and flattened output stays within ±0.05 mm of the fixtures.
- R7 (architecture AD-20; initiative C6): The clearance policy is shown: engines route at the strictest net-class clearance, and keeb-cad's `drc` reports violations per net class.
- R8 (initiative Done when, SM-3): Each verdict is written and signed off by the user. The routing verdict names an engine or triggers the SM-3 fallback. Changes to AD-12, AD-14, AD-16 and AD-20 go to `bmad-architecture`.

## Constraints

- Initiative C1 (browser-only), C3 (the architecture spine binds), C4 (acceptance against Ergogen within ±0.05 mm) and C6 (never loosen clearances or hide unrouted connections) bind this epic.
- Routing exit criteria (architecture Deferred): no network at runtime, and the engine installs under pnpm strict with TypeScript 6.
- Licence (Decision 2026-10-26): keeb-cad and its runtime dependencies stay permissive. GPL is allowed only as a separately loaded worker module that exchanges DSN/SES.

## Done when

- Corney Island golden fixtures and a comparison harness are committed under `fixtures/`, landing first so epic-layout can start.
- A written routing verdict, signed off by the user: tscircuit and the custom prototype are scored against the bar, then either an engine is chosen, with incremental routing around fixed routes and a pre-routed module zone shown, or the SM-3 fallback is triggered. The connection split rule is fixed.
- A written geometry verdict, signed off by the user: makerjs reproduces Corney's outline and the LambBT subtraction within ±0.05 mm with latency measured, or the switch to clipper2 is recorded. The flatten tolerance is fixed.

## Boundaries

- Out: production routing and shape code (epic-routing-and-fab, epic-shapes-and-plates). Spike code in `spikes/` is throwaway and does not ship.
- Out: Freerouting, krt-wasm and Topola as runtime engines. Freerouting may serve only as a native, dev-time quality reference.
- Out: case and tray dimensions in the harness (epic-tray-case).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, AD-12, AD-14, AD-16, AD-20, Deferred
- research — _bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/research-browser-pcb-autorouters/research-browser-pcb-autorouters.md

## Notes

- Assumption: the reference machine for the routing time budget of about 60 s is the user's own development laptop.
- Assumption: converting `.kicad_pcb` to engine input is shared spike glue, written once and used by both routers.
- Decision (2026-10-26): licence gate relaxed. GPL code is allowed only as a separately loaded worker module that exchanges standard file formats (DSN/SES), with its source offered. keeb-cad itself stays permissive. A native helper stays out (C1, AD-12).
- Decision (2026-10-26): the autorouter research (companion) is adopted. Freerouting, krt-wasm and Topola are dropped as runtime candidates.
- Decision (2026-10-26): the routing spike tests tscircuit `@tscircuit/capacity-autorouter`, plus a timeboxed custom TypeScript keyboard-router prototype (clipper2-ts + flatbush) on the same Corney board, for a head-to-head comparison.
- Decision (2026-10-26): routing bar, the same for both engines and fixed before either runs. **Pass** means Corney wired and wireless fully routed, zero KiCad DRC errors at Corney clearances, a single-key move reroutes only that key's connections and leaves the other saved routes unchanged, and each board routes in about 60 s or less in a browser Web Worker on a typical laptop. **Pass with fallback** means at least about 90% of connections routed and still DRC-clean, with the rest left visibly unrouted for SM-3 finishing in KiCad (C6). Anything below that is a **fail**.
- Decision (2026-10-26): tie-break when both engines land in the same tier: higher completion %, then single-key reroute behaviour, then routing time.
- Decision (2026-10-26): timeboxes are 3 sessions for tscircuit, 3 for the custom-router prototype and 2 for the geometry spike. When a timebox ends, the evidence so far becomes the verdict. Each verdict needs the user's sign-off.
- Decision (2026-10-26): the comparison harness compares key centres and rotations, outline vertices and arcs, plate cutouts and PCB footprint positions from Ergogen's `.kicad_pcb`, each within ±0.05 mm, for wired and wireless. Case and tray dimensions are added later by epic-tray-case.
- Decision (2026-10-26): spike code lives in a throwaway `spikes/` folder with its own pnpm-strict, TypeScript 6 project, so this epic runs in parallel with epic 1 and has no `after`. Only the fixtures and the harness ship, under `fixtures/`. The `spikes/` code is deleted, or archived on a branch, once the verdicts are signed off.
- Decision (2026-10-26): the geometry spike tests two cases. The first is Corney's outline (wired and wireless), built the AD-16 way from model shapes rather than by replaying Ergogen's makerjs calls, since Ergogen itself uses makerjs 0.18.1. The second is a LambBT-style subtraction of a circle of radius 150 mm, which exercises arc booleans and the coincident and tangent cases (makerjs #509, #377, #387, #477). Each case is measured for ±0.05 mm accuracy and main-thread latency.
- Decision (2026-10-26): engines route at the strictest clearance of any net class, and our own `drc` checks each net class's actual rules. No clearance is loosened (C6). Input to AD-20 for the architect.
- Decision (2026-10-26): flatten tolerance left to the geometry spike, starting from a maximum chord deviation of about 0.005 mm.
