# Adversary review: simpler keyboard rule (AD-26 Shortcuts, glossary "modal"), 2026-11-11

Scope: spine line ~707 ("Shortcuts act only on the editor's own surfaces", the chord sentence), glossary row **modal**, against EXPERIENCE.md (Esc precedence l.235, Focus and regions l.237, Shortcuts l.239, Binding field l.126, Expression field l.122, Autocomplete l.123, Context menu l.115, Toast l.104). Nothing was changed.

Verdict: the rule is sound for dialogs and fields, but its two sensors ("a focused text field", "editor root is aria-hidden") are not defined sharply enough, and EXPERIENCE.md still states the opposite policy in three places. Two units can each obey the spine and ship incompatible or harmful results. Four findings matter; one is high.

## F1 (High) "A field keeps every key" deletes the global Ctrl chords EXPERIENCE promises, and Ctrl+S in a field opens the browser's Save Page dialog

EXPERIENCE l.239: "With any field focused, every canvas and single-key command is off; only Ctrl+K, Ctrl+S, Ctrl+Shift+S, Ctrl+O and Ctrl+Z/Ctrl+Shift+Z stay global." Binding field l.126: "Ctrl combinations always reach the app and are never captured." The spine now says the opposite: a focused text field keeps every key, the layer prevents nothing, and the accepted cost names only Ctrl+D and Alt+Left.

- Unit A (expression field, obeys the spine): Ctrl+S typed in the field reaches the browser. The design is not saved, and Chromium opens Save Page As. Ctrl+K opens nothing, so the palette is unreachable from every inspector field, and with it "a command dispatched while a field holds an unapplied valid value applies it first" (l.122) loses its main trigger. Ctrl+O likewise opens the browser's file dialog, not the app's.
- Unit B (the palette/File story, reads EXPERIENCE): it expects Ctrl+S to work from a field and writes an e2e for it. It conflicts with A and the spine.
- The accepted cost list understates the loss: it is the save chord, not just bookmarks.

Closing sentence (spine, after "an accepted cost"): "The app's global chords Ctrl+K, Ctrl+S, Ctrl+Shift+S and Ctrl+O are the exception: a text field does not keep them, the layer runs and prevents them there, and Ctrl+Z, Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X stay with the field." Otherwise strike l.239's list and l.43 "Ctrl+K everywhere" from EXPERIENCE and say plainly that Ctrl+S in a field is the browser's. The memlog already marks the "a rule per corner case" cost as rejected, so this is the user's call, but the user should see it as a decision about saving, not about bookmarks.

## F2 (High) "Binding field": a field that is not a text field, and a rule that contradicts its own row

The Binding field is a keycap-capturing widget, most likely a focusable div or button, not an `<input>`. The rule's gate is "a focused text field or editable element". Two stories can both obey:
- Unit A builds it as a `div tabindex=0` with its own keydown handler. It is not a text field, so the hotkey layer still runs. Pressing `G`, `T`, `1` to bind them also switches workspace or opens the slide-out unless A's handler stops propagation before the layer. Order of listeners (layer on `document`, handler on the element) is unspecified; if the layer listens in the capture phase it wins.
- Unit B builds it as a readonly `<input>` so it counts as a text field. The layer is silent, so plain keys are captured, but now Ctrl+K, Ctrl+S, Tab and Esc all stay with the field (F1), which contradicts EXPERIENCE "Ctrl combinations always reach the app" and "Esc always leaves the field". Esc working relies on B's own handler, and Tab advance is B's too.
Both obey the rule; the user sees either workspace-switching while binding or dead Ctrl chords.

Closing sentence: "A binding field is a text field for this rule: the layer treats it as one (it carries `data-captures-keys`, or role=textbox), and the field itself implements Tab, Esc and the Ctrl chords of F1 by calling `invoke` or the layer's exported `isEditing()`." Better: define the gate as one exported predicate in `ui` (`keepsKeys(el)`), not "text field or editable element" prose, so units cannot build their own.

## F3 (Medium-High) The modal signal is "editor root is aria-hidden", which only holds for a portaled modal; the inline autocomplete and any in-root popover break it both ways

`useHideOthers` marks siblings along the ancestor chain of the content; it never hides an ancestor. The editor root becomes aria-hidden only if the modal content is portaled outside the root. 
- Unit A (expression field with Reka Combobox, content rendered inline in the inspector, inside the root): the Combobox is on the spine's modal list and hides "the rest of the page", yet the root is not hidden, so the layer keeps running. Typing `g` into the combobox input is covered by the text-field gate, but Esc, Enter, arrows and Tab are not hotkeys here; Delete/Backspace of a selected suggestion is fine. What breaks: with the dropdown open, Escape precedence (l.235 step 2 then 3) is handled by Reka, but a Ctrl chord or F-key is still claimed by the layer. Inconsistent with a portaled Dialog.
- Unit B (same field, Combobox portaled): the root goes aria-hidden while the field is being typed in. Effects: toasts and the status strip are hidden to screen readers during every typing pause (l.122's 300 ms apply), the unapplied-value error message (aria-describedby on a hidden node) is not read, and the `invalid` text is lost to AT. Also F1's Ctrl+S stays dead.
- Timing: `aria-hidden` is set in an effect after mount and removed on unmount, often after exit animation. Keys pressed in that gap are claimed or dropped wrongly (a Delete pressed on the frame the dialog closes deletes the node, or the first key after open leaks to the canvas). The memlog notes key repeat across a modal opening as deferred; this makes it structural.
- Also: the "inline autocomplete hides the page" cost is a product decision nobody made. EXPERIENCE l.123 describes a dropdown, l.237 says dropdowns, menus are non-modal.

Closing sentence: "A Combobox used as an inline autocomplete is rendered non-modal (Reka's `modal=false`/no `useHideOthers`) and keeps the page; the glossary's modal list applies to the add flow, palette, cheat sheet and Part picker only. Every modal is portaled to `document.body`, outside the editor root, and the hotkey layer reads the root's aria-hidden at keydown time, not from a cached state." Also reword glossary: "which hides the rest of the page" is a consequence, "built on Reka" is the definition, and the list should be an enumerated list of surfaces, not primitives.

## F4 (Medium) Context menu opened by Shift+F10 / Menu key: two openers, and "modal Menu" contradicts EXPERIENCE l.237

Browsers fire a native `contextmenu` event on Shift+F10 and the Menu key, at the focused element. Reka's ContextMenu opens on that event.
- Unit A (context-menu story): binds Shift+F10 and Menu as UiAction hotkeys (per EXPERIENCE shortcut table l.253). The layer opens the menu and, because the entry ran, prevents the key. Good, but the canvas has no position for it, A invents one (selection centre).
- Unit B (Reka ContextMenu on the canvas, trusting the native event): never uses the hotkey; the layer's Shift+F10 entry is unavailable or absent, nothing is prevented, and both openers fire when both exist: menu opens twice or opens at the pointer-less (0,0).
- Policy conflict: the context menu is `modal` by Reka's default, so it hides the page and keeps every key, including Esc; EXPERIENCE l.237 lists menus as non-modal "do not trap focus", and Esc precedence step 2 vs 5 assumes menus are not overlays. If B's ContextMenu is modal=false for that reason, the layer keeps running while the menu is open, so `Delete` pressed in the menu deletes the node instead of the menu item. The spine says "a modal Menu"; it never says whether the editor's menus are modal.

Closing sentence: "Menus (context menu, top-bar menus) are modal Reka menus; Shift+F10 and the Menu key are not hotkeys of the layer: the native contextmenu event they raise is the one opener, and a pointer-less event opens at the focused item." and edit EXPERIENCE l.237 to move menus to the modal list.

## F5 (Medium) Nothing focused, and the first key after a modal closes

The rule says shortcuts act "only on the editor's own surfaces" but defines the surface by what is focused (text field) or hidden (modal). With focus on `document.body` (click on empty chrome, a confirm button that unmounts, the invoker removed while the modal was open, a toast dismissed), neither exclusion applies, so the layer runs: G, T, Ctrl+D fire. But Delete/nudge need "focus on the canvas" (13.24), so a Delete pressed with body focus does nothing, while T opens the slide-out. Two stories read "editor's own surface" differently: the add-flow story (13.25) says body-focus is outside the editor and routes nothing; the slide-out toggle story says T always works. The memlog already records "a confirm button that becomes disabled drops focus to body" as a risk; the rule does not say what keys do then.

Closing sentence: "With focus on the document body inside the editor page the layer runs (body counts as the editor's surface); a focus-dependent entry reads the focused place and is unavailable there." And in EXPERIENCE: "closing a modal returns focus to the invoker, else the canvas" must include the unmounted-invoker case.

## F6 (Low-Medium) Toasts under a modal, and a hotkey handler mid-flight when a modal opens

- Toast: `role=status` toast raised while a modal is open is aria-hidden by `useHideOthers` (known deferred low). Concrete bad result: the add flow's confirm fires a command whose `rejected: <what>` toast (l.208) is the only error output, and the modal is still open or just closed, so a screen-reader user hears nothing. Closing sentence: "Toasts render in a live region portaled outside the editor root and registered with the modal as an allowed element (Reka `hideOthers` is given the live region), or a rejection raised from a modal shows in the modal."
- Mid-flight: `invoke` returns `AsyncResult`; a hotkey's handler awaiting a command (a long export, a save) is running when the user opens the palette. When it settles, its toast or focus restore ("closing returns focus to the invoker") steals focus from the modal, and a result handler that opens a second modal stacks two Reka layers with a single aria-hidden count. The rule only governs the key arriving, not a continuation. Closing sentence: "An entry that settles while a modal is open shows its toast only and moves no focus; an entry does not open a modal from its continuation."
- Key repeat of a held G/T/Esc across opening or closing is already deferred; add the held-key `e.repeat` rule to the same sentence.

## Not holes (checked)

- Ctrl+Z native in fields: consistent with EXPERIENCE l.122 and the new rule.
- Pick modes and the slide-out toggle are canvas-focus and no-modal respectively; they need only the T/Esc EXPERIENCE edits already owed to Sofia (l.111, 235, 237, 248).

## Owed EXPERIENCE edits the rule now contradicts

l.43 "Ctrl+K everywhere"; l.126 Binding field (Ctrl combinations reach the app); l.237 modal and non-modal lists (add flow, menus, Combobox); l.239 "only Ctrl+K ... stay global".
