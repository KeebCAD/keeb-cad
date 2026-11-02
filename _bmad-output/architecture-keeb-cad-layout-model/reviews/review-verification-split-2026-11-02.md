---
title: 'Verification review: spine package split 2026-11-02'
reviewer: verification lens (subagent)
date: '2026-11-02'
spine: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
diff: working tree against 6694ab6 (spine; memlog entries read for rationale)
verdict: PASS WITH FIXES. Every library version is current and every browser claim the diff relies on holds in Chromium and Firefox. But the one browser fact the diff states as a rule ("a Vue ref() crosses structured clone silently") holds only for Vue 3.5. The design-seq gate and the stale reply the diff adopts are not the gate the spike tested. And `schema`'s "exports no function" lint clashes with its own `ref(kind)` factory and with Valibot's `v.lazy`.
---

# Verification review: package split 2026-11-02

Scope: every decision the diff touches that names how a library or the browser behaves, and whether each was checked or only asserted. The spine was not edited.

## Method

- Read `git diff` of the spine and the new memlog entries (package-split party).
- **Re-ran the spike.** I checked out `spike/messaging` 0f0539a in a scratch worktree (since removed), installed the frozen lockfile and ran `vitest run` for `spikes-messaging`. Versions: Vitest 5.0.5, Playwright 1.64.1, headless Chromium and Firefox, `@vue/reactivity` 3.5.44, birpc 4.2.0, @moeru/eventa 1.0.2. Result: 100 passed and 4 failed. The 4 failures are the eventa top-level `reactive()` cases, which fail by design, as the commit message says.
- **Node 26.12.1 (V8) probe** of `structuredClone` over Vue values, for 3.5.44 and for 3.6.0-rc.14. The script is `/tmp/claude-1000/-home-ruyu-projects-keeb-cad/53433310-46d4-4fed-a71a-52dc5da02314/scratchpad/refcheck.mjs`.
- **npm registry** (`npm view`, 2026-11-02): latest versions, publish times and licences.
- **Immer 11.2.9 typings:** read `dist/immer.d.ts` from the packed tarball.
- **Web sources:**
  - MDN, `MessagePort.start()`: https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/start
  - MDN, structured clone algorithm: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
  - Valibot `lazy`: https://valibot.dev/api/lazy/
  - flatbush releases: https://github.com/mourner/flatbush/releases

## Evidence table: browser claims the diff relies on

| Claim (AD-11, `messaging`) | Evidence | Status |
| --- | --- | --- |
| A `reactive()` proxy fails to post | Spike: `DataCloneError` in Chromium and Firefox, over a Worker and a port. The hand-rolled candidate throws synchronously; birpc rejects the promise. eventa lets a top-level proxy through, because it shallow-copies the body. | **Verified** |
| Nested `reactive()` and functions fail | Spike: `DataCloneError` for all three candidates in both browsers. MDN says the same for functions. | **Verified** |
| "A Vue `ref()` crosses structured clone silently" | Spike: `ref(1)` posts with no error in both browsers (`sent=1`), under Vue 3.5.44. My probe shows it is version- and value-dependent (see V1). | **Verified for 3.5.44 only; overstated as a rule** |
| A MessagePort listened to with `addEventListener` delivers nothing until `start()` | Spike pitfall test passes in both browsers. MDN: "only needed when using addEventListener; it is implied when using onmessage". | **Verified** |
| Transferred buffers detach in the sender | Spike: the worker's `byteLength` after the post is `[0, 0]`, and main receives 16 and 4096 bytes intact, in both browsers. | **Verified** |
| Hand-rolled is at least as good as birpc and eventa | Spike bench, 1000 transferred 1 MB posts over a Worker. Hand-rolled: 25 ms (Chromium), 48 ms (Firefox). birpc: 33 ms and 66 ms. eventa: 42 ms and 77 ms. birpc passes every functional check too. | **Verified (indicative), with a caveat (V4)** |
| The design-seq gate (`design` and `patches` need a seq greater than the latest; other kinds need at least the latest) | The spike's `StaleGate` is different: each kind is tracked separately and must be strictly newer. | **Not tested (V2)** |
| A typed `stale` reply, and main rejecting every pending request on a worker restart | Not in the spike. The spike's hand-rolled worker drops a stale query silently, so its caller would hang. | **Not tested (V2)** |
| The deep plain-value check catches what structured clone lets through | Not in the spike. It is a new mechanism. | **Asserted (V1, V5)** |

## Library versions (npm, 2026-11-02)

| Library | Spine | Latest on npm | Licence | Status |
| --- | --- | --- | --- | --- |
| immer | ^11.2.9 | 11.2.9 (2026-10-22) | MIT | Current. 11.2.9 exports `Immer` (constructor `{ autoFreeze }`), `enablePatches`, `freeze(obj, deep)`, `castDraft`, `Draft`, `Immutable`, `applyPatches`, so the AD-2 wording fits. |
| valibot | ^1.5.0 | 1.5.0 | MIT | Current. `v.check`, `v.custom`, `v.metadata` and `v.lazy` exist (V3). |
| @vue/reactivity / vue | 3.5.44 (catalog `&vue`) | latest 3.5.44; rc 3.6.0-rc.14 | MIT | Current. 3.6 is at release candidate, and it changes V1's result. |
| flatbush | 4.6.2 | **4.7.0 (2026-10-30)** | ISC | One minor behind. 4.7.0 adds `collides()` and fixes `Flatbush.from` for node sizes above 65535, with no breaking change. The diff newly names flatbush as a `drc` dependency. |
| quickjs-wasi | 3.6.3 (exact) | 3.6.3 (2026-10-19) | MIT | Current. The VM pool moving to `blueprint/worker` adds no runtime claim; it is WASM in a worker either way. |
| makerjs | 0.19.2 | 0.19.2 | Apache-2.0 | Current; the diff does not touch it. |
| clipper2-ts | 2.0.1-18 (exact) | 2.0.1-18, and `2.0.1` is still listed | BSL-1.0 | Current. The pin's reason still holds. |
| @bgotink/kdl | 0.4.1 | 0.4.1 (2026-10-13) | MIT | Current. It moves to `design-file`, main only, which makes no new runtime claim. |
| replicad | 1.2.0 | 1.2.0 | MIT | Current. |
| birpc | not adopted (spike 4.2.0) | 4.2.0 (2026-08-19) | MIT | The spike used the latest. |
| @moeru/eventa | not adopted (spike 1.0.2) | 1.0.2 (2026-09-29) | MIT | The spike used the latest. |

## Findings

### High

None.

### Medium

**V1. "A Vue `ref()` crosses structured clone silently" is a 3.5 detail; the stable hazards are `shallowRef`, class instances and some built-ins.**

`structuredClone` results:

| Value | Vue 3.5.44 (V8, plus the spike in both browsers for `ref(1)`) | Vue 3.6.0-rc.14 (V8) |
| --- | --- | --- |
| `ref(1)` | crosses as `{dep, __v_isRef, _rawValue, _value}` | **throws `DataCloneError`** |
| `ref({a:1})` | throws (`_value` is a reactive proxy) | throws |
| `shallowRef({a:1})` | **crosses silently** | **crosses silently** |
| `computed(...)` | throws | throws |
| `readonly({})` | throws | throws |
| `markRaw({})` | crosses as plain | crosses as plain |
| class instance with a getter | crosses, loses its prototype and getter | same |
| `Map`, `Date` | crosses (a `Map` prints `{}` in JSON but is cloned as a Map) | same |
| `{ u: undefined, n: NaN }` | crosses; the key is kept; JSON shows `null` | same |

Why it matters here: the design is held in a **`shallowRef`** on main. Posting the ref instead of `.value` is exactly the slip this rule exists to catch, and it crosses silently on every Vue version tested. The rationale should name that case, not `ref()`, which will start throwing under 3.6.

The check also needs a written definition of "plain", or it will be implemented two ways. Decide whether `Map`, `Set`, `Date` and class instances are rejected, and whether `ArrayBuffer` and typed arrays are allowed only in the transfer list. MDN confirms structured clone accepts `Map`, `Set`, `Date`, `RegExp` and `Error`, and drops prototypes and getters.

Fix: reword AD-11's last bullet to "a `shallowRef` (and, in Vue 3.5, a `ref()` holding a primitive), a class instance or a `Map` crosses structured clone silently, so this check is the guard". Then add one sentence defining "plain": JSON-shaped data, plus `ArrayBuffer` and typed arrays.

**V2. The gate and the stale reply the diff adopts are not what the spike tested.**

The memlog says the hand-rolled design is "confirmed by spike 0f0539a". The spike confirmed:
- the transport,
- transfer and detaching,
- proxy rejection,
- `start()`,
- concurrent request matching,
- a per-kind, strictly increasing stale gate.

AD-11 adopts something else:
- one design-seq gate per receiver, where non-design kinds pass at `>=` the latest design seq,
- epoch drop,
- a typed `stale` reply,
- rejecting all pending requests on a worker restart.

None of these was run. The spike's own hand-rolled worker shows the failure the new rule prevents: a dropped stale query never gets a reply, so its caller hangs.

The logic is sound, but it is asserted. Fix:
- say "transport confirmed by the spike; gate and stale reply new, proven by `messaging`'s tests" rather than "confirmed",
- add both cases to `messaging`'s first story: a `>=` boundary test, and a pending request rejected on restart.

### Low

**V3. `schema`'s "exports no function and holds no function outside a schema" clashes with Valibot and with the spine's own API.**
- `ref(kind)` is a shared kind (AD-24, Data Schema line 685: "`ref(kind)` adds `v.metadata({ refKind })`"). It is an exported function in `schema`.
- The recursive layout tree needs `v.lazy(() => NodeSchema)`, a getter function. Valibot's docs make `v.lazy` the only way to build a recursive schema.

The lint as worded allows only `v.check` and `v.custom`, so it would flag both. Fix: allowlist `v.lazy` getters and schema factories (`ref(kind)`), or make `ref` a set of precomputed constants. Prove the allowlist with the violation fixture already planned.

**V4. Why birpc was rejected is not recorded.** birpc 4.2.0 passed every functional check in both browsers and was about 30% slower on the indicative bench. The diff says only "Q9 stands; no RPC library". eventa's rejection has a clear measured reason: it shallow-copies the body, so a top-level proxy crosses. birpc has none beyond Q9's earlier reasoning. Fix: one clause in the memlog, for example "birpc works but adds a dependency for request ids we need anyway, and rejects rather than throws". This guards against a later reviewer reopening it.

**V5. The cost of the deep plain-value check is unmeasured.** That is correctly an Open Question. Note, though, that the `design` message carries the whole design (on load and on restart) and runs the walk in dev on every send. The spike's bench did not include it. Measure it when the check is built, at about 10× the Corney design, as the transport spike did.

**V6. flatbush is one minor version behind.** 4.7.0 (2026-10-30) adds `collides()`, an early-exit box test that suits `drc` clearance pre-checks. It is not breaking. Bump the row when `drc` is first built and re-date the stack note. No decision depends on it.

**V7. The `Mutable<T>` / `Writable<T>` relationship is not checked.** Domain operations take `Mutable<Design>`, and an apply step receives Immer's `Draft<Design>`. Whether `Draft<Frozen<Design>>` is assignable to `Mutable<Design>` depends on how `Mutable` is defined, and that is left open (Open Questions). Add it to that Open Question's resolution: one type test that an apply step's draft can be passed straight to a domain operation.

## Verified with no finding

- **Immer API names** in AD-2 (`new Immer({ autoFreeze: true })`, `enablePatches()`, `freeze(value, true)`, `castDraft`, `Draft`, `Immutable`) all exist in 11.2.9's typings.
- **DataCloneError timing:** a raw `postMessage` throws synchronously, so the hand-rolled `send` can turn it into a throw with the offending path. birpc turns it into a rejection, which matches the spine's choice to throw in `send`.
- **Optional `start()`:** `Worker` and the worker global have no `start()`; only `MessagePort` does. The spike's optional `ep.start?.()` handles both, matching "the port's `start()`".
- **Fit of the package moves** (`design-file` with `@bgotink/kdl` main only; `blueprint/worker` with quickjs-wasi in the case worker; `drc` with flatbush) adds no browser or library behaviour beyond what earlier verified reviews covered.

## Not checked

- Firefox for the Vue 3.6 and `shallowRef` probe. That was V8 only; the spike covered `ref(1)` in both browsers under 3.5.
- Vue production builds under 3.5. The 3.5 probe ran the development CJS build. The 3.6 probe used `NODE_ENV=production`. The internals differ, which is one more reason V1's rationale should not rest on `ref()`.
