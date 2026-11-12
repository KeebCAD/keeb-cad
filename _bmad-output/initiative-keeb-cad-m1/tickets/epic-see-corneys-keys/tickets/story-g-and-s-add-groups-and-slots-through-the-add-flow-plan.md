---
title: 'G and S add groups and slots through the add flow'
type: 'feature'
ticket: 25
created: '2026-11-12'
status: 'built'
baseline_revision: 'a185d03b6e4b2397c2286478020bb7014829a8b4'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md'
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/mockups/add-flow-2.html'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing in the editor adds a group or a slot: G, Shift+G and S are unbound, and `Flows` (13.30) holds no real flow yet.

**Approach:** Two flows on `Flows`, `AddGroupFlow` (finishes with `AddGroup`) and `AddSlotFlow` (`AddSlot`), share one view, drawn in `mockups/add-flow-2.html`: a centred `UiDialog` titled `Add chain group in <parent id>` / `Add free group in <parent id>` / `Add slot in <parent id>`, a new `ui` Text field labelled `Id`, empty with the placeholder `generated if empty`, bound to the draft through `update`, the refusal's text below it, for a chain group a new `ui` Segmented control labelled `Axis` (Column ↑ / Row →), an Esc `kbd` hint and an `Add` button. Three UiActions start them with the parent from the selection: G a chain group, Shift+G a free group, S a slot; an empty field leaves `id` out, so the command mints it; each flow's `finished` selects the new node.

## Boundaries & Constraints

**Always:**
- The parent is the selected group, else the selected slot's group, else the root; with nothing or several nodes selected it is the root (glossary **add flow**; deferred-work.md, 15.4). The draft has no `index`, so the node goes after the parent's last child (spine AD-2: "an omitted index appends").
- Decision (Sergii 2026-11-12): the Id field starts empty and an empty field means a generated id: the draft then has no `id`, and `AddGroup`/`AddSlot` mint it (spine AD-2: "an omitted id is minted"), not a field pre-filled with a minted id, and not the view minting at submit, because one rule for ids stays in `model`. The field shows `draft.id ?? ''`; a keystroke calls `update` with `id: text`, or with `id` removed when `text === ''`. Only the empty string is omitted: `  ` is passed and refused by `idSchema` (`An id is kebab-case.`, `schema/src/id.ts`). Spine and docs change first (task 1).
- Decision (Sergii 2026-11-12): the empty field shows the placeholder `generated if empty` in `{colors.text-muted}`, not none, as Design settings show `inherits <value>` (DESIGN.md › Inspector and fields), so an enabled Add with nothing typed explains itself.
- Decision (Sergii 2026-11-12): G starts `AddGroupFlow` with `{ arrangement: 'chain', axis: 'y', parent }` and Shift+G with `{ arrangement: 'free', parent }`, not G free-only with chains left to 14.5's `layout.setArrangement`, because a hand-built layout like Corney's is chains of columns (EXPERIENCE.md walkthrough step 2); S starts `AddSlotFlow` with `{ parent }`. `parent` is always the id (the root's for the root); a start cancels any open flow (13.30).
- Decision (Sergii 2026-11-12): the chain dialog picks the axis in a Segmented control labelled `Axis`, `Column ↑` (`y`, preselected) and `Row →` (`x`), not always `y` and not a key per axis; each press calls `update` with the new `axis`. The on segment looks like an on chip (DESIGN.md › Chip: `{colors.fill-on}` fill, Mauve edge, leading ✓), picked from `mockups/add-flow-2.html` over radio buttons.
- Decision (plan): `UiSegmentedControl` builds on Reka's `RadioGroup`, not its `ToggleGroup` (`type="single"`), because a single ToggleGroup clears its value when the pressed item is pressed again (`reka-ui/dist/shared/useSingleOrMultipleValue.js:43`), and a chain always has an axis; a radio group keeps one checked and is announced as one choice of several.
- Decision (Sergii 2026-11-12): the look is `mockups/add-flow-2.html`: the `Id` label above the field in muted UI text, the field and reason as drawn, `Escape` and `Add` at the bottom right; a refused `Add` also shows the reason in its tooltip (`UiButton`'s `disabledReason`), as drawn; the root is named by its id, minted for a new design (`new-design.ts:33`).
- Decision (plan): G, Shift+G and S are available exactly when `actsOnSelection(landmarks.focusedPlace(), location.workspace)` holds (`selection/acts-on-selection.ts:7-18`) and `DesignStore.current` is some, not also asking `invoke.available(AddGroup, draft)` as the selection UiActions do (`delete-selection.ts:22-26`), because those run their command from the key, while these only start a flow, and `Flows` asks `available(finishesWith, draft)` at start and on every change (spine AD-26: "a flow checks its input nowhere else").
- The reason is `useOpenFlow`'s `reason`, shown as the field's error; `Add` takes it as `disabledReason`.
- Add's click and the form's submit (Enter in the field) call `finish`; the dialog's `dismiss` calls `cancel`. Focus return is Reka's (`FocusScope.js:120-130` focuses the element focused before the dialog once its content unmounts).
- Decision (plan): Enter finishes through the form's implicit submission (`<form @submit.prevent>`), not `@keydown.enter` on the field, because `UiButton` renders `type="button"` and a form with one text field submits on Enter in it (https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#implicit-submission), so no key handling is added beside the hotkey layer, which stands down under a modal.
- Decision (plan): `finished(input)` selects `input.id` when present, else the parent's last child (`lastChildId`), not always the last child, because a typed id names the node directly; it throws `InvariantError` when neither is found, because `AddGroup`/`AddSlot` just appended a child to `input.parent`.
- Decision (plan): one view for both flows, its title from the draft (`Add <arrangement> group` when it has an `arrangement`, else `Add slot`), not one view per flow nor `finishesWith.label`, because the views would differ only in the title and the axis row, and `AddGroup.label` (`add-group.ts:12`, `'Add group'`) can't tell a chain from a free group.
- Decision (plan): no pending-finish guard in the view (deferred-work.md, 13.30 review pass 3), not a disabled or resynced field, because `AddGroup`/`AddSlot` are commands the store runs synchronously (`design-store.ts:54,155`), so the finish settles in the same task's microtasks, before the browser dispatches another input event (https://html.spec.whatwg.org/multipage/webappapis.html#perform-a-microtask-checkpoint).
- Decision (plan): the dialog's body is `w-94` (376 px), not the palette's 560 px, because DESIGN.md › Add flow says "narrower" and the approved card is 250 px under a 28 px top bar (`mockups/add-flow-1.html:20,77`), 375 px at the real `{spacing.top-bar}` of 42 px.
- Decision (plan): the field's error reads `▲ <reason>` in `{colors.error}`, the ▲ `aria-hidden`, not plain text, because the approved card draws it so (`mockups/add-flow-1.html:33-34`).
- Decision (Sergii 2026-11-12): the Esc hint is `<UiKbd hotkey="Escape" />` as zag formats it (`Escape` on Linux and Windows, `Esc` on macOS), not `Esc` everywhere through a `formatHotkey` change.
- Decision (Sergii 2026-11-12): the empty Layout hint shows both keys as `UiKbd` chips, `G` from `StartAddChainGroup.hotkeys[0]` (the key comes from its handle, never the template) and `Ctrl+K` as `hotkey="mod+K"` in the template until the palette story gives it a handle; not plain text through a new `ui` hook, and not left to the palette story.
- Decision (Sergii 2026-11-12): rows 1a and 2 prove `finished` runs and selects the new node; that it runs once and gets the parsed input stays open in deferred-work.md for the first flow whose schema transforms its input, not left out, because these schemas transform nothing (`idSchema` only brands) and selecting twice gives the same selection.

**Never:**
- P, the Part picker, chain groups from G, undo (14.1), `CancelFlow`/`FinishFlow`, the palette; changes to `Flows`, `UiDialog` or the hotkey layer; E rows for several selected nodes or a selected id not in the design: no command reaches either before 15.4 (canvas and Tree clicks select one; the devtools' editable selection, `devtools/selection-inspectable.ts:17`, is no command, as 13.24 dropped its devtools-only rows), and `Selection` prunes on commit (`selection.ts:27-34`); row 15b covers several ids as the plain function's input.
- `vi.mock`, jsdom, snapshots.

## Boundary table

Level: E = unit in `editor` (browser mode, `mountShell`; G, S, T by `press`, Esc and Enter and typing by `userEvent`, whose events are trusted, so Enter submits the form); UI = unit in `ui`; M = unit in `model`. Arranged design (every E row): root `root` with group `g` holding slot `a`, then slot `b`. "Shows R" means the `Id` textbox is `aria-invalid` with accessible description R and `Add` is `aria-disabled`; "clear" means none of the three. "New ids" are the design's item ids after the row minus those before.

**Production bugs** (a wrong add costs the person's layout)

| # | Input / state | Expected | Level |
|---|---|---|---|
| 1 | Layout, canvas focused, nothing selected; G | a dialog named `Add chain group in root`; the `Id` field empty with placeholder `generated if empty`; clear; an `Axis` radio group with `Column` checked | E |
| 1a | as 1; Add | no dialog; one new id, which parses with `idSchema`; the root's last child a chain group with that id, axis `y` and no children; selection that id | E |
| 1b | as 1; `Row`; Add | the root's last child a chain group with axis `x` | E |
| 1c | Layout, canvas focused, nothing selected; Shift+G | one dialog, named `Add free group in root`, no `Axis` radio group; then Add: the root's last child a free group | E |
| 2 | as 1; type `thumb`; Enter | the root's last child chain group `thumb`; selection `[thumb]` | E |
| 3 | as 1; type `a` | shows `The design already has an item with the id "a".`; field `a` | E |
| 3a | as 3; Enter | design unchanged; dialog open; field `a`; shows the same | E |
| 3b | as 3; type `b` (field `ab`) | clear | E |
| 4 | as 1; type `x`, then clear the field; Enter | clear before Enter; then one new id, the root's last child; selection that id (Sergii 2026-11-12, at the build) | E |
| 5 | as 1; type `Foo Bar` | shows `An id is kebab-case.`; field `Foo Bar`; Enter adds nothing | E |
| 5a | as 1; type two spaces | shows `An id is kebab-case.`; Enter adds nothing | E |

**Rules**

| # | Input / state | Expected | Level |
|---|---|---|---|
| 6 | `g` selected, canvas focused; S; Add | dialog named `Add slot in g` first; then `g`'s children `a` then the new slot; selection the new slot | E |
| 7 | `a` (in `g`) selected; S; Add | `g`'s last child the new slot; selection it | E |
| 8 | `g` selected; G, Add; S, Add | a chain group last in `g`, a slot inside it; selection the slot | E |
| 9 | `b` (at the root) selected; S | dialog named `Add slot in root` | E |
| 10a | no design open (`mountShell` without one), canvas focused; G | no dialog | E |
| 10 | top bar focused; G; S | no dialog; design unchanged; neither keydown prevented | E |
| 11 | Outline, Tree row `b` focused; G | dialog named `Add chain group in root` | E |
| 11a | Outline, canvas focused; G | no dialog | E |
| 12 | canvas focused; G; Esc | no dialog; design unchanged; canvas focused | E |
| 13 | Tree open on Layout, row `b` focused; S; `Add` focused; Esc | no dialog; design unchanged; the `Tree` slide-out still shown | E |
| 14 | G; type `x`; Esc; G | the field empty | E |
| 15 | `nearestGroupId(root, id)`: `g`; `a`; `root`; `zz` (not in the tree) | `g`; `g`; `root`; none | M |
| 15a | `lastChildId(root, id)`: `g`; `root`; `b` (a slot); `zz` | `a`; `b`; none; none | M |
| 15c | `lastChildId(root, 'e')`, `root` holding only the empty group `e` | none | M |
| 15b | `parentForSelection(design, selected)`: `[]`; `[g]`; `[a]`; `[g, b]` | `root`; `g`; `g`; `root` | E (plain unit) |
| 16 | `UiTextField` labelled `Id`, error `E` / no error / placeholder `P` | a textbox named `Id`, `aria-invalid="true"`, description `E` / not invalid, no description / placeholder `P` | UI |
| 16a | `UiTextField`; typing `ab` | `update:modelValue` emitted `a`, then `ab` | UI |
| 17 | `UiSegmentedControl` labelled `Axis`, options `Column ↑`/`y`, `Row →`/`x`, value `y` | a radio group named `Axis`; `Column ↑` checked, `Row →` not | UI |
| 17a | as 17; press `Row →`; press `Column ↑` while checked | `update:modelValue` emitted `x` / nothing | UI |

</frozen-after-approval>

## Code Map

- `packages/editor/src/flows/{types.ts,flows.ts,register-flow.ts,use-open-flow.ts}` -- 13.30's API: `Flow<Input>` with `finished?(input)`; statics `kind = 'flow'`, `finishesWith`, `view: Component` (typed `Component`: the view's props name the class, `testing/test-rename-flow.ts:9-11`); `Flows.start(handle, draft)`; `useOpenFlow(entry)` → `draft`, `reason`, `update`, `finish`, `cancel`. Reuse; don't change.
- `packages/editor/src/testing/TestRenameView.vue` -- the view pattern (`UiDialog :open="true" @dismiss="cancel"`, `UiButton :disabled-reason="reason"`).
- `packages/editor/src/selection/{acts-on-selection.ts,delete-selection.ts:22-50,selection.ts:13-15}` -- the UiAction shape (one private `#draft(): Option<…>` read by `available()` and `apply`; `apply` answers `unavailable` under its own id on none); `Selection.select(ids)`, `ids`.
- `packages/model/src/layout-editing/node-tree.ts:6-30`, `main.ts` -- `findNode` (`Frozen` overload) and `isGroup` are private to `model` (`main.ts` exports only `nextSiblingId`, `subtreeIds`, `subtreeIdsOf` from this file); `nextSiblingId` is the pattern for `nearestGroupId` and `lastChildId`.
- `packages/commands/src/layout/{add-group,add-slot}.ts` -- `available` is `checkAddNode` (texts in `model/src/layout-editing/check-add-node.ts`), and an absent `id` is minted on apply; unchanged.
- `packages/ui/src/{dialog/UiDialog.vue,button/UiButton.vue,kbd/UiKbd.vue}` -- used as is.
- `packages/ui/src/theme/theme.css:18,25,27,73,85,100` -- `border-interactive`, `focus`, `error`, `spacing-field-height` (28 px), `radius-sm`, `text-mono`; `text-muted` for the placeholder.
- `packages/ui/workbench/{widgets.ts,states/*-states.ts}` -- one row and one state file per component; each component spec mounts its states (`button/Button.spec.ts`).
- `packages/editor/src/workspace/layout/{show-layout.ts:14,LayoutCanvas.vue:89-91,LayoutCanvas.spec.ts:21,68}` -- `hotkeys = ['1'] as const` so `hotkeys[0]` is a `string` under `noUncheckedIndexedAccess`; the hint and its "verbatim" test (`toHaveTextContent` reads the `kbd` text in line; the browser runs on Linux, where `mod+K` formats as `Ctrl+K`, as 13.24 recorded).
- `packages/editor/src/editor-module.ts:29-52` -- registrations.
- `packages/editor/src/testing/layout-canvas.ts:27-33` (`designOf`), `flows/flow-host.spec.ts:24-27`, `shortcuts/modal-keeps-keys.spec.ts:55` (`userEvent.keyboard('{Escape}')`), `selection/delete-selection.spec.ts:20-45` -- builders, role queries and key presses. Not copied: `delete-selection.spec.ts:132`'s real-timer wait and its `arrange` defaults (deferred-work.md).
- `eslint.config.ts:298` -- the entry-parameters glob gains `add-flow`.
- `devtools/services-classified.spec.ts` skips `kind === 'flow'` and `'ui-action'`; devtools show the open flow through 13.30's `FlowsInspectable` (manual check).

## Tasks & Acceptance

**Execution:**
- [ ] Docs, on main before the code branch -- spine AD-2 (`:234`) "the UI's add flow pre-fills a minted id the user may edit before it is committed" → its Id field starts empty, an empty field omits `id` (minted), a typed id is committed as typed; AD-26 Shortcuts "so a form passes its field as typed, empty included (`{ id: '' }`), never omits it (an omitted `id` means minted)" → a form passes its field as typed, except the add flow's empty Id field, which omits `id`; the glossary's **add flow** draft: an empty id field, no `id`, until the person types one. EXPERIENCE.md `:126` "an Id field holding a minted id, editable" → an empty Id field (placeholder `generated if empty`; left empty, the id is generated); DESIGN.md › Add flow (`:461`) gains the placeholder in `{colors.text-muted}`, the chain/free titles, the `Axis` row and the link to `mockups/add-flow-2.html`, and DESIGN.md gains **Segmented control** (on segment as an on chip); EXPERIENCE.md's Shortcuts row `G / S / P | Add group / add slot / place part` becomes `G / Shift+G / S / P | Add chain group / add free group / add slot / place part`, its Add flow row (`:126`) names G, Shift+G and the axis; the glossary's **add flow** names the chain and free starts. Shown to Sergii before committing; the mockup is committed with them.
- [ ] `packages/model/src/layout-editing/node-tree.ts` -- `nearestGroupId(root: Frozen<Group>, id: Id): Option<Id>` (function): the node's own id when it is a group, else its parent's, none when not in the tree; `lastChildId(root: Frozen<Group>, id: Id): Option<Id>` (function): the group's last child, none for a slot, an empty group or an id not in the tree. Both exported from `main.ts`. Rows 15–15a in `node-tree.spec.ts`.
- [ ] `packages/ui/src/text-field/{UiTextField.vue,types.ts,TextField.spec.ts}` -- `TextFieldProps { label: string; error?: string; placeholder?: string }`, `defineModel<string>()`; built on Reka's `Field`: `FieldRoot :invalid="error !== undefined"`, `FieldLabel` above, `FieldControl` as a mono `<input>` (`h-field-height`, `border-border-interactive`, `rounded-sm`, focus `border-focus`, invalid a 2 px `border-b-error`, `placeholder:text-text-muted`) and `FieldError` below holding `▲ <error>` in `text-error` (Reka sets the input's `aria-invalid`, `aria-labelledby` and `aria-describedby`, `reka-ui/dist/Field/FieldControl.js:59-61`, and shows `FieldError` only while invalid, `FieldError.js` `visible`). Workbench row and `workbench/states/text-field-states.ts` (empty with a placeholder, with a value, with an error); export from `ui`'s `index.ts`. Rows 16–16a.
- [ ] `packages/ui/src/segmented-control/{UiSegmentedControl.vue,types.ts,SegmentedControl.spec.ts}` -- `SegmentedControlProps { label: string; options: readonly SegmentedOption[] }` (`SegmentedOption = { value: string; label: string }`), `defineModel<string>()`; Reka `RadioGroupRoot` (`aria-label` the label, a muted label beside it as drawn) with one `RadioGroupItem` per option, joined segments with a `border-border-interactive` edge, the checked one `data-[state=checked]:` `bg-fill-on`, Mauve edge and a leading ✓. Workbench row and `workbench/states/segmented-control-states.ts`; export from `ui`'s `index.ts`. Rows 17–17a.
- [ ] `packages/editor/src/add-flow/{add-group-flow.ts,add-slot-flow.ts}` -- `AddGroupFlow implements Flow<AddGroupInput>`, `AddSlotFlow implements Flow<AddSlotInput>`: `finishesWith` `AddGroup` / `AddSlot`, `view: Component = AddFlowView`; `finished(input)` per the decision above, through the injected `Selection` and `DesignStore`.
- [ ] `packages/editor/src/add-flow/{start-add-chain-group.ts,start-add-free-group.ts,start-add-slot.ts}` (service, each; UiActions) -- ids `addFlow.startAddChainGroup` / `addFlow.startAddFreeGroup` / `addFlow.startAddSlot`, labels `Add chain group` / `Add free group` / `Add slot`, `hotkeys = ['G'] as const` / `['shift+G'] as const` / `['S'] as const`, `emptyInputSchema`; `available()` and `apply` read one private `#draft()`; `apply` starts the flow and answers ok.
- [ ] `packages/editor/src/add-flow/parent-for-selection.ts` -- `parentForSelection(design: Frozen<Design>, selected: readonly Id[]): Id` (function): `nearestGroupId(layout, id)` for exactly one selected id, else (and on none) the root's id. Row 15b in `parent-for-selection.spec.ts`.
- [ ] `packages/editor/src/add-flow/AddFlowView.vue` -- props `FlowViewProps<typeof AddGroupFlow | typeof AddSlotFlow>`; `UiDialog :open="true" @dismiss="cancel"`; title `{{ label }} in ` and `draft.parent` in a `font-mono` span; a `<form @submit.prevent>` calling `finish`, a `w-94` body with `UiTextField` labelled `Id` (placeholder `generated if empty`, model per the empty-field decision, error `reason`), for a chain draft a `UiSegmentedControl` labelled `Axis` (model `draft.axis`, each change through `update`), then a right-aligned row with `<UiKbd hotkey="Escape" />` and `UiButton` `Add` (`:disabled-reason="reason"`, `@click` → `finish`).
- [ ] `packages/editor/src/editor-module.ts` -- `registerFlow` both flows, `registerUiAction` the three UiActions.
- [ ] `packages/editor/src/add-flow/add-flow.spec.ts` -- rows 1–14; `arrange({ workspace = 'layout', selected = [] })` mounts the one arranged design (`designOf`), every row reading `g`, `a` or `b`.
- [ ] `packages/editor/src/workspace/layout/LayoutCanvas.vue:89-91` -- the hint's `G` as `<UiKbd :hotkey="StartAddChainGroup.hotkeys[0]" />`, `Ctrl+K` as `<UiKbd hotkey="mod+K" />`; "shows the empty-design hint verbatim" still passes unchanged.
- [ ] `eslint.config.ts` -- `add-flow` joins the entry-parameters glob.
- [ ] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` (docs, with the code) -- close the 13.30 field-resync entry by the decision above; the 23.8 hint entry: `G` done, `Ctrl+K`'s handle left to the palette story; the 13.30 `finished` entry: 13.25 proves only that it runs.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then every row passes at its level in Chromium and Firefox.
- Given each toggled bug, applied alone, then its rows go red and pass once restored (named in the PR): the focus check always true (10, 11a); the design check dropped, the parent falling back to a made-up root (10a); the slide-out place refused (11); the parent always the root (6, 7, 8, 15b); `nearestGroupId` returning a slot's own id (7, 9, 15); `lastChildId` returning the first child (1a, 4, 15a); `lastChildId` answering the group itself when empty (15c); the several-selected branch taking the first id (15b); the field not calling `update` (2, 3, 3a, 3b, 5); an empty field passed as `id: ''` (4); the error not passed to the field (3, 5); `disabledReason` unbound (3); the form's submit unbound (2); Add's click unbound (1a, 6); `finished` not selecting (1a, 2); `@dismiss` unbound (12, 13); the field keeping text across starts (14); `UiTextField`'s `aria-invalid`/`aria-describedby` dropped (16); its model not emitted (16a); the placeholder unbound (1, 16); G starting a free group (1, 1a); the axis not passed to `update` (1b); Shift+G bound as `G` (1c); the axis row shown for a free group (1c); the radio group's `aria-label` dropped (17); the model not emitted (17a).
- Given `pnpm --filter app dev` at `/?seed=corney` in Chromium and Firefox, when the ticket's verify is followed with the empty-field change (an empty field adds a generated id instead of refusing; after Esc, G shows an empty field), then each step behaves as it says; while the dialog is open the devtools Flows node lists the open `AddGroupFlow` or `AddSlotFlow` with its draft.

## Implementation Notes

- Toggled bugs, each applied alone and restored (2026-11-12): every one turned its named rows red, except `lastChildId` returning the first child, which leaves row 4 green: row 4's expected values (one new id, the root's last child) don't read the selection, the only place `lastChildId` reaches in the editor. Rows 1a and 15a go red. Sergii (2026-11-12): row 4 also asserts the selection; done.
- Decision (implementation): `finished`'s id lookup is one shared function, `add-flow/added-node-id.ts`, not a copy in each flow, because both flows select by the same rule; each flow throws `InvariantError` itself when no design is open, as `DuplicateSelection` does.
- Decision (implementation): an empty field deletes `id` from a copy of the draft, not a rest destructure, because the rest form leaves an unused binding the lint refuses.
- Decision (build): the Segmented control's segments use `px-2` (8 px), not the mockup's 10 px (`mockups/add-flow-2.html:61`), because the spine's Styling row makes spacing "Tailwind's 4px grid".
- Decision (build): the checked segment keeps `bg-fill-on` on hover, not the hover fill, because DESIGN.md › General states says "pressed/on fills `{colors.fill-on}`" and the on state must stay visible.
- Decision (build): the Segmented control names its group with `aria-label` and hides the visible label, not `aria-labelledby` on it; both are the WAI-ARIA radio group pattern's options ("labelled by aria-labelledby ... or aria-label"), logged low in review.

## Plan Change Log

- Build, Sergii (2026-11-12): frozen row 4 renegotiated to also expect "selection that id", because the toggled bug `lastChildId` returning the first child left it green (implementer's report). Test widened; the toggle now turns it red in Chromium and Firefox. KEEP: everything else.

## Review Triage Log

Pass 1 (quick, test-reviewer; 0 test-reviewer findings dropped for a missing quote). Verdicts: 0 high, 0 medium, 10 low, 2 false. Nothing above low and no frozen line broken: the loop ends, lows logged, not patched.
- low -- test-reviewer 1 / quick 5 (one root cause): `TextField.spec.ts` 'renders the $name state as a textbox named by its label' asserts only `toHaveValue(state.props.modelValue)` and queries the constant `LABEL`, so its name claims more than its `expect`.
- low -- test-reviewer 2: `SegmentedControl.spec.ts`'s states test takes the expected name from the fixture's own `label`.
- low -- test-reviewer 3 / quick 4 (one root cause): rows 6 and 7 label the asserted group `children` / `last`; row 7 narrows with `toMatchObject` where row 6 uses `toEqual`.
- low -- test-reviewer 4: rows 1b and 1c match partially (`{ arrangement: 'chain', axis: 'x' }`, `{ arrangement: 'free' }`); the rows ask only that.
- low -- quick 3: row 4 asserts the new node's id, not the whole node as rows 1a and 2 do.
- low -- test-reviewer 5: row 4 interleaves an assertion between two acts, as its table row reads ("clear before Enter; then ...").
- low -- test-reviewer 6: row 8 destructures `newIds()` as `[group, slot]`, relying on `subtreeIds`' parent-first order.
- low -- quick 6: `AddFlowView.onId` also drops `id` for `undefined` (the field's model type allows it) and `onAxis` ignores a value outside `AXES`; neither is a recorded decision.
- low -- quick 7: segment padding 8 px vs the mockup's 10 px (decision recorded: the 4 px grid), and the `Axis` label without the mockup's 36 px width.
- low -- quick 8: `node-tree.spec.ts` names its block 'the add flow tree queries' for two generic `model` queries.
- low -- review (own): the Segmented control's `aria-label` beside an `aria-hidden` visible label instead of `aria-labelledby` (decision recorded).
- false -- quick 1: the frozen row-4 change has no change-log entry; it is logged above (Plan Change Log, Sergii's renegotiation).
- false -- quick 2: the Review Triage Log was empty because triage had not run yet; this is it.
- note -- test-reviewer 7: the "opens nothing" rows press the same event `press('G')` sends; no change.

## Design Notes

- Decision (plan): `AddGroupFlow` and `AddSlotFlow` carry no `(service)`/`(function)` tag, not `(service)`, because the spine makes a flow class its handle ("A flow class is a handle, not state, so the devtools classification skips it", AD-26), an entry `di` resolves, not a service a caller injects, as 13.30 decided for its test flows. `AddFlowView.vue`, `UiTextField.vue` and `UiSegmentedControl.vue` carry none either, not `(function)`, because AD-25's split sorts services and plain functions, and a component is neither, as 13.30 left `FlowHost.vue` untagged.
- Decision (plan): `finished`'s `InvariantError` (no typed id and no last child) has no row, not a test that forces it, because no command reaches it: the store committed the append before `finished` runs (13.30: "on ok the flow pops, then its `finished` runs"), as 13.24 left `DuplicateSelection`'s missing-copy throw untested.
- Decision (plan): `nearestGroupId` and `lastChildId` live in `model`, not `editor`, because they are node-tree queries over `findNode` and `isGroup`, which `model` keeps private (`main.ts`), as `nextSiblingId` does; the add flow's own rule (one selected id, else the root) is `editor`'s `parentForSelection`.
- Decision (plan): `parentForSelection` falls back to the root for a selected id not in the design, not a throw, because only a race could reach it (`Selection` prunes on commit) and the root is where nothing selected goes; untested, with the several-selected branch, by the Never list.
- Decision (plan): the draft names the root's id, not omitting `parent`, because the title reads the parent from the draft in every case.
- Decision (plan): rows 3, 5 and 5a assert each refusal's text, not one row for any reason, because the texts reach the field by two paths `editor` wires (a model rejection's message and `input-invalid`'s first issue, `rejection/rejection-text.ts`) and the ticket's verify names each case.
- Decision (plan): `UiTextField` builds on Reka's `Field` primitives, not a native label and input with ARIA wired by hand, because the Stack row gives `reka-ui` the widget primitives and `Field` wires the label, `aria-invalid` and the error's `aria-describedby` itself (`FieldControl.js:59-61`).
- Decision (plan): `UiTextField` takes `label`, `error` and `placeholder` only, not every input attribute, because the add flow needs those; the Expression field, Part picker search and palette query extend it in their stories (component-ownership.md: "A later slice ... extends the component").
- Decision (plan): the folder `add-flow/` and the ids `addFlow.*` take the glossary's **add flow**, not `layout`, because a command id is "`<concept folder>.<verb+noun camelCase>`" (spine Naming); `StartAddChainGroup`/`StartAddFreeGroup`/`StartAddSlot` are verb+noun, and `UiSegmentedControl` is named for what it shows, not after Reka's `RadioGroup` it wraps.
- Decision (plan): rows 1–14 are `editor` units through `mountShell`, not `app` integration, because the rule they test is defined in `editor` (AGENTS: "Test a rule where it is defined"), as 13.24's rows were.
- Decision (plan): no row checks the devtools stack, not a copy of 13.30's row 20, because that rule is defined and tested in 13.30.

## Conformance Log

Pass 1 (two readers and the gap reviewer; 0 findings dropped for a missing quote or path; one reader's claim that `findNode`/`isGroup` are exported from `model/main` is wrong, `main.ts` checked):
- `Every class or function the plan adds carries a (service) or (function) tag` (flows) -- fixed (Decision: handles)
- `Put code in the package that owns the concept, never in model just because every package can reach it` (`addParentOf`) -- fixed (tree queries renamed, rule in `editor`)
- `Name a thing for what it does` (`addParentOf`/`addParent`) -- fixed (`nearestGroupId`, `parentForSelection`)
- `Test calculations as units in the package that owns them` (`addParent` untested) -- fixed (row 15b)
- `Test a rule where it is defined` (refusal texts in `editor`) -- fixed (decision: two wiring paths, ticket verify)
- test-reviewer check 6, platform-dependent hint text (`LayoutCanvas.spec.ts:21`) -- fixed (Code Map: Linux, as 13.24)
- `Give every decision its rejected alternative` (root id decision, two Ys) -- fixed
- `Arrange only what the test uses, passed as arguments to an arrange helper` (unnamed design) -- fixed (`arrange` signature)
- `A choice no requirement made is a decision` (form submit for Enter) -- fixed
- gap: no ask of `AddGroup`'s availability, design-open source -- fixed (Decision, `DesignStore.current`)
- gap: toggled bugs for 3a, 3b, 9, 11, 16, 16a, Add's click -- fixed
- gap: `hotkeys[0]` typing (`show-layout.ts:14`) -- fixed (`as const`)
- gap: `UiTextField` reusers (Expression field, Part picker, palette) -- fixed (Decision: they extend it)
- gap: synthetic Enter can't submit a form (`testing/press.ts`) -- fixed (`userEvent` for Enter, Esc, typing)

Final pass (one reader; 0 dropped):
- `Give every threshold three rows` (several selected; the reason "only canvas and Tree clicks select" ignored the devtools' editable selection) -- fixed (row 15b `[g, b]`; reason reworded)
- `add empty input` (`lastChildId` on an empty group) -- fixed (row 15c)
- `Give every test an expect that fails when the behaviour breaks` (no-design availability) -- fixed (row 10a); (`finished`'s throw) -- fixed (Decision: unreachable)
- `When a decision builds by hand the main job of a dependency in the spine's Stack table, that dependency is its Y` (`UiTextField` ARIA) -- fixed (on Reka's `Field`; no reviewer has read this fix)
- `Every class or function ... carries a (service) or (function) tag` (`AddFlowView`, `UiTextField`) -- fixed (Decision: components)
- low: `arrange` mounts one design every row, rows 1, 2, 4, 12, 14 using none of `g`, `a`, `b` -- logged (one design keeps rows comparable; their expectations read only the root)
- low: precedent `modal-keeps-keys.spec.ts` scrim test sets no colour scheme -- logged (not copied)

## Verification

**Commands:**
- `pnpm test` -- expected: all pass, no type errors.
- `pnpm lint` -- expected: clean.
- `pnpm depcruise` -- expected: no violations.

**Manual checks:**
- `pnpm --filter app dev`, `/?seed=corney`, Chromium and Firefox: the ticket's verify with the empty-field change; on screen a centred dialog over a scrim, as `mockups/add-flow-1.html` option B, its Id field empty with a muted `generated if empty`, G's with the `Axis` segments (Column checked), Shift+G's without; the empty Layout hint (New design) with `G` and `Ctrl+K` as key-cap chips.
- `pnpm --filter @keeb-cad/ui workbench`: the Text field row in its three states and the Segmented control row, both themes.
