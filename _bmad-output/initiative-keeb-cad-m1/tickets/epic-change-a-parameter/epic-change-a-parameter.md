---
type: epic
title: "Change a parameter"
parent: initiative-keeb-cad-m1
covers: [R3, R17, R18]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Change a parameter

## Description

The user edits pitch, slot size, key-cell references or a parameter in the expression field (inspector, Design settings, Parameters), sees Corney's keys move live, gets overlap and pitch-below-min in the violations panel, and undoes the edit as one registered command.

## Outcome

For Sergii: one parameter edit moves Corney's keys live and undoes cleanly, with violations shown (SM-5's pitch steps).

## Done when

- Changing pitch-x, pitch-y or a parameter moves Corney's keys live, and one undo restores them.
- Overlap and pitch-below-min appear on the canvas and in the violations panel.
- The slice scenario runs headlessly on Corney's script, and one e2e journey runs in a real browser.

## Boundaries

- Out: what the other slices of the initiative own (initiative breakdown, component-ownership map).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
- companion — _bmad-output/initiative-keeb-cad-m1/component-ownership.md

## Notes

- Decision (2026-10-30, replan): created as a vertical slice; every slice runs on Corney's layout-command script with its own invariant checks, golden comparisons only in milestone accepted.
- Waits on epic 13 because: the editor frame, the reactive graph and Corney's script
- Decision (2026-10-30, replan): moved-in entry 14.1 (one command registry: AD-2 now a register of commands, gestures and actions, appended per package) and 14.2 (evaluate in resolve: no single resolve, AD-10) contradicts the spine as worded; revise it in place when this epic is refined, before it starts.
- Open question (2026-10-30, from epic-see-corneys-keys refinement): add a small non-split second fixture (for example ortholinear), authored through commands with invariant checks, so the command language isn't only ever tested on Corney. Settle it at this epic's refinement.
- Decision (2026-10-30, from epic-see-corneys-keys refinement): 14.1 proves do → undo → identical for every command slice 13 writes, because slice 13's stories don't test undo. 14.5 gains the Population toggle and the read-only "derived from" geometry fields of the derived right half, moved out of 13.8.
- Decision (2026-10-30, from epic-see-corneys-keys planning): 14.1 contradicts the spine as worded ("one command registry" and the cascade helper are now 13.10 and 13.2; there are no gestures or marks); revise it to history, undo and redo only. 14.5's verify ("previews live and commits on Enter") follows the new edit model: a field applies after a typing pause and coalesces into one undo step. Revise both in place when this epic is refined.
