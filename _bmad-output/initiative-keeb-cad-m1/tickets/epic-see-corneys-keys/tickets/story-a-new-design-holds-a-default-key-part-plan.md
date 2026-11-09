---
title: 'A new design holds a default key part'
type: 'feature'
ticket: '18'
created: '2026-11-09'
status: 'built'
baseline_revision: '44019f57a9f66574e2ae5c26a0402ce5d525abe9'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/architecture-blueprints/architecture-blueprints.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A design holds no part, so no slot has a rectangle and 13.2's chain step has nothing to step by; 13.17 and 13.21 can run a blueprint, but no design pins one and no stage calls one.

**Approach:** Add the part sections and `lib:blueprint/choc-key` v1, make `NewDesign` hold the part `key`, and run the parts lane in the model worker through `createDerivations`, resolving every slot to a rectangle or a reported stand-in; add `parts.deletePart` with its refusal.

## Boundaries & Constraints

**Always:**
- Main never carries blueprint code; the parts lane runs only in the model worker.
- A slot always has a rectangle: a design problem is a violation or a stand-in, never a throw.
- Every derivation reads the mirror through per-section selector computeds.
- Saving and reopening a bundle reproduces each file byte for byte.
- Decision (Sergii, 2026-11-09): `BlueprintInputs` is written as one node per input under `inputs`, named by its raw key and sorted by key (`size "1u"`, `width type=quantity value="18mm"`), not a list of `input name=…` nodes, because the file then reads as the data does; AD-8 gains this record rule in the spine before the code.
- Decision (Sergii, 2026-11-09): `createDerivations(design, library, runner)` takes the `LaneRunner` as a third argument, not `inject` inside a container context, because it stays a plain function whose dependencies show at its one call site; the spine's signature gains `runner` before the code.
- Decision (Sergii, 2026-11-09): a part whose run produced no output reports one blueprint violation per run, `ids` the part then every slot on it, not one per slot, because one failure is one problem to fix.
- Decision (Sergii, 2026-11-09): `parts.deletePart` of an id no part has gets no boundary row and no code of its own, not a rejection with `unknown-target`, because the ticket doesn't ask for it and no UI can send one yet.
- Decision (Sergii, 2026-11-09): a design with two parts is arranged with the builders, as a valid opened file could hold it, not left untested until an add-part command exists, because the resolution order must be right before then and `OpenStoredDesign` is a real path to it.
- Decision (Sergii, 2026-11-09): the Data Schema gains `ResolvedParts { output: PartsOutput; slots: Record<Id, { run: string; fit: 'fitted' | 'stand-in' }>; violations: Violation[] }`, coded in `schema` after the spine edit, not a pipeline-owned interface, because the spine says the derivations are `typed by schema's resolved-design types`; `createDerivations` returns `{ parts: ReadonlyRef<ResolvedParts>; pins: ReadonlyRef<BlueprintPin[]> }` (amended by Sergii's review decision).
- Decision (Sergii, 2026-11-09): `LaneRunner` holds a shallow ref the lane computed reads, bumped at the end of a pause only when something was left unavailable or the loaded scripts changed, not a `retryParts()` method `pipeline` calls, because the computed then tracks its real dependency and AD-25 says `Data carries no methods`.
- Decision (plan): a failed run's violation is `error`, `fixes: []`, its slots in `compareId` order, not a warning, because a blueprint reference that can't produce a part is `an error for a library or blueprint reference` in the ticket's own scale.
- Decision (plan): only parts a slot uses run, not every design part, because `PartsOutput` is `one row per resolved part run`; an unused failing part reports nothing.
- Decision (plan): record entries are written in `compareId` order, not locale order, because the spine calls that order UTF-16 code-unit and a canonical file can't depend on a locale.
- Decision (Sergii, 2026-11-09): a rectangle's `w` and `h` must each be above 0, a value of 0 or below failing the lane as a blueprint failure, not any finite number, because a keycap with no size can't step a chain or be drawn.
- Decision (plan): `blueprint/worker` exports `argumentHash` (function), used by `laneCacheKey` and by the run id, not a new `model` -> `hashing` edge, because the Data Schema calls the id `BP-5's argument hash` and AD-10 says `fix the placement` before adding an edge.
- Decision (plan): `parts.deletePart` of a part a slot or group names is left to 13.2's structural check, not refused here, because the spine has that check raise `unknown-target` for `any declared reference an edit leaves pointing at a missing id`, and until 13.2 no command can make a slot name a part.
- Decision (plan): a slot reports one `unresolvable-reference`, for the first level that didn't resolve, set or inherited, not one per level, because the ticket's report is `naming the slot`.
- Decision (plan): 13.18 adds `Slot.part`, `Slot.inputs` and `GroupBase.defaultPart`, not left to 13.2, because the verify says `a group's defaultPart overrides meta.defaultPart for its slots` and `a slot naming a missing design part`, which need those fields; the Data Schema defines them.
- Decision (plan): the run table stays in the worker, not posted to main, because the epic says `new 22 ... owns the LayoutOutput and PartsOutput codecs, pipeline's one-message post of the Layout set`; "posted once" is one row per run in the `PartsOutput` 13.22 will post.
- Decision (plan): no last-good output for a later failing run, not coded now, because `key` declares no inputs and no command changes a part's inputs, and AGENTS.md says `Arrange only a state real commands could reach`; goes to `deferred-work.md` for 13.4.
- Decision (plan): an `unavailable` run reports no violation, not a new kind, because the spine's Violations row has no kind for it and BP names it `transient and uncached`.

**Never:**
- `envelope`, footprints, fingerprints for `key`, the `size` input (13.4), `library.unpin`.
- `PartsOutput`'s codec or post; the layout stage; `checkInputs`; the reference walk (each a later story).
- A migration or a `format-version` bump: AD-8 says `Until the first public preview, format-version stays 1`.

## Boundary table

| Group | Threshold | Input | Expected | Level |
| --- | --- | --- | --- | --- |
| Production bugs | Round trip | a `NewDesign` bundle saved, reopened, saved | each file byte-identical | integration, `app` |
| Production bugs | Round trip | a part with empty `inputs`; boolean, text and quantity inputs; a key `my-input` | byte-identical, the key unchanged (each) | unit, `design-file` |
| Production bugs | Record order | a record of two keys given unsorted | written in `compareId` order | unit, `design-file` |
| Production bugs | Old autosave | an autosave with no `library-versions` | `design-invalid`, a new design opens | integration, `app` |
| Rules | New design | `NewDesign` | `meta.defaultPart` `key`; part `key` applying `lib:blueprint/choc-key`; pinned at 1 | unit, `commands` |
| Rules | Key blueprint | `lib:blueprint/choc-key` v1 compiled and run | one `rectangle`, `{ w: 18, h: 18 }` | unit, `library` |
| Rules | Rectangle | a slot on `key` | run `key@<argumentHash of its inputs>`, 18 x 18 mm | integration, `app` (real sandbox) |
| Rules | One run | two slots on `key`; then their inputs differing | one row; two rows | unit, `model` |
| Rules | Resolution | own part set; unset under a group default; unset, no group default | own; nearest group's; `meta.defaultPart` | unit, `model` |
| Rules | Resolution | nested groups, both with a default | the nearer | unit, `model` |
| Rules | Missing design part | a slot naming one | stand-in on the next level; `unresolvable-reference`, warning, naming the slot | unit, `model` |
| Rules | Unknown library | a slot naming an unknown `lib:part/x` | stand-in; `unresolvable-reference`, error, naming the slot | unit, `model` |
| Rules | Unpinned blueprint | a design part whose blueprint has no pin; a pin `declarations` lacks | stand-in; error, naming the slot (each) | unit, `model` |
| Rules | No output | first run `lane-failed`; `blueprint-api-too-new` | stand-in; only that violation (each) | unit, `model` |
| Rules | No output | `unavailable` | stand-in; no violation | unit, `model` |
| Rules | No slots | a new design, no slots | no run, no violation, empty output | unit, `model` |
| Rules | Argument hash | same inputs; one input changed | same hash; different hash | unit, `blueprint` |
| Rules | One per run | two slots, given out of order, on a part whose first run fails | one error, `fixes: []`, `ids` the part then the slots in `compareId` order | unit, `model` |
| Rules | No recompute | an edit to `meta.name` only | no lane run | unit, `model` |
| Rules | App stand-in | `meta.defaultPart` unresolved, a slot on it | run `stand-in`, 18 x 18 mm, `fit` stand-in | unit, `model` |
| Rules | Stand-in row | every slot resolved | no `stand-in` row | unit, `model` |
| Rules | Rectangle value | `w` just below 0; on 0; just above 0 | `lane-failed`; `lane-failed`; row | unit, `model` |
| Rules | Rectangle value | `h` just below 0; on 0; just above 0 | `lane-failed`; `lane-failed`; row | unit, `model` |
| Rules | Rectangle value | `{ w: 'x', h: 18 }`; no `h`; `{}` | `lane-failed` (each) | unit, `model` |
| Rules | Delete | `parts.deletePart` of `meta.defaultPart`'s part | `default-part-required` naming `key`; design unchanged | unit, `commands` |
| Rules | Delete | another design part, named by no slot or group | removed | unit, `commands` |
| Glue | Registered | `parts.deletePart` of `key` through `mainModules` | refused with `default-part-required` | integration, `app` |
| Rules | Pins | `library-versions` with a blueprint and a part pin | the blueprint only | unit, `model` |
| Rules | Schema | `lib:part/x`; `my-part`; `lib:part/`; `lib:other/x` as a `PartRef` | passes; passes; refused; refused | unit, `schema` |
| Glue | Stage order | a design message | pause, then `stage-started { parts }`, then `issues`, then derived files, at that seq | unit, `pipeline` |
| Glue | Newer seq | patches arriving during the pause | one run, at the newest seq; the older posts nothing | unit, `pipeline` |
| Glue | Backoff | `hasUnavailable` true after stages, 1 ms before / on / 1 ms after the delay | no re-run / re-run once / still once | unit, `pipeline` |
| Glue | Backoff | `hasUnavailable` false after stages | no timer pending | unit, `pipeline` |
| Glue | Retry | a run `unavailable`, then the retry succeeds, design unchanged | the slot leaves stand-in | unit, `model` |
| Glue | Lanes ready | a pause with nothing unavailable before it and the same scripts | ref unchanged | unit, `blueprint` |
| Glue | Lanes ready | a pause after an `unavailable`; a pause loading a new script | ref bumped (each) | unit, `blueprint` |
| Glue | Pins | the start file's derivation | pause receives the design's pin | integration, `app` |
| Glue | Strip | one error and one warning posted | counts 1 and 1 | browser, `editor` |

</frozen-after-approval>

## Code Map

- `packages/schema/src/{design,meta,layout,input-value,types,index}.ts`, `testing/{design,meta}.ts` -- sections after `meta`, in AD-8's order; `inputValueSchema` (`input-value.ts`) has boolean, string, quantity. `ItemId` `types.ts:106`, `ViolationKind` `:134`, `ModelRejectionKind` `:125` (`never` today).
- `packages/design-file/src/codec/{schema-fields,read-kdl,write-kdl}.ts` -- schema-driven; `schema-fields.ts:6-17` needs the new kinds. Literals to update: `round-trip.spec.ts:13`, `write-design-file.spec.ts:11`, `read-kdl.spec.ts`, `migrate-bundle.spec.ts`, storage `read-bundle.spec.ts`, `app/src/launch/launch.spec.ts`.
- `packages/commands/src/design/new-design.ts:22-29` -- the fresh design. `design-actions-module.ts:8` and `app/src/main-modules.ts:13` -- registration pattern; no `registerCommand` call exists yet (`design/src/entries/register-command.ts:6`).
- `packages/model/src/{index,main,worker}.ts` -- `/worker` exports nothing today; `check-structure.ts:5` a stub.
- `packages/blueprint/src/runner/lane-runner.ts:17,26,46` -- `hasUnavailable`, `pause`, `runLane(lane, calls, { canonical, laneArgs })`; `lane/types.ts:43` -- `ConvertHandle` Err is a failure the blueprint caused.
- `packages/pipeline/src/pipeline/pipeline.ts:39,45,56` -- `enter` unawaited, `violations: []`. `pause/blueprint-pause.ts:25-39` -- the run loop and retry.
- `app/src/start-model-worker.ts:13` -- the `() => []` to replace.
- `packages/library/compile/build-library.ts:6` -- sources in `blueprints-src/` (folder doesn't exist yet); `compile/fixtures/two-lanes/` shows the source shape.
- `packages/editor/src/status-strip/use-violation-counts.ts:16-18` -- reads `lifecycle.issues`; only the non-zero row is new (`deferred-work.md:261`).

## Tasks & Acceptance

**Execution:**
- [ ] Spine (docs, edited first and left uncommitted: nothing is committed before Sergii's look) -- AD-8's record rule; `runner` in `createDerivations` at AD-10, AD-25, `ReadonlyRef`'s comment and the Structural Seed; `ResolvedParts`; `argumentHash` in `blueprint/worker`; `reactive` in `blueprint`'s import list.
- [ ] `packages/schema/src/{ref,part-id,part-ref,library-id,library-version,design-part,parts-output,resolved-parts}.ts`, `meta.ts`, `layout.ts`, `design.ts`, `types.ts`, `index.ts`, `testing/{part-id,library-id,part-ref,library-version,design-part,parts-output,layout,meta,design}.ts` -- `ref` (function), schemas with node names `library-version` and `part`, `LibraryId` in `ItemId`, `unresolvable-reference`, `default-part-required`, `ResolvedParts`; builders (function each) `aPartId`, `aLibraryId`, `aPartRef`, `aLibraryVersion`, `aDesignPart`, `aBlueprintDesignPart`, `aPartsOutput`, `aResolvedParts`; `aSlot`, `aFreeGroup`, `aChainGroup`, `aMeta`, `aDesign` take the new fields.
- [ ] `packages/design-file/src/codec/{schema-fields,read-kdl,write-kdl}.ts`, `schema-kinds.spec.ts` -- `boolean`, `union`, `record`, a row each; a record's entries are written sorted and read with the raw key, past `camelCase` (`read-kdl.ts:42`). `packages/storage/.../read-bundle.spec.ts:8`'s copied text becomes a builder's output; the values in `write-design-file.spec.ts` and `read-kdl.spec.ts`'s `metaValue` become `aDesign(...)` and `aMeta(...)`; KDL text the test reads stays.
- [ ] `packages/library/blueprints-src/choc-key/1.ts` -- v1: no inputs, one `rectangle`, 18 x 18; its lane `run` is (function).
- [ ] `packages/blueprint/src/runner/argument-hash.ts`, `lane-cache-key.ts`, `worker.ts` -- `argumentHash` (function).
- [ ] `packages/blueprint/src/runner/lane-runner.ts`, `package.json` (`@keeb-cad/reactive`) -- the lanes-ready shallow ref.
- [ ] `packages/commands/src/design/new-design.ts` -- `key`, its pin, `meta.defaultPart`.
- [ ] `packages/commands/src/parts/{delete-part,delete-part-input-schema,parts-commands-module}.ts`, `types.ts`, `index.ts`; `app/src/main-modules.ts` -- `DeletePart` (service), `partsCommandsModule` (a `di` module), id `parts.deletePart`, its apply calling `deletePart`.
- [ ] `packages/model/src/reject/reject.ts`, `part-deletion/delete-part.ts`, `main.ts` -- `reject` (function), `deletePart` (function, the domain operation over `Mutable<Design>`, holding the refusal).
- [ ] `packages/model/src/parts/{slot-part-runs,resolve-part-ref,part-violation-message,parts-lane-calls,pins-of}.ts` (each (function)), `create-derivations.ts` `createDerivations` (function), `types.ts`; `worker.ts`; `package.json` (`@keeb-cad/blueprint`, `@keeb-cad/reactive`). The lane passes `stageVersion: 1` and `canonical` = its resolved inputs. `parts-lane-calls` holds the `convertHandle` with the `w`/`h` check; its Err is `lane-failed` with cause `role` (`blueprint-vm.ts:257`). Unit rows register a fake `LaneRunner` in the spec's container, resolve it and pass it in; `parts/types.ts` may import from `blueprint`, since `part-deletion/` keeps main's graph clear of it.
- [ ] `packages/pipeline/src/pipeline/pipeline.ts`, `pause/blueprint-pause.ts`, `pipeline-module.ts`, `pause/types.ts` -- stages after the pause, newest seq only, backoff after stages. The Glue specs are written afresh: recording starts after arrange, order asserted, unlike `pipeline.spec.ts`'s helper.
- [ ] `app/src/start-model-worker.ts` -- `createDerivations` with the mirror and `libraryData`, derivations to `Pipeline.listen`.
- [ ] Specs beside each -- the boundary table's rows; `packages/editor` strip row.
- [ ] `deferred-work.md` -- last-good for a later failing run, owner 13.4; `pipeline.spec.ts`'s recording inside `arrange`.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then every row passes, in Chromium and Firefox where it touches the engine or the DOM.
- Given a clean install, when `pnpm check` runs, then the fences and dist checks pass and no blueprint code is in main's bundle.

## Implementation Notes

- `ResolvedParts` is a hand-declared interface in `schema/src/types.ts`, not a Valibot schema in a `resolved-parts.ts`: `Violation` has no schema, and `v.custom` over an object is the pass-through AD-24 avoids.
- Decision (Sergii, 2026-11-09): `PartsOutput` is `{ ids: string[]; rows: { w: number; h: number }[] }`, sorted by `compareId` in the worker, row i belonging to `ids[i]`, not rows carrying their own `id`; the spine holds this shape.
- `compareId` and `ReadonlyRef` are coded here (the spine defines them; no code existed).
- Decision (Sergii, 2026-11-09): the three worker-entry rules in `.dependency-cruiser.mts` (`model/worker`, `design/worker`, `library/worker`) also allow `app/src/*.spec.ts`, not leave the Rectangle and Pins rows unmet at `integration, app`; a `tooling/ad10` row proves a non-spec `app` file is still refused.
- Decision (build): `packages/model/tsconfig.lib.json` adds the WebWorker lib and vite types, not left as it was, because with the baseline file `tsc -p packages/model/tsconfig.lib.json --noEmit` gives 18 errors (`blueprint-vm.ts(27,13): error TS2503: Cannot find namespace 'WebAssembly'`).
- Decision (build): `eslint.config.ts` ignores `packages/library/compiled/**`, not linted, because with the baseline config `eslint packages/library/compiled` gives `error IIFE with parenthesized arrow function body is considered unreadable` on generated output.
- Decision (build): `app/package.json` depends on `@keeb-cad/model`, not reached through another package, because the spine says the model worker's entry `calls createDerivations` and `model/worker` is `imported only` by it.
- Decision (build): `ResolvedParts` is a plain TypeScript type, not a Valibot schema, because the Data Schema says `Types with no schema (the generic helpers, and the refusal and violation types that code builds and nothing parses) are plain TypeScript` and it holds `Violation[]`.
- Decision (build): an `authored` part reports a warning, not an error, because the ticket says `a warning for a design-local part`; a blueprint with no `parts` lane reports an error, because the ticket says `an error for a library or blueprint reference`.
- Decision (build): a backoff retry re-posts `stage-started`, `issues` and derived files, not `issues` alone, because AD-11 says `Before each stage the model worker posts stage-started`.
- Decision (build): a found part with no output stops further `unresolvable-reference` reports for that slot, not the implementer's first cut of reporting both, because the ticket says it `reports only its blueprint violation`; test first, seen red then green.
- Decision (Sergii, 2026-11-09): the three worker-entry fences also allow `app/src/*.spec.ts`, with a `tooling/ad10` row proving a non-spec `app` file is still refused, not moving the Rectangle and Pins rows to 13.22, because these fences guard production bundles and a spec is never bundled.
- Decision (Sergii, 2026-11-09): `PartsOutput` is `{ ids: string[]; rows: { w, h }[] }` sorted by `compareId` in the worker, not an `id` on each row, because AD-11 says `row i of every column is ids[i]`, so 13.22 only packs it; the implementer's spine line is reverted.
- Decision (Sergii, 2026-11-09): `createDerivations` returns `{ parts, pins }`, `pins` its own computed over `library-versions` and out of `ResolvedParts`, not a field of it, because reading it there ran every lane before the pause, against BP-9's `between applying patches and running stages`; patched in place, not reverted and re-derived, at his choice.
Real-host run: the Rectangle row ran the real quickjs-wasi lane in Chromium and Firefox on the test's page, wired by hand (`app/src/default-key-part.spec.ts`). The real worker entry is proven only to post no violation for a slot on `key`, which an `unavailable` run would also do; a lane running inside the worker becomes observable with 13.22's post. `FakeRunner` fakes the repo's own `LaneRunner`.


## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer), 2026-11-09. No quote dropped.

| Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- |
| Reading pins runs every lane before the pause | high | intent_gap, asked; patch | `pipeline.ts` `#enterPause` reads `parts.value.pins`; Decision (Sergii) |
| Changed closure doesn't bump `lanesReady` | false | reject | a closure changes only with `library-versions`, which dirties `parts`; once pins are separate, `parts` first evaluates after the pause, on the new closure |
| Slot listed twice in a failed run's `ids` | medium | patch | `slot-part-runs.ts` doesn't dedupe levels; `[key, key]` pushes twice |
| Record entry's children dropped | medium | patch | `read-kdl.ts:100` lacks `readLoose`'s `children.length === 0` (`:127`); data lost silently |
| `partViolationMessage` untested, used as expected (both lenses) | medium | patch | spine: `one model function ... which tests call`, needs its own unit tests |
| Real-worker test name and expect differ (both lenses) | medium | patch | `violations: []` also holds for `unavailable`; Rectangle row now proves the run |
| Recording starts inside `arrange` | low | patch | `pipeline-stages.spec.ts`; plan's task says otherwise |
| `sameKeys` in a class file | low | patch | AGENTS.md `a class file holds only its class` |
| Fake copies `lane-failed` mapping | low | reject | same mapping as `blueprint-vm.ts:257`, real run covered in the Rectangle row |
| Ternary in an expect | low | patch | AGENTS.md `No if or loop around expect` |
| `isErr` narrowing; duplicate property test | low | patch | direct corrections |
| Newer-seq test can't see a late post; name says once, asserts 2 pauses | low | patch | poll returns at 3 posts |
| Unlisted: slot inputs over part inputs; finite check; argument under key `0`; `deletePart` keeps the pin | low | logged | listed as decisions at the look |
| `null` record message | low | reject | a guard against no shown state |
| `default-part-required` tested at three levels | low | reject | the plan's frozen rows ask for each |

Pass 2 (quick, test-reviewer, on the diff since pass 1), 2026-11-09. No quote dropped. Nothing above low, no frozen line broken: review ends.

| Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- |
| Real-host note overstates the worker run | low | reject (plan edit); corrected | no code affected |
| Pins decision recorded twice | low | reject (plan edit); corrected | no code affected |
| `pins` typed by `BlueprintPin` and inline, not one `schema` type | low | logged | structurally the same; no named caller diverges |
| Message wording not in the requirement; one-id rows | low | logged | listed as decisions at the look |
| `startRecording` writes `runner.order` | low | logged | not patched |
| `settled` marker can't see a later post; poll for `first`; `safeParse` in a test; shared duplicate-node text; dedupe not in Design Notes | low | logged | not patched |
| Real-worker row can't show a lane ran | low | logged | named at the look; Rectangle row owns the proof |

## Design Notes

Stand-in order: the slot's remaining levels in order (nearest group default outward, then `meta.defaultPart`), then `stand-in`.

## Conformance Log

- `A test walks every schema kind` (codec rows, stale Open Question reference) -- fixed
- `A list item's and a union variant's node name` -- fixed
- `Inside a package, folders are` (`model/src/main/`) -- fixed
- `returns void or a Rejection built with model's reject` (`deletePart`) -- fixed
- `A command that removes something removes everything keyed` (referenced part) -- fixed
- `Prove a test Stryker can't reach` -- fixed
- `Each schema concept ships` -- fixed
- `Give every decision its rejected alternative` (`retryParts`, first reference) -- fixed
- `Give every threshold three rows` (rectangle, `PartId`) -- asked, fixed
- `typed by schema's resolved-design types` -- asked
- `imports the root, blueprint and reactive` (the hash) -- fixed
- `Test a rule where it is defined` (18 x 18) -- fixed
- `must-not-recompute checks` -- fixed
- Spine edits with no task; stale `RunnerLane` note; `Functions with state passed around by hand` (Sergii's third argument, named at the checkpoint) -- fixed
- Precedent `pipeline.spec.ts`, `read-bundle.spec.ts:8` -- deferred, fixed
- gap: `every command and action has at least one`, `app/src/main-modules.ts` -- fixed
- gap: entry files, `packages/model/src/main.ts`, `packages/commands/src/index.ts` -- fixed
- gap: `Arrange only a state real commands could reach`, second part, `packages/commands/src/design/new-design.ts` -- asked
- gap: raw key against `camelCase`, `read-kdl.ts` -- fixed
- Final pass: `Data carries no methods` -- asked; tags, whole violation, no-slot row, `argumentHash` row, record order, rectangle check's home, fake runner, `types.ts` fence, literals, `aResolvedParts` -- fixed
- Dropped 1 of 35: a quoted `hashing` sentence not in the spine; its point stands through a valid quote.

## Verification

**Commands:**
- `pnpm build:library && pnpm vitest run --project '@keeb-cad/schema' --project '@keeb-cad/design-file' --project '@keeb-cad/commands' --project '@keeb-cad/model' --project '@keeb-cad/pipeline'` -- expected: green
- `pnpm test` -- expected: green
- `pnpm check` -- expected: exit 0
- Stryker on changed pure `design-file` files -- every survivor gets a verdict.
- Toggled bug: break each `app` integration row and the `editor` strip row, watch it go red, restore, say so in the PR.

**Manual checks:**
- Nothing visible changes: the canvas is 13.7's, and a new design has no slots, so the strip's counts stay 0 and the parts lane has nothing to run.
