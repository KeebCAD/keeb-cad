---
id: 4
type: story
title: "Model-worker and autosave failures at start and teardown are handled"
parent: none
covers: []
after: []
assignee: ""
refined: false
hitl: false
risk: low
---

# Model-worker and autosave failures at start and teardown are handled

## Description

Four failure paths epic a-new-design-opens left unhandled, none reachable today: spawning the model worker throwing synchronously; writing the bundle throwing inside the commit event, which skips later listeners; Autosave and ModelWorkerLifecycle having no dispose; and browser storage reading `indexedDB` eagerly where the accessor itself can throw.

## Requirements

Verify: each path has a unit row that reaches it through a fake at the boundary (a spawn that throws, a bundle write that throws, a storage accessor that throws) and shows a reported failure, not an uncaught throw; disposing the container stops autosave and the model worker.

## References

- parent — none
- retrospective — _bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/epic-a-new-design-opens-retrospective.md, finding E11
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, AD-11 (model worker), AD-13 (storage and autosave), AD-25 (di)

## Notes

- Decision (2026-11-16, Sergii, 13.13's plan): E11 is its own story, not part of the refactor sweep, because its guards and disposables change behaviour.
