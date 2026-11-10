# Adversary and reality review: 13.24 amendment (2026-11-10)

Scope: diff `spine-13-24.diff` (UiAction row, shortcut registry, invoke path, input builder, Commands and actions row, Shortcuts rule, Editor state row) and the last 13 `.memlog.md` entries. Read against `packages/editor/src/{invoke,ui-actions,landmarks,shortcuts}`, `packages/ui/src/hotkeys/hotkey-layer.ts`, `packages/design/src/store/design-store.ts`, `packages/commands/src/layout/`, `packages/model/src/layout-editing/`, `@zag-js/hotkeys@1.47.0` `store.mjs`, and EXPERIENCE.md.

Verdict: the routing idea holds, but the amendment leaves the hotkey layer, focus, ownership of a key and listing of routed commands unspecified, so two stories that follow it to the letter will still collide.

## Lens 1: pairs that obey every amended rule and still collide

### A1 (High): the hotkey layer swallows the key before availability is asked

Spine: `the hotkey layer stays global, and each UiAction decides whether focus matters`.
Code: `hotkey-layer.ts` runs `event.preventDefault()` for every matched hotkey, then `onHotkey(id)`; `ShortcutRegistry.#run` drops the refusal. Nothing consults `available` first.
Pair: 13.24's DeleteSelection (unavailable outside the canvas, correct) and a later nudge UiAction on `ArrowLeft`/`Shift+ArrowLeft`. Both obey the rule. Nudge is "unavailable" when the inspector, a Reka listbox, menu, tabs or slider has focus, yet the layer already called `preventDefault`, so arrow navigation in every other region is dead. `enableOnFormTags: false` only exempts inputs, not Reka's div-based widgets. Same for `mod+d` (Duplicate) which eats the browser default everywhere.
Fix: add to the Shortcuts rule: the layer calls `preventDefault` only when the registry reports the handle available (`invoke.available(handle)`), else the keystroke passes through untouched.

### A2 (High): focus is read from `Landmarks`, which every pointer invoker defeats

Spine: `Which region holds focus is read from `Landmarks`` and `A palette, which takes focus when it opens, asks against the region focused before it opened (palette story).`
Pair: 13.24's DeleteSelection (needs canvas focus) and a top-bar menu item, a toolbar button, a context-menu item or 14.5's Inspector "Delete" button. Clicking any of them moves focus into the top bar, the menu or the inspector, so DeleteSelection is unavailable for the exact invoker the glossary lists (`hotkey, click, gesture, menu, palette`). Only the palette is mentioned. `Landmarks.#focusedPlace` is also a plain `document.activeElement` read, not reactive, so a `computed(() => available(...))` for a menu item goes stale when focus moves; and Reka portals (menus, dialogs) sit outside every landmark root, so the answer is "none".
The two units then diverge: the menu author calls `invoke(DeleteNode, { ids })` directly (explicit input, allowed), the hotkey author goes through DeleteSelection. Two paths, two availability answers for one operation.
Fix: pick one rule and state it. Preferred: focus-dependent availability applies to the keyboard route only; every pointer invoker either passes explicit input to a command or asks with a `focusOrigin` argument. Alternatively give `Landmarks` a reactive `lastCanvasFocus`/`regionBeforeOverlay` that all askers (menu, palette, button) use; say it is reactive.

### A3 (High): two owners of one key (Delete, Ctrl+D)

Spine: `A selection operation (Delete, Duplicate, later nudge, rotate, P) is a UiAction, not a command with a hotkey` and, in the shortcut registry row, `two handles sharing a hotkey is left to review`.
Reality: zag 1.47.0 `store.mjs` `detectConflicts` defaults to `warn`; `handleKeyDown` then executes every match at the highest priority (`toExecute = matches.filter(...)`), so two handles on `Delete` both fire. EXPERIENCE.md line 255 gives Delete five meanings by focus (canvas selection, layer tab, parameter row, track, part) and Ctrl+D two.
Pair: the layout story's `DeleteSelection` and the keymap story's `DeleteLayer` (or a Parameters `DeleteParameter`), each a UiAction owning `Delete`, each correct per the rules. Or the other reading: one `DeleteSelection` that every story edits (two owners of one class, `available()` growing a switch). The amendment's text ("routes to the command that fits ... a layer, a row, a track elsewhere") hints at the second but the spine row does not say which.
Fix: add a rule: one UiAction owns a chord; the registry refuses at startup a hotkey two handles declare (not left to review); a UiAction that spans regions owns a routing table keyed by focused place, each row contributed by its story as data (`routes: { canvas: DeleteNode…, 'slide-out': … }`), so a story adds a row, not a class.

### A4 (High): routed commands stay listed, and `available` answers `true` for them

Spine: `Menus and shortcuts see both.` (Commands row) and `A parse failure answers `true` from `available` and `input-invalid` from `invoke``.
Pair: the palette story lists all registered handles. `DeleteNode` (label `Delete`, no input builder, because 13.24 says builders are not the router) and `DeleteSelection` (label `Delete`) both appear. For `DeleteNode`, `available(DeleteNode)` builds `{}`, parses against `{ ids: [...] }`, fails, and per the new rule answers `true`. A click then yields `input-invalid`. The same happens to every command with a required input and no builder, i.e. all of them today (`available(handle)` currently ignores input; the order change makes the empty-builder case look enabled). 14.5's Inspector, which lists commands for its own menu, repeats it.
Fix: say which entries a menu or the palette lists: a handle is listed only if invocable with no caller input (it has a builder, a schema accepting `{}`, or is a UiAction), and a command a UiAction routes to is registered as routed (`registerUiAction(..., { routes: [DeleteNode] })`) and excluded. Or restrict "parse failure answers true" to input a builder produced, and answer `false` for the no-builder, no-input case.

### A5 (Medium): refusals are reported twice, and nothing says who tells the user

Spine: `so one key press reports twice (the UiAction, then its command) and the command's refusal reaches the caller`.
Pair: the toast/notice story subscribes to `Invoke.events` (the devtools timeline already does) and shows one notice per refused event. DeleteSelection's refusal is the same `Rejection` as the inner DeleteNode's; the user gets two toasts. The other story reads the returned result at the registry (`#run` today drops it) and shows one. Both follow the spine.
Fix: add: user-facing notices are raised from the outermost caller's returned result, never from `events`; the event carries the invoking parent (`via: 'layout.deleteSelection'`) so consumers can drop nested duplicates.

### A6 (Medium): `available()` and `apply` each derive the routed input

Spine: `then asks `available(command, input)` with the exact input its `apply` will pass`.
Nothing makes the two derivations one. Pair: two authors write DuplicateSelection. One computes `{ id: selection[0] }` in `available()` and `{ id: selection.at(-1) }` in `apply`, or one treats a multi-selection as unavailable and the other duplicates the first. `DuplicateNode` takes a single `id`; `DeleteNode` takes `ids`; the selection is `Id[]`. The spine says nothing about arity, order, an empty selection reaching the command (`{ ids: [] }` is `available` true and a silent no-op, `design-store.ts` empty-patches path), or an ancestor and its descendant both selected. The memlog rejected a declared arity (option C) but gave no replacement.
Also, `DuplicateNode.apply` makes the copy's id inside the draft (`copyId`), and returns `void`, so a DuplicateSelection cannot select the copy; the spine does not say who writes selection after a command.
Fix: add: a routing UiAction computes its command and input in one private method that both `available()` and `apply` call; state per operation the arity (Duplicate: exactly one selected, else unavailable) and that the selection is changed only through the selection service by the UiAction after a successful result; a command that creates nodes reports their ids if a UiAction needs them (or the story decides the copy is not selected).

### A7 (Medium): building input before availability runs builders with no design open

Spine: `parses it (a failure is `input-invalid`), then checks availability (a refusal is `unavailable`)` and `a command with no design open is `unavailable``.
Reality: `invoke.ts` today checks availability first, and its comment says why ("keeps the builder from running for an action that can't"); `invoke.spec.ts` line 317 asserts the builder is not asked with no design. The new order makes `available(handle)` run the builder on every call; a builder that reads the design (14.5 Inspector: "the selected slot's width") throws `InvariantError` when nothing is committed. Also `available` is now called per render per menu item, so a builder with a side effect (allocating an id) misbehaves. Two units: a builder reading `useDesignStore().current` unguarded, vs the path calling it first.
Fix: state the full order: (1) no design open means `unavailable` for commands, before any input work; (2) build; (3) parse; (4) availability. State that `input()` is pure and total.

### A8 (Medium): selection pruning order and second writer

Spine: `After each commit it drops every id the design no longer holds, from the design store's commit event`.
Reality: `design-store.ts` writes `#current` then emits `commit` synchronously; the `patches` event carries no design, so the listener reads `store.current`. `nanoevents` runs listeners in subscription order with no try/catch. Any commit subscriber registered before the selection service (canvas, devtools, pipeline poster, a nudge-burst preview) sees stale ids; a throwing subscriber stops the prune. The commit event on undo/redo is also unconfirmed: `packages/design/src` has no undo code, so `undo` emitting `commit` is a promise, not a fact (see B).
Pair: 13.7's selection service (prunes) and a canvas component that reads the selection in its own commit handler to scroll to it.
Fix: add: the selection service subscribes first (a constructor in `editor`'s module order is not enough; make the design store notify through a dedicated ordered hook, or state that no listener reads selection from a commit event).

### A9 (Low): `available` and `UiAction.available()` signatures do not carry input

Spine: `available(handle, input?)` and `a UiAction's own check`. `UiAction.available()` and `Action.available(current)` take no input, so `invoke.available(Nudge, { dx: 0 })` silently ignores `input`. Say that input matters only to a command's check.

### A10 (Low): the check function can't be shared as typed

Spine: `lives in one `model` check function that both call`. `model/src/layout-editing/node-tree.ts` `findNode` takes `Mutable<Group>`; `Command.available` gets `Frozen<Design>`. Either the helper is widened to read-only types or the check casts. Also refusals found only after apply (`checkStructure` in the store) stay outside the check, so `so availability and apply can't disagree` holds only for read-decidable refusals; say so.

## Lens 2: reality check

| Claim | Result |
|---|---|
| Empty patches commit nothing (`an empty DeleteNode writes nothing`) | Confirmed: `design-store.ts` `if (patches.length === 0) return Result.ok()` before `#write`. |
| Store emits `commit` after `#write` | Confirmed: `current` is updated before `emit`, both `patches` and `whole` kinds. |
| `Landmarks` owns regions and computes the focused place for F6 | Confirmed, but `#focusedPlace` is private, returns an index, includes `left-rail` (not a `LandmarkName`), and is not reactive. The amended "exposes the focused place" needs a new public read; unspecified type. |
| `DeleteNode` refusals (`root-required`, `unknown-target`) run before any mutation | Confirmed: `model/.../delete-node.ts` checks first. `DuplicateNode` has the same two. |
| Today's order: availability before input (`invoke.ts:89-90`, `design-store.ts:155-159`) | Confirmed; the amendment inverts a behaviour `invoke.spec.ts` (~line 317) pins. |
| zag: one hotkey on two ids is allowed | Confirmed and worse than "left to review": default `conflictBehavior: "warn"`, and all highest-priority matches execute (`store.mjs`). |
| `HotkeyLayer` global with `enableOnFormTags:false` | Confirmed; it also calls `event.preventDefault()` before any availability check (A1). |
| memlog "zag's one store per document" | Not confirmed: `createHotkeyStore({ target })` makes a store per call; `HotkeyLayer` creates one per `listen`. |
| Undo/redo emit `commit` ("so undo and redo show too", selection pruning after undo) | Not confirmed: no undo implementation exists in `packages/design/src`. |
| Immer behaviour | The amendment adds no new Immer claim; the empty-patches rule is unchanged and consistent with the code. |
| UiAction `apply` returning `AsyncResult<void, Rejection>` | Not yet code: `ui-actions/types.ts` has `apply(input): void`, `invoke.ts` wraps it with `AsyncResult.ok()`; no UiAction is registered, so no consumer verifies the shape. |
| Selection service (`Id[]`, pruning) | Does not exist in `packages/editor/src` (13.7). Pure design claim. |

## Rules to add or tighten, in priority order

1. Shortcuts: `preventDefault` only for an available handle (A1).
2. One chord, one owning UiAction; registry refuses shared hotkeys; cross-region ops use a routing table (A3).
3. One pointer/keyboard focus rule with a reactive source (A2).
4. What a menu/palette lists; routed commands excluded; fix `available`-true-on-parse-failure for builder-less commands (A4).
5. Full invoke order with the no-design check first; builders pure and total (A7).
6. One derivation of routed input per UiAction, plus per-operation arity and who sets selection afterwards (A6).
7. Notices from the outermost result, events carry the parent (A5).
8. Selection prune ordering (A8).
