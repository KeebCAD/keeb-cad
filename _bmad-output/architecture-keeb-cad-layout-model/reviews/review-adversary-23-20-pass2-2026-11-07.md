# Adversary review, pass 2: invoke path, composables, inspectables, timeline (23.20), 2026-11-07

Scope: only the sentences added after `review-adversary-23-20-2026-11-07.md`, which are:

- the UI-wide invoke path: AD-2's `invoke(AddKey)` sentence, AD-10's `editor` row, AD-26's "Every invocation from the UI (hotkey, click, gesture, menu, palette)", and the glossary's **invoke path**;
- the Editor state row's purpose-specific composables that never return a service instance;
- the `inspectables` multi token and the glossary's **inspectable**;
- the two-layer timeline (an event `Invoke` emits per call, and the design store's commit event).

Context read: the uncommitted spine diff, the first review, `packages/editor/src/**`, `packages/design/src/store/{design-store,types}.ts`, `app/src/launch/launch.ts`, `app/src/start-main.ts`, `packages/di/src/types.ts`, `packages/ui/src/index.ts`, `eslint.config.ts`.

Lens: build two units, one level down, that each obey every sentence to the letter and still come out incompatible. Each pair is a hole, with the sentence that would close it.

**Verdict:** the first review's F1 (a second way to invoke) and F4/F5 (inspector and timeline hooks) are closed in intent. But the invoke path now has to carry clicks and gestures, and it has no way to take the input a gesture carries. AD-2 still sends availability reads to the store, which has no availability query and no UiActions. The "never a service instance" rule can be met by a bag of bound writer functions. The inspectables' `edit` and production footprint are undefined. And the timeline's launch promise races the dynamic import.

---

## P1 (high): the invoke path takes no input, but clicks and gestures carry it

**What the spine now says.** Glossary **invoke path**: "from the UI (hotkey, click, gesture, menu, palette): it takes the input from the handle's input builder, or `{}`". AD-26 says the same. AD-2's example is `invoke(AddKey)`, with one argument. The code agrees: `Invoke.invoke(handle)` has no input parameter (`packages/editor/src/invoke/invoke.ts:25-28`), and `#inputFor` returns the builder's `input()` or `{}` (`invoke.ts:49-52`). The glossary's **input builder** reads only "UI state (selection, focused group)".

**Pair.** Two stories need input that is not UI state:

- Story A, drag a key (`layout.moveSlot`, which needs a slot id and a delta) on drop, writes the drop delta into the drag-preview service (the Editor state row's "preview position of a drag") and registers a `MoveSlotInputBuilder` that reads it. It then calls `invoke(MoveSlot)`.
- Story B, an expression field that commits `setParameter` on blur (AD-2's own example), adds an overload `invoke(handle, input)` to `Invoke`. The typed text is not UI state, so Story B passes it straight through.

Both stories obey every sentence. A's way needs a service that holds a transient value for one call. B's way gives `Invoke` a second input source, and nothing says which one wins when a builder is also registered. A context-menu "Delete this key" on an unselected key splits the same way. One story selects the key first (a side effect on the selection), and the other passes `{ id }`. If neither does anything, the click runs with `{}`, the schema refuses it, and the user gets `input-invalid` (`invoke.ts:58`).

**Close with** one of:

- "`invoke(handle, input?)`: a caller that has the input from the event (a drop delta, a field's text, the clicked item's id) passes it as `v.InferInput` of the handle's schema. The input builder runs only when it is omitted, and registering a builder for a handle that a caller also passes input to is a review finding."
- or "`invoke` never takes input. Gesture data is first written to a UI-state service (the drag preview, the field draft) and read by that handle's input builder."

Record the rejected option either way. The first is cheaper and keeps transient values out of services. The second keeps one input source.

## P2 (high): AD-2 still reads availability "from the store", which cannot give it

**Sentence.** AD-2, in the edited sentence: "hotkeys, clicks, gestures, menus, the palette and undo use handles, and read labels and availability from the store."

**Contradictions.**

1. `DesignStore` has no public availability query. Its public surface is `current`, `run`, `replaceDesign`, `acceptDerivedFiles` and `events` (`packages/design/src/store/design-store.ts:40-115`). Availability is checked only inside `#runCommand` and `#runAction`.
2. UiActions are "never in the design store" (glossary **UiAction**), so a menu or palette cannot read their availability "from the store".
3. The rule "a command with no design open is `unavailable`" lives in `Invoke` (`invoke.ts:54-59`, glossary **invoke path**). A store-side query would either throw (`#committed()`, `design-store.ts:186-191`) or need its own copy of that rule.

**Pair.** Story A (the palette) adds `DesignStore.available(handle)` to `design`, following AD-2's words, and handles UiActions separately. Story B (a menu) adds `Invoke.available(handle)` over all three kinds, following the glossary's "one way". The palette and the menu then disagree on a command when no design is open, or the palette throws.

**Close with:** "`editor` reads availability through its invoke path (`available(handle)`, the same checks `invoke` runs before applying, including no design open → unavailable) and labels from the handle's static `label`; the store exposes no availability query." Also fix "undo use handles": undo and redo are store methods (glossary, AD-2 "Writing"), not entries. Either name the handle that a Ctrl+Z hotkey runs (an action in `commands`, `design.undo`), or say how undo reaches the invoke path. Otherwise the shortcut registry, which feeds only handles (AD-26), has nothing to bind Ctrl+Z to.

## P3 (high): "never a service instance" is met by a bag of bound writers

**Sentence.** Editor state row: "A composable returns what one use needs, values, computeds or functions (`useOpenDesign()`, `useInvoke()`), never a service instance; a service may have several".

**Pair.** Story A writes `useInvoke()` and returns `invoke`. Story B (an "Open file" button) writes `useDesignWrites()` in `editor/src/load/` and returns `{ replaceDesign: (b) => store.replaceDesign(b), run: (h, i) => store.run(h, i) }`. That is functions only: no service instance, no token argument, and it sits in a concept folder. Every sentence holds, and B is the first review's F1 again: a second way to invoke that skips the input builder and the no-design refusal, plus direct access to `replaceDesign`, one of AD-2's two writers. AD-26's "every invocation from the UI goes through one invoke path" forbids the *use*. The composable rule, which is the only thing lint backs, allows the *door*.

**Close with:** "Only `useInvoke()` returns a function that runs an entry. No composable returns a function that calls `DesignStore.run`, `replaceDesign`, `acceptDerivedFiles` or (later) `undo`/`redo`; a component writes the design only through `useInvoke()`." This is a review rule, since lint cannot see what a closure calls. A spec could instead list every composable's return shape.

## P4 (medium): two composables over one service, and "its concept's folder" is ambiguous

The first review's F2, pairs 1 and 4, is now partly sanctioned rather than closed.

**Pair.** "A service may have several", so Story A writes `useOpenDesign()` returning `computed(() => store.current)` (an `Option<Committed>`), and Story B writes `useCurrentDesign()` returning `computed(() => store.current.getOrUndefined()?.design)`. Both are "what one use needs". Components then test absence in two ways, and a reader can't tell which composable to reuse. On placement, "each lives in its concept's folder" doesn't say whose concept. `DesignStore`'s folder is in `design`, so Story A creates `editor/src/design/use-open-design.ts` and Story B creates `editor/src/open-design/use-open-design.ts`.

**Close with:** "Before adding a composable, reuse one that already returns what the use needs; two composables never return the same view. A composable lives in the `editor` folder of the concept its name says (`useOpenDesign` → `editor/src/open-design/`)." Separately, the first review's F8 (a composable holding its own state, as `ui`'s `useThemeChoice` does through `useStorage`) is still not addressed by the new text.

## P5 (medium): `inspectables`' `edit` has no defined write path, and the token ships in production

**Sentences.** Glossary **inspectable**: "`{ id, label, state(), edit?(key, value) }`... a `state()` read over the service's public API". Editor state row: "`editor`'s modules register [them] over each shown service's public API; only `editor`'s UI-state services take `edit`".

**Pair 1, the write path.** Story A's `PanelsState` exposes a public setter `set open(value)`, so its `edit` assigns through it. Story B's `Selection` exposes only `select(ids)` and `clear()`, which UiActions call, so its `edit('ids', value)` calls `select(value as Id[])` without checking. A devtools edit can then put a key id that does not exist into the selection. That is a state no real UiAction could reach, and the input builders that read selection (P1) are not written to handle it. Nothing says whether `edit` goes through the UiAction (its availability check and input schema) or around it, or what `key` ranges over.

**Pair 2, production footprint.** "Dev-only inspector" plus "`editor`'s modules register" invites two readings:

- Story A registers inspectables in `editorModule`, which runs in production (`app/src/main-modules.ts`). The `state()`/`edit()` closures and their labels then ship in `app/dist`, which contradicts "dev-only" and "no chunk ships", though the build check, which greps only the plugin's id, passes.
- Story B registers them inside the dynamically imported plugin, which contradicts "`editor`'s modules register".

**Pair 3, reach.** `app`'s autosave failure state (AD-10's `app` row: `reactive` for "autosave's failure state") is a service `editor` cannot import. Story A has `app`'s module register an inspectable for it; Story B reads "`editor`'s modules" as a closed list and leaves it out.

**Close with:** "`edit(key, value)` parses `value` with the service's own field schema and writes through the same public method a UiAction uses; a key with no such method is read-only. Inspectables are registered by a dev-only module that `mountEditor` adds under the same `MODE === 'development'` gate, from `editor` and `app` alike, so production builds register none." Record the rejected options: unchecked edits, and registration in production modules.

## P6 (medium): the timeline's "launch shows too" races the dynamic import, and the invocation event is underspecified

**Sentence.** Editor state row: "The timeline has two layers: invocations, from an event `Invoke` emits per call (handle id and label, input, result), and commits, from the design store's commit event, so launch, undo and redo show too. `mountEditor` loads it through a dynamic import…"

**Race.** `Launch.run` calls `mountEditor`, awaits only `location.isReady()`, then immediately runs `OpenStoredDesign` or `NewDesign` through the store (`app/src/launch/launch.ts:13-23,35-55`). The plugin arrives through a dynamic import that `mountEditor` does not await, since it returns synchronously (`packages/editor/src/mount-editor.ts:12-22`). In dev that import is a network fetch, so the launch commit is usually emitted before the plugin subscribes to `store.events`. Nanoevents does not replay (`design-store.ts:119`). So "launch shows too" is not guaranteed.

**Close with:** "At setup the plugin adds one timeline entry for the store's current `Committed` (when it has one), so a commit made before it loaded still shows." Alternatively, drop "launch" from the claim.

**Event shape pair.** Story A gives `Invoke` a nanoevents `events: Subscribable<InvokeEvents>`, copying `DesignStore` (`design/src/store/types.ts:27-41`), and emits once after the `AsyncResult` settles. Story B emits once synchronously with the input and attaches the result later. The two differ in three ways:

- **Ordering.** A command's commit event fires synchronously inside `store.run` (`design-store.ts:142`). Under A, every commit shows *before* the invocation that caused it, and an action such as Save shows its invocation seconds after its click.
- **"input" for a refusal before the builder runs.** `Invoke` refuses a command with no design open *without* calling the builder (`invoke.ts:54-59`; `invoke.spec.ts` "without asking its builder for input"), so the event has no input. A writes `undefined`, B writes `{}`.
- **Proxies.** The builder's raw input can be a Vue reactive object. The store strips it with `toRaw`/`structuredClone` (`design-store.ts:172-175`), but `Invoke` does not, so the event can hand devtools a proxy.

**Close with:** "`Invoke.events` (nanoevents, like the store's) emits `invoked` with `{ id, label, input?: unknown }` before it runs the entry, and `settled` with the same call's sequence number and its `Result` when the result resolves; the input is the plain copy (`toRaw`), absent when the call was refused before its builder ran." Also: the commit event does not carry a command id (`CommitEvent`, `design/src/store/types.ts:23-25`), so the two layers can be correlated only by time. Say whether that is enough. If it isn't, the commit event needs a field, which AD-2 has to define first (Policy: no field before the spine defines it).

## P7 (low): duplicate inspectable ids and the accept event

- Nothing refuses two inspectables with one `id`, so the devtools tree gets two nodes under one key. Every other multi token in `editor` (`uiActions`, `inputBuilders`) refuses duplicates at startup (`invoke.ts:20-23`, `shortcut-registry.ts:19-20`). Close with: "the plugin refuses a duplicate inspectable id at setup", or record that it doesn't and why.
- `acceptDerivedFiles` writes the store's `shallowRef` and emits `accept`, not `commit` (`design-store.ts:101-113`), so the inspector's store state changes with no timeline entry. Either add the accept event to the commits layer or record that it is left out.

---

## Checked: not holes

- **AD-10's `editor` row against AD-2.** "through its invoke path over `design`'s store" agrees with AD-2's edited sentence and the glossary.
- **`useShortcuts()` (`packages/editor/src/shortcuts/use-shortcuts.ts:6-10`).** It returns `void` and calls `useService` itself. It is a composable, so it may, and it returns no service instance. It obeys the new row.
- **`DesignCanvas.vue:2-6`.** It still calls `useService(DesignStore)` directly. The new row bans this, and the first review's F7 already lists the migration.
- **`app`'s `Launch` calling `store.run`** (`launch.ts:37,48,53`). This is not "from the UI", so it is outside the invoke-path rule. The glossary's "from the UI" scoping is consistent with AD-2's "`app` runs the `newDesign` action at launch".
- **`MODE === 'development'` replacing the first review's `DEV && !VITEST`.** Vitest's mode is `test`, so the plugin stays off in specs, and the first review's F6 is closed.
- **The design store shown read-only.** This agrees with AD-2's "Exactly two ways write it", which closes the first review's F4, pair 3.
