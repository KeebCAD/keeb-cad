---
title: 'A part blueprint answers within the live budget'
type: 'chore'
ticket: '16'
created: '2026-11-01'
status: done
baseline_revision: 'ed342ec6c19b06bd9840f12c4c6b0073171540de'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 2
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** AD-18 runs part blueprints as code in a hermetic, deterministic sandbox with a step budget, and AD-11 makes the `parts` lane a live computed, but no runtime is chosen and nobody knows whether ~50 warm sandbox calls fit in a drag frame. A miss sends the chain step back to bmad-architecture before story 17 builds `@keeb-cad/blueprint` on that runtime.

**Approach:** In a throwaway `spikes/` workspace, verify the candidate runtimes' current versions and licences on the web, show the pick meets AD-18's three properties, and time a minimal part blueprint (inputs → one `rectangle`) called once per fake slot on every animation frame of a simulated drag, in Chromium and Firefox; record the numbers in a verdict file for Sergii's pass/miss.

## Boundaries & Constraints

**Always:**
- Fake data only: 50 slot rectangles generated in the spike, Corney's slot count; no design file, register, `parts` section or workspace package.
- The blueprint is JS source evaluated inside the sandbox; inputs go in and the rectangle comes out as plain values, and the marshalling is inside the timed region.
- Timings are warm (after warm-up frames), on the main thread inside `requestAnimationFrame`, at least 300 frames per browser; report median and max per frame plus per-call median.
- Every version and licence in the verdict cites the page it was read from and the date.
- Decision (2026-11-01): the measured drag is the worst case: every slot's blueprint re-runs every frame with a changed input (as when scrubbing a design-wide parameter bound into every key's input), an upper bound on any real drag.
- Decision (2026-11-01, after review pass 2): the verdict's number comes from a warm-context host that resets blueprint state on every call (one context per blueprint, globals and intrinsics frozen once, the boundary compiled once and kept apart from the blueprint's source, a fresh blueprint instance per call). The fresh-context-per-call host is timed beside it for comparison. The verdict's number is the fastest host that passes the stateful-blueprint tests.
- Decision (2026-11-01, after review pass 2): the step count may depend on call history by at most ±1 handler call (QuickJS's per-context interrupt counter is not reset per call). The budget is a runaway guard set far above any real blueprint; tests assert the variance is ≤ 1, and the verdict records it as a limit for story 17.
- Decision (2026-11-01, after build): quickjs-wasi (Vercel Labs, QuickJS-NG) is timed as a third host on the same tests and bench, as a warm reset host built the same way, so the runtime choice rests on measurement, not on paper. The verdict compares it with quickjs-emscripten on speed, step-count determinism (whether its per-instruction handler gives exact counts with no history dependence), maturity and maintenance, and recommends one runtime.
- The live latency target is Sergii's (PRD §8 Q3): the verdict states the numbers against a 16.7 ms frame, recommends pass or miss, and leaves the sign-off line for him.

**Never:**
- No code in `app/`, `packages/` or `fixtures/`, and no change to their configs or the root lockfile.
- No `@keeb-cad/blueprint` API design (story 17); no spine edit (a miss goes to bmad-architecture).
- No runtime is picked without proof of a step budget that stops a runaway loop synchronously.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Warm drag frame | 50 slots, a frame index fed into each call | 50 rectangles; frame time recorded | — |
| Same input twice | one slot's inputs, two calls | identical rectangle | — |
| Runaway blueprint | `while (true) {}` | the call stops at the step budget | a typed failure, the page stays responsive |
| Host reach | blueprint reads `fetch`, `window`, `Date.now`, `Math.random` | each is absent or fixed | — |

</frozen-after-approval>

## Code Map

- `archive/spikes:spikes/` (branch) -- precedent: a standalone pnpm workspace root (`pnpm-workspace.yaml` with `packages: ['.']`, `strictPeerDependencies: true`, `hoist: false`, `publicHoistPattern: []`), own lockfile, one `pnpm --dir spikes verify` script, README with dated results. Copy its shape; don't restore its routing/geometry code.
- `vitest.config.ts` -- root projects are explicit so `spikes/` is never collected; `eslint.config.ts` and `.prettierignore` already ignore `spikes/`. Don't touch.
- `app/vitest.config.ts` -- pattern for Vitest browser mode with `@vitest/browser-playwright`, instances Chromium and Firefox, headless. Reuse in `spikes/vitest.config.ts` (Vitest 5.0.5, catalog versions from `pnpm-workspace.yaml`).
- `_bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/geometry-verdict.md` -- verdict file shape: frontmatter (`title`, `epic`, `stories`, `date`, `status`), a one-paragraph verdict, evidence pointers, latency table. Follow it.
- Spine line 718 -- chain step `(rectA + rectB) / 2 + gap`: the rectangle is `{ w, h }` in the slot's frame; that is the output to return.
- Spine Open Questions line 904 -- the question this spike answers; AD-10 line 304 -- only `blueprint` will import the runtime.

## Tasks & Acceptance

**Execution:**
- [ ] `spikes/{package.json,pnpm-workspace.yaml,tsconfig.json,vitest.config.ts,vite.config.ts,.gitignore,README.md}` -- standalone workspace per the precedent; `verify` runs a frozen install, Playwright browser install, typecheck, `vitest run` in Chromium and Firefox (one at a time), the host build and the report -- one command reproduces the result.
- [ ] web check, recorded in README -- current version, licence, last release and maintenance state of the candidates; reject on paper any without a synchronous step budget, with the reason -- the pick rests on cited evidence.
- [ ] `spikes/src/slots.ts`, `spikes/src/blueprint.js.txt` -- 50 fake slots with a `size` input; the minimal part blueprint returning `{ rectangle: { w, h } }` -- Corney's count, the call under test.
- [ ] `spikes/src/sandbox.ts` -- two hosts sharing one boundary: **warm** (one context per blueprint; built-ins and globals frozen and the global object made non-extensible once; the blueprint's source compiled once into a factory kept apart from the boundary code, e.g. through the `Function` constructor, so the source cannot close or skip the boundary; each call runs the factory for a fresh blueprint instance) and **fresh** (loop 1's context per call, for comparison). Both: step budget via the interrupt hook, max stack size, a value JSON can't carry exactly is a typed `not-plain` failure, and a malformed boundary result is a typed failure, never a host throw. No promise job outlives a call: leave `Promise` out of the intrinsics, or report pending jobs after a call as a typed failure -- the AD-18 properties for the host the verdict times.
- [ ] `spikes/src/sandbox.test.ts` -- run every describe on both hosts: the matrix's last three rows; stateful blueprints (a top-level `let`, `globalThis` and implicit-global writes, patched `JSON` and prototypes) give the same output for the same input on every call; a source that tries to break out of the boundary (closing braces, a returned fake entry) fails typed and cannot return a non-JSON-exact success; a promise job queued by one call leaves nothing for the next; step counts after seven varied histories differ by at most 1 (exact on the fresh host); a normal call answers after a stack overflow; each host global listed in the README is both absent and fails typed when called -- hermetic, deterministic, budgeted, on both hosts.
- [ ] `spikes/src/drag.bench.test.ts` -- per host: warm-up, then ≥300 rAF frames of 50 calls; per frame median, p95 and max, frames over 16.7 ms, and a **per-call median** from timing each call individually (the per-call time is now above both timers' ticks; if a host's call falls below a tick, say so beside the number); an error inside a frame rejects the frame's promise, with a test that triggers it; the plain-JS floor repeated per frame above the tick; cold start; a per-call cost breakdown on a runtime configured exactly as the host (interrupt handler and stack limit set) -- the numbers.
- [ ] `spikes/results/` and `spikes/scripts/` -- each `verify` writes gitignored `results/latest/` under a run id that `report.mjs` checks; the test-derived numbers the verdict quotes (runaway stop time, steps per iterations, step variance) and the bundle sizes are written into the run's results too, and `report.mjs <dir>` reads everything from `<dir>`; the cited run is copied once to committed `results/verdict/` -- every verdict number traceable, nothing a re-run overwrites.
- [ ] `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/sandbox-verdict.md` -- runtime, version, licence (cited); both hosts' per-frame median, p95, max and frames over budget, and per-call median, in both browsers; which host the number comes from (the fastest that passes the stateful tests) and why; run 1's shared-context numbers as a non-deterministic reference; the ±1 step limit and other findings for story 17; recommendation; `status: draft`, sign-off blank; every number traceable to `results/verdict/` -- the ticket's verify line.

- [x] loop 3: `spikes/package.json` + lockfile -- add quickjs-wasi at its current version (re-check version, licence and release date on the web, cited, dated); it must run in the browser main thread synchronously, and if it can't, record why and stop there -- the third candidate measured.
- [x] loop 3: `spikes/src/sandbox.ts` (or a sibling `sandbox-wasi.ts`) -- a warm reset host on quickjs-wasi built like `WarmHost` (one context per blueprint, frozen once, the blueprint compiled apart from the shared boundary, fresh instance per call, typed failures, max stack, step budget from its interrupt handler set to stop a runaway in a similar number of loop iterations) -- same contract, other runtime.
- [x] loop 3: `spikes/src/sandbox.test.ts`, `spikes/src/drag.bench.test.ts` -- run every describe and the bench on the wasi host too; its step counts after the seven histories are recorded, asserting ≤ 1 and reporting whether they are exact; cold start, set-up cost, per-call median, bundle size (its wasm and glue) -- like for like.
- [x] loop 3: `spikes/results/verdict/`, `spikes/README.md`, `sandbox-verdict.md` -- one new verdict run with all three hosts; the verdict's comparison table and recommendation name one runtime with the reasons, every number from the new run -- the decision on evidence.

**Acceptance Criteria:**
- Given a clean checkout of the branch, when `pnpm --dir spikes verify` runs, then it exits 0 and prints frame timings for Chromium and Firefox.
- Given the verdict file, when Sergii reads it, then it names one runtime with version and licence, both browsers' median and max per drag frame on 50 slots, and a pass/miss recommendation with a sign-off line left blank.

## Implementation Notes

- Picked quickjs-emscripten 0.32.0 (`quickjs-emscripten-core` + `@jitl/quickjs-wasmfile-release-sync`, MIT). quickjs-wasi (QuickJS-NG, MIT, has an interrupt handler) is the untimed fallback; SES and Sval were rejected because neither has a synchronous step budget, and JS-Interpreter because it runs ES5 only and is about 200× slower than native.
- Beyond the plan: `setMaxStackSize(256 KiB)` is required. Without it, unbounded recursion overflowed Chromium's native stack and the runtime aborted on dispose. A test covers it.
- The vitest config sets COOP/COEP so `performance.now()` keeps fine resolution, and `fileParallelism: false` so the two browsers never bench at once. Run in parallel, Firefox's max was 35 ms.
- `verify` also runs `vite build` of the sandbox host (bundle size) and `scripts/report.mjs` (prints the timings).
- Loop 1: the host is a warm module and runtime with a fresh context per call. It costs 11.4–12.3 ms per frame (median) and 20–21 ms (max), so the verdict recommends a miss. Compiling the boundary into each context (~0.09 ms per call) and creating the context (~0.10 ms) dominate. The bench also times a minimal-intrinsics variant and records a per-call breakdown, beyond the plan, so the architecture step can tell where the time goes. `scripts/start-run.mjs` writes a run id that `report.mjs` checks, and the verdict's run is `results/verdict/` (run `5a0d19b2…`).
- Loop 2: the warm host passes every test and is the verdict's host: median 0.99 ms (Chromium) and 1.24 ms (Firefox) per frame, max 1.87 and 9.84 ms, none over 16.7 ms; the verdict recommends a pass (run `fa8b16b9…` in `results/verdict/`). Choices within the plan: `Promise` stays in the intrinsics and a queued job after a call is a typed `pending-job` failure, because without `Promise` QuickJS 2025-09-13 leaks every async function and aborts on runtime dispose; the host then drops that runtime. The fresh host shares the boundary and factory but skips the lockdown (with it, a call cost ~1.9 ms). Blueprints compile in strict mode. `pnpm test` runs the two browsers as two `vitest run --project` calls. `scripts/bundle.mjs` writes `bundle.json` into the run's results. Loop 1's shared-context numbers are quoted from this change log; the files saved from run 1 hold a different run's numbers, so they are not committed.
- Loop 3: quickjs-wasi 3.6.3 (MIT, QuickJS-NG 0.17.0) runs in the browser main thread with synchronous calls; only creating a VM (one WASM instance) is asynchronous. The wasi host (`src/sandbox-wasi.ts`) shares the boundary and lockdown, moved unchanged into `src/boundary.ts`; `src/hosts.ts` is one async factory over the three hosts for the tests and the bench. Choices within the plan: because a VM can't be created inside a call, the host keeps a spare VM and switches to it after a pending job or a WASM trap, and a new typed failure `unavailable` covers a second drop before the next spare exists (a test does it); Date, `performance`, WeakRef, DOMException and atob/btoa are left out of its intrinsics and its WASI clock and random source are fixed. The same budget (100) fits: QuickJS-NG polls the handler about 20 times per 10⁵ loop iterations, like QuickJS, not once per instruction as its README says. Its count is exact over the seven histories but not history-free: a new sweep test (102 500 iterations after prior loops of 0–5000) shows 20 or 21 on the warm and wasi hosts and 21 every time on the fresh host. Beyond the plan: the bench records the memory of one set-up blueprint on both runtimes, and `pnpm build` builds each runtime's host into `dist/<runtime>/`. Results (after the loop 3 review fixes: the emscripten set-up timed with its runtime's creation, and WeakRef, FinalizationRegistry, DOMException, atob and btoa checked absent on every host): wasi 0.93 / 1.08 ms per frame at the median (warm 1.055 / 1.14), every test passes; the verdict keeps quickjs-emscripten, calling the pick close: synchronous set-up with no timing-dependent `unavailable` case and a smaller bundle were measured, while a VM pool created ahead for quickjs-wasi was not (run `24ea8cb5…` in `results/verdict/`). Firefox's warm slow frame (9.54 ms at timed frame 189) appears when the emscripten warm host runs first; two reversed-order runs, not kept, had none, so its cause is unverified.
- Loop 3 verification (2026-11-01, on battery, power-saver governor, CPUs capped at 2 GHz): the drag bench timed out at Vitest's 60 s in Chromium, so `drag.bench.test.ts` gets its own 180 s timeout (no measured code changed). The run then passed 192/192, with medians of warm 1.33 / 1.56 ms, wasi 1.50 / 1.48 ms and fresh 27.9 / 29.2 ms (Chromium / Firefox); Firefox's warm max was 15.6 ms at frame 189, close to a full frame. The power state of the verdict run (`24ea8cb5…`) was not recorded; `run.json` holds only the load average.

## Plan Change Log

- **Loop 1 (2026-11-01), from quick review findings 1, 6, 7 (bad_plan) with patches 2, 3, 4, 5, 8 folded in.** The plan said "one warm context, the blueprint loaded once", so blueprint state (a top-level `let`, `globalThis`, a patched `JSON`) carried between calls, QuickJS's per-context interrupt counter made the step count history-dependent (±1), and the measured time was not the time of a deterministic host. Results files were rewritten by every `verify`, so the verdict's evidence drifted and the missing-results guard never fired on a checkout. The plan asked for a per-call median, which Firefox's 0.02 ms timer tick cannot measure for a ~14 µs call. Amended: the sandbox, test, bench, results and verdict tasks above. Known-bad state avoided: a verdict that times a host that isn't deterministic, and evidence a re-run overwrites.
  - **KEEP** (the first implementation is saved at `/tmp/claude-1000/-home-ruyu-projects-keeb-cad/f71ac326-cea0-44d0-9118-54e5ad50d413/scratchpad/spike-13-16-run1`; reuse its files as the starting point): the workspace setup (configs, COOP/COEP for timer resolution, `fileParallelism: false`, one browser at a time, `optimizeDeps.exclude` of the variant, `vite build` of the host for bundle size); the web-check table in its README with every cited source; `slots.ts` and `blueprint.js.txt` unchanged; the hermetic tests, the runaway-loop and catch-the-interrupt tests, `Date: false` intrinsics and the `Math.random` delete; `setMaxStackSize(256 KiB)`; the cold-start split; the verdict's structure, its "What this does not show" section and its sign-off line. Run 1's numbers (warm shared context: Chromium median 0.755 / max 1.18 ms, Firefox 0.72 / 9.9 ms at frame 190) may be quoted in the verdict as the non-deterministic host's cost, for comparison.
- **Loop 2 (2026-11-01), from the pass 2 intent gap (Sergii: A, warm reset host; A, ±1 step accepted) with bad_plan findings 1, 2, 5 and patches 3, 4, 6, 7, 8 folded in.** Loop 1's tasks allowed a fresh context per call and demanded exact step counts, which only that host can meet; it cost ~0.23 ms per call (context ~0.10, boundary compile ~0.08–0.11), and the miss was a cost of that host, not shown of the runtime. The boundary spliced the blueprint's source as text, so a source could skip the JSON-exact check. Amended: every task above; the minimal-intrinsics variant is dropped (the warm host creates its context once). Known-bad states avoided: a verdict on a host not designed for warm calls, a boundary a blueprint can bypass, verdict numbers found only in console output.
  - **KEEP** (loop 1's implementation is saved at `/tmp/claude-1000/-home-ruyu-projects-keeb-cad/f71ac326-cea0-44d0-9118-54e5ad50d413/scratchpad/spike-13-16-run2`; reuse its files as the starting point): everything loop 1 kept; the `not-plain` walk in `wrap()` (one descriptor read per property, captured built-ins) and its 13 cases; `start-run.mjs` and the run-id check; `results/latest/` vs `results/verdict/`; the rAF rejection path; the floor ×1000; the fresh-context host itself, now as the comparison host; the verdict's "Where one call's time goes" section, re-measured on a correctly configured runtime.
- **Loop 3 (2026-11-01), Sergii's request after the build.** The runtime pick rested on paper: quickjs-wasi was rejected untimed on an inferred cost, and its per-instruction handler may remove the ±1 step drift. Amended: the four loop 3 tasks above. KEEP: everything loop 2 built (both hosts, tests, bench, run-id and results split); add, don't rewrite.

## Review Triage Log

### Pass 1 (quick) — high 0, medium 3, low 5, false 0, maybe-false 0

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | Warm shared context lets blueprint state survive between calls; determinism claimed but untested on a stateful blueprint | medium | bad_plan | `wrap()` evaluates the source once into a persistent closure; a top-level `let` or `globalThis` write persists. The plan's task prescribed one warm context. Loop 1. |
| 2 | Step count is history-dependent (±1); verdict states it as exact; budget edge can flip ok/step-budget | medium | patch (folded into loop 1) | The test's own `max - min <= 1` tolerance admits it; QuickJS's interrupt counter is per context and not reset per call. A fresh state per call resets it; the test now demands exact equality. |
| 3 | "Context stays usable after stack overflow" claimed, untested | low | patch (folded into loop 1) | Both calls in the test recurse and fail; no normal call follows. Test added to the task. |
| 4 | A throw inside the rAF callback hangs the bench until the 60 s timeout | low | patch (folded into loop 1) | The `new Promise` has no `reject` path from the callback. Bench task now requires rejection. |
| 5 | Floor medians equal one timer tick; 35–115× ratios are quantisation artefacts | medium | patch (folded into loop 1) | Floor medians 0.005 ms (Chromium tick 0.005) and 0.02 ms (Firefox tick 0.02) in run 2's JSON. Floor now repeats calls per frame. |
| 6 | Plan asked for a per-call median; only frame median / 50 is reported | low | bad_plan | Deviation from the plan; a ~14 µs call is below Firefox's 0.02 ms tick, so the plan now asks for frame median / 50, labelled. Loop 1. |
| 7 | Committed `results/*.json` are rewritten by every `verify`; the verdict's evidence drifts and the missing-results guard is vacuous on a checkout | medium | bad_plan | Seen in this session: the verification run overwrote run 1's files. Results now split into gitignored `latest/` and committed `verdict/`. Loop 1. |
| 8 | JSON marshalling turns `NaN`/`Infinity` into `null` and drops `undefined` as a success | low | patch (folded into loop 1) | `JSON.stringify` semantics inside `wrap()`; no check on the host. Now a typed failure, with a test. |

### Pass 2 (quick, after loop 1) — high 0, medium 2, low 5, false 1, maybe-false 1; plus one intent gap raised in triage

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 0 | (triage) The frozen intent asks for "a warm call" and "deterministic"; loop 1's host takes a fresh context per call, and the pass/miss turns on which deterministic host is timed. The plan does not settle it | medium | intent_gap | Per call ~0.23 ms, of which context ~0.10 ms and boundary compile ~0.08–0.11 ms; the blueprint ~0.02–0.04 ms. A warm-context host that resets blueprint state per call was never timed. Back to Sergii. |
| 1 | The frozen per-call median is unmet; loop 1's reason (below Firefox's tick) no longer holds at ~0.23 ms per call | medium | bad_plan | `frameMedianOver50Ms` 0.2289 / 0.2456 in `results/verdict/`; 11+ Firefox ticks. Re-plan after the intent answer. |
| 2 | Blueprint source spliced as text into `wrap()` can close the IIFE and return its own entry, skipping the JSON-exact check; the host's `JSON.parse` calls are unguarded | medium | bad_plan | Verified by reading `wrap()`: `${source}` sits inside `(() => { … return blueprint })()`; nothing isolates it. Re-plan: load the source separately from the boundary. |
| 3 | Verdict/README numbers (runaway stop time, steps per 10⁵ iterations, mutation check) not in `results/verdict/` | low | patch (after re-plan) | Only in `console.info` output. |
| 4 | `report.mjs results/verdict` prints the working tree's bundle beside the committed timings | low | patch (after re-plan) | Bundle read from `dist/assets/` regardless of `dir`. |
| 5 | Promise jobs may outlive a call's context on the shared runtime | maybe-false (medium if true) | bad_plan (folded) | Would need `executePendingJobs`/a job-queue check against the vendored build; re-plan decides the intrinsics. |
| 6 | Cost breakdown runtime lacks the interrupt handler and stack limit | low | patch (after re-plan) | `breakdown()` calls `newRuntime()` bare. |
| 7 | Minimal intrinsics tested for determinism only | low | patch (after re-plan) | Only the `deterministic` describe loops over both sets. |
| 8 | README overclaims which host calls are tested as typed failures | low | patch (after re-plan) | `document`, `setTimeout`, `console` checked by `typeof` only. |
| 9 | Plan status differs between the diff and the working tree | false | reject | The diff was written before triage set `in-review`; nothing is committed yet. |

### Pass 3 (quick, after loop 2) — high 0, medium 1, low 6, false 1, maybe-false 0

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | Verdict says QuickJS is "the only candidate with all three properties"; the README table rates quickjs-wasi (and JS-Interpreter's budget) otherwise | low | patch | Verdict line 13 vs the README candidates table. Reword: the only one timed / the best. |
| 2 | Runaway stop times include host construction (and the warm lockdown); the "at load" case is left out of the quoted ranges | low | patch | `sandbox.test.ts:376–379`: `start` precedes `sandbox(code)`. Start the clock after construction; re-run the verdict run; quote all cases. |
| 3 | Warm host records 0 steps for an at-load runaway | low | patch | `sandbox.ts:340` returns before `#lastSteps` is set at line 343. |
| 4 | Verdict's "about 1.9 ms set-up per blueprint" omits the cold set-up measured at 7–12 ms | low | patch | `breakdown()` reuses a warmed runtime; `coldStart.warmSetupMs` 11.69 / 7.48 ms. State both. |
| 5 | A runaway or pending-job blueprint costs ~2 ms per slot (plus a full re-set-up after `pending-job`), ~100 ms per frame on 50 slots; not in the findings for story 17 | medium | patch | Budget exhaustion ~1.7–2 ms per call; `WarmHost.call` re-runs `#open()` after `pending-job`. Add the finding. |
| 6 | WeakRef / FinalizationRegistry could make output depend on GC timing | false | reject | Checked in Node with the same variant and `{ ...DefaultIntrinsics, Date: false }`: `typeof WeakRef` and `typeof FinalizationRegistry` are both `'undefined'`. |
| 7 | `jsonExact` test helper rejects `-0.5` via `includes('-0')` | low | patch | `sandbox.test.ts:58`. Match `-0` only when not followed by `.` or a digit. |
| 8 | `blueprint.js.txt` says "never on the host"; the floor runs it on the host | low | patch | `drag.bench.test.ts` floor uses `new Function`. Reword the comment. |
| 9 | `report.mjs` doesn't check `crossOriginIsolated` or guard `r.hosts[host]` | low | reject | Unlikely in use (isolation is configured and printed with the timer step each run); the fix adds guards. |

### Pass 4 (quick, loop 3) — high 0, medium 5, low 9, false 0, maybe-false 0

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | Firefox slow frame attributed to "the page's first drag, whichever host runs it"; the reversed-order runs (wasi first) had no slow frame | medium | patch | The cited evidence shows it only when the emscripten warm host runs first; first drag vs first heavy emscripten use is not separated. Reword to what was shown. |
| 2 | Reversed-order runs not in `results/verdict/` | low | patch | Marked "not kept" but the attribution rests on them. Say the attribution is unverified. |
| 3 | "Frame 189 as in loop 1, loop 2 and every earlier run"; loop 1 was frame 190 | low | patch | Plan's loop 1 log. Say 189–190. |
| 4 | Runaway range "1.6–2.4 ms on every host" vs the table's 1.58–2.66 ms | low | patch | `report.txt`. Use the table's range. |
| 5 | "About a tenth of the memory per blueprint" compares `memory_used_size` (146 KiB) with wasi's linear memory size (1472 KiB, incl. 1 MiB stack) | medium | patch | `drag.bench.test.ts:270`. Report like for like (146 vs 130 KiB used) and reserved memory separately; drop "a tenth". |
| 6 | Set-up comparison: emscripten's breakdown reuses a warmed runtime, wasi's instantiates a VM each time | low | patch | `breakdown()` vs `wasiBreakdown()`; `WarmHost` creates a runtime per blueprint. Time runtime creation in the emscripten breakdown; new verdict run. |
| 7 | Wasi host returns `unavailable` after two drops until an async refill settles, so the same input can fail depending on timing; verdict rates determinism a tie | medium | patch | `sandbox-wasi.ts` `#replace()`/`call()`; the test asserts it. State it as a determinism difference of this host design. |
| 8 | A failed refill leaves the wasi host stuck with an unhandled rejection | low | reject | Needs instantiation to fail (out of memory); unlikely in the spike's use, and the fix adds retry/error handling. |
| 9 | A VM that traps during load is kept and probed, which could throw from `create()`/`#replace()` | low | reject | No trap was ever triggered; the fix adds a branch and state. Unlikely in use. |
| 10 | Intrinsics the wasi host claims to leave out (WeakRef, FinalizationRegistry, DOMException, atob, btoa) not tested absent | low | patch | Hermetic list lacks them. Add them to the list, on all hosts. |
| 11 | Maturity row omits quickjs-wasi's higher weekly downloads (11.4 M vs 5.5 M) | medium | patch | The verdict's own Runtime section. Put it in the row and the pick's reasoning. |
| 12 | README says ~4.1 M emscripten downloads, re-check says 5.49 M | low | patch | Use the re-check. |
| 13 | Bundle difference quoted raw only (121 KiB) in the recommendation; gzip is 50 KiB | low | patch | `bundle.json`. Quote both. |
| 14 | The deciding reason (wasi needs a spare VM per blueprint) is this spike's host design; a shared pre-created pool would give one start-up wait like `loadQuickJS` | medium | patch | Unmeasured either way. Say so in the reasons; weigh the pick on what was measured. |

## Design Notes

- **Why QuickJS is the likely pick, to be proved, not assumed:** live lanes are synchronous computeds on the main thread, so a Worker-based sandbox can't answer inside the computed, and SES/Compartments can't interrupt a synchronous `while (true)`. A WASM interpreter with an interrupt handler can. Count interrupt-handler calls as the step budget (deterministic), not wall-clock time.
- **The floor** shows how much of a frame is sandbox overhead versus the blueprint itself.

## Verification

**Commands:**
- `pnpm --dir spikes verify` -- expected: exits 0; sandbox tests pass in both browsers; `results/latest/` written by this run; `git status` shows no change under `results/verdict/`
- `pnpm check` -- expected: passes unchanged (the spike stays outside the root workspace)

**Manual checks:**
- The verdict's numbers match `spikes/results/verdict/`; every version and licence has a cited source and date.
