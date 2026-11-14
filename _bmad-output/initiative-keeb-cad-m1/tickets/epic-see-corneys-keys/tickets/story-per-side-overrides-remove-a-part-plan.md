---
title: 'Per-side overrides remove a part'
type: 'feature'
ticket: 33
created: '2026-11-14'
status: 'built'
baseline_revision: '40326d150f9516a638921383f1848777497cfc03'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The design has no `overrides` section (`schema/src/design.ts:9-14`), so a split reversible board can't remove a slot's part on one side, and R3's "a per-side override set by command removes a slot's part on one side, and the removed slot keeps its space" is undelivered.

**Approach:** `schema` adds `overrides` after `layout` with both Data Schema variants and `SideId`; the KDL codec learns a nullable field; `overrides.setOverride` sets a `side-part` override, refusing a swap on a reversible board; `model` marks each removed side's slot row `fit: 'empty'` without changing its frame or part row, reports `override-not-allowed` and `unresolvable-reference` for loaded overrides, and `DeleteNode` deletes a slot's overrides. A test-only step file removes `right/thumbfan-far-home`'s part in the epic's headless scenario.

## Boundaries & Constraints

**Always:**
- `Override` is the Data Schema's union: `{ type: 'side-part'; target: ref('side-placement'); part: v.nullable(partRefSchema) }` and `{ type: 'side-component'; target: ref('side-placement'); component: string }`, each a `v.strictObject` with `v.metadata({ node: 'override' })`. `part: null` removes the part, written `part=#null` (spine 4f45eb8, a1bea0d).
- `SideId` is `left/<id>` or `right/<id>`, `<id>` passing `idSchema` (Consistency Conventions, Ids: "Resolved: `<side>/<id>`"); `ItemId` gains `SideId`.
- The KDL codec writes `null` only in a field whose schema is `v.nullable`; any other `null` is still refused as today (`schema-kinds.spec.ts:228`). A `#null` read into any field passes to the schema's parse, which refuses it unless the field is nullable (`read-kdl.ts:12-14`: the codec shapes, the parse checks). The reference walk yields no reference for a `null` part already: `nullable` walks `partRefSchema`, a union with no `refKind`, and no option takes `null` (`walk-references.ts:58-62`).
- An override's key is `(type, target)`, plus `component` for `side-component`; setting an override with an existing key replaces that item in place, so one remains (AD-23 "at most one each, replaced on a repeat"), not removed and appended, because posted override violations follow the list's order (Sergii's decision below) and a re-set override keeps its place; a new key is appended, as an add command with no index appends (AD-2 Layout commands, "an omitted index appends").
- A target resolves when the id after its side prefix is a slot (AD-24 "resolves a `SideId` to its authored slot after the side prefix"); a group or a missing id does not.
- A `null`-part override sets that side's row to `fit: 'empty'`; its `frame`, `anchorAt`, `part` row and every other row are what they are without it (AD-6 "keeps its space"), and it wins over `stand-in` (Data Schema). Borders are unchanged, since `groupBorders` doesn't read `fit` (`group-borders.ts:28-33`).
- Loaded overrides on a supported form: one whose target doesn't resolve reports `unresolvable-reference` (warning, ids `[target]`) and only that, since "the board is as if it were absent" (Consistency Conventions); a resolved `side-part` with a part reference reports `override-not-allowed` (error, ids `[target]`). Both are ignored when placing. An unsupported form still reports only `unsupported-form`.
- Every new message comes from one `model` function in `violations/`: `overrideNotAllowedMessage` (the swap's rejection and violation share it), `unresolvableReferenceMessage('override', …)` and `unknownOverrideTargetMessage` (SetOverride's `unknown-target`).
- `DeleteNode` deletes, in the same command, every override of either variant whose target names a deleted slot, either side.
- Loaded-only states (a swap on a reversible board, a dangling target, a mirrored or unibody form, a side-component) are arranged as a loaded file holds them: the ticket's verify asks for each ("a loaded swap reports…", "an override with a missing target reports…"), R3 says mirrored and unibody files "load and report `unsupported-form`", and the Violations row says a dangling override is one "only a file can hold".

**Decisions (Sergii, 2026-11-14, plan questions):**
- `SetOverride`'s input is the `side-part` override itself, `{ type: 'side-part', target, part }` (`sidePartOverrideSchema`), not `{ target, part }`, so the side-component story widens it to `overrideSchema`.
- Texts: `overrideNotAllowedMessage(['right/a'])` = `The override on "right/a" swaps its part, which a reversible board doesn't allow; an override there can only remove the part.`; `unresolvableReferenceMessage('override', ['right/zz'])` = `The override on "right/zz" names a slot that doesn't resolve.`; `SetOverride`'s `unknown-target` = `The design has no slot to override at "right/zz".`; not a swap text that says only what is refused (`… which a reversible board doesn't allow.`), because they carry the anchor message's pattern ("has an anchor that doesn't resolve") to overrides and the swap text says what is allowed instead.
- Posted violations: the parts', then the layout's, then the override violations in the `overrides` list's order, not sorted by target, because the list already has a stable order for one design.
- `checkSetOverride` checks the target before the swap, not the swap first, because the load rule names only a missing target: a swap on a missing target is `unknown-target`, not `override-not-allowed`.
- `checkSetOverride` reads the form only to refuse a swap on a split reversible board, not a refusal on every unsupported form, because those forms already place nothing and report only `unsupported-form`; no row covers them (left out).
- A loaded file repeating an override key is read override by override, not deduplicated or refused on load, because only a hand-edited file can hold it and the spine defines no check; no row covers it (left out).
- A removed part is `null`, not the word `'empty'`, because `'empty'` passes `idSchema` and would read as a design part with that id (spine 4f45eb8).

**Never:**
- No command for `side-component`; no clearing of an override, not a clear command here, because the ticket asks for none and re-fitting a side is the Fitted toggle's (EXPERIENCE.md:128, 14.5); no swap placement (mirrored boards are `unsupported-form`). No canvas, tree or editor change (13.8 draws the unfitted slot; `CanvasSlot.vue:18` already draws a non-fitted slot unfilled). No change to Corney's script or the dev seed.
- No `vi.mock`, snapshots or jsdom.

## Boundary table

Slots 1u (18 × 18), gap 1; form split reversible unless stated; `a`, `b` free slots under root `root`, `g` a free group, `zz` an id the design lacks; "remove" is a side-part override with `part: null`, "swap" one with `part: 'key'`.

| # | Group | Level | Input / State | Expected |
|---|---|---|---|---|
| 1 | production bugs | integration app | Corney's script, then the test-only step file, posted Layout set | `right/thumbfan-far-home` fit `empty`, its part row and frame as `left/thumbfan-far-home` reflected; `left/thumbfan-far-home` fit `fitted`; every other right row its left row reflected (13.6's relation); issues' violations `[]` |
| 2 | production bugs | integration app | a stored autosave whose design file has no `overrides` node | launch opens a new design; the stored one unchanged |
| 2b | rules | unit schema | `designSchema` on `aDesign()` with `overrides` removed | refused, issue path `['overrides']` |
| 3 | rules | unit schema | `sideIdSchema` on `left/thumb-far`, `right/thumb-far` / `whole/thumb-far`, `left/`, `thumb-far`, `left/Thumb` | accepted / refused |
| 4a | rules | unit schema | remove; swap; side-component `encoder` | accepted |
| 4b | rules | unit schema | side-part with a `component` field; side-part with `part` absent | refused |
| 5 | rules | unit schema | `ref('side-placement')` | metadata `{ refKind: 'side-placement' }`; accepts `right/a` |
| 6 | module boundaries | unit design-file | canonical bundle with an `overrides` section holding a remove (`part=#null`), a swap and a side-component | read and written back byte for byte, `overrides` after `layout` |
| 7 | rules | unit design-file | `writeKdl` of `v.strictObject({ s: v.strictObject({ p: v.nullable(v.string()) }) })` on `{ s: { p: null } }`; read back | `s p=#null` (a primitive inside a node is a property, AD-8); `{ s: { p: null } }` |
| 7b | module boundaries | unit design-file | `writeDesignFile` of a new design's value (`write-design-file.spec.ts:11`) | the same text with `overrides` as the last line, after `layout` |
| 8 | rules | unit design-file | `writeKdl` of `v.strictObject({ p: v.string() })` on `{ p: null }` | throws `The KDL codec writes only strings, numbers and booleans, not object.` |
| 9 | rules | unit model | `walkReferences` on overrides: remove on `left/a`, swap on `right/a`, side-component on `right/b` | `side-placement` references at `['overrides', i, 'target']` for all three; one `design-part` `key` at `['overrides', 1, 'part']`; none for the `null` part |
| 10 | rules | unit model | `setOverride` remove on `right/a`, then the same again | overrides `[that override]` after both |
| 11 | rules | unit model | form split mirrored, overrides `[swap on right/a, side-component on right/a]`; `setOverride` remove on `right/a` | `[remove on right/a, side-component on right/a]` |
| 12 | rules | unit model | `checkSetOverride` swap on `right/a`: reversible / mirrored; remove on `right/a`: reversible | err `override-not-allowed`, ids `[right/a]`, `overrideNotAllowedMessage([right/a])` / ok / ok |
| 13 | rules | unit model | `checkSetOverride` remove on `left/zz` / on `left/g`; swap on `left/zz` | err `unknown-target`, ids `[left/zz]`, `[left/g]`, `[left/zz]`, message `unknownOverrideTargetMessage(ids)` |
| 14 | module boundaries | unit commands | `SetOverride` through `DesignStore`: swap on `right/a` on a reversible design | `Err` `override-not-allowed`; the design unchanged, no commit |
| 15 | glue | unit commands | `SetOverride.id`; `available` and `apply` | `overrides.setOverride`; forward to `checkSetOverride` and `setOverride` |
| 16 | rules | unit model | `deleteNode([a])` with a remove on `left/a`, a side-component on `right/a`, a remove on `left/b` / `deleteNode([g])`, `g` holding `a`, override on `right/a` | overrides `[left/b's]` / `[]` |
| 17 | rules | unit model | `checkStructure`: previous holds an override on `right/zz`, next adds slot `c` / next adds an override on `right/zz` | ok / err `unknown-target`, ids `[right/zz]` |
| 18 | rules | unit model | createDerivations: chain group `g` holding `a`, `b`; remove on `right/a` | `right/a` fit `empty`; placements otherwise equal to the same design without it (frames, parts, borders); `left/a` fitted; violations `[]` |
| 18b | rules | unit model | `placeLayout` with removed ids `[right/a]`: slot `a` fitted / `a` a stand-in | `right/a` fit `empty`, frame and part row equal to the call with no removed ids; `left/a` `fitted` / `stand-in` |
| 18c | rules | unit model | `removedSideIds` on a remove on `right/a`, a remove on `right/zz`, a remove on `right/g`, a swap on `left/a`, a side-component on `left/a` | `{right/a}` |
| 19 | rules | unit model | slot `a` whose part doesn't resolve; remove on `right/a` | `right/a` fit `empty`, `left/a` fit `stand-in`; the part's `unresolvable-reference` for `a` still reported |
| 20 | rules | unit model | loaded remove on `right/zz` / on `right/g` | violations `[{ kind: 'unresolvable-reference', severity: 'warning', ids: [target], message: unresolvableReferenceMessage('override', [target]), fixes: [] }]`; placements equal to the design without it |
| 21 | rules | unit model | loaded swap on `right/a` | violations `[{ kind: 'override-not-allowed', severity: 'error', ids: ['right/a'], message: overrideNotAllowedMessage(['right/a']), fixes: [] }]`; placements equal to the design without it |
| 22 | rules | unit model | loaded swap on `right/zz` / side-component on `right/zz` | only row 20's `unresolvable-reference` for `right/zz` |
| 23 | rules | unit model | loaded swap on `right/a` and remove on `right/zz`, in that list order | violations `[override-not-allowed for right/a, unresolvable-reference for right/zz]` |
| 24 | rules | unit model | form split mirrored / unibody, loaded swap on `right/a` | violations exactly the one `unsupported-form` |
| 25 | rules | unit model | loaded side-component on `right/a` | violations `[]`; placements equal to the design without it |
| 26 | rules | unit model | `overrideNotAllowedMessage(['right/a'])`; `unresolvableReferenceMessage('override', ['right/zz'])` | the agreed texts, whole |
| 27 | rules | unit schema | `aDesign()`; `aSidePartOverride`, `aSideComponentOverride`, `anOverride(type)` | default parses; each field passed, a value other than its default, comes back (Test builders row) |
| 27b | rules | unit schema | `aSideId()`; `aSideId('right/b')`; `aSideId('whole/b')` | its default; `right/b`; throws (Test builders row, scalar) |
| 28 | rules | unit model | `unknownOverrideTargetMessage(['right/zz'])` | the agreed text, whole |

</frozen-after-approval>

## Code Map

- `packages/schema/src/design.ts:9-14` -- `designSchema`; `overrides: v.array(overrideSchema)` goes after `layout` (AD-8 order). `ref.ts:8-21` -- `targets` and overloads; add `'side-placement': sideIdSchema`. `part-ref.ts`; `part-id.ts` (a `v.custom` after `v.string()`, the pattern for `sideIdSchema`); `design-part.ts:7-25` (variant list items with `v.metadata({ node })`). `types.ts:168` `ItemId`; `:187-195` `ModelRejectionKind`; `:205-211` `ViolationKind`. `index.ts`. `testing/design.ts` -- `aDesign`; `testing/form.ts` -- per-branch plus discriminator builders; `testing/index.ts`.
- `packages/design-file/src/codec/schema-fields.ts:5-19,103-110` -- `supported` kinds and `codecSchemaOf`, which unwraps `optional`; `nullable` unwraps the same way. `write-kdl.ts:37-44` -- `writeNode` writes a value field through `codecValue` (`codec-value.ts`, refuses anything but string, number, boolean); a `null` in a nullable field is written as KDL `null` before that call. `read-kdl.ts` passes a `#null` property on as `null` (row 7 proves it). `types.ts:12-26` -- `CodecSchema` gains `v.NullableSchema`. `schema-kinds.spec.ts:189-234` -- the refusals that stay.
- `packages/design-file/src/migrate-bundle.spec.ts:10-22` -- KDL `sections` text compared to `aDesign()` at `:34,176,200,211,221`; gains an `overrides` node. `round-trip.spec.ts:13-50` -- the canonical bundle; `design-file/write-design-file.spec.ts:11` -- the new-design text gains `overrides`.
- `app/src/launch/launch.spec.ts:39-53,236-255` -- `brokenDesignTexts` and its `it.each`; row 2 adds `'has no overrides'`.
- `packages/model/src/references/walk-references.ts` -- unchanged (see Always). `walk-references.spec.ts:26-77` -- "a design built from every section" gains overrides (row 9).
- `packages/model/src/check-structure.ts:81-98` -- `danglingTargets`; a `side-placement` target resolves by `nodeIdOf(target)` (`ids/side-qualified-id.ts:12`) among slot ids.
- `packages/model/src/layout-editing/{delete-node,check-set-anchor,set-anchor}.ts` -- `deleteNode` walks references for anchors (`:19-26`); the cascade removes list items whose `side-placement` target names a deleted slot, highest index first. Check-then-apply pattern for `available` and `apply`.
- `packages/model/src/parts/create-derivations.ts:47-53` -- selector computeds; `:156-173` `placements` and `violations`. `placement/place-layout.ts:37-75,88-96` -- one row per node and side from `partFields`; `placement/layout-row.ts:11-29`. `ResolvedParts.slots` holds `fit: 'fitted' | 'stand-in'` per slot (`schema/src/types.ts:229-233`).
- `packages/model/src/violations/{layout-violations,unresolvable-reference-message,types,unsupported-form-violation}.ts` -- violation builders and messages; `UnresolvedReference = 'part' | 'anchor'`. `main.ts`, `worker.ts` exports.
- `packages/commands/src/layout/{set-anchor,set-anchor-input-schema,layout-commands-module,types}.ts`, `layout-commands.spec.ts` -- the command, schema, module and forwarding-spec pattern. `commands/src/index.ts`; `app/src/main-modules.ts:17-29`.
- `reference-designs/src/scripts/{index,types,corney-island-layout}.ts` -- `LayoutScript`, `corneyIslandLayout`; `thumbfan-far-home` at `:76`.
- `app/src/right-half.spec.ts:24-80` -- `arrange`, `runCorneyScript`, `sideOf`, `reflected`; they move to `app/src/testing/corney-script.ts` (functions), used by row 1's spec and every `app` spec that declares its own copy (`right-half`, `layout-set`, `corney-left-half`, `corney-column`, `blueprint-inputs`). `reflected` spreads the row's `fit`, so row 1 states `fit: 'empty'` for the removed row.
- `packages/editor/src/rejection/rejection-text.ts:24` -- a model kind gives its message; no editor change.
- `commands/src/design/new-design.ts:23-34` gains `overrides: []` (production). A spec that builds a `Design` uses `aDesign`; `pnpm typecheck` lists the literals, and the KDL texts are the ones named here.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/schema/src/{side-id,override}.ts`, `ref.ts`, `design.ts`, `types.ts`, `index.ts` -- `sideIdSchema`; `sidePartOverrideSchema`, `sideComponentOverrideSchema`, `overrideSchema`; `ref('side-placement')`; `overrides` in `designSchema`; `SideId`, `Override` inferred; `ItemId` gains `SideId`; `'override-not-allowed'` in `ModelRejectionKind` and `ViolationKind`. Rows 3–5.
- [ ] `packages/schema/src/testing/{side-id,override,design,index}.ts` -- `aSideId`, `aSidePartOverride`, `aSideComponentOverride`, `anOverride(type)` (functions); `aDesign` defaults `overrides: []`. Rows 2b, 27, 27b.
- [ ] `packages/design-file/src/codec/{schema-fields,write-kdl,types}.ts`, `schema-kinds.spec.ts` -- `nullable` in the codec (function changes). Rows 7–8.
- [ ] `packages/design-file/src/round-trip.spec.ts`, `design-file/write-design-file.spec.ts`, `migrate-bundle.spec.ts` -- rows 6, 7b; the `sections` text gains `overrides`.
- [ ] `packages/model/src/references/walk-references.spec.ts` -- row 9.
- [ ] `packages/model/src/violations/{override-not-allowed-message,unknown-override-target-message,override-violations}.ts`, `types.ts`, `unresolvable-reference-message.ts` -- `overrideNotAllowedMessage(ids)`, `unknownOverrideTargetMessage(ids)`, `overrideViolations(overrides, layout, form)` (functions); `'override'` in `UnresolvedReference`. Rows 20–23, 26, 28.
- [ ] `packages/model/src/overrides/{check-set-override,set-override,removed-side-ids,override-key}.ts` -- `checkSetOverride`, `setOverride`, `removedSideIds(overrides, layout)` (the side-qualified ids of slots a resolved `null`-part override names), `overrideKey` (functions). Rows 10–13.
- [ ] `packages/model/src/check-structure.ts`, `layout-editing/delete-node.ts` -- `side-placement` resolution; the cascade. Rows 16–17.
- [ ] `packages/model/src/placement/place-layout.ts`, `parts/create-derivations.ts` -- `placeLayout` takes the removed ids and writes `fit: 'empty'` on those slot rows; `createDerivations` selects `overrides`, passes `removedSideIds`, and appends `overrideViolations` after the layout violations on a supported form. Rows 18–19, 24–25.
- [ ] `packages/model/src/{main,worker}.ts` -- export `checkSetOverride`, `setOverride`, `overrideNotAllowedMessage` (main); `overrideNotAllowedMessage` (worker).
- [ ] `packages/commands/src/overrides/{set-override,set-override-input-schema,types,overrides-commands-module}.ts`, `overrides-commands.spec.ts`, `commands/src/index.ts`, `app/src/main-modules.ts` -- `SetOverride` (service; id `overrides.setOverride`, label `Set override`), its module, registered. Rows 14–15.
- [ ] `reference-designs/src/scripts/corney-island-test-overrides.ts`, `index.ts` -- `corneyIslandTestOverrides: LayoutScript`, one `overrides.setOverride` removing `right/thumbfan-far-home`'s part, with a comment that the real board sets no overrides and the reference script never includes it.
- [ ] `app/src/testing/corney-script.ts`, `app/src/{right-half,layout-set,corney-left-half,corney-column,blueprint-inputs}.spec.ts`, `app/src/per-side-overrides.spec.ts`, `app/src/launch/launch.spec.ts` -- the shared helpers moved; rows 1 and 2.
- [ ] The specs the schema change breaks -- add `overrides` or use `aDesign`; assert whole.
- [ ] Stryker on `design-file/src/codec/{schema-fields,write-kdl}.ts`; every survivor gets a verdict.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row has a passing test at its level.
- Given rows 1 and 2, when the implementer breaks the wiring each covers (`createDerivations` not passing the removed ids; `overrides` made optional in `designSchema`), then that test goes red; each is named in the PR.

## Implementation Notes

- Decision (Sergii): row 1 is a `describe` in `app/src/right-half.spec.ts`, beside the helpers it uses, not in `app/src/testing/corney-script.ts`, because dependency-cruiser treats any non-spec file under `app/src` as production code, which may not import `reference-designs`, packages' testing subpaths or worker subpaths, and the fence change was refused. `per-side-overrides.spec.ts` was deleted. The four older specs keep their own copies of the helpers (deferred-work entry).
- Decision (build): `isNullable` is true only for a field whose own schema is `v.nullable`, not an `optional` wrapping one, because the plan names `v.nullable` and no schema has the wrapped shape (its survivor in Stryker showed it untestable).
- Decision (build): `null` is written through one `fieldValueOf` for top-level and nested value fields, not only nested ones, because the plan's Always says "writes `null` only in a field whose schema is `v.nullable`", any field; record entries still go through `codecValue` (row 8, `schema-kinds.spec.ts:228`).
- Decision (build): `resolvesToSlot` (`overrides/override-target.ts`) and `isRefusedSwap` (`overrides/refused-swap.ts`) are files of their own, not inlined, because `checkSetOverride`, `overrideViolations` and `removedSideIds` share them (AGENTS.md "a new concept gets a new file"), so the command and the load can't disagree.
- Decision (build): `checkStructure` keeps its generic `unknown-target` text for a new dangling override, not `unknownOverrideTargetMessage`, because row 17 asks only the kind and ids and the structural check names every reference kind alike.
- Decision (build): builder defaults are a removal (`aSidePartOverride()`: `right/id`, `part: null`), not a swap, because AD-6 lets a reversible board, M1's one form, differ only by removal.
- Rebase: after PR #61 (`f4df4b7`) deleted `tooling/lint`, the uncommitted work moved onto it; `baseline_revision` stays `40326d1`, so a diff since baseline also shows #61's deletion, which is not this story's.
- Structural changes: none (`git diff --name-only` since baseline names no tsconfig, package.json, workspace, Vitest, ESLint, Stryker or dependency-cruiser file, no `declare global`/`module`).
- Real-host run: no third-party fake in the diff (the specs' runners and storage backends are the repo's own); `@bgotink/kdl`'s `#null` round trip is proven by row 7 against the real library.
- Toggled bugs (implementer): `createDerivations` passing an empty set for the removed ids turned row 1 red; `overrides` as `v.optional` in `designSchema` turned row 2 red; both restored.
- Stryker: `write-kdl.ts` 100%; `schema-fields.ts` 99.08%, one survivor at `:93` (`option !== undefined` in `resolveObject`'s union branch), a line this story didn't change.
- Verification: `pnpm test` 648 files, 5182 tests passed, no type errors (load average 16 at the end); typecheck, lint, depcruise, format:check clean. Three earlier full runs failed only by timeouts under another project's load (ESLint-backed specs, Firefox first-load waits); each failed non-lint file passed alone.

## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer), diff against main `f4df4b7` (the baseline plus PR #61, which isn't this story's). Verdicts: 0 high, 0 medium, 9 low, 2 false. Nothing above low and no frozen line broken, so the review ends; its lows are logged, not patched.
- low, logged: `right-half.spec.ts` row 1 builds its expected rows with a ternary on `REMOVED`, and its name says "as before" where it compares with the left half reflected (test-reviewer 1).
- low, logged: `create-derivations.spec.ts` `placedWith` takes a `form` no caller passes (`:907`, every call at `:919-1006` omits it) (test-reviewer 2).
- low, logged: `create-derivations.spec.ts` rows 20–25 assert whole override violations that `override-violations.spec.ts` also covers; the plan's rows 20–25 place them at createDerivations, so the fix would edit the plan (test-reviewer 3, AGENTS.md "Test a rule where it is defined").
- low, logged: `check-set-override.spec.ts` row title `a swap on an id the design lacks, before the swap` reads oddly in the test name (test-reviewer 4).
- low, logged: `side-id.spec.ts` names its rows `on %s` with a boolean expected, so the name doesn't say accepted or refused (quick 1).
- low, logged: `check-set-override.spec.ts` `arrange` builds slot `b`, which no test there reads (quick 2).
- low, logged: `place-layout.spec.ts` row 18b narrows to `fit` after a whole-value `toEqual` (quick 3).
- low, logged: comments that restate the code above `isNullable` (`schema-fields.ts`), `runCorneyScript` (`right-half.spec.ts`) and in `removed-side-ids.ts` (quick 4).
- low, logged: the plan's Code Map, Tasks and last Design Notes decision still describe `app/src/testing/corney-script.ts`; Implementation Notes record Sergii's change; the fix edits the plan (quick 6).
- false: row 14's "no commit" shown by `store.current` staying the same object; `#write` (`design-store.ts:257-259`) sets a new `Committed` with seq + 1 on every commit, so an unchanged object means no commit (quick 5).
- false: row 1 may read a layout one seq behind the issues; `layoutSetArrived` is true only when the posted parts' and layout's seqs both equal the store's current seq (`model-worker-lifecycle.ts:49-52`) (quick 7).

## Design Notes

- Decision (plan): `part` is `v.nullable(partRefSchema)`, not `v.union([v.null(), partRefSchema])`, because Valibot documents `nullable` as the schema for a value that may be `null` (https://valibot.dev/api/nullable/), and the spine names it (a1bea0d).
- Decision (plan): the codec writes `null` only in a nullable field, not in every value field, because `schema-kinds.spec.ts:228` ("refuses a null record value as a value it cannot write") is an existing requirement, and AGENTS.md: "Never delete, skip or weaken a failing test".
- Decision (plan): `fit: 'empty'` is applied per side in `placeLayout`, not in the parts derivation, because `ResolvedParts.slots` holds `fit: 'fitted' | 'stand-in'` per slot (Data Schema, `ResolvedParts`) while an override targets one side's placement.
- Decision (plan): the test-only step file lives in `reference-designs/src/scripts/`, beside `corneyIslandLayout`, not in an `app` spec, because the spine's Reference designs row keeps that package "run by `app`'s tests only and the one dev seed file", and 13.8's verify reads the same file ("a right slot removed by 13.33's test-only override step file").
- Decision (plan): a target naming a group does not resolve, not resolve to the group's slots, because AD-24: "It resolves a `SideId` to its authored slot after the side prefix".
- Decision (plan): a dangling swap reports only `unresolvable-reference`, not also `override-not-allowed`, because the Violations row says a dangling override is ignored "so the board is as if it were absent".
- Decision (plan): row 2 joins `launch.spec.ts`'s `it.each`, not a new spec, because that table already proves the same path for `'has no library-versions'` (`launch.spec.ts:46-49,239`).
- Decision (plan): `removedSideIds` is named for what it returns, not `removedPlacements`, because it returns side-qualified ids (glossary **side-qualified id**) and `placements` is `createDerivations`' `LayoutOutput` computed.
- Decision (plan): `SetOverride` is a `di`-registered class (service), not a plain function, though it holds no state, because the spine keeps "every command and action as a `di`-registered class whose class is its handle (`commands`)".
- Decision (plan): `overrides` is a required section with no default, not read as `[]` when missing nor a format-version bump, because the Data Schema types it `overrides: Override[]` (no `?`) and AD-8 says "Until the first public preview, `format-version` stays 1: a schema change bumps nothing and adds no migration step. An autosave that no longer parses is refused by `replaceDesign`"; precedent `'has no library-versions'` (`launch.spec.ts:46`).
- Decision (plan): the helpers are named `corney-script.ts`, not `model-worker-scenario.ts`, because they run Corney's script and read its rows, and scenario is no glossary term. Row 1's helpers move to `app/src/testing/corney-script.ts`, not a copy in the new spec, because AGENTS.md: "Write a shared assertion once".

Visible: nothing on screen changes. `pnpm dev`, `/?seed=corney` looks as today, because the seed runs only Corney's script, which sets no override; a removed slot would draw unfilled through `CanvasSlot.vue:18`, and 13.8 checks that. A design autosaved before this change has no `overrides` node, so launch opens a new design in its place (row 2).

## Conformance Log

- `Every new message comes from one model function` vs the inline `unknown-target` text (both readers, gap 1c) -- fixed (`unknownOverrideTargetMessage`, row 28)
- `SetOverride` untagged (both readers) -- fixed (service, decision)
- "assert whole … use `aDesign`, never a copied literal" vs "add `overrides` or use `aDesign`" -- fixed
- Sergii's order and texts decisions lacked "because"/"not Y" -- fixed (reasons from the questions he accepted)
- Two `Decision (plan):` lines lacked Y -- fixed
- Unibody / other forms for `checkSetOverride` (reader B 6, gap 1b) -- asked (left out); row 24 gains unibody
- New key position; loaded repeated key (reader A 5) -- fixed (append, AD-2); asked (left out)
- "Test a rule where it is defined": required `overrides` only proven at launch -- fixed (row 2b)
- `#null` read into a non-nullable field -- fixed (Always names the parse as the refuser)
- Walk change premise false (both readers) -- fixed (walk unchanged; row 9 kept as the every-section walk test)
- `removedPlacements` returns ids -- fixed (`removedSideIds`)
- Row 7 expected `p=#null` for a top-level primitive (AD-8) -- fixed (nested, `s p=#null`)
- `aSideId` scalar builder rows (Test builders row) -- fixed (row 27b)
- New-design text with no row -- fixed (row 7b)
- Shared helpers of `right-half.spec.ts` ("Write a shared assertion once") -- fixed (`app/src/testing/corney-script.ts`)
- Precedent `schema/src/testing/design.spec.ts` `libraryVersions` row passes the default -- deferred; new rows pass non-defaults (row 27)
- Precedent `check-set-anchor.ts`, `check-delete-node.ts` inline `unknown-target` texts -- deferred
- Precedent `create-derivations.ts` holds violation builders beside derivation code -- deferred; the plan adds none there
- Precedent `launch.spec.ts` `'has no library-versions'` without a schema-level row -- deferred
- Check 6 saved work: no finding (both readers)
- gap: side-component in dangling and cascade rows (`override-violations.ts`, `delete-node.ts`) -- fixed (rows 16, 22)
- gap: `packages/design-file/src/migrate-bundle.spec.ts` KDL text -- fixed; `read-kdl.spec.ts` -- false (`readKdl` doesn't validate; its expectations omit sections already)
- gap: 14.5's Fitted toggle needs clearing (`EXPERIENCE.md:128`) -- fixed (Never gives X, not Y, because Z; deferred-work entry)
- Final pass: target-first decision lacked Y -- fixed
- Final pass: texts decision's Y was empty -- fixed (the refusal-only text)
- Final pass: "in place" unlabelled -- fixed (decision)
- Final pass: required `overrides` unlabelled ("A choice no requirement made is a decision") -- fixed (decision, AD-8 quote)
- Final pass: `fit: 'empty'` only through `createDerivations` ("Test calculations as units in the package that owns them") -- fixed (rows 18b, 18c)
- Final pass: `model-worker-scenario` not a glossary term -- fixed (`corney-script.ts`)
- Final pass: other specs keep helper copies ("Write a shared assertion once") -- fixed (all five specs)
- gap: loaded-only states (swap, dangling, mirrored, unibody, side-component) -- fixed (Always names the file-load path with the ticket and spine quotes)

## Verification

**Commands:**
- `pnpm --filter @keeb-cad/schema test`, `pnpm --filter @keeb-cad/model test`, `pnpm --filter @keeb-cad/commands test`, `pnpm --filter @keeb-cad/design-file test` -- expected: green.
- Stryker on the changed `design-file` codec files -- expected: every survivor has a verdict.
- `pnpm test` -- expected: the whole suite green.
- `pnpm typecheck`, `pnpm lint`, `pnpm depcruise`, `pnpm format:check` -- expected: clean.
