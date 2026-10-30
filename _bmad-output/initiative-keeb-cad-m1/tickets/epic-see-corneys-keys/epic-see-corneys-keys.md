---
type: epic
title: "See Corney's keys"
parent: initiative-keeb-cad-m1
covers: [R1, R2, R4, R17, R18]
sources: [_bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md]
companions: [_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, _bmad-output/initiative-keeb-cad-m1/component-ownership.md, _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md, _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md]
after: []
refined: true
risk: high
---

# See Corney's keys

## Description

On the locally served app, Corney Island's left half resolves from its layout-command script (chains, explicit anchors, rotation carry, split-reversible right side derived), the user adds and deletes groups, slots and keys from a blank canvas, both halves are drawn on the Layout canvas inside the editor frame (global chrome, workspace tabs, docked right panel, status strip, canvas with viewport and selection), and the design reopens from browser autosave unchanged.

## Outcome

For Sergii: Corney Island's keys appear in the editor from its layout-command script and survive a reload, proving the reactive graph, model, autosave and the editor frame end to end.

## Requirements

- R1 (parent R1): A layout is built from a blank canvas with groups and slots, each placed by anchor + offset (offset, then rotate about the pivot). Any node anchors to a slot attach point or a group origin, and moving a node moves everything anchored to it, transitively.
- R2 (parent R2): Children are arranged freely or as a chain. Corney's cumulative column stagger and 3-key thumb fan are expressed without absolute coordinates; each node has one rotation, carried along its chain, and an explicit anchor stops the carry. Shown by Corney's layout-command script resolving the left half, and 13.4's spike check of its key centres within ±0.05 mm of Ergogen.
- R3 (parent R4): A split-reversible design derives its right half (one geometry, side-qualified ids), with population per side per slot set by command. Split-mirrored and unibody files load and report `unsupported-form`.
- R4 (parent R17): A command that would create an anchor cycle is rejected, naming the cycle's ids. A loaded file with a cycle reports `anchor-cycle`, and an unknown anchor reports `unresolvable-reference`. The status strip shows the error and warning counts.
- R5 (parent R18): A new design autosaves in the browser after every applied command and reopens from autosave byte-identical, as one versioned canonical file.
- R6 (parent R1, R17): The layout is built and seen in the editor frame, in both themes: top bar, workspace tabs, status strip (violation counts, cursor, zoom), left rail with the Tree slide-out, the docked right-panel region, and the Layout canvas drawing both halves with viewport (zoom, pan, fit) and selection synced with the tree. G, S, Ctrl+D and Delete add, duplicate and delete. The open design and workspace are in the URL. Shown by one e2e journey in Chromium and Firefox.

## Constraints

- C1 (parent C3): Architecture AD-1 to AD-26 bind every story. This slice builds AD-2's register (Immer, Valibot inputs, nothing in progress in the design), AD-8's design file, AD-13's storage, AD-10's `reactive` and `geometry`, AD-25's wiring and AD-26's `ui` layer as written there.
- C2 (parent C1): Current desktop Chromium and Firefox; everything runs client-side.
- C3 (parent C4): No Corney-specific shortcuts. Checks are invariants plus the headless slice scenario on Corney's layout-command script; the only golden comparison is 13.4's spike check (initiative Decision 2026-10-30).

## Done when

- Corney's layout-command script resolves the left half and the derived right half; both are drawn on the Layout canvas in the editor frame.
- Groups, slots and keys are added and deleted from a blank canvas through registered commands.
- A reload reopens the design from autosave byte-identical.
- The slice scenario runs headlessly on Corney's script, and one e2e journey runs in a real browser.

## Boundaries

- Out: what the other slices of the initiative own (initiative breakdown, component-ownership map).
- Out, owned by epic-change-a-parameter: undo and redo, the Inspector, the Population toggle, the Violations panel.
- Out, owned by epic-drag-keys: drag, the anchor picker, the command palette.
- Out, owned by epic-keep-my-work: Save to file, Open, the start screen, banners and toasts.
- Out, owned by epic-outline-follows-the-keys: the outline.
- Out, owned by epic-routing-and-fab: Tab badges and the status strip's output-state entries.
- Out: anchors to parts, vertices and construction points (the slices that add them).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, AD-1 to AD-26 (AD-2, AD-8, AD-10, AD-13, AD-24 to AD-26 for this slice)
- companion — _bmad-output/initiative-keeb-cad-m1/component-ownership.md
- design — _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md, Components
- design — _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md, Global chrome, Layout workspace, Edit model, Shortcuts

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
- Decision (2026-10-30, refinement): the bmad-architecture run settled this slice's spine questions in the initiative spine (c0686bb); the spine stays the adopted companion. Requirements R1 to R6 and Constraints C1 to C3 written and approved; the epic is refined.
- Decision (2026-10-30, planning): 13.12 (the app opens the last design) is the tracer bullet: the first path through browser, register, design file, autosave and reload. The order stays as drafted, with 13.4 (the riskiest, Corney's left half) after 13.2 and 13.3 that it needs; the ui lane (13.11) runs beside the model lane. Rejected: the model lane before any UI.
- Decision (2026-10-30, planning): launch reopens the last autosaved design through listDesigns, or creates one by newDesign when storage is empty (EXPERIENCE.md); the top bar's file save state waits for epic-keep-my-work. Rejected: a new design on every launch.
- Decision (2026-10-30, planning): 13.8's e2e journey seeds browser storage with the autosave of a design built by Corney's script in a Node test, and the app reopens it through 13.12's launch path; no test entry point ships in the app. Rejected: a dev-only script hook.
- Decision (2026-10-30, planning): breakdown approved: 9, 10, 1, 14, 11, 12, 15, 2, 3, 4, 6, 7, 8 and the refactor sweep 13; 13.1 and the frame split into 13.1/13.14 and 13.12/13.15 for session size; 5 moved to epic-routing-and-fab as 7.2 (after 7.1); 19.3 repointed to 13.1 with model-error blocking; 14.5 takes the Population toggle and waits on 13.8; 14.6 waits on 13.7; component-ownership.md names the owning stories.
