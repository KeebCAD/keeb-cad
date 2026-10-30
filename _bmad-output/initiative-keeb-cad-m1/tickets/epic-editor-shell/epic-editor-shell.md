---
type: epic
title: "The editor shell around every workspace"
parent: initiative-keeb-cad-m1
covers: [R5, R17, R18]
sources: []
companions: [_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md, _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md]
after: []
status: dropped
refined: false
risk: medium
---

# The editor shell around every workspace

## Description

The shared editor chrome, as EXPERIENCE.md specifies, works on the locally served build: workspaces 1–5 with tabs, badges and empty states; the docked right panel; the slide-out with Tree and Parameters; the status strip; the Ctrl+K palette, context menu and cheat sheet; F6 regions; the Start screen; the File menu (New, Open, Save, Save to file, Copy design, Design info); banners and toasts; and the expression field with autocomplete and `Create parameter…`. It is the UI of epic-design-document's commands, undo, file lifecycle and output states.

## Outcome

Sergii opens, saves, copies and undoes designs and edits parameters in the editor, and every later workspace plugs into one shell instead of building its own chrome.

## Done when

- On the locally served build, New, Open, Save, Save to file and Copy design work in Chromium, and in Firefox through download.
- Workspaces 1–5 switch by key and tab, each showing its empty state, with the status strip and tab badges showing output states.
- Ctrl+K, the context menu, the cheat sheet and F6 reach every command and region by keyboard.
- A parameter is created from an expression field, edited in the Parameters slide-out, and its dependent expressions re-evaluate.

## Boundaries

- Out: the headless core (commands, file, storage, pipeline, evaluator) in epic-design-document.
- Out: workspace canvases and the violations panel (epic-layout-editor and later workspace epics).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- design — _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md
- design — _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md, Global chrome, Panels and overlays, Fields and pickers, State Patterns
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Waits on epic 1 because: the UX session result
- Waits on epic 3 because: commands, undo, the design file, storage, parameters and pipeline output states
- Decision (2026-10-26): split from epic-design-document at its refinement (see that epic's Notes).
- Decision (2026-10-26, from epic-layout refinement; moved here from epic-design-document at its split): this epic owns the shared editor chrome: workspaces 1–5 with their empty states, hybrid panels and slide-out, status strip and tab badges, Ctrl+K palette, context menu, cheat sheet, F6 regions, Start screen, File menu (`Copy design…`, `Save to file…`), banners and toasts (EXPERIENCE.md › Global chrome, Panels and overlays, State Patterns › File, Output states). It is the UI of this epic's commands, file lifecycle and pipeline states. The violations panel belongs to epic-layout-editor.
- Decision (2026-10-26, from epic-layout refinement; moved here from epic-design-document at its split): this epic builds the expression field component (live preview, error underline and message, autocomplete, `Create parameter…`, Ctrl+click to a parameter), beside the evaluator and the Parameters slide-out (EXPERIENCE.md › Fields and pickers). epic-layout uses it in the inspector.
- Decision (2026-10-26, architecture update, commit 15bf969): the Start screen's recent designs come from `storage.listDesigns` (newest first; launch reopens the first). Opening a file whose design is stored at a newer revision keeps that revision as a version, and a toast names both. The Export menu shows `blocked: <kind>` for a `model` error, and the KiCad board stays enabled (AD-13, AD-15). Write it into Requirements when this epic is refined.
- Decision (2026-10-26, architecture update, commit 680fbc0): Design info › Versions shows each version's reason (`file`, `saved`, `switch`, `migration`, `copy`, `autosave`) from AD-13's retention rule; the ux-editor spines still show `file` / `browser` and list retention as open, pending a `bmad-ux` touch-up. Write it into Requirements when this epic is refined.
- Dropped: (2026-10-30, replan) the editor frame is built by 'see Corney's keys' and every other shell component by the first slice that needs it (component-ownership map); no shell layer first.
