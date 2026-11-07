# Adversarial review: 2026-11-07 batched ticket unknowns

Spine: `architecture-keeb-cad-layout-model.md` (working tree, uncommitted). Diff: `spine-diff.patch`. Decisions: `.memlog.md` from "2026-11-07 update run: batched ticket unknowns".
Lens: two units one level down, each obeying every AD to the letter, still build incompatibly; stale sentences the update left; rules nobody can enforce.

**Verdict: not ready to bind.** Two high findings: the crash-cap counter makes the new optional `StageId` unreachable (and lets a stage crash loop forever), and two shapes of "compiled scripts" now coexist (eager argument vs `loadScript`). The rest are stale sentences and unowned boundaries, each fixable in a line.

Line numbers are the working-tree spine.

---

## High

### H1. The crash cap's counter and the new optional `StageId` contradict each other (line 430)
**Problem.** The cap is "3 consecutive crashes with no successful post between them". Line 430 also says the model worker *posts* `stage-started` ("Before each stage the model worker posts `stage-started`", "until the next post clears it"). The new `StageId` is set only when "its `stage-started` [was] in the crashing epoch with no later post". Read to the letter:
- If `stage-started` counts as a successful post, every crash inside a stage is preceded by a post, so the counter resets on every restart: a design that deterministically crashes the `plates` stage restarts forever and never reaches the cap. The cap is then reached only by crashes before any `stage-started` (patch apply, mirror writer), where `StageId` is always absent. The optional field is dead code.
- If it does not count, the spine never says so.

Two units: 23.4/23.8 `workers` (counts any accepted message as a successful post, as the message gate makes natural) and the strip story (tests "failed: … in plates"). Both obey line 430; the strip test can never pass, and a crash loop never stops.
**Fix.** Define it in line 430: "a successful post is a stage output or `issues` message; `stage-started` does not reset the crash count." Add a `workers` test row: three crashes each after a `stage-started` for `plates` → failed, carrying `plates`.

### H2. Two shapes of the compiled scripts: `LibraryData.loadScript` vs "scripts as an argument" (lines 334, 344, 347, 1151; blueprints spine BP-9)
**Problem.** The new `LibraryData` (line 863) carries scripts only as a lazy `loadScript(id, version)`. The text the update did not touch still describes eager scripts handed separately:
- line 334: "the model-worker entry … fills [LibraryData] with the declarations and compiled scripts. The compiled scripts reach `blueprint/worker`'s VM pool the same way, as an argument from the worker entry";
- line 344: "compiled scripts arrive from the model-worker entry as arguments";
- line 1151 (tree): "library/worker: compiled scripts";
- `architecture-blueprints.md` BP-9 (line 131): "The compiled scripts reach the pool as an argument from the worker entry, which reads them from `library/worker`";
- ticket 13.21 (`epic-see-corneys-keys/tickets/tickets.toml:48`): "LibraryData (the pinned declarations and compiled scripts …)".

Two units: 13.21 builds `library/worker` exporting `{ declarations, loadScript }`. The blueprint runner story (13.17, per BP-9) builds the pool around a scripts argument (`Record<…, string>` of compiled text) filled synchronously. Each follows its own source to the letter; the model-worker entry can't wire them without an adapter nobody owns. Hidden second shape: the runner needs `async` VM filling with a fetch inside the pause, which BP-9 allows but no text assigns.
**Fix.** Rewrite lines 334 and 344: "the worker entry passes `LibraryData` to `createDerivations` and its `loadScript` to the lane runner; the runner awaits it while filling the pool in the pause (BP-9)". Update the tree line and BP-9 in the same pass, and replan ticket 13.21's description.

---

## Medium

### M1. "di and reactive stay closed to kernels" contradicts three untouched "any package may import" sentences (lines 330, 342, 350, 398)
**Problem.** Line 328 now says kernels may import only `result`, and `di` and `reactive` are closed to them. The tree's `di` line was updated ("any package but a kernel", line 1112). These were not:
- line 330: "Any package may import `di`'s Vue-free root: dependency-cruiser allows it from every package";
- line 342: "Any package may import `reactive`: dependency-cruiser allows it from every package";
- line 350: "`ui` … imports no workspace package" (now it may import `result`; the tree says `imports: result`);
- line 398 (mermaid): "di: any package imports its root".
The contradiction existed before the update, but the update claimed to settle the kernel line and left it. A `ui` story that adds a `di` service for its hotkey layer can cite line 330. A `.dependency-cruiser.mts` reviewer can cite line 328. (The code already matches 328: `OPEN_KERNELS` is withheld from kernels.)
**Fix.** In lines 330 and 342: "Any package but a kernel may import …". In line 350: "imports no workspace package except `result`". In line 398: "di: any non-kernel package imports its root".

### M2. The tree says each kernel *imports* `result`; the rule says each *may* (lines 1100–1118)
**Problem.** Every kernel line now reads `imports: result`, including `hashing`, `reactive` and `di`, which have no use for it. The tree is the Structural Seed, and the spine checks `schema` against its seed line "in review". Reviewers will flag a kernel that doesn't import `result` as drift, or one that does as matching, so the line checks nothing.
**Fix.** Write `imports: none (may import result)`, or `imports: result` only where a decision names a use (`expr`, `geometry`, `messaging`).

### M3. A rejected `loadScript` is the "expected failure as an exception" the same batch rejected for `expr` (line 866–867)
**Problem.** The 13.17 decision rejected "expr throwing and callers wrapping with attempt (an expected failure as an exception)". The 13.21 decision makes could-not-load a rejected Promise that the runner wraps with `result`, which is the same pattern in async form. Its stated rejection of `AsyncResult`, "schema imports only expr", is false by line 331: "Any package may import `result` … allowed from every package". `schema` can type `AsyncResult<string, CouldNotLoad>`. So the decision's "X, not Y, because Z" has a wrong Z (AGENTS.md Policy).
**Fix.** Either type it `loadScript: (id, version) => AsyncResult<string, { kind: 'could-not-load'; message: string }>` (the kind checked against the uniqueness rule), or keep the Promise and give a true reason (e.g. "the bundler's dynamic import is a Promise and rejection is its only failure channel; one wrap at one call site"). Fix the memlog's rejected-alternative reason either way.

### M4. "Unsaved" new design at launch is saved by autosave at once; "holds that error" lasts until the first save (lines 471, 475)
**Problem.** Line 475: at launch, when the reset save fails, the flow "opens a new, unsaved design whose autosave failure state holds that error". But line 471: autosave subscribes to `replaceDesign`'s commit, and `newDesign` goes through `replaceDesign` (line 429). So the new design is saved straight away. With `quota-exceeded`, a tiny new bundle can succeed (rolling versions are pruned under pressure, line 477), which **clears** the failure state, stores a junk "Untitled" design in the recent list, and leaves no trace of why the URL's design didn't open except a transient notice. With `storage-unavailable` autosave overwrites the error with its own. Two units: the load-flow story (sets the failure state, per 475) and the autosave story (clears on success, per 471). Each obeys its line; the tested end state ("failure state holds the reset error") flips within a tick.
Second gap: the load flow is in `commands`; autosave is a `di` service in `app`, which nothing imports. No token is named through which `commands` writes autosave's failure state.
**Fix.** Pick one: (a) the launch fallback's new design is not autosaved until its first command (state the suppression and its owner), or (b) drop "whose autosave failure state holds that error" and say the load flow's notice reports the reset-save error while autosave keeps its own state. Name the token's home (e.g. an autosave-status token in `design` or `commands`, provided by `app`).

### M5. Whether the `reset` save prunes rolling versions before failing is unstated (lines 475, 477)
**Problem.** Line 477: "Under storage pressure only rolling versions are pruned, oldest first; autosave reports failure only when none remain." The new stop rule fires when "saving [the reset point] fails". If `storage.save` prunes for any reason, a reset save fails only when no autosave remains. If only autosave prunes, it fails on the first quota refusal and blocks opening a design that a prune would have let open. Two `storage`/load-flow implementers will choose differently. This is a priority package, so the choice decides a mutation-tested boundary.
**Fix.** State in 477 that pruning happens inside `storage.save` for every reason, so `quota-exceeded` means "no rolling version left". Or state the opposite and accept the stricter stop.

### M6. Launch's fallback chain doesn't carve out the reset-save stop (line 472)
**Problem.** Line 472: "the URL's design opens when it is stored and loads, otherwise the first, otherwise a new design". The decision says a reset-save failure does *not* fall through to the first. Line 472 still reads as if any failure to open falls through ("loads" is ambiguous: `storage.load` succeeded). The rationale ("the literal rule retries it") lives only in the memlog. A launch implementer following 472 falls through. One following 475 opens new.
**Fix.** In 472: "…otherwise the first, otherwise a new design; a failed `reset` save opens a new design instead (One load flow)."

### M7. `InputValue`'s quantity has no schema and no unit under the new one-schema-per-kind rule (line 854)
**Problem.** `{ type: 'quantity'; value: Quantity }`. `Quantity<U extends Unit>` has no default, so this doesn't compile as written. The unit of a blueprint input comes from the pinned `DeclaredInput.unit` at run time, so none of `lengthSchema`/`deltaSchema`/`angleSchema` fits, and the wrong-unit literal check "from its `quantity(unit)` metadata" (line 555) has no metadata to read. Consequences:
- 13.2 builds `quantity(unit)` for a fixed `U`; 13.4 (`blueprint-input-invalid`) needs `Quantity<Unit>` with a run-time unit check against the declaration. Both obey the spine and produce two different schemas for "a quantity".
- `negative-length` "on the fields whose schema is `lengthSchema`" never reaches a blueprint input that is an extent (keycap size, wall thickness), because it can't be found by `quantity: 'length'`.
**Fix.** Define `InputValue`'s quantity as `{ type: 'quantity'; value: Quantity<Unit> }` on `expressionSchema` (metadata `expression: true` only). Say the unit and literal check is `checkInputs`' against `DeclaredInput.unit`, reported as `blueprint-input-invalid`. Say whether `negative-length` covers inputs (e.g. via a `DeclaredInput.quantity?: 'length' | 'delta'`), or record that it doesn't.

### M8. AD-24's "the one exception is the recursive layout tree" is now false (line 658)
**Problem.** `quantity(unit)` is now declared as returning `v.GenericSchema<string, Quantity<U>>` with a cast, a second hand-annotated schema type. The memlog calls it "the same allowance as the recursive layout tree's hand annotation", but line 658 still says "**The one exception** is the recursive layout tree". A reviewer applying 658 will reject 13.2's cast.
**Fix.** Line 658: "Two exceptions: the recursive layout tree … and `quantity(unit)`, whose declared return keeps the phantom unit (Data Schema)."

### M9. Unknown-target anchors are "only from a file", but no command refusal is defined (lines 217, 236, 1039, 758)
**Problem.** The new Violations text says an unresolvable anchor "only a file can hold since deleting the target clears the anchor". That holds only if every command that sets an anchor refuses an unknown target. `AddGroup`/`AddSlot` take `…fields` (which include `anchor`, `NodeBase`), and 14.5's `setAnchor` takes a target. Neither has a `ModelRejectionKind` for an unknown target, and neither has one for an unknown or non-group `parent`. Two units: 13.2 lets an `AddSlot` with `anchor: { type: 'slot', ref: 'nope' }` through (schema passes, no kind exists), so the design now holds what "only a file" can. 13.3 tests that only loading produces it. Both obey the spine. The violation's owner can't assume the precondition.
**Fix.** Add a kind now, alongside `id-taken`: e.g. `unknown-target` (ids: the missing id). 13.2 refuses an unknown `parent`, a slot as `parent`, and an unknown anchor target with it, and `setAnchor` reuses it. Or drop "only a file can hold" and say commands may create it too.

### M10. The crash-cap failed state has no defined type, and `Option` vs `?` is open (line 430)
**Problem.** "The failed state belongs to the worker and carries an optional `StageId`" plus a message. No type is named, and protocol's own `failed` kind (line 428) is a different failure that feeds the same badge. AD-24 says `Option<T>` replaces `T | undefined` in signatures, but a stored value is unwrapped. The `workers` story and the strip/badge story (16.x, ticket `epic-a-new-design-opens` line 193) each pick a shape: `{ state: 'failed'; message; stage: Option<StageId> }` vs `{ …; stage?: StageId }`. The text also never says where `<message>` comes from. A `messageerror` (the "fails to deserialize" crash) carries no message.
**Fix.** Name it, as `workers`' own type: `WorkerFailed = { message: string; stage?: StageId }` (stored, so unwrapped), with `message` = the `ErrorEvent`'s message, or a fixed text for a deserialize failure. Say how it relates to protocol's `failed` (stage-level, not a worker state).

---

## Low

### L1. `LayoutOutput.placed` comment is stale (line 993)
"false: in or below an anchor cycle (AD-3)". It is now also false in or below an unresolvable anchor. **Fix:** "false: in or below an anchor cycle or an unresolvable anchor (AD-3, Violations)".

### L2. "ids name the anchored node" doesn't cover vertices, construction points or lane operations (line 1039)
AD-3 (line 227) gives anchors to nodes, vertices, construction points and placed lane operations. On a split board it is also unclear whether ids are authored `Id`s (one violation) or `<side>/<id>` (two). **Fix:** "ids name the anchored item (authored id)", or state the side form.

### L3. `DeclaredInput.unit` "required when kind is 'quantity'" is a comment, not a shape (line 893)
The declaration is checked by a schema at library build (line 872), but `unit?: Unit` on a flat object lets the schema and `checkInputs` disagree (one refines with `v.check`, one still handles `undefined`). **Fix:** make `DeclaredInput` a `v.variant('kind', …)` whose quantity branch has `unit: Unit` and whose other branches have no `unit`.

### L4. A failed `loadScript` "reruns later", but nothing triggers a rerun without an edit (line 867; BP-6)
BP-6's `unavailable` lanes "rerun in the next pause". A pause happens only when patches arrive, so a lane whose chunk failed to fetch stays stand-in until the user edits something. 📐 With hashed chunks on a static host, a redeploy under an open tab makes every not-yet-fetched version 404 for that tab's life (deploy skew). The hosted-library Deferred row doesn't cover it, because M1's bundled library has the same failure mode. **Fix:** say who schedules the retry (e.g. `pipeline` re-enters the pause after a backoff while any lane is `unavailable`). Add skew to the "Static hosting" Deferred row.

### L5. The error-kind uniqueness rule is checked by nobody (line 778)
`id-taken` and `root-required` **pass**. Neither appears in `Rejection`'s fixed kinds (`input-invalid`, `unavailable`, `stale`), `DesignInvalid`, `LoadError` or `StorageError`, and neither collides with a `ViolationKind`. Nothing enforces the rule, though. Watch points:
- Each later story adds kinds by hand. The rule's scope excludes `Violation`, yet `blueprint-input-invalid` and `override-not-allowed` are both a `ModelRejectionKind` and a `ViolationKind`, with different shapes.
- 14.2's "rename to an existing name is refused" will need a kind. If it picks `id-taken` for a `ParameterName`, the name stretches. If it picks `name-taken`, fine.
- The one-off request's `stale` rejection (line 421) and `Rejection`'s `stale { seq, latest }` share a kind. Whether their shapes match is unstated, and an action that issues a request and then runs a command receives both.
**Fix:** a `schema` types spec asserting the pairwise kind intersections of the listed unions are `never` (one `expectTypeOf` per pair), so a story that adds a clashing kind fails to compile. State that 14.2 uses `id-taken` or a new kind, and that request `stale` has the same shape as `Rejection`'s.

### L6. "worker.format 'es'" applies to the case worker too (line 869)
The setting is global to Vite's worker build, so it also changes how the case worker's OCCT/replicad glue and the quickjs-wasi WASM load are bundled. The decision verified only the library chunks. **Fix:** 13.21's verify also builds and starts the case worker under `es` (or records that a case-worker smoke test exists).

### L7. 13.21's "a second version's script is its own chunk" needs a production build inside a test (diff line 100 / memlog)
`pnpm test` doesn't run `vite build` today. A build-output assertion either adds a slow build to the suite or lives outside it, unenforced. **Fix:** name where it runs (a CI step after `vite build` that reads the manifest), weighed per "checks must earn their cost".

### L8. Test builders for the new kinds aren't listed (line ~1120)
AGENTS.md: "a new schema concept ships its builder in the same PR". The `schema/testing` builder list has no `anExpression`, `aLength`, `aDelta` or `anAngle`, though 13.2 adds four schemas. **Fix:** add them to the tree's builder list.

### L9. `hashing`'s parenthetical "and `hashing` imports no workspace package" (line 332)
It is now "no workspace package but `result`". It is harmless but literal readers will flag it. **Fix:** "imports no package that defines a brand".

---

## Two units that obey every AD and still clash (summary)

| Pair | Clash | Finding |
|---|---|---|
| `workers` crash cap (23.8) × status strip (16.x) | strip's "failed … in plates" unreachable; crash loop never caps | H1 |
| `library/worker` LibraryData (13.21) × blueprint runner pool (13.17 / BP-9) | lazy `loadScript` vs eager scripts argument | H2 |
| load flow in `commands` (23.5) × autosave in `app` | failure state set, then cleared by the new design's own autosave; no token to set it | M4 |
| `quantity(unit)` schemas (13.2) × blueprint inputs (13.4) | no schema or unit for `InputValue`'s quantity; two quantity shapes | M7 |
| `AddSlot`/`setAnchor` (13.2/14.5) × unresolvable anchor (13.3) | command lets an unknown target in; "only a file" breaks | M9 |
| `ui` hotkey service × dependency-cruiser kernel rule | line 330 allows `di`, line 328 forbids it | M1 |
