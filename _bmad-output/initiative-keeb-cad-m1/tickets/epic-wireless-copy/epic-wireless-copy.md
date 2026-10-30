---
type: epic
title: "Wireless copy"
parent: initiative-keeb-cad-m1
covers: [R5, R8]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Wireless copy

## Description

Copy design makes Corney Island wireless from wired with provenance; its different parts, positions and population follow through PCB, routing, case and a building ZMK config.

## Outcome

For Sergii: Corney Island wireless exists as a copy of wired with its own electronics, through to building firmware (R5, SM-3, SM-4).

## Done when

- Copy design makes the wireless design with provenance.
- Its parts, positions and population follow through PCB, routing, case and a building ZMK config.
- The slice scenario and one e2e journey pass.

## Boundaries

- Out: what the other slices of the initiative own (initiative breakdown, component-ownership map).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
- companion — _bmad-output/initiative-keeb-cad-m1/component-ownership.md

## Notes

- Waits on epic 21 because: the wired case
- Waits on epic 9 because: the wired ZMK config
- Waits on epic 7 because: the wired routing and fab path
- Waits on epic 16 because: Save to file and the File menu
- Decision (2026-10-30, replan): created as a vertical slice; every slice runs on Corney's layout-command script with its own invariant checks, golden comparisons only in milestone accepted.
