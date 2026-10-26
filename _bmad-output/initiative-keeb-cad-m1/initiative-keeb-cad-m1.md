---
type: initiative
title: "Corney Island rebuilt visually in keeb-cad, through to files ready for production"
sources:
  - _bmad-output/prd-keeb-cad-m1/prd-keeb-cad-m1.md
  - _bmad-output/prd-keeb-cad-m1/addendum.md
companions:
  - _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
after: []
risk: high
---

# Corney Island rebuilt visually in keeb-cad, through to files ready for production

## Description

Milestone 1 of keeb-cad proves the whole pipeline on one board. Corney Island v0.3 is rebuilt from a blank canvas in a browser-only visual editor where the layout is the single source of truth. Outline, plates, PCB with browser routing, tray case and ZMK firmware all follow layout edits without manual realignment, and production files come out at the end. Wired and wireless are two designs: the second is a copy of the first. Scope, controls and follow behaviour come from the PRD (§4.0 control and follow matrix). The architecture spine fixes the invariants every epic shares.

## Outcome

For Sergii as builder: one layout edit updates every output of a design, and both Corney Island designs reach fab-checked gerbers and building ZMK firmware (PRD SM-1 to SM-5).

## Requirements

- R1 (prd FR-1): Build a layout from a blank canvas with groups and slots placed by anchor + offset (offset, then rotate about pivot). Any node anchors to any node, and moving a node moves everything anchored to it, transitively.
- R2 (prd FR-2): Arrange children freely or as a chain. Corney Island's cumulative column stagger and 3-key thumb fan are expressible without absolute coordinates. Each node has one rotation, carried along the chain; a mid-chain turn that must not carry uses an explicit anchor. Placement reproduces Ergogen within ±0.05 mm.
- R3 (prd FR-3): Set pitch independently of switch type, slot size (1u, 1.5u), a key cell applied to every key, and overrides per group or part. Changing the key cell updates every key's footprints. Choc v2 at 19 mm pitch is expressible.
- R4 (prd FR-4): Design a split-reversible board (one geometry, one PCB, per-side population). Split-mirrored and unibody designs load without a model change; editing them is deferred.
- R5 (prd FR-5): Save As a copy of a design that records its source design and revision. Corney Island wireless is a copy of wired with different parts, positions and population.
- R6 (prd FR-6): Build named shapes from key outlines, rectangle, circle, polygon, add/subtract/intersect, and offset with corner style and fillet, and reference shapes from shapes. Corney Island's 18-vertex filleted outline and LambBT's r = 150 mm circle subtraction are expressible.
- R7 (prd FR-7): Every primitive and polygon vertex is anchored to a node, construction point or other vertex, and can be reused across shapes. Moving a column moves exactly the vertices anchored to it.
- R8 (prd FR-8): Place curated catalogue parts in slots anchored to any node. The catalogue covers everything Corney Island needs, with footprints from keeb-cad's own library carrying attribution.
- R9 (prd FR-9): Parts bring their cutouts and keep-outs for plate, PCB and case; user cutouts are shapes subtracted with booleans. Moving a part moves its cutouts in every output together.
- R10 (prd FR-10): Define several plates (Corney: switch plate, backplate, MCU cover) as shapes that update live. Each exports as DXF/SVG or as gerbers.
- R11 (prd FR-11): The PCB edge comes from the outline, footprints from key cells and parts, and nets and matrix from layout and population. Moving a key updates its footprints and nets. The user can override matrix rows/columns, MCU pins and LED chain order.
- R12 (prd FR-12): Key-cell tracks follow keys live, and other connections route in the browser, in the background, with progress.
  - Routes are saved in the design and kept while their endpoints are unchanged and DRC passes; only broken connections are rerouted.
  - Unrouted connections are always reported.
  - Design rules are obeyed, and a pre-routed module zone is allowed.
  - No manual trace editing.
- R13 (prd FR-13): Export fab-ready gerbers + drill once routing completes, gated by zero DRC errors. A KiCad export that opens in KiCad 10 is always available as the escape hatch.
- R14 (prd FR-14): Add a tray case from a parameterised template and edit the 3D operations it is built from (extrude, offset, boolean, z-position), with the parameters still in effect.
  - The case follows the outline and part cutouts, and rebuilds in the background with progress.
  - It exports STL and STEP.
  - The operation set is extensible.
- R15 (prd FR-15): Matrix, pin mapping and ZMK physical layout are derived from the design. A ZMK configuration is exported per design, with RGB for the wired design. The firmware model is neutral, so QMK can be added without design changes.
- R16 (prd FR-16): Author a keymap (keys, layers) that expresses Corney Island's own ZMK keymap and behaviours. Entries follow their keys; deleting a key deletes its entries, and undo restores them.
- R17 (prd FR-17): Every edit propagates to all affected outputs, live or in the background with progress. Stale results are always marked. The editor warns about overlaps, pitch below minimum, anchor cycles, unrouted connections and DRC violations.
- R18 (prd FR-18): Save and open a design as one versioned file (older files migrate), with browser autosave. Undo/redo covers every named command (one gesture = one step). Stable ids keep keymap entries and saved routes attached through edits.

## Constraints

- C1 (prd §6): Browser-only; every stage, including routing and case solids, runs client-side with no server.
- C2 (prd §6): Stable outputs: the same file reopens to the same outputs, and an edit changes only what it must. Routes are saved, case solids may be cached, and pure derivations are recomputed.
- C3 (architecture spine): AD-1 to AD-21 bind every epic and story. Work that needs to break one goes back through `bmad-architecture`.
- C4 (prd SM-1, SM-2, SM-C1): Acceptance is against Corney Island v0.3's Ergogen output within ±0.05 mm (key centres, outline vertices, plate cutouts, case dimensions), with no Corney-specific shortcuts.
- C5 (prd §5, FR-15): ZMK is the only firmware target, and the catalogue is curated (no user-imported parts).
- C6 (prd SM-C2): Routing completion is never bought by loosening clearances or hiding unrouted connections.

## Done when

- Corney Island wired is rebuilt from a blank canvas, with key centres, outline vertices and plate cutouts within ±0.05 mm of Ergogen (SM-1).
- The tray case matches Corney Island's case dimensions within ±0.05 mm (SM-2).
- Both designs route in the browser, pass DRC, and export gerbers + drill that pass the fab's checks. If the routing spike fails, the KiCad export routed outside keeb-cad producing fab-ready files counts instead. The PCB is compared with Corney Island's by parts and nets, not copper (SM-3).
- ZMK firmware for both designs builds from the export (SM-4).
- The SM-5 edit script runs with zero manual fix-ups in any output.

## Boundaries

- Out (prd §5):
  - remix and the block library; propagating layout changes between designs
  - MX, Choc v1 and the Sofle thumb as built references
  - editing unibody and split-mirrored designs
  - manual trace editing; QMK; Ergogen and KiCad import; KLE
  - case styles other than tray, and tenting
  - accounts and sharing
  - bare-chip routing; user-imported parts
- Out: editor views, panels and drag semantics. They are decided in a separate UX session (`bmad-ux`) before the editor stories.
- Touch point: Ergogen reference output (Corney Island) — golden comparison; owner: epic-risk-spikes
- Touch point: routing engine (tscircuit capacity-autorouter or a custom keyboard router, chosen by epic-risk-spikes) — runs in a worker; owner: epic-routing-and-fab
- Touch point: KiCad 10 — opens the board export; owner: epic-parts-and-pcb
- Touch point: fab gerber checker — accepts gerbers + drill; owner: epic-routing-and-fab
- Touch point: ZMK v0.3.0 build toolchain — builds the exported config; owner: epic-firmware-and-keymap
- Touch point: static host — serves the app and WASM; deferred to the first public preview (milestone 1 runs locally only, epic-platform-baseline Decision 2026-10-26)
- Tracer path: a blank canvas → Corney's layout, shapes and outline → plates → PCB placement and nets → browser routing → DRC → gerbers, alongside the case and ZMK firmware, all from one design file.

## References

- prd — _bmad-output/prd-keeb-cad-m1/prd-keeb-cad-m1.md, §4.0 control and follow matrix, §4 FR-1 to FR-18, §7 success metrics, §8 open questions
- prd — _bmad-output/prd-keeb-cad-m1/addendum.md, routing candidates, tray case reference numbers, Ergogen operations
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, Invariants AD-1 to AD-21, Deferred (routing and geometry spikes scheduled first)
- fixture — _bmad-output/layout-model/sources/corney-island.yaml

## Notes

- Open question: Routing engine (prd §8 Q1). Epic-risk-spikes compares tscircuit capacity-autorouter with a custom keyboard router. Freerouting is dropped as a runtime engine (see that epic's research). If it fails, SM-3 is re-scoped to the KiCad export routed outside keeb-cad. Owner Sergii; first work item.
- Open question: ZMK wired split (prd §8 Q2). Corney Island's single-wire TRRS vs ZMK v0.3.0's two-wire UART split. The options are rewiring, testing half-duplex on hardware, or BLE split. This blocks SM-4 for the wired design. Owner Sergii; decide before the firmware epic.
- Open question: Live latency target (prd §8 Q3). Measure once the live stages exist. Owner Sergii.
- Open question: Construction point kinds beyond line intersection (prd §8 Q4). Settle during the Corney rebuild.
- Open question: Footprint licence (prd §8 Q6). Confirm that ceoloide's licence allows derivation with attribution. Owner Sergii; before footprint library work.
- Decision: 2026-10-25 sliced into 10 epics by capability (one static deploy, so no package is an epic boundary); risk first: platform baseline and risk spikes open, milestone acceptance closes.
- Decision: 2026-10-25 the catalogue schema with the Choc v2 switch and M2 screw cutouts moves into epic-layout so plates get part cutouts before epic-parts-and-pcb.
- Decision: 2026-10-25 epic-design-document owns the worker harness, every AD-8 section skeleton and the export registry, so routing, case and firmware don't collide in `model`.
- Decision: 2026-10-25 the UX session runs inside epic-platform-baseline; epic-layout waits on it.
- Decision: 2026-10-25 Corney's TRRS nets are derived unchanged in epic-parts-and-pcb; a later rewire changes only the jack's catalogue pin roles.
