# Verdict: blueprint calls on quickjs-emscripten vs quickjs-wasi

Code and evidence live on branch `archive/spike-blueprint-calls` (commit `ed0418186fbc2b8552dfe306279b9adf19320947`), not on main. Adopted 2026-11-01: quickjs-wasi 3.6.3 (blueprints architecture memlog).

Throwaway spike, 2026-11-01. Question: blueprint code in a QuickJS sandbox calls the blueprint
API's operations, which run on the host synchronously inside the model worker and return results.
Which runtime costs less per host-function call and per command, and what memory does each reserve
per blueprint?

> **Measured on battery.** Every run was on battery (discharging, 50 to 51 %), power profile
> `power-saver`, all 16 CPU governors `powersave`, load average 0.8 to 1.7
> (`results/verdict/run.json`, and `machineAtStart` / `machineAtEnd` in each
> `results/verdict/calls-*.json`). Absolute times will be lower on AC. The two runtimes ran
> interleaved sample by sample in the same worker, alternating which went first, so the
> comparison between them holds better than the absolute numbers. A second run of the same code
> (`results/verdict/repeat/`, run f2fb224e) repeats every ranking below, with medians within about
> 7 %, except two ties: in Chromium, `bounds` and `pads(6)` with JSON results are within 1 %
> between the runtimes and swap order between the two runs.

Every number below comes from run **2e1b3f28-672d-41ce-9028-e01258f0ada0**
(`results/verdict/`; `node scripts/report.mjs results/verdict` reprints it as
`results/verdict/report.txt` does). Times are median / p95 / max.

## Versions and licences

Checked on the npm registry on 2026-11-01 (`npm view <package> version license time`); each is the
`latest` dist-tag and is pinned exactly in `package.json` and `pnpm-lock.yaml`.

| Package | Version | Published | Licence | Engine |
|---|---|---|---|---|
| quickjs-emscripten-core | 0.32.0 | 2026-02-16 | MIT (`LICENSE`, Jake Teton-Landis) | |
| @jitl/quickjs-wasmfile-release-sync | 0.32.0 | 2026-02-16 | MIT (`LICENSE` carries quickjs-emscripten's MIT and QuickJS's MIT) | bellard/quickjs 2025-09-13+f1139494 (its README) |
| quickjs-wasi | 3.6.3 | 2026-10-19 | MIT (`LICENSE`, Vercel, Inc.) | QuickJS-NG, MIT (its README) |

## What was built

- Both hosts expose seven raw host functions, each runtime's own way (`ctx.newFunction` for
  quickjs-emscripten, `vm.newFunction` for quickjs-wasi): `nop()`, `rect(w, h)` → handle,
  `cutout(handle, purpose)`, `offset(handle, d)` → handle, `bounds(handle)` →
  `{ minX, minY, maxX, maxY }`, `pads(n)` → n pad records `{ index, x, y, w, h, net }`,
  `place(handle, x, y)`. Handles are integers into a host-side table (`src/geometry.ts`);
  geometry stays on the host.
- The guest never sees the raw functions. The boundary wraps them in a frozen `api` whose
  wrappers check argument types in the guest, and passes it as `blueprint(inputs, api)`.
- Two ways to return an object or array (`bounds`, `pads`): **native** builds it in the guest with
  the runtime's object API (one crossing per value); **json** sends one JSON string that the
  guest-side wrapper parses.
- Spike 16's determinism is kept: one sandbox per blueprint (a runtime and context, or a VM),
  boundary and lockdown evaluated once, a fresh blueprint instance per call. A fresh host table
  per call means handles start at 1 on every call.
- The key blueprint (`src/blueprints.ts`) makes 10 api calls: 3 `rect`, 2 `cutout`, 1 `offset`,
  1 `bounds`, 1 `pads(6)`, 2 `place`. It returns a 4-field result.
- Everything runs in a module Web Worker (`src/model-worker.ts`). The worker reports
  `inWorker: true` and `crossOriginIsolated: true`, with a timer step of 0.005 ms in Chromium and
  0.02 ms in Firefox.
- Property test, per runtime and per browser (`src/calls.test.ts`), passed: a blueprint that keeps
  a top-level counter and tries to stash state on the api, `globalThis`, `Object.prototype` and
  `Error.prototype` returns the same thing on 3 calls (`calls: 1`, nothing stashed, handles 1
  and 2 again). A bad handle comes back as a typed `threw` failure carrying the host's message.

## Measurements

Chromium 156 (headless) and Firefox 157 on an AMD Ryzen AI 7 PRO 350 with 16 CPUs.

### One host-function call, µs per call

Each sample is one blueprint call that makes 1000 api calls of one kind and reads every
result; the sample time is divided by 1000. 200 samples per kind after 20 warm-up samples.
"Net" is the kind's median minus the median of the baseline loop (the same loop calling a
guest-local function), so it is the cost of the api call itself.
Source: `kinds.cases` and `kinds.netMedianMicros` in `calls-<browser>.json`.

| Kind | Chromium emscripten | Chromium wasi | Firefox emscripten | Firefox wasi |
|---|---|---|---|---|
| baseline loop | 0.11 / 0.125 / 0.185 | 0.17 / 0.19 / 1.215 | 0.12 / 0.18 / 0.38 | 0.26 / 0.32 / 0.6 |
| `nop()`, no args (net) | 2.43 / 4.68 / 14.9 (**2.32**) | 0.71 / 0.89 / 1.625 (**0.54**) | 3.58 / 4 / 22.3 (**3.46**) | 1.28 / 1.34 / 1.98 (**1.02**) |
| `place(h, x, y)`, numbers in (net) | 3.21 / 6.475 / 22.82 (**3.1**) | 2.085 / 2.235 / 6.67 (**1.915**) | 5.16 / 5.82 / 23.46 (**5.04**) | 2.76 / 2.92 / 4.12 (**2.5**) |
| `rect(w, h)`, a handle back (net) | 3.23 / 6.81 / 18.625 (**3.12**) | 1.9 / 2.38 / 5.775 (**1.73**) | 5.6 / 7.18 / 76.56 (**5.48**) | 2.66 / 3.08 / 5.26 (**2.4**) |
| `bounds(h)`, an object back, native (net) | 5.69 / 28.44 / 37.195 (**5.58**) | 9.68 / 14.165 / 45.805 (**9.51**) | 9.38 / 11.32 / 18 (**9.26**) | 6.42 / 6.8 / 35.66 (**6.16**) |
| `bounds(h)`, an object back, json (net) | 5.505 / 15.83 / 22.94 (**5.395**) | 5.485 / 7.14 / 17.305 (**5.315**) | 8.62 / 9.32 / 26.32 (**8.5**) | 5.7 / 5.98 / 64.58 (**5.44**) |
| `pads(6)`, 6 objects back, native (net) | 28.84 / 72.55 / 88.37 (**28.73**) | 117.15 / 158.48 / 165.005 (**116.98**) | 54.7 / 58.32 / 82.14 (**54.58**) | 54.56 / 68.22 / 90.36 (**54.3**) |
| `pads(6)`, 6 objects back, json (net) | 23.45 / 29.72 / 78.875 (**23.34**) | 23.175 / 27.935 / 32.965 (**23.005**) | 29.34 / 31.44 / 66.48 (**29.22**) | 27.4 / 28.4 / 67.14 (**27.14**) |

### One command: 50 keys × the key blueprint (500 api calls), ms per command

200 commands after 20 warm-up commands. Each command checks every key's result and host table.
"In the worker" times only the 50 calls. "Round trip" is timed on the page: a request to the
model worker, the 50 calls there, and the 50 results back by `postMessage`.
Source: `command.byStrategy` and `commandRoundTrip.byStrategy` in `calls-<browser>.json`.

| Command | Chromium emscripten | Chromium wasi | Firefox emscripten | Firefox wasi |
|---|---|---|---|---|
| native, in the worker | **4.185** / 6.545 / 36.695 | 7.865 / 15.135 / 39.025 | 6.86 / 7.18 / 42.96 | **5.18** / 5.38 / 5.76 |
| json, in the worker | 4.065 / 4.625 / 9.885 | **3.615** / 3.93 / 41.715 | 5.46 / 5.78 / 13.94 | **4.26** / 4.46 / 5.58 |
| native, round trip | **4.54** / 10.685 / 32.655 | 7.985 / 13.775 / 34.69 | 6.92 / 7.98 / 47.08 | **5.52** / 5.86 / 10.2 |
| json, round trip | 4.21 / 7.8 / 18.065 | **3.73** / 5.915 / 8.115 | 5.78 / 6.22 / 14.46 | **4.54** / 4.8 / 5.42 |

### Set-up per blueprint, ms

200 set-ups after 10 warm-up set-ups, each with a distinct source. quickjs-emscripten's set-up is a
new runtime and context, the boundary, the lockdown, the raw host functions and the load, all
synchronous. quickjs-wasi's is an asynchronous VM creation (`WebAssembly.instantiate` from the
compiled module), then the same steps, synchronous.
Source: `setup` in `calls-<browser>.json`.

| Set-up | Chromium | Firefox |
|---|---|---|
| emscripten set-up (sync) | 4.87 / 5.25 / 6 | 5 / 5.46 / 7.94 |
| wasi total | 6.45 / 7.095 / 17.165 | 7.7 / 8.4 / 55.04 |
| … of which VM creation (async) | 0.925 / 1.285 / 10.91 | 0.9 / 1.44 / 46.02 |
| … of which set-up in the VM (sync) | 5.51 / 5.82 / 10.965 | 6.8 / 7.06 / 9.02 |
| first call after set-up, emscripten | 0.18 / 0.255 / 0.455 | 0.24 / 0.5 / 2.08 |
| first call after set-up, wasi | 0.245 / 0.325 / 5.135 | 0.2 / 0.38 / 1.9 |
| loading the runtime once (compile and instantiate the .wasm) | emscripten 32.42, wasi 7.865 | emscripten 42.26, wasi 15.36 |

### Reserved memory for distinct blueprints loaded at once

Each count loads that many distinct key-blueprint sources at once, each fully set up, and reads
the memory after set-up and again after 3 calls of each.

- quickjs-emscripten: every runtime shares one module instance and one linear memory. A fresh
  module is used per count, because a WASM memory never shrinks.
- quickjs-wasi: each VM is its own instance with its own memory.

The figures are the same in both browsers and in the repeat run.
Source: `memory` in `calls-<browser>.json`.

| Blueprints | emscripten WASM memory | wasi WASM memory (sum) | emscripten QuickJS used (sum) | wasi QuickJS used (sum) |
|---|---|---|---|---|
| 1 | 16.00 MiB (16,777,216 B) | 1.44 MiB (1,507,328 B) | 155 KiB (158,605 B) | 139 KiB (142,035 B) |
| 10 | 16.00 MiB | 14.38 MiB | 1,549 KiB | 1,387 KiB |
| 20 | 16.00 MiB | 28.75 MiB (30,146,560 B) | 3,098 KiB (3,172,168 B) | 2,774 KiB (2,840,732 B) |
| 50 | 16.00 MiB | 71.88 MiB | 7,745 KiB | 6,935 KiB |
| 100 | 23.13 MiB after set-up, 27.75 MiB after calls | 143.75 MiB | 15,489 KiB | 13,871 KiB |

- quickjs-emscripten reserves a fixed 16 MiB module memory, even when empty. It held 50 set-up key
  blueprints without growing; at 100 it had grown to 23.13 MiB. Each blueprint uses about 155 KiB of QuickJS heap inside it.
- quickjs-wasi reserves 1.44 MiB of linear memory per blueprint, of which about 139 KiB is QuickJS
  heap. An empty VM is 1.31 MiB with 55 KiB used. Spike 16's spare VM would add one empty VM per
  blueprint.
- quickjs-wasi's total passes quickjs-emscripten's 16 MiB from **12 blueprints** on.
- QuickJS heap per blueprint is about the same in both. The difference is the shape: one shared
  memory against one memory per VM.

### Bundle each runtime adds

`vite build` of each host alone, as the app would ship it: minified JS plus the `.wasm` as an
asset. Source: `results/verdict/bundle.json`.

| Runtime | Raw | gzip |
|---|---|---|
| quickjs-emscripten (6 files, `.wasm` 491.3 KiB) | 552.4 KiB | 247.1 KiB |
| quickjs-wasi (2 files, `.wasm` 622.5 KiB) | 673.8 KiB | 297.3 KiB |

## Recommendation

For the calls model, **quickjs-wasi**, if structured results cross as one JSON string, not built
with the object API. It is a close pick, decided on call cost.

1. **Per host-function call, quickjs-wasi costs less for scalar calls in both browsers, and the
   same or less for JSON results.**
   - Scalar calls cost about 1.6× to 4.3× less net: `nop` 0.54 against 2.32 µs in Chromium and
     1.02 against 3.46 µs in Firefox; `rect` 1.73 against 3.12 µs and 2.4 against 5.48 µs.
   - quickjs-emscripten's own call path (its handle lifetimes and scopes around each callback)
     costs about 2 to 3.5 µs before any payload is read.
   - With JSON results, objects and arrays cost the same in Chromium (`pads(6)` 23.0 against
     23.3 µs, a tie that swaps order in the repeat run) and less on quickjs-wasi in Firefox
     (27.1 against 29.2 µs, and `bounds` 5.4 against 8.5 µs).
2. **Per command, quickjs-wasi with JSON results is the fastest in both browsers.**
   - In the worker: 3.62 against 4.07 ms in Chromium (11 % less) and 4.26 against 5.46 ms in
     Firefox (22 % less).
   - Round trip: 3.73 against 4.21 ms and 4.54 against 5.78 ms.
   - quickjs-emscripten with JSON results is also faster than with native results, so JSON is the
     better choice whichever runtime is used.
3. **Call cost is what grows if blueprints get chattier.** At 10 calls per key, the whole
   difference is 0.4 to 1.2 ms per 50-key command; both runtimes fit easily. A blueprint making
   100 scalar calls per key would put the gap at about 6 to 9 ms (Chromium) and 12 to 15 ms
   (Firefox) per command, on these net costs.

What it costs to choose quickjs-wasi:

- **Memory** grows by 1.44 MiB per resident blueprint: 28.75 MiB against 16 MiB at 20 blueprints,
  and 71.88 MiB against 16 MiB at 50. If a design keeps more than about 30 distinct blueprints
  resident, or memory on low-end devices matters more than call cost, quickjs-emscripten's flat
  16 MiB wins.
- **Set-up** costs 1.6 ms (Chromium) to 2.7 ms (Firefox) more per blueprint, and the VM is created
  asynchronously (about 0.9 ms). That was spike 16's reason for preferring quickjs-emscripten.
  In the calls model, a blueprint is loaded once, when the design loads it, which is already an
  asynchronous step in the worker, so the asynchronous creation matters less than it did for
  spike 16's in-call VM replacement.
- **Bundle**: 50.2 KiB more gzip.
- **Never build structured results natively on quickjs-wasi in Chromium.** `pads(6)` native costs
  117 µs against 23 µs as JSON, and makes the native command 7.87 against 4.19 ms on
  quickjs-emscripten. quickjs-emscripten is the better runtime only for that
  strategy, in that browser.

## Findings along the way

- **Override mistake after lockdown.** Freezing `Error.prototype` makes both libraries'
  host-error conversion produce an error with an empty message. Both build the guest error by
  assigning `message` and `name` (`ctx.newError` / `vm.newError`), and that assignment fails
  silently against a frozen prototype.
  - Fixed here as SES does: the lockdown turns `Error.prototype.message` and `.name` into accessors
    whose setter defines the property on the error itself (`LOCKDOWN` in `src/boundary.ts`). The
    property test covers it: a write to `Error.prototype.message` is refused, and the host message
    arrives.
  - Any production lockdown needs the same taming, or a host-error path that does not assign.
- **quickjs-wasi copies a host Error's `.stack` into the guest** (`newError(Error)`). With the
  taming in place that assignment would succeed, so the wasi host throws the message string
  instead (`src/sandbox-wasi.ts`). Host file paths would otherwise reach blueprint code.
- **quickjs-wasi duplicates a callback's returned handle.** The host's own copy must be freed, and
  the host does it by running each call inside `vm.withScope`. Without that, every returned value
  leaks a heap box until the VM is disposed.
- **Tails.** Both runtimes have occasional single samples far above their p95. Examples: the
  quickjs-wasi JSON command max of 41.7 ms against a p95 of 3.93 ms in Chromium, and
  quickjs-emscripten's `rect` max of 76.6 µs per call against a p95 of 7.18 µs in Firefox. They are probably GC pauses in the worker or the battery governor; the
  spike does not show which. quickjs-emscripten's p95 runs higher in Chromium on most kinds.

## What this spike does not show

- AC-power numbers, other machines, or Safari/WebKit.
- Real geometry. The host operations are cheap stand-ins, so in the real model the host's own work
  will dominate any call that does real geometry, and the runtime differences above will matter
  less.
- Other designs for quickjs-emscripten that might cut its per-call overhead, none of them measured:
  - several blueprints as contexts in one runtime, instead of a runtime each;
  - its lower-level FFI;
  - caching property-key handles for native results.
- quickjs-wasi with cached key handles, or a binary result encoding.
- More than one blueprint per command, a command that mixes blueprints, or a blueprint larger than
  the 10-call key. Memory is measured for copies of the key blueprint only; larger sources will
  use more QuickJS heap.
- Behaviour under memory pressure. When quickjs-emscripten's shared memory grows (seen between
  50 and 100 blueprints), it never shrinks back, and that was not measured over a long session.
- Spike 16's recovery paths (a promise job left pending, a WASM trap, the spare VM). The hosts
  here report a pending job but do not rebuild, and quickjs-wasi has no spare VM.
- Whether QuickJS-NG and bellard QuickJS behave the same for blueprint code beyond what the
  property test checks.
- The step budget's behaviour with host calls. The microbenchmarks raise the budget to 10^6
  interrupt-handler calls, and the last key call of every command run used 0 handler calls
  (`stepsLastKey`).
