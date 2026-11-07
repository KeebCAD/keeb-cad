# Adversary review: spine change for storage's library and seam (23.5 unknown)

Reviewed: `spine-storage.patch` (glossary row, AD-10 storage line, AD-13 Prevents and Storage layers, Verification row, Stack row, tree comment), the memlog decisions, AD-13 in full, `.dependency-cruiser.mts` GRAPH, AGENTS.md, ticket id = 5.
Line numbers are those of the spine file as patched (AD-13 starts at line 468; Storage layers is line 475; Version retention line 479; Web Lock line 483; StorageError block lines 773-781).

## Verdict

Not ready for the 23.5 builder. The split (rules above the backend, Dexie below, memory double, contract spec) is sound and answers the ticket's five questions in outline. But the sentence that defines the backend (line 475) is too loose to pin the operations, so two builders obey it and build incompatible backends and rules. Three holes can lose work (replacement and prune as separate transactions, the counter's scope, a read-only tab writing through Open). Two enforcement claims have no stated rule.

## Pairs that obey every AD and still diverge

### H1 (high). The backend operations are not defined, so rules and backend can disagree

Line 475: "the few operations that write a version with its design entry and the save counter, list a design's version entries and the stored designs, and delete versions". Builder A writes `putVersion(entry, texts, reason, counter)` (the rule allocates the counter); builder B writes `saveVersion(entry, texts, reason)` (the backend allocates it inside the transaction). Both match the sentence. A's rules do read-max-then-write in two transactions; B's rules have no counter code to mutate, so "the save-counter order" is in the Stryker-excluded part, the opposite of what the Prevents bullet promises. The memory backend and the contract spec are written to whichever the builder chose. Close it: name the operations and signatures in the AD (for example `putVersion`, `listVersions(designId)`, `listDesigns`, `deleteVersions(keys)`), state who allocates the counter, and say what the contract asserts per operation.

### H2 (high). Replacement and pruning are split across transactions, the very order problem the Dexie choice was meant to remove

The memlog rejects idb-keyval because replacement "is write-then-delete in two steps whose order is a work-preserving rule in code Stryker never mutates", and says "a same-revision autosave puts the new and deletes the old together". The spine drops that. Line 475 lists only "write a version" and "delete versions" as operations and says "a rule's decision and the write that follows run in separate transactions". So same-revision replacement is: find the old version (read), write the new, delete the old. Builder A writes then deletes: a crash between leaves two autosave versions at one revision, which breaks the 20-slot count and the "one version per design revision" rule. Builder B deletes then writes: a crash or a quota refusal between them loses the only copy of that revision's autosave (the accept-event save at a quota boundary: delete succeeds, put refused). Both obey the text. The same applies to prune-then-retry (line 475 "the save that retries after pruning"): the delete is committed before the retry, so a failed retry has already destroyed a rolling version for nothing; and the last autosave can be pruned even when the retry still fails because named points fill the quota. Close it: the write operation takes the keys it replaces (write plus delete in one transaction), and say that a failed retry after pruning is accepted loss or is not.

### H3 (high). The save counter's scope is unsaid, and the Web Lock does not cover it

Line 479: "order is a monotonic save counter in `storage`, never a clock". Per design or global? `listDesigns` orders designs by it (ticket 5: "newest first by storage's save counter"), which needs one global order. Builder A: one global counter row. Builder B: a counter per design (the version's `n` for `listVersions`), and `listDesigns` sorts by each design's latest. Both fit. With a global counter, the "safe because one tab writes a design" argument (line 475) fails: two tabs editing different designs each hold their own Web Lock and each read max then write in separate transactions, so they allocate the same value, and `listDesigns` ties. Close it: say the counter is global and allocated inside the write transaction (read-increment-write), which also resolves H1. Name where it is stored (a row in a meta table, or derived as max over versions).

### H4 (medium-high). A read-only tab can still write the same design through Open, and the lock claim then rests on nothing

Line 483: "A read-only tab never writes this design's bundle" but "New design, Open, Copy design, export and Save to file stay". Line 479 says Open writes a `file` point for the opened design id and (line 477) "when that design id is stored at another revision, the file's revision opens as current". So Open of a file whose id is held by another tab writes into that design's list and sets its current revision, while the editing tab autosaves. Two writers, no lock, and the rules' decision-then-write gap is exactly where they collide. Builder A takes the lock on Open and switches the tab to editing; builder B writes the `file` point and opens the design read-only. Close it: state that Open of an id whose lock another tab holds opens read-only and writes nothing, or takes over explicitly. Also say which package acquires the Web Lock and releases it (nothing in the patch assigns it; `storage` imports no web API wrapper, `app` autosave is the likely owner), and what a save does if the lock is lost mid-save.

### M1 (medium). Table layout and the design entry are undefined; "current" and `load` have two readings

"Write a version with its design entry" (line 475) names two records without fields. Builder A: a `versions` table keyed by [designId, revision, reason] and a `designs` table (id, name, revision, lastSaved, counter) updated on every write. Builder B: only `versions`, with `listDesigns` as a group-by-design query over it (the memlog's rejected "indexed queries" option, back in through the side door). `load(id)` then differs: A loads the design entry's revision, B loads the highest counter. They diverge after a `switch` or `copy` point or a `reset` point (the reset save writes an older bundle than the current one, and it would move the entry's name and revision under A). Also unsaid: do bundle texts live in the version row (three strings) or in a table of their own; where assets go (content-addressed, shared across versions, so pruning a version needs a reference rule the delete operation does not have; the Stack row defers assets to "later stores", which is fine only if the AD says assets are not in 23.5); the database name; and the `lastSaved` time source (ticket says fake timers set it, AGENTS says no clock service, so the rules read `Date.now()` directly and the spine should say so).

### M2 (medium). Key collisions beyond `autosave` are undefined

Line 479: "keyed by (design id, revision, reason): replacement at the same revision applies only among `autosave`". A second `saved`, `file`, `switch` or `reset` at the same revision has no rule. Dexie `put` overwrites, `add` throws a ConstraintError (mapped to `storage-unavailable`), and a `Map.set` in the memory backend overwrites. The contract spec cannot catch this if nobody states the answer. Say which: replace, keep both, or refuse.

### M3 (medium). Quota detection and the error shape are under-specified

Line 475: "`{ name, message, inner? }`" and "`quota-exceeded` for a quota refusal". Dexie wraps the DOMException (its own `QuotaExceededError` with `inner` the original; transactions abort with an `AbortError` whose `inner` is the quota error; Firefox and private windows differ, see the StorageError comment). Builder A checks `name`, builder B walks `inner`. The message "the DOMException's name and text" is the outer Dexie message in A and the inner in B. Say: walk `inner` to the root, test `name === 'QuotaExceededError'`, take the root's name and message. Also say that a non-Dexie throw (a bug in a rule) is not mapped silently to `storage-unavailable`, or that it is.

### M4 (medium). Dexie schema versions are not tied to anything, and a second tab can block the upgrade

The Stack row says "schema versions for later stores". AD-8's `format-version` is the bundle's. Neither text says the two are independent, who bumps the Dexie version, or what happens when another tab (an older app build) holds the database open during an upgrade (Dexie `versionchange`: the old connection closes and its next request fails with `DatabaseClosedError`; the new tab's open can block). Both land as `storage-unavailable` by default, but a builder can instead retry or hang. Add: the Dexie schema version is independent of the format-version; an open that fails or is blocked is `storage-unavailable`; a database from a newer app is `storage-unavailable`, not a reset.

### M5 (medium). The dexie fence is asserted, not made enforceable

Line 18 of the patch: "Only `storage` imports `dexie`, and only in its browser backend". The ticket's question 1 asked for "a dependency-cruiser rule". The patch names no rule, no violation fixture in `tooling/ad10/violations/` (AGENTS: the npm rules are proven by hand-written fixtures), and does not extend the npm-import list at spine line 357 (immer, valibot, ...), which is where the spine states each package fence. "Only in its browser backend" needs a path rule (`packages/storage/src/browser/`) to mean anything; today it is prose. Add the rule and fixture to the AD, and the line-357 entry.

### L1 (low). "Excluded from Stryker" depends on a split the spine only half states

Line 475: the exclude list "names the browser backend's files and the contract helper". The contract helper lives in `src/testing/` beside the memory backend, which stays mutated, so the exclusion is by file name and must be updated for any new browser file; 23.13's explicit-files rule is cited in the memlog but not the spine. Also the root config only auto-creates inline projects for packages with no `vitest.config.ts` (`vitest.config.ts` lines 14-23); once `storage` has its own config, the inline Node project is hand-written, and the spine does not say which `include` keeps `src/browser/**` out of it (else the Node run loads Dexie in Node and fails).

### L2 (low). Policy and naming against AGENTS.md

- The patch states choices without their rejected alternative: Dexie, not idb-keyval or raw IndexedDB; rules above the backend, not inside the library's queries; one transaction per operation, not write-then-delete. AGENTS Policy requires "X, not Y, because Z" in a spine sentence that chooses between options. The memlog has them, the spine does not. Also the Stack row should name the Y it replaced.
- AGENTS "one kind per file" and "types in `types.ts`": the AD names `StorageBackend`, `BrowserBackend`, `MemoryBackend`, the `IDBFactory` token and the contract helper but not their files; a builder can put the interface in `storage-backend.ts` or in `types.ts`. Say the `di` token for the backend and the `IDBFactory` have their own files.
- `MemoryBackend` in `src/testing/` is registered through `di` (matches "substitute through di"), but the Test builders row says `testing` is imported only by spec files and other packages' testing folders; the contract helper is a `describe` outside a spec file. Allowed by intent, but say so.
- Glossary row: "Not the storage interface" is clear; but line 309 ("The file format doesn't depend on any storage backend") now reads as the new term. Harmless, worth a check.

## Rubric walk: does each new Rule prevent its divergence and can it be enforced

| Rule | Prevents | Enforceable? |
| --- | --- | --- |
| Rules are pure code over `StorageBackend` | Work-losing logic outside Stryker | Partly. Only if the backend's operations are fixed (H1, H2); otherwise the rules can leak into the backend. No check says the browser backend holds no rule. |
| One transaction per backend operation | Step order losing work | Not for replacement and prune (H2). |
| Decision and write in separate transactions, safe by Web Lock | Concurrent tab corruption | No: global counter (H3), Open (H4), lock owner unsaid. |
| `IDBFactory` through `di` | Real mapping tested on can't-open | Yes, via the browser spec. |
| Mapping function | One place decides the notice | Shape of `inner` unsaid (M3). |
| Backend contract on memory and browser | Double drifting from the real backend | Only as strong as the operations list (H1) and the unstated key rules (M2). |
| Exclude list names browser files | Stryker running IndexedDB | Manual list; no check that a new browser file is on it (L1). |
| Only `storage` imports `dexie` | Second user of the library | No rule or fixture named (M5). |

Unsaid items the task listed: backend operations (H1), counter location (H3), `listDesigns` data source (M1), multi-table layout (M1), Dexie schema vs format-version (M4), crash between decision and write (H2), second tab (H3, H4, M4). All still open.

## The ticket's five questions

1. Library, version, licence, maintenance, only-storage fence: library, version, licence and maintenance answered (Stack row). The dependency-cruiser rule is not (M5). Partly answered.
2. Where retention rules live: answered (above the backend, Node, Stryker), but the backend interface that makes it true is loose (H1, H2).
3. Which side maps a DOMException, how can't-open is faked: answered in outline (mapping in `storage`'s pure code, `IDBFactory` through `di`); the root-cause rule is unsaid (M3).
4. Browser Vitest project beside Node specs, one contract spec, double out of Stryker's glob: answered, with one divergence from the ticket worth noting: the ticket says "the double kept out of Stryker's mutate glob", the spine keeps the memory backend in it (memlog q4, deliberate; the ticket text should be rewritten, and Sofia's rewrite pass should say so). The Node include/exclude mechanics are unsaid (L1).
5. Names from the glossary, not port: answered (glossary row, tree comment). The tree comment says "file Save/Open"; the memlog says it "keeps no versions" while AD-13 Version retention keeps `saved` and `file` points for it: say which.

## Summary of suggested tightenings

1. List the backend operations and signatures in AD-13; make write take the keys it replaces (H1, H2).
2. State the counter: global, allocated inside the write transaction (H1, H3).
3. State what Open does when another tab holds the design's lock, and who holds the Web Lock (H4).
4. State the table layout in one sentence and what `load` returns when versions and entry disagree (M1); key collisions (M2).
5. Quota detection through the root of `inner` (M3); Dexie version independence and blocked upgrades (M4).
6. Add the dependency-cruiser rule and fixture for `dexie` and the line-357 entry (M5); add the rejected alternatives (L2).
