---
title: 'Inspector edits a node''s offset and chain'
type: 'feature'
ticket: '5'
created: '2026-11-18'
status: 'done'
baseline_revision: 'b1a7c5f3a3ed709370d34ad3ce58fdbb31570ac0'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: [quick, test-reviewer]
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md'
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-change-a-parameter/tickets/story-expression-field-edits-the-gap-plan.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A selected node's offset and arrangement change only through scripts: the Layout inspector shows Design settings while nothing is selected and nothing for a selection.

**Approach:** Build `layout.setOffset` and `layout.setArrangement` with one `model` check each, and a node inspector in `editor` with an Anchor section (read-only), an Offset section of 14.10's expression fields and a Chain section, each field showing the value common to the selection or `mixed`, and each edit one command over every selected id.

## Boundaries & Constraints

**Always:**
- The inspector shows node sections while the selection holds one or more ids and none is a right id; a right id shows no node sections, because 14.12 builds the right half's read-only fields ("A right-half node shows its anchor, offset and chain read-only").
- A section shows only when it applies to every selected node; a field whose text differs across them is empty with the placeholder `mixed` (EXPERIENCE: "differing values show `mixed`"; "`mixed` placeholder; slots + groups show common fields only").
- An edit runs one command naming every selected node id (`nodeIdOf`), with the field session's coalesce key, so one session over many nodes is one undo entry.
- Offset fields: `x`, `y` (position), `rot` (rotation), labels from the mockup (`key-layout.html`, Offset section), and for groups `pivot x`, `pivot y`, because EXPERIENCE's Rotation handle row says "a group's pivot defaults to its group origin and is editable in the group inspector (Offset → pivot). Pivot shows only while every selected node is a group, not for a slot or a group-and-slot selection, because that row names only the group inspector and the Inspector row shows "fields common to all". A mixed field focused and left untouched runs nothing, as `ExpressionField` already runs only typed text (`ExpressionField.vue:130-131`, `if (!pending) return`).
- Decision (Sergii 2026-11-18): an offset field of a node with no value set shows the default as text (`0mm` for x, y, pivot x and pivot y, `0deg` for rot), and the inspector sends no `null` in 14.5; setOffset's `null` stays command-only until a story asks for a reset. Not an empty field that clears on commit, because a field that shows text for some nodes and is empty for others shows one value two ways, and clearing one axis cannot leave a half-set `Vec2`.
- Decision (Sergii 2026-11-18): the Anchor section is one read-only row labelled `anchor`: `<slot id> · <attach>` for a slot anchor (`center` when the attach is omitted, AD-3), `<group id>` for a group anchor, `default` when unset; a chain child shows `chain <parent id> · <n+1> of <count>` in that row instead (EXPERIENCE, Open Items); differing texts read `mixed`. Not the mockup's separate `anchor` and `attach` rows, because the attach would show twice.
- Chain section shows for a selection of groups only.
- Decision (Sergii 2026-11-18): the Chain section is one segmented control labelled `arrangement` with options `free`, `chain x`, `chain y` (`UiSegmentedControl`); each pick runs one setArrangement over every selected group, and groups that differ show no option checked. Not two controls (`chain | free` plus an axis), because a free group picked as chain would need a hidden default axis (AD-4: "chain has an axis (`x` or `y`)").
- Decision (Sergii 2026-11-18): a refused pick leaves the control on the design's value and shows the refusal's `rejectionText` below it, cleared at the next pick or when the selection changes, as an expression field shows its own; not snapping back silently until a toast story, because the spine's `rejectionText` is for "every surface (a form's reason, the palette, menus, toasts)" and no toast exists yet.
- The section heading reads `Chain` and its file is `ChainSection.vue`, not `Arrangement`, because EXPERIENCE's Layout row names the inspector's parts "anchor, offset, chain" and the mockup's heading is `Chain`.
- Esc, the typing pause, Enter and blur behave as 14.10's expression field does (no change to `ExpressionField`'s session logic).

**Never:**
- Editing the anchor (15.6's picker), the right half (14.12), a group's default part (14.11), the Part field and This slot (14.15).
- Collapsible sections or remembered open sections (EXPERIENCE's `[ASSUMPTION]`; no ticket asks for them).
- Undo hotkeys (16.4's).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Offset after pause | column `c` selected, type `5mm` in x, wait 300 ms | `c.offset.position` = `{ x: '5mm', y: '0mm' }` | none |
| One session | `5mm`, pause, `6mm`, Enter | one undo restores no offset | none |
| Esc after apply | pause applied `5mm`, Esc | design keeps `5mm`, focus on the canvas | none |
| Multi | `a` and `b` selected, type `2mm` in x, Enter | both x = `2mm`, one undo entry | none |
| Mixed | `a` x `1mm`, `b` x `2mm` | x empty, placeholder `mixed` | none |
| Clear | `setOffset { ids: [a], rotation: null }` on rotation `5deg` | `a.offset` has no rotation | none |
| Chain clears anchors | free `g`, child `k` anchored to `s`, offset x `3mm`; `setArrangement { ids: [g], arrangement: 'chain', axis: 'x' }` | `k` has no anchor, offset x `3mm` | none |
| Bad unit | `5deg` in x | `input-invalid` "Not a quantity in mm.", design unchanged | aria-invalid |

</frozen-after-approval>

## Code Map

- `packages/schema/src/offset.ts:6-10` `offsetSchema` (`position?`, `rotation?`, `pivot?`); `vec2.ts:5` (`x`, `y`: `deltaSchema`); `angle.ts`; `layout.ts:17-30` chain group `arrangement: 'chain'`, `axis: 'x' | 'y'`, free has no `axis`; `layout.ts:47-50,74-85` a chain child has no `anchor`. `index.ts:49-52` exports `deltaSchema`, `angleSchema`, `vec2Schema`, `offsetSchema`. Builders `testing/layout.ts` (`aSlot`, `aFreeGroup`, `aChainGroup`, `aLayout`), `testing/offset.ts` `anOffset`, `testing/vec2.ts` `aVec2`, `testing/anchor.ts`.
- `packages/commands/src/layout/set-gap.ts`, `set-gap-input-schema.ts`, `types.ts:8,15`, `layout-commands-module.ts:9,18`, `commands/src/index.ts` -- the command pattern (`available` and `apply` both call the model check, `set-gap.ts:15-26`); `set-gap.spec.ts:24-38` copy only its container and `replaceDesign` wiring: its `arrangedDesign` hides the `1mm` gap its assertions read, so the new specs pass the offsets and anchors they read as `arrange` arguments and derive expectations from them.
- `packages/model/src/layout-editing/check-set-gap.ts:14-38` -- evaluating given fields with `evaluateFieldExpression`, refusing the first fault with `expressionFaultMessage`, passing `reads-failed-parameter`; `check-delete-node.ts:17-20` -- every missing id in one `unknown-target`; `check-set-anchor.ts:24-33` -- a chain parent read through `dependencyGraph`; `node-tree.ts:6-21,41-45` `findNode`, `isGroup` (not exported from `main.ts`); `set-anchor.ts:18-22` deletes a cleared field.
- `packages/model/src/check-structure.ts:27-34,57-80` -- `checkCycles` and private `addedLoop(was, is)` (line ~81): only a loop through an added edge is refused, `dependency-cycle` with `dependencyCycleMessage(ids, 'nodes')`.
- `packages/model/src/main.ts` -- exports; `ids/side-qualified-id.ts:12,23` `nodeIdOf`, `sideOf`.
- `packages/editor/src/workspace/layout/LayoutInspector.vue:9` -- renders `DesignSettings` only while `ids.length === 0`; `design-settings/DesignSettings.vue` -- the section and `ExpressionField` wiring to copy (`invoke(Handle, input, options)`, `aria-labelledby` heading, `text-section-label`).
- `packages/editor/src/expression-field/ExpressionField.vue`, `types.ts:17-24` -- props `label`, `expression`, `schema`, `run`; `watch` at `:59-64` replaces the text only while unfocused.
- `packages/ui/src/autocomplete-field/types.ts:3-10` -- no `placeholder` prop; `ui/src/text-field/UiTextField.vue:15` has one (the look to copy).
- `packages/ui/src/segmented-control/` -- `UiSegmentedControl` on Reka `RadioGroupRoot`, `v-model` string, props `label`, `options`.
- `packages/editor/src/selection/selection.ts:9-15` `ids: PlacementId[]`; `selects-right-half.ts:6-8`; `use-selection.ts`.
- `packages/editor/src/workspace/layout/design-settings/design-settings.spec.ts:17-27` -- the inspector browser-spec arrange (`mountShell`, `Selection.select`, design passed in).
- `app/src/gap.spec.ts` -- its second test is the registration row pattern; its first test's name carries numbers and is not copied (`main-modules` container, `replaceDesign` with `aDesign`).

## Tasks & Acceptance

**Execution:**
- [x] `packages/model/src/dependencies/added-loop.ts` (function), `added-loop.spec.ts`, `check-structure.ts` -- the private `addedLoop(was, is)` moves to its own file, unchanged, imported by `checkCycles` (both layers) and `checkSetArrangement`; its rule's spec moves with it (a loop through an added edge is found; a loop already in `was` is not).
- [x] `packages/model/src/layout-editing/check-set-offset.ts` (function), `set-offset.ts` (function), `types.ts` (`OffsetEdit`) -- `checkSetOffset(design, ids, edit)`: every missing id in one `unknown-target`; then each given expression in `offsetSchema`'s order (position x, position y, rotation, pivot x, pivot y) through `evaluateFieldExpression` against `deltaSchema` / `angleSchema`, refusing the first fault with ids = every given id (deduplicated); one that reads a failed parameter passes, as `check-set-gap.ts:29` does. `setOffset(design, ids, edit): void`, unchecked like `model`'s `set-gap.ts`: `null` deletes that field; a position or pivot axis given where none is set fills the other axis with `0mm`; an offset left empty is deleted; an edit with no field, or `{}` for position or pivot, changes nothing.
- [x] `packages/model/src/layout-editing/check-set-arrangement.ts` (function), `set-arrangement.ts` (function), `arrange-group.ts` (function), `types.ts` (`ArrangementEdit`) -- `arrangeGroup(group, edit)` is the unchecked edit: `chain` sets `axis` and deletes every child's `anchor`; `free` deletes `axis`. `checkSetArrangement(design, ids, edit)`: missing or slot ids in one `unknown-target`; then applies `arrangeGroup` to each group of `structuredClone(design)` and refuses `addedLoop(resolvedDependencies(dependencyGraph(…)))` of before and after as `dependency-cycle` with `dependencyCycleMessage(ids, 'nodes')`. `setArrangement(design, ids, edit): void` is unchecked, calling `arrangeGroup` on each group. Both commands follow `commands`' `set-gap.ts:15-26`: `available` returns the check, `apply` runs the check and then the unchecked operation.
- [x] `packages/model/src/main.ts` -- exports the four functions, `findNode`, `isGroup`, `OffsetEdit`, `ArrangementEdit`.
- [x] `packages/commands/src/layout/set-offset.ts` (`SetOffset`, service), `set-offset-input-schema.ts`, `set-arrangement.ts` (`SetArrangement`, service), `set-arrangement-input-schema.ts`, `types.ts`, `layout-commands-module.ts`, `index.ts` -- `layout.setOffset` label `Set offset`, input `{ ids: Id[] ≥ 1, position?: { x?, y? } | null, rotation?: Angle | null, pivot?: { x?, y? } | null }`; `layout.setArrangement` label `Set arrangement`, input `v.variant('arrangement', [{ ids, arrangement: 'chain', axis }, { ids, arrangement: 'free' }])`.
- [x] `packages/ui/src/autocomplete-field/UiAutocompleteField.vue`, `types.ts`, `AutocompleteField.spec.ts`, `ui/workbench/states/autocomplete-field-states.ts` -- `placeholder?` prop on the input, UiTextField's look; a state `empty with a placeholder`, as `text-field-states.ts` has, mounted by the glue row.
- [x] `packages/ui/workbench/states/segmented-control-states.ts`, `ui/src/segmented-control/SegmentedControl.spec.ts` -- a state `none checked` (the mixed arrangement) and a named test mounting it that asserts every radio unchecked; `AutocompleteField.spec.ts` gains a named test asserting the input's placeholder is the state's `placeholder` prop.
- [x] `packages/editor/src/expression-field/ExpressionField.vue`, `types.ts` -- `placeholder?` passed through.
- [x] `packages/editor/src/workspace/layout/node-inspector/NodeInspector.vue` (component), `AnchorSection.vue`, `OffsetSection.vue`, `ChainSection.vue` (components), `common-text.ts` (function: one text if all equal, else `undefined`), `anchor-text.ts` (function), `chain-position.ts` (function: `chain <parent> · <n+1> of <count>`), `offset-texts.ts` (function: a node's shown x, y, rot, pivot x, pivot y, each unset one as its default text), `arrangement-option.ts` (function: the option `free`, `chain x` or `chain y` a group shows), `types.ts` -- `NodeInspector` owns the lookup: the selection's ids through `nodeIdOf`, deduplicated (`left/a` and `whole/a` name one node), each found with `findNode` over `useOpenDesign`; it passes each section `nodes: Frozen<Node>[]` (and, for the Anchor section, each node's chain parent from `findNode`'s `parent` and `index`), declared in `node-inspector/types.ts`; the sections run `invoke(SetOffset | SetArrangement, …, options)`.
- [x] `packages/editor/src/workspace/layout/LayoutInspector.vue` -- `NodeInspector` while ids are selected.
- [x] `app/src/node-editing.spec.ts` -- registration rows for both commands.
- [x] Specs per the Boundary Table. A refusal row asserts `kind` and `ids` and leaves the message to the model's message specs, not `unitMismatchMessage(...)` as the expected value as `set-gap.spec.ts` does. The browser rows test 14.5's wiring only; the pause, Esc and session behaviour stay tested where 14.10 defined them (`expression-field.spec.ts`).
- [x] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` (docs commit to main) -- precedent entry: `commands/src/layout/set-gap.spec.ts`'s `message: unitMismatchMessage([DESIGN_ID])` against AGENTS.md's "no expected value computed the way production computes it".

**Acceptance Criteria:**
- Given every existing spec, when `pnpm test` runs, then they pass.
- Given `pnpm dev` with Corney open, when a column is selected and `5mm` typed into its offset x, then the column's keys move 5 mm after the pause and one undo moves them back.

## Implementation Notes

- The `deferred-work.md` precedent entry is written in the working tree but not committed: it belongs in a docs commit on main, apart from the PR branch.
- Toggled bugs, each red then restored (chromium; the app row in node): no coalesce key in `OffsetSection` (session row), one id instead of all (multi row), `NodeInspector` ignoring right ids (right-id row), no refusal text in `ChainSection` (refused and cleared rows), no placeholder binding in `UiAutocompleteField` (ui glue row), `SetArrangement` unregistered (app registration row).
- Verification: `pnpm typecheck && pnpm check:fast` clean; `pnpm test` 875 files / 6526 tests green. No priority package changed, so no Stryker run. The manual `pnpm dev` check with Corney is not run (left for the look halt).
- `Decision (build):` `arrangeGroup` changes the group's arrangement in place through one cast, not by replacing the node object in its parent, because the patch then touches only the changed fields and `arrangeGroup` needs no parent.
- `Decision (build):` checkSetArrangement's `unknown-target` reads `The design has no group with the id "s".`, inline as `checkAddNode`'s is, not `unknownNodeMessage`, because a slot id names a node the design has.
- `Decision (build):` ids are deduplicated in first-seen order in both checks and both operations, not sorted, because the selection's order is the person's and the refusal names them as given.
- Decision (Sergii 2026-11-18): the Anchor row is a `dl` (`dt` `anchor`, `dd` text, `mixed` muted), not a read-only text field, because nothing edits it in 14.5 and a field would offer focus with nothing to do.
- `Decision (build):` unchecked `setOffset` and `setArrangement` skip an id that names no node (or no group), not throw, because both commands run the check first and refuse such ids (`unknown-target`); the operation alone is never called with them.
- Orchestrator check: `checkAddNode`'s inline message (`check-add-node.ts:18`), the field error paragraph (`UiAutocompleteField.vue:140-142`) and Reka's `passive: props.modelValue === void 0` (`RadioGroupRoot.js:66-69`) read and confirmed; the first-seen order follows `selection.ts:8` ("In selection order"). Key order of `axis` after `children` does not reach the revision: `hashing`'s `encodeCanonical` sorts keys (`canonical-encoding.ts:3`).
- Structural changes: none (no tsconfig, package.json, workspace, Vitest, ESLint, Stryker or dependency-cruiser change; no `declare global` or `declare module`).
- Real-host run: no spec in the diff fakes a third-party host or boundary; browser specs run real Reka, a real `DesignStore` and Vitest fake timers.
- Verification (step 3, orchestrator): `pnpm typecheck && pnpm check:fast && pnpm test` exit 0, 875 files / 6526 tests.
- Matrix audit: Multi, Mixed, Chain clears anchors, Clear, Bad unit, One session have direct tests (`node-inspector.spec.ts`, `set-offset.spec.ts`, `set-arrangement.spec.ts`); Offset after pause by the session row with the `{ x, y: '0mm' }` fill in `set-offset.spec.ts` and the pause rows of 14.10's `expression-field.spec.ts`; Esc after apply by 14.10's Esc rows (`expression-field.spec.ts:100-102`, canvas focus), which this field reuses unchanged.
- `Decision (build):` the Chain section's refusal is a plain paragraph below the control (`▲` and the text, as a field's error), not a live region, because the expression field's error is not one either; making refusals announced is a cross-surface question.
- `Decision (build):` the mixed arrangement passes `''` as the control's value, not `undefined`, because Reka's `RadioGroupRoot` turns uncontrolled for an `undefined` model (`passive: props.modelValue === void 0`, `RadioGroup/RadioGroupRoot.js:66-69`) and would then keep a refused pick checked.

## Plan Change Log

- checkSetArrangement copies the layout with a new `copyNodes` (`node-tree.ts`: every node shallow-copied, other fields shared), not `structuredClone(design)`, because `apply` passes the check an Immer draft and `structuredClone` throws on it (`#<Object> could not be cloned`, checked against `immer`'s `produce`); still not Immer, and still the shared `arrangeGroup`.
- The two model check specs assert refusals inline (`expectErr`, then `toMatchObject({ kind, ids })`), not through a shared `expectRefused` helper, because `vitest/expect-expect` counts only the assertion names listed in `eslint.config.ts` and adding one is a lint-config change.
- The browser refusal rows read the Chain section's `textContent` with `expect.poll`, not `toHaveTextContent` or `getByText`, because both miss text holding `"` (the loop message `"k" → "g" → "k"`): `toHaveTextContent('The nodes form a loop: "k"')` failed against that text while a regex matched.
- `added-loop.spec.ts` holds the two rule rows; `check-structure.spec.ts`'s cycle rows stay, since they test `checkCycles`' use of the rule (layers, order against references).

## Review Triage Log

### Pass 1 (quick, test-reviewer; 0 findings dropped): high 0, medium 1, low 7, false 2, maybe-false 0

- medium, patch -- quick + test-reviewer 1: `clears the refusal when the selection changes` passes with ChainSection's clearing `watch` deleted; selecting slot `s` unmounts the section (`NodeInspector.vue` `v-if="groupsOnly"`), so the remount clears it.
- low, patch -- quick + test-reviewer 5: `REFUSAL = dependencyCycleMessage([K, G], 'nodes')` computes the expected text as production does, against the plan's Specs task.
- low, patch -- quick + test-reviewer 4: `runs nothing for a mixed field focused and left untouched` cannot fail: a run of `''` is `input-invalid` (`expression.ts`, "Not an expression.") and commits nothing either way; renamed to what it proves.
- low, patch -- test-reviewer 1: `it.each` over a one-state filter disappears silently on a rename (`AutocompleteField.spec.ts`, `SegmentedControl.spec.ts`).
- low, patch -- quick: `arrange-group.ts` declares an inline cast type outside `types.ts` with `unknown` fields.
- low, patch -- quick: `node-inspector/types.ts` comments restate signatures; `OffsetField.edit` reaches through `SetOffset.input` while `SetOffsetInput` is exported.
- low, logged -- test-reviewer 8: unchecked `setOffset` and `setArrangement` skip a missing or non-group id; recorded as a build decision (the command always checks first, `set-offset.ts`/`set-arrangement.ts` in `commands`).
- low, reject -- quick: `unknown-target` text "with the id "s", "x"" reads badly for several ids; it repeats `unknownNodeMessage`'s and `checkAddNode`'s existing wording, and changing it is a guard-free rewording of shared text beyond this change.
- false -- quick: acceptance criterion 2 unverified; it is a manual check the plan leaves to the look halt (Verification, Manual checks).
- false -- test-reviewer 4: undo counted synchronously after blur; `store.run` commits synchronously (`design-store.ts` `#runCommand`, `invoke` wraps it with `AsyncResult.fromResult`), as 14.10's pass 1 established.


### Pass 2 (quick, test-reviewer, on the patches; 0 findings dropped): high 0, medium 0, low 8, false 0, maybe-false 0

- low, logged -- quick: pass 1's `OffsetField.edit` row is only half done: `SetOffsetInput` is `v.InferOutput` (branded quantities, `commands/src/layout/types.ts:18`) while `invoke` takes `v.InferInput<H['input']>` (`invoke.ts:35`); five `offset-fields.ts` entries failed to compile against it, so `Omit<v.InferInput<typeof SetOffset.input>, 'ids'>` stays (the comments were deleted).
- low, logged -- quick + test-reviewer 1: the renamed mixed-field test still cannot catch a run on blur; only a transient `aria-invalid` would show it.
- low, logged -- quick: the boundary row `refusal cleared` reads "select `s` then `g`"; the test selects group `h`, because selecting `s` unmounts the section and the row could not fail. Sergii 2026-11-18: the row now reads "select another group `h`".
- low, logged -- quick: the Plan Change Log's `textContent`/`expect.poll` entry is superseded; the refusal rows now use `getByText(/form a loop/)`.
- low, logged -- test-reviewer 2: `checks no option for groups that differ` would pass with no radios rendered.
- low, logged -- test-reviewer 3: the refused-pick test proves the text is in the Chain section, not its position below the control.
- low, logged -- test-reviewer 4: the placeholder glue test reads its expected value from the state.
- low, logged -- test-reviewer 5: `stateNamed` is repeated in two ui specs.

Review ends: pass 2 has nothing above low; its lows are logged, not patched. The `refusal cleared` row was changed by Sergii to match its test.

## Design Notes

`Decision (plan):` setOffset's position and pivot inputs take each axis optionally, not a whole `Vec2`, because the ticket's multi-selection "typing applies to every selected node as one command" and shows "mixed for differing values": a whole `Vec2` from the x field would overwrite every node's differing y.

`Decision (plan):` an axis given where the node has no position or pivot fills the other axis with `0mm`, not refusing the edit, because the schema's `Vec2` requires both axes (`vec2.ts:5`) and an absent offset field is the identity (`schema/testing/offset.ts`, AD-3's "translate by offset").

`Decision (plan):` an offset left with no field is deleted, not kept as `{}`, because the revision is the hash of the canonical design value (glossary) and `{}` would make an unedited and a cleared node differ.

`Decision (plan):` a slot id in setArrangement is `unknown-target`, not a new kind, because `ModelRejectionKind` is a closed union in the Data Schema and the spine already uses `unknown-target` "by AddGroup and AddSlot for a parent that is missing or not a group".

`Decision (plan):` checkSetArrangement refuses the loop a chain closes, not leaving it to the structural check, because AD-2: "a refusal decidable by reading the design and the input … lives in one `model` check function that both call"; a group anchored to its own child that has an explicit anchor closes one when the child falls back to its chain sibling.

`Decision (plan):` setArrangement's input is a variant with `axis` required for `chain` and absent for `free`, not `axis?` with a default, because AD-4 says "chain has an axis (`x` or `y`)" and a free group has none (`layout.ts:25-30`); the spine's `axis?` reads as absent for free.

`Decision (plan):` an expression fault in setOffset names every given id, not the first, because the same text fails for each and the spine says "ids name the node … whose expression fails".

`Decision (plan):` checkSetOffset evaluates in `offsetSchema`'s declared order (position, rotation, pivot; x before y) and refuses the first fault, not every fault, because `checkSetGap` follows its schema's order the same way (`check-set-gap.ts:9-19`) and a `Rejection` carries one kind.

`Decision (plan):` an edit with no field and `{}` for position or pivot change nothing (no undo entry), not `input-invalid`, because 14.10's `SetGap empty | {} | ok, no undo entry` row set that for the sibling setter. Repeated ids act once, not `input-invalid`, because `deleteNodeInputSchema` (`delete-node-input-schema.ts`) takes a plain id array.

`Decision (plan):` `addedLoop` moves to `model/src/dependencies/added-loop.ts`, not staying private in `check-structure.ts` nor copied into the check, because `checkSetArrangement` needs the same rule ("Test a rule where it is defined") and `dependencies/` already holds the graph functions it reads (`dependency-graph.ts`, `anchor-cycle.ts`).

`Decision (plan):` checkSetArrangement builds the edited design with `structuredClone` and the shared unchecked `arrangeGroup`, not Immer and not a second copy of the edit, because the spine prevents "`immer` outside `design`" and one edit function keeps the check and the operation from drifting apart.

`Decision (plan):` mixed compares the shown text, an unset field counting as its default text, not the stored value, because the person sees text, and an unset x and `0mm` place the node alike.

`Decision (plan):` the node lookup reuses `findNode` and `isGroup` exported from `model/main`, not a copy in `editor`, because `editor` reaches `model` only through `main` (`.dependency-cruiser.mts:110`) and "Test a rule where it is defined".

`Decision (plan):` `SetOffset` and `SetArrangement` are `(service)`, not `(function)`, because AD-2 defines every command "as a class registered in `di`".

## Boundary Table

| Group | Row | Input | Expected | Level |
|---|---|---|---|---|
| rules | setOffset position | `{ ids: [a], position: { x: '5mm' } }`, no offset | `a.offset` = `{ position: { x: '5mm', y: '0mm' } }` | unit, model |
| rules | setOffset keeps other axis | `a` position `{ 1mm, 2mm }`, `{ position: { x: '5mm' } }` | `{ x: '5mm', y: '2mm' }` | unit, model |
| rules | setOffset many | `{ ids: [a, b], rotation: '5deg' }` | both rotation `5deg` | unit, model |
| rules | setOffset null field | rotation `5deg`, position set; `{ rotation: null }` | position kept, no rotation | unit, model |
| rules | setOffset null last field | only rotation set; `{ rotation: null }` | `a` has no `offset` | unit, model |
| rules | setOffset null unset | no offset; `{ position: null }` | no `offset` | unit, model |
| rules | setOffset empty edit | `{ ids: [a] }` / `{ ids: [a], position: {} }` on `a` rotation `5deg` | `a.offset` = `{ rotation: '5deg' }` | unit, model |
| rules | setOffset repeated id | `{ ids: [a, a], rotation: '5deg' }` | `a` rotation `5deg` | unit, model |
| rules | SetOffset no-op | `{ ids: [a], position: null }` on no offset; `{ ids: [a] }` | ok, no undo entry | unit, commands |
| rules | checkSetOffset missing | `{ ids: [a, x, y] }`, `x`, `y` absent | `unknown-target`, ids `[x, y]` | unit, model |
| rules | checkSetOffset parameter in mm on rotation | `w` = `2mm`, `{ ids: [a, b], rotation: 'w' }` | `unit-mismatch`, ids `[a, b]` | unit, model |
| rules | checkSetOffset unknown name | `{ position: { x: 'nope' } }` | `unresolvable-reference` | unit, model |
| rules | checkSetOffset negative delta | `{ position: { x: '-3mm' } }` | ok | unit, model |
| rules | checkSetOffset failed parameter | `p` = `q`, `q` = `p`, `{ rotation: 'p' }` | ok | unit, model |
| rules | checkSetOffset order | `{ position: { x: 'nope' }, rotation: 'w' }`, `w` = `2mm` | `unresolvable-reference` | unit, model |
| rules | setArrangement chain | free `g`, `k` anchored to `s`, offset x `3mm` → chain `x` | `g.axis` `x`, `k` no anchor, offset x `3mm` | unit, model |
| rules | setArrangement axis | chain `g` axis `x` → chain `y` | axis `y` | unit, model |
| rules | setArrangement free | chain `g` → free | no `axis` | unit, model |
| rules | checkSetArrangement slot | `{ ids: [s], … }` | `unknown-target`, ids `[s]` | unit, model |
| rules | checkSetArrangement missing | `{ ids: [g, x] }` | `unknown-target`, ids `[x]` | unit, model |
| rules | addedLoop added edge | was `a→b`, is `a→b, b→a` | some `[b, a]` from the changed item | unit, model |
| rules | addedLoop old loop | was and is `a→b, b→a` | none | unit, model |
| rules | checkSetArrangement loop | free `g` anchored to its child `k`, `k` anchored to `s` outside; → chain | `dependency-cycle` | unit, model |
| rules | SetOffset refusal agrees | `available` and `run` on the unit-mismatch row | both kind `unit-mismatch`, ids `[a, b]`, design unchanged | unit, commands |
| rules | SetOffset input | `{ ids: [] }` / `{ ids: [a], rotation: '5mm' }` | `input-invalid` | unit, commands |
| rules | SetArrangement input | `{ ids: [g], arrangement: 'chain' }` / `{ …, arrangement: 'free', axis: 'x' }` | `input-invalid` | unit, commands |
| rules | SetArrangement one entry | `{ ids: [g, h], arrangement: 'chain', axis: 'y' }` | one undo restores both | unit, commands |
| rules | commonText | `['1mm','1mm']` / `['1mm','2mm']` / `[]` | `1mm` / undefined / undefined | unit, editor |
| rules | chainPosition | `k` second of three in chain `thumb` | `chain thumb · 2 of 3` | unit, editor |
| rules | inspector shown | nothing / slot `a` / `right/a` selected | Design settings / node sections / neither | browser, editor |
| rules | x runs setOffset with the session | column `c`, `5mm` in x, pause, `6mm`, Enter | `c.offset` = `{ position: { x: '6mm', y: '0mm' } }`; one undo restores no offset | browser, editor |
| rules | rot and pivot run setOffset | group `g`: `5deg` in rot, Enter; `2mm` in pivot y, Enter | rotation `5deg`; pivot `{ x: '0mm', y: '2mm' }` | browser, editor |
| rules | multi one command | `a`, `b`; `2mm` in x, Enter | both `2mm`; one undo restores both | browser, editor |
| rules | mixed | `a` x `1mm`, `b` x `2mm` | x empty, placeholder `mixed` | browser, editor |
| rules | mixed untouched | focus mixed x, blur | no undo entry | browser, editor |
| rules | unset equals default | `a` no offset, `b` x `0mm` | x shows `0mm` | browser, editor |
| rules | Chain section groups only | group + slot selected | no Chain section | browser, editor |
| rules | pivot groups only | group `g` / slot `a` / `g` and `a` selected | pivot fields shown / not shown / not shown | browser, editor |
| rules | unset shows default | `a` no offset | x `0mm`, y `0mm`, rot `0deg` | browser, editor |
| rules | anchor row | slot anchor `s` no attach / group anchor `g` / unset / chain child 2 of 3 in `thumb` | `s · center` / `g` / `default` / `chain thumb · 2 of 3` | unit, editor (`anchor-text`) |
| rules | anchor row mixed | `a` anchored to `s`, `b` unset | `mixed` | browser, editor |
| rules | arrangement pick | free `g`, pick `chain y` | `g` chain axis `y`, one undo entry | browser, editor |
| rules | arrangement shown | chain `g` axis `x` | `chain x` checked | browser, editor |
| rules | arrangement mixed | free `g`, chain `h` | no option checked | browser, editor |
| rules | arrangement refused | free `g` anchored to child `k`, `k` anchored to `s`; pick `chain x` | `free` checked, the refusal's text below the control, design unchanged | browser, editor |
| rules | refusal cleared | after that refusal, select another group `h` | no refusal text | browser, editor |
| rules | x checks a delta | `5deg` in x, Enter | `aria-invalid`, "Not a quantity in mm.", design unchanged | browser, editor |
| glue | placeholder | state `empty with a placeholder` | input placeholder from the state | browser, ui |
| glue | none checked | state `none checked` | no radio checked | browser, ui |
| module boundaries | registration | `main-modules` container | `run(SetOffset, …)`, `run(SetArrangement, …)` apply | integration, app |

## Conformance Log

Pass 1, reader A (0 dropped):
- `Test a rule where it is defined` (pause, session, Esc, invalid rows retest 14.10) -- fixed (wiring rows only).
- `Give every threshold three rows` (pause row) -- fixed (row dropped with the retests).
- `add empty input and an input that breaks an assumption` (empty edit, `position: {}`, repeated ids) -- fixed (decision and rows).
- Pivot in a group-and-slot selection unspecified -- fixed ("fields common to all").
- Edited-copy mechanism unchosen -- fixed (`structuredClone` and shared `arrangeGroup`).
- Pick refusal surface (`rejectionText` "which every surface … uses") -- asked (Sergii: text below the control).
- Row level `unit, model` asserting an undo entry -- fixed (split).
- Precedent `set-gap.spec.ts` `message: unitMismatchMessage([DESIGN_ID])` -- deferred (rows assert kind and ids).
- `Name a thing for what it does` (`arrangement-value`) -- fixed (`arrangement-option`).
- `A choice no requirement made is a decision` (slot pivot hidden) -- fixed.

Pass 1, reader B (0 dropped):
- `Prove a test Stryker can't reach … with a toggled bug` -- fixed (Verification).
- Row naming two levels -- fixed (split).
- Pause threshold -- fixed (dropped).
- Pivot for group plus slot -- fixed.
- `Name a thing for what it does` (`ChainSection`) -- fixed (decision from EXPERIENCE's "anchor, offset, chain").
- `A choice no requirement made is a decision` (evaluation order, failed parameter) -- fixed.
- Precedent `set-gap.spec.ts` message -- deferred.
- `addedLoop` placement unstated -- fixed (own file).

Gap review (0 dropped):
- gap: workbench states, `autocomplete-field-states.ts`, `segmented-control-states.ts` -- fixed.
- gap: unlabelled choices in the frozen block (slot pivot; untouched mixed field) -- fixed (decision; existing behaviour cited, `ExpressionField.vue:130-131`).
- gap: pause threshold -- fixed (dropped).
- gap: `added-loop.ts` rule without its spec -- fixed (`added-loop.spec.ts` rows).

Final pass (1 dropped: saved-work finding on the setArrangement and null rows, refuted by AD-13 "last 20 autosaved revisions (`autosave`), one version per design revision", so the previous revision stays stored); fixes no reviewer has read:
- `a command's apply step forwards to one` (checked vs unchecked operation) -- fixed (both unchecked, `set-gap` pattern).
- `Give every test an expect that fails when the behaviour breaks` (glue rows via `it.each` that asserts only visibility/value) -- fixed (named tests).
- `A choice no requirement made is a decision` (`added-loop.ts` folder; lookup owner and section props) -- fixed.
- Precedent `set-gap.spec.ts` `arrangedDesign` hidden `1mm` gap -- fixed (copy only the wiring).
- Precedent `app/src/gap.spec.ts` first test name with numbers -- fixed (not copied).
- `Glossary terms only` (`NodeInspector`) -- logged low; follows `LayoutInspector` and EXPERIENCE's Inspector row.

## Verification

**Commands:**
- `pnpm typecheck && pnpm check:fast` -- expected: clean.
- `pnpm test` -- expected: all green.
- Toggled bugs, each red then restored, named in the PR: drop the coalesce key in `OffsetSection`'s run (session row red); pass one id instead of all (multi row red); make `NodeInspector` ignore right ids (inspector-shown row red); skip `ChainSection`'s refusal text (refused row red); drop the placeholder binding (ui glue row red); unregister `SetArrangement` (app registration row red).

**Manual checks:**
- `pnpm dev`, open Corney, Layout, select a column: Anchor, Offset (x, y, rot) and Chain sections; `5mm` in x moves the column after a pause; select two columns with different x: x shows `mixed`.
