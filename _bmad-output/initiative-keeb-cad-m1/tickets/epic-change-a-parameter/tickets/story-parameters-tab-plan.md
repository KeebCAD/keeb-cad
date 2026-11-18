---
title: 'Parameters tab'
type: 'feature'
ticket: '13'
created: '2026-11-18'
status: 'ready-for-dev'
baseline_revision: ''
route: 'full'
route_source: 'auto'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md'
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Parameters change only through scripts: the slide-out holds only the Tree, so nothing lists, adds, renames or deletes one.

**Approach:** Give the slide-out Tree and Parameters tabs with a rail button each; the Parameters tab lists rows `name = expression = value`, the value in 14.10's expression field running `setParameter`; `+` starts an add flow, F2 or a double-click on a name a rename flow, and Delete removes the parameter whose name has focus.

## Boundaries & Constraints

**Always:**
- Rows keep the design's parameter order.
- Decision (Sergii 2026-11-18): a later parameter repeating a taken name (a hand-edited file) is its own read-only row, `name = expression = value` as text, with no rename, delete or double-click, not an editable row nor a hidden one, because every command acts on the first parameter of a name (14.8), so editing the later row would change the first, and hiding it would hide what the file holds.
- A row's value is an `ExpressionField` labelled by the parameter's name (label visually hidden), whose `run` is `invoke(SetParameter, { name, value }, options)`: one undo entry per focus session (14.10), a refusal shown as the field's error.
- The rail holds a Tree and a Parameters button; each is `aria-expanded` only while the slide-out is open on its tab, and a press closes the slide-out when open on that tab, else opens it on that tab. T opens it on the last-used tab, Tree before any.
- The slide-out's header holds the tab list (`Tree`, `Parameters`) and, on Parameters, `+` (`Add parameter`) (mockups/key-panels.html (d)).
- Delete and Ctrl+D act on the selection only on the Tree tab ("in the slide-out's Tree tab", AD-26).
- Decision (Sergii 2026-11-18): with no parameters the tab reads `No parameters.`, not EXPERIENCE's full `No parameters. Type a new name in any field to create one.`, because the second sentence describes `Create parameter <name>…`, split off to a later story, which adds it.
- Decision (Sergii 2026-11-18): `+` and rename are flows with dialog views, as the add flow (`Add parameter`: name and value fields; `Rename parameter`: one name field, prefilled and selected), not inline editing in the row, because the glossary counts "F2 rename" a flow and AD-26 renders a flow's view in the one `FlowHost`, while "Surfaces read what the top flow offers, never which flow it is".
- Decision (Sergii 2026-11-18): the add flow finishes with a new `parameters.addParameter { name, value }`, refused as `id-taken` (ids [name], `The design already has a parameter named "x".`) for a name a parameter has, not with `setParameter` as the ticket says, because `setParameter` changes an existing parameter's value, so adding a taken name would overwrite it unannounced. Spine steps logged in `deferred-work.md`: AD-2's command list and the Data Schema's rejection note.
- Decision (Sergii 2026-11-18): Delete is available whenever a parameter's name has focus on the Parameters tab and runs `DeleteParameter { name }`; its refusal shows under that row as an alert with `rejectionText`, until focus leaves the row. Not unavailable while the command refuses, as AD-26's "a selection UiAction is available exactly when its command's `available` is ok" would make it, because a silent key tells the person nothing and the ticket asks for "the refusal shown with its users". AD-26's exception is logged in `deferred-work.md`.
- Decision (Sergii 2026-11-18): the last-used tab lives in `SlideOut` for the session, not in localStorage, because it then adds no stored key; a reload starts on Tree.

**Never:**
- `Create parameter <name>…` and modifier-click on a name (split off by Sergii 2026-11-18, `deferred-work.md`); the Parts tab (14.14); a palette entry.
- Arrow keys between rows, or a selection of parameters.
- Any change to `expr`, evaluation, or 14.9's rename and delete rules.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add | `+`, name `wall`, value `3mm`, Enter | row `wall`, value `3mm`; one undo entry | none |
| Add taken | `wall` exists; `+`, `wall`, `1mm`, Enter | dialog stays, `wall` keeps its value | `The design already has a parameter named "wall".` |
| Change | `wall` used by gap x; type `4mm` in its row | `wall = 4mm`; one undo restores `3mm` | none |
| Rename | focus `wall`'s name, F2, `side`, Enter | row `side`, gap x reads `side` | `id-taken` / `input-invalid` in the dialog |
| Delete used | `wall` used by gap x; Delete on its name | `wall` stays | `The parameter "wall" is used by …` under its row |
| Delete unused | Delete on `wall`'s name | row gone, one undo entry | none |

</frozen-after-approval>

## Code Map

- `packages/editor/src/slide-out/slide-out.ts:4-27` -- `SlideOut` (open, close, invoker). `toggle-slide-out.ts` -- T. `use-slide-out.ts` -- `returnFocus`. `LeftRail.vue:22` -- one `UiRailButton` invoking `ToggleSlideOut`. `TreeSlideOut.vue` -- the `aside` landmark (`useLandmark('slide-out')`, focus on mount `:19-25`, `returnFocus` on unmount `:26-30`). `shell/EditorShell.vue:25` mounts it. `devtools/slide-out-inspectable.ts` edits `isOpen`.
- `packages/ui/src/tabs/` (`UiTabs`, `UiTabList`, `UiTabPanel`, Reka Tabs; used by `EditorShell.vue:19`), `ui/src/rail-button/UiRailButton.vue`, `ui/src/icon/icons.ts` (lucide).
- `packages/editor/src/selection/acts-on-selection.ts:7-18` -- `slide-out` acts on the selection; callers `delete-selection.ts:48`, `duplicate-selection.ts`, `add-flow/start-add-slot.ts:45`, `start-add-chain-group.ts:45`, `start-add-free-group.ts:45`.
- `packages/editor/src/selection/delete-selection.ts:20-53` -- the one Delete UiAction ("Delete is one `DeleteSelection` that later stories extend", AD-26).
- `packages/editor/src/invoke/invoke.ts:30,84` -- `events` emits `invoke` `{ id, label, input, result }` (`invoke/types.ts` `InvokeEvent`) for every settled invocation, a UiAction's inner command included.
- `packages/editor/src/flows/` (`flows.ts` `start`, `register-flow.ts`, `use-open-flow.ts`, `FlowHost.vue`), `add-flow/add-slot-flow.ts`, `start-add-slot.ts`, `AddFlowView.vue` -- flow, starter UiAction and dialog-view pattern.
- `packages/editor/src/expression-field/ExpressionField.vue`, `types.ts` `ExpressionFieldProps`; `ui/src/autocomplete-field/UiAutocompleteField.vue:104` renders `label` visibly.
- `packages/model/src/parameters/check-rename-parameter.ts:21-23` -- the inline `id-taken` with `parameterTakenMessage` (`violations/parameter-taken-message.ts`); `set-parameter.ts` -- domain-op pattern; `main.ts` exports.
- `packages/commands/src/parameters/` -- `SetParameter`, `RenameParameter`, `DeleteParameter`, their input schemas, `types.ts`, `parameters-commands-module.ts`, `parameters-commands.spec.ts`; `commands/src/index.ts`. `schema/src/parameter.ts` (`parameterSchema`; its `value` has no unit metadata, so `evaluateField` accepts any unit, `evaluate-field.ts:33-40`).
- `packages/editor/src/hover/hovered-node.ts`, `use-hovered-node.ts` -- `di` service plus thin composable.
- `packages/editor/src/editor-module.ts:41-65` -- registrations.
- `packages/editor/src/slide-out/slide-out.spec.ts` (its `opens on T holding no text` asserts `toHaveTextContent('')` on the `aside`, which now holds the tab list), `workspace/layout/design-settings/design-settings.spec.ts`, `testing/mount-shell.ts`, `testing/press.ts` -- browser-spec patterns.
- `app/src/parameters.spec.ts:33` -- already proves a gap parameter moves Corney's keys with one undo; its `it.each` registration rows (`:134`) arrange their own `aDesign` and are the pattern, not `:58`, which runs the whole Corney script it does not read.
- `packages/editor/src/workspace/use-workspace.ts` -- a tab list's setter switching through `invoke`, the pattern for the slide-out's tab list. `packages/editor/src/devtools/services-classified.spec.ts:28-48` -- every registered non-handle class needs a row.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/model/src/parameters/check-add-parameter.ts`, `add-parameter.ts` (function each), `main.ts` -- `checkAddParameter(design, parameter)`: `id-taken` with `parameterTakenMessage` when a parameter has the name, else the value evaluated with `evaluateFieldExpression(design.parameters, value, parameterSchema.entries.value)`, a fault refused as `checkSetGap` refuses one (`expressionFaultMessage`, ids [name]; reading a failed parameter passes, as in `check-set-gap.ts`); `addParameter(draft, parameter)` appends it.
- [ ] `packages/commands/src/parameters/add-parameter.ts` (`AddParameter`, service), `add-parameter-input-schema.ts` (`addParameterInputSchema = parameterSchema`), `types.ts` (`AddParameterInput`), `parameters-commands-module.ts`, `index.ts` -- `parameters.addParameter`, label `Add parameter`; `available` forwards to the check.
- [ ] `packages/editor/src/slide-out/slide-out-tab-schema.ts` (`slideOutTabSchema = v.picklist(['tree', 'parameters'])`), `types.ts` (`SlideOutTab = v.InferOutput<typeof slideOutTabSchema>`), `slide-out.ts` -- `SlideOut` (service) gains `tab` and `open(tab?)`, defaulting to the last-used tab, keeping its invoker when already open, so a tab switch does not take over where close returns focus; `devtools/slide-out-inspectable.ts` gains an editable `tab`.
- [ ] `packages/editor/src/slide-out/toggle-slide-out-tab.ts` (`ToggleSlideOutTab`, service, id `slideOut.toggleSlideOutTab`, label `Toggle slide-out tab`), `toggle-slide-out-tab-input-schema.ts` (`v.strictObject({ tab: slideOutTabSchema })`), `show-slide-out-tab.ts` (`ShowSlideOutTab`, service, id `slideOut.showSlideOutTab`, label `Show slide-out tab`, opens or switches to the tab, never closes), `show-slide-out-tab-input-schema.ts`, `types.ts`, `use-slide-out-tab.ts` (function; a writable computed whose setter invokes `ShowSlideOutTab`, as `use-workspace.ts`); `LeftRail.vue` (one button per tab, running `ToggleSlideOutTab`); `ui/src/icon/icons.ts` (`parameters: SquareFunction`).
- [ ] `packages/editor/src/slide-out/SlideOutPanel.vue` (renamed from `TreeSlideOut.vue`), `TreeTab.vue`, `shell/EditorShell.vue` -- the `aside`, named by its open tab, holds `UiTabs` bound through `useSlideOutTab`, the header and the panel; on open, focus as today on Tree, and on Parameters the first name, else the root. `slide-out.spec.ts`'s `holding no text` test asserts the Tree panel holds no rows instead.
- [ ] `packages/editor/src/selection/acts-on-selection.ts` and its five callers -- takes the open tab; `slide-out` counts only on `tree`.
- [ ] `packages/editor/src/parameters/focused-parameter.ts` (`FocusedParameter`, service), `use-focused-parameter.ts` (function), `types.ts` (the folder's types: composable results, view props) -- the name whose row name holds focus, set on focusin, cleared on focusout; `devtools/services-classified.spec.ts` classifies it `notShown: 'the focused row, read off the DOM like Landmarks'`.
- [ ] `packages/editor/src/parameters/ParametersTab.vue`, `ParameterRow.vue` -- a `role="list"`; each name a focusable element (`tabindex="0"`, `aria-keyshortcuts` built from `StartRenameParameter.hotkeys` and `DeleteSelection.hotkeys`, never written out) whose double-click invokes `StartRenameParameter`; the value field (as text on a duplicate's row, which sets no `FocusedParameter`); the empty text; the Delete refusal under its row, from `delete-parameter-refusal.ts` (`DeleteParameterRefusal`, service: listens to `Invoke`'s `invoke` event for `parameters.deleteParameter`, holds the latest refusal by name, cleared when its row loses focus; classified `notShown: 'shown under its row'`) and `use-delete-parameter-refusal.ts` (function, thin composable).
- [ ] `packages/ui/src/autocomplete-field/UiAutocompleteField.vue`, `types.ts`, `AutocompleteField.spec.ts`, `workbench/states/autocomplete-field-states.ts`; `editor/src/expression-field/ExpressionField.vue`, `types.ts` -- `labelHidden?`: the label stays the input's name, for screen readers only.
- [ ] `packages/editor/src/parameters/add-parameter-flow.ts` (`AddParameterFlow`, service), `AddParameterView.vue`, `start-add-parameter.ts` (`StartAddParameter`, service, id `parameters.startAddParameter`, label `Add parameter`, empty input) -- finishes with `AddParameter`; `name` and `value` `UiTextField`s; the draft starts `{ name: '', value: '' }`, so finish is disabled with `input-invalid`'s reason until both parse (AD-26 forms).
- [ ] `packages/editor/src/parameters/rename-parameter-flow.ts` (`RenameParameterFlow`, service), `RenameParameterView.vue`, `start-rename-parameter.ts` (`StartRenameParameter`, service, id `parameters.startRenameParameter`, label `Rename parameter`, hotkey `F2`), `start-rename-parameter-input-schema.ts` (`v.strictObject({ name: v.optional(parameterNameSchema) })`), `types.ts` -- the double-click passes `{ name }`; F2 passes none and the name comes from `FocusedParameter`; `available()` (no input, `ui-actions/types.ts`) is true while `FocusedParameter` holds a name, which it does at a double-click, since the press before it focuses the name; finishes with `RenameParameter`.
- [ ] `packages/editor/src/selection/delete-selection.ts` -- on the Parameters tab with a focused parameter, available, running `DeleteParameter { name }`; its keys stay Delete and Backspace.
- [ ] `packages/editor/src/editor-module.ts`, `app/src/parameters.spec.ts` -- registrations; `parameters.addParameter { name: 'ks', value: '2mm' }` joins the `it.each` registration rows (their design holds `wall`); `commits parameters.setParameter run by its id` (`:58`) arranges its own `aDesign` instead of running the Corney script (its `deferred-work.md` entry names this file's next story).
- [x] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` (docs commit to main) -- for the spine: `parameters.addParameter` in AD-2's command list and the Data Schema rejection note; AD-26's Delete exception.
- [ ] Specs per the Boundary Table.

**Acceptance Criteria:**
- Given a design with `wall = 3mm` and gap x `wall`, when `wall`'s row value is set to `4mm` and then one undo, then `parameters` holds `4mm` after the edit and `3mm` after the undo.
- Given every existing spec, when `pnpm test` runs, then they pass.

## Design Notes

`Decision (plan):` rows are a plain `role="list"` with a focusable name, not a Reka Listbox, because a listbox option's children are presentational (WAI-ARIA 1.2, `option`: "Children Presentational: True") and the row holds an editable field.

`Decision (plan):` F2 and Delete read `FocusedParameter`, set by the row's focus events, not a DOM query in each UiAction, because AD-26 has a selection UiAction read UI state from services ("its `available()` reads the workspace, the focused region and the selection"), with `Landmarks` the one DOM reader; the double-click passes its `{ name }`.

`Decision (plan):` the Delete refusal reaches its row through `Invoke`'s `invoke` event, held by `DeleteParameterRefusal`, not a slot `DeleteSelection` writes, because `Invoke` already reports every settled invocation with its input (`invoke.ts:30`), so `DeleteSelection` stays a router.

`Decision (plan):` the rail buttons run `ToggleSlideOutTab { tab }`, not `ToggleSlideOut`, because DESIGN.md lights "the icon whose panel is open"; T keeps `ToggleSlideOut`.

`Decision (plan):` the `aside` is named by its open tab, not `Slide-out`, because F6 lands on it and its name says which panel it holds; `slide-out.spec.ts:12` keeps finding `Tree`.

`Decision (plan):` on opening the Parameters tab focus lands on the first name, else the `aside`, not the first value field, because EXPERIENCE says "Opening an overlay focuses its first meaningful item" and F2 and Delete act from a name; after a flow, focus returns to `+` or the name by EXPERIENCE's "closing returns focus to the invoker".

`Decision (plan):` specs find a name by its text inside its `listitem`, not by a role of its own or `getByTestId`, because the name is no ARIA widget (AGENTS.md: "role, then label, then text").

`Decision (plan):` commands, UiActions and flows are tagged `(service)`, not `(function)`, because AD-2 defines a command "as a class registered in `di`" and AD-26 resolves UiActions and flows through `di`.

`Decision (plan):` the tab list switches through `ShowSlideOutTab`, not by writing `SlideOut.tab`, because AD-26 sends "Every invocation from the UI (hotkey, click, gesture, menu, palette)" through `invoke`; not `ToggleSlideOutTab`, which closes on its own tab.

`Decision (plan):` the add view's value is a `UiTextField`, not an `ExpressionField`, because the glossary sets the Expression field apart from flows, as a field that commits as you go.

`Decision (plan):` `addParameterInputSchema` is `parameterSchema`, as `setParameterInputSchema` is (`set-parameter-input-schema.ts`), not a new object, because the input is one parameter.

`Decision (plan):` the Parameters icon is lucide `SquareFunction`, the nearest to the mockup's `ƒ`, not a hand-drawn SVG, because AD-26: "Icons are `@lucide/vue` behind one `ui` `Icon` component".

## Conformance Log

Pass 1 (two readers; 0 findings dropped):
- `Give every decision its rejected alternative` (last-used tab had no because) -- fixed.
- `A choice no requirement made is a decision` (focus on opening Parameters, focus after a flow, Backspace) -- fixed.
- `Every invocation from the UI … goes through one editor invoke path` (tab list wrote `SlideOut.tab`) -- fixed (`ShowSlideOutTab`, `useSlideOutTab`).
- `A component never calls useService itself` (refusal read from `Invoke` with no composable) -- fixed.
- `Types flow out of a schema file` (tab list kept twice) -- fixed (`slideOutTabSchema`).
- `Never delete, skip or weaken a failing test` (`slide-out.spec.ts` `toHaveTextContent('')`) -- fixed (rewrite named in the task).
- `Arrange only what the test uses` (`app/src/parameters.spec.ts:58` precedent) -- fixed (pattern `:134`; `:58` rewritten).
- `Arrange only what the test uses` (`parameters-commands.spec.ts` fixed `wall` arrange) -- fixed (AddParameter rows pass their design).
- Stale Code Map paths (`start-add-slot.ts:165`, `design-settings.spec.ts`) -- fixed.
- `Give every threshold three rows … an input that breaks an assumption` (add/rename invalid, duplicate names) -- fixed rows; duplicates asked (Sergii: read-only row).
- `Find elements by role, then label, then text` (focusable name has no role) -- fixed (Decision: text inside its listitem).
- Check 5 handle classes tagged `(service)` -- fixed (Decision).
- `a click or gesture passes its own input` (double-click) -- fixed.
- `Test a rule where it is defined` (AddParameter bad-value row tests the store) -- fixed (row dropped, then the check owns evaluation, pass 2).
- gap: `FocusedParameter` (`devtools/services-classified.spec.ts`) -- fixed.
- gap: header tab list (`SlideOutPanel.vue`) -- fixed.
- gap: `packages/editor/src/parameters/types.ts` -- fixed.
- gap: decisions without because (last-used tab, focus) -- fixed.
- gap: rename-invalid and add-dialog rows (`AddParameterView.vue`) -- fixed.
- gap: verify sentences for Create and Ctrl+click and the empty text (`tickets.toml` 14.13 verify) -- asked (Sergii: `No parameters.` now; the verify sentences move with the split, `deferred-work.md`).

Final pass (one reader; 0 dropped; fixes no reviewer has read):
- `zag's hotkey store never holds a second list` (`aria-keyshortcuts="F2 Delete"`) -- fixed (built from the handles).
- Contradicting double-click lines -- fixed.
- `Hold state in di services` cited for the DOM read -- fixed (AD-26 sentence cited).
- AD-2 `a refusal decidable by reading the design and the input … lives in one model check` (`checkAddParameter` named only the name) -- fixed (the check evaluates the value).
- `Arrange only what the test uses` (`app/src/parameters.spec.ts:60`; `addParameter` row colliding with `wall`) -- fixed.
- `Test a rule where it is defined` (name-schema reasons in editor rows) -- fixed (`add unit word` dropped; one schema reason row, `rename invalid`, stays as the flow's part).
- AD-25 `Lookups and state … are services` (refusal composable tagged function) -- fixed (`DeleteParameterRefusal`, service).
- Naming row `Glossary terms only` (slide-out, tab, rail) -- no change: EXPERIENCE's Words lists `slide-out` and `left rail` as UI chrome terms that are not domain words, and existing code names them (`SlideOut`, `slideOut.toggleSlideOut`).
- 📐 `SlideOut.open` overwrote the invoker on a tab switch -- fixed.

## Boundary Table

| Group | Row | Input | Expected | Level |
|---|---|---|---|---|
| rules | addParameter new | `[]`, `{ wall, 3mm }` | `[wall = 3mm]` | unit, model |
| rules | addParameter after | `[ks]`, `{ wall, 3mm }` | `[ks, wall]` | unit, model |
| rules | check add taken | `[wall]`, `{ wall, 1mm }` | `id-taken`, ids `[wall]`, `The design already has a parameter named "wall".` | unit, model |
| rules | check add free | `[wall]`, `{ ks, 2mm }` | ok | unit, model |
| rules | check add unit mismatch | `{ ks, 5 + 1mm }` | `unit-mismatch`, ids `[ks]` | unit, model |
| rules | check add unknown name | `{ ks, nope }` | `unresolvable-reference`, ids `[ks]` | unit, model |
| rules | check add reads failed | `[a = a]`, `{ ks, a }` | ok | unit, model |
| rules | check add negative | `{ ks, -1mm }` | ok (a parameter may be negative, `evaluate-field.ts`) | unit, model |
| rules | AddParameter refused | `[wall]`, `run(AddParameter, { wall, 1mm })` and `available` | both `id-taken`, design unchanged | unit, commands |
| rules | rows in order | `[b = 1mm, a = b * 2]` | rows `b`, `a`; `a`'s suffix `= 2 mm` | browser, editor |
| rules | empty | no parameters | `No parameters.` | browser, editor |
| rules | duplicate row | `[wall = 1mm, wall = wall * 2]` | second row's value is text `wall * 2 = 2 mm`, no field; F2 and Delete on its name do nothing | browser, editor |
| rules | value edit one entry | `wall = 3mm`; `4mm`, pause, `5mm`, blur | `wall = 5mm`; one undo restores `3mm` | browser, editor |
| rules | value refused | type `wall` in `wall`'s own row, pause | `dependency-cycle` text, `aria-invalid`, design unchanged | browser, editor |
| rules | rail Parameters | closed; press Parameters | open on Parameters; it expanded, Tree not | browser, editor |
| rules | rail same tab | open on Parameters; press Parameters | closed | browser, editor |
| rules | rail other tab | open on Parameters; press Tree | open on Tree | browser, editor |
| rules | T last-used | Parameters button, T, T | open on Parameters | browser, editor |
| rules | T first | fresh shell, T | open on Tree | browser, editor |
| rules | Delete unused | slot `a` selected; Delete on unused `wall`'s name | `wall` gone, `a` kept | browser, editor |
| rules | Delete used | `wall` used by gap x; Delete on its name | `wall` kept; alert `The parameter "wall" is used by …` under it | browser, editor |
| rules | refusal clears | after that, focus another row | no alert | browser, editor |
| rules | Delete in field | focus in `wall`'s value field, Delete | text edited, `wall` kept | browser, editor |
| rules | Ctrl+D on Parameters | slot `a` selected, focus on a name, Ctrl+D | no node added | browser, editor |
| rules | F2 rename | F2 on `wall`, `side`, Enter | row `side`; gap x `side` | browser, editor |
| rules | double-click rename | double-click `wall` | `Rename parameter` dialog, `wall` filled | browser, editor |
| rules | rename taken | `wall`, `ks`; rename `wall` → `ks` | dialog stays, `The design already has a parameter named "ks".` | browser, editor |
| rules | F2 elsewhere | focus on the canvas, F2 | no dialog | browser, editor |
| rules | add | `+`, `wall`, `3mm`, Enter | row `wall`; focus back on `+` | browser, editor |
| rules | add empty | `+`, nothing typed | Add disabled, reason shown | browser, editor |
| rules | add bad value | `+`, `wall`, `5 + 1mm` | Add disabled, `unit-mismatch`'s text | browser, editor |
| rules | rename invalid | F2 on `wall`, `2k` | Rename disabled, `A parameter name is a letter, then letters, digits or _.` | browser, editor |
| rules | tab list | open on Tree; press the `Parameters` tab | open on Parameters | browser, editor |
| rules | Backspace | Backspace on unused `wall`'s name | `wall` gone | browser, editor |
| rules | add taken | `wall` = `2mm`; `+`, `wall`, `1mm`, Enter | dialog stays with the message; `wall` = `2mm` | browser, editor |
| glue | label hidden | `labelHidden` | input named by `label`; label not visible | browser, ui |
| module boundaries | registration | main modules container | `run(AddParameter, …)` commits | integration, app |

## Verification

**Commands:**
- `pnpm typecheck && pnpm check:fast` -- expected: clean.
- `pnpm test` -- expected: all green.

**Manual checks:**
- `pnpm dev`, a new design, press the rail's Parameters button: `No parameters.` shows; `+` adds `wall = 3mm`; gap x `wall` re-spaces the chains when `wall` changes; F2 on `wall` renames it everywhere; Delete on it is refused under its row while gap x uses it.
