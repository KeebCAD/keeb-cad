# Adversary review: 13.25 availability amendment (2026-11-11)

Scope: glossary "invoke path" row and the AD-26 Shortcuts availability sentences (uncommitted diff). Nothing in the spine was changed. No builds or tests were run; code was read at HEAD (the amendment is not built yet, so `available` is still boolean).

Verdict: not ready to hand to 13.25 and the menu/palette story as written. The rule "caller's input vs. built input" is sound, but "the caller passed the input" is defined by prose while the code decides it by `input !== undefined`, and three seams around the new Result (UiAction mapping, rejection text, wide handles) each admit two compliant, incompatible readings. One claim (the compiler types the caller's input) is only partly true.

## A. Incompatible-but-compliant pairs (holes)

### A1. Untouched form: `undefined` is "built", so confirm is enabled (high)
- Unit 1 (13.25 add flow) keeps a draft `Draft | undefined` or `string | undefined` and calls `available(AddKey, draft.value)`. Unit 2 (the same flow written with `{ id: draft.id }` and an empty string) calls it with a value.
- `available`'s parameter is `input?: v.InferInput<...>` (invoke.ts:63), so passing a value of type `T | undefined` compiles. `#inputFor` treats `undefined` as "caller passed none" (invoke.ts:77-78, comment 76), builds `{}`, the parse fails, and the spine says a built-input parse failure answers ok. An untouched form therefore reads as enabled with no reason, exactly the "person's text refused with no reason" case the amendment says it rejects.
- Both units obey every sentence: the spine says "input the caller passed" but never says that `undefined` (or an omitted argument) is "not passed".
- Close with: "The caller passed input exactly when the argument is not `undefined`; a caller that has no input yet passes a value that fails the schema (`{ id: '' }`), never `undefined`. `null` and `{}` are passed input." Add a type-level guard decision: `exactOptionalPropertyTypes` does not cover parameters, so state it as a review rule or give `available`/`invoke` a second signature that rejects `undefined` explicitly.

### A2. How a UiAction (boolean `available()`) reads the command's Result (high)
- `UiAction.available(): boolean` (ui-actions/types.ts:8) and the spine says its `available()` "asks `available(command, input)`" without saying how a `Result` becomes a boolean. DeleteSelection does `.map(input => invoke.available(DeleteNode, input)).getOr(false)` (delete-selection.ts:26-30). After 13.25 that line still compiles (a Result is an object), and is always truthy: the key would be claimed even when the command refuses. Type-level nothing stops it.
- Unit 1 (Delete) maps `ok -> true`, any err -> false. Unit 2 (a later nudge UiAction) copies the builder rule and maps `input-invalid -> true` so a bug "surfaces". Both obey; the same refusal greys one key and enables the other, and the registry (shortcut-registry.ts:60) lets one pass through and claims the other.
- The amendment itself says a UiAction's routed input is the caller's, so its input-invalid is a refusal: Unit 1 is the reading it implies, but it is not written for the boolean boundary.
- Close with: "A UiAction's `available()` is `invoke.available(command, input).isOk()`; any rejection, input-invalid included, is false." Also record that the UiAction's reason is dropped by design (its own `available()` is boolean) so a menu entry for a UiAction greys without a reason; or widen `UiAction.available()` to `Result<void, Rejection>` in 13.25. One of the two must be decided; today the menu story gets reasons for commands and none for UiActions.

### A3. Who turns a Rejection into the text a menu or form shows (medium-high)
- schema/src/types.ts:166-173: `unavailable`, `input-invalid`, `stale`, `unknown-command` carry no message ("the editor writes their text from the kind"); only model kinds do. The spine now says the result is shown "as you type" and as a tooltip, but names no owner for kind -> text, nor for flattening `issues` (first issue? all? path-prefixed?).
- Unit 1 (add flow) shows `issues[0].message`; Unit 2 (menu) shows a generic "Unavailable" for every err, hiding id-taken; a third (palette) joins all issues. All read the Result correctly.
- Close with: one `editor` function (one concept file) `rejectionText(rejection): string` that the add flow, menus and palette must use; state that `ui` widgets take the string (matches the existing `disabledReason` plain-data rule).

### A4. Dynamic callers lose the "compiler types the input" guarantee (medium)
- The new sentence "The compiler types a caller's input against the schema's `v.InferInput`" is true for call sites that know the handle statically (invoke.ts:32-43, 63: `H extends ...`, `input?: v.InferInput<H['input']>`). It is false for the callers that most need `available(handle, input)`: the menu, palette and registry hold `EntryHandle`/`CommandHandle` (types.ts:8; design/src/entries/types.ts:25 declares `input: v.GenericSchema`), where `v.InferInput<GenericSchema>` is `unknown` and anything compiles. `shortcut.handle` in the registry is already such a value (shortcut-registry.ts:60).
- So "only a refinement reaches the refusal" holds for static callers only; for dynamic callers a wrong shape reaches it too. Pair: a palette that asks `available(handle, typed)` per handle relies on the refusal for shape errors; a form relies on the compiler and ignores them.
- Close with: restate the sentence as "for a caller that names the handle statically"; say a caller holding a wide handle gets no compile check and treats input-invalid as ordinary.

### A5. Caller input replaces the builder's, never merges (medium)
- "the caller's, else the builder's" (invoke.ts:78-80) is all-or-nothing. A form that passes `{ name }` for a command whose builder supplies `{ ids }` gets input-invalid forever; a unit that merges builder output itself (calls the builder then adds its field) treats the result as "caller passed" (so a builder bug now greys). Nothing says which unit owns composing the two.
- Close with: one sentence: a handle with a builder takes the whole input from the caller or the whole from the builder; a flow needing both reads the selection itself and passes the whole.

### A6. "Ok" for built-input parse failure also skips the entry's own check (low-medium)
- Order is parse, then check (invoke.ts:65-68; design-store.ts:84-103). When the built input fails to parse, the check never ran, so `ok` can mean "available" for an entry that is actually unavailable (no selection yet a malformed builder output). The amendment keeps "ok means available" and "in the same order as invoke". Pair: a registry that claims the key on ok (then the refusal is silently dropped, shortcut-registry.ts:56) vs. a menu that treats ok as truly runnable.
- Close with: say "ok" for a built-input parse failure means "not known to be unavailable".

### A7. Reactivity and identity of the Result (low)
- Spec silent on whether `available` is read inside a Vue `computed` and whether a new Result per call re-triggers; the form "as you type" is the first reactive reader, previously a boolean (stable by value). Two units: one memoises per input, one reads in a template; behaviour is compatible but the cost differs. One sentence ("returns a fresh Result each call; compare on `isOk()` and rejection kind") closes it.

## B. Reality check of the amendment's claims

| Claim | Verdict | Evidence |
|---|---|---|
| `invoke`'s signatures type the caller's input against `v.InferInput` | True for named handles; `available` has the same form but is a single generic (not overloaded) | invoke.ts:32-43, 63 |
| Built-input parse failure answers ok today | True (it is the current boolean behaviour; the Result change keeps it) | invoke.ts:65-68 |
| Parse failure of caller input is `input-invalid` carrying the schema issues | True for commands/actions and UiActions | design-store.ts:193-199 (`#parse`), invoke.ts:126-128 |
| Same order as `invoke`: no-design, build, parse, check | True for commands (invoke.ts:64, 85-92); actions and UiActions have no no-design step, consistent with the text which names commands only | invoke.ts:95-110 |
| "Keys and menus read ok as enabled" | Not implemented anywhere: the registry calls `!this.#invoke.available(...)` (shortcut-registry.ts:60), which with a Result is `!object`, always false, so every hotkey would pass through. TypeScript does not flag `!result`. 13.25 must change this line; spec should name the registry as a reader to update | shortcut-registry.ts:60 |
| "13.25 changes `available`'s answer from a boolean to this Result" | True and incomplete: also delete-selection.ts:28, duplicate-selection.ts and their specs read the boolean (see A2). Lint rule `@typescript-eslint/no-misused-promises` style protection does not exist for Result truthiness; `strict-boolean-expressions` would catch it | grep of `.available(` in editor/src |
| Valibot `InferInput` is the pre-transform/pre-default type | True (Valibot ^1.5.0, pnpm-workspace.yaml:32); `v.object` strips unknown keys rather than failing, so extra keys never produce the refusal | `parse` is `v.safeParse`, design/src/parsing/parse.ts:12 |
| "only what the compiler can't see (pattern/length refinement) reaches the refusal" | Overstated: also `undefined` (A1), wide handles (A4), casts, and JSON/draft state typed `string` | see A1, A4 |

The decision that "a UiAction's routed input is the caller's" matches code today (delete-selection.ts:34 routes through `invoke`), but the glossary phrase "whoever built it" contradicts the invoke-path row's own definition ("the path built it"); readers will reasonably ask whether a builder's output passed through a UiAction becomes "caller's". One sentence: "input is the caller's when it crosses the `invoke`/`available` argument, whatever produced it; built only by `#inputFor`."

## C. Priority of sentences to add
1. `undefined` = not passed; empty-form values are passed (A1).
2. UiAction `available()` = `isOk()` of the command's Result, any rejection false; decide UiAction reason (A2).
3. `rejectionText` owner (A3).
4. Static-handle qualifier on the compiler claim (A4).
5. Whole-or-nothing input rule (A5).

Open decision: the new text correctly rejects "mark UiAction input as built"; this review does not reopen it. A1 and A2 do not reopen it either.
