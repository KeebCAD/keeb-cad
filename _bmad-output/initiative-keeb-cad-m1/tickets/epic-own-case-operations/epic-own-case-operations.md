---
type: epic
title: "My own case operations"
parent: initiative-keeb-cad-m1
covers: [R14]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# My own case operations

## Description

The user adds pockets and cuts on top of the tray as the design's own recipe, applied after the style; they follow the layout, and the style and recipe versions are pinned so an app update never changes the saved case.

## Outcome

For Sergii: a custom pocket or cut stays on the case through layout edits and app updates (R14).

## Done when

- The user's own pocket or cut follows a layout edit.
- Style and recipe versions are pinned; an app update does not change the saved case.
- The slice scenario and one e2e journey pass.

## Boundaries

- Out: what the other slices of the initiative own (initiative breakdown, component-ownership map).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
- companion — _bmad-output/initiative-keeb-cad-m1/component-ownership.md

## Notes

- Waits on epic 8 because: the tray style and the recipe interpreter
- Decision (2026-10-30, replan): created as a vertical slice; every slice runs on Corney's layout-command script with its own invariant checks, golden comparisons only in milestone accepted.
