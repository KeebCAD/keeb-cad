---
title: 'Refactor sweep'
type: 'refactor'
ticket: '13'
created: '2026-11-16'
status: 'done'
baseline_revision: '270c7eab9a93f54defc69954c8c6dcbaefa4e309'
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

**Problem:** `deferred-work.md` holds about 70 open cards from this epic's plans, and three from epic 23's retrospective addressed to "the next refactor sweep": breaches of `AGENTS.md` in specs, names and file layout, cards already built or folded, cards whose owner ticket doesn't carry them yet, and flaky-test reports. Twenty-one `editor` composables also have no spec of their own.

**Approach:** Close every card this epic can close by fixing it, settle the open flaky reports with a run, close the stale ones with their reason, leave forward-owned cards open naming their owner, and give each of the 21 composables its own spec. No new behaviour.

## Boundaries & Constraints

**Always:** each ledger card ends `closed:` with date and reason, or stays open with a named owner (the ledger is the scope list the ticket's verify checks); a moved test keeps its name and its expects; a composable spec asserts what the composable returns or registers, through its real services.

**Never:** no production behaviour change; cards from other epics, except the three retro cards, stay untouched; no test deleted or weakened; no ticket file written (cards for Sofia instead).

## Boundary table

| Group | Row | Input | Expected | Level |
|---|---|---|---|---|
| rules | `designSchema`, missing section | a design without `overrides`; without `libraryVersions` | refused at `overrides`; at `libraryVersions` | unit, `schema` |
| rules | `idSchema` refusals | each refused id in `id.spec.ts` | its whole issue list, messages written out | unit, `schema` |
| rules | `aDesign` keeps a given field | `libraryVersions` other than the default | that value | unit, `schema` |
| rules | `filesContaining`, ordering | two matching files, `b` written before `a` | `[a, b]` | unit, `tooling` |
| module boundaries | `useRunningStage`, no stage | no stage-started | `undefined` | browser, `editor` |
| module boundaries | `useRunningStage`, just below | a parts stage-started 999 ms ago (fake timers) | `undefined` | browser, `editor` |
| module boundaries | `useRunningStage`, on | 1000 ms ago | `undefined` | browser, `editor` |
| module boundaries | `useRunningStage`, just above | 1001 ms ago | `{ stage: 'parts', elapsed: '1 s' }` | browser, `editor` |
| module boundaries | `useRunningStage`, second step | 1999; 2000; 2001 ms ago | `'1 s'`; `'2 s'`; `'2 s'` (whole seconds elapsed) | browser, `editor` |
| module boundaries | `useViolationCounts`, behind | one error and one warning posted at main's seq − 1 | `{ errors: 1, warnings: 1, dimmed: true }` | browser, `editor` |
| module boundaries | `useViolationCounts`, on | the same posted at main's seq | `{ errors: 1, warnings: 1, dimmed: false }` | browser, `editor` |
| module boundaries | `useViolationCounts`, none posted | a committed design, no issues | `{ errors: 0, warnings: 0, dimmed: true }` | browser, `editor` |
| module boundaries | `usePlacedNodes`, no set | a committed design, no Layout set posted yet | `[]` | browser, `editor` |
| module boundaries | `usePlacedNodes`, set posted | root `root` holding group `g` with slot `a`, its Layout set posted | `[{ kind: 'slot', key: 'left/a', w, h, … }, { kind: 'group', key: 'left/g', … }]` in posted order, no row for `root` | browser, `editor` |
| module boundaries | `useFlowHost` | no flow; a flow whose handle has a view; one without | `undefined`; `{ view, entry }`; `undefined` | browser, `editor` |
| module boundaries | `useOpenFlow` | open flow; `update(draft)`; availability refused; read before opening | its draft; the new draft; `rejectionText` of the refusal; throws `InvariantError` | browser, `editor` |
| module boundaries | `useGroupBorders` | no design; `left/a` in group `g` hovered | `[]`; the `left/g` row shown as hovered, no `right/g` | browser, `editor` |
| module boundaries | `useHoveredNode` | `pointAt('left/a')`; `leave()` past the grace; `pointAtTreeGroup('g')` in a split form | `left/a`; none; `left/g` | browser, `editor` |
| module boundaries | `useLandmark` | mounted with a root; unmounted; mounted with no root | registered for its place; unregistered; throws `InvariantError` | browser, `editor` |
| module boundaries | `useSelection` | `select(['left/a'])` | `ids` is `['left/a']` | browser, `editor` |
| module boundaries | `useLayoutTree` | no design; root holding group `g` with slot `a`, and slot `b` | `[]`; `[g (children: a), b]`, no root row | browser, `editor` |
| module boundaries | `useSlideOut` | `returnFocus` with focus inside the slide-out; focus moved outside; inside with no live invoker | the invoker focused; focus unchanged; the canvas landmark focused | browser, `editor` |
| module boundaries | `useCursorReadout` | pointer off the canvas; at model (12.34, -5.67) | `'x – y –'`; `'x 12.34 y −5.67'` (U+2212, as the spine writes it) | browser, `editor` |
| rules | `unknownNodeMessage`, `unknownAnchorTargetMessage` | ids `['a']` | `The design has no node with the id "a".`; `The design has nothing of the right kind with the id "a".` | unit, `model` |
| rules | `unknownNodeMessage`, several | ids `['a', 'b']` (Delete's missing ids, `check-delete-node.ts:17-18`) | `The design has no node with the id "a", "b".` | unit, `model` |
| module boundaries | `ui/testing` fence | a spec, and a non-spec `editor` file, importing `@keeb-cad/ui/testing` | allowed; reported | unit, `tooling` |
| module boundaries | `useWorkerFailure` | worker running; failed in `plates`; failed with no stage | `undefined`; `'failed: plates: <message>'`; `'failed: <message>'` | browser, `editor` |
| module boundaries | `useZoomReadout` | `zoomForPercent(200)` | `'200%'` | browser, `editor` |
| module boundaries | `useCanvasItem` | an SVG element; `null`; unmounted | registered under its id; nothing registered; unregistered | browser, `editor` |
| module boundaries | `useCanvasItemsRoot` | both refs set; one `null`; unmounted | root registered; none; unregistered | browser, `editor` |
| module boundaries | `useViewport` | 200×100 canvas, centre (0, 0), zoom 1; `fitOnce` twice | `modelToScreen({ x: 10, y: 10 })` is `{ x: 110, y: 40 }` (y flipped); the view fitted by the first call only | browser, `editor` |
| module boundaries | `useLayoutSetArrived` | no set; the set for main's seq | `false`; `true` | browser, `editor` |
| module boundaries | `useNewDesignHint` | no set, no slot; no set, one slot; set with no placed slot; set with one | `true`; `false`; `true`; `false` | browser, `editor` |
| module boundaries | `useSwitchGrace` | grace off; on | `false`; `true` | browser, `editor` |
| module boundaries | `useWorkspace` | location at `layout`; set to `outline`; set to `'nope'` | `'layout'`; location `outline`; unchanged; `tabs` one per workspace with label and first hotkey | browser, `editor` |
| module boundaries | `app/src/testing/` fences | a helper there importing `model/worker`, `design/worker`, `library/worker`, `reference-designs` | allowed; the same import from a non-spec `app/src` file reported | unit, `tooling` |
| glue | devtools invocation refused | an invocation refused as `unavailable` | event subtitle `unavailable`, `data.result` the rejection | browser, `editor` |
| glue | devtools invocation failing | an invocation whose error has no `kind` | event subtitle `error` | browser, `editor` |
| glue | `DeletePart` wired | real store with `designModule` and `partsCommandsModule` | the default part refused; another removed | integration, `app` |

Decision (Sergii, 2026-11-16): E11 stays open, re-owned to Sofia to slice as its own story, not fixed here, because the ticket says `Cleanup only` and its guards and disposables change behaviour.

Decision (Sergii, 2026-11-16): app specs share helpers through `app/src/testing/`, not a copy per spec, because `AGENTS.md` says `Write a shared assertion once`; `.dependency-cruiser.mts` widens `TESTING_FOLDER` to `app/src/testing/`, lets it import `reference-designs`, and adds it to the owners of the `model/worker`, `design/worker` and `library/worker` entry fences beside `APP_SPEC`, with fixtures in `tooling/ad10/violations/app/src/testing/`; the spine's Reference designs row (`run by app's tests only (its specs and its app/e2e/ folder)`) and AD-10's matching sentence gain `app/src/testing/`.

Decision (Sergii, 2026-11-16): `tooling/check-dist`'s deep imports close as accepted, not routed through new `exports` subpaths, because tooling sits outside the package graph and those subpaths would exist only for it.

Decision (Sergii, 2026-11-16): `filesContaining`'s empty needle is left out, not guarded, because only a hand-edited Corney script reaches it and the check then fails loudly (every file reported).

Decision (Sergii, 2026-11-16): `switch-grace.spec.ts`'s top-face query closes as accepted, not a test id, because it searches inside a key found by role and the face has no accessible meaning.

Decision (Sergii, 2026-11-16): the key-centres harness renames pose to `KeyFrame` (`CandidateKeyFrame`, `compareKeyFrames`, `keyFramesFrom`, `loadKeyFrames`), not kept, because the glossary's `frame` is `A position + rotation in the plane` and has no pose; the spine's `app` paragraph (`Ergogen's key poses read from YAML text`) says key frames to match. `kicad-pcb.test.ts:62`'s footprint `pose` is no key-centres name and stays.

Decision (Sergii, 2026-11-16): no `no-pinia` dependency-cruiser rule, not the rule, because pinia is in no package.json and `catalogMode: strict` means adding it needs a reviewed catalog change, so a rule would guard a dependency nothing can pull in unnoticed; the card closes as accepted.

Decision (Sergii, 2026-11-16): all 21 composables get their own spec here, not a later story, because the spine says editor's composables are `tested on their own`, and the gap is debt this epic built, which its sweep closes.

Decision (Sergii, 2026-11-16): one code-unit comparator, `schema`'s `compareId` renamed `compareCodeUnits` (its callers, `design/src/parsing/format-issue-paths.ts` and `app/e2e/ordering/by-code-unit.ts` use it; the spine's `schema` paragraph renamed), not exported from `hashing`, because `compareId` is not id-specific (`UTF-16 code-unit order`) and `AGENTS.md` says `Name a thing for what it does`; `hashing/src/canonical-encoding.ts:19` keeps its copy, since a kernel may import only `result`.

Decision (Sergii, 2026-11-16): the constant `expectedScrim` lives in a new `@keeb-cad/ui/testing` subpath, not a copy in each spec, because `AGENTS.md` says `Write a shared assertion once`; the spine's `ui` sentence (`only editor imports it, through its root and its one stylesheet subpath`) gains `and, for specs, ui/testing`, matching the Test builders row, with a fixture in `tooling/ad10/violations/` showing a non-spec import refused.

Decision (Sergii, 2026-11-16, after the build): the `usePlacedNodes` rows become "no set posted yet" and "set posted, in posted order", not "only the Layout set" and group-first, because one layout-set post carries both outputs and the posted order is the worker's; the `useZoomReadout` row's input is `zoomForPercent(200)`, not a raw zoom of 2, because `Viewport.zoom` is in px per mm.

Decision (Sergii, 2026-11-16, after the build): `check-nested-inputs.ts`'s guard on a nested default that fails to parse is removed with its row, not kept behind `'wide' as Expression`, because with `schema`'s inferred types no typed value reaches it and `AGENTS.md` says `test a runtime check with a value the types accept`; the one production change this sweep makes.

Decision (Sergii, 2026-11-16, after the build): `right-half.spec.ts`'s `reflected`, `corney-column.spec.ts`'s round trip and `layout-set.spec.ts`'s `KEY_RUN` stay, not literal rows, because their requirements are relations (the right half is the left reflected; a reload gives the same placements) whose only literal source would be a run, and `argumentHash` is named by BP-5 with its own tests; their cards close as accepted.

Decision (Sergii, 2026-11-16, after the build): Stryker's three equivalent mutants (`read-kdl.ts:34`, `:136`, `:156`) get point-wise `// Stryker disable next-line` exclusions with their reasons, not left surviving; `schema-fields.ts:78` gets a `deferred-work.md` card, owned by the first Data Schema union with a variant no option takes.

Decision (Sergii, 2026-11-16, review pass 2): `filesContaining` sorts in code-unit order, not `localeCompare`, because every ordering in the repo is locale-free (`compareCodeUnits`: `so an ordering never depends on a locale`) and nothing reads the list's order; inlined, since tooling can't import `schema`.

Decision (Sergii, 2026-11-16): the `app/src/testing/` helpers are functions taking the store or container they act on, not `di` services, because AD-25's `Functions with state passed around by hand are not used` governs production wiring, the helpers hold no state, and each spec's `arrange` builds the real container, as `editor/src/testing/post-layout-set.ts` and `mount-shell.ts` do.

</frozen-after-approval>

## Code Map

Ledger (cards by summary). Lines read at `eb1872a`.

**Fix: model and kernels**
- `packages/blueprint/src/testing/a-pinned-blueprint.ts:65` `MIB` beside pins; `aContract` (`:8-18`) a literal, to build on `schema/testing`'s `aBlueprintDeclaration`.
- `packages/blueprint/src/lane/check-nested-inputs.ts:23` cast `(value as { value: string })`; `NestedInputDeclaration` in `./types` parallels `schema`'s inferred type.
- `packages/pipeline/src/pipeline/pipeline.spec.ts:38` records inside `arrange`.
- `packages/model/src/parts/create-derivations.ts:186-238` helpers and violation builders (two cards).
- `packages/commands/src/types.ts:7` `DeletePartInput`; `commands/src/parts/delete-part.spec.ts:12-18` wires modules; `delete-part.ts:20` cast `draft as Mutable<Design>` (`tsc` passes without it; `design/src/patching/design-patcher.types.spec.ts:8` proves `Writable<Design>` extends `Mutable<Design>`).
- `packages/workers/src/model-worker/model-worker-lifecycle.ts:33,163` restating comments.
- Names with numbers: `model/src/placement/place-layout.spec.ts:101,116,147,166`, `protocol/src/layout-output/layout-output-codec.spec.ts:66,84`.
- `packages/geometry/src/frame-of.spec.ts:31` `describe('compose')`.
- `packages/schema/src/testing/design.spec.ts:20`, `schema/src/design.spec.ts:8`, `schema/src/id.spec.ts:11-13`.
- `packages/model/src/layout-editing/check-set-anchor.ts:20,40`, `check-delete-node.ts:20` inline `unknown-target` texts; pattern `model/src/violations/unknown-override-target-message.ts`.
- `packages/commands/src/layout/layout-commands.spec.ts:51` module-level `offset`.
- Retro A3: comparator `schema/src/compare-id.ts:3` (23 files), `hashing/src/canonical-encoding.ts:19`, `design/src/parsing/format-issue-paths.ts:6`, `app/e2e/ordering/by-code-unit.ts:2`.
- Retro A4: `design-file/src/codec/schema-fields.ts:27,75`, `read-kdl.ts:67` `switch`; `design-file/package.json` lacks `ts-pattern`.

**Fix: app, reference-designs, tooling**
- Duplicated helpers: `committed` in `layout-set`, `corney-column`, `corney-left-half`, `right-half`, `blueprint-inputs` specs; `runCorneyScript` in the first three (`right-half` takes `steps`); `arrangeStore` in `corney-column`, `corney-left-half`, `blueprint-inputs`; the real-worker `arrange` in `layout-set` and `right-half`.
- `.dependency-cruiser.mts:169` `TESTING_FOLDER`; `:449` `reference-designs-only-in-tests`; `:434-446` users of `TESTING_FOLDER`.
- `app/src/default-key-part.spec.ts:29-38,130`; `app/src/layout-set.spec.ts:15,45,55,139-141`; `app/src/launch/launch.spec.ts:210,236,253,367`; `app/src/corney-column.spec.ts:118-130`; `app/src/right-half.spec.ts:67,83-95`.
- Pose: `reference-designs/src/key-centres/{types,compare-key-poses,key-poses-from,index}.ts`, `src/load-key-poses.ts`, `src/index.ts`, `src/corney-pcb.ts:9`, `src/key-centres.test.ts`, `corney-island/README.md:34`, `app/src/corney-left-half.spec.ts:10,57-94`.
- `tooling/check-dist/files-containing.ts:14` sort unpinned.

**Fix: editor and ui**
- `editor/src/status-strip/use-running-stage.ts:8,10`; `ui/src/theme/use-theme-choice.ts:8` (with `THEME_CHOICES`).
- `editor/src/devtools/devtools-plugin.spec.ts:314`; err branch `devtools-plugin.ts:125-136`; a refused result's shape as `selection/delete-selection.spec.ts:110`.
- `editor/src/selection/delete-selection.spec.ts:26,151`; `nextFrames()` in `editor/src/testing/layout-canvas.ts`.
- `ui/workbench/CanvasToggleFrame.vue`, refs `ui/workbench/widgets.ts:11,35`.
- `expectedScrim`: `editor/src/shortcuts/modal-keeps-keys.spec.ts:13`, `ui/src/dialog/Dialog.spec.ts:13`; `ui/src/testing/` holds `css-rgb.ts`; `ui/package.json` exports `.` and `./theme.css`.
- `ui/src/tree/Tree.spec.ts:10` `ROWS`.
- `HoveredNode` tests in `editor/src/group-border/group-borders.spec.ts:219,238,252,412,434,446,461,547`; delay in `editor/src/hover/hover-grace-delay.ts`.
- Composables with no spec (21): `flows/use-flow-host`, `flows/use-open-flow`, `group-border/use-group-borders`, `hover/use-hovered-node`, `landmarks/use-landmark`, `selection/use-selection`, `slide-out/use-layout-tree`, `slide-out/use-slide-out`, `status-strip/use-{cursor-readout,running-stage,violation-counts,worker-failure,zoom-readout}`, `viewport/use-{canvas-item,canvas-items-root,viewport}`, `workspace/layout/use-{layout-set-arrived,new-design-hint,placed-nodes,switch-grace}`, `workspace/use-workspace`. Arrangement to copy: `editor/src/design/use-open-design.spec.ts` (after its own fix below), with worker posts from `editor/src/testing/post-layout-set.ts`.

**Settle with a run**: `tooling/hooks/lint-decision.spec.ts` timeout; Firefox `editor/src/slide-out/slide-out.spec.ts` and `editor/src/add-flow/add-flow.spec.ts`.

**Close**
- Stale: 13.18 backoff (`pipeline/src/pause/blueprint-pause.ts:40` reads `hasUnavailable` after the run); 13.22 `part` and 13.3 remap wording (tickets.toml 90-91, 101-102; `model/src/layout-editing/duplicate-node.spec.ts:77`); split-offs built as 13.23, 13.24/13.25, 13.26/13.32, 13.33, 13.34; 13.33's `'empty'` (tickets.toml 157-158); anchor links unclear (13.35, 2dd41f6); two `tooling/lint/` flaky cards (specs removed, f4df4b7).
- Accepted: plain-object check and `Dispatcher` registration duplicates; check-dist deep imports; switch-grace top face; no-Pinia fence (Sergii's decisions).

**Keep open, owner named** (* folded by Sofia, one new card)
- *Hit-radius check: 15.4. *Stand-in badge: 14.6. *Clearing a `side-part` override: 14.5. *Repeated override key on load: 16.2. *Multi-selection Ctrl+D and add parent: 15.4. *Re-anchor offer: 15.3. *Anchor-input refusal (BP-8), *lane `problems` as `blueprint` violations, *E11: Sofia slices.
- Unchanged: OOM by VM history, untagged handles, unknown query, nested range, AC timings, focus reordering, flow `finished` once, palette open-only, last good output, quantity as numbers, border margin, root selectable, screenshot baseline, per-command e2e, `Ctrl+K` hint; unfitted key's inside (question for Sergii, `bmad-ux`).

## Tasks & Acceptance

**Execution:**
- [x] `packages/blueprint/src/testing/` -- `a-pinned-blueprint.ts` split by concept: `a-contract.ts` (`aContract` (function), built on `aBlueprintDeclaration`), `lane-script.ts` (the constant `STAGE`; `laneScript`, `aScript`, `returning` (function each)), `a-pin.ts` (`aPin`, `laneOf` (function)), `stage-calls.ts` (`noCalls`, `noArgs`, `withInputs`, `withPulls`, `okValue`, `laneFailed` (function each)), `mib.ts` (`MIB`); importers updated.
- [x] `packages/blueprint/src/lane/` -- `schema`'s inferred type replaces `NestedInputDeclaration` and the cast.
- [x] `packages/pipeline/src/pipeline/pipeline.spec.ts` -- recording starts in each test after `arrange`.
- [x] `packages/model/src/parts/` -- each helper or builder in a file named for it (function).
- [x] `packages/commands/src/parts/` -- `types.ts` takes `DeletePartInput`; no cast; `delete-part.spec.ts` keeps unit rows on a draft built with `aDesign`; wiring rows move to `app/src/delete-part.spec.ts`.
- [x] `packages/workers/src/model-worker/model-worker-lifecycle.ts` -- delete the two comments.
- [x] `place-layout.spec.ts`, `layout-output-codec.spec.ts` -- numbers into parameters or `expected*` constants.
- [x] `packages/geometry/src/compose.spec.ts` -- the `compose` describe, moved whole.
- [x] `packages/schema/src/` -- the three schema rows.
- [x] `packages/model/src/violations/` -- `unknown-node-message.ts` (`unknownNodeMessage` (function)) and `unknown-anchor-target-message.ts` (`unknownAnchorTargetMessage` (function)), each taking `ids: readonly ItemId[]` as `unknown-override-target-message.ts` does, texts unchanged, each with its spec row.
- [x] `packages/commands/src/layout/layout-commands.spec.ts` -- `offset` built in each case.
- [x] `packages/schema/src/compare-code-units.ts` -- `compareId` renamed `compareCodeUnits` (function) with its file and its callers; `design/src/parsing/format-issue-paths.ts` and `app/e2e/ordering/by-code-unit.ts`'s users use it, and `by-code-unit.ts` goes.
- [x] `packages/design-file/` -- `match` over tags; `ts-pattern: catalog:` in `package.json`; Stryker on `schema-fields.ts` and `read-kdl.ts`, each survivor given a verdict (mutation-loop).
- [x] `.dependency-cruiser.mts`, `tooling/ad10/violations/app/src/testing/`, `tooling/ad10/rules.spec.ts` -- the `app/src/testing/` fences and their fixture rows.
- [x] Spine (`_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md`) -- the Reference designs row and AD-10's `app` sentence name `app/src/testing/`; `key poses` becomes `key frames`; every `compareId` (9 mentions: Shared kinds, Data Schema and its sketch, stage outputs, `design-file`'s codec, the package tree) becomes `compareCodeUnits`; the `ui` sentence gains `ui/testing` for specs.
- [x] `app/src/testing/` -- one file each: `committed.ts`, `run-corney-script.ts`, `arrange-store.ts`, `arrange-placements.ts`, `arrange-model-worker.ts` (function each); the specs import them.
- [x] The app specs in the ledger -- literal expected ids and rows from Corney's script, `it.each` over the steps instead of the loop, `rowsOfSide` for the local `sideOf`, launch assertions that fail when the older is opened.
- [x] `reference-designs/` and `app/src/corney-left-half.spec.ts` -- the pose rename, files included (`KeyFrame`, `CandidateKeyFrame` types; `compareKeyFrames`, `keyFramesFrom`, `loadKeyFrames` (function each)).
- [x] `tooling/check-dist/files-containing.spec.ts` -- the ordering row.
- [x] `editor/src/status-strip/running-stage-timing.ts` -- `SHOWN_AFTER_MS` and `toNextChange` (function), out of `use-running-stage.ts`.
- [x] `ui/src/theme/theme-choice.ts` -- `THEME_CHOICES` and `isThemeChoice` (function), out of `use-theme-choice.ts`.
- [x] `editor/src/devtools/devtools-plugin.spec.ts` -- the two glue rows.
- [x] `editor/src/testing/layout-canvas.ts` -- split by concept: design builders (`designWith`, `designOf`) to `designs.ts`; row builders (`layoutOf`, `keyAt`, `rectangle`, `groupRow`) to `layout-rows.ts`; page queries (`canvas`, `key`, `canvasSvg`, `clientAt`) to `canvas-queries.ts`; `arrangeLayoutCanvas`, `sizeCanvasAndWait` stay; `nextFrames` to `next-frames.ts` (function each); importers updated.
- [x] `editor/src/selection/delete-selection.spec.ts` -- `selected` passed by each test; `nextFrames()` for the wait.
- [x] `editor/src/workspace/layout/use-slot-id-labels.spec.ts` -- the first test's name claims its border expect too; `WIDE_KEY` built inside the tests that use it.
- [x] `ui/workbench/` -- `CanvasToggleFrame` becomes `CanvasToggleHost`.
- [x] `ui/src/testing/scrim.ts` (the constant `expectedScrim`), `ui/src/testing/index.ts` (re-exports it and `css-rgb.ts`), `ui/package.json` (`./testing`), `tooling/ad10/violations/` (a non-spec import of it) -- both specs import it.
- [x] `editor/src/design/use-open-design.spec.ts` -- `arrange` takes the design to commit; the first test commits none and returns no `commit`.
- [x] `ui/src/tree/Tree.spec.ts` -- rows built in each test.
- [x] `editor/src/hover/hovered-node.spec.ts` -- the `HoveredNode` tests moved from `group-borders.spec.ts`, against the service.
- [x] `editor/src/**/use-*.spec.ts` -- one spec per listed composable, per the boundary table.
- [x] Flaky reports -- flaky-triage on each logged seed; verdict on the card.
- [x] `deferred-work.md` -- `closed: 2026-11-16, …` lines per the ledger; one card for Sofia listing the starred owners.

**Acceptance Criteria:**
- Given the sweep is finished, when `pnpm check` and `pnpm test` run, then both pass.
- Given `deferred-work.md`, when each ledger card is read, then it has a `closed:` line or names its owner.
- Given `packages/editor/src`, when each `use-*.ts` is listed, then a `use-*.spec.ts` sits beside it.

## Implementation Notes

Stryker, `schema-fields.ts` and `read-kdl.ts` (2026-11-16): score 98.33, 221 killed, 14 timed out, 4 survived, none on a changed line.
- `read-kdl.ts:34` ConditionalExpression `flattened === undefined ? …` → `false`: equivalent; `propertyLines` has only camel-cased string keys, so `get(undefined)` is `undefined`, as the guard gives. Proposed for a person: `// Stryker disable next-line ConditionalExpression: propertyLines has only string keys, so get(undefined) is undefined as the guard gives`.
- `read-kdl.ts:136`, `:156` OptionalChaining `getLocation(x)?.start` → `getLocation(x).start`: equivalent over reachable inputs; every node and entry comes from `parseKdl`, which parses with `storeLocations: true`. Proposed: `// Stryker disable next-line OptionalChaining: every node and entry comes from parseKdl, which stores locations`.
- `schema-fields.ts:78` ConditionalExpression `option !== undefined && v.is(option, value)` → `true && …`: implementation boundary; only a union holding a variant no option takes reaches it, and no Data Schema union does. No test; a person decides.

Flaky reports: the `tooling/lint/` cards are stale (specs removed, f4df4b7). Full run 1 of `pnpm check` (seed 1794818345649) failed four Firefox editor tests, each a 15 s timeout inside Playwright's `hover`/`click` with no assertion failed: `slide-out.spec.ts` "opens and closes from the rail button, which says whether it is expanded" (the card's test), `group-borders.spec.ts` "strokes a group for a pointer inside a hole of its border, and a click there selects it", and `show-ids-and-links.spec.ts` "shows nothing while the pointer is over a slot's row" and "drops a pointed key's label, link and border at once when it deletes the key's group". `pnpm vitest run --sequence.seed=1794818345649 --project '@keeb-cad/editor (firefox)'` passed whole (72 files, 635 tests): not order. Source not confirmed (machine load during the full run is the candidate left); for a person to decide. No test, timeout or config changed.

Decisions (agents, 2026-11-16), each for review:
- `NestedInputDeclaration` is `DeclaredInput | ReferenceInputDeclaration`, not `DeclaredInput` alone, because `schema` declares no part, anchor or asset input yet and the spine's Data Schema must define them first.
- `aContract` writes its lane key `parts`, not `[STAGE]`, because `lane-script.ts` imports `aContract` and the reverse import would be a cycle.
- The moved parts builders are `unresolvedViolation`, `inputInvalidViolation`, `laneFailureViolation`, not `unresolved`, `inputInvalid`, `failure`, because `Name a thing for what it does` and `unsupportedFormViolation` is the pattern.
- `unknownAnchorTargetMessage` names the first id, not every id, as `unknownOverrideTargetMessage` does, because SetAnchor refuses one target.
- `app/src/testing/` gets its own `APP_TESTING` in the reference-designs and worker-entry fences, not the whole widened `TESTING_FOLDER`, because only app's helpers need it; `ui/testing` needs no new rule, because `only-tests-import-testing` already fences every `@keeb-cad/*/testing`.
- `launch.spec.ts` asserts the opened design is a new `Untitled design`, not "not a stored id", and spies `backend.read` after arrange for "never trying the older", because those fail when the older is opened or tried.
- `runCorneyScript` asserts the refused steps as one whole value, not `expectOk` per step, because `AGENTS.md` bans a loop around `expect`; `layout-set.spec.ts` adds the per-step `it.each`.
- Composable specs build their own container with only the services the composable resolves, not `editorModule` or `mountShell`, because the arrangement copies `use-open-design.spec.ts`.
- `useViolationCounts`' behind row posts at main's seq and then commits again, not a post at seq − 1, because the dispatcher drops a post below the latest seq it sent.
- `hovered-node.spec.ts`'s moved tests assert the service (`hovered.id`, `selection.ids`), names kept, not drawn borders, because the task says `against the service`; `GRACE_MS = 300` is an expected constant, not `hoverGraceDelayMs`. `group-borders.spec.ts`'s Tree block keeps the canvas-level "clears the hovered group once the slide-out closes", which proves `TreeSlideOut`'s unmount calls `clearTreeHover` (toggled bug: that call commented out, red in Chromium and Firefox, restored).
- `devtools-plugin.spec.ts` declares a spec-local `FailWithoutKind` action, not `TestBrokenStoreName`, because that one throws instead of answering an error with no `kind`.

Decision (build): `eslint.config.ts` gains the file override `keeb-cad/key-frames-are-frames`, letting `unicorn/consistent-compound-words` accept `keyFrame` in `reference-designs/src`, not the rule's `Keyframe`, because Decision (Sergii, 2026-11-16) names `KeyFrame` (`CandidateKeyFrame`, `compareKeyFrames`, `keyFramesFrom`, `loadKeyFrames`) for the glossary's frame, and CSS's `keyframe` is another thing. Without it lint reports "Prefer `Keyframe` over `KeyFrame`" and "Prefer `CandidateKeyframe` over `CandidateKeyFrame`" (`unicorn/consistent-compound-words`, e.g. `key-centres/compare-key-frames.ts:2`).

Decision (build): with the guard removed (Decision (Sergii, 2026-11-16, after the build)), `check-nested-inputs.ts`'s quantity default throws `InvariantError` on a parse failure, not a `nested-input` lane failure, because `parseExpression` returns a `Result` whose err branch must go somewhere and `model/src/placement/literal-value.ts` throws `InvariantError` for the same unreachable literal.

Stryker exclusions (Decision (Sergii, 2026-11-16, after the build)): `read-kdl.ts`'s three equivalent mutants carry `// Stryker disable next-line` with the reasons above; lint accepts them (`no-warning-comments` bans only `eslint` terms; `storage` has the same comments).

- Real-host run: `FakeWorker` stands in for the browser `Worker` in the status-strip and layout composable specs. `pnpm check` (exit 0, seed 1794822678964) runs app's real-worker specs (`app/src/layout-set.spec.ts`, `both-halves.spec.ts`) and the e2e journey, which spawn the real model worker in Chromium and Firefox, through the same lifecycle posts the specs fake.

## Plan Change Log

2026-11-16, for Sergii (the frozen block is unchanged; these rows were built otherwise):
- `usePlacedNodes`, one set: unreachable, since a `layout-set` post carries the Layout and parts outputs together and a commit clears both; built as "nothing before a set arrives → `[]`".
- `usePlacedNodes`, both sets: rows in the worker's code-unit order, slot `left/a` before group `left/g`, not the table's order; the root is `root` (`designOf`), not `r`.
- `useZoomReadout`: a raw zoom of 2 px/mm reads 53% (100% is 96/25.4 px/mm); built with `zoomForPercent(200)` reading `'200%'`.
- App specs: `right-half.spec.ts`'s `reflected` still negates the left rows (the 31 right rows have no source but a run), and `corney-column.spec.ts`'s round trip still compares with the placements before the save; both cards stay open for Sergii.

2026-11-16, review round 4 (Sergii chose a fourth patch round after pass 3):
- `filesContaining`, ordering: built as `a.js`, `c.js`, `B/x.js` → `[B/x.js, a.js, c.js]`, not two flat files, because this tmpfs lists names sorted, so no flat write order fails without the sort; the recursive listing gives a nested file last. The row's rule (code-unit order, Sergii's pass-2 decision) is unchanged.
- The `HoveredNode` canvas tests are back in `group-borders.spec.ts` beside the service copies, superseding the Implementation Notes line that only "clears the hovered group once the slide-out closes" stays: the frozen block allows no test removed, and each canvas test failed with its component line broken.
- `launch.spec.ts` asserts the opened id is none of the stored ids (with stored designs present) and spies `backend.read` for "trying only it", superseding the Implementation Notes line on `Untitled design` (`A_NEW_DESIGN` tested `NewDesign`'s rule from `app`).

## Review Triage Log

Pass 1, lenses quick and test-reviewer. 21 findings (8 quick, 13 test-reviewer), none dropped; 18 after merging the three both lenses raised. Verdicts: medium 4, low 12, false 2.

| # | Lens | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 1 | quick | `committed` still copied in `launch.spec.ts:186`, `autosave.spec.ts:55`, `autosave-round-trip.spec.ts:32`, `bundle-round-trip.spec.ts:19`, while the A3 card says it lives once | medium | patch | grep finds the four copies; the closed card claims otherwise |
| 2 | quick | `both-halves.spec.ts:56-57` loops `expectOk` over the script and builds its own worker `arrange` | medium | patch | `for (const { command, input } of …) { expectOk(…) }`; `AGENTS.md` `No if or loop around expect`; the duplicated-helpers card is closed |
| 3 | quick | seven composable specs add the whole `editorModule` against the build's own decision | medium | patch | `use-selection.spec.ts:13` `.addModule(editorModule)`; `useSelection` resolves only `Selection`; `Arrange only what the test uses` |
| 4 | both | `use-workspace.spec.ts` "leaves the location unchanged…" reads synchronously after an async setter | medium | patch | `use-workspace.ts` switches through `void invoke(…)`; the sibling needs `expect.poll`, so a wrongly allowed navigation lands after the read |
| 5 | both | devtools rows' names say "titled" where the expects assert the subtitle | low | patch | `devtools-plugin.ts` sets `title: id`, `subtitle: #outcome`; direct rename |
| 6 | quick | devtools spec declares `const emptyInputSchema = v.object({})` | low | patch | `commands/src/empty-input-schema.ts:3` exports the shared `v.strictObject({})`, which `AGENTS.md` names |
| 7 | both | `files-containing.spec.ts` ordering row can pass with no sort and doesn't pin `localeCompare` | low | patch | `/tmp` is tmpfs (`df -T`), whose readdir lists newest first, so writing `b` then `a` already returns `[a, b]`; `a.js`/`b.js` sort the same under code units and `localeCompare` |
| 8 | quick | `use-canvas-item*.spec.ts` assert `isSome()` booleans | low | patch | `use-canvas-items-root.spec.ts:39` `expect(items.size().isSome()).toBe(true)`; `assert whole values` |
| 9 | quick | `id.spec.ts` asserts the empty id's issues twice | low | patch | the new `''` row (`:19`) and the kept test at `:24` assert one list; drop the row, the existing test stays |
| 10 | test-reviewer | `use-hovered-node.spec.ts:53` advances by production's `hoverGraceDelayMs + 1` | low | patch | expected time from production; a spec-local `expected*` constant, as `hovered-node.spec.ts`'s `GRACE_MS` |
| 11 | test-reviewer | `use-switch-grace.spec.ts` advances by production's `switchGraceDelayMs + 1` | low | patch | same as 10 |
| 12 | test-reviewer | `hovered-node.spec.ts` "keeps a key's group shown…" asserts the hovered key | low | reject | the frozen block keeps moved tests' names and the task asserts the service; the hovered key is what decides the shown group |
| 13 | test-reviewer | `use-worker-failure.spec.ts` copies `CRASH_CAP = 3` from production | false | reject | 23.23's verify states it: `three crashes each after a stage-started for plates end in failed` |
| 14 | test-reviewer | `use-open-flow.spec.ts` builds an unopened entry by hand | low | reject | the frozen row asks for `read before opening`; no command reaches it, and the throw is the invariant |
| 15 | test-reviewer | `corney-column.spec.ts` root ids read from the arranged design | low | reject | Sergii's decision keeps the round trip as a relation check |
| 16 | test-reviewer | `layout-set.spec.ts` step rows ignore earlier steps' results | low | reject | a broken earlier step fails its own row first; a misleading name only on a cascade |
| 17 | test-reviewer | `launch.spec.ts` asserts `read.mock.calls` | false | reject | the call is the behaviour ("never trying"), on the backend boundary; `AGENTS.md` allows `toHaveBeenCalled*` when the call is the behaviour |
| 18 | test-reviewer | `check-nested-inputs.ts`'s new `InvariantError` has no test | low | reject | Sergii's decision: no typed value reaches it |


Pass 2, lenses quick and test-reviewer, on the patched files. 13 findings (7 quick, 6 test-reviewer), none dropped. Verdicts: medium 4, low 6, false 3.

| # | Lens | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 19 | test-reviewer | `files-containing.spec.ts` pins `localeCompare`, an ordering no one decided | medium | asked | Sergii: code-unit order, inlined in `files-containing.ts` (tooling can't import `schema`); row `c.js, a.js, B.js` → `[B, a, c]` |
| 20 | quick | `both-halves.spec.ts` runs `runCorneyScript`, whose `NewDesign` replaces the design `Launch` opened | medium | patch | `run-corney-script.ts:11` `expectOk(await store.run(NewDesign, {}))`; `launch.ts:21-23` routes the first design; `Arrange only a state real commands could reach` |
| 21 | quick | the canvas test that a key's border survives the slide-out closing moved to the service only | medium | patch | `hovered-node.spec.ts:130` calls `clearSetBy('tree')` directly; `TreeSlideOut.vue:26-28` swapped to `clear()` would pass every test; frozen `no test deleted or weakened` |
| 22 | quick | `anchors.spec.ts:26-45`, `model-worker-entry.spec.ts:11-20` keep copies of `arrangeStore` and the derivations wiring | medium | patch | same bodies as `app/src/testing/arrange-store.ts`, `arrange-placements.ts`; the cards are closed |
| 23 | quick | `use-hovered-node.spec.ts:95` comment cites 13.32's plan | low | patch | `AGENTS.md` `No AD-n or ticket references`; direct deletion of the reference |
| 24 | quick | `devtools-plugin.spec.ts:402` arranges a design `FailWithoutKind` doesn't use | low | patch | the action's `available()` returns true and ignores the design; direct deletion |
| 25 | quick | `launch.spec.ts:270-277` builds its own `MemoryBackend` that `arrange` already returns | low | patch | `arranged.backend` (`launch.spec.ts:170`); direct simplification |
| 26 | quick | `devtools-plugin.spec.ts:374` no blank line before a test | low | patch | direct; prettier doesn't enforce it |
| 27 | test-reviewer | composable grace rows lack just-below and on | false | reject | the thresholds live in `hovered-node.spec.ts:54-57,101-104` and `switch-grace.spec.ts:118-150`; `Test a rule where it is defined` |
| 28 | test-reviewer | 200 ms taken as exact where the spine says about 200 | false | reject | `switch-grace.spec.ts:37` already pins `GRACE_MS = 200` on `main`; this change copies it |
| 29 | test-reviewer | `use-workspace.spec.ts` absence check after a frame wait | low | reject | the build's toggle (a wrong navigation) went red with the settle and green without; a later-landing navigation needs an async invoke no entry has |
| 30 | test-reviewer | `use-canvas-item.spec.ts` leaves x and y as `expect.any(Number)` | low | reject | x and y depend on the page's layout of the SVG; the size is the requirement |
| 31 | test-reviewer | `use-group-borders.spec.ts` `arrange` branches on a given design | false | reject | an `if` in arrange, not around `expect`; `AGENTS.md` bans `if` or loop around `expect` |

Pass 3, lenses quick and test-reviewer, on the pass-2 patches. 6 findings (5 quick, 1 test-reviewer, one raised by both), none dropped. Verdicts: medium 4, low 1. Above low on the third pass: halted for Sergii.

| # | Lens | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 32 | both | `files-containing.spec.ts:51-56` passes with no sort | medium | patch (round 4, Sergii) | writing `c.js, a.js, B.js` lists `['B.js', 'a.js', 'c.js']` (node run, 2026-11-16), the expected order. Correction: this tmpfs lists names in sorted order, not newest first as rows 7 and 32 said; any flat write order passes unsorted, so the row nests `B/x.js`, which the recursive listing gives last |
| 33 | quick | moving the grace tests to the service leaves `TreeSlideOut.vue:35` `leave()` and `GroupBorderTab.vue:45` `pointerenter` with no canvas test | medium | patch (round 4, Sergii) | the canvas tests "crosses slot rows" and "reaches its tab within the grace" now live only in `hovered-node.spec.ts:72,106`, which call the service; frozen `no test deleted or weakened` |
| 34 | quick | `launch.spec.ts:311` "…trying only it" asserts only the opened design | medium | patch (round 4, Sergii) | its expect is `expect(opened(arranged)).toEqual(A_NEW_DESIGN)`; nothing checks the older is not read |
| 35 | quick | `launch.spec.ts:36` `A_NEW_DESIGN` asserts `NewDesign`'s name, a pattern 23.7's review removed | medium | patch (round 4, Sergii) | `{ id: expect.any(String), name: 'Untitled design' }`; `Test a rule where it is defined` (`new-design.spec.ts:30`) |
| 36 | quick | `app/src/layout-commands.spec.ts:18-26` copies `arrangeStore` | low | patch (round 4, Sergii) | same body as `app/src/testing/arrange-store.ts`; the duplicated-helpers card is closed |

Pass 4, lenses quick and test-reviewer, on the round-4 patches. 8 findings (6 quick, 2 test-reviewer), none dropped; 4 of the quick ones were plan and ledger bookkeeping, fixed in the documents. Verdicts on code: low 4, false 1. Nothing above low: the loop ends, lows logged, not patched.

| # | Lens | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 37 | quick | canvas and service `HoveredNode` tests share names; the card closed while its summary holds | false | reject | the canvas copies test wiring (each red with its component line broken), the service copies the rule; card's closing line updated to say so |
| 38 | quick | `group-borders.spec.ts` reorders tests and drops a blank line | low | logged | no behaviour change; prettier passes |
| 39 | quick | `launch.spec.ts:239,320` filter `read.mock.calls` before comparing | low | logged | the spy is the behaviour (#17); a filter over the older versions is the claim, not a narrowing of a returned value |
| 40 | test-reviewer | "opens a new design on empty storage…" checks only the URL | low | logged | with nothing stored, "new" has no other observable; the removed check was vacuous |
| 41 | test-reviewer | storage-unavailable row's URL check can't tell `older` | low | logged | nothing loads with storage unavailable, so `older` can't open; the URL check fails if launch keeps the old route |
| — | quick | triage #33-36 still `asked`; Implementation Notes lines 213 and 217 stale; no change-log entry for the `filesContaining` row | — | fixed (docs) | rows set to `patch (round 4, Sergii)`; Plan Change Log entry added |

## Design Notes

Decision (plan): ts-pattern's `match` in `design-file`, not the `switch`, because retro card A4 names it and the spine's Rejection row uses `an exhaustive ts-pattern match`.

Decision (plan): the plain-object check stays in `hashing` and `messaging`, not one copy in `result`, because both are kernels allowed only `result` (`.dependency-cruiser.mts` kernel rows) and a plain-object check is not `result`'s concept (`AGENTS.md`: `one concept per package`). The `Dispatcher` registration stays in `pipeline/src/pipeline-module.ts:10` and `workers/src/workers-module.ts:9`, not a shared registering function, because each module builds its own container and neither package may import the other's module.

Decision (plan): composable specs run each composable through `app.runWithContext` over a container holding the real services, as `editor/src/design/use-open-design.spec.ts` does, not a fake service, because `AGENTS.md` says `Substitute through di: register a fake for state or a boundary` and these services are neither; a composable with lifecycle hooks (`useLandmark`, `useCanvasItem`, `useCanvasItemsRoot`) runs in a mounted component's `setup`. Worker posts come from `editor/src/testing/post-layout-set.ts`.

Decision (plan): `CanvasToggleHost`, not another name, because 13.27 named its own wrapper `DialogHost` (`ui/src/dialog/DialogHost.vue`) and the glossary's `frame` is `A position + rotation in the plane`.

Decision (plan): no `useViolationCounts` row for issues posted ahead of main's seq, not a row with that arrangement, because the worker posts only seqs main sent and `AGENTS.md` says `Arrange only a state real commands could reach`.

## Conformance Log

Pass 1: readers A and B, gap reader. 0 findings dropped (every quoted plan line, `AGENTS.md` line and spine sentence found).
- `Give every decision its rejected alternative` (no-Pinia, 21 composables): asked; Sergii gave the reasons.
- `A choice no requirement made is a decision` (`CanvasToggleHost`, `ui/testing`): fixed, Decision (plan); `ui/testing` then asked in the final pass.
- `Give each file one kind of thing` (status-strip and theme splits unnamed): fixed.
- Priority package `run Stryker on the changed files` (`design-file`): fixed.
- `Give every threshold three rows` (`useRunningStage` second step and no stage; `useViolationCounts` ahead): fixed; the ahead row left out by Decision (plan).
- `Take expected values from the requirement` (catch-all composable row): fixed, one row per composable.
- Precedent `use-slot-id-labels.spec.ts` (not a composable-level spec; name vs border expect; `WIDE_KEY`): fixed, precedent replaced and the spec fixed in this sweep.
- Spine `key poses` left stale: fixed, spine task.
- `(service)` or `(function)` tags (scrim, splits, message functions): fixed.
- Spine `for its tests only (its specs and its app/e2e/ folder)` vs `app/src/testing/`: fixed, spine task.
- `shared pure logic goes in a cohesive kernel package` (`compareId`, a third comparator): asked; Sergii chose one `compareCodeUnits` in `schema`.
- AD-25 `Functions with state passed around by hand` (app test helpers): asked; Sergii's decision.
- Precedent `editor/src/testing/layout-canvas.ts` mixing concepts; `a-pinned-blueprint.ts` keeping `STAGE` and the rest: fixed, split in this sweep.
- gap: `app/src/testing/` blocked by the `model/worker`, `design/worker`, `library/worker` entry fences (`APP_SPEC`): fixed.
- gap: `schema/src/compare-id.ts`, `app/e2e/ordering/by-code-unit.ts`: fixed via Sergii's comparator decision.
- gap: `packages/ui/src/testing/index.ts` missing: fixed.
- gap: `design-file` Stryker: fixed.
- gap: `reference-designs/src/kicad-pcb.test.ts:62` in the pose grep: fixed, grep narrowed, recorded in the decision.

Final pass: one reader, 9 findings, 0 dropped; these fixes have had no reviewer.
- Spine `ui` sentence `only editor imports it, through its root and its one stylesheet subpath`: asked; Sergii chose `ui/testing` with a spine edit and fixture.
- Spine `compareId` in 9 places: fixed, every mention renamed.
- `Give every decision its rejected alternative` (plain-object, `Dispatcher`, ahead row): fixed.
- Spine `x 12.34 y −5.67` (U+2212): fixed.
- Two precedents for the composable arrangement: fixed, `use-open-design.spec.ts` only.
- Precedent `use-open-design.spec.ts` `async function arrange() {` builds `commit` for a test that doesn't use it: fixed, task added.
- `Test a rule where it is defined` (new message functions): fixed, rows and signature; one `unknownNodeMessage` takes Delete's several ids.
- Tags (`STAGE`, `expectedScrim`, key-frame functions): fixed.
- `use-slot-id-labels.spec.ts` name and `WIDE_KEY`: already a task.

## Verification

**Commands:**
- `pnpm check` -- expected: passes.
- `pnpm test` -- expected: passes.
- `git grep -n "as Mutable<Design>" -- packages` -- expected: no output.
- `git grep -n -i "pose" -- reference-designs/src app/src | grep -vi "compose\|purpose\|expose" | grep -v kicad-pcb.test.ts` -- expected: no output.
- `pnpm exec stryker run --mutate packages/design-file/src/codec/schema-fields.ts,packages/design-file/src/codec/read-kdl.ts` -- expected: every survivor has a verdict in Implementation Notes.
- `for f in $(git ls-files 'packages/editor/src/**/use-*.ts' | grep -v spec); do [ -f "${f%.ts}.spec.ts" ] || echo "$f"; done` -- expected: no output.
