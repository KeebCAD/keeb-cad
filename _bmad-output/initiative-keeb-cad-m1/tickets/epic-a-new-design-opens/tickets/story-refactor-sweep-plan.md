---
title: 'Refactor sweep'
type: 'refactor'
ticket: '9'
created: '2026-11-08'
status: 'built'
baseline_revision: '3d1339a441ec4ed191cf5bac43db0dfe83518bde'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `deferred-work.md` holds about 40 open cards from this epic: real breaches of `AGENTS.md` in specs and config comments, three unverified suspicions, and many cards already stale or owned by a later story.

**Approach:** Close every card this epic can close by fixing it, settle the suspicions with a run, mark stale cards closed with the reason, and leave forward-owned cards open naming their owner. No new behaviour.

## Boundaries & Constraints

**Always:** each card ends `closed:` with date and reason, or stays open with a named owner (the ledger below is the scope list the ticket's verify checks).

**Never:** no change to production behaviour except the `useOpenDesign` return shape (internal to `editor`) and the kernels' allowed target, each decided below; cards from other epics (spikes, platform baseline, see-corneys-keys) stay untouched; no test deleted or weakened.

## Boundary table

| Group | Row | Input | Expected | Level |
|---|---|---|---|---|
| module boundaries | `useOpenDesign`, no design open | nothing committed | `undefined` | unit, `editor` |
| module boundaries | `useOpenDesign`, design open | one commit | the committed design | unit, `editor` |
| module boundaries | `useOpenDesign`, second commit | two commits | the later design | unit, `editor` |
| glue | `NewDesign.apply` | real store, no design | `current` holds the fresh split, reversible, empty free-root design | unit, `commands`, on `design`'s real store as `packages/commands/src/load/open-stored-design.spec.ts:35,55` does; `unreadable: []` is not visible in `current` and is no longer asserted |
| rules | non-kernel row | each row outside the eight kernels | its targets include `di`, `reactive`, `result` | unit, `tooling` |
| rules | kernel row | each of the seven kernels other than `result` | its only allowed target is `result` | unit, `tooling` |
| rules | `result` row | `result` | no allowed target | unit, `tooling` |
| rules | kernel importing another package | a kernel importing `di` | its imports-only rule fires | unit, `tooling` |
| rules | shell boxes at the laptop floor | a 1366×696 page | canvas 1002×624 (`DESIGN.md`'s in-browser height less the top bar and status strip) | browser, `editor` |
| rules | test-id message | `getByTestId` in a spec | the exact message text, written out in the spec | unit, `tooling` |

Decision (Sergii, 2026-11-08): the cruiser config follows the spine, each kernel but `result` may import `result`, not the spine going back to none, because the spine sentence (`Eight kernels import no workspace package except` `result`, 6e7ca99) postdates the config.

Decision (Sergii, 2026-11-08): no lint ban on `testing` assertion helpers in type specs, not an `importNamePattern` ban; the card closes as accepted, because `AGENTS.md`'s `expectTypeOf only` stays the guard.

Decision (Sergii, 2026-11-08): the guard stays on the edit tools, not an approximate match of write forms in Bash commands; the card closes as accepted, because the guard covers the edit tools and `AGENTS.md`'s ban on editing runner or mutation config covers the rest.

Decision (Sergii, 2026-11-08): editor browser specs run at a 1366×696 page, not 1366×768, because `DESIGN.md` says `1366×768 minimum laptop viewport (1366×696 inside the browser)` and the page a test renders is the inside of the browser. The shell-boxes row's canvas becomes 1002×624. A new `deferred-work.md` card asks the PO to fold this into 23.8's ticket wording.

</frozen-after-approval>

## Code Map

Card ledger (cards named by their summary):

**Fix**
- AD-n references in comments -- `.dependency-cruiser.mts` (lines 1, 6, 18, 22, 157, and every rule `comment`), `eslint.config.ts:30`, `vitest.config.ts:66,103`, `packages/di/vitest.config.ts:6`, `packages/editor/vitest.config.ts:17`, `tooling/ad10/rules.spec.ts:1` and its three describe titles, `tooling/catalog.spec.ts:1`, `tooling/vue-reactivity.spec.ts:1`, `.prettierignore:16`, `lefthook.yml:1`, `packages/di/tsconfig.lib.json:2`, `tsconfig.node.json:11`.
- `tooling/lint/rule-messages.ts` -- module-level `ESLint` and two signature comments.
- `tooling/lint/`: `no-test-ids`, `no-inline-config`, `type-specs`, `no-snapshot-matchers`, `no-module-mocks`, `no-services-in-components`, `no-try-in-test`, `no-shared-spec-state`, `types-in-types-ts`, `entry-files-re-export` `.spec.ts` -- expected message from the config's own constant; `eslint.config.ts` exports it.
- `tooling/ad10/rules.spec.ts` -- module-level `generatedDir` and `generated` (lines 71, 107); test name at line 141 claims more than its expects.
- `packages/editor/src/invoke/invoke.spec.ts` -- `arrange` line 160 registers `Recorder` always; `unavailable` assertion repeated (lines 186, 228, 242, 306, 340, 360, 380). Three cards.
- `packages/editor/src/shortcuts/shortcut-registry.spec.ts:129,141` and `packages/editor/src/devtools/devtools-plugin.spec.ts:137` -- the same arrange breach (gap reader; no card).
- `packages/workers/src/model-worker/model-worker-lifecycle.spec.ts:56` -- `RenameDesign` registered always. Two cards.
- `app/src/autosave/autosave.spec.ts:20` -- arrange resolves five services for every test.
- `packages/commands/src/design/new-design.spec.ts` -- asserts what a fake was handed.
- `packages/design/src/store/design-store.spec.ts:475` -- `toBe(rejection)`.
- `packages/editor/src/design/use-open-design.ts:9` (function) -- `Option` in a computed; consumers `shell/TopBar.vue:10`, `use-open-design.spec.ts`.
- `packages/editor/vitest.config.ts:48`, `packages/editor/src/shell/EditorShell.spec.ts:50,71` -- the viewport height.
- `.dependency-cruiser.mts:26-33` and `:6` -- no finding card: kernels drifted from the spine; `tooling/ad10/rules.spec.ts:141`.

**Settle with a run, then close or keep with the result**
- `optimizeDeps` missing in `messaging`, `workers`, `pipeline`, `storage` configs.
- `app/src/start-model-worker.ts` listening after `await autoLoad()`.
- `resetColorScheme` running before unmount.

**Close as stale (`closed:` with reason)**
- Story 15's inline-input sketch: `git grep "static readonly input = v\."` finds nothing.
- Two `replaceDesign` tests: the named tests no longer exist; the current name claims what it asserts.
- `worker.format: 'es'` for 23.7: `app/vite.config.ts:10` sets it.
- 23.5 and 23.7 rewordings and both 23.7 split-offs: folded, per the 2026-11-07 fold entry.
- 23.8's split-off: built as 23.23.

**Close as decided or accepted**
- `rules.spec.ts`'s computed expected values (that half of its card): see the Decision (plan) on the table.
- Type specs importing assertion helpers; the guard's Bash gap: Sergii's decisions above.
- `only-tests-import-testing` on a resolved import: closed on the 2026-11-08 run, `depcruise` of a temporary `packages/editor/src/zz-probe.ts` importing `@keeb-cad/result/testing` reported `only-tests-import-testing: packages/editor/src/zz-probe.ts → packages/result/src/testing/index.ts`.

**Keep open, owner named**
- `messaging` request side and its spine fold: the first story adding a request kind.
- Case worker under `format: 'es'`: the story filling the case worker.
- Quantity `checkInputs`: first story declaring a quantity input.
- Priority-package test-name verify: first story with logic in those packages.
- Autosave failure state for the banner: 16.x.
- Hotkey on in a focused field: 16.4.
- `preventDefault` on an unavailable hotkey: 16.4, the first chord; the card gains AD-26's `Alt+arrow and every Ctrl chord call preventDefault`.
- Written-out `G` and `Ctrl+K`: 13.7 and the palette story.
- `failed:` in the violations panel: that panel's story.
- `◌` reconcile: `bmad-ux`.
- Non-zero severity row: 13.17/13.18.
- `aViolation` builder: the first violation kind's story.

## Tasks & Acceptance

**Execution:**
- [x] The Fix list's comment files -- remove AD-n, layer and ticket references, keeping the reason where the comment has one, and delete a comment left with only a restatement; also the three `rules.spec.ts` describe titles -- `AGENTS.md`: `No AD-n or ticket references`.
- [x] `.dependency-cruiser.mts` -- kernel rows except `result` become `['result']`; line 6's comment says so -- Decision (Sergii) above.
- [x] `tooling/ad10/rules.spec.ts` -- wrap both cruise describes in one outer async `describe`, whose body calls `generateTree(dir)` (function), holds the `const` cruise result that lines 276 and 283 read, and removes the directory in `afterAll`; split line 141's test into `it.each` rows over a literal list of the eight kernels, and over `ROWS` minus that list for the non-kernel rows, per the boundary table; adjust any hand-written row the kernel change invalidates, naming it in Implementation Notes.
- [x] `tooling/lint/rule-messages.ts` (function) -- build `ESLint` inside `lintResult`; drop both doc comments.
- [x] The ten `tooling/lint/` specs in the Fix list -- write each exact expected message out; stop importing the config's message constants; `eslint.config.ts` stops exporting those nothing else imports.
- [x] `packages/editor/src/invoke/invoke.spec.ts`, `shortcuts/shortcut-registry.spec.ts` -- `arrange`'s options object gains an optional `recorder` key, registered with `useValue` when set; `arrange` no longer returns a recorder, and a test that reads it, or uses an entry or builder injecting `Recorder`, builds `new Recorder()` and passes it; in `invoke.spec.ts` one `expectUnavailable` (function) in the spec replaces the repeated assertions.
- [x] `packages/editor/src/devtools/devtools-plugin.spec.ts` -- register `RenameDesign` only for the tests that invoke it, by an `arrange` argument.
- [x] `packages/workers/src/model-worker/model-worker-lifecycle.spec.ts` -- register `RenameDesign` only for tests that run it, by an `arrange` argument.
- [x] `app/src/autosave/autosave.spec.ts` -- `arrange` returns the container; each test resolves what it uses.
- [x] `packages/commands/src/design/new-design.spec.ts` -- use the real store and assert `current`.
- [x] `packages/design/src/store/design-store.spec.ts:475` -- `toEqual`.
- [x] `packages/editor/src/design/use-open-design.ts`, `shell/TopBar.vue`, its spec -- return `ComputedRef<Frozen<Design> | undefined>` through `getOrUndefined()`.
- [x] `packages/editor/vitest.config.ts:47-48`, `packages/editor/src/shell/EditorShell.spec.ts:50,71` -- 1366×696 and a 1002×624 canvas; the comment names DESIGN.md's in-browser height; the test title names the laptop floor without numbers.
- [x] Settle `optimizeDeps`: clear every `.vite` cache, run `pnpm test`, search for `new dependencies optimized`. None: close the card with the result. Any: add the listed dependencies to that package's config, as `packages/di/vitest.config.ts:10` does (a re-bundle mid-run is the defect, not a red test being turned green).
- [x] Settle the worker listener: the card's own question, whether Chromium and Firefox queue a module worker's messages until its top-level evaluation finishes. A scratch-only Playwright run, not a test, of a module worker that awaits a 200 ms timer before listening, with main posting immediately. Queued: close the card. Lost: the card stays open, owner the first story adding an async eager binding to the worker container, since today's `autoLoad` delay is one microtask (`packages/di/src/container.ts:86-96`). No code change either way.
- [x] Settle `resetColorScheme`: a temporary probe that reads `document.documentElement.dataset.theme` after teardown, removed afterwards. Written back: reset inside the unmounting `onTestFinished`. Not: close the card.
- [x] `deferred-work.md` -- apply the ledger with `closed: 2026-11-08, …` lines; close the existing 1366×696 card with Sergii's decision and add one card for the PO to fold it into 23.8's wording; note on the `messaging` request-side card that kernels may now import `result`.

**Acceptance Criteria:**
- Given the sweep is finished, when `pnpm check` and `pnpm test` run, then both pass.
- Given `deferred-work.md`, when each ledger card is read, then it has a `closed:` line or names its owner.

## Implementation Notes

- No hand-written row in `tooling/ad10/rules.spec.ts` needed changing for the kernel target.
- Settled: `optimizeDeps`, no re-bundle on a cold cache, card closed. Worker listener, messages lost in Chromium and Firefox across a 200 ms top-level await (delivered without it), card stays open with its owner. `resetColorScheme`, `data-theme` written back in 1 of 24 teardowns, reset moved into the unmounting `onTestFinished` of `testing/mount-shell.ts` and `mount-editor.spec.ts`; 0 of 72 after.
- The probe was a temporary log in `mount-shell.ts`, not a spec: the guard hook refuses deleting a `.spec.ts`, so a throwaway spec could not be removed.
- Decision (Sergii, 2026-11-08): `lint` specs keep `stringContaining` around the written-out message where ESLint prefixes it (`no-restricted-properties`, `no-restricted-imports`), not a whole-string match, because the prefix is ESLint's wording and no requirement states it.
- Decision (build): `model-worker-lifecycle.spec.ts` gains `renamable`, and `renamed` also registers the command, not a `commands` list, because `RenameDesign` is the only command the file runs. Evidence: `grep -n registerCommand model-worker-lifecycle.spec.ts` shows one registration, at line 56, so a list would only ever hold that one.
- Decision (build): `resetColorScheme` runs last in the teardown, after `container.dispose()`, not straight after the unmount, because nothing else in the teardown reads the theme and the reset then follows every listener's removal. Evidence: the plan's task sets `reset inside the unmounting onTestFinished`, and the probe found 0 write-backs in 72 teardowns in this position.

- Real-host run: `FakeWorker` in `model-worker-lifecycle.spec.ts` stands in for the browser `Worker`. `pnpm check` (exit 0, seed 1794152211387) runs `app`'s entry spec, which spawns the real model worker in Chromium and Firefox; the scratch Playwright run also used real module workers in both.
- Structural changes (`eslint.config.ts`, `.dependency-cruiser.mts`, Vitest configs, `tsconfig` comments) are all named in the plan's tasks; none added `declare global` or `declare module`.

## Plan Change Log

## Review Triage Log

Pass 1, lenses quick and test-reviewer. 6 findings, none dropped. Verdicts: medium 1, low 5.

| # | Lens | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 1 | quick | `new-design.spec.ts` dropped the "no derived files" claim | medium | patch | `Committed` holds `routing` and `fingerprints` (`design/src/store/types.ts:15-21`) and `replaceDesign` keeps a valid one (`design-store.ts:100-107`); breaks the frozen `no test deleted or weakened` |
| 2 | quick | `editor/vitest.config.ts:17` comment only restates a rule | low | patch | direct deletion; the first task says to delete a comment left with only a restatement |
| 3 | quick | `violations/packages/result/src/index.ts:1` comment false after the kernel change | low | patch | seven kernels may now import `result`; direct correction |
| 4 | test-reviewer | reset no longer runs if a test fails before mounting | low | reject | needs a failure before `mountShell`, in an already failing run; the fix adds a hook to every spec the change simplified |
| 5 | test-reviewer | the shell-boxes test doesn't state the page size it depends on | low | reject | a failure on the canvas row points at the viewport by its value; the fix adds an assertion on the runner's config |
| 6 | test-reviewer | `toEqual(rejection)` passes for a copy | low | reject | the plan's task sets `toEqual`, per its card; the fix would edit this build's plan |

Pass 2, lenses quick and test-reviewer, on the patched files. 3 findings, none dropped. Verdicts: medium 1, low 2.

| # | Lens | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 7 | quick | `new-design.spec.ts`: `expect.any(String)` lets a stale derived-file revision pass | medium | patch | the old assertion failed on any handed derived file; breaks the frozen `no test deleted or weakened` |
| 8 | quick | `new-design.spec.ts`: `seq: 1` and top-level `revision` pin the store's rule | low | patch | same patch; `AGENTS.md` `Test a rule where it is defined` |
| 9 | test-reviewer | `seq: 1` is not in the requirement | low | patch | same root cause as 8 |

Pass 3, lenses quick and test-reviewer, on the patched spec. 2 findings, none dropped. Verdicts: low 2. Review ends; both logged, not patched.

| # | Lens | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 10 | quick | `new-design.spec.ts:20` says "no derived files" while the store holds empty ones | low | logged | the spine's wording for what `newDesign` hands the store; the expects show them empty at the design's revision |
| 11 | test-reviewer | `toMatchObject` admits extra keys on `routing` | low | logged | `routingFileSchema` holds only `revision` and is strict, so the store refuses an extra key |

## Design Notes

Decision (plan): build `ESLint` inside `lintResult`, not a module-level instance, because `AGENTS.md` says `Hold state in di services, never in a module-level singleton that functions reach for`, and `node eslint-timing.mjs` measured a fresh instance at 55-59 ms per call after the first load (shared: 9 ms), so nothing needs the shared one.

Decision (plan): `useOpenDesign` returns `Frozen<Design> | undefined`, not an `Option` in the computed, because AD-24 says `A value that is stored (a computed, a ref), posted or hashed is unwrapped first`.

Decision (plan): `rules.spec.ts` keeps generating its rows from `GRAPH`, not literal expected targets per row, because `AGENTS.md` says the `GRAPH` table `generates one rule per package; tooling/ad10/rules.spec.ts proves those from the table`; the kernel rows it adds are literal, from the spine sentence.

Decision (plan): the generated tree's cruise is a `const` in an outer `describe`, not a `let` assigned in `beforeAll`, because `AGENTS.md` says `Keep no mutable state at module level in a spec` and a reassigned binding is that state, while the hand-written describe already holds `const result = await cruiseWithConfig(...)` (`tooling/ad10/rules.spec.ts:151`).

Decision (plan): `generateTree` and `lintResult` are plain functions, not `di` services, although each does I/O, because tooling sits outside the package graph (`.dependency-cruiser.mts`: `each package (28 under packages/, plus app and reference-designs)`) and `git grep -n @keeb-cad/di -- tooling`, outside the violation fixtures, finds it only as text under test in `tooling/ad10/rules.spec.ts` and `tooling/lint/no-services-in-components.spec.ts`, never as an import of `di`.

Decision (plan): the kernel `it.each` lists the eight names literally, not the exported `KERNELS`, because `AGENTS.md` says `Take expected values from the requirement`.

## Conformance Log

Pass 1: readers A and B, gap reader. 0 findings dropped.
- `Give every decision its rejected alternative` (`useOpenDesign`, table, tree, tags, literal kernels): fixed.
- `Make a test's name and its expects claim the same thing` (hotkey read timing and registry rows): fixed, hotkey fix withdrawn.
- AD-26 `Alt+arrow and every Ctrl chord call preventDefault`: asked; Sergii withdrew the fix.
- `Keep no mutable state at module level in a spec` (rules.spec tree): fixed.
- `no expected value computed the way production computes it` (rules.spec): fixed, Decision (plan).
- `test wiring between packages as integration` (`NewDesign` row): fixed, level states the real store.
- Service or function tags: fixed.
- Precedent and shape (`arrangeEvents`): fixed.
- Ledger consistency and split boundary table: fixed.
- `Name the boundary's role` (`EditorShell.spec.ts:50`): fixed.
- gap: `.prettierignore`, `lefthook.yml`, `packages/di/tsconfig.lib.json`, `tsconfig.node.json`: fixed.
- gap: seven more `tooling/lint/` specs: fixed.
- gap: `shortcut-registry.spec.ts`, `devtools-plugin.spec.ts`: fixed.
- gap: `EditorShell.spec.ts:50`, `vitest.config.ts:47`: fixed.
- gap: `rules.spec.ts:276,283`: fixed.
Final pass: one reader, 4 findings, 0 dropped; these fixes have had no reviewer.
- `test wiring between packages as integration` (`NewDesign` row level and what it asserts): fixed.
- `Take expected values from the requirement` (non-kernel rows): fixed.
- Ticket verify `each cleanup item` (verification grep missed `rules.spec.ts`): fixed.
- `Arrange only what the test uses` (`recorder` return shape): fixed.
- gap: worker-listener probe: fixed; a scratch run answering the card's own question, not a test's arranged state.

## Verification

**Commands:**
- `git grep -nE "AD-[0-9]+|Verification layer" -- .dependency-cruiser.mts eslint.config.ts vitest.config.ts .prettierignore lefthook.yml tsconfig.node.json 'packages/*/vitest.config.ts' 'packages/*/tsconfig*.json' tooling ':(exclude)tooling/ad10/violations'` -- expected: no output.
- `git grep -n "static readonly input = v\." -- packages app` -- expected: no output, the ledger's stale claim.
- `pnpm check` -- expected: passes.
- `pnpm test` -- expected: passes.
