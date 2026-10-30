---
type: epic
title: "Drag keys"
parent: initiative-keeb-cad-m1
covers: [R1, R2, R18]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Drag keys

## Description

The user drags, rotates and nudges keys and groups by the chain rule, re-anchors with the anchor picker keeping the node in place (anchor cycles rejected and shown), and each gesture is one undo step; the UX assumptions are reviewed after the Corney layout rebuild.

## Outcome

For Sergii: Corney's thumb fan and columns are edited by hand the way EXPERIENCE.md describes, each gesture one undo step (SM-5's key and fan steps).

## Done when

- Drag, rotate and nudge follow the chain rule, and each gesture is one undo step.
- Re-anchoring keeps the node in place; anchor cycles are rejected and shown.
- The UX assumptions review after the Corney layout rebuild has run.
- The slice scenario and one e2e journey pass.

## Boundaries

- Out: what the other slices of the initiative own (initiative breakdown, component-ownership map).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
- companion — _bmad-output/initiative-keeb-cad-m1/component-ownership.md

## Notes

- Decision (2026-10-30, replan): created as a vertical slice; every slice runs on Corney's layout-command script with its own invariant checks, golden comparisons only in milestone accepted.
- Waits on epic 14 because: the command register, undo and the inspector
- Waits on epic 13 because: resolved keys and the Layout canvas
- Decision (2026-10-30, from epic-see-corneys-keys planning): 15.2 and 15.4 describe gestures (begin, update, commit, cancel); the spine now has none: a drag moves only the dragged nodes on the canvas and applies one command on drop, and a nudge burst applies one command when it ends (AD-2). Revise them in place when this epic is refined.
