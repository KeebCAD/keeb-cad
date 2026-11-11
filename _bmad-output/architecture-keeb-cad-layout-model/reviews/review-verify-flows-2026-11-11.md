# Verify review: flows amendment (2026-11-11)

Scope: the uncommitted spine diff (AD-26 **Flows.** bullet and Prevents clause, glossary rows `flow` and `add flow`, Editor state's flows timeline layer and `Flows` inspectable, `load flow` -> `design loader`, AD-10 `flow` -> `read`, Open Questions `entry` row). Every claim about existing code, libraries or tooling was checked against the repository and `node_modules`. A scratch type check was run in the scratchpad (`flowcheck/check.ts`, tsc 6.0.3, valibot 1.5.0).

Verdict: **revise before the plan builds on it.** Two type claims don't hold as written (the draft's type, and what `registerFlow` can check), and `CancelFlow` on Escape collides with an Escape handle that already exists. The rest checks out or depends on changes the spine already schedules.

## Findings

### HIGH-1: the draft can't be typed `CommandInput<H['command']>`; a form's text doesn't fit it

- Claim (spine l.709): `start<H>(flow: H, draft: CommandInput<H['command']>)`, and the draft is "the command's input as the person has filled it so far".
- `CommandInput<H>` is `Parameters<InstanceType<H>['apply']>[1]` (`packages/design/src/entries/types.ts:39`). Because `registerCommand`'s `InputCheck` requires exactly `v.InferOutput` of the schema (`types.ts:52-53`), this is the *parsed output* type.
- `idSchema` ends in `v.brand('Id')` (`packages/schema/src/id.ts:3-7`), so the output id is `string & Brand<'Id'>`. `AddGroupInput.id` is `v.optional(idSchema)` (`packages/commands/src/layout/add-group-input-schema.ts:9`).
- AD-26 (l.708) says a form passes its field as typed, `{ id: '' }` included. Scratch check: `start(AddFlow, { id: '' })` and even `start(AddFlow, { id: 'abc' })` fail with `TS2322: Type 'string' is not assignable to type 'string & Brand<"Id">'`. Every keystroke update would need a cast, which is what the type should have prevented.
- `invoke` and `available` both take `v.InferInput<H['input']>` (`packages/editor/src/invoke/invoke.ts:31-43,61`), which is the type the draft actually holds. `editor` already has the input-side check for the same job: `BuilderInputCheck` compares against `v.InferInput` (`packages/editor/src/invoke/types.ts:35-36`).
- Knock-on: if the draft is `InferInput`, the add flow's `finished(draft)` gets `id: string | undefined`, while `Selection.select` takes `readonly Id[]` (`packages/editor/src/selection/selection.ts:13`). `finished` then needs the parsed input (Flows parses the draft again, or hands `finished`/`land` the value `invoke` parsed), and the spine has to say which. The same applies to `land(parentDraft, committedDraft)`.
- Fix direction: type the draft as `v.InferInput<H['command']['input']>`. Make `registerFlow` check against `InferInput` the way `BuilderInputCheck` does, not "as registerCommand's does" (that one checks `InferOutput`). Then say what type `finished` and `land` receive.

### HIGH-2: `registerFlow` can't check a flow whose instance methods don't mention `Input`

- Claim (l.709): `registerFlow`'s "signature refuses to compile when the static command's input is not the class's `Input`, as `registerCommand`'s does".
- `registerCommand` can check because `Command<Input>` requires `apply(draft, input: Input)`, so `Input` can be read back from the instance type (`register-command.ts:6-9`, `types.ts:39`). `implements Flow<Input>` leaves nothing on the class type. The amendment makes every instance method optional (pick-only `candidates`/`choose`, an optional `finished`), and says "a setter's flow has none". For such a flow `Input` can't be recovered.
- Scratch check: with `FlowInput<H>` inferred from `finished` or `choose`, a correct `AddFlow` passes and a wrong `finished` type fails, as intended. But `class SetterFlow implements Flow<{ totally: 'wrong' }> { static command = AddGroup }` gets the same error whatever its `Input` is. A methodless flow can't register at all, or, with a permissive fallback, any `Input` passes. Neither is "refuses when Input differs".
- Fix direction: either give `Flow<Input>` a required member that carries `Input` (an instance method every flow has), or drop the separate `Input` generic and derive the method parameter types from `H['command']`, so there is nothing to mismatch. Prove whichever is chosen in a `*.types.spec.ts` with a methodless flow row.

### HIGH-3: Escape already has a handle; `CancelFlow` would be a second one, and both fire

- Claim (l.709): `CancelFlow` (Escape) "available whenever a flow is open"; "a later Esc meaning (clearing the selection) extends `CancelFlow` into the one Esc UiAction".
- `CloseSlideOut` already declares `hotkeys = ['Escape']`, available while the slide-out is open (`packages/editor/src/slide-out/close-slide-out.ts:14-18`). AD-26 (l.708) says one key's meanings live in one UiAction, never a second handle on the same key.
- What actually happens: the registry gives each handle's hotkey its own zag entry (`shortcut-registry.ts:22-26`). zag's store runs every match at the top priority (`@zag-js/hotkeys/dist/store.mjs:458-470`). Its default `conflictBehavior` is `"warn"` (`store.mjs:39`, `286-304`), and `HotkeyLayer` doesn't override it (`packages/ui/src/hotkeys/hotkey-layer.ts:13`). So in a pick mode with the slide-out open (T is listed as open to run beside a flow), one Esc closes the slide-out *and* cancels the flow. That breaks "one Esc does the innermost step".
- Fix direction: the amendment should name `CloseSlideOut` as the existing Esc meaning and say how the one Esc UiAction orders the two (for example, close the slide-out first, or cancel the flow first). Or it should defer that explicitly to the first pick-mode story, beside the "which actions run beside a flow" open question.

### MEDIUM-1: `available` still returns a boolean; the flow's reason depends on 13.25's change

- Claim (l.709, glossary add flow): `Flows` asks `available(command, draft)`, and "a refusal disables finish and the view shows its `rejectionText`"; "the draft is the caller's input, so a parse failure is `input-invalid`".
- Code today: `available<H>(handle, input?): boolean`, where "A parse failure answers true" (`packages/editor/src/invoke/invoke.ts:59-67`). There is no rejection to show, and a parse failure enables finish.
- The amendment is consistent with the spine's own target rule. AD-26 l.708 and the invoke path glossary row (l.129) say a caller-passed parse failure is an `input-invalid` refusal, and l.708 says "13.25 changes `available`'s answer from a boolean to this `Result`". So the claim is correct against the spine but not yet true of the code. The flows foundation can't be built before that change, and the 13.25 plan (or the foundation story the memlog proposes) has to carry it.
- `rejectionText` doesn't exist in code (`grep` finds nothing under `packages/`). The amendment is the first to name the "one pure editor function from a Rejection to the text" that l.782 describes, unnamed. That's a naming decision, not a reference to existing code; l.782 should use the same name.

### MEDIUM-2: flow classes trip `services-classified.spec.ts`

- The memlog says this spec motivated the whole run. It records every class `editorModule` registers and filters out only `kind === 'ui-action'` (`packages/editor/src/devtools/services-classified.spec.ts:53-61`), then requires each one to be classified (`:64-68`).
- `registerFlow` registers the class in the container (l.709, and memlog "registers the class in the container"). A flow has no `kind` static in the amendment's list (`command`, `hint`, `view`, `offers`). So each flow class shows up as an unclassified "service" unless it gets a `notShown` row, or flows get a `kind: 'flow'` static and the spec filters them as it does UiActions. The amendment says only how `Flows` is shown, not how flow classes are classified.

### MEDIUM-3: a non-modal flow whose view holds a text field gets neither CancelFlow nor FinishFlow

- Claim (l.709): "under a modal flow the hotkey layer runs nothing, so the view's dismiss and confirm call `Flows` themselves"; otherwise the keys run the UiActions.
- The modal half is verified: `isBehindModal` checks `root.closest('[aria-hidden="true"]')` (`packages/editor/src/shortcuts/is-behind-modal.ts:4`), and `HotkeyLayer`'s action returns early on it (`hotkey-layer.ts:45`). `UiDialog` wraps Reka `DialogRoot`/`DialogPortal` (`packages/ui/src/dialog/UiDialog.vue:12-14`), and `modal-keeps-keys.spec.ts:53` proves the root's `aria-hidden`.
- The gap is the non-modal case. The layer sets `enableOnFormTags: false` on every hotkey (`hotkey-layer.ts:41`), so Esc and Enter typed in a field never reach `CancelFlow`/`FinishFlow`. The Part picker (glossary `flow` row) is a popover with a search field, and Reka's Popover is non-modal by default, so its view must also call `Flows` on dismiss and submit. The rule should read "whenever the view holds focus in a field or is modal", or simply "a view's own dismiss and confirm always call `Flows`".

### LOW-1: `FinishFlow` is "available whenever a flow is open" but finish is "disabled" by a refusal

- The registry claims a key whenever `available(handle)` is true (`shortcut-registry.ts:67-71`; layer `preventDefault` at `hotkey-layer.ts:48`). With a flow open and its draft refused, Enter is still claimed and runs a finish that is refused. Outside a field it also preventDefaults Enter on a focused button or Tree item for as long as any flow is open. It's worth saying whether `FinishFlow.available` follows the draft's availability.

### LOW-2: `DesignLoader` is named as if it exists; the code is `LoadFlow`, and no ticket owns the rename yet

- The spine (l.493 and others) now says "one `di` service in `commands`, `DesignLoader`". The code still has `LoadFlow` (`packages/commands/src/load/load-flow.ts:10`, exported at `packages/commands/src/index.ts:4`, along with `LoadFlowError`), used in `open-stored-design.ts:5,23`, `load-module.ts:4,9`, `app/src/autosave/autosave.spec.ts:1,152` and `app/src/reset-survives-autosave.spec.ts:1,44`. `DesignLoader` appears only in the spine and memlog. The memlog lists the rename ticket as owed to Sofia.
- Upcoming tickets still say "load flow": `_bmad-output/initiative-keeb-cad-m1/tickets/epic-keep-my-work/tickets/tickets.toml` l.10, 34, 45 (unbuilt stories that will now read "flow" in the glossary's new sense). Done-story plans and retros can stay as they are.
- Inside the spine the rename is complete. No "load flow" is left, and every remaining "flow" is the new glossary term (l.130-132, 233, 704, 708-709, 782, 825, 1087). AD-10's l.371 reads "A live read is one computed reading another", while the memlog decision says "a live stage reading another". This is harmless, but the log and the spine differ.

### LOW-3: smaller unverified details

- `Flows`' verbs are `start`, `finish` and `cancel`, but the draft "changes" as the person types and no verb or composable is named for that update. A component can't call `Flows` directly: `.vue` files may not import `di`/`di/vue` as a value (`eslint.config.ts:344-356`). So "the view's dismiss and confirm call `Flows` themselves" has to go through an `editor` composable (the memlog's `useOpenFlow()`), and the spine should name it.
- A `.ts` flow class importing its `.vue` view is allowed. No lint or dependency-cruiser rule forbids it: `.dependency-cruiser.mts:162,340-345` allow Vue in `editor`, and there is no `no-circular` rule. It is already done in `packages/editor/src/mount-editor.ts` and `router/create-editor-router.ts`. Types projects use `vue-tsc` (`vitest.config.ts:36`). Two caveats: the Node `editor` project (`vitest.config.ts:101-106`) has no Vue plugin, so a flow's pure-method specs must not live under `src/design/**`. And a view that imports its own flow class (to name an `offers` child) creates an import cycle that no rule catches.
- "A command returns no value" is verified: `invoke` for a command returns `AsyncResult<void, Rejection>` (`invoke.ts:31-34`), and `Command.apply` returns `void | Rejection` (`packages/design/src/entries/types.ts:14`).
- "Resolved through `di` ... as a UiAction does" is verified: `this.#injector.resolve(handle)` (`invoke.ts:101,131`).
- Add flow: `model` exports `mintId(): Id` (`packages/model/src/ids/mint-id.ts:10`). `AddGroup`'s input is a variant on `arrangement` (`add-group-input-schema.ts:14-17`), so the draft must also carry `arrangement` (and `axis` for chains). The glossary row mentions only the id.
- Open Questions' `entry` row is verified: the glossary's `entry` is a `build` item (l.109), and code uses `EntryHandle` for invokable handles (`packages/editor/src/invoke/types.ts:8`).

## Scratch type sketch (HIGH-1, HIGH-2)

```ts
type FlowInput<H extends FlowHandle> =
  InstanceType<H> extends { finished(draft: infer I): void } ? I
  : InstanceType<H> extends { choose(draft: infer I, t: string): unknown } ? I
  : '__no_input_visible__'
type FlowCheck<H extends FlowHandle> =
  Same<FlowInput<H>, CommandInput<H['command']>> extends true ? unknown : { mismatch: true }
declare function registerFlow<H extends FlowHandle>(h: H & FlowCheck<H>): void
// AddFlow (finished(AddInput))            -> ok
// WrongFlow (finished({ id: string }))    -> error, as intended
// SetterFlow implements Flow<wrong>, no methods -> error regardless of Input (no Input visible)
// start(AddFlow, { id: '' })              -> TS2322 string not assignable to string & Brand<"Id">
```
