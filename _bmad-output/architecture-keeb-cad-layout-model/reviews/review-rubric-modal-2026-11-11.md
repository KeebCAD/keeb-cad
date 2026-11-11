# Rubric review: modal-owns-the-keyboard amendment (2026-11-11)

Scope: the three changes in the working-tree diff of the spine (AD-26 Shortcuts sentence "A modal owns the keyboard", the Data Schema `Id` comment, the glossary **add flow** row), read against the rest of AD-26, AD-10's `ui` fence, glossary rows UiAction / shortcut registry / invoke path, `.memlog.md` (2026-11-11 entries), EXPERIENCE.md, and `packages/ui/src/hotkeys/hotkey-layer.ts` as built today.

## Verdict

Sound direction, not yet clean. The divergence point it picks (who decides that keys stop acting behind a modal) is the right one and the choice is made in `ui`, where AD-10 allows it, with two rejected alternatives. But the rule is not precise enough to stop two stories building modals incompatibly: its scope word ("modal overlay built on `ui`'s dialog wrapper") is undefined, its two clauses contradict each other on Ctrl chords, the "focus-inside equals open" claim has holes, and it collides with EXPERIENCE.md on Esc and Ctrl+K. Fix the high findings before 13.25 builds it.

## Findings

### H1 (high): "skips a key event" contradicts "a matched Ctrl or Meta chord ... is still prevented"

Spine: "the hotkey layer runs no entry, so every key reaches the modal ... and a matched Ctrl or Meta chord or Alt+arrow is still prevented; the wrapper marks its content element and the layer skips a key event whose target is inside a marked element".

If the layer skips the event, no hotkey is matched and nothing can be "still prevented". In the built layer (`hotkey-layer.ts`) matching, the letter guard, `preventDefault` and `alwaysClaimed` all live in zag's per-command `action`, so the skip must sit inside `action` after the match (return before `#onHotkey` but still `event.preventDefault()` when `alwaysClaimed`), not before zag's dispatch. The sentence says the opposite. Two implementers can read it either way, and one of them leaves Ctrl+D (bookmarks) and Alt+Left (Back) live behind the modal. State where the check sits: "the layer matches as usual; for an event inside a marked element, the matched action does not call the registry and only prevents what `alwaysClaimed` prevents".

Also decide Ctrl+K in the add flow (see H3): is it matched-and-prevented-but-inert (nothing opens) or handed to the modal?

### H2 (high): the rule's scope ("modal overlay built on `ui`'s dialog wrapper") is undefined, so modals can slip out of it

Spine: "while focus is inside a modal overlay built on `ui`'s dialog wrapper"; AD-26 Rule 1 lists "dialog" and "focus trap" as separate Reka widgets. EXPERIENCE.md marks the command palette (line 114) and the cheat sheet (line 116) "Modal". The palette is a combobox in a dialog, the cheat sheet a dialog; the spine never says they use the dialog wrapper. A palette built as a combobox/popover primitive, or any focus-trapping widget not named "dialog wrapper", is outside the rule, and keys act behind it. The sentence closes only dialogs and defers menus ("open for the first menu story"), which is a divergence the next two stories (palette, cheat sheet) hit first.

Also unspecified: whether the wrapper marks non-modal use. The slide-out and violations panel are "Non-modal" in EXPERIENCE.md; if either is later built on the same dialog wrapper (Reka `modal=false` exists) and the wrapper marks unconditionally, their keys die. Say: the mark is set only when the wrapper is modal, and a modal overlay in EXPERIENCE.md (palette, cheat sheet, add flow) is built on it.

### H3 (high): collides with EXPERIENCE.md "Ctrl+K, everywhere" and with Esc precedence

- EXPERIENCE.md line 114: palette "Ctrl+K, everywhere". Under the rule Ctrl+K is dead inside any modal (add flow, cheat sheet) and the spine leaves "keys a modal keeps for itself (Ctrl+K closing the palette)" to the palette story. That is a defensible choice, but the spine should say it narrows "everywhere" and EXPERIENCE.md should follow (opening the palette over the cheat sheet or add flow is now impossible). Otherwise the palette story and the UX doc diverge.
- EXPERIENCE.md Esc precedence (line 235): "One Esc does the innermost step only: (1) cancel a drag ...; (2) close an open dropdown or menu; (3) leave a field ... (5) close an overlay". The spine sentence says "every key reaches the modal and its Reka primitive (an unhandled Esc dismisses it)". That is compatible only if the modal's own widgets handle Esc first (dropdown, field) and stop it; the spine does not require that. Expression field text (line 122) says Esc undoes the step and restores the text; a field inside a modal would, per the rule, get Esc dismissed unless it handles it. State that Esc precedence steps 1-4 are the modal widgets' own handling (stopped before the dialog sees it) so the UX doc and rule agree.
- The memlog records "Esc is not a slide-out shortcut" and an owed EXPERIENCE.md edit; EXPERIENCE.md line 111 ("Non-modal; Esc closes") and precedence step 5 still contradict the spine's premise. Not a spine fault, but the Shortcuts bullet's stated reason "an unhandled Esc dismisses it" rests on a UX doc that has not caught up.

### M1 (medium): "focus inside a modal equals the modal being open" is asserted, not true in general

Spine: "which equals the modal being open because Reka traps focus in a modal". Gaps:
1. Portaled children. A popover, listbox or select opened from inside the modal renders in a Reka portal outside the marked content element, so its key events have a target outside the mark and the global layer acts behind the modal. The rule tests DOM containment, not the Reka layer stack.
2. Focus on `body`. Reka's focus scope does not pull focus back on a focusout with a null `relatedTarget`; a click on non-focusable dialog text can leave `document.activeElement` as `body` while the modal is open, and the event target is then `body`, outside the mark.
3. Open-with-focus-elsewhere. Between mount and Reka's initial focus move, keydown autorepeat of the opening key (G, S) lands before the target is inside.

Either define "inside" as "inside, or in a portal the wrapper also marks" and have the wrapper mark its overlay/portal content, or check the open-dialog state the wrapper owns (a counter or a `data-state=open` mark on `document`) rather than the target. The second is what "a modal owns the keyboard" says; the first is what is written.

### M2 (medium): no enforcement or test is named

AD-26 marks soft rules as "a reviewer rule" elsewhere (e.g. States). This rule is a structural invariant (the wrapper must mark, the layer must honour it) but names no check: no `ui` test requirement, no lint that a modal can't bypass the wrapper. AD-10 does force every Reka dialog through `ui` (only `ui` imports `reka-ui`), which is the real enforcement, but the spine does not say so here. Add: "a `ui` browser test opens the wrapper and presses a registered key; and `editor` has no other dialog route because only `ui` imports `reka-ui` (AD-10)". Without it "13.25 builds it" is the only guarantee and the next modal story can forget the mark's contract.

### M3 (medium): the Id comment states a decision without its rejected alternative

Spine (Data Schema comment): "idSchema checks non-empty ('An id is required.'), then kebab-case ('An id is kebab-case.'), so an empty field and a malformed id each read their own first issue (13.25 adds the non-empty check)". Policy: every decision carries "X, not Y, because Z". The obvious Y is relying on the kebab-case regex to refuse the empty string (one message: "An id is kebab-case." for an empty field), or a form-level check in the add flow. Neither is named. Also "first issue" depends on Valibot collecting both issues for `''` (no abort-early) or on abort-early being on; the comment should say which, because the form reads `issues[0]`. Placement is fine (the Data Schema defines the field before code changes it, as the policy requires).

### L1 (low): AD-26 "Prevents" line is not updated

Spine: "**Prevents:** hand-rolled ARIA widgets; a primitive library leaking into workspace code; two token vocabularies; shortcuts that drift from the design store's entries; styling with ad-hoc values." The new rule prevents "keys acting behind a modal"; add it so the ADR's Prevents list still states what its Rules prevent.

### L2 (low): glossary wording

- "dialog wrapper", "marked element", "modal overlay" and "modal" are not glossary terms, while the add flow row introduces "modal dialog". Pick one word and define it once (a glossary row **modal** with its test: the wrapper in modal mode), then use it in the Shortcuts sentence, the add flow row and EXPERIENCE.md.
- **shortcut registry** and **UiAction** rows do not mention the modal rule; the **shortcut registry** row says it "hands them to `ui`'s hotkey layer while the editor is mounted", which is now "and while no modal is open". Keep the glossary row consistent with the sentence.
- **add flow** row: "a minted id" has no actor ("minted by `model`", per AD-24); "the root" is not defined in the row; the parenthetical "(AD-2, AD-26)" cites AD-2 for "the new node becomes the selection", which is not an AD-2 concern as far as the row shows. Low impact.

### L3 (low): the "G and S open" claim leaves the focus-return behaviour open

The add flow row says confirm runs the command and the new node becomes the selection, but nothing says where focus returns after close (Reka returns to the trigger; for a hotkey open there is no trigger element, so focus lands on `body`, outside every region and out of the F6 landmarks). Two modal stories can pick differently. Not strictly this amendment's job, but it is the same "modal and keyboard" seam.

## Checklist summary

| Check | Result |
|---|---|
| Fixes the real divergence point, misses none | Mostly. Missing: scope of "modal" (H2), portals and body focus (M1), Ctrl+K and Esc vs EXPERIENCE.md (H3) |
| Rule enforceable, prevents stated divergence | Not yet: H1 contradiction, M2 no named check |
| Nothing left open that lets units diverge | Menus deferred explicitly (fine, named); non-modal use of the wrapper not (H2) |
| No contradiction with spine | Internal contradiction H1; consistent with AD-10 `ui` fence (the wrapper can't reach `editor`'s `di`, correctly used as the reason) and with UiAction / shortcut registry / invoke path rows |
| Rejected alternatives present | Modal sentence: yes, two ("not each UiAction checking ...", "not an `editor` service ..."). Id comment: no (M3). The third rejected option in the memlog (leave it out) is not in the spine, fine. |
| Glossary terms | Partly (L2) |
| EXPERIENCE.md | "No focus traps except modal overlays" is consistent (the rule leans on Reka's trap). Ctrl+K "everywhere" and Esc precedence are not (H3) |

## Angles worth a look (📐)

📐 The rule is verified against what Reka does today (DismissableLayer, no `aria-modal`), but a skipped-event design makes `ui`'s hotkey layer depend on a Reka behaviour (focus trap) for correctness. A wrapper-owned open flag is independent of that and also solves M1; the memlog does not record why the target-containment test was chosen over it.

☝️ The memlog's justification "Esc on a focused button runs CloseSlideOut first, prevents it, and Reka's DismissableLayer.js:72-77 then doesn't dismiss" is the actual bug; the direction to stop Esc closing the slide-out removes that instance. Check that the modal rule is still needed for the other keys (digits, T, F, F6 acting behind a modal), which it is, but the spine should cite those, not Esc alone, as its reason, so a later story doesn't drop the rule when Esc is fixed elsewhere.
