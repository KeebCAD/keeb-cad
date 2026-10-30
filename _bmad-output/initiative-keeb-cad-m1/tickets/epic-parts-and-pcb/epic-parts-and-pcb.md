---
type: epic
title: "Footprints on the PCB"
parent: initiative-keeb-cad-m1
covers: [R3, R8, R9, R11, R13]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Footprints on the PCB

## Description

The rest of Corney Island's catalogue and footprints and the key cell's components place every footprint and keep-out on the PCB, whose edge is composed from the outline; the key-cell editor edits the key cell's components and local tracks, and changing it updates every key's footprints; part cutouts move with their part in plate, PCB and case; the PCB follows key moves live and exports a KiCad 10 project as the escape hatch.

## Outcome

For Sergii: Corney's PCB shows every footprint placed from the key cell and parts, follows key moves live, and opens in KiCad 10 (R11, R13 escape hatch).

## Done when

- Every footprint and keep-out is placed from the key cell and parts; the PCB edge comes from the outline.
- Editing the key cell updates every key's footprints.
- The KiCad 10 project export opens in KiCad.
- The slice scenario and one e2e journey pass.

## Boundaries

- Out: routes, DRC and gerbers (epic-routing-and-fab).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Waits on footprint licence (initiative Open question, owner Sergii) before footprint library work.
- Decision: 2026-10-25 Corney's TRRS nets are derived unchanged; a later rewire changes only the jack's catalogue pin roles.
- Decision (2026-10-26, from epic-layout-editor refinement): this epic owns the Layout inspector's `Edit key cell` link to isolated cell mode (EXPERIENCE.md › Information Architecture, Workspace-specific › Isolated cell mode). Write it into Requirements when this epic is refined.
- Decision (2026-10-26, from epic-layout-editor slicing): this epic swaps the Part picker's preview from envelope and cutouts to the footprint preview (EXPERIENCE.md › Fields and pickers › Part field). Write it into Requirements when this epic is refined.
- Decision (2026-10-26, initiative item 5): this epic owns the key-cell track tool in isolated cell mode (W; snap to pads and 45°, Shift free; X switches F.Cu/B.Cu and drops a via; Backspace; one finished track = one undo step; cell-level DRC live; EXPERIENCE.md › Workspace-specific › Isolated cell mode, Track tool). Board routes stay automatic. Write it into Requirements when this epic is refined.
- Decision (2026-10-26, initiative item 7): before this epic's first story starts, a `bmad-ux` Update run on the editor spines (epic-platform-baseline/ux-editor/) closes the open gap: creating authored keep-outs and their color on the PCB canvas (EXPERIENCE.md › Open Items › Gaps). When this epic is sliced, that run is its first entry (hitl), and the keep-out stories wait on it.
- Decision (2026-10-26, architecture update, commit 15bf969): a slot whose key-cell reference does not resolve has no components, so no pads, nets or matrix position, keeping the firmware-equals-PCB netlist test intact (AD-5, AD-14). Write it into Requirements when this epic is refined.
- Decision (2026-10-28, routing verdict and architecture update 8eee956): before the first gerber story, this epic clears the AD-20 errors already on bare wired Corney, by changing the LED footprint or by an exemption declared in the catalogue: 216 LED pad edge-clearance errors (each SK6812mini-e pad sits 0.21 mm from its own footprint cutout, against a 0.30 mm rule; KiCad reports 199 of them, its report limit) and 4 `invalid_outline` errors, where the front and back LED cutouts overlap. All are errors, so they block the gerbers. Source: `epic-risk-spikes/routing-verdict.md` › Follow-ups; architecture Deferred. Write it into Requirements when this epic is refined.
- Decision (2026-10-28, architecture update 8eee956): connections follow AD-14 as updated. They are per board and never cross boards (the cable part realises the link between halves; on split-reversible the board's pads are the `left/` placements' F, B and TH copies); pads are chained in authored order (each key's index along its chain, LED chain order, then natural order of pad ids); pad ids are `<side>/<slot-id>.<component>.<pin>.<F|B|TH>[.<copy>]`; each connection is tagged `fixed-tracks`, `key-cell` or `routing` from the pin pairs that the key cell and catalogue parts declare their tracks join, never from positions. The KiCad export is a project: the board plus project and custom-rules files carrying AD-20's values. Write it into Requirements when this epic is refined.
- Decision (2026-10-30, replan): `_bmad-output/architecture-keeb-cad-layout-model/directions-2026-10-30.md` extends this epic. The board edge comes from a composed outline (D4), not one outline shape. The case cutouts this epic provides feed the tray recipe (D6), and every Corney part needs a 3D envelope for the fit check. Write these into Requirements when this epic is refined, after bmad-architecture folds the directions in.
- Waits on epic 19 because: the catalogue schema and part cutouts
- Decision (2026-10-30, replan): re-sliced as the vertical slice 'Footprints on the PCB'; title, description, outcome and Done when rewritten; earlier Notes stay as history and are re-read against the spine (AD-1 to AD-25) when this epic is refined.
