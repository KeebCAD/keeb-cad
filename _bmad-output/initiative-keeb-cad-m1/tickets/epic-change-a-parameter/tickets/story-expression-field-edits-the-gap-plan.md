---
title: 'Expression field edits the gap'
type: 'feature'
ticket: '10'
created: '2026-11-18'
status: 'done'
baseline_revision: 'f235bf0795fa3ac3e4f103bbbc380b8db1008d43'
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
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No field edits an expression: the gap changes only through scripts, and 14.5, 14.11, 14.13 and 14.15 each need one field that evaluates, applies after a pause, coalesces into one undo entry and offers parameter names.

**Approach:** Build `layout.setGap { x?, y? }`, a generic autocomplete text field in `ui` on Reka's Autocomplete, and the domain expression field in `editor` that drives it through `invoke` with `{ coalesce }`, first used for gap x and gap y in the Layout inspector's Design settings, shown while nothing is selected.

## Boundaries & Constraints

**Always:**
- The field shows the authored expression; one that is not a plain literal gets a muted suffix with its value evaluated against the design's parameters (`stagger + 0.37mm = 5.37 mm`); a plain literal (what `expr`'s `parseExpression` accepts: one number with its unit) shows no suffix, because the EXPERIENCE row says "plain literals show value and unit" and the text already is that.
- After a typing pause of 300 ms, and at once on Enter or blur, the field runs its command with the focus session's coalesce key; the run's refusal is the field's error. A refused run commits nothing and leaves the session open (`undo-history.ts:15-34` records only commits).
- Enter runs the command, then ends the session (a new key for further typing), because AD-12 says "the drop and reroute run when the session ends (Enter or blur)".
- An invalid value shows the error underline and `rejectionText` of the refusal below the field, with `aria-invalid` and `aria-describedby` (set by `UiAutocompleteField`, see its task); the canvas keeps the last valid value.
- Blur with an invalid value restores the design's current text and clears the error.
- Decision (Sergii 2026-11-18): the list opens while the name before the cursor is a prefix of at least one parameter name, filtered by that prefix, and accepting a row replaces that name, not also ↓ in an empty spot opening every parameter, because the ticket asks only for names offered while typing.
- Decision (Sergii 2026-11-18): the list renders inside the field's wrapper, not in Reka's documented anatomy, which wraps the content in `AutocompletePortal` ("When used, portals the content part into the body", reka-ui.com/docs/components/autocomplete), and not with `ui` glue stripping Reka's `aria-hidden`, because inside the wrapper the field and list stay exposed while Reka hides the rest of the page (`useHideOthers` on the root's parent, `ComboboxContentImpl.js:150-151`); an upstream issue is noted.
- Decision (Sergii 2026-11-18): an exact value's suffix reads `= 5.37 mm`; a value `formatNumber` rounds reads `≈ 5.37 mm`, the `≈` in place of `=`, not always `=` with `readout: true`, because AD-26 says "`≈` marks a display that rounding moved off the true value".
- Decision (Sergii 2026-11-18, with Sally): Esc with the list closed discards only text not yet applied (the field shows the design's current text again, its error cleared) and leaves the field; whatever the pause or Enter applied stays, undone by the ordinary undo. Not "Esc undoes that entry" (ticket, EXPERIENCE row, AD-2), because that wording came in with `c0686bb` as a by-product of dropping gestures, never chosen, and the canvas already shows what landed. With the list open, the first Esc closes the list only, keeping focus and text, because "Esc stays free for the innermost step" (EXPERIENCE, Left rail row, Sergii 2026-11-11); a second Esc leaves.
- Accepting a name is an edit like typing: it does not run the command, and the next typing pause applies it if valid, because "A value that parses and unit-checks is applied as a command after a typing pause".
- Every ARIA widget is a Reka primitive wrapped in `ui` (AD-26); the expression field lives in `editor` ("Domain components (expression field, …) live in `editor`").

**Never:**
- Create parameter `<name>…`, Ctrl+click on a name (13's), the other Design settings rows (11's), any selection's inspector (5's).
- Ctrl+Z handling in the field: the browser's native text undo stays; no Undo hotkey exists yet (16.4's).
- The reroute at session end (AD-12): no routing stage reads sessions yet.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pause applies | gap x `1mm`, type `5mm`, wait 300 ms | `meta.gap.x` = `5mm`, chains re-space | none |
| One session, one entry | type `5mm`, pause, type `6mm`, Enter | one undo restores `1mm` | none |
| Literal deg | `5deg` | `input-invalid` "Not a quantity in mm." | error, aria-invalid, design unchanged |
| Parameter in deg | `wall` holds `5deg`, type `wall` | `unit-mismatch` | as above |
| Blur invalid | `5deg`, blur | text back to the design's | error cleared |
| List open, Enter | `wa` → list shows `wall = 2 mm`, Enter | text `wall`, list closed, design unchanged | none |
| Esc, unapplied | `5mm` typed, Esc before the pause | text `1mm`, field blurred, design unchanged | none |
| Esc, applied | pause applied `5mm`, Esc | text `5mm`, field blurred, design keeps `5mm` | none |
| List closed, Enter | after that accept, Enter | runs `setGap { x: 'wall' }` | refusal shown if any |

</frozen-after-approval>

## Code Map

- `packages/schema/src/gap.ts:5` -- `gapSchema = v.strictObject({ x: lengthSchema, y: lengthSchema })`; `quantity.ts:11-14` refuses a wrong-unit literal at parse ("Not a quantity in mm."); `expression.ts:4-9` refuses `''` ("Not an expression."). Builders `testing/gap.ts` `aGap`, `testing/meta.ts`, `testing/length.ts` `aLength`, `testing/parameter.ts` `aParameter`.
- `packages/commands/src/layout/set-anchor.ts`, `set-anchor-input-schema.ts`, `types.ts:9-13`, `layout-commands-module.ts:10-18`, `commands/src/index.ts:15-27` -- the command pattern to copy (its `available` calls the model check `apply`'s operation agrees with). Don't copy `layout-commands.spec.ts`'s forwarding rows (`expect(viaCommand()).toEqual(viaOperation())`): SetGap's rows state `meta.gap` values.
- `packages/model/src/layout-editing/check-set-anchor.ts`, `set-anchor.ts`, `types.ts`; `model/src/main.ts` -- check and domain-op pattern; `reject/reject.ts:3`; `violations/expression-fault-message.ts` -- the messages `checkExpressions` gives (`The expression of "<designId>" has the wrong unit.`).
- `packages/model/src/evaluation/evaluate-expressions.ts:88` -- private `evaluateParameters(parameters)` builds the scope; `evaluate-field.ts:12` `evaluateField(expr, metadata, scope, failed)` throws `InvariantError` on text that does not parse (`:25`), so callers parse first (`expr`'s `parseExpressionTree`). `references/types.ts:12-17` `SchemaMetadata` (`unit?`, `quantity?`). `.dependency-cruiser.mts:110` lets `editor` import `model` only through `main`; `editor`'s GRAPH list (`:70-82`) has no `expr`.
- `packages/design/src/store/design-store.ts:58-76` `run(handle, input, options?: RunOptions)`; `design/src/index.ts:12` exports `RunOptions`; `history/undo-history.ts:15-34` merges a run into the last entry while its key is the open session.
- `packages/editor/src/invoke/invoke.ts:32-44,92-100` -- `invoke(handle, input?)` returns `AsyncResult<void, Rejection>` and calls `store.run(handle, entryInput)` with no options; `invoke.spec.ts` its rows; `use-invoke.ts`.
- `packages/editor/src/rejection/rejection-text.ts:7`; `selection/use-selection.ts` `ids`; `design/use-open-design.ts`; `workspace/layout/LayoutInspector.vue` (empty render function, the router's `inspector` view in `shell/InspectorLandmark.vue`).
- `packages/editor/src/hover/hovered-node.ts` (`HoveredNode`, a `di` service using `useTimeoutFn`), `use-hovered-node.ts` (thin composable), `hover-grace-delay.ts` (`hoverGraceDelayMs = 300`) -- the service-plus-composable and delay-constant pattern.
- `packages/ui/src/text-field/UiTextField.vue`, `types.ts`, `TextField.spec.ts`; `ui/workbench/states/text-field-states.ts`, `workbench/widgets.ts`; `ui/src/format/format-number.ts:14` `formatNumber(value, unit)`.
- `packages/ui/src/hotkeys/hotkey-layer.ts:42` -- `enableOnFormTags: false`: no hotkey fires in a field.
- `reka-ui@2.11.0` `Autocomplete/AutocompleteRoot.js:17-23` (string `modelValue`), `AutocompleteInput.js:91` renders `ListboxFilter`, whose `handleKeydownNavigation` calls `preventDefault` on down, up, home and end (`Listbox/ListboxFilter.js:70-73,91-95`); Enter clicks the highlighted item and stops propagation (`ListboxRoot.js:164-170`).
- `packages/editor/src/add-flow/add-flow.spec.ts`, `testing/mount-shell.ts`, `testing/press.ts` -- the editor browser-spec pattern; its `arrange()` builds a fixed design most tests don't read, so the new specs pass their design and parameters as `arrange` arguments.
- `app/src/parameters.spec.ts:29-70` -- Corney re-spacing and registration rows; its `HOME_KEYS` moves to `app/src/testing/home-keys.ts` and `xOf` to `app/src/testing/x-of.ts` (one kind of thing per file), shared by both specs.

## Tasks & Acceptance

**Execution:**
- [x] `packages/model/src/evaluation/evaluate-parameters.ts` (function), `evaluate-field-expression.ts` (function), `parameter-values.ts` (function), `evaluate-expressions.ts`, `types.ts`, `main.ts` -- `evaluateParameters` moves to its own file; `evaluateFieldExpression(parameters, expression, schema)` reads the field's `SchemaMetadata` from its schema with `v.getMetadata` (as `references/walk-schema.ts:14` does), parses first, then evaluates through `evaluateField`, returning `Result<{ value, unit?, literal }, ExpressionError>` where `ExpressionError` is `{ kind: 'expression-syntax-error' }`, an `ExpressionFault` or `reads-failed-parameter`; `parameterValues(parameters)` returns each parameter's evaluated value, failed ones absent. `main.ts` exports both and the types `ExpressionError`, `EvaluatedValue`.
- [x] `packages/model/src/layout-editing/check-set-gap.ts` (function), `set-gap.ts` (function), `types.ts` (`GapEdit`), `main.ts` -- `checkSetGap(design, edit)` evaluates each given axis against `gapSchema.entries.x` / `.y` with `evaluateFieldExpression`, x before y as `gap.ts:5` declares them, and refuses the first failure as `checkExpressions` does (`unit-mismatch`, `negative-length`, `unresolvable-reference`, `division-by-zero`, ids `[meta.id]`, `expressionFaultMessage`); `setGap(design, edit)` writes each given axis.
- [x] `packages/commands/src/layout/set-gap.ts` (`SetGap`, service), `set-gap-input-schema.ts` (`setGapInputSchema = v.strictObject({ x: v.optional(lengthSchema), y: v.optional(lengthSchema) })`), `types.ts` (`SetGapInput`), `layout-commands-module.ts`, `index.ts` -- `layout.setGap`, label `Set gap`; `available` and `apply` call `checkSetGap`.
- [x] `packages/editor/src/invoke/invoke.ts`, `invoke.spec.ts` -- the command overload gains `options?: RunOptions`, passed to `store.run`; the action and UiAction overloads take none.
- [x] `packages/ui/src/autocomplete-field/UiAutocompleteField.vue` (component), `types.ts`, `AutocompleteField.spec.ts`, `index.ts`; `ui/workbench/states/autocomplete-field-states.ts`, `widgets.ts` -- UiTextField's look on Reka Autocomplete, list not portaled: props `label`, `error?`, `suffix?`, `options: { value, label }[]`; `v-model` text and `v-model:open`; emits `accept(value)`, `commit` (Enter or Tab with the list closed), `cancel` (Esc with it closed). The input carries the label, `aria-invalid` and `aria-describedby` (the error's id) itself, since only Reka's `FieldControl` reads `FieldRoot`'s context (`Field/FieldControl.js:58-61`) and the input is `AutocompleteInput`. Reka's filter is off (`ignoreFilter`); the options arrive filtered. Glue AD-26 lists, each with a test: Tab accepts the active option; Enter accepts before the field's Enter; Home and End move the cursor, not the highlight.
- [x] `packages/editor/src/expression-field/field-session.ts` (`FieldSession`, service), `use-field-session.ts` (function), `editor-module.ts` -- one focus session at a time: `begin()` mints a key (`crypto.randomUUID()`), `key`, `end()`.
- [x] `packages/editor/src/expression-field/ExpressionField.vue` (component), `typing-pause.ts` (`typingPauseMs = 300`), `name-before-cursor.ts` (function), `parameter-options.ts` (function), `types.ts`, specs -- props `label`, `expression` (authored), `schema` (the field's value schema, `gapSchema.entries.x` here, so the metadata has one source), `run(expression, options): AsyncResult<void, Rejection>`, awaited before the error shows; the pause through VueUse's `useDebounceFn`; the suffix from `evaluateFieldExpression`; options from `parameterValues`, labelled `name = <formatNumber(value, unit ?? 'none')>`, `≈` in place of `=` for a rounded value as in the suffix, a failed parameter by its name alone, in the design's parameter order; the list closes on accept and reopens on the next input that changes the name; an accept arms the typing pause like any edit; Reka highlights the first option on input (`ListboxFilter.js:68`), so Enter accepts it without ↓.
- [x] `packages/editor/src/workspace/layout/LayoutInspector.vue`, `design-settings/DesignSettings.vue` (component) -- with no selection, a `Design settings` section with `gap x` and `gap y` fields running `invoke(SetGap, { x }, { coalesce })`.
- [x] `app/src/testing/home-keys.ts`, `x-of.ts` (function), `app/src/parameters.spec.ts`, `app/src/gap.spec.ts` -- shared `HOME_KEYS` and `xOf`; Corney re-spacing and registration rows.
- [x] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` (docs commit to main, not the PR branch) -- precedent entry: `commands/src/parameters/set-parameter.ts`'s `available` returns `Result.ok()` while `run` refuses evaluation faults, against AD-2's "a refusal decidable by reading the design and the input … lives in one `model` check function that both call".
- [x] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` (docs commit to main) -- entry for Sofia and the spine: Sergii's Esc decision (2026-11-18) replaces "Esc undoes it and restores the text" in 14.10's verify, "Esc undoes that step and restores the text" in EXPERIENCE's Expression field row and "Esc undoes that entry" in AD-2; AD-26's `invoke(handle, input?)` gains `options?` for a command.
- [x] Specs per the Boundary Table.

**Acceptance Criteria:**
- Given Corney with gap x `1mm`, when gap x is set to `2mm` through `setGap`, then each key after the first in an `x` chain moves 1 mm further per step, and one undo restores the arranged frames.
- Given every existing spec, when `pnpm test` runs, then they pass, `parameters.spec.ts` changed only to import the shared helpers.

## Design Notes

`Decision (plan):` the field shows the run's refusal, not a check of its own in `editor`, because "Test a rule where it is defined" (AGENTS.md); the store and `checkSetGap` own every listed refusal.

`Decision (plan):` `SetGap` has a model check, `checkSetGap`, not `Result.ok()` as `SetParameter` has, because AD-2: "a refusal decidable by reading the design and the input … lives in one `model` check function that both call, so availability and apply can't disagree".

`Decision (plan):` `setGap` takes `{ x?, y? }`, not an id list as the other layout setters, because the ticket builds "layout.setGap { x?, y? }" and the gap is `meta.gap`, the design's, not a node's.

`Decision (plan):` the suffix and the option values come from new `model/main` exports, not from `expr` in `editor` or the worker's values, because `editor` imports `model` only through `main` (`.dependency-cruiser.mts:110`) and has no `expr` edge, and the worker evaluates only applied expressions, never the one being typed.

`Decision (plan):` the session key lives in a `FieldSession` `di` service, not in the component, because the spine's Editor state row puts UI state in "small `di` services holding Vue refs", and only one field holds focus at a time; the text, error and list state stay in the component as view state, as UiTextField's `defineModel` does.

`Decision (plan):` the key is `crypto.randomUUID()` per session, not a counter, because `undo-history.ts:17` merges any run whose key equals the open session's, so a reused key would join two sessions.

`Decision (plan):` blur carries "a command dispatched while the field holds an unapplied valid value applies it first", not a flush hook in `invoke`, because every dispatch path today moves focus out of the field first: no hotkey fires in a field (`hotkey-layer.ts:42`), and a pointer press blurs before its click; how Ctrl+K works from a field "is open for the first story that binds one" (EXPERIENCE, Shortcuts).

`Decision (plan):` the pause is 300 ms, from EXPERIENCE ("after a typing pause (~300 ms `[ASSUMPTION]`)"), not the 600 ms the spine gives nudge bursts; it is built with VueUse's `useDebounceFn`, not a hand-written timer, because `@vueuse/core` is the Stack's composition utility for `editor`.

`Decision (plan):` a name is what `ParameterName` accepts (`parameter-name.ts`: a letter, then letters, digits or `_`) ending at the cursor, not a letter run that directly follows a digit (the unit in `3mm`), and matching is case-sensitive, because parameter names are unique by exact string.

`Decision (plan):` `editor` filters the options by the name before the cursor and Reka's filter is off (`ignoreFilter`), not Reka's `contains` filter (`useFilter({ sensitivity: "base" })` against the whole text, `AutocompleteRoot.js:138-141`), because in `1mm + wa` only `wa` is the name and Sergii's decision filters by prefix.

`Decision (plan):` the coalesce key enters through an `options` argument on `invoke`'s command overload, not a key inside the command's input nor the field calling `store.run`, because the input is the command's strict schema (`set-gap-input-schema.ts`) and AD-26 sends "Every invocation from the UI … through one `editor` invoke path"; the spine signature edit is logged in `deferred-work.md`.

`Decision (plan):` options keep the design's parameter order, not alphabetical, because evaluation and the Parameters tab read parameters in list order (14.8's design order); a failed parameter is listed by its name alone, not left out, because the ticket lists "parameter names with their values" and only the value fails.

`Decision (plan):` `SetGap` is tagged `(service)`, not `(function)`, because AD-2 defines every command "as a class registered in `di`", as `SetAnchor` is.

`Decision (plan):` the ui widget is `UiAutocompleteField`, not `UiExpressionField`, because `ui` holds "generic widgets that take plain data" (AD-26); "autocomplete" is the EXPERIENCE row's name ("Autocomplete dropdown"), not only the Reka primitive's.

## Conformance Log

Pass 1, reader A (0 dropped):
- `A choice no requirement made is a decision and is labelled as one` (list-closed rows met an open list; name token undefined) -- fixed (close on accept, `ParameterName` token, name rows).
- `Take expected values from the requirement` (`evaluateText` error type `…`) -- fixed (`ExpressionError` kinds per row).
- `Test a rule where it is defined` (refusal thresholds at commands level) -- fixed (thresholds in model's `checkSetGap` rows; one commands refusal row).
- `Hold state in di services` (composable held session state) -- fixed (`FieldSession` service).
- Untagged components -- fixed (tagged `(component)`).
- Esc after Enter ambiguous -- fixed (superseded by Sergii's Esc decision).
- AD-13 cited for AD-12's sentence -- fixed.
- `that documented setup is its Y` (portal) -- fixed (Reka docs' `AutocompletePortal` cited).
- `Give every decision its rejected alternative` (SetGap tag) -- fixed.
- `Write a shared assertion once` (`HOME_KEYS`, `xOf` copied) -- fixed (moved to `app/src/testing/`).
- `Test a rule where it is defined` (no invoke rows; own options type) -- fixed (invoke rows, `RunOptions`).
- `Glossary terms only` (`evaluateText`) -- fixed (renamed).
- `Put every type a folder declares … in that folder's types.ts` -- fixed (model `types.ts` listed).

Pass 1, reader B (0 dropped):
- AD-2 `a refusal decidable by reading the design and the input … lives in one model check function that both call` -- fixed (`checkSetGap`); precedent `commands/src/parameters/set-parameter.ts` `return Result.ok()` -- deferred.
- `invoke(handle, input?)` returns `AsyncResult` (field's `run` typed `Result`) -- fixed.
- Esc route unnamed -- fixed (superseded by Sergii's Esc decision).
- List-open decision vs list-closed rows -- fixed (as A).
- AD-25 state / `@vueuse/core` as Y for a hand timer / `hoverGraceDelayMs` naming -- fixed (`FieldSession`, `useDebounceFn`, `typingPauseMs`).
- Untagged components -- fixed.
- No invoke rows -- fixed.
- `Give every threshold three rows … empty input` -- fixed (empty, name, literal rows).
- Decisions without "because"; portal Y -- fixed.
- AD-12 citation -- fixed.
- Names (`evaluateText`, `UiAutocompleteField`) -- fixed (rename; widget name decision kept, from the EXPERIENCE row).
- Precedent `add-flow.spec.ts` `await arrange()` fixed design; `layout-commands.spec.ts` `expect(viaCommand()).toEqual(viaOperation())` -- fixed (plan says not to copy either).

Gap review (0 dropped):
- gap: Home/End glue, `UiAutocompleteField.vue` -- fixed.
- gap: option values unplanned (`parameterValues`, `formatNumber`, `≈` row) -- fixed.
- gap: `layout.setGap` without an id list (AD-2 "layout setters, which take node id lists") -- fixed (decision).
- gap: `available` always ok, `check-set-*` siblings -- fixed (`checkSetGap`).
- gap: missing empty / name rows -- fixed.
- gap: rules retested in commands -- fixed.
- gap: `SchemaMetadata` not nameable in editor; `evaluateField` throws on syntax -- fixed (schema passed, metadata read in model; parse first).
- gap: "applies first" unreachable without blur -- fixed (row reworded `applies on blur first`; Design Notes decision).

Final pass (fixes no reviewer has read):
- Stack Y for hand-built filtering (Reka `contains`, `AutocompleteRoot.js:138-141`) -- fixed (`ignoreFilter` decision).
- Ticket `aria-invalid and aria-describedby`: `FieldRoot` reaches only `FieldControl` (`FieldControl.js:58-61`) -- fixed (widget sets them; ui row).
- `A choice no requirement made is a decision` (invoke `options`) -- fixed (decision; spine edit logged).
- Unlabelled order, failed-parameter label, x-before-y, accept arms the pause, first option highlighted -- fixed.
- AD-25 tag on `SetGap` -- fixed (decision).
- `Give each file one kind of thing` (`home-keys.ts` with `xOf`) -- fixed (`x-of.ts`).
- `Commit docs-only changes straight to main` -- fixed (deferred-work tasks marked).
- AD-17 metadata source -- fixed (read from the schema).
- Names (`evaluateExpression` vs `evaluateExpressions`) -- fixed (`evaluateFieldExpression`); `UiAutocompleteField` -- asked at checkpoint.

## Implementation Notes

- Decision (Sergii 2026-11-18): Esc leaving the field moves focus to the canvas landmark, not the page body. `ExpressionField` focuses it through a new `useFocusLandmark` composable over `Landmarks`; `UiAutocompleteField`'s cancel only emits, so the generic widget does not decide where focus goes.
- Decision (Sergii 2026-11-18): an error stays until the next run settles, not cleared on the next keystroke, so it does not flicker while the text is corrected.

- The two `deferred-work.md` entries are written in the working tree but not committed: they belong in a docs commit on main, apart from the PR branch.
- Firefox: writing back a caret the widget had just read collapsed Playwright's select-all on focus, so `fill` appended; the widget now writes back only a caret its caller moved.
- `expression-field.spec.ts` uses `vi.useFakeTimers()` with its defaults; faking only `setTimeout`/`clearTimeout` left Firefox runs hanging on the first browser-mode assertion.

- Real-host run: no spec in the diff fakes a third-party host or boundary; the browser specs run real Reka, real `DesignStore` and Vitest fake timers.
- Structural changes: none (no tsconfig, package.json, workspace, Vitest, ESLint, Stryker or dependency-cruiser change; no `declare global` or `declare module`).
- Verification (step 3, orchestrator): `pnpm typecheck && pnpm check:fast && pnpm test` exit 0, 844 files / 6347 tests; after Sergii's Esc-focus change the implementer's run: 847 files / 6353 tests.
- Matrix audit: every frozen I/O row has a passing test (`expression-field.spec.ts`, `app/src/gap.spec.ts`); none skipped.

- Decision (Sergii 2026-11-18): the frozen row "session one entry" (and its matrix row) reads `5mm`, pause, `6mm`, Enter, not `5`, pause, `mm`, pause, Enter, because `5` alone is refused as unitless, so the old input commits once and cannot catch a coalescing bug.
- `Decision (build, after review):` a non-finite value shows no suffix and labels its option by name alone, not a formatted value, because `formatNumber` throws on a non-finite value (`format-number.ts`) and the model refusing it is deferred (`deferred-work.md`).
- `Decision (build):` a refusal is shown only while the field still holds the text that run checked, not on text typed after it, because the refusal is about the earlier text; *judgement*, named at the look halt.

## Plan Change Log

- `UiAutocompleteField` gains `v-model:cursor` (the caret), not the editor reading the input element, because the editor needs the caret for the name before it and to place the caret after an accept, and `editor` reaches no `ui` DOM.
- `UiAutocompleteField` only emits `cancel`; the editor moves focus to the canvas landmark (Sergii 2026-11-18, Implementation Notes), not the widget blurring itself, so the generic widget does not decide where focus goes.
- Glue beyond AD-26's list: `@pointerdown.prevent` on each option keeps focus in the input when an option is clicked, not letting the press blur the field (which would apply its text) before the click accepts.
- `Decision (build):` `checkSetGap` passes an axis that reads a failed parameter, not refusing it, because `checkStructure`'s `checkExpressions` refuses nothing for it either (that parameter reports its own fault), and availability and `run` must agree.
- `Decision (build):` Enter ends the focus session whether or not its run is refused, not only after an ok run, because the Boundaries say "Enter runs the command, then ends the session" without a condition.
- `Decision (build):` the list reopens on the next keystroke after an accept or Esc closes it, not on a caret move, because the plan says "reopens on the next input".
- `Decision (build):` `parameterOptions` offers a name a later parameter repeats once, not twice, because the later one is out of the scope (evaluation's taken-name rule) and two rows with one value would collide.
- `Decision (build):` `app/src/gap.spec.ts`'s registration row arranges `aDesign` through `replaceDesign`, not the Corney script, because of the open precedent entry against running a script the test does not use.

- The "session one entry" row is tested as `5mm`, pause, `6mm`, Enter, not `5`, pause, `mm`, pause, Enter, because `5` is refused (unitless, `unit-mismatch`), so the literal row commits once whether or not the runs coalesce; a toggled bug (no coalesce key) left it green, and the reworded row turns red.

## Review Triage Log

### Pass 1 (quick, test-reviewer; 0 findings dropped): high 0, medium 2, low 9, false 2, maybe-false 0

- medium, patch -- quick: a non-finite value crashes the suffix and option labels. Checked: `evaluate('1e200mm * 1e200')` with real `expr` is ok with a non-finite value, and `formatNumber` throws on it (`format-number.ts`).
- medium, patch -- quick: the list opens on focus or a caret move, with no keystroke, against Sergii's "names offered while typing"; `open` reads `nameBeforeCursor(text, cursor)` and `closed` starts false.
- low, defer -- quick: the model accepts a non-finite expression value (`evaluateField` has no finiteness check, from 14.8), so `checkSetGap` lets through an infinite gap; predates this change.
- low, defer -- quick: a gap reading a failed parameter applies with no field error, while EXPERIENCE lists "cycle" among invalid values; the ticket lists only parse, unit-mismatch, unresolvable-reference and 8's refusals, and 14.8 decided a reader of a failed parameter has no fault of its own. The doc mismatch goes to Sofia and Sally.
- low, patch -- quick: `gap.spec.ts` copies the re-spacing assertion from `parameters.spec.ts`.
- low, patch -- quick + test-reviewer 5: `expression-field.spec.ts` and `design-settings.spec.ts` arrange slot `a` and parameters most tests don't read.
- low, patch -- quick + test-reviewer 1: `evaluate-field-expression.spec.ts` picks its schema from the expected value.
- low, patch -- quick: `parameter-values.spec.ts` narrows to `.size`.
- low, patch -- quick + test-reviewer 4: `opens for no name that matches nothing` names the opposite of its expect, asserted with no settled state.
- low, reject -- test-reviewer 2: a negated literal counts as a literal; follows `parseExpression`, which the plan names as the literal test; the fix is a plan edit.
- false -- test-reviewer 3: expected messages built with `unitMismatchMessage` etc.: AGENTS.md allows "calling a function the requirement names and that has unit tests"; the spine builds "Each kind's message … by one `model` function", and `violations/unit-mismatch-message.spec.ts` tests it.
- false -- test-reviewer 6: history read synchronously after `focus()`: the `focusout` handler runs during `focus()`, and `store.run` commits synchronously (`design-store.ts` `#runCommand`; `invoke` wraps it with `AsyncResult.fromResult`).

### Pass 2 (quick, test-reviewer, on the patches; 0 findings dropped): high 0, medium 0, low 9, false 0, maybe-false 0

- low, logged -- quick: `gap.spec.ts` relies on `NewDesign`'s `1mm` gap without stating it in the arrange.
- low, logged -- quick + test-reviewer: `field-session.spec.ts` asserts `typeof first` and a computed `differs` instead of whole values.
- low, logged -- quick: `shows no list for a name that matches no parameter` also asserts `aria-invalid` as its settle step.
- low, fixed by Sergii's decision -- quick: the "session one entry" boundary row disagreed with its test; the row is amended (Implementation Notes).
- low, logged -- test-reviewer 8: the non-finite display was undocumented; recorded as a build decision.
- low, logged -- test-reviewer 8: a refusal for changed text is dropped, untested; recorded as a build decision.
- low, logged -- test-reviewer 4/6: `stays closed on focus and a caret move…` and `is not shown while a slot is selected` assert absence with no prior positive state.
- low, logged -- test-reviewer 5: `undoneGaps()` undoes inside the asserted object literal; `gap` is right only because it is read first.
- low, logged -- test-reviewer 5: `parameter` builders, `OVERFLOWING` and `EXPECTED_SHIFTS` repeated across specs.

Review ends: pass 2 has nothing above low and breaks no line of the frozen block; its lows are logged, not patched.

## Boundary Table

| Group | Row | Input | Expected | Level |
|---|---|---|---|---|
| rules | setGap one axis | `{ x: '5mm' }` on gap `1mm`/`1mm` | `meta.gap` = `{ x: '5mm', y: '1mm' }` | unit, model |
| rules | setGap other axis | `{ y: '2mm' }` | `{ x: '1mm', y: '2mm' }` | unit, model |
| rules | check length just below 0 | `{ x: '-0.01mm' }` | `negative-length`, ids `[meta.id]` | unit, model |
| rules | check length on 0 | `{ x: '0mm' }` | ok | unit, model |
| rules | check length just above 0 | `{ x: '0.01mm' }` | ok | unit, model |
| rules | check parameter in deg | `wall` = `5deg`, `{ x: 'wall' }` | `unit-mismatch`, ids `[meta.id]` | unit, model |
| rules | check unknown name | `{ x: 'nope' }` | `unresolvable-reference` | unit, model |
| rules | check empty edit | `{}` | ok | unit, model |
| rules | evaluateFieldExpression | `stagger` = `5mm`, `stagger + 0.37mm`, length | ok 5.37 mm, not literal | unit, model |
| rules | evaluateFieldExpression literal | `5mm`, length | ok 5 mm, literal | unit, model |
| rules | evaluateFieldExpression parse | `1mm +` | `expression-syntax-error` | unit, model |
| rules | evaluateFieldExpression empty | `''` | `expression-syntax-error` | unit, model |
| rules | evaluateFieldExpression failed parameter | `a` = `b`, `b` = `a`, `a` | `reads-failed-parameter` | unit, model |
| rules | parameterValues | `a` = `2mm`, `b` = `a * 2`, `c` = `c` | `a` 2 mm, `b` 4 mm, no `c` | unit, model |
| rules | SetGap refusal | `wall` = `5deg`, `run(SetGap, { x: 'wall' })` and `available` | both `unit-mismatch` | unit, commands |
| rules | SetGap empty | `{}` | ok, no undo entry | unit, commands |
| rules | SetGap same text | `{ x: '1mm' }` on `1mm` | ok, no undo entry | unit, commands |
| rules | invoke coalesce | two command invokes, same key | one undo entry | unit, editor |
| rules | invoke no key | two command invokes, no options | two undo entries | unit, editor |
| rules | name: end of word | `1mm + wa`, cursor at end | `wa` | unit, editor |
| rules | name: after operator | `1mm + `, cursor at end | none | unit, editor |
| rules | name: unit | `3mm`, cursor at end | none | unit, editor |
| rules | name: start | `wall`, cursor at 0 | none | unit, editor |
| rules | name: middle | `wall`, cursor at 2 | `wa` | unit, editor |
| rules | pause just below | type `5mm`, 299 ms | design unchanged | browser, editor |
| rules | pause on | type `5mm`, 300 ms | `meta.gap.x` = `5mm` | browser, editor |
| rules | pause just above | type `5mm`, 301 ms | `5mm`, one undo entry | browser, editor |
| rules | session one entry | `5mm`, pause, `6mm`, Enter | one undo restores `1mm` | browser, editor |
| rules | two sessions | focus, `5mm`, blur; focus, `6mm`, blur | two undo entries | browser, editor |
| rules | Enter ends session | `5mm` Enter, `6mm` Enter | two undo entries | browser, editor |
| rules | invalid shown | `5deg`, pause | `aria-invalid` true, description "Not a quantity in mm.", design unchanged | browser, editor |
| rules | empty shown | clear the field, pause | description "Not an expression.", design unchanged | browser, editor |
| rules | invalid Enter | `5deg`, Enter | design unchanged | browser, editor |
| rules | blur invalid | `5deg`, blur | text = design's, no `aria-invalid` | browser, editor |
| rules | applies on blur first | `5mm` unapplied, press a canvas key, Delete | first undo restores the node, second the gap | browser, editor |
| rules | literal suffix | `5mm` | no suffix | browser, editor |
| rules | expression suffix | `stagger` = `5mm`, `stagger + 0.37mm` | `= 5.37 mm` | browser, editor |
| rules | rounded suffix | `stagger` = `5mm`, `stagger + 0.374mm` | `≈ 5.37 mm` | browser, editor |
| rules | invalid suffix | `5deg` | no suffix | browser, editor |
| rules | option labels | `wall` = `2mm`, `wide` = `wall + 0.374mm`, `wx` = `wx`; type `w` | `wall = 2 mm`, `wide ≈ 2.37 mm`, `wx` | browser, editor |
| rules | list open Enter | `wall`, `ks`; type `wa`, Enter | text `wall`, list closed, design unchanged | browser, editor |
| rules | accept then pause | type `wa`, Enter, wait 300 ms | `meta.gap.x` = `wall` | browser, editor |
| rules | exact name Enter | type `wall`, Enter at once | list closed, design unchanged; Enter again applies `wall` | browser, editor |
| rules | list closed Enter | after an accept, Enter | `meta.gap.x` = `wall` | browser, editor |
| rules | list closed Tab | `3mm`, Tab | applied, focus on gap y | browser, editor |
| rules | list Esc | list open, Esc | list closed, focus and text kept, design unchanged | browser, editor |
| rules | list Esc twice | list open, Esc, Esc | field blurred, unapplied text dropped | browser, editor |
| rules | Esc unapplied | `5mm` typed, Esc at 299 ms | text `1mm`, blurred, no undo entry | browser, editor |
| rules | Esc applied | `5mm`, 300 ms, Esc | text `5mm`, blurred, one undo entry | browser, editor |
| rules | Esc invalid | `5deg`, Esc | text `1mm`, no `aria-invalid`, blurred | browser, editor |
| rules | no match | `zz` | no list | browser, editor |
| rules | Design settings | nothing selected / a slot selected | gap x and gap y shown / not shown | browser, editor |
| glue | Tab accepts | list open, ↓, Tab | `accept` with the active value, no `commit` | browser, ui |
| glue | Enter order | list open, Enter | `accept`, no `commit` | browser, ui |
| glue | Enter closed | list closed, Enter | `commit` | browser, ui |
| glue | Home/End | list open, cursor mid-text, Home, End | cursor at 0, then at the end; highlight unchanged | browser, ui |
| glue | invalid | `error` `E` | input `aria-invalid` true, accessible description `E`, label names the input | browser, ui |
| glue | list exposed | list open | the field and its listbox found by role | browser, ui |
| module boundaries | Corney re-spaces | Corney, gap x `1mm` → `2mm` | home keys shift `[0,1,2,3,4,5]` mm; undo restores | integration, app |
| module boundaries | registration | `main-modules` container | `run(SetGap, …)` applies | integration, app |

## Verification

**Commands:**
- `pnpm typecheck && pnpm check:fast` -- expected: clean.
- `pnpm test` -- expected: all green.

**Manual checks:**
- `pnpm dev`, open a new design, Layout, nothing selected: Design settings shows gap x and gap y; typing `2mm` in gap x re-spaces the chains after a short pause; typing `w` with a parameter `wall` lists `wall = … mm`.
