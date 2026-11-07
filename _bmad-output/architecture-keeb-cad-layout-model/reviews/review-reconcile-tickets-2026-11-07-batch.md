# Reconcile tickets against the batched unknowns spine update (2026-11-07)

Inputs: the uncommitted spine diff (scratchpad `spine-diff.patch`), the last 16 memlog decisions (23.5 reset save, 23.8 crash-cap naming and badges, 13.17 kernels may import result, 13.3 unresolvable anchors, 13.18 no unpin, 13.21 LibraryData parts 1-2 and worker.format 'es', 13.2 units parts 1-4 and rejection kinds), every open entry in `tickets/*/tickets/tickets.toml`, the epic files of epics 13 and 23, `component-ownership.md`, `deferred-work.md`, and `ux-editor/EXPERIENCE.md`.

Open means no plan marked `built` or `done`. Done or built and so out of scope: 23.1-23.4, 23.6, 23.10-23.13, 23.15-23.18, 13.9, 13.16.

Epic numbers used: 23 = a-new-design-opens, 13 = see-corneys-keys, 14 = change-a-parameter, 16 = keep-my-work, 7 = routing-and-fab.

Verdict: every unknown in the batch is settled, so all seven can be cleared except 23.5's Stryker half and 23.8's Tree empty-text half. 29 ticket and epic statements and 5 EXPERIENCE.md statements are stale or missing work (34 in total). Four of them drop or contradict a ticket's requirement (section "Dropped or contradicted requirements"). Three details the spine leaves open are listed under "Questions".

## Dropped or contradicted requirements

1. **13.18 loses the pin-case refusal.** The ticket says it refuses deleting "the design part or library-versions entry that meta.defaultPart names", and adds `library.unpin` if the plan tests the pin case. The spine now says M1 has no command that removes a pin, and refuses only the design-part delete. The `library-versions` half of the refusal moves to whichever later story first removes a pin.
2. **23.7's launch fallback goes the wrong way for a failed reset save.** "A stored design that fails to load (...) falls back the same way", meaning to the newest stored design and then NewDesign. AD-13 now says that when the reset save fails at launch, launch opens a new, unsaved design whose autosave failure state holds the error. It also explicitly rejects falling through to the next stored design. The ticket's list of failures doesn't name this case, so a plan could reasonably read "the same way" into it.
3. **13.21's LibraryData scope changes.** "the pinned declarations and compiled scripts" becomes every released version's declarations (eager) plus a lazy `loadScript(id, version)`. The pool no longer receives "the compiled scripts" from the entry; it loads the pinned versions through `library-versions`. 13.21 also gains a build-config change it never had: Vite's `worker.format: 'es'`.
4. **23.8's failed state changes owner.** The ticket says "the strip shows the stage failed". The failed state now belongs to the model worker. Its `StageId` is optional and set only when a stage was running at the last crash. The `failed: <message>` text was never in the ticket. 23.4, which is built, codes the status as `'idle' | 'running' | 'failed'`, with no message and no stage. So 23.8 must widen a type that a done story shipped.

## Stale statements: epic 23

### 23.5 (`epic-a-new-design-opens/tickets/tickets.toml`, id 5)

**S1, description.**
- Stale: "when that save fails, the load stops before replaceDesign, the stored bundle stays untouched and the flow reports the save's error (Decision 2026-11-07)"
- Spine (AD-13 One load flow): the stored bundle stays untouched and the open design stays open. The flow reports the save's `StorageError` (`storage-unavailable` or `quota-exceeded`). At launch, with no design open, it opens a new, unsaved design whose autosave failure state holds that error.
- Proposed: "when that save fails, the load stops before replaceDesign: the stored bundle stays untouched, the open design stays open, and the flow reports the save's StorageError (storage-unavailable or quota-exceeded); at launch, with no design open, story 7 opens a new, unsaved design whose autosave failure state holds that error (spine AD-13, 2026-11-07)."

**S2, description.**
- Stale: "story 7's launch sets it when load or listDesigns returns storage-unavailable"
- Spine: launch also sets the failure state when a reset save fails.
- Proposed: "story 7's launch sets it when load or listDesigns returns storage-unavailable, or when the load flow's reset save fails."

**S3, verify.**
- Stale: "a load whose reset save fails leaves the stored bundle unchanged and opens nothing"
- Spine: the open design stays open and the save's error is reported.
- Proposed: "a load whose reset save is refused for space leaves the stored bundle unchanged, keeps the open design open (replaceDesign not called) and reports quota-exceeded; one whose storage can't be opened reports storage-unavailable."
- Name the boundary roles, not numbers, per AGENTS.md.

**S4, unknown.**
- Stale: "Before planning, the spine folds in Decision 2026-11-07 (a failed reset save stops the load) into AD-13's load flow, and"
- Spine: folded into AD-13.
- Proposed unknown: "Sergii confirms the browser backend leaves Stryker's mutate list (a mutation-config edit), proven by a toggled bug instead."

### 23.7 (id 7)

**S5, description.**
- Stale: "A stored design that fails to load (load's not-found, any LoadError or design-invalid: ...) falls back the same way"
- Spine: AD-13, a reset save that fails at launch opens a new unsaved design. It does not fall through to the next stored design.
- Proposed: add after the fallback sentence: "When the load flow's reset save fails, launch does not fall back to the next stored design: it opens a new, unsaved design and sets autosave's failure state to the save's error (spine AD-13, 2026-11-07)."

**S6, verify (missing row).**
- Add: "with a stored design whose routing file is unreadable and a reset save refused for space, launch opens a new design, autosave's failure state holds quota-exceeded, and the stored design is unchanged."

### 23.8 (id 8)

**S7, description.**
- Stale: "failed after story 4's crash cap, until Restart"
- Spine (AD-11 Lifecycle): the failed state belongs to the model worker. It carries an optional `StageId`, set only when a stage was running at the last crash, meaning its `stage-started` came in the crashing epoch with no later post. The strip shows `failed: <message>` for the worker, naming that stage when there is one, with Restart.
- Proposed: "after story 4's crash cap, failed: <message> for the model worker, naming the stage when one was running at the last crash (its stage-started in the crashing epoch with no later post), with Restart, until Restart; this story widens workers' failed status (23.4 codes it as a bare 'failed') to carry the message and the optional StageId."

**S8, verify.**
- Stale: "after the crash cap the strip shows the stage failed until Restart."
- Proposed: "after the crash cap with parts running at the last crash, the strip shows failed: <message> naming parts with Restart; after a crash cap with no stage running (no stage-started in the crashing epoch, or one followed by a post), it shows failed: <message> with no stage; Restart clears both."

**S9, unknown.**
- Stale: "And before planning, the spine says what the strip names as failed after the crash cap when no stage was running (its Open Question, revisit at 23.8)."
- Spine: closed.
- Proposed: keep only the Tree empty-text question.

**Note.** 23.8 says "Tab badges ... are owned by other slices". The crash-cap badge rule goes to 7.2 (S26).

## Stale statements: epic 13

### 13.17 (`epic-see-corneys-keys/tickets/tickets.toml`, id 17)

**S10, unknown.**
- Stale: the whole field ("expr is a kernel and imports no workspace package, so it can't use result's Result").
- Spine: AD-10's kernel line now says every kernel may import `result`. `result` imports nothing, and `di` and `reactive` stay closed to kernels.
- Proposed: clear it (`None`).

**S11, description (missing work).**
- After "returning Result<{ value, unit }, ParseError>", add: "expr imports result, AD-10's amended kernel line (2026-11-07): this story changes .dependency-cruiser.mts so every kernel but result may import result (KERNELS' comment, allowedTargets' kernel branch from [] to ['result'], result itself still []), updates tooling/ad10/rules.spec.ts's 'gives every non-kernel row di, reactive and result, and no kernel any' to the new rule (also closing deferred-work's card that its name claims more than its expects), and adds violation fixtures: a kernel importing di, a kernel importing reactive and result importing a workspace package each rejected, a kernel importing result allowed."

**S12, verify (missing row).**
- Add: "dependency-cruiser allows expr to import result and rejects a kernel importing di or reactive, and result importing any workspace package."

### 13.21 (id 21)

**S13, description.**
- Stale: "library/worker exports LibraryData (the pinned declarations and compiled scripts, its fields per the spine's Data Schema)"
- Spine (Data Schema LibraryData): `{ declarations: every released version of every library blueprint, eager, the same data library's main subpath exports; loadScript(id, version): Promise<string> }`. It is plain TypeScript in `schema` with no Valibot schema. `loadScript` is called only for an (id, version) that `declarations` holds. A rejection means could-not-load, and the runner wraps it with `result` into its unavailable lane result.
- Proposed: "library/worker exports LibraryData (schema's Data Schema type: declarations of every released version, eager; loadScript(id, version) returning the compiled script, one lazy chunk per version through import.meta.glob with ?raw), which only the model and case worker entries import"

**S14, description.**
- Stale: "the model worker's entry hands the compiled scripts to story 17's VM pool, which it fills in the pause between applying patches and running stages"
- Spine: `createDerivations` and the VM pool pick the pinned versions through the design's `library-versions`. A script is fetched only when a design pins its version. A failed load is the unavailable lane result: not cached, rerun later.
- Proposed: "the model worker's entry hands LibraryData to story 17's VM pool, which picks the pinned versions through the design's library-versions and loads each script with loadScript; a rejected load is the runner's unavailable lane result (not cached, rerun later)". See question Q1 on what happens while a load is pending.

**S15, description (missing work).**
- Add: "The workers build with Vite's worker.format 'es' (not the default 'iife', which turns code splitting off and inlines every version's script into the one worker bundle); this story sets it."

**S16, verify (missing rows).**
- Add: "the built model worker puts a second version's script in its own chunk; LibraryData.declarations holds both versions of a two-version test blueprint; a loadScript rejection gives an unavailable lane result that is not cached and runs again on the next run."

**S17, unknown.**
- Stale: "Before planning, the spine defines LibraryData's fields in its Data Schema (a blocker since 2026-11-07)."
- Spine: defined.
- Proposed: clear it (`None`).

### 13.18 (id 18)

**S18, description.**
- Stale: "This story adds parts.deletePart (and library.unpin if the plan tests the pin case) carrying the check that refuses deleting the design part or library-versions entry that meta.defaultPart names"
- Spine (AD-2): only the design-part delete is refused. M1 has no command that removes a `library-versions` pin. The first story that removes one (an unpin command, or pruning unused pins) carries `default-part-required` for the pin.
- Proposed: "This story adds parts.deletePart carrying the check that refuses deleting the design part meta.defaultPart names (M1 has no library.unpin: pins are added by the commands that use a library item and never removed by hand; spine AD-2, 2026-11-07)"

**S19, unknown.**
- Stale: the whole field.
- Proposed: clear it (`None`).

### 13.2 (id 2)

**S20, description.**
- Stale: "schema gaining Expression, Quantity and quantity(unit), Delta, Length, Angle, Vec2, Offset and Gap"
- Spine:
  - `quantity(unit)` is `expressionSchema` piped with `v.metadata({ unit })` and the wrong-unit check, declared as returning `v.GenericSchema<string, Quantity<U>>`, with the one cast inside `quantity`.
  - There is one schema per kind: `lengthSchema`, `deltaSchema` and `angleSchema`, each adding `v.metadata({ quantity })`.
  - `expressionSchema` adds `v.metadata({ expression: true })`.
  - No field is unitless in M1.
- Proposed: "schema gaining Expression (expressionSchema with v.metadata({ expression: true })), Quantity and quantity(unit) (declared as returning v.GenericSchema<string, Quantity<U>>, its one cast inside), lengthSchema, deltaSchema and angleSchema (each quantity(unit) plus v.metadata({ quantity: 'length' | 'delta' | 'angle' })) with their types Length, Delta and Angle, Vec2, Offset and Gap; no unitless field (spine 2026-11-07)"

**S21, description.**
- Stale: "a given one is checked with idSchema and refused when the design already has it" and "DeleteNode takes a list of ids and refuses the root"
- Spine: `ModelRejectionKind` gains `id-taken` (ids: that id) and `root-required` (ids: the root's id), both added by 13.2 and built with model/main's `reject` from 13.18.
- Proposed: "...refused with the model rejection id-taken naming that id" and "...refuses the root with root-required naming it (this story adds both to ModelRejectionKind, built with 13.18's reject)"

**S22, description.**
- Stale: "Owns AD-24's who-points-at walk"
- Spine: the walk recognises an Expression by `expression: true` metadata, which `v.getMetadata` merges from nested pipes, and yields `parameter` references.
- Proposed: "Owns AD-24's who-points-at walk, which recognises an Expression by its expression metadata (inherited by every quantity schema) and yields parameter references (none until 14.2)"

**S23, verify.**
- Stale: "one already in the design is refused, the design unchanged" and "refuses the root"
- Proposed: "one already in the design is refused with id-taken naming that id, the design unchanged" and "refuses the root with root-required naming it". Add a row: "a types test shows a field built on lengthSchema infers Quantity<'mm'> and an Angle doesn't assign to a Length."

**S24, unknown.**
- Stale: the whole field. Units on quantities is closed by parts 1-4, and the rejection kinds are named.
- Proposed: clear it (`None`).

### 13.3 (id 3)

**S25, unknown.**
- Stale: the whole field.
- Spine (Violations row): an anchor whose target doesn't resolve reports `unresolvable-reference` as an error, ids naming the anchored node. It and its dependants post `placed: false`. It blocks geometry exports.
- Proposed: clear it (`None`).
- The description already matches. Optional touch: "(spine Violations row, 2026-11-07; only a file can hold it, since deleting the target clears the anchor)".

## Stale statements: other open entries

**S26, 7.2 (`epic-routing-and-fab/tickets/tickets.toml`, id 2), description and verify (missing).** It owns tab badges.
- Spine (AD-11): after the crash cap every model-worker stage counts as failed. Layout, Outline, PCB and Firmware badge failed until Restart, and routing and case keep their own states.
- Add to the description: "after the model worker's crash cap every model-worker stage counts as failed, so Layout, Outline, PCB and Firmware badge failed until Restart while routing and case keep their own states."
- Add to verify: "after the crash cap the Layout, Outline, PCB and Firmware tabs show failed, and the Case tab keeps its own state."

**S27, 14.2 (`epic-change-a-parameter/tickets/tickets.toml`, id 2), description.**
- Stale: "Commands refuse an expression that fails to evaluate (wrong unit, unknown name, division by zero, negative length)"
- Spine: `negative-length` is reported on fields whose schema is `lengthSchema` (metadata `quantity: 'length'`). A Delta is signed and unchecked.
- Proposed: "...negative length on a lengthSchema field, found by its quantity 'length' metadata; a deltaSchema field may evaluate negative"
- Add to verify: "a negative value is accepted in a Delta offset and refused in a Length field."

**S28, 16.1 (`epic-keep-my-work/tickets/tickets.toml`, id 1), description (missing).**
- 16.1 adds the load flow's notices. It names the reset toast and the launch fallback banner, but not the case where the reset save fails and the flow reports the save's `StorageError` through the notices.
- Proposed: add "a load whose reset save fails shows the save's error (storage-unavailable or quota-exceeded) and the open design stays open". The UI treatment is open, see Q3.

**S29, epic file `epic-see-corneys-keys.md`, Notes, Open question (2026-11-05, sweep replan).**
- Stale: "F3's error severity for an anchor to an unknown id (unresolvable-reference covers only parts), or the ModelRejectionKind members for a taken id and for deleting the root (pick: id-taken, root-required); 13.2 and 13.3 are not ready until it does. Its Open Question 'Units on quantities' is still listed open"
- Spine: all settled.
- Proposed: a new replan Decision closing it: "Decision (2026-11-07, replan after the batched spine update): the spine settled 13.17 (kernels may import result), 13.21 (LibraryData's fields, worker.format 'es'), 13.18 (no library.unpin in M1), 13.2 (quantity schemas, id-taken, root-required), 13.3 (unresolvable-reference for anchors); their unknowns are cleared." B9 should be checked separately; it is not in this diff.

**Incidental, predating this update.**
- Epic 13's R4 says "reports `anchor-cycle`", but the spine's kind is `dependency-cycle`.
- Not counted: 13.17's fence sentence "blueprint imports only geometry, expr, schema and hashing" is consistent, because `result` is open to every non-kernel.

## Stale statements: EXPERIENCE.md (`epic-platform-baseline/ux-editor/EXPERIENCE.md`)

**E1, State Patterns > Output states, failed row.**
- Stale: "failed `[ASSUMPTION]` | ● + `failed: <message>` | Last good output stays, marked stale; message also in the violations panel"
- Spine: after the model worker's crash cap the strip shows `failed: <message>` for the worker, naming the stage running at the last crash when there is one, with Restart. Every workspace holding a model-worker stage (Layout, Outline, PCB, Firmware) badges failed, and routing and case keep their own states.
- Proposed: add after the table: "After the model worker's crash cap: the strip shows `failed: <message>` for the worker, naming the stage that was running at the last crash when there is one, with Restart; Layout, Outline, PCB and Firmware badge failed until Restart; Routing and Case keep their own states."
- "message also in the violations panel" has no spine basis for a worker crash, which is not a Violation. See Q2.

**E2, State Patterns > File, autosave failed row.**
- Stale: "`Autosave failed: browser storage full. Save to file (Ctrl+S).` Shown only once no autosave versions are left to prune (AD-13)"
- Spine: the failure state also holds `storage-unavailable`. Launch sets it when storage can't be opened or when a reset save fails, with no pruning involved.
- Proposed: "`Autosave failed: browser storage full.` (quota-exceeded) or `Autosave failed: browser storage unavailable (<message>).` (storage-unavailable), then `Save to file (Ctrl+S).` Shown once no autosave versions are left to prune, or from launch when browser storage can't be opened or a reset point couldn't be saved (AD-13)."
- The storage-unavailable half predates this update; the reset-save path adds to it.

**E3, Navigation "Start." (line 47) and Journey step 1 (line 283).**
- Stale: "Launch reopens the last autosaved design; otherwise the Start screen." and "no autosave exists, so the Start screen offers New design"
- Spine: launch runs NewDesign when nothing is stored, as 23.7 already says. The reset-save decision rejects "the Start screen with no design (a no-design state nowhere else in the spine)".
- Proposed: "Launch reopens the URL's or the last autosaved design; otherwise it opens a new design. The Start screen is reached from the File menu." Journey step 1: "no autosave exists, so launch opens a new design".
- This predates this update; the decision only makes it explicit.

**E4, Global chrome > Design info, Versions reasons.**
- Stale: "reason `file` / `saved` / `switch` / `migration` / `copy`"
- Spine: AD-13 adds `reset`.
- Proposed: add `reset`. This predates this update (2026-11-05).

**E5, Export menu.**
- Stale: "`blocked: 2 model errors (anchor-cycle, …)`"
- Proposed: `dependency-cycle`. Incidental and predates this update.

## Settled unknowns: clear or keep, and the work each ticket now carries

| Ticket | Clear? | Work the ticket now carries |
| --- | --- | --- |
| 23.5 | Partly: drop the AD-13 fold half; keep the Stryker mutate-list confirmation | Reset-save failure stops the load before `replaceDesign`, leaves the open design open and reports the `StorageError` (S1-S3); launch's half lives in 23.7 |
| 23.7 | (no unknown change) | Reset-save failure at launch opens a new unsaved design with the failure state set, not the next stored design; a verify row (S5-S6) |
| 23.8 | Partly: drop the crash-cap naming half; keep the Tree empty-text question | Widen workers' `failed` status (bare in 23.4) to carry a message and an optional `StageId`, tracking `stage-started` per epoch with no later post; strip `failed: <message>` naming the stage when set; two verify rows, stage and no stage (S7-S8) |
| 13.17 | Yes | `.dependency-cruiser.mts`: kernels (not `result`) may import `result`; rules.spec.ts's kernel test updated (and deferred-work card line 78); fixtures for a kernel importing di or reactive and for result importing a workspace package (rejected), and for a kernel importing result (allowed); expr's stub returns result's `Result` (S10-S12) |
| 13.21 | Yes | `LibraryData` per Data Schema (declarations of every version, eager; `loadScript` lazy per version through `import.meta.glob` lazy with `?raw`, to be verified in a worker build); pool picks pinned versions via `library-versions`; rejection becomes unavailable, not cached; Vite `worker.format: 'es'`; test a second version's script is its own chunk (S13-S16) |
| 13.18 | Yes | `parts.deletePart` only, refusing the default design part with `default-part-required`; no `library.unpin`; no pin-case test (S18) |
| 13.2 | Yes | `expressionSchema` metadata `expression: true`; `quantity(unit)` with its declared return type; `lengthSchema`/`deltaSchema`/`angleSchema` with `quantity` metadata; a types test that an Angle doesn't assign to a Length; `id-taken` and `root-required` in `ModelRejectionKind`, built with `reject`; the walk recognises expressions by metadata (S20-S23) |
| 13.3 | Yes | No new work: the description already reports an unknown anchor as an error with `placed: false`; it extends the 13.18-added `unresolvable-reference` to anchors |

## Gaps with no owning ticket

**G1. `DeclaredInput.unit` is now required when kind is `'quantity'`.** The spine still types it as `unit?: Unit`, with the rule in a comment. No ticket names coding the `BlueprintDeclaration`/`DeclaredInput` schema. The candidates are 13.21 ("validates its declaration with schema's") or 13.17 (the apiVersion check). Whichever adds the schema should make it a variant on `kind`, or check `unit` present for `'quantity'` and absent otherwise, with boundary rows. Proposed: add to 13.21, which validates declarations at build time.

**G2. `negative-length` discovery by `quantity: 'length'` belongs to 14.2.** It is covered by S27.

## Questions (the spine doesn't say; ask before planning)

**Q1 (13.21).** `loadScript` returns a Promise, but the pool fills "in the pause between applying patches and running stages", and stages run synchronously in the reactive graph. What does a lane return while its version's chunk is still loading?
- (a) The unavailable lane result, rerun when the load resolves.
- (b) The stage waits.
- The spine defines only a rejected load (unavailable). A pending first load of a newly pinned version needs one answer.

**Q2 (EXPERIENCE E1, 23.8).** Does the crash-cap `failed: <message>` also appear in the violations panel, as the row says? A worker crash isn't a `Violation`.

**Q3 (16.1).** How is a failed reset save shown when a design is open: the `save failed: <reason>` toast, or the autosave-failed banner? And at launch, does the "Couldn't open your last design" banner also show, beside the autosave banner? Also, `<message>` for a crash that came as `messageerror` has no message text from the event, so the strip's text for that case is undefined (23.8).

## Spine-internal note (not a ticket item)

AD-10 still says "Any package may import `di`'s Vue-free root" (line 330) and "Any package may import `reactive`" (line 342). The amended kernel line now closes both to kernels. The words "but a kernel" were added only to the `di` package-tree comment.
