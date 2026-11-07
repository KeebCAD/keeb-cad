# Reality review: spine change for storage (Dexie, backend seam, test split), 2026-11-07

Verdict: sound, with two claims to tighten before 23.5 builds on them (one real gap, one wording gap) and one claim only partly confirmable without a spike.

## Confirmed

- Dexie 4.4.7: npm latest, published 2026-10-19 (npm registry `time`); Apache-2.0, no `dependencies` field (package.json of the tarball).
- Constructor option `indexedDB` exists (`DexieOptions.indexedDB?: { open: Function }`, dist/dexie.d.ts:1109; used at dexie.js:4528).
- Transaction over several tables, with puts and deletes in one `rw` transaction: documented (https://dexie.org/docs/Dexie/Dexie.transaction()), tables as separate args or an array.
- Awaiting non-Dexie promises: documented rule is global Promise or Dexie.Promise only; other async APIs let IndexedDB auto-commit (`TransactionInactiveError`/`PrematureCommitError`). Native async/await is supported. The spine's "one transaction per backend operation" is compatible; the backend must not await anything but Dexie calls inside a transaction callback. Not stated in the spine; worth one clause.
- Vitest 5.0.5 `cdp()`: "works only with playwright provider and only with chromium" (https://vitest.dev/api/browser/context). Repo has @vitest/browser-playwright 5.0.5 (pnpm-workspace.yaml:20). `api.allowWrite`/`allowExec` default true unless `api.host` is network-exposed (vitest plugin.d.ts:3350-3366), so local default is fine.
- `vitest.mutation.config.ts`: keeps only object (inline) projects, string entries such as `'packages/*/vitest.config.ts'` fail `typeof === 'object'` and drop; `tooling` excluded by name. Matches the claim. `di` is split as described: inline `di` project in /home/ruyu/projects/keeb-cad/vitest.config.ts (Node, excludes `src/vue/**`) and /home/ruyu/projects/keeb-cad/packages/di/vitest.config.ts (browser, `src/vue/**`).
- Consequence worth stating: once `packages/storage/vitest.config.ts` exists, the root's `configlessProjects` filter (existsSync of vitest.config.ts) stops auto-creating storage's inline project, so the Node project must be added by hand like `di`'s. The change says "as `di`'s root does", consistent. Also `packages/storage` currently has no vitest config and depends on `@keeb-cad/result`, not `hashing` (package.json); the new dependency list is a build-time edit.

## Findings

1. MEDIUM (gap): `indexedDB` alone is not enough; Dexie also needs `IDBKeyRange`. Evidence: `Collection` constructor throws `MissingAPI` when `db._deps.IDBKeyRange` is falsy (dexie.js:2958-2960); option typed at dexie.d.ts:1112; defaults come from globals (dexie.js:6248-6256). In the browser the global exists, so the "real by default" path works, and the fake-factory test works only because it never reaches a query. A registered fake factory that is meant to open (a memory-backed `IDBFactory`) will break at the first query unless `IDBKeyRange` is passed too. Fix: say the backend takes `indexedDB` and `IDBKeyRange` together (or states the fake only ever fails to open).

2. MEDIUM (wording): what Dexie reports for a failed open depends on the entry point; the spine's "mapping gives the DOMException's name and text" must read `inner` for Dexie-wrapped errors. I ran Dexie 4.4.7 in Node with a fake `indexedDB.open` throwing `DOMException('denied','SecurityError')`:
   - `db.open()` rejects with the raw DOMException (name `SecurityError`, no `inner`);
   - `db.transaction(...)` rejects with `OpenFailedError`, `inner.name = SecurityError`;
   - `db.table.put(...)` (auto-open) rejects with `DatabaseClosedError`, message "SecurityError denied", `inner.name = SecurityError`.
   So `error.name` alone would give `OpenFailedError` or `DatabaseClosedError` in the notice, not the DOMException's name. The mapping needs a rule "use `inner` when present", and its Node spec needs rows for all three shapes. The unwrapped DOMException shape is already covered by `{ name, message, inner? }`. Docs: https://dexie.org/docs/DexieErrors/Dexie.OpenFailedError (inner holds the reason; the page does not mention SecurityError, my run is the evidence).

3. MEDIUM (partly unverified): quota failure shape. Dexie docs (https://dexie.org/docs/DexieErrors/Dexie.QuotaExceededError): name is always `QuotaExceededError`, `inner` holds the original, and in some browsers the quota error arrives as `inner` of an `AbortError` because the transaction aborts instead of firing `onerror`. The spine's mapping says `quota-exceeded` "for a quota refusal" but does not say it checks `inner.name` of an `AbortError`. Add that, with a Node row for it. Separately, no source I could fetch confirms that CDP `Storage.overrideQuotaForOrigin` makes IndexedDB writes fail with QuotaExceededError in Chromium: the protocol docs only say it sets the origin quota (bytes; call without `quotaSize` resets). It is the same mechanism as DevTools "simulate custom storage quota" and is plausible, but treat it as unconfirmed until a spike shows the failing write, the resulting error shape, and the reset in `finally`. The planned Chromium-only test (Firefox has no `cdp()`) needs an explicit skip in the Firefox instance of the same spec file.

4. LOW: "monthly releases" is loose: 4.4.2 (2026-03-31) to 4.4.3 (2026-05-27) is two months. Nothing hinges on it. `^4.4.7` for a work-losing store: the repo pins quickjs-wasi exactly for churn; Dexie has had no majors in this period, so a caret is defensible, but the spine gives no reason, and per policy the choice carries an "X, not Y" (caret, not exact).

5. LOW: depcruise npm fence: the memlog says it mirrors `only-design-imports-immer` (.dependency-cruiser.mts:348); the diff states the rule in prose, and the fence plus a violation fixture in `tooling/ad10/violations/` are implied but not named as part of the work.

## Not checked

Firefox behaviour of Dexie against a throwing fake factory (only Node run); real Chromium quota behaviour (no network sandbox to run a browser here).
