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
- Waits on epic 14 because: the design store, undo and the inspector
- Waits on epic 13 because: resolved keys and the Layout canvas
- Waits on epic 16 because: the Toast, for the stale-drop toast (2026-11-05)
- Decision (2026-10-30, from epic-see-corneys-keys planning): 15.2 and 15.4 describe gestures (begin, update, commit, cancel); the spine now has none: a drag moves only the dragged nodes on the canvas and applies one command on drop, and a nudge burst applies one command when it ends (AD-2). Revise them in place when this epic is refined.
- Decision (2026-11-02, from epic-see-corneys-keys replan): spine G11 is this epic's to build, since a drop is the first command computed from a posted snapshot: such a command carries the snapshot's seq, and the register rejects it with a typed rejection when the seq is not main's latest, the editor showing it briefly ('the layout changed, drop again').
- Decision (2026-11-03, spine update for 23.2): 23.2 codes only the stale Rejection's type; the first drop or nudge story here codes run's optional { seq } and the check against design's seq counter, with its test.
- Decision (2026-11-03, replan): the spine merged the command register and the design state into one service, the design store (9cee349); this file's current wording takes the new name, dated lines above stay as written. Delivery only, no requirement change.
- Decision (2026-11-05, spine-gap sweep): 15.1 rewritten as the drag-preview and burst service with the stale-seq check (AD-2 removed the gesture API); this epic now builds after epic 16, since 15.1's stale-drop toast uses 16.1's Toast.
- Decision (2026-11-05, replan after the spine-gap sweep, spine-gap-sweep-2026-11-05.md): 15.2–15.6 re-rendered (A6, D9, E8, E9, F2, F5–F7, G7); 15.4 waits on 16.4 for the undo keys its verify presses. This revises 15.2 and 15.4 in place, as the 2026-10-30 Notes asked.
