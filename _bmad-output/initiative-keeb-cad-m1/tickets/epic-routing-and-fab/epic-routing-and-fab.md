---
type: epic
title: "Browser routing, DRC and fab files"
parent: initiative-keeb-cad-m1
covers: [R10, R12, R13, R17]
sources: []
companions: []
after: []
refined: false
risk: high
---

# Browser routing, DRC and fab files

## Description

Both designs route incrementally in the browser with saved routes, pass the single DRC with design rules, and export PCB and plate gerbers + drill that pass the fab's checks. Unrouted connections and DRC violations are always shown. If the spike failed, the SM-3 fallback applies instead.

## Outcome

Both designs reach fab-checked gerbers from the browser, or the SM-3 fallback is taken honestly (SM-3).

## Done when

- Both designs route fully in the browser and pass DRC with zero errors.
- After a key move, only broken connections are rerouted and valid routes are kept.
- PCB and plate gerbers + drill pass the fab's checks.
- Unrouted connections and DRC violations are always visible.

## Boundaries

- Out: manual trace editing; loosening clearances to finish routing (SM-C2).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Waits on epic 2 because: the routing spike verdict
- Waits on epic 6 because: PCB placement, netlist and connections
