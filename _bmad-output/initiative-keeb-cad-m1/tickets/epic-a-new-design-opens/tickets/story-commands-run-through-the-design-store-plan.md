---
title: 'Commands run through the design store'
type: 'feature'
ticket: '2'
created: '2026-11-03'
status: 'built'
baseline_revision: '7f15da878edb61d7c9cc992d0e7e3f2d89764fc1'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `design`, `schema`, `hashing`, `reactive`, `model` and `commands` are `export {}` stubs, so nothing holds the design or changes it; every later story in the epic (design file, worker mirror, autosave, frame) needs AD-2's design store.

**Approach:** Build the design store and its parts as AD-2, AD-24 and the Data Schema write them: `schema`'s meta section and shared kinds, `hashing`'s canonical encoding and `hash`, `model/main`'s `checkStructure`, `design`'s `DesignStore`, `DesignPatcher`, `defineCommand`/`defineAction`, multi tokens, `parse` and `deepFreeze`, `design/worker`'s patcher module, and main's container in `app/src/main.ts`. Prove it with a test-only rename command in `design`'s specs.

## Boundaries & Constraints

**Always:**
- Only fields and kinds the Data Schema tags 23.2 (or untagged and needed): `Id` (kebab-case schema), `Revision`, `SchemaIssue`, `Rejection` (`input-invalid`, `unavailable`, `stale` type only, model kinds `never`), `DesignInvalid`, `ItemId = Id`, `Frozen`, `Mutable`, `Form`, `Meta` {id, name, form}, and the `Design` schema built on `meta` alone. Types with a schema are inferred (`v.InferOutput`); the rest are plain TS in `schema`.
- `DesignStore` holds `current: Option<Committed>` (`{ design, seq, revision }`) in one `shallowRef` from `reactive`; it is the only writer. It resolves eagerly and refuses a duplicate command id at startup.
- `run(handle, input)` order: availability over the frozen design → `unavailable`; parse input with the handle's schema to a fresh copy → `input-invalid` with plain `SchemaIssue` paths; `DesignPatcher.change`; `checkStructure`; then one write: seq + 1, revision = `Revision` parse of `hash(design)`, commit event `{ patches, seq, revision }`. Any refusal leaves ref, seq and event untouched. Returns `Result<void, Rejection>`.
- `replaceDesign(unknown)`: `parse` with the design schema → `Result<void, DesignInvalid>`, `deepFreeze`, write, seq + 1, revision, commit event carrying the whole value.
- `DesignPatcher`: own `new Immer({ autoFreeze: true })`, `enablePatches()` called once; `change(design, edit)` → `Result<Changed, Rejection>` with the rejection kept outside the producer; `apply(design, patches)` → patched frozen design. Registered by `design`'s main module and by `design/worker`'s module.
- `immer` imported only in `design`; no Immer type in an exported signature (`DesignPatch` and `Writable<T>` are declared in `design`).
- AGENTS.md code layout and test rules throughout; specs on Node; ts-pattern `match` for branching on a tagged value.

**Decision (2026-11-03, Sergii):** `defineAction`, the `actions` multi token and the duplicate-id check (across commands and actions) are built now; `run` takes command handles only. Running an action, and the action's apply signature, wait for the first action story.

**Decision (2026-11-03, Sergii):** the commit event follows obsidian-journal: `nanoevents` (^10.0.0, MIT, no dependencies) behind a `TypedEmitter<E>`/`Subscribable<E>` pair, the store holding a private emitter and exposing `readonly events: Subscribable<DesignStoreEvents>`; subscribers call `store.events.on('commit', listener)`, which returns the unsubscribe function. The spine's Stack gains its row.

**Decision (2026-11-03, Sergii):** a commit listener that throws is a bug: `emit` is not wrapped, so the error escapes `run`/`replaceDesign` after the write has committed (seq, revision and ref already updated).

**Never:** No `newDesign`, id minting, undo/redo, stale-seq check, `{ seq }` option, derived files, `Length`/`Expression`/gap, `defaultPart`/`ref(kind)`, provenance. No real command in `commands`. No token beyond the two multi tokens. No module-level Immer instance or store singleton. No `fromValibot`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rename | committed design, rename input | ok; new design deeply frozen, no proxy; seq + 1; event with patches | — |
| Caller input | plain or Vue `reactive` object | stored as plain data; caller's object not frozen | — |
| Apply rejects | test command returns a `Rejection` | err(that rejection); no ref write, no event, seq unchanged | — |
| Runtime-only constraint | input the types accept but the schema refuses | err `input-invalid` with the issue's path | — |
| Unavailable | availability returns false | err `unavailable` | — |
| Duplicate id | two handles with one id registered | container `autoLoad()` throws | throws |
| Patch replay | `apply(previous, patches)` | equals the new design, deeply frozen | — |
| Load valid | meta-only design | ok, deeply frozen, revision = `hash(design)` | — |
| Load invalid | unknown `form.type` | err `design-invalid`, issue at `['meta','form','type']` | — |
| Bad id | `idSchema` on `'Not_Kebab'` | parse fails | — |

</frozen-after-approval>

## Code Map

- `packages/{design,schema,hashing,model,reactive}/src/*.ts` -- `export {}` stubs; single `tsconfig.json` (composite, `include: ["src"]`). Packages that gain specs take `packages/result`'s split: `tsconfig.lib.json` (excludes specs, noEmit) + `tsconfig.vitest.json`; root `vitest.config.ts` (`'packages/*'`) already runs a config-less package on Node.
- `packages/result/src/` -- `Result` (`ok()`, `err`), `Option` (`some`, `none`), `InvariantError`; `result/testing` has `expectOk`/`expectErr` for specs.
- `packages/di/src/` -- `Module` is `{ register(c: Container): void }`, a plain object in a `module.ts`-style file; `c.register(X).useClass(X).eager()`, `createMultiToken<T>(name)`, `inject(token)` in field initialisers (multi → `T[]`), `container.addModule(m)`, `await container.autoLoad()`; `DuplicateRegistrationError` on a second single registration.
- `.dependency-cruiser.mts` -- GRAPH already allows `design` → model (`main` only), library, schema, reactive, hashing; `schema` → expr; kernels import no workspace package; `only-design-imports-immer`; `only-model-worker-entry-and-pipeline-import-design-worker`. No valibot rule; `design`, `schema`, `model`, `commands` declare `valibot: catalog:` themselves. `hashing` may take an npm dependency.
- `app/src/main.ts` -- mounts the editor only; `app/package.json` has no `design`/`di` deps yet.
- `pnpm-workspace.yaml` -- catalog; `immer` is a literal `^11.2.9` in `design` only. A new shared dep goes in the catalog.
- spine Stack (`_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md` ~L985) -- add the hash function's row.
- obsidian-journal -- events: `src/infrastructure/events/typed-emitter.ts`, used at `src/journals/journals-index.ts:70,83`; Valibot issue paths mapped with `issue.path.map(s => s.key)`.
- Do not read PR #6: this rebuild is judged against AGENTS.md without it.

## Tasks & Acceptance

**Execution:**
- [x] `packages/schema/src/` -- `id`, `revision`, `form`, `meta`, `design` schemas (one concept per file or folder), `types.ts` with `SchemaIssue`, `Rejection`, `DesignInvalid`, `ItemId`, `Frozen`, `Mutable`, `ModelRejectionKind = never`; `index.ts` re-exports. Specs: `idSchema` refuses non-kebab; type test that a nested write to `Frozen<Design>` fails.
- [x] `packages/hashing/src/` -- canonical encoding (sorted keys, JSON number form, absent = `undefined` property, throws on non-plain values) and `hash(value): string` (SHA-256 hex via `@noble/hashes`); specs for key-order independence and a known digest.
- [x] `packages/reactive/src/index.ts` -- re-export `@vue/reactivity`.
- [x] `packages/model/src/main.ts` + `check-structure.ts` -- `checkStructure(design: Frozen<Design>): Result<void, Rejection>`, always ok.
- [x] `packages/design/src/` -- concept folders: `patching/` (`DesignPatcher`, `deepFreeze` over Immer's `freeze(v, true)`, `Writable`, `DesignPatch`, `Changed`), `entries/` (`defineCommand`, `defineAction`, `commands` and `actions` multi tokens, definition types), `store/` (`DesignStore`, `Committed`, commit event), `parsing/` (`parse` → `Result` with `SchemaIssue[]`), `design-module.ts`, `worker-module.ts`; `index.ts` and `worker.ts` only re-export (worker: `DesignPatcher`, `deepFreeze`, worker module).
- [x] `packages/design/src/**/*.spec.ts` -- every I/O row from `design` (arrange helper builds a container with test commands; recording starts after arrange); type tests: `Writable<Design>` assignable to `Mutable<Design>`, a handle's id inferred as a literal.
- [x] `packages/{design,schema,model,hashing,commands}/package.json`, `pnpm-workspace.yaml` -- workspace/catalog deps (`valibot`, `@noble/hashes`, `nanoevents`, `@keeb-cad/result`, `@keeb-cad/di`, `ts-pattern`).
- [x] `app/src/main.ts` (+ `app/src/container.ts` or similar) -- build main's container with `design`'s module, `await autoLoad()`, then mount; app deps.
- [x] spine Stack -- `@noble/hashes` row (provisional until the mirror-hash spike) and `nanoevents` row (`design`'s commit event).
- [x] `TypedEmitter`/`Subscribable` types -- in `design`'s `types.ts` beside the store (the only emitter so far).

**Acceptance Criteria:**
- Given the workspace, when `pnpm check` runs, then it passes, with `design`, `schema` and `hashing` specs on Node.
- Given `sh tooling/verify-checks.sh`, then every row passes.
- Given the app's dev build, when it loads, then the editor mounts after main's container resolves with no error.

## Implementation Notes

- `schema`, `hashing`, `design` and `model` take `result`'s noEmit split (`model` without a vitest config: it has no specs yet); `reactive` and `commands` keep their composite stubs.
- `design`'s `tsconfig.lib.json` and `app`'s `tsconfig.app.json` add `ESNext.Disposable`, which `di`'s container needs once a package type-checks it.
- `ts-pattern` is not a `design` dependency: nothing there branches on a tagged value (`Option`'s own `match` covers the store). `commands` gains only `valibot`.
- A duplicate id throws `DuplicateCommandIdError` (its own file in `store/`), naming every repeated id.
- Spec helpers (`expectDeeplyFrozen`, `expectNothingFrozen`, `metaOnlyDesign`) live in `design/src/testing/`, not exported by the package; the two assertions are in the root ESLint config's `assertFunctionNames`.
- `run` throws `InvariantError` for a handle not registered in `commands`; the store's `shallowRef` holds `Committed | undefined`, and `current` wraps it in an `Option`.
- The "apply rejects" spec returns a `stale` rejection: with `ModelRejectionKind = never`, it is the only kind a command can build.
- `Result` values are asserted with `expectOk`/`expectErr` plus `.value`/`.error`: Vitest's `toEqual` iterates an `Err` and trips its iterator's `InvariantError`.
- `app/src/main.ts` keeps two statements (await the container, mount), with the container built in `main-container.ts`.
- `reactive/src/index.ts` disables `vue/prefer-import-from-vue` for its one re-export line.

## Plan Change Log

## Review Triage Log

Pass 1 (quick): high 0, medium 1, low 8, false 0, maybe-false 0; one intent gap, deferred by Sergii (2026-11-03).

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | `run` runs a handle that was never registered | medium | patch | Real: `run` never consults `#commands`. AD-2 "Only registered commands run", and a forgotten module is caught by the command's end-to-end test only if `run` refuses it; a refusal there is a bug, so `InvariantError` (`run` throws only on a bug). |
| 2 | `#current` stores an `Option` in a `shallowRef` | low | patch | Real: AD-24 unwraps a stored value first. The ref holds `Committed \| undefined`; the `current` getter still returns `Option<Committed>`, which is what the frozen text names. |
| 3 | `main.ts` runs code; the container is built in `main-container.ts`; its comment restates the code | low | defer + patch | Real: AGENTS.md (entry files only re-export) and the spine's Consistency Conventions (main container built only in `main.ts`) contradict for a thread entry; settling it edits AGENTS.md or the spine. The restating comment is deleted (patch). The discarded container is rejected: story 7 provides it to components. |
| 4 | Spec comment "the only kinds a command can build" is false | low | patch | Real: `apply` returns any `Rejection`; `design-patcher.spec.ts` returns `unavailable`. Delete the comment. |
| 5 | Store specs narrow (`.design.meta.form`, `.seq`; throwing-listener test omits revision) | low | patch | Real: AGENTS.md "assert whole values". |
| 6 | `findUnfrozen(...)).toEqual([])` and not-frozen checks repeated | low | patch | Real: AGENTS.md "write a shared assertion once". |
| 7 | `replaceDesign` caller-not-frozen check is shallow | low | patch | Real: checks only the root; folded into 6's shared assertion. |
| 8 | `enablePatches()` runs per `DesignPatcher` instance, not once | low | reject | Real but idempotent; moving it to module load would add a module-level side effect, which AGENTS.md's no-module-state rule argues against. |
| 9 | A command that changes nothing still commits (seq + 1, empty patches, event) | low | defer | Real: `produceWithPatches` returns `[]` and the store commits. Neither the intent nor AD-2 says whether a no-op is a commit. Sergii (2026-11-03): defer to the undo story, code unchanged. |
| 10 | Sparse arrays encode as invalid text; a cycle throws `RangeError` | low | reject | Real but unreachable from Valibot output or a frozen design; the fix adds guards. |

## Design Notes

**Decision (plan): hash function.** The ticket leaves it to the plan. `@noble/hashes` 2.4.0 `sha256` (MIT, no dependencies, synchronous, audited) over the UTF-8 bytes of an RFC 8785-style encoding. Rejected: a hand-written FNV (collisions matter once saved derived files are matched by revision) and `crypto.subtle` (async). Provisional: the spike may replace it behind `hash`.

**Decision (plan): `run` before any `replaceDesign`** throws `InvariantError` (a bug, since the app loads or creates a design first); not a `Rejection` kind, which the Data Schema doesn't define.

**Decision (plan): labels** are `string` until a translation story exists.

Rejection inside the producer, kept outside Immer:

```ts
let rejection: Option<Rejection> = Option.none()
const [next, patches] = this.#immer.produceWithPatches(design, draft => {
  const outcome = edit(draft)
  if (outcome) rejection = Option.some(outcome)
})
```

## Verification

**Commands:**
- `pnpm install && pnpm check` -- expected: all steps pass.
- `pnpm vitest run packages/design packages/schema packages/hashing` -- expected: all pass, Node project.
- `sh tooling/verify-checks.sh` -- expected: every row PASS.
- `grep -rln "from 'immer'" packages app | grep -v '^packages/design/'` -- expected: no output.
