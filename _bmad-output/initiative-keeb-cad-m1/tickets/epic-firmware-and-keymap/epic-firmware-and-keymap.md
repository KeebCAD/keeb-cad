---
type: epic
title: "Firmware and keymap"
parent: initiative-keeb-cad-m1
covers: [R15, R16]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Firmware and keymap

## Description

Corney Island's own keymap is authored in keeb-cad, and a ZMK configuration builds for the wired design, with RGB, once prd §8 Q2 (wired split) is decided.

## Outcome

For Sergii: Corney's keymap is authored in keeb-cad and a ZMK config builds (SM-4).

## Done when

- Corney's own keymap is authored in keeb-cad.
- The exported ZMK config builds for the wired design (after prd §8 Q2 is decided).
- The slice scenario and one e2e journey pass.

## Boundaries

- Out: QMK.

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Waits on Corney Island's own ZMK keymap source (not in layout-model/sources), owner Sergii.
- Waits on the ZMK wired-split decision (initiative Open question) for the wired design.
- Decision (2026-10-26, architecture update, commit 15bf969): keymap layers have ids minted by `model` and an editable name; layer-tap, momentary-layer, toggle-layer and combos reference them by id, so reorder and duplicate never rebind; deleting a layer removes its own bindings, and deleting one that a binding or combo elsewhere references is rejected, naming them (AD-19, Glossary: keymap layer). Write it into Requirements when this epic is refined.
- Waits on epic 20 because: the netlist and matrix
- Decision (2026-10-30, replan): re-sliced as the vertical slice 'Firmware and keymap'; title, description, outcome and Done when rewritten; earlier Notes stay as history and are re-read against the spine (AD-1 to AD-25) when this epic is refined.
