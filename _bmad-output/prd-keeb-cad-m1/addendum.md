# Addendum: keeb-cad milestone 1

## Routing engine candidates (for the spike)
- tscircuit capacity-autorouter: TypeScript, MIT, browser-native; DRC maturing.
- Freerouting: Java (DSN→SES); no WASM build; CheerpJ 3 plausible, unproven. Corney Island CI uses Freerouting, so it is a routing-quality reference.
- Spike must test incremental routing (fixed existing traces) and pre-routed module zones.

## Tray case reference numbers (Corney Island v0.3)
Wall 1.2 mm, PCB-to-wall gap 0.25 mm, floor 1.0 mm, plate 1.6 mm, 4 mm internal gap, wall height ~6.6 mm, M2 screws (r 1.1, head r 2.05, standoff r 2.15), 8×40 mm MCU/USB wall cutout. Walls = offset(pcb, wall+tol) − offset(pcb, tol).

## Ergogen operations used by the reference boards
Shapes: rectangle, circle, polygon, outline-reference. Ops: add, subtract, intersect, stack, expand (joints), fillet. Cases: extrude, 3D shift, case reuse, booleans. Not used: bind/autobind, hull, mirror, asym. All three outlines are hand-authored polygons anchored to keys.

## Milestone 2 (remix) context
Source: Corne (crkbd) MX wired. Target: Choc (v1 and v2) wireless with the Sofle thumb cluster. Sofle v2 angles are unpublished; measure from its KiCad files. Corney Island's Choc wireless PCB is a comparison reference.

## Architecture impact (from input reconciliation)
The PRD departs from the architecture spine in ways that require an architecture update (see `reconcile-architecture.md`):
- Outline is authored from anchored shapes and construction points, not computed (spine: derived outline); any node may anchor to any node (spine AD-3 restricts this).
- Variants: one layout, several electronics setups → per-variant matrix, netlist, stage inputs, cache keys and exports.
- Routes are saved in the design file and reused incrementally (spine: routing is a pure derivation).
- Gerber + drill export in-app, DRC-gated, in milestone 1 (spine AD-15: gerbers via KiCad until milestone 2).
- Design file gains sections for shapes, keymap and editable case operations.
- Firmware: ZMK only in milestone 1 with RGB; firmware-neutral keymap model (spine includes QMK).
