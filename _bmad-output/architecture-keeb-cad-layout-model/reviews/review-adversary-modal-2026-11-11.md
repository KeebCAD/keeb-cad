# Adversary review: "A modal owns the keyboard" amendment (2026-11-11)

Scope: AD-26 Shortcuts sentence "A modal owns the keyboard", the Data Schema Id comment (idSchema non-empty), the glossary's add flow row. Code read: `packages/ui/src/hotkeys/hotkey-layer.ts`, `packages/editor/src/shortcuts/shortcut-registry.ts`, `packages/editor/src/slide-out/close-slide-out.ts`, `packages/editor/src/landmarks/landmarks.ts`. Nothing was modified. Reka behaviours are taken from the memlog's cited evidence and from knowledge of Reka UI, not re-run; those claims are marked "verify".

Verdict: the rule fixes the one case it was written for (focus on a button inside a wrapper-built dialog, Esc, digits, T, F6) and leaves several holes where two compliant units still break. The mechanism is "event target is inside the wrapper's marked content element". Every hole below is a way for that test to be false while a modal is open, or for the rule to not cover a modal.

## Findings

### H1 (High). The rule's promise about Ctrl/Meta chords and Alt+arrow is false inside a field, which is the add flow's only focus target
The sentence says "a matched Ctrl or Meta chord or Alt+arrow is still prevented". `HotkeyLayer` registers with `enableOnFormTags: false`, so zag never calls `action` for a keystroke whose target is an input. `alwaysClaimed` lives inside `action`. So with focus in the add flow's id field, Ctrl+D (bookmark), Ctrl+K (Firefox search bar), Alt+Left (browser Back, which leaves the SPA and drops unsaved work) are not prevented. Today's code already behaves this way; the amendment states the opposite and 13.25's test ("focus on a button in the modal, press Alt+Left") would pass while the field case, the one the person is typing in, fails.
Pair: unit A (hotkey layer, built to the letter of "skip inside the mark, prevent chords") and unit B (add flow, one text field).
Close: either say "except in a text field, where the browser's own meaning stands (`enableOnFormTags`), and a field's own Esc/Enter are the modal's", or require the layer to claim the chords on a capture-phase check before zag's form-tag filter. Choose one and name it; add a test row for field focus.

### H2 (High). "Built on ui's dialog wrapper" excludes the palette, the cheat sheet and anything on a different Reka primitive
Line 1272 of the spine says the palette is a Reka combobox that puts `aria-hidden` on the page ("right for the modal palette"). A palette built on `ComboboxRoot`/`ComboboxContent`, a cheat sheet built on a Popover with `modal`, or an alert/confirm built on Reka's AlertDialog is a modal by every user-visible measure but is not "built on ui's dialog wrapper", so it gets no mark and the global layer keeps running behind it. Combobox does not trap focus, so even a mark would not equal "open" there.
Pair: palette story (combobox, listbox items focusable by arrow) and add flow story (dialog wrapper); each obeys the AD, the palette lets T, digits and F6 act on the design behind it when focus is on a listbox row rather than the input.
Close: "Every `ui` overlay that hides the page (`aria-hidden`/`useHideOthers`) or traps focus marks its content with the one attribute the layer reads, whichever Reka primitive it wraps; a story builds a modal only from such a wrapper." Define the mark as a `ui`-owned constant (data attribute) so the layer and all wrappers share it.

### H3 (High). Portaled overlay content inside a modal is outside the marked element
Reka portals Select, Popover, Combobox, DropdownMenu, Tooltip and Toast content to `body` by default. A Select/Combobox/Popover opened from inside the add flow (a later modal with a part picker is certain) moves focus into content that is not a descendant of the dialog's content element. The layer's containment test is false, so hotkeys fire behind the modal; Reka typeahead in that list and the global hotkey both act on the same letter (T toggles the slide-out and jumps the list). If the registry has `Escape` on any UiAction (selection clear, per EXPERIENCE Esc precedence step 6), Esc is run on document before Reka's window listener, prevented, and the Select does not close: the exact bug the amendment fixed for dialogs.
Pair: `ui` Select wrapper (portals to body, correct per Reka docs) and a modal story using it.
Close: "A `ui` overlay opened from inside a modal portals into that modal's content element (or carries the same mark)". Prefer the mark on all `ui` overlay content, plus the rule "an overlay inside a modal portals into it". Toasts and Tooltips are exempt from the mark only because they take no focus; say so (Toast has Reka's default F8 viewport hotkey, which pulls focus out; the wrapper must set `hotkey` to the editor's own or none).

### H4 (Medium-High). Menus and popovers that trap focus are explicitly left open, and the open item leaves no interim rule
"Whether menus that trap focus join the rule is open for the first menu story." The first menu story cannot comply either way. Pair: context menu story (Shift+F10, items "Add group...") and the add flow.
- With the menu open and not in the rule, G/T/digits act while the menu is open, Reka menu typeahead and a letter hotkey both fire on one key, and Esc goes to any Escape-bound UiAction first and is prevented, so the menu stays open (EXPERIENCE Esc precedence step 2 breaks).
- Choosing "Delete" or "Add group..." from the menu closes it, Reka's `onCloseAutoFocus` restores focus to the trigger, then the add flow opens (see H5).
Close: a default now, e.g. "Any `ui` overlay that holds focus (menu, context menu, popover, select, dialog) marks its content and the layer runs no entry inside it; the first menu story may narrow this, with its rejected alternative." Open items should state which behaviour holds until decided.

### H5 (Medium-High). A modal opened by an entry run from another overlay (palette, context menu): focus-return races the new modal
Palette or menu runs `AddGroup` through the invoke path; the add flow mounts while the palette is closing. Reka's `onCloseAutoFocus` returns focus to the previously focused element (canvas), possibly after the dialog's auto-focus, so focus sits outside the new dialog for a tick or permanently (Reka's trap pulls it back only on a later focusin; verify). In that window "focus inside equals open" is false and the global layer runs. The same race breaks every palette entry that moves focus: F6 landmark cycling invoked from the palette (`Landmarks.focusNext` sets focus, then the palette's close restores the old focus over it), `Open tree`, "focus canvas".
Pair: palette story and add flow story, each compliant.
Close: "An overlay closes, and its focus return completes, before the entry it started runs" or "a wrapper's `onCloseAutoFocus` is prevented when the entry moved focus; the invoke path is awaited after close". Add: "a modal opened from another overlay opens after that overlay has closed; modals do not stack", and state the nested case explicitly (below).

### M1 (Medium). Nested modals and non-wrapper modals
The rule says nothing on stacking. A confirm ("discard id?") inside the add flow, or the palette opened from inside a modal (Ctrl+K is skipped in a modal, so it can't, but the F1 cheat sheet and the palette entry in a menu inside the modal can). Reka stacks DismissableLayers correctly (inner Esc closes only the inner), and both are marked, so keyboard works; but the Data Schema/AD text does not say whether stacking is allowed, and EXPERIENCE says "No focus traps except modal overlays". Two stories will decide differently (one stacks, one closes the first).
Close: "At most one modal is open; opening a modal from inside one is refused (`available` false) except a confirm built by the same wrapper", whichever Sergii prefers, stated.

### M2 (Medium). Keys a modal wants for itself: F1, Ctrl+K, F6 are skipped but not claimed
The layer skips and does not prevent non-chord keys inside a modal. F1 inside a modal reaches the browser's Help (Chrome on Windows/Linux opens a help tab; the cheat sheet, F1's owner, is thereby unreachable from a modal and the browser reacts instead). F6 moves focus to the address bar out of the page (Reka's trap does not stop browser chrome). Ctrl+K is claimed (chord) and does nothing unless the modal handles it. The sentence defers Ctrl+K to "that modal's own key handling", but no one owns F1/F6.
Close: "While a modal is open the layer still prevents F1 and F6 (it runs no entry), as it does Ctrl chords", or state that F1 and F6 reaching the browser is accepted. Also say whether the cheat sheet can open over the add flow (answer is no under the current rule; say so).

### M3 (Medium). Esc inside a modal with an Esc-owning widget
Rule: "an unhandled Esc dismisses it". EXPERIENCE: Esc "undoes the field step and restores the text" (expression field, Esc precedence step 3) and "closes a dropdown" before an overlay (step 5). Reka dismisses on window `keydown` unless `defaultPrevented`; a field in a modal must `preventDefault` its handled Esc, or Esc closes the dialog and discards the field. The AD says nothing; two stories (an expression field in a modal, a Select in a modal) will differ. Today the add flow's id field has no step-3 behaviour so 13.25 is fine; the next modal with an expression field breaks.
Close: "A widget that consumes Esc (field restore, open dropdown) calls `preventDefault` on that Esc; a modal's Esc dismisses only when no inner step claimed it; the `ui` field and select wrappers do this".

### M4 (Medium). Add flow confirm: outcome on a rejection and focus loss to body
Glossary says "confirm runs the command through the invoke path; the new node becomes the selection". Not stated: when the command still returns a Rejection (design closed, race), does the modal close, stay with the reason, or toast? A toast portaled outside the modal is aria-hidden by `useHideOthers` while the modal is open, so a rejection toasted while the dialog is up is invisible to screen readers; a toast after close with the pre-filled text lost loses the person's work. Related: confirm disabled while focused (or removed on submit) can drop `document.activeElement` to `body`; the layer's target is then outside every mark and keys act behind the modal until Reka's trap refocuses (verify disabled-button case; Reka's FocusScope observes removal, not disabling).
Close: "On a Rejection at confirm the modal stays open and shows the reason in place of the field's; it closes only on ok" and "a control that disables itself while focused hands focus to the field first (`aria-disabled`, not `disabled`, for confirm)". The last also keeps it focusable for the reason.

### L1 (Low). Key repeat across the open/close boundary
Holding G opens the add flow on the first keydown; repeats arrive after focus moves into the id field (or, before the field mounts, to the canvas and re-run `invoke(AddGroup)`). Holding Esc closes the modal and repeats hit CloseSlideOut/selection clear behind it. Same for T flapping the slide-out. Close: "the layer ignores `event.repeat` for entries that open or toggle", one sentence in the layer's matching rules.

### L2 (Low). Non-modal usage of the wrapper
The mark is on the "content element" of the wrapper, whatever its `modal` prop. A story using `modal=false` (a floating panel) gets the keyboard-owning behaviour without focus trap, so the claim "mark equals open" breaks and hotkeys die over a panel that is meant non-modal. Close: "The dialog wrapper is modal only; `modal=false` is not exposed".

### L3 (Low). idSchema non-empty check
`idSchema` is shared (23.2 meta.id, import validation). A pipe of non-empty then kebab-case reports both issues on an empty string unless the pipe aborts early; the rejection-text rule takes "first issue", so only that order matters. A loaded file with an empty id now reads "An id is required." instead of the kebab message: a user-visible change to error text for design-file loading that the comment does not list. Close: say "abort early so the empty string yields one issue" and list the consumers whose text changes.

### L4 (Low). Modal selection/parent timing
Already left to 13.25 planning (parent fixed at open or live); with the modal owning the keyboard no input can change selection while it is open, so "fixed at open" is the consistent answer and costs nothing; say so to avoid a plan writing a live-parent subscription. Not a hole, a free closure.

## Checks that held
- Esc with focus in the id field: zag form-tag filter keeps the registry out, Reka dismisses. Esc on the dialog's button: now skipped by the mark and dismisses (the previous CloseSlideOut-first bug is fixed for the wrapper case).
- F6 with a modal open: `Landmarks.focusedPlace()` returns none (modal is portaled outside every landmark) and the layer skips, so landmark cycling is inert; only the browser default remains (M2).
- Ctrl+Z on a modal button is prevented, so the design behind the modal is not undone; in a field the native text undo stands (but see H1 for the other chords).

## Suggested sentences (compact)
1. "Every `ui` overlay that traps focus or hides the page marks its content with one `ui` constant attribute; the hotkey layer skips a key whose target is inside a mark, and an overlay opened from inside another portals into it."
2. "The layer's chord claim (Ctrl/Meta, Alt+arrow) holds in a text field too; F1 and F6 are prevented while a marked overlay is open." (or the explicit exception)
3. "An overlay closes and returns focus before the entry it started runs; at most one modal is open."
4. "A widget that consumes Esc calls `preventDefault`; a modal's confirm stays open with the reason on a Rejection."
5. "The layer ignores `event.repeat` for opening and toggling entries."
