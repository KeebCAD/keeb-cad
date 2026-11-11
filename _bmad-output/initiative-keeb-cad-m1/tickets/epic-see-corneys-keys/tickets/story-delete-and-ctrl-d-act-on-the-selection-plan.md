---
title: 'Delete and Ctrl+D act on the selection'
type: 'feature'
ticket: 24
created: '2026-11-11'
status: 'built'
baseline_revision: '6cc7f3f5944d8664ebe86c74a98344a0033e4056'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A selected key can't be deleted or duplicated from the keyboard. Underneath, a command's availability is a boolean over the design alone, so a read refusal (`root-required`) can't grey a key out with its reason. And the hotkey layer claims every matched key, so a bound key does nothing even where its entry can't run.

**Approach:** Two `editor` UiActions, `DeleteSelection` (Delete) and `DuplicateSelection` (Ctrl+D), read the workspace, the focused place (a new public read on `Landmarks`) and the selection. Each builds its command's input in one private method, asks `invoke.available(command, input)`, and runs the command through `invoke`. Every command's `available(design, input)` returns `Result<void, Rejection>` from a `model` check function its apply also calls. The store and the invoke path check in the order: no design, build the input, parse, check, run. `UiAction.apply` returns `AsyncResult<void, Rejection>`, and `ui`'s hotkey layer calls `preventDefault` only when the registry says it ran the entry.

## Boundaries & Constraints

**Always:**
- Spine AD-26 Shortcuts, AD-2 Commands and actions, and the ticket set the behaviour; the spine's sentence "`DeleteSelection` acts only on the Layout canvas until a story gives Delete a meaning elsewhere" widens to the slide-out's Tree tab (docs-only, on main, before the code branch).
- One key's meanings live in one UiAction; the registry still refuses only duplicate ids.
- `Invoke.available(handle, input?)` stays a boolean: a parse failure answers `true`, and `invoke` answers it with `input-invalid`.
- The slide-out holds only the Tree today (`TreeSlideOut.vue:31`, `aria-label="Tree"`), so focus in the `slide-out` place is focus in the Tree tab.
- An entry that needs a selection it doesn't have is unavailable, not refused.
- Decision (Sergii 2026-11-11): a matched chord with Ctrl or Meta, and a matched Alt+arrow (Sergii 2026-11-11, so an unavailable nudge never sends the browser Back or Forward), is always `preventDefault`ed, and a plain key only when the registry says it ran the entry, so the bookmark dialog never opens over the editor while Delete, arrows and letters still reach the focused element when unavailable. Not prevent-only-when-ran for chords too, because an unavailable Ctrl+D would then open the bookmark dialog (spine AD-26: "Alt+arrow and every Ctrl chord call `preventDefault`"; EXPERIENCE.md line 239). The spine's handled-answer sentence gains this exception (docs, on main first).
- Decision (Sergii 2026-11-11): the ticket's Ctrl+Z clauses are left out; 14.1 checks undo for every command this slice writes (epic decision 2026-10-30), because no undo exists yet and AGENTS.md says "Arrange only a state real commands could reach". Not pulling undo into this story (another epic's story, past the plan cap). Sofia drops the clauses from 13.24's verify.
- Decision (Sergii 2026-11-11): `DeleteSelection`'s hotkeys are `Delete` and `Backspace`, not `Delete` only, because a Mac laptop's "delete" key sends Backspace (a real Delete needs fn+delete). EXPERIENCE.md's one Backspace use is the track tool in isolated part mode (line 365), which can later extend this one UiAction (AD-26: one key's meanings by focus live in one UiAction). EXPERIENCE.md's Delete row (line 255) gains `/ Backspace` (docs, on main first).
- Decision (Sergii 2026-11-11): one key press reports its command's event first, then the UiAction's, each when it settles, not the UiAction first, because `Invoke` reports a call with its result (`invoke.ts:137-144`) and the UiAction's result is its command's. The spine's "(the UiAction, then its command)" becomes "(its command, then the UiAction, each when it settles)" (docs, on main first).
- Decision (Sergii 2026-11-11): only canvas and Tree clicks count as reaching a selection, not the devtools Selection field, so no row arranges several selected ids (the dropped rows 1b, 6, 7c); Delete with several ids and Ctrl+D's "exactly one" limit get their rows with multi-selection (15.4), as the ticket says ("since no story before it can select several").
- Decision (Sergii 2026-11-11): Delete is not blocked while `Autosave.failure` is set (`app/src/autosave/autosave.ts`), not unavailable while a save fails, because the ticket asks for no guard, the strip already shows the failure, and 14.1's undo closes the window in which a failed earlier save leaves the deleted nodes no copy.
- Decision (Sergii 2026-11-11): with focus on the canvas both UiActions need the Layout workspace; with focus in the Tree they act on any workspace, because they act on the selection, which the Tree shows the same on every workspace (EXPERIENCE.md: Delete acts on "what has keyboard focus"). Not Layout-only for the Tree.

**Never:**
- Multi-node duplicate (15.4); G and S, and the add flow (13.25); undo (14.1); menus or the palette; focus management after a delete.
- A second handle on Delete or Ctrl+D; `vi.mock`; jsdom; snapshots.

## Boundary table

| # | Group | Input / state | Expected | Level |
|---|---|---|---|---|
| 1 | production bugs | design on Layout, focus on the canvas landmark, selection `['a']` (slot), Delete pressed | `a` gone from the design; selection `[]`; the keydown is `defaultPrevented` | unit, editor (browser) |
| 1a | production bugs | row 1's state, Backspace pressed | `a` gone; selection `[]`; keydown `defaultPrevented` | unit, editor |
| 2 | production bugs | same, focus on a Tree row in the slide-out | `a` gone; selection `[]` | unit, editor |
| 3 | production bugs | same, focus in the top bar | design unchanged; keydown not `defaultPrevented` | unit, editor |
| 4 | rules | Layout, canvas focus, selection `[]`, Delete and Ctrl+D | design unchanged; `available` false for both | unit, editor |
| 5 | rules | selection `[root]`, Delete and Ctrl+D | design unchanged; `available` false for both | unit, editor |
| 7 | rules | Outline workspace, canvas focus, selection `['a']`, Delete | design unchanged; `available` false | unit, editor |
| 7a | rules | Outline workspace, focus on a Tree row, selection `['a']`, Delete | `a` gone; selection `[]` | unit, editor |
| 7b | rules | Layout, canvas focus, selection `[]`, Ctrl+D | design unchanged; keydown `defaultPrevented` (a chord) | unit, editor |
| 8 | rules | one Delete press, row 1's state | exactly two invoke events, in settle order: `layout.deleteNode`, then `selection.deleteSelection` | unit, editor |
| 9 | production bugs | Layout, canvas focus, selection `['thumb-home']` among `thumb-home`, `thumb-far`, Ctrl+D | children `thumb-home`, `thumb-home-2`, `thumb-far`; selection `['thumb-home-2']`; keydown `defaultPrevented` | unit, editor |
| 10 | rules | `checkDeleteNode(design, [root])` | `root-required`, ids `[root]` | unit, model |
| 11 | rules | `checkDeleteNode(design, ['a', 'missing', 'gone'])` | `unknown-target`, ids `['missing', 'gone']` | unit, model |
| 12 | rules | `checkDeleteNode(design, [])`, and `['a']` | ok, ok | unit, model |
| 13 | rules | `checkDuplicateNode(design, root)`; `'missing'`; `'a'` | `root-required` `[root]`; `unknown-target` `['missing']`; ok | unit, model |
| 14 | rules | `checkAddNode` with a parent of 3 children: index 2, 3, 4 | ok, ok, `index-out-of-range` naming the parent | unit, model |
| 15 | rules | `checkAddNode`: missing parent; a slot as parent; a taken id | `unknown-target` naming it; `unknown-target` naming it; `id-taken` naming it | unit, model |
| 16 | rules | `checkDeletePart(design, defaultPart)`; another part | `default-part-required` naming it; ok | unit, model |
| 17 | rules | `nextSiblingId(layout, 'thumb-home')` with `thumb-home`, `thumb-far`; the last child; the root | `thumb-far`; none; none | unit, model |
| 18 | module boundaries | each of AddGroup, AddSlot, DeleteNode, DuplicateNode, DeletePart: `available(design, input)` | equals its check function's result for the same design and input | unit, commands |
| 19 | module boundaries | `runById('layout.deleteNode', { ids: [root] })` | `root-required`, nothing committed | unit, commands |
| 20 | rules | store `run` of a command whose check refuses, with input its schema refuses | `input-invalid` (parse before check) | unit, design |
| 21 | rules | store `run` of a command whose check returns a `stale` rejection | that rejection as it is; nothing committed | unit, design |
| 22 | rules | store `available(command, input)`: no design; schema refuses; check refuses; check ok | `unavailable`; `input-invalid`; the check's rejection; ok | unit, design |
| 23 | rules | store `available(action, input)`: schema refuses; check false; check true | `input-invalid`; `unavailable`; ok | unit, design |
| 24 | rules | `Invoke.available(command, input)`: schema refuses; check refuses; check ok; no design | true; false; true; false, with the builder not asked | unit, editor |
| 25 | rules | `Invoke.invoke(command)` whose check refuses with `root-required` | `root-required`, not `unavailable` | unit, editor |
| 26 | rules | `Invoke.invoke` of an action and a UiAction whose check says no | `unavailable`; the builder was asked first | unit, editor |
| 27 | rules | `Invoke.invoke(uiAction)` whose apply returns an err | that err | unit, editor |
| 28 | module boundaries | registry: hotkey of an unavailable entry pressed | the layer's handler answers false; the entry did not run | unit, editor |
| 29 | module boundaries | registry: hotkey of an available entry pressed | handler answers true; the entry ran once | unit, editor |
| 30 | rules | `HotkeyLayer`, plain key `Delete`, handler answering false; answering true | keydown not `defaultPrevented`; `defaultPrevented` | unit, ui (browser) |
| 30a | rules | `HotkeyLayer`, chord `mod+D`, handler answering false; chord `shift+F6` answering false | `defaultPrevented`; not `defaultPrevented` (Shift alone is no Ctrl or Meta chord) | unit, ui |
| 30b | rules | `HotkeyLayer`, `alt+ArrowLeft`, handler answering false | `defaultPrevented` | unit, ui |
| 30c | rules | `HotkeyLayer`, `mod+D` registered, keydown Ctrl with `key: 'e'`, `code: 'KeyD'` (Dvorak's Ctrl+E) | handler not called; not `defaultPrevented` | unit, ui |
| 31 | rules | `Landmarks.focusedPlace()`: focus inside the canvas root; inside the slide-out; on `body` | `canvas`; `slide-out`; none | unit, editor |

</frozen-after-approval>

## Code Map

- `packages/design/src/entries/types.ts:11-14` -- `Command.available(design)` → `available(design: Frozen<Design>, input: Input): Result<void, Rejection>`. `Action` keeps `available(current): boolean` (the spine changes commands only).
- `packages/design/src/store/design-store.ts:83-102,150-193` -- `available(handle)` boolean and `#runCommand`, which checks availability before parsing (`:155`). Copying the input first (`:152`) and the no-design throw (`#committed`, `:221-228`) stay.
- Every test class implementing `Command` or `UiAction` moves to the new signatures (`rg -l 'implements (Command|UiAction)' packages app`): `design-store.spec.ts`, `mirror-follows-the-store.spec.ts:29`, `register-command.types.spec.ts`, `design-store-run.types.spec.ts`, `workers/src/model-worker/model-worker-lifecycle.spec.ts:44`, `app/src/autosave/autosave.spec.ts:32`, `editor/src/devtools/devtools-plugin.spec.ts:44`, `shortcuts/{use-shortcuts,shortcut-registry}.spec.ts`, `invoke/{invoke,use-invoke}.spec.ts`, `register-ui-action.types.spec.ts`.
- `packages/design/src/store/design-store.spec.ts:415-438,677-760` -- the copy-before-check test still holds; the `available` describe moves to the Result form (rows 22–23); its test commands' `available()` gain the input and return `Result`; the rewritten rows (21–23, 26) write each expected rejection out as a literal in the test (`{ kind: 'stale', seq: 1, latest: 2 }`), compared with what the store or `Invoke` returns, not read back from the fake's configuration; the rule under test is that the rejection passes through unchanged.
- `packages/editor/src/invoke/invoke.ts:61-121` -- `available(handle)` with no input; `#invoke*` ask `available` before building input (`:89,101,107`), and `#invokeUiAction` drops apply's result (`:115-116`).
- `packages/editor/src/invoke/invoke.spec.ts:229-258` -- "refuses an action/UiAction its check says no to without asking its builder" encodes the old order; rewritten to row 26 (the requirement changed: the ticket's order builds before it checks).
- `packages/editor/src/ui-actions/types.ts:5-8` -- `UiAction.apply` → `AsyncResult<void, Rejection>`; the ten UiActions (`rg 'implements UiAction' packages/editor/src`) return `AsyncResult.ok()`.
- `packages/editor/src/shortcuts/shortcut-registry.ts:14-18,56-60` -- `Shortcut` keeps its `invoke` and gains the handle, so `#run` can ask `available` first. `#run` returns `boolean`.
- `packages/ui/src/hotkeys/hotkey-layer.ts:9-10,28-39` -- `onHotkey: (id) => void` → `boolean`; `event.preventDefault()` on `true`, or when the parsed hotkey (`hotkeys.parseHotkey(hotkey, platform)`, already called at `:29`) has `ctrl` or `meta`, or `alt` with an arrow key. The letter guard (`:36`) still returns first. Its private fields (`:9-10`) move below the public methods (AGENTS: "Order a class top-down").
- `packages/editor/src/landmarks/landmarks.ts:55-60` -- private `#focusedPlace()` gives an index and is renamed `#focusedIndex()`; the new public `focusedPlace(): Option<LandmarkPlace>` reads it, and F6 keeps using the index.
- `packages/editor/src/viewport/fit-viewport.ts:18-21` -- precedent for the workspace read (`this.#location.workspace.map((open) => open === 'layout').getOr(false)`).
- `packages/editor/src/selection/selection.ts:13-15,23-32` -- `select(ids)`; it prunes on commit, so the deleted id leaves the selection with no code here.
- `packages/model/src/layout-editing/{delete-node.ts:7-16,duplicate-node.ts:8-15,add-node.ts:14-29}`, `part-deletion/delete-part.ts:5-12` -- the read refusals move into check functions. `node-tree.ts:5` `findNode` takes `Mutable<Group>`; it gains a `Frozen<Group>` overload returning a frozen `Found`, used by the checks and `nextSiblingId`.
- `packages/model/src/main.ts` -- export the four check functions and `nextSiblingId`.
- `packages/commands/src/layout/layout-commands.spec.ts:36-113` -- the "forwards to its operation" table is the pattern for row 18, but its module-level `offset` (`:34`) is not copied: row 18 builds its values inside each case (AGENTS: "Keep no mutable state at module level in a spec"; deferred-work.md).
- `packages/editor/src/testing/{mount-shell.ts,press.ts}` -- `mountShell({ path, design })` and `pressKey({ key, code })`; `pressKey` dispatches on `document`, returns nothing, and `KeyPress` (`testing/types.ts:9`) has only `shift`. It gains `ctrl?: boolean` and returns the keydown event.
- `eslint.config.ts:297` -- the entry-parameters glob lists `{workspace,landmarks,slide-out,viewport}`; it gains `selection`.
- `packages/editor/src/editor-module.ts:184-193` -- `registerUiAction` calls.
- zag 'Delete' and 'mod+D' are valid (`validateHotkey` ran, no errors or warnings); `mod+D` parses to ctrl on Windows and Linux.

## Tasks & Acceptance

**Execution:**
- [x] Spine, on main first -- the `DeleteSelection` sentence covers the Tree tab on any workspace and the canvas on Layout, and so do the glossary's UiAction row ("`DeleteSelection` runs `DeleteNode` on the Layout canvas") and AD-26's "(EXPERIENCE.md: Delete acts on the selection only while the canvas has focus)"; the handled-answer sentence gains the Ctrl/Meta and Alt+arrow exception; "(the UiAction, then its command)" becomes "(its command, then the UiAction, each when it settles)". EXPERIENCE.md line 237 already names the Tree tab; its Delete row (line 255) gains `/ Backspace`.
- [x] `packages/model/src/layout-editing/{check-delete-node.ts,check-duplicate-node.ts,check-add-node.ts}`, `part-deletion/check-delete-part.ts` (function, each) -- `(design: Frozen<Design>, …input) => Result<void, Rejection>`, with the messages the operations use today. The operations call them first and return the error. Their refusal tests move into each check's spec (rows 10–16); the operations' specs keep the edits.
- [x] `packages/model/src/layout-editing/node-tree.ts` -- `findNode` gains its `Frozen<Group>` overload; `nextSiblingId(root: Frozen<Group>, id): Option<Id>` (function). Row 17.
- [x] `packages/design/src/entries/types.ts`, `store/design-store.ts` -- `Command.available(design, input)` returns a `Result`. Store `available(handle, input: unknown): Result<void, Rejection>`, in the order: unregistered throws, a command with no design is `unavailable`, parse (`input-invalid`), then the check (a command's own rejection; an action's `false` is `unavailable`). `#runCommand` keeps the copy and the no-design throw, then parse, check, apply. Update `register-command.types.spec.ts`, `design-store-run.types.spec.ts` and the spec's test commands. Rows 20–23.
- [x] `packages/commands/src/{layout/*.ts,parts/delete-part.ts}` -- each `available(design, input)` returns its check (AddGroup and AddSlot call `checkAddNode` with the input's parent, index and id). Rows 18–19 in `layout-commands.spec.ts` and `delete-part.spec.ts`.
- [x] `packages/editor/src/invoke/invoke.ts` -- `available(handle, input?)`. A command with no design open is false, without building input. Otherwise build the input (the caller's, else the builder's, else `{}`), then ask the store (commands and actions) or parse and ask the UiAction's `available()`. `input-invalid` answers true. `invoke` follows the same order and returns the store's result or the UiAction's apply result. Rows 24–27.
- [x] `packages/editor/src/ui-actions/types.ts` and the ten UiActions -- apply returns `AsyncResult<void, Rejection>`.
- [x] `packages/ui/src/hotkeys/hotkey-layer.ts` -- the handler returns `boolean`; prevent on `true`, and always for a chord whose parsed hotkey has `ctrl` or `meta`, or `alt` with an arrow. Rows 30–30c.
- [x] `packages/editor/src/shortcuts/{shortcut-registry.ts,types.ts}` -- `#run(id): boolean`: false when `invoke.available(handle)` is false, else `void invoke()` and true. Rows 28–29.
- [x] `packages/editor/src/landmarks/landmarks.ts` -- `focusedPlace(): Option<LandmarkPlace>`. Row 31.
- [x] `packages/editor/src/selection/{delete-selection.ts,duplicate-selection.ts}` (service, each; UiActions) -- `DeleteSelection`: id `selection.deleteSelection`, label `Delete`, hotkeys `['Delete', 'Backspace']`, `emptyInputSchema`. `DuplicateSelection`: id `selection.duplicateSelection`, label `Duplicate`, hotkeys `['mod+D']`, `emptyInputSchema`. Each has one private `#input(): Option<…Input>` (none with focus outside `canvas` and `slide-out`, with canvas focus off the Layout workspace, with nothing selected, and, for duplicate, unless exactly one id is selected). `available()` is `#input()` mapped through `invoke.available(Command, input)`, false on none. `apply` invokes the command with `#input()` (none: `unavailable` under its own id) and returns its result. On ok, `DuplicateSelection` selects `nextSiblingId` of the original in the committed design. Registered in `editor-module.ts`. Rows 1–9 (1a, 7a, 7b included; no row 6) in `delete-selection.spec.ts` and `duplicate-selection.spec.ts`, through `mountShell` and `pressKey`.
- [x] `packages/editor/src/testing/{press.ts,types.ts}` -- `KeyPress` gains `ctrl?: boolean`; `pressKey` returns the keydown event.
- [x] `eslint.config.ts` -- `selection` joins the entry-parameters glob.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row passes at its level.
- Given each browser group, when its toggled bug is applied, then its rows go red and pass once restored (named in the PR): the focus check dropped (3), the layer preventing on every match (3, 30), the chord exception dropped (7b, 30a, 30b), the empty-selection guard dropped (4), the workspace check dropped (7), the copy not selected (9).
- Given `pnpm --filter app dev` at `/?seed=corney` in Chromium and Firefox, when a key is clicked and Delete pressed, then it disappears from the canvas and the tree; Ctrl+D adds `<id>-2` after it, selected, and opens no bookmark dialog.

## Implementation Notes

- Decision (build): the store's `run` of an action parses before it checks, not checks first as before, because the store's `available(action, input)` parses first (row 23) and `run` must answer the same; the spec row "refuses an action that is unavailable, given input its schema refuses" now expects `input-invalid`.
- Decision (build): the store's `available` parses the caller's input as given, not a `structuredClone` copy as `run` does, because nothing is applied, so neither Immer nor the design sees it.
- Decision (build): `checkAddNode(design, id, at)`, not `(design, { parent, index, id })`, because it mirrors `addNode(design, node, at)`.
- Decision (build): `addNode` and `duplicateNode` throw `InvariantError` when the node their check accepted isn't found, not return silently, because that is a bug.
- Decision (build): each operation's spec keeps one refusal row ("returns its check's rejection, changing nothing"), not none, because returning the check's error untouched and leaving the draft is the operation's own part; the other refusal rows moved to the checks. The empty-parent index row (`index` 1 in a parent with no children) moved to `checkAddNode`'s spec, not dropped.
- Decision (build): the focus and workspace rule both UiActions share is one function, `selection/acts-on-selection.ts`, not a copy in each class.
- Decision (build): rows 18 and 22-type comparisons of two `Result`s go through a `settled` helper (a match to the plain value), not `toEqual` on the `Result`s, because a `Result` is iterable and Vitest's equality iterates an `Err` past its first yield and throws.
- Decision (build): row 8 waits with `expect.poll` for the two events, not a fixed tick count, because the UiAction's event comes on a later microtask than the command's.
- Toggled bugs (chromium): focus check dropped -> row 3 red; layer preventing every match -> rows 3, 30 (and the shift+F6 row) red; chord exception dropped -> 7b, 30a, 30b red; empty-selection guard dropped -> row 4 red; workspace check dropped -> row 7 red; copy not selected -> row 9 red. Each restored and green.

- Real-host run (2026-11-11): Playwright 1.64.1's trusted `mouse.click` and `keyboard.press` against `vite --port 5199`, `/?seed=corney`, in Chromium and Firefox (script: scratchpad `real-host.cjs`), checking the specs' synthetic `KeyboardEvent`s against real ones. Both browsers: clicking `outer-bottom` focuses `MAIN[Canvas]` (the canvas landmark, so canvas focus needs no extra step) and presses it; Ctrl+D 3 → 4 slots, `outer-bottom-2` pressed, keydown prevented; Delete 4 → 3, selection empty, prevented; Ctrl+D with nothing selected changes nothing and is prevented; with focus on `HEADER[Top bar]` Delete changes nothing and is not prevented; Backspace on the canvas deletes (prevented); T, click the Tree row `outer`, Delete removes the group and its two slots (prevented), and focus falls to `BODY`; no console errors. The browser's own bookmark dialog is browser chrome no page script sees, so it stays Sergii's look.

- Decision (Sergii 2026-11-11, at the look): the devtools invocations timeline titles each event with its handle id (`layout.deleteNode`, `selection.deleteSelection`), not its label, with the label moved into the event data; not label plus id (longer rows) and not renaming the UiActions' labels (user-facing, EXPERIENCE.md names them Delete and Duplicate), because both rows read `Delete` and only a click told them apart. The spine's "never shown" for a command id gains "(outside the dev-only devtools)" (docs, on main).

## Plan Change Log

## Review Triage Log

Pass 1 (2026-11-11; lenses quick, test-reviewer; 0 quotes dropped). Verdicts: high 0, medium 2, low 12, false 0, maybe-false 0; 3 rejected.
- medium, patch -- quick: `add-node.spec.ts` lost the "a design part's id" (`'key'`) `id-taken` row and `check-add-node.spec.ts` tests only a node id (git diff shows the row deleted), so nothing proves `itemIds` counts design parts. Fix: add that row to `checkAddNode`'s spec.
- medium, patch -- test-reviewer 1: `hotkey-layer.spec.ts:112` row "a Ctrl or Meta chord" presses only `ctrlKey`; the `parsed.meta` branch has no test (row 30a says Ctrl or Meta). Fix: a `meta+D` row pressed with `metaKey`.
- low, patch -- quick + test-reviewer 6: `settled` written twice (`layout-commands.spec.ts`, `delete-part.spec.ts`), against "Write a shared assertion once". Fix: one testing helper.
- low, patch -- quick: row 18 has only refusal cases for the four layout commands. Fix: one accepted case each.
- low, patch -- quick: `duplicate-selection.spec.ts:25` focuses the canvas inside `arrange` (hidden step). Fix: focus in each test, as `delete-selection.spec.ts` does.
- low, patch -- quick: row 8's `expect.poll` passes before a late third event. Fix: assert the whole list again after the poll settles.
- low, patch -- quick: `shortcut-registry.spec.ts:234` binds its test entry to `Delete`, which `DeleteSelection` also binds in the real `editorModule`. Fix: a key no production entry uses.
- low, patch -- quick: `restart-model-worker.spec.ts`, `design-store.spec.ts` narrow with `.isOk()`. Fix: assert the whole `Result`.
- low, patch -- quick: comments restating code (`landmarks.ts` focusedPlace, `delete-selection.spec.ts` "Only b is left"). Fix: delete.
- low, patch -- test-reviewer 2: two `invoke.spec.ts` names claim "so invoke reports it" with no such `expect`. Fix: drop the clause.
- low, patch -- test-reviewer 4: Ctrl+D rows 4 and 5 sit in `delete-selection.spec.ts`. Fix: move the Ctrl+D half to `duplicate-selection.spec.ts`.
- low, patch -- test-reviewer 5: module-level `WITHOUT_A` in `delete-selection.spec.ts`. Fix: build it in the test.
- low, patch -- test-reviewer 6: `delete-part.spec.ts` relies on `aBlueprintDesignPart()` defaulting to `meta.defaultPart`'s `'key'`. Fix: write the ids out.
- low, rejected -- test-reviewer 3: the layer's prevent-iff-ran rows repeat the handler's answer because that pass-through is the rule under test (row 30); naming is clear.
- low, rejected -- test-reviewer 7: the `UiActionHandle` cast in an events table is correct at runtime; untangling the overload typing adds complexity for a test-only cast.
- low, rejected -- test-reviewer 8: refusal order in `checkDeleteNode` and `checkAddNode` is carried over from the operations unchanged; its fix edits this plan, so it is listed among the decisions at the look instead.

Pass 2 (2026-11-11; diff since pass 1; lenses quick, test-reviewer; 0 quotes dropped). Verdicts: high 0, medium 0, low 6, false 0, maybe-false 0. Nothing above low and no frozen row broken, so the loop ends; these lows are logged, not patched.
- low, logged -- quick: `design-store.spec.ts:844-851` still narrows (`expectErr(before)` then `before.error`) where `restart-model-worker.spec.ts` now compares the whole value through `settled`.
- low, logged -- quick: `commands/src/testing/settled.ts` is private to `commands` (exports only `.`), so `design` and `editor` (`invoke.spec.ts:619`) keep their own `match`; its natural home is `@keeb-cad/result/testing` beside `expectOk`.
- low, logged -- quick + test-reviewer: row 8's re-assert after `expect.poll` waits one real-timer macrotask (`setTimeout(settle, 0)`), the repo's only real-timer sleep in a spec; it catches a same-tick third event only.
- low, logged -- quick: `duplicate-selection.spec.ts:50-77` asserts "children unchanged with nothing selected" in two tests (rows 4 and 7b could share one whole-value assert).
- low, fixed -- quick: the plan held an empty duplicate `## Review Triage Log` heading (a logging slip, not code); merged.

Pass 3 (2026-11-11; Sergii's post-look timeline change, `devtools-plugin.ts` and its spec; lenses quick, test-reviewer; 0 quotes dropped). Verdicts: high 0, medium 0, low 1. Test-reviewer: checked 1 test, no findings.
- low, defer -- quick: `devtools-plugin.spec.ts` covers only an accepted invocation; the refused branch of `#addInvocation`/`#outcome` (`devtools-plugin.ts:109-131`: subtitle the rejection's kind or `'error'`, `data.result` the error) has no row. Pre-existing gap, not caused by the title change.

## Design Notes

- Decision (plan): every command's read refusals move into check functions, AddGroup's, AddSlot's and DeletePart's too, not only DeleteNode's and DuplicateNode's. The spine says "a refusal decidable by reading the design and the input, such as DeleteNode's `root-required` and `unknown-target`, lives in one `model` check function that both call" (AD-2), and "such as" makes those two examples, not the whole list.
- Decision (plan): the store's availability returns `Result<void, Rejection>`, not a boolean, so `Invoke` can tell a parse failure (true) from a refusal (false). Rejected: `Invoke` parsing and resolving the command itself, because the spine gives the store "the one lazy resolution" of an entry's instance "to read its availability or to run it" (AD-2).
- Decision (plan): the UiActions live in `selection/`, not `workspace/layout/`, because they act on the selection from the canvas and from the Tree, and the spine calls them "a selection operation".
- Decision (plan): the copy is found with `nextSiblingId` in `model` after the commit, not by predicting its id in `editor`, because the ticket defines the copy as "the node DuplicateNode inserts right after the original" and numbering is `model`'s rule (`copy-id.ts`).
- Decision (plan): row 8 expects the command's event before the UiAction's, not the reverse. `Invoke` reports each call when its result settles (`invoke.ts:137-144`; spec "reports an action once, only after it settles"). The UiAction's result is the command's, and the command's handler is registered first, so it fires first.
- Decision (plan): `pressKey` gains a `ctrl` flag, not a `mod` flag, because the browser tests run on Linux, where zag parses `mod+D` as Ctrl (`parseHotkey('mod+D', 'windows')` → `ctrl: true`, run 2026-11-11).
- Decision (plan): the checks reuse `findNode` through a `Frozen` overload, not a second walk, because "Functions take `Frozen<…>` parameters by default" (spine AD-2) and one walk keeps the checks and the operations finding the same node.
- Decision (plan): a chord the letter guard drops is not prevented, not prevented as a chord, because the user typed another chord (Ctrl+E on Dvorak, row 30c), which isn't ours.
- Decision (plan): the layer keeps zag's `preventDefault: false` and prevents by hand, not zag's own `preventDefault` option (`@zag-js/hotkeys` `types.d.ts:115-118`, "Whether to prevent the default browser behavior"), because zag would prevent before the letter guard and the handled answer (`hotkey-layer.ts:33`).
- Decision (plan): labels `Delete` and `Duplicate`, not new wording, because EXPERIENCE.md's Shortcuts table names them so (lines 255–256).
- Decision (plan): `apply` with no input (state changed since `available`) returns `unavailable` under the UiAction's own id, not a throw, because the spine says an entry that lacks its selection "is unavailable, never run and refused".
- Decision (plan): when `nextSiblingId` finds none after an ok DuplicateNode, `DuplicateSelection` throws `InvariantError`, not leaving or clearing the selection, because the spine says DuplicateNode "inserts the copy after the original", so a missing copy is a bug that must surface (as `nodeIdOf` throws, 13.7).
- Decision (plan): `Shortcut` gains its handle, not a second map from id to handle, so `#run` asks `available` of the entry it will run.
- Decision (plan): rows 1–9 are `editor` units, not `app` integration, because the rule they test (which key does what, by focus, workspace and selection) is defined in `editor`'s UiActions (AGENTS: "Test a rule where it is defined"), as 13.7 rows 15–17 ran through the real store in `editor`.
- Saved work (rows 1, 1a, 2, 7a): the deleted nodes stay in the autosaved revision before the delete (spine AD-13: "**Rolling:** the last 20 autosaved revisions (`autosave`)"), but no UI reaches it until undo (14.1) or a version-opening story.
- Decision (plan): rows 1–9 run through `mountShell` and real keydowns, not through calling `apply`, because the ticket's claims are about a key press (prevented or not) and the hotkey layer is part of the path.

## Conformance Log

Pass 1 (two readers; 0 findings dropped for a missing quote):
- Spine AD-26 "one key press reports twice (the UiAction, then its command)" vs row 8 -- asked (settle order; spine edit added).
- Spine AD-26 "Alt+arrow and every Ctrl chord call `preventDefault`" -- asked (Alt+arrow joins the exception; row 30b).
- AGENTS "A choice no requirement made is a decision and is labelled as one." (`findNode` or-choice, `pressKey` modifiers, `Shortcut` handle, apply with no input, labels, DuplicateSelection's schema) -- fixed.
- Spine glossary UiAction row and AD-26 "(EXPERIENCE.md: Delete acts on the selection only while the canvas has focus)" left stale -- fixed (spine task lists them).
- AGENTS "Name a thing for what it does" (`#focusedPlace` returning an index) -- fixed (`#focusedIndex`).
- AGENTS "Test calculations as units in the package that owns them" (rows 1–9 level) -- fixed (Decision (plan)).
- AGENTS "Order a class top-down" (`hotkey-layer.ts:9-10`) -- fixed (moved when edited).
- AGENTS "Keep no mutable state at module level in a spec" (`layout-commands.spec.ts:34`) -- deferred.
- AGENTS "When a decision departs from a Stack dependency's documented setup, that documented setup is its Y" (zag `preventDefault`) -- fixed.
- Test-reviewer check 2 (configured value vs result, `design-store.spec.ts:677-760`, `invoke.spec.ts:229-258`) -- fixed (literal expectations).
- AGENTS "Give every threshold three rows" (Ctrl+D above one) -- asked (no multi-selection rows until 15.4).
- Tree rationale "the focused row is what they act on" vs Reka's separate focus and selection -- fixed (wording).
- Letter guard vs chord prevention -- fixed (row 30c, Decision (plan)).
- Check 6, rows 1, 2, 7a -- fixed (saved-work note: AD-13 rolling versions).
- gap: every `Command`/`UiAction` test class (`mirror-follows-the-store.spec.ts:29`, `model-worker-lifecycle.spec.ts:44`, `autosave.spec.ts:32`, `devtools-plugin.spec.ts:44`, `use-shortcuts.spec.ts:35`, `use-invoke.spec.ts:31`, `shortcut-registry.spec.ts`, `invoke.spec.ts`) -- fixed.
- gap: `pressKey` (`testing/press.ts`, `testing/types.ts:9`) can't press Ctrl -- fixed.
- gap: Alt+arrow future nudge users -- asked (included).
- gap: Ctrl+D two selected via `selection-inspectable.ts` -- asked (not reachable by Sergii's decision).
- gap: root selected has no Tree row (`use-layout-tree.ts:7`) -- fixed (manual check uses the devtools field).

Final pass (one reader):
- AGENTS "Arrange only a state real commands could reach" (rows 1b, 6, 7c, devtools-only) -- asked (rows dropped).
- Test-reviewer check 2 (rewritten rows keep the configured-value shape) -- fixed.
- Persistent fact "cites the file and line it read" (`design-store.ts`, `TreeSlideOut.vue`, `duplicate-node.ts`, `delete-part.ts`, `node-tree.ts` cites) -- fixed.
- AGENTS "A choice no requirement made is a decision" (`nextSiblingId` none) -- fixed.
- Check 6 note: no saved copy when the pre-delete autosave failed -- asked (left out).

## Verification

**Commands:**
- `pnpm test` -- expected: all pass, no type errors.
- `pnpm depcruise` -- expected: no violations.
- `pnpm lint` -- expected: clean.

**Manual checks:**
- `pnpm --filter app dev`, open `/?seed=corney`: click a key, press Delete, and it disappears from the canvas and the tree. Open the tree (T), select a row, press Delete. Click the top bar, press Delete: nothing changes. With nothing selected, and with the root set as the Selection's ids in the devtools inspector (the tree has no root row, `use-layout-tree.ts:7`), Delete and Ctrl+D change nothing; Ctrl+D with nothing selected opens no bookmark dialog. Ctrl+D on a key adds `<id>-2` after it and selects it, with no bookmark dialog, in Chromium and Firefox. The devtools timeline shows `layout.deleteNode` then `selection.deleteSelection` for one key press.
