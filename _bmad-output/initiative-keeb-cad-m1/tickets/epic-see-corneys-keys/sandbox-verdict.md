---
title: 'Sandbox verdict'
epic: epic-see-corneys-keys
stories: ['16']
date: '2026-11-01'
status: 'final'
---

# Sandbox verdict

**Recommendation: pass, on quickjs-emscripten; the runtime pick over quickjs-wasi is close.**
The runtime is **QuickJS through quickjs-emscripten 0.32.0** (`quickjs-emscripten-core` with
the `@jitl/quickjs-wasmfile-release-sync` variant, QuickJS 2025-09-13 in WASM; MIT). Loop 3
timed it against **quickjs-wasi 3.6.3** (Vercel Labs, QuickJS-NG 0.17.0 in WASM; MIT), each as a
warm reset host built the same way, on the same tests and bench. Both show AD-18's three
properties and answer synchronously on the main thread, at the same speed. quickjs-emscripten
is picked because it sets a blueprint up synchronously, where quickjs-wasi creates each VM
asynchronously, which in this spike's quickjs-wasi host makes the same input fail in one
timing case (see "quickjs-emscripten against quickjs-wasi"). It also ships 121.1 KiB less raw
(50.2 KiB less gzip). quickjs-wasi stays the fallback.

The number comes from the **warm host**: one context per blueprint, frozen once, and a fresh
instance of the blueprint for each call, so no state survives between calls. On the
worst-case drag, all 50 of Corney's slots re-run their part blueprint on every frame with a
changed input. The warm host takes a median of **1.055 ms** per frame in Chromium and
**1.14 ms** in Firefox, against a 16.7 ms frame. The max is **1.715 ms** and **9.54 ms**, and
no frame of 300 goes over in either browser. Per call, the median is 0.015 ms in Chromium.
Firefox's timer can't resolve one call: its median is 0.02 ms, one timer step, and the frame
median over 50 calls is 0.0228 ms. The quickjs-wasi host takes 0.93 and 1.08 ms at the median
and 2.075 and 2.2 ms at the max. Why Firefox's warm max is slow is not settled (see
"Latency").

The warm host is the fastest quickjs-emscripten host that passes the stateful-blueprint tests,
so per the plan its numbers are the verdict's. The fresh-context host passes the same tests
and is timed beside it for comparison: 12.105 ms (Chromium) and 12.72 ms (Firefox) per frame at
the median, with 5 and 21 of 300 frames over. Creating a context and evaluating the boundary in
it on every call costs about 0.2 ms per call. The warm host pays its set-up once per blueprint:
about 2 ms warmed, most of it the lockdown.

The step budget counts interrupt-handler calls, not time. QuickJS and QuickJS-NG both call the
handler from their bytecode loop, so a runaway `while (true) {}` stops synchronously, with a
typed failure, after 1.62–3.09 ms across the hosts and runaways timed. That holds even when the
blueprint catches the interrupt. On the warm and quickjs-wasi hosts the count can differ by one
call with call history (see "Findings for story 17"). SES is rejected because it can't stop a
synchronous loop. JS-Interpreter is rejected because it runs ES5 only and about 200× slower
than native. Sval is rejected because it has no step budget.

Evidence lives on branch `archive/spike-13-16-sandbox` (commit `b55b493011c7c9ba2ca1e514f22666b9b2966a45`), not on main; every `spikes/` path below is on that branch. Evidence: `spikes/README.md`, sections "Candidates (web check, 2026-11-01)", "Loop 3 re-check
of the two QuickJS runtimes" and "Result". Tests: `spikes/src/sandbox.test.ts` and
`spikes/src/drag.bench.test.ts`. Every number below is from run
`24ea8cb5-54e6-4550-87e4-2295b2f3609b`, committed in `spikes/results/verdict/`, except loop
1's shared-context numbers, which are marked. The run's files are `run.json`, then
`timings-chromium.json` and `timings-firefox.json` with every frame, then
`properties-chromium.json` and `properties-firefox.json` with the numbers the tests measured,
then `bundle.json` and `report.txt`. `node spikes/scripts/report.mjs results/verdict`, run from
`spikes/`, prints them from those files alone. A re-run writes only to the gitignored
`spikes/results/latest/`. `pnpm --dir spikes verify` exits 0. Loop 2's run (`fa8b16b9…`, two
hosts) is in the git history.

## Runtime

Versions and licences were read on 2026-11-01.

- **quickjs-emscripten (picked).** The registry pages are
  `https://registry.npmjs.org/quickjs-emscripten-core` and
  `https://registry.npmjs.org/@jitl/quickjs-wasmfile-release-sync`, both 0.32.0, released
  2026-02-16, licence MIT, still the latest. The repository is
  `https://github.com/justjake/quickjs-emscripten`, with an MIT `LICENSE`; its last push was
  2026-07-23 and it is not archived. The vendored QuickJS version is in the variant's README,
  "Version 2025-09-13+f1139494 vendored to quickjs-emscripten on 2026-02-15".
  `quickjs-emscripten-core` had 5 490 209 downloads in the week 2026-10-23 to 2026-10-29
  (`https://api.npmjs.org/downloads/point/last-week/quickjs-emscripten-core`).
- **quickjs-wasi (timed, not picked).** `https://registry.npmjs.org/quickjs-wasi`: 3.6.3,
  released 2026-10-19, licence MIT, the latest of 25 versions since 2026-03-06. The repository
  is `https://github.com/vercel-labs/quickjs-wasi` (API `license.spdx_id` MIT; last push
  2026-10-19; not archived; GitHub release `quickjs-wasi@3.6.3` on 2026-10-19). It vendors
  QuickJS-NG 0.17.0 (`vm.versions` at run time), released 2026-09-18; QuickJS-NG is MIT
  (`https://api.github.com/repos/quickjs-ng/quickjs`) and released v0.18.0 on 2026-11-01. It
  had 11 371 237 downloads in the same week
  (`https://api.npmjs.org/downloads/point/last-week/quickjs-wasi`).

The other candidates' versions, licences and sources are in the README table.

## The three hosts

All three share one boundary (`spikes/src/boundary.ts`): code evaluated in the context before
any blueprint code. The boundary captures the built-ins it uses and deletes `Math.random`. It
checks the result and serialises it as JSON in one walk. Every host uses the interrupt handler
as the step budget (100 calls) and a 256 KiB max stack size. On every host, a value JSON can't
carry exactly is a typed `not-plain` failure. A promise job left queued after a call is a typed
`pending-job` failure, and the host drops the runtime holding it. A malformed answer from the
boundary is a typed `boundary` failure. The boundary and the lockdown run unchanged on both
engines.

- **Warm (quickjs-emscripten; the verdict's host).** One runtime and one context per
  blueprint, set up once. First the boundary. Then a lockdown freezes every intrinsic and
  global it can reach and makes the global object non-extensible. It starts from `globalThis`
  and from the intrinsics only syntax reaches, as SES's lockdown lists them. Then the
  blueprint's source is compiled once, in strict mode, through the `Function` constructor into
  a factory, apart from the boundary. Each call runs the factory for a fresh blueprint
  instance.
- **Wasi (quickjs-wasi; loop 3).** The same set-up in one quickjs-wasi VM per blueprint. A VM is
  one WebAssembly instance, with its own memory, runtime and context, and creating one is
  asynchronous. So the host keeps a spare VM: when it drops a VM (a pending job, or a WASM
  trap), it switches to the spare inside the call and creates the next spare in the background.
  If it drops a second VM before that spare exists, calls fail typed (`unavailable`) until it
  is ready. Date, `performance`, WeakRef, FinalizationRegistry, DOMException and atob/btoa are
  left out of its intrinsics, and its WASI clock and random source are fixed.
- **Fresh (quickjs-emscripten; for comparison).** One runtime per blueprint. Every call gets a
  new context with the same boundary and factory, and the context is disposed after the call.
  There is no lockdown: any state dies with the context.

## Latency

Each frame makes 50 calls inside `requestAnimationFrame` on the main thread: 60 warm-up frames,
then 300 timed frames. The `pitch` input changes every frame. Marshalling (JSON in, JSON out)
and the JSON-exact check are inside the timed region. The per-call numbers come from a second
pass of the same drag, which times each of the 15 000 calls on its own. Both pages were
cross-origin isolated, so the timer step was 0.005 ms in Chromium and 0.02 ms in Firefox. The
browsers were headless Chromium 156 and Firefox 157, from Playwright 1.64.1, run one at a time
on 2026-11-01, with the hosts one after another in each page (warm, fresh, wasi). The machine
had 16 cores and a load average of 2.75 at the start of the run.

| | Chromium | Firefox |
|---|---|---|
| **Warm host, per frame: median** | **1.055 ms** | **1.14 ms** |
| Warm host, per frame: p95 | 1.37 ms | 1.64 ms |
| **Warm host, per frame: max** | **1.715 ms** | **9.54 ms** (timed frame 189) |
| Warm host, frames over 16.667 ms (of 300) | 0 | 0 |
| Warm host, per call: median | 0.015 ms (3 timer steps) | 0.02 ms (1 timer step: quantised, not resolved; the frame median / 50 is 0.0228 ms) |
| Wasi host, per frame: median / p95 / max | 0.93 / 1.425 / 2.075 ms | 1.08 / 1.64 / 2.2 ms |
| Wasi host, frames over 16.667 ms (of 300) | 0 | 0 |
| Wasi host, per call: median | 0.015 ms (3 timer steps) | 0.02 ms (1 timer step: quantised; the frame median / 50 is 0.0216 ms) |
| Fresh host, per frame: median / p95 / max | 12.105 / 14.46 / 22.645 ms | 12.72 / 18.72 / 26.3 ms |
| Fresh host, frames over 16.667 ms (of 300) | 5 | 21 |
| Fresh host, per call: median | 0.225 ms | 0.24 ms |
| Floor: the same function in plain JS, 50 calls per frame (run 1000 times per frame, divided by 1000): median / max | 0.001325 / 0.002575 ms | 0.00146 / 0.00606 ms |
| Cold start of the warm host: module load / set-up / first call | 13.395 / 10.925 / 0.67 ms (24.99 total) | 22.52 / 4.12 / 0.12 ms (26.76 total) |
| Cold start of the wasi host: `.wasm` fetch and compile / host create (two VMs and the set-up) / first call | 4.205 / 14.72 / 0.925 ms (19.85 total) | 7.28 / 5.76 / 0.12 ms (13.16 total) |
| Frame budget (60 Hz) | 16.667 ms | 16.667 ms |

**Firefox's slow warm frame: what was shown.** In this run, the warm host's Firefox max is
9.54 ms at timed frame 189. A slow frame at timed frame 189–190 (190 in loop 1) has appeared in
every run that timed the quickjs-emscripten warm host first in the page. In two Firefox bench
runs made with the order reversed (wasi first, then fresh, then warm), no frame of either host
went over 2.2 ms. Those runs were not kept, so this is unverified. They also do not separate
the two explanations: the slow frame may belong to the page's first drag, or to the first heavy
use of quickjs-emscripten in the page. The wasi host has not shown it, but it has never run
first in a kept run either.

Where one call's time goes, measured on runtimes and VMs configured as the hosts' (stack limit
and interrupt handler). Calls are averaged over 1000 iterations and wasi VMs over 100. Both
set-up rows include creating the blueprint's runtime or VM, as each host does (Chromium /
Firefox):

| | Chromium / Firefox |
|---|---|
| Fresh: create and dispose a context | 0.0735 / 0.0938 ms |
| Fresh: also evaluate the boundary (2693 characters) | 0.1967 / 0.2197 ms |
| Fresh: also load the blueprint into a factory | 0.227 / 0.259 ms |
| Fresh: the whole call | 0.2297 / 0.2565 ms |
| Warm: create a runtime (synchronous) | 0.0084 / 0.0087 ms |
| Warm: set-up once per blueprint, its runtime included, warmed | 1.9716 / 2.0222 ms (in an existing runtime 1.9623 / 1.9655 ms, of which the lockdown 1.7353 / 1.7065 ms; cold, the first time: 10.925 / 4.12 ms, in the table above) |
| Warm: one call of the minimal blueprint | 0.0075 / 0.0081 ms |
| Warm: one call of a blueprint that returns `null` (the boundary and marshalling alone) | 0.0022 / 0.0026 ms |
| Wasi: create a VM (asynchronous) | 0.437 / 0.3872 ms |
| Wasi: set-up in it, once per blueprint (synchronous) | 2.3483 / 2.6308 ms, of which the lockdown 2.104 / 2.3832 ms; with the VM's creation 2.7853 / 3.018 ms |
| Wasi: one call of the minimal blueprint | 0.0149 / 0.0086 ms |
| Wasi: one call of a blueprint that returns `null` | 0.0023 / 0.0027 ms |

The wasi call breakdown in Chromium (0.0149 ms) is twice its Firefox figure and the warm host's.
The drag itself shows no such gap (per call median 0.015 ms on both hosts), so it is likely
noise in that one measurement.

**Loop 1's shared context, for reference only (not deterministic).** Loop 1 timed a host that
kept one warm context and loaded the blueprint once, with nothing frozen. In that host a
top-level `let` or a `globalThis` write survived between calls. It took a median of 0.755 ms
(Chromium) and 0.72 ms (Firefox) per frame, and a max of 1.18 and 9.9 ms (Firefox's at timed
frame 190). These numbers are quoted from the plan's change log and are not in
`results/verdict/`. The warm host costs 0.30–0.42 ms more per frame at the median. That is the
price of a fresh blueprint instance and a frozen realm.

## quickjs-emscripten against quickjs-wasi

| | quickjs-emscripten (warm host) | quickjs-wasi (wasi host) |
|---|---|---|
| Per frame, 50 calls: median (Chromium / Firefox) | 1.055 / 1.14 ms | 0.93 / 1.08 ms |
| Per frame: max | 1.715 / 9.54 ms (Firefox: see "Latency") | 2.075 / 2.2 ms |
| Per call, median (drag) | 0.015 / 0.02 ms | 0.015 / 0.02 ms |
| Steps for 10⁵ loop iterations | 20 | 20 |
| Step count after call history | ±1 (the seven histories: 20, and 21 once; the sweep: 20 or 21) | ±1 (the seven histories: 20 every time; the sweep: 20 or 21). Not exact: its README's "once per JS bytecode instruction" does not hold |
| Same input, same output | always | not always: after two dropped VMs in one task, the next calls fail `unavailable` until the spare is ready, so the outcome of a call depends on timing |
| AD-18's property tests | pass, both browsers | pass, both browsers |
| Setting a blueprint up | synchronous: runtime and set-up 1.9716 / 2.0222 ms | a VM created asynchronously (0.437 / 0.3872 ms), then 2.3483 / 2.6308 ms synchronous |
| After a pending job or a trap | sets the blueprint up again inside the call | switches to a spare VM inside the call; a second drop before the next spare is ready leaves calls failing (`unavailable`) |
| QuickJS memory used per set-up blueprint | 146.1 KiB | 130.4 KiB |
| WASM memory reserved per blueprint | none of its own: the one module memory every runtime shares | 1472.0 KiB per VM (its own linear memory, which includes the binary's 1 MiB stack), and the host keeps a spare VM |
| A WASM trap | kills the one module every blueprint's runtime lives in (seen in loop 1, without a max stack) | kills only that blueprint's VM (by design; not triggered here) |
| Cold start (Chromium / Firefox) | 24.99 / 26.76 ms | 19.85 / 13.16 ms |
| Bundle, raw / gzip | 549.3 / 245.8 KiB | 670.4 / 296.0 KiB |
| Engine | QuickJS 2025-09-13 | QuickJS-NG 0.17.0 (one month after its release) |
| Maturity | first release 2020; 0.32.0 is 8.5 months old; repository last pushed 2026-07-23; 5 490 209 downloads of `quickjs-emscripten-core` in the week to 2026-10-29 | first release 2026-03-06; 25 versions and three majors in eight months; 146 of 172 commits by one author; 11 371 237 downloads in the same week |

**Why quickjs-emscripten, and how close it is.** Speed is a tie: quickjs-wasi is a little
faster at the median (0.93 / 1.08 against 1.055 / 1.14 ms per frame), and per call the two are
the same at the timers' resolution. Step-count determinism is a tie (±1 on both). What was
measured against quickjs-wasi is its set-up: every blueprint needs a VM, and a VM can only be
created asynchronously. This spike's `WasiHost` handles that with a spare VM per blueprint,
which works, but leaves one case where the same input fails depending on timing
(`unavailable`), and AD-11 has no rule for it. A different design was **not measured**: a
shared pool of VMs created ahead at start-up, one wait like `loadQuickJS()`, from which
blueprints and replacements draw synchronously. If story 17 built that pool, the timing case
would only come back when the pool ran dry, at a reserved 1472.0 KiB of WASM memory per pooled
VM. So the case for quickjs-emscripten on what was measured is narrower: synchronous set-up
with no pool to size, no timing-dependent failure in the host as built, and 121.1 KiB less raw
(50.2 KiB less gzip). The case for quickjs-wasi is also real: better isolation (a trap takes
down one blueprint's VM, not every blueprint's runtime), a faster cold start, more weekly
downloads (11.4 M against 5.5 M), and a current, actively released QuickJS-NG, where
quickjs-emscripten's last release is 8.5 months old. Against that, quickjs-wasi is eight months
old, has had three majors and one main author. The pick is close. It falls to
quickjs-emscripten because its advantages were measured in this spike, while quickjs-wasi's
answer to its one measured problem (the pool) was not. Two things would flip it:
quickjs-emscripten stalling behind a QuickJS fix that matters, or a trap seen in practice.
AD-10 confines the runtime to `blueprint`, and the boundary and lockdown ran unchanged on both
engines, so a switch stays inside the sandbox host.

## AD-18's properties

Tested on all three hosts in both browsers (`spikes/src/sandbox.test.ts`; the numbers are in
`properties-*.json`):

- **Step budget.** `while (true) {}` stops synchronously at the budget: 100 interrupt-handler
  calls, so the call returns after 101, with `{ kind: 'step-budget' }`. Three more runaways
  stop the same way: a loop that catches the interrupt and loops again (QuickJS and QuickJS-NG
  make the interrupt uncatchable), a loop at the source's top level, and a loop placed outside
  the factory by closing its braces. The next call answers, and the next animation frame runs.
  Time from the call to the stop, with the host built before the clock starts (Chromium /
  Firefox):

  | Runaway | Warm host | Wasi host | Fresh host |
  |---|---|---|---|
  | `while (true) {}` | 3.09 / 1.62 ms | 2.33 / 1.74 ms | 2.24 / 1.84 ms |
  | a loop that catches the interrupt | 1.9 / 1.64 ms | 2.38 / 1.74 ms | 2.36 / 1.94 ms |
  | a loop at the source's top level | 2.105 / 1.62 ms | 2.315 / 1.74 ms | 2.525 / 2.22 ms |
  | a loop outside the factory, at load | 0.005 / 0 ms: it ran once, in the set-up, and every call reports the cached failure (101 steps) | 0 / 0 ms, as warm | 2.24 / 2.18 ms |
- **Deterministic.** On every host, a top-level `let` starts over on every call. On the warm and
  wasi hosts, each of these fails typed on every call, because the lockdown froze it: a
  `globalThis` write, a patched `JSON`, a patched `Object.prototype` or `Array.prototype`, and a
  patched array-iterator prototype. A walk from inside a blueprint finds no unfrozen object it
  can reach. On the fresh host the same writes succeed and die with the context. An
  implicit-global write fails on all three, because blueprints run in strict mode. The wasi
  host's `unavailable` case is the exception noted in the comparison.
- **Hermetic.** `fetch`, `window`, `document`, `setTimeout`, `console`, `Date`, `Math.random`,
  `performance`, `WeakRef`, `FinalizationRegistry`, `DOMException`, `atob` and `btoa` are absent
  inside on every host, and using any of them is a typed failure. A write to `globalThis` does
  not reach the host.
- **The boundary holds.** The source can't close or skip the boundary. The `Function`
  constructor builds the factory from text, so a source can close its braces. All it changes
  is what the factory returns, and the boundary checks that like any other value. Eight such
  attempts each fail typed or return a JSON-exact value.

## Findings for story 17

- **The step count varies by ±1 with call history, on both runtimes.** QuickJS and QuickJS-NG
  poll the interrupt handler through a per-context counter, and a call doesn't reset it. A loop
  of 10⁵ iterations takes 20 steps on the warm and wasi hosts; on the warm host it takes 21
  after one of seven histories (a 750-iteration loop ran first). On the fresh host it always
  takes 21. 10⁵ iterations are a whole number of poll periods, which hides the drift, so a
  sweep measures a loop of 102 500 iterations after prior loops of 0 to 5000: it takes 20 or 21
  steps on the warm and wasi hosts, and 21 every time on the fresh host. Per the plan's
  decision, the budget is a runaway guard set far above any real blueprint, so the ±1 is
  accepted. A blueprint that runs within one step of the budget can pass on one call and fail
  on another. One step of slack on each side fixes the outcome after every tested history.
  The count is also coarse: about 20 steps per 10⁵ simple loop iterations.
- **Set-up is per blueprint, not per slot.** The warm host's set-up, its runtime included,
  costs 1.9716 ms (Chromium) and 2.0222 ms (Firefox) once warmed, nearly all of it the lockdown,
  and 10.925 ms and 4.12 ms the first time, cold. All 50 slots share one part blueprint, so the
  drag paid it once. A design with many distinct blueprints pays it once per blueprint, at load
  or on first use, and keeps one QuickJS runtime per blueprint in memory: 146.1 KiB used each,
  measured right after the set-up. Memory over a long session is not measured.
- **A failing blueprint is expensive on every frame.** A runaway call costs the budget's
  exhaustion time: 1.62–3.09 ms per call on the warm host. If the slots' blueprint runs away,
  50 slots cost about 81–155 ms per frame, on every frame of a drag, until it is fixed. A
  `pending-job` call is about as costly: the host sets the blueprint up again, 1.97–2.02 ms
  warmed (estimated from the breakdown, not timed as a drag), so about 99–101 ms per frame on
  50 slots. AD-11's failed-lane rule (show the last good output marked stale) does not stop the
  lane from re-running. Story 17 should decide when a failing blueprint stops being called (for
  example, not again until its input slice changes) and keep the budget well under a frame / 50.
- **Keep `Promise` and check pending jobs.** Without the `Promise` intrinsic, QuickJS leaks
  every async function it creates and aborts when the runtime is disposed. The host keeps
  `Promise`, and after each call it treats a queued job as a typed failure. It then drops the
  runtime holding the job and sets the blueprint up again.
- **Set a max stack size.** Without one, unbounded recursion in Chromium overflows the
  browser's native stack before QuickJS's own check. The host sees a `RangeError`, and
  disposing the runtime afterwards aborts the WASM module, which every blueprint's runtime
  shares. With `setMaxStackSize(256 KiB)`, QuickJS reports its own stack overflow as a typed
  failure, and the next call answers.
- **Blueprints run frozen and strict.** On the warm host a blueprint can't patch a built-in,
  write a global, or create an implicit global; each is a typed failure. Story 17's API has to
  state this.
- **Values JSON can't carry exactly fail.** These are a typed `not-plain` failure with a path:
  `NaN`, `±Infinity`, `-0`, `undefined`, functions, sparse arrays, `Map`s, symbol keys, getters
  and bigints. Rejecting `-0` is the strictest choice: a blueprint that computes `0 * -1`
  fails. Story 17 may prefer to normalise `-0`.
- **The lockdown's reach is a list, not a proof.** It freezes what is reachable from
  `globalThis` plus the syntax-only intrinsics SES lists. The test's own walk finds nothing
  unfrozen, on QuickJS and on QuickJS-NG. An intrinsic that both lists miss would be shared
  state. Story 17 should keep the walk as a test whenever the engine version changes.
- **Don't set a memory limit without a determinism test.** QuickJS's memory limit is
  runtime-wide, and it depends on when garbage collection runs. It could fail the same call
  differently after different histories. It is not set here.
- **The host is portable.** The boundary, the lockdown and every test ran unchanged on
  QuickJS-NG, so a later switch to quickjs-wasi changes only how the host creates and drops its
  runtimes. If it does switch, a VM pool created at start-up is the design to measure first.

## What this does not show

- **The measured blueprint is the smallest one.** It has one input pair and one rectangle. The
  drag is the worst case for call count, but the best case for blueprint size. A real key
  blueprint returns more data (an envelope, cutouts, footprints), and both its run and its
  marshalling grow with it. The warm host's boundary and marshalling alone cost about
  0.002–0.003 ms per call.
- **Only the sandbox is timed.** The rest of a frame (the layout, the other live stages,
  rendering) is not timed here. The live latency target, still to be set by Sergii after
  measurement (PRD §8 Q3), has to fit all of them. The warm host leaves about 15.5 ms of the
  frame at the median and 7.1 ms in Firefox's slowest frame.
- **The slow Firefox frame was not profiled**, and its cause is not separated (see "Latency").
- **No real drag re-runs every blueprint.** A key drag changes no part input, so AD-11's cache
  keys would skip the `parts` lane. The bench's every-frame re-run is the upper bound the plan
  chose (Decision 2026-11-01).
- **A pool of quickjs-wasi VMs created ahead** was not built or measured.
- **Memory over a long session** is not measured on either runtime: one runtime (or VM) per
  blueprint, and garbage that the cycle collector frees only from time to time.
- **A WASM trap was not triggered** on either runtime. The isolation difference in the
  comparison table follows from how each library is built, not from a test.

## Re-run, 2026-11-08: browser-worker timings and memory on battery

Story 17 re-ran `archive/spike-blueprint-calls` before pinning any budget (run
`05820635-68e1-43a0-b851-645ccc569979`), on **battery, `power-saver`** (battery 78% to 77%,
governors `powersave`, load 0.65 to 2.94), in a module Web Worker in Chromium and Firefox. **The AC
reference run is still outstanding**: no AC was at hand, and Sergii decided the build does not
wait for it (recorded in `deferred-work.md`). The numbers below are on the state the app is really
used in, not the fastest one.

| Measure, quickjs-wasi | Chromium | Firefox |
| --- | --- | --- |
| Command, 50 keys x key blueprint (10 calls), JSON results, median / p95 ms | 3.575 / 4.125 | 4.38 / 5.94 |
| Set-up per blueprint, total median / p95 ms | 6.46 / 7.025 | 8.34 / 9.6 |
| VM create (async), median ms | 0.925 | 1.32 |
| WASM per VM, MiB (1 blueprint, after calls) | 1.44 | 1.44 |
| QuickJS used per VM, KiB | 139 | 139 |
| 100 distinct VMs, WASM MiB | 143.75 | 143.75 |

Nothing here argues against the budgets: a 50-key command stays well inside the 100 ms visible-set
target, one VM's 1.44 MiB is far below the 48 MiB replacement limit and the 64 MiB `memoryLimit`, and
the run contradicts no step budget. **The budgets stay 100 steps, 64 MiB and 48 MiB.**

## Sign-off

Pass / miss: pass, runtime superseded by BP-2 (quickjs-wasi 3.6.3)  Sergii, date: 2026-11-02
