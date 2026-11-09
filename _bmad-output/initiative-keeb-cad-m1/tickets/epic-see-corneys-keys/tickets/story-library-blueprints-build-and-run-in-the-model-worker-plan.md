---
title: 'Library blueprints build and run in the model worker'
type: 'feature'
ticket: '21'
created: '2026-11-09'
status: 'built'
baseline_revision: '9358942994cdeef92679487df88f65f125373296'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 2
context:
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/architecture-blueprints/architecture-blueprints.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 13.17's sandbox can run a script it is handed, but nothing compiles a library blueprint, ships it to the worker, picks pinned versions, or caches lane runs; 13.18's first real part waits on all four.

**Approach:** A library build that validates, type-checks and splits each `defineBlueprint` source; `LibraryData` from `library/worker` with one lazy chunk per version; a lane runner with its LRU cache in `blueprint/worker`; a backoff in `pipeline` that re-enters the pause while a lane is unavailable; the fences for all of it.

## Boundaries & Constraints

**Always:**
- Main never carries blueprint code, even as text (BP-7). Only the model and case worker entries import `library/worker`.
- `blueprints-src` imports only `blueprint/authoring`; `library`'s runtime imports only `schema`.
- A deterministic failure is cached like a success; an `unavailable` lane never is (BP-5).
- The lane cache is memory-only, LRU, 500 entries (BP-4, BP-5).
- `loadScript` is called only for an (id, version) that `declarations` holds (Data Schema).
- Decision (Sergii, 2026-11-09): 13.21 codes `expressionSchema` and an `inputValueSchema` with boolean, string and `{ type: 'quantity', value: expressionSchema }`, not an unchecked `v.unknown()` default, because a wrong default would pass the build, and not the whole `InputValue`, because `Anchor` and `ref(kind)` belong to 13.2 and 13.18. A declared part, anchor or asset input fails the build until those variants arrive.
- Decision (Sergii, 2026-11-09): the per-version chunk check builds the real app with the real `app/vite.config.ts` into a temp folder, a check-only plugin pointing `library/worker`'s glob at two compiled probe versions; not a fixture worker with its own glob, because that never builds `library/worker`, and not probe files in the real folder, because an interrupted run would ship them.
- Decision (Sergii, 2026-11-09): that check runs in `check:dist`, not as a spec in `pnpm test`, because only a change to app's Vite config or library's glob can break it and CI catches that before merge.
- Decision (Sergii, 2026-11-09): pipeline takes pins as an argument, the model-worker entry passing `() => []` until 13.18's derivation replaces that line; not 13.21 adding `library-versions`, because the spine puts `library lookup` in `model/worker` `and only there`.
- Decision (Sergii, 2026-11-09): compiled scripts and JSON are generated and gitignored, not committed, by `build:library`, run from `prepare` and first in `pnpm check`. because diffs stay free of generated files and no stale file can exist. Accepted cost: a bundler upgrade can change a released version's script unnoticed.
- Decision (Sergii, 2026-11-09): the build also refuses a `uses` cycle, a `uses` target with pulls or queries, a visible `use()` of an id not in `uses`, and a part blueprint without exactly one `rectangle`; not left to a later ticket, because no other ticket names them and 13.18 ships the first part blueprint next.
- Decision (Sergii, 2026-11-09): BP-8's anchor-into-`parts` refusal waits for the story adding the anchor variant, not coded now, because no source can reach it while every anchor input fails the build.
- Decision (Sergii, 2026-11-09): `purpose` and `nets` parse as `v.optional(v.unknown())`, not absent, so a declaration can carry them before their types are defined.
- Decision (Sergii, 2026-11-09): a retry after an edit that fails restarts the backoff at 1 s, not carrying on, because an edit is a new attempt.
- Decision (Sergii, 2026-11-09): a pin or `uses` member `declarations` doesn't hold answers `unavailable` from `runLane` but doesn't count toward `hasUnavailable`, not retried on the backoff, because retrying can't make a version appear in the app's own declarations.
- Decision (plan): the backoff is 1, 2, 4, 8, 16, 30, 30 s, not doubling to 32 s, because the ticket says `about 1 s doubling, capped at 30 s`.

**Never:**
- A real library blueprint: `lib:blueprint/choc-key` is 13.18. A stage or `createDerivations` (13.18).
- `quantity(unit)`, `lengthSchema`, `deltaSchema`, `angleSchema` (13.2).
- `worker.format` (23.7 set it, `app/vite.config.ts:9`).
- Case-worker wiring: BP-9's `in the case worker before case lanes` waits for the first tray-case story.
- A `di` token for `LibraryData`.

## Boundary table

| Group | Threshold | Input | Expected | Level |
| --- | --- | --- | --- | --- |
| Production bugs | Lane cache capacity | empty cache, a new key | stored; nothing evicted | unit, `blueprint` (Node) |
| Production bugs | Lane cache capacity | 499 entries cached, a new key | nothing evicted | unit, `blueprint` (Node) |
| Production bugs | Lane cache capacity | 500 entries cached, a new key | least recently used evicted | unit, `blueprint` (Node) |
| Production bugs | Lane cache capacity | 500 cached, oldest just read, a new key | the read one stays; the next oldest goes | unit, `blueprint` (Node) |
| Production bugs | Main bundle | temp build with probe versions, every file the main entry loads | no probe marker | `check:dist` |
| Production bugs | Chunks | temp build with two probe versions | second version's marker alone in its own chunk; neither in the worker file | `check:dist` |
| Rules | Cache sharing | same stage, version, closure, arguments, twice | one lane execution, one entry | unit, `blueprint` |
| Rules | Cache key | one argument changed; blueprint version changed; a depth-2 closure version changed; stage version changed | miss (each) | unit, `blueprint` (Node) |
| Rules | Cached failures | deterministic `lane-failed`, same key twice | one execution, the failure both times | unit, `blueprint` |
| Rules | Cached failures | a run that traps, then the next lane on the dead VM | the trap cached; the next `unavailable`, not cached | unit, `blueprint` |
| Rules | Unavailable | `unavailable`, same key twice | not cached; second call asks the pool again | unit, `blueprint` (Node) |
| Rules | API too new | `blueprint-api-too-new`, same key twice | not cached; the pool answers each | unit, `blueprint` (Node) |
| Rules | Schema failure | a source whose quantity has no `unit`; whose option has no `options` | build fails naming the input (each) | unit, `library` |
| Rules | Declared input | quantity without `unit`; option without `options` | refused (each) | unit, `schema` |
| Rules | Declared input | quantity with `unit` and no `range`; with `range`; option with `options`; boolean; text | passes | unit, `schema` |
| Rules | Declared input | `unit` on a boolean; `options` on a quantity; `options: []`; unparsable `range.min` | refused | unit, `schema` |
| Rules | Declared input | part, anchor, asset | refused | unit, `schema` |
| Rules | Default kind | boolean default on a quantity; option default not in `options`; a number as default | refused | unit, `schema` |
| Rules | Version | 0; 1; 2; 1.5 | refused; passes; passes; refused | unit, `schema` |
| Rules | Blueprint id | `lib:blueprint/x`; `lib:blueprint/`; `lib:part/x` | passes; refused; refused | unit, `schema` |
| Rules | Expression | `19mm`; `nope`; schema metadata | passes; refused; `{ expression: true }` | unit, `schema` |
| Rules | Lane outputs | two outputs of one name; empty list | refused; passes | unit, `schema` |
| Rules | Undefined fields | `purpose: 'x'` on an output; `nets: {}` | passes | unit, `schema` |
| Rules | Build | a source that passes the schema and fails the type check | build fails naming the file | unit, `library` |
| Rules | Build | no blueprint sources | empty library, no failure | unit, `library` |
| Rules | Rectangle | a part blueprint with 0, 1, 2 `rectangle` outputs | fails, passes, fails | unit, `library` |
| Rules | Rectangle | a blueprint with no `parts` lane and no `rectangle` | passes | unit, `library` |
| Rules | `uses` | a cycle of two; a self-use; a chain with no cycle | fails naming the ids, fails, passes | unit, `library` |
| Rules | `uses` | an id absent from the library | fails naming the id | unit, `library` |
| Rules | `uses` target | target with a pull; with a query; with neither | fails, fails, passes | unit, `library` |
| Rules | Visible `use()` | `use()` of an id in `uses`; not in `uses` | passes; fails naming the id | unit, `library` |
| Rules | Round trip | a test blueprint with two lanes | script's lane names equal the declaration's | unit, `library` |
| Rules | Self-contained | a source with a local helper | script is one expression, no `import`, runs in a fresh `Function` | unit, `library` |
| Rules | Library data | a two-version test blueprint | `declarations[id]` holds both versions; main's export equals it | unit, `library` |
| Rules | Load failure | `loadScript` Err for a pin; for a closure member | that lane `unavailable`, not cached (each) | unit, `blueprint` |
| Rules | Unknown pin | a pin, or a closure member, `declarations` doesn't hold | `loadScript` not called; `runLane` `unavailable`; `hasUnavailable` false | unit, `blueprint` (Node) |
| Glue | Backoff delays | `nextBackoffDelay` from none, 1, 2, 4, 8, 16, 30 s | 1, 2, 4, 8, 16, 30, 30 s | unit, `pipeline` (Node) |
| Glue | Backoff | Err, 1 ms before / on / 1 ms after the first delay | not re-run / re-run once / still once | unit, `pipeline` |
| Glue | Backoff | second failure, 1 ms before / on / 1 ms after the doubled delay | not re-run / re-run / still once | unit, `pipeline` |
| Glue | Backoff | past the doubling, 1 ms before / on / 1 ms after 30 s | not re-run / re-run / still once | unit, `pipeline` |
| Glue | Backoff | an edit while waiting | re-run at once | unit, `pipeline` |
| Glue | Backoff | an edit's retry fails after the delay had reached 16 s | next re-run on 1 s, not before | unit, `pipeline` |
| Glue | Backoff | a pause with nothing unavailable | no timer pending | unit, `pipeline` |
| Glue | Pause | a whole design arrives; patches arrive | the pause runs (each) | unit, `pipeline` |
| Module boundaries | Fences | `blueprints-src` importing `schema`; importing `blueprint/authoring` | rejected; allowed | unit, `tooling/ad10` |
| Module boundaries | Fences | `library` runtime importing `geometry`; a `blueprints-src` import of `blueprint/authoring` | rejected; no report from the drawn-edge rule | unit, `tooling/ad10` |

</frozen-after-approval>

## Code Map

- `packages/blueprint/src/pool/vm-pool.ts:22` -- `pause(pins: PinnedBlueprint[])` takes loaded scripts; a pin left out reads `unavailable` at `:45`. Contract unchanged. `keyOf` and `closureKeyOf` (`:12,:14`) move to `pool/pin-key.ts`, since the runner needs them too.
- `packages/blueprint/src/pool/types.ts:13` -- `BlueprintContract`; `schema`'s `BlueprintDeclaration` must stay assignable. `LaneRef` `:30`.
- `packages/blueprint/src/lane/types.ts:38` -- `BuildLaneArgs` builds args from the run's handles and can't be hashed.
- `packages/blueprint/src/sandbox/boundary-source.ts:260` -- wraps the script as `return (<script>\n)`: it must be one expression.
- `packages/blueprint/src/testing/a-pinned-blueprint.ts` -- `aPin`, `laneOf`, `noCalls`, `okValue`: used by runner specs, nothing added to it.
- `packages/pipeline/src/pipeline/pipeline.ts:30,37` -- `#receiveDesign` and `#receivePatches`; the pause call goes after each apply.
- `packages/hashing/src/index.ts` -- `hash`. `packages/result/src/async-result.ts:26` -- `AsyncResult.fromPromise(promise, mapErr)`.
- `.dependency-cruiser.mts:189` -- `importsOnly`; `sourcePath` (`:140`) stays as is.
- `tooling/check-dist/files-containing.ts` -- reused for markers. `tooling/check-steps.spec.ts:32` pins the scripts.
- `packages/storage/tsconfig{,.lib,.node,.vitest}.json` -- the split `library` copies.

## Tasks & Acceptance

**Execution:**
- [ ] `_bmad-output/.../epic-see-corneys-keys/tickets/tickets.toml`, spine (`Expression` and `anExpression` tags to 13.21; `purpose`, `nets` opaque until defined), `deferred-work.md` -- 13.18's unknown closed, 13.18 gains `hand pins to the pause`. Docs-only, straight to main after Sergii's look.
- [ ] `packages/schema/src/{expression,input-value,blueprint-id,version,declared-input,lane-declaration,upgrade-mapping,blueprint-declaration}.ts`, `types.ts`, `index.ts`, `package.json` (dep `@keeb-cad/expr`), `testing/*` -- Valibot per the Data Schema; `DeclaredInput` a `v.variant` on `kind`, `default` narrowed per branch; `LibraryData`, `ScriptLoadFailed` in `types.ts`. Builders: `anExpression`, `aQuantityInputValue`, `aBlueprintId`, `aVersion`, `aQuantityInput`, `anOptionInput`, `aPlainInput`, `aDeclaredInput(kind)`, `aLaneDeclaration`, `anUpgradeMapping`, `aBlueprintDeclaration`, each (function) with its spec.
- [ ] `packages/blueprint/src/authoring.ts`, `authoring/define-blueprint.ts` `defineBlueprint` (function), `authoring/types.ts` -- identity at run time; `DeclaredInput` loose enough that a missing `unit` reaches the schema.
- [ ] `packages/blueprint/src/runner/{lane-runner,lane-cache,lane-cache-key,resolve-closure}.ts`, `runner/types.ts`, `pool/pin-key.ts` (`keyOf`, `closureKeyOf`, (function)), `testing/a-library-data.ts` `aLibraryData` (function, on `aBlueprintDeclaration`, the one fake `LibraryData` for specs in `blueprint`), `pool/vm-pool.ts`, `pool/blueprint-worker-module.ts`, `worker.ts`, `package.json` (dep `@keeb-cad/hashing`) -- `LaneRunner` (service): `useLibrary(library)`, `pause(pins)`, `runLane(lane, calls, inputs)`, `hasUnavailable`; a pin is `{ id, version }`; `inputs` is `{ canonical, laneArgs }`, `laneArgs` the `BuildLaneArgs`. Keeps only successful scripts. `LaneCache` (service), registered in `blueprintWorkerModule`. `laneCacheKey` (function). `resolveClosure` (function): walks `uses` over `declarations`, each id at its pinned version.
- [ ] `packages/library/compile/{compile-blueprint,inline-script,check-types,validate-declaration,check-library-rules,find-visible-uses,compile-library}.ts` (each (function)), `compile/types.ts`, `compile/fixtures/**`, `.gitignore` (`packages/library/compiled/`), `packages/library/package.json`, `tsconfig{,.lib,.node,.vitest}.json`, `tsconfig.json` (root), root `package.json`, `tooling/check-steps.spec.ts` -- order: evaluate, stamp `apiVersion`, validate, type-check, bundle. `blueprints-src/` and `compile/` go in `tsconfig.node.json`. `build:library` run from `prepare` and first in `check`; the spec pins both.
- [ ] `packages/library/src/{index,worker}.ts`, `src/library-data/{declarations,load-script,library-data}.ts`, `types.ts` -- `declarations` (function-free const from an eager JSON glob), `loadScript` (function: the spine types it as one on `LibraryData`; the lazy `?raw` glob), the `LibraryData` value from `worker`.
- [ ] `tooling/check-dist/check-dist.ts`, `check-script-chunks.ts` `checkScriptChunks` (function), `types.ts`, `fixtures/` -- `check-dist.ts` only calls named functions; `redirectGlobToProbes` (function) the plugin; it goes in `plugins` and `worker.plugins`, so a main-thread import of `library/worker` would pull probes into main.
- [ ] `packages/pipeline/src/pause/{blueprint-pause,next-backoff-delay}.ts`, `pause/types.ts`, `pipeline/pipeline.ts`, `pipeline-module.ts` -- `BlueprintPause` (service), `nextBackoffDelay` (function); `Pipeline.listen(endpoint, pins)`. Backoff specs in `pause/blueprint-pause.spec.ts`, fake timers, not in `pipeline.spec.ts`, with a fake `LaneRunner` registered in the container; `pipeline.spec.ts` and `pipeline-module.spec.ts` add `blueprintWorkerModule` and pass `() => []`, so no engine loads.
- [ ] `app/src/start-model-worker.ts` -- adds `blueprintWorkerModule`, calls `LaneRunner.useLibrary(libraryData)`, passes `() => []` to `listen`.
- [ ] `.dependency-cruiser.mts`, `tooling/ad10/**` -- `importsOnly('library')`'s `from` narrowed to `^packages/library/src/`; `blueprints-src-imports-only-blueprint-authoring`; a fixture each (the ticket asks each).
- [ ] Specs beside each -- the boundary table's rows.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then every unit row passes, in Chromium and Firefox where it touches the engine.
- Given a clean install, when `pnpm check` runs, then the fences, `tooling/check-steps.spec.ts` and the dist checks pass.

## Implementation Notes

Files the plan didn't list, each needed by a row or a decision: `packages/library/compile/build-library.ts` (the CLI `build:library` runs, through jiti, because Node can't resolve the workspace's extensionless imports); `packages/library/src/library-data/group-declarations.ts` (the two-version row needs a function, since the project has no plugin to redirect the eager glob); `tooling/check-dist/devtools-problems.ts`; `optimizeDeps` for `quickjs-wasi` in `app/vitest.config.ts` and `packages/pipeline/vitest.config.ts` (Vite re-bundling mid-run stalled the app's browser run); `@keeb-cad/result` in `schema`'s dependencies and `vite` in the root's (`hoist: false`); `jiti` moved to the catalog.

- Decision (Sergii, 2026-11-09): `RunnerLane.stageVersion` is required, not optional hashing as 0, because BP-5 puts the stage's version in the cache key and a stage that forgot it would silently reuse stale results.
- Decision (build): `compileLibrary` refuses two sources declaring one (id, version), not the last write winning, because a released version is immutable and an overwrite would be silent.
- Decision (build): `apiVersion` is a whole number with no lower bound, not `>= 1`, because the build stamps it and no source writes it.
- Decision (build): `uses` targets and cycles are checked at every library version `>= minVersion`, not the newest only, because MVS can pick any of them.
- Decision (build): an edit during a running pause queues one re-run, not a concurrent pause, because `VmPool.pause` isn't re-entrant.

- Decision (build): `build:library` runs through `jiti`, not plain `node`, because `node compile/build-library.ts` fails with `ERR_MODULE_NOT_FOUND` on the workspace's extensionless imports. `jiti` was already a root devDependency; the catalog holds it because `catalogMode: strict` and `library` now uses it too.
- Decision (build): `optimizeDeps` lists `@keeb-cad/blueprint > quickjs-wasi` in `app/vitest.config.ts` and `packages/pipeline/vitest.config.ts`, not left to discovery, because without it `pnpm vitest run --project '@keeb-cad/app*'` gave `Test Files 2 failed`, `Errors 1 error`.
- Decision (build): `vite` is a root devDependency, not resolved through `app`, because `tooling/check-dist` runs from the root under `hoist: false` and the root manifest had none (`git show 9358942:package.json`: 0 matches).
- Decision (build): `schema` depends on `@keeb-cad/result`, because the spine says `schema` `imports only `expr` and `result`` and `LibraryData` returns `AsyncResult`.
- Decision (build): `packages/blueprint/src/authoring/types.ts:64` declares a global `use`, not an exported stub, because 13.17's plan has `use` as `a frozen global` and a stub import would be bundled into the script and shadow it.
- Decision (build): `packages/pipeline/tsconfig.vitest.json` adds `ES2024.Promise`, not a hand-written deferred, because the repo's lint rule requires `Promise.withResolvers` in the held-pause spec; specs only.
Real-host run: no fake of a third-party host: the runner's engine rows run the real quickjs-wasi 3.6.3 in Chromium and Firefox, and `check:dist` runs the real Vite 8.3.5 build. `aLibraryData` fakes the repo's own `LibraryData`.

## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer), 2026-11-09. No quote dropped.

| Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- |
| Mid-stage `unavailable` never starts the backoff | medium | intent_gap, asked | `blueprint-pause.ts:37`; unreachable until 13.18; code kept; Decision (Sergii): 13.18's ticket, not a `stagesFinished()` with no caller |
| `#pinned.clear()` before awaited loads | medium | patch | `lane-runner.ts:32`; retry timer during 13.18's stages |
| `blueprints-src` fence allows siblings | medium | patch | `.dependency-cruiser.mts:379`; `compile-library.ts:24` compiles every `.ts` |
| `rectangle` with `count: 'any'` passes | medium | patch | AD-5 exactly one; `any` may be empty |
| Hidden `enter` in `arrangeFailing` (both lenses) | low | patch | AGENTS.md `Start recording after arrange` |
| `options: []` row can't prove `minLength` | low | patch | every default fails membership in `[]`; the check is redundant |
| Ternary, narrowing, echo expects, numbers in names, check-steps name, `BP-5` comment | low | patch | direct corrections |
| Rejected pause leaves `#running` true | low | reject | only an `InvariantError` for an unset library, which the entry always sets; loud failure on an unshown state |
| Trap row uses a pending job | low | reject | the runner treats both as `lane-failed` then a dead VM; no lane can trap on demand; `classify-escape.spec.ts` covers traps. Named at the look |
| `schema` result dep Decision has no Y | low | reject | its fix edits this plan |

Pass 2 (quick, test-reviewer), 2026-11-09. No quote dropped.

| Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- |
| Queued re-run test can't fail without the guard | medium | patch | `FakeRunner.pause` resolves at once |
| `minVersion` threshold has only the on row | medium | patch | every spec declaration is at version 1 |
| `noLanes` overrides unused; unit picklist untied to `Unit`; narrow test names | low | patch | direct corrections |
| Fake timers inside `arrangeFailing`; `poll` can't see a later pause; group test feeds its expected | low | reject | no named harm; `pause runs` row is about entry |
| Exact message texts, cycle start | low | logged | listed as decisions at the look |
| `apiVersion: 1` literal | false | reject | spine: `The app's blueprint API version is 1` |
| `\bimport\b` regex; helper's `{ w: 9, h: 9 }` | low | reject | fixture has no such string; value is the fixture's own arithmetic |

Pass 3 (quick, test-reviewer), 2026-11-09. No quote dropped. Above low: halted for Sergii.

| Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- |
| No test proves pins reach `LaneRunner.pause` | medium | asked | `FakeRunner.pause` takes no arguments; every spec passes `() => []` |
| `satisfies` ties the unit list one way only | low | logged | a new unit fails loudly at the build |
| `${A}@1` from the builder's default; `poll` count; constant names | low | logged | not patched |
| "lacks" when only below `minVersion`; message texts | low | logged | listed as decisions at the look |

Pass 4 (quick, on the pins test), 2026-11-09, after Sergii's decision to add it.

| Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- |
| Test name says source, expect compares pins | low | patch | renamed |
| Queued re-run's `pause` call has no pins test | medium | patch | merged into one `do … while` call, so the test covers it; this patch had no lens pass, named at the look |
| Replay of the first answer; later `enter` replacing the source | low | logged | no user-visible bug: `pipeline.ts` re-enters on every edit |

## Design Notes

Tried on Vite 8.3.5 (scratch project, 2026-11-09): `build.lib` with `formats: ['iife']` emits `var __bp = (function() { … })();`. A lazy `import.meta.glob(…, { query: '?raw', import: 'default' })` in a worker gave `1-*.js` and `2-*.js` under `worker.format: 'es'`, both markers inside `w-*.js` under `iife`. A `worker.plugins` transform with `enforce: 'pre'` redirected the glob and each probe version got its own chunk. `pnpm build`: 2 s.

- Decision (plan): Vite's library mode bundles the scripts, not esbuild, because the Stack table lists `Vite (dev server and production build)` and no esbuild.
- Decision (plan): the bundler strips the `var __bp =` and trailing `;` from Vite's documented iife output (a script assigning a global, vite.dev/guide/build#library-mode), not keeping it, because `boundary-source.ts:260` compiles `return (<script>)` and BP-7 says `evaluating to`.
- Decision (plan): the schema validates before the type check, not after, because a source with no `unit` fails both and the ticket's verify is about schema validation failing the build, naming the input.
- Decision (plan): the entry hands `LibraryData` straight to `LaneRunner.useLibrary`, not a token and not through `Pipeline`, because AD-10 says `one hop only` and BP-9 says `The worker entry hands the runner`.
- Decision (plan): the runner keeps only scripts that loaded, not failures, because BP-5 says an unavailable lane is `never cached`.
- Decision (plan): `{ canonical, laneArgs }`, not one value, because `BuildLaneArgs` needs the run's handle table (`lane/types.ts:38`) and BP-5 hashes resolved forms.
- Decision (plan): `default` is narrowed per branch, not a common `InputValue`, because `check-nested-inputs.ts:24` reads each default by its input's kind and the Data Schema says option is `one of the declared list`.
- Decision (plan): `upgrade` is coded, not left out, because the Data Schema defines `UpgradeMapping`.
- Decision (plan): `licence` is a `defineBlueprint` field, not stamped, because the declaration is `Written once in TS beside the blueprint's code`.
- Decision (plan): the build stamps `apiVersion`, not the author, because 13.17's plan says `13.21's build stamps declarations from the root`.
- Decision (plan): `blueprint-api-too-new` is not cached, because BP-5's deterministic list doesn't name it and the pool answers it without a run.
- Decision (plan): the pause runs without holding the posts, not awaited before them, because BP-9 places it before `running stages` and `pipeline` has none until 13.18, which sequences them.
- Decision (plan): `canonical` comes from the stage, not computed by the runner, because BP-5 lists resolved forms only a stage knows (`count: any` pulls ordered by producer id); 13.18 tests that order.
- Decision (plan): the compile files are plain functions despite their I/O, not services, because AD-25 wires services in `Modules per thread` and this code runs in no thread; `tooling/check-dist/files-containing.ts` does the same; `checkScriptChunks` likewise.
- Decision (plan): the words `build:library` and `library build` stay, the code says `compile`, not `buildBlueprint`, because the glossary's `build` is the design's entry list.
- Decision (plan): `compile/` carries no fence, not a new rule, because the spine fences only the sources and the runtime.

## Conformance Log

- `No tokens and no entry wiring` / `A new token or a second provider is a spine edit` (`libraryData`) -- fixed
- `Give every decision its rejected alternative` (backoff, Vite output) -- fixed
- `{ type: 'quantity'; value: Quantity<Unit> }` shape -- fixed
- `Give every threshold three rows` (backoff, cache, library, schema kinds) -- fixed
- `Test a rule where it is defined` (declared input rows) -- fixed
- `Each term means exactly one thing` (`build`) -- fixed
- `Pure logic is plain functions` (tags, compile I/O) -- fixed
- `CutoutPurpose` undefined; `nets` -- asked
- Pin type, closure source, post ordering (BP-5, BP-9) -- fixed
- `a new schema concept ships its builder` -- fixed
- `Put every type a folder declares ... types.ts`, fixtures placed -- fixed
- GRAPH rule fixture -- no change: the ticket says `each with a violation fixture`
- Precedent `pool/vm-pool.ts` -- fixed; `a-pinned-blueprint.ts`, `check-dist.ts`, `files-containing{,.spec}.ts`, `check-nested-inputs.ts`, `pipeline.spec.ts` -- deferred
- gap: main bundle row, `tooling/check-dist/check-script-chunks.ts` -- fixed
- gap: anchor rows, `packages/library/compile/check-library-rules.ts` -- asked
- gap: type check before schema, `packages/blueprint/src/authoring/types.ts` -- fixed
- gap: schema kinds, `packages/schema/src/version.ts`, `blueprint-id.ts`, `expression.ts` -- fixed
- gap: cache rows, `packages/blueprint/src/runner/lane-cache-key.ts` -- fixed
- gap: closure, `packages/blueprint/src/runner/resolve-closure.ts` -- fixed
- gap: main equals worker declarations, `packages/library/src/index.ts` -- fixed
- gap: `#receiveDesign`, `packages/pipeline/src/pipeline/pipeline.ts` -- fixed
- gap: case worker, `app/src/case.worker.ts` -- fixed (out of scope, stated)
- gap: `sourcePath`, `build/` fence, tsconfig, `.dependency-cruiser.mts`, `packages/library/tsconfig.json` -- fixed
- gap: verification project, `packages/library` -- fixed
- Final pass: `build` field, `bundle` file; `one hop only`; decisions' form; `aDeclaredInput`, `anUpgradeMapping`; backoff sequence row; fake `LibraryData`; pipeline specs; tags -- fixed
- Final pass: unknown pin result -- asked
- Final pass: `a-pinned-blueprint.ts` -- deferred (already entered)
- Final pass: `pipeline-module.ts` `useFactory` -- no change: a `di` registration, not a hand-wired factory

## Verification

**Commands:**
- `pnpm build:library && pnpm vitest run --project 'blueprint*' --project '@keeb-cad/schema' --project '@keeb-cad/library' --project '@keeb-cad/pipeline'` -- expected: green
- `pnpm vitest run tooling/ad10 tooling/check-steps.spec.ts` -- expected: green
- `pnpm check` -- expected: exit 0
- Toggled bug: drop the LRU touch; cache an `unavailable`; set `worker.format` to `iife`; make the glob eager; import `library/worker` from `start-main`. Each goes red; restored; said so in the PR.

**Manual checks:**
- Nothing visible changes: no blueprint is pinned until 13.18, so the app behaves as today.
