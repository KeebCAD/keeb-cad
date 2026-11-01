# Review: blueprints spine, verification lens (2026-11-01)

Reviewed: `architecture-blueprints.md` as it stands in the working tree on 2026-11-01 (uncommitted edits included). The spine was not edited.

Lens: was each committed decision web-researched or reality-checked, or only asserted? Checked against the calls verdict (`blueprint-calls-verdict-2026-11-01.md`), the two spike branches, the npm registry, the GitHub repository, the published 3.6.3 package source, and two probe scripts run against that package.

**Verdict: the engine choice and the calls/JSON rules hold up, but BP-4's runaway guarantee is false for native built-ins and memory. The spine also leaves out three runtime settings the evidence depends on (a stack limit, a memory limit, and the internal pending-job call), so an implementer reading only the spine would build a sandbox the spikes never tested.**

## How each fact was checked

| Fact the spine relies on | Where | How checked | Result |
|---|---|---|---|
| quickjs-wasi 3.6.3 is current, MIT | BP-2, initiative spine Stack | `npm view quickjs-wasi version license dist-tags time versions` (2026-11-01); `npm pack quickjs-wasi@3.6.3`, read `LICENSE`, `package.json`; `gh api repos/vercel-labs/quickjs-wasi` | Holds. `latest` = 3.6.3 (published 2026-10-19), MIT (Vercel, Inc.). Lockfile integrity `sha512-gDXhV2…` matches the registry. 25 releases since 2026-03-06, majors 1, 2 and 3, so the initiative spine's "25 releases and 3 majors in its first 8 months" is correct. Repo not archived, last push 2026-10-19, 153 stars, 2 npm maintainers. It bundles QuickJS-NG v0.17.0 (commit #53); QuickJS-NG v0.18.0 came out today. |
| quickjs-emscripten upstream is stale (the reason it lost) | memlog | `npm view quickjs-emscripten-core version time.modified` | Holds: 0.32.0 (2026-02-16) is still the latest. |
| VM creation is asynchronous; calls are synchronous | BP-1, BP-2 | `dist/index.d.ts`: `static create(...): Promise<QuickJS>`; `evalCode` and `callFunction` return handles synchronously. Probe: `QuickJS.create()` returns a Promise. | Holds. |
| How host functions are exposed | BP-1 | `index.js` `handleHostCall`; README; calls spike `sandbox-wasi.ts` | `vm.newFunction(name, cb)`, with a callback name that must be unique per VM. The returned handle is duplicated (`qjs_dup_value`), so the host must free its own copy (the spike uses `withScope`). A thrown host value becomes `newError(...)` in the guest. Matches the verdict. |
| Results as one JSON string, not the object API | BP-1 | Verdict tables, repeat run | Measured: `pads(6)` takes 117 µs native vs 23 µs JSON in Chromium. Holds. |
| Step budget = interrupt-handler calls; ±1 drift | BP-4 | Spike 16 verdict ("Findings for story 17"); probe 1 | The ±1 drift holds (spike 16). The handler fires about **once per ~5,000 loop iterations** (1e5 iterations = 20 calls, 1e6 = 200; 1e5 function calls = 30), not "approximately once per bytecode instruction" as the package's README and `d.ts` say. `while(true){}` stops at 101 calls. **Native built-ins are not counted:** see F1. |
| Stack limit | not in the spine | `index.js`: `maxStackSize` option, `MAX_STACK_SIZE = 512 KiB`; spike hosts pass 256 KiB; probe | Works: recursion is a catchable `RangeError` at 256 and 512 KiB. Spike 16 found that without a limit, Chromium's native stack overflows first and the WASM module aborts. **The spine never states it:** see F2. |
| Date, performance, WeakRef, FinalizationRegistry can be left out | BP-3 | `d.ts` `Intrinsics`: `DATE`=1, `PERFORMANCE`=1024, `WEAK_REF`=512 ("WeakRef and FinalizationRegistry"); probe | Holds: all are `undefined` with the spike's intrinsic mask. Also absent: `setTimeout`, `fetch`, `console`, `DOMException`, `atob`, `URL`, `TextEncoder`, `crypto`, `structuredClone`. **`queueMicrotask` is present** (`function`); the spine's list does not mention it. It is a job source, so the pending-job check catches it. |
| `Math.random` removed | BP-3 | Spike `BOUNDARY` (`delete Math.random`); README (PRNG seeded from the WASI clock at context creation) | Holds. The spike also fixes the WASI `clock_time_get`/`random_get`; the spine does not record that (F5). |
| Pending-job detection | BP-2, BP-3 | `sandbox-wasi.ts`: `vm._getExports().qjs_is_job_pending()`; `d.ts` marks `_getExports` `@internal`; `index.js` `executePendingJobs` loops on the same export; probe | Works in 3.6.3 (returns 1 after `Promise.resolve().then(...)`), but **it uses an internal API, and the spine doesn't say so** (F3). |
| Host errors: message only, no host stack | BP-3 | `index.js` `newError`: copies `.stack` from a host `Error`; the library's own comment in `handleHostCall` warns of the same leak; probe | Confirmed in 3.6.3: the guest's `e.stack` contains host paths when the host throws an `Error`. The spine's rule (throw message strings) is right. |
| Override taming of `Error.prototype.message`/`name` | BP-3 | `index.js` `newError` → `setProp` → `qjs_set_prop_string` (an assignment) | Confirmed: the assignment would fail silently against a frozen prototype. The taming is needed. |
| Guest errors crossing to the host | BP-3, Conventions | `index.js` `JSException` constructor; probe | Not covered by the spine. The constructor eagerly reads the thrown value's `message`, `name` and `stack` (and calls `toString`). A thrown object with getters ran 2 guest getters during that host-side read (F4). |
| VM replaced after a trap or pending job "in the next pause" | BP-2 | Calls verdict, "What this spike does not show" | **Not tested.** The verdict says the calls hosts "report a pending job but do not rebuild, and quickjs-wasi has no spare VM" (F3). |
| Nesting (`use()`) in the caller's VM | BP-6 | Spike branches | Not built or tested in either spike. It is a design rule; Conventions lists a property test for it, which is fine for a draft. |
| 100 ms visible set; timings | inherited AD-11, Deferred | Verdict | Measured on battery, and the spine already defers AC numbers. A 50-key command takes 3.6–4.3 ms in the worker. |

## Findings

### F1 (high): BP-4 promises that "a runaway stops at the budget"; native built-ins and memory escape it

- **Location:** BP-4 (lines 81–87), and Conventions › Verification ("a runaway stops at the budget"). Also BP-3 and BP-2, which have no memory limit.
- **Problem:** The interrupt handler is polled only from the bytecode loop. A single native built-in call runs to completion without reaching it. Nothing bounds a VM's memory either, and a WASM memory never shrinks.
- **Evidence:** Probe 2 on the published 3.6.3 package, Node 26.12.1, each case in a fresh VM with a budget of 100:
  - `'x'.repeat(1e7).split('')`: 1 handler call, 1.6 s, memory 1.31 → 487 MiB.
  - `'x'.repeat(2**28)`: 1 call, 1.4 s, 257 MiB.
  - `while(true) a.push(new Float64Array(1<<20))`: 1 call, 1.5 s. The VM's memory reached 4,089 MiB, then the library threw a host `RangeError` ("Start offset -275364264…", a signed-pointer bug past 2 GiB), not a typed failure.
  - The same loop with `memoryLimit: 64 MiB`: a typed `InternalError: out of memory` in 8 ms.
  - Upstream: open PR #58 (2026-10-30) reports that 3.6.3's host data conversion can silently return an exception sentinel as an ordinary handle under `memoryLimit`, for example a string becoming `""`. PRs #59–#61 are related OOM fixes and none is merged yet.
- **Suggested fix:**
  - Narrow BP-4: the step budget bounds bytecode execution only. Native built-ins and allocation are bounded by a per-VM memory limit.
  - Add a rule: every VM is created with `memoryLimit` set, and an OOM is a typed `lane-failed` cause. Re-measure the 1.44 MiB per-VM figure with the limit set.
  - Drop and replace a VM whose linear memory grew past a threshold, because it never shrinks.
  - Make the host-call wrapper treat an empty or unparsable JSON result as a failure, never as data. JSON.parse of `""` already throws, so keep the result decode strict.
  - State that milestone 1 accepts the native-built-in time gap, as it accepts the host-work gap, because blueprints are the app's own.

### F2 (medium): the stack limit is load-bearing but absent from the spine

- **Location:** BP-2 and BP-3 (lines 62–79). The spine says nothing about the stack.
- **Problem:** Both spikes set a 256 KiB QuickJS stack limit. Spike 16 found that without one, recursion in Chromium overflows the browser's native stack before QuickJS checks it, and the WASM module aborts. The verification table cannot be reproduced from the spine alone.
- **Evidence:** `sandbox-verdict.md` › "Set a max stack size". `boundary.ts` `MAX_STACK_BYTES = 256 * 1024`. quickjs-wasi's option is `maxStackSize` at `create()`, not `setMaxStackSize` (that is quickjs-emscripten's API), with a maximum of `MAX_STACK_SIZE = 512 KiB`. The probe shows both 256 and 512 KiB give a typed `RangeError`.
- **Suggested fix:** Add one BP-3 bullet: every VM is created with `maxStackSize` (256 KiB, as in the spikes), and a stack overflow is a typed `lane-failed` cause. Add "unbounded recursion fails typed" to Conventions › Verification.

### F3 (medium): pending-job handling rests on an internal API and an untested recovery path, and BP-5 can cache a history-dependent failure

- **Location:** BP-2 (line 68) "A VM dropped after a trap or a pending job is replaced in the next pause"; BP-3 (line 79); BP-5 (line 93).
- **Problem:**
  1. Detection uses `vm._getExports().qjs_is_job_pending()`, which `d.ts` marks `@internal`. A minor release could rename it, and the spine doesn't flag this.
  2. In the calls design, dropping and replacing a VM was never exercised. The calls verdict says its hosts "report a pending job but do not rebuild, and quickjs-wasi has no spare VM", and the spare VM that spike 16 tested was removed. A replacement VM can only be created asynchronously, so later lanes of the same blueprint version in the same stage run have no VM, and the spine doesn't say what they return.
  3. If they fail, BP-5 caches that failure under their cache key. Their failure depends on call history (an earlier lane's job), not on their own inputs, so they stay stale until their inputs change. That breaks "failures are deterministic, so cache them".
- **Evidence:** `d.ts` line 925–926 (`/** @internal */ _getExports()`). `index.js` `executePendingJobs` uses the same export, so it is unlikely to vanish quietly. The verdict, "What this spike does not show", spike 16 recovery bullet.
- **Suggested fix:**
  - Record the internal call in BP-3 and add a contract test that runs on every quickjs-wasi bump. Optionally ask upstream for a public `hasPendingJobs()`.
  - Say what lanes return while their VM is being replaced, either a non-cached `unavailable` that reruns after the pause, or a spare VM as in spike 16.
  - Exempt that outcome from BP-5's cache.
  - Check whether dropping the VM is needed at all: the instance's state is frozen or per-run, so draining or discarding the job queue may be enough. That needs a quick probe.

### F4 (low): the guest-to-host error path runs guest code during the host-side read

- **Location:** BP-3 (line 77); Conventions › Failure kinds ("`blueprint` carries the author's message").
- **Problem:** The spine covers host-to-guest errors only. On the reverse path, quickjs-wasi's `JSException` constructor reads `message`, `name` and `stack` with `getProp`, and falls back to `toString()`. A thrown object with getters, or a Proxy (the `PROXY` intrinsic is enabled), runs guest code at that point. That code is still under the interrupt handler, but outside the boundary's control. The author's "message" can then be any string the guest computes, of any length.
- **Evidence:** `dist/index.js` `class JSException` constructor. Probe 1: two getters ran (`hits = 2`) when the host caught `throw { get message(){…}, get name(){…} }`.
- **Suggested fix:** The boundary catches every throw inside the guest and returns a tagged failure carrying `String(message)` cut to a fixed length, using captured intrinsics. The host then never builds a `JSException` from a raw guest value for blueprint throws. Add it to the property tests.

### F5 (low): small gaps in recorded facts

- **BP-3's absent list** leaves out `DOMException` and `atob`/`btoa` (the spikes remove them as well) and doesn't mention that `queueMicrotask` stays present (probe 1).
- **The fixed WASI clock and random source** (`clock_time_get` → 0, `random_get` → zeros) are part of the spikes' determinism, but not of the spine. With `Date` and `performance` removed and `Math.random` deleted, nothing reachable reads them, so this is defence in depth. Record it as a one-line rule anyway.
- **The step budget's number (100 calls) and its scale** (about 5×10⁵ loop iterations, 1.6–3 ms per runaway) appear only in the spikes. BP-4 should state them or point to them, and correct the README's "once per bytecode instruction" for whoever writes story 17.
- **Licence notice:** the package's `LICENSE` names only Vercel. The shipped `quickjs.wasm` contains QuickJS-NG (MIT, its own copyright holders) and wasi-libc. The app's third-party notices must carry those separately.
- **Upstream moved today:** QuickJS-NG v0.18.0 (2026-11-01) is not in quickjs-wasi 3.6.3, which bundles v0.17.0. The exact pin covers it. Note it for the first bump.

## What holds without change

- The engine choice is backed by measurement, and the version and licence are current as of today.
- The calls model's synchronous execution is confirmed in the package source.
- One JSON string per result is backed by measurement.
- The ±1 step drift, the frozen lockdown with its override taming, and the message-only host errors are reproduced in the 3.6.3 source and probes.
- The intrinsic removal for `Date`, `performance`, `WeakRef` and `FinalizationRegistry` is confirmed.

## Probe scripts

These were run outside the repo against `npm pack quickjs-wasi@3.6.3` (Node 26.12.1). They are not kept in the repo; they live in the session scratchpad as `probe/probe.mjs` (globals, interrupt frequency, runaway, recursion, pending job, host stack leak, guest getters) and `probe/probe2.mjs` (native built-in time and memory, allocation runaway with and without `memoryLimit`, stack limit). Rerun them before acting on F1 in the browser worker, because the numbers come from Node, not Chromium or Firefox.
