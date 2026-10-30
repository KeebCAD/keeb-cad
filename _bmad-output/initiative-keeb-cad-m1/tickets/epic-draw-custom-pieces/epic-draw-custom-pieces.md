---
type: epic
title: "Draw custom pieces"
parent: initiative-keeb-cad-m1
covers: [R6, R7]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Draw custom pieces

## Description

The user draws pieces from primitives, booleans and offset, with vertices anchored to keys, groups, construction points or other vertices, and accents on top; LambBT's circle subtraction is expressible, and Corney's exact outline is drawn if the opening spike of 'outline follows the keys' says derived pieces can't match it.

## Outcome

For Sergii: a silhouette the fit can't express is drawn once and still follows its anchors (R6, R7).

## Done when

- Drawn pieces with anchored vertices and construction points move only with their anchors.
- Accents apply; LambBT's circle subtraction is expressible.
- The slice scenario and one e2e journey pass.

## Boundaries

- Out: what the other slices of the initiative own (initiative breakdown, component-ownership map).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
- companion — _bmad-output/initiative-keeb-cad-m1/component-ownership.md

## Notes

- Waits on epic 17 because: the outline and the Pieces canvas
- Decision (2026-10-30, replan): created as a vertical slice; every slice runs on Corney's layout-command script with its own invariant checks, golden comparisons only in milestone accepted.
