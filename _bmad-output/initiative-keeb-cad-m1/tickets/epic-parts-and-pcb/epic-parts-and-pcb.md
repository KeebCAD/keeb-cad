---
type: epic
title: "Parts, netlist and PCB placement for both designs"
parent: initiative-keeb-cad-m1
covers: [R3, R5, R8, R9, R11, R13]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Parts, netlist and PCB placement for both designs

## Description

The rest of Corney Island's catalogue and footprints, and the key cell's components, place every footprint and keep-out. Changing the key cell updates every key's footprints. The netlist, matrix and connections are derived, with matrix, pin and LED-order overrides. The PCB follows key moves live and exports a KiCad 10 board, the escape hatch and the SM-3 fallback. The wireless design is built as a copy of the wired one. Provides connections for routing and case cutouts for the case.

## Outcome

Both Corney Island designs have a live PCB placement with the right parts and nets (SM-3, parts and nets part).

## Done when

- Both designs' PCBs match Corney Island by parts and nets.
- Moving a key moves its footprints and updates nets live.
- Matrix, MCU pin and LED-order overrides change the derived netlist.
- The KiCad 10 export opens without errors.

## Boundaries

- Out: routes, DRC and gerbers (epic-routing-and-fab).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Waits on epic 2 because: the connection split rule
- Waits on epic 4 because: per-side placements and the catalogue schema
- Waits on epic 5 because: the outline as board edge
- Waits on footprint licence (initiative Open question, owner Sergii) before footprint library work.
- Decision: 2026-10-25 Corney's TRRS nets are derived unchanged; a later rewire changes only the jack's catalogue pin roles.
- Decision (2026-10-26, from epic-layout-editor refinement): this epic owns the Layout inspector's `Edit key cell` link to isolated cell mode (EXPERIENCE.md › Information Architecture, Workspace-specific › Isolated cell mode). Write it into Requirements when this epic is refined.
- Decision (2026-10-26, from epic-layout-editor slicing): this epic swaps the Part picker's preview from envelope and cutouts to the footprint preview (EXPERIENCE.md › Fields and pickers › Part field). Write it into Requirements when this epic is refined.
- Decision (2026-10-26, initiative item 5): this epic owns the key-cell track tool in isolated cell mode (W; snap to pads and 45°, Shift free; X switches F.Cu/B.Cu and drops a via; Backspace; one finished track = one undo step; cell-level DRC live; EXPERIENCE.md › Workspace-specific › Isolated cell mode, Track tool). Board routes stay automatic. Write it into Requirements when this epic is refined.
