# Review: `result` kernel amendment (spine diff, 2026-11-03)

Scope: the working-tree diff to the spine (Result/Option as classes from a new kernel package `result`, ported from obsidian-journal `src/infrastructure/result`). Line numbers refer to the spine with the diff applied. Nothing in the spine was edited.

Verdict: sound direction, but not consistent yet: the old plain `Result` is still defined in `schema` in four places, the AD-10 counts and kernel list were not updated, and the "never crosses a thread" guard is dev-only while a class instance survives structured clone silently.

## Findings, ranked

### F1. `Result` is still a `schema` export in four places (high)
- L327 (`schema` bullet): "generic type helpers (`Quantity`, `Result`, `Frozen`, ...)".
- L646 (Shared kinds): "`SchemaIssue` and `Result`, beside `Frozen`...".
- L755 (Data Schema trailer): "Revision, Result: 23.2".
- L1043 (tree comment for `schema`): "generic type helpers (Quantity, Result, Frozen, Mutable, ...)".
- L644 and L718 were fixed, so the spine now says both things.

Adversary pair: the 23.2 schema story follows L646 and hand-declares `Result<T,E>` in `schema` (that is what the spine told it to do). The `design` story follows L203/L645 and imports the class `Result` from `result`. Each obeys every AD it reads, yet `change`'s return type is not assignable to `schema`'s `Result`, and `.ok` vs `.kind`/`.isOk()` differ.

Suggested edits: delete `Result` from L327, L646, L1043; at L755 replace "Revision, Result: 23.2" with "Revision: 23.2". At L646 write: "... `SchemaIssue`, beside `Frozen` and `Mutable` ...". No remaining `ok: true`, `{ ok:`, `.ok` or `value: undefined` occurrences exist in the spine (grep clean).

### F2. AD-10 counts and kernel list not updated (high)
- L321 and L667: "28 workspace packages plus `fixtures`" becomes 29.
- L322: "**Seven packages import no workspace package** ..." lists `expr, reactive, messaging, hashing, geometry, di, ui`; `result` is an eighth. The new L325 bullet and the tree entry say "imports: none", so the two contradict.
- `.dependency-cruiser.mts` `GRAPH` table and `tooling/ad10/rules.spec.ts` need `result` as an any-package-may-import target, like `di`; `sh tooling/verify-checks.sh` rule names go stale silently (AGENTS.md).

Suggested wording L322: "**Eight packages import no workspace package**, each one concept: the kernels `expr` ..., `di` ..., `result` (Result, Option, AsyncResult and `attempt`, AD-24) and `ui` (AD-26)." L321/L667: "the 29 drawn in AD-10".

### F3. The "no Result/Option crosses a thread" guard is weaker than the claim (high)
- L416/L645 say `messaging`'s plain-value check "throws on a class instance". But L420 says the check is dev/test only, production undecided (Open Questions L1179), and that "a class instance ... crosses silently". `structuredClone` of an `Ok` arrives as `{ kind: 'ok', value }` with no prototype: in production `.map`/`.match` is `undefined` at runtime, a late failure.
- `AsyncResult` is a `PromiseLike`: a request handler that returns one is awaited by the dispatcher and the unwrapped `Result` instance is posted.
- The prose "each side wraps them locally" is unspecified for requests: what does a request/stale-rejection reply carry?

Suggested wording (add to L416 after "never a `Result` or an `Option` (AD-24)"): "A request handler returns a plain value and fails by rejection (stale, restart) or by posting a `Rejection`; the caller wraps the promise with `AsyncResult.fromPromise`. The deep check (below) rejects any value whose prototype is not `Object.prototype` or `null`, so a `Result`, an `Option` and an `AsyncResult` all fail it." Resolve the Open Question on the production check with this finding in mind (a `Result` in prod is a silent wrong shape, not a crash at the send site).

### F4. Option allocates per call: identity/cut-off hazard for computeds and stage outputs (medium)
The journal's `Option.some`, `Option.none`, `None` and `Some.map` allocate a new instance each call. A selector computed, a stage output or an input slice that returns `Option<X>` produces a new object on every recompute, so `Object.is` cut-off in the reactive graph and any identity-based cache sees a change every time; and `hash`/`messaging`/frozen-design code only accept plain data (a class instance in an input slice is not hashable by the canonical encoding). Two units (a selector in `model/worker` returning `Option<Key>` and a consumer comparing by reference) obey every AD and still rerender forever.

Suggested wording, extend L645: "`Option<T>` is for function returns and getters that are consumed immediately. A computed, a stage output, a posted value, a hashed value and anything stored in a ref keeps `T | undefined` / `?`: an `Option` is a fresh object per call, so it defeats identity cut-off and is not plain data (`hash` and `messaging` reject it)." Also say whether `None` is a shared singleton in the port (cheap fix: `Option.none()` returns one frozen instance).

### F5. `Option` rule vs remaining `| undefined` / `void` forms (medium)
- L208 "`run`'s optional `{ seq }`" is an optional parameter, not a return or getter; the rule at L645 says "(a return, a getter)" so it is probably exempt, but say so.
- L203 apply step stays `void | Rejection`; `checkInputs` changed from `Rejection | void` to `Result<void, Rejection>` (L328) while the apply step did not. Two shapes for "nothing or a rejection" in neighbouring sentences. Say that the apply step is exempt because it is the Immer producer's return.
- `ReadonlyRef<T>` (L721) is `{ readonly value: T }`: fine, but note that `T` may not be `Option` per F4.
- `Result.ok()` with no argument does not compile in the journal port (`ok<T>(value: T)`); `AsyncResult.ok()` has a void overload, `Result.ok` does not. The spine now has five `Result<void, ...>` returns (L203 x2, L328, L734). Add to the port: `ok(): Result<void, never>` overload, and say so in the package line, or units will write `Result.ok(undefined)`, `new Ok<void, E>(undefined)` and local helpers.

Suggested wording L645 end: "Optional parameters (`run`'s `{ seq }`) and the apply step's `void | Rejection` keep their forms; `Result<void, E>` is built with `Result.ok()`."

### F6. `result` and valibot (low; the rules survive)
- A type-only import of valibot does not break the npm rules: L350 now lists `result` among valibot importers, and `tsPreCompilationDeps: true` (`.dependency-cruiser.mts` L364) means type-only imports are seen, so the rule needs `result` in the allow-list for `valibot`. `schema` does not need `result` for any type.
- But the journal's `result.test.ts` imports valibot at runtime (`import * as v from "valibot"`), so `result` needs valibot as a real (dev)dependency via the catalog (journal uses ^1.4.2, spine ^1.5.0), and "imports: none" at L1039 is only true of workspace imports.
- `fromValibot`'s `mkErr` receives `readonly BaseIssue<unknown>[]`, not keeb-cad's `SchemaIssue`; every caller will write its own conversion. Name one owner (`schema`'s `toSchemaIssues`) or drop `fromValibot` from the kernel to keep it dependency-free (three lines at the two call sites in `design` and `design-file`).

## Where a Result could cross a boundary (checked)
- Worker request/response, posted outputs, derived files, stale reply, reject-on-restart: all plain by L416; see F3 for enforcement and the request case.
- `storage` load/save and `design-file`'s `migrateBundle` (L295, L1190 Open Question "migrateBundle returning a Result"): both run on main in one thread, so `Result` is allowed. The load failure value must stay a plain `LoadError`/`DesignInvalid` inside the `Err`; `Err.error` is data, the `Err` itself is never written. No spine text says `storage.load` returns a `Result`; when 23.3 decides it, it should say "`AsyncResult<Bundle, LoadError>`" on main only.
- `DesignInvalid` and `Rejection` carry `kind`; `Ok`/`Err` also carry `kind: 'ok' | 'err'`. No collision (nested), but a generic "has a `kind`" check on a value would misread a `Result` as a `Rejection`; keep `Err` unwrapped before posting.
- Immer/`change`: `Result<Changed, Rejection>` holds a frozen design inside a non-frozen wrapper; fine, the wrapper is never stored (L203 says no ref write on rejection).
- `Frozen<Result<...>>`/`Frozen<Option<...>>` over a class is legal TS (methods are untouched) but nothing in the spine needs it.

## Reality check on the journal module
Path: `/home/ruyu/projects/obsidian-journal/src/infrastructure/result/` (not on the spine's list of files; confirmed present).
- Provides: `Result` (type + `ok`, `err`, `fromThrowing`, `fromOption`, `fromValibot`), `Ok`, `Err`, `Option` (type + `some`, `none`, `fromNullable`), `Some`, `None`, `AsyncResult` (PromiseLike, `ok/err/fromResult/fromPromise`, `map/mapErr/tap/tapErr/flatMap/match`), `attempt` (+ `attempt.in`), `InvariantError`. Tests for each.
- `expectOk`/`expectErr` live in `testing.ts` and are NOT exported from `index.ts`. The spine does not name them, and the package closes its surface through `exports`; the port needs a `result/testing` subpath or a test-only copy, and the tests import it by relative path.
- Imports: only relative paths and `valibot` (types in `result.ts`, runtime in `result.test.ts`). No `@/` aliases anywhere in the folder (grep clean). The journal's own tsconfig sets `paths` and `composite` but the folder does not use them, so keeb-cad's composite packages without aliases are fine.
- Code needing a look on port: `declare readonly _phantomE` fields (needs `useDefineForClassFields`/`declare` support; fine under TS and esbuild), `#promise` private field with `private constructor`, journal target ES2018/lib es2021 vs keeb-cad's settings, double-quote style and journal-specific ESLint rules not carried. `Result.ok` has no zero-arg form (F5). `getOrUndefined` exists on Option; the spine should say it is the bridge to schema types.
- Tests run under vitest in node; AGENTS.md mandates browser mode only for DOM tests, so the `result` tests need a node project in the workspace config.
- Provenance: the spine says "ported with its tests" but gives no source commit (`option.test.ts` was edited on 19 Sep, the rest 11 Sep). Record the journal commit like the spine records `spike/messaging 0f0539a`.
- Idiom overlap: AGENTS memory says `ts-pattern` `match` is the repo's matching tool; `Result.match`/`Option.match` is a second idiom. Not a conflict, but one sentence on which to use for what.

## Adversary pairs summary
1. F1: `Result` from `schema` (L646) vs from `result` (L645).
2. F3: a handler returning `AsyncResult`/`Result`: passes every unit test in dev, arrives as a method-less object in production.
3. F4: selector computed returning `Option` vs a consumer relying on reference equality.
4. F5: `Result.ok()` for void returns written three ways.
