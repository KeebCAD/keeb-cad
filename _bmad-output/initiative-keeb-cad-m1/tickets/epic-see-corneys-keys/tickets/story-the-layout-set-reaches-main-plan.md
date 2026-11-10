---
title: 'The Layout set reaches main'
type: 'feature'
ticket: 22
created: '2026-11-10'
status: 'built'
baseline_revision: '192129d399a11ad1c425363443bfc86e8390bb31'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The model worker computes parts and placements but posts neither, so main has nothing to draw: 13.7's canvas needs the Layout set (parts and layout) on main at the latest seq.

**Approach:** `protocol` gains struct-of-arrays codecs for `PartsOutput` and `LayoutOutput` and one `layout-set` message. `pipeline` packs both from one synchronous read into fresh buffers and posts them, transferred, at every seq whatever the focus. `workers` keeps each output in its own `shallowRef`, swapped in the same handler, finds ids by binary search and says when the set has arrived. `model` gives zero-row outputs for a form milestone 1 doesn't build.

## Boundaries & Constraints

**Always:**
- Each output's ids are one plain `string[]`, sorted by `schema`'s `compareId`; row *i* of every column is `ids[i]` (AD-11).
- Parts and layout travel in one `layout-set` message at one seq, both fields required by its type (AD-11: "the two always travel in the same message").
- Every post packs into new typed arrays and transfers only those buffers (AD-11 Fresh buffers).
- `pipeline` reads `parts` and `placements` in one synchronous block, so both belong to the seq it stamps.
- A form other than split with board `reversible` gives zero-row parts and placements and runs no part lane (AD-6: "the others load and report unsupported-form instead of producing outputs").
- Main reads typed views straight from the posted buffers; it builds no plain objects for a whole output and no id index (AD-11).

**Never:**
- No focus reordering, no yield between stages (deferred-work.md, Sergii 2026-11-10). No `unsupported-form` violation (13.6). No drawing (13.7). No fallback unpack of a whole output.
- No `vi.mock`, snapshots or jsdom.

**Decisions (Sergii, 2026-11-10):**
- Focus reordering is left out, not built with yields or fake stages, because with the Layout set the only set any stage fills, no reordering test can fail when the reordering breaks. Its work and test go to the first story that fills a second set (deferred-work.md).
- 13.22 makes model give zero-row outputs for an unsupported form, not pipeline and not 13.6, because AD-6 puts "instead of producing outputs" in model and the ticket asserts the empty set now. 13.6 still adds the violation.
- The message is one kind per set, `layout-set` with `parts` and `layout` both required, not one generic `outputs` kind, because the type then refuses a layout without its parts.
- Planning continues after the split, not a halt for Sofia, because 13.7 names story 22 only for the posting, which 13.22 keeps, not for the reordering.
- The glossary gains **workspace set** (the Layout set is the Layout workspace's), not a rename to existing terms, because AD-11 already calls the message "the workspace set" and the per-set kind reads as `<workspace>-set` (spine 2e0ea26).

## Boundary table

Rows 1–6 run in protocol, 7–9 model, 10–15 pipeline, 16–22 workers, 23–25 app.

| # | Group | Level | Input / State | Expected |
|---|---|---|---|---|
| 1 | rules | unit protocol | `packPartsOutput` then `readPartsRow` of every row: 0 / 1 / 3 rows | ids and every row equal the input |
| 2 | rules | unit protocol | `packLayoutOutput` then `readLayoutRow`: 0 / 1 / 3 rows, mixing slot and group, each `fit`, `mirrored` both ways | ids and every row equal the input |
| 3 | production bugs | unit protocol | a layout row with `placed` false and NaN frame and anchorAt | reads back NaN, `placed` false |
| 4 | production bugs | unit protocol | a frame value 22.728 and a `part` of −1 | reads back 22.728 exactly and −1 |
| 5 | module boundaries | unit protocol | a packed output through `structuredClone` with `buffersOf(packed)` as the transfer list | the clone reads back equal; the original's columns are detached (length 0) |
| 6 | rules | unit protocol | `packPartsOutput` twice on one output | two sets of distinct buffers (`not.toBe`) |
| 7 | rules | unit model | `meta.form` unibody / split reversible, three slots (the form rule's own rows are in `isSupportedForm`'s spec) | parts and placements zero rows / three slot rows |
| 8 | rules | unit model | unibody design | the fake runner's recorded `runs` stay empty |
| 9 | glue | unit model | split reversible → unibody by a whole-design replace | placements go from rows to zero rows |
| 10 | rules | unit pipeline | a design message at seq 1, focus `layout` | posts in order: stage-started parts, stage-started layout, layout-set, issues, derived-files |
| 11 | rules | unit pipeline | focus `pcb` / `case` | the same layout-set is posted |
| 12 | rules | unit pipeline | `parts` and `placements` given to `arrange` as refs; the test sets new values before sending seq 2 | each layout-set carries the pair held at its own seq |
| 13 | production bugs | unit pipeline | the same derivation values posted at seq 1 and seq 2 | both posts read back equal; the derivations' values unchanged |
| 14 | rules | unit pipeline | zero-row parts and placements | a layout-set with zero-row outputs at that seq |
| 15 | glue | unit pipeline | a layout-set post | every column buffer of both outputs is in the transfer list (the sent copies are detached on the worker side) |
| 16 | rules | unit workers | `findRow` over ids sorted by `compareId`, `['a', 'b', '😀', '￿']`: each of the four / 'A' (below first) / 'aa' (between) / '￿￿' (above last) / `[]` | Some(0..3) / None / None / None / None |
| 17 | module boundaries | unit workers | a layout-set at main's latest seq | `parts` and `layout` hold that seq's outputs; `layoutRow(id)` of a posted id gives its row, of an absent id None |
| 18 | rules | unit workers | none posted / a layout-set at main's latest seq | `layoutSetArrived` false / true |
| 19 | rules | unit workers | a commit after the set arrived | `layoutSetArrived` false until the next layout-set |
| 20 | module boundaries | unit workers | a layout-set below main's latest seq (the gate's own rule is tested in `messaging`) | dropped: both snapshots unchanged |
| 21 | glue | unit workers | a layout-set after two crashes, then a third crash | the worker restarts again (the post reset the count) |
| 22 | glue | unit workers | stage-started then a layout-set | `runningStage` None |
| 23 | glue | integration app | real model worker: NewDesign, then Corney's script by `runById` | the Layout set arrives at the latest seq; read through `layoutRow`, every slot row's `part` names its run's row in that post's parts ids, every group row −1 |
| 24 | glue | integration app | `replaceDesign` of a unibody design | the Layout set arrives at its seq with zero rows in both outputs |
| 25 | glue | integration app | Corney's script, then one more AddSlot | after it arrives, every slot row's `part` indexes the parts ids of the same post, at the new seq |

</frozen-after-approval>

## Code Map

- `packages/protocol/src/model-worker/types.ts:14-46` -- `ModelWorkerMessage` union and `FromModelWorker`. Add `layout-set` to both. `protocol` imports only `schema` and `messaging` (spine AD-10); `package.json` has no `valibot`.
- `packages/protocol/src/index.ts` -- re-exports only.
- `packages/schema/src/layout-output.ts`, `parts-output.ts`, `types.ts:69,91` -- the output types; `compare-id.ts:2` -- `compareId`. Builders `aLayoutOutput`, `aPartsOutput` in `schema/src/testing/`.
- `packages/messaging/src/dispatcher/dispatcher.ts:8-16` -- `send(endpoint, message, transfer)`. `sending/assert-plain.ts:15-18` already accepts typed arrays over an `ArrayBuffer`.
- `packages/pipeline/src/pipeline/pipeline.ts:73-98` -- `#runStages` posts stage-started parts, issues, derived-files; extend it. `pipeline/types.ts:9-12` -- `PipelineDerivations` gains `placements: ReadonlyRef<LayoutOutput>`. `pause/types.ts:5-6` -- stages run synchronously after the pause; keep it.
- `packages/pipeline/src/pipeline/pipeline-stages.spec.ts:51-77` -- `arrange` and `startRecording`; extend them with `placements`. Its existing post orders and `toHaveLength` counts change with row 10.
- `packages/pipeline/src/pipeline/pipeline.spec.ts:32,65-76,99,125,153` -- also builds `PipelineDerivations` (`{ parts, pins }`) and lists posts (`postsAt`, `posts.slice(0, 3)`); add `placements` and the two new posts. Both specs wait for `expectedOrder.length` posts, not a typed count.
- `app/` may not import `protocol` (`.dependency-cruiser.mts:83-97`, spine AD-10 "Only `pipeline`, `workers` and `editor` import it"), so app specs read rows through `workers`.
- `packages/model/src/parts/create-derivations.ts:33-121` -- selectors, `parts`, `placements` at L119. Add a `form` selector; `parts` and `placements` return zero rows for an unsupported form. `create-derivations.spec.ts` -- extend.
- `packages/workers/src/model-worker/model-worker-lifecycle.ts:23-26,60-62,129-142` -- the `issues` snapshot precedent (a `shallowRef`, a getter returning `Option`), and `#watch`'s handlers, where `layout-set` is added; it resets `#crashes` and clears `#runningStage` like `issues`. `types.ts` -- `PostedIssues` precedent.
- `packages/workers/src/testing/fake-worker.ts` -- fakes `Worker`; `post(message)` delivers without cloning.
- `packages/workers/src/model-worker/model-worker-lifecycle.spec.ts` -- lifecycle specs; add rows 17–22 here.
- `packages/design/src/store/design-store.ts:50,148` -- `current: Option<Committed>` over a `shallowRef`, so `seq` reads are tracked.
- `app/src/model-worker-entry.spec.ts` -- real-worker precedent: `mainModules`, `MemoryBackend`, `lifecycle.start(spawn)`, `expect.poll(…, { timeout: 10_000 })`.
- `reference-designs/src/scripts` -- `corneyIslandLayout`; `app/src/corney-column.spec.ts` runs it through `runById`.

## Tasks & Acceptance

**Execution:**
- [x] `packages/protocol/src/parts-output/{parts-output-codec,types}.ts` -- `packPartsOutput` and `readPartsRow` (function); `PackedPartsOutput = { ids; w; h }` and `PartsRow = PartsOutput['rows'][number]` in its `types.ts`.
- [x] `packages/protocol/src/layout-output/{layout-output-codec,types}.ts` -- `packLayoutOutput` and `readLayoutRow` (function); `PackedLayoutOutput = { ids; kind; x; y; rot; mirrored; anchorX; anchorY; part; fit; placed }` and `LayoutRow = LayoutOutput['rows'][number]` in its `types.ts`.
- [x] `packages/protocol/src/transfer/buffers-of.ts` -- `buffersOf(packed)` (function) lists each column's buffer of either packed output. Numbers are `Float64Array`, `part` `Int32Array`, the rest `Uint8Array`. Export from `index.ts`.
- [x] `packages/protocol/src/model-worker/types.ts` -- `{ kind: 'layout-set'; parts: PackedPartsOutput; layout: PackedLayoutOutput }` in `ModelWorkerMessage` and `FromModelWorker`; `messages.types.spec.ts` gains its type rows.
- [x] `packages/protocol/src/{parts-output,layout-output,transfer}/*.spec.ts` -- rows 1–6.
- [x] `packages/model/src/form/is-supported-form.ts` -- `isSupportedForm(form)` (function): true only for split with board `reversible`, with its own spec over the three forms.
- [x] `packages/model/src/parts/create-derivations.ts` -- a `form` selector computed (inside `createDerivations`, a function); `parts` and `placements` give zero rows, with no lane run, when `isSupportedForm` is false, as literals inline in the two computeds. No other helper goes in this file. Spec rows 7–9 in `create-derivations.spec.ts`, using its `FakeRunner`'s `runs`.
- [x] `packages/pipeline/src/pipeline/{pipeline,types}.ts` -- `PipelineDerivations` gains `placements`; `#runStages` posts stage-started `parts`, reads `parts`, posts stage-started `layout`, reads `placements`, then posts `layout-set` with both packed and `buffersOf` both as the transfer list, then `issues` and `derived-files` as now. Spec rows 10–15.
- [x] `packages/workers/src/stage-snapshots/{find-row,types}.ts` -- `findRow(ids, id): Option<number>` (function), binary search by `compareId`. `Posted<T> = { seq: number; output: T }` in `types.ts`. Spec row 16.
- [x] `packages/workers/src/model-worker/model-worker-lifecycle.ts` (service) -- `parts` and `layout` getters, each `Option<Posted<…>>` over its own `shallowRef`, set in the one `layout-set` handler, which also resets `#crashes` and clears `#runningStage`; `layoutSetArrived` (both at the store's current seq); `layoutRow(id): Option<LayoutRow>` (`findRow`, then `protocol`'s `readLayoutRow`). Export `findRow` and `Posted` from `index.ts`. Spec rows 17–22. `testing/recording-model-worker-lifecycle.ts` is unchanged. The new getters carry no comment restating them (the `issues` getter's L23 comment is not copied).
- [x] `app/src/layout-set.spec.ts` -- rows 23–25 through the real model worker.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row has a passing test at its level.
- Given rows 23–25, when the implementer drops the `layout-set` post from `#runStages`, then those tests go red; name the toggled bug in the PR.

## Implementation Notes

- Toggled bug: dropping the `layout-set` send from `Pipeline.#runStages` turned rows 23–25 (`app/src/layout-set.spec.ts`) red in Chromium and Firefox; restored.
- `packages/pipeline/src/pause/blueprint-pause.spec.ts` also builds `PipelineDerivations` and gained `placements`; the Code Map missed it.
- Decision (build): `packages/protocol/tsconfig.vitest.json`'s comment now says the specs run on Node too, not left as "type-only", because protocol is a configless runtime project. Evidence: root `vitest.config.ts` makes every `packages/*` without its own `vitest.config.ts` a runtime project (`configlessProjects`); `pnpm test` ran the codec specs. Comment only, no setting changed.
- Decision (build): a row outside a packed output throws `RangeError` in `valueAt`, not `undefined` or NaN, because main reaches a row only through an id `findRow` found, so an outside row is a caller's bug (plan: `layoutRow` = `findRow`, then `readLayoutRow`).
- Decision (build): an unknown enum code throws `RangeError` in `optionOfCode`, not a fallback option, because `packLayoutOutput` writes only codes from `kindCodes`/`fitCodes` (`Record<Kind, number>`, exhaustive by `tsc`). Tested directly in `option-of-code.spec.ts` (code 9), since no packed output can hold one.
- Decision (build): a fractional row throws `RangeError` in `valueAt` too, not a truncated read, because a row index comes only from `findRow`, which returns whole numbers; `value-at.spec.ts` row 0.5. Its message says "outside", which is loose for a fraction (logged low, pass 2).
- Decision (build): `packed.ids` is the output's own array, not a copy, because only typed-array buffers are transferred and structured clone copies `ids` (AD-11 Fresh buffers names buffers only).
- Decision (build): the enum read is a reverse search over the one `Record`, not a second reverse table, because the plan's Decision makes the schema's order the one order.
- Decision (build): app rows assert a slot's run as `key@${argumentHash({})}`, not only a row in range, because NewDesign's `defaultPart` is `key` with no inputs and the run id is '<part id>@<hash of its resolved inputs>' (Data Schema `PartsOutput`).
- Review patches (pass 1): `valueAt` moved to `packages/protocol/src/packed-column/`, `optionOfCode` to `layout-output/option-of-code.ts`.
- Real-host run: `pnpm vitest run app/src/layout-set.spec.ts` → `Test Files 2 passed (2)`, `Tests 6 passed (6)` (real `Worker`, Chromium and Firefox); agrees with `FakeWorker` in `model-worker-lifecycle.spec.ts`. `pipeline-stages.spec.ts` runs a real `MessageChannel`.
- Verification: `pnpm test` 475 files, 3781 tests passed, no type errors; `pnpm typecheck` clean; `pnpm depcruise` no violations.

## Plan Change Log

## Review Triage Log

### Pass 1 (quick, test-reviewer), 2026-11-10: high 0, medium 2, low 10, false 3, maybe-false 0

| Finding | Verdict | Route | Evidence / action |
|---|---|---|---|
| layout codec fresh-buffer test checks 3 of 10 columns (row 6) | medium | patch | spec L81-83 compares x, part, kind only; all ten columns compared |
| row 13 test builds expected with the production packers and reads nothing back (both lenses) | medium | patch | spec L298-301 `layoutSetAt(...)`; read back through the row readers against literal rows |
| row 13 can't catch a transferred cache buffer (quick) | false | reject | no derivation holds a typed array: `parts`/`placements` are plain objects and `pack*` builds new arrays per call; the risk has no state to arise from |
| `isSupportedForm` titles say "supports" on false rows | low | patch | title template `'supports %s: %s'` omits `expected` |
| `valueAt` tested only through codecs; thresholds incomplete | low | patch | own spec with −1, 0, last, count, empty, 0.5 |
| fractional row throws with no test or decision | low | patch | row 0.5 in `valueAt`'s spec |
| `valueAt` in `transfer/` (folders by concept) | low | patch | moved to its own concept folder |
| `layout-codes.ts` holds tables and a function | low | patch | `optionOfCode` gets its own file |
| `optionOfCode` throw untested | low | patch | row `optionOfCode(kindCodes, 9)` |
| codes not tied to schema's picklist order by any check | low | reject | pack and read share one table, so any order round-trips; a tie needs `valibot` in protocol's specs, more than a direct correction |
| unibody app test: parts half can't fail | low | patch | `aDesign()` layout has no slots; arranged with a slot |
| lifecycle tests lean on helper-default ids | low | patch | ids passed explicitly |
| shared `threeSlots`/`zeroRows` in a describe callback | low | patch | built per test |
| transfer test spies on `postMessage`, `?? {}` hides a missing post | false | reject | the sender's posted object is reachable only through the call; the expected value names every column, so `{}` from a missing post fails `toEqual` |
| "runs no lane" lacks a positive control | false | reject | `create-derivations.spec.ts:131` asserts `runs` has length 1 for a supported design |
| `POSTS_PER_SEQ` and `objectContaining` in pipeline.spec | low | reject | reviewer judged acceptable; content is asserted in pipeline-stages.spec |

### Pass 2 (quick, test-reviewer, on the diff since pass 1), 2026-11-10: high 0, medium 0, low 8, false 0, maybe-false 0

Nothing above low and no frozen line broken: the review loop ends here; these lows are logged, not patched.

| Finding | Verdict | Route | Evidence / action |
|---|---|---|---|
| `value-at.spec.ts` shares a module-level `Float64Array` (both lenses) | low | logged | Nothing writes to it; AGENTS "no mutable state at module level in a spec" |
| lifecycle "holds each output" compares the posted object by identity (`FakeWorker.post` doesn't clone) | low | logged | `seq` half asserted; content is read back in rows 17 (`layoutRow`) and 23–25 (real worker) |
| row 13 read-back uses one row per output | low | logged | Row 13 is a one-row case as written |
| row 13 read-back forces the post's shape with `as unknown as` | low | logged | Typing `posts` as `FromModelWorker` would drop the cast |
| row 13 "values unchanged" asserts `parts.output`, not the whole `ResolvedParts` | low | logged | Only `output` is packed; `slots`/`violations` never reach the codec |
| `isSupportedForm` title word and `expected` are separate columns | low | logged | Current rows agree; deriving the word from `expected` would tie them |
| plan note said `optionOfCode`'s throw is untested | low | logged | Implementation Notes corrected (documentation, no code) |
| fractional-row throw had no decision; its message says "outside" | low | logged | Decision (build) added to Implementation Notes; message wording left |

## Design Notes

- Decision (plan): numbers pack as `Float64Array`, not `Float32Array`, because the codec must round-trip (ticket). Evidence: `node -e "Math.fround(22.728)===22.728"` prints `false` (22.72800064086914).
- Decision (plan): one typed array per column, each on its own buffer, not one interleaved buffer, because AD-11 names a "struct-of-arrays codec" and "transferred typed-array buffers".
- Decision (plan): enum columns map through a `Record<Kind, number>` typed from `schema`'s `LayoutOutput`, not through the picklist's `options`, because `protocol` "imports only `schema` and `messaging`" (spine AD-10) and has no `valibot` dependency. A missing member then fails `tsc`.
- Decision (plan): the decode side is a row reader, not a whole unpack, because "Main reads typed views straight from the buffers: no plain objects" (AD-11); the whole unpack is only the named fallback.
- Decision (plan): `findRow` lives in `workers`, not `protocol`, because the ticket says "workers … reads typed views straight from the buffers and finds ids by binary search", and `protocol` can't return `Option` (it doesn't import `result`, AD-10).
- Decision (plan): each output gets its own `shallowRef`, set in one handler, not one ref holding the pair, because "Each output replaces the previous one whole in a `shallowRef`" (AD-11).
- Decision (plan): the snapshots sit on `ModelWorkerLifecycle` beside `issues`, not in a new service, because `issues` is already a posted snapshot there (`model-worker-lifecycle.ts:23-26`) and the same gate handler receives both.
- Decision (plan): `pipeline` posts stage-started `layout` before reading `placements`, not only `parts`, because "Before each stage the model worker posts stage-started" (AD-11) and `layout` is a `StageId`.
- Decision (plan): `part` packs as `Int32Array`, not an unsigned array, because groups hold −1 (Data Schema `part`: "groups: -1"). `kind`, `fit`, `mirrored` and `placed` pack as `Uint8Array`, not `Float64Array`, because each holds at most three values (`layout-output.ts`'s picklists and booleans).
- Decision (plan): an enum's code is its option's index in `schema/src/layout-output.ts` (`slot` 0, `group` 1; `fitted` 0, `empty` 1, `stand-in` 2), not a new numbering, so the schema's order is the one order.
- Decision (plan): a `layout-set` post resets the crash count and clears the running stage, not leaves both to `issues`, because the count resets on "a successful post … (a stage output or an `issues` message)" and the running stage shows "until the next post clears it" (AD-11 Lifecycle).
- Decision (plan): `RecordingModelWorkerLifecycle` gets no snapshot setter, not one now, because no spec in this story arranges snapshots through it; 13.7 adds what its canvas tests use ("Arrange only what the test uses", AGENTS).
- Decision (plan): `layoutRow(id)` sits on `ModelWorkerLifecycle`, not a `workers` re-export of `readLayoutRow`, because `app` may not import `protocol` (spine AD-10) and a re-export would hand main a second path to `protocol`'s codecs; the lifecycle already holds the snapshot it reads.
- Decision (plan): the form gate is a selector computed over `meta.form`, not a read of `design.value.meta` inside `parts`, because "Placement reads the design only through per-section selector computeds" (13.2's frozen Always).
- Decision (plan): `isSupportedForm` gets its own file in `model/src/form/`, not a helper inside `create-derivations.ts`, because "a new concept gets a new file" (AGENTS). The file's existing helpers are already in deferred-work.md (13.2).

```ts
// pipeline #runStages: one synchronous run, so both outputs belong to `seq`
this.#dispatcher.send<FromModelWorker>(endpoint, { kind: 'stage-started', epoch, seq, stage: 'parts' })
const parts = packPartsOutput(this.#listening().parts.value.output)
this.#dispatcher.send<FromModelWorker>(endpoint, { kind: 'stage-started', epoch, seq, stage: 'layout' })
const layout = packLayoutOutput(this.#listening().placements.value)
this.#dispatcher.send<FromModelWorker>(endpoint, { kind: 'layout-set', epoch, seq, parts, layout },
  [...buffersOf(parts), ...buffersOf(layout)])
```

## Conformance Log

- Pass 1 (two readers, 11 findings, 0 dropped). `app` reads rows needing `protocol` (`Only pipeline, workers and editor import it`): fixed, `layoutRow` on the lifecycle.
- `Glossary terms only` (`layout-set`, `layoutSetArrived`): asked; Sergii added **workspace set** to the glossary (2e0ea26).
- Untagged `form` selector (tags rule): fixed, `isSupportedForm` (function).
- `Give every decision its rejected alternative` (Int32/Uint8, enum codes, crash reset, post order): fixed, Design Notes.
- `Test a rule where it is defined` (rows 18, 20 re-test the gate): fixed, row 18 reworded, row 20 one row below main's latest.
- Sketch order vs task order: fixed, sketch follows the task.
- `use toHaveBeenCalled* only when the call is the behaviour` (row 8): fixed, the runner's recorded `runs`.
- Row 12 left its arrange open: fixed, refs passed to `arrange`.
- Precedent `create-derivations.ts` helpers (`a new concept gets a new file`): deferred (13.2's deferred-work entry); this plan puts the form gate in its own file.
- gap: `pipeline.spec.ts` builds `PipelineDerivations` and lists posts: fixed, Code Map.
- gap: `RecordingModelWorkerLifecycle` (`packages/workers/src/testing/recording-model-worker-lifecycle.ts`) has no snapshot setter: fixed, Decision (plan) leaves it to 13.7.
- gap: ticket verify `a focus during the hidden phase gets its set next` reaches no state: asked earlier; Sergii left it out (frozen decision, deferred-work.md). The ticket text still names it; Sofia edits the ticket.

- Final pass (one reader, 8 findings, 0 dropped). Zero-row home left open: fixed, inline literals. `Test a rule where it is defined` (row 7 re-enumerates forms): fixed. `LayoutRow` home: fixed. Frozen decisions missing "because": fixed. AD-25 `folders are by concept` (`codecs/`): fixed, one folder per output plus `transfer/`. Precedent `create-derivations.ts` helpers: deferred (existing entry). Precedent `model-worker-lifecycle.ts` restating comments: fixed in plan (not copied); deferred for the precedent. Precedent `pipeline-stages.spec.ts` `toHaveLength(3)`: fixed, wait on the expected order's length. These final-pass fixes have had no reviewer read.

## Verification

**Commands:**
- `pnpm test` -- expected: all green.
- `pnpm typecheck` -- expected: no errors.
- `pnpm depcruise` -- expected: no violations.

**What Sergii's look shows:** nothing visible changes; the Layout set reaches main but 13.7 draws it. `pnpm --filter @keeb-cad/app test layout-set` shows rows 23–25 against the real worker.
