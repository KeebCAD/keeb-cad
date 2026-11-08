---
epic: epic-a-new-design-opens
date: 2026-11-08
verdict: accepted-with-open-items
criteria: declared
headless: false
---

# Retrospective: A new design opens in the editor frame (epic 23)

## Epic summary

Epic 23, folder `epic-a-new-design-opens`, 23 tickets, none unfinished.

Done (6): 23.1, 23.10, 23.11, 23.2, 23.12, 23.13.

Still at `built`, state `review` (17): 23.14, 23.15, 23.3, 23.17, 23.18, 23.16, 23.4, 23.5, 23.6, 23.7, 23.19, 23.20, 23.21, 23.22, 23.8, 23.23, 23.9.

Going-in concerns: none from the user. Attention weighted on the command path (23.2, 23.15, 23.19, 23.21) and the persistence path (23.3, 23.5, 23.7).

Plan ranges, baseline to next baseline in history order (the last is inferred, ending at HEAD 1150ba6):

| Ticket | Range | Commits | Files |
|---|---|---|---|
| 23.1 | 75ca4eea..bde2486e | 2 | 114 |
| 23.10 | bde2486e..c36053ac | 12 | 64 |
| 23.11 | c36053ac..7f15da87 | 2 | 34 |
| 23.2 | 7f15da87..a1718358 | 2 | 73 |
| 23.12 | a1718358..233d99e6 | 6 | 126 |
| 23.15 | 233d99e6..e8674dbe | 12 | 34 |
| 23.3 | e8674dbe..edd63fd4 | 18 | 121 |
| 23.17 | edd63fd4..56e9a854 | 14 | 53 |
| 23.16 | 56e9a854..fc8c6d14 | 6 | 16 |
| 23.18 | fc8c6d14..903962dd | 2 | 44 |
| 23.6 | 903962dd..f489035a | 7 | 96 |
| 23.4 | f489035a..4e090884 | 12 | 107 |
| 23.5 | 4e090884..9a20a761 | 7 | 72 |
| 23.7 | 9a20a761..01707a61 | 9 | 41 |
| 23.19 | 01707a61..2f74d177 | 9 | 46 |
| 23.20 | 2f74d177..bb247bd9 | 3 | 10 |
| 23.21 | bb247bd9..d276578a | 6 | 27 |
| 23.8 | d276578a..879b12c6 | 4 | 98 |
| 23.23 | 879b12c6..10c75bc5 | 2 | 47 |
| 23.14 | 10c75bc5..5ba4dff5 | 6 | 277 |
| 23.22 | 5ba4dff5..3d1339a4 | 5 | 33 |
| 23.9 | 3d1339a4..HEAD | 1 | 45 |

Ranges are provenance only: they run baseline to baseline, so a range can hold commits from process work or a neighbouring ticket.

Evidence inventory:

- Available: the epic file (Requirements and Done when declared), 23 plans, `tickets.toml`, `deferred-work.md`, git history for the ranges above.
- Missing: 23.13's `baseline_revision` (e456fc0f) is not an ancestor of HEAD, so it has no range of its own; its work falls inside 23.12's range. No ticket has a story file: requirements come from `tickets.toml` entries. No run folders exist in the epic folder.
- Previous retrospective: none exists in the tree.

## Findings

Scope: the code lenses ran on the production diff of 93 files on the command and persistence paths (75ca4eea..HEAD), not on all 776 changed files. Spec reconciliation sampled 23.2, 23.3, 23.4, 23.5, 23.7, 23.15, 23.19, 23.21, 23.23 hardest; 23.1, 23.10 to 23.14, 23.17, 23.18, 23.20, 23.22 and 23.9 were not checked beyond titles and deferred entries. Sub-agent reports were re-checked against the source for every finding below, except where marked PLAUSIBLE.

### Verification gaps

| ID | Finding | Source | Disposition | Prevents the next one |
|---|---|---|---|---|
| V1 | A failed browser write leaving the replaced versions in place is never observed. The contract's one `replaces` case succeeds, `MemoryBackend` checks capacity before mutating, and browser code is outside Stryker. The transaction is present; only its proof is missing. | `packages/storage/src/browser/browser-backend.ts:22-32`, `packages/storage/src/testing/backend-contract.ts:39-73`, `packages/storage/src/browser/browser-backend.spec.ts` | fix now | A backend contract states failure rows, not only success. |
| V2 | R1's "after every applied command" has no end-to-end proof: no app spec runs a patches commit through the real `Autosave`, and `mainModules` registers no command yet. | `app/src/autosave/autosave.ts:10`, `app/src/autosave/autosave.spec.ts:41-107` | fix now | A slice whose requirement names a path has a test on that path. |
| V3 | Done when "the mirror equals main's design after each one" is proved only in halves. Equality calls the writer by hand on Node, forwarding and pipeline are separate, and the real-worker test asserts only the issues echo. | `packages/design/src/mirror/mirror-follows-the-store.spec.ts:68`, `model-worker-lifecycle.spec.ts:180`, `app/src/model-worker-entry.spec.ts:40` | question (item 3). Splitting the proof was a deliberate plan decision: AD-25 forbids an `app` spec from importing the mirror (23.4 plan line 201). | Nothing further. |
| V4 | Launch's `storage-unavailable` stop for the URL's design is unpinned: the only row fails `listDesigns` too, so both paths end alike. | `app/src/launch/launch.ts:35,46`, `app/src/launch/launch.spec.ts:289-309` | fix now | Nothing further. |
| V5 | Done when "both themes, Chromium and Firefox" for launch: Vitest browser mode runs both browsers on `MemoryBackend` with no theme; the only served-build test is Chromium, with no theme. The 2026-11-08 run observed Chromium only. | `app/src/launch/launch.spec.ts:96,164`, `app/e2e/vue.spec.ts:3-6`, `app/playwright.config.ts:35-40` | accept; AGENTS.md's end-to-end bar puts these in browser mode | Reconcile the line (S1). |

### Edge cases and boundary defects

| ID | Finding | Source | Disposition |
|---|---|---|---|
| E1 | `structuredClone(toRaw(input))` unwraps only the top level, so a nested reactive value throws `DataCloneError` from `run` instead of a Rejection. The comment claims Vue proxies are handled. No caller passes one yet. Letting `DataCloneError` propagate was a deliberate plan decision (23.16 plan line 130); that decision doesn't mention nested proxies. | `packages/design/src/store/design-store.ts:198-200` | question (item 5) |
| E2 | The crash cap is unreachable for a worker that posts `issues` before crashing, since every whole design posts `issues` first and that post resets the count. The code follows AD-11 as written; the epic's Notes already say "any resetting post makes the cap unreachable". Latent until a stage can crash. | `model-worker-lifecycle.ts:131-135`, `packages/pipeline/src/pipeline/pipeline.ts:49`, spine AD-11, epic Notes 2026-11-07 | defer, spine question |
| E3 | `format-too-new` at launch falls through to another or a new design, replaces the URL and shows nothing; the blank design then becomes `listDesigns`' newest. The stored design is untouched. Unreachable until the format version changes. | `app/src/launch/launch.ts:33-47`, spine AD-8 | defer to epic-keep-my-work |
| E4 | `LoadFlow` returns `emptied` and its caller discards it, so emptied routing and load failures report nothing. The spine assigns reporting to the flow, through notices that 16.1 builds. | `packages/commands/src/load/load-flow.ts:11-20`, `open-stored-design.ts:19-21`, spine AD-13 | defer to 16.1 |
| E5 | `Autosave.failure` has no production reader, so a failing save is invisible. Already tracked. | `app/src/autosave/autosave.ts:14-16`, `deferred-work.md:169` | defer, tracked |
| E6 | `NewDesign` and `OpenStoredDesign` don't align the route; only `Launch` does. Unreachable until the Start screen or a menu calls them. | `app/src/launch/launch.ts:21`, `packages/editor/src/router/design-location.ts:31-33` | defer to epic-keep-my-work |
| E7 | `load` isn't serialized with `save`, and `versions` then `read` are two transactions, so a replacement between them reads as `not-found`. Needs a second writer, which the Web Lock story removes. | `packages/storage/src/design-storage/design-storage.ts:37-49` | defer to the Web Lock story |
| E8 | Duplicate hotkeys are never checked, while duplicate handle ids are. No duplicates exist today. A handle with a hotkey, a required input and no builder also fails silently. | `packages/editor/src/shortcuts/shortcut-registry.ts:18-27,55-59` | defer |
| E9 | Opening a design writes autosave twice with no edit, moving `savedAt`, which orders `listDesigns`. Observed in the served build (version 2 to 4). Cause read from the subscriptions; the two saves were not traced individually. | Behavior verification; `app/src/autosave/autosave.ts:10-11` | open question |
| E10 | PLAUSIBLE, traced but not run: a KDL node named `constructor` reads `Object.prototype` from `entries` and takes the schema path. Reachable from a hand-edited file once Open exists. | `packages/design-file/src/codec/read-kdl.ts:43` | defer to epic-keep-my-work |
| E11 | Low, unreachable today: `spawn()` throwing synchronously; `writeBundle` throwing inside the commit emit, skipping later listeners; `Autosave` and `ModelWorkerLifecycle` not disposable. PLAUSIBLE: `indexedDB` read eagerly where the accessor itself throws. | `model-worker-lifecycle.ts:103`, `app/src/autosave/autosave.ts:28`, `browser-storage-access.ts:3` | defer |

Not findings: Web Lock absent (a planned epic-keep-my-work story). Dropped: "a command with no loaded design throws, against 23.15's Result", because the ticket states the loaded design as a precondition.

### Architecture, duplication, pattern divergence

`pnpm depcruise` clean; largest production file 227 lines, so no size finding.

| ID | Finding | Source | Disposition |
|---|---|---|---|
| A1 | Three comments tie types to planning process ("added by the story…"), against AGENTS.md's comment rule. | `packages/schema/src/types.ts:89,99`, `packages/schema/src/fix.ts:3` | fix now |
| A2 | Generic helpers live in `design` and are used by `editor`. Deliberate: the plan chose the export over editor copies (23.19 plan line 148). | `packages/design/src/parsing/parse.ts:7`, `packages/design/src/store/find-duplicate-ids.ts` | accept |
| A3 | Small duplications: plain-object check, code-unit comparator, `Dispatcher` registration, spec helpers (`committed` in four specs). | `packages/hashing/src/is-plain-object.ts:2-3`, `packages/messaging/src/sending/assert-plain.ts:20-21`, `packages/hashing/src/canonical-encoding.ts:19`, `packages/design/src/parsing/format-issue-paths.ts:6` | defer |
| A4 | Hand-written `switch` on tags in `design-file`, where other packages use ts-pattern. | `packages/design-file/src/codec/schema-fields.ts:23`, `read-kdl.ts:67` | defer |

Accepted: `StorageError` in `schema` (the spine's Data Schema places it there); `Autosave` in app beside `LoadFlow` in commands (tracked in `deferred-work.md:169`); the module state in `packages/di/src/inject.ts:10-11` (its comment justifies it); the `Show*` classes (one concept per file).

### Spec reconciliation

| ID | Finding | Source | Disposition |
|---|---|---|---|
| S1 | Epic Done when still says the frame's checks pass "in the locally served build"; the Notes moved them to Vitest browser mode. The 2026-11-08 run did pass them in the served build, once, by hand. | epic Done when, Notes 2026-11-07 | reconcile |
| S2 | R1 says "one versioned canonical file"; the as-built is a three-file bundle, while the Notes say R1 to R3 are unchanged. | `packages/storage` `write-bundle.ts:5-10`, epic R1 | reconcile |
| S3 | 23.8's entry still says 1366x768 and keeps its Tree "empty text" unknown after decisions at its plan. | `tickets.toml:237-238`, 23.8 plan line 47 | reconcile |
| S4 | 23.7's "production build's model worker is an ES module worker" has no automated assertion; it was proved by a hand-toggled build. | `app/vite.config.ts:10`, 23.7 plan line 209 | accept |

### Process lessons

Counted from plan records. Session transcripts (115 present) were not read, so why a session turned is not covered.

| ID | Finding | Source |
|---|---|---|
| P1 | Weak tests kept coming back after the lint meant to stop them: about 24 triage rows in 12 tickets, 20 rows in 9 tickets after 66875cf. The keyword count is approximate. | 23.7 plan L144, 23.20 L95, 23.22 L173, 23.23 L142 |
| P2 | Comments restating code: 12 rows in 10 tickets, 7 tickets after 23.12's lint. | latest at 23.22 L158 |
| P3 | 47 review passes over 23 tickets. Nine low-only passes were followed by another pass before the stop rule entered AGENTS.md in 10c75bc; one after it. | triage logs |
| P4 | A patch from one pass caused the next pass's medium in 3 tickets. | 23.22 L171, 23.23 L142, 23.9 L163 |
| P5 | The epic grew from 9 to 23 tickets, through spine changes and splits made at build time (23.7, 23.8, 23.20). | epic Notes |
| P6 | Verification was narrowed or unrecorded: `pnpm check` skipped in 23.4 until review found it, and only 23.7 records results in its Verification section. | 23.4 L144, 23.7 L206 |
| P7 | A fake host passed while the real devtools overlay failed three ways. 5c37b86 responded; only 23.9 was built after it, so it is unproven. | 5c37b86 body |
| P8 | 3af041d and f968d16 left no trace in later plans. Absence of a keyword doesn't show a check never fired. | plan-text search |

## Behavior verification

Run on 2026-11-08 at 1150ba6, against the production build served by `vite preview`, in Chromium through DevTools, in a fresh isolated profile.

| Check | Observed |
|---|---|
| Launch with empty storage | Redirected to `/#/design/ysdk4xtcplfy/layout`. Top bar, five workspace tabs, Tree button, canvas with the empty Layout hint, Inspector region, status strip. Console empty. |
| Status strip | `0 errors`, `0 warnings`. |
| Reload byte-identical | `texts.design` and the revision (06db279d8d54…) identical before and after. The stored version number went from 2 to 4 and `savedAt` moved, with no edit. |
| Workspace key | `3` selected PCB and set the URL to `/pcb`. |
| Tree slide-out | `T` opened it with focus inside; `Escape` closed it. |
| F6 | Moved focus Inspector, then Status strip. |
| Themes | Colour-scheme emulation switched `data-theme` from dark to light. Appearance was not judged. |

Suite: `pnpm test` at HEAD passed, 298 files, 2,719 tests, no type errors. `pnpm depcruise`: no violations (515 modules).

Not exercised in the served build: Firefox (browser-mode tests only), and the worker mirror (no command beyond the launch one is reachable from this frame, and the mirror isn't observable from the page).

## Previous-retro follow-through

Nothing to follow through on: no retrospective file exists for any epic, including the one before this in the epic order.

## Action items

All proposed, none applied.

Remediation, for the normal dev loop (owner: bmad-build):

1. Add a browser-backend test that a failed write keeps the versions it would replace (V1).
2. Add an app test that runs a patches commit through the real `Autosave` (V2).
3. Add the launch row: the URL's load is `storage-unavailable` while `listDesigns` succeeds (V4).
4. Remove or rewrite the three planning-process comments in `schema` (A1).

Spec reconciliation (owner: Sofia, `bmad-agent-po`, applied by the user):

5. Reword the epic's Done when for the frame's checks and launch's browsers and themes (S1, V5), and R1 for the bundle (S2).
6. Update 23.8's viewport wording and close its Tree unknown (S3).

Questions for the user (no rule proposed here):

7. Spine, through `bmad-architecture`: should the crash count reset on an `issues` post, given E2?
8. Process, in the `process-retro` room: what should answer P1 and P2, since lint hasn't stopped them?
9. Process: should a plan's Verification section be required to record results (P6)?
10. Should opening a design with no edit move `savedAt` (E9)?
11. V3: are the halves enough, given AD-25, or should a real-worker test observe the mirror through what it posts?
12. E1: should a nested reactive input keep throwing `DataCloneError`, or be unwrapped or refused as `input-invalid`?

Closing the epic: 17 tickets are still at `built`; Sofia marks them done, confirmed by the user.

Deferred items E2 to E8, E10, E11, A3, A4 carry their sources above and were entered in `deferred-work.md` on 2026-11-08; E5 was already there.

## Decision records

One decision passed the test: storing designs through Dexie behind a `StorageBackend` interface (`story-a-new-design-autosaves-and-reopens-from-the-browser-plan.md`, commit 5c6f0af; why in the epic's Notes, 2026-11-07). Proposed and declined by the user on 2026-11-08, because spine AD-13 already records it. No file written.

Considered and not proposed: `@noble/hashes` for the revision hash (`story-commands-run-through-the-design-store-plan.md` line 128), which the plan calls provisional. Of the 192 `Decision (plan)` entries, most were judged from their first line.

## Acceptance verdict

**accepted-with-open-items**, the user's decision on 2026-11-08, matching the verdict recommended on the evidence. Criteria: declared (the epic's Requirements and Done when). No ticket is unfinished.

Evidence: launch, reload byte-identical and the frame's checks were observed in the served build in Chromium; R2 and R3 have proving tests; `pnpm test` passed at HEAD.

Open items: V1 to V4 (missing proofs, of which V2 and V3 bear on R1 and the mirror Done when line; V3 is split by design under AD-25), E1, A1, and the spec reconciliations S1 to S3. No test or run showed a criterion failing. Accepting does not make later epics wait on these, so action items 1 to 3 need scheduling before epic-see-corneys-keys builds its first command.

## Open questions

Action items 7 to 12 are the questions a human answer would change.

Not resolved by this retrospective: whether defects exist outside the 93 files the code lenses read; why sessions took the turns the plans record, since transcripts were not read; Firefox behaviour of the served build.
