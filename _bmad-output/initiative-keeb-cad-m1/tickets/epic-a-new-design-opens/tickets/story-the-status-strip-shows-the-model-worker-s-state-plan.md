---
title: "The status strip shows the model worker's state"
type: 'feature'
ticket: '23'
created: '2026-11-08'
status: 'built'
baseline_revision: '879b12c6f10826fb4be4ca73b3fea6dd0837b9fa'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md'
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The status strip is an empty landmark (23.8), so a user cannot see violation counts, a stage that runs long, or a model worker that has given up; and 23.4's crash count resets on `stage-started`, which AD-11 forbids.

**Approach:** `workers` keeps the issues with their seq, the running stage with its arrival time, and a `WorkerFailed` in its status, and resets the crash count only on an `issues` post. `editor` renders them in `StatusStripLandmark`, and a new `RestartModelWorker` action in `commands` runs through `useInvoke()`.

## Boundaries & Constraints

**Always:**
- Counts are the last accepted `issues` post's violations by `severity`; dimmed with one `◌` before them while that post's seq is behind main's (`DesignStore.current`'s seq); before the first post they are `0`, dimmed with `◌`.
- The running stage shows only when more than 1000 ms have passed since its `stage-started` arrived on main: its `StageId`, its elapsed whole seconds (`2 s`, floored) and Restart; the next post the gate accepts (any kind) clears it, and a new epoch clears it.
- After 3 consecutive crashes with no `issues` post between them the strip shows `failed: <message>`, naming the stage when one was running at the last crash, with Restart; Restart clears it. `stage-started` and `derived-files` never reset the crash count.
- `WorkerFailed = { message: string; stage?: StageId }` exactly as the spine has it; `message` is the error event's message, or `workers`' fixed text: `model worker sent an unreadable message` for a message that failed to deserialize, `model worker did not load` for an error event with no message (a plain `Event`, or an empty `message`).
- `failed:` reads `failed: <message>`, or `failed: <stage>: <message>` when a stage was running.
- Worker state (running stage or failed) sits immediately left of the counts, the two pushed to the strip's right end; the left end stays free.
- `RestartModelWorker` is available while the status is `running` or failed, not `idle`.
- Components reach services through composables and run Restart through `useInvoke()`.
- Every colour and size comes from `ui`'s tokens, in both themes. On `chrome` in Latte, error text is Text with a Red `●` (DESIGN.md).

**Never:** per-output entries, tab badges, cursor and zoom, the nudge-step control, the violations panel; a click on the counts; a hand-built ARIA widget; Tailwind's `dark:`; `vi.mock`.

**Decisions (Sergii):**
- Decision (Sergii): build to the spine's glyphs (`◌` on behind counts, the running stage as `parts 2 s`), not EXPERIENCE.md's `◌` for `waiting for edit to finish` and `rebuilding N%`, because the ticket quotes AD-11 and no live stage posts a percent; bmad-ux reconciles the table (a `deferred-work.md` entry).
- Decision (Sergii): the `0` before the first `issues` is dimmed with `◌`, not plain, because nothing has been checked yet and a plain 0 reads as a real result.
- Decision (Sergii): an error event with no message gets a fixed text, not `ErrorEvent` only as the ticket says, because Chromium and Firefox fire a plain `Event` with no `message` for a worker script that 404s or fails to parse (tried 2026-11-08: `chromium 404 {"ctor":"Event","message":"<undefined>"}`), which would read `failed: undefined`; not one text for both cases, because the deserialize wording is wrong for a worker that never loaded. A docs commit extends AD-11's sentence.
- Decision (Sergii): the fixed texts are `model worker sent an unreadable message` and `model worker did not load`, not one generic `model worker crashed`, because a bad deploy and a corrupt message must read differently in a report, and not `messageerror` / `worker error event`, because those mean nothing to a user.
- Decision (Sergii): elapsed seconds floor (1 s at 1600 ms), not round, because it never claims more time than has passed.
- Decision (Sergii): Restart is available once started (`running` or failed), not only while the strip shows it, because the 1000 ms rule and its clock live in `editor`'s presentation and `restart()` only refuses before `start`.
- Decision (Sergii): worker state sits just before the counts, not at the left end (EXPERIENCE gives that to pick-mode hints) or after them (cursor and zoom would land after a block that comes and goes).
- Decision (Sergii): the failed text with a stage reads `failed: plates: boom`, as in the layout preview he chose, not `failed: boom` with the stage in a separate element.
- Decision (Sergii): `failed` carries the last crash's message, not the first's, so `message` and `stage` describe the same crash.
- Decision (Sergii): only zero counts are tested, not a non-zero row through a made-up violation, because the ticket: "only zero counts can be posted, so this story tests zero and dimmed zero", and AGENTS.md: "Arrange only a state real commands could reach"; a `deferred-work.md` entry has 13.17/13.18 add the severity row.
- Out of this story: whether `failed:` also shows in the violations panel, because the epic's Boundaries put that panel in epic-change-a-parameter ("Out, owned by epic-change-a-parameter: undo and redo, the Inspector, the Violations panel"); a `deferred-work.md` entry carries Sofia's pick (no).

## I/O & Edge-Case Matrix

See `## Boundary Table`.

</frozen-after-approval>

## Code Map

- `packages/workers/src/model-worker/model-worker-lifecycle.ts` -- `#watch` (`:115`) resets on every post kind; `#crash` (`:146`) sets bare `'failed'`; `issues` getter (`:17`) drops the seq; `restart()` (`:41`) throws `InvariantError` before `start`. `types.ts`: `ModelWorkerStatus`, `SpawnedWorker`'s error listener takes `Event`.
- `packages/workers/src/testing/fake-worker.ts` -- `crash()` dispatches a plain `Event`; gains a message.
- `packages/workers/src/model-worker/model-worker-lifecycle.spec.ts` -- browser mode (`packages/workers/vitest.config.ts`), so `ErrorEvent` exists. Rows that change: `:358` (stage-started no longer resets), `:462`-`:473` (issues shape), `:456`; the `a stage-started below the latest seq` case of the `:339` `it.each` goes (its `expect` can no longer fail) and returns as a row that a stale `stage-started` sets no running stage. `arrange` registers `RenameDesign` for every test (a `deferred-work.md` entry); new tests arrange only what they use.
- `packages/commands/src/design/new-design.ts`, `design-actions-module.ts` -- the action precedent; `registerAction` from `@keeb-cad/design`. `.dependency-cruiser.mts:69` already allows `commands` -> `workers`; `packages/commands/package.json` lacks the dependency.
- `packages/ui/src/format/format-number.ts` -- `UNIT_SUFFIX`, `DisplayUnit` (`types.ts`) has only `mm`, `deg`.
- `app/src/launch/launch.spec.ts:102,123` -- builds the container from `mainModules` with `FakeWorker`s; the integration precedent.
- `pnpm-workspace.yaml` -- `catalogMode: strict`; `@vueuse/core` isn't in the catalog, `packages/ui/package.json:18` pins it literally.
- `packages/editor/src/shell/StatusStripLandmark.vue` -- empty `footer`. `packages/editor/src/invoke/use-invoke.ts` -- the composable precedent; not `design/use-open-design.ts:9`, whose computed holds an `Option` (AD-24; a `deferred-work.md` entry). `packages/editor/src/testing/mount-shell.ts` -- registers `designModule`, `workersModule`, `editorModule`, not `commands`' modules.
- `packages/ui/src/button/UiButton.vue` -- `min-h-target-min` (24px) fits the 30px strip.
- `app/src/main-modules.ts` -- the module list.
- Vitest 5.0.5 fakes every timer but `nextTick` and `queueMicrotask` by default, `performance` and `requestAnimationFrame` included (`vitest/dist/chunks/index.aTZaPVhf.js:6852`).

## Tasks & Acceptance

**Execution:**
- [ ] `packages/workers/src/model-worker/types.ts` -- `WorkerFailed`, `RunningStage { stage; arrivedAt }`, `PostedIssues { seq; violations }`; `ModelWorkerStatus = 'idle' | 'running' | WorkerFailed`; the error listener takes `Event` (a throw delivers an `ErrorEvent`, a failed load a plain `Event`, Sergii decision). `index.ts` exports the new types.
- [ ] `packages/workers/src/model-worker/model-worker-lifecycle.ts` (service) -- `issues: Option<PostedIssues>`, `runningStage: Option<RunningStage>` (`performance.now()` on arrival); `issues` resets the count, `stage-started` and `derived-files` don't; every accepted post clears the running stage, `stage-started` then sets it; a spawn clears it; `#crash` takes the message and reads the running stage before clearing.
- [ ] `packages/workers/src/model-worker/worker-failure-text.ts` -- the two fixed texts (constants; one file, AGENTS.md's "one kind of thing").
- [ ] `packages/workers/src/testing/fake-worker.ts` -- `crash(message?)` dispatches an `ErrorEvent` with that message, or a plain `Event` when none is given.
- [ ] `packages/workers/src/model-worker/model-worker-lifecycle.spec.ts` -- the workers rows; the rows the Code Map names change.
- [ ] `packages/commands/package.json` -- add `@keeb-cad/workers`.
- [ ] `packages/workers/src/testing/recording-model-worker-lifecycle.ts` -- an overriding `status` getter with a setter method, and recorded `restart` calls, for `commands`' spec through `di`.
- [ ] `packages/commands/src/model-worker/restart-model-worker.ts` (service: action class, id `modelWorker.restartModelWorker`, label `Restart`, `emptyInputSchema`; `available` is status not `idle`; `apply` calls `lifecycle.restart()`) + `model-worker-actions-module.ts` (function: a `di` module) + spec with the recording lifecycle; `index.ts` exports both.
- [ ] `app/src/main-modules.ts`, `packages/editor/src/testing/mount-shell.ts` -- add `modelWorkerActionsModule`.
- [ ] `packages/editor/src/status-strip/use-violation-counts.ts` (function, composable), `use-running-stage.ts` (function, composable: re-arms VueUse's `useTimeoutFn` for the next change: 1001 ms after arrival, then at each whole second after arrival, 2000 ms first; it passes `Math.floor(elapsed / 1000)` to `formatNumber(…, 's')`, so the formatter never rounds it), `use-worker-failure.ts` (function, composable); `ViolationCounts.vue` (function, component), `ModelWorkerState.vue` (function, component: the running stage or `failed:`, the latter with a Red `●` as text and the message in Text; Restart is `UiButton`); `types.ts`. Each composable's computed holds plain values or `undefined`, never an `Option`.
- [ ] `pnpm-workspace.yaml`, `packages/ui/package.json`, `packages/editor/package.json`, `packages/editor/vitest.config.ts` -- `@vueuse/core: 14.4.0` enters the catalog; `ui` and `editor` take `catalog:`; `optimizeDeps.include` gains `@vueuse/core`.
- [ ] `packages/ui/src/format/` -- `DisplayUnit` gains `s` (` s`) and `none` (no suffix), with spec rows.
- [ ] `packages/ui/src/severity-count/UiSeverityCount.vue` (function, component: `severity`, `count`, `dimmed`; `●` / `▲` as text, the mono number through `formatNumber(count, 'none')` and a `sr-only` word, so the visible text is `● 0` and the element's text `0 errors`, `1 error`), `types.ts`, spec, `workbench/states/severity-count-states.ts` (each severity, dimmed, 0, 1, many) and `workbench/widgets.ts`, `index.ts` export; `theme/theme.css` gains `--color-glyph-stroke` (Latte: Text; Frappé: `transparent`) in all four theme blocks and an `@utility glyph-stroke` (1px `-webkit-text-stroke`), which the `▲` uses.
- [ ] `packages/editor/src/shell/StatusStripLandmark.vue` -- renders them.
- [ ] `packages/editor/src/status-strip/*.spec.ts` (browser) -- the editor rows, in both themes; `mountShell` gains `spawn` (function, test helper option), which starts the lifecycle on a `FakeWorker`.
- [ ] `app/src/launch/launch.spec.ts` or a sibling spec -- the integration rows, from `mainModules`.
- [ ] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- six entries: the violations-panel story answers whether `failed:` also shows there (Sofia's pick: no); bmad-ux reconciles Output states' `◌` and `rebuilding N%` with AD-11; 13.17/13.18 add the severity row; `design/use-open-design.ts:9` holds an `Option` in a computed (AD-24: "A value that is stored (a computed, a ref) … is unwrapped first"); `model-worker-lifecycle.spec.ts`'s `arrange` runs `registerCommand(container, RenameDesign)` for every test (AGENTS.md: "Arrange only what the test uses"); its `aViolation` literal has no `schema/testing` builder (AGENTS.md: "Build schema values the test doesn't read with the concept's test builder"), which the first violation kind's story adds.
- [ ] Docs commit on main, before the code branch: the spine's AD-11 `message` sentence adds "or an error event carrying none (a script that fails to load)"; `DESIGN.md` names `glyph-stroke`.

**Acceptance Criteria:**
- Given each boundary-table row, when `pnpm test` runs, then a test named for it passes at its level, the editor rows in Chromium and Firefox.
- Given each toggled bug, its tests go red and green once restored: the 1000 ms comparison at `>=`; `stage-started` resetting the count; a click on Restart not invoking the action (the app row); `modelWorkerActionsModule` missing from `mainModules`.

## Implementation Notes

- Decision (Sergii): dimming turns the glyph `text-muted` too, not only the number, so red and yellow appear only on a current result (as built; he chose it at the preview).
- Decision (Sergii): `landmarks.spec.ts`'s "land on the empty inspector, then the status strip" drops the strip's `toBeEmptyDOMElement`, not an assertion that the strip shows counts, because 23.8's plan: "The status strip is an empty labelled landmark; 23.23 fills it", and AGENTS.md: "Test a rule where it is defined". `toHaveFocus` stays.
- Decision (build): the Restart click ignores `invoke`'s result (`void invoke`), not a toast, because the action is unavailable only while `idle`, when the button isn't shown; `packages/editor/src/slide-out/LeftRail.vue` does the same.
- Decision (build): `useWorkerFailure` uses a `typeof` check, not ts-pattern, because lint rejects `() => undefined` branches (implementer's run).
- Decision (build): `tooling/design-tokens.spec.ts` counts 53 colours, not 52, because docs commit 879b12c added `glyph-stroke` to DESIGN.md; that commit left this spec red on main until this branch merges.
- The acceptance item "the 1000 ms comparison at `>=`" goes red only with the first timer also moved to 1000 ms: the timer arms at 1001 ms, so nothing renders at exactly 1000 (implementer's toggle, 45 passed for the comparison alone).

- Decision (build): the truncated `failed:` span takes `tabindex="0"`, not hover only, because EXPERIENCE.md requires everything keyboard-reachable and the tooltip is the only way to read the cut-off text.

## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer; 0 findings dropped): high 0, medium 1, low 8, false 1, rejected low 2.

| Lens | Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- | --- |
| quick | The `>=` comparison has no test of its own | low | reject | The first timer at 1001 ms guards the threshold; the fix edits this build's plan; recorded in Implementation Notes. |
| quick | A dimmed warning keeps its Latte stroke | low | patch | `glyph-stroke` applied on `!isError`; DESIGN.md gives the stroke to Yellow glyphs. |
| quick | A long `failed:` message breaks the 30px strip | medium | patch (Sergii: truncate + tooltip) | The span has no truncation; EXPERIENCE.md: "the full state text shows in a tooltip and stays the accessible name". |
| quick, test-reviewer | The glyph test narrows with `startsWith` | low | patch | AGENTS.md: "assert whole values". |
| test-reviewer | `clears when an accepted post arrives` never shows the stage first | low | patch | No precondition; passes if the stage never rendered. |
| test-reviewer | `countsText()` normaliser | low | patch | AGENTS.md: expected values not tied to a helper's cleanup. |
| test-reviewer | `scheme === 'dark'` branch and `previousElementSibling` | low | patch | AGENTS.md: "No `if` or loop around `expect`". |
| test-reviewer | Restart rows hard-code worker counts and epochs | low | patch | AGENTS.md: "Assert relative to the arranged state". |
| test-reviewer | `vi.useRealTimers()` makes the Restart row racy | false | reject | A timer scheduled on the fake clock is dropped when real timers return; `refresh` runs again only on a `running` change. |
| test-reviewer | `prints %s with its suffix` on the `none` row | low | patch | Name and row disagree. |
| test-reviewer | `mainSeq` undefined with issues is undimmed | low | reject | Unreachable: a worker spawns only once the store holds a `Committed` (AD-11). |
| test-reviewer | `renders the $name state visibly` asserts only visibility | low | reject | A workbench smoke row; the state rows assert content. |
| test-reviewer | `arrivedAt: expect.any(Number)` | low | patch | Can't fail if the time isn't taken on arrival. |

## Design Notes

- **Decision (plan): the crash-count tests live in `workers`, and the editor rows assert only what the strip shows,** not the whole ticket verify in `editor`, because AGENTS.md: "Test a rule where it is defined; a package that uses it tests only its own part."; `workers`' specs already run in Chromium and Firefox (`packages/workers/vitest.config.ts`).
- **Decision (plan): a `UiSeverityCount` in `ui`, not glyph classes in `editor`,** because the spine: "Callers pass a `ui` component only **outer layout classes** … never what the component styles itself", and DESIGN.md's Latte rule (a Yellow glyph with a Text stroke) is the component's own styling.
- **Decision (plan): dimmed text is `text-muted`, not `text-faint`,** because EXPERIENCE.md asks "WCAG AA text contrast … in both themes" and Latte's `text-faint` on `chrome` measures 2.6:1 (`text-muted` 5.1:1).
- **Decision (plan): `issues` and `runningStage` are `Option` getters over unwrapped refs,** not `T | undefined`, because AD-24: "`Option<T>` replaces `T | undefined` in code signatures (a return, a getter)" and "A value that is stored … is unwrapped first".
- **Decision (plan): the timer stays in the composable, not a `di` clock service,** because AGENTS.md: "never register a clock only so tests can control it", and it is the strip's presentation of a state the service holds.
- **Decision (plan): arrival time is `performance.now()`, not `Date.now()`,** because MDN: "`Date.now()` may have been impacted by system and user clock adjustments", while `performance.now()`'s clock "never decreases".
- **Decision (plan): `glyph-stroke` is a new token, `transparent` in Frappé, not an arbitrary Tailwind value or `overlap-warning-stroke`,** because DESIGN.md gives the stroke only "On Latte", 23.8's plan forbids arbitrary values, and the overlap token is named for another thing.
- **Decision (plan): `formatNumber` gains `s` and `none`, not `String(n)` in `editor`,** because AD-26: "**Numbers** become text in one `ui` formatter".
- **Decision (plan): id `modelWorker.restartModelWorker` in `commands/src/model-worker/`, label `Restart`,** not a `workers` folder name, because the Naming row: "a command id is `<concept folder>.<verb+noun camelCase>`", and the spine names the action Restart.
- **Decision (plan): `FakeWorker.crash(message?)` sends an `ErrorEvent` or, with none, a plain `Event`, not `ErrorEvent` only,** because both reach the listener in Chromium and Firefox (Sergii's no-message decision).
- **Decision (plan): a post the gate drops leaves the running stage, not any post clearing it,** because AD-11: "anything from another epoch is dropped", and a dropped message isn't a post main received.
- **Decision (plan): `1 error` in the singular, not `1 errors` or a label before the number,** because the ticket writes the count first ("0 errors and 0 warnings") and a screen reader reads the text as written.
- **Decision (plan): `useTimeoutFn` re-armed to the next boundary, not VueUse's `useNow`,** because `useNow` defaults to a `requestAnimationFrame` scheduler (`@vueuse/core/dist/index.js:5583`), whose fake frames fall every 16 ms (`vitest/dist/chunks/index.aTZaPVhf.js:5425`): the last frame before 1001 ms is at 992 ms, so the row would see nothing.

## Conformance Log

- `State glyphs (● ▲ ✓ ▾ ⊕) stay text.` -- fixed.
- `**Numbers** become text in one ui formatter` -- fixed.
- `Give every threshold three rows` (plural, last crash's message) -- fixed, asked.
- `A choice no requirement made is a decision and is labelled as one.` (clock, token, id, FakeWorker) -- fixed.
- `The tokens live in ui's @theme (DESIGN.md names, Catppuccin values)` -- fixed.
- `Test wiring between packages as integration in pipeline or app` (Restart, the action) -- fixed.
- `A value that is stored (a computed, a ref) … is unwrapped first` -- fixed; deferred (`packages/editor/src/design/use-open-design.ts:9`).
- `Give every test an expect that fails when the behaviour breaks` (`model-worker-lifecycle.spec.ts:339`) -- fixed.
- `Glossary terms only.` (`ModelWorkerEntry`, `IssueCounts`) -- fixed.
- `(service) or (function)` tags; `use-running-stage` timer -- fixed.
- Stale line citations -- fixed.
- Non-zero counts (`only zero counts can be posted`) -- asked.
- gap: `packages/editor/package.json` `@vueuse/core` -- fixed.
- gap: `packages/ui/workbench/widgets.ts` -- fixed.
- gap: `packages/commands` spec on Node with `ErrorEvent` -- fixed (recording lifecycle).
- Final pass: `A choice no requirement made is a decision and is labelled as one.` (dropped posts, plural) -- fixed.
- Final pass: `Arrange only what the test uses`, `Build schema values the test doesn't read with the concept's test builder` (`model-worker-lifecycle.spec.ts`) -- deferred.
- Final pass: `Halves round away from zero on the decimal value` (floor before formatting) -- fixed.
- Final pass: `The tokens live in ui's @theme` (`DESIGN.md` in the docs commit); `Name a thing for what it does` (`none`); UiButton, row order, a running-stage Restart row -- fixed.
- Dropped findings: 0; final pass: `ModelWorkerState` and `PostedIssues` kept (no rule's words name them wrong).

## Verification

**Commands:**
- `pnpm test` -- expected: green, the editor and workers rows in Chromium and Firefox.
- `pnpm check` -- expected: exit 0.

**Manual checks:**
- `pnpm --filter app dev`, open `/`: the strip reads 0 errors and 0 warnings in both themes.

## Boundary Table

| Group | Row | Input | Expected | Level |
| --- | --- | --- | --- | --- |
| production bugs | stage-started resets no count | 2 crashes, a `stage-started` at the latest seq, a crash | failed | unit (workers) |
| production bugs | derived-files resets no count | 2 crashes, a `derived-files` post, a crash | failed | unit (workers) |
| production bugs | issues resets the count | 2 crashes, an `issues` post, 2 crashes | running | unit (workers) |
| rules | just below the crash cap | 2 consecutive crashes | running | unit (workers) |
| rules | on the crash cap | 3 consecutive crashes | failed | unit (workers) |
| rules | failed names the running stage | 3 crashes each after a `stage-started` for plates | `{ message, stage: 'plates' }` | unit (workers) |
| rules | failed with no stage, none started | 3 crashes, no `stage-started` | `{ message }` | unit (workers) |
| rules | failed with no stage, a post after it | a `stage-started`, then a `derived-files` post, then the crash | `{ message }` | unit (workers) |
| rules | message from the error event | a crash with message `boom` | `message: 'boom'` | unit (workers) |
| rules | the last crash's message | 3 crashes: `a`, `b`, `c` | `message: 'c'` | unit (workers) |
| rules | a stale `stage-started` | below the latest seq | no running stage | unit (workers) |
| rules | a message that fails to deserialize | `messageerror` at the cap | `model worker sent an unreadable message` | unit (workers) |
| rules | an error event with no message | a plain `Event`, at the cap | `model worker did not load` | unit (workers) |
| rules | an empty message | `ErrorEvent` with `''`, at the cap | `model worker did not load` | unit (workers) |
| rules | Restart clears failed | failed; `restart()` | `running` | unit (workers) |
| rules | a new epoch clears the running stage | a `stage-started`, a crash below the cap | no running stage | unit (workers) |
| rules | running stage cleared by a post | a `stage-started`, then an `issues` post | no running stage | unit (workers) |
| rules | a stale post keeps the running stage | a `stage-started`, then `issues` below the latest seq | the stage stays | unit (workers) |
| rules | issues keep their seq | `issues` at seq n | `{ seq: n, violations }` | unit (workers) |
| rules | just below the threshold | `stage-started` for parts; 999 ms | no stage shown | unit (editor) |
| rules | on the threshold | 1000 ms | no stage shown | unit (editor) |
| rules | just above the threshold | 1001 ms | `parts`, `1 s`, Restart | unit (editor) |
| rules | seconds, just below the boundary | 1999 ms | `1 s` | unit (editor) |
| rules | seconds, on the boundary | 2000 ms | `2 s` | unit (editor) |
| rules | seconds, just above the boundary | 2001 ms | `2 s` | unit (editor) |
| rules | counts before the first post | no `issues` | 0 errors, 0 warnings, dimmed, `◌` | unit (editor) |
| rules | counts at main's seq | `issues` at main's seq, 0 violations | 0 and 0, no `◌` | unit (editor) |
| rules | counts behind main | `issues` at seq n, main at n+1 | 0 and 0, dimmed, `◌` | unit (editor) |
| rules | failed with a stage | failed `{ message: 'boom', stage: 'plates' }` | `failed: plates: boom`, Restart | unit (editor) |
| rules | failed with no stage | failed `{ message: 'boom' }` | `failed: boom`, no stage, Restart | unit (editor) |
| rules | Restart unavailable when idle | status `idle` | `available` false | unit (commands) |
| rules | Restart available running | status `running` | `available` true | unit (commands) |
| rules | Restart available failed | status failed | `available` true | unit (commands) |
| rules | plural below | count 0 | `0 errors` / `0 warnings` | unit (ui) |
| rules | singular on | count 1 | `1 error` / `1 warning` | unit (ui) |
| rules | plural above | count 2 | `2 errors` / `2 warnings` | unit (ui) |
| rules | seconds format | `formatNumber(2, 's')` | `2 s` | unit (ui) |
| rules | count format | `formatNumber(0, 'none')` | `0` | unit (ui) |
| module boundaries | the action | `RestartModelWorker.apply({})`, recording lifecycle | one `restart` recorded | unit (commands) |
| module boundaries | both themes | dark / light | the strip's text colours are the tokens' | unit (editor) |
| glue | Restart from failed | `mainModules`, failed; click Restart | the worker respawns at the next epoch, `failed` is gone | integration (app) |
| glue | Restart from a running stage | `mainModules`, a `stage-started`, 1001 ms; click Restart | the worker respawns at the next epoch, the stage is gone | integration (app) |
