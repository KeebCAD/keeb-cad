---
type: epic
title: "Tray case from an editable template"
parent: initiative-keeb-cad-m1
covers: [R9, R14]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Tray case from an editable template

## Description

The tray template builds Corney Island's case within ±0.05 mm in the background, with part case cutouts. Its parameters stay in effect after its operations are edited. It exports STL and STEP.

## Outcome

Corney Island's tray case follows the outline and part cutouts and matches the original (SM-2).

## Done when

- Case dimensions match Corney Island within ±0.05 mm (SM-2 list).
- Editing an operation keeps parameters in effect.
- STL and STEP export.

## Boundaries

- Out: case styles other than tray; tenting.

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Waits on epic 3 because: parameters, expressions and the worker harness
- Waits on epic 5 because: the outline shape
- Waits on epic 6 because: part case cutouts
- Decision (2026-10-26, initiative item 3): this epic owns the Case workspace's 3D viewer (orbit, pan, zoom, Home/0 top view, keyboard, never blanks once a solid exists; EXPERIENCE.md › Workspace-specific › 3D viewer, State Patterns). The Assembly chip and view are deferred past M1. Write it into Requirements when this epic is refined.
- Decision (2026-10-26, architecture update, commit 15bf969): the 3D viewer is three.js + replicad-threejs-helper in the framework-free `viewer3d` package (AD-22). `CaseOutput` carries bodies (`{ id, kind, faces, edges }`, body id = the producing case operation's id) plus the STEP and STL bytes from the case worker (AD-11). Glossary: 3D viewer, body. Write it into Requirements when this epic is refined.
- Open question: does SM-2's dimension list cover the PCB-to-wall gap and the plate seat height, so a fit error fails SM-2 before a print? Check when this epic is refined.
