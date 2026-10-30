---
type: epic
title: "Keep my work"
parent: initiative-keeb-cad-m1
covers: [R5, R18]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Keep my work

## Description

The user saves to a file and opens it in Chromium and Firefox from the File menu and Start screen, older files migrate and newer or broken ones are refused safely, and a second tab opens read-only until it takes over; Save to file keeps the design and its id.

## Outcome

For Sergii: a design is never lost: it saves to a file, reopens in both browsers, migrates forward and is safe across tabs (R18).

## Done when

- Save to file and Open work in Chromium (in place) and Firefox (download), from the File menu and Start screen.
- Older files migrate; newer and broken files are refused without overwriting.
- A second tab is read-only until it takes over.
- The slice scenario and one e2e journey pass.

## Boundaries

- Out: what the other slices of the initiative own (initiative breakdown, component-ownership map).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
- companion — _bmad-output/initiative-keeb-cad-m1/component-ownership.md

## Notes

- Decision (2026-10-30, replan): created as a vertical slice; every slice runs on Corney's layout-command script with its own invariant checks, golden comparisons only in milestone accepted.
- Waits on epic 13 because: the design file and autosave
- Waits on epic 14 because: parameters and the command register
- Waits on epic 15 because: gestures and revisions
