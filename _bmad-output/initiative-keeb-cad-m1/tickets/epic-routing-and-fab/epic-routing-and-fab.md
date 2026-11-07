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
- Waits on epic 23 because: the model worker and its protocol
- Decision (2026-10-30, replan): moved-in entry 7.1 (workers: AD-11 input slices as cache key and freshness tag, the crossing in `reactive`) contradicts the spine as worded; revise it in place when this epic is refined, before it starts.
- Decision (2026-10-30, from epic-see-corneys-keys refinement): this slice, the first with a background output, takes over from retired entry 13.5: background outputs tagged and cached by input-slice hash (AD-11), and the Tab badge and status-strip output-state entries (current, waiting, stale). Plan them when this epic is refined.
- Decision (2026-11-01, replan after the blueprints fold b10ba5d): the fingerprints section (spine AD-11) goes to 7.2, which builds the input-slice hashes fingerprints are made of and is where pipeline first writes saved derived data. Rejected: fingerprints in 13.18 (pipeline's derived-section writer and the Accept action in the slice's largest story).
- Decision (2026-11-02, from epic-see-corneys-keys replan after the AD-11 model-worker change): 13.20 builds the model worker, so 7.1 waits on 13.20, not 13.1. Revise in place when this epic is refined: 7.1 has pipeline running workers itself, but main spawns all three and hands the model worker a MessageChannel port to case and routing (spine G7); 7.1 mentions a gesture's debounce pause, but there are no gestures (AD-2); 7.2 has fingerprints as a section written by pipeline's derived-section writer, but they are a separate file of the design bundle that pipeline posts to main and main's storage saves (AD-1, AD-11, AD-13).
- Decision (2026-11-02, from the split of epic-see-corneys-keys): its foundation lane moved to epic-a-new-design-opens (23); 7.1 now waits on 23.4 (was 13.20); this epic's after is repointed to 23.
- Decision (2026-11-02, replan after the spine package split b9b4ec5, 411dd17): when 7.1 is revised, the crossing's machine is `messaging` (not `reactive`) and `workers` on main spawns all three workers.
- Decision (2026-11-05, replan after the spine-gap sweep B6): 7.1's test stage and its input-slice type live only in pipeline's spec files; a test-only slice is no contract between packages, so schema and the spine stay without it. Rejected: typing it in schema (B6 as first answered).
- Decision (2026-11-05, replan after the spine-gap sweep, spine-gap-sweep-2026-11-05.md): 7.1 and 7.2 re-rendered (A1, A4, B5–B7, B10).
- Decision (2026-11-07, Sergii, replan after 23.7's build): 1's test page runs in Vitest browser mode in Chromium and Firefox, not on a Firefox Playwright project, because its checks are reversible and lose no work (AGENTS.md's end-to-end bar) and browser mode already runs real Web Workers; 23.7 added no Firefox project either. What 1 requires is unchanged. Source: story-the-app-opens-the-last-design-plan.md.
