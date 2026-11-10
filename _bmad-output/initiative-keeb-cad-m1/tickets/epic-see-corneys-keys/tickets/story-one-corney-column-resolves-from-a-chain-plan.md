---
title: 'One Corney column resolves from a chain'
type: 'feature'
ticket: 2
created: '2026-11-10'
status: 'ready-for-dev'
baseline_revision: ''
route: 'full'
route_source: 'auto'
risk: 'high'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The layout tree has slots and groups but no offsets, no quantities and no commands that build it, and nothing turns it into positions. A design can't say "this column is a chain of three keys" and get key frames back.

**Approach:** `schema` gains the quantity kinds, `meta.gap`, node offsets and `LayoutOutput`. `model/main` gains three layout operations behind four commands, the reference walk and a structural check raising `unknown-target`. The design store gains `runById`. `geometry` gains `compose`, and `model/worker` gains the left side's placements. Corney's script starts with its outer column.

## Boundaries & Constraints

**Always:**
- Quantities are Expression strings checked by `quantity(unit)`'s metadata; no unitless field.
- World frame = anchor frame, then translate by the offset, then rotate by the offset's rotation about the pivot, the pivot in the node's own frame (AD-3, glossary). Frames are composed only through `geometry`'s `compose`.
- A chain steps edge to edge: `far(n−1) + gap − near(n)` along the previous child's axis (AD-4 as updated). A group's extent is the bounding extent of its placed slots' rectangles in its own frame, each turned by its own rotation (AD-4: "taken together … in the group's frame"). An empty group is a point at its origin.
- `rot` is normalised to (−180, 180].
- Placement reads the design only through per-section selector computeds.
- Each command forwards to one `model/main` operation. Model refusals are built with `reject`.
- Ids are unique among the design's items (AD-8 as updated): `id-taken` checks node, design part and build entry ids, not `meta.id`.

**Never:**
- No anchor field (13.3), no rotation-carry tests (13.4), no right side, overrides or `unsupported-form` (13.6), no codec or post (13.22), no evaluator (14.2): placement reads literals through `parseExpression`.
- No remap of references inside a duplicate. Nothing in 13.2 points at a node; 13.3 builds the remap with anchors.
- No `vi.mock`, snapshots or jsdom.

**Decisions (Sergii, 2026-11-10):**
- A layout row's `part` is its run's row index in `parts.output.ids`, not a run id converted by 13.22's codec, because `LayoutOutput` then is the posted schema type.
- `checkStructure(previous, next)` refuses only references dangling in `next` that weren't in `previous`, not every dangling one, because a file loaded with one must not block every later edit.
- DuplicateNode gives every copied id the lowest free `-N` from 2, after stripping an existing `-N` ending, not fresh minted ids, because chosen and minted ids can't be told apart.
- DuplicateNode and DeleteNode refuse the root (`root-required`) and any id the design lacks (`unknown-target`, naming every missing one, deleting nothing), not skip it, because a command naming something absent is a stale or wrong request.
- AddGroup and AddSlot refuse an index above the parent's child count with `index-out-of-range` naming the parent, not clamp it. A negative index fails the input schema.
- The chain step is edge to edge, not Ergogen's centred `(rect(n−1) + rect(n)) / 2 + gap`, because the gap is edge to edge between keycaps. An empty group is a point at its origin, not skipped.
- Remapping references inside a copy moves to 13.3, not untested code here.
- `runById(command, input)` refuses an unknown id with the store-owned rejection `unknown-command`, not a lookup inside the test, because the spine has the store refuse it.
- `id-taken` covers the design's items, not `meta.id`, because `meta.id` names the design and no reference targets it.

## Boundary table

Rows 1–3 run in geometry, 4–8 placement, 9–11 schema, 12–13 the store, 14–21 the model operations and the walk, 22–30 wiring.

| # | Group | Level | Input / State | Expected |
|---|---|---|---|---|
| 1 | rules | unit geometry | `frameOf` of a rotation 179 / 180 / 181 deg | rot 179 / 180 / −179 |
| 2 | rules | unit geometry | rotation −179 / −180 / −181 deg | rot −179 / 180 / 179 |
| 3 | rules | unit geometry | rotation 190 deg | rot −170 |
| 4 | rules | unit model | `placeSlot`: anchor at origin, offset position (10mm, 0mm), rotation 90deg, pivot (−10mm, 0mm) | frame x 0, y 10, rot 90 |
| 5 | rules | unit model | chain y, 1u slots: none / one / three, gap 1mm | group row only / slot at (0, 0) / slots at y 0, 19, 38 |
| 6 | rules | unit model | chain x: slot, then a free group with slots at offset y 0mm and 19mm | group origin x 19 |
| 7 | rules | unit model | chain y: slot, that group, slot | group origin y 19 (its slots at 19, 38); last slot y 57 |
| 8 | rules | unit model | chain y: slot, empty group, slot / free group, slot with no offset / chain y: slot, then a group holding one slot rotated 45deg | group y 10, last slot y 20 / slot frame and anchorAt = parent origin / group origin y 9 + 1 + 9√2 ≈ 22.728 |
| 9 | rules | unit schema | `meta.gap.x` '1mm' / '1deg' / 'one' / 1 | ok / design-invalid at ['meta','gap','x'] for the other three |
| 10 | rules | unit schema | lengthSchema '15mm' / '15deg'; angleSchema '15deg' / '15mm' | ok / refused / ok / refused |
| 11 | rules | types | field on lengthSchema; Angle into Length | infers `Quantity<'mm'>`; not assignable |
| 12 | rules | unit design | runById of an id no command has | unknown-command naming it |
| 13 | rules | unit design | runById of a fake registered command: good / bad input | runs / input-invalid |
| 14 | rules | unit model | addNode with no id / 'thumb-home' / 'key' (a part's id) / 'thumb-home' again / meta.id | minted / kept / id-taken ['key'] / id-taken ['thumb-home'] / kept |
| 15 | rules | unit model | addNode under a missing id / under a slot | unknown-target naming it |
| 16 | rules | unit model | parent with 3 children: index 0 / 2 / 3 / 4 / omitted; parent with 0 children: 0 / 1 | first / before the last / last / index-out-of-range [parent] / last; only child / index-out-of-range |
| 17 | rules | unit commands | AddSlot index −1 | input-invalid |
| 18 | rules | unit model | duplicateNode 'thumb-home' / with '-2' taken / with '-2' free and '-3' taken / 'thumb-home-2' / 'a-1' / group 'g' with child 'a' / root / 'missing' | 'thumb-home-2' right after it / 'thumb-home-3' / 'thumb-home-2' / 'thumb-home-3' / 'a-2' / 'g-2' with child 'a-2' / root-required [root] / unknown-target ['missing'] |
| 19 | rules | unit model | deleteNode ['a','b'] / ['g','g-child'] / [] / ['a','missing'] / [root] | both gone / g's subtree gone / unchanged / unknown-target ['missing'], 'a' kept / root-required [root] |
| 20 | module boundaries | unit model | `walkReferences` on a design built from every section | every `ref()` field, listed by path with its kind and target; literal expression fields yield nothing (parameter references arrive with 14.2) |
| 21 | module boundaries | unit model | checkStructure: next has slot.part → missing id / → a slot's id / previous already dangling the same | unknown-target [id] / unknown-target [id] / ok |
| 22 | module boundaries | integration app | AddSlot with part 'missing'; DeletePart of a part a slot uses | unknown-target, design unchanged |
| 23 | glue | unit commands | each command's `apply` on a plain draft; each input schema | the operation's result (one row each); parses the fields listed in Tasks |
| 24 | glue | unit model | placement of a slot rotated 190deg | rot −170 |
| 25 | glue | unit model | `meta.name` changes / `meta.gap.y` changes | `placements.value` is the same object (`toBe`) / a new one |
| 26 | glue | unit model | three-slot chain | ids `left/<id>` sorted by compareId; slot `part` = its run's row in parts output, `fit` = `parts.slots[id].fit`; groups `part` −1, `fit` 'fitted'; every row `mirrored` false, `placed` true |
| 27 | glue | integration app | Corney script through `runById` after NewDesign, real parts lane | outer-bottom, outer-home, outer-top at y 0, 19, 38 in group `outer` |
| 28 | glue | integration app | that design written by `storage`'s `writeBundle`, read by `readBundle`, replaced | equal placements |
| 29 | glue | integration app | DuplicateNode and DeleteNode through `mainModules` | each commits |

</frozen-after-approval>

## Code Map

- `packages/schema/src/expression.ts:4` -- `expressionSchema` exists with `metadata({ expression: true })`. Reuse it.
- `packages/schema/src/layout.ts:8-29` -- node field schemas, which gain `offset`. Keep the children lazy and the `node`/`flatten` metadata.
- `packages/schema/src/meta.ts:7`, `types.ts:88-95,148-155` -- Meta, the hand-written tree types, `ModelRejectionKind` and `Rejection`.
- `packages/schema/src/parts-output.ts`, `testing/parts-output.ts` -- precedent for `{ ids, rows }` and its builder.
- `packages/schema/src/testing/layout.spec.ts` -- one `it.each` row per field a builder takes.
- `packages/expr/src/parse-expression.ts:7` -- `parseExpression(text): Result<{ value, unit }, ParseError>`, literals only.
- `packages/geometry/src/index.ts` -- `export {}`. Geometry may import only `result`.
- `packages/design/src/store/design-store.ts:54-73,142-165` -- `run`; `#runCommand` copies, parses, changes, `#ensureValidDesign`, then `checkStructure(next)` at L156.
- `packages/model/src/check-structure.ts:5` -- stub, always ok.
- `packages/model/src/{main,index}.ts` -- entries. `commands` reaches model only through `model/main`.
- `packages/model/src/parts/create-derivations.ts:33-38` -- selectors `defaultPart`, `libraryVersions`, `designParts`, `layout`; `parts.value.slots[id].run` and `output.ids` give a slot's run row.
- `packages/model/src/parts/create-derivations.spec.ts:276` -- precedent must-not-recompute test.
- `packages/model/src/part-deletion/delete-part{,.spec}.ts`, `packages/commands/src/parts/*` -- the operation/command pair to copy, except that input types go in the concept folder's `types.ts`.
- `packages/commands/src/design/new-design.ts:23-33` -- the new design. Root id minted at L30.
- `packages/design-file/src/round-trip.spec.ts:28-35` -- canonical KDL gains `gap`. The codec handles object fields generically and has no tuple.
- `app/src/default-key-part.spec.ts:53-73` -- real parts lane wired by hand (`DesignMirrorWriter.replace`, `runner.useLibrary`, `await runner.pause(pins.value)`). Put that setup in an `arrange` helper, unlike the precedent.
- `app/src/bundle-round-trip.spec.ts` -- precedent for `storage`'s `writeBundle`/`readBundle`. `app` never imports `design-file`.
- `reference-designs/src/{index,key-centres,fixture-files}.ts` -- the root entry pulls `node:fs`, and `app`'s specs run in the browser (`app/vitest.config.ts`).
- `.dependency-cruiser.mts:85-98,433` -- the `app` GRAPH row lacks `reference-designs`. `reference-designs-only-in-tests` allows test files only.
- `reference-designs/corney-island/source/config.yaml:110-123` -- outer column rows.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/schema/src/{quantity,length,delta,angle,vec2,offset,gap,layout-output}.ts`, one schema or factory per file: `quantity(unit)` (function), declared `v.GenericSchema<string, Quantity<U>>`, with the wrong-unit literal check; `lengthSchema`, `deltaSchema` and `angleSchema` each add `metadata({ quantity })`. `layoutOutputSchema` is `{ ids, rows }` per the Data Schema. Types go in `types.ts`, exports in `index.ts`.
- [ ] `packages/schema/src/{layout,meta}.ts`, `types.ts` -- `offset?` on nodes, `gap` on meta. `ModelRejectionKind` gains `id-taken`, `root-required`, `unknown-target` and `index-out-of-range`; `Rejection` gains `unknown-command`.
- [ ] `packages/schema/src/testing/{length,delta,angle,vec2,offset,gap,layout-output}.ts` and specs -- builders `aLength`, `aDelta`, `anAngle`, `aVec2`, `anOffset`, `aGap`, `aLayoutOutput` (function). The scalar builders (`aLength`, `aDelta`, `anAngle`) show they return their default, return their argument and refuse what their schema refuses. The object builders, `aMeta` with `gap` and the layout builders with `offset`, get one `it.each` row per field.
- [ ] `packages/geometry/src/{affine,compose,frame-of,types}.ts`, `index.ts` -- `translation`, `rotation` (function) in `affine.ts`; `compose(a, b)` and `frameOf(matrix)` (function). `frameOf` returns `{ x, y, rot }` with rot = atan2 in degrees, and −180 becomes 180.
- [ ] `packages/model/src/references/{walk-references,types}.ts` -- `walkReferences(design)` (function) walks schema and value through `v.getMetadata` (`refKind`, `expression`) and yields `{ path, kind, target }`, in one file with no per-section code.
- [ ] `packages/model/src/check-structure.ts` -- `checkStructure(previous, next)` (function), using the walk: unknown-target for a design-local `ref()` target that `next` lacks or holds as another kind, and `previous` didn't. `lib:` targets are skipped.
- [ ] `packages/model/src/layout-editing/{add-node,duplicate-node,delete-node,copy-id,types}.ts` -- `addNode` (function), `duplicateNode` (function) and `deleteNode` (function) over `Mutable<Design>`, and `copyId` (function) for the `-N` rule. Export them and `walkReferences` from `main.ts`, and `walkReferences` from `index.ts`. `packages/model/package.json` gains `@keeb-cad/geometry` and `@keeb-cad/expr`.
- [ ] `packages/design/src/store/design-store.ts` -- `runById(command: string, input: unknown): Result<void, Rejection>` on DesignStore (service), commands only (the spine: "The store resolves a command id"). `checkStructure` gets the committed design as `previous`.
- [ ] `packages/commands/src/layout/` -- `AddGroup`, `AddSlot`, `DuplicateNode` and `DeleteNode` command classes (service), each with its input schema file and its input type in `layout/types.ts`; and `layoutCommandsModule`, a plain `Module` object as `partsCommandsModule` is. `apply` passes the draft to the operation without the `as Mutable<Design>` cast that `parts/delete-part.ts` uses. If `tsc` refuses that, record the error as a `Decision (build):`. Inputs:
  - `AddSlot`: `{ parent?, index?, id?, part?, inputs?, offset? }`.
  - `AddGroup`: a variant on `arrangement`, chain with `axis`, plus `{ parent?, index?, id?, defaultPart?, offset? }`.
  - `DuplicateNode`: `{ id }`. `DeleteNode`: `{ ids }`.
  - `index` is a whole number of 0 or more.
  Export from `commands/src/index.ts` and wire into `app/src/main-modules.ts`. `new-design.ts` sets `gap: { x: '1mm', y: '1mm' }`.
- [ ] `packages/model/src/placement/{place-slot,place-layout,extent,types}.ts` -- `placeSlot` (function): anchor frame plus offset gives a world frame. `extent` (function): a node's `near`/`far` along an axis. `placeLayout(layout, gap, parts)` (function) returns left-side `LayoutOutput`.
- [ ] `packages/model/src/parts/create-derivations.ts`, `parts/types.ts` -- add a `gap` selector computed and a `placements` computed (each a computed inside `createDerivations`, a function) calling `placeLayout`. `Derivations` gains `placements`. Every new helper lives in `placement/`, not this file.
- [ ] `packages/design-file/src/round-trip.spec.ts`, `schema/src/testing/meta.ts` -- `gap` in the canonical design.
- [ ] `reference-designs/src/scripts/{corney-island-layout,types}.ts`, `scripts/index.ts`, `package.json` -- `corneyIslandLayout: LayoutScript` (data, function-free), with `type LayoutScript = { command: string; input: unknown }[]` in `scripts/types.ts`. It is exported as the subpath `./scripts`, with no Node imports. Its commands: AddGroup `outer` (chain y, no parent), then AddSlot `outer-bottom`, `outer-home` and `outer-top` under it.
- [ ] `.dependency-cruiser.mts` GRAPH `app` row, `app/package.json` -- add `reference-designs` as a dev dependency, test files only (the spine's AD-10 `app` bullet and mermaid, as updated).
- [ ] `app/src/corney-column.spec.ts`, `app/src/layout-commands.spec.ts` -- rows 22 and 27–29.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row has a passing test at its level.
- Given the integration rows (22, 27–29), when the implementer breaks the wiring each row covers, then that test goes red. Name each such check in the PR.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

- Decision (plan): 13.2 emits left-side rows (`left/<id>`) for every form, not both sides or zero rows, because 13.6 "derives the right side" and reports unsupported-form (13.6's ticket).
- Decision (plan): placement reads literals through `parseExpression`, not an evaluator, because "negative-length waits for 14.2's evaluator" (ticket).
- Decision (plan): the structural check skips `lib:` targets, not checks them against the library, because an unknown library id "is unresolvable-reference" (Data Schema, LibraryData).
- Decision (plan): every node is `placed: true`, not computed, because only anchors (13.3) leave a node unplaced.
- Decision (plan): `frameOf` does no rounding, and tests compare whole frames with `toEqual` over `expect.closeTo(…, 9)`, not exactly, because `Math.cos(Math.PI/2)` is `6.12e-17` (node). Rotations are compared on the normalised value, not mod 360, so that rows 1–3 can fail.
- Decision (plan): `DeleteNode []` returns ok with nothing committed, not input-invalid, because the store commits nothing when there are no patches (`design-store.ts:154`).
- Decision (plan): the script lives behind a data-only `scripts` subpath, not the package root, because the root re-exports `key-centres.ts`, which imports `node:fs`, and `app`'s specs run in the browser (`app/vitest.config.ts`).
- Decision (plan): rows 27–28 run placement by hand on a `DesignMirror` fed the store's design, not through the model worker, because nothing posts layout rows before 13.22.

## Conformance Log

- Pass 1 (two readers), `Row 8 … frame x 0, y −20`, against AD-3 (`World frame = anchor frame → translate by offset → rotate…`): fixed, now (0, 10).
- `test angles are compared mod 360`, against AGENTS `Give every test an expect that fails when the behaviour breaks`: fixed (normalised values, closeTo).
- `Test a rule where it is defined`: fixed. Geometry rows are unit geometry, and operation rows are unit model.
- `Give every threshold three rows`: fixed (rows 5, 16, 18, 19).
- DuplicateNode root or missing, DeleteNode missing: asked, then decided by Sergii.
- Group extent off-centre (glossary gap): asked; Sergii chose edge to edge.
- Empty group in a chain: asked; Sergii chose a point at its origin.
- Remap inside a copy is unreachable (`Arrange only a state real commands could reach`): asked; moved to 13.3.
- `a new schema concept ships its builder in the same PR`: fixed.
- `…fields` left open (AD-2 Layout commands): fixed. Inputs are listed in Tasks.
- Wrong kind (Data Schema unknown-target): fixed (row 21).
- Decision 4 with no "because" (AGENTS Policy): fixed.
- `layout` computed name collision with `create-derivations.ts:36`: fixed, now `placements`.
- `Give each file one kind of thing` (quantity.ts mixes kinds): fixed, one file per schema.
- Script outside `src/` (`.dependency-cruiser.mts` exclude): fixed, `reference-designs/src/scripts/`.
- Service/function tags missing: fixed.
- Unlabelled rounding, LayoutOutput shape and forms: fixed (Design Notes; spine `LayoutOutput` is `{ ids, rows }`).
- Precedent `packages/commands/src/types.ts` (`DeletePartInput`): deferred.
- Precedent `create-derivations.ts` helpers: deferred.
- Precedent `default-key-part.spec.ts` arrange: deferred.
- gap: AD-2 "every command and action has at least one" end-to-end test: fixed (row 29).
- gap: AD-2 store refuses an unknown command id: asked; Sergii chose `runById` with `unknown-command`.
- gap: `model/main` and `geometry/index.ts` exports: fixed.
- gap: DeletePart of a used part (13.18 left it to this check): fixed (row 22).
- gap: row 18 `meta.name` with no command: not a gap. The state is reachable by loading a file (`replaceDesign`); recorded only.
- Final pass, AD-25 `is a spine edit, like a new edge`: fixed. The spine's AD-10 bullet and mermaid gain app's test-only edge.
- Final pass, `reference-designs` root pulls `node:fs` into browser specs: fixed (`scripts` subpath).
- Final pass, AD-10 `Only storage imports it` (design-file): fixed (row 28).
- Final pass, `test wiring between packages as integration in pipeline or app`: fixed (row 22 app, row 23 unit commands). Precedent `packages/commands/src/parts/delete-part.spec.ts`: deferred.
- Final pass, AD-24 walk yields parameter references: fixed (row 20).
- Final pass, stale Data Schema step comment (spine L963): fixed in the spine.
- Final pass, Naming (`ScriptStep` reuses "step"): fixed, now `LayoutScript`.
- Final pass, precedent `parts/delete-part.ts` `as Mutable<Design>`: fixed in plan (no cast, or a Decision (build)); deferred for the precedent.
- Final pass, row 18 lowest-free thresholds: fixed.
- Final pass, `fit`/`mirrored`/group values: fixed (row 26).
- Final pass, `assert whole values`: fixed (`toEqual` with `expect.closeTo`).
- Final pass, recompute observation: fixed (`toBe`).
- Final pass, runById level and actions: fixed (fake command; commands only).
- Final pass, frozen text inconsistencies: fixed.
- Final pass, scalar builder shape (Test builders row): fixed.
- Final pass, `id-taken` and `meta.id`: asked; Sergii chose items only, spine AD-8 updated.
- Final pass, rotated slot in group extent: fixed (Always, row 8).
- Final pass, tags: fixed.

## Verification

**Commands:**
- `pnpm test` -- expected: all green.
- `pnpm typecheck` -- expected: no errors.
- `pnpm depcruise` -- expected: no violations.
