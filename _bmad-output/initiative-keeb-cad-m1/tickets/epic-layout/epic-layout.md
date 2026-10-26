---
type: epic
title: "Corney Island's keys and parts placed by the layout model"
parent: initiative-keeb-cad-m1
covers: [R1, R2, R3, R4, R8, R17]
sources: [_bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md]
companions: [_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md, _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md]
after: []
refined: true
risk: medium
---

# Corney Island's keys and parts placed by the layout model

## Description

Groups, slots, anchors, chains, pitch, slot size, key-cell references and the split-reversible form place Corney Island's keys and parts within ±0.05 mm of Ergogen, checked headlessly against the golden fixtures, with overlap, anchor-cycle, pitch-below-min and unsupported-form violations. The catalogue schema exists with the Choc v2 switch and M2 screw entries and their cutouts. Provides resolved per-side slot frames for vertices and footprints.

## Outcome

Corney Island's key positions, authored as layout commands, match Ergogen (SM-1, keys part); epic-layout-editor makes them buildable on the canvas.

## Requirements

- R1 (parent R1; architecture AD-3): Groups and slots are placed by one anchor plus offset (translate, then rotate about the pivot). The anchor is any slot attach point, group origin, vertex or construction point, referenced by id. Moving a node moves everything anchored to it, transitively. A command that would create a cycle is rejected; a loaded file with a cycle reports `anchor-cycle`.
- R2 (parent R2; architecture AD-4): Children are arranged free or as a chain (`+x` or `+y`) whose step is a default anchor with `gap`. Rotation carries along the chain; an explicit anchor stops the carry and keeps the child's index; empty slots still advance the chain. Corney Island's cumulative column stagger and 3-key thumb fan are authored without absolute coordinates and resolve within ±0.05 mm of the Ergogen fixture.
- R3 (parent R3; architecture AD-4, AD-5): The design's `pitch-x` and `pitch-y` are independent of switch type and can be overridden per group. `u` means `pitch-x` on x-tagged properties and `pitch-y` on y-tagged ones; `u` on an untagged property is `unit-mismatch`. Slots are 1u or 1.5u. Groups reference a key cell, inherited from the nearest ancestor and overridable per group. Choc v2 at 19 mm pitch is expressible. Pitch below the switch's minimum reports `pitch-below-min` and is never adjusted.
- R4 (parent R4; architecture AD-6): A split-reversible design authors the left side; `model.resolve` derives the right side by reflection, with side-qualified ids and attach points swapped. Population sets fitted per side per slot; an unfitted slot keeps its place and index. Geometric right-side overrides are rejected. Split-mirrored and unibody files load and report `unsupported-form`.
- R5 (parent R8; architecture AD-5): The catalogue schema exists in `model`: components, pins and pin roles, minimum pitch, 3D envelope, cutouts (role and target `plate` / `pcb` / `case`), keep-outs, fixed tracks, and part parameters with defaults. `library` holds versioned Choc v2 hotswap and M2 screw entries with their cutouts. A slot holds a catalogue part pinned by id and version, and anchors to any node.
- R6 (parent R17; architecture Consistency Conventions › Violations): The layout stage resolves placements live and reports `overlap`, `anchor-cycle`, `pitch-below-min`, `unsupported-form`, `unit-mismatch` and `unresolvable-reference` as `{ kind, severity, ids, message }` with side-qualified ids. A design problem never throws.
- R7 (EXPERIENCE.md › Interaction Primitives: chain drag rule, multi-selection, write-back, re-anchor): Model commands move nodes by a world delta converted into each node's anchor frame; only selected nodes with no selected ancestor move. In a chain, the part along the direction goes to `gap` and the perpendicular part to `offset.y`; a compensate option takes the same change off the next step. Rotate changes the deg term. Write-back changes a plain literal, or the last literal mm or deg term of an expression, appending one if there is none; values round to 0.01 mm and 0.1°. Re-anchor keeps the node's world placement and flattens its offsets to plain numbers relative to the new anchor. Each is one undo step.

## Constraints

- Initiative C2 (stable outputs), C3 (the architecture spine binds) and C4 (Ergogen acceptance within ±0.05 mm, no Corney-specific shortcuts) bind this epic.

## Done when

- Corney Island wired's key centres, authored through layout commands, match the Ergogen fixture within ±0.05 mm.
- Drag, compensate, rotate, write-back and re-anchor commands pass their headless tests, each as one undo step.
- Moving a node moves everything anchored to it in the resolved placements.
- Overlap, anchor-cycle and pitch-below-min violations are reported with side-qualified node ids.
- A split-mirrored or unibody file loads and reports unsupported-form.

## Boundaries

- Out: the Layout workspace UI: canvas, drag, rotation handle, nudge, anchor picker, inspector, violations panel (epic-layout-editor).
- Out: shapes and outline (epic-shapes-and-plates); footprints and nets (epic-parts-and-pcb).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, AD-3 to AD-6, Consistency Conventions › Violations
- design — _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md
- design — _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md, Interaction Primitives
- fixture — _bmad-output/layout-model/sources/corney-island.yaml

## Notes

- Waits on epic 2 because: the Corney golden fixtures
- Waits on epic 3 because: commands, the design file and the revision-tagged pipeline
- Open question: reversibility (raised by Sergii; EXPERIENCE.md › Upstream Handoffs). If split-reversible is deferred past M1, R4 changes, and so do the both-halves and population story and the unsupported-form check in Done when. Settle it (with bmad-architecture, AD-6) before that story starts. Until then this epic is written on split-reversible, as AD-6 and the spines stand.
- Decision (2026-10-26): split at refinement because the epic ran to about 15 stories. This epic keeps the placement model and the headless Ergogen match; the Layout workspace UX moves to epic-layout-editor (id 11), right after it. epic-shapes-and-plates can start its model stories once this epic is done.
- Decision (2026-10-26): tracer bullet is entry 1 (one Corney column: command → file → resolve → harness). Entry 3, the full Corney match, is the least certain and follows directly. Entry 6 runs last in the resolve lane because of its reversibility unknown; entries 8–9 are a parallel lane after 3.
- Decision (2026-10-26): in M1 a key-cell reference may name a cell that does not exist yet; it reports `unresolvable-reference` as a warning and Design settings show `none`. epic-parts-and-pcb creates the first key cell. No built-in default cell is seeded (initiative C4, no Corney-specific shortcuts).
