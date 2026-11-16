---
id: 5
type: story
title: "A parts lane refuses an anchor input"
parent: none
covers: []
after: []
assignee: ""
refined: false
hitl: false
risk: low
---

# A parts lane refuses an anchor input

## Description

BP-8 says an anchor input can't feed a `parts` lane, because that lane runs before the layout, and the library build rejects one. 13.21's library build rejects every anchor input, so no source reaches that narrower check yet; this story adds it with the first story whose blueprint takes an anchor input on another lane.

## Requirements

Verify: the library build accepts a blueprint with no inputs, accepts an anchor input on a lane other than `parts`, rejects one anchor input on a `parts` lane naming the blueprint and the input, and rejects a `parts` lane with an anchor input beside other inputs.

## References

- parent — none
- architecture — _bmad-output/initiative-keeb-cad-m1/architecture-blueprints/architecture-blueprints.md, BP-8
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, Data Schema (InputValue)
- story — _bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-library-blueprints-build-and-run-in-the-model-worker-plan.md (13.21, the library build)

## Notes

- Waits on: the first story whose blueprint takes an anchor input on a lane other than `parts`; no ticket names one yet. The Data Schema already defines InputValue's anchor variant.
