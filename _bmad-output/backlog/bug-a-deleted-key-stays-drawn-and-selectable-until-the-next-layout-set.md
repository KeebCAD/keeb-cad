---
id: 2
type: bug
title: "A deleted key stays drawn and selectable until the next Layout set"
parent: none
covers: []
after: []
assignee: ""
refined: false
hitl: false
risk: low
severity: P3
---

# A deleted key stays drawn and selectable until the next Layout set

## Description

After a key is deleted, the Layout canvas keeps drawing it until the model worker posts the next Layout set, and clicking it in that window selects a node the design no longer holds. The spine's Editor state row prunes the selection after each commit "so a selection names only existing nodes"; a click after that prune puts a deleted node back.

## Reproduction

1. Open a design with keys on the Layout canvas.
2. Select a key and press Delete, then click where the key was before the next Layout set arrives (widest while the parts lane is paused).

Actual: the key is still drawn and the click selects it; Delete and Ctrl+D then grey out as unknown-target. Expected: the selection never names the deleted node.

## Cause Hypothesis

A patches commit keeps the previous Layout set, and the canvas draws every posted row without checking the committed design, while group borders already skip a row posted before its node was deleted. Selection accepts any id and prunes only on the next commit.

## Acceptance Criteria

1. **A deleted node is never selected**
   **Given** a key deleted and its new Layout set not yet posted
   **When** the place where the key was is clicked
   **Then** the selection stays empty
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
- retrospective — _bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/epic-see-corneys-keys-retrospective.md, Findings S4
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, Consistency Conventions, Editor state row

## Notes

- Open question: whether the deleted key may stay drawn until the next set, as the spine's "readers treat it as absent" allows for a row with no node, or must vanish at once; group borders already skip a row posted before its node was deleted. Sergii decides at planning.
