# Review: ticket 25 (13.25) against the amended spine, 2026-11-11

Scope: ticket `id = 25` in `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/tickets.toml`; the uncommitted diff to the spine (two edits: the **invoke path** glossary row, line 129, and the AD-26 Shortcuts bullet, line 705). Nothing changed.

## Verdict

The amendment answers the `unknown`. A builder can meet every listed requirement. Three things are left open or quiet, none blocking:
the ticket still carries the stale `unknown` and does not list the `available` boolean-to-Result change as its scope; the "whoever built it" clause quietly reverses the rule's own rationale for selection UiActions; and the empty-id case is only met if the form sends `""` rather than omitting `id`.

## (1) Does the amendment answer the `unknown`?

Ticket `unknown`: "The add flow needs the availability reason as you type, parse failures included (id-taken; a malformed id's schema message), but the spine's invoke.available(handle, input?) is a boolean that answers true on a parse failure ... Which query returns the Result is a spine question".

Spine now (line 705): "Its `available(handle, input?)` is the one availability query the UI reads, returning `Result<void, Rejection>` (ok means available, and keys and menus read ok as enabled)" and "A parse failure of input the caller passed, whoever built it (a form's typed text, a selection UiAction's routed input), is an `input-invalid` refusal from both, carrying the schema's issues, so a form disables its confirm and shows the reason as you type (13.25's add flow)".

Yes, fully. `invoke.available` itself returns the Result, so no second query is needed. `input-invalid` carries `issues: SchemaIssue[]` with a `message` (Data Schema, Rejection type), and `id-taken` arrives as a `ModelRejectionKind` with `message`, so both reasons exist as data. `Result` (not `AsyncResult`) means the check is synchronous, which suits per-keystroke use.

Left open (small):
- Which issue the field shows when `issues` has several, and how a `Rejection` becomes `disabledReason` text. The spine says "The design store's own kinds carry no message: editor writes their text from the kind"; for `input-invalid` that means picking from `issues`. Only the id field is typed, so one issue is likely, but the choice (first, not joined) is the builder's.
- The ticket's `unknown` should be removed or rewritten, and its description should name the scope the spine assigns it: "13.25 changes `available`'s answer from a boolean to this `Result`". 13.24 built the boolean (line 705: "13.24 builds these changes in `editor`: ... `available(handle, input?)`"), so the hotkey layer's check, the registry, selection UiActions' `available()` and 13.24's tests that assert a boolean all need updating in 13.25. The ticket's description says nothing about this.

## (2) Requirement by requirement

| Requirement (ticket, verbatim) | Spine lets a builder meet it? |
|---|---|
| "on a refusal, disables confirm and shows the reason (id-taken ...)" | Yes. `AddGroup`/`AddSlot` `available(design, input)` returns `id-taken` from `checkAddNode` (ticket and line 230: "a given one is refused when the design already has it"); `invoke.available` passes the command's refusal through ("a refusal is the check's own rejection"). |
| "or a malformed id's schema message" | Yes. `idSchema` is `v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'An id is kebab-case.')` (packages/schema/src/id.ts); a typed `"Foo Bar"` type-checks as `string` (InferInput), so it "can't [be] see[n]" by the compiler and reaches the refusal, as line 705 says ("only what it can't see (a pattern or length refinement) reaches that refusal"). |
| "clearing the field to an empty id" (verify: "so does clearing the field to an empty id") | Yes, with a catch. `""` fails the regex, so it is `input-invalid` with 'An id is kebab-case.' But `AddGroup` takes `{ parent?, index?, id?, ... }` and "an omitted id is minted" (line 230), so an omitted id makes `available` ok and Enter would add a minted node. The spine does not say the form must send the field's value as is (`""`), never omit an empty field. Builder must know; worth one sentence in the ticket. |
| "disables confirm" | Yes: confirm reads `available(...)` ok/Err. |
| "Enter adds nothing" (verify: "Enter adds nothing") | Yes. `invoke` repeats the same checks (parse, then availability), so a refused Enter changes nothing even if the handler forgot to gate. Better to gate Enter on the same query, otherwise the refusal surfaces as the invoke path's usual error (toast) instead of silence. The spine does not say which; ticket only demands "adds nothing". |
| "keeping the typed text" | Not contradicted, not addressed. It is editor UI state of the flow; a refusal never closes or resets it. No spine conflict. |
| "pre-filled with a minted id and editable before commit" (verify: "the id field holds a minted id, and an edited id is the one committed") | Yes: line 230 "the UI's add flow pre-fills a minted id the user may edit before it is committed". A pre-filled minted id must itself be ok, else confirm starts disabled; the mint is free by construction. |
| "Confirm runs the command through the invoke path" | Yes: `invoke(handle, input)` with the caller's input. |
| "G and S are UiActions that open an add flow" | Fits the UiAction definition ("changes UI state (workspace, panels, focus)"). Its `apply` returns ok after opening; the commit is the flow's confirm calling `invoke` on `AddGroup`/`AddSlot`. The selection-operation paragraph (apply "runs that command through `invoke`") does not describe G/S, but does not forbid them. |
| "act with focus on the canvas or in the slide-out's Tree tab" / verify "with focus in the top bar, G and S leave the design unchanged" | Covered by the existing 13.24 rule (focus read from `Landmarks`, "each UiAction decides whether focus matters"). Unchanged by the amendment. |

Contradictions with the ticket: none found.

## (3) Quiet requirements and wording problems

1. **Reversed rationale for selection UiActions.** The same paragraph keeps "so a malformed built input surfaces as an error when used instead of hiding as a greyed item; not a refusal, because the bug would then hide" for input "the path built", but then makes "a selection UiAction's routed input" a caller-passed input whose parse failure is an `input-invalid` refusal from `available`. A selection UiAction builds the command's input itself (it "builds the command's input in one place"), so a malformed id list from `DeleteSelection` now greys the key instead of erroring, which is exactly the hiding the rule was written to prevent. The glossary row (line 129) states the narrower rule ("ok when the path built it"), so the glossary and the Shortcuts bullet disagree on this case. The reason the UiAction case was included is not given. Not a blocker for 13.25 (the add flow is unaffected), but it is a spine decision made without the "X, not Y, because Z" it needs.
2. **Verify gap.** The description names "a malformed id's schema message" but verify only exercises id-taken and the empty id. A non-empty malformed id (for example `Foo Bar`) shows 'An id is kebab-case.'; the empty case checks the same message, so a test could cover both, but verify does not say the reason text is seen.
3. **Parent and index in the probed input.** The ticket says the flow asks availability "with the input it would send"; that input includes `parent` (selected group, else the slot's group, else root) and the omitted index (append). `unknown-target` and `index-out-of-range` come from those fields. The spine does not say that the parent is fixed when the flow opens or recomputed per keystroke; if the selection can change while the flow is open, availability and commit could differ. Builder decision, not stated.
4. **`input-invalid` is wired to the handle id.** `command` = "the handle's id" (Rejection type), fine for display, but the Shortcuts bullet says `available` returns the Rejection while the invoke path "takes the caller's input, else the handle's input builder's": the add flow's handles (`AddGroup`/`AddSlot`) need no input builder because the caller always passes input. Consistent; noted only so a builder does not add one.
5. **Spine drops "disabled" only for the form.** The spine says "(ok means available, and keys and menus read ok as enabled)"; the ticket's hotkey claim (`preventDefault` only when available) now reads `Result` ok. Not stated in the diff that `ui`'s layer "handled answer" is unchanged; it is, since it depends on the registry running the entry.

## Suggested ticket edits (for the owner, not applied)

- Replace `unknown` with a note that the spine answers it (8edc279 reference can go), and add to the description: "13.25 changes `invoke.available` from a boolean to `Result<void, Rejection>` and updates its readers (hotkey layer, registry, selection UiActions)".
- Add to the description: the field's text is sent as typed, so an empty field is `id: ""`, never an omitted id.
- Add to verify: a malformed non-empty id (for example `Foo Bar`) shows 'An id is kebab-case.' and disables confirm.

## Decisions made on my own

- Read `""` as an `input-invalid` case via the existing `idSchema` regex, not as a separate empty-id rule, because the schema file already rejects it with a message.
- Treated "whoever built it" as an inconsistency to flag, not a contradiction of the ticket, because the add flow's caller-passed input is covered either way.
- Did not check text outside the two amended spots (e.g. whether the new node becomes the selection), because the task named the availability question.
