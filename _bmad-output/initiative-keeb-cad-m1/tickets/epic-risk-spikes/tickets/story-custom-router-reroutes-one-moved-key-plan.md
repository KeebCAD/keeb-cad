---
title: 'Custom router reroutes one moved key'
type: 'feature'
ticket: '10'
created: '2026-10-27'
status: 'built'
baseline_revision: 'c3a69f1e97b11dbf04a9ded6df52119fa8167247'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** R3 needs evidence that the custom router reroutes only a moved key's connections around saved routes, with the module zone left clear, and R2 needs that reroute diff in each custom scorecard. Story 9's custom scorecards have no `reroute`.

**Approach:** After `score:custom` routes each design, move story 7's key by the same amount, and reroute that key's connections in the custom worker, together with the saved routes that now clash with the moved key, with every other base-run route passed to the router as fixed obstacles. Diff the result with story 7's engine-neutral `rerouteDiff` and write it into the scorecard as one `reroute` entry.

## Boundaries & Constraints

**Always:**
- Same move as story 7: `matrix_middle_home`, `{dx: 1.5, dy: -0.75}` mm, `movedConnections`, `savedRoutes` and `rerouteDiff` from `src/reroute.ts` unchanged (new functions may be added), same cap and network blocking as the base run.
- The saved routes are the scored base run's own `RouteSet`. The fixed routes are the saved routes less the conflicting ones (below). The router takes them as static obstacles carrying their nets, with the same clearances as any other copper. It cannot move or rip them up, and it returns copper only for the ids it is given. `after` = fixed + returned.
- The entry's method is a new `RerouteMethod` value, `fixed-obstacles`. Every `RerouteEntry` field is filled.
- Decision (2026-10-27, review pass 1): saved routes that clash with the moved key are rerouted with it. The conflicts are the `drc` violations `drc(moved input, saved)` adds over `drc(moved input, no routes)`. Their saved connections (traces by connection id, vias by `viaOwners`) are routed again together with the moved key's connections, and every other saved route stays fixed. The entry records the conflicts as `savedConflicts {violations, connections}`. `rerouteDiff` still diffs against the full saved routes, so the rerouted conflicting connections show up in `changedConnections` and `savedRoutes.changed`. Pass 1 measured wireless 4 and wired 30 conflicts, almost all shorts with the moved pads, which the old baseline hid.
- A reroute failure, cap or throw is recorded in the entry, never an exit failure.

**Never:**
- No grading or tier (story 13). No changes outside `spikes/`.
- Do not change `drc`, `toRoutingInput`, `moveKey`, `src/reroute.ts` behaviour, or the base scorecard fields. Do not change `score:tscircuit`'s output or regenerate its scorecards.
- Do not loosen any rule. Do not drop or move any saved route except the conflicting ones, which the Decision reroutes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Full run | `pnpm score:custom` | Each custom scorecard has `reroute` with one `fixed-obstacles` entry (`savedConflicts` filled), and one summary line per design | Exit 0 whenever both scorecards are written |
| Fixed route blocks | A fixed route of another net lies across the only path (unit) | That connection is unrouted, and the fixed route is not returned | — |
| Same-net fixed copper | A fixed route of the connection's own net touches its pad (unit) | It does not block the connection | — |
| Conflicting saved route | A saved route of another net lies within clearance of a moved pad (unit) | It is in `savedConflicts.connections`, counted in `violations`, and rerouted rather than fixed | — |
| Reroute fails | The router throws or hits the cap | The entry is written with its status and error, and the returned routes are scored | Not an exit failure |

</frozen-after-approval>

## Code Map

- `spikes/src/custom-router.ts` -- `routeConnections(input, ids, options)`. Static obstacles are built into `items` (around line 395, after `fixedCopper`), and every field starts from them. Add a `fixedRoutes?: RouteSet` option and push each trace segment (`traceShape`) and via (`viaShape`, both layers) as a `copper` item with `codeOf(net)`. This is the same as `search`'s `added` items, so the rip-up search, which reads static fields only, cannot cross them and `placed` never holds them.
- `spikes/src/protocol.ts` -- `CustomRouteRequest` gains `fixedRoutes?: RouteSet`. Add `routeCustom?: (r: CustomRouteRequest) => Promise<CustomRouteResponse>` to `ExternalPage`.
- `spikes/src/custom.worker.ts` -- pass `fixedRoutes` through. Nothing else changes.
- `spikes/src/main.ts` -- `?external&engine=custom` makes the custom worker and exposes `routeCustom`, alongside story 7's tscircuit `routeBoard` (`pending`/`answer` pattern, `data-status="ready"`). `?external` alone keeps its behaviour.
- `spikes/scripts/score-tscircuit.ts` -- `externalSession` (goto, ready wait, cap + grace race, reload after a timeout or error, `blocked`). Move it into `scripts/score.ts`, generic over the page path, the window function, request and response, and keep tscircuit's behaviour. `reroute()` is the pattern for the custom one: per-method try/catch, the `entry(...)` builder, summary lines.
- `spikes/scripts/score-custom.ts` -- after `scoreRoutes`, `card.reroute = await reroute(browser, text, routes)`: `toRoutingInput(moveKey(text, …))`, `movedConnections`, `savedRoutes`, `savedConflicts(input, saved)`, post `{ input, ids: [...moved, ...conflicts.connections], capMs, fixedRoutes: savedRoutes(base, [...moved, ...conflicts.connections]) }`, then `rerouteDiff(input, saved, {fixed + response.routes}, moved)` and `savedConflicts` into the entry. Status from `runStatus`.
- `spikes/src/route-set.ts` -- `RerouteMethod` adds `'fixed-obstacles'` (doc: exact shapes the router cannot move or rip up). `RerouteEntry` gains an optional `savedConflicts?: { violations: number; connections: string[] }`. It is optional so that story 7's tscircuit cards stay valid without being regenerated.
- `spikes/src/reroute.ts` -- add a pure `savedConflicts(input, saved)` that returns `{violations, connections}`. It uses `addedViolations(drc(input, EMPTY_ROUTES), drc(input, saved))`. A trace item is a connection id, a `via:<i>` item maps to `viaOwners(saved)[i]`, and pad and `fixed:` items are skipped. Connections come back in `input.connections` order. The existing functions stay unchanged.
- `spikes/src/custom-router.test.ts` -- the `edge cases` block's boxed-in board is the pattern for small hand-built inputs.
- `spikes/e2e/route.spec.ts:71` -- the `routeBoard` e2e test is the pattern for a `routeCustom` one.
- `spikes/README.md` -- the scorecard schema (~line 187), the story 7 section (~334), and the story 9 section (~469). Add a story 10 section next to them.

## Tasks & Acceptance

**Execution:**
- [x] `spikes/src/route-set.ts`, `spikes/src/custom-router.ts` -- `fixed-obstacles` method, optional `savedConflicts`, and a `fixedRoutes` option added as static net-coded copper.
- [x] `spikes/src/reroute.ts`, `spikes/src/reroute.test.ts` -- `savedConflicts`, with the Conflicting row as a unit test (and none on an unmoved board's own routes).
- [x] `spikes/src/custom-router.test.ts` -- the matrix's unit rows (a fixed route blocks, same-net fixed copper does not), plus one showing rip-up never moves a fixed route, with its contrast in the same test (`[A, B]` routes both).
- [x] `spikes/src/protocol.ts`, `spikes/src/custom.worker.ts`, `spikes/src/main.ts` -- `fixedRoutes` in the request, `?external&engine=custom` with `routeCustom`.
- [x] `spikes/e2e/route.spec.ts` -- `routeCustom` routes a posted wireless request twice in a row, and in another test answers a 1 ms cap with `timeout` and then an unknown id with `failed` + `thrown` (the Reroute fails row).
- [x] `spikes/scripts/score.ts`, `spikes/scripts/score-tscircuit.ts` -- generic `externalSession` moved out; tscircuit's behaviour unchanged.
- [x] `spikes/scripts/score-custom.ts` -- the reroute phase, its entry and summary line (with the conflict count). Note any returned trace or via (by `viaOwners`) whose connection was not asked for. Update the header comment.
- [x] `spikes/scorecards/custom-*.scorecard.json` -- regenerated by one run and committed.
- [x] `spikes/README.md` -- story 10 section (method, conflicts, results next to story 7's). The schema mentions `fixed-obstacles` and `savedConflicts`, story 9's "no `reroute`" line is updated, and the section says story 7's tscircuit entries count these conflicts in their baseline too.

**Acceptance Criteria:**
- Given kicad-cli, when running `pnpm --dir spikes score:custom`, then both custom scorecards hold one `fixed-obstacles` `reroute` entry with every field filled.
- Given a custom scorecard, when reading its `reroute` entry, then `changedConnections` names the moved ids plus exactly the `savedConflicts.connections` that were rerouted, and `fixedCopperViolations` is shown.
- Given the change, when running `pnpm --dir spikes verify` and `pnpm check`, then both pass.

## Implementation Notes

- The router's `fixedRoutes` items are built exactly like `search`'s `added` items, but in the static `items` list, so every field (the rip-up's static-only one too) holds them and `placed` never does. Router version `0c0b6d9`. The base routes and counts match story 9's run.
- `externalSession` moved to `scripts/score.ts`, typed by the `ExternalPage` function name (`routeBoard`, `routeCustom`). `MOVED_KEY`, `DELTA` and `printReroute` are shared there too.
- Results: wired moved 18/19 routed, wireless 9/9. Saved routes changed 0 (as designed), `fixedCopperViolations` 0, `drc` added 0. Wired's unrouted `LED_10:LED11.4.B~LED11.4.F` routes when alone around the saved routes, and fails on the moved board even without them. So the router's order and rip-up block it, not a fixed obstacle (README).
- Matrix audit: the "Reroute fails" row had no test on the `routeCustom` path. Added an e2e test in `e2e/route.spec.ts`: a 1 ms cap answers `timeout`, then in the same page an unknown id answers `failed` + `thrown`. The wireless loader and `openRouteCustom` are shared helpers in that spec.
- e2e/ has no Node types, so the spec loads `node:fs` through an untyped dynamic import.

- Attempt 2 (after the pass 1 decision): started from the attempt 1 patch, without its scorecards, then added `savedConflicts` in `src/reroute.ts`, the optional `RerouteEntry.savedConflicts`, the moved + conflicting ids in `score-custom.ts`, stray vias counted by `viaOwners`, and the rip-up contrast in the router test.
- Attempt 2 results: wired moved 19/19, conflicts 30 violations / 9 connections, changed 28 (19 moved + 9 conflicting), saved 305 / 9, fixed copper 0, `drc` added 0, 6.0 s. Wireless moved 9/9, conflicts 4 / 2, changed 11, saved 141 / 2, 0, 0, 0.6 s. Wired's LED11.4 connection now routes.
- Gap the plan missed: the Design Notes assumed `drc` shows unrouted conflicting connections, but `drc` has no unrouted kind, and `movedConnections` counts moved ids only. On wired, 2 of the 9 rerouted conflicts (`ULED_1:LED22.2.F~LED23.4.B`, `ULED_1:LED23.4.B~LED23.4.F`) do not route again. `score-custom` writes them into `run.error` and prints them, so a `solved` entry carries an error note.

## Plan Change Log

- 2026-10-27, review pass 1, intent_gap #1: saved routes that clash with the moved key (wireless 4, wired 30 `drc` violations, mostly shorts) were hidden in `rerouteDiff`'s baseline, and the scorecards said `drc +0`. The human decided that they are rerouted with the moved key and recorded (`savedConflicts`). Amended: Code Map, Tasks, AC and Design Notes. Code reverted (attempt saved at /tmp/claude-1000/-home-ruyu-projects-keeb-cad/2541e145-ff91-40e6-b3a2-30bea8f12d2c/scratchpad/story-2.10-attempt-1.patch). The Implementation Notes above describe attempt 1. Known-bad state avoided: a reroute entry reading clean while the moved board has shorts. KEEP from attempt 1:
  - the `fixedRoutes` items built like `search`'s `added` in the static `items` list;
  - `externalSession` moved to `scripts/score.ts`, typed by the `ExternalPage` function name, with `MOVED_KEY`, `DELTA` and `printReroute` shared;
  - `exposeRouteCustom` and the `customFailure` helper in `main.ts`;
  - the e2e helpers `wirelessInput` and `openRouteCustom`, and the cap-then-throw `routeCustom` test;
  - the README's note that wired's unrouted LED11.4 connection is the router's order, if it is still unrouted.

## Review Triage Log

### Pass 1 (quick): high 1, medium 0, low 4, false 0, maybe-false 0. 1 intent_gap, 2 patch (moot until re-derivation), 2 rejected.

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | Saved routes that conflict with the moved key are never counted: `rerouteDiff` counts them in its baseline `drc(input, saved)`, so they cancel out of `drc.added` and `fixedCopperViolations`, and no entry field carries them | high | intent_gap | Measured: `drc(moved, saved)` over `drc(moved, empty)` gives wireless 4 and wired 30 violations, almost all shorts with the moved key's pads (e.g. `S11.2.F` with `C1:MCU1.119.TH~S4.1.B`). The scorecards show `drc +0` on boards that have shorts. The frozen block says these are "counted", but `RerouteEntry` has no field for them and `src/reroute.ts` may not change, so the plan cannot settle it. Whether conflicting saved routes may also be rerouted is the human's call. Story 7's tscircuit entries have the same blind spot. |
| 2 | Setup (`moveKey`, `movedConnections`, `savedRoutes`, `externalSession`) and the fallback's second `rerouteDiff` can throw out of the run | low | reject | Real, but they are deterministic Node steps on fixtures that run every time. Not a router failure or cap (the matrix row), it matches story 7, and the fix adds guards. |
| 3 | The "rip-up never moves a fixed route" test's control shows B routes alone, not that B rips up a routed A | low | patch | Confirmed. The fix is one line: `routeConnections(box, [A, B])` routes both, in that test. |
| 4 | The stray-copper note ignores vias | low | patch | Confirmed: `strays` reads `returned.traces` only, while the README says "any returned copper". Fix: include the `viaOwners(returned)` ids. |
| 5 | `?external` with an unknown `engine` silently falls back to tscircuit | low | reject | Real, but only on a typo, which then surfaces as `routeCustom` being undefined, a `threw` entry. The fix adds a branch. |

### Pass 2 (quick): high 0, medium 0, low 3, false 0, maybe-false 0. 1 patch, 2 rejected. Pass 1's #3 and #4 were applied in the re-derivation, and #2 and #5 are not refiled.

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | A clashing via that no trace ends on names no connection, so `savedRoutes` keeps it fixed and nothing records it | low | reject | Real in the code, but the custom router places a via only between two of its own runs, which `viaOwners` then names. The out-of-band Node run found no saved conflict left in `after` on either design. Fixing it means choosing what to do with ownerless copper (drop it, or count it), which adds complexity for a case Corney does not reach. |
| 2 | The task's "none on an unmoved board's own routes" is not tested: the unmoved test uses one hand-made trace | low | patch | Confirmed. Fix: assert `savedConflicts` is `{0, []}` on the router's DRC-clean wired matrix routes. |
| 3 | The entry cannot show a conflict that the reroute brings back: the baseline holds the conflict, and a matching violation from the rerouted connection cancels out | low | reject | Real in principle. But the rerouted connection is routed under the same clearances, so it cannot remake a clearance violation against the moved pad unless the router breaks its own rule, and the base runs' `drc +0` shows it does not. A residual check (`after` over the bare moved board) would need a new field or note. The README's evidence is the out-of-band Node run. Raised with the human at presentation. |

## Design Notes

Apart from the conflicting connections, `savedRoutes.changed` is fixed by construction: the router returns copper only for the ids it is given, so `savedRoutes.changed` equals the number of conflicting connections. What the entry actually measures is whether the moved key and the conflicting connections still route (`movedConnections.routed`, `unrouted` conflicts in `drc`), the `drc` added, and the module-zone check. The README says this so that story 13 does not read the changed count as a routing result.

## Verification

**Commands:**
- `pnpm --dir spikes score:custom` -- expected: exit 0, two scorecards with `reroute`, one reroute line per design.
- `pnpm --dir spikes verify` -- expected: exit 0.
- `pnpm check` -- expected: exit 0.
