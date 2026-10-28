---
title: 'Reviewer lens: verify (update 2026-10-28)'
target: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
scope: 'uncommitted 2026-10-28 diff: AD-16 rules, AD-18 case offset bullet, violation kind shape-boolean-failed, Stack row clipper2-ts 2.0.1-18, Deferred rows'
date: '2026-10-28'
lens: 'verify: every committed decision is web-researched or reality-checked, not asserted from training data'
---

# Verify lens: 2026-10-28 update

**Verdict: pass with changes.** Most of the update rests on real evidence. The spike tests ran
again today and passed: `vitest run src/circle-cut.test.ts src/outline.test.ts` gave 31 / 31.
npm, the installed package and GitHub confirm the clipper2-ts facts. Four things are asserted
rather than checked, and one of them is a real trap:

- the prerelease-vs-stable version ordering of clipper2-ts (F1);
- the clipper2 parameters that the spine leaves out (F2);
- the claim that M1 needs no shape offset, which Corney's own case outlines contradict (F3);
- the hole-loop rule for plates, which no spike tested (F4).

## What was checked and how

| Claim in the diff | How it was checked | Result |
|---|---|---|
| clipper2-ts 2.0.1-18 is the npm `latest` (2026-07-04); a stable 2.0.1 exists (2025-12-21) | `npm view clipper2-ts --json` | Confirmed. dist-tags `{latest: 2.0.1-18}`. 2.0.1 was published 2025-12-21T06:07, then 2.0.1-1 … 2.0.1-18 up to 2026-07-04. No `next` tag |
| BSL-1.0 | npm `license` field, the installed `package.json` | Confirmed. Repo: github.com/countertype/clipper2-ts |
| `inflatePathsD`, `JoinType`, arc tolerance exist | Installed `dist/Clipper.d.ts:32`, `dist/Offset.d.ts` | Confirmed: `inflatePathsD(paths: PathsD, delta, joinType: JoinType, endType: EndType, miterLimit = 2, precision = 2, arcTolerance = 0): PathsD`. `JoinType {Miter, Square, Bevel, Round}`. `EndType {Polygon, Joined, Butt, Square, Round}`. The arc tolerance is the **7th positional** argument, after `miterLimit` and `precision` (see F2) |
| Arc tolerance 0.001 mm takes effect | `dist/Clipper.js:111–119`, `dist/Offset.js:374` | Confirmed only for precision ≥ 2. The value is scaled by `10^precision`, and the offsetter ignores any scaled value ≤ 0.01 (it falls back to `|delta|·0.002`). At precision 6 (as in the spike) it is 1000 scaled units, so it is used |
| clipper2-ts maintenance | `gh api repos/countertype/clipper2-ts`, CHANGELOG | Not archived. Last push 2026-07-04 (4 months ago), 42 stars, 5 open issues, one maintainer (bus factor 1). The changelog says 2.0.1 tracks Clipper2 v2.0.1 (21ebba0). The -N builds are post-2.0.1 fixes and performance work |
| makerjs 0.19.2 still current | `npm view makerjs` | Confirmed: `latest` 0.19.2 (2026-01-27), Apache-2.0. The upstream repo gets only dependency bumps (last 2026-10-27). The issues below are all still open |
| makerjs #377 (coincident-edge subtraction) | GitHub issue | Open since 2018-11. The maintainer agrees it is a bug and that `combineUnion` handles the case but `combineSubtraction` does not. The upstream workaround is a larger cutter, which matches the spike. This closes the verdict's ☝️ "not checked against upstream" for #377 |
| makerjs #387 | `gh api …/issues/387` | Open since 2018-12: "Having a hard time expanding complex shapes". It reports slowness and a `valueIds of undefined` crash in `model.outline`, and the maintainer intends a new algorithm. The spike's diagnosis (collinear splits) is **our own finding**, not upstream's. The spine states it as fact ("#387 breaks on split edges") without saying that. The spike reproduces it, so it is reality-checked, but it may be only one of several failure modes |
| makerjs #477 | GitHub | Open: the maintainer calls `combineUnion` "brute force naïve O-squared". Confirms the verdict |
| makerjs #509 | GitHub | Open, labelled bug, no maintainer reply. The spike did not reproduce it. The spine relies on the closed-chain check, which is reasonable |
| Whole circle stays one circle path; collinear merge 1e-6 mm / 1e-6 rad; flatten 0.005 mm with `ceil(|sweep|/(2·acos(1−tol/r)))`; full circle is its own loop | `spikes/src/flatten.ts` (`COLLINEAR_DISTANCE`, `COLLINEAR_ANGLE`, `chordCount` with a `max(-1, …)` guard), the tests run today | Confirmed, the numbers match the code |
| `model.outline` after the merge is correct within 0.005 mm, ~70 ms | `circle-cut.test.ts`, verdict latency table | Reality-checked in Node on one machine (verdict Limits) |

## Findings

### F1 (high): pin clipper2-ts as the exact string `2.0.1-18`, and say why in the spine

In semver a prerelease sorts **before** its release: `2.0.1 > 2.0.1-18`. Checked with
`semver`:

- `satisfies('2.0.1', '^2.0.1-18')` → `true`
- `maxSatisfying(['2.0.1','2.0.1-18'], '^2.0.1-18')` → `2.0.1`

So any range (`^2.0.1-18`, `~2.0.1-18`, `>=2.0.1-18`) resolves to the **older** stable 2.0.1 on
the next install or lockfile refresh. Renovate or Dependabot will also offer 2.0.1 as an
"upgrade". The stable 2.0.1 lacks fixes this spine depends on:

- **-2:** "Fixed crash in `inflatePathsD` when given a zero-area ring". AD-18 uses exactly that function.
- **-15:** "`ClipperD`: `addPath` no longer applies scaling twice". This is a precision fix.
- -13: a sliver-triangle union bug.
- -4 rolled back the BigInt precision work of -3, and -5 added it again in another form. The precision behaviour moved around inside the -N series.

**Which to pin:** `2.0.1-18`, exactly, with no range prefix. It is the code the spikes tested,
and it carries the offset fixes. The Stack row already shows `2.0.1-18` without a caret, but the
spine has no rule that says the pin must be exact, and other rows use `^`/`~`. Add the reason to
the row, for example: "exact; semver orders the 2.0.1-N fixes below 2.0.1, so a range resolves
to the older stable". Add a Renovate ignore or an `allowedVersions` entry when the repo gets one.
Also note the bus factor of 1 and the 4 months without a push. Low risk, because the use sits
behind `case`.

📐 The maintainer's `-N` suffix is used as a post-release build counter, against semver. The
changelog does not define it, so that reading is inferred. A future `2.0.2` (or `2.0.2-1`)
would sort correctly. The trap exists only between `2.0.1` and `2.0.1-N`.

### F2 (medium): AD-18 names the arc tolerance but not the precision, end type or miter limit

The spike calls `inflatePathsD(loops, d, JoinType.Round, EndType.Polygon, 2, 6, 0.001)`
(`circle-cut.test.ts:526`, `CLIPPER_PRECISION = 6`). The spine fixes only "arc tolerance
0.001 mm". With the library defaults:

- **precision = 2** rounds every coordinate to 0.01 mm. That is ±0.005 mm of quantisation, the
  whole flatten budget again.
- The arc tolerance only works because it is still more than 0.01 after scaling by 100.
- `miterLimit = 2` squares off every miter sharper than about 60°.
- `EndType` must be `Polygon` for closed loops. Any other end type treats the loop as an open
  path and gives the wrong result.

Recommend adding to the AD-18 bullet: "precision 6 (1e-6 mm), `EndType.Polygon`, miter limit
N". AD-16 already does this kind of thing for the flatten tolerance. The router spike uses
precision 4 and arc tolerance 0.002 (`custom-router.ts:82`), so two different settings already
exist in the evidence. That makes it more important to fix one value.

### F3 (medium): "No M1 outline uses a shape offset" depends on unstated modelling, and Corney's case uses pointed joins plus a fillet that no spike tested

The Deferred row and the memlog say that Corney and LambBT need no shape offset. That holds for
the PCB outline. But Corney's `corney-island.yaml:579–596` defines three **shapes** with
`expand`, all of `_backplate_outline`:

- `_bottom_case_outer_outline`
- `_bottom_case_inner_outline`
- `_bottom_case_superlight_inner_outline` (commented out)

Each has `fillet: 0.5` and `joints: 1`. `_bottom_case_walls` (outer − inner) is a shape
subtraction. `reconcile-layout-model.md` §1.3 maps these to **FR-6 shape offset with corner
style + fillet**. The spike found that `_backplate_outline` is exactly the outline whose split
makes `model.outline` return *no loop* (#387).

So one of these two must be stated:

- **(a)** The `tray` template expresses these as case `offset` operations. Then the spine should
  say so. And AD-18's case offset must also carry the **fillet 0.5**: clipper2 has no fillet,
  and "joins follow the operation's corner style" does not cover one.
- **(b)** They stay shapes. Then M1 *does* pay the ~70 ms makerjs offset on Corney, and the
  Deferred row's premise is wrong.

The clipper2 offset was also checked only with **round** joins (`JoinType.Round`). Ergogen's
`joints: 1` is pointed, which is `JoinType.Miter` in clipper2. clipper2 caps it with
`miterLimit`, but makerjs does not, so the two can differ at sharp corners. A pointed-plus-fillet
case offset of Corney's `_backplate_outline`, against Ergogen's case output within ±0.05 mm
(SM-2), has not been run. Recommend that the tray-case epic carries that check.

### F4 (low–medium): the plate hole-loop rule is asserted, not spiked

"A cutout that lies strictly inside the plate shape and touches no other cutout is added as a
hole loop, with no boolean" comes from verdict item 6, the #477 mitigation. The verdict itself
marks it as pending ("Plates epic still measures a 50-key plate"). Nothing ran it. These were
not checked:

- how "strictly inside" and "touches no other cutout" are tested on exact paths (makerjs
  `measure.isPointInsideModel` plus `path.intersection`, or our own code), and at what tolerance;
- that a makerjs model with added hole loops chains, exports to DXF and flattens the same way as
  a `combineSubtraction` result.

The rule is plausible, but the spine adopts it as a rule. Either tag it "pending
epic-shapes-and-plates measurement" in AD-16, or move it to the Deferred row about makerjs
booleans, which already covers #477.

### F5 (low): smaller precision gaps

- "every chain of the result must close" has no chain tolerance. The spike's `chainLoops`
  (`fixtures/src/pcb-geometry`) has one. makerjs rounds intersections to about 1e-7 mm (verdict),
  so a tolerance tighter than that would report false `shape-boolean-failed`. State the value
  (it is probably the same 1e-6 mm as the merge).
- The case offset's arc tolerance (0.001) is applied to an input already flattened at 0.005. The
  error budget (0.005 + 0.001 + 10^-precision ≪ 0.05) is fine, but the spine does not show the
  sum. One clause would do.
- The Stack header says "2026-10-28 (clipper2-ts, npm)". makerjs 0.19.2 was also re-checked
  today (still `latest`). Adding it to the header costs nothing.

## Not a finding (checked, sound)

- clipper2 for case offsets only, makerjs for shape evaluation. The evidence (1.5 ms against
  71 ms, and #387) supports it, and BSL-1.0 is permissive.
- `shape-boolean-failed` as a `model`-owned error kind fits the Violations convention. The
  Deferred row honestly records that the check is blind to a closed but wrong result.
- The latency row is set on the max, with the 28.4 ms figure and its load caveat, as measured.
