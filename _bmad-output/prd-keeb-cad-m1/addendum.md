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

## Architecture impact (resolved 2026-10-25)
The architecture spine (`architecture-keeb-cad-layout-model`) was updated on 2026-10-25 and resolves every conflict listed in `reconcile-architecture.md`:
- Authored, anchored shapes and construction points, evaluated once in the model (AD-16); any node may anchor to any node, and the chain step is the default anchor (AD-3, AD-4).
- Variants dropped: one design = one electronics setup; wired and wireless are two designs linked by copy provenance (AD-21, AD-9). The PRD was revised to match (FR-5, SM-3–SM-5).
- Routes saved in a routing section outside undo, re-validated after every committed edit (AD-12).
- Gerber + drill in-app behind a single DRC (AD-15, AD-20).
- Design file sections for shapes, parameters, keymap and case operations (AD-8, AD-17, AD-18, AD-19).
- ZMK only, firmware-neutral keymap (AD-19); the single-wire TRRS gap is PRD §8 Q2.
- One rotation per node, carried along the chain (AD-4); the PRD was revised to match (FR-2).
