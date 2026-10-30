# Rubric review: slice-13 spine amendments (2026-10-30)

Reviewer role: rubric walker. Scope: the uncommitted diff to `architecture-keeb-cad-layout-model.md` (AD-2 Writing / Inputs / Read-only types / Undo / Command register, AD-3 cycle rejection, AD-10 import fences, AD-24 Valibot, AD-25 one partial per package, AD-26 hotkey rule, Verification layer 3, Stack, Open Questions), checked against the last 14 memlog entries (166–179) and against the rest of the spine; plus the same diff's changes to `ux-editor/EXPERIENCE.md` and `ux-editor/DESIGN.md`.

Package sources for zag, Immer and Valibot are not installed in the repo, so facts about them are taken from the memlog's `(version)` entries (167, 170, 174, 176), not re-checked.

**Verdict: needs fixes before handoff.** Two high findings: a decision that landed in the UX doc but not in AD-26, so the new register test would reject a shortcut UX still specifies; and an AD-2 guarantee ("every design value is frozen") that the `replaceDesign` path doesn't meet. Everything else is medium or low.

## Rubric results

| Check | Result |
| --- | --- |
| Every amended rule is enforceable and prevents its divergence | Mostly. Failures: H2 (frozen-everywhere claim not true for `replaceDesign`), M3 (the walk misses parameter references inside expressions), M4 (reference comparison on a nested tree), L5 (read-only parameters have no named check) |
| Every memlog decision 166–179 landed | Mostly. Missing: the `?` logical-alias exception (175) in AD-26 (H1); "reviewer rule" tag (169); Binds lists for 169, 173 and 175 (L2) |
| No contradiction with other ADs, conventions or glossary | Failures: H1 (AD-26 vs EXPERIENCE), M1 (AD-26 vs EXPERIENCE "physical keys" and layout-map labels), M2 (`Writable` never leaves `model` vs commands defined in other packages), M5 (AD-24 load validation vs AD-8 `format-too-new` and migration) |
| Open Questions: settled items removed, remainder kept | Pass. Update library, schema format, deep read-only, zag physical keys and the ts-inject convention are gone. Cycle rejection is moved out of the invalid-states row, and the other refusals stay. Radii are gone from the sweep row and the toast row remains. "Which packages define commands" stays open, correctly (see M2). Missing: no row for the new gaps (H2, M3, M5, M6) |
| Stack versions pinned | Pass, with one ambiguity: immer `11.2.9` has no `(exact)` or caret marker (L1) |
| UX docs consistent with AD-26's hotkey rule | Fail on `?` (H1). Alt+arrow is outside the rule's wording but has the same kind of browser conflict (M6). No other unmodified or Shift-only symbol shortcut, and no Alt+letter chord, remains in the table. |

## Findings

### H1 (high): `?` stays a shortcut, but AD-26's register test rejects it
- **Where:** AD-26 Shortcuts bullet; EXPERIENCE.md shortcut table row `F1, ?` and Cheat sheet component row (line ~115, entry point still only `?`); memlog 175 ("the cheat sheet gets F1, keeping ? as a logical alias").
- **Problem:** `?` is a Shift-only symbol key (Shift+/ on US). AD-26 says "no unmodified or Shift-only shortcut is a symbol key", and says a test over the register enforces this with `parseHotkey`. As written, that test fails on the cheat-sheet entry. Decision 175 kept `?` as a logical alias, but that exception reached EXPERIENCE.md and never reached AD-26. Separately, the Cheat sheet component row still names only `?` as its entry point.
- **Fix:** Add the exception to AD-26, for example: "One exception: `?` is a logical alias for the cheat sheet (F1). It matches the typed character on any layout and is allowed by the test by name." Either that, or drop `?` everywhere. Update EXPERIENCE.md line ~115's entry point to `F1, ?`.

### H2 (high): values from `replaceDesign` are not frozen, so AD-2's runtime guarantees fail on loaded designs
- **Where:** AD-2 Writing ("Every design value is therefore frozen, so Vue never proxies it and a stray write throws"); AD-2 Design state (`replaceDesign`); AD-24 (file load validates, then calls `replaceDesign`).
- **Problem:** Only `produce` freezes. A loaded, migrated or version-switched design reaches design state through `replaceDesign`, which comes from a Valibot parse: a fresh, unfrozen copy. Until the first command touches each record, Vue deep-proxies those records when they enter the ref, and a stray write succeeds silently. That is the exact divergence the amendment exists to prevent, and it applies to the most common start state (open a file). Only `model`'s register may import `immer`, so `replaceDesign` can't call `freeze` unless it lives there too.
- **Fix:** State in AD-2: "`replaceDesign` lives in the register concept and deep-freezes its value (Immer `freeze(value, true)`) before it enters design state." Extend layer 3 of Verification: "after `replaceDesign` the design is deeply frozen and holds no proxy."

### M1 (medium): EXPERIENCE.md still says "bound to physical keys"
- **Where:** EXPERIENCE.md Interaction Primitives › Shortcuts ("Bound to physical keys (`KeyboardEvent.code`) … labels come from the layout map where available"), compared with AD-26 (zag matches logical key **or** `code`; every `kbd` hint goes through zag's formatter).
- **Problem:** Both halves now contradict AD-26.
  - The matching is not physical-only. On AZERTY, for example, both the physical A key and the physical Q key fire `A`.
  - The labels come from zag's formatter, not from a layout map.
- **Fix:** Reword the paragraph to: "Letters, digits, F-keys and named keys match by typed character or physical key (zag, AD-26); symbol keys appear only in Ctrl/Alt/Meta chords. `kbd` labels come from the hotkey formatter."

### M2 (medium): `Writable<T>` never leaves `model`, yet other packages define commands
- **Where:** AD-2 Read-only types ("Writable types never leave `model`'s public surface"); AD-2 Binds ("every package that defines commands"); AD-10 ("`valibot` is imported by `model` and by packages that define commands"); Open Questions row "Which packages define commands …".
- **Problem:** A command's apply step is typed `Writable<Design>`. A command defined outside `model` must name that type, or receive it through inference from a `model` export, which is the same leak. So the new AD-10 fence presumes something AD-2 makes impossible. The Open Question is still listed (correct), but the rules are written as if it were already answered.
- **Fix:** Pick an interim rule: "Until the open question is answered, every command is defined in `model`; AD-10's valibot line reads 'imported only by `model`'." Alternatively, say explicitly that `model` exports `defineCommand(schema, apply)` and that the inferred draft type is the one permitted exposure. Keep the Open Question either way.

### M3 (medium): parameter references live inside `Expression` strings, outside the `ref(kind)` walk
- **Where:** AD-24 ("a reference is … `ref(kind)` … never a string that happens to contain an id"; the walk feeds the dependency graph); AD-17 and AD-3 (parameters are in the dependency graph); Glossary (a parameter's name is its id); AD-2 (`renameParameter`; deleting a referenced parameter is rejected, per the EXPERIENCE parameters row).
- **Problem:** Parameter uses sit inside expression strings. The generic schema walk will not find them, so "who points at parameter X", dangling checks and dependency-graph edges for parameters need per-kind code, which is what AD-24 prevents. The spine now declares `Expression` once in `model`, which makes this easy to state.
- **Fix:** Add to AD-24: "`Expression` is a declared reference-bearing kind: the walk parses it with AD-17's parser and yields the parameter names it uses as references of kind `parameter`."

### M4 (medium): finding touched records by reference comparison over a nested tree
- **Where:** AD-2 Undo ("Touched records are found by comparing references between the before and after values"); AD-23 (the layout is a tree; a record is a node or a container's id list).
- **Problem:** If the layout is held as nested nodes (a node contains its children), Immer's path copying gives every ancestor of a changed node a new reference. A plain reference comparison then reports every ancestor as touched. Undo entries grow, and AD-9's id-keyed merge gets false conflicts. The records definition assumes nodes and order lists are separable, but the in-memory shape isn't stated.
- **Fix:** State the in-memory shape: "Design state holds the tree normalised: nodes keyed by id, each group's children as an id list (its order record)." Alternatively: "Record comparison compares a node's own fields, excluding its children."

### M5 (medium): load-time validation versus migration and `format-too-new`
- **Where:** AD-24 ("File load validates every section with the same schemas before `replaceDesign`"); AD-8 (migrate older versions on load; a newer version opens read-only with `format-too-new`).
- **Problem:** The rule doesn't say whether validation happens before or after migration. Current schemas can't validate a newer-format file, which AD-8 still opens read-only. Taken literally, the amendment blocks that file.
- **Fix:** Reword to: "File load migrates, then validates every section with the current schemas before `replaceDesign`. A `format-too-new` file is not validated and opens read-only (AD-8)." Also name the violation a failed validation reports: an existing kind, or a new one with a stated owner in the Violations convention.

### M6 (medium): Alt+arrow nudge compensation collides with browser Back/Forward
- **Where:** EXPERIENCE.md Nudge ("Alt+arrow compensates the next step") and the shortcut table row "Arrows (+Shift/Ctrl/Alt)"; AD-26 bans only Alt+letter; the Editor state convention uses hash history routing.
- **Problem:** Alt+Left and Alt+Right are history navigation in Chromium and Firefox on Linux and Windows. With hash history, a missed `preventDefault` jumps between design and workspace URLs. The manual browser check in EXPERIENCE.md lists Ctrl chords and Alt-drag, but not Alt+arrow.
- **Fix:** Either extend AD-26's ban ("no Alt+letter chord and no Alt+Left/Right") and move compensation to another modifier, or add Alt+arrow to the build-time browser check list along with a required `preventDefault` and a test.

### L1 (low): immer pin is ambiguous
- **Where:** Stack row immer `11.2.9`.
- **Fix:** Write `11.2.9 (exact)`, since auto-freeze and the `Immutable` and `Draft` types are load-bearing. Alternatively, `^11.2` (11.2.9 current) to match the house style for other caret pins.

### L2 (low): Binds lists not updated
- **Where:**
  - AD-2's Binds are "model, editor, every package that defines commands". But read-only typing binds all packages (memlog 169: services, computeds, stages, tests).
  - AD-3's Binds are "model, case, every stage". But "Pickers don't offer cycle-closing targets" binds `editor` (memlog 173).
- **Fix:** Add "all packages (read-only types)" to AD-2's Binds and `editor` to AD-3's Binds.

### L3 (low): who provides the base `commands` value
- **Where:** AD-25 and AD-2. Partials never provide `commands`, and `appendValue` needs an existing array token (memlog 143).
- **Fix:** Add: "`main.ts` provides `commands` as `[]`, then appends each package's list." Also say where the disjointness test lives (in `app/`, the only package that sees every partial).

### L4 (low): "Each package exports one PartialContainer" and "AD-10 order"
- **Where:** AD-25.
- **Problem:**
  - Pure-function packages (`geometry`, most stages) have no services.
  - AD-10 is a graph, not an order.
- **Fix:** Reword to "Each package that provides services exports exactly one …", and to "merges them in a topological order of AD-10's graph".

### L5 (low): read-only parameters by default has no named enforcement
- **Where:** AD-2 Read-only types ("Functions take read-only parameters by default"). Memlog 169 says this is a reviewer rule.
- **Fix:** Append "(reviewer rule, Agents convention)". Alternatively, name the lint rule (`@typescript-eslint/prefer-readonly-parameter-types`) if it is to be a check.

### L6 (low): `anchor-cycle` severity unstated
- **Where:** Violations convention; AD-3 (members and dependants are not placed); AD-15 blocks exports only on `error`.
- **Fix:** Write `anchor-cycle` (error) in the Violations convention.

### L7 (low): the zag store owns its keydown listener, and "field focused turns single-key commands off"
- **Where:** memlog 174 (no event-feed API); EXPERIENCE Shortcuts ("With any field focused, every canvas and single-key command is off").
- **Problem:** Nothing says how this gating is done with a store that owns its listener. It may be a zag option, or glue in `ui`.
- **Fix:** Add to AD-26's glue list ("single-key hotkeys suspended while a field is focused, with a test"), or add an Open Question.

### L8 (low): the schema spike's evidence isn't kept
- **Where:** Stack's "verified" line cites "a schema spike". Memlog 176 says "scratchpad, not kept". Other spikes have a kept file (`ui-layer-decisions-2026-10-30.md`).
- **Fix:** Save memlog 176's numbers as `schema-decisions-2026-10-30.md` (or append them to an existing decisions file) and cite it.

### L9 (low): AD-2 Breaks doesn't name the decided exception
- **Where:** AD-2 Breaks ("An edit that breaks something elsewhere goes through"); AD-3 now says cycle rejection "is structure, not a flagged break".
- **Fix:** Add one clause to AD-2 Breaks: "except structural invariants (AD-3 acyclicity), which reject".

## Checked and fine

- Immer + Vue: `reactive()` returns frozen objects raw (memlog 167), so values from `produce` never get proxies. Inputs parsed to fresh copies close the caller-freeze and proxy-in-design holes (172, 177), and Verification layer 3 checks both.
- Undo stays patch-free and derives patches on demand. This is consistent with AD-9's future id-keyed merge (subject to M4).
- The AD-10 fences match decisions 168 and 177. The `ref`, `Id`, `Length` and `Expression` single-source rule is consistent with AD-24.
- AD-25's disjoint `getTokens()` test matches memlog 170's fact (silent last-wins merge, public `getTokens`).
- AD-26: R / Shift+R, F1 and the rotate step landed in both UX docs, and "Shift 5°" is gone from keyboard rotate. The handle-drag "Shift snaps 5°" is a pointer modifier, not a shortcut, so it is fine.
- No other unmodified or Shift-only symbol shortcut, and no Alt+letter chord, remains: G/S/P/T/V/F/O/M/L/I/W/X/R/A, digits, F-keys, named keys and Ctrl chords only. The `+` in Parameters and Keymap layer tabs reads as a button; consider "`+` button" for clarity.
- DESIGN.md radii 2/4/8 px landed. The Open Questions sweep row was trimmed to the toast.
