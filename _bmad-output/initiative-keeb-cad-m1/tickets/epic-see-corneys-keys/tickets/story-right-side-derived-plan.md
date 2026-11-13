---
title: 'Right side derived'
type: 'feature'
ticket: 6
created: '2026-11-13'
status: 'built'
baseline_revision: '3008fd47f2db2f9c4257328498208550ec4976fc'
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

**Problem:** `model` posts only `left/` rows (`place-layout.ts:28`, `SIDE = 'left'`), so a split reversible design has no right half, and a split mirrored or unibody design posts nothing and reports nothing (`create-derivations.ts:144-155`).

**Approach:** `placeLayout` emits a `right/<id>` row for every node: the left world frame reflected across the y-axis of `center`'s frame (the root group, `new-design.ts:21`), with `mirrored: true`. `createDerivations` reports `unsupported-form` (error, ids: the design id) for every other form, its message from `violations/unsupported-form-message.ts`. An app spec runs Corney's script and checks every right row against its left row.

## Boundaries & Constraints

**Always:**
- The right side is the resolved left side reflected across the y-axis of `center`'s frame (AD-6). With `C` the root's world frame (`place-layout.ts:44`), `S` the reflection across the y-axis and `R` a node's frame relative to the root: left world = `C·R`, right world = `C·S·R`. Its anchor frame the same way.
- A right row's `frame` is `frameOf(world·S)` with `mirrored: true`, so the canvas's `translate(x, y) rotate(rot) scale(-1, 1)` (AD-22, `CanvasSlot.vue:18-19`) redraws the world matrix; `rot` is in (−180, 180] by `frameOf` (`frame-of.ts:8`). `anchorAt` is the reflected anchor frame's origin.
- Attach points swap because the resolved geometry is reflected: a node anchored to a slot's `edge-left` on the left sits, on the right, at the right slot's `edge-right` read in its unmirrored frame. Placement is not run a second time.
- Every node gets a right row, the root (`center`) included, because LayoutOutput's `ids` are "one per side placement, slots and groups" (Data Schema) and the glossary's center entry says "Like every group it is posted once per side (`left/<id>`, `right/<id>`)"; an unplaced left node gives an unplaced right row (`placed: false`, frame and anchorAt NaN, `mirrored: true`). `kind`, `part` and `fit` are the left row's: the halves differ only through overrides (AD-6), which are 13.33's.
- `ids` hold both sides, sorted by `compareId` (Data Schema LayoutOutput).
- Any form but `{ type: 'split', board: 'reversible' }` (`isSupportedForm`) posts empty parts and placements, as today, and its violations are exactly one `unsupported-form`: severity `error`, ids `[meta.id]` (Consistency Conventions, Violations), message `unsupportedFormMessage(ids)`.

**Decisions (Sergii, 2026-11-13, plan questions):**
- The layout violations (`dependency-cycle`, `unresolvable-reference` for an anchor) keep bare authored ids, not `left/<id>` or one per side, because a cycle or a missing anchor is a fault of the one authored node and breaks both sides alike; the spine pass of 2026-11-13 (3008fd4) made this AD-6's rule: "A violation names what is at fault: an authored element by its id, a resolved placement by its side-qualified id."
- `center` is posted as `left/root` and `right/root`, not once by a bare id, because the right row's frame is the left's reflected and right children anchor to it, and every posted id stays side-qualified (`nodeIdOf` unchanged); the spine pass (3008fd4) wrote this into the glossary's center entry.
- The `unsupported-form` message is one text for every unsupported form, built from the ids alone: `The design "d" can't be placed: this version builds only a split design with a reversible board.`, not one text per form, because Consistency Conventions: "Each kind's message is built by one `model` function from its kind and ids".

**Never:**
- No overrides, `fit: 'empty'`, `override-not-allowed`, DeleteNode cascade or test-only step file (13.33). No canvas, tree or selection change (13.8). No group borders (13.26). No side-qualified ids for the existing layout violations.
- No `vi.mock`, snapshots or jsdom.

## Boundary table

Units mm and degrees; slots 1u (18 × 18), gap 1, root `root` free at the origin with no offset unless stated. With `center` (the root) at the origin and unturned, as here and in every design `NewDesign` starts (`new-design.ts:33`, no offset), the reflection across its y-axis takes a left frame `(x, y, rot)` to `(−x, y, −rot wrapped to (−180, 180], mirrored)` and an `anchorAt` `(x, y)` to `(−x, y)`; row 5 is the case where `center` is moved and turned.

| # | Group | Level | Input / State | Expected |
|---|---|---|---|---|
| 1 | production bugs | integration app | Corney's script, then the posted Layout set | the posted `right/` rows, in id order, equal the posted `left/` rows with each frame and `anchorAt` taken through the preamble's reflection (one whole-value assertion); `right/left-half` frame (140, 0, 0, mirrored); posted issues' violations `[]` |
| 2 | module boundaries | integration app | a design with form unibody / split mirrored, through `replaceDesign` | posted issues' violations `[{ kind: 'unsupported-form', severity: 'error', ids: [design id], message: unsupportedFormMessage([design id]), fixes: [] }]`; posted Layout set zero rows |
| 3 | rules | unit model | free slot `a` offset (−20, 5) rot 15 | `left/a` (−20, 5, 15, not mirrored); `right/a` (20, 5, −15, mirrored) |
| 4 | rules | unit model | free slot `a` rot 179 / 180 / −179 | `right/a` rot −179 / 180 / 179 |
| 5 | rules | unit model | root offset (10, 0) rot 90; free slot `a` offset (3, 5) | `left/a` (5, 3, 90); `right/a` (5, −3, 90, mirrored); `right/root` (10, 0, 90, mirrored) |
| 6 | rules | unit model | free slot `a` offset (−30, 0); free slot `b` anchored to `a` at `edge-left` / `corner-tl` | `right/b` frame and anchorAt at (39, 0) / (39, 9): `right/a`'s frame (30, 0) plus `edge-right` (9, 0) / `corner-tr` (9, 9) |
| 7 | rules | unit model | root holding slot `a` | ids `[left/a, left/root, right/a, right/root]` |
| 8 | rules | unit model | free slots `a` anchored to `b` and `b` to `a` | `right/a`, `right/b`: placed false, frame and anchorAt NaN, mirrored |
| 9 | rules | unit model | slot whose part doesn't resolve | `right/<slot>` kind, part and fit equal `left/<slot>`'s (fit `stand-in`) |
| 10 | rules | unit model | createDerivations with form split mirrored / unibody / split reversible | violations `[{ kind: 'unsupported-form', severity: 'error', ids: [design id], message: unsupportedFormMessage([design id]), fixes: [] }]` and placements zero rows / the same / no `unsupported-form`, placements hold both sides |
| 11 | rules | unit model | `unsupportedFormMessage([d])`; `unsupportedFormViolation(d)` | the agreed text, whole; `{ kind: 'unsupported-form', severity: 'error', ids: [d], message: <the agreed text>, fixes: [] }` |
| 12 | rules | unit geometry | `apply(reflectionAcrossY(), (3, 5))` | (−3, 5) |
| 13 | rules | unit model | free group `g` offset (−20, 0) rot 90 holding free slot `s` offset (0, 10) | `left/s` (−30, 0, 90); `right/s` (30, 0, −90, mirrored); `right/g` (20, 0, −90, mirrored) |
| 14 | rules | unit model | root with no children (empty layout) | ids `[left/root, right/root]` |

</frozen-after-approval>

## Code Map

- `packages/model/src/placement/place-layout.ts:28` -- `const SIDE = 'left'`; `:30-32` the comment "The authored side's placements; the right side is derived from them", which goes stale; `:44-46` the root's world matrix `root` and `inWorld`; `:48-61` one row per graph node from `relative.anchor` and `relative.frame`. The right rows are built here from the same `relative`, not by a second placement.
- `packages/model/src/placement/layout-row.ts:9-24` -- `rowOf(fields, anchor, frame)` writes `mirrored: false` and `UNPLACED`; gains the side's mirroring.
- `packages/geometry/src/affine.ts` -- `translation`, `rotation`; no reflection, no inverse. `compose`, `frameOf` (`frame-of.ts:8` wraps −180 to 180), `apply` in their own files, re-exported from `index.ts`.
- `packages/model/src/ids/{side-qualified-id,types}.ts` -- `sideQualifiedId(side, id)`, `PlacementSide = 'left' | 'right' | 'whole'`.
- `packages/model/src/parts/create-derivations.ts:144-155` -- `placements` and `violations` computeds, gated by `isSupportedForm(form.value)` (`form/is-supported-form.ts`); the unsupported branch returns `parts.value.violations`, which is `[]` (`:51-52`). The design id is `design.value.meta.id`.
- `packages/model/src/violations/{dependency-cycle-message,layout-violations}.ts` -- message precedent: one function, ids in, string out; `layout-violations.ts:8-27` builds whole `Violation` objects (`fixes: []`) that `createDerivations` only calls. `packages/model/src/worker.ts` exports the worker's messages; `main.ts` exports only those main's rejections also build.
- `packages/schema/src/types.ts:203-208` -- `ViolationKind`; add `'unsupported-form'`.
- `packages/protocol/src/layout-output/layout-output-codec.spec.ts:19,28` -- `mirrored: true` already round-trips; no codec change.
- `packages/commands/src/design/new-design.ts:21-33` -- "The free root group is the split form's center"; form split reversible.
- `packages/editor/src/workspace/layout/use-placed-nodes.ts:18-27` -- draws every placed row but the root, by node id; `CanvasSlot.vue:18-19` already applies `scale(-1, 1)`. Unchanged: the right half appears on the canvas with no editor change (13.32's ticket: "right-side rows included once 13.6 posts them").
- `app/src/layout-set.spec.ts:22-44` -- `arrange` (the real model worker behind `ModelWorkerLifecycle`), `runCorneyScript`; `:85-95` a unibody design through `replaceDesign`. The pattern for rows 1 and 2, which read what the worker posts: `lifecycle.layout` with `readLayoutRow` (`protocol`), and `lifecycle.issues` (`model-worker-lifecycle.ts:34`).
- `packages/model/src/placement/place-layout.spec.ts:56-73` -- `frameAt` reads `left/` only; `at` and `about` hard-code `mirrored: false`; `:271-276` narrows with `expect.objectContaining({ mirrored: false })`.
- Specs the change breaks (whole id lists gain `right/` ids): `packages/model/src/placement/place-layout.spec.ts:88,279`, `packages/model/src/parts/create-derivations.spec.ts:640-708`, `app/src/corney-column.spec.ts:125`; and `create-derivations.spec.ts:728-737` "reports no layout violation and places nothing for an unsupported form", which asserts `violations: []`. `corney-left-half.spec.ts:63` already keeps `left/` rows only; `create-derivations.spec.ts:624-633,646-655` (zero rows, no lane run) stay true.

## Tasks & Acceptance

**Execution:**
- [x] `packages/geometry/src/affine.ts`, `index.ts` -- `reflectionAcrossY()` (function): the matrix `[-1, 0, 0, 1, 0, 0]`; spec row 12 in `affine.spec.ts`.
- [x] `packages/model/src/placement/{layout-row,place-layout}.ts` -- `rowOf(fields, mirrored, anchor, frame)` (function): when `mirrored`, it reads each frame from `compose(frame, reflectionAcrossY())`, and it writes `mirrored` on the row, placed or not; `placeLayout` (function) emits both sides per node, each world `compose(compose(root, mirror), relative)`; the stale sentence of its header comment ("The authored side's placements; the right side is derived from them.") is deleted and the why about children before parents kept. Spec rows 3–9, 13 and 14 in `place-layout.spec.ts`: `frameAt` takes the side, `at` and `about` take `mirrored`, the narrowing at `:271-276` becomes a whole row; new tests named for their role (`reflects a turned slot across center's y-axis`), numbers in `it.each` parameters or `expected*` constants.
- [x] `packages/schema/src/types.ts` -- `'unsupported-form'` in `ViolationKind`.
- [x] `packages/model/src/violations/unsupported-form-message.ts` -- `unsupportedFormMessage(ids)` (function); `violations/unsupported-form-violation.ts` -- `unsupportedFormViolation(designId)` (function), the whole violation with `fixes: []`; both exported from `worker.ts`; spec row 11.
- [x] `packages/model/src/parts/create-derivations.ts` -- the unsupported branch of `violations` returns `[unsupportedFormViolation(design.value.meta.id)]`; spec row 10, replacing the test at `create-derivations.spec.ts:728-737`.
- [x] `app/src/right-half.spec.ts` -- rows 1 and 2, with its own `arrange` and `runCorneyScript` as `layout-set.spec.ts:22-44` has them.
- [x] The other broken specs in the Code Map -- add the `right/` ids, assert whole.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row has a passing test at its level.
- Given rows 1 and 2, when the implementer breaks the wiring each covers (right rows not reflected, `createDerivations` reporting nothing for an unsupported form), then that test goes red; each is named in the PR.

## Implementation Notes

- Decision (build): `right-half.spec.ts` reads rows with `lifecycle.layoutRow(id)`, not `protocol`'s `readLayoutRow` as the Code Map said, because `app`'s graph in `.dependency-cruiser.mts:83-100` does not list `protocol`; `layout-set.spec.ts:54` already reads `.layoutRow(…)`.
- Decision (build): `createDerivations` reads the design id through its own computed `designId`, not `design.value.meta.id` inside `violations`, following the file's own pattern (`create-derivations.ts:47-49`: `gap`, `form` as computeds over `design.value.meta`), so `violations` does not depend on the whole design.
- Decision (build): row 9 arranges the stand-in as a `ResolvedParts` stand-in run, not an unresolved part reference, because AGENTS.md: "a stage gets the outputs it reads as inputs"; `placeLayout` reads only resolved parts.
- Decision (build): `about` in `place-layout.spec.ts` drops its `digits` parameter for `mirrored`, not `mirrored` after `digits`, because no caller passed `digits` (`grep` of the spec before the change).
- Decision (build): row 1's expected `rot` wraps −180 to 180, not plain negation, because the frozen boundary-table preamble says "−rot wrapped to (−180, 180]".
- Structural changes: none (`git diff --name-only` since baseline names no tsconfig, package.json, workspace, Vitest, ESLint, Stryker or dependency-cruiser file, no `declare global`/`module`).
- Real-host run: no third-party fake in the diff (`MemoryBackend` is the repo's own `storage` fake, exempt).
- Toggled bugs (implementer): right mirror set to `IDENTITY` turned row 1 red; the unsupported branch returning `[]` turned both row 2 cases red; Chromium and Firefox; restored.
- Verification: `pnpm test` 620 files, 4992 tests passed; typecheck, lint, depcruise, format:check clean.

## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer), diff since `3008fd4`:
- medium, patch: `right-half.spec.ts` row 2 asserts only the layout output and waits on the issues' seq; frozen row 2's "posted Layout set zero rows" includes parts, and the layout read can be a stale set (precedent `layout-set.spec.ts:100-109` asserts both seqs and both outputs). Quick + test-reviewer #2, one root cause.
- low, patch: row 9 test narrows with `fieldsOf` (AGENTS.md "assert whole values").
- low, patch: row 4 test name carries `(−180, 180]` (AGENTS.md "numbers go in parameters or `expected*` constants").
- low, patch: `place-layout.spec.ts:2` relative import inside the package import block.
- low, patch: `create-derivations.spec.ts` reversible test arranges an unread `id` (AGENTS.md "Arrange only what the test uses").
- low, patch: `place-layout.ts:35` comment line 114 characters after the deleted sentence.
- low, reject: `reflected`'s `rot === 180 ? 180 : -rot` branch is test logic, but it is the frozen preamble's "−rot wrapped to (−180, 180]", and the wrap is pinned at unit level by row 4; Corney has no half-turn key, so it is never met.
- low, reject: `unsupportedFormMessage` reads `ids[0]` only; its one caller, `unsupportedFormViolation`, always passes one id, and the ids-in signature is the spine's "built by one `model` function from its kind and ids".
- false: reversible test asserting `violations: []` is "stricter than row 10"; asserting the whole value is AGENTS.md's rule, and `onSlots` reaches no other violation.
- false: inline expected frames (`at(-20, 5, 15)`) in rows 3, 5, 13; AGENTS.md's numbers rule is about test names ("Name the boundary's role … numbers go in parameters or `expected*` constants"), and the values are the boundary table's.

Pass 2 (quick, test-reviewer), the four patched files' diff since `3008fd4`; nothing above low, no frozen line broken, so the review ends and its lows are logged, not patched:
- false: row 2 reads parts/layout seqs once without polling; `layoutSetArrived` is true only when both posted seqs equal the store's current seq (`model-worker-lifecycle.ts:50-52`), so no stale set is read.
- false: row 1 never compares the layout seq; same guard, `layoutSetArrived` polled after the script ran.
- carried: `reflected`'s `rot === 180` branch -- low, reject (pass 1).
- carried: `unsupportedFormMessage` with empty ids -- low, reject (pass 1).
- false: `swaps attach points` and row 9 use `toMatchObject`; AGENTS.md names `toMatchObject` as a whole-value assertion ("assert whole values (`toEqual`, `toMatchObject`)").
- low, logged: the edited chain test now asserts `anchorAt` (0, 19/0/38) on every row; the values follow the preamble's 1u slots and gap 1, and a group's `anchorAt` at its parent origin is the Data Schema's "a free child's parent origin".
- low, logged: `about`'s `mirrored` parameter has no caller passing `true` (`place-layout.spec.ts:72-77`); the plan's task asked for it.
- low, logged: `reports no unsupported-form and places both sides for split with board reversible` repeats the placements of `:636-653`; it adds row 10's `violations: []`.
- low, logged: row 2's unibody case repeats `layout-set.spec.ts:85-109`'s zero rows; it adds the posted violation.

## Design Notes

```ts
// place-layout.ts, per node, inside the existing loop
const sides = [['left', IDENTITY], ['right', reflectionAcrossY()]] as const
for (const [side, mirror] of sides) {
  const world = (m: Matrix) => compose(compose(root, mirror), m)
  rows.set(sideQualifiedId(side, id), rowOf(fields, side === 'right', relative.map(({ anchor }) => world(anchor)), relative.map(({ frame }) => world(frame))))
}
// layout-row.ts: const read = (m: Matrix) => frameOf(mirrored ? compose(m, reflectionAcrossY()) : m)
```

- Decision (plan): the right side is reflected inside `placeLayout` from each node's frame relative to the root, `C·S·R`, not by a pass over the posted left rows, because a pass over world frames needs `C⁻¹` (`C·S·C⁻¹·W`) and `geometry` has no inverse (`affine.ts` exports `translation` and `rotation` only), while `placeLayout` already holds `root` and each `relative` (`place-layout.ts:44-58`).
- Decision (plan): the reflection matrix is `geometry`'s `reflectionAcrossY()`, not a literal in `model`, because AGENTS.md: "shared pure logic goes in a cohesive kernel package, one concept per package (as `reactive` and `geometry` are)".
- Decision (plan): a right row's frame is read from `world·S`, not `frameOf(world)`, because AD-22 draws a posted frame as `translate(x, y) rotate(rot) scale(mirrored ? -1 : 1, 1)`, which equals `world` only when `rot` is read after undoing the scale; `frameOf` on a reflected matrix gives `atan2` of a flipped basis.
- Decision (plan): `right/root` is posted, not left out, because the Data Schema gives one id "per side placement, slots and groups" and the ticket checks "every right row is its left row reflected"; the canvas already skips the root by node id (`use-placed-nodes.ts:22`).
- Decision (plan): an unplaced right row is `mirrored: true`, not `false`, because the Data Schema puts `mirrored` "on right-side rows", placed or not.
- Decision (plan): `unsupportedFormMessage(ids)` takes ids only, not the form, because Consistency Conventions: "Each kind's message is built by one `model` function from its kind and ids".
- Decision (plan): `unsupportedFormMessage` is exported from `model/worker` only, not also `model/main`, because only `createDerivations` reports it (ticket) and no command rejects with it; `main.ts`'s messages are there for main's rejections (`dependencyCycleMessage` in `checkSetAnchor`).
- Decision (plan): `unsupportedFormViolation`'s `fixes` is `[]`, not a fix, because no registered command changes an open design's `meta.form` (only `NewDesign` sets one, on a new design, `new-design.ts:26`), and the spine's fixes "possibly empty" (Consistency Conventions, Violations).
- Decision (plan): `reflectionAcrossY` is named for the matrix it returns, not after a glossary term, because the glossary has no term for a matrix; it uses AD-6's verb ("reflected across the y-axis of `center`'s frame").
- Decision (plan): rows 1 and 2 read the real model worker's posts through `ModelWorkerLifecycle`, not `createDerivations` wired by hand (`corney-left-half.spec.ts:31-44`), because the ticket says "post the Layout set" and "in the posted issues".
- Decision (plan): row 1's expected right rows are the posted left rows through the preamble's reflection, `(−x, y, −rot)`, plus one literal row, not every right row as a literal, because the ticket states the requirement as that relation ("every right row is its left row reflected across center's y-axis") and it is not production's path (production composes matrices, `C·S·R` then `·S`).
- Decision (plan): rows 1 and 2 run in `app`'s browser-mode specs, not Node, because the real QuickJS engine doesn't run under Node (13.4's plan: 15 of 15 blueprint specs fail under `environment: 'node'`).

Visible: `pnpm dev`, open `/?seed=corney`: the right half appears mirrored at x > 0, beside the left, at full opacity and with no mirror axis (13.8 adds both); selecting a key highlights it on both halves, since selection holds node ids, and the two halves' keys share one accessible name (`CanvasSlot.vue`'s `:label="placed.id"`), so a real-worker test that finds a key by role and name finds two (13.8 makes the sides selectable apart). For the same reason, F with a key selected fits both of its copies, the span between the halves, not the one key (`canvas-items.ts:18`, `viewport.ts:87-95`); F with nothing selected still fits the whole board. 13.8's verify gains "F with right/thumbfan-near-home selected fits that one key" (Sergii, 2026-11-13).

## Conformance Log

- F1 (both readers) `rowOf(fields, side === 'right', … world(frame))` against `frameOf(world·S)`: sketch and task rewritten, `rowOf` reads `compose(frame, mirror)` -- fixed
- F2 compose called with three matrices -- fixed (nested two-argument calls)
- `create-derivations.spec.ts:728-737` asserts `violations: []`, missing from the broken list (AGENTS.md "Never delete, skip or weaken a failing test") -- fixed
- Row 1 expected from the run's own left rows ("no expected value computed the way production computes it") -- fixed (relation from the ticket, plus a literal row; decision added)
- Preamble's world-axis mirror contradicts AD-6 "across the y-axis of `center`'s frame" -- fixed (stated for a centre at the origin; row 5 the moved case)
- Row 1 wiring not pinned; ticket "post the Layout set" -- fixed (`ModelWorkerLifecycle`, `layout-set.spec.ts` pattern)
- Row 2 re-tests the rule ("Test a rule where it is defined") -- fixed (asserts the posted violation by `unsupportedFormViolation`)
- `fixes` undecided ("A choice no requirement made is a decision") -- fixed (decision)
- Violation built inline, no file or tag ("a new concept gets a new file") -- fixed (`unsupportedFormViolation`, function)
- Stale comment `place-layout.ts:30` ("Write a comment only for a why") -- fixed
- `reflectionAcrossY` not a glossary term ("Glossary terms only") -- fixed (decision)
- Precedent `place-layout.spec.ts` names with numbers (`:99`, `:130`) -- deferred; new tests follow the rule
- Precedent `place-layout.spec.ts:271-276` narrows with `objectContaining` ("assert whole values") -- fixed (the edited test asserts the whole row)
- Precedent `frameAt`, `at`, `about` fix the side and `mirrored: false` -- fixed (task names the helper changes)
- No row inside a turned nested group ("add an input that breaks an assumption") -- fixed (row 13)
- Helpers for row 1 copied or shared -- fixed (own `arrange`, as `layout-set.spec.ts`)
- gap: `packages/model/src/parts/create-derivations.spec.ts:728-737` -- fixed
- Final pass: header comment "says both sides are placed" is a what ("Write a comment only for a why") -- fixed (sentence deleted)
- Final pass: `No side-qualified ids for the existing layout violations.` against AD-6 "Keymap, overrides, pads and violations use side-qualified ids." -- asked (Sergii: leave it out)
- Final pass: `place-layout.spec.ts` number names deferred -- deferred (the workflow's precedent rule: plan follows the rule, deferred-work.md entry)
- Final pass: rows 2 and 10 expect `unsupportedFormViolation(…)`, a function the requirement doesn't name ("no expected value computed the way production computes it") -- fixed (fields literal, only `unsupportedFormMessage` called)
- Final pass (📐): `mirrored: mirror !== IDENTITY` compares by reference -- fixed (`rowOf` takes a boolean)
- Final pass (📐): no empty-layout row ("add empty input") -- fixed (row 14)
- Final pass (📐): two canvas keys share one accessible name -- fixed (named under Visible)

## Verification

**Commands:**
- `pnpm test` -- expected: all green.
- `pnpm typecheck`, `pnpm lint`, `pnpm depcruise`, `pnpm format:check` -- expected: clean.
