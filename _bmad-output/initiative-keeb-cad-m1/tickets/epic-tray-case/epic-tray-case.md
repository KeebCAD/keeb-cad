---
type: epic
title: "Tray in 3D"
parent: initiative-keeb-cad-m1
covers: [R9, R14]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Tray in 3D

## Description

The tray build style builds Corney Island's case in the background from the PCB edge, part case cutouts and its settings, shows it in the 3D viewer, re-derives it when a setting changes, and exports STL and STEP.

## Outcome

For Sergii: Corney's tray case is built in the browser from its settings, seen in 3D, and exported (SM-2).

## Done when

- The tray builds in the background from the PCB edge, part cutouts and settings, shown in the 3D viewer.
- Changing a setting re-derives the case; STL and STEP export.
- The slice scenario and one e2e journey pass.

## Boundaries

- Out: case styles other than tray; tenting.

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Decision (2026-10-26, initiative item 3): this epic owns the Case workspace's 3D viewer (orbit, pan, zoom, Home/0 top view, keyboard, never blanks once a solid exists; EXPERIENCE.md › Workspace-specific › 3D viewer, State Patterns). The Assembly chip and view are deferred past M1. Write it into Requirements when this epic is refined.
- Decision (2026-10-26, architecture update, commit 15bf969): the 3D viewer is three.js + replicad-threejs-helper in the framework-free `viewer3d` package (AD-22). `CaseOutput` carries bodies (`{ id, kind, faces, edges }`, body id = the producing case operation's id) plus the STEP and STL bytes from the case worker (AD-11). Glossary: 3D viewer, body. Write it into Requirements when this epic is refined.
- Decision (2026-10-27, epic-platform-baseline closure): this epic scaffolds the empty `@keeb-cad/viewer3d` package and encodes its AD-10 rules in dependency-cruiser ("only `viewer3d` imports three.js; only `editor` imports `viewer3d`"; `viewer3d` imports only `model`), with violation fixtures, before any three.js import. Write it into Requirements when this epic is refined.
- Open question: does SM-2's dimension list cover the PCB-to-wall gap and the plate seat height, so a fit error fails SM-2 before a print? Check when this epic is refined.
- Decision (2026-10-28, architecture update e7e1532): Corney's case walls are case offsets in the `tray` template, run by clipper2-ts with AD-18's corner table; a sharp corner with a fillet is an open then a close. That mapping is untested against Ergogen's `expand` with pointed joints and `fillet: 0.5`: this epic proves it within ±0.05 mm of Corney's case fixture before relying on it, and a failure reopens AD-18's corner table. Write it into Requirements when this epic is refined.
- Decision (2026-10-30, replan): requirements pending `_bmad-output/architecture-keeb-cad-layout-model/directions-2026-10-30.md` D5–D11 (build style is a live setting; a style is a recipe re-run on every change; recipes are live data run by one interpreter and pinned like parts; your operations are an unnamed recipe; they attach through AD-3 anchors and recipe spots; tenting is recipes and parts). The title, description and Done-when (an editable template) are contradicted; the fixture proof of Corney's walls still stands. Do not refine or slice until bmad-architecture folds the directions into the spine.
- Waits on epic 6 because: the PCB edge and part case cutouts
- Waits on epic 7 because: the background worker harness
- Decision (2026-10-30, replan): re-sliced as the vertical slice 'Tray in 3D'; title, description, outcome and Done when rewritten; earlier Notes stay as history and are re-read against the spine (AD-1 to AD-25) when this epic is refined.
