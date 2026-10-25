---
type: epic
title: "Corney Island's keys and parts placed from a blank canvas"
parent: initiative-keeb-cad-m1
covers: [R1, R2, R3, R4, R8, R17]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Corney Island's keys and parts placed from a blank canvas

## Description

Groups, slots, anchors, chains, pitch, slot size, key-cell references and the split-reversible form place Corney Island's keys and parts within ±0.05 mm of Ergogen, shown live in the 2D preview with overlap, anchor-cycle and pitch warnings. The catalogue schema exists with the Choc v2 switch and M2 screw entries and their cutouts. Provides resolved per-side slot frames for vertices and footprints.

## Outcome

Corney Island's key positions are rebuilt visually and match Ergogen (SM-1, keys part).

## Done when

- Corney Island wired's key centres match the Ergogen fixture within ±0.05 mm.
- Moving a node moves everything anchored to it in the live preview.
- Overlap, anchor-cycle and pitch-below-min warnings appear with node ids.
- A split-mirrored or unibody file loads and reports unsupported-form.

## Boundaries

- Out: shapes and outline (epic-shapes-and-plates); footprints and nets (epic-parts-and-pcb).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Waits on epic 1 because: the UX session result
- Waits on epic 2 because: the Corney golden fixtures
- Waits on epic 3 because: commands, the design file and the revision-tagged pipeline
