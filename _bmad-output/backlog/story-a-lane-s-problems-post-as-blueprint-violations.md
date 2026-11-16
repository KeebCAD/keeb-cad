---
id: 6
type: story
title: "A lane's problems post as blueprint violations"
parent: none
covers: []
after: []
assignee: ""
refined: false
hitl: false
risk: medium
---

# A lane's problems post as blueprint violations

## Description

BP-8 has a lane report `problems`, which become `blueprint` violations; today the parts derivation reads only a run's rectangle and drops its problems, because ViolationKind has no `blueprint` member.

## Requirements

Verify: a part blueprint whose lane returns one problem posts one `blueprint` violation naming the slot, shown in the status strip counts; a lane with no problems posts none.

## References

- parent — none
- architecture — _bmad-output/initiative-keeb-cad-m1/architecture-blueprints/architecture-blueprints.md, BP-8
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, Data Schema (ViolationKind), Violations row

## Notes

- The spine's Violations row already lists `blueprint` (a message the blueprint's author writes, naming the entry and the slot) and says each kind is added by the story that reports it; this is that story. ViolationKind in schema has no `blueprint` member yet.
