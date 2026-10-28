---
title: 'Routing verdict signed off'
type: 'chore'
ticket: '13'
created: '2026-10-28'
status: done
baseline_revision: 'f5b9444ff60d6140929bfef6868536a7c2a735fd'
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

**Problem:** Stories 6, 7, 9 and 10 filled four scorecards, but nobody has graded them against the bar fixed on 2026-10-26. No engine is named, the SM-3 fallback is neither triggered nor ruled out, and AD-12, AD-14 and AD-20 still wait on the spike (R2, R3, R4, R7, R8).

**Approach:** Grade tscircuit and the custom router per board and per bar criterion from the committed scorecards and the README results, apply the tie-break only if both engines land in the same tier, and write `routing-verdict.md` in the epic folder. The verdict names the engine or triggers SM-3, settles the split-reversible revisit, lists the AD-12, AD-14 and AD-20 changes for `bmad-architecture`, and drafts the dated Decision line for the user to sign off.

## Boundaries & Constraints

**Always:**
- The bar and tie-break are the epic's Decisions of 2026-10-26, word for word. Each engine is graded per criterion (completion, DRC, single-key reroute, time) for wired and wireless, and its tier is the lower of its two boards'.
- Decision (2026-10-28, user): "zero KiCad DRC errors" means zero errors **added** over the bare board, as stories 5–10 measured. The verdict records that the bare wired fixture already has 216 `drc` / 199 KiCad `copper_edge_clearance` errors (LED pads 0.21 mm from their own cutouts, rule 0.30 mm) and 4 `invalid_outline`, as a follow-up for epic-parts-and-pcb.
- Decision (2026-10-28, user): "leaves the other saved routes unchanged" covers **valid** saved routes only (AD-12). Saved routes that clash with the moved key are invalid, and rerouting them complies.
- Decision (2026-10-28, user): completeness after the move counts. Wired after the move is 331/333 (two rerouted clashing connections unrouted), so the custom router's wired tier, and so its overall tier, is **pass with fallback**. The two connections become an epic-routing-and-fab requirement.
- Every number in the verdict comes from `spikes/scorecards/*.scorecard.json` or `spikes/README.md`, cited by section. KiCad counts are graded with their severity: KiCad 10.0.7 reports `hole_to_hole` and `holes_co_located` as warnings and `copper_edge_clearance` and `invalid_outline` as errors (checked 2026-10-28 on a re-run of `score:custom`, with the same routes and counts as the committed cards).
- The verdict states what the evidence does not cover: one run, one moved key and one delta, the heap figure without typed arrays, only Corney tested, the custom router built after tscircuit's results were known, and that the bar does not weigh the cost of owning a router.
- The verdict states the split rule as fixed (`spikes/SPLIT-RULE.md`, R4) and the clearance policy as shown (R7).
- The verdict answers the initiative's split-reversible revisit (Decision 2026-10-26, item 4) from the evidence.
- The verdict follows `geometry-verdict.md`'s layout: frontmatter, verdict up front, per-criterion tables, limits of the evidence, change list per AD, and a draft Decision line.

**Never:**
- No edits to the epic, ticket or initiative files, or to the architecture document. The user records the sign-off, and the AD changes are only listed.
- No code changes, and no regenerated scorecards. No tuning, no re-grading after the fact, and no bar loosened (C6).
- Do not read story 10's `savedRoutes.changed` as a routing result (README, story 10).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| One engine passes or passes with fallback, the other fails | Graded tiers differ | Higher tier named, no tie-break | — |
| Same tier | Both engines in one tier | Tie-break applied in order and shown | — |
| Both fail | No engine reaches pass with fallback | SM-3 fallback triggered, AD-12 change says so | — |
| Bar silent on a case | A fact the bar did not foresee | Graded only by a user Decision above; any new one is raised, not graded | Never decided by the implementer |

</frozen-after-approval>

## Code Map

- `_bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/epic-risk-spikes.md` -- bar, tie-break, timeboxes, the dropped-lane rule, the split-reversible revisit, the 2.13 pin for epic-routing-and-fab. Read only.
- `spikes/scorecards/{tscircuit,custom}-{wired,wireless}.scorecard.json` -- every graded number. tscircuit: wired 330/333, `drc` +3418, KiCad +950, 244.3 s, 790.9 MiB; wireless 144/152, +250, +240, 26.5 s; reroute wired failed under both methods, wireless 9/9 but 36 saved changed (preloaded) or 6/9 (rect). Custom: 333/333 and 152/152, `drc` +0, KiCad +0, 13.2 s and 2.7 s, 96.4 and 27.5 MiB; reroute moved 19/19 and 9/9, conflicts 9 and 2, `drc` +0, fixed copper 0.
- `spikes/README.md` -- story 5 "Case results" (the added-over-baseline rule, KiCad's 199 limit, the blind spot), story 6 "What tscircuit cannot take" (per-class clearance and width), the story 7 and 10 results, and story 9's notes on time drift and the heap's missing ~120 MiB.
- `spikes/SPLIT-RULE.md` -- the split rule and id grammar for the AD-14 change.
- `_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md` -- AD-12 (l. 277), AD-14 (l. 304), AD-20 (l. 389), and the Deferred rows "Routing spike" and `split-mirrored`. The change list cites these rules.
- `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- lines 5–10: the hole-to-hole rule (fab defect, for AD-20) and story 7's reroute baseline blind spot. The verdict answers both.
- `_bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/geometry-verdict.md` -- the format to copy.

## Tasks & Acceptance

**Execution:**
- [x] `_bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/routing-verdict.md` -- write the verdict: the engine and tier up front, a per-criterion table per engine and board, the tie-break (or why it is not needed), the reroute comparison, the R4 split rule, the R7 clearance policy and its tscircuit limits, the split-reversible answer, limits of the evidence, the AD-12, AD-14 and AD-20 change list (including the hole-to-hole rule and the Deferred-row updates), the follow-ups for epic-routing-and-fab, and a draft Decision line.

**Acceptance Criteria:**
- Given the verdict, when each number in it is checked against the scorecards and README, then each one matches.
- Given the verdict, when it is read, then it names one engine with its tier or triggers SM-3, and shows each engine's grade per criterion and board.
- Given the verdict, when the change list is read, then each item names its AD and the rule text it changes.

## Implementation Notes

- Severity check before planning: a re-run of `score:custom` reproduced the committed routes and counts, its KiCad reports gave `hole_to_hole` and `holes_co_located` as warnings, and the scorecards were restored with `git checkout`.
- The verdict's evidence paragraph first said nothing was re-run, which contradicted its grading section. Corrected to name the one re-run.

## Plan Change Log

## Review Triage Log

### Pass 1 (quick): high 0, medium 1, low 6, false 1, maybe-false 0. 7 patched, 1 rejected.

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | AD-14 natural-order text says "decides at the first unequal run", contradicting SPLIT-RULE.md's `01`/`1` tie-break | medium | patch | Confirmed against SPLIT-RULE.md "Natural order"; the architect would receive a different rule. Restated. |
| 2 | AD-12 item 4 "Rule, on the cap" names rule text AD-12 lacks | low | patch | Confirmed: AD-12 has no cap rule. Marked as a new bullet. |
| 3 | `split-mirrored` Deferred row update missing from the change list | low | patch | Confirmed: only in the split-reversible section; the plan's task asks for the Deferred-row updates. Added. |
| 4 | "tscircuit gets 0.20 mm in every SRJ clearance field" | low | patch | Confirmed: README story 6 adapter table maps edge to 0.30 and hole to 0.25. Corrected. |
| 5 | Re-run and severity check not recorded in scorecards or README | false | reject | The plan's frozen Always block records the check (2026-10-28 re-run, same routes and counts), so it is a sourced fact. |
| 6 | Frontmatter `stories` and the Decision line disagree, omitting 5 and 8 | low | patch | Confirmed. Both now 5–10. |
| 7 | epic-parts-and-pcb follow-up presents KiCad's 199 as a real count | low | patch | Confirmed: README calls 199 KiCad's limit. Now 216 by `drc`, 199 reported by KiCad. |
| 8 | C6 cited for the no re-run rule | low | patch | Confirmed: C6 is about clearances and unrouted connections; the rule is the plan's Never list. Citation fixed. |

## Verification

**Manual checks:**
- Each number in the verdict matches `jq` output on the four scorecards.
- `git status` shows only the verdict and this plan changed.
