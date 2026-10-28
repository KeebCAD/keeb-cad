---
type: epic
title: "Outline and plates follow the layout"
parent: initiative-keeb-cad-m1
covers: [R6, R7, R9, R10]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Outline and plates follow the layout

## Description

Anchored shapes and construction points reproduce Corney Island's outline, and its switch plate, backplate and MCU cover with part cutouts, within ±0.05 mm. They update live and export DXF and SVG. Provides the outline shape for the PCB edge and the case.

## Outcome

The outline and plates follow layout edits with no manual realignment (SM-1, outline and plate part).

## Done when

- Corney's outline vertices and plate cutouts match the fixture within ±0.05 mm.
- Moving a column moves exactly the vertices anchored to it.
- Each plate exports DXF and SVG.

## Boundaries

- Out: plate gerbers (epic-routing-and-fab); PCB and case cutouts (epic-parts-and-pcb, epic-tray-case).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Waits on epic 2 because: the geometry spike verdict and flatten tolerance
- Waits on epic 4 because: resolved slot frames and part cutouts
- Decision (2026-10-26, from epic-layout-editor refinement): this epic owns the Layout workspace's Outline context line (chip O): the shape holding the outline marker ★, drawn thin and non-editable behind the keys, following live during a gesture (EXPERIENCE.md › Canvas › Outline context line). Write it into Requirements when this epic is refined.
- Decision (2026-10-26, architecture update, commit 15bf969): a construction point from parallel or coincident lines is `construction-undefined`, a `model` error naming the point and its two lines; it and its dependents are not evaluated, and exports reading them are blocked (Consistency Conventions › Violations, AD-15). Write it into Requirements when this epic is refined.
- Decision (2026-10-28, geometry verdict and architecture update e7e1532): before relying on makerjs for plates, this epic tests a cut through a fillet arc (arc against arc); makerjs #377 with one shared edge and with a partial overlap (either might give a closed but wrong shape that `shape-failed` misses); makerjs #477 union cost on a 50-key plate; that a cutout added as a hole loop exports the same as a subtraction (AD-16 › Plates); and whether shapes are evaluated per side. A failure reopens AD-16, with clipper2 as the comparison. Source: `epic-risk-spikes/geometry-verdict.md` and the architecture's Deferred table. Write it into Requirements when this epic is refined.
