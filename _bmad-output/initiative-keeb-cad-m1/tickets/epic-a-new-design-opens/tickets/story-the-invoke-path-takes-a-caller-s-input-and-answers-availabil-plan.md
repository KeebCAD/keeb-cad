---
title: "The invoke path takes a caller's input and answers availability"
type: 'feature'
ticket: '21'
created: '2026-11-08'
status: 'built'
baseline_revision: 'bb247bd9a316964a3341ccfc5d51e2a9cd76a743'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `Invoke.invoke(handle)` (23.19) only builds its input, so a click or gesture can't pass its own (a drop's delta, a field's text), and the UI has no way to ask whether an entry is available. Components can't reach `Invoke` at all: 23.20's lint bans `di` in `.vue` files and no composable hands it out.

**Approach:** `invoke(handle, input?)` takes a caller's input, compile-checked against the handle's input schema, and asks the input builder only when none is passed. `available(handle)` answers for all three kinds, from the same checks `invoke` refuses on. `useInvoke()` hands components both as functions (spine AD-26, Editor state row).

## Boundaries & Constraints

**Always:**
- The caller's input is typed `v.InferInput<H['input']>`, as the store's `run` takes it, for all three kinds.
- `input === undefined` is "passes none": the builder runs, else `{}`. `null` is a caller's input.
- `invoke` refuses as `unavailable` exactly when `available(handle)` is false, before any builder is asked.
- `useInvoke()` returns a new plain object `{ invoke, available }` of functions, never the `Invoke` instance.

**Never:**
- No real command, action, UiAction or input builder (23.8, 16.4). Tests declare their own.
- No menu, palette or button in the chrome; no notice for a refusal (16.1).
- No devtools invocation event (23.22).
- No change to the store's `run` results, its no-design throw, or `ShortcutRegistry`.
- No design-file or schema change.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Caller input | `invoke(Rename, { name: 'Lily58' })`, a builder registered | runs with `{ name: 'Lily58' }`; the builder is not asked | — |
| No caller input | `invoke(Rename)` with a builder | runs with the builder's input | — |
| Command, no design | `available(Rename)` before any commit | `false`; `invoke` returns `unavailable` | — |
| Check says no | an action or UiAction whose `available` is false | `false`; `invoke` returns `unavailable` | — |
| Check says yes | each kind available | `true` | — |
| Component | a component calling `useInvoke().invoke` on click | the store's `current` holds the command's edit | — |

</frozen-after-approval>

## Code Map

- `packages/editor/src/invoke/invoke.ts` -- `Invoke` (service). Three overloads `invoke<H>(handle)` dispatching with ts-pattern `match`; `#inputFor(handle)` asks the builder; `#invokeCommand` guards with `store.current.isNone()`; `#invokeUiAction` checks `available()`, then `parse`s and `apply`s. 23.19's review moved the builder call after both guards; keep that order.
- `packages/editor/src/invoke/invoke.spec.ts` (browser) -- `RenameDesign` test command (its check always says yes), `recordName(id, available)` UiAction factory, `buildName`, `RecordedBuildName` (records that it was asked), `arrange({ commands, uiActions, builders })` over a real `designModule` + `editorModule` container. The action branch today is `(action) => this.#store.run(action, this.#inputFor(action))`: the builder runs before `run` checks availability.
- `packages/editor/src/testing/{recorder.ts,press.ts}` -- shared spec helpers.
- `packages/design/src/store/design-store.ts` -- `#runCommand`: `#ensureRegistered`, `#copyInput`, `#committed()` (throws `InvariantError` with no design), then `command.available(design)`; `#runAction`: `#ensureRegistered`, `#copyInput`, then `action.available(this.current)`. Entries resolve lazily through `#injector`.
- `packages/design/src/store/design-store.spec.ts` (Node) -- its `describe('run, for a command' | 'run, for an action')` test entries; add `describe('available')` beside them, reusing its entries and arrange.
- `packages/design/src/store/design-store-run.types.spec.ts` -- the type-spec shape for `invoke.types.spec.ts` (`expectTypeOf(fn).returns` / `.parameter(n)` over hand-written handle interfaces).
- `packages/editor/src/shortcuts/use-shortcuts.ts` -- the composable precedent (`useService` in a `.ts` beside its service).
- `packages/editor/src/views/DesignCanvas.spec.ts` -- the browser render precedent: `render(Component, { global: { plugins: [{ install: (app) => provideInjectorOnApp(app, injector) }] } })`.
- `packages/editor/src/design/use-open-design.ts` -- not exported from `index.ts`; `useInvoke` follows.
- `packages/editor/src/shortcuts/shortcut-registry.ts` -- calls `invoke(handle)` with no input; stays as is.

## Tasks & Acceptance

**Execution:**
- [x] `packages/design/src/store/design-store.ts` -- `available(handle: CommandHandle | ActionHandle): boolean` (service: a method of `DesignStore`): `#ensureRegistered`, then a command is `false` with no design, else `#commandAvailable(handle, design)`; an action is `#actionAvailable(handle)`. Both private helpers (service: private methods of `DesignStore`) resolve the entry and ask its check. `#runCommand` calls `#commandAvailable(handle, design)` after `#committed()`, and `#runAction` calls `#actionAvailable(handle)` where it asks today, so `run`'s throws and their order don't change.
- [x] `packages/design/src/store/design-store.spec.ts` -- the `design` rows of the boundary table under `describe('available')`, with a spec factory `renameWith(available: (design) => boolean)` (function) for the command and `saveWith(available: (current) => boolean)` (function) for the action.
- [x] `packages/editor/src/invoke/invoke.ts` -- each overload gains `input?: v.InferInput<H['input']>`. Add `available(handle: EntryHandle): boolean` (service: a method of `Invoke`): a command or action is `store.available(handle)`, a UiAction its own `available()`. Each of the three branches (`#invokeCommand`, a new `#invokeAction` (service: a private method of `Invoke`), `#invokeUiAction`) first returns `unavailable` when `this.available(handle)` is false, then takes `input === undefined ? this.#inputFor(handle) : input`. Rewrite `#invokeCommand`'s comment to fit the new guard.
- [x] `packages/editor/src/invoke/invoke.spec.ts` -- the editor `Invoke` rows. Add `actions` to `Entries`, a spec factory `recordAction(id, available)` (function) recording its input through `Recorder`, a command factory `renameWith(available: boolean)` (function), and a factory `recordNullableName()` (function) returning a UiAction over `v.nullable(nameInputSchema)` for the `null` row.
- [x] `packages/editor/src/invoke/invoke.types.spec.ts` -- the type rows, as `expectTypeOf` only (no `@ts-expect-error`, the repo's type-test convention): for each kind, the input parameter of `invoke` instantiated for a hand-written `{ name: string }` handle equals `{ name: string } | undefined`, so `{ name: 1 }` is refused by that type. If an instantiation expression on the overloads can't select one, the implementer reports it rather than switching to `@ts-expect-error`.
- [x] `packages/editor/src/invoke/types.ts` -- `InvokeFunctions = Pick<Invoke, 'invoke' | 'available'>`.
- [x] `packages/editor/src/invoke/use-invoke.ts` (function, composable) -- `useInvoke(): InvokeFunctions`: `useService(Invoke)`, then a new object whose `invoke` and `available` forward to it. Not exported from `index.ts`.
- [x] `packages/editor/src/invoke/use-invoke.spec.ts` (browser) -- the glue row: a spec-declared component (function: a render-function component, no template) with one button labelled "Rename" whose click calls `invoke(RenameDesign, { name: 'Lily58' })`; a real container with a committed `aDesign()`; click it by role and label; assert `store.current`'s design name.

**Acceptance Criteria:**
- Given each boundary-table row, when `pnpm test` runs, then a test named for it passes at its level, the editor rows in Chromium and Firefox.
- Given each toggled bug, its tests go red, and green once restored: `invoke` ignores the caller's input; `invoke` asks the builder even when given input; `invoke` never asks the builder; `Invoke.available` returns `true` for a command and an action without asking the store; `available` returns `true` for a UiAction; the action branch builds its input before its guard; `null` treated as no input; `useInvoke`'s `invoke` drops its input argument.

## Implementation Notes

- Decision (Sergii, 2026-11-08): the caller-input type rows are dropped and `invoke.types.spec.ts` is deleted, not stated with `@ts-expect-error` and not moved onto an exported `EntryInput<H>` alias, because no `expectTypeOf` matcher can state them: `Invoke.prototype.invoke<RenameHandle>` applies the type argument to all three overloads (`tsc`: "RenameHandle does not satisfy the constraint ActionHandle"), `toBeCallableWith(rename, { name: 1 })` compiles, and `.not.toExtend<(h: RenameHandle, input: { name: number }) => unknown>()` fails, since a generic overload widens to its constraint. The earlier rule is that rows only `@ts-expect-error` can state are dropped. The compile check itself stands: the editor specs compile only with schema inputs. The dropped row was: `| module boundaries | caller input type | `invoke` of a `{ name: string }` command, action and UiAction: `{ name: 'x' }` / none / `{ name: 1 }` | compiles / compiles / does not | types (editor) |`
- Decision (build): `useInvoke` returns `{ invoke: service.invoke.bind(service), available: service.available.bind(service) }`, not forwarding arrows, because an arrow can't keep `invoke`'s three overloads without casts, and `bind`'s `OmitThisParameter` keeps the type unchanged (`pnpm typecheck` passes on `InvokeFunctions`).
- Decision (build): each "check says no" row is its own test asserting `available` and the refusal, not an `it.each` yes/no pair, because the refusal applies only to the "no" case and AGENTS.md says "No `if` or loop around `expect`".
- Decision (build): `#runAction` ends in a ternary, not an early return, because `unicorn/no-declarations-before-early-exit` refuses the early return; behaviour is unchanged.

## Review Triage Log

- 2026-11-08, pass 1 (lenses: quick, test-reviewer; quotes checked against the diff, none dropped). Verdicts: high 0, medium 1, low 2, false 2, maybe-false 0.
  - medium, patch -- `invoke.spec.ts`: no row proves an unavailable UiAction refuses before its builder is asked (quick). Real: the new UiAction-unavailable row passes caller input, so `#inputFor` never reaches the builder, against the Always line "before any builder is asked". Fix: a row with `RecordedBuildName` and no caller input, toggled bug run.
  - low, patch -- `invoke.spec.ts`: `renameWith`, `recordAction`, `recordName` annotate their return as the base handle interfaces, so `v.InferInput<H['input']>` widens and those calls accept any input (quick), weakening the Decision (Sergii) note that the specs compile only with schema inputs. Fix: drop the annotations.
  - low, patch -- `design-store.spec.ts` `says a command with a design loaded is %s` / `says an action with no design loaded is %s`: one `expected` both configures the fake check and is the expected value (test-reviewer, check 2). Fix: separate check and expected columns.
  - false -- plan Tasks wording (`input === undefined ? … : input` in each branch) against `#inputFor(handle, input)`: the guard still runs first in all three branches and behaviour matches; the fix would edit this build's plan, so rejected.
  - false -- `ShortcutRegistry` now throws on an unregistered command with no design (quick): the plan's Decision on unregistered handles chose this ("throws only on a bug"), and `ShortcutRegistry`'s handles all come from the registered tokens, so no keypress reaches an unregistered command.

- Pass 1 patches applied: the UiAction row's toggled bug (input built before the guard in `#invokeUiAction`) went red, only that row, and green once restored. `pnpm test` 2149 passed; `pnpm check` exit 0, e2e included. The patches have not had their own review pass.
- 2026-11-08, pass 2, on pass 1's patches (lenses: quick, test-reviewer; quotes checked, none dropped). Verdicts: high 0, medium 0, low 0, false 2, maybe-false 0.
  - false -- the boundary table and toggle list carry no UiAction builder-before-guard row (quick): the test exists (`refuses a UiAction its check says no to without asking its builder`) and its toggle is logged above; the fix would edit this build's frozen boundary table, so rejected.
  - false -- `checkSays` and `expected` hold equal literals per row (test-reviewer, check 2): both come from the boundary table ("check no / yes → false / true"), and passing the check through is the behaviour under test.

## Design Notes

- **Decision (plan): `DesignStore.available(handle)` answers for commands and actions and `run` uses it, not `Invoke` resolving the entry and calling its check itself,** because AD-2 gives the check to the store ("it parses the input and checks availability before the apply step") and AGENTS.md says "Put code in the package that owns the concept" and "Test a rule where it is defined"; a copy in `Invoke` could drift from what `run` refuses, which the ticket forbids ("matching what invoke refuses").
- **Decision (plan): `store.available` on an unregistered handle throws `run`'s `InvariantError`, not `false`,** because AD-2's store "throws only on a bug", and `run` already throws there. So `invoke` of an unregistered command with no design now throws, where it returned `unavailable` before, matching `run`.
- **Decision (plan): `undefined` means no input, not counting arguments,** because the spine writes the signature `invoke(handle, input?)` (AD-26), and an optional parameter can't tell `undefined` from a missing one at the type level.
- **Decision (plan): `null` is a caller's input, not "none" as `??` would make it,** because the spine says the builder runs "only when it passes none" (AD-26), and a caller passing `null` to a nullable schema passed something.
- **Decision (plan): the action branch gets its own guard in `Invoke`, not left to `run`'s check,** because the plan's Always line asks the builder only after availability, and `run`'s check comes after its input argument is built.
- **Decision (plan): `InvokeFunctions = Pick<Invoke, 'invoke' | 'available'>`, not a hand-written interface,** because a copy of the three overloads could drift from `Invoke`'s, and the composable returns exactly those two members.
- **Decision (plan): the editor `available` rows assert `available` and `invoke`'s refusal together, not in separate rows,** because the ticket's claim is one: "available(handle) is false … matching what invoke refuses".
- **Decision (plan): the store's availability rules are tested in `design` (Node); `editor` tests one row per kind it dispatches, not every store rule again through `Invoke`,** because AGENTS.md: "Test a rule where it is defined; a package that uses it tests only its own part". The ticket's browser-mode verify holds for every editor row.
- **Decision (plan): no row for `available` updating reactively in a computed, not a disabled-button row,** because the ticket verifies only a click; the first menu or toolbar story owns that.
- **Decision (plan): `useInvoke` lives in `invoke/` and its spec runs in the browser, not in the `editor` Node project's `src/design/**`,** because the spine says a composable lives "in its concept's folder", and the verify clicks a rendered button.
- **Decision (plan): `useInvoke` stays out of `editor`'s `index.ts`, not re-exported there,** because only editor's components use it and nothing outside `editor` renders them, as for `useOpenDesign` (23.20).
- **Decision (plan): the glue row's component is a render-function component declared in the spec, not a new `.vue` file,** because no real component or entry exists yet (this plan's Never: "Tests declare their own"), and a test-only `.vue` file under `src/` would ship in the package.

## Conformance Log

First pass: two conformance readers and one gap reader (Sonnet, context-free); then one final conformance pass. Dropped 0 findings: every quoted rule, plan line and path was checked and found.

- `invoke` refuses … before any builder is asked (action branch builds its input before `run`'s check) -- fixed (`#invokeAction` guard, row)
- `A choice no requirement made is a decision and is labelled as one` (`??` treats `null` as none) -- fixed (`=== undefined`, decision, row)
- `Give every decision its rejected alternative` (two editor-row decisions; `Pick<Invoke, …>`) -- fixed
- `Every class or function the plan adds carries a (service) or (function) tag` (`Invoke.available`, spec factories, spec component) -- fixed
- precedent `invoke.spec.ts`/`design-store.spec.ts`: `return true` test commands can't say no -- fixed (`renameWith`, `saveWith`)
- `No change to the store's run results, its no-design throw` (order of `available` and `#committed()`) -- fixed (private helpers)
- note: `#invokeCommand`'s comment goes stale with the new guard -- fixed (task)
- gap: `recordAction`/command/action rows `Prove a test Stryker can't reach … with a toggled bug` -- fixed (toggles)
- gap: UiAction "check says no" has no real UiAction -- dropped as not a gap: 16.4 is another epic's, and spec-declared entries are 23.19's agreed pattern
- Final pass (read by no reviewer): type-spec pattern for overloads -- fixed (`expectTypeOf` on the parameter type); private helpers and nullable UiAction untagged -- fixed; no-design editor row named as the verify row -- fixed; unregistered command with no design now throws -- fixed (decision)

## Verification

**Commands:**
- `pnpm test` -- expected: all projects green; editor's in Chromium and Firefox.
- `pnpm check` -- expected: typecheck, lint, format, depcruise, build pass.

**Manual checks:**
- Nothing visible changes: no component in the app calls `useInvoke` or `available` yet; `pnpm dev` shows what main shows.

## Boundary Table

| Group | Boundary | Input | Expected | Level |
| --- | --- | --- | --- | --- |
| production bugs | caller input skips the builder | `invoke(RenameDesign, { name: 'Lily58' })`, design committed, `RecordedBuildName` registered | `current`'s name `'Lily58'`; recorder empty | unit (editor, browser) |
| production bugs | no design (the ticket's verify row: `Invoke` delegates to the store) | `available(RenameDesign)` before any commit | `false`; `invoke` returns `{ kind: 'unavailable', command: id }` | unit (editor, browser) |
| rules | no caller input | `invoke(RenameDesign)` / `invoke(RenameDesign, undefined)`, builder returns `{ name: 'Corne' }` | `current`'s name `'Corne'` / `'Corne'` | unit (editor, browser) |
| production bugs | unavailable action skips the builder | `recordAction` whose check says no, `RecordedBuildName` registered | `unavailable`; recorder empty | unit (editor, browser) |
| rules | caller input, action | a test action, `invoke(action, { name: 'Lily58' })`, a builder registered | recorder holds `{ name: 'Lily58' }` only | unit (editor, browser) |
| rules | `null` caller input | a UiAction over `v.nullable(nameInputSchema)`, `invoke(uiAction, null)`, `RecordedBuildName` registered | recorder holds `null` only | unit (editor, browser) |
| rules | caller input, UiAction | `invoke(uiAction, { name: 'Lily58' })`, a builder registered | recorder holds `{ name: 'Lily58' }` only | unit (editor, browser) |
| rules | caller input invalid, UiAction | `invoke(uiAction, { name: '' })` | `input-invalid`, issue at `['name']`; recorder empty | unit (editor, browser) |
| rules | command availability | design committed, check says no / yes | `false` and `unavailable` / `true` | unit (editor, browser) |
| rules | action availability | no design, check says no / yes | `false` and `unavailable` / `true` | unit (editor, browser) |
| rules | UiAction availability | check says no / yes | `false` and `unavailable` / `true` | unit (editor, browser) |
| rules | store: command | no design / design and check no / design and check yes | `false` / `false` / `true` | unit (design, Node) |
| rules | store: action | check no / check yes, no design | `false` / `true` | unit (design, Node) |
| rules | store: action sees the design | check returns `current.isSome()`, before / after `replaceDesign` | `false` / `true` | unit (design, Node) |
| rules | store: unregistered | `available` of a command no token holds | throws `InvariantError` naming it | unit (design, Node) |
| ~~module boundaries~~ | ~~caller input type~~ | dropped (Decision (Sergii), Implementation Notes) | — | — |
| glue | component click | a spec component's "Rename" button calling `useInvoke().invoke(RenameDesign, { name: 'Lily58' })`, design committed | after the click, `current`'s name `'Lily58'` | unit (editor, browser) |
