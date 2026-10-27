---
title: 'tscircuit reroutes one moved key'
type: 'feature'
ticket: '7'
created: '2026-10-27'
status: 'built'
baseline_revision: 'a4523508576e19eb6457ef48b63920e42acaa7ad'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** R3 needs evidence that tscircuit reroutes only a moved key's connections around saved routes, with the module's fixed copper left clear, and R2 needs the reroute diff in each tscircuit scorecard. Story 6's scorecards have no `reroute`.

**Approach:** After `score:tscircuit` routes each design, move one key with `moveKey`, and reroute only that key's connections twice in the same worker: with the other saved routes passed as tscircuit preloaded `traces`, and with them passed as rect obstacles. An engine-neutral diff compares the result with the saved routes and is written into the scorecard.

## Boundaries & Constraints

**Always:**
- Moved key: `matrix_middle_home`, delta `{dx: 1.5, dy: -0.75}` mm (story 4's test move). Its connections are the scored (`key-cell`, `routing`) connections with a pad on a moved footprint; every other routed connection's traces and vias from the base run are the saved routes.
- Both methods use `toSimpleRouteJson(moved input)` with `connections` cut to the moved key's. Pad `connectedTo` still names every connection, so saved copper may end on its pads.
  - `preloaded-traces`: the saved routes go in as SRJ `traces` (`toSimplifiedPcbTraces`). Any returned trace whose `__replaces_pcb_trace_id` names a saved trace replaces that saved connection's routes and counts as changed.
  - `rect-obstacles`: each saved segment goes in as a capsule-cover rect and each saved via as a circle on both layers, `connectedTo` its net and connection name.
- The diff is engine-neutral: `changedConnections` lists the connection ids whose traces or vias differ between the saved and the rerouted `RouteSet`. `savedRoutes {unchanged, changed}` counts the saved connections only. `fixedCopperViolations` is the number of `drc` violations that have a `fixed:<i>` item and are added over `drc(moved input, saved routes)`. That number is the module-zone check (the zone is its fixed copper, story 4).
- Each method also records its run status and error, solve `workerMs`, the moved connections routed of total (by `routedConnections`), and the `drc` violations added over the same baseline. The cap and the network blocking are the base run's.
- A reroute failure, cap or throw is recorded, never an exit failure, and never hides unrouted connections (C6).

**Never:**
- No grading or tier (entry 13). No changes outside `spikes/`.
- Do not change `drc`, `toRoutingInput`, `moveKey` or `toSimpleRouteJson` behaviour. The base scorecard fields keep story 6's meaning.
- No tuning that loosens a rule. Do not drop saved routes that conflict with the moved key: they stay and their violations are counted.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Full run | `pnpm score:tscircuit` | Each scorecard has `reroute` with one entry per method; one summary line per method per design | Exit 0 whenever both scorecards are written |
| Untouched | Saved and rerouted sets are identical except the moved key's connections (unit) | `changedConnections` = moved ids, `savedRoutes.changed` 0 | — |
| Saved route changed | A preloaded trace returned with `__replaces_pcb_trace_id` (unit) | That connection is in `changedConnections` and counted `changed` | — |
| Fixed copper hit | A new trace within clearance of a `fixed:<i>` segment (unit) | `fixedCopperViolations` ≥ 1 | — |
| Reroute fails | Solver fails, throws or hits the cap | The entry is written with its status, error and returned traces scored | Not an exit failure |

</frozen-after-approval>

## Code Map

- `spikes/scripts/score-tscircuit.ts` -- base run per design (`routeInBrowser`, `score`). Add the reroute phase after `score`, reusing the base `RouteSet` and the browser. `routeInBrowser` takes a path; add a variant that posts a Node-built SRJ.
- `spikes/src/main.ts`, `src/protocol.ts`, `src/route.worker.ts` -- add a `?external` page mode that exposes `window.routeBoard(request)`, which the script calls via `page.evaluate`. The worker is unchanged: it already returns status, traces and ms under `capMs`. Keep `?corney`, `?probe` and `?broken` and their e2e tests passing.
- `spikes/src/tscircuit-adapter.ts` -- `toSimpleRouteJson`, `routedIndices`, `connectionName`/`connectionIndex`, `toRouteSet`, `toSimplifiedPcbTraces` (saved → preloaded traces), and the fixed-copper capsule rect (reuse for saved segments). Add `toRerouteJson(input, saved, moved, method)`.
- tscircuit 0.0.1010 -- `SimpleRouteJson.traces?` (d.ts:160). The exported solver preloads traces as fixed nets but may re-route parts of them. `getOutputSimplifiedPcbTraces()` returns new traces plus changed preloaded ones (`__replaces_pcb_trace_id`), never the unchanged ones. Obstacle `connectedTo` matches connection names, pointIds and obstacle ids, not plain `netConnectionName`.
- `spikes/src/move-key.ts` -- `moveKey`, `keyReferences`, `CORNEY_KEYS`. Pad `reference` identifies moved footprints.
- `spikes/src/completion.ts` -- `routedConnections`. `src/drc.ts` -- `drc`, violation `items`. `src/drc-cases.ts` -- `addedViolations`.
- `spikes/src/route-set.ts` -- `Scorecard.reroute` is unfilled so far. Change it to an array of entries carrying `method` and the run fields above (only `drc.test.ts:294` asserts it is undefined).
- `spikes/README.md` -- scorecard schema (line ~188) and the story 6 results table.

## Tasks & Acceptance

**Execution:**
- [x] `spikes/src/route-set.ts` -- `RerouteEntry` and `reroute?: RerouteEntry[]`.
- [x] `spikes/src/reroute.ts` -- `movedConnections(input, key)`, `savedRoutes(base, moved ids)`, `rerouteDiff(input, saved, after, moved ids)`. All are pure and engine-neutral, so entry 10 can reuse them.
- [x] `spikes/src/tscircuit-adapter.ts` -- `toRerouteJson` for both methods, plus `mergeReroute(saved, converted, traces)` that applies `__replaces_pcb_trace_id`.
- [x] `spikes/src/reroute.test.ts`, `src/tscircuit-adapter.test.ts` -- the matrix's unit rows, plus SRJ checks per method on wireless (connection count = the moved key's, `traces` or obstacle count = the saved routes').
- [x] `spikes/src/main.ts`, `src/protocol.ts` -- the `?external` mode.
- [x] `spikes/scripts/score-tscircuit.ts` -- the reroute phase, its entries, and summary lines.
- [x] `spikes/scorecards/*.scorecard.json` -- regenerated by one run and committed.
- [x] `spikes/README.md` -- the reroute method, schema, and results for both methods, with the base table updated from the new run.

**Acceptance Criteria:**
- Given kicad-cli set up, when running `pnpm --dir spikes score:tscircuit`, then both scorecards hold a `reroute` entry for each method with every field filled.
- Given a scorecard, when reading a `reroute` entry, then it shows either only the moved key's connections changed or which saved routes changed, and its `fixedCopperViolations`.
- Given the change, when running `pnpm --dir spikes verify` and `pnpm check`, then both pass.

## Implementation Notes

- `RouteVia` carries no connection, so via ownership is geometric (`viaOwners` in `route-set.ts`: the connections with a trace of the net that ends on the via). `savedRoutes` drops a via only when every owner is moved. In the diff, an added or removed via changes its first owner only when no other owner already changed. The first full run counted one saved connection as changed on wireless `rect-obstacles`, because a new via was shared by a moved trace and a saved trace and went to the first. That is fixed, has a unit test, and the scorecards come from the second run.
- `toSimplifiedPcbTraces` now starts a new tscircuit trace (`t<i>_<k>`) wherever a connection's copper does not continue, so that no wire is invented across a gap. Replacement is per preloaded trace (tscircuit replaces whole preloaded traces). For a connection with one continuous trace, that is the same as replacing the connection. An engine-reported replacement counts as changed even when its copper comes back identical (`rerouteDiff`'s `replaced`).
- `drc.added` and `fixedCopperViolations` match `via:<i>` items by via place, since the indices shift between the saved and the rerouted sets.
- Node loads `src/corney.ts` (needed for `moveKey`/`CORNEY_KEYS`) through a `?raw` load hook added to `scripts/ts-resolve.mjs`. `scripts/tsconfig.json` includes `src/vite-env.d.ts`.
- `?external` sets `data-status="ready"` and keeps one worker for both methods. After a timeout or a browser error, it reloads the page before the next method. A `routeBoard` e2e test was added to `e2e/route.spec.ts`.
- Results: on wired, both methods fail with no traces (the solver can find no path for the moved `c118` and `c265`). On wireless, `preloaded-traces` routes 9/9 but changes 36 saved connections, and `rect-obstacles` changes no saved connection but routes only 6/9. `fixedCopperViolations` is 0 everywhere.

## Plan Change Log

## Review Triage Log

### Pass 1 (quick): high 0, medium 2, low 2, false 0, maybe-false 0. 3 patched, 1 rejected.

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | `drc.added` under `preloaded-traces` counts reordered baseline violations as new | medium | patch | Confirmed: `addedViolations` keys on `items.join('|')`, `drc` emits `[a.id, o.id]` in copper order (`drc.ts:160`, `j > i`), and `mergeReroute` appends the replaced connections' copper last. Fix: sort items before matching, plus a test asserting `drc.added` 0 on an identical replacement. Scorecards re-run: wireless still +52 / +32, so the committed values were not inflated on this run. |
| 2 | A throw after the solve (`toRouteSet`, `mergeReroute`, `rerouteDiff`) aborts the run | medium | patch | Confirmed: only `session.route(...)` is inside try/catch in `reroute()`. Against the frozen rule that a throw is recorded, never an exit failure. Fix: guard per method, status `threw`. |
| 3 | `chains()` `viaAt` takes the first co-located same-net via, so `mergeReroute` may remove the wrong connection's via | low | reject | Real only when two connections of one net put vias at the same point and only one is replaced. Not shown on Corney. The fix adds claimed-via state. |
| 4 | Wired entries show `changedConnections: []` with the moved key unrouted | low | patch | Confirmed: moved connections are not in `saved`, so absent-in-both reads as unchanged. That matches the plan's definition, but the README does not say it. Fix: one README sentence pointing to `movedConnections.routed` and `run.status`. |

## Design Notes

The reroute lives in `score:tscircuit` rather than in a second script, so the saved routes are the scored base run's own (tscircuit's output is not committed, and a second base run might differ). The SRJ is built in Node because the saved routes exist only there; the page just forwards it, so `workerMs` stays solve time.

## Verification

**Commands:**
- `pnpm --dir spikes score:tscircuit` -- expected: exit 0, two scorecards with `reroute`, summary lines per method.
- `pnpm --dir spikes verify` -- expected: exit 0.
- `pnpm check` -- expected: exit 0.
