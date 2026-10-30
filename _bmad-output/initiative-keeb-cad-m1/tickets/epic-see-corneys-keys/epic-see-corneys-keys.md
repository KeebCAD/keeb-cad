---
type: epic
title: "See Corney's keys"
parent: initiative-keeb-cad-m1
covers: [R1, R2, R4, R17, R18]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# See Corney's keys

## Description

On the locally served app, Corney Island's left half resolves from its layout-command script (chains, explicit anchors, rotation carry, split-reversible right side derived), the user adds and deletes groups, slots and keys from a blank canvas, both halves are drawn on the Layout canvas inside the editor frame (global chrome, workspace tabs, docked right panel, status strip, canvas with viewport and selection), and the design reopens from browser autosave unchanged.

## Outcome

For Sergii: Corney Island's keys appear in the editor from its layout-command script and survive a reload, proving the reactive graph, model, autosave and the editor frame end to end.

## Done when

- Corney's layout-command script resolves the left half and the derived right half; both are drawn on the Layout canvas in the editor frame.
- Groups, slots and keys are added and deleted from a blank canvas through registered commands.
- A reload reopens the design from autosave byte-identical.
- The slice scenario runs headlessly on Corney's script, and one e2e journey runs in a real browser.

## Boundaries

- Out: what the other slices of the initiative own (initiative breakdown, component-ownership map).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
- companion — _bmad-output/initiative-keeb-cad-m1/component-ownership.md

## Notes

- Decision (2026-10-30, replan): created as a vertical slice; every slice runs on Corney's layout-command script with its own invariant checks, golden comparisons only in milestone accepted.
- Waits on epic 1 because: the monorepo scaffold, CI and the UX session result
- Decision (2026-10-30, replan): moved-in entry 13.5 (revision tags: AD-11 now tags background outputs by input slice, live outputs are computeds) contradicts the spine as worded; revise it in place when this epic is refined, before it starts.
- Decision (2026-10-30, replan): the opening story 9 brings the workspace in line with the spine (reactive and geometry packages with fences, ts-inject, @vue/reactivity pinned); the frame story then provides the one ts-inject container at the app root, per the spine (no Pinia; AD-10, AD-25, Editor state convention). The Pinia mentions in epic-platform-baseline's done story stay as history.
- Decision (2026-10-30, UI foundations session): Pinia was removed from `app/` ahead of story 9, together with jsdom and `@vue/test-utils`, when the app's tests moved to Vitest 5 browser mode (architecture AD-26, Verification layer 2). Story 9 no longer carries that step.
- Decision (2026-10-30, replan): story 9 opens this epic, because the tracer needs the spine's packages and fences in place; rejected: folding it into the frame story (plumbing mixed with UI, too big for one session) and reopening the done platform-baseline epic.
