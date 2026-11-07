# Reality review: spine update for 23.4 / 23.5 (2026-11-07)

Lens: was each technical claim in today's diff checked against reality (installed packages, library source, browser behaviour), or asserted from memory?
Diff: `spine-23-4.diff` (session scratchpad). Rationale: `.memlog.md` entries 23.4 Q1-Q4, 23.5 Q1-Q2.

**Verdict:** the library claims hold: valibot, Immer and `result` are confirmed against the installed versions. The `StorageError` comment's list of browser causes is partly wrong, and one ordering claim ("the glossary's stage order") is not what the glossary says.

## Method

- Installed versions: valibot 1.5.0 (catalog `^1.5.0`), immer 11.2.9 (only `packages/design` declares it; no other package or `app` imports `immer`), TypeScript 6.0.3.
- Type checks: temporary `zz-*.ts` files placed in `packages/schema/src` and `packages/design/src`, run through `tsc -p tsconfig.lib.json --noEmit`, with a negative control so the checks could fail. All temporary files were removed and `git status packages` is clean.
- Runtime checks: a small script run with node against valibot 1.5.0.
- Browser behaviour: MDN, Mozilla's dev-platform list and Bugzilla, Chromium's `IDBFactory.cpp`, the WPT opaque-origin test, web.dev. No live browser was run.

## Claim-by-claim

### 1. `v.variant('command', [])` infers `never`, rejects everything, and `v.array` of it accepts only `[]`: CONFIRMED

- Types: `v.InferOutput<typeof v.variant('command', [])>` is `never`. A negative control, `{ command: 'a' }` assigned to it, fails with TS2322 "not assignable to type 'never'". `v.InferOutput<v.array(...)>` accepts `[]`.
- Runtime: `safeParse` returns `false` for `{command:'x'}`, `{}` and `1`. On the array, `[]` gives `true` and `[{command:'a'}]` gives `false`.
- So "only [] type-checks until a kind's owner adds it" is accurate for `fixes`. Note that `ViolationKind` is empty too, so `Violation` is uninhabited as a whole and `violations: Violation[]` can only be `[]`. The diff says exactly this.

### 2. `v.picklist([...])` infers the literal union and keeps option order in `.options`: CONFIRMED

- `v.InferOutput<typeof workspaceSchema>` is assignable both ways with `'layout' | 'outline' | 'pcb' | 'case' | 'firmware'`. Assigning `'c'` to a `picklist(['a','b'])` output fails as expected.
- `.options` is typed as the readonly tuple `['layout','outline','pcb','case','firmware']`, and at runtime it is that array in that order. So "option order = tab order (keys 1-5)" can be read from the schema.
- A bogus segment (`'bogus'`) and a wrongly cased one (`'Layout'`) both fail to parse, which matches "a failed parse opening layout".

### 3. Immer's `Patch` vs the spine's `DesignPatch`: CONFIRMED, with one gap in the wording

- immer 11.2.9 `dist/immer.d.ts` declares `interface Patch { op: "replace" | "remove" | "add"; path: (string | number)[]; value?: any; }`. The op spelling matches exactly, and `path` is **mutable**, not readonly.
- tsc confirms all of these:
  - `Patch` is assignable to the spine's `DesignPatch`.
  - `DesignPatch` is assignable to `Patch`, because `value?: unknown` widens to `any`.
  - `Patch[]` is assignable to `readonly DesignPatch[]`, and the reverse also holds.
- **Gap:** the spine says only that "design checks that Immer's Patch is assignable to it". `DesignPatcher.apply` (`packages/design/src/patching/design-patcher.ts:25`) passes `readonly DesignPatch[]` into `Immer.applyPatches(base, patches: readonly Patch[])`, so the **reverse** direction must hold as well. It holds today. But one plausible future edit would break `apply` and not the check the spine names: making `path` `readonly (string | number)[]`, which fits the spine's `Frozen` habits. The `@ts-expect-error` probe confirmed this. Suggest the spine say "mutually assignable", or note that `path` stays mutable because `applyPatches` takes Immer's mutable `Patch`. The memlog already says "path stays (string | number)[]", but not why.
- **Already proven by existing code:** `change()` returns Immer's `patches` as `Changed.patches: readonly DesignPatch[]`, and `apply()` hands `DesignPatch` back to Immer. Both directions are therefore compiled every time `design` type-checks, so a separate "check" file or type test would add nothing. Worth saying, so 23.4 doesn't write a redundant one.
- Minor: the spine writes `type DesignPatch = {...}`, while the code (`packages/design/src/patching/types.ts`) uses `interface`. This makes no difference to assignability. It matters only if the move to `schema` is meant to copy the spine's form verbatim.

### 4. `StorageError.unavailable` "(private mode, blocked, SecurityError)" and `quota-exceeded` "only on save": PARTLY WRONG

There is no storage library in the Stack table, and `packages/storage` has no IndexedDB code yet (only `bundle/`). So the backend will be raw IndexedDB, and its error surface is the browser's.

- **"Private mode" is outdated as a cause of `unavailable`.**
  - Chrome Incognito opens IndexedDB normally (in memory, with a smaller quota: web.dev gives about 5% of disk).
  - Firefox shipped IndexedDB in private browsing in 115 (Mozilla "Intent to ship: IndexedDB API in Private Browsing Mode", pref `dom.indexedDB.privateBrowsing.enabled`). Nightly 125 shows it on by default (bug 1829295).
  - Before that, Firefox private mode threw `InvalidStateError` from `open()`, and Mozilla deliberately did not use a distinct code. A Firefox profile set to "never remember history" may still behave this way; this is unverified for current versions.
  - So in current Chromium and Firefox, private mode usually means *available but ephemeral and small*. It shows up as `quota-exceeded` sooner, not as `unavailable`.
- **"Blocked" is ambiguous.**
  - IndexedDB's `blocked` event on `open()` is not an error. It fires when another connection holds an older version, and the request stays pending without raising a DOMException. If "blocked" means that event, `unavailable` with "message: the DOMException's" does not describe it: there is no DOMException, and the open may still succeed later.
  - If "blocked" means *site data blocked by the user*, Chromium's `IDBFactory.cpp` permission check (`allowIndexedDB`) fails the request asynchronously with **`UnknownError`** ("The user denied permission to access the database"), not `SecurityError`.
- **`SecurityError`** is accurate for Chromium and WebKit on an opaque origin: a sandboxed iframe, or a `data:` URL (WPT `idbfactory-open-opaque-origin`). It is thrown **synchronously** from `indexedDB.open()`. Firefox does not yet match (Mozilla bug 1776789, still open), and `file://` has its own Firefox quirk. keeb-cad already requires a secure context for `hashBytes`, so this case is mostly outside its deployment.
- **Where errors arrive:** some are thrown synchronously (`SecurityError`, `TypeError` on a bad version), others come through `request.onerror` (`UnknownError`, `VersionError`, `AbortError`, `InvalidStateError` in Firefox). "message: the DOMException's" holds for all of them, since each is a DOMException. 23.5's backend must catch both channels, and the spine could say so in one clause.
- **`quota-exceeded` only on save: mostly accurate.**
  - The failing write's request gets a `QuotaExceededError` DOMException. Unless that is prevented, the transaction aborts with `tx.error` set to it (MDN "Storage quotas and eviction criteria"), so the save must read `tx.onabort` / `tx.error`, not only the `put` request.
  - Reads (`load`, `listVersions`, `listDesigns`) do not raise it.
  - One edge: the first `open()` with `upgradeneeded` (creating stores) is a write and can in principle hit quota. This happens before any save, and the type says `load` and the lists can't see `quota-exceeded`.
  - A 2015 Chromium thread reported silent failure at quota when adding to an existing store. It is old and unconfirmed for current versions; 23.5's test should prove the error surfaces.
- **Missing kind, design question for 23.5:** a read that fails *after* a successful open has no kind (`UnknownError` "Internal error opening backing store", `AbortError`, a transaction failure mid-load). Dexie issue 543 and Chrome 118 reports show this happens in practice. `unavailable` is defined as "can't be opened". Either widen its wording to "storage failed" or add a kind; this is Sergii's call, not an autofix.

### 5. `result` exports `AsyncResult`: CONFIRMED

`packages/result/src/index.ts` exports `AsyncResult` (a class in `async-result.ts`, `implements PromiseLike<Result<T, E>>`), along with `Result`, `Option` and `attempt`, which matches AD-10's list.

## Other claims in the diff checked in passing

- **StageId "the glossary's stage order": NOT what the glossary says.**
  - The glossary's `lane` line gives `parts → (layout) → shapes → extras → [netlist] → plates · pcb · firmware → case`, and AD-18's Stages list matches it. Neither places `routing`.
  - `stageIdSchema` puts `routing` between `firmware` and `case`, so that position is a new choice and not the glossary's.
  - The glossary marks `plates · pcb · firmware` as unordered peers (`·`), while a picklist imposes an order.
  - Either call it "the glossary's order, routing placed after firmware (X, not Y, because Z)", or make no order claim if nothing reads it. The cache key and the status-strip label don't need an order; only Workspace's tab order does.
- **"exports are not stages" contradicts the glossary's `stage` entry**, which lists `exports` among the stage packages ("`plates`, `pcb`, `firmware`, `case`, `routing` and `exports` are stage packages"). The exclusion may be right (on request, no `stage-started`), but the glossary line then needs the same correction, or the spine disagrees with itself.
- **`LaneStage` "a subset of StageId (its options picked from stageIdSchema's), never a second spelling"**: the declaration right above the comment is still a hand-written literal union, which is a second spelling. valibot has no picklist-subset helper. A typo-safe form is a literal array checked `satisfies readonly StageId[]`, or `Extract<StageId, ...>`, though `Extract` silently drops a typo. The comment states an intent the declaration doesn't yet carry; make the declaration match the comment.

## Sources

- valibot 1.5.0 and immer 11.2.9 type declarations under `node_modules/.pnpm/`, checked with tsc 6.0.3 in-repo
- [MDN: IDBFactory.open()](https://developer.mozilla.org/en-US/docs/Web/API/IDBFactory/open)
- [MDN: Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [Mozilla dev-platform: Intent to ship IndexedDB in Private Browsing](https://groups.google.com/a/mozilla.org/g/dev-platform/c/yy7uUP47KGQ)
- [Bugzilla 1639542 (idb-private-browsing)](https://bugzilla.mozilla.org/show_bug.cgi?id=1639542), [1829295](https://bugzilla.mozilla.org/show_bug.cgi?id=1829295), [1776789 (SecurityError on opaque origin)](https://bugzilla.mozilla.org/show_bug.cgi?id=1776789), [781982 / 1269026 (private-mode InvalidStateError)](https://bugzilla.mozilla.org/show_bug.cgi?id=1269026)
- [Chromium IDBFactory.cpp (permission check, UnknownError)](https://chromium.googlesource.com/chromium/blink/+/HEAD/Source/modules/indexeddb/IDBFactory.cpp)
- [WPT idbfactory-open-opaque-origin](https://chromium.googlesource.com/external/w3c/web-platform-tests/+/refs/tags/merge_pr_26705/IndexedDB/idbfactory-open-opaque-origin.html)
- [web.dev: Storage for the web](https://web.dev/storage-for-the-web?hl=es-419)
- [Dexie issue 543 (UnknownError after open)](https://redirect.github.com/dfahlander/Dexie.js/issues/543)
