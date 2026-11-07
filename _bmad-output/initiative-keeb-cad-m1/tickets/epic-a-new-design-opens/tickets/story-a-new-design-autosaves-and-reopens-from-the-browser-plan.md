---
title: 'A new design autosaves and reopens from the browser'
type: 'feature'
ticket: '5'
created: '2026-11-07'
status: 'ready-for-dev'
baseline_revision: ''
route: 'full'
route_source: 'auto'
risk: 'high'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing persists: `storage` holds only `writeBundle` and `readBundle`, `workers` drops the model worker's derived files, and a reload loses the design (R1).

**Approach:** Build AD-13's storage layers (pure rules over a `StorageBackend`, a Dexie browser backend, a memory backend, one backend contract), `design.acceptDerivedFiles` with its accept event and the pure `emptiedFiles`, the one load flow in `commands` with its `reset` point, and `app`'s autosave service with its failure state, as the ticket and spine AD-13 (Storage layers, Save takes text, One load flow, Version retention) state them.

## Boundaries & Constraints

**Always:**
- Version retention, the save that prunes and retries, the orders and the error mapping are plain functions or the storage service over `StorageBackend`, tested on Node with the memory backend, so Stryker mutates them; the browser backend holds only Dexie calls.
- Every backend operation is one Dexie transaction; `write` allocates the next save counter inside it.
- Each storage method returns only its own `StorageError` kinds (Data Schema).
- Autosave saves `design`'s bundle as it is at the event, through `storage`, never waiting for the worker.
- A failed `reset` save stops the load before `replaceDesign`.

**Never:**
- No Web Lock, read-only tab or Take over (later story); no launch, URL or `listDesigns` reopen (story 7); no notice UI or banner (16.1, 16.x); no version switch, file Save/Open or other `VersionReason`s than `autosave` and `reset`.
- No `vi.mock`, no jsdom, no `.skip`/`skipIf` (`vitest/no-disabled-tests`, `eslint.config.ts:235`).
- `storage` never parses on save.

**Decisions:**
- Decision (Sergii, 2026-11-07): `StorageBackend` reaches `DesignStorage` through a `createToken<StorageBackend>`, not an abstract class made a token by widening `di`'s `TokenLike`, nor an injected `BrowserBackend` overridden with a cast; because it needs no change to the `di` kernel and no cast; the spine's AD-25 token table holds its row (138d551), the type `storage`'s own.
- Decision (Sergii, 2026-11-07): the storage service is `DesignStorage`, not `Storage`, because `Storage` is the Web Storage interface's global name in DOM code such as `editor`, which imports `storage`.
- Decision (Sergii, 2026-11-07): `LoadFlow.load(id)` returns `AsyncResult<{ emptied: Emptied[] }, LoadError | not-found | storage-unavailable | quota-exceeded | DesignInvalid>` and 16.1 turns it into notices, not a held `notice` state, because no reader exists before 16.1.
- Decision (Sergii, 2026-11-07): `DesignStorage.save` runs one save at a time in call order, not queued in autosave nor latest-only, because the race is in storage's read-then-write rule and the `reset` save needs it too; latest-only breaks one version per revision.
- Decision (Sergii, 2026-11-07): `listVersions` returns `{ version: VersionId, revision, reason, savedAt }` without texts, not whole bundles, because listing then reads no version's texts; a later story that opens a version (version switch) adds the read by `VersionId`.
- Decision (Sergii, 2026-11-07): `storage-unavailable`'s message is `` `${name}: ${message}` ``, not the message alone, because the spine asks for the name and the text.
- Decision (Sergii, 2026-11-07): autosave is built in `app` as AD-13 places it, not moved to `commands` nor read through a token now, because nothing in 23.5 reads its failure state; how `editor`'s banner reaches it goes to 16.x's spine pass (`deferred-work.md`).
- Decision (Sergii, 2026-11-07): last saved and `savedAt` are epoch milliseconds from `Date.now()`, not ISO strings, because the time is only shown, so the UI formats a plain number and never parses one back.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Autosave round trip | a command runs in the real app container | the bundle is in browser storage; `load` + `replaceDesign` give it back byte-identical per file | — |
| Accept saves | a derived-files post at main's latest seq, no edit after | its rolling version replaces that revision's | — |
| Stale accept | a post at a seq other than the current | dropped: no accept event, no save | — |
| Broken derived file | stored routing unreadable, or KDL failing its schema | a `reset` version holds it as read; the autosave at that revision leaves it | — |
| Missing derived file | stored bundle without routing | no `reset` version | — |
| Reset save fails | quota refusal with no autosave left, or a failing request | stored bundle unchanged, `replaceDesign` not run | `quota-exceeded` / `storage-unavailable` |
| Not stored | `load` of an unknown id | — | `not-found` naming the id |
| Storage can't open | `IDBFactory.open` throws `SecurityError` | each of the four methods | `storage-unavailable` with the DOMException's name and text |
| Quota | a save refused for space | autosave failure = `quota-exceeded`; the next success clears it | — |

</frozen-after-approval>

## Code Map

- `packages/storage/src/bundle/` -- `writeBundle(bundle): BundleTexts`, `readBundle(texts): Result<MigratedBundle, LoadError>` (over `migrateBundle`); reuse, don't change; `LoadedBundle` joins `BundleTexts` in its `types.ts`.
- `packages/storage/src/index.ts` -- re-exports only.
- `packages/storage/tsconfig.lib.json` -- the comment "No DOM lib until a backend needs one" breaks the spine's Type libs row; the backend's `indexedDB`, `IDBKeyRange` and `DOMException` are web APIs both threads have.
- `packages/workers/tsconfig.lib.json` -- precedent: `["ES2023", "ESNext.Disposable", "WebWorker"]` with a why-comment.
- `packages/design/src/store/design-store.ts` -- `replaceDesign` (:68-91) deep-freezes and runs `readDerivedFile` per file, routing first; `#write` mints seq (:173); events via `createNanoEvents` (:97); `#committed()` throws `InvariantError` with nothing committed.
- `packages/design/src/store/types.ts` -- `Committed`, `DerivedFiles`, `CommitEvent`, `DesignStoreEvents` (only `commit` today).
- `packages/design/src/store/read-derived-file.ts` -- `readDerivedFile(schema, file, bundle): Result<_, Emptied>`; `emptiedFiles` reuses it.
- `packages/design/src/store/design-store.spec.ts` -- its `expectDeeplyFrozen` rows are the pattern for the accept row.
- `packages/workers/src/model-worker/model-worker-lifecycle.ts` -- `#watch` (:109-132): `issues`, `stage-started`, `derived-files` only reset `#crashes`; `get status()` over a private `shallowRef` (:12, :47) is the pattern for `issues` and autosave's `failure`.
- `packages/protocol/src/model-worker/types.ts:29-34` -- `derived-files { routing, fingerprints, revision }` plus the stamp (epoch, seq); `issues { violations }` is the whole list at that seq.
- `packages/commands/src/design/{new-design.ts,design-actions-module.ts}` -- `inject(DesignStore)` and a module per concept folder.
- `app/src/main-modules.ts` -- `[designModule, designActionsModule, workersModule]`.
- `app/src/{bundle-round-trip.spec.ts,model-worker-entry.spec.ts}` -- real-container specs over `mainModules`; once autosave is in it they must register the memory backend.
- `packages/schema/src/types.ts:41-55` -- `DerivedFile`, `Emptied`, `LoadError`, `MigratedBundle`. `LoadError` (a type, no Valibot schema, "code builds it, nothing parses it") has no builder; `StorageError` and `VersionReason` are the same kind.
- `vitest.config.ts` -- inline Node project per package without a config (:14-22); `di`'s Node project excluding `src/vue/**` (:65-75) is the pattern for storage's.
- `packages/workers/vitest.config.ts` -- minimal browser config to copy.
- `vitest.mutation.config.ts` -- keeps only inline object projects, so storage's Node project is mutated, its browser config is not.
- `stryker.config.json` -- `mutate` covers `packages/storage/src/**/*.ts` minus specs, `types.ts`, `index.ts`.
- `.dependency-cruiser.mts` -- `onlyImports(...)` (:348-352); the `app` row of `GRAPH` (:83-96) lacks `reactive`.
- `tooling/ad10/violations/packages/storage/src/index.ts`, `tooling/ad10/rules.spec.ts` (:151 violations, :292 allowed rows).
- `pnpm-workspace.yaml` -- `catalogMode: strict`.

## Tasks & Acceptance

**Execution:** three phases, `pnpm test` green after each: (1) the spine line, schema, storage and tooling tasks; (2) design and workers; (3) commands and app. Decision (Sergii, 2026-11-07): one plan in phases, not split, because the ticket is one refined entry whose verify spans all three.
- [x] spine, one docs-only commit on main before the branch -- AD-10 (line 343): `app` among `reactive`'s drawn users and in `app`'s import bullet; AD-25's row: token `storageBackend`, type `StorageBackend` (AGENTS.md: a same-named type and value must share one file); AD-13 Version retention: `listVersions` returns each kept version's summary (its `VersionId`, revision, reason and save time), its bundle read by `VersionId`, per the decision above.
- [ ] `packages/schema/src/{types.ts,index.ts}` -- `StorageError`, `VersionReason` (`'autosave' | 'reset'`, per its Data Schema comment).
- [ ] `packages/design/src/store/emptied-files.ts` (function) + spec, `packages/design/src/index.ts` -- `emptiedFiles(bundle): Emptied[]` through `readDerivedFile`.
- [ ] `packages/design/src/store/{types.ts,design-store.ts}` + spec -- `DesignStoreEvents.accept: (committed: Committed) => void`; `DesignStore.acceptDerivedFiles(files: DerivedFiles, seq: number): void` deep-freezes the files, replaces the whole `Committed` with seq and revision unchanged and emits `accept`; another seq is dropped; nothing committed throws `InvariantError`, as `#committed()` does.
- [ ] `packages/workers/src/model-worker/model-worker-lifecycle.ts` + spec -- `derived-files` → `acceptDerivedFiles({ routing, fingerprints }, seq)`; `get issues(): readonly Violation[]` over a private `shallowRef`, each accepted `issues` replacing it; the local `accept` helper (which only resets `#crashes`) is renamed `resetCrashes`.
- [ ] `packages/storage/src/backend/{storage-backend.ts,types.ts,to-storage-error.ts}` + `to-storage-error.spec.ts` -- the `storageBackend` token (`createToken<StorageBackend>`); `types.ts`: `StorageBackend`, `VersionId`, `StoredVersion` (with texts), `StoredDesign`, `VersionSummary`, `CaughtError`; `toStorageError(caught): StorageError` (function).
- [ ] `packages/storage/src/retention/{retention.ts,types.ts}` + spec -- `replacedBy(versions, revision, reason): VersionId[]` (function: for an `autosave`, the same-revision `autosave` plus the oldest `autosave`s past `rollingVersions`, the constant `20` in `retention.ts`; for another reason, none) and `pruneCandidate(versions): Option<VersionId>` (function: the oldest `autosave`).
- [ ] `packages/storage/src/design-storage/{design-storage.ts,types.ts}` + `design-storage.spec.ts` (Node, memory backend) + `design-storage.types.spec.ts` -- `DesignStorage` (service): `save(label: DesignLabel, texts, reason): AsyncResult<void, SaveError>` one at a time, on each quota refusal pruning the oldest `autosave` and retrying until none is left; `load(id): AsyncResult<LoadedBundle, LoadFailure>` (newest version → `readBundle`); `listVersions(id): AsyncResult<VersionSummary[], …>`, `listDesigns(): AsyncResult<DesignSummary[], …>`; `DesignLabel`, `SaveError`, `LoadFailure`, `DesignSummary` in `types.ts`.
- [ ] `packages/storage/src/testing/{memory-backend.ts,backend-contract.ts,types.ts,index.ts}` + `memory-backend.spec.ts` -- `MemoryBackend` (service, no injects; `new MemoryBackend({ capacity })`, which specs hand to `override(storageBackend).useValue(...)`) refusing a write past `capacity` as `QuotaExceededError`; `index.ts` exports `MemoryBackend`, `backendContract` and `storageBackend`, so only specs override the token; `backendContract(make)` (function): counter only rising, put and replaced deletes landing together, `versions`/`designs`/`read`/`delete`.
- [ ] `packages/storage/src/browser/{browser-backend.ts,browser-storage-access.ts,storage-database.ts}` + `browser-backend.spec.ts` + `quota.spec.ts` -- `BrowserBackend` (service), `BrowserStorageAccess` (service: fields `factory = indexedDB`, `keyRange = IDBKeyRange`, `name`; specs `override(...).useValue({ factory, keyRange, name })`, a name per test), `StorageDatabase` (service: the Dexie subclass with tables `versions`, `designs`, `meta`).
- [ ] `packages/storage/src/{storage-module.ts,index.ts}`, `package.json` (`dexie`, `@keeb-cad/di`, `./testing`), `tsconfig.lib.json` (`ES2023`, `ESNext.Disposable`, `WebWorker`; comment rewritten), `tsconfig.vitest.json` (its "run on Node" comment corrected), `vitest.config.ts` (two inline projects, each setting `sequence.shuffle` and `requireAssertions` as `packages/di/vitest.config.ts` does: `storage/browser`, `src/browser/**/*.spec.ts` minus `quota.spec.ts`, Chromium and Firefox; `storage/quota`, `quota.spec.ts`, Chromium only), root `vitest.config.ts` (storage Node project excluding `src/browser/**`), `stryker.config.json` (negate `src/browser/**`, `src/testing/backend-contract.ts`), `pnpm-workspace.yaml` (`dexie: ^4.4.7`).
- [ ] `.dependency-cruiser.mts` (`only-storage-browser-imports-dexie`; `reactive` in `GRAPH.app`), `tooling/ad10/violations/packages/storage/src/{index.ts,browser/x.ts}`, `tooling/ad10/rules.spec.ts`.
- [ ] `packages/commands/src/load/{load-flow.ts,load-module.ts,types.ts}` + spec, `packages/commands/src/index.ts`, `package.json` -- `LoadFlow` (service): `emptiedFiles` → `reset` save of `asRead` when one is `unreadable` or `invalid` → `replaceDesign`; returns `AsyncResult<LoadOutcome, LoadFlowError>`; the spec overrides `storageBackend` with a `MemoryBackend`, no cast.
- [ ] `app/src/autosave/{autosave.ts,autosave-module.ts}` + `autosave.spec.ts`, `app/src/main-modules.ts` (adds `storageModule`, `loadModule`, `autosaveModule`), `app/package.json` (`@keeb-cad/reactive`) -- `Autosave` (service, eager): on `commit` and `accept`, `writeBundle(current)` → `save(entry, texts, 'autosave')`; `get failure(): Option<SaveError>`, cleared on success.
- [ ] `app/src/autosave-round-trip.spec.ts`, `app/src/reset-survives-autosave.spec.ts` -- browser backend, a database name per test through `BrowserStorageAccess`; `bundle-round-trip.spec.ts` and `model-worker-entry.spec.ts` override `storageBackend` with a `MemoryBackend`.

**Acceptance Criteria:**
- Given the ticket's verify list, when `pnpm test` runs, then each sentence has a test named for it and passes in the projects the boundary table names.
- Given each browser or integration test, when its toggled bug is in place, then it goes red, and green once restored: write keeps `replaces` (contract, both browsers); unavailable mapped to `quota-exceeded` (`browser-backend.spec.ts`); the quota error mapped to `storage-unavailable` (`quota.spec.ts`); autosave not subscribed to `accept` (`autosave.spec.ts`); `writeBundle` skipped for routing (`autosave-round-trip.spec.ts`); the `reset` save skipped (`reset-survives-autosave.spec.ts`); `derived-files` not handed on (`model-worker-lifecycle.spec.ts`); `failure` not cleared on success, `acceptDerivedFiles` not emitting `accept`, autosave waiting for a `running` lifecycle (`autosave.spec.ts`).
- Given Stryker on `packages/storage`, then every survivor has a verdict.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

- **Decision (plan): `BrowserStorageAccess` is a class that is its own token**, not a `createToken<IDBFactory>`, because AD-25: "Every other token, a `createToken` object defined apart from its provider, is listed in this table" and a class token needs no row. Named for what it gives the backend (access to browser storage, the spine's term in `storage-unavailable`), not after IndexedDB.
- **Decision (plan): `BrowserStorageAccess` also holds the database name**, not a fixed name only, because the app's browser specs would otherwise share one database across tests in a shuffled run.
- **Decision (plan): `storage` takes `WebWorker`, not `DOM`**, because the Type libs row: "`DOM` only where code runs on the main thread and reads the page".
- **Decision (plan): the quota test runs in a Chromium-only project of storage's config**, not `it.skipIf(firefox)`, because `eslint.config.ts:235` sets `vitest/no-disabled-tests: 'error'`. Its first test confirms `Storage.overrideQuotaForOrigin` makes an IndexedDB write fail and records the error's shape.
- **Decision (plan): the memory backend refuses for space by a version capacity**, not by bytes, because the ticket's Node rows need only "refused while an autosave remains" and "refused with none left".
- **Decision (plan): `DesignStorage` reads `Date.now()` and passes the time in the version and design entries**, not each backend, because the rules then own the one clock read and the contract compares what was written.
- **Decision (plan): `load` reads the design's newest version by save counter**, not the newest `autosave`, because AD-13: "order is a monotonic save counter in `storage`, never a clock".
- **Decision (plan): `emptiedFiles` lists routing before fingerprints**, not unordered, because `replaceDesign`'s `emptied` already does (`design-store.ts:75-87`), and the two must agree.
- **Decision (plan): each `issues` post replaces the held list**, not appends, because the post carries the whole list at its seq (`protocol` `issues { violations }`).
- **Decision (plan): the accept event carries the new `Committed`**, not a `CommitEvent`, because AD-1: "emits the store's accept event with the new `Committed`".
- **Decision (plan): `StorageError` and `VersionReason` ship no builder**, not `aStorageError`, because they have no Valibot schema a builder test could parse through (Test builders row), as `LoadError`; specs build texts with `writeBundle` over `schema/testing`'s builders.
- `app` gains `reactive` in `GRAPH`, a requirement of AD-10: "the drawn edges document its current users … and gains an edge when another starts using it".
- **Decision (plan): `acceptDerivedFiles` with nothing committed throws `InvariantError`**, not a silent drop, because no worker runs before the first `Committed` (`model-worker-lifecycle.ts`: "The first Committed spawns the worker"), so reaching it is a bug, as `#committed()` treats a command.
- **Decision (plan): `DesignLabel`, `VersionSummary`, `DesignSummary`, `StoredVersion`, `StoredDesign`**, not `…Entry`, because the glossary's **entry** is "One item of `build`" and **record** is undo's; and `StorageDatabase`, not `KeebDatabase`, because `Keeb` is no glossary term.

## Conformance Log

Three readers in the first pass (two conformance, one gap; Sonnet, context-free), then one final conformance pass. Every quoted plan line and rule was found; none dropped.

- `DOM only where code runs on the main thread and reads the page` (Type libs; storage tsconfig) -- fixed (WebWorker; precedent comment in `packages/storage/tsconfig.lib.json` rewritten)
- `gains an edge when another starts using it` (AD-10; app → reactive, ticket line) -- fixed (GRAPH row, spine line, `app/package.json`)
- `Every other token, a createToken object defined apart from its provider, is listed in this table` (misquoted "The table is empty") -- fixed
- `Name a thing for what it does … never after the library it wraps` (`IndexedDbApi`) -- fixed (`BrowserStorageAccess`)
- `Glossary terms only` (`…Entry`, `KeebDatabase`, `database.ts`) -- fixed (`DesignLabel`, `VersionSummary`, `StoredVersion`, `StoredDesign`, `StorageDatabase` in `storage-database.ts`)
- `ReadonlyRef` / `SaveError` with no home (Code layout: types.ts per folder) -- fixed (getter over a private `shallowRef`, per `model-worker-lifecycle.ts:12`; a `types.ts` per new folder; `LoadedBundle` in `bundle/types.ts`)
- `every class or function the plan adds carries (service) or (function)` (`database.ts`, `backend-contract.ts`) -- fixed
- `Give every decision its rejected alternative: "X, not Y, because Z"` (four Sergii decisions, `app → reactive`) -- fixed (reasons added; the `reactive` line is a requirement, not a decision)
- `A choice no requirement made is a decision and is labelled as one` (accept payload, issues replace, emptiedFiles order, clock read, nothing committed) -- fixed
- `Give every threshold three rows …` (prune 2 left, retry loop, reset vs cap, same-revision 21st, A-B-A, empty lists, first save, mapping fall-through, memory capacity, serial saves) -- fixed
- `Put a type-only test … in a *.types.spec.ts` -- fixed (`design-storage.types.spec.ts`)
- `Stryker mutates only their pure files` (`--mutate` dropping negations; `emptied-files.ts` outside the mutate list) -- fixed
- `Substitute through di` (real-container app specs writing IndexedDB) -- fixed (override `storageBackend`; a database name per test)
- `new-design.spec.ts`'s `useValue(store as unknown as DesignStore)` (precedent, copied for the load flow) -- fixed (the load-flow spec overrides `storageBackend` with a `MemoryBackend`, no cast); not deferred: the precedent registers its fake through `di`, as the rule asks, and no rule bans the cast
- `Prove a test Stryker can't reach … with a toggled bug` -- fixed (one per browser or integration test)
- `a new schema concept ships its builder` (`StorageError`, `VersionReason`) -- fixed (decision: no Valibot schema, as `LoadError`)
- `A type that pairs with a same-named value … stays in that value's file` (token and interface both `StorageBackend`) -- fixed (token `storageBackend`; spine row in the phase-1 docs commit)
- `listVersions returns … each a whole design bundle` (AD-13 vs Sergii's decision) -- fixed (spine sentence in the phase-1 docs commit)
- `Test a rule where it is defined` (reset prune re-tested in commands) -- fixed (moved to storage; commands asserts only that a saved `reset` lets `replaceDesign` run)
- `Write a comment only for a why the code can't say` (`tsconfig.vitest.json` "run on Node") -- fixed
- `Name a thing for what it does` (lifecycle's local `accept`) -- fixed (`resetCrashes`)
- Chromium-only project shape, `capacity` and database-name wiring, `mainModules` list, `storage/testing` exports (left to the implementer) -- fixed
- gap: `packages/design/src/index.ts`, `packages/commands/src/index.ts`, `packages/schema/src/index.ts`, `packages/storage/src/index.ts` exports -- fixed
- gap: `packages/design/src/store/design-store.ts` accept without freeze -- fixed
- gap: `app/src/reset-survives-autosave.spec.ts` glue row -- fixed
- gap: `editor` cannot reach `app/src/autosave/autosave.ts`'s failure state -- asked (Sergii: defer to 16.x's spine pass; `deferred-work.md`)
- gap: no read path for a version's bundle -- fixed (spine sentence: read by `VersionId`, added by the story that opens a version)
- Final pass (12 findings) -- fixed; these fixes are read by no reviewer: the token rename, nothing-committed `InvariantError`, `replacedBy` owning the cap, the retry loop and serial-saves rows, the reset row moved to storage, the naming decision, the quota project shape, the DI wiring lines, `tsconfig.vitest.json`, `resetCrashes`, the extra toggled bugs.

## Verification

**Commands:**
- `pnpm test` -- expected: all projects green, including storage's Node, browser and Chromium-only quota projects.
- `pnpm check` -- expected: lint, typecheck, format and depcruise pass.
- `pnpm exec stryker run --mutate 'packages/storage/src/**/*.ts,!packages/storage/src/**/*.spec.ts,!packages/storage/src/**/types.ts,!packages/storage/src/**/index.ts,!packages/storage/src/browser/**,!packages/storage/src/testing/backend-contract.ts'` -- expected: every survivor given a verdict.

## Boundary Table

| Group | Boundary | Input | Expected | Level |
| --- | --- | --- | --- | --- |
| production bugs | rolling cap | 19 autosaves at 19 revisions | 19 kept | unit (storage) |
| production bugs | rolling cap | 20 | 20 kept | unit (storage) |
| production bugs | rolling cap | 21 | 20 kept, the oldest gone | unit (storage) |
| production bugs | rolling cap, `reset` | 20 autosaves and 1 `reset`, then a 21st autosave | 20 autosaves and the `reset` kept | unit (storage) |
| production bugs | rolling cap, same revision | 20 autosaves, a 21st at an existing revision | 20 kept, nothing else pruned | unit (storage) |
| production bugs | same-revision autosave | autosaves at A, B, then A | 2 versions: B, then the new A newest | unit (storage) |
| production bugs | reset beside autosave | `reset` then `autosave` at r | both kept | unit (storage) |
| production bugs | two named points | two `reset` at r | both kept | unit (storage) |
| production bugs | quota prune | refused, 2 autosaves left | the older deleted, retry succeeds | unit (storage) |
| production bugs | quota prune | refused, 1 autosave left | it is deleted, retry succeeds | unit (storage) |
| production bugs | quota prune | refused, 0 autosaves, a `reset` kept | `quota-exceeded`, the `reset` kept | unit (storage) |
| production bugs | memory capacity | capacity − 1 / capacity / + 1 versions | write ok / ok / `QuotaExceededError` | unit (storage) |
| production bugs | reset save fails | 0 autosaves, refused | stored bundle unchanged, `replaceDesign` not run, `quota-exceeded` | unit (commands) |
| production bugs | reset save fails | backend request fails | `storage-unavailable`, `replaceDesign` not run | unit (commands) |
| production bugs | reset save, autosave remains | `reset` save refused, 1 autosave left | the autosave dropped, `reset` saved | unit (storage) |
| production bugs | quota retry | refused twice, 2 autosaves left | both dropped in turn, the third try succeeds | unit (storage) |
| production bugs | serial saves | two saves at one revision started together | one `autosave` version at that revision | unit (storage) |
| production bugs | reset saved | `reset` save succeeds | `replaceDesign` runs | unit (commands) |
| rules | order | two saves at one fake time | `listVersions` newest by save order | unit (storage) |
| rules | order | two designs at one fake time | `listDesigns` later save first | unit (storage) |
| rules | empty | nothing stored | `listDesigns` → `[]`; `listVersions(unknown)` → `[]` | unit (storage) |
| rules | not-found | unknown id | `{ kind: 'not-found', id }` | unit (storage) |
| rules | first save | no versions yet | one `autosave` version, replaces nothing | unit (storage) |
| rules | accept seq | current − 1 / current / + 1 | dropped / accepted, seq unchanged, frozen / dropped | unit (design) |
| rules | accept, nothing committed | any seq | throws `InvariantError` | unit (design) |
| rules | emptiedFiles | routing unreadable / invalid / missing / all parse | `unreadable` / `invalid` / `missing` / `[]` | unit (design) |
| rules | reset point | routing unreadable / invalid / missing | saved / saved / not saved | unit (commands) |
| rules | mapping | `QuotaExceededError`; `AbortError` with that inner | `quota-exceeded` | unit (storage) |
| rules | mapping | raw `SecurityError`; `OpenFailedError` / `DatabaseClosedError` with that inner | `storage-unavailable`, `SecurityError: …` from the inner | unit (storage) |
| rules | mapping | `AbortError` with an `UnknownError` inner; `UnknownError` with no inner | `storage-unavailable`, from the inner / from itself | unit (storage) |
| rules | save errors | — | type holds no `not-found` | type (storage, `design-storage.types.spec.ts`) |
| module boundaries | backend contract | memory / browser backend | counter only rises; put + replaced deletes together | unit (storage, Node) / browser (storage, Chromium + Firefox) |
| module boundaries | unavailable | `open` throws `SecurityError` | the four methods each `storage-unavailable` | browser (storage, both) |
| module boundaries | real quota | `overrideQuotaForOrigin` lowered | `quota-exceeded` | browser (storage, Chromium) |
| module boundaries | depcruise | `dexie` outside `storage/src/browser/` / inside | rejected / allowed | check (depcruise) |
| glue | round trip | a command in the app container | load + `replaceDesign` byte-identical per file | integration (app, both) |
| glue | reset survives autosave | load of stored unreadable / invalid routing | `reset` version as read, beside the autosave at that revision | integration (app) |
| glue | accept autosave | derived files at the latest seq | replaces that revision's version | integration (app) |
| glue | failure state | refused save, then a success | `quota-exceeded`, then empty | integration (app) |
| glue | worker stopped | lifecycle not started | autosave completes | integration (app) |
