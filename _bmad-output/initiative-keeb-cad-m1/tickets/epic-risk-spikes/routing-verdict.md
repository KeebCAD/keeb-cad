---
title: 'Routing verdict'
epic: epic-risk-spikes
stories: ['5', '6', '7', '8', '9', '10']
date: '2026-10-28'
status: 'signed off 2026-10-28'
covers: [R2, R3, R4, R7, R8]
---

# Routing verdict

**Verdict: the custom keyboard router, graded pass with fallback.** It becomes the engine
behind AD-12's routing stage. tscircuit `@tscircuit/capacity-autorouter` is graded **fail**. The
tiers differ, so the tie-break is not used. The SM-3 fallback is **not triggered**: an engine is
named, and the bar's own fallback tier covers what it leaves unrouted.

The custom router routes reversible Corney in full in a browser Web Worker. Wired is 333 / 333
in 13.2 s and wireless 152 / 152 in 2.7 s, and it adds no `drc` errors and no KiCad errors over
the bare boards. After the single-key move it reroutes the moved key in full (19 / 19 and 9 / 9).
It leaves every valid saved route unchanged and puts no copper in the module zone. On wired, two
of the nine saved connections that clash with the moved key find no new path, so wired is
331 / 333 after the move. Under the user's Decision of 2026-10-28, that puts wired, and so the
engine, at pass with fallback. The two connections become an epic-routing-and-fab requirement.

tscircuit is not DRC-clean on either board. It adds 3418 `drc` and 950 KiCad errors on wired,
and 250 and 240 on wireless. That alone rules out both pass tiers. It also fails the wired reroute
under both methods (0 / 19), and wired takes 244.3 s against the bar's 60 s.

Evidence: `spikes/scorecards/{tscircuit,custom}-{wired,wireless}.scorecard.json` and
`spikes/README.md`, sections "Case results", "What tscircuit cannot take", story 6 "Results",
story 7 "Results", story 9 "Results" and story 10 "Results". The scorecards are the committed
ones. None was regenerated for this verdict. The only re-run was one of `score:custom` to read
KiCad's severities (below), and it reproduced the committed routes and counts.

## The bar (Decisions of 2026-10-26, word for word)

> **Pass** means Corney wired and wireless fully routed, zero KiCad DRC errors at Corney
> clearances, a single-key move reroutes only that key's connections and leaves the other saved
> routes unchanged, and each board routes in about 60 s or less in a browser Web Worker on a
> typical laptop. **Pass with fallback** means at least about 90% of connections routed and still
> DRC-clean, with the rest left visibly unrouted for SM-3 finishing in KiCad (C6). Anything below
> that is a **fail**.

> Tie-break when both engines land in the same tier: higher completion %, then single-key reroute
> behaviour, then routing time.

The bar is read with the user's three Decisions of 2026-10-28. No other reading is applied.

1. "Zero KiCad DRC errors" means zero errors **added** over the bare board, as stories 5–10
   measured.
2. "Leaves the other saved routes unchanged" covers **valid** saved routes only (AD-12). A saved
   route that clashes with the moved key is invalid, and rerouting it complies.
3. Completeness after the move counts.

KiCad counts are graded by severity. KiCad 10.0.7 reports `copper_edge_clearance` and
`invalid_outline` as errors, and `hole_to_hole` and `holes_co_located` as warnings. This was
checked on 2026-10-28 on a re-run of `score:custom`, with the same routes and counts as the
committed cards. `drc` counts are our own checker's, which reports per net class (R7).

## Grades per criterion and board

Each cell is the grade on that criterion alone. A board's tier is its lowest criterion, and an
engine's tier is the lower of its two boards'.

### Custom router (router `0c0b6d9`)

| Criterion | Wired | Grade | Wireless | Grade |
|---|---|---|---|---|
| Completion (key-cell + routing) | 333 / 333 (100%): key-cell 63 / 63, routing 270 / 270 | pass | 152 / 152 (100%): key-cell 63 / 63, routing 89 / 89 | pass |
| DRC: `drc` baseline + added | 216 + 0 | pass | 0 + 0 | pass |
| DRC: KiCad errors added | 0. `copper_edge_clearance` 199 on both boards (KiCad's limit, `addedUncertain`); `invalid_outline` 4 on both boards | pass | 0 | pass |
| KiCad warnings new on the routed board | `hole_to_hole` 45, `holes_co_located` 27 | not errors, so not graded (follow-up below) | `hole_to_hole` 2 | not graded (follow-up) |
| Single-key reroute | moved 19 / 19; saved conflicts 30 violations in 9 connections, 7 / 9 routed again; saved routes 305 unchanged, 9 changed (the 9 conflicts); `fixedCopperViolations` 0; `drc` added 0; **331 / 333 after the move** | **pass with fallback** (Decisions 2 and 3) | moved 9 / 9; saved conflicts 4 violations in 2 connections, 2 / 2 routed again; saved routes 141 unchanged, 2 changed (the 2 conflicts); `fixedCopperViolations` 0; `drc` added 0 | pass |
| Time in the worker | 13.2 s (reroute 6.0 s) | pass | 2.7 s (reroute 0.6 s) | pass |
| **Board tier** | | **pass with fallback** | | **pass** |

**Engine tier: pass with fallback** (the lower of the two boards).

- The KiCad `copper_edge_clearance` count stops at 199 on both wired boards, so KiCad's "+0" for
  that type is a difference of two truncated samples. `drc` is not capped. It counts 216
  `edge-clearance` on both the bare and the routed board, and the 17 `drcOnly` signatures are all
  baseline LED25–LED27 pads with no routed copper in them (story 9 "Results"). So none was added.
- `savedRoutes.changed` (9 and 2) equals the conflict count by construction, so it is not read as
  a routing result (story 10 "Results"). What is graded is that the moved key routes in full, that
  the conflicting connections route again (7 / 9 and 2 / 2), and that `drc` adds 0 and
  `fixedCopperViolations` is 0.
- The two wired connections left unrouted after the move are `ULED_1:LED22.2.F~LED23.4.B` and
  `ULED_1:LED23.4.B~LED23.4.F` (`reroute[0].run.error`). They are 2 of 333, so the board stays
  above the bar's about 90%, and every routed connection is DRC-clean.
- 📐 In the spike, those two show only in `run.error`, since `drc` has no unrouted kind. "Visibly
  unrouted" therefore holds only once AD-12's `unrouted` violations exist in production. The
  spike does not show it.
- Peak worker JS heap is 96.4 MiB (wired) and 27.5 MiB (wireless). The bar does not grade
  memory. The figure leaves out typed arrays, which README estimates at about 120 MiB more (see
  Limits).

### tscircuit (`@tscircuit/capacity-autorouter` 0.0.1010)

| Criterion | Wired | Grade | Wireless | Grade |
|---|---|---|---|---|
| Completion (key-cell + routing) | 330 / 333 (99.1%): key-cell 63 / 63, routing 267 / 270 | pass with fallback on this criterion | 144 / 152 (94.7%): key-cell 63 / 63, routing 81 / 89 | pass with fallback on this criterion |
| DRC: `drc` baseline + added | 216 + 3418 (routed: clearance 2634, hole 419, edge 352, short 229) | **fail** | 0 + 250 (hole 142, clearance 96, short 12) | **fail** |
| DRC: KiCad errors added | 950 (`addedUncertain`: `copper_edge_clearance`, `hole_clearance`, both at 199) | **fail** | 240 | **fail** |
| Single-key reroute | `preloaded-traces`: failed, no path for `c118`, 0 / 19. `rect-obstacles`: failed, reachability precheck for `c265`, 0 / 19. No traces back, so saved routes 314 / 0 | **fail** | `preloaded-traces`: 9 / 9, 36 saved connections changed, `drc` +52. `rect-obstacles`: 6 / 9, saved 140 / 0, `drc` +32. `fixedCopperViolations` 0 for both | **fail** (`drc` added under both methods; 6 / 9 under `rect-obstacles`) |
| Time in the worker | 244.3 s | **fail** (bar: about 60 s) | 26.5 s | pass |
| **Board tier** | | **fail** | | **fail** |

**Engine tier: fail.** Pass with fallback needs the routed part "still DRC-clean". tscircuit adds
errors on both boards.

- The unrouted connections are listed in the scorecards and in story 6 "Results". Wired has
  3 and wireless 8, among them the reversible RST1 and PWR1 F/B copies, which tscircuit ends on a
  layer the pad lacks.
- 📐 Story 7 did not measure saved conflicts for tscircuit. Its `drc.added` is over
  `drc(moved, saved)`, so a saved route that clashes with the moved key cancels out (deferred-work,
  story 10 entry). So it is not known how many of the 36 saved connections changed under
  `preloaded-traces` were invalid, and +52 and +32 are lower bounds. Neither unknown can raise the
  grade, because the reroute adds errors either way and the base boards already fail DRC. That
  blind spot is answered here without a re-run, which this verdict may not do (the plan's Never list).
- The cross-check leaves `kicadOnly` 91 (wired) and 7 (wireless) unexplained (story 6
  "Results"). That does not change the grade either, because the errors `drc` and KiCad agree on
  already fail it.
- Peak worker JS heap is 790.9 MiB (wired) and 467.0 MiB (wireless).

### Tie-break

Not applied. The custom router is at pass with fallback and tscircuit is at fail, so the tiers
differ (plan matrix, first row).

## Incremental routing shown (R3)

Both engines got story 7's move (`matrix_middle_home` by dx 1.5, dy −0.75 mm, one run), and both
were diffed by the same `rerouteDiff`.

| | custom wired | custom wireless | tscircuit wired (both methods) | tscircuit wireless: preloaded / rect |
|---|---|---|---|---|
| run | solved, 6.0 s | solved, 0.6 s | failed, 20.3 s / 44.3 s | solved, 94.1 s / 14.2 s |
| moved routed | 19 / 19 | 9 / 9 | 0 / 19 | 9 / 9, 6 / 9 |
| saved conflicts (violations, connections) | 30, 9 | 4, 2 | not measured | not measured |
| conflicting connections routed again | 7 / 9 | 2 / 2 | — | — |
| changed connections | 28 (19 moved + 9 conflicting) | 11 (9 moved + 2 conflicting) | 0 | 45 (9 + 36 saved), 9 |
| saved routes unchanged / changed | 305 / 9 | 141 / 2 | 314 / 0 | 104 / 36, 140 / 0 |
| `fixedCopperViolations` (module zone) | 0 | 0 | 0 | 0 |
| `drc` added | 0 | 0 | 0 | 52, 32 |

Source: README story 10 "Results" and the `reroute` entries of the four scorecards.

The custom router shows R3 as AD-12 states it. Valid saved routes go in as fixed obstacles,
which it cannot cross, move or rip up. Only the moved key's connections and the invalid
(clashing) ones are routed again, and it returns copper only for the ids it is given. No copper
enters the module zone. tscircuit shows neither form: `preloaded-traces` rewrites saved routes,
`rect-obstacles` leaves moved connections unrouted, and wired fails under both.

## Connection split rule (R4, fixed)

The split rule is fixed as written in `spikes/SPLIT-RULE.md`, implemented by `splitNet`
(`src/split-rule.ts`):

- For each net, sort its pad ids in natural order and connect each pad to the next. That gives
  n − 1 connections for n pads, and none for fewer than two.
- `connection-id = <net-id> ":" <padA> "~" <padB>`, with padA before padB in natural order.
  `pad-id = <Reference> "." <pin> "." <copper> [ "." <copy> ]`, where copper is `F`, `B` or `TH`
  and the copy suffix counts repeats in file order.
- The rule takes no positions. `src/routing-input.test.ts` ("keeps ids and moves only the key's
  pads when one key moves") asserts that the connection ids are equal before and after the move,
  on both designs.
- Each connection carries `realisedBy` (`fixed-copper`, `key-cell` or `routing`). That tag is the
  only place positions are used.
- Natural order is defined on any string, so the rule carries over to AD-14's
  `<side>/<slot>.<component>.<pin>` ids unchanged (SPLIT-RULE.md, "Mapping to AD-14 ids").

## Clearance policy (R7, shown)

- **Engines route at the strictest net-class clearance.** The custom router inflates every
  copper item by `engineClearance` (0.20 mm, the strictest class), holes by `holeClearance`
  (0.25 mm) and the edge by `boardEdgeClearance` (0.30 mm), and places each class at its own
  width (README story 8, "Field"). tscircuit gets 0.20 mm in every copper clearance field, `minBoardEdgeClearance` 0.30 mm and
  `minTraceToHoleEdgeClearance` 0.25 mm (README story 6, "Adapter").
- **`drc` reports per net class.** Each scorecard carries `drc.byClass` (power, signal,
  default), and `drc` checks each class's own rules. For example, power is 0.25 / 0.20 mm and
  signal 0.15 / 0.15 mm (README "Corney routing input").
- **tscircuit's limits** (README "What tscircuit cannot take", listed, not worked around):
  - One clearance value per SRJ field, so signal is held to 0.20 mm rather than 0.15 mm.
  - One `minTraceWidth`, set to the widest class (0.25 mm). At 0.15 mm, power traces narrowed to
    0.15 mm (1812 `track-width` errors on wired), which loosens a rule.
  - Footprint cutouts are only grown obstacles.
  - Pads go in as their full rects.
  - There is no via-to-NPTH field.
  - Traces sometimes end on a layer the pad lacks.

  These limits no longer bind the chosen engine. They are listed so that the AD-20 rule does not
  assume what tscircuit could not take.
- **KiCad is a cross-check, not the gate.** It stops some types at exactly 199, and it has a
  blind spot: crossing traces of different nets report nothing (README "Case results"). `drc`
  stays the gate (AD-20).

## Split-reversible revisit (initiative Decision 2026-10-26, item 4)

**Answer: keep split-reversible as the M1 form. Do not weigh split-mirrored now.** The revisit
condition was "if reversible Corney does not route in the browser". It does. The custom router
routes both reversible Corney boards in full in a Web Worker, with no `drc` or KiCad errors
added. That includes the reversible F/B pad copies, joined by visible connections, which
tscircuit failed on (RST1, PWR1). That is wired 333 / 333 in 13.2 s and wireless 152 / 152 in
2.7 s.

The 331 / 333 after the wired move belongs to the router (a path round fixed routes), not to the
form, so it is not evidence for split-mirrored. That leaves the `split-mirrored` Deferred row
with one trigger: "when a reference board is chosen".

## Limits of this evidence

- 📐 **One run, one moved key, one delta.** Every routing number comes from a single run.
  `matrix_middle_home` is the only key moved, by (1.5, −0.75) mm. A move near the MCU or the
  module zone, a larger move, a rotation and a key insert are all untested, and so is whether
  a move elsewhere leaves more than two connections unrouted.
- **Time moves with the machine.** The custom wired time was 13.2 s on the committed cards,
  13.0 s on story 9's run and 5.4 s on an earlier run of the same source (README story 9 "Time
  moves with the machine's state"). tscircuit's times come from a different run. All custom times
  are well under 60 s, so the grade does not depend on which one is used.
- **The heap figure leaves out typed arrays.** `peakMemoryMb` is the V8 JS heap only. The custom
  router's rasters and A* arrays are typed arrays, estimated at about 120 MiB more (README story
  9, an estimate from the array sizes, not a measurement). tscircuit's share is not known. The
  bar does not grade memory, but 96.4 MiB is not the router's footprint.
- 📐 **Only Corney was tested.** No other board was routed (LambBT, a denser matrix, another MCU).
  Corney is both the test board and the only one the router has seen.
- 📐 **The custom router was built after tscircuit's results were known, and tuned on the test
  board.** Stories 8–10 followed stories 6–7. The rip-up's `crossCost` was chosen on wired
  Corney: 3 mm gave 333, against 331, 332 and 332 for the other values tried (README story 9).
  tscircuit was adapted to the input but not tuned. So the custom router's 100% is a fit to
  Corney, not yet a measure of how it generalises.
- 📐 **The bar does not weigh the cost of owning a router.** Picking the custom router means
  keeb-cad maintains a grid A* router with rip-up (clipper2-ts + flatbush) and its bugs, where
  tscircuit would have been an upstream dependency. The bar fixed on 2026-10-26 grades only
  results, so this verdict does not grade that cost either. It is raised here for the sign-off.
- KiCad's 199 limit makes its `copper_edge_clearance` added count uncertain on wired. `drc`,
  which is not capped, confirms none was added (above).

## Change list for `bmad-architecture`

### AD-12 (l. 277, Routing: incremental, browser-only, saved in the routing section)

1. Rule, "Any engine sits behind this one stage interface and runs in a Web Worker in the
   browser": name the engine.
   - M1's engine is keeb-cad's own keyboard router: a two-layer grid A* with rip-up and reroute,
     on clipper2-ts and flatbush, written in TypeScript with no Node or DOM APIs.
   - The interface stays engine-neutral. tscircuit capacity-autorouter is rejected (routing
     verdict 2026-10-28).
2. Rule, "passing valid routes as fixed obstacles": add that a fixed route cannot be crossed,
   moved or ripped up. Same-net fixed copper does not block, and another net's does, at the same
   clearance as the router's own copper. The engine returns copper only for the connection ids
   it is asked to route.
3. Rule, "drops invalid routes and requests routing for unrouted connections": add that the
   saved routes made invalid by a move (those `drc` flags against the moved parts) are routed
   again in the same request as the moved part's connections. The spike shows this on one move,
   rerouting 7 / 9 on wired and 2 / 2 on wireless.
4. New rule: the engine takes a deadline. It is checked between connections, and past it
   the engine returns what it placed and reports the rest as unrouted, never a hang. Evidence: `timedOut` in
   `spikes/src/custom-router.ts` and the 50 ms cap test in `e2e/corney-cap.spec.ts`.
5. Rule, "Unrouted connections are `unrouted` violations": keep it. Add that a connection whose
   saved route was dropped as invalid, and which did not route again, is `unrouted` like any
   other. In the spike it showed only in a run note.
6. Rule, **Fallback**: keep it. Record that the routing verdict graded the engine pass with
   fallback, so the per-connection fallback is live in M1. The whole-board SM-3 fallback is not
   triggered.
7. Deferred, the "Routing spike (scheduled first)" row: remove it, because this verdict answers
   it. Its "Freerouting via CheerpJ" candidate is stale too, since the epic dropped it on
   2026-10-26. Add these rows in its place:
   - The two wired connections unrouted after the move, and the reroute tested on more moves and
     boards (revisit: epic-routing-and-fab, 2.13).
   - Memory measured with typed arrays, and a memory budget, which the bar does not set.
8. Deferred, the `split-mirrored` and `unibody` implementation row (l. 527): drop its "or at the
   routing verdict if reversible Corney doesn't route in the browser (epic-risk-spikes story 13)"
   trigger, because this verdict found that reversible Corney routes in the browser. "When a
   reference board is chosen" stays.

### AD-14 (l. 304, The netlist and connections are owned by `model`)

1. Rule, "The exact split rule is fixed at the routing spike": replace it with the fixed rule.
   - Sort a net's pad ids in natural order, and connect each pad to the next (n − 1 connections,
     none for fewer than two pads).
   - Natural order compares digit runs as numbers (`D2` < `D10`) and every other run by code
     unit, locale-free. Two digit runs equal in value but spelled differently (`01`, `1`) are
     decided right there, by code unit (`"01"` < `"1"`), and later runs are not looked at, so
     `a01b` < `a1a` (SPLIT-RULE.md, "Natural order").
   - Connection id = `<net-id>:<padA>~<padB>`, with padA before padB in natural order.
   - Pad ids carry the copper side (`F`, `B`, `TH`), plus a file-order copy suffix for
     repeats. Reversible F/B copies are distinct pads, joined by visible connections and never
     assumed connected.
   - Pads with no number or no net are obstacles. No id contains a position. A star topology is
     rejected.

   Cite `spikes/SPLIT-RULE.md`. Its rule carries over to `<side>/<slot>.<component>.<pin>`
   unchanged.
2. Rule: add that each connection carries how it is realised (`fixed-copper`, `key-cell`,
   `routing`), the only place positions are used. This matches AD-12's first bullet. Only
   `routing` connections go to the engine.

### AD-20 (l. 389, One DRC, one set of design rules)

1. Rule: add the clearance policy (R7). Engines route at the strictest net-class clearance, and
   `drc` checks each net class's own width and clearance and reports violations per net class.
   No clearance is loosened to make an engine route (C6).
2. Rule, `design-rules`: add a **hole-to-hole (drill-to-drill) clearance**, which applies to vias
   of the same net as well as different nets. Add it to `drc` and to the router's field.
   - Evidence: the custom router stacks same-net vias, because same-net copper never blocks and
     `RoutingInput` has no via-to-via drill rule. KiCad warns `hole_to_hole` 45 and
     `holes_co_located` 27 on wired, and `hole_to_hole` 2 on wireless (deferred-work, story 9
     entry). tscircuit's boards get them too (wired `hole_to_hole` 16, `holes_co_located` 69).
   - Co-located holes are a fab defect, although KiCad reports them as warnings. This answers the
     deferred-work item.
   - ☝️ Two things are left to the architect, not decided here. The spike measured no value for
     the clearance. The severity is open too: `error`, which would gate gerber export under
     AD-15, or `warning`.
3. Rule, "`drc` is the only implementation of the check": add that KiCad is a cross-check only.
   KiCad 10.0.7 stops some types at 199, and it reports nothing for crossing traces of different
   nets.

## Follow-ups

**epic-routing-and-fab** (pinned to this story, 2.13):

- Route `ULED_1:LED22.2.F~LED23.4.B` and `ULED_1:LED23.4.B~LED23.4.F` after the wired move, or
  show why they cannot route (a requirement, per the user's Decision of 2026-10-28).
- Add the hole-to-hole rule to the router's field and to `drc` (AD-20 item 2).
- Test the reroute on more than one key, delta and run, and route at least one board the router
  was not tuned on.
- Measure memory with typed arrays.

**epic-parts-and-pcb:** the bare wired fixture already has errors. `drc` counts 216 edge-clearance errors, of which KiCad
reports 199 `copper_edge_clearance`, its report limit: each SK6812mini-e LED pad sits 0.21 mm from its own
footprint's cutout, under the 0.30 mm rule. There are also 4 `invalid_outline`, where the front
and back LED cutouts overlap (README "Case results"). The routing grade does not depend on them
(Decision 1), but the board will not pass AD-15's export gate until the footprint or the rule is
settled.

## Decision line for the epic's Notes

> - Decision (2026-10-28, routing verdict, stories 5–10): the custom keyboard router is M1's routing engine, graded pass with fallback; tscircuit capacity-autorouter is graded fail; the tie-break was not needed and the SM-3 fallback is not triggered. The custom router routes reversible Corney in full in a Web Worker, wired 333/333 in 13.2 s and wireless 152/152 in 2.7 s, with `drc` and KiCad errors added 0. After a single-key move it reroutes the key in full (19/19, 9/9), leaves every valid saved route unchanged, reroutes the invalid ones and adds no copper to the module zone. Wired is 331/333 after the move (two `ULED_1` connections unrouted), which sets the tier, and those two become an epic-routing-and-fab requirement. tscircuit adds 3418/950 (wired) and 250/240 (wireless) `drc`/KiCad errors, fails the wired reroute under both methods and takes 244.3 s on wired. The split rule is fixed as `spikes/SPLIT-RULE.md` (natural-order chain, `<net>:<padA>~<padB>`). The clearance policy is shown, and AD-20 gains a hole-to-hole rule. Split-reversible stays the M1 form, since reversible Corney routes in the browser. Limits: one run, one move, only Corney, a router tuned on its test board, and the cost of owning a router not weighed. AD-12, AD-14 and AD-20 changes go to `bmad-architecture` (`routing-verdict.md`). Signed off by the user on 2026-10-28.
