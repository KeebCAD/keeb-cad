---
type: epic
title: "Nets and matrix"
parent: initiative-keeb-cad-m1
covers: [R11]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Nets and matrix

## Description

The netlist, matrix and connections are derived from layout, key cell and parts, with matrix row/column, MCU pin and LED-order overrides, and the cross-stage test shows the firmware matrix equals the PCB nets.

## Outcome

For Sergii: Corney's nets and matrix are derived, overridable, and the firmware matrix equals the PCB nets (R11).

## Done when

- Nets, matrix and connections are derived; matrix, pin and LED-order overrides apply.
- The cross-stage test shows the firmware matrix equals the PCB nets.
- The slice scenario passes.

## Boundaries

- Out: what the other slices of the initiative own (initiative breakdown, component-ownership map).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
- companion — _bmad-output/initiative-keeb-cad-m1/component-ownership.md

## Notes

- Waits on epic 6 because: placed footprints and pin roles
- Decision (2026-10-30, replan): created as a vertical slice; every slice runs on Corney's layout-command script with its own invariant checks, golden comparisons only in milestone accepted.
