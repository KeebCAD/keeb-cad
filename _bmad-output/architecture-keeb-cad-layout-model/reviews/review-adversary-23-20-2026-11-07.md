# Adversary review: Editor state row (23.20 pass), 2026-11-07

Scope: the uncommitted diff to the spine's Consistency Conventions **Editor state** row and the two new Stack rows (`vite-plugin-vue-devtools`, `@vue/devtools-api` 8.2.1). Context read: AD-2, AD-10, AD-25, AD-26, glossary (shortcut registry, invoke path), `AGENTS.md`, `packages/editor/src/**`, `packages/di/src/vue/**`, `packages/ui/src/index.ts`, `packages/commands/src/index.ts`, `eslint.config.ts`, `.dependency-cruiser.mts`, `app/src/start-main.ts`, `app/vite.config.ts`.

Lens: build two units one level down that each obey every sentence to the letter and still come out incompatible. Each pair is a hole, with the sentence that would close it.

**Verdict:** the composable rule closes the direct `useService` path but leaves four wide doors. `useDesignStore()` hands out the store's `run`, so components can bypass the invoke path. Nothing says how many composables a service gets, what they return or where they live. The deleted ban on importing service modules as values has no replacement allowlist. And the devtools sentence assumes a service listing, a timeline hook and a write path that neither `di` nor AD-2 provides.

---

## F1 (high): `useDesignStore()` is a second invocation path beside `useInvoke()`

**Pair.** Story A builds a toolbar "New design" button: `const invoke = useInvoke(); invoke.invoke(NewDesign)`. Story B builds the same kind of button on the canvas empty state: `const store = useDesignStore(); store.run(NewDesign, {})`. Both obey the row: each component uses an `editor` composable the row names, and each imports only a handle from `commands`. AD-26 makes the invoke path mandatory only for "hotkey, menu, palette"; a button is none of those. AD-10 line 350 still says `editor` "invokes the handles `commands` defines, through `design`'s store".

**Incompatibility.** B skips the input builder, and with no design open it skips the `unavailable` refusal that `Invoke.#invokeCommand` gives (`packages/editor/src/invoke/invoke.ts:55-59`). The same handle then behaves differently depending on which widget fired it. `useDesignStore()` also exposes `undo`, `redo`, `replaceDesign` and `acceptDerivedFiles`, so a component can call `replaceDesign`, one of AD-2's two writers, directly.

**Close with:** "`useDesignStore()` returns a read-only view of the store (`current`, and later undo/redo availability), never `run`, `undo`, `redo`, `replaceDesign` or `acceptDerivedFiles`. A component runs every command, action and UiAction through `useInvoke()`, whatever widget fires it." Also fix AD-10 line 350 to say "through `editor`'s invoke path". AD-26's "Every invocation (hotkey, menu, palette)" should read "Every invocation from the UI (hotkey, menu, palette, button, canvas gesture)".

## F2 (high): nothing fixes how many composables a service gets, what they return, or where they live

**Pair 1, two composables for one service.** Story A adds `useDesignStore()`, which returns the `DesignStore`. Story B, which needs only the open design's meta, adds `useCurrentDesign()` over the same `DesignStore`; it returns `computed(() => store.current.getOrUndefined()?.design)`. Both are "`.ts` files over `useService`, tested on their own". The two give different absence semantics (`Option` vs `undefined`), and a reader cannot tell which one is canonical.

**Pair 2, a generic composable.** Story C writes `editor/src/services/use-editor-service.ts` with `export const useEditorService = <T>(t: TokenLike<T>) => useService(t)` (or simply `export { useService } from '@keeb-cad/di/vue'`). Every `.vue` file can then reach any service through it. It is a `.ts` file over `useService`, and the `.vue` lint is satisfied. "So a composable is the only way to a service" holds by its wording and fails in practice.

**Pair 3, three return shapes.** The existing `useShortcuts()` (`packages/editor/src/shortcuts/use-shortcuts.ts:6-10`) returns `void` and installs lifecycle hooks. The row's `useInvoke()` presumably returns the `Invoke` service (or a bound function?), and `useDesignStore()` returns the store. These are three conventions, and the row never says which one a new composable follows.

**Pair 4, placement.** AD-25 requires folders by concept, with no folder by kind. Story A puts `useDesignStore` in `editor/src/design-store/use-design-store.ts`; story B creates `editor/src/composables/`, citing the row's phrase "`editor`'s composables". The existing precedent puts a composable beside its service (`shortcuts/use-shortcuts.ts`), but `DesignStore`'s concept folder is in `design`, not `editor`.

**Close with:** "Each service a component needs has exactly one composable, `use<ServiceName>()`, in the concept folder of `editor` that uses it (beside the service when the service is `editor`'s). It takes no token argument and returns that service or a read-only view of it; no `editor` file re-exports `useService` or `useInjector`." Lint can enforce the re-export ban with a `no-restricted-syntax` selector on `ExportNamedDeclaration[source.value=/^@keeb-cad\/di\/vue$/]`. "One per service" needs a review rule or a spec that maps composables to tokens.

## F3 (high): the deleted ban on importing service modules as values leaves `.vue` imports open

The old row said: "Components never import the container or service modules as values". The new row bans only `di` and `di/vue`, then says "A component may import handles from `commands`, `ui` and `schema`". That sentence does not say whether it is an allowlist or a permission.

**Pair 1, reading it as an allowlist.** Story A writes the `.vue` lint as an allowlist (`commands`, `ui`, `schema`, plus `editor`-relative). Then `App.vue:2` (`import { RouterView } from 'vue-router'`), every `vue` import (`DesignCanvas.vue:4`) and `@vueuse/core` all fail, because none of them is listed. Story B reads the sentence as a permission and bans only `di`/`di/vue`.

**Pair 2, `ui` values that are not handles.** `ui` exports the `HotkeyLayer` class (`packages/ui/src/index.ts`). A component may import from `ui`, so `new HotkeyLayer(document, run)` in a panel's `.vue` is legal. That builds a second hotkey listener outside the shortcut registry, while the glossary and AD-26 say the registry is the only feed to zag.

**Pair 3, `commands` values that are not handles.** `commands` exports `LoadFlow` (a service) and `designActionsModule` / `loadModule` from the same barrel as `NewDesign` (`packages/commands/src/index.ts`). No path-based lint can tell "a handle from `commands`" apart from these.

**Pair 4, other packages.** Nothing stops a `.vue` file importing `@keeb-cad/design`, `storage` or `workers` as values. `DesignCanvas.vue:2` already imports `DesignStore` from `@keeb-cad/design` as a value.

**Close with:** "A `.vue` file imports values only from `vue`, `vue-router`, `@vueuse/core`, `ui`'s components and formatters (never `HotkeyLayer`), `commands`' and `editor`'s entry handles, `schema`, and `editor`'s own composables and components; `no-restricted-imports` lists the banned packages (`di`, `di/vue`, `design`, `storage`, `workers`, `model`, `protocol`) and `importNames` for `HotkeyLayer`, `LoadFlow` and the modules." Alternatively, give `commands` a `handles` subpath so the lint can allow by path.

☝️ The old row already claimed "lint enforces this", but `eslint.config.ts` has no `.vue` `no-restricted-imports` block today (its only `no-restricted-imports` is the type-specs one, lines 259-271). The new row repeats a claim that has not been enforced so far, so the story has to add the lint, not tighten an existing one.

## F4 (high): the devtools inspector needs a service list and state access the spine never defines

**Pair 1, listing services.** `mountEditor(selector, injector)` receives an `Injector`, whose interface (`packages/di/src/types.ts`) has only `resolve`. The inspector has to list "services". Story A adds `Container.entries()` to `di`, which is a kernel API change the spine does not define. Story B registers an `inspectableServices` multi token in `editor` and has each service opt in. Story C hard-codes a list in `devtools.ts`. All three follow the row, and each gives a different inspector and a different `di` surface.

**Pair 2, reading state.** Services keep their refs in ES private fields (`DesignStore`'s `shallowRef`, per AD-2; `ShortcutRegistry.#layer`, `shortcut-registry.ts:53`). `getInspectorState` cannot read `#private`. One story makes state public "for devtools" while another adds an `inspect()` method to each service, so the convention splits along the same lines as in pair 1.

**Pair 3, editing state against AD-2.** The row says state is "live and editable (`editInspectorState`)". If the design store is a listed service, editing its committed ref is a third writer. AD-2 says "Exactly two ways write it" and "no other class holds or assigns its `shallowRef`". The two sentences contradict each other unless editing is limited.

**Close with:** "The inspector lists the services registered in `editor`'s `inspectable` multi token (or: a `di` API X, defined in AD-25); each lists its state through a `devtoolsState()` method. Only `editor`'s UI-state services are editable; the design store is shown read-only." Each option needs its rejected alternative recorded.

## F5 (medium): the commands timeline has no defined hook point

**Pair.** Story A hooks the timeline in `Invoke`. That sees only UI invocations and misses `store.run` from `app` (Launch, autosave round trips), `replaceDesign` on load, and undo/redo. Story B hooks `DesignStore`, which needs `design` to expose an observer or event API. AD-2 does not define one, and an `editor` plugin wrapping the store's methods would be a monkeypatch on the one writer. Both stories follow the row.

**Close with:** "The commands timeline records every `run`, `undo`, `redo` and `replaceDesign` through `DesignStore`'s X (defined in AD-2)" or "records only what the invoke path runs; store calls from `app` do not appear". Pick one and record the rejected one.

## F6 (medium): the dev-only gate is also open under Vitest

`import.meta.env.DEV` is `true` in Vitest. `packages/editor/src/mount-editor.spec.ts` calls `mountEditor`, so every such test would dynamically import the plugin. `setupDevToolsPlugin` with no DevTools hook queues into a page-global `__VUE_DEVTOOLS_PLUGINS__`, and in browser mode one page runs a whole spec file. Each mount then adds an entry, which is module-level mutable state that leaks across tests (AGENTS.md, Tests). The import is also asynchronous while `mountEditor` returns synchronously, so its side effects land after the test's arrange.

**Pair.** Story A writes a test proving idempotency (it has to, because the row asserts it). Story B's `mount-editor.spec.ts` gains a plugin entry per test. The order is shuffled (`sequence.shuffle: true`), so A's result depends on B.

**Close with:** "`mountEditor` loads the plugin when `import.meta.env.DEV && !import.meta.env.VITEST`" (or "through an option `app`'s start file passes"), and say where idempotency is proven: a unit test of the plugin's setup function, not through `mountEditor`.

## F7 (medium): existing code the new rule breaks

- `packages/editor/src/views/DesignCanvas.vue:3`: `import { useService } from '@keeb-cad/di/vue'` is a value import the new lint refuses. `:6` calls `useService(DesignStore)` itself, and `:2` imports `DesignStore` from `@keeb-cad/design` as a value (allowed by the new text, banned by the old one; see F3).
- `packages/editor/src/App.vue:2` imports `RouterView` from `vue-router`. It breaks only under the allowlist reading of F3.
- `packages/editor/src/mount-editor.ts:18` calls `useThemeChoice()` from `ui`. That keeps UI state (the theme) in `@vueuse`'s `useStorage`/`useColorMode`, not in a `di` service, against the row's first sentence ("UI state ... lives in small `di` services"). This sets a precedent for pair F8.

The story that owns the lint has to migrate `DesignCanvas.vue`, and `DesignCanvas.spec.ts` must still provide the injector (spec `.ts` files are outside the `.vue` lint, which is fine).

## F8 (medium): a composable can hold state itself, outside any `di` service

**Pair.** Story A builds the viewport as a `ViewportService` holding refs, persisted per design id. Story B builds `useViewport()` in `editor` with `useStorage(\`viewport:${id}\`, …)` and no service, following `ui`'s `useThemeChoice` (`packages/ui/src/theme/use-theme-choice.ts`). B's composable is a `.ts` file, and the row says composables are "over `useService`" but does not forbid other state. Two components calling `useViewport()` get two refs over one storage key, and an input builder (a `di` class) cannot read the viewport at all.

**Close with:** "A composable holds no state of its own: it returns what `useService` resolved, or a `computed` over it. UI state that must outlive one component lives in a `di` service." Then either move the theme choice to a service or record why it is the exception.

## F9 (low): bypasses the `.vue` import lint does not catch

- `const { useService } = await import('@keeb-cad/di/vue')` in `<script setup>`: `no-restricted-imports` does not check `ImportExpression`. Close it with a `no-restricted-syntax` selector `ImportExpression[source.value=/^@keeb-cad\/di/]` on `.vue` files.
- A component written as a `.ts` `defineComponent`/render function is outside "on `.vue` files". Close it with "Components are `.vue` single-file components only."

## F10 (low): the build check's id and job are left open

"`app/dist` holds no trace of the plugin's id" does not say which job builds `app/dist`, or whether the check reads the id from the plugin's own constant or a copied literal. If a literal is copied, renaming the id leaves a check that always passes. Close with: "the check reads the id from the plugin's exported constant and runs after the CI build step".

---

## Not holes (checked)

- `di/vue` reachable from other packages: AD-10 line 339 limits `di/vue` to `editor`, and `viewer3d` is framework-free (AD-22), so no non-`editor` component needs a composable.
- Clean full reload on a service edit: each service file is also reached through `editor-module.ts` → `app/src/main-modules.ts` → `start-main.ts`, a chain with no HMR accept, so Vite still does a full reload even though composables now import service classes as values.
- Production chunk: `if (import.meta.env.DEV) await import(...)` is constant-folded, and the build check covers it either way.
