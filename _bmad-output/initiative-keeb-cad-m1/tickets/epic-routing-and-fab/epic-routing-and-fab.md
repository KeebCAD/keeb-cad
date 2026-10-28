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
- Decision (2026-10-28, routing verdict and architecture update 8eee956): the engine is keeb-cad's own keyboard router (clipper2-ts + flatbush, in a Web Worker), graded pass with fallback, so the per-connection KiCad fallback is live in M1 and the whole-board SM-3 fallback is not triggered (AD-12). Before relying on it, this epic reruns Corney's wired and wireless scorecards with AD-20's two drill clearances in the router's input, in its first routing story (the graded runs had no drill rule and stacked same-net vias: 45 `hole_to_hole` and 27 `holes_co_located` on wired); routes `ULED_1:LED22.2.F~LED23.4.B` and `ULED_1:LED23.4.B~LED23.4.F` after the wired move, by Reroute or otherwise, or shows why they can't route; tests the reroute on more than one key, move and run, and routes one board the router was not tuned on; measures router memory including typed arrays and sets a budget; and sets the per-request routing deadline. Source: `epic-risk-spikes/routing-verdict.md` and the architecture's Deferred table. Write it into Requirements when this epic is refined.
- Decision (2026-10-28, architecture update 8eee956): this epic owns the Reroute action (AD-12): a user action in `pipeline`, outside undo, that drops the saved routes in a chosen scope (the whole board, or the routes around a chosen unrouted connection) and routes them again. EXPERIENCE.md has no entry point for it yet, so a `bmad-ux` Update adds one before the story that builds it. Write it into Requirements when this epic is refined.
