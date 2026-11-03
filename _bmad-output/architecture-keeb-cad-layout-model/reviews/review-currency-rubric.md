# Review: 23.2 gate spine update (2026-11-03): reality check and rubric

Scope: `git diff HEAD -- _bmad-output/architecture-keeb-cad-layout-model/` (memlog decisions 23.2 gate items 1, 2, 2b, 3a, 3b, 3c, 4), read against story 23.2 "Commands run through the register" and the stories it hands work to (13.2, 13.3, 13.17, 13.18, 14.2, 22.1, 23.3, 23.5, 23.7).

**Verdict:** the technical claims hold; the spine is close to letting 23.2 be planned, but two gaps block a clean plan (no producer of a model-kind `Rejection` in 23.2, and `ItemId` pulling id kinds into 23.2 that the spine says are coded later), and several ticket lines now contradict the spine.

---

## Part 1: Reality check

Everything below was checked against the versions pinned in the repo (`pnpm-workspace.yaml`: `valibot ^1.5.0` resolving to 1.5.0, `ts-pattern ^5.9.0` resolving to 5.9.2, TypeScript 6.0.3) by running code in the scratchpad, plus MDN for Web Crypto.

| # | Claim in the change | Status | Evidence |
|---|---|---|---|
| R1 | `crypto.subtle.digest` is async only and does SHA-256 in browsers and workers | **True** | MDN: returns a `Promise<ArrayBuffer>`; algorithms SHA-1/256/384/512; available in Web Workers; **secure contexts only** (https or localhost); no sync variant, no streaming. Node 25.8 (`globalThis.crypto.subtle`) gave the expected hex for SHA-256, so Node-project tests can call it too. |
| R2 | A Valibot issue maps to `SchemaIssue.path: (string\|number)[]` | **True, with two edge cases the plan must name** | In 1.5.0 `issue.path` is `IssuePathItem[] \| undefined`; each item has `key`: `number` for arrays, `string` for objects, but `unknown` for `map` and `unknown` items and `null` for `set`. Runtime: an unknown `form.type` under `v.variant('type', …)` gives `path` keys `['meta','form','type']`; a wrong `board` gives `['meta','form','board']`; a non-object form gives `['meta','form']`; a non-object root gives **`path: undefined`**. The copy is `issue.path?.map(i => i.key) ?? []`, with a narrowing step, because the type of `key` includes `unknown`/`null`. No design schema uses `map`/`set`, so that branch is a bug and should throw. |
| R3 | `getDotPath` is relevant | **Not needed** | It returns `string \| null`, joins keys with `.` (a key with a dot in it becomes ambiguous) and returns `null` when there is no path or a key is not a string or number. It is useful only as a reference for the null cases above. The spine rightly keeps the array form. |
| R4 | `quantity(unit)` = the Expression schema piped with `v.metadata({ unit })`; `ref(kind)` the same with `{ refKind }`; the walk reads `v.getMetadata` | **True at runtime; two notes** | `v.getMetadata(v.pipe(Expression, v.metadata({unit:'mm'})))` → `{ unit: 'mm' }`; it merges depth first through nested pipes (source: `depthFirstMerge`), so an Expression schema that carries its own metadata would show up merged. `getMetadata` is marked **`@beta`** in 1.5.0. The Stack row's argument ("a breaking change fails to compile and fails the walk test") covers that. The spine does not say **how the walk recognises an Expression** inside a quantity (brand name on the inner pipe? a metadata marker?). That is a 13.2 detail, but the spine should name it, because "Expression is reference-carrying" depends on it. |
| R5 | `Quantity<U> = Expression & { readonly [unit]?: U }`, hand-declared, unit a phantom | **Compiles; the phantom does not survive inference** | tsc check: a field declared with `quantity('mm')` infers as plain `Expression` (the brand), **not** `Quantity<'mm'>`, so `const d: Quantity<'deg'> = gap.x` compiles. Only `Quantity<'mm'>` to `Quantity<'deg'>` fails. Because the phantom is optional, any bare `Expression` is assignable to every `Quantity<U>`. To make the unit check work, the spine must give `quantity(unit)` a declared output type (for example, a cast to a schema whose output is `Quantity<U>`). That is one more hand-declared exception under AD-24. This matters for 13.2, not 23.2. |
| R6 | `v.brand` / `v.metadata` allowed under "no transforms" | **True** | Neither changes the value; both are pipe actions (`brand`, `metadata`) in 1.5.0. |
| R7 | ts-pattern exhaustive match over `Rejection`, whose last variant's `kind` is itself a union | **True** | tsc check (ts-pattern 5.9.2): `.exhaustive()` passes with one `.with` per register kind plus either `P.union(...)` over the model kinds or one `.with` per model kind. If one model kind is missing, it fails as expected. A `{ message: P.string }` catch-all for model kinds also works. With `ModelRejectionKind = never` (its state in 23.2), the three register branches alone are exhaustive, and a value with any other kind fails to compile. |
| R8 | A Valibot schema for `Rejection` can be a `v.variant('kind', …)` with a picklist discriminator | **True** | Runtime: a variant option whose `kind` is `v.picklist([...])` parses. `v.picklist([])` (an empty `ModelRejectionKind`) is accepted and rejects every kind. |
| R9 | `hash(value)` sync over a canonical encoding; async would split the commit event | **Reasoning sound; the function is unspecified** | Native SHA-256 is async only (R1), so a sync `hash` must be JavaScript: a library such as `@noble/hashes` (not in Stack) or a hand-written hash. The spine says "provisional whole-design hash" and names neither the function nor the output width. `Revision` is persisted in derived-file tags and used as content identity (AD-12/13). A 32- or 53-bit non-cryptographic hash would make a silent collision accept stale routes. See finding F5. |
| R10 | Structural Seed `hashing/` comment | **Stale** | Line ~1024 still says "the one content hash"; AD-10 now has two calls (`hash`, `hashBytes`). |
| R11 | ts-pattern in the spine | **Missing from Stack** | The Data Schema comment now prescribes "an exhaustive ts-pattern match", but the Stack table has no ts-pattern row (it is a catalog dependency since 23.10, `^5.9.0`). |
| R12 | Memlog 2b: "23.6's reopen needs that path anyway" | **Wrong story number** | 23.6 is the ui foundation. The reopen path is 23.5 (load) and 23.7 (launch reopens the last design). The spine text itself names no story, so only the memlog is wrong. |

Not verified: whether `crypto.subtle` is reachable on every origin the app is served from. It is only a concern if the app is ever served over plain http on a non-localhost host (for example, a LAN IP during dev); there it would be `undefined`.

---

## Part 2: Rubric: can 23.2 be planned against the Data Schema gate?

| 23.2 requirement | Spine now defines it? | Notes |
|---|---|---|
| Model reject via `model`'s `reject(kind, ids, message)` | Shape yes | `{ kind: ModelRejectionKind; ids: ItemId[]; message }`. But `ModelRejectionKind` is empty until 13.3, so **23.2 has no member to reject with** (F1). The ticket does not say that 23.2 codes `reject` in `model/main`. |
| Invalid input, with its path | Yes | `input-invalid { command, issues: SchemaIssue[] }`; mapping verified (R2). |
| Unavailable | Yes | `unavailable { command }`. |
| Stale seq | Shape yes | `stale { seq, latest }`. The call shape is undefined: `register.run(handle, input)` (AD-2) has no seq parameter, and no story is named as owner of the seq check. 23.2's ticket does not claim it. Either defer it explicitly or define where the seq enters `run`. |
| Structural-check hook | Shape yes (shares the model variant) | AD-2 has the register call `model`'s structural checks directly. With no checks before 13.3 and no seam, 23.2 cannot test the hook (F1). |
| `replaceDesign`'s error type | Yes | `Result<void, DesignInvalid>`, `{ kind: 'design-invalid'; issues }`. Not stated: whether the issue paths are rooted at the design or at the bundle. AD-1/AD-8 say `replaceDesign` takes the migrated bundle. |
| Meta subset | Yes | Field tags: id, name, form 23.2; defaultPart 13.18; gap 13.2; provenance 22.1; licence untagged ("no story yet"). |
| `Id` | Yes | "Id: as in AD-24; 23.2". But `ItemId = Id \| SideId \| LibraryId` pulls `SideId`, `PartId` and `BlueprintId` into 23.2 (F2). |
| Revision via hashing | Yes, provisionally | Sync `hash(value): Hash`, parsed with `Revision`. The function and width are unnamed (F5). |
| `CommandId` (needed by `Rejection.command`) | Partly | "Members listed as the commands are defined". The Open Questions row "Keeping the CommandId union in step with the handles" is due at "First command story", which is 23.2, and is still open (F4). |
| Valibot-or-hand-declared for the new types | **No** | F3. |

---

## Findings

**F1: HIGH. 23.2 has no producer of a model-kind `Rejection`, so two of its verify lines cannot be written as typed code.**
`ModelRejectionKind` is a closed union whose first member arrives with 13.3, so in 23.2 it is `never` (R7, R8). The ticket's verify needs "a returned Rejection leaves the design untouched", and the description needs "runs the structural-check hook". AD-2 has the register call `model`'s structural checks directly, with no argument seam, and there are none yet.
Question for Sergii (not an autofix): **(a)** the 23.2 tests build a model rejection with a test-only kind cast (`'test-refusal' as ModelRejectionKind`), which never enters `schema`, and the register takes the structural checks as an argument from its caller (one hop, per AD-10's rule: `model/main` exports `structuralChecks`, empty until 13.3), so a test passes one that rejects; **(b)** 23.2 adds a real first member. Recommendation: (a). It keeps the closed union honest and matches the one-hop argument rule. Spine wording if (a): "The register receives `model/main`'s structural checks as an argument from `app`'s wiring; the list is empty until 13.3."

**F2: MEDIUM. `ItemId` contradicts "23.2 codes Id only".**
`Rejection` (coded by 23.2) uses `ItemId = Id | SideId | LibraryId`, and `LibraryId = PartId | BlueprintId`. Under the rule "a shared kind is coded by its first reader", 23.2 becomes the first reader of `SideId`, `PartId`, `BlueprintId` and `LibraryId`. Fix: tag `ItemId`'s members by story, with the union widened additively: "`ItemId`: `Id` 23.2; `LibraryId` 13.18; `SideId` its first resolved-placement story". Widening is safe because `ItemId` is never read from a file. Otherwise add those kinds to 23.2's list and memlog 3b.

**F3: MEDIUM. The new refusal types have no Valibot-or-hand-declared ruling, and `Fix.input: unknown` breaks the pass-through ban.**
AD-24 says every type in `schema` is inferred from a Valibot schema, except a named hand-declared list. `SchemaIssue`, `ItemId`, `Rejection`, `DesignInvalid`, `Violation` and `Fix` are not on that list, and nothing ever parses them: they are built by code and never enter the design. `Fix.input: unknown` as a schema would be `v.unknown()`, which AD-24 bans for object values. Fix wording (as a question): either "Refusals and violations (`SchemaIssue`, `Rejection`, `DesignInvalid`, `Violation`, `Fix`) are hand-declared TypeScript in `schema` (AD-24's exception list): no input parses them" or "they are Valibot schemas; `Fix.input` is the one allowed `v.unknown()`, because the fix's command schema parses it when the fix is applied". Recommendation: hand-declared, since a schema nothing parses is dead code.

**F4: MEDIUM. The `CommandId` mechanism is still an open question due at 23.2.**
`Rejection.command: CommandId` and the 23.2 test command ("renames the design") need a typed id. The test command's id should not join the production union. Fix: close the Open Questions row before planning, or state "23.2's plan decides it". Recommendation: `CommandId` is derived from the handles' literal ids (`typeof handles[number]['id']`), with test commands typed `CommandId` through a cast in test code only.

**F5: MEDIUM. The provisional `hash` is unnamed: no function, no output width, no Stack row.**
`Revision` is persisted in derived-file tags and used as identity (AD-12, AD-13). Fix wording: "Until the spike, `hash` is SHA-256 over the canonical encoding, computed synchronously in JavaScript (`@noble/hashes` `sha256`, Stack row added), hex-encoded; any replacement keeps at least 128 bits." Also fix the Structural Seed `hashing/` comment (R10), add a ts-pattern Stack row (R11), and state how the canonical encoding treats `-0`, `NaN` and non-finite numbers (outputs carry `NaN` frames; not a 23.2 concern).

**F6: LOW. Quantity's unit phantom is lost under inference (R5), and the walk's way of recognising an Expression is unstated (R4).**
Both matter for 13.2, not 23.2. Fix wording: "`quantity(unit)` is declared to return a schema whose output is `Quantity<U>` (one cast in `schema`, hand-declared under AD-24). The Expression schema carries `v.metadata({ expression: true })`, which the walk reads through `getMetadata`'s merge."

Smaller items:
- `stale`: name the owning story (the first command computed from a snapshot) and where the seq enters `run`.
- `DesignInvalid`: state whether issue paths are rooted at the design or at the bundle, and whether a derived file that fails to parse is also `design-invalid`.
- Register kinds carry no message, but the `input-invalid` issues carry Valibot's English messages. State whether `editor` shows them (they cannot be translated).
- Memlog 2b names the wrong story (R12).

---

## Ticket lines that now conflict with the spine (or lack what it now assigns)

**23.2 (epic-a-new-design-opens, id 2)**
- "Frozen<T> and Writable<T>; Id, Length, Expression, ref(kind) and their Valibot schemas in schema" → "Frozen<T> and Writable<T>; Id and its schema, ItemId's 23.2 members (F2), SchemaIssue, Rejection, DesignInvalid and Result in schema (Data Schema); Length, Expression and the quantity kinds arrive in 13.2, ref(kind) in 13.18."
- "replaceDesign takes unknown, migrates (none yet), parses and deep-freezes" → "replaceDesign takes unknown (the bundle migrateBundle already migrated; no migration here, AD-8), parses, deep-freezes and returns Result<void, DesignInvalid>, each issue a SchemaIssue."
- "returns Result<void, Rejection>" → add: "Rejection as in Data Schema: input-invalid with the issues' paths, unavailable, and model kinds built with model/main's reject(kind, ids, message), which 23.2 codes" (plus the structural-check seam if F1 (a)).
- "computes the revision through hashing" → "computes the revision with hashing's synchronous hash(value) (the provisional whole-design hash, coded here with the canonical encoding) and parses it with the Revision schema."
- Verify "an invalid input is refused with its path" → "an invalid input is refused as input-invalid, whose issue path is a (string|number)[] (an empty path for a root-level issue)."
- Verify "an unavailable command is refused" → "… refused as unavailable."
- Verify "refuses one with an unknown form, naming the path" → "returns design-invalid with an issue at ['meta','form','type']" (adjust the root if the bundle is the input).
- Verify "a returned Rejection leaves the design untouched" → reword per F1's outcome, and add "a structural check that rejects leaves the design untouched".
- Add: "The seq check (stale) arrives with the first command computed from a snapshot", or add it to scope with the seq's place in `run`.

**13.17 (epic-see-corneys-keys)**
- "expr is stubbed here with number literals only (no parameters)" → "expr is stubbed here with number literals with a unit only ('19mm', '-15deg'; no parameters, no operators); 14.2 widens the grammar additively."

**13.2**
- Add: "codes the shared kinds Expression (parsing with 13.17's stub), Quantity and quantity(unit), Delta, Length, Angle, Vec2, Offset and Gap in schema (first reader: meta.gap)."

**13.18**
- Add: "codes ref(kind) (first reader: meta.defaultPart, Ref<'library-part'>) and InputValue's tagged quantity { type: 'quantity'; value: Quantity }."
- "deleting the design part or library-versions entry that meta.defaultPart names is rejected (AD-2)" → add "with a ModelRejectionKind member it adds" (and LibraryId in ItemId, F2).

**13.3**
- "rejected through the register's structural check with a typed rejection naming the cycle's ids" → "… with a Rejection of a ModelRejectionKind member it adds (the cycle), built with reject(kind, ids, message)."
- "as a { kind, severity, ids, message, fixes } violation" → "as a Violation (Data Schema), coding Violation, Fix and ViolationKind's anchor-cycle and unresolvable-reference."

**14.2**
- Add: "widens expr's grammar additively: every string that parsed with 13.17's stub still parses."

**23.3**
- "replaceDesign, which only parses, deep-freezes and writes the already-current design" → add "and returns design-invalid with issue paths when the file does not parse."

**23.5 / 23.7 (memlog says 23.6)**
- 23.7 "Launch reopens the last autosaved design … or creates one by newDesign when storage is empty" → add "or when the last autosave is refused by replaceDesign as design-invalid (until the first public preview, AD-8)." 23.5's verify could add "an autosave that no longer parses is refused as design-invalid."

**22.1**: no conflict (provenance tagged 22.1).
