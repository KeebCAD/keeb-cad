---
type: epic
title: "ZMK firmware and keymap"
parent: initiative-keeb-cad-m1
covers: [R15, R16]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# ZMK firmware and keymap

## Description

Corney Island's own keymap is authored in keeb-cad, and a ZMK configuration builds for both designs, with RGB on the wired one.

## Outcome

Both designs produce ZMK firmware that builds, with Corney Island's own keymap (SM-4).

## Done when

- ZMK firmware for both designs builds from the export.
- Corney Island's keymap, layers and behaviours are expressed.
- Deleting a key deletes its bindings and undo restores them.

## Boundaries

- Out: QMK.

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Waits on epic 6 because: the netlist, matrix and both designs
- Waits on Corney Island's own ZMK keymap source (not in layout-model/sources), owner Sergii.
- Waits on the ZMK wired-split decision (initiative Open question) for the wired design.
- Decision (2026-10-26, architecture update, commit 15bf969): keymap layers have ids minted by `model` and an editable name; layer-tap, momentary-layer, toggle-layer and combos reference them by id, so reorder and duplicate never rebind; deleting a layer removes its own bindings, and deleting one that a binding or combo elsewhere references is rejected, naming them (AD-19, Glossary: keymap layer). Write it into Requirements when this epic is refined.
