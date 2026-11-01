# Verification review: AD-11 model-worker change (2026-11-01)

Lens: was each committed decision in today's change checked against reality (installed packages, the web, a real browser), or asserted from memory? Scope: the diff in `spine-ad11.patch` (Paradigm, glossary, AD-2 Writing/Patches/Undo, AD-10, AD-11, AD-22, Conventions, Stack, layout, Open Questions, Deferred). The spine was not edited.

**Verdict: the browser-behaviour premises hold (all six were checked in Chromium 156 and Firefox 157). The change has one rule conflict that the repo's own lint will catch: the worker must import Immer to apply patches. Two smaller gaps are untested: transferred buffers that are still held in the worker, and patch size and hashing cost on main.**

## How each fact was checked

| # | Claim the change relies on | Checked how | Result |
|---|---|---|---|
| 1 | Messages on one port arrive in order | Real browser: Playwright 1.64.1 (repo's copy) running Chromium 156.0.8078.4 and Firefox 157.0. Worker A posted 5000 numbered messages over a MessageChannel port to worker B, and B checked the sequence | **True** in both browsers (also in the HTML spec: each port has one message queue). Note: there is no order *across* ports. Case results that reach main directly can overtake model-worker posts, so the revision tags are what keep this correct, not arrival order |
| 2 | MessageChannel between two dedicated workers, and how the ports are handed over | Same run: main makes the channel and transfers `port1` to A and `port2` to B (`postMessage(null, [port])`) | **Works** in both. The spine doesn't say who creates the case and routing workers (main, or the model worker as nested workers) |
| 2b | Nested dedicated workers (if the model worker spawns them) | Real browser test, plus MDN BCD via web search | Work in Chromium and Firefox. Safari support is partial (MDN BCD gives 15.5 or 16.4, and WebKit bug 255637 reports a problem in 16.4). Safari is not in the test matrix |
| 3 | Structured clone does not keep frozenness | Browser: posted `Object.freeze({a: Object.freeze({b:1})})` to a worker. Node: `structuredClone` of Immer patches | **True.** The receiver gets unfrozen objects at every depth. The mirror is frozen again only if the worker freezes it (see 5) |
| 4 | Transferred ArrayBuffers are detached on the sender | Browser: the worker transfers a `Float64Array`, then reports `buffer.byteLength` and `buffer.detached` | **True**: `byteLength 0`, `detached: true`, receiver length 1000, in both browsers |
| 5 | Immer patches from a dedicated `new Immer({ autoFreeze: true })`, and what `enablePatches` requires | Installed `immer@11.2.9` (`node_modules/.pnpm/immer@11.2.9`), its `.d.ts` and `dist/immer.mjs`, and a Node script. npm registry: 11.2.9 is the latest (2026-10-22). Immer docs page on patches | `produceWithPatches`, the `produce` patch listener and **`applyPatches` all throw** "plugin for 'Patches' has not been loaded" until `enablePatches()` runs. The plugin registry is **module-global** (`var plugins = {}` in `immer.mjs`), so one `enablePatches()` call covers every instance, including a dedicated one. With patches on, `inst.applyPatches` on a structured-cloned base reproduced the main result exactly, and the result came back deep-frozen |
| 6 | Vue / `@vue/reactivity` works in a Web Worker without a DOM | Scanned `@vue/reactivity@3.5.44` and `@vue/shared@3.5.44`: the only global access is a `globalThis`/`self`/`window` fallback chain. Ran the `reactivity.global.prod.js` build in a real worker in both browsers | **Works**: `shallowRef` → `computed` → `effect` ran `[2, 10]` with `typeof document === 'undefined'`. 3.5.44 is the latest on npm (2026-10-13) |
| 7 | Structured clone vs transfer costs; transfer cost does not grow with size | `stage-transport-verdict-2026-11-01.md` (spike on `archive/spike-stage-transport`) | Measured, but on battery. The spine already defers absolute budgets until the AC re-run (Open Questions). Good |
| 8 | Version pins in Stack (immer ^11.2.9, Vue 3.5.44) | `npm view` on 2026-11-01, `pnpm-workspace.yaml`, lockfile | Current |

Not checked here: the 100 ms target (a product decision, deferred to measurement) and the 70 ms makerjs offset figure (it predates this change).

## Findings

### F1. The worker needs Immer to apply patches, but the fence forbids it (high)

- **Where:** AD-2 *Writing* ("The register's file is the only `produce` call and the only import of `immer`"), AD-11 *The design mirror* ("The worker applies them in order"), and Stack (immer "`model`'s register only").
- **Problem:** Immer patches are applied with `applyPatches`, which needs `enablePatches()` to have run in the *worker's* module graph. The registry is per realm, and the worker is a separate realm. So the worker must import `immer`. That breaks the fence, which `.dependency-cruiser.mts` enforces as `only-register-imports-immer` ("Only model's register concept imports immer."). It also breaks the "register concept" boundary: the register lives on main, while the applier lives in the worker. Main needs `enablePatches()` too, and the spine doesn't say so.
- **Evidence:** a Node run against the installed 11.2.9: `applyPatches` without `enablePatches` throws `[Immer] The plugin for 'Patches' has not been loaded`. In `dist/immer.mjs:227`, `var plugins = {}` is module-level.
- **Fix (a question for Sergii, not an autofix):** pick one.
  - (a) Widen the fence to a named second file, the worker's patch applier in `model`'s register concept, which calls `enablePatches()` and uses a dedicated `new Immer({ autoFreeze: true })`. Update the dependency-cruiser rule and Stack's "register only".
  - (b) Write an own patch applier (no Immer in the worker). Immer's patch format is small (`add`/`remove`/`replace`, array paths).

  Either way, state that main's register calls `enablePatches()` once.

### F2. Transfer detaches buffers the worker may still hold (medium)

- **Where:** AD-11 *Stage outputs* ("Geometry travels in transferred typed-array buffers") and *Background* ("`pipeline` keeps the last good output…"). The case version of this is already an Open Question; the live-stage version is not.
- **Problem:** a transferred buffer becomes zero-length in the worker. If a live stage's computed value, the last good output, a cache entry, or a stage-to-stage flow (plates → case, every output → exports) refers to the same buffer that was posted, it silently becomes empty after the first post. The spike verdict suggests "a stage could write straight into the arrays and skip packing", and doing that would cause exactly this.
- **Evidence:** in the browser test, `byteLength 0` and `detached: true` on the sender, in Chromium 156 and Firefox 157.
- **Fix:** add one rule line: "The worker transfers only buffers packed for that post. No computed, cache or last-good output holds a transferred buffer." Either widen the existing case Open Question to all stage posts, or add a crossing test that posts twice and reads the worker's copy after the post.

### F3. Immer array patches are positional and not minimal, and hashing on main is unmeasured (medium)

- **Where:** AD-11 *The design mirror* ("patches … tagged with … the hash of the resulting design") and AD-2 *Patches to the model worker*.
- **Problem:**
  1. Deleting an early item from a list section makes Immer emit a `replace` with the whole record for every shifted index, not one `remove`. The Immer docs say patches are not guaranteed minimal. Payload size and worker apply time therefore grow with list length for deletes and reorders. The spike didn't measure this, because it measured stage outputs, not patches.
  2. Hashing "the resulting design" on main after every command is O(design) work on the UI thread unless it is incremental over structural sharing. Nothing measured it.
- **Evidence:** a Node run with 11.2.9: `splice(1,1)` on `[a,b,c]` plus a push gave `replace [slots,1] {c}` and `replace [slots,2] {z}`.
- **Fix:** state how the hash is computed (for example, per-record hashes cached by reference, combined per section). Add both costs (patch size and apply time for a 10× layout delete or reorder, and the main-thread hash time) to the AC re-run spike before the 100 ms visible-stage target relies on them.

### F4. Who creates the case and routing workers, and Safari (low)

- **Where:** Paradigm ("fed by `pipeline` over MessageChannels"), AD-11 *Background*, and the deployment diagram (`MW -->|MessageChannel| W1`, `W1 -->|CaseOutput bodies| E`).
- **Problem:** both topologies work in Chromium and Firefox (both tested). If the model worker creates the background workers as nested workers, Safari support is partial (MDN BCD: 15.5 or 16.4; WebKit bug 255637). If main creates them and hands one port to the model worker, there is no nested-worker dependency, and main can terminate the case worker directly to cancel it, which AD-11 relies on ("its cancel is a terminate").
- **Fix:** state that main creates all three workers and hands the model worker one MessageChannel port per background worker. If the model worker must own them, say that and record the Safari scope.

### F5. Vue in the worker works, but the dev-flag build isn't stated (low)

- **Where:** AD-10 *One reactive graph, in the model worker*, and Conventions *Recompute debugging* (onTrack/onTrigger only outside production).
- **Problem:** the recompute trace relies on the `esm-bundler` build's `process.env.NODE_ENV` check being replaced in the *worker* bundle as well. This is very likely with Vite's `define`, but no worker build was run here.
- **Fix:** none needed in the spine. Add a check to the first story that builds the model worker: the trace fires in a dev worker build and is stripped in a production one.

## What was verified and holds

- Order on one port, MessageChannel between dedicated workers, loss of frozenness across clone, transfer detaching the sender's buffer, and `@vue/reactivity` without a DOM: all **confirmed in a real browser** (Chromium 156, Firefox 157), not just asserted.
- A dedicated `new Immer({ autoFreeze: true })` instance can produce patches, and its `applyPatches` gives a deep-frozen result equal to main's, once `enablePatches()` has run in that realm.
- immer 11.2.9 and Vue / `@vue/reactivity` 3.5.44 are the current npm releases.
- The spine correctly holds back absolute transport numbers until the AC re-run.

## Evidence scripts

- Node Immer checks: `/tmp/claude-1000/-home-ruyu-projects-keeb-cad/f71ac326-cea0-44d0-9118-54e5ad50d413/scratchpad/chk/immer.mjs` and `/tmp/claude-1000/-home-ruyu-projects-keeb-cad/f71ac326-cea0-44d0-9118-54e5ad50d413/scratchpad/chk/ap.mjs`
- Browser checks: `/tmp/claude-1000/-home-ruyu-projects-keeb-cad/f71ac326-cea0-44d0-9118-54e5ad50d413/scratchpad/chk/browser.mjs`

## Sources

- [Immer: Patches](https://immerjs.github.io/immer/patches/)
- [MDN browser-compat-data, Worker.json](https://chromium.googlesource.com/external/github.com/mdn/browser-compat-data/+/73d346309ee9d8be7e32fda8ff574d4c79dd4c51/api/Worker.json)
- [WebKit bug 255637: creating a sub-worker in a worker is not supported](https://lists.webkit.org/pipermail/webkit-unassigned/2023-May/1105462.html)
- [web-features: dedicated workers](https://web-platform-dx.github.io/web-features-explorer/features/dedicated-workers)
