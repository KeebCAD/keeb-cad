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
- Decision (2026-11-16, Sergii): 14.2 split into 14.2 (expressions parse and evaluate with units; expr's literal API rebuilt on the peggy parser, callers unchanged), 14.8 (parameters drive placement; the Expression schema and placement switch to full expressions in one step) and 14.9 (rename and delete parameters), because 14.2 held a parser, a design section, commands and a text rewrite, past one build session. 14.5, 15.2 and 16.1 now wait on 14.8. Rejected: keeping 14.2 whole; 14.2 widening the schema before placement can read expressions.
- Decision (2026-11-17, Sergii): 14.5's open question is settled. `ClearOverride { keys }` removes override records, so the slot inherits its part again, and 14.5 builds it (spine 4b1f27c). Rejected: a `SetOverride` that pins the resolved part; a clear value in `SetOverride`'s input.
- Decision (2026-11-17, from 14.8's build, deferred-work.md): 14.5's verify names both refusals of deg on a length: a literal is `input-invalid` (the quantity schema's wrong-unit literal check), a parameter holding deg is `unit-mismatch` (evaluation).
- Decision (2026-11-18, Sergii, from 14.5's build): 14.5 split into 14.10 (expression field and autocomplete dropdown, first used by gap x and gap y with setGap), 14.5 (inspector offset and chain, setOffset and setArrangement), 14.11 (Design settings and a group's default part, setDefaultPart), 14.12 (right half and the Fitted toggle, clearOverride) and 14.15 (slot inspector, Part field and This slot, setSlotInputs), because 14.5 held four independently shippable goals and used an expression field no story built. 19.2 now waits on 14.15. Rejected: keeping 14.5 whole; a field story with no command to run (a "wired later" story), so 14.10 carries the gap fields.
- Decision (2026-11-18, Sergii): the Parameters tab (14.13) and the Parts tab (14.14) are planned here, settling the 2026-11-05 note; the expression field is 14.10. 14.14 waits on the spine for the commands that create, duplicate and edit a design part (only parts.deletePart exists). Rejected: leaving both tabs unplanned while 14.10 and 14.15 depend on them.
- Decision (2026-11-18, Sergii): no closing refactor sweep, following the rest of this tree, where no epic has one. Rejected: the default sweep story.
- Decision (2026-11-18, Sergii, from 13's plan): 13 rewritten to what was built (addParameter for +, dialog flows, read-only duplicate rows, No parameters.); its Create parameter <name>… and Ctrl+click moved to 16, which waits on 13. Rejected: keeping them in 13 past its plan's size cap.
- Open question (2026-11-18, Sergii at 13's look): renaming by focusing a parameter's name and pressing F2 feels wrong; Sally reworks the Parameters tab's rename (EXPERIENCE.md Left rail + slide-out row) before a story changes it.
- Open question (2026-11-18, Sergii at 13's look): expression-fault messages name the gap by the design's id ("ibm3sj839fnn" uses it); rejection ids name meta, so a message can't tell gap x from gap y. The spine settles how messages name meta's fields before a story.
- Decision (2026-11-18, Sergii with Sally): the rename open question above is settled: Parameters rows get always-visible Rename and Delete buttons and the name stops being a tab stop (EXPERIENCE.md Left rail + slide-out row); 17 builds it. Rejected: buttons shown only on hover or focus, since discoverability was the complaint.
- Decision (2026-11-18, Sergii with Sally): 14 and 15's non-length inputs use EXPERIENCE.md's Blueprint input fields row and DESIGN.md's Select field; whichever of them builds first builds the Select field, not a new dependency between them, because 15 already waits on 14.
- Decision (2026-11-19, replan after spine e1fc4b0, Sergii with Winston): the rectangle role became slot-space (any 2D shape in the part's own frame, attach points on its bounding box), body and clearance volumes replaced the envelope and keep-outs, LibraryPart carries role-tagged outputs as plain data, pinning takes the library's highest version, and layout.setPart's input is defined. New 18 moves the built code to slot-space and PolygonRegion before 7, which now waits on it; 7 and 4 rewritten to the spine, 11's verify reworded. Rejected: folding the rename into 7, because it changes built stepping, borders and drawing across packages, a goal of its own.
- Open question (2026-11-19): choc-key's 18 x 18 mm slot space at 1u plus NewDesign's 1 mm gap gives a 19 mm (MX) pitch, while Choc spacing is usually 18 x 17 mm (unverified); check it against the Kailh Choc v2 datasheet before 4, since Corney's golden layout depends on it.
