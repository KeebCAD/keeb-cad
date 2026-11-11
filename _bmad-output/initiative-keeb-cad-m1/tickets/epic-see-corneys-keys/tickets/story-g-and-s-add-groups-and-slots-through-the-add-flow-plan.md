---
title: 'G and S add groups and slots through the add flow'
type: 'feature'
ticket: 25
created: '2026-11-11'
status: 'draft'
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
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md'
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing in the editor adds a group or a slot. And `Invoke.available` answers a boolean that is `true` on a parse failure, so a form can't tell a person why their typed id is refused.

**Approach:** `Invoke.available(handle, input?)` returns `Result<void, Rejection>` (spine AD-26 Shortcuts, 2f64fbd): a parse failure of caller-passed input is an `input-invalid` refusal, of built input ok. One pure `editor` function turns a `Rejection` into the text a person reads. G and S are `editor` UiActions that open an add flow (an `AddFlow` service plus one component) holding a minted id the person may edit; as they type, the flow asks `available(AddGroup | AddSlot, input)` and on a refusal disables confirm and shows the reason; confirm runs the command through `invoke`, and the new node becomes the selection. The parent is the selected group, else the selected slot's group, else the root, appended last.

## Boundaries & Constraints

**Always:**
- G and S act with focus on the canvas on the Layout workspace, or in the slide-out's Tree tab on any workspace, the rule 13.24's keys follow (`selection/acts-on-selection.ts:7-18`).
- The flow passes its field as typed, empty included (`{ id: '' }`), never omitted (spine AD-26 Shortcuts).
- G adds `{ arrangement: 'free', parent, id }`, S `{ parent, id }`; no `index`, so the node goes after the parent's last child (spine AD-2 Layout commands: "an omitted index appends").
- The parent is decided when the flow opens, not at confirm.
- The docs are on main already: DESIGN.md › Text field (`DESIGN.md:440`) and › Add flow (`:461`), the spine's glossary **add flow** (`:131`), its rejection-text sentence (`:780`) and `idSchema`'s non-empty check (`:823`), and `component-ownership.md:13`.
- Decision (Sergii 2026-11-11): the add flow is a small modal dialog centred on the screen, not under the top bar (palette position), not a popover beside the selection, and not an inline Tree row, so it sits in one place whatever had focus. Contents as DESIGN.md › Add flow sets them: title `Add group in <parent id>` / `Add slot in <parent id>` (the root's id when the parent is the root, the id in `{typography.mono}`), a Text field labelled `Id`, the reason below it, a `kbd` Esc hint, and an `Add` button disabled with its reason; Esc closes it, adding nothing; focus returns where it was. Built on 13.27's `UiDialog` (`packages/ui/src/dialog/UiDialog.vue`: `open`, `update:open`, a `title` slot).
- Esc reaches the dialog because 13.27's hotkey layer runs no entry while a modal is open (spine AD-26 Shortcuts: "an open **modal** keeps every key"); this story adds no key handling of its own.
- Decision (Sergii 2026-11-11): `idSchema` gains `v.nonEmpty('An id is required.')` before its kebab-case regex, so an empty field and `Foo Bar` each show their own reason, not one shared `An id is kebab-case.` with the verify reworded, because "required" tells the person what to do. The spine's Data Schema states it (`:823`).
- Decision (Sergii 2026-11-11): `rejectionText` words the store's own kinds `unavailable` → `Not available right now.`, `unknown-command` → `No such command.`, `stale` → `The design changed; try again.`, not texts naming the command id, because the spine says a command id is "never shown" (glossary, command id).
- Decision (Sergii 2026-11-11): with more than one selected id the parent is the root, as with nothing selected, not the first-selected node's group nor the group they all share, because no state reaches several selected ids before 15.4 and the root is the predictable answer; 15.4 revisits it (deferred-work.md). No row arranges it ("Arrange only a state real commands could reach").

**Never:**
- P and the Part picker; chain groups from G (G adds a free group); undo (14.1); the palette or menus; focus management beyond what the dialog primitive gives; changes to `UiDialog` or the hotkey layer (13.27); `CloseSlideOut`'s Escape (13.28).
- A second check of the typed id outside `Invoke.available`; `vi.mock`; jsdom; snapshots.

## Boundary table

Level: U = unit in the named package (browser mode for `editor` and `ui`), I = integration.

**Production bugs** (a wrong add costs the user's layout)

| # | Input / state | Expected | Level |
|---|---|---|---|
| 1 | Layout, canvas focus, nothing selected; G, confirm with the pre-filled id | a free group with that id is the root's last child, and is the selection | U editor |
| 1a | as 1, before confirm | a `dialog` named `Add group in <root id>` | U editor |
| 2 | as 1, the field edited to `thumb` | the committed group's id is `thumb` | U editor |
| 3 | G, field `a` where `a` is in the design | confirm disabled; `The design already has an item with the id "a".` shown; field keeps `a` | U editor |
| 3a | as 3, Enter | design unchanged, flow still open with `a` | U editor |
| 3b | as 3, field changed to `ab` (not in the design) | confirm enabled, no reason shown | U editor |
| 4 | G, field cleared to `` | confirm disabled; `An id is required.` shown | U editor |
| 4a | `idSchema` on `` / on `a` / on `Foo Bar` | first issue `An id is required.` (Valibot runs the regex too: `safeParse('')` gives `['An id is required.', 'An id is kebab-case.']`, run 2026-11-11) / ok / issues `['An id is kebab-case.']` | U schema |
| 5 | G, field `Foo Bar` | confirm disabled; `An id is kebab-case.` shown | U editor |

**Rules**

| # | Input / state | Expected | Level |
|---|---|---|---|
| 6 | group `g` selected; S, confirm | dialog named `Add slot in g`; slot added as `g`'s last child, selected | U editor |
| 7 | slot `a` (in group `g`) selected; S, confirm | slot added as `g`'s last child, selected | U editor |
| 8 | group `g` selected; G, confirm, then S, confirm | group inside `g`, then a slot inside the new group, each selected | U editor |
| 9 | focus in the top bar; G, then S | flow not open, design unchanged, key not prevented | U editor |
| 10 | Outline workspace, Tree row focused; G | flow opens | U editor |
| 10a | Outline workspace, canvas focused; G | flow not open | U editor |
| 11 | the pre-filled id | parses with `idSchema` and is not in the design | U editor |
| 12 | `groupOf(root, id)`: a group's id / a slot's id / the root's id / an id not in the tree | that group's id / the slot's parent's id / the root's id / none | U model |

**Module boundaries**

| # | Input / state | Expected | Level |
|---|---|---|---|
| 13 | `available(command)` with no design open | `err({ kind: 'unavailable', command })`, builder not asked | U editor |
| 13a | `available(uiAction)` with no design open, its `available()` true | `ok()` | U editor |
| 14 | `available(command, { name: '' })` (caller input its schema refuses) | `err({ kind: 'input-invalid', command, issues })`, check not asked | U editor |
| 15 | `available(command)`, builder's input its schema refuses | `ok()`, check not asked | U editor |
| 16 | `available(command, valid)`, check refuses `{ kind: 'stale', seq: 1, latest: 2 }` | that rejection | U editor |
| 17 | `available(command, valid)`, check ok | `ok()` | U editor |
| 18 | `available(uiAction, valid)`, its `available()` false | `err({ kind: 'unavailable', command: id })` | U editor |
| 19 | `rejectionText` of a model rejection `{ kind: 'id-taken', ids, message: 'm' }` | `'m'` | U editor |
| 20 | `rejectionText` of `input-invalid` with issues `[x, y]` | `x.message` | U editor |
| 20a | `rejectionText` of `input-invalid` with `issues: []` | throws `InvariantError` | U editor |
| 21 | `rejectionText` of `unavailable`, `unknown-command`, `stale` | `Not available right now.` / `No such command.` / `The design changed; try again.` | U editor |

**Glue**

| # | Input / state | Expected | Level |
|---|---|---|---|
| 22 | shortcut registry, entry's `available` is an err | key not run, not prevented (existing rows keep their claims, asserted on the Result) | U editor |
| 23 | `useInvoke().available` | the service's Result, unchanged | U editor |
| 25 | `UiTextField` labelled `L` with error `E` / with none (the workbench's two states) | a textbox named `L`, `aria-invalid` and described by `E` / not invalid, no message | U ui |
| 25a | `UiTextField`, typing `ab` | emits `update:modelValue` `ab` | U ui |
| 26 | flow opened from the canvas; Esc | flow closed, design unchanged, focus back on the canvas | U editor |
| 26a | flow opened from the Tree tab; focus on Add; Esc | flow closed, design unchanged, slide-out still open | U editor |

</frozen-after-approval>

## Code Map

- `packages/editor/src/invoke/invoke.ts:61-69` -- `available` returns a boolean; `#inputFor` (`:77-81`) already tells caller input (`!== undefined`) from built; `#check` (`:112-123`) gives the store's or the UiAction's `Result`. New order: a command with no design open → unavailable (a UiAction or action is not; today's guard `handle.kind === 'command'`, `:63`, stays); caller input → `#check` as is; built input → a parse failure is ok without the check.
- `packages/editor/src/invoke/invoke.spec.ts:194-197,384-490` -- `:194-197` (in the `invoke` describe) and the `available` describe assert booleans; rows 13–18 rewrite it (the requirement changed: 2f64fbd). The row "available for input its schema refuses" (`:398-403`) becomes row 14.
- Callers moving to `.isOk()`: `shortcuts/shortcut-registry.ts:65`, `selection/delete-selection.ts:28`, `selection/duplicate-selection.ts:29`. Specs asserting the boolean: `viewport/fit-viewport.spec.ts:132,145`, `workspace/workspace.spec.ts:45`, `slide-out/slide-out.spec.ts:52,62`, `selection/{delete,duplicate}-selection.spec.ts:106,119,75`, `invoke/use-invoke.spec.ts`.
- `packages/editor/src/selection/acts-on-selection.ts` -- reused as is for G and S.
- `packages/editor/src/selection/selection.ts:13-15` -- `select(ids)`; reads `ids`.
- `packages/commands/src/layout/{add-group,add-slot}.ts` -- `available` already returns `checkAddNode`'s rejection (13.24); unchanged. `add-group-input-schema.ts:14-17` needs `arrangement`.
- `packages/model/src/ids/mint-id.ts` -- `mintId()`, exported from `model/main` (`main.ts:2`).
- `packages/model/src/layout-editing/node-tree.ts:6-21` -- `findNode`'s `Frozen` overload and `isGroup` serve `groupOf`.
- `packages/schema/src/id.ts:3-7` -- `idSchema`: one regex issue, `'An id is kebab-case.'`, for both `` and `Foo Bar`.
- `packages/schema/src/types.ts:159-173` -- `SchemaIssue { path, message }`, `Rejection`.
- `packages/ui/src/button/UiButton.vue` -- `disabledReason` sets `aria-disabled` and a tooltip; it renders `type="button"` after `v-bind="$attrs"` and emits `click` only with no `disabledReason`, so it never submits a form: `Add` calls `confirm` from its `click`, and the form's `@submit` handles Enter in the field.
- `packages/ui/src/kbd/UiKbd.vue` -- `hotkey` prop formatted through `formatHotkey`; the Esc hint is `<UiKbd hotkey="Escape" />`.
- `packages/ui/workbench/{widgets.ts,states/*-states.ts}` -- one row and one state file per component, and each component spec mounts its state file (`button/Button.spec.ts`); `UiTextField` follows.
- `packages/ui/src/dialog/UiDialog.vue` -- 13.27's wrapper: `DialogProps { open }`, `DialogEmits` (`update:open`), slots `title` and default; centred, scrim, `aria-describedby` undefined. Used as is. Reka's `FocusScope` returns focus to the element focused before the dialog opened (`reka-ui/dist/FocusScope/FocusScope.js:117,129`), which row 26 relies on.
- `packages/editor/src/shortcuts/modal-keeps-keys.spec.ts` -- 13.27's rows opening a real `UiDialog` over `mountShell`; the pattern for 26 and 26a.
- `packages/editor/src/devtools/services-classified.spec.ts:25-35` -- every non-UiAction class `editorModule` registers needs a row; `AddFlow` gets one (Open Question).
- `packages/editor/src/invoke/use-invoke.ts`, `slide-out/use-slide-out.ts` -- the composable-over-`useService` pattern `use-add-flow.ts` follows.
- `packages/ui` has no text field (`packages/ui/src/` holds button, canvas-toggle, dialog, format, hotkeys, icon, kbd, rail-button, severity-count, tabs, tooltip, tree).
- `packages/ui/src/hotkeys/hotkey-layer.ts` -- since 13.27 every hotkey has `enableOnFormTags: false` and the layer is silent while a modal is open, so G, S and Delete never fire inside the flow.
- `packages/editor/src/shell/EditorShell.vue` -- mounts the flow's component.
- `packages/editor/src/editor-module.ts:28-50` -- registrations.
- `packages/editor/src/testing/{mount-shell.ts,press.ts}` and `selection/delete-selection.spec.ts:20-45` -- the pattern for rows 1–11 (real keydowns through `mountShell`). Not copied: its `await new Promise((settle) => setTimeout(settle, 0))` (`:132`), which breaks "Set time with Vitest's fake timers"; rows wait with `expect.poll` or `expect.element` (deferred-work.md); and its `arrange` defaults (`selected = [anId('a')]`): rows 1–11 pass what they use.
- `eslint.config.ts:296` -- entry-parameters glob `packages/editor/src/{workspace,landmarks,slide-out,viewport,selection}/**/*.ts` gains `add-flow`.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/schema/src/id.ts` -- `v.nonEmpty('An id is required.')` before the regex. Row 4a in `id.spec.ts`.
- [ ] `packages/model/src/layout-editing/node-tree.ts` -- `groupOf(root: Frozen<Group>, id: Id): Option<Id>` (function); export from `main.ts`. Row 12.
- [ ] `packages/editor/src/invoke/invoke.ts` -- `available` returns `Result<void, Rejection>` in the order above. Rows 13–18; callers and specs listed in the Code Map move to the Result. Rows 22–23.
- [ ] `packages/editor/src/rejection/rejection-text.ts` -- `rejectionText(rejection: Rejection): string` (function), an exhaustive ts-pattern match. Rows 19–21.
- [ ] `packages/editor/src/add-flow/add-flow.ts` -- `AddFlow` (service): reactive `request: Option<AddRequest>`; `open(kind)` (parent from the one selected id through `groupOf`, else `undefined`; `mintId()`; throws `InvariantError` when a request is already open); `check(id: string): Result<void, Rejection>` through `invoke.available`; `confirm(id: string): AsyncResult<void, Rejection>` through `invoke.invoke`, on ok selecting `[id]` and closing, on a refusal staying open; `close()`. One private `#input(id)` both use.
- [ ] `packages/editor/src/add-flow/types.ts` -- `AddKind = 'group' | 'slot'`, `AddRequest = { kind: AddKind; parent: Id | undefined; mintedId: Id }`, `UseAddFlowResult`.
- [ ] `packages/editor/src/add-flow/use-add-flow.ts` -- `useAddFlow(): UseAddFlowResult` (function): the request as a computed, `check`, `confirm`, `close`, over `useService(AddFlow)`.
- [ ] `packages/editor/src/add-flow/{open-add-group.ts,open-add-slot.ts}` -- `OpenAddGroup` (service; UiAction): id `addFlow.openAddGroup`, label `Add group`, hotkeys `['G']`; `OpenAddSlot` (service; UiAction): `addFlow.openAddSlot`, `Add slot`, `['S']`; `emptyInputSchema`. Available when `actsOnSelection(...)`; apply opens the flow. Registered in `editor-module.ts`.
- [ ] `packages/ui/src/text-field/{UiTextField.vue,types.ts}` -- a labelled mono `<input>` as DESIGN.md › Text field sets it (`{colors.border-interactive}` edge, `{rounded.sm}`, focus `{colors.focus}` border, invalid `{colors.error}` underline and the message below): `TextFieldProps { label; error? }`, `defineModel<string>()`, the error wired by `aria-invalid` and `aria-describedby` (an id from Vue's `useId`). Workbench row and `workbench/states/text-field-states.ts` (plain, with an error); rows 25–25a in `TextField.spec.ts` mount them; exported from `ui`'s index.
- [ ] `packages/editor/src/add-flow/AddFlowDialog.vue` -- mounted in `EditorShell.vue`; open while `AddFlow.request` is some; `UiDialog` whose `title` slot reads `Add group in ` / `Add slot in ` and the parent's id in a mono span (the root's id for the root), `UiTextField` labelled `Id` starting at the minted id and its error `rejectionText` of `check(text)`'s refusal (or of `confirm`'s, whatever its kind), `<UiKbd hotkey="Escape" />`, and an `Add` `UiButton` with that reason as `disabledReason`, whose `click` calls `confirm`; the form's `@submit` (Enter) calls `confirm` too; closing calls `close`. Holds the typed text as component state. Rows 1–11 and 26–26a in `add-flow.spec.ts`.
- [ ] `eslint.config.ts` -- `add-flow` joins the entry-parameters glob.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row passes at its level.
- Given each browser row group, when its toggled bug is applied, then its rows go red and pass once restored (named in the PR): the focus check dropped (9, 10a, 10 with the Tree branch dropped), the reason not shown (3, 4, 5), the typed id replaced by the minted one (2, 3b), `confirm` adding without `invoke`'s check (3a), the parent rule returning the root always (1a, 6–8), the new node not selected (1), the mint skipped (11), the command guard dropped (13a), the caller-input branch answering ok (14), a built-input parse failure answering err (15), the rejection replaced by `unavailable` (16, 18), `.isOk()` inverted in the registry (22), `useInvoke` mapping to a boolean (23), `aria-invalid` omitted (25), the model not emitted (25a), `update:open` not wired to `close` (26, 26a).
- Given `pnpm --filter app dev` at `/?seed=corney` in Chromium and Firefox, when the ticket's verify is followed, then each step behaves as it says.

## Open Questions

1. **`AddFlow` in the devtools classification** -- waits on a bmad-architecture pass (Sergii 2026-11-11: "something that needs an arch approach, as this is just the first of many such cases; some unified approach"): which `editor` services the devtools show, as a rule, not per service. (`devtools/services-classified.spec.ts:25-35` needs a row). Rule: the spine registers inspectables "over each shown service's public API" (`:1085`) and says nothing on which services are shown. Pick: `notShown: 'the open add flow is on screen as its dialog'`, not an inspectable, because the dialog itself shows the whole request.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

- Decision (plan): `rejectionText` throws `InvariantError` for an `input-invalid` with no issues, not a fallback text, because Valibot never fails with none (`valibot/dist/index.d.cts:2744`: `issues: [InferIssue<TSchema>, ...InferIssue<TSchema>[]]`), so an empty list is a bug.
- Decision (plan): G and S reuse `actsOnSelection`, not a new focus rule, because the ticket says "G and S act with focus on the canvas or in the slide-out's Tree tab, like 24's keys".
- Decision (plan): `groupOf` lives in `model`, not `editor`, because the rule reads the node tree (`findNode`, `isGroup`, both `model`'s) and P will use it too (EXPERIENCE.md Part field); `editor` only picks which selected id to ask about.
- Decision (plan): Enter on a refused id runs `confirm`, and `invoke` refuses it, not a second guard in the component, because the spine routes "every invocation from the UI … through one `editor` invoke path" that checks before it runs (AD-26), and the Never list bans a second check.
- Decision (plan): rows 1–11 are `editor` units through `mountShell` and real keydowns, not `app` integration, as 13.24's rows 1–9 were: the rule is defined in `editor`'s UiActions and `AddFlow` (AGENTS: "Test a rule where it is defined").
- Decision (plan): `UiTextField` is its own `ui` component, not an `<input>` inline in `AddFlowDialog.vue`, because the Expression field, the Part picker's search and the palette's query need the same field and `component-ownership.md` says a component "is built once, by its owning slice".
- Decision (plan): the field's label is `Id`, not unlabelled, because AGENTS says "Find elements by role, then label" and the glossary's term is id; the button's `Add` is the approved preview's.
- Decision (plan): `OpenAddGroup` and `OpenAddSlot` don't check for an open flow, not an `available()` that reads `AddFlow.request`, because the layer runs no entry while a modal is open and the spine rejects "each UiAction checking for an open modal, because every present and future UiAction would have to remember" (AD-26 Shortcuts).
- Decision (plan): `AddFlow.open` throws `InvariantError` with a request already open, not replacing it, because no key reaches the UiActions while the dialog is open (13.27's layer), so a second open is a bug.
- Decision (plan): the names `AddFlow`, `AddFlowDialog`, `add-flow/` take the spine's own term ("13.25's add flow", AD-26 Shortcuts), not a new word, and the glossary gains it in the docs step (Naming row: "Glossary terms only").
- Decision (plan): the UiActions' ids take the folder `addFlow`, not `layout`, because a command id is "`<concept folder>.<verb+noun camelCase>`" (spine Naming) and the classes live in `editor/src/add-flow/`.

## Verification

**Commands:**
- `pnpm test` -- expected: all pass, no type errors.
- `pnpm depcruise` -- expected: no violations.
- `pnpm lint` -- expected: clean.

**Manual checks:**
- `pnpm --filter app dev`, `/?seed=corney`, Chromium and Firefox: the ticket's verify, step by step.
