---
id: 1
type: bug
title: "Delete is refused silently when an anchor's fallback closes a cycle"
parent: none
covers: []
after: []
assignee: ""
refined: false
hitl: false
risk: medium
severity: P2
---

# Delete is refused silently when an anchor's fallback closes a cycle

## Description

Deleting a node that another node is anchored to looks available, but when the anchor's fallback to its default closes a dependency cycle, the store refuses the command and the key press does nothing, with no message. The spine makes the structural check the guard for such a DeleteNode, so the refusal stands; what is wrong is that Delete shows as available and the refusal is silent.

## Reproduction

1. On a new design with a free root: add slot D, a free group P holding slot X, and slot Y, all under the root.
2. Anchor X to D, Y to X, then P to Y (each SetAnchor succeeds: P→Y→X→D has no loop).
3. Select D and press Delete.

Actual: Delete is enabled; nothing changes and nothing is shown. Expected: Delete is unavailable before the press, with a reason naming the cycle.

## Cause Hypothesis

DeleteNode's own check covers only the root and missing ids, while its apply step drops every anchor naming a deleted node, so X falls back to its parent P and closes P→Y→X→P; the store's structural check then refuses the cycle. The hotkey path drops the refusal without a notice.

## Acceptance Criteria

1. **Delete either succeeds or says why**
   **Given** the arrangement from the reproduction
   **When** D is selected and Delete is pressed
   **Then** Delete is unavailable before the press, its reason names the cycle's ids, and the design is unchanged
2. **Tests cover the condition found and fixed**
   **Given** the test suite
   **When** it runs
   **Then** a test that fails on the defect and passes on the fix covers the reproduction, and one covers each related case the fix touched
3. **Or: no change is needed, with proof**
   **Given** the reproduction
   **When** it is run on the current code
   **Then** the expected behavior already holds, or the report was mistaken, with the evidence recorded in Notes — this supersedes 1 and 2

## References

- parent — none
- retrospective — _bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/epic-see-corneys-keys-retrospective.md, Findings S1
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, AD-2 (DeleteNode) and the default-anchor fallback

## Notes

- Unknown: the spine (AD-2, Sergii 2026-11-13) keeps the structural check as the guard for a DeleteNode whose fallback closes a loop, and gives SetAnchor its own check so availability matches the run; it does not say whether DeleteNode's own check reports this loop up front. Sergii, then bmad-architecture (retrospective A1).
