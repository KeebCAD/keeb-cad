# Adversarial review: the 23.4 / 23.5 spine update (2026-11-07)

- **Target:** the uncommitted spine change (`spine-23-4.diff`: `DesignPatch` into `schema`, `workspaceSchema`, `stageIdSchema`, the `Violation` skeleton with empty `ViolationKind` and `fixSchema`, `StorageError` narrowed per method, `createDerivations` timed to 13.18 and `LibraryData` to 13.21) and the `.memlog.md` decisions 23.4 Q1-Q4 and 23.5 Q1-Q2.
- **Lens:** two units one level down that each obey every rule as changed, yet build incompatibly. Read against AD-1, AD-2, AD-10, AD-11, AD-13, AD-25, the glossary and the Data Schema, and against the code in `packages/design`, `packages/schema` and `packages/storage`.
- **Verdict:** **Conditional.** The `DesignPatch` move, the `Violation` skeleton and the `Workspace` picklist hold up: the picklist's order matches the AD-11 workspace table and EXPERIENCE's keys 1-5, and `design/src/patching/types.ts` already has the shape. But the new `StorageError` reuses a kind that `Rejection` already uses (F1). `LoadedBundle` is named and never defined, which leaves the `reset` point's input with no type (F2). `StageId` contradicts the glossary and the cache-key rule (F3). And the new 13.18 note opens a second way for `pipeline` to get the mirror (F4). F1, F2 and F4 are small wording fixes. F3 and F5 need Sergii to decide.

Severity: **high** = two units can each obey the spine and still clash, or saved data is lost; **medium** = an ambiguity that two agents would settle differently; **low** = stale or loose wording.
Kind: **wording** = the fix only restates a decision already made; **design gap** = Sergii decides.

No critical findings.

---

## F1. `StorageError`'s `unavailable` collides with `Rejection`'s `unavailable`. HIGH, design gap (small)

**Quote (Data Schema):** `| { kind: 'unavailable'; command: string } // the availability check said no` (in `Rejection`), and the new `| { kind: 'unavailable'; message: string } // the browser storage can't be opened` (in `StorageError`). Also: "The design store's own kinds carry no message: editor writes their text from the kind (an exhaustive ts-pattern match)."

**Unit A: `commands`' load flow, or Save (an action).** Save is an action, `apply(): AsyncResult<void, E>`, and it calls `storage.save`. Its `E` is therefore `Extract<StorageError, …'unavailable' | 'quota-exceeded'>`. `DesignStore.run` returns `AsyncResult<void, ActionError<H> | Rejection>` (code: `design-store.ts:51`). So Save's error type holds two members with `kind: 'unavailable'`, and they have different fields.

**Unit B: `editor`'s notices (16.1).** These read `StorageError` and `Rejection`, as the spine directs, through an exhaustive `match(error).with({ kind: 'unavailable' }, …)`. That one branch matches both members, so `.exhaustive()` passes and the compiler stays silent. The branch writes "Save is unavailable" from the kind, the way it writes a `Rejection`. Or it reads `.command` and gets `undefined` when storage is blocked. App autosave's failure state also holds the storage `unavailable`, so the same word means two different things in two notices.

**Divergence:** one discriminant value, two shapes. Narrowing by `kind` alone no longer says which thing failed, and the exhaustive match the spine relies on cannot catch it.

**Smallest fix:** rename the storage kind to `storage-unavailable` (or `browser-storage-unavailable`). Add one line to the Data Schema: every `kind` is unique across the error unions one caller can receive (`Rejection`, `DesignInvalid`, `LoadError`, `StorageError`). Rejected: nesting the error as `{ kind: 'storage'; error: StorageError }`, because it adds a second unwrap at every caller for one collision.

---

## F2. `LoadedBundle` is used and never defined, and the `reset` point has no input type. HIGH, wording plus a small gap

**Quote (Data Schema, new):** `load(id): AsyncResult<LoadedBundle, LoadError | not-found | unavailable>`. AD-13: "the load flow saves it from the bundle `storage`'s load returned as read, held in memory". `MigratedBundle.routing?: unknown // absent when missing or unreadable`.

**Unit A: `storage` (23.5).** It obeys "its caller hands the migrated bundle to `replaceDesign`" (AD-8, line 301) and returns `LoadedBundle = MigratedBundle`. That is the only bundle type the spine defines for this edge. The code has a third candidate, `storage`'s `DesignBundle` (parsed and frozen, `packages/storage/src/bundle/types.ts`).

**Unit B: `commands`' load flow (23.5/23.7).** Before `replaceDesign` it must save the `reset` point, "the bundle exactly as read". `MigratedBundle` has already dropped the unreadable routing file ("passed as absent"), so the bytes that file exists to keep are gone. `save` takes "`design`'s bundle" (parsed values) and has no reason parameter in any signature. So the load flow cannot hand storage what it read, or tell storage that the reason is `reset` rather than `autosave`.

**Divergence:** each unit picks its own meaning for `LoadedBundle`. If it is `MigratedBundle`, the `reset` point silently saves the emptied bundle, and Q21's protection is lost. If it holds the raw texts, `save` has no overload that accepts them.

**Smallest fix:** define it in the Data Schema as `type LoadedBundle = { migrated: MigratedBundle; asRead: BundleTexts }` (assets later). Give `save` its signature: `save(bundle, reason: VersionReason)`, accepting `BundleTexts` for `reset`. Also delete the now-dangling "(…beside `LoadError`: Open Questions)" at AD-8, line 301, because the diff removed that Open Questions row.

---

## F3. `StageId` contradicts the glossary and the cache key, and does not say which threads post it. MEDIUM, design gap

**Quotes:**
- `stageIdSchema` comment: "stage-started's stage, the status strip's label, the cache key's stage id; the netlist…, the drc checker… and exports are not stages".
- Glossary `stage` (line 137): "`plates`, `pcb`, `firmware`, `case`, `routing` and `exports` are stage packages".
- AD-11 Cache key: "stage id + stage version (for the `drc` checker `pipeline` runs live, its id and version) … + routing hash for the live `drc` check and exports".
- AD-11 Lifecycle: "Before each stage **the model worker** posts `stage-started`… The case worker is outside this rule."

**Unit A: `pipeline`'s cache-key builder.** It obeys the comment and types its id parameter as `StageId`. Then the `drc` check and the export cache, both of which the same AD-11 sentence keys by id, cannot be keyed without a cast.
**Unit B: `pipeline`'s `drc` runner, or the first export story.** It obeys the glossary (exports is a stage) and the cache-key sentence (drc has "its id"). It adds `'drc'` and `'exports'` to `stageIdSchema`. Now `stage-started { stage: 'drc' }` type-checks, which contradicts "posts none". A second agent instead widens the key to `string`, and the two lists drift.

**Second divergence: `routing` and `case` in `StageId`.**
- If `pipeline` (in the model worker) posts `stage-started { stage: 'case' }` when it hands the slice to the case worker, the editor shows "case 3 s". Then "the next post clears it" while case is still running in its own worker.
- If `pipeline` doesn't post it, the two options are dead in `stage-started`, and `workers`' status code still has to handle them.

**Smallest fix:**
- Split the type: `StageId` keeps the closed list, and the cache key takes `StageId | 'drc'`, named for its role (for example `CacheKeyId`).
- Fix the glossary line so it drops `exports` from "stage packages", or state the exception in one place.
- State whether the background stages (`routing`, `case`) post `stage-started`. If they don't, type the payload as the subset of live stages, picked from `stageIdSchema`'s options.

---

## F4. "Before 13.18 the entry hands `pipeline` the mirror" opens a second way to get the mirror. MEDIUM, wording

**Quote (AD-25, new):** "the `LibraryData` it reads from `library/worker` (from 13.18, the first derivation; before it the entry hands `pipeline` the mirror only)". AD-10: "`pipeline` imports `design/worker` directly: it is the model worker's only receiver…, applies them through the mirror's writer". AD-10: "the model worker's entry hands it the derivations `createDerivations` returns".

**Unit A: `app`'s model-worker entry (23.4).** It obeys "hands `pipeline` the mirror". It builds or resolves a mirror and passes it to `pipeline` as an argument, or to the constructor of a `di` service.
**Unit B: `pipeline` (23.4).** It obeys "imports `design/worker` directly" and `inject()`s the mirror writer from `design/worker`'s module.

The two now hold different mirrors whenever the entry calls `new` rather than `container.get`. At 13.18, `createDerivations` receives the entry's mirror while `pipeline`'s writer updates the container's mirror, so the derivations never see a patch. Even when both point at one instance, `pipeline`'s input changes shape at 13.18 (mirror, then derivations), so 13.18 rewrites a 23.4 interface.

**Smallest fix:** write "before 13.18 the entry hands `pipeline` nothing; `pipeline` injects the mirror and its writer from `design/worker`'s module, and from 13.18 the entry resolves that same mirror from its container for `createDerivations` and hands `pipeline` only the derivations."

---

## F5. `Workspace` in `schema` lets `workers` read the URL itself. MEDIUM, design gap

**Quotes:** "`workers` sends `focus` at worker start (the workspace in the URL)". Stack: "**vue-router is the one owner of the open design and workspace**". `workspaceSchema` comment: "the router parses the URL's segment with it, a failed parse opening layout". AD-10: `workers` imports `design`, `protocol`, `messaging`, `schema` and `reactive`, so not `editor` or vue-router.

**Unit A: `workers` (23.4).** At spawn it needs a `Workspace` for its first `focus`, and nothing hands it one: `editor` calls `workers`, not the reverse. Now that `workspaceSchema` is in `schema`, it can parse `location.hash` itself, which obeys "the workspace in the URL" to the letter.
**Unit B: `editor`'s router (23.7).** It parses the same segment and falls back to `layout` with `router.replace`. After a load whose URL design wasn't stored, it rewrites the URL.

**Divergence:** two parsers of one URL. Spawning waits for the first `Committed`, and launch's `router.replace` happens around that same moment. So `workers` can send `focus` for the URL's old workspace (or its own fallback) while the router has already moved on. The visible set is then computed for the wrong workspace until the first switch.

**Smallest fix:** `workers` reads no URL. Its spawn takes the initial `Workspace` as an argument (`editor`/`app` passes the router's parsed value), and every later `focus` comes from `editor` on a switch. Rejected: a `Workspace` service in `workers`, because it would be a second owner beside vue-router.

---

## Low

- **L1. `readonly` on the patches payload.** The code's commit event is `patches: readonly DesignPatch[]` (`design/src/store/types.ts:19`). The new entry calls `DesignPatch` "the commit event's, undo's and protocol's `patches` payload" without saying `readonly`. A `protocol` author who writes `patches: DesignPatch[]` makes `workers`' hand-off fail to compile without a copy or a cast. Fix: spell the payload `readonly DesignPatch[]` in the comment.
- **L2. The Immer check runs one way only.** "design checks that Immer's Patch is assignable to it" guards `change`'s output. But `DesignPatcher.apply` passes wire `DesignPatch`es into `immer.applyPatches`, so the reverse direction is what the mirror relies on. A later widening of `DesignPatch` (for example `path: readonly …`) would pass the stated check and break `apply`. Fix: check both directions (mutual assignability).
- **L3. `LaneStage` is still hand-spelled.** The comment says "picked from stageIdSchema's options, never a second spelling" over a literal union that *is* a second spelling. Fix: show it as `Extract<StageId, 'parts' | 'shapes' | …>`, or as `v.picklist` over a filter of `stageIdSchema.options`, so a typo fails.
- **L4. The status strip's label.** AD-11 says the strip shows "the running stage by its stage id" (`pcb`, `plates`). EXPERIENCE's strip has one entry per output (Outline, Plates, PCB, Case, Firmware) with display names, and `shapes`/`extras` have no entry. 23.8 needs a mapping from `StageId` to label and entry, which nobody owns. Fix: one sentence naming `editor` as its owner.
- **L5. Autosave's failure state at launch.** "launch with storage unavailable opens a new, unsaved design whose failure state says why" works only because `newDesign`'s `replaceDesign` fires the commit event and autosave's own first save fails with `unavailable`. That is correct, but nothing says it. A 23.7 agent could have the load flow (in `commands`) write autosave's state directly, which would give the state a second writer. Fix: one clause saying autosave learns it from its own first save.

## Checked and holding

- `DesignPatch`: the hand-declared type matches `design/src/patching/types.ts` and Immer's `Patch`. `protocol` → `schema` stays within its imports. No second shape remains in the spine.
- `workspaceSchema`'s order matches the AD-11 table and EXPERIENCE keys 1-5. The AD-13 slug list says the same.
- `Violation` with `kind: never` and `Fix = never`: an object type with a `never` field is not reduced to `never`, so `Violation[]` admits only `[]`, as the memlog states. `issues { seq, violations: [] }` codes and tests.
- `StorageError` narrowing with `Extract` is expressible today. `not-found.id: Id` matches `meta.id`'s `idSchema`.
