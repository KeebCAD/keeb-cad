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
