---
title: 'A modal owns the keyboard'
type: 'feature'
ticket: 27
created: '2026-11-11'
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
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `ui` has no dialog, and the hotkey layer is global: with a modal open, Esc runs `CloseSlideOut` and prevents it, so Reka's dialog never dismisses, and digits, T, F and F6 act on the editor behind the modal. A contenteditable element is covered only by zag's default, not by the layer.

**Approach:** `ui` gains `UiDialog`, a thin wrapper over Reka's modal `Dialog` that portals its content to `body`. `HotkeyLayer` takes a third argument, `isModalOpen`, a predicate it reads at every matched keydown: while it answers true the layer runs no entry and prevents nothing. `editor` passes `() => isBehindModal(root)` with the element it mounted into, true while Reka's `useHideOthers` has that root `aria-hidden`. Every hotkey sets `enableOnFormTags: false` and `enableOnContentEditable: false` explicitly.

## Boundaries & Constraints

**Always:**
- Spine AD-26 Shortcuts ("Shortcuts act only on the editor's own surfaces…") and its glossary row **modal** set the behaviour; the ticket's verify sets the tests.
- The layer reads the predicate at keydown, inside zag's action, before the letter guard; nothing registers, toggles or scopes hotkeys when a modal opens.
- A live region never sits inside the editor root (spine: `aria-hidden` spares an `[aria-live]` element's ancestors). None exists yet; nothing here adds one.
- Decision (plan): `isBehindModal(root)` answers `root.closest('[aria-hidden="true"]') !== null`, not `root.getAttribute('aria-hidden') === 'true'`, because `hideOthers` marks the siblings along the path from the modal up to `body` (`aria-hidden/dist/es2015/index.js:47-54`, `keep(el.parentNode)`), so a root mounted inside a wrapper is hidden through its ancestor, not on itself.
- Decision (plan): `mountEditor` keeps its `selector` argument, resolves it with `document.querySelector`, throws `InvariantError` naming the selector when nothing matches, and passes the element to `App` as its `root` prop; not Vue's warn-and-return on a missing target (`@vue/runtime-dom/dist/runtime-dom.esm-bundler.js:2085-2090`), which would leave `Launch.run` waiting on a router no app mounted; not reading `app._container` (`@vue/runtime-core/dist/runtime-core.d.ts:1075-1078`, internal fields beside `_uid` and `_props`).
- Decision (Sergii 2026-11-11): `UiDialog` draws a scrim over the whole page, top bar and strip included, Crust at 45% (`rgba(35,38,52,.45)`, the colour of `mockups/add-flow-1.html:40`), not no scrim and not leaving it to 13.25, because Reka makes the page behind inert (`DialogContentModal.js:69`) and the scrim shows it; previewed in `ux-editor/.working/dialog-scrim-1.html` (option B). DESIGN.md gains `components.overlay.scrim` beside `components.overlay.shadow`, one value for both themes as the shadow is, and `theme.css` its `--color-scrim`, on the code branch (AGENTS: "An edit to `DESIGN.md`'s tokens goes on the code branch with its `theme.css`").
- Decision (plan): `UiDialog` passes `:aria-describedby="undefined"` to `DialogContent` and has no description, not Reka's documented `DialogDescription` part, because the ticket asks for none and Reka's docs give this as the way to drop it (https://reka-ui.com/docs/components/dialog: "If you want to remove the description entirely, remove this part and pass `:aria-describedby="undefined"` to `DialogContent`.").
- Decision (plan): `UiDialog`'s props are `open` and `update:open`, not `modelValue`, because they are `DialogRoot`'s own (Reka docs, DialogRoot: `open`, `@update:open`) and 13.25's draft plan binds them (`story-g-and-s-…-plan.md:140`).
- Decision (plan): the title is a named `title` slot, not a `title: string` prop, because DESIGN.md › Overlays › Add flow sets "title in `{typography.ui}` with the parent id in `{typography.mono}`", which a string can't carry.
- Decision (plan): `UiDialog` is fixed and centred with no width or placement props and an always visible title, not the command palette's placement under the top bar or a hidden title, because the ticket asks for "a thin wrapper over Reka's modal Dialog" and the palette is "to plan" (`component-ownership.md:24`); its story extends the wrapper.
- Decision (plan): the name is `UiDialog`, not `UiModal`, because the ticket says "ui gains its dialog wrapper" and the glossary's **modal** also covers Menu, Popover, Select and Drawer, which this wrapper isn't.
- Decision (plan): `root` travels as `App`'s prop to `useShortcuts(root)` and `listen(target, root)`, where the registry builds `() => isBehindModal(root)`, not a `di` value, because the container is built and resolved before any mount (`testing/mount-shell.ts:34-46`, then `mountEditor` at `:72`), so no service knows the root when it resolves.
- Decision (plan): row 12a finds the scrim by `document.elementFromPoint`, not a `data-testid` with an `eslint.config.ts` override, because `DialogOverlay` has no role, label or text, and a point lookup proves it covers the corners in the same step.
- Decision (plan): `HotkeyLayer`'s `isModalOpen` is a required argument, not an optional one defaulting to `() => false`, because the spine has `editor` always hand it ("through a predicate `editor` hands the layer with the root it mounted into"), and an optional one is a layer that forgets the modal.
- Decision (plan): the workbench shows the dialog behind a trigger button (`DialogHost.vue`), not as an open state, because an open modal on load hides and blocks the whole workbench page (`DialogContentModal.js:53,69`: `useHideOthers`, `disable-outside-pointer-events`) and `WidgetCell.vue:9-12` keeps only `modelValue`, so a fixed `open: true` would never close. Named `Host`, not `Frame` like `CanvasToggleFrame.vue`, because the glossary's **frame** is "A position + rotation in the plane" (that precedent goes to `deferred-work.md`).
- Decision (plan): Vue components (`UiDialog.vue`, `DialogHost.vue`) carry no `(service)` or `(function)` tag, not one of the two, because the rule tags "each class or function a plan adds" and a single-file component is neither.
- Decision (plan): rows 14–17 are `unit, editor`, not integration in `app`, because they prove `editor`'s own part (the registry hands the layer `isBehindModal(root)`), as 13.24's registry rows did through `mountShell`; the real `UiDialog` is the arrangement the spine asks for ("a browser test opens the real wrapper and checks both the root's `aria-hidden` and the layer's silence").
- Decision (Sergii 2026-11-11): rows 4–7 arrange a text field and a contenteditable element outside any modal in `ui`, not only the field rows and not none until a story builds a field outside a modal, because the layer's input is any DOM target and the spine's rule names both ("the layer sets zag's `enableOnFormTags` and `enableOnContentEditable` to false on every hotkey"); only a row proves the explicit setting survives a zag default change.
- Decision (plan): field and contenteditable rows run in `ui` only, not again in `editor`, because AGENTS.md: "Test a rule where it is defined; a package that uses it tests only its own part." `editor` tests the predicate and its wiring.

**Never:**
- A `ui`-owned mark, zag scopes, a per-UiAction modal check, or chords reaching fields (all rejected in the ticket and spine).
- The add flow, its text field or its width (13.25); `CloseSlideOut`'s Escape and T's toggle (13.28); app-wide chords from fields (spine open question).
- `vi.mock`, jsdom, snapshots.

## Boundary table

| # | Group | Input / state | Expected | Level |
|---|---|---|---|---|
| 1 | rules | `HotkeyLayer` with `R`, predicate true; `r` pressed | handler not called; keydown not `defaultPrevented` | unit, ui (browser) |
| 2 | rules | predicate true; `mod+D` registered; Ctrl+`d` pressed | handler not called; not `defaultPrevented` | unit, ui |
| 3 | rules | predicate true for the first `r`, false for the second | handler called once, for the second | unit, ui |
| 4 | rules | focus in an `<input>`; `mod+D` registered; Ctrl+`d` dispatched on it | handler not called; not `defaultPrevented` | unit, ui |
| 5 | rules | focus in a `contenteditable` div; `R` and `mod+D` registered; `r`, then Ctrl+`d`, dispatched on it | handler not called; neither `defaultPrevented` | unit, ui |
| 6 | production bugs | focus in an `<input>`, `R` registered; `r` typed (`userEvent.keyboard`) | input value `r`; handler not called | unit, ui |
| 7 | production bugs | focus in a `contenteditable` div, `R` registered; `r` typed | its text `r`; handler not called | unit, ui |
| 8 | module boundaries | `DialogHost` workbench state; its button clicked | a `dialog` named by the state's title slot, holding the default slot's content | unit, ui |
| 9 | module boundaries | `UiDialog` open | the dialog is not inside the rendered container | unit, ui |
| 10 | module boundaries | a body child beside the render; `UiDialog` open, then Esc | that child has `aria-hidden="true"` while open; no `aria-hidden` once closed | unit, ui |
| 11 | rules | `UiDialog` with `open: true`; Esc | `update:open` emitted with `false`, once | unit, ui |
| 12 | rules | `UiDialog` with `open: false` | no `dialog` on the page | unit, ui |
| 12a | module boundaries | `UiDialog` open | `document.elementFromPoint` at the viewport's corners, (0, 0) and (`innerWidth` − 1, `innerHeight` − 1), each gives an element outside the rendered container and outside the dialog, whose computed background is `rgba(35, 38, 52, 0.45)` | unit, ui |
| 13 | rules | `isBehindModal(root)`: root `aria-hidden="true"`; its parent `aria-hidden="true"`; neither; only a child of root `aria-hidden="true"`; root `aria-hidden="false"` | true; true; false; false; false | unit, editor (browser) |
| 14 | production bugs | shell on Layout, slide-out open (T), `UiDialog` open with a button, focus on it; Esc (`userEvent.keyboard`) | the dialog is gone; the slide-out's Tree is still visible; `#app` had `aria-hidden="true"` while open | unit, editor |
| 15 | production bugs | shell on Layout, `UiDialog` open; `2`, `F6`, then Ctrl+`d` (`pressKey`) | still on Layout; focus still on the dialog's button; none `defaultPrevented` | unit, editor |
| 16 | production bugs | shell on Layout, slide-out closed, `UiDialog` open; `T` | slide-out still closed; not `defaultPrevented` | unit, editor |
| 17 | production bugs | row 15's state, the dialog then closed; `2` | the Outline workspace is shown | unit, editor |
| 18 | glue | `mountEditor('#missing', injector)` with no such element | throws `InvariantError` naming `#missing` | unit, editor |

</frozen-after-approval>

## Code Map

- `packages/ui/src/hotkeys/hotkey-layer.ts:12-15,31-47` -- constructor `(target, onHotkey)`; `#command` builds zag's options `{ preventDefault: false, enableOnFormTags: false }` (`:40`) and its `action` runs the letter guard (`:42`), then `#onHotkey`, then prevents. The predicate's early return goes first in `action`; `enableOnContentEditable: false` joins `:40`.
- zag 1.47.0 (`@zag-js/hotkeys/dist/store.mjs:18-24,141-142`; `parser.mjs:192-207`): defaults are `enableOnFormTags: false`, `enableOnContentEditable: false`, but a chord with Ctrl, Meta or Alt and an `undefined` `enableOnFormTags` is switched to `true`; `shouldTrigger` skips `input`, `textarea`, `select` and `isContentEditable` targets. So the explicit `false` is what keeps chords out of fields.
- `packages/ui/src/hotkeys/hotkey-layer.spec.ts:11-24,59-69` -- `arrange(entries, ran)` and `press(init, target)`; the text-field row is the pattern for rows 4–7. `arrange` gains an optional `isModalOpen` argument; rows 1–3 pass it, and the others, which never open a modal, get `() => false`.
- `packages/ui/src/tooltip/{UiTooltip.vue,Tooltip.spec.ts:106-116}` -- precedent for a Reka wrapper with a portal (classes `rounded-lg border border-border bg-panel … shadow-overlay`) and for "portals its content out of the rendered component" (row 9).
- `packages/ui/workbench/{widgets.ts,CanvasToggleFrame.vue,states/canvas-toggle-states.ts,WidgetCell.vue:9-12}` -- one row and one state file per component; a frame component wraps one that can't stand alone.
- `reka-ui` 2.11.0 `Dialog/` -- `DialogRoot` (`open`, `update:open`), `DialogPortal`, `DialogContent` (modal by default: `DialogContentModal.js:53` `useHideOthers`, `:69` outside pointer events off), `DialogTitle`. `DismissableLayer.js:72-77`: Esc dismisses only when the keydown is not `defaultPrevented`, listened on `window`.
- `packages/ui/src/index.ts` -- exports components and types per folder.
- `packages/editor/src/shortcuts/shortcut-registry.ts:30-37` -- `listen(target)` builds the layer; gains `root: Element`. `shortcut-registry.spec.ts:151-317` calls `listen(document)` ten times; each passes a root.
- `packages/editor/src/shortcuts/use-shortcuts.ts:6-10` -- `onMounted(() => registry.listen(document))`; gains `root`.
- `packages/editor/src/App.vue` -- calls `useShortcuts()`; gains the `root` prop.
- `packages/editor/src/mount-editor.ts:11-25` -- `createApp(App)`, `app.mount(selector)`. Callers: `app/src/launch/launch.ts:15`, `testing/mount-shell.ts:72` (`#app`), `mount-editor.spec.ts:38` and `use-shortcuts.spec.ts:72` (`#editor-root`); all keep their selector.
- `packages/editor/src/testing/{mount-shell.ts,press.ts}` -- `mountShell({ path, design })` appends `#app` to `body`; `pressKey({ key, code, ctrl })` dispatches on `document` and returns the keydown.
- Hotkeys the editor rows press: `ShowOutline` `'2'` (`workspace/outline/show-outline.ts:14`), `FocusNextLandmark` `'F6'`, `OpenTree` `'T'`, `CloseSlideOut` `'Escape'` (`slide-out/close-slide-out.ts:14`), `DuplicateSelection` `'mod+D'`.
- 13.25's draft plan (`story-g-and-s-add-groups-and-slots-through-the-add-flow-plan.md:140`) lists a `UiDialog` task with `DialogProps { open; title }` and `update:open`; this plan builds that API, and 13.25's planner drops the task when it resumes.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/ui/src/hotkeys/hotkey-layer.ts` (service; built by `ShortcutRegistry.listen`, which owns it, not resolved from `di`, as today at `shortcut-registry.ts:34`) -- its class comment (`:7-10`, restating what the class does) is removed; constructor `(target, onHotkey, isModalOpen: () => boolean)`; `action` returns first when `this.#isModalOpen()`; options gain `enableOnContentEditable: false`. Rows 1–7 in `hotkey-layer.spec.ts`; its test `'with an entry that did not run, prevents %s as told'` (`:122`), whose Shift row expects no prevent, is renamed `'with an entry that did not run, prevents %s only when it is a Ctrl, Meta or Alt+arrow chord'`.
- [ ] `packages/ui/src/dialog/{UiDialog.vue,types.ts}` -- `DialogProps = { open: boolean }`, `DialogEmits = { 'update:open': [open: boolean] }`, `DialogSlots = { title(): unknown; default(): unknown }`. `DialogRoot` → `DialogPortal` → `DialogOverlay` (`fixed inset-0 bg-scrim`) and `DialogContent` (`:aria-describedby="undefined"`; fixed, centred; `rounded-lg border border-border bg-panel p-pad text-text shadow-overlay`) → `DialogTitle` (`text-ui`, the `title` slot) and the default slot. Exported with its types from `ui`'s index. Rows 9–12a in `Dialog.spec.ts`; row 10 holds `open` in a `ref` that `update:open` sets.
- [ ] `_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md`, `packages/ui/src/theme/theme.css` -- `components.overlay.scrim: 'rgba(35,38,52,.45)'` (Crust at 45%, both themes) and the Elevation paragraph names the scrim behind modal overlays; `--color-scrim` in `@theme`. On the code branch.
- [ ] `packages/ui/workbench/{DialogHost.vue,states/dialog-states.ts,widgets.ts}` -- `DialogHost` takes no props, holds `open` as component state, renders an `Open dialog` button and a `UiDialog` bound to it, passing its `title` and default slots through; one state, `opens from its button`, slots `title` (`Add group in ` and a mono `root`) and `default` (a line of text). Esc closes it; no close button, since a state's slot can't reach `DialogHost`'s `open` (`WidgetCell.vue:16-18`). Row 8 mounts that state in `Dialog.spec.ts`.
- [ ] `packages/editor/src/shortcuts/is-behind-modal.ts` (function) -- `isBehindModal(root: Element): boolean`. Row 13 in `is-behind-modal.spec.ts`.
- [ ] `packages/editor/src/shortcuts/{shortcut-registry.ts,use-shortcuts.ts}` -- `ShortcutRegistry` (service): `listen(target, root)` builds `new HotkeyLayer(target, run, () => isBehindModal(root))`; `useShortcuts(root)` (function). `shortcut-registry.spec.ts` and `use-shortcuts.spec.ts` pass a root.
- [ ] `packages/editor/src/{mount-editor.ts,App.vue,types.ts}` -- `mountEditor` (existing function, not added; it already mounts the app) resolves the selector (row 18 in `mount-editor.spec.ts`), `createApp(App, { root })`, `app.mount(root)`; `App.vue` takes `AppProps = { root: HTMLElement }` (new `src/types.ts`) and calls `useShortcuts(root)`.
- [ ] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- one precedent entry: `packages/ui/workbench/CanvasToggleFrame.vue` takes the glossary's **frame** for a workbench wrapper (spine glossary: "**frame** | A position + rotation in the plane").
- [ ] `packages/editor/src/shortcuts/modal-keeps-keys.spec.ts` -- rows 14–17 through `mountShell`, a `UiDialog` rendered beside it with `vitest-browser-vue` (open held in a `ref`, closed on `update:open`), and `pressKey`.

**Acceptance Criteria:**
- Given the ui workbench, when the Dialog row's button is clicked, then a centred dialog titled `Add group in root` opens over the page in both themes, and Esc closes it with focus back on the button.
- Given each toggled bug, when applied, then its rows go red and pass once restored (named in the PR): the `isModalOpen` early return removed (1–3, 14–16), `enableOnContentEditable` set to `true` (5, 7), `enableOnFormTags` omitted (4), `closest` replaced by the root's own attribute (13), the portal removed (9, 10).
- Given `pnpm test`, then the whole suite passes in Chromium and Firefox.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

The layer's action, as it should read:

```ts
action: (event) => {
  if (this.#isModalOpen()) return
  if (!matchesTypedLetter(key, event)) return
  const ran = this.#onHotkey(id)
  if (ran || alwaysClaimed) event.preventDefault()
},
```

Returning before `preventDefault` is what lets Reka see an unprevented Esc (`DismissableLayer.js:72-77`). Row 15 tells a silenced layer from an unavailable entry by `defaultPrevented`: outside a field, a matched Ctrl chord is always prevented today, so an unprevented Ctrl+D proves no entry ran.

## Conformance Log

- `Give every decision its rejected alternative` (scrim decision had no "not Y") -- asked (Sergii: scrim, B)
- `When a decision departs from a Stack dependency's documented setup, that documented setup is its Y, cited from the library's docs` (aria-describedby) -- fixed (Reka docs quoted, `DialogDescription` named)
- `A choice no requirement made is a decision and is labelled as one` (`open`/`update:open`; required predicate) -- fixed
- `Glossary terms only` (`isSilenced`) -- fixed (`isModalOpen`)
- `Name a thing for what it does, checked against the spine's glossary` (`DialogFrame` vs **frame**; `UiDialog` vs **modal**) -- fixed (`DialogHost`; `UiDialog` decision)
- `each class or function a plan adds is tagged (service) or (function)` (Vue components, `useShortcuts`, `mountEditor`, `HotkeyLayer`) -- fixed
- `test wiring between packages as integration in pipeline or app` (rows 14–17 level) -- fixed (decision: `unit, editor`)
- `Give every test an expect that fails when the behaviour breaks` (row 15 "design unchanged") -- fixed (dropped)
- `Find elements by role, then label, then text` (row 12a scrim) -- fixed (`elementFromPoint` decision)
- `"Valid" or "correct" without a number is a question` (row 12a "covers the viewport") -- fixed (corner points)
- `Write a comment only for a why the code can't say` (precedent `hotkey-layer.ts:7-10`) -- fixed (removed in this PR)
- `Make a test's name and its expects claim the same thing` (precedent `hotkey-layer.spec.ts:122`) -- fixed (renamed in this PR)
- `Name a thing for what it does, checked against the spine's glossary` (precedent `CanvasToggleFrame.vue`) -- deferred
- `Give every decision its rejected alternative` (root through `App`'s prop) -- fixed
- `Pure logic is plain functions … Lookups and state … are services` (`mountEditor` tag) -- fixed (existing function, untagged)
- gap: `component-ownership.md:24` palette and cheat sheet on the wrapper -- fixed (decision: thin wrapper, palette story extends it; title slot)
- gap: `packages/ui/workbench/WidgetCell.vue:16-18` workbench Close button can't close -- fixed (dropped; Esc closes)
- gap: contenteditable and field outside a modal have no producer (rows 4–7) -- asked (Sergii: keep, A)
- gap: row 15 "design unchanged" can't fail -- fixed

## Verification

**Commands:**
- `pnpm --filter @keeb-cad/ui test:unit --run` -- expected: rows 1–12 pass in Chromium and Firefox.
- `pnpm --filter @keeb-cad/editor test:unit --run` -- expected: rows 13–18 and the existing shortcut specs pass.
- `pnpm test` -- expected: the whole suite passes.
- `pnpm --filter @keeb-cad/ui workbench` -- Sergii's look: the Dialog row.
