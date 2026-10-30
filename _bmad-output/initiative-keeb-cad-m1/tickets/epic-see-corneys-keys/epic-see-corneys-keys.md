---
type: epic
title: "See Corney's keys"
parent: initiative-keeb-cad-m1
covers: [R1, R2, R4, R17, R18]
sources: []
companions: []
after: []
refined: false
risk: high
---

# See Corney's keys

## Description

On the locally served app, Corney Island's left half resolves from its layout-command script (chains, explicit anchors, rotation carry, split-reversible right side derived), the user adds and deletes groups, slots and keys from a blank canvas, both halves are drawn on the Layout canvas inside the editor frame (global chrome, workspace tabs, docked right panel, status strip, canvas with viewport and selection), and the design reopens from browser autosave unchanged.

## Outcome

For Sergii: Corney Island's keys appear in the editor from its layout-command script and survive a reload, proving the reactive graph, model, autosave and the editor frame end to end.

## Done when

- Corney's layout-command script resolves the left half and the derived right half; both are drawn on the Layout canvas in the editor frame.
- Groups, slots and keys are added and deleted from a blank canvas through registered commands.
- A reload reopens the design from autosave byte-identical.
- The slice scenario runs headlessly on Corney's script, and one e2e journey runs in a real browser.

## Boundaries

- Out: what the other slices of the initiative own (initiative breakdown, component-ownership map).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
- companion — _bmad-output/initiative-keeb-cad-m1/component-ownership.md

## Notes

- Decision (2026-10-30, replan): created as a vertical slice; every slice runs on Corney's layout-command script with its own invariant checks, golden comparisons only in milestone accepted.
- Waits on epic 1 because: the monorepo scaffold, CI and the UX session result
- Decision (2026-10-30, replan): moved-in entry 13.5 (revision tags: AD-11 now tags background outputs by input slice, live outputs are computeds) contradicts the spine as worded; revise it in place when this epic is refined, before it starts.
- Decision (2026-10-30, replan): the opening story 9 brings the workspace in line with the spine (reactive and geometry packages with fences, ts-inject, @vue/reactivity pinned); the frame story then provides the one ts-inject container at the app root, per the spine (no Pinia; AD-10, AD-25, Editor state convention). The Pinia mentions in epic-platform-baseline's done story stay as history.
- Decision (2026-10-30, UI foundations session): Pinia was removed from `app/` ahead of story 9, together with jsdom and `@vue/test-utils`, when the app's tests moved to Vitest 5 browser mode (architecture AD-26, Verification layer 2). Story 9 no longer carries that step.
- Decision (2026-10-30, replan): story 9 opens this epic, because the tracer needs the spine's packages and fences in place; rejected: folding it into the frame story (plumbing mixed with UI, too big for one session) and reopening the done platform-baseline epic.
- Decision (2026-10-30, refinement): the slice stays one epic and its risk rises to high. The frame is planned as two stories, a ui foundation and the editor frame, because together they run past one session. Rejected: splitting the frame into its own slice (it would bring back the layered order the replan rejected), and one frame story (too big for one session).
- Decision (2026-10-30, refinement): entry 5 (revision tags) leaves this slice, since it contradicts AD-11 and slice 13 has no background stage. 13.1 wires its live stage as a computed through reactive, with a must-not-recompute check. Background outputs tagged by input-slice hash move to epic-routing-and-fab, which builds the first worker. Rejected: a stub background stage in this slice (chrome built against guesses).
- Decision (2026-10-30, refinement): undo stays in epic-change-a-parameter (14.1). This slice's stories don't test undo, and 14.1 proves do → undo → identical for every command this slice writes. Rejected: pulling the history into this slice (adds a story to the largest slice).
- Decision (2026-10-30, refinement): 13.8 draws the derived right half on the canvas and in the tree only. Its Population toggle and the read-only "derived from" geometry fields move into 14.5, per component-ownership.md. Per-side population stays a command from 13.6.
- Decision (2026-10-30, refinement): 13.1 builds the command register service (AD-2) with newDesign as its first command. The editor frame story waits on 13.1, because its hotkeys are fed from the register. Rejected: 13.2 (leaves newDesign outside the register) and the frame story (puts headless work behind UI).
- Decision (2026-10-30, refinement): in this slice the status strip shows violation counts, cursor coordinates and zoom. The Tab badge and the status strip's output-state entries move to epic-routing-and-fab, the first slice with a background output, because live outputs are always current and nothing here can be stale. component-ownership.md is updated to match.
- Decision (2026-10-30, refinement): the spine Open Questions this slice's stories hit are settled by a bmad-architecture run on this epic before its stories are planned: update library, command-input schema format, deep read-only typing, ts-inject silent-override convention, physical-key hotkeys, 3/4/6 px radii, cycle rejection as flagged breaks. Rejected: leaving each to the first story that hits it, and spiking only the update library.
- Decision (2026-10-30, refinement): 13.4 adds a spike check beside its invariant checks: the left half's key centres compared with Ergogen within ±0.05 mm using the existing fixtures/ harness, so a wrong Corney script shows up in this slice and not at milestone accepted. This is the spike comparison the initiative's per-slice rule allows. Rejected: invariants only.
- Decision (2026-10-30, refinement): no second fixture in this slice. A small non-split fixture, so the command language isn't only ever tested on Corney, is raised when epic-change-a-parameter is refined.
