# Reconcile tickets against the 23.4/23.5 spine update (2026-11-07)

Inputs: the uncommitted spine diff (scratchpad `spine-23-4.diff`), memlog decisions 23.4 Q1–Q4 and 23.5 Q1–Q2, the tickets `epic-a-new-design-opens` 23.4, 23.5, 23.7, 23.8 (and the epic file), `epic-see-corneys-keys` 13.18, 13.21, 13.2, 13.3, and `component-ownership.md`.

Verdict: the diff settles every item 23.4's and 23.5's `unknown` names, but leaves seven gaps open (one of them a contradiction with build order) and makes 23 ticket statements stale.

## Job 1: are the unknowns settled?

### 23.4's unknown

| Asked for | Spine answer | Settled? |
| --- | --- | --- |
| Design patch type's home, importable by `protocol` | `DesignPatch` in `schema` (crossing's shared kinds), hand-declared, no Valibot schema; `design` checks Immer's `Patch` is assignable; the Open Questions row removed | Yes |
| `Violation` in the Data Schema | Skeleton `{ kind, severity, ids, message, fixes }`, `ViolationKind` and `fixSchema` empty, so only `[]` type-checks; `region` stays 14.4 | Yes, but see gap G1 |
| A workspace type | `workspaceSchema = v.picklist([...5 slugs])`, `Workspace` inferred; order = tab order | Yes |
| A stage id | `stageIdSchema` closed list of 9, `StageId` inferred; `stage-started.stage` is a `StageId`; `LaneStage` is a subset | Yes, but see G5, G6 |
| Who builds `createDerivations` and `LibraryData` | 23.4 makes no call (AD-25 says "from 13.18 … before it the entry hands `pipeline` the mirror only"); 13.18 codes `createDerivations`; 13.21 codes `LibraryData`, fields "defined here before 13.21 is planned" | Owners yes; `LibraryData`'s fields are still undefined (moved to a blocker on 13.21, see stale item 22) |

### 23.5's spine half

| Asked for | Spine answer | Settled? |
| --- | --- | --- |
| What `load` returns for a design not stored | `StorageError` `not-found { id }`, an error, not an `Option` | Yes |
| … for unavailable storage | `unavailable { message }` (from the DOMException) | Yes |
| (new, unasked) | `quota-exceeded` for a refused save; each method narrowed by `Extract` | Added |
| Stryker's mutate list for the browser backend | not a spine matter; still Sergii's confirmation | Open (expected) |

### Gaps the spine still leaves open or now contradicts

- **G1. The spine names the wrong first `ViolationKind` owner, and build order contradicts it.** The `Violation` comment says "only `[]` type-checks until a kind's owner adds it (13.3 first)". Epic 13's build order is 17 → 21 → 18 → 2 → 22 → 3. 13.17 already reports `blueprint-api-too-new` (a `blueprint` kind in Consistency Conventions), and 13.18 reports `unresolvable-reference` and "its blueprint violation". So 13.17 or 13.18 adds the first kind, not 13.3. Neither of those tickets says it adds a member to `ViolationKind`. The spine comment needs to say "13.17 or 13.18 first" (or which one posts through `issues` first), and those tickets need the line (stale items 21, 23).
- **G2. 23.4 has no stage to post `stage-started` for.** Q4 leaves 23.4's `pipeline` holding only the mirror and posting empty `issues`. The spine's Lifecycle says the worker posts `stage-started` "before each stage". With no stage before 13.18 (`parts`), 23.4 posts none. Its description still says the worker posts `stage-started`. Either 23.4 drops it, which leaves `protocol`'s message kind with no producer until 13.18, or the spine names a stage 23.4 runs. 23.8's running-stage test then has to drive `workers` with a fake post, which its verify line should say (stale item 18).
- **G3. Which stage reads `failed` after the crash cap, when no stage is running?** The spine says "the stage shows failed until the user's Restart". With no stage in 23.4 (and, later, crashes between stages), nothing says which stage shows `failed`, or whether the worker shows it rather than a stage. 23.4 ("its stage status reads failed") and 23.8 ("the strip shows the stage failed") both assume an answer. This gap was already there; the diff makes it concrete by closing `StageId`.
- **G4. `LoadedBundle` is used but never defined.** The diff types `load(id): AsyncResult<LoadedBundle, …>`, and `LoadedBundle` appears nowhere else in the spine. 23.5 needs it ("returns the migrated bundle with the bundle exactly as read", which the load flow's `reset` point reads). By AGENTS.md's Data Schema rule, 23.5 can't code it until the spine defines it, for example `{ migrated: MigratedBundle; asRead: … }`.
- **G5. The stage list contradicts the glossary.** The comment on `stageIdSchema` says "the glossary's stage order". The glossary's `lane` order has no `routing`, though its `stage` entry does list `routing` (and `exports`) as stage packages. The comment also says "exports are not stages", while the glossary's `stage` entry lists `exports` among the "stage packages". One of the two needs rewording.
- **G6. `LaneStage` is spelled twice.** The comment says "a subset of StageId (its options picked from stageIdSchema's), never a second spelling", but the declaration is still the hand-written literal union. It should be declared as a derivation, for example `Extract<StageId, …>` or a `v.picklist` built from `stageIdSchema.options`. Its first coder isn't named either: 13.17 (the lane contract) or 13.21 (`{ lanes: { <stage>: run } }`).
- **G7. The one load flow's outcome list leaves out `StorageError`.** AD-13's "One load flow" bullet still reports "(derived files emptied, a `LoadError`, `DesignInvalid`)". Storage's `load` now also returns `not-found` and `unavailable`, which the flow must pass on (launch falls back on them). Also unspecified: what the flow does when saving the `reset` point fails (`quota-exceeded` / `unavailable`) before `replaceDesign`. Does it abort the load or open anyway?
- Minor points:
  - (a) A bogus workspace segment opens `layout`. Neither the spine nor 23.7 says whether the URL is then replaced to `/layout`; "the URL is replaced to match" is stated only for the design.
  - (b) The spine doesn't say whether `design` keeps re-exporting `DesignPatch` from its root and `design/worker` (it does today: `packages/design/src/index.ts:14`, `worker.ts:3`) or stops, which forces `workers`/`app` onto `schema`.
  - (c) AD-10's `model` bullet (line 334) and AD-25's modules bullet describe the entry's `createDerivations` call. The AD-10 bullet has no "from 13.18" qualifier, and AD-25's "hands `pipeline` the mirror" sits oddly beside AD-10's "`pipeline` imports `design/worker` directly". This is a wording nit.
  - (d) The spine says "autosave's failure state holds a save's error", but 23.7's launch sets it from `load`/`listDesigns`'s `unavailable`. The type fits, because `unavailable` is in save's union, but the wording should say "a save's or launch's `unavailable`".

## Job 2: stale ticket statements

Format: entry, quoted statement, then the replacement in one line.

### 23.4 (epic-a-new-design-opens id 4)

1. "builds its container from the worker modules, awaits autoLoad() and calls createDerivations(design/worker's mirror, library)." → "builds its container from the worker modules, awaits autoLoad() and hands pipeline design/worker's mirror; it makes no createDerivations call (13.18 adds it)."
2. "protocol's first messages: the whole design, patches with (epoch, seq), focus { workspace }, issues { seq, violations: Violation[] } and stage-started { stage, seq } (AD-11)." → "protocol's first messages: the whole design, patches (schema's DesignPatch[]) with (epoch, seq), focus { workspace: Workspace }, issues { seq, violations: Violation[] } and stage-started { stage: StageId, seq } (AD-11); schema gains DesignPatch (moved from design, which checks Immer's Patch is assignable to it), workspaceSchema/Workspace, stageIdSchema/StageId and Violation's skeleton with ViolationKind and fixSchema empty."
3. "The worker posts issues (empty until 13.3) and stage-started, each echoing its seq" → "The worker posts empty issues at every seq, echoing it (the first kind arrives with 13.17/13.18, see G1); it posts no stage-started until 13.18's parts stage (G2)."
4. unknown: "Before planning, the spine settles the design patch type's home … and names who builds createDerivations and LibraryData (schema exports no LibraryData)." → "Before planning, the spine answers which stage, if any, reads failed after the crash cap with no stage running (G3)." (Everything else in it is settled.)
5. verify (no line for the new schema work) → add: "protocol imports DesignPatch, Workspace and StageId from schema only; design's Immer patches type-check as DesignPatch[]; issues' violations accept [] only (type test); stage-started refuses a stage outside StageId (type test)."

### 23.5 (id 5)

6. "storage's load goes through design-file's migrateBundle … and returns the migrated bundle with the bundle exactly as read." → "storage's load(id) goes through design-file's migrateBundle and returns AsyncResult<LoadedBundle, LoadError | not-found | unavailable>, LoadedBundle holding the migrated bundle and the bundle as read (spine to define it, G4)."
7. "Autosave holds a failure state (a shallowRef: empty, or storage's error)" → "Autosave holds a failure state (a shallowRef: empty, or a save's error: unavailable or quota-exceeded)."
8. "story 7's launch sets it when storage is unavailable" → "story 7's launch sets it to the unavailable error load or listDesigns returns."
9. "workers holds the violations posted as issues by story 4's worker, empty until 13.3" → "workers holds the violations posted as issues by story 4's worker, empty until the first ViolationKind owner (13.17/13.18, G1)."
10. unknown: "Before planning, the spine settles what storage's load returns for a design not stored and for unavailable storage (its Open Question revisited at 23.5), and Sergii confirms the browser backend leaves Stryker's mutate list…" → "Before planning, the spine defines LoadedBundle (G4) and Sergii confirms the browser backend leaves Stryker's mutate list (a mutation-config edit), proven by a toggled bug instead."
11. verify: "a failing save sets autosave's failure state to storage's error and the next successful save clears it" → "a save refused for space sets autosave's failure state to { kind: 'quota-exceeded' } and the next successful save clears it; load of an id not stored returns not-found naming that id; with browser storage that can't be opened, load, save, listVersions and listDesigns each return unavailable with the DOMException's message."

### 23.7 (id 7)

12. "(slugs layout, outline, pcb, case, firmware; an unknown or missing one is layout)" → "(the router parses the segment with schema's workspaceSchema; a failed parse or a missing segment opens layout)."
13. "A stored design that fails to load (any LoadError or design-invalid: …) falls back the same way" → "A stored design that fails to load (load's not-found, any LoadError, or design-invalid: …) falls back the same way."
14. "With storage unavailable, launch opens a new, unsaved design and sets autosave's failure state to the reason." → "When load or listDesigns returns unavailable, launch opens a new, unsaved design and sets autosave's failure state to that error."
15. verify: "with storage unavailable, launch opens a new design and autosave's failure state holds the reason" → "with storage that can't be opened, launch opens a new design and autosave's failure state holds { kind: 'unavailable', message }."

### 23.8 (id 8)

16. "the status strip (error and warning counts from the posted issues: the last known numbers, dimmed with ◌ while their seq is behind main's, 0 before the first issues;" → append: "until the first ViolationKind exists (13.17/13.18) only zero counts can be posted, so this story tests zero and dimmed zero only;" (memlog 23.4 Q2's consequence).
17. "the running stage by its stage id" → "the running stage by its StageId (schema's stageIdSchema)."
18. verify: "under fake timers a test stage shows nothing 1000 ms after its stage-started and shows its stage id" → "under fake timers a stage-started for parts (a StageId) from a fake worker shows nothing at 1000 ms and shows parts, 1 s and Restart at 1001 ms."
19. "workspace tabs on story 6's Tabs wrapper (role=tablist, keys 1-5, …)" → "workspace tabs on story 6's Tabs wrapper in workspaceSchema's option order (role=tablist, keys 1-5, …)."

### 13.18 (epic-see-corneys-keys id 18)

20. "the parts lane runs in the model worker (model/worker, the script from library/worker through blueprint/worker's lane runner (story 21); main reads declarations only)" → "the parts lane runs in the model worker: this story codes model/worker's createDerivations(design: ReadonlyRef<Frozen<Design>>, library: LibraryData) and adds its call to app's model-worker start file with design/worker's mirror and library/worker's LibraryData, handing the derivations to pipeline, which posts stage-started { stage: 'parts' } (main reads declarations only)."
21. "A reference that can't be found … reports unresolvable-reference naming the slot" (silent on the kind's type) → append: "this story adds unresolvable-reference to ViolationKind (the first model kind, G1)."

### 13.21 (id 21)

22. "Declarations ship from library's main subpath, scripts only from library/worker" → "Declarations ship from library's main subpath; library/worker exports LibraryData (the pinned declarations and compiled scripts, its fields per the spine's Data Schema), which only the model and case worker entries import"; and add `unknown = "Before planning, the spine defines LibraryData's fields (Data Schema: a blocker, 2026-11-07)."`

### 13.3 (id 3)

23. "(this story codes Violation, ViolationKind and Fix's v.variant schema, no variants until a fix names a command, (spine 2026-11-03))" → "(Violation and the empty fixSchema come from 23.4; this story adds dependency-cycle to ViolationKind, and unresolvable-reference's anchor case to the kind 13.18 adds)."

### No stale statement

- 13.2 (id 2): nothing names the patch type, workspaces, stage ids, `createDerivations`, `LibraryData` or storage errors. Its "model/worker's per-side placement computeds" sit inside 13.18's `createDerivations` without contradiction.
- Epic file `epic-a-new-design-opens.md`: no statement contradicts the diff. Its Notes need a 2026-11-07 replan Decision line when Sofia applies the items above.
- `component-ownership.md`: names none of these types (only the Violations panel, 14.4/14.6, unaffected).

## Quiet requirements the change dropped or left unowned

- **Q1. `createDerivations`'s call has no owner.** 23.4 named it. The spine moved it to 13.18, and 13.18's ticket doesn't say so (item 20). If the tickets stay as they are, nobody codes the call.
- **Q2. `LibraryData`'s field definition is a blocker no ticket carries.** The spine makes it a precondition for planning 13.21, and 13.21 has no `unknown` (item 22).
- **Q3. No ticket adds the first `ViolationKind`.** 13.3 used to "code ViolationKind". Now 23.4 codes it empty, and the first reporters, 13.17 (`blueprint-api-too-new`) and 13.18 (`unresolvable-reference`), don't say they add the kind (G1, items 21, 23). 13.17 is outside this review's list but needs the same line: "this story adds blueprint-api-too-new (and lane-failed) to ViolationKind".
- **Q4. `LaneStage` has no coder.** It must be derived from `StageId` (G6), and neither 13.17 nor 13.21 says it types its lanes with that subset.
- **Q5. `DesignPatch`'s move is a change to built code.** `packages/design/src/patching/types.ts` declares it as an interface, and design's root and worker entries export it. 23.4 has to move it to `schema`, add the assignability check against Immer's `Patch`, and decide whether design re-exports it (minor point b). The ticket doesn't say so (item 2).
- **Q6. 23.5 has no verify rows for the new error kinds.** Without the rows in item 11, the narrowed per-method unions (`Extract`) have no test. One type-only test (`*.types.spec.ts`) that `save` can't return `not-found` would cover the narrowing.
- **Q7. Nothing owns the start of non-zero counts.** 23.8's counts are only testable at zero, and no later ticket's verify line covers a non-zero count in the strip after the first kind lands. 13.18's verify could add "the status strip counts its unresolvable-reference error".
