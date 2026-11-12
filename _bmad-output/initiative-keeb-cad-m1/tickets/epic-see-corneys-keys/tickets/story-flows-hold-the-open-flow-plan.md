---
title: 'Flows hold the open flow'
type: 'feature'
ticket: 30
created: '2026-11-12'
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
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `editor` has no way to hold an interaction that needs the person's input before its one command runs: the add flow (13.25), and later the Part picker and pick modes, would each keep their own state, keys and stacking rules. And `ui`'s dialog reports a close as `update:open`, so a close the stack makes would echo back as a cancel.

**Approach:** Build the spine's flow mechanism (AD-26 Flows, glossary **flow**): a flow is a class with static `kind: 'flow'` and `finishesWith`, optional `view`, and an optional `finished(input)`, registered with `registerFlow`; the `Flows` service holds the open flows as a stack with their drafts, re-asks `available(finishesWith, draft)` as the draft changes and at each design commit, and runs `finish` through the invoke path. `FlowHost` in the shell renders the top flow's view; `useOpenFlow` gives a view its draft, reason, update, finish and cancel. `UiDialog` reports the person's wish to leave as `dismiss`. Devtools show the stack and a flows timeline layer. Proven with test flows over a test command.

## Boundaries & Constraints

**Always:**
- Spine AD-26 Flows and the ticket set the behaviour: `start` returns the entry; `update`, `finish`, `cancel` act only while that entry is the top, else change nothing; a start from outside cancels every open flow; `cancel` runs nothing; `Flows` cancels the whole stack when the design is replaced (the store's `commit` of kind `whole`, `design-store.ts:126`).
- The draft is typed `v.InferInput<finishesWith['input']>`; the availability ask passes it as the caller's input, so an `input-invalid` is a refusal (spine; `invoke.ts:72-75`). A refusal's text is `rejectionText` (`rejection/rejection-text.ts`).
- `finish` runs `invoke(finishesWith, draft)`; on ok the flow pops, then `finished` runs once with the parsed input; on a refusal the flow stays open with its draft and that rejection as its reason.
- A view is open exactly while `FlowHost` renders it; a dialog view passes `open` as always `true` and turns `dismiss` into `cancel` of its own entry.
- Decision (plan): `FlowHost` keys each view by its entry, not by its view component, because a second start of the same flow would otherwise patch the open view, whose `useOpenFlow` holds the first entry (row 3).
- Decision (plan): while a finish is pending, `finish` on that entry does nothing and its availability is not re-asked, not a second run and not a refusal flashing from its own commit, because `Invoke.invoke` runs `store.run` synchronously and its `AsyncResult` settles later (`invoke.ts:93-100`), so the flow is still the top when its own commit arrives (rows 1, 6).
- Decision (plan): while a finish is pending, `update` and `cancel` on that entry also do nothing, not edit or pop it mid-run, because the run has started and `invoke` gives no way to withdraw it (`AsyncResult`, `invoke.ts:32-44`); a failure then reopens the draft that ran (row 6c).
- Decision (plan): `finished` gets the draft parsed again with `parse(finishesWith.input, draft)` (`design/src/parsing/parse.ts`) after the ok, not a value from `invoke`, because the spine says "an entry run through the invoke path returns no value".
- Decision (Sergii 2026-11-12): no `hint` static, not one shown in the status strip now, because the first flow with a hint is the first non-modal one (a pick mode), which also brings `CancelFlow`/`FinishFlow`, the keys a hint names; the add flow is modal.
- Decision (Sergii 2026-11-12): no `landed` flow event, not a declared kind, because it comes with `offers`, the first story where a child can start and land.
- Decision (Sergii 2026-11-12): `finishesWith` is a command or a store action, not commands only. An action's own failure keeps the flow open with its draft, its reason worded by the same text function as a refusal, which covers today's action failure kinds (`DesignInvalid`, `LoadError`, `StorageError`, `schema/src/types.ts:124-132,187-190`): `design-invalid` its first issue's message; `migration-failed`, `file-unreadable`, `storage-unavailable` their `message`; `format-too-new` `This design was saved by a newer keeb-cad.`; `not-found` `No stored design has the id <id>.`; `quota-exceeded` `The browser's storage is full; free some space and try again.` Not closing the flow on a failure, because the draft would be lost and the person not told; not a generic sentence, because each kind can say what went wrong.
- Decision (Sergii 2026-11-12): a design replaced by the finishing flow's own action (a pending finish) does not cancel that flow: it pops as finished and its `finished` runs; any other open flow is cancelled with reason `design-replaced`. Not cancelling it with the rest, because its action succeeded. The spine's AD-26 Flows gains this sentence.
- Decision (plan): a failed finish's reason is held as the top's availability answer until the next `update` or commit re-asks, not kept until finish succeeds, because the spine re-asks "as the top's draft changes and at every design commit" (row 6d).
- Decision (plan): `start` emits `cancelled` for each open flow before `started`, not after, in the spine's order: "cancels every open flow and pushes the new one" (row 2).
- Decision (plan): `CancelReason` is `'cancel' | 'replaced' | 'design-replaced'`, the spine's "cancelled with its reason" for the reasons this story reaches; `'cancel'`, not `'Esc'`, because `Flows` only sees the view's `cancel`, not which key or press caused it.
- Decision (plan): `registerFlow` also refuses to compile a flow whose action's error (`ActionError`) is not an `ActionFailure`, not a runtime fallback text, because the text function's exhaustive match then covers every failure a registered flow can meet.
- Decision (plan): `UiDialog` takes `open` one way and reports a wish to leave as `dismiss`, not Reka's documented controlled `v-model:open` (https://reka-ui.com/docs/components/dialog, "Close after asynchronous form submission": "Use the controlled props to programmatically close the Dialog", `<DialogRoot v-model:open="open">`), because the spine rejects a two-way `open`: "a close in either then has to be echoed into the other (a finish's close came back as a cancel)".
- Decision (plan): `UiDialog` forwards every `update:open` from `DialogRoot` as `dismiss`, not only `false`, because it renders no `DialogTrigger`, the one part that opens a root (`reka-ui/dist/Dialog/DialogTrigger.js:37` `onOpenToggle`); Esc and a press outside both reach `onOpenChange(false)` through `DialogContentImpl.js:88` `onDismiss`.

**Never:**
- `CancelFlow`, `FinishFlow`, `offers`, `landed`, `candidates`, `choose`, the press-on-a-node function, `hint` (ticket and decisions above: their first stories); read-only demotion (epic-keep-my-work); G, S, the add flow and a Text field (13.25).
- A flows multi token (spine: "nothing lists flows"); a reactive draft a view writes in place; `vi.mock`, jsdom, snapshots.

## Boundary table

Level: U = unit in `editor` (browser mode); UI = unit in `ui`; T = types project. Test flow `RenameFlow` finishes with test command `RenameDesign` (input `{ name }`, trimmed, `minLength(1, 'A name is required.')`; its check refuses a name equal to the design's with `id-taken`, message `That is already its name.`); `finished` records its input. Arranged design name `Corne`.

**Production bugs**

| # | Input / state | Expected | Level |
|---|---|---|---|
| 1 | `RenameFlow` open with `{ name: 'Kyria' }`; `finish` twice before the first settles | design name `Kyria`; store `seq` one above the arranged; `finished` recorded `[{ name: 'Kyria' }]` | U |
| 2 | open with `{ name: 'Kyria' }`; `start(RenameFlow, { name: 'Lily58' })` | stack holds only the second entry; design and `seq` unchanged; events `cancelled` (first entry, reason `replaced`) then `started` (second) | U |
| 3 | shell; view open with `Kyria`; second start with `Lily58`; its Finish pressed | one dialog; its field shows `Lily58`; design name `Lily58` | U (shell) |
| 4 | open; `replaceDesign` with another design | stack empty; event `cancelled` (reason `design-replaced`); new design's name unchanged; in the shell, no dialog | U, U (shell) |
| 5 | open with `{ name: 'Corne' }` (refused); `finish` | design and `seq` unchanged; still the top with `{ name: 'Corne' }`; reason `That is already its name.`; `finished` not recorded | U |
| 6 | open with `{ name: 'Kyria' }`; `finish`, read before it settles | reason none (its own commit makes `Kyria` taken) | U |
| 6a | `StoreNameFlow` (finishes with test action `StoreName`, failing with `{ kind: 'quota-exceeded' }`) open with `{ name: 'Kyria' }`; `finish` | still the top with `{ name: 'Kyria' }`; reason `The browser's storage is full; free some space and try again.`; `finished` not recorded | U |
| 6b | as 6a, `StoreName` succeeding (it replaces the design with one named `Kyria`) | stack empty; `finished` recorded `[{ name: 'Kyria' }]`; events `started`, `finished`, no `cancelled` | U |
| 6c | as 6a; while its finish is pending, `update(top, { name: 'Lily58' })` and `cancel(top)` | after it settles: still the top with `{ name: 'Kyria' }`; reason the quota text; no `cancelled` event | U |
| 6d | after 6a, `update(top, { name: 'Lily58' })` | reason none | U |

**Rules**

| # | Input / state | Expected | Level |
|---|---|---|---|
| 7 | `start(RenameFlow, { name: 'Kyria' })` | the top's draft `{ name: 'Kyria' }`, reason none; event `started` | U |
| 8 | `update(top, { name: '' })` | reason `A name is required.`; in the shell, Finish disabled and that text shown | U, U (shell) |
| 8a | `update(top, { name: 'K' })` (one character, on the limit) | reason none | U |
| 8b | `update(top, { name: '  ' })` (trimmed to empty) | reason `A name is required.` | U |
| 9 | after 8, `update(top, { name: 'Kyria' })` | reason none; Finish enabled | U |
| 10 | open with `{ name: 'Kyria' }`; `RenameDesign` to `Kyria` run outside the flow | reason `That is already its name.`; in the shell, Finish disabled | U, U (shell) |
| 11 | first entry replaced by a second; `update`, `finish`, `cancel` with the first | second entry's draft unchanged; design unchanged; stack holds the second | U |
| 11a | an entry closed by its own `cancel`, stack empty; `update`, `finish`, `cancel` with it | stack empty; design unchanged; no event | U |
| 12 | `cancel(top)` | stack empty; design unchanged; event `cancelled` (reason `cancel`) | U |
| 13 | `finish` on `{ name: ' Kyria ' }` | stack empty; `finished` recorded `[{ name: 'Kyria' }]` (parsed); event `finished` | U |
| 14 | shell; view open; Esc | no dialog; stack empty; design unchanged | U (shell) |
| 15 | shell; stack empty | no dialog | U (shell) |
| 15a | text function on `{ kind: 'design-invalid', issues: [x, y] }`; `migration-failed`, `file-unreadable`, `storage-unavailable` with `message: 'm'` | `x.message`; `'m'` each | U |
| 15b | text function on `{ kind: 'format-too-new', found: 9 }`; `{ kind: 'not-found', id: 'corne' }`; `{ kind: 'quota-exceeded' }` | `This design was saved by a newer keeb-cad.`; `No stored design has the id corne.`; `The browser's storage is full; free some space and try again.` | U |

**Module boundaries**

| # | Input / state | Expected | Level |
|---|---|---|---|
| 16 | `registerFlow` with `finished(input)` exactly `v.InferOutput` of `finishesWith.input`; with none | accepted | T |
| 17 | `finished` taking `{ name: number }`; taking `{ name: string; extra: string }` | `FlowInputMismatch` | T |
| 17a | `finishesWith` an action failing with `{ kind: 'other' }`; one failing with `never`; one failing with `StorageError` | refused (`FlowFailureMismatch`); accepted; accepted | T |
| 18 | `UiDialog` open; Esc | `dismiss` emitted once; no `update:open` | UI |
| 19 | `UiDialog` open; a press on the scrim at (0, 0) | `dismiss` emitted once | UI |
| 20 | devtools inspector, `RenameFlow` open with `{ name: 'Kyria' }` | Flows node's one field `stack` = `[{ entry: <the started entry's id>, flow: 'RenameFlow', finishesWith: 'testing.renameDesign', draft: { name: 'Kyria' } }]`, not editable | U |
| 21 | devtools, a start, a `cancel`, a start, a `finish` | flows layer gets four events, each titled `RenameFlow`, subtitles `started`, `cancelled: cancel`, `started`, `finished` | U |
| 22 | services classification | `Flows` shown as `keeb-cad.devtools.flows` | U |

</frozen-after-approval>

## Code Map

- `packages/editor/src/invoke/invoke.ts:32-77` -- `invoke` overloads per handle kind and `available(handle, input?)`, which `Flows` calls with the draft as caller input. Reuse; don't change.
- `packages/design/src/store/design-store.ts:108-128,177` -- `replaceDesign` emits `commit` `{ kind: 'whole' }`; a command emits `{ kind: 'patches' }`. `Flows` subscribes in a field as `selection/selection.ts:23-25` does and unsubscribes in `[Symbol.dispose]`.
- `packages/design/src/entries/types.ts:46-53` -- `Same`, `InputMismatch`, `InputCheck`: the pattern for `FlowInputCheck`; `ui-actions/register-ui-action.ts` and its `.types.spec.ts` are the pattern for `registerFlow` and row 16–17.
- `packages/editor/src/ui-actions/types.ts:5-19` -- method-not-property comment and handle shape to mirror.
- `packages/editor/src/devtools/` -- `devtools-plugin.ts:22-40` adds layers and subscribes (add the flows layer and `Flows.events`); `devtools-ids.ts` gains `flowsLayerId`; `design-store-inspectable.ts` is the read-only pattern; `devtools-module.ts` registers it; `services-classified.spec.ts:25-36,59` gains `[Flows, { shownAs }]` and skips `kind === 'flow'` beside `'ui-action'`; `devtools-plugin.spec.ts` `fakeHost` for rows 20–21.
- `packages/editor/src/testing/mount-shell.ts:26-46`, `types.ts:13-18` -- `ShellArrangement` gains `modules?: readonly Module[]`, added after `editorModule`, so shell rows register the test command and flow.
- `packages/editor/src/testing/recorder.ts` -- `Recorder` for `finished`'s records; `invoke.spec.ts:35-48` is the test-command pattern.
- `packages/editor/src/shell/EditorShell.vue:33-49` -- renders `FlowHost` inside the `isolate` div.
- `packages/ui/src/dialog/{UiDialog.vue,types.ts,Dialog.spec.ts}`, `packages/ui/workbench/DialogHost.vue`, `packages/editor/src/shortcuts/modal-keeps-keys.spec.ts:19-39` -- today bind `update:open`; move to `dismiss` (`DialogHost`: `:open="open" @dismiss="open = false"`).

## Tasks & Acceptance

**Execution:**
- [ ] `_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md` (docs, on main before the code branch) -- `:782`: `rejectionText` words a `Rejection` or a store action's failure (`ActionFailure`: `DesignInvalid`, `LoadError`, `StorageError`) with the texts of Sergii's 2026-11-12 decision, `ActionFailure` named there and given a glossary row (a store action's own failure, not a `Rejection`); AD-26 Flows: a design replaced by the finishing flow's own action does not cancel it; an action's failure keeps the flow open with its draft and that text, and `registerFlow` refuses an action whose error is not an `ActionFailure`.
- [ ] `packages/editor/src/rejection/{types.ts,rejection-text.ts,rejection-text.spec.ts}` -- `ActionFailure = DesignInvalid | LoadError | StorageError`; `rejectionText(rejection: Rejection | ActionFailure)` gains arms for `design-invalid` (first issue, `InvariantError` with none, as `input-invalid` does), `format-too-new`, `not-found`, `quota-exceeded`; the existing `{ message: P.string }` arm (`rejection-text.ts:18`) words the other three; still `.exhaustive()`. Rows 15a–15b.
- [ ] `packages/editor/src/flows/types.ts` -- `Flow<Input>` (`finished?(input: Input): void`, a method for the same bivariance as `UiAction`), `FlowHandle` (`kind: 'flow'`, `finishesWith: CommandHandle | ActionHandle`, `view?: Component`, `new (): Flow<unknown>`), `FlowDraft<H>`, `FlowEntry<H>` (`{ id: number; handle: H }`), `OpenFlow` (its availability a `Result<void, Rejection | ActionFailure>`), `FlowEvent`, `FlowsEvents`, `CancelReason`, `FlowInputMismatch`, `FlowFailureMismatch`, `FlowCheck<H>`, `FlowViewProps<H>`, `UseOpenFlowResult<H>`.
- [ ] `packages/editor/src/flows/register-flow.ts` (function) -- `registerFlow(container, handle: H & FlowCheck<H>)`: `container.register(handle).useClass(handle)`; `FlowCheck` is the input check and, for an action, `ActionError` within `ActionFailure`. Rows 16–17a in `register-flow.types.spec.ts`.
- [ ] `packages/editor/src/flows/flows.ts` (service) -- `Flows`: `events`, `stack` (bottom first, a `shallowRef`), `top: Option<OpenFlow>`, `start`, `update`, `finish`, `cancel`; entry ids from a counter on the instance. Registered in `editor-module.ts`. Rows 1, 2, 4–7, 8a–8b, 9–13, 11a, 6a–6d in `flows.spec.ts`.
- [ ] `packages/editor/src/flows/use-open-flow.ts` (function) -- `useOpenFlow(entry)`: `draft` and `reason` (`rejectionText` of the refusal, `undefined` when available) as computeds, and `update`, `finish`, `cancel` bound to the entry.
- [ ] `packages/editor/src/flows/use-flow-host.ts` (function), `FlowHost.vue` -- the top's `{ view, entry }` when it has a view; renders it keyed by `entry.id` with `entry` as its prop. `EditorShell.vue` renders `FlowHost`.
- [ ] `packages/editor/src/testing/{rename-design.ts,rename-design-input-schema.ts,rename-flow.ts,store-name.ts,store-name-input-schema.ts,store-name-outcome.ts,store-name-flow.ts,RenameView.vue,types.ts}` -- the test command `RenameDesign` (`testing.renameDesign`) and its schema; the test action `StoreName` (`testing.storeName`, its own schema and `StoreNameInput`; fails with `{ kind: 'quota-exceeded' }` while `StoreNameOutcome` (service) says so, else replaces the design with one named as its input); the test flows `RenameFlow` and `StoreNameFlow` (`finished` pushes to `Recorder`); `Recorder` and `StoreNameOutcome` are registered by each spec's container or `mountShell`'s `modules`; and `RenameFlow`'s view: `UiDialog` (`open` always true, `@dismiss` → `cancel`), a labelled `Name` input bound through `update`, the reason, and a `Finish` button disabled while a reason shows.
- [ ] `packages/editor/src/flows/flow-host.spec.ts` -- rows 3, 4, 8, 10, 14, 15 through `mountShell({ modules })`.
- [ ] `packages/ui/src/dialog/{UiDialog.vue,types.ts,Dialog.spec.ts}`, `packages/ui/workbench/DialogHost.vue`, `packages/editor/src/shortcuts/modal-keeps-keys.spec.ts` -- `DialogEmits = { dismiss: [] }`; rows 18–19; the followers move to `dismiss`.
- [ ] `packages/editor/src/devtools/{flows-inspectable.ts,devtools-ids.ts,devtools-plugin.ts,devtools-module.ts}` -- `FlowsInspectable` (service), one read-only field `stack`; a `Flows` timeline layer, one event per `FlowEvent` (title the flow class's name, subtitle its kind, `cancelled: <reason>` for a cancel). Rows 20–22 in `devtools-plugin.spec.ts` and `services-classified.spec.ts`; that spec's `arrange` (`:171-175`) registers `Flows`, and its test `'adds one inspector, two layers and each event once when run twice'` (`:199-219`) becomes three layers (Invocations, Commits, Flows), as the spine's "The timeline has three layers" says.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then every row passes at its level in Chromium and Firefox.
- Given each toggled bug, applied alone, then its rows go red and pass once restored (named in the PR): the pending-finish guard removed (1, 6), `start` not cancelling the open flow (2, 11), the `whole` commit ignored (4), the refusal popping the flow (5), the commit re-ask removed (10), the top check removed from `update`/`finish`/`cancel` (11), `finished` given the draft unparsed (13), `FlowHost`'s key removed (3), `UiDialog` emitting `update:open` (18, 19), an action's failure popping the flow (6a), the own-replace exemption removed (6b), the failure reason kept past `update` (6d), the trim removed from the test schema (8b), `start` storing a different draft (7), `update` not re-asking (8a, 9), `cancel` running the command (12), the closed-entry check removed (11a), `RenameView`'s disabled binding removed (8 shell), the view's `@dismiss` unbound (14), `FlowHost` rendering with no top (15), the inspectable's field returning `[]` (20), the flows layer not subscribed (21), `Flows` dropped from the devtools module (22), a new kind's text swapped (15a, 15b).
- Given `pnpm --filter app dev` at `/?seed=corney`, then the editor looks and behaves as before (nothing starts a flow yet); the devtools overlay lists a Flows inspector node with an empty stack and a Flows timeline layer.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

- Decision (plan): a flow is named in devtools by its class's `name`, not a static `id`, because the spine gives a flow no `id` among its statics and devtools load only in development (`mount-editor.ts:22`), where Vite keeps class names.
- Decision (plan): `start` takes the first draft from its caller, not a builder on the flow, because the spine has the starter build it ("G's UiAction ... pushes the new one"; the add flow's id is minted by `model` before the start).
- Decision (plan): `useOpenFlow`'s `draft` keeps its last value once its entry closes (`computed((previous) => …)`, Vue 3.5), not a throw, because `FlowHost` unmounts the view in the same flush that pops it, and a late read must not break the unmount.
- Decision (plan): `rejectionText` widens its input to `Rejection | ActionFailure` and keeps its name, not a second function, because the spine has one function every surface uses for a refusal's text (`:782`).
- Decision (plan): entry ids are numbers from a counter on the `Flows` instance, not a `Symbol` or the entry object, because Vue's `key` takes a primitive (https://vuejs.org/api/built-in-special-attributes.html#key: "Expects: `number | string | symbol`") and a number reads in the devtools stack (row 20), where two entries of one flow must differ.
- Decision (plan): `stack` is a `shallowRef` replaced whole on each change, not a deep `ref`, as `Selection` holds its ids (`selection/selection.ts:22`), so a draft passed to `invoke` is never a reactive proxy.
- Decision (plan): every row arranges a stack of one, not two, because nothing pushes a child until `offers` (Never); `start` always cancels what is open.
- Decision (plan): the test handles `RenameDesign`, `StoreName`, `RenameFlow` and `StoreNameFlow` carry no `(service)`/`(function)` tag, not one of the two, because the spine makes each class its handle ("the class is its handle"), an entry the register resolves, not a service a caller injects nor a plain function.
- Decision (plan): `index.ts` exports nothing new, not `registerFlow` or `Flows`, because every user the spine names (G's UiAction, an Anchor field, `CancelFlow`, `FinishFlow`) is in `editor`.
- Decision (plan): no row for a `design-invalid` with no issues, not a tested throw, as Sergii decided for `input-invalid` in 13.29 ("no code reaches that state"); `DesignInvalid` is built from a failed parse.
- Decision (plan): rows 3 and 10 are kept, not dropped as unreached, though no production path reaches them today (a modal blocks a second start; nothing commits under a modal flow), because the ticket's verify names both ("a second start from outside replaces it", "also when a design commit makes it refused"), and non-modal flows reach them later.
- Decision (plan): `StoreNameOutcome` keeps its name, not a glossary term, because it is a test-only switch in `testing/`, which no production code or spine sentence names.
- Decision (plan): the test command, flow and view live in `editor/src/testing/`, not in one spec, because both `flows.spec.ts` and `flow-host.spec.ts` use them, and the command follows AGENTS' three-file rule.

## Conformance Log

Pass 1 (two readers and the gap reviewer; 0 findings dropped for a missing quote or path):
- `Every class or function the plan adds carries a (service) or (function) tag` (test handles, `StoreNameOutcome`) -- fixed
- `add empty input and an input that breaks an assumption` (`design-invalid` with no issues) -- fixed (decision, no row, as 13.29)
- `A choice no requirement made is a decision and is labelled as one` (`shallowRef` stack, id counter, event order, cancel reasons) -- fixed
- `When a decision departs from a Stack dependency's documented setup, that documented setup is its Y, cited from the library's docs` (Reka `v-model:open`) -- fixed
- `Give each command or action three files in its concept folder` (`StoreName`) -- fixed
- `Hold state in di services` (Recorder wiring) -- fixed
- precedent `devtools-plugin.spec.ts:199` 'two layers' and `:171-175` arrange without `Flows` -- fixed
- `Glossary terms only.` (`ActionFailure`, `CancelCause`) -- fixed (glossary row in the spine task; `CancelReason`)
- `a command id is <concept folder>.<verb+noun camelCase>` (`test.renameDesign`) -- fixed (`testing.`)
- `Make package entry files ... only re-export` (exports unspecified) -- fixed (decision: none)
- `A choice no requirement made is a decision` (failure reason lifetime) -- fixed (row 6d)
- observation: message arm already covers three kinds; `invoke.ts:158` citation; row 21 lacks `finished` -- fixed
- gap: toggled bugs for rows 7, 8, 9, 12, 14, 15, 20–22 -- fixed
- gap: threshold "on" row and whitespace name; closed-entry calls -- fixed (8a, 8b, 11a)
- gap: a finish whose action replaces the design -- asked (Sergii: it finishes)
- gap: rows 3, 10 unreached -- fixed (kept: ticket verify names them)
- gap: stack depth two unreached -- fixed (decision: depth one until `offers`)
- gap: action flows unreached -- asked earlier (Sergii: commands and actions)

Final pass (one reader):
- `act only while that entry is the top` (`update`/`cancel` during a pending finish) -- fixed (decision, row 6c)
- `Give every decision its rejected alternative` (rows 3, 10) -- fixed
- `Give every decision its rejected alternative` (action-failure decision) -- fixed (Y from Sergii's rejected options)
- `Glossary terms only.` (`ActionFailure`, `StoreNameOutcome`) -- fixed
- `A choice no requirement made is a decision` (entry id start) -- fixed (row 20 reads the entry's id)
- row 6c missing -- fixed
- ticket verify "replacing the design cancels every open flow" vs Sergii's own-replace decision -- asked (ticket text is Sofia's; raised at the checkpoint)
- precedent `modal-keeps-keys.spec.ts` / `Dialog.spec.ts` duplicate `expectedScrim` (`Write a shared assertion once`) -- deferred

## Verification

**Commands:**
- `pnpm test` -- expected: all pass, no type errors.
- `pnpm lint` -- expected: clean.
- `pnpm depcruise` -- expected: no violations.

**Manual checks:**
- `pnpm --filter app dev`, `/?seed=corney`: nothing visible changes (no production flow until 13.25); the Vue devtools overlay shows a Flows node and a Flows timeline layer.
- `pnpm --filter @keeb-cad/ui workbench`: the Dialog row opens, and Esc or a press outside closes it.
