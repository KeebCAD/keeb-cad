---
type: epic
title: "Plates to DXF"
parent: initiative-keeb-cad-m1
covers: [R8, R9, R10]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Plates to DXF

## Description

Corney's switch plate, backplate and MCU cover are pieces minus part cutouts (Choc v2 switch, M2 screws from the catalogue schema, placed with the Part picker), update live as parts move, and export as DXF and SVG through the export registry, which reports each export available or blocked.

## Outcome

For Sergii: Corney's three plates come out as DXF/SVG and follow the layout (R10).

## Done when

- Corney's switch plate, backplate and MCU cover update live with part cutouts.
- Each exports DXF and SVG, and the export registry reports available or blocked.
- The slice scenario and one e2e journey pass.

## Boundaries

- Out: what the other slices of the initiative own (initiative breakdown, component-ownership map).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
- companion — _bmad-output/initiative-keeb-cad-m1/component-ownership.md

## Notes

- Decision (2026-10-30, replan): created as a vertical slice; every slice runs on Corney's layout-command script with its own invariant checks, golden comparisons only in milestone accepted.
- Waits on epic 18 because: drawn pieces for the MCU cover and any exact outline
- Waits on epic 13 because: live stage outputs
- Waits on epic 14 because: the catalogue schema and the inspector
