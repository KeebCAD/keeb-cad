---
title: 'Rubric review: 2026-10-28 update (geometry verdict)'
reviewer: rubric-walker
date: '2026-10-28'
target: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
scope: 'uncommitted diff of 2026-10-28: AD-16, AD-18, Violations, Stack, Deferred, sources'
inputs:
  - _bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/geometry-verdict.md (AD-16 change list 1-7)
  - _bmad-output/architecture-keeb-cad-layout-model/.memlog.md (decisions 2026-10-28: shape offset stays makerjs; plate hole loops with guard)
---

# Rubric review: 2026-10-28 update

**Verdict: pass with fixes.** All seven items of the change list and both user decisions landed,
and the numbers match the verdict exactly (1e-6 mm / 1e-6 rad merge, 0.005 mm flatten, the chord
formula, 0.001 mm arc tolerance). Two divergence points are still open for the level below:
how Corney's case walls are encoded (they are Ergogen `expand` + `fillet` outlines), and which
package performs the plate subtraction and its guard. Four smaller enforceability gaps follow.

## Reconciliation against the verdict's change list

| # | Verdict item | In the spine | Status |
| --- | --- | --- | --- |
| 1 | Collinear merge after every boolean: shared end within 1e-6 mm, same direction within 1e-6 rad, never drops or invents a segment | AD-16 Rule bullet 4, word for word | Landed |
| 2 | Closed-chain check after each boolean; `shape-boolean-failed` names the shape and operands; shape never output. Caveat: only the two-shared-edge #377 case is tested | AD-16 bullet 5; Violations row adds the kind (error, ids, dependents not output). Caveat moved to the new Deferred row | Landed |
| 3 | Resolved type stays exact paths; a circle left whole stays one circle path; flatten takes full circles | AD-16 bullet 3 and flatten bullet ("a full circle becomes its own loop") | Landed |
| 4 | One flatten, tol 0.005 mm max chord deviation, chord formula, run after the merge; closes the Deferred "Flatten tolerance value" row | AD-16 flatten bullet: `ceil(\|sweep\| / (2·acos(1 − tol/r)))`, "on merged paths". Deferred row removed | Landed (see M1 on the `tol` parameter) |
| 5 | Offsets not by makerjs `model.outline`; flatten then clipper2 `inflatePathsD`, **round joins**, arc tolerance 0.001 mm; cross-ref AD-18 | Split per user decision 2026-10-28: **shape** `offset` stays makerjs `model.outline` on merged paths (AD-16); **case** `offset` uses clipper2 `inflatePathsD`, arc tol 0.001 mm, in `case`, never makerjs (AD-18). Joins: "follow the operation's corner style", not "round" | Landed differently, authorised for the shape/case split. The joins change (round → corner style) is **not logged** in `.memlog.md`. It is the better rule (Corney uses pointed joints, see H1), but it is an unrecorded deviation from a signed-off verdict |
| 6 | A cutout wholly inside the plate is a hole loop with no boolean; only crossing cutouts are subtracted; pending the plates epic's measurement | AD-16 plate bullet, with the user's guard ("strictly inside … touches no other cutout"). #477 measurement in the new Deferred row | Landed, with the logged guard. "Wholly" became "strictly" (see H2) |
| 7 | Remove the "Geometry spike" Deferred row; record arc-on-arc, #377 single-edge/partial-overlap, #477 at plate scale for epic-shapes-and-plates | Row removed; new row lists all three with epic-shapes-and-plates as the revisit point | Landed (see L2) |
| — | Latency note: set the live target on the max, move the evaluator off the main thread if it misses | Deferred "Live latency target" row amended with the numbers and the off-main-thread fallback | Landed |
| — | User decision: shape offset stays makerjs after merge, ~70 ms, M1 outlines use none | AD-16 offset bullet; new Deferred row "Shape `offset` latency" | Landed (see H1: the "no M1 outline" premise is narrower than it reads) |
| — | User decision: hole loops with a guard | AD-16 plate bullet; Prevents gains "overlapping hole loops" | Landed |
| — | Stack: clipper2-ts 2.0.1-18, BSL-1.0, verified 2026-10-28 | Stack row and verified-date line; source added to frontmatter | Landed (see L1) |

Nothing from the change list is missing. No number differs from the verdict.

## Findings

### H1. Corney's case walls are Ergogen `expand` + `fillet` outlines; the spine does not fix whether they become shape offsets or case offsets, nor what a case offset's corner style means

Evidence: `layout-model/sources/corney-island.yaml` lines 579-596. `_bottom_case_outer_outline`,
`_bottom_case_inner_outline` and `_bottom_case_superlight_inner_outline` are each
`outline _backplate_outline`, `expand: <expr>`, `fillet: 0.5`, `joints: 1`.

- The new Deferred row says "No M1 outline (Corney, LambBT) uses a shape offset". That holds for
  the board edge only. Corney's case needs three offsets of `_backplate_outline`, the very outline
  the verdict's #387 table says "gives no loop" under `model.outline` when unmerged.
- The spine now has two offset paths: a shape `offset` (glossary: corner style, fillet; makerjs,
  live, ~70 ms each) and a case `offset` (clipper2, background). Nothing says which one the `tray`
  template and the Corney fixtures use for walls. A template author who mirrors Ergogen writes
  three shape offsets: about 210 ms per live resolve, on the #387-prone outline. A case author
  writes case offsets. Both read as compliant.
- Case `offset`: "joins follow the operation's corner style". The glossary gives a corner style
  and a fillet only to the **shape** offset; AD-18 never says a case offset has either. Corney
  needs pointed joins (`joints: 1`) then a 0.5 mm fillet. clipper2 has no fillet, and a miter join
  needs a miter limit. Two implementers will map "pointed + fillet 0.5" differently, and a round
  join at 1.45 mm against pointed + 0.5 fillet differs by about 0.4 mm at a right-angle corner,
  far outside the ±0.05 mm case acceptance.
- ☝️ The verdict's item 5 said "round joins". The spine silently and correctly changed it. Log it.

Fix: state in AD-18 (or the template rule) that case walls are case `offset` operations, never
shape offsets; give the case offset a corner style (round, miter with a fixed limit, bevel) and a
fillet radius, and say how the fillet is done on a polygon (for example an inset-then-outset by
the fillet radius with round joins, in clipper2). Narrow the Deferred row to "no M1 board outline
or plate uses a shape offset", or verify that is true for plates too.

### H2. The plate subtraction has no owning package, and "strictly inside" has no tolerance

- AD-16 says `model.resolve` is the single shape evaluator and "No stage re-evaluates a shape",
  and the merge, closed-chain check and `shape-boolean-failed` all belong to `model`. The plate
  bullet ("a plate is its shape minus the part cutouts…") does not say where it runs. The Seed
  has `plates/ # stage: plate geometry`, and the memlog decision binds "model, plates". If
  `plates` performs `combineSubtraction`, it imports makerjs, its booleans are unmerged and
  unchecked, and it cannot report `shape-boolean-failed` ("a stage reports only its own kinds").
  If `model` does it, `plates` is only a writer of resolved loops. Both readings are open.
- "Strictly inside the plate shape and touches no other cutout" decides between two code paths
  with different outputs (hole loop vs boolean result). It needs a test and a tolerance:
  on exact paths or flattened, with what clearance (a cutout 1e-7 mm from the edge, the size of
  makerjs's own rounding, is "strictly inside" by one reading and touching by another).
- Touching cutouts go through `combineSubtraction`. Two cutouts sharing an edge are the #377
  shape, so the guard's fallback path is the one that hits the known failure. The closed-chain
  check covers the tested form only (already in Deferred), which is acceptable if stated.

Fix: one bullet: "`model.resolve` resolves each plate (hole loops and subtractions); `plates`
receives exact paths and never calls makerjs." And give the containment test (exact paths,
clearance > 1e-6 mm, the merge tolerance).

### M1. `flatten(paths, tol)` takes the tolerance as an argument

The rule fixes tol = 0.005 mm but the exported signature lets each stage pass its own. That is the
divergence the old Deferred row existed to close. Export the constant and a `flatten(paths)` that
uses it (or make `tol` default and forbid other values in stages). Edge cases the formula leaves
to the implementer: `r ≤ tol/2` makes `acos` undefined, and a full circle needs at least 3 chords.
State a floor (n ≥ 1 per arc, ≥ 3 per circle).

### M2. No import boundary for the two geometry libraries

AD-10 enforces "only `viewer3d` imports three.js" by dependency-cruiser, but nothing says only
`model` imports makerjs or only `case` imports clipper2-ts. The Stack note "case offsets only"
is not a rule. Without it, `plates`, `pcb` or `exports` can re-evaluate a shape or offset a
polygon locally, which is exactly what AD-16 prevents. Add both to AD-10's import bullet so CI
enforces them.

### M3. Shape offset results are not checked

#387's failure mode was six small **closed** loops and no outer loop: the closed-chain check
(which runs "after every boolean") would not catch it, and the rule does not apply it to
`model.outline` anyway. The merge-first workaround is shown on one Corney outline. 📐 The user's
decision to keep makerjs for shape offset is sound for exact arcs, but its residual correctness
risk (not only latency) is not recorded. Add a post-offset check (one outer loop per input loop,
area grew for a positive offset) reporting `shape-boolean-failed` or a sibling kind, or add the
risk to the Deferred row.

### L1. clipper2-ts 2.0.1-18 is a semver prerelease that sorts below the stable 2.0.1

`npm view` (2026-10-28): dist-tag `latest` = 2.0.1-18 (2026-07-04); stable 2.0.1 published
2025-12-21; BSL-1.0; repository `countertype/clipper2-ts`, a community TypeScript port.
The pin is current per the dist-tag and matches the spikes, so it passes "verified-current". But
semver orders 2.0.1-18 before 2.0.1, so a caret range or a `pnpm update` can move it to the older
stable build. Pin exactly and say so in the row, or pick 2.0.1 and re-run the spike tests.

### L2. The new Deferred row loses the "reopens AD-16" consequence

The removed row said "Failure reopens AD-16". The new one says "If one fails, compare against
clipper2 there". Changing the evaluator, or the resolved type, inside epic-shapes-and-plates
would let one epic diverge from AD-16. Add "a failure reopens AD-16".

### L3. Terseness and glossary

- Rationale has crept into Rules: "(makerjs #377, coincident edges)", "(makerjs #387 breaks on
  split edges)". Short, but they are reasons, not decisions; they belong in the memlog.
- New terms used as rules but not in the Glossary: "hole loop", "merged paths", "flatten".
- "offset" now has three meanings: the glossary placement offset (x, y, rotation), the shape
  `offset` operation and the case `offset` operation. Pre-existing, but this update makes the
  two operations behave differently, which raises the cost of the collision (see H1).
- Otherwise the update is terse: one bullet per decision, numbers stated once.

## Checklist summary

| Criterion | Result |
| --- | --- |
| Fixes the real divergence points, misses none | Mostly. Misses case-wall encoding and case corner style (H1) and the plate evaluator's owner (H2) |
| Every Rule enforceable and prevents its divergence | Merge, check, flatten formula, case offset library: yes. `tol` parameter (M1), library import boundaries (M2), unchecked shape offset (M3): gaps |
| Nothing under Deferred lets two units diverge | The untested-booleans row should reopen AD-16 on failure (L2); the shape-offset-latency row rests on a premise that is narrower than stated (H1) |
| Named tech verified-current | clipper2-ts verified on npm 2026-10-28; prerelease ordering caveat (L1). makerjs unchanged |
| Covers every verdict item | Yes, 1-7 plus the latency note; item 5's joins changed without a log entry |
| Terse | Yes, minor rationale in two bullets (L3) |
