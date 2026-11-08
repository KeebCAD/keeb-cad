---
title: 'The sandbox runs a blueprint lane'
type: 'feature'
ticket: '17'
created: '2026-11-08'
status: 'built'
baseline_revision: '4b9d0d521977b93198089e0fdcf7ce2d65b57590'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 3
context:
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/architecture-blueprints/architecture-blueprints.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `@keeb-cad/blueprint` and `@keeb-cad/expr` are empty, so nothing can run a part blueprint; 13.21, 13.18 and 13.2 all wait on the sandbox and on `expr`'s stub.

**Approach:** Fill `blueprint` with the quickjs-wasi host per BP-1 to BP-4, BP-6, BP-8 and BP-9's VMs and handle tables, tested on the real engine in Chromium and Firefox; add `expr`'s literal-only stub, the two violation kinds and the import fences.

## Boundaries & Constraints

**Always:**
- Blueprint code runs only through one VM per pinned version, a fresh instance per run, in the frozen allow-listed scope (BP-3).
- Every host call goes through the one host-call wrapper and returns one JSON string (BP-1).
- The host never reads a guest error object; it throws only message strings into the guest (BP-3).
- Budgets are `100` interrupt-handler calls and a `64 MiB` `memoryLimit`; a VM past `48 MiB` is replaced in the next pause (BP-4).
- A failure the blueprint causes is a typed value, never a host throw (AD-11): `Result` from `decodeLaneResult`, the checks and `runLane`; `AsyncResult` from `pause`.
- `ParseError` is `{ kind: 'expression-parse-failed', input: string }` (Decision, Sergii, 2026-11-08: not with a `message`, because the editor writes text from the kind; not with a `position`, because the stub can only say the whole string fails).
- "Memory has grown" is the WASM linear memory's `byteLength`, read through `_getMemory()` and covered by a contract test (decided from the probe, 2026-11-08: after a run allocating 50 MiB, linear memory read 51.3 MiB and `mallocSize` 0.07 MiB, so `mallocSize`, the documented `getMemoryUsage()` of `dist/index.d.ts:631`, would never fire the replacement, and is the rejected alternative; BP-2's internal-export contract test extends to it).

**Never:**
- The lane cache, `LibraryData`, `defineBlueprint`, the build split or filling the pool from `library-versions` (13.21).
- A second copy of the output check, or anything importing quickjs-wasi outside `blueprint`.
- The data-blueprint interpreter: BP-10 says `Its syntax is decided with the first outline story.`
- Changing a budget number without taking it to Sergii, if the re-run argues against it.
- Decision (Sergii, 2026-11-08): the timings re-run happens on battery on `power-saver` and does not wait for AC, not on AC as the ticket says, because no AC is available, the build must not wait for it, and battery is the state the app is really used in. Step and memory budgets don't depend on power.

## Boundary table

| Group | Threshold | Input | Expected | Level |
| --- | --- | --- | --- | --- |
| Production bugs | Step budget | `StepBudget` after 99 ticks | not exhausted | unit, `blueprint` (Node) |
| Production bugs | Step budget | after 100 ticks | not exhausted | unit, `blueprint` (Node) |
| Production bugs | Step budget | after 101 ticks | exhausted | unit, `blueprint` (Node) |
| Production bugs | Step budget, real engine | `while (true) {}` lane | `lane-failed`, cause `step-budget`; the next run of the same VM answers | unit, `blueprint` |
| Production bugs | Memory limit | `new ArrayBuffer` of 63 MiB | lane ok | unit, `blueprint` |
| Production bugs | Memory limit | 64 MiB (on the limit: engine bookkeeping shares it) | `lane-failed`, cause `out-of-memory` | unit, `blueprint` |
| Production bugs | Memory limit | 65 MiB | `lane-failed`, cause `out-of-memory` | unit, `blueprint` |
| Production bugs | VM options | `vmOptions(...)` | `memoryLimit` exactly `64 * 1024 * 1024`; `maxStackSize` exactly `256 * 1024`; intrinsics without Date, WeakRef, performance, DOMException, atob | unit, `blueprint` (Node) |
| Production bugs | Fixed clock and random | `fixedClockAndRandom` on a `WebAssembly.Memory` | `clock_time_get` writes 0; `random_get` writes zeros over the buffer it is given | unit, `blueprint` (Node) |
| Production bugs | Escaped exception | `classifyEscape`: a `WebAssembly.RuntimeError`; a `JSException`-shaped raw exception with budget spent; with budget unspent | `boundary` (fixed message, VM dead); `step-budget`; `out-of-memory` | unit, `blueprint` (Node) |
| Production bugs | Allocation loop | unbounded array growth | `lane-failed`, cause `out-of-memory`; next run answers | unit, `blueprint` |
| Production bugs | Replacement | `vmHasOutgrown(48 MiB - 64 KiB)` | false (kept) | unit, `blueprint` (Node) |
| Production bugs | Replacement | `vmHasOutgrown(48 MiB)` | false (kept) | unit, `blueprint` (Node) |
| Production bugs | Replacement | `vmHasOutgrown(48 MiB + 64 KiB)` | true (replaced) | unit, `blueprint` (Node) |
| Production bugs | Replacement, real engine | a small lane, then a pause | the same VM serves the next run | unit, `blueprint` |
| Production bugs | Replacement, real engine | a lane that allocates past 48 MiB, then a pause | a new VM serves the next run | unit, `blueprint` |
| Production bugs | Recursion | unbounded recursion | `lane-failed`, cause `threw`; next run answers | unit, `blueprint` |
| Production bugs | Determinism | stateful blueprint run twice, same input | identical output | unit, `blueprint` |
| Production bugs | Pending job | lane leaves a promise job | `lane-failed`, cause `pending-job`; later runs `unavailable` until a pause replaces the VM | unit, `blueprint` |
| Production bugs | Linear-memory contract | `_getMemory().buffer.byteLength` before and after a lane allocating 50 MiB, then after a small run | grows by at least 50 MiB and does not fall | unit, `blueprint` |
| Production bugs | Pending-job contract | `qjs_is_job_pending` after `Promise.resolve().then` / before | non-zero / zero | unit, `blueprint` |
| Production bugs | Getter on host | thrown object and returned object with throwing getters | failure typed; an op called from the getter is never called | unit, `blueprint` |
| Rules | Message cut | thrown message of 0, 499, 500, 501 UTF-16 units; 501 with a surrogate pair across the cut | `failed` holds 0, 499, 500, 500 and 500 units, parsed without error | unit, `blueprint` |
| Rules | Allow-list | every own name of `globalThis`, every reachable object | exactly `AggregateError Array ArrayBuffer AsyncDisposableStack BigInt BigInt64Array BigUint64Array Boolean DataView DisposableStack Error EvalError Float16Array Float32Array Float64Array Function Infinity Int16Array Int32Array Int8Array Iterator JSON Map Math NaN Number Object Promise Proxy RangeError ReferenceError Reflect RegExp Set SharedArrayBuffer String SuppressedError Symbol SyntaxError TypeError URIError Uint16Array Uint32Array Uint8Array Uint8ClampedArray WeakMap WeakSet decodeURI decodeURIComponent encodeURI encodeURIComponent escape eval globalThis isFinite isNaN parseFloat parseInt undefined unescape use`; every object frozen; global object non-extensible | unit, `blueprint` |
| Rules | JSON exactness | `NaN`, `Infinity`, `-Infinity`, `-0`, `undefined`, a function | `lane-failed`, cause `not-json-exact`, with the path | unit, `blueprint` |
| Rules | Strict decode | empty string, unparsable text, unknown tag | `lane-failed`, cause `boundary`. Decision (Sergii, 2026-11-08): a new cause, not reusing `threw`, because no blueprint threw and only the boundary writes this result | unit, `blueprint` (Node) |
| Rules | Output count | `one` given 0, 1, 2 values | `lane-failed` cause `role` naming the output, ok, cause `role` naming the output | unit, `blueprint` (Node) |
| Rules | Output count | `any` given 0, 2 values | ok, ok | unit, `blueprint` (Node) |
| Rules | Output names | undeclared name; declared name missing | `lane-failed` cause `role` naming it (both) | unit, `blueprint` (Node) |
| Rules | API version | written for 0, 1, 2 (app is 1) | runs, runs, not run with `blueprint-api-too-new` | unit, `blueprint` |
| Rules | Nesting | `use()` of an id not in `uses`, even caught by the caller | run fails | unit, `blueprint` |
| Rules | Nesting | nested blueprint reads caller's closure, `args`, globals | sees none of them | unit, `blueprint` |
| Rules | Nesting | omitted input; unknown input; wrong kind | default used; `lane-failed` cause `nested-input` naming blueprint and input (both) | unit, `blueprint` (Node) |
| Rules | `expr` stub | `19mm`, `-15deg`, `0.5mm` | `{19,'mm'}`, `{-15,'deg'}`, `{0.5,'mm'}` | unit, `expr` |
| Rules | `expr` stub | Double overflow | 308 nines + `mm`; the digits of `Number.MAX_VALUE` + `mm`; 309 nines + `mm` | finite value; `Number.MAX_VALUE`; `ParseError`. Decision (Sergii, 2026-11-08): refuse, not return `Infinity`, because `Expression` means "parses" and no length can hold it | unit, `expr` |
| Rules | `expr` stub | `-0mm` | `{-0,'mm'}`: the grammar admits it | unit, `expr` |
| Rules | `expr` stub | `19 mm`, `+19mm`, `1e2mm`, `.5mm`, `19`, `19MM`, `19.mm`, `-mm`, `5.5.5mm`, `19mmx`, ` 19mm`, `19mm `, `` (empty) | `ParseError` | unit, `expr` |
| Module boundaries | Fences | `plates` importing quickjs-wasi; `blueprint/authoring` importing at run time; `blueprint/authoring` importing a type only | rejected, rejected, allowed | unit, `tooling/ad10` |
| Module boundaries | Kernels | `geometry` importing `result` / `di` or `reactive`; `result` importing any | allowed / rejected / rejected | unit, `tooling/ad10` |
| Glue | Pool | version no longer pinned at a pause | its VM disposed | unit, `blueprint` |
| Glue | Handles entering a run | `args` built with the run's table: a handle allocated there, read by an op; the next run | same value back; that handle unknown (Decision, Sergii, 2026-11-08: `(handles) => LaneArgs`, not deferring to the first pull, because BP-8's `args` holds pulls as handles) | unit, `blueprint` |
| Rules | Nesting | omitted `part`, `anchor`, `asset` input | `lane-failed` cause `nested-input` naming it: BP-6 gives no handle source for a default | unit, `blueprint` (Node) |
| Glue | Handle table | 100 runs with handles and op results | `objCount` the same after run 2 and run 100; handles from run 1 unknown to run 2 | unit, `blueprint` |

</frozen-after-approval>

## Code Map

- `packages/blueprint/src/{index,worker,authoring}.ts` -- `export {}` today; `authoring` stays so (13.21).
- `.dependency-cruiser.mts:7,29,32` -- kernels already import only `result`; the ticket's `allowedTargets` edit landed through `GRAPH` rows (`expr: ['result']`). `onlyImports` at the npm rules is the pattern for quickjs-wasi.
- `tooling/ad10/rules.spec.ts` -- `%s, a kernel, may import only result` already exists; new fixtures join `fires each deliberate violation` and the `it.each` of allowed edges.
- `packages/schema/src/types.ts:98` -- `ViolationKind = never`.
- `packages/storage/{vitest.config.ts,tsconfig*.json}` -- browser-mode package precedent; `tooling/vitest/browser-instances.ts`.
- `pnpm-workspace.yaml` -- `catalogMode: strict`, so quickjs-wasi goes in the catalog.
- `archive/spike-13-16-sandbox:spikes/src/{boundary,sandbox-wasi}.ts` -- the boundary, lockdown and `fixedWasi` to port into this plan's files, without their header essays, restating comments, bare `catch {}` or the `error.message` read.
- quickjs-wasi 3.6.3 source: `dist/index.js:1975` `JSException`'s constructor reads the guest's `message`, `name` and `stack`, so guest getters would run; `dist/index.js:716` a host callback's `Error` copies its stack into the guest, a string doesn't; `dist/index.d.ts:217` out of memory surfaces as a JS exception; `dist/index.d.ts:124` `WEAK_REF` also removes `FinalizationRegistry`.

## Tasks & Acceptance

**Execution:**
- [ ] `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/sandbox-verdict.md` -- first, before any spec pins a budget: re-run the spikes' timings and memory probes in a browser worker **on battery, `power-saver`** from a worktree of `archive/spike-blueprint-calls`; add a dated section recording the power state and saying the AC reference is still outstanding. A result arguing against 100 steps, 64 MiB or 48 MiB halts for Sergii. Docs-only: committed straight to main.
- [ ] `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `packages/blueprint/package.json` -- `quickjs-wasi: 3.6.3` (exact) in the catalog; deps `quickjs-wasi`, `valibot`, `@keeb-cad/{di,result,schema}`; devDeps as `packages/storage/package.json`.
- [ ] `packages/expr/package.json`, `tsconfig{,.lib,.vitest}.json` -- dep `@keeb-cad/result`, devDeps and tsconfigs after `packages/hashing`.
- [ ] `packages/blueprint/vitest.config.ts`, `tsconfig{,.lib,.vitest,.node}.json`, `vitest.config.ts` (root), `eslint.config.ts` -- project `blueprint/browser` includes `src/**/*.browser.spec.ts`, with `quickjs-wasi` in `optimizeDeps.include`; inline root project `blueprint` runs every other spec on Node (the storage split); `tsconfig.lib.json` libs `["ES2023", "ESNext.Disposable", "WebWorker"]` (spine's Type libs; precedent `packages/design/tsconfig.lib.json`) with `vite/client` types for `?url`; `packages/blueprint/*.config.ts` in `NODE_FILES`.
- [ ] `packages/expr/src/{parse-expression.ts,types.ts,index.ts}` + spec -- `parseExpression` (function): `Result<{ value, unit }, ParseError>`; `types.ts` holds `ParseError` and `Unit`, which `schema` re-uses in 13.2.
- [ ] `packages/schema/src/types.ts`, `packages/schema/src/testing/violation.ts` + spec, `packages/schema/src/testing/index.ts`, `packages/workers/src/model-worker/model-worker-lifecycle.spec.ts` -- `ViolationKind = 'blueprint-api-too-new' | 'lane-failed'`; `aViolation` (function, takes an overrides object; `Violation` has no schema, so its spec asserts the default value), which replaces that spec's local `'test-kind'` helper at every call site.
- [ ] `packages/blueprint/src/api-version.ts`, `index.ts` -- `BLUEPRINT_API_VERSION = 1`. The root exports only this and the types; `worker.ts` exports `VmPool`, `EngineLoader`, `blueprintWorkerModule`; `authoring.ts` stays `export {}`. 13.21's build stamps declarations from the root.
- [ ] `packages/blueprint/src/sandbox/` -- `engine-loader.ts` `EngineLoader` (service): compiles the `.wasm` once, `AsyncResult<WebAssembly.Module, EngineUnavailable>`; `budgets.ts` constants; `step-budget.ts` `StepBudget` (service, plain class); `vm-options.ts` `vmOptions` (function); `fixed-clock-and-random.ts` `fixedClockAndRandom` (function); `boundary-source.ts` the boundary as a constant (captures built-ins, deletes off-list names, freezes, compiles factories, wraps lanes and `use()` in `try/catch`, cuts messages at 500, serialises in one walk); `classify-escape.ts` `classifyEscape` (function); `types.ts`.
- [ ] `packages/blueprint/src/lane/` -- `host-call-wrapper.ts` `HostCallWrapper` (service, plain class): the one host-call wrapper, built per run from a stage's operation table and a `HandleTable`, needing no VM (BP-10 is its second user); `decode-lane-result.ts` `decodeLaneResult` (function) with `lane-result-schema.ts`, Valibot; `handle-table.ts` `HandleTable` (service, plain class); `check-lane-outputs.ts` `checkLaneOutputs` (function), for top-level runs and `use()`; `check-nested-inputs.ts` `checkNestedInputs` (function), Valibot per declared kind; `types.ts` (`LaneContract`, `LaneFailure`, `LaneArgs`).
- [ ] `packages/blueprint/src/pool/` -- `blueprint-vm.ts` `BlueprintVm` (service, plain class): `runLane(lane, { operations, convertHandle }, args)`; `vm-has-outgrown.ts` `vmHasOutgrown` (function); `vm-pool.ts` `VmPool` (service): `pause(pins)` creates, replaces and disposes, `runLane` answers `unavailable` for a missing or dead VM and `blueprint-api-too-new` for a closure entry newer than the app; `blueprint-worker-module.ts` `blueprintWorkerModule` (di module); `types.ts` (`PinnedBlueprint`).
- [ ] Specs beside each -- the boundary table's `blueprint` rows; engine rows in `*.browser.spec.ts`.
- [ ] `.dependency-cruiser.mts`, `tooling/ad10/rules.spec.ts`, `tooling/ad10/violations/**` -- `only-blueprint-imports-quickjs-wasi`; `blueprint-authoring-imports-nothing-at-run-time` from `authoring.ts` and `authoring/`, skipping `type-only` edges and its own folder; fixtures for both, an allowed type-only one, and the ticket's kernel importing `result` (allowed).
- [ ] `app/public/third-party-notices.txt` -- QuickJS-NG's and wasi-libc's licence notices, copied from upstream.
- [ ] `_bmad-output/initiative-keeb-cad-m1/architecture-blueprints/architecture-blueprints.md` -- add `an unreadable result or an engine trap (boundary)` and BP-6's `nested input` to the Failure kinds row's causes, and `boundary` to BP-5's deterministic list. `_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md` -- define `ParseError` in the Data Schema section beside `Unit`, both owned by `expr` and re-exported by `schema`. Docs-only: committed straight to main, before the `expr` code.
- [ ] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- entries: out of memory depending on earlier garbage; 2D/3D handle tags; the unknown-query check for the first query; `range` in nested inputs for 14.2; the AC reference run of the timings, whenever AC is at hand. Docs-only: committed straight to main.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then every row's test passes in Chromium and Firefox (`expr` and `tooling/ad10` rows on Node).
- Given a clean install, when `pnpm check:fast` runs, then the fences hold and `tooling/check-steps.spec.ts` passes.

## Implementation Notes

Commit nothing, docs-only tasks included: every change stays in the working tree on this branch until Sergii has looked; the docs go to main after that.

Decision (Sergii, 2026-11-08): a `one` output is a bare value and an `any` output an array, not unwrapping `[x]`, because unwrapping silently changes a one-item list into its item.
Decision (Sergii, 2026-11-08): `-0` in a `use()` input passes as `0`, not a failure, because BP-3's exactness rule is about returned values and `-0` is not a wrong kind.
Decision (build): `blueprint` depends on `expr`, not hand-parsing a quantity default, because BP-8 says `quantities as numbers in mm or deg` and a default is an expression; `GRAPH` draws `blueprint: ['geometry', 'expr', 'schema', 'hashing']`.
Decision (build): `blueprint` uses ts-pattern, not `switch`, because the spine's error comment names `an exhaustive ts-pattern match`.
Decision (build): handles number from 1 in each run, not per VM, because BP-3 requires state not `surviving between runs`.
Decision (build): an undeclared `use()` and malformed outputs report `threw` and `role`, not new causes, because the Failure kinds row lists only those.
Decision (build): `EngineLoader` keeps only a successful compile, not a failure, because BP-5 says an unavailable lane is `never cached`.
Real-host run: the specs in `*.browser.spec.ts` run the real quickjs-wasi 3.6.3 in Chromium and Firefox; no fake of the engine.

## Plan Change Log

- 2026-11-08, review pass 1: handles couldn't enter a run. Amended the boundary table with Sergii (`(handles) => LaneArgs`; omitted handle-kind nested input fails). Known-bad state avoided: a lane whose pulls can never be handles. KEEP: every other file; applied in place rather than reverted, told to Sergii.

## Review Triage Log

Pass 1 (quick, test-reviewer), 2026-11-08. No quote dropped.

| Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- |
| `InternalError`, Iterator Concat unfrozen; `WALK` can't see it | medium | patch | deleted global, still reachable from a caught error; `hidden` omits it |
| `Error.prepareStackTrace`, `stackTraceLimit` keep state | maybe-false | patch | settled on the real engine by the patch's spec |
| Native error subclasses hit the override mistake | low | patch | loop covers only `Error.prototype` |
| Pending job after an escape blames the next run | medium | patch | `runLane` checks the job only when `answer` is Ok |
| Non-string `use` id runs guest code in the host read | medium | patch | `#hostFunction` calls `handle.toString()` |
| `use` input of a function makes the host `JSON.parse` throw | medium | patch | `stringify` returns `undefined` |
| `outputs`, `problems` optional | low | patch | BP-8 defines both |
| Quantity default that doesn't parse reaches the lane | low | patch | `err: () => value` |
| `vm-options.spec` passes with no mask | medium | patch | `?? 0` |
| Nested-scope test's `args` leg can't fail | medium | patch | caller runs with `noArgs` |
| Object-count test can pass on null | low | patch | `vmOf` may return null |
| `stringContaining('stack')`, `aViolation` narrowing, class order, numbers in names | low | patch | direct corrections |
| Handles can't enter a run: `HandleTable` is made inside `runLane`, args are stringified before any allocation, part/anchor/asset defaults arrive tagged | high | intent_gap | `blueprint-vm.ts:55`; found in triage; asked of Sergii; code kept, see the question |
| `constructor` as an output name bypasses `v.record` | low | reject | no blueprint names an output so, and a fix needs a second key walk |
| `a-pinned-blueprint.ts` holds several kinds | low | reject | one concept, test lanes; no named harm |
| Pinned text `E: x`, `(inputs)`, thrown-text message | low | reject | logged as Decisions at the look |
| `Math.random`, strict mode undocumented | false | reject | both are BP-3 rules |
| Integer handles, finite quantities undocumented | false | reject | BP-1 `integer handles`; BP-8 `quantities as numbers` |

Pass 2 (quick, test-reviewer), 2026-11-08. No quote dropped.

| Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- |
| BigInt, cycle or function property in `use()` inputs escape the run failure | medium | patch | `stringify` throws before `nestedBegin`, or drops the key |
| `expectedIntrinsics` repeats production | low | patch | same expression as `vm-options.ts` |
| `AggregateError`, `SuppressedError` subclass rows missing | low | patch | loop patches them, no row |
| Walk test's third claim unnamed; `runsBeforeTheLast` misnamed | low | patch | direct corrections |
| Unparsable default and escape-with-job choices undocumented | low | reject | logged as Decisions at the look |

Pass 3 (quick, test-reviewer), 2026-11-08. No quote dropped. Above low: halted for Sergii.

| Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- |
| A bad value under a named `use()` input reports `(inputs)`, not the input | medium | asked | `encodeInputs` drops `notExact.path`; BP-6 `naming the blueprint and the input` |
| Out of memory in the input walk reports `nested-input` | low | asked | bare `catch`; `encodeThrow` checks `isOutOfMemory` |
| `-0` in `use()` inputs newly fails the run | medium | asked | `walk` rejects it; no requirement says so |
| `vm-options.spec` rows narrow and pass on mask `0` | low | logged | `has exactly the listed names on the global object` covers it on the real engine |

Pass 4 (quick, on the input patch), 2026-11-08. Nothing above low: the review ends; lows logged, not patched.

| Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- |
| A named input set to `undefined` fails the run, not omitted | low | logged | fails loudly, naming the input; listed for Sergii at the look |
| Out-of-memory rethrow in `encodeInputs` has no spec | low | logged | the walk's own allocation can't be made to fail at that point; two lines mirroring the sibling encoders |

## Design Notes

**Run path.** `VmPool.runLane` → `BlueprintVm.runLane` resets `StepBudget`, makes a `HandleTable`, calls the guest entry through `callFunctionRaw`. The boundary types out of memory by its captured `InternalError` and the message `out of memory` (probe: a guest `catch` outside the allocating function got `InternalError: out of memory` and could still stringify it). An exception reaching the host is disposed unread: exhausted budget gives `step-budget` (probe: `while (true)` stopped at handler call 101, past a guest `try/catch`, and the VM answered next), otherwise `out-of-memory`, for a failed allocation inside the boundary's own `catch`. A non-`JSException` throw is a trap: `lane-failed`, then the VM is dead.

**Decisions.**
- Decision (plan): a bad `use()` or nested output records a failure on the run as well as throwing, not throwing alone, because BP-6 says it `fails the run` and a blueprint can catch a throw.
- Decision (plan): an exception reaching the host with the budget unspent is `out-of-memory`, not a new cause, because the spine's list has no other and the boundary catches everything catchable.
- Decision (plan): a count break is the `role` cause naming the output, not a new `count` cause, because the Failure kinds row lists `an undeclared or missing role` and the ticket's count check is about that role's values.
- Decision (plan): `checkLaneOutputs` runs on the host, crossing once per `use()`, not in the guest boundary, because BP-8 says `The host checks each output against its declared name and count`.
- Decision (plan): the script is one expression compiled by `Function` into a factory, not `eval` per run, because BP-3 says `compiled once into a **factory**` and BP-7 says `evaluating to { lanes: { <stage>: run } }`.
- Decision (plan): `use` is a frozen global, not a third lane argument, because BP-8 fixes `<stage>(args, op)` and BP-3 adds `the frozen blueprint API` to the global scope.
- Decision (plan): `-0` fails as `not-json-exact`, not normalised, because BP-3 fails `A returned value JSON can't carry exactly` and `JSON.stringify(-0)` is `0`.
- Decision (plan): the allow-list omits `InternalError` and `queueMicrotask`, not the engine's whole list, because BP-3 allows `the ECMAScript built-ins` and neither is one (TC39's finished-proposals list has Explicit Resource Management, so `DisposableStack` stays); the boundary captures `InternalError` before deleting it.
- Decision (plan): a trap reports cause `boundary` with a fixed message and is cached, not the spike's `the runtime trapped: ${String(error)}`, because BP-3 prevents `host details leaking in` and BP-5 says `Only the run that trapped is cached`.
- Decision (plan): a 64 MiB allocation fails, not passes, because BP-4 says `Out of memory is a typed failure` and the limit is `Maximum memory the QuickJS runtime can allocate` (`dist/index.d.ts:214`), bookkeeping included; 63 MiB passes on the same bookkeeping, measured under 1 MiB.
- Decision (plan): the message cut counts UTF-16 units, not code points, because the boundary measures with `String.prototype.slice` and a cut surrogate still crosses as JSON.
- Decision (plan): `callFunctionRaw`, not the documented `callFunction`, because `callFunction` throws a `JSException` whose constructor reads the guest's `message`, `name` and `stack` (`dist/index.js:1975`), and BP-3 says `The host never reads a guest error object`.
- Decision (plan): the intrinsics mask also removes performance, DOMException and atob/btoa, not the documented default of all, because BP-3 says `Everything else is deleted`. The engine exposes no `Atomics`, so the list has none.
- Decision (plan): `BlueprintVm`, `StepBudget`, `HandleTable` and `HostCallWrapper` are plain classes their owner constructs, not transient `di` registrations, because each needs per-instance data (a pin, an engine module) and AD-25's services take theirs by `inject()` in field initialisers, which passes no arguments (`packages/di/src/registration-builder.ts:22`, `useFactory(factory: () => T)`).
- Decision (plan): `LaneContract` is `blueprint`'s own narrow type, not schema's `BlueprintDeclaration` now, because the Data Schema says `coded by 13.21 (the first to validate declarations)`; the real declaration is structurally assignable to it.
- Decision (plan): `checkNestedInputs` skips `range`, not a literal-only check, because the Data Schema says `range: AD-17 expressions over this blueprint's own inputs`, which the stub can't parse.
- Decision (plan): the pool takes scripts as arguments, not `LibraryData`, because the epic gives 13.17 `BP-9's VMs and handle tables` and 13.21 `BP-9's pool filling`.
- Decision (plan): `decodeLaneResult` and `checkNestedInputs` use Valibot, not hand checks, because AD-10 has valibot imported `by `blueprint`, which checks inputs at the boundary`.
- Decision (plan): the notices ship here, not deferred to 13.21, because BP-2 requires them and 13.21's ticket doesn't name them.
- Decision (plan): the three 48 MiB rows test `vmHasOutgrown`, not a real VM at an exact size, because AGENTS.md says `Test a rule where it is defined` and a lane can't choose its size to the page.
- Decision (plan): `-0mm` keeps `-0`, not `0`, because AD-17's stub accepts `-?digits(.digits)?` and 14.2 must keep what it accepted.


## Conformance Log

- `Give every decision its rejected alternative` -- fixed (causes, sticky failure, plain classes, Sergii rows)
- `Hold state in di services` (plain classes) -- fixed
- `When nothing says what a boundary returns, ask.` (decode cause) -- asked
- `Add or change ... shared kind only after the spine's Data Schema section defines it` (`ParseError`) -- asked
- `When a decision builds by hand the main job of a dependency` (Valibot) -- fixed
- `Give each file one kind of thing` (unplaced files) -- fixed
- `Prove a test Stryker can't reach ... with a toggled bug` -- fixed
- `Give every threshold three rows` (`expr` overflow, grammar, message cut) -- fixed
- `Take expected values from the requirement` (allow-list) -- fixed
- spine Verification row, pure specs on Node -- fixed
- `Inside a package, folders are **by concept**` -- fixed
- `Commit docs-only changes straight to main` -- fixed
- `Glossary terms only.` (guest, answer) -- fixed
- Precedent spike files, layout and comments -- fixed
- Fixture for `blueprint` importing `model` (already proven by GRAPH) -- fixed; the kernel fixture stays, the ticket asks for it
- `BP-2 The app carries ... licence notices` -- fixed
- gap: VMs' `maxStackSize` and fixed clock, `packages/blueprint/src/sandbox/vm-options.ts` -- fixed
- gap: Result returns, `packages/blueprint/src/lane/` -- fixed
- gap: data interpreter as wrapper user, `packages/blueprint/src/lane/host-call-wrapper.ts` -- fixed
- gap: type-only authoring import, `tooling/ad10/violations` -- fixed
- gap: root and worker exports, `packages/blueprint/src/index.ts` -- fixed
- gap: 13.21 pool filling, `packages/blueprint/src/pool/vm-pool.ts` -- fixed
- gap: `aViolation`, `packages/workers/src/model-worker/model-worker-lifecycle.spec.ts` -- fixed
- gap: `NODE_FILES` and devDeps, `eslint.config.ts`, `packages/expr` -- fixed
- gap: API version 2 state, `packages/blueprint/src/pool/vm-pool.ts` -- fixed: reachable through the spine's Deferred hosted library; the ticket names it
- gap: exact 48 MiB state, `packages/blueprint/src/pool/vm-has-outgrown.ts` -- fixed
- Final pass: trap cause; 64 MiB row; cut unit; `callFunctionRaw` and mask decisions; tsconfig libs; decode folder; `aViolation` tag; wrapper as a class; clock name and row; `ParseError` home -- fixed
- Final pass: `Atomics` -- no change: the engine lists none

## Verification

**Commands:**
- `pnpm vitest run --project 'blueprint*' --project @keeb-cad/expr` -- expected: green in Chromium and Firefox
- `pnpm vitest run tooling/ad10` -- expected: green
- `pnpm typecheck && pnpm check:fast` -- expected: exit 0
- `pnpm test` -- expected: exit 0
- Real-host run: the specs use the real engine; no fake of quickjs-wasi.

- Toggled bug: break the step budget, the memory limit, the allow-list deletion and the pending-job check in turn, watch the browser spec go red, restore, and say so in the PR.

**Manual checks:**
- Nothing visible changes: no app code imports `blueprint` until 13.21 and 13.18.
