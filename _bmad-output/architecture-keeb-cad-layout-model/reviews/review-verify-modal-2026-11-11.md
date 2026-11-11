# Verify: modal-owns-the-keyboard amendment (2026-11-11)

Installed: reka-ui 2.11.0, @zag-js/hotkeys 1.47.0, valibot 1.5.0. Paths are under `node_modules/.pnpm/<pkg>/node_modules/<pkg>/dist`. Web docs were not consulted; every verdict is from the installed code.

Verdict: the mechanism is implementable and mostly holds. One committed sentence fails (Ctrl/Meta chords "still prevented" while a form field is focused), and "focus inside the marked element equals the modal being open" holds with named exceptions.

## 1. Reka UI 2.11.0

| Claim | Verdict | Evidence |
|---|---|---|
| Modal Dialog traps focus in its content | holds | `Dialog/DialogContentModal.js`: `trap-focus` = `rootContext.open`; `Dialog/DialogContentImpl.js:68-72` wraps in `FocusScope` with `loop`, `trapped`. `FocusScope/FocusScope.js:56-86`: focusin/focusout on root refocus the last focused element when focus lands outside the container. |
| Sets no `aria-modal` | holds | grep `aria-modal` over dist: no match. DialogContentImpl sets `role="dialog"`, `aria-labelledby`, `aria-describedby` only. Modal uses `useHideOthers` (`aria-hidden` on siblings), `DialogContentModal.js:16-53`, `shared/useHideOthers.js`. |
| Esc dismisses only if keydown not defaultPrevented, listening on window | holds | `DismissableLayer/DismissableLayer.js:72-77`: `onKeyStroke("Escape", ..., {target: ownerDocument.defaultView})`, emits `escapeKeyDown`, dismisses `if (!event.defaultPrevented)`. Only the highest layer reacts. |
| Registry listens on document, so it runs before Reka's window listener | holds | `packages/editor/src/shortcuts/use-shortcuts.ts:8` `registry.listen(document)`; zag default `capture: true` (`store.mjs:18-24`). Document capture precedes window bubble. |

"Focus inside the marked element equals the modal being open": holds in the common case, fails in these places.

1. Overlay and outside clicks do not steal focus. `DialogOverlayImpl.js` prevents left pointerdown on itself, and `disableOutsidePointerEvents` is true. Clicking non-focusable text inside the content focuses the content element, because FocusScope puts `tabindex="-1"` on it (`FocusScope.js:174`). So no drop to `body` from mouse use. Holds.
2. Focus guards. `useFocusGuards` is not used by Dialog (only Menu, Select, Popover, Combobox). Dialog has no guard nodes. Tab wraps in the container `keydown` (`FocusScope.js:~140-165`). Holds.
3. Fails: the trap ignores `focusout` with `relatedTarget === null` (`FocusScope.js:66-69`). Tabbing out to browser chrome and back, or the window losing and regaining focus, can leave `document.activeElement` as `body`. Keys then have `target=body`, outside the mark, and every entry runs behind the open modal. Low to medium. The memlog says "equals open" without this exception.
4. Fails (future): a Select, Popover, Combobox or Menu opened inside the dialog portals its content to `body` with its own FocusScope. It pauses the dialog's scope, so focus legitimately sits outside the dialog's content element while the modal is open. Hotkeys would run. The amendment defers only "menus that trap focus" to the first menu story, and says nothing about popovers and selects inside a modal. Either the wrapper marks those layers too, or the rule is stated as limited to the dialog content.
5. Fails (timing): between `open` and the mount autofocus (`FocusScope.js` `await nextTick()`, then `focusFirst`), focus is still on the opener or `body`. A key in that window acts behind the modal. On close, focus returns on `setTimeout 0`, and during the leave transition (Presence) the content is still marked. Negligible, but the "equals" is not exact.
6. Portaled Tooltip: Tooltip content takes no focus, so it cannot hold focus. Holds. The overlay and `DialogClose` are focusable or inside the content: `DialogClose` is rendered inside the content, so it is marked. The overlay is not focusable. Holds.
7. If the dialog is opened with no `DialogTrigger` (a hotkey opens the add flow), `triggerElement` is null and close restores via FocusScope's `previouslyFocusedElement` (`FocusScope.js:129`). Not a problem for the rule.

## 2. @zag-js/hotkeys 1.47.0 and `hotkey-layer.ts`

| Claim | Verdict | Evidence |
|---|---|---|
| Target the store listens on | holds | `packages/ui/src/hotkeys/hotkey-layer.ts:14` `createHotkeyStore({target})`; the registry passes `document` (`shortcut-registry.ts:30-34`, `use-shortcuts.ts:8`). zag attaches `keydown` capture listeners to the target (`store.mjs:341`). |
| `action(event)` gets the KeyboardEvent with a usable `target` | holds | `store.mjs:466-467` `command.action(event)` with the original event; `hotkey-layer.ts:42` already uses `event`. At document capture `event.target` is the focused element (the target retargets only across a shadow root, and none is used). Use `event.target instanceof Element && event.target.closest('[data-...]')`, or `composedPath()[0]` as zag does (`utils.mjs` `getEventTarget`). "The layer skips a key event whose target is inside a marked element" is implementable, in `action` before `#onHotkey`. |
| `enableOnFormTags: false` skips fields only | holds, with a catch | `parser.mjs:shouldTrigger` (~lines 191-207): skipped when the target's `localName` is input, textarea or select, or it is contenteditable (`enableOnContentEditable` defaults false). Buttons, links and `div[tabindex]` are not skipped. So the memlog's "covers fields only" is right. |
| A matched Ctrl/Meta chord or Alt+arrow "is still prevented" in a modal | **fails** for a focused field | `hotkey-layer.ts:41` sets `enableOnFormTags: false` explicitly. zag's default of enabling form tags for modifier chords (`store.mjs:141-143`) applies only when the option is `undefined`, so it does not apply here. `shouldTrigger` therefore rejects every hotkey, Ctrl+D and Alt+Left included, before `action` runs. With the add flow's id input focused (the case 13.25 builds), Ctrl+D is not prevented (browser bookmark dialog) and Alt+Left navigates Back. The new rule changes nothing there. This also contradicts the existing 13.24 sentence "a matched chord with Ctrl or Meta is always prevented", for inputs, textareas and selects. The prevention holds only for focus on non-field elements (buttons, content). Fix by wording ("with focus outside a field") or by dropping `enableOnFormTags: false` for chords with a non-Shift modifier and relying on the layer. That is a code decision for 13.25 or 13.24, not for this review. |

Consequence for the design: with focus in a text field in the modal, zag already skips everything, so the mark only adds value when focus is on a button, a checkbox or the content element.

## 3. Valibot 1.5.0

Command, run from `packages/schema`:

    v.pipe(v.string(), v.nonEmpty('A'), v.regex(/^[a-z]+$/, 'B')) on ''
    -> [ 'A', 'B' ]        (default and abortPipeEarly:false both)
    on 'ABC' -> [ 'B' ]

Verdict: holds. The order is [nonEmpty, regex]. The default run reports both, so "an empty field reads its own first issue" holds only if the reason shown is `issues[0]` (the memlog's "first issue's message"). Note that `packages/schema/src/id.ts` today has only the regex (`'An id is kebab-case.'`); the `nonEmpty` is still to be added by 13.25, as the comment says.

## Summary of findings

1. The Ctrl/Meta/Alt+arrow "still prevented" sentence fails when focus is in an input, textarea, select or contenteditable (`hotkey-layer.ts:41`; `store.mjs:141` override does not apply). The add flow's own id field is such a case.
2. "Focus inside equals open" has exceptions: focus on `body` after `focusout` with null `relatedTarget` (`FocusScope.js:66-69`); portaled Select, Popover, Combobox and Menu layers inside the dialog; the open and close timing windows.
3. The implementation route is sound: `action(event)` gets the KeyboardEvent, `document` is the listen target, Reka's Esc handling needs the layer not to prevent.
4. Valibot order holds.
