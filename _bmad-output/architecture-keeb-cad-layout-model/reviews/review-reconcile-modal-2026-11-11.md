# Reconcile review: modal-owns-the-keyboard amendment (2026-11-11)

Scope: the working-tree diff of the spine (three hunks: glossary row `add flow`, AD-26 Shortcuts sentence, Data Schema `Id` comment) against the memlog entries from "2026-11-11 update run opened", ticket 13.25, its draft plan, EXPERIENCE.md and the tickets.

## Verdict

The amendment lands the three memlog items (modal rule, idSchema non-empty, glossary add flow) and invents almost nothing. One drop (a rejected alternative), one internal contradiction left in the spine, and a set of updates owed downstream: the 13.25 plan and verify, EXPERIENCE.md, and 23.8's ticket and plan (the slide-out toggle).

## 1. Dropped or stated differently (memlog/plan -> spine)

1. **Rejected alternative dropped (medium, policy).** The memlog rejects three options; the spine states two (each UiAction checking in `available()`; an editor service each modal registers with). It drops "leaving it out", with its reason: Esc on a focused button runs CloseSlideOut first and prevents it, so Reka's DismissableLayer (`DismissableLayer.js:72-77`, listening on `window`) never dismisses. AGENTS.md: a spine sentence that chooses between options gives "X, not Y, because Z". That third Y is also the strongest "why" for the rule. The spine says only "an unhandled Esc dismisses it" and never says why the rule is needed. Add it, in one clause.
2. **"The hotkey layer stays global" left standing (medium, contradiction inside the spine).** The same bullet still says "the hotkey layer stays global, and each UiAction decides whether focus matters". The new sentence makes the layer skip events inside a modal. Reword to "global except inside a modal (below)". The `shortcut registry` glossary row and the glossary line "hands them to ui's hotkey layer" say nothing of the skip, which is fine if the Shortcuts bullet is the one place.
3. **Narrower scope than the memlog's words (low).** The memlog says "a modal overlay built on ui's dialog wrapper"; the spine says the same. But EXPERIENCE.md line 237 names the palette, cheat sheet and Part picker as modal overlays that trap focus. Palette and Part picker are comboboxes, so they are probably not built on the dialog wrapper, and the rule does not cover them. The memlog defers the palette (Ctrl+K) and menus, so this is consistent, yet the spine's "modal" reads wider than "dialog-wrapper modal". 📐 The first non-dialog modal inherits the gap silently; the "open for the first menu story" sentence covers menus only, not the palette or Part picker built on Combobox.
4. **Deferral turned into a statement (low).** The memlog defers "keys a modal keeps for itself (Ctrl+K closing the palette)" to the palette story. The spine states "are that modal's own key handling". That is a decision no input made. Soften to "left to the palette story".
5. **Dates and attribution (low).** The spine does not carry "Sergii 2026-11-11" on the modal rule, though the Shortcuts bullet marks its chord rules "(decided 2026-11-06)". The Data Schema comment also omits the date. Optional.
6. **The Esc/slide-out decisions and the toggle direction are not in the spine.** Right: the spine has no mention of CloseSlideOut or T, and the memlog says "Owed: EXPERIENCE.md edit and a code change", not a spine edit. No drop.

## 2. Invented (the amendment says what no input decided)

- Glossary `add flow`: every clause traces to ticket 13.25 and the plan, with one exception. It omits the multi-select rule (several ids selected -> root) that the plan decides. That is right to omit (a plan decision, deferred to 15.4), but then "the selected group, else the selected slot's group, else the root" is wrong as a general statement for several selected ids. Add "(one selected id)" or leave it to the plan. Medium-low.
- Glossary `add flow` ends "(AD-2, AD-26)": plausible, not invented.
- "(it sets no `aria-modal`, so the mark is the wrapper's own)", "a matched Ctrl or Meta chord or Alt+arrow is still prevented", "Non-modal surfaces (slide-out, violations panel, inline autocomplete) keep the global layer": all in the memlog decision. Not invented.
- "(13.25 builds it)": from the plan; fine.
- Data Schema comment: matches plan row 4a (first issue). The empty string also yields the kebab issue second; "each read their own first issue" is accurate.
- No invented decisions otherwise.

## 3. Owed downstream

### 13.25 plan (draft)
- **Open Question 1 is answered by the spine:** option A, the plan's own pick. Move it into frozen Decisions as "Decision (Sergii 2026-11-11)", with the rejected options (B: only G and S off; C: leave it out). Remove the "waits on a bmad-architecture pass" status. The Code Map line on `hotkey-layer.ts:41` ("global") needs the new rule.
- **No task or row builds the rule.** The plan needs: (a) `UiDialog` marks its content element (task text lists title/open only; row 24 tests only title + Esc emit); (b) `ui`'s hotkey layer skips a key whose target is inside a marked element, but still prevents Ctrl/Meta chords and Alt+arrow; (c) boundary rows at `ui` level (key in marked element runs nothing, outside runs; Ctrl+D inside is prevented; Esc inside reaches Reka and closes), and an `editor` row (T/digit/F6 with focus on the Add button does nothing). Toggled bugs for the Acceptance list: the mark dropped, the skip dropped, the chord prevention dropped. Row 26 (Esc closes, focus back on the canvas) now depends on this and should name the focus-on-button case.
- Docs task: its spine items (Data Schema, glossary) are done. Remove them from the on-main checklist, leaving DESIGN.md, component-ownership.md (no Add flow / Text field / Dialog rows yet).
- "Never: focus management beyond what the dialog primitive gives" stays valid.

### Ticket 13.25 (tickets.toml)
- **verify has no step for the modal rule:** add "with the dialog open, T, 1-5 and F6 change nothing and Esc closes it, also with focus on the Add button".
- verify still says G "appearing on the canvas" for an empty group (plan Q2: Sofia rewords; still owed).
- Description says "the build halts with a small side-by-side preview ... DESIGN.md gains the component once he approves": the preview is done (option B chosen 2026-11-11); reword to past tense or state the decision. Description should name the modal dialog.

### Slide-out toggle (EXPERIENCE.md and 23.8)
- **EXPERIENCE.md line 111** ("T opens it ... Non-modal; Esc closes"), **line 248** (shortcut table, "T | Slide-out"), **line 397** (changes list, "T opens the last-used tab") and **line 235 Esc precedence step 5** ("close an overlay (palette, cheat sheet, slide-out, violations panel)") contradict "T toggles; Esc not a slide-out shortcut". Edit: T toggles, drop "Esc closes" and the slide-out from step 5. The palette `Open tree` command stays.
- EXPERIENCE.md line 237 lists the modals (palette, cheat sheet, Part picker) and has no add-flow dialog; add it, with DESIGN.md's Add flow component. Line 237's "closing returns focus to the invoker, else the canvas" also covers toggle-closing by T; check the wording.
- EXPERIENCE.md "Ctrl+K palette everywhere" (line 43) now has an exception: with the add flow open, Ctrl+K is prevented but does not open the palette. Add a note.
- **Ticket 23.8** (`epic-a-new-design-opens/tickets/tickets.toml:237-238`, "the Tree slide-out shell (T, Esc ...)", verify "T opens the tree slide-out and Esc closes it") contradicts the toggle direction. Its built plan (`story-the-editor-frame-shows-the-design-plan.md` lines 33, 58, 178-179, 227, 240-242) records "T while open is unavailable, not a toggle, because EXPERIENCE.md ... Esc closes", which the decision overturns. The tickets and plan of a merged story keep history; the new Sofia story (refactor sweep) carries the code change, but the ticket text should gain a "superseded by" note. The `OpenTree`/`CloseSlideOut` classes and the specs on focus return (plan lines 240-242: "T, Esc") move with that story.
- Other tickets: no other `tickets.toml` mentions Esc closing the slide-out or CloseSlideOut. Drag keys (15.x) and the Expression field (Esc) use Esc for other steps, unaffected. 13.24's ticket mentions the Tree tab only.
- Independence: 13.25 no longer depends on the Esc change (memlog direction). The new story must not claim "after 13.25" ordering; it should be `after` 23.8 only.

## 4. Angles (📐) and a flag (☝️)

- 📐 Focus-inside as proxy for "open": a Reka modal traps focus, but between a G press and Reka moving focus into the dialog (and in the frame after close), the target is still outside. The spine's "equals the modal being open" is true only after focus lands; the plan's Row 9/26 tests should wait for the dialog's focus before pressing keys.
- ☝️ "A matched Ctrl or Meta chord or Alt+arrow is still prevented" inside a modal: prevention without running swallows Ctrl+L, Ctrl+W etc. only if they match a registered hotkey, so only registered chords. That is what the memlog intends; the spine sentence could say "a registered chord" to avoid reading as every chord.
