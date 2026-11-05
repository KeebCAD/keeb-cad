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

The user edits the gap, a slot's key size, default parts or a parameter in the expression field (inspector, Design settings, Parameters), sees Corney's keys move live, gets overlap in the violations panel, and undoes the edit as one registered command.

## Outcome

For Sergii: one parameter edit moves Corney's keys live and undoes cleanly, with violations shown (SM-5's gap steps).

## Done when

- Changing the gap's x, its y or a parameter moves Corney's keys live, and one undo restores them.
- Overlap appears on the canvas and in the violations panel.
- The slice scenario runs headlessly on Corney's script, and one e2e journey runs in a real browser.

## Boundaries

- Out: what the other slices of the initiative own (initiative breakdown, component-ownership map).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
- companion — _bmad-output/initiative-keeb-cad-m1/component-ownership.md

## Notes

- Decision (2026-10-30, replan): created as a vertical slice; every slice runs on Corney's layout-command script with its own invariant checks, golden comparisons only in milestone accepted.
- Waits on epic 23 because: the register, the design file and the editor frame
- Waits on epic 13 because: Corney's script and the Layout canvas
- Decision (2026-10-30, replan): moved-in entry 14.1 (one command registry: AD-2 now a register of commands, gestures and actions, appended per package) and 14.2 (evaluate in resolve: no single resolve, AD-10) contradicts the spine as worded; revise it in place when this epic is refined, before it starts.
- Open question (2026-10-30, from epic-see-corneys-keys refinement): add a small non-split second fixture (for example ortholinear), authored through commands with invariant checks, so the command language isn't only ever tested on Corney. Settle it at this epic's refinement.
- Decision (2026-10-30, from epic-see-corneys-keys refinement): 14.1 proves do → undo → identical for every command slice 13 writes, because slice 13's stories don't test undo. 14.5 gains the Population toggle and the read-only "derived from" geometry fields of the derived right half, moved out of 13.8.
- Decision (2026-10-30, from epic-see-corneys-keys planning): 14.1 contradicts the spine as worded ("one command registry" and the cascade helper are now 13.10 and 13.2; there are no gestures or marks); revise it to history, undo and redo only. 14.5's verify ("previews live and commits on Enter") follows the new edit model: a field applies after a typing pause and coalesces into one undo step. Revise both in place when this epic is refined.
- Decision (2026-11-01, replan after the blueprints fold b10ba5d): 14.3 shrinks to groups overriding the default part (the gap went to 13.2, key size to 13.4, the required default part to 13.18); 14.7 shrinks to library parts pinned by version with setPart, its other part fields arriving with the plates and PCB stories as the spine spreads them; 14.4 waits on 13.4, since envelopes come from 13.18; 14.5's default part is key, created by newDesign. Rejected: keeping 14.7 as the all-fields story.
- Decision (2026-11-01, after the UX pass f715ba2): this slice owns the slide-out's Parts tab (planned at refinement, beside the Parameters tab) and, in 14.5, the slot inspector's This slot section. Rejected: epic-parts-and-pcb (in M1 the tab edits blueprint inputs, not footprints, and is needed much earlier).
- Decision (2026-11-02, from the split of epic-see-corneys-keys): its foundation lane moved to epic-a-new-design-opens (23); 14.1 now waits on 23.3 (was 13.1), and 13.10 in the Notes above is now 23.2; this epic's after is repointed to 23.
- Dropped: 14.3 (2026-11-05, spine-gap sweep A7): 13.18 already proves a group's default part overriding meta.defaultPart and the missing-part warning, and E5 put layout.setDefaultPart in 14.5, so 14.3 had nothing left; 14.7 now waits on 13.18, 14.5 on 13.7 and 13.8. Rejected: keeping 14.3 as the setDefaultPart story.
- Decision (2026-11-05, spine-gap sweep A7): the expression field, its autocomplete dropdown, the slide-out's Parameters tab and its Parts tab have no story yet; this epic's refinement plans them, the expression field before 14.5, which edits through it (14.2 evaluates what it holds). Rejected: adding an expression-field entry before refinement.
- Decision (2026-11-05, replan after the spine-gap sweep, spine-gap-sweep-2026-11-05.md): 14.1 rewritten to patch-based undo with coalescing (E3, E4) and retitled; 14.2, 14.4–14.7 re-rendered to G1–G4, I2–I4, E5, H8; retired epic-layout and epic-editor-shell references repointed. This revises 14.1 and 14.2 in place, as the 2026-10-30 Notes asked.
