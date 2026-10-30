---
type: epic
title: "Outline follows the keys"
parent: initiative-keeb-cad-m1
covers: [R7, R17]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Outline follows the keys

## Description

Derived pieces fit each group of Corney's keys and their parts with a margin, join into the outline, refit live as keys move, and report fit-violated, drawn on the Pieces canvas. Opens with a spike: can derived pieces reproduce Corney's outline as the same shape within ±0.05 mm?

## Outcome

For Sergii: Corney's outline follows every key move with no manual realignment (R7).

## Done when

- The opening spike reports whether derived pieces reproduce Corney's outline as the same shape within ±0.05 mm.
- Derived pieces refit live when a key moves, and a sticking-out key or part is fit-violated.
- The slice scenario and one e2e journey pass.

## Boundaries

- Out: what the other slices of the initiative own (initiative breakdown, component-ownership map).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
- companion — _bmad-output/initiative-keeb-cad-m1/component-ownership.md

## Notes

- Waits on epic 15 because: live key moves to refit against
- Decision (2026-10-30, replan): created as a vertical slice; every slice runs on Corney's layout-command script with its own invariant checks, golden comparisons only in milestone accepted.
