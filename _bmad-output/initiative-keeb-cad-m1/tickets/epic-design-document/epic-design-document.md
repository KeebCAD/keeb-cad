---
type: epic
title: "A design file that saves, reopens and undoes"
parent: initiative-keeb-cad-m1
covers: [R5, R17, R18]
sources: []
companions: [_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md, _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md]
after: []
refined: false
risk: medium
---

# A design file that saves, reopens and undoes

## Description

A design opens, autosaves, saves to a file and reopens byte-identical, and Save As records provenance. Every change is a named command with undo/redo. Parameters and expressions evaluate. The pipeline tags outputs by revision, marks stale ones, and runs background workers with progress and cancel. Every AD-8 section has its schema skeleton and the export registry exists, so later epics fill sections in without colliding.

## Outcome

Every later epic edits the design through commands and sees revision-tagged outputs, without inventing its own persistence or pipeline.

## Done when

- Save, reopen and save again gives a byte-identical file; older format versions migrate; newer ones open read-only.
- Every command undoes and redoes; a gesture is one undo step.
- Save As writes provenance.
- A parameter change re-evaluates its dependent expressions.
- Outputs are tagged by revision and stale ones are marked; a background worker reports progress and is cancelled by a newer committed revision.

## Boundaries

- Out: layout semantics (epic-layout), shapes, parts, routing, case, firmware content.
- Must not change: AD-2 single mutation path.

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Waits on epic 1 because: the monorepo scaffold and CI

## Notes

- Decision (2026-10-26, from epic-layout refinement): this epic owns the shared editor chrome: workspaces 1–5 with their empty states, hybrid panels and slide-out, status strip and tab badges, Ctrl+K palette, context menu, cheat sheet, F6 regions, Start screen, File menu (`Copy design…`, `Save to file…`), banners and toasts (EXPERIENCE.md › Global chrome, Panels and overlays, State Patterns › File, Output states). It is the UI of this epic's commands, file lifecycle and pipeline states. The violations panel belongs to epic-layout.
- Decision (2026-10-26, from epic-layout refinement): this epic builds the expression field component (live preview, error underline and message, autocomplete, `Create parameter…`, Ctrl+click to a parameter), beside the evaluator and the Parameters slide-out (EXPERIENCE.md › Fields and pickers). epic-layout uses it in the inspector.
