---
title: 'Parameters drive placement'
type: 'feature'
ticket: '8'
created: '2026-11-17'
status: 'ready-for-dev'
baseline_revision: ''
route: 'full'
route_source: 'auto'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A design has no parameters, `expressionSchema` admits only literals (`packages/schema/src/expression.ts:6`), and placement throws on anything else (`packages/model/src/placement/literal-value.ts:6-12`). 14.5's fields, the Parameters tab, 14.9 and 15.2 need expressions that name parameters to place keys.

**Approach:** Add the `parameters` section and `ParameterName`, and let `expressionSchema` admit every expression `parseExpressionTree` parses. One pure evaluation (parameters in dependency order, then every quantity field of `meta` and the layout against them) gives placement its numbers and `model/worker` its violations. `checkStructure` refuses a command that adds an evaluation fault or a parameter loop. `setParameter` adds or changes a parameter.

## Boundaries & Constraints

**Always:**
- Types are the Data Schema's: `ParameterName`, `Parameter`, `ItemId = Id | LibraryId | SideId | ParameterName`, the four `ModelRejectionKind` members 14.8 adds, `Violation`.
- `ParameterName`: `\p{L}`, then `\p{L}`, `0-9` or `_`; never `mm` or `deg`. An invalid name given to `setParameter` is `input-invalid` from its schema.
- A quantity field evaluates with `expr`'s `evaluate` against the parameters' values. Faults: `unit-mismatch` (the result's unit is not the field's `unit` metadata, a unitless result included, or `evaluate` returns it), `unresolvable-reference`, `division-by-zero`, and `negative-length` (below 0, only on a field whose `quantity` metadata is `length`; 0 is accepted). A parameter has no field unit, so only `evaluate`'s own faults apply to it, and it may be negative or unitless.
- Parameter references are dependency-graph edges. A parameter loop is `dependency-cycle`: a command's rejection names the loop from the changed parameter, a loaded file's violation from its lowest member by `compareCodeUnits`.
- A command is refused only for a fault or loop the edit added (as `checkStructure` already refuses only new dangling references and cycles, `packages/model/src/check-structure.ts:20-22`).
- A loaded file's fault is an `error` violation; the failing node, and every node that reads a failed parameter, are not placed, with their dependants.
- Decision (Sergii 2026-11-17): `parameters: Parameter[]` comes right after `meta` in `Design`, a required list like every other section, not optional with a `[]` default, so a design stored before 14.8 fails to load as `design-invalid` (spine b0b0a6934bc0a337a9c4bc9339bbb7b881c3ccf1); the stored bundle stays, since "A design replaceDesign refuses replaces nothing" (`packages/commands/src/load/design-loader.ts:14`).
- Decision (Sergii 2026-11-17): one cycle finder for nodes and parameters, not a separate parameter finder, because AD-3 prevents "two cycle checks": `cyclesOf` and `anchorCycle` take each item's dependencies as a list (a node's list holds its one dependency) and run over both layers.
- Decision (Sergii 2026-11-17): when `gap.x` fails, every node with a `previous` dependency along `x`, and its dependants, is not placed (the same for `y`), not the whole layout, because only a chain step reads the gap (`packages/model/src/placement/group-frames.ts:56-61`).
- Decision (Sergii 2026-11-17): a failed gap axis reads as 0 for `borderMargin`, so the margin falls to its 1 mm floor and borders still draw, not no borders while it fails.
- Decision (Sergii 2026-11-17): a name that mixes scripts (`gap` against `gаp`) is not refused, not a spine change to `ParameterName`, because a look-alike used in an expression is refused as `unresolvable-reference` naming it (`deferred-work.md:711`).
- Decision (Sergii 2026-11-17): evaluation that overflows to `Infinity` is not refused, not a new `EvaluateError` kind, because reaching it takes a typed number near 1.8e308 (`deferred-work.md:714`).
- Decision (Sergii 2026-11-17): of two parameters with one name in a loaded file, expressions read the first and the later ones are ignored, not a `design-invalid` refusal, because only a hand edit reaches it (`setParameter` replaces by name).
- Decision (Sergii 2026-11-17): rows may arrange a loaded file holding a fault no command makes (an unknown name, a unitless offset, a parameter loop, a fault already present before an edit), not only command-reachable states, because a hand-edited file is a real way in and the ticket's verify asks for "a loaded file with a unit-mismatch, and one with an unknown parameter name"; AGENTS.md is unchanged.
- Decision (plan): `meta` is named in `ids` by the design's id (`meta.id`), not the word `"meta"`, because `ItemId` (`Id | LibraryId | SideId | ParameterName`) has no `"meta"` member and `unsupportedFormViolation(designId)` already names the design by its id (`packages/model/src/violations/unsupported-form-violation.ts:6`).

**Never:**
- No rename or delete of parameters (14.9), no editor or UI change (14.5, the expression field), no `setGap` (14.5).
- No new `EvaluateError` kind and no change to `expr`.
- No change to how a design's blueprint quantity inputs are read: no blueprint declares a quantity input yet (`packages/model/src/inputs/input-faults.ts:26-27`), so any quantity value in a slot's inputs is already refused as an unknown input.

</frozen-after-approval>

## Code Map

- `packages/schema/src/expression.ts:4-9` -- `v.check` on `parseExpression(text).isOk()`; switches to `parseExpressionTree`. `quantity.ts:7-18` keeps its wrong-unit literal check (`err: () => true` passes a non-literal), so a literal `5deg` in a length field stays `input-invalid` / `design-invalid`, while `wall` passes and is checked at evaluation.
- Other `expressionSchema` users: `declared-input.ts:14-15,23`, `upgrade-mapping.ts:11`, `input-value.ts:7`; `packages/blueprint/src/lane/check-nested-inputs.ts:22-28` reads a nested quantity default with `parseExpression` and throws `InvariantError` on a non-literal.
- `packages/schema/src/design.ts:10-16` -- `strictObject`, every list a required `v.array`; `design.spec.ts:9` refuses each missing list section. `types.ts:174` `ItemId`, `:193-202` `ModelRejectionKind`, `:212-219` `ViolationKind`. `testing/design.ts:7-15` `aDesign`, `testing/design.spec.ts:20-26` one row per field; `testing/id.ts` the scalar builder pattern, `testing/override.ts` the list-item one.
- `packages/commands/src/design/new-design.ts:22-34` -- `v.parse(designSchema, {…})` with no `parameters`; would throw. `new-design.spec.ts:36-39` lists the sections. `app/src/launch/launch.spec.ts:47,51` -- a stored design missing a section opens a new design.
- `packages/design-file/src/codec/` -- generic over schema metadata; no code change. `round-trip.spec.ts`, `migrate-bundle.spec.ts:23` fixtures list the sections.
- `packages/model/src/references/walk-references.ts:18-74` -- the one schema-and-value traversal; returns early on `expression: true` (`:25-26`). `walk-references.spec.ts:29-60` walks every section; `:90` "finds no reference in literal expressions". Other walk users filter by kind: `layout-editing/delete-node.ts:27-35`, `duplicate-node.ts:32`.
- `packages/model/src/check-structure.ts` -- `checkReferences` (`danglingTargets` flags any kind its `resolves` map lacks, `:96-101`), `checkCycles` (`:53-64`, rotation from the changed member). Called at `packages/design/src/store/design-store.ts:192-193`; `design` needs no change.
- `packages/model/src/dependencies/` -- `dependencyGraph` (one `Dependency` per node, `types.ts:4-7`), `checkAnchors` (`cyclesOf`, `unplacedOf`), `anchorCycle`, `dependencyOrder`; callers `would-cycle.ts:7`, `layout-editing/check-set-anchor.ts:45`, `check-structure.ts:53-64`, `parts/create-derivations.ts:156`; specs `check-anchors.spec.ts`, `would-cycle.spec.ts`, `dependency-order.spec.ts`, `check-set-anchor.spec.ts`.
- `packages/model/src/placement/literal-value.ts` -- removed; callers `read-offset.ts:9,17`, `place-layout.ts:48,53` (reads the root's offset even when the root is unplaced), `parts/create-derivations.ts:165`.
- `packages/model/src/parts/create-derivations.ts:156-180` -- selector computeds, `anchors`, `placements`, `violations` (parts, then `layoutViolations`, then overrides).
- `packages/model/src/violations/` -- one message function per kind; `dependency-cycle-message.ts:4` says "The nodes form a loop"; `unresolvable-reference-message.ts:6` takes a reference kind beside the ids. `main.ts` and `worker.ts` export the message functions tests use (`app/src/anchors.spec.ts:4`).
- `packages/commands/src/overrides/set-override.ts:9-22`, `set-override-input-schema.ts` (`setOverrideInputSchema = sidePartOverrideSchema`), `overrides-commands-module.ts:5-9`, `index.ts:69-71`, `app/src/main-modules.ts:6,23`; `packages/model/src/overrides/set-override.ts:8` -- the command and domain-operation pattern.
- `app/src/testing/arrange-store.ts`, `arrange-placements.ts`, `run-corney-script.ts`; `app/src/corney-column.spec.ts:92-105` -- Corney integration; its `KEY_1U_RUN` computes an expected value with `argumentHash`, and one test's name and first `expect` claim different things; don't copy either. `reference-designs/src/scripts/corney-island-layout.ts:43` has an `x` chain; `newDesign` sets the gap to `1mm` (`new-design.ts:29`).

## Tasks & Acceptance

**Execution:**
- [ ] `packages/schema/src/parameter-name.ts`, `parameter.ts`, `expression.ts`, `design.ts`, `types.ts`, `index.ts` -- `parameterNameSchema` (`v.regex(/^\p{L}[\p{L}0-9_]*$/u, 'A parameter name is a letter, then letters, digits or _.')`, `v.check` not `mm`/`deg` `'mm and deg are units, not parameter names.'`, `v.brand('ParameterName')`); `parameterSchema` (`strictObject { name, value: expressionSchema }`, `v.metadata({ node: 'parameter' })`); full-expression check; `parameters` after `meta`; inferred types; `ItemId`, `ModelRejectionKind`, `ViolationKind` widened; `index.ts` exports both schemas.
- [ ] `packages/schema/src/testing/parameter-name.ts`, `parameter.ts`, `design.ts`, `index.ts` and their specs -- `aParameterName(text = 'wall')` (function), `aParameter({ name, value })` (function), both parsing through their schemas; `aDesign`'s `parameters = []`; the spec rows the Test builders row asks for. `design.spec.ts` gains `parameters` in its missing-section row.
- [ ] `packages/commands/src/design/new-design.ts`, `new-design.spec.ts`; `app/src/launch/launch.spec.ts` -- `parameters: []`; the section rows gain `parameters`.
- [ ] `packages/design-file/src/**/*.spec.ts` -- fixtures gain a `parameters` node; one round-trip row with a parameter and an expression offset.
- [ ] `packages/blueprint/src/lane/check-nested-inputs.ts` -- the nested quantity default is read with `evaluate(value, new Map())`; an `Err` is that input's `nested-input` failure, not an `InvariantError`.
- [ ] `packages/model/src/references/walk-schema.ts` (function), `walk-references.ts`, `types.ts` -- the traversal moves to `walkSchema`, which yields each value whose schema carries `refKind`, `expression` or `unit` metadata with that metadata and path; `walkReferences` yields `{ kind: 'parameter', target: name }` per name node of each expression; `check-structure.ts`'s `danglingTargets` skips `parameter`.
- [ ] `packages/model/src/dependencies/` -- `cyclesOf`, `anchorCycle`, `unplacedOf` (function) take an item's dependencies as a list; `parameter-dependencies.ts` (`parameterDependencies`, function) gives each parameter the names its value reads (from `walkReferences`), its edges in the one dependency graph; callers and specs above follow.
- [ ] `packages/model/src/evaluation/evaluate-expressions.ts` (function), `field-violations.ts` (function, one field's evaluation against the scope), `types.ts` -- `evaluateExpressions({ parameters, gap, layout })` returns plain data: `values` (`ReadonlyMap<string, number>` keyed by `walkSchema`'s path joined with `/`, e.g. `meta/gap/x`), `fieldViolations` (`{ kind, item, path, name? }` in design order: `meta`, parameters in list order, nodes in tree order), parameter `cycles`, `failedGap` (`{ x, y }` booleans) and `unplacedNodes`. Parameters evaluate in dependency order; a parameter in a loop, reading a failed or unknown parameter, or a later duplicate, is left out of the scope; a parameter or field reading a failed parameter fails with no violation of its own. An `expression-syntax-error` from `evaluate` throws `InvariantError`, since the schema admitted only expressions that parse (14.2's rule: any other throw is a defect).
- [ ] `packages/model/src/violations/` -- `unitMismatchMessage(ids)`, `divisionByZeroMessage(ids)`, `negativeLengthMessage(ids)` (function each); `unresolvableReferenceMessage` gains `'parameter'` with the missing name; `dependencyCycleMessage(ids, members: 'nodes' | 'parameters')`; `expression-violations.ts` (function): one violation per kind and item, except one `unresolvable-reference` per missing name with every user's id in design order; `dependency-cycle` per parameter loop. Exported from `main.ts` and `worker.ts`, as `dependencyCycleMessage` is.
- [ ] `packages/model/src/check-structure.ts` -- `checkExpressions` (function) after `checkCycles`: field violations of `next` whose key (`kind`, item, path, name) `previous` lacks; the first in design order as `reject(kind, [item], message)`. `checkCycles` adds parameter loops, rotated from the changed parameter.
- [ ] `packages/model/src/placement/`, `parts/create-derivations.ts` (function) -- an `expressions` computed over the `parameters`, `gap` and `layout` selector computeds; `readOffset`, `placeLayout` and `borderMargin`'s caller read `values`; `unplacedNodes` and the failed-axis chain children join `unplacedOf`'s seeds; expression violations follow `layoutViolations`.
- [ ] `packages/model/src/parameters/set-parameter.ts` (function), `main.ts` -- replaces the value of the parameter with that name, else appends.
- [ ] `packages/commands/src/parameters/set-parameter.ts` (`SetParameter`, service), `set-parameter-input-schema.ts` (`setParameterInputSchema = parameterSchema`), `types.ts` (`SetParameterInput`), `parameters-commands-module.ts` (function); `index.ts`; `app/src/main-modules.ts` -- `parameters.setParameter`, label `Set parameter`; `available` always returns `Result.ok()`.
- [ ] `app/src/parameters.spec.ts` -- the Corney and registration rows, in a new file, not `corney-column.spec.ts`.
- [ ] Specs per the Boundary Table; `walk-references.spec.ts`'s every-section design gains `meta.gap`, `parameters` and an expression with a name, and its literal row stays (a literal yields no `parameter` reference) and a row with names joins it.
- [ ] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- close the entries at lines 711 and 714 with Sergii's decisions; one entry for Sofia: 14.5's verify "deg on a length is refused with unit-mismatch" meets the schema's literal check first (`input-invalid`); one precedent entry: `app/src/corney-column.spec.ts`'s `KEY_1U_RUN` computes an expected value with `argumentHash` ("no expected value computed the way production computes it"), and its round-trip test's first `expect` asserts the placed ids, not the round trip ("Make a test's name and its expects claim the same thing").

**Acceptance Criteria:**
- Given Corney loaded with `meta.gap.x` = `wall` and `wall` = `1mm`, when `setParameter { name: 'wall', value: '2mm' }` runs, then each key after the first in an `x` chain moves 1 mm further per step than in the arranged design, and one undo restores the arranged frames.
- Given every existing placement and command spec, when `pnpm test` runs, then they pass unchanged except the rows this plan names.

## Design Notes

`Decision (plan):` `evaluateExpressions` is a pure function in `model` that both `checkStructure` (main) and the worker's `expressions` computed call, not a computed only, because commands must refuse a failing expression on main (AD-17: "A command refuses an expression that fails to evaluate") while the spine keeps the derivation in the worker ("Shared derivations are small computeds defined in `model/worker`"); `checkAnchors` is shared the same way (`check-structure.ts:11`, `create-derivations.ts:156`). It is internal, exported by no entry, and is not the resolved design: nothing posts it.

`Decision (plan):` it takes `parameters`, `gap` and `layout`, not the `Design`, because "Every derivation reads the design mirror through **per-section selector computeds**".

`Decision (plan):` it returns `values` as data, not a `read` function, because "Data carries no methods: values are plain" (AD-25).

`Decision (plan):` the traversal moves into `walkSchema`, shared by references and evaluation, not a second walk, because AD-24's walk is "one function … in one file" over the schema and the value.

`Decision (plan):` evaluation faults are checked inside `checkStructure`, not a third store hook, because the spine names two store checks, "`checkInputs(previous, next, declarations)` … as `checkStructure(previous, next)` does" (AD-10).

`Decision (plan):` a field violation's key includes its path and missing name, not only kind and ids, because the frozen rule refuses "a fault … the edit added", and a second failing field on one item is a new one.

`Decision (plan):` a refusal names the first new field violation in design order, not every broken dependant, because the ticket says "naming it" and the spine orders users "meta for the gap, then parameters whose value uses it, then nodes" (Data Schema, 14.9).

`Decision (plan):` one loaded violation per kind and item, not per field, because `Violation.ids` names only items, so two for one item would read alike; and one `unresolvable-reference` per missing name, ids every user, because the spine says "ids name each node whose expression uses it (`meta` for the gap)".

`Decision (plan):` an item that reads a failed parameter is unplaced with no violation of its own, `gap.x` = `wall` included, not reported again, because the spine names the failing parameter: "ids name the node, `meta` or parameter; they and their dependants are not placed".

`Decision (plan):` the messages are `The expression of "a" has the wrong unit.`, `The expression of "a" divides by zero.`, `The length of "a" is below 0 mm.`, `No parameter is named "nope"; "a", "b" use it.` and `The parameters form a loop: "a" → "b" → "a".`, not kind-only text, because each names what a person fixes; the missing name is an argument beside the ids, as `unresolvableReferenceMessage` already takes its reference kind, because Sergii's decision rests on the refusal "naming it".

`Decision (plan):` a nested blueprint default is evaluated with an empty scope, not a literal-only declaration schema, because a declared range is "AD-17 expressions over this blueprint's own inputs" (Data Schema, `DeclaredInput`), so declarations take full expressions; an `Err` becomes that function's existing `nested-input` result, because "Design problems never throw".

`Decision (plan):` `dependencyCycleMessage` takes `members` (`'nodes'` or `'parameters'`), not a second function, because the spine builds "Each kind's message … by one `model` function", and an `Id` and a `ParameterName` are both strings, so the ids cannot tell which loop it is.

`Decision (plan):` `SetParameter.available` always returns `Result.ok()`, not a check of its own, because a bad name fails its input schema and every evaluation refusal comes from `checkStructure`, after `apply` (`design-store.ts:192-193`).

`Decision (plan):` `setParameter` appends a new parameter, not a sorted insert, because AD-2's add commands append when no index is given ("an omitted index appends").

`Decision (plan):` `SetParameter` is tagged `(service)`, as a class registered in `di`, not `(function)`, because AD-2 defines every command "as a class registered in `di`", as `SetOverride` is.

`Decision (plan):` the Corney row loads Corney's committed design with `gap.x` = `wall` and `parameters` [`wall` = `1mm`] through `replaceDesign`, not a command, because `setGap` is 14.5's.

## Conformance Log

Pass 1 (readers A, B; 0 findings dropped):
- `each class or function a plan adds is tagged (service) or (function)` (messages, `checkExpressions`, `aParameter`, `SetParameter`, module) -- fixed
- AD-25 entries (`evaluateDesign` entry unnamed) -- fixed (internal, shared like `checkAnchors`)
- AD-24 `in one file` (second schema walk) -- fixed (`walkSchema`)
- `its input schema as renameDesignInputSchema` (`setParameterInputSchema`, `SetParameterInput`) -- fixed
- `Give every threshold three rows ... add empty input and an input that breaks an assumption` (name, value, parameter faults, first-in-order, angle field) -- fixed
- precedent `app/src/corney-column.spec.ts` `const KEY_1U_RUN = ...argumentHash...` and its round-trip test's first `expect` -- deferred (named in the Code Map as not to copy; one `deferred-work.md` entry)
- `Data carries no methods` (`read` closure) -- fixed
- `Shared derivations are small computeds defined in model/worker` / `per-section selector computeds` -- fixed
- `Arrange only a state real commands could reach` (`5deg` literal row; loop row; loaded unknown-name row; Corney arrange) -- fixed
- frozen "refused only for a fault the edit added" (fault key) -- fixed
- `Give every decision its rejected alternative` (`meta` id) -- fixed
- glossary `resolved design` (`DesignEvaluation`) -- fixed (renamed `evaluateExpressions`, not the resolved design)
- `gap.x = wall` where `wall` fails -- fixed (decision follows the spine's naming of the failing parameter)

Gap review (0 findings dropped):
- gap: `packages/commands/src/design/new-design.ts` builds a `Design` with no `parameters` -- fixed
- gap: `packages/schema/src/design.spec.ts:9`, `app/src/launch/launch.spec.ts:47,51`, `testing/design.spec.ts:20-26` per-section rows -- fixed
- gap: `aParameterName` scalar builder -- fixed
- gap: `walk-references.spec.ts:29-60` every-section walk -- fixed
- gap: `packages/blueprint/src/lane/check-nested-inputs.ts:22-28` throws on a full-expression default -- fixed
- gap: `ParameterName` boundary rows -- fixed
- gap: `meta` id decision -- fixed
- gap: `index.ts` exports `parameterSchema`, `parameterNameSchema` -- fixed
- gap: new messages exported from no entry -- fixed
- gap: `would-cycle.ts`, `check-set-anchor.ts` and the dependency specs -- fixed
- gap: loaded-file states no command makes -- fixed (decision citing the ticket's verify and the spine)

Final pass (one reader; 0 findings dropped):
- `Give every test an expect that fails when the behaviour breaks.` (first-broken-item row) -- fixed
- `add empty input` (walk literal row) -- fixed
- AD-3 `one graph` (`parameter-graph.ts`) -- fixed (`parameterDependencies`)
- Naming `Glossary terms only.` (`faults`) -- fixed (`fieldViolations`, `unplacedNodes`)
- `A choice no requirement made is a decision` (`members` argument; `available`; syntax error; `values` key) -- fixed
- `Prove a test Stryker can't reach ... with a toggled bug` -- fixed
- `Arrange only a state real commands could reach` (loaded-file rows) -- asked: Sergii allowed them for this plan
- precedent `app/src/corney-column.spec.ts` (where the Corney row goes) -- fixed (new `app/src/parameters.spec.ts`)
- angle: schema name regex and the grammar's name rule tied by no row -- fixed (`ключ` row)


## Implementation Notes

## Plan Change Log

## Review Triage Log

## Boundary Table

| Group | Row | Input | Expected | Level |
|---|---|---|---|---|
| Production bugs | parameter change moves Corney's keys | Corney's design reloaded with `gap.x` = `wall`, `wall` = `1mm`; `setParameter wall 2mm` | each `x`-chain step 1 mm wider than arranged; undo restores the arranged frames | integration, app |
| Production bugs | offset expression places the node | `wall` = `3mm`; `addSlot` with `offset.position.x` = `wall + 1mm` | the slot's frame 4 mm along x from its anchor | unit, model |
| Production bugs | new design opens | `design.newDesign` | committed, `parameters` = `[]` | unit, commands |
| Production bugs | stored design without the section | a stored design with no `parameters` node | opens a new design, as for a missing `overrides` | integration, app |
| Rules | setParameter adds | empty `parameters`; `{ wall, 3mm }` | `[{ wall, 3mm }]` | unit, model |
| Rules | setParameter changes by name | `[{ wall, 3mm }]`; `{ wall, 5mm }` | `[{ wall, 5mm }]` | unit, model |
| Rules | negative parameter, no user | `setParameter wall -1mm` | accepted | unit, model |
| Rules | unitless parameter | `setParameter n 2` | accepted | unit, model |
| Rules | name empty | `` | `input-invalid` | unit, schema |
| Rules | name with `-` | `k-s` | `input-invalid` | unit, schema |
| Rules | name starting with a digit | `2k` | `input-invalid` | unit, schema |
| Rules | name starting with `_` | `_k` | `input-invalid` | unit, schema |
| Rules | non-ASCII digit | `k٣` | `input-invalid` | unit, schema |
| Rules | name with `_` and digits | `key_2` | accepted | unit, schema |
| Rules | non-Latin name | `ключ` | accepted | unit, schema |
| Rules | unit word `mm` | `mm` | `input-invalid` | unit, schema |
| Rules | unit word `deg` | `deg` | `input-invalid` | unit, schema |
| Rules | just past a unit word | `mmm`, `deg2`, `Mm` | accepted | unit, schema |
| Rules | empty value | `setParameter { wall, '' }` | `input-invalid` | unit, schema |
| Rules | parameter divides by zero | `setParameter wall 1mm / 0` | `division-by-zero`, ids [`wall`] | unit, model |
| Rules | unitless in a length field | `addSlot` offset x = `2` | `unit-mismatch`, ids [slot] | unit, model |
| Rules | angle in a length field | `a` = `5deg`; offset x = `a` | `unit-mismatch`, ids [slot] | unit, model |
| Rules | length in an angle field | `a` = `5mm`; offset rotation = `a` | `unit-mismatch`, ids [slot] | unit, model |
| Rules | literal with the wrong unit | offset x = `5deg` | `input-invalid` | unit, schema |
| Rules | division by zero | offset x = `1mm / 0` | `division-by-zero`, ids [slot] | unit, model |
| Rules | unknown name | offset x = `nope` | `unresolvable-reference`, ids [slot], message names `nope` | unit, model |
| Rules | parameter edit breaks a dependant | file `gap.x` = `wall`, `wall` = `1mm`; `setParameter wall -1mm` | `negative-length`, ids [design id] | unit, model |
| Rules | Length just below 0 | same file; `setParameter wall -0.001mm` | `negative-length` | unit, model |
| Rules | Length on 0 | same file; `setParameter wall 0mm` | accepted | unit, model |
| Rules | Length just above 0 | same file; `setParameter wall 0.001mm` | accepted | unit, model |
| Rules | first broken item named | file `gap.x` = `wall` and slot `k` offset x = `wall`, `wall` = `1mm`; `setParameter wall 1deg` | `unit-mismatch`, ids [design id] (not `k`) | unit, model |
| Rules | negative Delta | offset x = `-5mm` | accepted, placed at -5 | unit, model |
| Rules | parameter loop | `a` = `1mm`, `b` = `a`; `setParameter a b + 1mm` | `dependency-cycle`, ids [`a`, `b`] | unit, model |
| Rules | fault already in the file | file with `gap.x` = `nope`; `addSlot` with a literal offset | accepted | unit, model |
| Rules | second fault on a faulty item | file with slot `k` offset x = `nope`, offset y = `wall`, `wall` = `1mm`; `setParameter wall 1deg` | `unit-mismatch`, ids [`k`] | unit, model |
| Module boundaries | loaded unit-mismatch | file with slot `k` offset x = `2`, a free child anchored to `k` | `unit-mismatch` error, ids [`k`]; `k` and the child unplaced | unit, model |
| Module boundaries | loaded unknown name | file with `gap.x` = `nope`, an `x` chain of two slots, and a free slot `k` with offset x = `nope` | one `unresolvable-reference` error, ids [design id, `k`]; `k` and the chain's second slot unplaced, the first placed | unit, model |
| Module boundaries | loaded parameter fault | file with `wall` = `1mm / 0` and slot `k` offset x = `wall` | one `division-by-zero` error, ids [`wall`]; `k` unplaced | unit, model |
| Module boundaries | gap reads a failed parameter | file with `wall` = `nope`, `gap.x` = `wall`, an `x` chain of two | one `unresolvable-reference`, ids [`wall`]; the chain's second slot unplaced | unit, model |
| Module boundaries | loaded parameter loop | file `a` = `b`, `b` = `a`, slot `k` offset x = `a` | `dependency-cycle`, ids [`a`, `b`]; `k` unplaced | unit, model |
| Module boundaries | failed gap axis leaves the other axis | file `gap.x` = `nope`, `gap.y` = `1mm`, a `y` chain of two and an `x` chain of two | the `y` chain's second slot placed; the `x` chain's second unplaced | unit, model |
| Module boundaries | border margin with a failed axis | file `gap.x` = `nope`, `gap.y` = `5mm` | borders at the 1 mm margin | unit, model |
| Module boundaries | duplicate name in a file | `[{ wall, 1mm }, { wall, 5mm }]`, slot offset x = `wall` | the slot at x 1 | unit, model |
| Module boundaries | walk finds names | a design with a name in `meta.gap`, a parameter value, a node offset and a part's quantity input | one `parameter` reference per name, with its path | unit, model |
| Module boundaries | nested default expression | a nested blueprint quantity default `2 * 3mm`; one naming `w` | `6`; `nested-input` failure | unit, blueprint |
| Module boundaries | non-Latin name in an expression | `ключ` = `3mm`, slot offset x = `ключ` | the slot at x 3 | unit, model |
| Module boundaries | walk finds no name in a literal | offset x = `19mm` | no `parameter` reference | unit, model |
| Module boundaries | expression round trip | `parameters [{ wall, 3mm }]`, offset `wall + 1mm` | written and read back equal | unit, design-file |
| Glue | setParameter registered | `runById('parameters.setParameter', { name: 'wall', value: '3mm' })` | committed | integration, app |

## Verification

**Commands:**
- `pnpm vitest run --project @keeb-cad/schema --project @keeb-cad/model --project @keeb-cad/commands --project @keeb-cad/design-file --project @keeb-cad/blueprint` -- expected: green.
- `pnpm typecheck && pnpm check:fast` -- expected: clean.
- `pnpm test` -- expected: the whole suite green.
- Toggled bug for each `integration, app` row: break `setParameter`'s registration, the `parameters` read in placement, and the required `parameters` field in turn; watch each row go red, restore, and say so in the PR.
- No Stryker run: of the priority packages only `design-file` changes, and only its specs.

**Manual checks (if no CLI):**
- Nothing visible changes: no editor field or tab writes a parameter yet (14.5, the expression field), and Corney's script writes only literals, so the app looks the same. A design stored before 14.8 no longer opens; the app opens a new design instead.
