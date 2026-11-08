---
title: "The epic's unproven paths get their tests"
type: 'chore'
ticket: '24'
created: '2026-11-08'
status: 'built'
baseline_revision: '62eb0a1be671d5a739255d24103d0589478973d5'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 1
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 23's retrospective found four paths built without proof: a failed browser write keeping what it would replace, a patches commit reaching autosave, launch stopping on a storage-unavailable URL load, and all three bundle files surviving a reopen. Three planning-process comments also break AGENTS.md's comment rule.

**Approach:** Add one test per path at the level that owns it, changing no production behaviour, and delete the three comments.

Boundary table (frozen as acceptance; no numeric threshold is involved):

| Group | Input / state | Expected | Level |
|---|---|---|---|
| Production bugs | A stored version; a write replacing it fails at its last step | The write returns its error; the replaced version reads back with its texts; only that version is listed; `designs` is unchanged | Integration on real IndexedDB, `storage` browser project |
| Glue | NewDesign, then a test command, through `mainModules` | Two versions kept, newest first, both `autosave`, the command's revision newest; the newest texts equal `writeBundle` of the committed design | `app` integration |
| Glue | The URL's design load fails storage-unavailable; `listDesigns` succeeds with a newer intact design | The design opened is none of the stored ones | `app` integration |
| Glue | A launch saves; a fresh container reopens from the same real IndexedDB | The reopened design, routing and fingerprints texts equal those saved | `app` integration |

</frozen-after-approval>

## Implementation Notes

Short route: about 100 lines, four tests and three deleted comments.

- Files: `packages/storage/src/browser/browser-backend.spec.ts`, `app/src/autosave/autosave.spec.ts`, `app/src/launch/launch.spec.ts`, `packages/schema/src/types.ts`, `packages/schema/src/fix.ts`.
- Decision (build): the failed write is forced by a Dexie `deleting` hook on `versions`, not by resetting the save counter to make `versions.add` collide, because AGENTS.md says "Arrange only a state real commands could reach" and a counter that goes backwards is not one. Deleting is the write's last step (`browser-backend.ts:29`), so the test sees the transaction undo steps already done.
- Decision (build): the reload row launches on a stored bundle whose derived files are tagged `r1`, not on a brand-new design, because with `LoadFlow` passing `routing: undefined` the new-design form stayed green (vitest run, 2026-11-08) while this form went red: a new design's derived files are empty, so losing them changes nothing.
- Decision (build): the launch row forces storage-unavailable with a `MemoryBackend` subclass whose `read` fails for one version, not by failing `versions`, because `DesignStorage.save` calls `versions` while arranging (`design-storage.ts:90`) and never `read`.
- Decision (build): the failed write throws `QuotaExceededError`, not the `SecurityError` of the neighbouring rows, because AD-13 names quota as the write failure and `SecurityError` is the opening failure those rows model (`browser-backend.spec.ts`, "Opening throws"). Dexie wraps it, so the row asserts `inner`, as `#caught`'s comment says (`browser-backend.ts:71`).
- Decision (build): the test command is registered before `autoLoad`, not after, because after it the store answered `InvariantError: Command "meta.renameDesign" is not registered.` (vitest run, autosave.spec.ts).
- Toggled bugs, each red in Chromium and Firefox, then restored (the failed-write and reload rows rerun after pass 1's patches): `transaction` removed from `BrowserBackend.write` (failed-write test); autosave narrowed to whole commits (patches test); `storage-unavailable` dropped from `Launch.#storageFailed` (unreadable-version test); `LoadFlow` passing `routing: undefined` (reload test).
- Real-host run: Dexie on real IndexedDB in Chromium and Firefox is the host for the failed-write test; the other fakes are the repo's own `MemoryBackend`, exempt.
- Stryker: not run; the production files of priority packages are unchanged.

## Review Triage Log

Pass 1, quick and test-reviewer; none dropped for a bad quote.

- medium, patched: the reload test never launched, against the frozen row "A launch saves" (both lenses). It now launches, waits for the autosave, then reopens.
- low, patched: `first.unmount()` had nothing to unmount; gone with that fix.
- low, patched: the patches test didn't wait for `NewDesign`'s save.
- low, patched: the `isNone` guard copied three times; `opened` and `currentSeq` use `openBundle`.
- low, patched: two comments restated or dated the code.
- low, patched: the failed write used an opening error; now `QuotaExceededError`.
- low, patched: two undeclared choices; decisions added above.
- low, rejected: the launch row's `UnknownError` mapping isn't asserted; the mapping is tested in `storage`, and AGENTS.md says "Test a rule where it is defined".

Pass 2, one reviewer over the patched diff: nothing above low, no frozen row broken, so the review ends.

- low, logged: the reload test's wait relies on `arrange`'s `'stored'` label differing from the committed revision, a label real commands wouldn't write; the helper predates this change.

## Verification

**Commands:**
- `pnpm test` -- expected: every test passes
- `pnpm lint` -- expected: no errors

**Manual checks (if no CLI):**
- Nothing visible changes: only tests and three comments.
- Each new test goes red under a toggled bug; recorded in Implementation Notes.
