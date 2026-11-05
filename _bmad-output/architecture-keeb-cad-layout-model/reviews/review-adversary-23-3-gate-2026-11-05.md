# Adversarial review: the 23.3 gate update (2026-11-05)

- **Target:** the uncommitted spine change (`architecture-keeb-cad-layout-model.md`) and its `.memlog.md` decisions Q1–Q17 dated 2026-11-05. Q16 and Q17 arrived while this review ran; the review covers them.
- **Lens:** two stories or packages, each obeying every AD to the letter, that still build incompatibly; amended text against text left unamended; the decisions against the code in `packages/di`, `packages/design`, `packages/schema` and `packages/result`.
- **Verdict:** **Conditional.** The Q1–Q15 fold is mostly consistent: no `defineCommand`/`defineAction`, no "typed handle", no derived files in separate `shallowRef`s, and no `format-too-new`/`migration-failed` as violations are left in the spine. Three findings (F1–F3) would still let 23.3, 23.5 and the first Open or version-switch story build incompatibly, or lose saved data. Settle them before 23.3 is planned. F1 is a wording fix. F2 and F3 need a decision from Sergii.

Severity: **critical** = the build cannot satisfy the spine as written; **high** = two units can each obey the spine and still clash, or saved data is lost; **medium** = an ambiguity that two agents would resolve differently; **low** = stale or loose wording.
Kind: **wording** = the text contradicts a decision that was already made, and the fix only restates that decision; **design gap** = Sergii must decide.

No critical findings.

---

## F1. `app` cannot call `migrateBundle`, and load's result has no owner. HIGH, wording (plus one small gap)

**Quote (AD-8, line 296):** "`app` chains `migrateBundle(raw).flatMap(…replaceDesign)` into `Result<…, LoadError | DesignInvalid>` and chooses what to show. Load returns the migrated bundle; its caller hands it to `design`'s `replaceDesign` …"

**Contradiction:**
- AD-10 (line 332) and `.dependency-cruiser.mts` `GRAPH` say `design-file` is imported **only by `storage`**: `app: ['editor','design','commands','workers','storage','schema', …]`.
- So an `app` story that writes the chain exactly as AD-8 shows fails dependency-cruiser.
- The 23.5 storage story, which obeys "storage's load calls `migrateBundle` first", returns something the spine never types. "Load returns the migrated bundle" is still the pre-Q11 wording: it says nothing about the `LoadError` arm.

**Gap inside it:**
- `storage.load` is asynchronous (IndexedDB), so the chain is an `AsyncResult`, not a `Result`.
- `storage` has failures of its own: the design id is not stored, or IndexedDB fails. These sit in neither `LoadError` nor `DesignInvalid`.

**Proposed wording:**
> "`storage`'s `load(id)` (used by a version switch and file open too) calls `migrateBundle` first and returns `AsyncResult<MigratedBundle, LoadError | StorageError>`. Its caller chains `load(id).flatMap((bundle) => store.replaceDesign(bundle))` into `AsyncResult<{ emptied }, LoadError | StorageError | DesignInvalid>` and chooses what to show."

`StorageError` is a new plain type in `schema`. Its members (`not-found`, `backend-failed`?) need a decision, or the spine has to say that storage failures throw.

## F2. Two owners of the load flow: `app`'s launch load and the Open / version-switch actions. HIGH, design gap

**Quotes:**
- AD-2 (line 203): "an action may hand a whole bundle to `replaceDesign`: New design, Open, version switch"
- AD-2: an action's apply step returns "`AsyncResult<void, E>`"
- AD-1 (line 192): "`app`'s load tells the user when it emptied a saved one"
- AD-8: "`app` chains … and chooses what to show"
- Q15: "app's load shows a notice when it is non-empty (newDesign's action ignores it)"

**Incompatible pair:**
- **(a)** The `epic-keep-my-work` story that builds launch load in `app`. It shows the "emptied" notice and the `LoadError | DesignInvalid` texts.
- **(b)** The story that builds the **Open** or **version switch** action in `commands`, which is Vue-free and has no notice service. Its apply step must return `AsyncResult<void, E>`, so the `emptied` list is dropped by the `void` type.

Both obey the spine. The result: file open and version switch empty saved routes **silently**, while a reload shows the notice. The two flows also handle `LoadError` and `DesignInvalid` in two places. AD-2 Prevents names "fixes applied differently by each panel", and this is the same failure.

**Options for Sergii:**
- **A (recommended).** Launch load *is* the Open-from-storage action. `app` runs it at launch exactly as it runs `newDesign` on empty storage, so there is one load flow. The action's success type carries the notice data: `Action<Input, E, T>` with `AsyncResult<T, E>`, here `T = { emptied }`. Its caller in `editor` shows the notice.
- **B.** Actions stay `void`. Each load-flavoured action reports through an injected notice service (does it live in `editor`? `commands` cannot import `editor`, so it would need a token, which AD-25's token table must list).
- **C.** `replaceDesign` emits the emptied list on its commit event, and one `app` subscriber shows the notice for every caller. This puts UI concerns into the event.

## F3. Q17 together with Q13: the load-time autosave deletes the only copy of an unreadable derived file. HIGH, design gap

**Quotes:**
- AD-13 (line 469, Q17): "one version per design revision: a later save at the same revision … replaces that revision's version and never takes a new slot"
- AD-13 autosave: subscribes to the commit event, including "`replaceDesign`"
- AD-1 (Q13): a derived file that is "missing, unreadable or fails its schema" is emptied
- AD-8: "A failed migration … never overwrites the file"
- AD-13 Prevents: "pruning a recovery point"

**Sequence:**
1. The stored bundle is at revision R, and its routing file fails its schema. Before the first public preview this happens on any routing-schema change, because format-version stays 1.
2. Launch runs `replaceDesign`, which empties the routing file and emits a commit at the same revision R.
3. Autosave saves, and under Q17 **replaces R's rolling version**.
4. The bad routing file was in exactly that version, and launch load is not a named point (`file` covers file open only). So the history-dependent routes are gone for good, including for a later app version that could have read or migrated them.

Q13 accepted "emptied routing loses history-dependent routes" for the session. It did not decide to destroy the stored copy.

**Options:**
- **A (recommended).** A load that empties a *saved* derived file first keeps the bundle as it was read as a named point (reason `reset`, or reuse `migration`).
- **B.** Don't autosave on a load-time `replaceDesign` until the next commit.
- **C.** Accept the loss explicitly in AD-13.

## F4. `emptied` cannot tell "missing" from "unreadable", so the notice text is wrong in valid cases. MEDIUM, design gap

**Quotes:**
- AD-8: "A derived file it cannot read is passed on as missing"
- Data Schema `MigratedBundle`: "absent when missing or unreadable"
- AD-1: "`app`'s load tells the user when it emptied a **saved** one"
- Q15's example text: "Saved routes couldn't be read and were reset"
- 23.5 verify: "a bundle missing its routing file loads with an empty one"

**Contradiction:**
- `replaceDesign` only ever sees "absent". So `emptied` lists a file that was legitimately missing (a design-file-only KDL opened from disk, 23.5's own fixture) exactly like an unreadable one, and the notice claims something saved was lost.
- Q15 also says "newDesign's action ignores it: a new design has none". That is false: `newDesign` hands over no derived files, so `emptied` is `['routing', 'fingerprints']`. The decision holds; its stated reason does not.

**Proposed fix (decision):** `MigratedBundle` gains `unreadable: DerivedFile[]` from `migrateBundle`, and `emptied` becomes `{ file: DerivedFile; reason: 'missing' | 'unreadable' | 'schema-invalid' }[]`. Or AD-1 states that a missing derived file is always abnormal (the bundle always holds all three) and drops 23.5's "missing" fixture as a normal case. Wording fix for Q15's reason: "newDesign ignores it: both files are emptied by definition".

## F5. The class-as-handle design does not tie a class's static `input` to its instance `apply`. MEDIUM, design gap (verified with `tsc`)

**Quote (AD-2, line 203):** "typed by the class-side interfaces `CommandHandle` and `ActionHandle`, which are checked wherever the class is registered into a multi token or passed to `run`"

**What `tsc --strict` shows** (a model of `Class<T>`, `MultiToken<T>` and the method-style `Command`, as in `packages/design/src/entries/types.ts`):

| Case | Registered into `MultiToken<CommandHandle>` | `run(handle, input)` |
| --- | --- | --- |
| `static input = addKeyInput` but `apply(_, i: { gap: number })` (unrelated) | **compiles** | error |
| `apply(_, i: { slot; extra })`, a wider shape than the schema gives | **compiles** | **compiles** (method bivariance) |
| `static kind = 'command'` without `readonly` | error (kind widens to `string`) | — |
| a constructor with a required parameter | **compiles** (`Class<T>` is `new (...never[])`), but `useClass` calls `new ctor()` with no arguments | — |

**Incompatible pair:** two command classes in `commands` that both compile and both register. One applies an input its schema never produces. That command is reached only by id, through a violation fix or a reference-design script, so it never meets a typed `run` site. Under `defineCommand` the generic spec inferred `apply`'s input from `input`, so this is a regression the spine does not acknowledge. (The "methods, not properties" comment in `entries/types.ts` exists precisely to get bivariance.)

**Proposed fix (decision):** declare `apply` as a function-typed *property* in `Command<S>`/`Action<S, E>`, so the parameter check is strict. Use an erased element type for the multi tokens (`MultiToken<CommandHandle<any>>` behind one alias). Check each class against `CommandHandle<typeof X.input>` once, for example through a typed `register` helper in `design`, or with a type test per concept folder. Alternatively, keep things as they are and state in AD-2 that only the `run` call sites check the tie.

## F6. "Resolves an entry's instance only when it first runs it" conflicts with availability, and the di mechanism is unstated. MEDIUM, wording (plus one gap)

**Quote (AD-2):** "resolves an entry's instance (a singleton) only when it first runs it: the one lazy resolution"

**Contradictions:**
- `available(…)` is an **instance** method (Q5), and `editor` "read[s] labels and availability from the store" for menus before anything runs. Two implementers will diverge: one resolves on the first availability read, the other makes availability static.
- In `packages/di/src/inject.ts`, `inject()` outside a resolution context throws `NoInjectionContextError`. So the store cannot call `inject(AddKey)` inside `run`. It must capture an `Injector` (`inject(InjectorToken)`) at construction and call `injector.resolve(handle)`. I checked this against the code, and it works: the class is resolved inside `withResolutionContext`, its `inject(DesignStore)` field hits the already-filled slot, and there is no `CircularDependencyError`. The spine does not say how, though, and the obvious first attempt throws.
- A new half-registered state appears. A class added to the multi token with `useValue(AddKey)` but not registered as its own token (`register(AddKey).useClass(AddKey)`) passes the startup duplicate check and throws `TokenNotRegisteredError` only at first use.
- An entry's own `inject()` wiring faults also move from `autoLoad` to first use. AD-25 ("A missing provider fails at the entry's first run") and the Verification row ("a `di` wiring fault fails at the entry's first run") are now true only for eagerly resolved services.

**Proposed wording:**
> "…resolves an entry's instance (a singleton, through an `Injector` it injects) the first time it needs it (an availability read or a run), never while it is constructed. An entry class's wiring fault therefore fails at its first use, which its end-to-end test reaches (AD-25, Verification)."

Possible decision: a `design` helper that does both registrations in one call, so the half-registered state cannot be written.

## F7. `run`'s return type: the "Writing" bullet still says `Result<void, Rejection>`, and the action path drops `Rejection`. MEDIUM, wording

**Quotes:**
- AD-2 Writing (line 204): "`run` returns `Result<void, Rejection>` and throws only on a bug."
- AD-2 Commands: "a command needs a loaded design and returns `Result<void, Rejection>`; an action returns its `AsyncResult`."

**Contradiction:**
- The store parses an action's input and checks its availability before `apply` (AD-2 Inputs; `Rejection`'s `input-invalid` and `unavailable`). So `run(action)` can fail with a `Rejection` that the action's own `E` does not cover.
- An editor story that types the overload as `AsyncResult<void, E>` and a menu story that matches on `Rejection` will clash.
- What `run(command)` does with no design loaded is also unstated. Today's code throws `InvariantError`, and the store's availability read for a command when `current` is `None` must answer `false` without calling the instance.

**Proposed wording:**
> "`run` returns `Result<void, Rejection>` for a command and `AsyncResult<void, E | Rejection>` for an action, and throws only on a bug; a command run with no design loaded is a bug, and the store reports every command unavailable then."

## F8. A failing migration step on a derived file refuses the bundle, against "only the design file can refuse a bundle". MEDIUM, design gap

**Quotes:**
- AD-1/Q13: "Only the design file can refuse a bundle (AD-8)."
- AD-8 (line 296): "`design-file`'s one migration chain migrates the whole bundle (a step may touch any of its files) … `format-too-new` and `migration-failed` apply to the bundle."

**Contradiction:** after the first public preview, a step that throws on a routing file raises `migration-failed { from, message }` and refuses the whole bundle. That locks out the authored work Q13 meant to protect.

**Decision needed:** should a derived file's failing step pass that file on as unreadable (it is emptied, and F4 then needs reason `migration-failed`), or does the bundle-wide refusal stand as the one exception?

## F9. Undo records keep the routing file "current at that commit", but `acceptDerivedFiles` updates `Committed` later. MEDIUM, design gap (older than this change; Q2 makes it bite)

**Quotes:**
- AD-2 Undo: "Beside each undo record `design` keeps a reference to the routing file current at that commit"
- AD-1: `acceptDerivedFiles` replaces the whole `Committed`.

**Incompatible pair:**
- The undo story records the routing file at the moment of the commit. That is the *previous* revision's file, because pipeline posts the new one after the commit.
- The pipeline-post story replaces `Committed.routing` and leaves the record alone.

So undo then redo restores the routing file from before the accept. Pipeline then re-validates or re-routes, and because routing depends on history, the routes can come out different. That breaks AD-1's "Stable outputs" and AD-12's reason for saving routes.

**Decision needed:** should `acceptDerivedFiles` at the head seq also update the head undo record's routing reference?

## F10. Text left unamended still says only commands write authored sections. LOW, wording

**Quotes that are now loose:**
- Glossary **authored sections**: "changed only by commands".
- Glossary **command**: "the only way the authored sections change".
- AD-2 (line 202): "Every change to an authored section is a command … and nothing else writes to them".
- Glossary **committed revision**: "reached by a command, undo, redo, or load". New design is missing.
- Design Paradigm (line 149): the design is in "a `shallowRef`, replaced only by commands and `replaceDesign`". The ref now holds `Committed`, which undo, redo and `acceptDerivedFiles` also replace.

`replaceDesign` predates this change, but the New design / Open / version-switch actions now put a user-invoked entry on that path.

**Proposed wording:** "Every **edit** to an authored section is a command; only `replaceDesign` replaces the whole design (load, file open, version switch, New design)". Add "or New design" to **committed revision**.

## F11. AD-10's `design` bullet still describes the old commit event. LOW, wording

**Quote (line 330):** "Its commit event hands each commit's patches, seq and revision to whoever subscribes (`workers`, `app`'s autosave)."

**Fix:** "Its commit event hands each commit's, undo's and redo's patches, seq and revision (with the routing file undo and redo restore), and `replaceDesign`'s whole `Committed`; its accept event hands `acceptDerivedFiles`' `Committed` to autosave."

## F12. What `workers` sends at worker start when no design is loaded. LOW, wording

**Quote (AD-11, line 424):** "`workers` sends the whole design value, with the routing and fingerprints files of `design`'s bundle, at worker start, on worker restart and on load".

After Q3, a first start has no design until the `newDesign` action or a load runs, so `store.current` is `None`.

**Fix:** "…at worker start and restart when a design is loaded (otherwise the first `replaceDesign` commit event carries it)…".

## F13. Type widths and lists. LOW, wording

- `BundleFile` includes `'design'`, yet `emptied` can only hold derived files, and `file-unreadable.file` "is 'design'" by its own comment. Proposed: `type DerivedFile = 'routing' | 'fingerprints'` for `emptied`, and drop `file` from `file-unreadable` (or keep it for a future multi-file reason and say so).
- AD-24's list of plain TypeScript types ("`SchemaIssue`, `Rejection`, `DesignInvalid`, `Violation`, `ItemId`") does not include `LoadError`, `BundleFile` or `MigratedBundle`.
- AD-1: "filling an **empty** one with `emptyDerivedFiles`" should read "a **missing** one" (or "one that is missing or fails its schema").
- Q16 (memlog only): "the supported version is an editor constant" gives a second owner of the current format version. `design-file`'s writer already "always writes the current version". If the spine takes this up, say that `design-file` exports the constant and `editor` reads it.

## F14. Notes on `di` that the spine relies on. LOW

- AD-2: "an empty multi token resolves to `[]`". This holds for `Container.resolve` only. `Scope.resolve` (`packages/di/src/scope.ts`) throws `TokenNotRegisteredError` for an unregistered multi token. Harmless while the store is a container-level eager singleton; worth a sentence or a fix in `di`.
- `Class<T>` (`new (...never[]) => T`) accepts a class with required constructor parameters, and `useClass` constructs it with none (see F5's table).

## F15. The tickets still describe the old design. MEDIUM, wording (for Sofia, outside the spine)

`epic-a-new-design-opens/tickets/tickets.toml`:
- **23.3:** "the newDesign command … newDesign's caller sets the empty derived files through design's emptyDerivedFiles(revision)". Its verify step, "A test creates a design by command", has no command to use until 13.2 (Q3's consequence).
- **23.4:** "newDesign's caller sends the empty derived files it sets with newDesign's patches".
- **23.5:** "migrateBundle, which fills a missing derived file empty", and autosave subscribes "to design's commit event" only.
- The refactor story Q6 asks for (`defineCommand`/`defineAction` → `di` classes, before 23.3) is not in the table yet.

An agent building any of these from its ticket would build Q1–Q9's rejected alternatives.

---

## Checked and found consistent

- No remaining `defineCommand`, `defineAction`, `CommandDefinition`, `ActionDefinition` or "typed handle" anywhere in the spine. The Structural Seed, AD-10 and the glossary all say `di`-registered class.
- Derived files live in one `Committed` in one `shallowRef` (AD-1, AD-2, the Design Paradigm mermaid, the Structural Seed).
- `format-too-new`, `migration-failed` and `file-unreadable` are removed from the violation kinds (Consistency Conventions) and typed as `LoadError` in the Data Schema.
- `Design` leaves out `formatVersion`. This matches `packages/schema/src/design.ts` (`designSchema` has no version) and the glossary's **revision**.
- `Result.flatMap` and `AsyncResult.flatMap` (`packages/result`) support the chains described, once F1's async fix is in.
- `di` supports registering a class into a multi token as a value while resolving it as its own container-lifetime singleton (the default lifetime is `Container` and `eager` is `false`). An `inject()` field in a lazily resolved class works, provided resolution goes through a captured `Injector` (F6).
- TypeScript checks a static `readonly kind` literal at registration. It does not check the static `input` against instance `apply` (F5).
