---
title: 'Model posts group borders'
type: 'feature'
ticket: '26'
created: '2026-11-13'
status: 'built'
baseline_revision: 'edc03c5269361d249f5b33ba94f8fbab69521d68'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Layout canvas can't show which keys belong to a group: no posted output carries a group's border, and canvases compute no geometry (AD-10, AD-22). 13.32 draws borders and needs them posted.

**Approach:** `geometry` gains its polygon engine (clipper2-ts: grow each envelope with round joins, unite NonZero, read a PolyTree, normalise winding and order). `model` computes each placed non-root group's border per side from that side's rows, inside the `placements` computed, and `LayoutOutput` rows carry `border`, typed and validated in `schema` and packed by `protocol`'s codec as a variable-length column. dependency-cruiser fences clipper2-ts to `geometry`, `case` and `routing`.

## Boundaries & Constraints

**Always:**
- A group's border is the union of each placed slot in its subtree, its rectangle (fitted, stand-in, emptied alike) grown by `margin × levels`, levels counted along the ownership tree from the slot's own group up to this group, both counted (AD-16 Group borders). Unplaced slots never count.
- margin = max(1 mm, min(gap.x, gap.y)).
- Round joins, precision 6, arc tolerance `FLATTEN_TOL` (0.005 mm, world units), fill rule NonZero, read through a `PolyTreeD`.
- Outer loops counter-clockwise, holes clockwise (y up); a region is its outer loop then its holes; regions ordered by their outer loop's lowest-then-leftmost point, holes within a region by theirs; each loop starts at its own lowest-then-leftmost point and does not repeat it.
- Each side's borders come from that side's own rows (`left/…` from `left/…`).
- `border: []` for slots, the root, unplaced group rows, groups with no placed slots, and a border that fails; a failure reports no violation.
- Codec columns as the Data Schema names them: `rowLoops` Uint32 (rows + 1), `loopPoints` Uint32 (loops + 1, counted in points), `loopHole` Uint8, `points` Float64 (x y pairs).
- clipper2-ts at `2.0.1-18` exact, through the catalog.
- Decision (Sergii, 2026-11-13): every border is computed inside the existing `placements` computed by a pure `groupBorders`, not one computed per group nor a separate `borders` computed, because every border reads the whole `placements` output, replaced whole on any change, so per-group computeds save no recompute and add a keyed cache of computeds. The spine's AD-16 Group borders sentence is edited to match, on main.
- Decision (Sergii, 2026-11-13): the ticket's "a gap that fails to evaluate gives 1 mm" is left out, not tested through an `Option` input, because no path reaches a failed gap today (literal-only `parseExpression`, `placeLayout` throws first); `deferred-work.md` holds it for the story that evaluates expressions.

**Never:**
- No drawing, token or editor change (13.32).
- No overrides section or `empty` command (13.33); emptied slots are tested there.
- No new `ViolationKind`.
- No package but `geometry`, `case` and `routing` imports clipper2-ts; `model` reaches it only through `geometry`.

## I/O & Edge-Case Matrix

Boundary table (frozen as acceptance). Gap and margin in mm. Key = 18 × 18 mm slot. "Column" = a chain group whose keys sit directly in it; "parent" = the chain group holding two columns. Bounds = the loop's min/max x and y.

| # | Group | Scenario | Input / State | Expected | Level |
|---|-------|----------|---------------|----------|-------|
| 1 | rules | margin, gap just below the floor | gap 0.5, 0.5 | margin 1 | unit `model` |
| 2 | rules | margin, gap on the floor | gap 1, 1 | margin 1 | unit `model` |
| 3 | rules | margin, gap just above the floor | gap 1.5, 1.5 | margin 1.5 | unit `model` |
| 4 | rules | margin takes the smaller axis | gap x 2, y 1.5 | margin 1.5 | unit `model` |
| 5 | rules | margin, negative gap | gap −0.5, −0.5 | margin 1 | unit `model` |
| 6 | rules | a column's border sits one margin outside its keys | parent of two columns of two keys, margin 1 | each column: one region, no holes, bounds = its keys' bounds ± 1 | unit `model` |
| 7 | rules | the parent's border sits one margin outside the columns' | as row 6 | parent: bounds = all keys' bounds ± 2 | unit `model` |
| 8 | rules | a point just inside the column margin | as row 6; 0.5 out from a column key's outer edge midpoint | inside the column's outer loop and the parent's | unit `model` |
| 9 | rules | a point on the column margin | as row 6; 1 out | within `FLATTEN_TOL` of the column's outer loop; inside the parent's | unit `model` |
| 10 | rules | a point just beyond the column margin | as row 6; 1.5 out | outside the column's outer loop, inside the parent's | unit `model` |
| 11 | rules | the root posts none | as row 6 | `left/root`, `right/root` border `[]` | unit `model` |
| 12 | rules | an empty group posts none | a placed free group with no children | border `[]` | unit `model` |
| 13 | rules | slots post none | as row 6 | every slot row's border `[]` | unit `model` |
| 14 | rules | a free group of one key | key at the group origin, margin 1 | one region, no holes, bounds (−10, −10)–(10, 10) | unit `model` |
| 15 | rules | an unplaced group posts none | a group in an anchor cycle (a loaded file) | its rows' border `[]` | unit `model` |
| 16 | rules | levels count through an unplaced middle group | free group G ⊃ free group M whose anchor doesn't resolve (a loaded file) ⊃ key K explicitly anchored to a placed key outside M; margin 1 | M's rows `[]`; G's region around K has bounds K ± 2 | unit `model` |
| 17 | rules | an unplaced key never counts | a placed free group of one placed key and one key in an anchor cycle (a loaded file) | the border is row 14's around the placed key alone | unit `model` |
| 18 | rules | keys sitting apart give two regions | a free group of keys at x 0 and x 40, margin 1 | two regions, the x 0 one first | unit `model` |
| 19 | rules | the right side reads right rows | row 14's group placed at x 30 | `left/…` bounds (20, −10)–(40, 10); `right/…` bounds (−40, −10)–(−20, 10) | unit `model` |
| 20 | rules | a stand-in key counts | a key whose part doesn't resolve | bounds of its 18 × 18 stand-in ± margin | unit `model` |
| 21 | production bugs | a coordinate past clipper's safe range | a placed key at x 1e10 (a loaded file's offset) | its group's border `[]`, the key's row unchanged | unit `model` |
| 22 | rules | grow and unite: winding | one square (0,0)–(10,10), distance 1 | one region; outer's signed area > 0 | unit `geometry` |
| 23 | rules | grow and unite: a hole | eight 10 × 10 squares, a 3 × 3 block (0,0)–(30,30) without its centre, distance 1 | one region, one hole; hole's signed area < 0; hole bounds (11, 11)–(19, 19) | unit `geometry` |
| 24 | rules | grow and unite: region and loop order | squares at (40, 0) and (0, 0), distance 1, given in that order | the (0, 0) region first; each loop's first point is its lowest-then-leftmost, not repeated at the end | unit `geometry` |
| 25 | rules | grow and unite: hole order | 10 × 10 squares filling (0,0)–(50,30) except those at (30,10) and (10,10), given in that order, distance 1 | holes ordered (11, 11)–(19, 19) then (31, 11)–(39, 19) | unit `geometry` |
| 26 | rules | grow and unite: round joins | as row 22 | every vertex 1 ± 1e-6 from the square; every edge midpoint ≥ 1 − `FLATTEN_TOL` − 1e-6 from it (Sergii, 2026-11-13) | unit `geometry` |
| 27 | rules | grow and unite: nothing to grow | `[]` | some `[]` | unit `geometry` |
| 28 | rules | grow and unite: a NaN coordinate | one envelope with a NaN x | none | unit `geometry` |
| 28a | production bugs | grow and unite: just inside clipper's range | a 10 × 10 square at x 9e9, distance 1 | some, one region | unit `geometry` |
| 28b | production bugs | grow and unite: past clipper's range | the same square at x 1e10 | none | unit `geometry` |
| 28c | rules | normalise: winding, start and order | a CW outer starting mid-loop, a CCW hole, two regions and two holes out of order | outer CCW, holes CW, each loop from its lowest-then-leftmost point, regions and holes sorted by it | unit `geometry` |
| 29 | module boundaries | codec round trip with two regions and a hole | a group row whose border has two regions, one with a hole, beside slot rows with `[]` | `readLayoutRow` returns each row unchanged | unit `protocol` |
| 30 | module boundaries | codec, every border empty | two rows, both `[]` | `rowLoops` `[0, 0, 0]`, `loopPoints` `[0]`, `loopHole` and `points` empty; rows unchanged | unit `protocol` |
| 31 | module boundaries | codec, no rows | `aLayoutOutput()` | `rowLoops` `[0]`, `loopPoints` `[0]` | unit `protocol` |
| 32 | module boundaries | transfer lists the new columns | a packed output | `buffersOf` holds `rowLoops`, `loopPoints`, `loopHole` and `points` buffers | unit `protocol` |
| 33 | module boundaries | schema accepts a border | a row with a two-region border | `v.parse(layoutOutputSchema, …)` returns it | unit `schema` |
| 34 | module boundaries | dependency-cruiser allows the owners | probes in `geometry`, `case`, `routing` importing clipper2-ts | no violation | unit `tooling` |
| 35 | module boundaries | dependency-cruiser rejects another package | `violations/packages/plates/src/index.ts` imports clipper2-ts | `only-geometry-case-routing-import-clipper2-ts` | unit `tooling` |
| 36 | glue | createDerivations posts borders at the design's gap | a design with a free group of one key at its origin, gap x 2, y 1.5 | `left/<group>` border bounds (−10.5, −10.5)–(10.5, 10.5); the key's row `[]` | unit `model` |
| 37 | glue | the posted Layout set carries borders | Corney's script through the real model worker | `left/thumbfan` and `right/thumbfan` each one region; their key rows `[]` | integration `app` |

</frozen-after-approval>

## Code Map

- `packages/geometry/src/` -- `affine.ts`, `apply.ts`, `compose.ts`, `frame-of.ts`, `types.ts` (`Matrix`, `Frame`, `Point`); `index.ts:1-5` re-exports. `package.json` has no dependencies. `GRAPH` lets `geometry` import `result` (`.dependency-cruiser.mts:30`). Spec style: `it.each` of `[role, input, expected]`, `expect.closeTo(v, DIGITS)`, one spec file per source file.
- `pnpm-workspace.yaml:6-8` -- `catalogMode: strict`; a shared dependency goes in as `catalog:` (`tooling/catalog.spec.ts`).
- clipper2-ts 2.0.1-18 (read from its tarball): `inflatePathsD(paths, delta, joinType, endType, miterLimit = 2, precision = 2, arcTolerance = 0)` scales `arcTolerance` by `10^precision` itself (`dist/Clipper.js:111-120`), so 0.005 goes in as world mm. `ClipperD(roundingDecimalPrecision)`, `addSubjectPaths`, `execute(ClipType.Union, FillRule.NonZero, polytree: PolyTreeD)` (`dist/Engine.d.ts:316-334`); `PolyPathD.poly`, `.isHole`, `.count`, `.child(i)` (`Engine.d.ts:118-147`). Run in the scratchpad: a NaN or infinite coordinate throws `Scaled coordinate exceeds Number.MAX_SAFE_INTEGER in scalePath64`; output points carry `z: 0`, which the region drops.
- `packages/schema/src/layout-output.ts:6-23` -- `layoutOutputSchema`; `LayoutOutput` at `types.ts:98`. `testing/layout-output.ts` -- `aLayoutOutput`, `aLayoutRow`. `vec2.ts` is a pair of `delta` expressions, not numbers, so the border's points get their own schema.
- `packages/protocol/src/layout-output/{layout-output-codec.ts:8-38,types.ts:3-17}` -- `packLayoutOutput`, `readLayoutRow`, `PackedLayoutOutput`. `packed-column/value-at.ts`. `transfer/buffers-of.ts:4` takes `.buffer` of every non-array field, so the new columns travel with no change to it.
- `packages/model/src/placement/{place-layout.ts:37-75,layout-row.ts:11,literal-value.ts:6}` -- `placeLayout` builds `left/` and `right/` rows; `rowOf` builds each row; `literalValue` reads a gap axis. `layout-editing/node-tree.ts` -- `isGroup`, `subtreeIds`. `ids/side-qualified-id.ts`. `dependencies/dependency-graph.ts:7-8` -- a free child with an explicit anchor depends on its target, not its parent.
- `packages/model/src/parts/create-derivations.ts:48,151-157` -- `gap` selector, `anchors`, `placements`. `parts.value.output.rows[row.part]` is a slot row's rectangle.
- `packages/model/src/parts/create-derivations.spec.ts:79-95` -- `arrange(design, library)` with `FakeRunner`; builders `aDesign`, `aMeta`, `aGap`, `aLayout`, `aFreeGroup`, `aChainGroup`, `aSlot` from `schema/testing`.
- `.dependency-cruiser.mts:181,367-372` -- `onlyImports(name, ownerRegex, npm(pkg), comment)`; precedent `only-geometry-imports-makerjs`. `tooling/ad10/rules.spec.ts:243` (violations), `:484` (allows table). Fixtures under `tooling/ad10/violations/packages/<pkg>/src/index.ts`.
- `packages/case/src/index.ts`, `packages/routing/src/index.ts` -- empty packages.
- Specs the change breaks (rows gain `border`): `protocol/src/layout-output/layout-output-codec.spec.ts` (literals `SLOT`, `GROUP`, `STAND_IN`, `PIVOTED`; `shared` at `:85-98` lists ten columns), `protocol/src/transfer/buffers-of.spec.ts:9-20`, `schema/src/layout-output.spec.ts` (`outputWith`), `schema/src/testing/layout-output.spec.ts`, `model/src/placement/place-layout.spec.ts`, `model/src/parts/create-derivations.spec.ts`, `app/src/right-half.spec.ts:75-86` (`reflected`), `app/src/layout-set.spec.ts`, `app/src/anchors.spec.ts:140-147`, `app/src/blueprint-inputs.spec.ts:111-118`, `app/src/corney-column.spec.ts:91-98`, `pipeline/src/pipeline/pipeline-stages.spec.ts`, `workers/src/model-worker/model-worker-lifecycle.spec.ts`; editor specs that use `aLayoutRow` pass through its default.

## Tasks & Acceptance

**Execution:**
- [ ] `pnpm-workspace.yaml`, `packages/geometry/package.json` -- clipper2-ts `2.0.1-18` in the catalog; geometry's `dependencies` gain `clipper2-ts: catalog:` and `@keeb-cad/result: workspace:*`.
- [ ] `packages/geometry/src/flatten-tolerance.ts` -- `FLATTEN_TOL = 0.005`.
- [ ] `packages/geometry/src/grow-and-unite.ts` -- `growAndUnite(envelopes: readonly GrownEnvelope[]): Option<PolygonRegion[]>` (function): inflates each envelope by its `distance` (round joins, `EndType.Polygon`, precision 6, arc tolerance `FLATTEN_TOL`), unites them with `ClipperD(6)`, Union, NonZero into a `PolyTreeD`, walks the tree into regions and returns `normalisePolygonRegions` of them; `[]` gives some `[]`; none when `execute` returns false or clipper throws. `types.ts` gains `GrownEnvelope = { envelope: readonly Point[]; distance: number }` and `PolygonRegion = { outer: Point[]; holes: Point[][] }`. `grow-and-unite.spec.ts`: rows 22–28b.
- [ ] `packages/geometry/src/normalise-polygon-regions.ts` -- `normalisePolygonRegions(regions)` (function): outer CCW and holes CW by signed area, each loop rotated to start at its lowest-then-leftmost point, holes then regions sorted by that point. `normalise-polygon-regions.spec.ts`: row 28c.
- [ ] `packages/geometry/src/index.ts` -- exports `growAndUnite`, `FLATTEN_TOL`, `GrownEnvelope`, `PolygonRegion`.
- [ ] `packages/schema/src/border.ts` -- `borderSchema`: `v.array(v.strictObject({ outer: v.array(point), holes: v.array(v.array(point)) }))`, point `v.strictObject({ x: v.number(), y: v.number() })`; `Border` in `types.ts`; exported. `layout-output.ts` rows gain `border: borderSchema`. `testing/border.ts` -- `aBorder(regions = [aBorderRegion()])` (function) for the schema's value and `aBorderRegion({ outer, holes })` (function), defaulting a CCW 1 × 1 square with no holes; `aLayoutRow` defaults `border: []`. Row 33 in `layout-output.spec.ts`; `testing/border.spec.ts`: the default parses through `borderSchema`, and each field passed comes back.
- [ ] `packages/protocol/src/layout-output/{layout-output-codec,types}.ts` -- `PackedLayoutOutput` gains `rowLoops: Uint32Array`, `loopPoints: Uint32Array`, `loopHole: Uint8Array`, `points: Float64Array`; `packLayoutOutput` writes them; `readLayoutRow` rebuilds the row's regions (a non-hole loop opens a region, each hole joins the last one). Rows 29–31 in `layout-output-codec.spec.ts`, row 32 in `transfer/buffers-of.spec.ts`. The spec's `SLOT`, `GROUP`, `STAND_IN`, `PIVOTED` become `aLayoutRow({…})` with only the fields their tests read; `shared` lists the four new columns.
- [ ] `packages/model/src/borders/border-margin.ts` -- `borderMargin(gap: { x: number; y: number }): number` (function). Rows 1–5 in its spec, the gap as an `it.each` argument.
- [ ] `packages/model/src/borders/envelope-corners.ts` -- `envelopeCorners(frame, rectangle): Point[]` (function): the rectangle's four corners through the row's `x`, `y`, `rot`, counter-clockwise.
- [ ] `packages/model/src/borders/group-borders.ts` -- `groupBorders(layout, placed: LayoutOutput, parts: PartsOutput, margin: number): LayoutOutput` (function): for each side and each non-root group whose row is placed, the placed slot rows of its subtree with their levels (a private `placedSlotsUnder` (function) in the same file), each `{ envelope: envelopeCorners(…), distance: margin × levels }`; `growAndUnite(…).getOr([])` mapped to the row's `border`; returns the rows with `border` set. `borders/types.ts` for its own types. Rows 6–21 in `group-borders.spec.ts`, whose `arrange` builds only inputs (a layout from builders, its rows through `aLayoutOutput`/`aLayoutRow` at the frames the test names, an `aPartsOutput` of 18 × 18) and each test calls `groupBorders`; test names state the role, numbers in `it.each` parameters or `expected*` constants.
- [ ] `packages/model/src/placement/layout-row.ts` -- `rowOf` writes `border: []`.
- [ ] `packages/model/src/parts/create-derivations.ts` -- the supported branch of `placements` returns `groupBorders(layout.value, placeLayout(…), parts.value.output, borderMargin({ x: literalValue(gap.value.x), y: literalValue(gap.value.y) }))`. Row 36.
- [ ] `.dependency-cruiser.mts` -- `onlyImports('only-geometry-case-routing-import-clipper2-ts', '^packages/(geometry|case|routing)/', npm('clipper2-ts'), 'Only geometry, case and routing import clipper2-ts.')`. Fixtures: `violations/packages/{geometry,case,routing}/src/index.ts` import it (allowed), `violations/packages/plates/src/index.ts` imports it (violation). `rules.spec.ts` gains the violation and three allows rows. Rows 34–35.
- [ ] `app/src/layout-set.spec.ts` -- row 37. `app/src/right-half.spec.ts` -- `reflected` returns `border: expect.any(Array)`, since the reflection of borders is row 19's in `model`.
- [ ] The other broken specs in the Code Map -- rows built with `aLayoutRow`, writing out only the fields each test reads; whole-value asserts kept.
- [ ] `_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md` -- AD-16 Group borders sentence (done in the working tree, Sergii 2026-11-13); docs-only, committed to main.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row has a passing test at its level.
- Given row 37, when the implementer drops `groupBorders` from `placements`, then that test goes red; named in the PR.

## Design Notes

```ts
for (const side of SIDES) for (const group of nonRootGroups(layout)) {
  const envelopes = placedSlotsUnder(layout, group, side, placed).map(({ row, levels }) => ({
    envelope: envelopeCorners(row.frame, parts.rows[row.part]),
    distance: margin * levels,
  }))
  const border = growAndUnite(envelopes).getOr([])
}
```

- Decision (plan): borders are computed from the rows (world frames and `part`), not from `placeLayout`'s matrices, because the spine says "Each side's borders come from that side's own rows (AD-6)"; a rectangle is symmetric about its frame, so a mirrored row's corners are the same four points.
- Decision (plan): rows 15–17 and 21 arrange their state as a loaded file would hold it, not through commands, because an unresolvable anchor, an anchor cycle and an arbitrary offset reach the design only through a file (Consistency Conventions: "only a file can hold since deleting the target clears the anchor"; `SetAnchor` refuses loops), and a free child with an explicit anchor depends on its target, not its parent (`dependency-graph.ts:7-8`), so row 16's key stays placed under an unplaced group.
- Decision (plan): the polygon output type is `geometry`'s `PolygonRegion`, not `schema`'s `Border`, because `geometry` imports only `result` (`.dependency-cruiser.mts:30`); `model` maps one to the other. The name pairs the glossary's **region** with "polygon" (AD-16's "polygon engine"), not plain `Region`, which the glossary defines "as exact paths". `GrownEnvelope` uses the glossary's **envelope**.
- Decision (plan): `growAndUnite` returns `Option`, none when clipper throws or `execute` returns false, not a `Result` with a reason nor an escaping throw, because nothing reads a reason (no violation is reported) and "A border that fails posts no outline and reports nothing" (AD-16) and clipper throws on a coordinate past `MAX_SAFE_INTEGER` at precision 6 (scratchpad run above), which a loaded file's offset reaches (row 21).
- Decision (plan): clipper's range is tested at x 9e9 and 1e10 (rows 28a, 28b), not at its exact edge, because the edge is `MAX_SAFE_INTEGER / 10^6` ≈ 9.007e9 mm after clipper adds the grow distance inside its own scaling, so no input sits on it exactly; the boundary is clipper's, not a requirement's (implementation boundary).
- Decision (plan): holes within a region are ordered by their lowest-then-leftmost point, not left in clipper's child order, because AD-16 wants "equal geometry gives equal arrays" and orders regions that way; the spine names no hole order.
- Decision (plan): row 26's vertex tolerance is 1e-6, not `FLATTEN_TOL`, because precision 6 rounds every coordinate to 1e-6 (AD-16 "at precision 6") and vertices lie on the arc; `FLATTEN_TOL` bounds the chord, so it bounds edge midpoints.
- Decision (plan): `create-derivations.ts` converts the gap with `literalValue`, not `borders/` reading expressions, because `placeLayout` already reads the gap that way (`place-layout.ts:46`), so no new throw path appears, and `borderMargin` stays a function of numbers for the deferred failed-gap story.
- Decision (plan): rows 8–10 use spec-local helpers (a ray cast, a point-to-segment distance), not clipper's `pointInPolygonD`, because the new fence keeps clipper2-ts out of `model`, specs included.
- Decision (plan): the dependency-cruiser rule is one rule with three owners, each proven by an allows row, not three rules, because the spine says "Only `geometry`, `case` and `routing` import `clipper2-ts`" as one rule.
- Decision (plan): row 37 checks only that borders arrive, not the right border's points against the left's, because "Test a rule where it is defined" and row 19 holds the side rule in `model`.

Visible: nothing on screen changes; 13.32 draws the borders. `pnpm dev`, `/?seed=corney` looks as today.

## Verification

**Commands:**
- `pnpm --filter @keeb-cad/geometry test`, `pnpm --filter @keeb-cad/model test`, `pnpm --filter @keeb-cad/protocol test`, `pnpm --filter @keeb-cad/schema test` -- expected: green.
- `pnpm vitest run tooling/ad10` -- expected: rows 34–35 green.
- `pnpm test` -- expected: the whole suite green.
- `pnpm lint` and the repo's typecheck -- expected: clean.

## Conformance Log

Pass 1 (two readers, union; 0 dropped for a missing quote):
- `Build schema values the test doesn't read with the concept's test builder … never a copied literal` (broken-spec list incomplete; literal rows in codec, buffers-of, app specs) -- fixed
- `assert whole values (toEqual, toMatchObject)` (`reflected` destructuring `border` out stays red) -- fixed (`border: expect.any(Array)`)
- `Test a rule where it is defined` (row 30 re-tested the side rule) -- fixed (row 37 checks arrival only)
- `equal geometry gives equal arrays` (hole order unspecified) -- fixed (decision, row 25)
- `Name a thing for what it does` (gap-to-numbers conversion unchosen) -- fixed (`literalValue` in create-derivations, decision)
- `pnpm strict dependencies` (geometry lacks `@keeb-cad/result`) -- fixed
- `(service)` / `(function)` tag (`placedSlotsUnder`, `corners` untagged) -- fixed (`envelopeCorners`, `placedSlotsUnder` tagged)
- `Start recording after arrange; a helper never takes a hidden step` (`place-layout.spec.ts` arrange runs placeLayout) -- fixed (groupBorders spec arranges inputs only)
- `A choice no requirement made is a decision and is labelled as one` (catching throws; 1e-6 bound) -- fixed (decisions)
- `Glossary terms only` (`GrowPiece`, `by`) -- fixed (`GrownEnvelope`, `envelope`, `distance`)
- `a new concept gets a new file` / `a new schema concept ships its builder` (border schema inline, no builder) -- fixed (`border.ts`, `testing/border.ts`)
- `Give every threshold three rows` (fence owners half proved) -- fixed (case and routing allows rows)
- `"Valid" or "correct" without a number is a question` (row 20 inputs) -- fixed (rows 22–25 with numbers)
- `Give every test an expect that fails when the behaviour breaks` (row 29 "non-empty") -- fixed (row 36 bounds)
- `add … an input that breaks an assumption` (no failed-border row) -- fixed (rows 21, 28)
- `Write a comment only for a why the code can't say` (sketch comments) -- fixed
- `Test a rule where it is defined` (precedent `geometry/src/frame-of.spec.ts:31` `describe('compose', () => {`) -- deferred
- `Name the boundary's role` (precedent `protocol/src/layout-output/layout-output-codec.spec.ts:68` `it("keeps a frame value's every digit and a group's part of -1"`) -- deferred
- `Name the boundary's role` (precedent `place-layout.spec.ts` `'steps three slots edge to edge: 0, 19, 38'`) -- already deferred by 13.6
- gap: specs `app/src/{blueprint-inputs,anchors,corney-column}.spec.ts`, `protocol/src/transfer/buffers-of.spec.ts` -- fixed
- gap: unplaced key under a placed group (`Unplaced slots never count.`) -- fixed (row 17)
- gap: zero-row output (`still gets zero-row outputs at each seq`) -- fixed (row 31)
- gap: margin wiring at a non-default gap, `packages/model/src/parts/create-derivations.ts` -- fixed (row 36)
- gap: `packages/case/src/index.ts`, `packages/routing/src/index.ts` as allowed clipper2-ts owners -- fixed (row 34)
- gap: failed border, `packages/geometry/src/grow-and-unite.ts` -- fixed (rows 21, 28)

Final pass (one reader, 0 dropped; fixes below not read by any reviewer):
- `never a copied literal` (`GROUP` left as a literal) -- fixed
- `Give every threshold three rows` (clipper range) -- fixed (rows 28a, 28b; decision naming the implementation boundary, run confirmed: 9e9 some, 1e10 throws)
- `A builder's file takes its schema file's name` (`aBorderRegion` only) -- fixed (`aBorder`)
- `Test a rule where it is defined` (`normalisePolygonRegions` no own spec) -- fixed (row 28c)
- `A choice no requirement made is a decision` (`Option` not `Result`) -- fixed
- `Name a thing for what it does` (sketch vs signature; redundant empty guard) -- fixed

## Implementation Notes

- Row 26 conflicts with the frozen arc tolerance by rounding: clipper spaces a round join's vertices so each chord strays by the whole arc tolerance, and precision 6 then moves the vertices by up to 5e-7, so the nearest chord midpoint of a square grown by 1 sits at 0.9949996 (measured), 4e-7 past `1 − FLATTEN_TOL`. The spec checks `≥ 1 − FLATTEN_TOL − 1e-6` (the precision row 26 already uses for vertices), not `≥ 1 − FLATTEN_TOL`, which no input can pass while the arc tolerance is `FLATTEN_TOL` at precision 6. Settled by Sergii below.
- Decision (Sergii, 2026-11-13): row 26's midpoint bound is `1 − FLATTEN_TOL − 1e-6`, not `1 − FLATTEN_TOL` with clipper given a smaller arc tolerance, because the spine sets "an arc tolerance of `FLATTEN_TOL`, 0.005 mm … at precision 6" and precision 6's rounding carries the nearest midpoint to 0.994999619 (scratchpad run on clipper2-ts 2.0.1-18; arc tolerance 0.004999 gives 0.995000945). Row 26 amended in the frozen block.
- Decision (build): `readLayoutRow` throws `RangeError` when a packed row's first loop is a hole, not repairing the row, as `optionOfCode` throws on a bad code (`protocol/src/layout-output/option-of-code.ts`); `packBorders` never writes one.
- Real-host run: not needed; no spec in the diff fakes a third-party host or boundary (clipper2-ts runs for real in every geometry and model spec).
- `envelope-corners.spec.ts` added (one turned rectangle), not left to `groupBorders`' rows alone, because no row of the table turns a key, so a rotation sign error would pass every row.
- `groupBorders`' rows 11–21 arrange rows by side-qualified id directly; row 11 uses a one-key group on both sides, not row 6's two columns, because only a two-sided arrangement shows the right root's row too.
- Row 15 puts a key anchored to a placed key outside inside the cyclic group, so the group has a placed slot and the row fails if unplaced groups were bordered.
- Row 37 toggled: with `groupBorders` dropped from `placements`, `layout-set.spec.ts`'s thumbfan test goes red (chromium and firefox); restored.

## Plan Change Log

## Review Triage Log

### Pass 1 (quick, test-reviewer) — 2026-11-13

Verdicts: high 0, medium 1, low 5, false 0, maybe-false 0, rejected 3.

| Lens | Finding | Verdict | Route | Evidence / action |
|------|---------|---------|-------|-------------------|
| quick | rows 15 and 16 arrange and assert `left/` rows only; the frozen rows say "its rows' border `[]`" | medium | patch | `group-borders.spec.ts` arranges only `left/u`, `left/w`, `left/m`; a right-side unplaced group is never checked, so frozen rows 15–16 are half covered. Patch: arrange both sides, assert both. |
| quick | stand-in test's name claims "not its part's rectangle" and carries "18 mm" | low | patch | The slot points at the stand-in run (row 1); the name's number breaks "numbers go in parameters". Patch: rename to the role (grows a stand-in key by the run its row points at). |
| quick | `grow-and-unite.spec.ts` name "a block of eight squares" carries a number | low | patch | AGENTS.md "Name the boundary's role". Patch: drop the number from the name. |
| quick | garbled comment above `twoColumns()` | low | patch | "the keys 19 mm apart edge to edge 1 mm" restates the fixture ambiguously; delete it. |
| test-reviewer | `layout-set.spec.ts` builds the expected key borders with `flatMap` | low | patch | Expected value generated by a loop; write the six entries out. |
| quick + test-reviewer | `readBorder` throws `RangeError` when a row's first loop is a hole, unlabelled and untested | low | reject | Unreachable: `packBorders` always writes a region's outer before its holes and is the only producer of `PackedLayoutOutput`; the fix would add no behaviour. The implementer's report gave it as its decision (precedent `optionOfCode` throws on a bad code); recorded in Implementation Notes. |
| test-reviewer | `reflected` uses `border: expect.any(Array)` | low | reject | The plan's task chose it, with row 19 in `model` holding the side rule (Design Notes, last decision). |
| test-reviewer (unrated) | `normaliseLoop` treats a zero-area loop as clockwise | low | reject | Clipper's union output never holds a zero-area loop (it drops degenerate paths); no input reaches it. |
| test-reviewer (unrated) | `normalisePolygonRegions` spec packs five rules into one `it` | low | reject | It asserts the whole value and fails on any one rule; splitting adds tests with no new failure caught. |

### Pass 2 (quick, test-reviewer, on the pass-1 patches) — 2026-11-13

Verdicts: high 0, medium 0, low 8, false 1, maybe-false 0. Nothing above low and no frozen line broken: review ends; lows logged, not patched.

| Lens | Finding | Verdict | Route | Evidence / action |
|------|---------|---------|-------|-------------------|
| quick + test-reviewer | row 25's test may pass with no hole sort | false | reject | Toggled: with `.toSorted(byStart)` removed from holes in `normalise-polygon-regions.ts`, "orders the holes of a region by their lowest-then-leftmost point" goes red; restored (`cmp` identical). |
| quick | `borderOf` falls back to `[]`, the value rows 11–13 and 15 expect | low | logged | Every id read is arranged today, so the tests pass for the right reason; a missing id would mask. |
| quick | rows 6–10's expected bounds depend on frames inside `twoColumns()` | low | logged | AGENTS.md "Assert relative to the arranged state"; the values match the frozen table. |
| quick | `square`'s `distance` parameter is never passed | low | logged | Dead default; no behaviour. |
| quick | six spec comments restate their helpers | low | logged | AGENTS.md "Write a comment only for a why". |
| quick + test-reviewer | `'grows a square %s at x %d into %o regions'` prints an `Option` dump | low | logged | Name and expect agree; readability only. |
| test-reviewer | round-join test reduces distances to booleans | low | logged | It fails when the bound breaks; the failure message shows `false`, not the distance. |
| test-reviewer | winding test's key `area` holds a boolean | low | logged | Naming only. |
| test-reviewer | long `it.each` title for rows 8/10 | low | logged | Readability only. |
