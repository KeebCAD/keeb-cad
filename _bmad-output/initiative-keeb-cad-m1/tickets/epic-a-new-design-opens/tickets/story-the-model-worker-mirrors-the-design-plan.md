---
title: 'The model worker mirrors the design'
type: 'feature'
ticket: '4'
created: '2026-11-07'
status: 'built'
baseline_revision: 'f489035a89a6733360ccfe0ef7c8c06eb1e65b37'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 1
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing crosses to the model worker: `messaging`, `protocol`, `workers` and `pipeline` are stubs, `design/worker` has no mirror, and `app/src/model.worker.ts` is empty, so no stage can ever read the design.

**Approach:** Build `messaging`'s generic machine and `protocol`'s first messages over `schema`'s new crossing kinds; give `design/worker` the mirror and its writer; `pipeline` receives `design` and `patches` through the gate and posts empty `issues` and the derived files at each seq; `workers` spawns the model worker after the first `Committed`, sends the whole bundle, patches and `focus`, gates posts and restarts on a crash up to the cap; `app` gains the model-worker start file and the widened fences.

## Boundaries & Constraints

**Always:**
- Main sends `design` (the whole bundle: design, routing, fingerprints, revision), `patches` (patches, revision) and `focus` (workspace), each stamped `(epoch, seq)`; the worker posts `issues { violations: [] }` and `derived-files { routing, fingerprints, revision }` at every design seq, echoing it. No `stage-started` is posted; `workers` still gates it.
- The design-seq gate (AD-11): `design`/`patches` pass only with a seq above the latest design seq, then advance it; other kinds pass at seq ≥ latest; another epoch is dropped. On main only `workers`' own design sends advance it.
- No worker before the store's first `Committed`; its first message is the whole bundle read from the store. A crash (`error` or `messageerror`) restarts with epoch + 1 and the whole bundle; the 3rd consecutive crash with no gate-accepted post between restarts nothing and status reads `failed` until `restart()`.
- `focus` is sent right after the whole bundle at each start, with `start`'s workspace (`layout` when none), and on every `focus(workspace)` call.
- The mirror holds the authored design only, deep-frozen on every whole load and patch apply; only `DesignMirrorWriter` writes it.
- `send` deep-checks every message for plain values (plain objects, arrays, primitives, typed arrays, `ArrayBuffer`) and throws naming the offending path.
- Decision (Sergii, 2026-11-07): `workers`' model-worker status is `'idle' | 'running' | 'failed'` (`idle` until the first spawn, `running` from spawn, `failed` at the crash cap until `restart()`), not `'running' | 'failed'`, because that reads `running` before any worker exists.
- Decision (Sergii, 2026-11-07): the plain-value check runs in every build until it is measured, not in dev and tests only via `import.meta.env.DEV`, because that ties the kernel to Vite's types and settles AD-11's open question before measuring.
- Decision (Sergii, 2026-11-07): `messaging`'s request side (pending requests, the typed `stale` reply, reject all on restart) waits for the first story with a request kind, not built now with test-only kinds, because that fixes its caller-facing shape with no consumer; 23.4 builds only the post gate. Sofia updates the ticket's wording; `deferred-work.md` records it.
- Decision (Sergii, 2026-11-07): `restart()` before `start` and a second `start` throw `InvariantError`, and `focus` before `start` only updates the held workspace, which `start`'s workspace replaces, not ignored silently, because a wiring mistake should fail loudly, as `run` does before a design is loaded.

**Never:**
- No stage, derivation or `createDerivations` call (13.18); no revision check of the mirror (its spike); no undo/redo routing in `patches` (epic-change-a-parameter); no `acceptDerivedFiles` and no held issues on main (23.5); no `start()` call in `start-main.ts` and no URL workspace (23.7).
- No `vi.mock`, no jsdom; no change to `design`'s store behaviour.


## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mirror after a command | a commit's patches, structured-cloned, applied by the writer | mirror `toEqual` the store's design, deeply frozen | none |
| Spawn waits | `start` with no design | no spawn; first `Committed` spawns, first message `design` | none |
| Stale post | `issues` at seq latest − 1, or from another epoch | dropped (crash count not reset) | none |
| Crash cap | 3 consecutive crashes | 2 restarts, then status `failed`, no 4th spawn | `restart()` clears |
| Non-plain value | a `Map` at `design.meta.x` | `send` throws naming `design.meta.x` | nothing posted |

</frozen-after-approval>

## Code Map

- `packages/messaging/`, `protocol/`, `workers/`, `pipeline/` -- stubs: `src/index.ts` is `export {}`, `package.json` has `exports: { ".": … }` and no deps, composite `tsconfig.json`. Take `packages/design`'s `tsconfig.json` + `tsconfig.lib.json` + `tsconfig.vitest.json` split (the browser packages' `tsconfig.vitest.json` comment says they run in browsers), lib `["ES2023", "WebWorker"]` (+ `ESNext.Disposable` where `di` disposes), per the spine's Type libs row.
- `packages/editor/vitest.config.ts` -- the browser-mode pattern (Playwright, Chromium and Firefox, `sequence.shuffle`, `requireAssertions`, `*.types.spec.ts` excluded); drop Vue, Tailwind, `optimizeDeps` and its AD-26 comment (deferred-work already lists that comment).
- Spike `0f0539a:spikes-messaging/src/{hand,common}.ts` -- reference only for `Endpoint`, `listen` (calls `start()`), `send` with transfer; its `StaleGate` tracks seq per kind, which AD-11's gate does not: do not copy it.
- `packages/design/src/patching/types.ts` -- `DesignPatch` moves to `packages/schema/src/types.ts`; `Changed`, `design-patcher.ts` and `store/types.ts` import it from `schema`; `design`'s `index.ts` and `worker.ts` stop exporting it (no user outside `design`).
- `packages/design/src/patching/deep-freeze.ts` -- Immer's `freeze(value, true)` freezes in place; the writer reuses it (AD-2: "the same `deepFreeze` `replaceDesign` uses").
- `packages/design/src/store/types.ts` -- `CommitEvent` is `{ kind: 'patches'; patches; seq; revision } | { kind: 'whole'; committed }`; `DesignStore.events.on('commit', …)`, `current: Option<Committed>`. Reuse; don't change.
- `packages/design/src/store/design-store.spec.ts` -- its test-command registration is the pattern for the mirror spec's test command; `src/testing/expect-deeply-frozen.ts` is reused there.
- `packages/schema/src/types.ts` -- `ItemId = Id`, `ModelRejectionKind = never` (the empty-union pattern `ViolationKind` copies). `ReadonlyRef` is not coded (13.18, its first reader).
- `app/src/start-main.ts` -- the pattern for `start-model-worker.ts`. `app`'s drawn edges have no `protocol` or `messaging`.
- `.dependency-cruiser.mts` -- `MODEL_WORKER_ENTRY` widens to `^app/src/(model\.worker|start-model-worker)\.ts$`, which the `model/worker`, `design/worker` and `library/worker` fences all use; `WORKER_ENTRIES` reaches the start file through `model.worker.ts`. Fixture `tooling/ad10/violations/app/src/start-model-worker.ts`; `rules.spec.ts`'s allowed-edges `it.each` gains its row.
- Root `vitest.config.ts` -- the inline `@keeb-cad/app` Node project goes; `app/vitest.config.ts` (browser) takes `bundle-round-trip.spec.ts` unchanged. The four packages' configs replace their configless Node projects.

## Tasks & Acceptance

**Execution:** (kept whole at ~5,100 tokens, Sergii 2026-11-07; build package by package in this order, each against its own boundary rows)
- [x] `packages/schema/src/` -- `workspace.ts` (`workspaceSchema`), `stage-id.ts` (`stageIdSchema`), `fix.ts` (`fixSchema = v.variant('command', [])`); `types.ts` adds `DesignPatch`, `Workspace`, `StageId`, `Fix`, `ViolationKind = never`, `Violation` (no `region`: 14.4); `testing/workspace.ts` (`aWorkspace(text: string = 'layout'): Workspace`, parsed), `testing/stage-id.ts` (`aStageId(text: string = 'parts'): StageId`, parsed) with scalar-builder specs, as `anId(text = 'id')`; `workspace.spec.ts`, `stage-id.spec.ts`, `fix.spec.ts`; root `index.ts` and `testing/index.ts` export them.
- [x] `packages/design/` -- drop `DesignPatch`; `src/mirror/mirror-state.ts` (`MirrorState`, the `shallowRef`, not exported), `mirror/design-mirror.ts` (`DesignMirror`: `value` getter, `revision`; `InvariantError` before the first load), `mirror/design-mirror-writer.ts` (`DesignMirrorWriter`: `replace(design, revision)` through `deepFreeze`; `apply(patches, revision)` through `DesignPatcher.apply`); `worker-module.ts` registers the three; `worker.ts` exports `DesignMirror`, `DesignMirrorWriter`; specs, including `mirror/mirror-follows-the-store.spec.ts`.
- [x] `packages/messaging/` -- `src/endpoint/types.ts` (`Endpoint`), `dispatcher/types.ts` (`Stamp { epoch; seq }`, `Stamped`, `Handlers<M>`); `sending/assert-plain.ts`, `sending/not-plain-error.ts`; `dispatcher/dispatcher.ts` (`Dispatcher`, below); `index.ts` re-exports `Dispatcher`, `NotPlainError` and the types (no free `send`/`listen`, no `DesignSeqGate` export); `vitest.config.ts`; specs over `MessageChannel`, constructing `new Dispatcher(kinds)` directly.
- [x] `packages/protocol/` -- `src/model-worker/types.ts`: the one union `ModelWorkerMessage` (`design`, `patches`, `focus` from main; `issues`, `stage-started`, `derived-files` from the worker), with `ToModelWorker` and `FromModelWorker` as `Extract`s of it, flat `{ kind } & Stamp & payload`, payloads `Frozen<…>` from `schema`; `model-worker/design-kinds.ts` (`designKinds`); `model-worker/messages.types.spec.ts`; `index.ts`; deps `schema`, `messaging`, `valibot` none.
- [x] `packages/pipeline/` -- `src/pipeline/pipeline.ts` (`Pipeline.listen(endpoint)`, below), `pipeline-module.ts` (registers `Pipeline`, and `Dispatcher` with `useFactory(() => new Dispatcher({ designKinds, wholeKind }))`); `index.ts` exports both; deps `design`, `protocol`, `messaging`, `schema`, `reactive`, `di`; `vitest.config.ts`; specs over a `MessageChannel` port with the real `designWorkerModule`.
- [x] `packages/workers/` -- `src/model-worker/model-worker-runner.ts` (`ModelWorkerLifecycle`: `start(spawn, workspace?)`, `focus(workspace)`, `restart()`, `status`, a `shallowRef` read through a getter), `model-worker/types.ts` (`Spawn`, `SpawnedWorker`, `ModelWorkerStatus`), `workers-module.ts` (registers `ModelWorkerLifecycle`, and `Dispatcher` with `useFactory(() => new Dispatcher({ designKinds, wholeKind }))`); `testing/fake-worker.ts` + `testing/index.ts` (`./testing` export); specs resolve `ModelWorkerLifecycle` from a container with the real `designModule` and a spec-local test command, and pass a `spawn` returning a fake worker (the boundary, as an argument); `index.ts`; deps `design`, `protocol`, `messaging`, `schema`, `reactive`, `di`, `result`; `vitest.config.ts`; specs.
- [x] `app/` -- `src/start-model-worker.ts` (container from `designWorkerModule` and `pipelineModule`, `await autoLoad()`, `resolve(Pipeline).listen(self)`); `model.worker.ts` re-exports it; `main-modules.ts` adds `workersModule`; `model-worker-entry.spec.ts` (its `spawn` wraps the real `Worker` and records each `message` event's `data`, compared to untyped literals); new `vitest.config.ts` sets `worker: { format: 'es' }` (`vite.config.ts` waits for 23.7's spawn); `package.json` deps `workers`, `pipeline`, devDeps `@vitest/browser-playwright`.
- [x] `.dependency-cruiser.mts`, `tooling/ad10/` -- widen `MODEL_WORKER_ENTRY`; reword the three fence `comment:` strings that name "the model worker's entry" to cover its start file, without AD-n; fixture and allowed-edge row for `start-model-worker.ts`.
- [x] Root `vitest.config.ts` -- drop the inline `app` project and list `'app/vitest.config.ts'` in `projects` (the `packages/*` glob doesn't reach `app`).
- [x] Browser-config plumbing, as `packages/di` and `packages/editor` have it -- `messaging`, `workers`, `pipeline`: `tsconfig.node.json` for `vitest.config.ts` (`@tsconfig/node26`), referenced from `tsconfig.json`; devDeps `vitest`, `@vitest/browser-playwright`, `@tsconfig/node26`, `@types/node`, `typescript`; `eslint.config.ts`'s `NODE_FILES` gains `packages/{messaging,workers,pipeline}/*.config.ts` and `app/vitest.config.ts`; `app/tsconfig.node.json` includes `vitest.config.*`. `protocol` gets no `vitest.config.ts`: its specs are type-only and run in the root's types project.
- [x] Each new `vitest.config.ts` -- no comment restating a rule or citing an AD; a comment only for a why the code can't say.

**Acceptance Criteria:**
- Given the workspace, when `pnpm check` runs, then it passes, Chromium and Firefox included.
- Given `Pipeline` posting before it applies `patches` (toggled bug), when `pipeline`'s echo spec runs, then it fails; restored, it passes (said in the PR).
- Given `ModelWorkerLifecycle` resetting the crash count on any received post rather than a gate-accepted one (toggled bug), when `workers`' stale-post row runs, then it fails; restored, it passes.
- Given `start-model-worker.ts` never calling `listen` (toggled bug), when `app`'s entry spec runs, then it fails; restored, it passes.

## Implementation Notes

- `workers`' class file is `model-worker/model-worker-lifecycle.ts`, named for its class, not the Code Map's `model-worker-runner.ts`, a leftover of the rename to `ModelWorkerLifecycle`.
- `protocol`'s `patches` payload is `readonly DesignPatch[]`, not `Frozen<DesignPatch[]>`, because `Frozen` maps a patch's `unknown` value to `{}` and makes its path readonly, which `DesignPatcher.apply` refuses; it is the commit event's own type. The type spec asserts that.
- (Superseded by loop 1: `listen` and the gate are now `Dispatcher`'s.) ~~`messaging`'s `listen(endpoint, gate, handlers)` takes a `Gate` (`{ admit }`), not a `DesignSeqGate`, so `Pipeline` adopts the first `design`'s epoch before admitting it, without the gate knowing about adoption. `DesignSeqGate` admits nothing before its first `restart(epoch)`.~~
- The plain check's `SharedArrayBuffer` row builds the buffer from a shared `WebAssembly.Memory`, not `new SharedArrayBuffer(1)`, because browsers expose that constructor only on cross-origin-isolated pages.
- `pipeline`'s frozen check is a stray write into the patched branch and an untouched one (`Object.assign` throws `TypeError`), not `design`'s `expectDeeplyFrozen`, because `pipeline` reaches `design` only through `design/worker`, and `design`'s `testing` folder is no export.
- `pipeline` imports `result` (`InvariantError` for a post before the first whole design, which the writer already makes unreachable); `result` is open to every package.
- `app`'s entry spec polls up to 10 s: the worker's first load has Vite transform its module graph on demand, which took 1.4–2.4 s in the whole-suite run (1 s default failed there, passed alone).
- `app`'s entry spec writes `new URL('model.worker.ts', import.meta.url)` (lint `unicorn/relative-url-style`) and the start file listens on `globalThis` (lint `unicorn/prefer-global-this`), not `'./model.worker.ts'` and `self`.
- `eslint.config.ts`' `NODE_FILES` already covered `app/vitest.config.ts` through `app/*.config.ts`; only the three packages were added.
- Decision (Sergii, 2026-11-07): `pipeline` depends on `result` for `InvariantError`, not without the guard, because `result` is open to every package (AD-10) and an impossible post should fail loudly.
- Decision (Sergii, 2026-11-07): `workers` takes `valibot` as a devDependency for its spec's test-command input schema, not `commands`' `emptyInputSchema`, because `workers` may not import `commands`.
- Decision (Sergii, 2026-11-07): the plain check lets an Array subclass pass (`Array.isArray`), not refused like a class instance, because nothing subclasses Array and structured clone carries its items.
- Verification (orchestrator, 2026-11-07): `pnpm typecheck && pnpm check:fast && pnpm test` exit 0; 205 files, 1705 tests, Node, Chromium and Firefox. Matrix audit: every row covered by a passing test.
- Review pass 1 patches applied (triage rows 1, 3, 5, 8–11); re-verified by the orchestrator: `pnpm typecheck`, `pnpm check:fast` and `pnpm test` green, 205 files, 1707 tests.
- Loop 1 (Dispatcher): nothing deleted; `messaging`'s `gate/`, `receiving/`, `sending/send.ts` and their specs are rewritten in place into `dispatcher/` (a spec moves with its code, its rows kept). Pre-loop copies of the `messaging`, `pipeline` and `workers` sources and specs: `/tmp/claude-1000/-home-ruyu-projects-keeb-cad/6da8267f-0c34-43e4-a8f2-9d488f284f56/scratchpad/loop1-backup/`.
- Loop 1 built: `messaging/src/dispatcher/` (`dispatcher.ts`, `types.ts`, `dispatcher.spec.ts` holding the old gate, listen and send rows plus the own-send, no-handler, adoption and epoch-before-adoption rows, all through a `MessageChannel`); `gate/`, `receiving/` and `sending/send.ts` removed; `Endpoint` stays in `endpoint/types.ts`. `pipeline-module.spec.ts` and `workers-module.spec.ts` hold the one-dispatcher-per-side row.
- (Superseded by Decision (Sergii, 2026-11-07, loop 1) on `wholeKind`; the guard was removed.) ~~Decision (loop 1, for Sergii's look): `Pipeline` drops `patches` that arrive before its first whole design, not let the writer throw, because the dispatcher's generic rule adopts the epoch of the first design-kind message, `patches` included, so the "before the first design" row's `patches` now passes the gate and the writer's `InvariantError` escaped as an unhandled error (both browsers). Alternative not taken: adopting only on `design`, which would make `messaging` know one kind by name.~~
- Loop 1 verification: `pnpm typecheck`, `pnpm check:fast`, `pnpm test` exit 0; 205 files, 1719 tests, Node, Chromium and Firefox. The three toggled bugs re-run after re-derivation: pipeline echo rows red (3 × 2 browsers), the three stale-post rows red (× 2 browsers), the entry spec red in both browsers; each green after restoring.
- Decision (Sergii, 2026-11-07, loop 1): the `Dispatcher` is configured with the whole-value kind, `new Dispatcher({ designKinds, wholeKind: 'design' })`, and only a message of that kind adopts the epoch, not the first message of any design kind with a guard in `Pipeline` dropping early patches, because the gate rule then stays whole in `messaging` (loop 1's known-bad state) and `messaging` still names no kind (`protocol` supplies both through `useFactory`). This settles the plan's contradiction between the Dispatcher note ("the first design-kind message") and the "before the first design" row.
- Loop 1 verification (orchestrator): `pnpm typecheck`, `pnpm check:fast`, `pnpm test` green; 205 files, 1722 tests.
- Pass 2 patches applied (rows 13–16, 19–21). `pnpm check` (orchestrator, 2026-11-07): exit 0; typecheck, lint, format, depcruise, 205 files and 1727 tests (Node, Chromium, Firefox), app and workbench builds, Playwright smoke. Toggled bug: `ModelWorkerLifecycle` without `event.preventDefault()` turns the crash-cancel row red in both browsers; restored, green.
- Toggled bugs, each red then green after restoring: `Pipeline` posting before it applies patches (3 specs × 2 browsers red), `ModelWorkerLifecycle` resetting the crash count on any `message` event (the three stale-post rows red), `start-model-worker.ts` without `listen` (entry spec red in both browsers).

## Plan Change Log

- 2026-11-07, loop 1. Trigger: Sergii, at his look, asked why `listen` is a free function and decided `messaging`'s crossing is an injectable service (one `Dispatcher` per side). Amended: Code Map tasks for `messaging`, `pipeline`, `workers`; Design Notes (`Dispatcher`, its registration, no-handler drop, epoch adoption in the gate; the `DesignSeqGate`-with-`new` decision replaced); boundary rows for own-send advance, no-handler drop, epoch adoption, one dispatcher per side. Known-bad state avoided: free `send`/`listen` plus a gate each owner news up, with epoch adoption wrapped in `pipeline` and main's gate needing an empty design-kind list to stay unmoved. Reverted: `packages/messaging/src`, `packages/pipeline/src`, `packages/workers/src` (copy kept at the scratchpad path in Implementation Notes). KEEP: everything else in the diff unchanged (`schema`, `protocol`, `design` mirror, `app`, tooling, every config, tsconfig and `package.json`); `assert-plain.ts` and `not-plain-error.ts` as they were, including the review fix refusing a view over non-`ArrayBuffer` memory; `FakeWorker`; `Pipeline`'s and `ModelWorkerLifecycle`'s behaviour, lifecycle edges and status; every spec scenario and its review fixes (pipeline `derivedFiles()` helper, distinct dropped-patch path, the before-first-design check, no module-level `RENAME`, the `SharedArrayBuffer` `it.each` from `WebAssembly.Memory`); the three toggled bugs, re-run after re-derivation.

## Review Triage Log

Pass 1 (quick, test-reviewer): high 0, medium 0, low 7, false 2, maybe-false 2 (one test-reviewer finding is two rows: literals); no quote dropped.

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | Main's receiving gate advances on a received design-kind post | low | patch | Real: `DesignSeqGate<ModelWorkerMessage>(designKinds)` sets `#latest` on an admitted `patches`; AD-11 "On main nothing received advances it". No worker code posts that kind today; typing the gate over `FromModelWorker` with no design kinds is a direct correction. |
| 2 | `listen` calls an absent handler for a kind the gate admits | false | reject | Main and `Pipeline` send only typed kinds; an unknown kind would throw in the worker, which main treats as a crash, the spine's answer to a message it can't read. Unreachable. |
| 3 | `postsAt` expects copied routing/fingerprints literals | low | patch | Real: `fingerprints: []` is `aFingerprintsFile`'s default; AGENTS.md "never a copied literal". |
| 4 | `stage: 'parts'`, `workspace: 'pcb'` literals in specs | false | reject | The tests read and assert these values; AGENTS.md: "Write out only the data the test is about". |
| 5 | A typed array over a `SharedArrayBuffer` passes the plain check | low | patch | Real: `ArrayBuffer.isView` returns before `value.buffer` is checked; the plan refuses `SharedArrayBuffer`. One-condition fix plus a row. |
| 6 | New browser configs lack `optimizeDeps.include` (mid-run re-bundle) | maybe-false | defer | The whole-suite log shows no dependency re-optimization; settled by a cold-cache run (`node_modules/.vite` cleared) watching for "new dependencies optimized". Would be medium. |
| 7 | `start-model-worker.ts` listens only after `await autoLoad()` | maybe-false | defer | AD-25 prescribes "awaits autoLoad() before it listens"; works today (entry spec green in both browsers). Settled by checking whether browsers queue a module worker's messages until top-level evaluation ends. Would be medium. |
| 8 | Dropped patch and accepted patch touch the same path | low | patch | Real: both replace `meta.name`; the mirror line can't see a wrongly applied drop. |
| 9 | Mirror check after a later `design` can't fail | low | patch | Real: the `design` replaces the mirror whole. |
| 10 | `'overlap'` widens to `string` in the type spec | low | patch | Real: no `as const`; refusal holds for any `ViolationKind`. |
| 11 | Module-level mutable `RENAME` array | low | patch | Real: AGENTS.md "Keep no mutable state at module level in a spec"; never mutated today, direct fix. |

Pass 2 (loop 1; quick, test-reviewer): high 0, medium 1, low 9, false 2, maybe-false 0 (carried 1); no quote dropped.

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 12 | `pnpm check` (build, workbench build, smoke) never ran | medium | patch | Real: only typecheck, check:fast and test were recorded; AC 1 names `pnpm check`. Run by the orchestrator after the patches. |
| 13 | Worker `error` not cancelled, so each handled crash is also an uncaught error on main | low | patch | Real: HTML spec, an uncancelled `error` on a dedicated `Worker` is reported in the owner's global scope; `crash` never calls `preventDefault()`; `FakeWorker` can't show it. |
| 14 | Plain check skips an array's non-index properties | low | patch | Real: the array branch walks `entries()` only; structured clone carries own enumerable non-index properties. |
| 15 | Before-first-design test can't see a late reply | low | patch | Real: `posts` fills one task after `delivered`; `arrayContaining` ignores extras. |
| 16 | Conditional inside `focuses %s` | low | patch | Real: `given === undefined ? …` in the act. |
| 17 | Gate assigns latest on a design send rather than taking the max; adopts the epoch before the seq check | false | reject | Unreachable: main's design seqs rise from 1 and `restart` resets latest to 0 before the whole bundle; no seq 0 is ever sent. The fix would edit this build's plan. |
| 18 | Plain check ignores symbol-keyed and non-enumerable properties | false | reject | Structured clone carries neither, so nothing non-plain crosses; getters are read by `Object.entries` and walked. |
| 19 | `CRASH_CAP` beside the class | low | patch | Real: AGENTS.md "a class file holds only its class". |
| 20 | Module-level mutable `OPTIONS` in the dispatcher spec | low | patch | Real: AGENTS.md "Keep no mutable state at module level in a spec". |
| 21 | `stage: 'parts'`, focus `workspace: 'pcb'` literals no assertion reads | low | patch | Real for these three (row 4 held only for the asserted focus rows): AGENTS.md "Build schema values the test doesn't read with the concept's test builder". |
| 22 | Plan text still describes the pre-loop `listen`/`Gate` and a one-argument `Dispatcher` | low | reject | The fix edits this build's plan; the orchestrator strikes the stale lines as housekeeping. |
| 23 | Start file listens after `await autoLoad()` | maybe-false | defer | carried: row 7, code unchanged. |

Pass 3 (pre-merge, AGENTS.md: the pass-2 patches; quick, test-reviewer): high 0, medium 0, low 1, false 1, maybe-false 0; plus 4 rejected on fix route; no quote dropped.

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 24 | `cancels a crash error, so main reports it nowhere else` claims more than `expect(notCancelled).toBe(false)`; the variable reads inverted | low | patch | Real: `FakeWorker` can't observe main's reporting. Renamed `cancels the worker's error event`, asserting `defaultPrevented` true. |
| 25 | `toHaveLength(2)` after the poll is dead | false | reject | `postsAt` is `arrayContaining`, so the poll passes with extras; the length check is what catches a late reply. |
| 26 | Poll plus length is two partial assertions, not one whole value | low | reject | Deliberate: post order within a seq is unasserted (plan decision); together the two are exact. |
| 27 | No boundary rows for the crash-cancel test and the array-property row | low | reject | The fix edits this build's plan; both behaviours are recorded as triage rows 13 and 14. |
| 28 | Array non-index properties not stated as a plan decision | low | reject | The fix edits this build's plan; row 14 records it. |

## Design Notes

**`Dispatcher`** (Sergii, 2026-11-07: one injectable service per side). A plain class in `messaging` (no `di` import), constructed with the design kinds and registered by each side's module through `useFactory`; `Pipeline` and `ModelWorkerLifecycle` `inject(Dispatcher)`. It owns that side's design-seq gate (epoch, latest design seq). `send<M>(endpoint, message, transfer?)`: plain check, post; a sent design kind advances the latest to its seq. `listen<M>(endpoint, handlers)`: a message whose kind has no handler is dropped before the gate (so main, with no design handlers, never advances on a received post); then the gate: no epoch yet → adopt the epoch of the first `wholeKind` message (loop 1 decision), else another epoch is dropped; design kinds pass above latest and advance it, others at ≥ latest; `start()`; returns the stop call. `restart(epoch)`: sets the epoch, latest 0. Message types are named per call (`dispatcher.listen<ToModelWorker>(…)`), since a class token isn't generic per side.

Approved shape (Sergii, 2026-11-07):

```ts
export class Dispatcher {            // messaging/src/dispatcher/dispatcher.ts
  constructor({ designKinds, wholeKind }: DispatcherOptions) { … }
  send<M extends Stamped>(endpoint: Endpoint, message: M, transfer?: readonly Transferable[]): void
  listen<M extends Stamped>(endpoint: Endpoint, handlers: Handlers<M>): () => void
  restart(epoch: number): void
}
// pipelineModule and workersModule each:
container.register(Dispatcher).useFactory(() => new Dispatcher({ designKinds, wholeKind }))
// owners: readonly #dispatcher = inject(Dispatcher)
```

**`Pipeline.listen(endpoint)`.** Its dispatcher adopts the first `design` message's epoch and drops everything before it. `design` → writer `replace`, routing and fingerprints deep-frozen and held in `shallowRef`s; `patches` → writer `apply`; routing and fingerprints go through `design/worker`'s `deepFreeze` before they are held; after either, posts `issues { violations: [] }` and `derived-files { routing, fingerprints, revision }` at that message's epoch and seq; `focus` → held, nothing posted.

**`ModelWorkerLifecycle`.** Holds one current workspace: `start`'s argument sets it (`layout` when none), `focus` sets it and sends it when a worker runs. Every spawn sends `design` (whole, from `store.current`, at its seq) then `focus` (the held workspace). The epoch is 1 at the first spawn, +1 on each later one; each spawn calls `dispatcher.restart(epoch)`, and sending the whole bundle advances the latest.

**Decision (Sergii, 2026-11-07): `messaging`'s crossing is an injectable `Dispatcher`, one per side**, not free `send`/`listen` functions with a gate each owner builds with `new`, because AD-11 says "one dispatcher per side", `send` and `listen` are the crossing's I/O, not pure logic (AD-25: "Pure logic is plain functions"), and AGENTS.md says to substitute a boundary through `di`. It is a plain class, since `messaging` imports no workspace package (AD-10).

**Decision (plan): each side's module builds the `Dispatcher` with `useFactory(() => new Dispatcher({ designKinds, wholeKind }))`**, not a `configure()` call after resolution, because `di`'s `RegistrationBuilder` offers `useFactory` and a configure step leaves a half-built service in the container.

**Decision (plan): `listen` drops a kind with no handler before the gate**, not admitting it and throwing, so a received design kind on main can never move the latest (AD-11 "On main nothing received advances it") and an unknown kind is not a crash.

(Amended by Decision (Sergii, 2026-11-07, loop 1): only the `wholeKind` message adopts.) **Decision (plan): a gate with no epoch adopts the first design-kind message's epoch**, in `messaging`, not a wrapper in `pipeline`, so the whole gate rule lives and is tested where it is defined; main sets its epoch with `restart` before its first send, so adoption never fires there.

**Decision (plan): lifecycle edges.** While `failed`, commits send nothing, not queued, because `restart()` sends "the whole design value" (AD-11). `restart()` after `start` but before the first `Committed` leaves status `idle` and waits as `start` does, not spawn, because the first message must be the whole bundle (AD-11). The first `Committed` spawns and sends the current bundle once; its own `whole` event sends nothing more, not twice. A replaced worker is terminated and its listeners removed, so a late `error` from it counts no crash. A `NotPlainError` from `send` in the commit listener escapes `run` after the commit, as story 2's Decision says a throwing commit listener does.

**Decision (plan): `app` hands `workers` the spawn function as `start`'s argument** (`() => new Worker(new URL('./model.worker.ts', import.meta.url), { type: 'module' })`), not a token or an overridden class, because AD-10 says "pass the value as an argument from its caller (one hop only: from the composition root …) before adding a token", and AD-25's token table "is empty"; Vite bundles a worker only from that literal `new URL` in `app`.

**Decision (plan): the mirror follows the store is proven in `design` and `pipeline`, and the real entry in `app`**, not by one `app` spec reading the mirror, because AD-25 says "only it and `pipeline` import `design/worker`", which forbids an `app` spec from reading `DesignMirror`, and `design` owns both the store and the mirror. `design`'s spec runs a test command and hands the commit's patches through `structuredClone` to the writer; `pipeline`'s feeds messages over a port; `app`'s spawns the real `model.worker.ts` and records its posts as plain data (no `protocol` import: not a drawn edge).

**Decision (plan): the model-worker module list lives in `start-model-worker.ts`**, not a `model-worker-modules.ts` beside it, because only the entry is fenced as an owner of `design/worker` and nothing else needs the list.

**Decision (plan): `messaging`, `workers`, `pipeline` and `app` specs run in browser mode**, not on Node as the spine's Verification row says for non-DOM tests, because the ticket's verify line says "Tests in Chromium and Firefox" for these behaviours, and structured clone differs between engines (AD-11's `ref()` note); `protocol` has type-only specs.

**Decision (plan): epoch 1 at the first spawn**, not 0, following `design`'s seq, which starts at 1 (story 2's Decision "seq starts at 1").

**Decision (plan): flat stamped messages**, `{ kind, epoch, seq, …payload }`, not a `body` wrapper, because the spine writes payloads flat (`issues { seq, violations: Violation[] }`, `stage-started { stage, seq }`).

**Decision (plan): one `derived-files` message** holding both files, not one per file, because 23.5's hand-off is `acceptDerivedFiles(files, seq)` over both (ticket 23.5).

**Decision (plan): the worker's dispatcher adopts the first `design` message's epoch**, not an epoch passed at spawn, because "its first message is that whole bundle" (AD-11).

**Decision (plan): accepted `issues`, `stage-started` and `derived-files` reset the crash count and are otherwise dropped on main**, not held, because 23.5 adds holding issues and `acceptDerivedFiles` (ticket 23.5) and 23.8 the running stage.

**Decision (plan): the mirror's state lives in an unexported `MirrorState` service**, not on `DesignMirror` with a public setter, because "the mirror (read-only to everyone but its writer)" (AD-10) and package `exports` close the surface.

**Decision (plan): the writer freezes the received value in place**, not a copy, because AD-2 names "the same `deepFreeze` `replaceDesign` uses" and a structured-clone arrival has no other holder.

**Decision (plan): `worker: { format: 'es' }` in `app/vitest.config.ts`**, not Vite's default `iife` (vite.dev/config/worker-options: "`worker.format` … Default: `'iife'`"), because the start file awaits `autoLoad()` at top level, which an `iife` bundle can't hold, and the spawn passes `{ type: 'module' }`.

**Decision (plan): `NotPlainError` names the path dot-joined** (`a.0`), not bracketed, as `design`'s `formatIssuePaths` joins issue paths with `.`.

**Decision (plan): `derived-files`' `revision` is the design revision the worker was sent**, echoed beside the files, which keep their own tags unchanged, not the files re-tagged with it, because AD-11 says each derived file is posted "echoing the revision it was sent"; the order of `issues` and `derived-files` within one seq is not asserted.

**Decision (plan): `mainModules` registers `workersModule` now**, not in 23.7, so the main container already resolves it (story 3's plan: "`app`'s container is built from `mainModules`"); 23.7 adds the `start()` call.

**Decision (plan): plain means exactly AD-11's list**, plain objects (prototype `Object.prototype` or `null`), arrays, primitives other than symbols, typed arrays and `ArrayBuffer`, not everything structured clone accepts (`Map`, `Date`, `DataView`, `SharedArrayBuffer`), because AD-11 defines plain as exactly "plain objects, arrays, primitives, typed arrays and `ArrayBuffer`". A cycle is walked once, not refused, because structured clone carries it.

**Decision (plan): no builder for `DesignPatch`, `Violation` or `Fix`**, not one with a placeholder value or variant, because the Test builders row's builder "returns a valid value" that "parses through its schema": `DesignPatch` has no schema (Data Schema) and no `Violation` or `Fix` value can exist until a kind or variant is added. `aWorkspace` defaults to `layout` ("an unknown or missing one being `layout`", AD-13), `aStageId` to `parts`, the first stage in `stageIdSchema`.

**Decision (plan): no empty-`patches` row**, because the store emits no commit for a command with no patches (`design-store.ts`: `if (patches.length === 0) return Result.ok()`).

**Decision (plan): a test command in `design`'s mirror spec** sets `meta.name`, not a real command, because none is registered yet and AGENTS.md allows "a state real commands could reach".

## Conformance Log

Three readers (two conformance, one gap; Sonnet, context-free), then one final conformance pass. No finding dropped: every quoted plan line and rule was found.

- `` `app` … imports `editor`, `design`, `commands`, `workers`, `storage` and `schema` `` (`protocol` dep) -- fixed
- `` only it and `pipeline` import `design/worker` `` (`model-worker-modules.ts`, the in-app mirror spec) -- fixed
- `` the same `deepFreeze` `replaceDesign` uses `` ("caller's object not frozen") -- fixed
- `` Each closes its public surface through package `exports` `` / `` Make package entry files … only re-export `` (four stubs' exports, deps, `index.ts`) -- fixed
- `` The main thread uses Vue reactivity only for … stage status `` (status not reactive) -- fixed
- `` Give every threshold three rows … add empty input and an input that breaks an assumption `` (newer epoch, before first design, empty and cyclic values, apply before load, later whole design, out-of-order calls) -- fixed; out-of-order calls -- asked (Sergii: throw)
- `` Each schema concept ships a test builder `` (`fixSchema`, `DesignPatch`, `Violation`) -- fixed (decision)
- `` `DOM` only where code runs on the main thread and reads the page `` (`workers`) -- fixed
- `` everything else on Node `` (browser mode for non-DOM specs) -- fixed (decision citing the ticket's verify)
- `` When a decision departs from a Stack dependency's documented setup `` (`worker.format`) -- fixed
- `` A choice no requirement made is a decision `` (first epoch, path format, revision field, builder defaults) -- fixed
- `` No `if` or loop around `expect` `` / `` Test a rule where it is defined `` ("only plain crosses" row) -- fixed
- `` Name a thing for what it does, checked against the spine's glossary `` (`ModelWorkerHost`, `WorkerLike`, then `ModelWorkerRunner`) -- fixed (`ModelWorkerLifecycle`, `SpawnedWorker`)
- `` Give every decision its rejected alternative: "X, not Y, because Z" `` (frozen-block decisions, plain, revision, builders) -- fixed
- `` No AD-n or ticket references `` (precedent: `packages/editor/vitest.config.ts`, `.dependency-cruiser.mts`, root and `di` `vitest.config.ts`) -- fixed for new and touched lines; deferred (deferred-work.md)
- `` Keep no mutable state at module level in a spec `` (precedent: `tooling/ad10/rules.spec.ts`) -- deferred
- Final pass: `` the one TypeScript discriminated union `` -- fixed; Chromium/Firefox frozen mirror -- fixed; `app/vitest.config.ts` not in root `projects` -- fixed; browser-config plumbing (`tsconfig.node.json`, devDeps, `NODE_FILES`) -- fixed; `` test a runtime check with a value the types accept `` (builders take `string`) -- fixed; gate ownership -- fixed; lifecycle edges -- fixed (decision); `` Substitute through `di` `` / levels -- fixed; `` Test a rule where it is defined `` (pipeline gate rows) -- fixed; `` every design value is `Frozen<…>` `` (derived files) -- fixed; schema specs -- fixed; spine still names the stale reply -- deferred; `vite.config.ts` worker format -- fixed (dropped); fence comments -- fixed; quote -- fixed; precedent `design-store.spec.ts` `toBe` -- deferred
- gap: `app/src/model-worker-modules.ts`, `app/src/model-worker-mirror.spec.ts` -- fixed
- gap: `packages/{messaging,protocol,workers,pipeline}/package.json`, `src/index.ts`, `packages/schema/src/testing/index.ts` -- fixed
- gap: `editor`, `commands` readers of status -- fixed
- gap: `packages/schema/src/fix.ts` builder -- fixed

## Verification

**Commands:**
- `pnpm typecheck && pnpm check:fast` -- expected: passes, depcruise included.
- `pnpm test` -- expected: whole suite green in Node, Chromium and Firefox.

## Boundary Table

| Group | Boundary | Input | Expected | Level |
|-------|----------|-------|----------|-------|
| production bugs | mirror follows the store | a test command after `replaceDesign`, its patches `structuredClone`d to `apply` | mirror `toEqual` `store.current.design`, deeply frozen | unit (design) |
| production bugs | patches in order | two commands' patches applied in commit order | mirror equals the store after both | unit (design) |
| production bugs | real entry boots | real `model.worker.ts` via `start` after NewDesign | posts `{ kind: 'issues', epoch: 1, seq: 1, violations: [] }` | integration (app) |
| rules | gate: design kind below latest | latest 5, `patches` seq 4 | dropped | unit (messaging) |
| rules | gate: design kind on latest | latest 5, `patches` seq 5 | dropped | unit (messaging) |
| rules | gate: design kind above latest | latest 5, `patches` seq 6 | passes; latest 6 | unit (messaging) |
| rules | gate: other kind below latest | latest 5, `issues` seq 4 | dropped | unit (messaging) |
| rules | gate: other kind on latest | latest 5, `issues` seq 5 | passes; latest stays 5 | unit (messaging) |
| rules | gate: other kind above latest | latest 5, `issues` seq 6 | passes; latest stays 5 | unit (messaging) |
| rules | gate: older epoch | epoch 2, message epoch 1 seq 9 | dropped | unit (messaging) |
| rules | gate: newer epoch | epoch 2, message epoch 3 seq 9 | dropped | unit (messaging) |
| rules | gate: own send advances | `send` a `patches` at seq 7, then receive `issues` seq 6 | dropped | unit (messaging) |
| rules | no handler for a kind | receive `patches` seq 9 with handlers for `issues` only | dropped; latest unchanged (an `issues` at seq 1 still passes) | unit (messaging) |
| rules | epoch adoption | no `restart`; receive `issues` epoch 4, then `design` epoch 4 seq 1, then `issues` epoch 4 seq 1 | first dropped; `design` passes; `issues` passes | unit (messaging) |
| rules | epoch set before adoption | `restart(2)`; receive `design` epoch 3 seq 1 | dropped | unit (messaging) |
| module boundaries | one dispatcher per side | `pipelineModule`, `workersModule` | each container resolves the same `Dispatcher` instance twice | unit (pipeline, workers) |
| rules | plain: class instance | `{ a: [new (class X {})()] }` | throws naming `a.0` | unit (messaging) |
| rules | plain: refused kinds | `{ m: new Map() }`, `{ f() {} }`, `{ d: new DataView(new ArrayBuffer(1)) }`, `{ s: Symbol() }`, `{ b: new SharedArrayBuffer(1) }` | throws naming `m`, `f`, `d`, `s`, `b` | unit (messaging) |
| rules | plain: accepted values | nested frozen objects, arrays, `Uint8Array`, `ArrayBuffer`, `null`, `Object.create(null)` | posted, equal on arrival | unit (messaging) |
| rules | plain: empty values | `{}`, `[]`, `new ArrayBuffer(0)` | posted | unit (messaging) |
| rules | plain: a cycle | `const a = {}; a.self = a` | posted; arrival's `self` is itself | unit (messaging) |
| rules | transfer list | a 16-byte `ArrayBuffer` transferred | sender's `byteLength` 0, receiver's 16 | unit (messaging) |
| rules | port start | `Dispatcher.listen` on a fresh `MessagePort` | first message delivered | unit (messaging) |
| rules | mirror before load | `DesignMirror.value` unloaded | throws `InvariantError` | unit (design) |
| rules | mirror whole load | `replace(aDesign(), r)` | `value` equals it, deeply frozen, `revision` r | unit (design) |
| rules | apply before load | `apply(patches, r)` unloaded | throws `InvariantError` | unit (design) |
| rules | mirror patch | `apply([{ op: 'replace', path: ['meta','name'], value: 'B' }], r2)` | `value.meta.name` `B`, deeply frozen, `revision` r2 | unit (design) |
| rules | worker applies | `design` (epoch 1, seq 1), then `patches` seq 2 | `DesignMirror.value` equals the patched design, deeply frozen (Chromium, Firefox) | integration (pipeline) |
| rules | worker echo | the two messages above | posts `issues` and `derived-files` at seq 1, then at seq 2, epoch 1, revision as sent | integration (pipeline) |
| rules | a later whole design | `design` seq 3 after `design` seq 1 | mirror replaced by the new design; posts at seq 3 | integration (pipeline) |
| glue | worker drops what its gate drops | `patches` seq 1 after `design` seq 1 | not applied, nothing posted (the gate's rules are `messaging`'s rows) | integration (pipeline) |
| rules | before the first design | `patches` epoch 1 seq 2, no `design` yet | not applied, nothing posted | integration (pipeline) |
| rules | focus posts nothing | `focus` at seq 1 | no post | integration (pipeline) |
| module boundaries | spawn waits | `start(spawn)` with no `Committed` | `spawn` not called; status `idle` | integration (workers) |
| module boundaries | first message | first `Committed` after `start` | one spawn; `design` (whole, seq 1, epoch 1) then `focus`; status `running` | integration (workers) |
| module boundaries | spawn now | `start` with a `Committed` held | spawns at once; `design` then `focus` | integration (workers) |
| module boundaries | focus default | `start(spawn)` | `focus { workspace: 'layout' }` | integration (workers) |
| module boundaries | focus given | `start(spawn, 'pcb')` | `focus { workspace: 'pcb' }` | integration (workers) |
| module boundaries | focus switch | `focus('case')` after spawn | `focus { workspace: 'case' }` at the current seq | integration (workers) |
| module boundaries | restart keeps focus | `focus('case')`, then a crash | the new worker gets `focus { workspace: 'case' }` | integration (workers) |
| module boundaries | patches forwarded | a commit after spawn | `patches` at the commit's seq, current epoch | integration (workers) |
| module boundaries | whole on replace | `replaceDesign` after spawn | `design` from the event's `Committed` | integration (workers) |
| module boundaries | crash restarts | 1 crash | 2nd spawn; `design` (whole, current seq) with epoch 2, then `focus` | integration (workers) |
| module boundaries | messageerror is a crash | `messageerror` on the worker | restarts as a crash | integration (workers) |
| module boundaries | below the cap | 2 consecutive crashes | 3 spawns; status `running` | integration (workers) |
| module boundaries | on the cap | 3 consecutive crashes | 3 spawns, no 4th; status `failed` | integration (workers) |
| module boundaries | post resets | crash, accepted `issues`, crash, crash | 4 spawns; status `running` | integration (workers) |
| module boundaries | stale post doesn't reset | crash, crash, `issues` at seq − 1, crash | status `failed` | integration (workers) |
| module boundaries | other-epoch post doesn't reset | crash, crash, `issues` from epoch 1, crash | status `failed` | integration (workers) |
| module boundaries | stage-started gated | crash, crash, `stage-started` at seq − 1 / at seq, crash | `failed` / `running` | integration (workers) |
| module boundaries | asked restart while failed | `restart()` | status `running`; spawn with the next epoch, the whole bundle and `focus` | integration (workers) |
| module boundaries | restart before start | `restart()` with no `start` | throws `InvariantError` | integration (workers) |
| module boundaries | second start | `start` twice | the second throws `InvariantError` | integration (workers) |
| module boundaries | focus before start | `focus('case')`, then `start(spawn)` | spawn sends `focus { workspace: 'layout' }` | integration (workers) |
| module boundaries | asked restart while running | `restart()` | old worker terminated; spawn with the next epoch; crash count 0 | integration (workers) |
| module boundaries | protocol kinds | `ModelWorkerMessage` fields | `patches` is `DesignPatch[]`, `workspace` `Workspace`, `stage` `StageId`, from `schema` | type (protocol) |
| module boundaries | issues empty only | `issues` with `violations: []` / one violation-shaped object | accepted / refused | type (protocol) |
| module boundaries | stage outside StageId | `stage-started` with `'routing'` | refused | type (protocol) |
| rules | workspace slugs | `workspaceSchema`'s options; `'bogus'` | `['layout','outline','pcb','case','firmware']` in that order; refused | unit (schema) |
| rules | stage ids | `stageIdSchema`'s options; `'routing'` | `['parts','layout','shapes','extras','plates','pcb','firmware']`; refused | unit (schema) |
| rules | no fix yet | `fixSchema` given `{ command: 'x', input: {} }` | refused | unit (schema) |
| module boundaries | builders | `aWorkspace()`, `aWorkspace('pcb')`, `aWorkspace('bogus')`; `aStageId()`, `aStageId('plates')`, `aStageId('routing')` | `layout`, `pcb`, throws; `parts`, `plates`, throws | unit (schema) |
| glue | start file fence | `start-model-worker.ts` imports `model/worker`, `design/worker`, `library/worker` | allowed; `autosave.ts` still refused | unit (tooling) |
| glue | main never reaches pipeline | `pnpm depcruise` over the real `app/src`, `workersModule` now in `mainModules` | no violation; fixture `boot.ts` still fires in `rules.spec.ts` | check (depcruise) + unit (tooling) |
