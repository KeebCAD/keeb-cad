---
title: 'A modal owns the keyboard'
type: 'feature'
ticket: 27
created: '2026-11-11'
status: 'built'
baseline_revision: 'edb678acb1b0345e1ac3e24f3f8009a7775c2421'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 1
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
- [x] `packages/ui/src/hotkeys/hotkey-layer.ts` (service; built by `ShortcutRegistry.listen`, which owns it, not resolved from `di`, as today at `shortcut-registry.ts:34`) -- its class comment (`:7-10`, restating what the class does) is removed; constructor `(target, onHotkey, isModalOpen: () => boolean)`; `action` returns first when `this.#isModalOpen()`; options gain `enableOnContentEditable: false`. Rows 1–7 in `hotkey-layer.spec.ts`; its test `'with an entry that did not run, prevents %s as told'` (`:122`), whose Shift row expects no prevent, is renamed `'with an entry that did not run, prevents %s only when it is a Ctrl, Meta or Alt+arrow chord'`.
- [x] `packages/ui/src/dialog/{UiDialog.vue,types.ts}` -- `DialogProps = { open: boolean }`, `DialogEmits = { 'update:open': [open: boolean] }`, `DialogSlots = { title(): unknown; default(): unknown }`. `DialogRoot` → `DialogPortal` → `DialogOverlay` (`fixed inset-0 bg-scrim`) and `DialogContent` (`:aria-describedby="undefined"`; fixed, centred; `rounded-lg border border-border bg-panel p-pad text-text shadow-overlay`) → `DialogTitle` (`text-ui`, the `title` slot) and the default slot. Exported with its types from `ui`'s index. Rows 9–12a in `Dialog.spec.ts`; row 10 holds `open` in a `ref` that `update:open` sets.
- [x] `_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md`, `packages/ui/src/theme/theme.css` -- `components.overlay.scrim: 'rgba(35,38,52,.45)'` (Crust at 45%, both themes) and the Elevation paragraph names the scrim behind modal overlays; `--color-scrim` in `@theme`. On the code branch.
- [x] `packages/ui/workbench/{DialogHost.vue,states/dialog-states.ts,widgets.ts}` -- `DialogHost` takes no props, holds `open` as component state, renders an `Open dialog` button and a `UiDialog` bound to it, passing its `title` and default slots through; one state, `opens from its button`, slots `title` (`Add group in ` and a mono `root`) and `default` (a line of text). Esc closes it; no close button, since a state's slot can't reach `DialogHost`'s `open` (`WidgetCell.vue:16-18`). Row 8 mounts that state in `Dialog.spec.ts`.
- [x] `packages/editor/src/shortcuts/is-behind-modal.ts` (function) -- `isBehindModal(root: Element): boolean`. Row 13 in `is-behind-modal.spec.ts`.
- [x] `packages/editor/src/shortcuts/{shortcut-registry.ts,use-shortcuts.ts}` -- `ShortcutRegistry` (service): `listen(target, root)` builds `new HotkeyLayer(target, run, () => isBehindModal(root))`; `useShortcuts(root)` (function). `shortcut-registry.spec.ts` and `use-shortcuts.spec.ts` pass a root.
- [x] `packages/editor/src/{mount-editor.ts,App.vue,types.ts}` -- `mountEditor` (existing function, not added; it already mounts the app) resolves the selector (row 18 in `mount-editor.spec.ts`), `createApp(App, { root })`, `app.mount(root)`; `App.vue` takes `AppProps = { root: HTMLElement }` (new `src/types.ts`) and calls `useShortcuts(root)`.
- [x] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- one precedent entry: `packages/ui/workbench/CanvasToggleFrame.vue` takes the glossary's **frame** for a workbench wrapper (spine glossary: "**frame** | A position + rotation in the plane").
- [x] `packages/editor/src/shortcuts/modal-keeps-keys.spec.ts` -- rows 14–17 through `mountShell`, a `UiDialog` rendered beside it with `vitest-browser-vue` (open held in a `ref`, closed on `update:open`), and `pressKey`.

**Acceptance Criteria:**
- Given the ui workbench, when the Dialog row's button is clicked, then a centred dialog titled `Add group in root` opens over the page in both themes, and Esc closes it with focus back on the button.
- Given each toggled bug, when applied, then its rows go red and pass once restored (named in the PR): the `isModalOpen` early return removed (1–3, 14–16), `enableOnContentEditable` set to `true` (5, 7), `enableOnFormTags` omitted (4), `closest` replaced by the root's own attribute (13), the portal removed (9, 10).
- Given `pnpm test`, then the whole suite passes in Chromium and Firefox.

## Implementation Notes

- Toggled bugs, each applied alone and restored, both browsers: the `isModalOpen` early return removed turned rows 1–3 and 14–16 red; `enableOnContentEditable: true` turned 5 and 7 red; `enableOnFormTags` omitted turned 4 red; `closest` replaced by the root's own attribute turned 13 (the parent row) red; the portal removed turned 9 and 12a red, not 10: without the portal the content still sits in a body child, so `hideOthers` still marks row 10's sibling. Row 10 proves the `aria-hidden` round trip, not the portal.
- Row 15 reads `location.hash` after awaiting the dialog button's focus; the unprevented keydowns are what tell a silenced layer from a run entry. Row 16 reads the slide-out with `includeHidden`, since the shell is `aria-hidden` while the dialog is open, after a `nextTick`.
- `shortcut-registry.spec.ts` passes `document.body` as the root, which no test hides.
- Real-host run: not applicable, no spec fakes a third-party host or boundary; every row runs the real Reka `Dialog`, the real zag store and real Chromium and Firefox (`pnpm test`: 556 files, 4454 tests passed, no type errors).
- Structural changes: none (no `tsconfig*.json`, `package.json` dependency, `pnpm-workspace.yaml`, Vitest, ESLint, Stryker or dependency-cruiser config, `declare global` or `declare module` in `git diff --stat` since baseline).
- Decision (build): `--color-scrim` is declared once in `@theme`, not repeated in the `[data-theme]` blocks, because the plan's Decision (Sergii 2026-11-11) gives it "one value for both themes, as the shadow is", and `--shadow-overlay` is declared once (`theme.css:113`).
- Decision (Sergii 2026-11-11, at the look): the dialog stays above the editor through `isolate` on `EditorShell`'s outer div, not a z-index on `UiDialog`'s overlay and content, because the editor's z-indexes then stay inside the editor and anything portaled to `body` paints above it with no z-index scale DESIGN.md doesn't define; Reka's Dialog docs set none either (https://reka-ui.com/docs/components/dialog). Sergii looked at the workbench Dialog row: fine.
- Decision (build): `DialogHost` opens the dialog with `UiButton`, not a bare `<button>`, because DESIGN.md's dialogs use its `button` component (› Overlays › Add flow: "an `Add` `button`").

## Plan Change Log

## Review Triage Log

### Pass 1 (quick, test-reviewer) -- high 1, medium 0, low 5, false 1, rejected 5

| # | Lens | Finding | Verdict | Route | Evidence / action |
|---|---|---|---|---|---|
| 1 | quick | Scrim and dialog paint under the open Tree slide-out | high | patch | `EditorShell.vue:24` slide-out `z-10` in the root stacking context (no ancestor isolates; `styles.css` sets only height), portaled overlay and content have no z-index. Patched: `isolate` on the shell's outer div; new test 'lays its scrim over the open slide-out' fails without it in both browsers. |
| 2 | quick, test-reviewer | Row 18 pins the message wording; `toThrow(instance)` may not check the class | low | patch | Row 18 asks for an `InvariantError` naming `#missing`. Patched: `toThrow(InvariantError)` and `toThrow('#missing')`. |
| 3 | quick | Row 18's `arrange()` builds a container, root, scope it never uses | low | patch | AGENTS "Arrange only what the test uses". Patched: the test builds only an injector. |
| 4 | test-reviewer | Row 10 reads `aria-hidden` once, no retry | low | patch | `useHideOthers` sets it from a watcher (`useHideOthers.js`), not with the render. Patched: retrying `toHaveAttribute` before and after. |
| 5 | test-reviewer | Row 17 presses `2`, F6, Ctrl+D while open; an early `2` that ran would pass the final check | low | patch | Deleted the three presses. |
| 6 | quick | AC says removing the portal turns row 10 red; it doesn't | low | reject | Fix edits this build's plan (rejected by rule); rows 9 and 12a go red on that toggle (Implementation Notes). Raised at the look. |
| 7 | quick, test-reviewer | Row 15's `location.hash` read can't fail on its own | low | reject | Its `defaultPrevented` half fails when the layer runs the entry (a matched entry that ran is prevented); waiting can't strengthen a "still on Layout" read. |
| 8 | test-reviewer | Row 8 copies the state's literals | low | reject | One state (`dialog-states.ts`); a second state is not planned. |
| 9 | quick | Build decisions in Implementation Notes not in X/not Y form (row 15 timing) | low | reject | Same root as 7; the note records a test detail, not a choice of behaviour. |
| 10 | quick | Review Triage Log empty though lenses ran | false | reject | The triage is written here, after both lenses reported. |
| 11 | test-reviewer | `mock.calls` assertions in `hotkey-layer.spec.ts` | false | reject | The reviewer itself found the handler call is the behaviour under test (rows 1–6). |


### Pass 2 (quick, test-reviewer, on the four patched files) -- high 0, medium 0, low 8, false 1; loop ends, lows logged

| # | Lens | Finding | Verdict | Route | Evidence / action |
|---|---|---|---|---|---|
| 1 | quick, test-reviewer | `isolate` on `EditorShell` has no recorded rejected alternative (a z-index on `UiDialog`'s overlay and content); a host outside the shell with a z-indexed element would paint over the dialog again | low | logged; question at the look | Today the only z-index in `packages/` and `app/` is the slide-out's `z-10`, inside the shell. Reka's Dialog docs put no z-index on overlay or content (https://reka-ui.com/docs/components/dialog, fetched 2026-11-11), so the reviewer's recalled documented setup does not hold. The pick between the two is *judgement*: asked of Sergii at the look. |
| 2 | quick | AC "the portal removed (9, 10)" still claims row 10 | low | carried | Pass 1 #6. |
| 3 | quick | Row 15's focus half can't fail alone: Reka's focus trap pulls focus back to the button | low | logged | `defaultPrevented` half catches a run entry; same class as pass 1 #7. |
| 4 | quick | `arrangeHeld()` returns `{ screen, open }` that row 10 never uses | low | logged | AGENTS "Arrange only what the test uses"; harmless return value. |
| 5 | quick | Row 18 test is `async` with no `await`; calls `mountEditor` twice | low | logged | Throws before `createApp` (`mount-editor.ts:13-15`), so no side effect. |
| 6 | test-reviewer | Scrim-over-slide-out test restores `body.style.pointerEvents` inline, not in `onTestFinished` | low | logged | Leaks only if `elementFromPoint` or `getBoundingClientRect` throws. |
| 7 | test-reviewer | Row 12a probes without the pointer-events override the slide-out test needs | false | reject | `DialogOverlayImpl.js` sets `pointer-events: auto` on the overlay (quick lens checked), so the corner probe hits the scrim. |
| 8 | test-reviewer | Row 8 copies the state's literals | low | carried | Pass 1 #8. |
| 9 | test-reviewer | Row 15 hash half | low | carried | Pass 1 #7. |

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
