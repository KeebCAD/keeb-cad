# Reality review: spine batch update 2026-11-07

Scope: the uncommitted spine diff (kernels may import `result`; quantity schemas and metadata; LibraryData; crash-cap failed state; reset-save failure; unresolvable anchors; rejection kinds; worker format) and the last memlog decisions. Every claim was checked against installed code (valibot 1.5.0, vite 8.3.5, rolldown 1.2.15, playwright-core 1.64.1), the repo, or the web. Two prototypes were run in the scratchpad (a valibot type-check and runtime check; a Vite build of a worker in both formats).

Verdict: **sound, with fixes.** No claim is false in what it predicts. One rule change is owed by code and a ticket (F1), one owner/location is wrong (F3), and a few lines are stale or imprecise.

## Confirmed

- **valibot getMetadata merges nested pipes depth-first.** `valibot/dist/index.mjs:4355-4365`: `depthFirstMerge` recurses into every pipe item that is a schema with a `pipe` (the first item of `v.pipe(inner, …)` is `inner`) and `Object.assign`s each metadata action in order, so later (outer) keys override earlier (inner) ones. The `.d.mts` (line 1326-1337) documents "shallowly merges them using depth-first search". Runtime prototype: `v.getMetadata(v.pipe(quantity('mm'), v.metadata({ quantity: 'length' })))` returned `{"expression":true,"unit":"mm","quantity":"length"}`. Keys `expression`, `unit`, `quantity` do not collide.
- **`quantity` declared as `v.GenericSchema<string, Quantity<U>>`** compiles with a single `as` cast (no `as unknown as`), works as the first item of `v.pipe`, inside `v.strictObject` and under `v.optional`; `v.InferOutput` gives `Quantity<'mm'>` (and `Quantity<'mm'> | undefined` for optional), `v.InferInput` gives `string`, and an Angle field does not assign to a Length field (`@ts-expect-error` held) — tsc 6.0.3, strict, `exactOptionalPropertyTypes`. Runtime: `{ x: '19mm', r: '15deg' }` parses, `{ x: '19deg', … }` is refused by the check.
- **No clashing symbols.** `packages/schema/src` has no `unit`, `quantity`, `Expression` or `expressionSchema` yet; `packages/expr/src/index.ts` and `packages/library/src/*.ts` are `export {}` stubs. Existing metadata keys are only `node` and `flatten` (`packages/schema/src/layout.ts:6,24,28,33`, `fingerprint.ts:8`), read by design-file's codec (`packages/design-file/src/codec/schema-fields.ts:39-41`, `types.ts:28-31`). The codec's `fieldForm` sees a quantity schema's `type` as `string` (the pipe spreads its root schema), so it writes it as a value: no codec change needed.
- **Vite: iife inlines, es splits.** Built a worker with `import.meta.glob('./scripts/*/*.js', { query: '?raw', import: 'default' })` over three versions: `worker.format: 'iife'` emitted one worker file holding all three scripts (no error); `'es'` emitted one chunk per version, each `export default "<file text>"`, loaded by `import("./1.0.0-….js").then(m => m.default)` (strings). Docs: https://vite.dev/config/worker-options (`'es' | 'iife'`, default `'iife'`), https://vite.dev/guide/features (glob "lazy-loaded via dynamic import and will be split into separate chunks during build"; `query: '?raw', import: 'default'` example).
- **Module workers and dynamic import in workers.** MDN browser-compat-data (`api/Worker.json`, `javascript/operators/import.json`): `new Worker(url, { type: 'module' })` Chrome 80, Firefox 114; dynamic `import()` in workers Chrome 80, Firefox 114. The test browsers are Chromium 156.0.8078.4 and Firefox 157.0 (`playwright-core@1.64.1/browsers.json`).

## Findings

### F1 — Medium — the kernel → `result` rule is not in the code and not yet owed by a ticket

- **Claim (AD-10 line 328, Structural Seed):** every kernel but `result` may import `result`; dependency-cruiser gives kernels `result` as their one allowed target.
- **Evidence:** `.dependency-cruiser.mts:6` says "The eight kernels import no workspace package at all"; `allowedTargets` (`.dependency-cruiser.mts:112-117`) returns `[]` open kernels for a kernel and `GRAPH`'s kernel rows are `[]` (`:26-33`). `tooling/ad10/rules.spec.ts:137-142` asserts `allowedTargets('geometry')`, `('di')`, `('reactive')`, `('result')` all equal `[]`. 13.17's ticket still carries the question as an `unknown` (`tickets/epic-see-corneys-keys/tickets/tickets.toml:42`). The guard asks before edits to `.dependency-cruiser.mts` (23.x deferred-work ticket, `tickets/epic-a-new-design-opens/tickets/tickets.toml:125`).
- **Fix:** 13.17's ticket (the first kernel to import `result`) owes: `allowedTargets` giving every kernel except `result` the target `result`; the KERNELS doc comment; `rules.spec.ts:137-142` rewritten (kernels get exactly `['result']`, `result` gets `[]`); a violation proving a kernel importing `di` or `reactive` still fails; each kernel's `package.json` adds `@keeb-cad/result` when it uses it. Hand this to the ticket reconcile.

### F2 — Low — two AD-10 lines now contradict the kernel line

- **Evidence:** spine line 330: "Any package may import `di`'s Vue-free root: dependency-cruiser allows it from every package" — false for kernels, and the Structural Seed now says "any package but a kernel". Line 350: "`ui` … imports no workspace package" — the Seed now says `ui … imports: result`.
- **Fix:** line 330 "every package but a kernel"; line 350 "imports only `result`" (or "no workspace package but `result`").

### F3 — Medium — `worker.format: 'es'` is needed before 13.21, and in two config files

- **Claim (Data Schema LibraryData note):** "One chunk per version needs Vite's worker.format 'es' …; 13.21 sets it." Memlog: "Workers are already module workers".
- **Evidence:** `app/vitest.config.ts:6-7` already sets `worker: { format: 'es' }` because "The model worker's start file awaits at top level, which only an ES module worker can". `app/vite.config.ts` (the production build) sets no worker format, so it defaults to `'iife'`. No production code spawns the model worker yet: the only `new Worker(…, { type: 'module' })` is in `app/src/model-worker-entry.spec.ts:25`. A Vitest config file does not inherit `vite.config.ts` (the app keeps them separate).
- **Fix:** state the format as a property of every worker build, owned by the first story that spawns the model worker in the production app (it already needs it for top-level await), set in `app/vite.config.ts` beside the existing `app/vitest.config.ts` line; 13.21 then only adds the per-version chunk test. Reword "already module workers" to "the model worker is spawned as a module worker (so far only in its entry spec)".

### F4 — Low — the cited Vite source line is the main build, not the worker build

- **Evidence:** `vite/dist/node/chunks/node.js:34780` is in the environment build's `buildOutputOptions` (main bundle). Workers are bundled by `bundleWorkerEntry` (`node.js:26129-26181`), which calls `bundle.generate({ …workerConfig, format })` with no `codeSplitting`; rolldown itself inlined the dynamic imports for iife in the prototype. The conclusion holds; the citation does not.
- **Fix:** in the memlog, cite `node.js:26173-26181` plus the prototype build, not 34780.

### F5 — Low — "a second version's script is its own chunk" can only be tested on a build

- **Evidence:** chunks exist only in `vite build` output; Vitest browser mode serves modules through the dev server, unbundled (Vite features page: workers in dev "rely on browser native support").
- **Fix:** 13.21's test runs a build (Vite's `build()` API in a Node spec, or a check on `app/dist`'s manifest) and asserts two version files land in two chunks and not in the worker entry. Say so in the ticket so it isn't attempted in browser mode.

### F6 — Low — `?raw` returns file text verbatim

- **Evidence:** the prototype chunk is `export default "<exact source>"`: no transpile, no bundling of the file's imports.
- **Fix:** the glob must target the library build's self-contained compiled scripts (BP-7: "bundled, no imports"), never `library/blueprints-src/*.ts`. One clause in 13.21.

### F7 — Low — typed `v.getMetadata` sees only the outermost key

- **Evidence:** `InferMetadata` (`index.d.mts:1318-1324`) recurses only through `SchemaWithPipe`; `GenericSchema` hides `quantity`'s inner pipe, so `v.getMetadata(lengthSchema)` types as `{ readonly quantity: 'length' }` (tsc error message in the prototype), while runtime holds `expression` and `unit` too.
- **Fix:** none for the spine (the walk is generic and the wrong-unit check reads `u` in its closure). A spec should assert runtime metadata as a whole value, not rely on the inferred type.

### F8 — Low — `DeclaredInput.unit` "required when kind is 'quantity'" is not expressed by the type

- **Evidence:** spine line 887-896 keeps `unit?: Unit` on one flat object type.
- **Fix:** say how the schema enforces it (a `v.variant` on `kind` with `unit` required in the quantity variant, or a check), or the rule exists only in a comment.

### F9 — Info — a failed dynamic import was cached before Chrome 156 / Firefox 155

- **Evidence:** BCD `javascript/operators/import.json`, "Retriable loading (HTTP errors not cached)": Chrome 156, Firefox 155. Before those, a rejected `import()` of a URL stays rejected in the module map until reload, so the memlog's "a failed load is not cached, rerun later" holds only from those versions (the test browsers, 156/157, are past them).
- **Fix:** none needed while the supported matrix is "current Chromium and Firefox"; note it in the Deferred supported-browser-matrix row if older browsers are ever supported.
