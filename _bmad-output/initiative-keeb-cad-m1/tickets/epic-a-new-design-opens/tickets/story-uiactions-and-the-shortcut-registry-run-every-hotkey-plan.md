---
title: 'UiActions and the shortcut registry run every hotkey'
type: 'feature'
ticket: '19'
created: '2026-11-07'
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
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No key does anything. `ui`'s `HotkeyLayer` (23.6) matches keys but nothing feeds it; the design store's handles declare no hotkeys, and the editor has no `UiAction` mechanism for UI-only behaviour (workspace keys, Tree, F6), which 23.8 and 16.4 need.

**Approach:** `design`'s `CommandHandle` and `ActionHandle` gain an optional static `hotkeys`. `editor` adds the `UiAction` mechanism (`UiAction`, `UiActionHandle`, `registerUiAction`, the `uiActions` multi token), per-entry input builders, one invoke path that every hotkey (later menu and palette) goes through, and one shortcut registry, resolved eagerly at startup, that collects every handle's hotkeys from the three multi tokens and feeds one `HotkeyLayer` on `document` while the editor is mounted (AD-26).

## Boundaries & Constraints

**Always:**
- Every hotkey comes from a handle's static `hotkeys`; the registry keeps no list of its own and zag's store holds only what the registry hands it.
- Every invocation goes through the invoke path: input from the entry's input builder when one is registered, `{}` otherwise; commands and actions through `DesignStore.run`, UiActions through their own `available()` then `apply(input)`.
- UiActions never touch the design store.

**Never:**
- A runtime check of chord choice or of two handles sharing a hotkey (review's, AD-26's 2026-11-06 guidance and Sergii's decision below).
- A real UiAction, command hotkey or input builder: the first ones come with 23.8 (keys 1-5, T, Esc, F6) and 16.4 (undo and redo). Tests declare their own.
- Menus, the palette, the cheat sheet, `kbd` hints in the chrome.
- Notices for a refused hotkey (16.1).
- A design-file or schema change.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Command hotkey | a command handle with `hotkeys: ['A']`, a design loaded | the key runs it; the store's `current` holds its edit | — |
| Input builder | the same command with a registered input builder | runs with the builder's input | — |
| UiAction hotkey | a UiAction with `hotkeys: ['T']` | the key runs its `apply` with its input | — |
| Unavailable | an entry whose availability says no | nothing changes | refusal dropped until 16.1 |
| Unmounted | the editor unmounted | no key fires anything | — |
| No design yet | a command hotkey before any design is committed | nothing changes, nothing throws | the invoke path returns `unavailable` |
| Bad registrations | an id two handles share; a malformed hotkey; two input builders for one handle | `autoLoad` throws naming the id, the hotkey or the handle, before anything mounts | — |

**Decision (Sergii, 2026-11-07):** the names are `ShortcutRegistry`, `Invoke`, `InputBuilder`, `registerInputBuilder`, `inputBuilders`, `useShortcuts` (folders `ui-actions/`, `invoke/`, `shortcuts/`), not others, because each is AD-26's own phrase ("shortcut registry", "invoke path", "input builder"); the glossary gains **shortcut registry**, **invoke path** and **input builder** in one docs-only spine commit on main before the build (41a8adc).

**Decision (Sergii, 2026-11-07):** a UiAction's static `kind` is `'ui-action'`, not `'uiAction'` or `'ui'`, because the Data Schema's kind values are kebab-case (`'input-invalid'`, `'design-invalid'`).

**Decision (Sergii, 2026-11-07):** two handles may share a hotkey and nothing checks it at runtime; review catches it, not a registry throw, because AD-26 makes chord choice "guidance for whoever picks one, not a check in code" (Sergii first chose a throw, then dropped it).

**Decision (Sergii, 2026-11-07):** the registry throws on an id two handles share across `commands`, `actions` and `uiActions`, not mapping hotkeys by handle, because the registry maps a fired hotkey back to its handle by id, so a shared id could run the wrong one.

**Decision (Sergii, 2026-11-07):** `ShortcutRegistry` is eager and runs its checks (shared id, malformed hotkey) in its constructor, at `autoLoad`, with `listen` only attaching the layer, not checking in `listen` on mount, because Vue catches a throw in a lifecycle hook and in production only logs it, so launch would go on with no shortcuts; the store's duplicate command id fails the same way ("It resolves eagerly at startup, so a duplicate command id fails there", AD-2).

**Decision (Sergii, 2026-11-07):** an input builder's method is `input()`, not `build()` or `inputFor()`, because the glossary's **build** is the design's list of blueprint entries.

**Decision (Sergii, 2026-11-07):** two input builders for one handle throw at `autoLoad` naming the handle's id, and a builder for a handle no token holds is ignored, not both throwing and not first-wins, because the invoke path can't choose between two, and the spine treats a forgotten registration as silent ("an empty multi token resolves to `[]`", AD-2).

**Decision (Sergii, 2026-11-07):** the invoke path returns `unavailable` for a command while the store's `current` is none, not starting the registry only after launch and not leaving the store's throw, because a command's availability check takes a design and the store throws before it can ask (`#committed()`), `unavailable` is what that check would say, and UiAction and action keys keep their own checks, which work with no design.

</frozen-after-approval>

## Code Map

- `packages/design/src/entries/types.ts` -- `CommandHandle`, `ActionHandle` gain `readonly hotkeys?: readonly string[]`. `InputCheck`/`InputMismatch` check `apply`'s input against `v.InferOutput`; `registerUiAction` reuses them (export both from `design`'s `index.ts`).
- `packages/design/src/entries/{register-command.ts,register-action.ts,tokens.ts}` + `register-{command,action}.types.spec.ts` -- the register-function, multi-token and type-test shape the editor copies.
- `packages/design/src/store/design-store.ts` -- `run`'s two overloads (copy their typing for `invoke`); a command `run` with nothing committed throws `InvariantError`; refusals are `Rejection` (`unavailable`, `input-invalid`, `command` = the handle's id); the store already refuses a duplicate id among commands and actions. Don't change it.
- `packages/design/src/store/{find-duplicate-ids.ts,duplicate-command-id-error.ts}` -- export `findDuplicateIds` from `design` and reuse it; the error is the precedent for editor's errors.
- `packages/design/src/parsing/parse.ts` -- `parse(schema, value): Result<output, SchemaIssue[]>` over `toSchemaIssue`; export it from `design` for the UiAction branch.
- `packages/ui/src/hotkeys/{hotkey-layer.ts,assert-valid-hotkey.ts}` -- `new HotkeyLayer(target, onHotkey(id))`, `replaceHotkeys`, `destroy`; export `assertValidHotkey` from `ui`'s `index.ts`. Its rules (letter guard, text fields, the malformed message) are tested in `ui`; don't retest them. zag keys its entries by id (`@zag-js/hotkeys/dist/store.mjs:146`, `commands.set(command.id, …)`), so one layer id per hotkey.
- `packages/commands/src/{empty-input-schema.ts,types.ts}` -- `emptyInputSchema`, `EmptyInput`, not exported today; the first real input-less UiAction (23.8) exports and uses them.
- `packages/design/src/design-module.ts` -- `.eager()` precedent.
- `packages/editor/src/{mount-editor.ts,App.vue,index.ts}`, `mount-editor.spec.ts` -- mount, and the precedent for a real container and `__vue_app__` unmount. `App.vue` gains `useShortcuts()` only; don't copy its `#ccc` (deferred).
- `app/src/main-modules.ts` -- gains `editorModule`.
- `packages/editor/package.json` -- `@keeb-cad/result` moves from devDependencies to dependencies (`invoke` returns `AsyncResult`).

## Tasks & Acceptance

**Execution:** one phase; `pnpm test` green at the end.
- [ ] `packages/design/src/entries/types.ts`, `index.ts` -- `hotkeys?` on both handles; export `InputCheck`, `InputMismatch`, `findDuplicateIds`, `parse`. Both `register-*.types.spec.ts` gain rows: `hotkeys: ['A']` registers, `hotkeys: 'A'` does not compile.
- [ ] `packages/ui/src/index.ts` -- export `assertValidHotkey`.
- [ ] `packages/editor/src/ui-actions/{types.ts,tokens.ts,register-ui-action.ts}` + `register-ui-action.types.spec.ts`:
  - `UiAction<Input>` (`available(): boolean`, `apply(input: Input): void`), `UiActionHandle` (statics `kind: 'ui-action'`, `id`, `label`, `input`, `hotkeys?`; `new (): UiAction<unknown>`), `UiActionInput<H>`.
  - `uiActions = createMultiToken<UiActionHandle>('uiActions')`.
  - `registerUiAction(container, handle)` (function): the class as its own singleton, added to `uiActions`; refuses to compile through `InputCheck`.
  - A real UiAction takes AGENTS.md's three files (class, input schema, `types.ts` type), or `emptyInputSchema`/`EmptyInput`; spec-declared test ones may inline their schema.
- [ ] `packages/editor/src/invoke/{types.ts,tokens.ts,register-input-builder.ts,duplicate-input-builder-error.ts,invoke.ts}` + `invoke.spec.ts`, `register-input-builder.types.spec.ts`:
  - `InputBuilder<Input>` (`input(): Input`); `BuilderInputCheck<Input, Schema>`/`BuilderInputMismatch` (`types.ts`) check it against `v.InferInput`, with their own message.
  - `registerInputBuilder(container, Handle, Builder)` (function): the builder as its own singleton, `{ handle, builder }` added to `inputBuilders`.
  - `DuplicateInputBuilderError` (error class, its file) naming the handle ids.
  - `Invoke` (service): its constructor throws `DuplicateInputBuilderError` when two entries of `inputBuilders` share a handle (`findDuplicateIds` on handle ids). `invoke(handle)` has three overloads, each returning an `AsyncResult`: a command `AsyncResult<void, Rejection>`, an action `AsyncResult<void, ActionError<H> | Rejection>` (as `run`'s), a UiAction `AsyncResult<void, Rejection>`. Input = the handle's builder's `input()`, else `{}`. Command → `unavailable` while `store.current` is none, else `AsyncResult.fromResult(store.run(…))`; action → `store.run(…)`; UiAction → `unavailable` when `available()` is false, `input-invalid` with `parse`'s issues, else `apply(parsed)`.
- [ ] `packages/editor/src/shortcuts/{shortcut-registry.ts,duplicate-handle-id-error.ts,use-shortcuts.ts}` + `shortcut-registry.spec.ts` (browser):
  - `DuplicateHandleIdError` (error class, its file), naming the ids.
  - `ShortcutRegistry` (service, eager): injects `commands`, `actions`, `uiActions`, `Invoke`. Its constructor throws `DuplicateHandleIdError` on ids shared across the three tokens (`findDuplicateIds`), then calls `assertValidHotkey` on every declared hotkey. `listen(target)` throws `InvariantError` while a layer exists, else builds one `HotkeyLayer` and hands it one entry per declared hotkey, id `<handle id>#<index>`, mapped back to its handle, and invokes it, dropping the result. `stop()` destroys the layer (no-op when none); `[Symbol.dispose]` calls `stop()`.
  - `useShortcuts()` (function, composable): `listen(document)` on mount, `stop()` before unmount; `App.vue` calls it.
  - `use-shortcuts.spec.ts` (browser) holds the mount and unmount rows, mounting through `mountEditor` on a real container.
- [ ] `packages/editor/src/{editor-module.ts,index.ts}` -- `editorModule` registers `Invoke`, and `ShortcutRegistry` with `.eager()`; `index.ts` re-exports `editorModule`, `registerUiAction`, `registerInputBuilder`, `uiActions`, `inputBuilders`, the two errors and the types. `App.spec.ts` and `mount-editor.spec.ts` add `editorModule`.
- [ ] `app/src/main-modules.ts` -- add `editorModule`.
- [ ] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- `App.vue`'s `border-bottom: 1px solid #ccc` against AD-26's tokens.

**Acceptance Criteria:**
- Given each boundary-table row, when `pnpm test` runs, then a test named for it passes at its level, in Chromium and Firefox for the browser rows.
- Given each toggled bug, the tests go red, and green once restored: the registry skips `uiActions`; the invoke path ignores the input builder; `stop()` not called on unmount; every hotkey of a handle sent under the handle's id.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

- **Decision (plan): an input builder is a `di` class registered per handle, not a plain function in a map,** because it reads UI state, which "lives in small `di` services" (spine, Editor state), and "An entry that needs a service reaches it through `di` (AD-25), never through a module singleton".
- **Decision (plan): `ShortcutRegistry` listens from `App.vue`'s mount to its unmount, not from its construction,** because the container is built before the editor mounts (`Launch` step 1) and tests unmount through `__vue_app__` without disposing the container; `[Symbol.dispose]` covers a container disposed first.
- **Decision (plan): the layer listens on `document`, not the editor's root element,** because a key must reach the shortcuts wherever focus sits (EXPERIENCE.md › Shortcuts: F6 cycles regions), and `HotkeyLayer` already skips form fields.
- **Decision (plan): a UiAction's refusal reuses `Rejection`'s `unavailable` and `input-invalid`, not a new kind,** because the Data Schema defines them as "the availability check said no" and "the input failed the command's schema; command = the handle's id", and a UiAction has both; a new kind would need a spine entry first.
- **Decision (plan): the hotkey path drops the invoke's result, not showing a notice for a refusal,** because notices are 16.1's (epic Boundaries: "banners and toasts" are epic-keep-my-work's).
- **Decision (plan): `design` exports `parse` and `findDuplicateIds`, not editor copies,** because `toSchemaIssue` is the one conversion that keeps Valibot's issue type from callers (Data Schema `SchemaIssue`: "a plain copy of a Valibot issue, so callers never see Valibot's issue type") and AGENTS.md: "Put code in the package that owns the concept".
- **Decision (plan): `DuplicateHandleIdError`, not design's `DuplicateCommandIdError`,** because the glossary's command id is "of a command or action", and a UiAction's id is neither.
- **Decision (plan): one layer id per hotkey (`<handle id>#<index>`), not the handle's id,** because zag's store keys entries by id (`store.mjs:146`), so a handle's second hotkey would replace its first.
- **Decision (plan): the hotkey rows are editor browser units asserting the store's `current` (or a recorded fake), not `app` integration,** because the ticket verify is about the editor's key-to-entry path, and AGENTS.md: "Assert what a function returns or a visible effect"; the store's own rules stay tested in `design`.
- **Decision (plan): the `invoke` checks run in `Invoke`'s constructor, which the eager registry resolves at `autoLoad`, not in the registry,** because `Invoke` owns the builders (AGENTS.md: "Test a rule where it is defined").
- **Decision (plan): `editorModule`, `DuplicateHandleIdError` and `DuplicateInputBuilderError` are tagged neither service nor function, not forced into one,** because a `Module` value and an error class hold no state, do no I/O and carry no logic, as `designModule` and `DuplicateCommandIdError`.
- **Decision (plan): a second `listen` while a layer exists throws `InvariantError`, not replacing the layer or doing nothing,** because only a second mount on one container reaches it, which nothing does (`Launch.run` calls `mountEditor` once; an unmount calls `stop()` first), and AD-2's store "throws only on a bug".
- Test entries record through a spec-declared recorder class registered in the container in `arrange` (AGENTS.md: "Substitute through `di`"), never a module-level array.

## Conformance Log

First pass: two conformance readers and one gap reader (Sonnet, context-free); then one final conformance pass. Dropped 0 findings: every quoted rule and path was checked and found.

- gap: `@zag-js/hotkeys/dist/store.mjs:146` keys entries by id, so a handle's second hotkey replaced its first -- fixed (`<handle id>#<index>`)
- gap: `Ask which combinations matter instead of enumerating them` (shared-id pairs, `hotkeys: []`) -- fixed (rows)
- gap: `register-command.types.spec.ts` asserts `& InputMismatch`, not exported -- fixed (exported)
- gap: "fails at the first launch" with `listen` on mount (`app/src/launch/launch.ts`) -- asked (Sergii: eager constructor)
- gap: `Arrange only a state real commands could reach` (input-invalid builder) -- fixed (a `minLength` pipe)
- `InputCheck` compares against `v.InferOutput`, not a builder's `v.InferInput` -- fixed (`BuilderInputCheck`)
- `a plain copy of a Valibot issue, so callers never see Valibot's issue type` (parse left open) -- fixed (export `parse`)
- `Arrange only what the test uses` (`DesignCanvas.spec.ts` doesn't mount `App`) -- fixed (dropped)
- `When nothing says what a boundary returns, ask` (hotkey comparison, self-duplicate) -- asked (Sergii: shared hotkeys are review's)
- `When nothing says what a boundary returns, ask` (two builders, orphan builder) -- asked (Sergii: throw on two, ignore orphan)
- `tokens, errors and define* factories each get their own file` (no error files) -- fixed
- `Substitute through di` (UiAction row's recorder) -- fixed
- `test wiring between packages as integration` (row level) -- fixed (decision)
- `Test a rule where it is defined` (`register-action.types.spec.ts`) -- fixed
- `Give each command or action three files` (UiAction layout) -- fixed
- `Every class or function the plan adds carries a (service) or (function) tag` (`editorModule`) -- fixed (decision)
- `Give every decision its rejected alternative` (drop-result decision) -- fixed; the frozen names decision's "not others" -- asked (left to Sergii)
- `Glossary terms only` (`build()` vs glossary **build**) -- asked (Sergii: `input()`)
- `invoke` error type `unknown` unlabelled -- fixed (typed overloads)
- `mod+K` platform-dependent row -- fixed (`['A', 'B']`)
- precedent `packages/editor/src/App.vue`: `border-bottom: 1px solid #ccc;` against AD-26's tokens -- deferred
- Final pass (7 findings), read by no reviewer: glossary row still refusing a shared hotkey -- fixed (009ec01); error classes untagged -- fixed (decision); `invoke` overload return types -- fixed; `Built…` names reuse **build** -- fixed (`BuilderInputCheck`); second `listen` -- fixed (decision, row); malformed row asserting `ui`'s message -- fixed; no spec named for the unmount rows -- fixed (`use-shortcuts.spec.ts`).
- Sergii, 2026-11-07: the eager-constructor answer moved the duplicate checks out of `listen`; the builder check sits in `Invoke`'s constructor, not the registry's as asked, because `Invoke` owns the builders.

## Verification

**Commands:**
- `pnpm test` -- expected: all projects green, editor's in Chromium and Firefox.
- `pnpm check` -- expected: typecheck, lint, format, depcruise, build pass.

## Boundary Table

| Group | Boundary | Input | Expected | Level |
| --- | --- | --- | --- | --- |
| production bugs | no design loaded | a command hotkey before any design is committed | `unavailable` naming its id; nothing throws; `current` still none | unit (editor, browser) |
| production bugs | unmounted | mount, unmount, press a command's hotkey | the design unchanged | unit (editor, browser; `use-shortcuts.spec.ts`) |
| rules | command hotkey | a test command with `hotkeys: ['A']`, no builder, key A | it runs with `{}`; `current` holds its edit | unit (editor, browser) |
| rules | command hotkey with builder | the same with a builder returning `{ name: 'Built' }` | `current` holds the builder's input | unit (editor, browser) |
| rules | action hotkey | a test action with `hotkeys: ['B']` | the recorder holds one `apply` | unit (editor, browser) |
| rules | UiAction hotkey | a test UiAction with `hotkeys: ['T']` and a builder | the recorder holds the built input | unit (editor, browser) |
| rules | hotkeys per handle | `hotkeys` absent / `[]` / `['A']` / `['A', 'B']` | no key / no key / A / A and B each run it once | unit (editor, browser) |
| rules | UiAction unavailable | `available()` false | `unavailable` naming its id; recorder empty | unit (editor, browser) |
| rules | UiAction input invalid | schema `{ name: pipe(string, minLength(1)) }`, builder returns `{ name: '' }` | `input-invalid` with the issue at `['name']`; recorder empty | unit (editor, browser) |
| rules | shared id | a UiAction's id equals a command's / an action's / another UiAction's / all distinct | `autoLoad` throws `DuplicateHandleIdError` naming it ×3 / resolves | unit (editor, browser) |
| rules | malformed hotkey | a handle with `hotkeys: ['mod+']` / `['mod+K']` | `autoLoad` throws / resolves (the message is `ui`'s) | unit (editor, browser) |
| rules | listen twice | `listen(document)` with a layer already listening / after `stop()` | throws `InvariantError` / listens | unit (editor, browser) |
| rules | input builders | two for one handle / one per handle / one for an unregistered handle | `autoLoad` throws `DuplicateInputBuilderError` naming it / resolves / resolves | unit (editor, browser) |
| module boundaries | `registerUiAction` | `apply`'s input differs from the schema's output | does not compile | types (editor) |
| module boundaries | `registerInputBuilder` | schema `v.optional(v.string(), 'x')`: `input()` returns `string \| undefined` / `string` | compiles / does not | types (editor) |
| module boundaries | handle `hotkeys` | `['A']` / `'A'`, on a command and an action | compiles / does not | types (design) |
| glue | app wiring | `mainModules` with `editorModule` | `Launch`'s rows stay green (the eager registry resolves) | integration (app) |
