---
type: epic
title: "Route and fab"
parent: initiative-keeb-cad-m1
covers: [R10, R12, R13, R17]
sources: []
companions: []
after: []
refined: false
risk: high
---

# Route and fab

## Description

The wired design routes incrementally in a browser worker with saved routes and Reroute, passes the single DRC with design rules, and exports PCB and plate gerbers + drill that pass the fab's checks; unrouted connections and DRC violations are always shown. Background stages run in workers with progress and cancel, and stale results are marked.

## Outcome

For Sergii: the wired Corney routes in the browser and produces fab-checked gerbers + drill (SM-3).

## Done when

- The wired design routes incrementally in a worker; saved routes survive valid edits and Reroute works.
- DRC passes with design rules; unrouted connections are shown.
- Gerbers + drill pass the fab's checks.
- The slice scenario and one e2e journey pass.

## Boundaries

- Out: manual trace editing; loosening clearances to finish routing (SM-C2).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Decision (2026-10-28, routing verdict and architecture update 8eee956): the engine is keeb-cad's own keyboard router (clipper2-ts + flatbush, in a Web Worker), graded pass with fallback, so the per-connection KiCad fallback is live in M1 and the whole-board SM-3 fallback is not triggered (AD-12). Before relying on it, this epic reruns Corney's wired and wireless scorecards with AD-20's two drill clearances in the router's input, in its first routing story (the graded runs had no drill rule and stacked same-net vias: 45 `hole_to_hole` and 27 `holes_co_located` on wired); routes `ULED_1:LED22.2.F~LED23.4.B` and `ULED_1:LED23.4.B~LED23.4.F` after the wired move, by Reroute or otherwise, or shows why they can't route; tests the reroute on more than one key, move and run, and routes one board the router was not tuned on; measures router memory including typed arrays and sets a budget; and sets the per-request routing deadline. Source: `epic-risk-spikes/routing-verdict.md` and the architecture's Deferred table. Write it into Requirements when this epic is refined.
- Decision (2026-10-28, architecture update 8eee956): this epic owns the Reroute action (AD-12): a user action in `pipeline`, outside undo, that drops the saved routes in a chosen scope (the whole board, or the routes around a chosen unrouted connection) and routes them again. EXPERIENCE.md has no entry point for it yet, so a `bmad-ux` Update adds one before the story that builds it. Write it into Requirements when this epic is refined.
- Decision (2026-10-30, replan): re-sliced as the vertical slice 'Route and fab'; title, description, outcome and Done when rewritten; earlier Notes stay as history and are re-read against the spine (AD-1 to AD-25) when this epic is refined.
- Waits on epic 20 because: connections
- Waits on epic 13 because: live stage outputs
- Decision (2026-10-30, replan): moved-in entry 7.1 (workers: AD-11 input slices as cache key and freshness tag, the crossing in `reactive`) contradicts the spine as worded; revise it in place when this epic is refined, before it starts.
- Decision (2026-10-30, from epic-see-corneys-keys refinement): this slice, the first with a background output, takes over from retired entry 13.5: background outputs tagged and cached by input-slice hash (AD-11), and the Tab badge and status-strip output-state entries (current, waiting, stale). Plan them when this epic is refined.
