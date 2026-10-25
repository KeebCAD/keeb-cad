---
type: epic
title: "Tray case from an editable template"
parent: initiative-keeb-cad-m1
covers: [R9, R14]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Tray case from an editable template

## Description

The tray template builds Corney Island's case within ±0.05 mm in the background, with part case cutouts. Its parameters stay in effect after its operations are edited. It exports STL and STEP.

## Outcome

Corney Island's tray case follows the outline and part cutouts and matches the original (SM-2).

## Done when

- Case dimensions match Corney Island within ±0.05 mm (SM-2 list).
- Editing an operation keeps parameters in effect.
- STL and STEP export.

## Boundaries

- Out: case styles other than tray; tenting.

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Waits on epic 3 because: parameters, expressions and the worker harness
- Waits on epic 5 because: the outline shape
- Waits on epic 6 because: part case cutouts
