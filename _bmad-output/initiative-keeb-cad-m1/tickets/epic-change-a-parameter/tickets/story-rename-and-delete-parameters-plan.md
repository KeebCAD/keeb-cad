---
title: 'Rename and delete parameters'
type: 'feature'
ticket: '9'
created: '2026-11-17'
status: 'built'
baseline_revision: '0c62882480acdb2e127c9ab5859b1a3306501658'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: [quick, test-reviewer]
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 14.8 gave a design parameters and `setParameter`, but no way to rename or remove one. A rename by hand would leave every expression naming the old name unresolved; a delete would leave its users failing.

**Approach:** `renameParameter` renames the parameter and rewrites every use of the name in every expression of the design in the same command, splicing each expression's text at the name nodes' spans from `parseExpressionTree` so spacing and parentheses stay as typed. `deleteParameter` removes an unused parameter and is refused while anything uses it.

## Boundaries & Constraints

**Always:**
- Rejections are the Data Schema's (14.9 entry of `ModelRejectionKind`): `parameter-in-use` (new) for `deleteParameter` while used, ids every user in design order (meta, then other parameters whose value uses it, then parts whose inputs use it, then nodes); `unknown-target`, ids [the name], for a rename or delete of a name no parameter has; `id-taken`, ids [the target name], for a rename to a name another parameter has; `input-invalid` from the input schema for an invalid name.
- `meta` is named in `ids` by `meta.id`, as 14.8 decided.
- Decision (Sergii 2026-11-17): a part whose blueprint inputs use the parameter is a user, named by its part id between parameters and nodes, not left out, so a delete never leaves an expression naming a missing parameter; a part using one is reachable only by a hand-edited file today (`packages/model/src/inputs/input-faults.ts:26-27`). Spine 6717083.
- Decision (Sergii 2026-11-17): a rename onto a name some expression uses with no parameter of that name (a loaded file) is accepted, not refused, so those uses then read the renamed parameter; a loop the rename creates (`ks` = `key + 1mm`, `ks` → `key`) is refused by the store's `checkStructure` as `dependency-cycle`, nothing committed.
- Decision (Sergii 2026-11-17): `renameParameter` whose rewrite would make an expression longer than `expr`'s parser accepts is refused as `expression-too-long` (new), ids each such item in design order, not left to the store's schema check, which throws `InvariantError` (`design-store.ts:276-283`) where "Design problems never throw". Spine 70b5277.
- Decision (Sergii 2026-11-17): a parameter's own value is not a use, so deleting `a` with `a` = `a + 1mm` and no other user is accepted (the loop goes with it), not refused, and `parameter-in-use` ids never name the deleted parameter for its own value. Spine 70b5277.
- Decision (Sergii 2026-11-17, at review): in a loaded file with `[wall = 1mm, wall = wall * 2]`, the later `wall` reads the first, so deleting `wall` is refused as `parameter-in-use` ids [`wall`] (the later duplicate, named by its shared name), not passed to the store's `dependency-cycle` refusal; only the first parameter with the name is its own.
- Decision (Sergii 2026-11-17): rows may arrange a loaded file holding a state no command makes (an unresolved name, a parameter loop, a part input using a parameter, two parameters with one name), as for 14.8, because a hand-edited file is a real way in; AGENTS.md is unchanged.
- A rename to the parameter's own name writes nothing, so the store commits nothing and records no undo step (`design-store.ts:190`).
- Only name nodes whose name equals the old name are rewritten; a name that merely contains it (`ksx`) and number nodes stay.
- Each rewritten expression parses and passes `expressionSchema`.
- One command, one undo step: undo restores the parameter's name and every rewritten expression.

**Never:**
- No editor, Parameters tab or expression-field change (14.5 and the expression field).
- No change to `expr`, to evaluation or to `checkStructure`.
- No 15.2 write-back; only the splice it will share.
- No cascade: a used parameter is never deleted with its users.

</frozen-after-approval>

## Code Map

- `packages/model/src/parameters/set-parameter.ts:5` -- the domain-operation pattern; `find` acts on the first parameter with a name. Don't copy its comment on line 3, which restates the code. `set-parameter.spec.ts` -- the spec pattern.
- `packages/expr/src/parse-expression-tree.ts:8` -- `MAX_LENGTH = 512`, not exported; past it `parseExpressionTree` returns `expression-syntax-error`. `packages/design/src/store/design-store.ts:190-191` -- after a non-empty edit the store runs `#ensureValidDesign`, which throws on a design the schema refuses.
- `packages/model/src/references/walk-schema.ts` -- yields every `expression: true` value with its path from the design root; `walk-references.ts:20-28` turns each into `parameter` references by `expressionNames`. `value-at.ts` reads a value at a path.
- `packages/model/src/references/expression-names.ts` -- parses with `parseExpressionTree`, throws `InvariantError` on a text that passed its schema but does not parse; the tree walk (`namesIn`) is the shape to copy for name nodes with spans.
- `packages/expr/src/types.ts` -- `ExpressionTree` has `start`/`end` UTF-16 offsets (end exclusive) on every node; `parse-expression-tree.ts` is the parser.
- `packages/model/src/evaluation/evaluate-expressions.ts:67-79` -- the innermost-node lookup from a field path (`nodeAt` over `dependencyGraph(layout)` paths); `dependencies/types.ts:9-17` `GraphEntry.path`.
- `packages/model/src/layout-editing/check-delete-node.ts`, `check-add-node.ts:33-37` (inline `id-taken`), `violations/unknown-node-message.ts` -- check and message patterns; `reject/reject.ts`.
- `packages/schema/src/types.ts:197-210` -- `ModelRejectionKind`; no other file matches the kinds exhaustively.
- `packages/schema/src/design.ts` -- section order `meta, parameters, libraryVersions, parts, layout, overrides`; parts' blueprint inputs may hold expressions, overrides hold none.
- `packages/commands/src/parameters/` -- `SetParameter`, its input schema, `types.ts`, `parameters-commands-module.ts`, `parameters-commands.spec.ts` (store arrange with `designModule`); `layout/delete-node.ts` -- a command whose `available` forwards to a model check.
- `packages/commands/src/index.ts:47-49`, `app/src/parameters.spec.ts` -- exports and the app registration row (`runById`).
- `packages/design/src/store/design-store.ts:190` -- an edit with no patches returns `ok` and commits nothing.

## Tasks & Acceptance

**Execution:**
- [x] `packages/schema/src/types.ts` -- `ModelRejectionKind` gains `'parameter-in-use'` and `'expression-too-long'`.
- [x] `packages/model/src/expressions/splice-expression.ts` (function), `types.ts` (`SpliceEdit = { span: Span; text: string }`) -- `spliceExpression(expression, edits: readonly SpliceEdit[]): string` replaces each span's text, edits in any order; throws `InvariantError` when two spans overlap, a span ends before it starts or runs past the text; touching spans and a zero-length span (an insertion) are accepted. Exported by no entry: 15.2's write-back is a `model` domain operation and imports it in-package.
- [x] `packages/model/src/parameters/rename-in-expression.ts` (function) -- `renameInExpression(expression, from, to)`: the name nodes equal to `from`, spliced to `to`; throws `InvariantError` on an input text that does not parse, as `expressionNames` does.
- [x] `packages/model/src/ids/node-at-path.ts` (function each) -- `nodePaths(layout): ReadonlyMap<string, Id>` (each node's path from the design root by `valueKey`, built once per caller) and `nodeAtPath(nodePaths, path): Option<NodeAtPath>` (`NodeAtPath = { id: Id; at: number }` in `ids/types.ts`), the innermost node owning the path, `none` for a path outside `layout`; moved out of `evaluate-expressions.ts:67-79`, which keeps its `InvariantError` on `none`.
- [x] `packages/model/src/parameters/parameter-users.ts` (function) -- `parameterUsers(design, name): ItemId[]`, from `walkReferences`' `parameter` references to `name`, each owner once in design order, the parameter's own value left out: `meta` as `meta.id`, a parameter by its name, a part by its id, a node by `nodeAtPath`.
- [x] `packages/model/src/parameters/check-rename-parameter.ts`, `check-delete-parameter.ts`, `rename-parameter.ts`, `delete-parameter.ts` (function each) -- checks in order: `unknown-target` (also for `ks` → `ks` when no `ks` exists), then `id-taken` (rename, skipped when `to` equals `from`), then `expression-too-long` (rename: an expression whose `renameInExpression` result fails `parseExpressionTree`), then `parameter-in-use` (delete). `renameParameter` renames the first parameter with `from` and, for each expression value `walkSchema(designSchema, draft)` yields whose rewrite differs, writes it at its path; `from === to` writes nothing. `deleteParameter` removes the first parameter with that name.
- [x] `packages/model/src/violations/unknown-parameter-message.ts`, `parameter-taken-message.ts`, `parameter-in-use-message.ts`, `expression-too-long-message.ts` (function each) -- `The design has no parameter named "x".`, `The design already has a parameter named "x".`, `The parameter "x" is used by "a", "b".`, `Renaming "x" to "y" makes the expression of "a", "b" too long.`; `main.ts` exports the checks, operations and messages.
- [x] `packages/commands/src/parameters/rename-parameter.ts` (`RenameParameter`, service), `rename-parameter-input-schema.ts` (`v.strictObject({ from: parameterNameSchema, to: parameterNameSchema })`), `delete-parameter.ts` (`DeleteParameter`, service), `delete-parameter-input-schema.ts` (`v.strictObject({ name: parameterNameSchema })`), `types.ts`, `parameters-commands-module.ts`, `index.ts` -- ids `parameters.renameParameter` / `parameters.deleteParameter`, labels `Rename parameter` / `Delete parameter`; `available` forwards to the check.
- [x] `app/src/parameters.spec.ts` -- the registration rows, each arranging `aDesign({ parameters: [wall 1mm] })` through `replaceDesign` (not the Corney script) and asserting `design.parameters`.
- [x] Specs per the Boundary Table.
- [x] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- two precedent entries: `packages/commands/src/parameters/parameters-commands.spec.ts`'s `refuses a name that is %s` rows (`empty`, `a unit word`) re-test `parameterNameSchema`'s rule in `commands` ("Test a rule where it is defined"); `app/src/parameters.spec.ts`'s `commits parameters.setParameter run by its id` runs the whole Corney script it does not use ("Arrange only what the test uses").

**Acceptance Criteria:**
- Given a design whose `meta.gap.x`, a parameter's value and a node's offset each use `ks`, when `renameParameter { from: 'ks', to: 'key' }` runs and then one undo, then after the rename each of those expressions reads `key` with its other text unchanged, and after the undo the design equals the arranged one.
- Given `pnpm test`, then every existing spec passes unchanged.

## Implementation Notes

- `Decision (build):` the check and the operation share `parameters/renamed-expressions.ts` (`renamedExpressions`, function) and `parameters/expression-owners.ts` (`expressionOwners`, function), not a copy each, because "Give each file one kind of thing" and AD-24's walk is "one function … in one file"; `RenamedExpression` sits in `parameters/types.ts`.
- `Decision (build, after review):` a parameter's own value is left out of its users by path, the first `parameters` entry with that name only, not every entry with the name (a later duplicate reads the first, Sergii's 14.8 rule) and not by comparing user ids with the name, because a node may carry the same id string as a parameter (`ItemId` is `Id | LibraryId | SideId | ParameterName`; 14.8's `expressionViolations` key fix).
- `Decision (build):` users are unique by section and id, not by id alone, for the same reason.
- `Decision (build):` `expression-too-long` names a parameter by its old name, not the new one, because a refused command changes nothing, so the item still carries `from` in the design the rejection describes.
- `Decision (build):` `renameParameter` returns early when `from === to`, not relying on Immer to skip unchanged writes, so "writes nothing" holds by the code.
- `Decision (build):` the length rows pad `k` with spaces, not long number literals, because the grammar allows trailing whitespace and refuses a number literal a double cannot hold (14.2).
- Toggled bugs, each watched red and restored: dropping `RenameParameter` from `parametersCommandsModule` fails its three app rows in Chromium and Firefox; dropping `DeleteParameter` fails its two.
- Real-host run: no spec in the diff fakes a third-party host or boundary; the app rows use the real store and `MemoryBackend`.
- Structural changes: none (no tsconfig, package.json, workspace, Vitest, ESLint, Stryker or dependency-cruiser change; no `declare global` or `declare module`).
- `Decision (build):` `spliceExpression` keeps edits with an equal start in input order (`toSorted` is stable), not a tie rule, because no caller produces tied spans.
- Verification (step 3, mine): `pnpm typecheck`, `pnpm check:fast` clean; `pnpm test` 814 files, 6,124 tests passed, no type errors.

## Plan Change Log

## Review Triage Log

### Pass 1 (quick, test-reviewer; 0 findings dropped): high 0, medium 0, low 9, false 0, maybe-false 0

| Verdict | Route | Finding | Evidence |
|---|---|---|---|
| low | patch | `ownValue` drops every parameter with the name, so a later duplicate's use of it is not counted (quick) | `parameter-users.ts`: `section === 'parameters' && design.parameters[index]?.name === name`; loaded `[wall 1mm, wall = wall * 2]` gives `[]`, then the store refuses with `dependency-cycle`, not `parameter-in-use`. Fix: own value is the first parameter's index only; row added. |
| low | patch | No check-level row accepts a rename onto an unresolved name (quick) | Only `rename-parameter.spec.ts` covers the operation; a refusal added to `checkRenameParameter` would pass every spec. Row added. |
| low | patch | `accepts a rewrite %s, giving the expected length` runs the operation and asserts a length (quick, test-reviewer) | `renameParameter(...)` and `toHaveLength` inside the check spec; "assert whole values". Check keeps `expectOk`; text rows move to `rename-parameter.spec.ts` with `toBe`. |
| low | patch | `nodeAtPath` declares `{ id: Id; at: number }` inline (quick) | `node-at-path.ts:17`; "Put every type a folder declares … in that folder's `types.ts`". |
| low | patch | Comments restate the code (quick) | `node-at-path.ts`, `renamed-expressions.ts`, `parameters/types.ts`, `app/src/parameters.spec.ts`, `check-rename-parameter.spec.ts`; "Write a comment only for a why". |
| low | patch | `replaces each span with %s` renders a name its `expect` does not claim (test-reviewer) | "replaces each span with no edit". Renamed. |
| low | rejected | `spliceExpression` orders edits with an equal start by input order, undocumented (test-reviewer) | No caller produces tied spans: a rename's spans are distinct name nodes, and `toSorted` is stable, so input order holds; a tie rule adds a branch for a case no one meets. |
| low | rejected | `refuses %s an invalid name with input-invalid` runs the real store in `commands` (test-reviewer) | 14.8's pass 1 rejected the same finding: every `commands` spec registers the real store, so a command's input wiring is tested where the command lives. |
| low | patch | (counted with the comments row) `usingK` comment in the spec (quick) | Same rule; deleted. |

### Pass 2 (quick, test-reviewer, on the patches; 0 findings dropped): high 0, medium 0, low 6, false 0, maybe-false 0

| Verdict | Route | Finding | Evidence |
|---|---|---|---|
| low | asked | `parameter-in-use` ids [`wall`] for a later duplicate read against the frozen "ids never name the deleted parameter" (quick, test-reviewer) | `check-delete-parameter.spec.ts` `names a later parameter with the same name that reads the first`; Sergii kept the refusal and reworded the line (frozen block); row added to the table. |
| low | patch (notes) | The own-value build decision no longer matched `parameter-users.ts` (quick) | `findIndex` … `index === own`; the note now says the first entry only, with both rejected alternatives. |
| low | patch (notes) | The plan's task line still spelled `Option<{ id: Id; at: number }>` (quick) | Now names `NodeAtPath` in `ids/types.ts`. |
| low | logged | `ids/types.ts:5` comment explains the field `at` rather than a why (quick) | A rename to `pathLength` would remove it; logged, not patched, per the loop rule. |
| low | logged | `rewrites an expression to %s` builds its expected text with `repeat` and its name does not say it asserts the text (test-reviewer) | The padding is arranged data, not production logic; logged. |
| low | logged | (counted above) both lenses on the duplicate row | — |

The review loop ends here: a pass with nothing above low, and the one finding against a frozen line settled by Sergii.

## Design Notes

`Decision (plan):` the splice is `spliceExpression` in `model`, not inside `renameParameter`, because the ticket says "15.2's write-back splices top-level additive literals at 2's offsets the same way"; not in `expr`, because AD-25's model holds the "domain operations over `Mutable<Design>` (`renameParameter`'s rewrite …)", and `expr` stays the parser and evaluator.

`Decision (plan):` users and rewrites are found by the schema walk over the whole design, not by listing `meta.gap`, `parameters` and `layout`, because AD-24's walk is "one function … in one file" and the ticket rewrites "every expression of the design".

`Decision (plan):` rename and delete act on the first parameter with the name, not every one, because Sergii's 14.8 decision has expressions read the first of two with one name, so the first is the one in use (`setParameter` does the same, `set-parameter.ts:5`).

`Decision (plan):` the input fields are `from` and `to`, not `name` and `newName`, because both are names and the pair reads as the move it is; the spine names no fields.

`Decision (plan):` `id-taken` is checked against parameter names only, not node or part ids, because the spine's 14.9 entry says "a rename to a parameter name already present is id-taken".

`Decision (plan):` a rename of a missing name to itself is `unknown-target`, not `ok`, because the ticket's "A rename or delete of a name the design lacks is unknown-target" names any rename, and "a rename to its own name" presumes the parameter exists.

`Decision (plan):` `expression-too-long` is found by parsing each rewritten text with `parseExpressionTree`, not by comparing with a copy of `MAX_LENGTH`, because the frozen block forbids changing `expr` (where the limit is private) and a copy would drift; the only other way a rewrite could fail to parse is ruled out, since a name passing `parameterNameSchema` is a grammar name (14.8's `ключ` row) and a name node's span covers only the name.

`Decision (plan):` `unknown-target` is checked before `id-taken`, not after, because the ticket's "A rename or delete of a name the design lacks is unknown-target" holds whatever the target name is.

`Decision (plan):` `spliceExpression` throws `InvariantError` on overlapping or out-of-range spans, not a `Result`, because every caller takes its spans from the expression's own tree, so a bad span is a defect, not a design problem ("Design problems never throw"); touching spans are accepted, not refused, because they replace disjoint text.

`Decision (plan):` `nodePaths` is built once per caller and `nodeAtPath` reads it, not one function that rebuilds the map per lookup, because `evaluateExpressions` looks up every quantity field on every evaluation; it returns `Option`, as `addedLoop` does (`check-structure.ts`), not `undefined`.

`Decision (plan):` `RenameParameter` and `DeleteParameter` are `(service)`, classes registered in `di`, not plain functions, because AD-2 defines every command "as a class registered in `di`".

`Decision (plan):` `available` runs the checks, not `apply`, because each refusal reads only the design and the input, as `DeleteNode.available` does (`layout/delete-node.ts:15-17`).

## Conformance Log

Pass 1 (readers A, B; 0 findings dropped):
- `Test a rule where it is defined` (message texts with no row) -- fixed
- `add empty input and an input that breaks an assumption` (splice overlap and past end; unparseable text; path outside the layout; duplicate names) -- fixed
- frozen `Each rewritten expression parses` with no row -- fixed
- `When nothing says what a boundary returns, ask` (rename onto an unresolved name; the loop it can create) -- asked: Sergii accepts it; loop row added
- `Start recording after arrange` / `Arrange only what the test uses` (glue rows' arrange and effect) -- fixed
- `leave the implementer to choose` (`nodeAtPath` signature, `SpliceEdit` type, `spliceExpression`'s entry) -- fixed
- `When nothing says what a boundary returns, ask` (missing name renamed to itself; check order) -- fixed (decision citing the ticket)
- precedent `packages/commands/src/parameters/parameters-commands.spec.ts` `refuses a name that is %s` (`Test a rule where it is defined`) -- deferred; plan keeps one row per field
- precedent `app/src/parameters.spec.ts` `await runCorneyScript(store)` (`Arrange only what the test uses`) -- deferred; plan's rows arrange `aDesign`
- `Give every decision its rejected alternative` (self-reference) -- fixed
- Naming `Glossary terms only.` (`splice`, `user`) -- no change: the spine uses both ("splice the expression text at those offsets", line 571; "every user in design order", Data Schema)
- `Make a test's name and its expects claim the same thing` (`delete leaves the design consistent`) -- fixed
- saved work (delete and rename rows) -- no change: each is one undoable command as every removing command is, and the version switch restores saved versions (spine AD-1)

Gap review (0 findings dropped):
- gap: `splice-expression.ts`, `rename-in-expression.ts`, `node-at-path.ts` assumption rows -- fixed
- gap: duplicate-name rows (`set-parameter.ts:5` first-match) -- fixed
- gap: loaded-file states (unresolved name, `a = a`, part input) -- asked: Sergii allows them as for 14.8

Final pass (one reader; 0 findings dropped; these fixes no reviewer has read):
- `Give every threshold three rows` (a rename past `expr`'s 512-character limit throws in the store) -- asked: Sergii added `expression-too-long`; rows at 511, 512, 513
- `Give every threshold three rows` (splice on the end, touching, insertion, reversed) -- fixed
- `Take expected values from the requirement` (users order with a parameter and a part together) -- fixed
- `A choice no requirement made is a decision` (check order; splice throw; `nodePaths` once; `Option`) -- fixed
- `nodeAtPath` row without `at`; group-owned path -- fixed
- `Test wiring between packages as integration in pipeline or app` (store rows in `commands`) -- fixed: loop row to `checkStructure` in `model`, undo and no-op rows to `app`
- `Give every decision its rejected alternative` (first match; rewrite parses; service tag) -- fixed
- self-reference delete as a judgement -- asked: Sergii, its own value is not a use
- precedent `set-parameter.ts:3` comment restating code -- fixed (Code Map says don't copy)

## Verification

**Commands:**
- `pnpm vitest run --project @keeb-cad/model --project @keeb-cad/commands --project @keeb-cad/schema` -- expected: green.
- `pnpm typecheck && pnpm check:fast` -- expected: clean.
- `pnpm test` -- expected: the whole suite green.
- Toggled bug for the `integration, app` rows: drop each command from `parametersCommandsModule`, watch its row go red, restore.
- No Stryker run: no priority package changes.

**Manual checks (if no CLI):**
- Nothing visible changes: no editor field or tab runs these commands yet (14.5, the Parameters tab), so the app looks the same.

## Boundary Table

| Group | Row | Input | Expected | Level |
|---|---|---|---|---|
| Production bugs | rename keeps spacing and parentheses | `( ks +2mm )*2`, `ks` → `key` | `( key +2mm )*2` | unit, model |
| Production bugs | rewritten text passes the schema | `2*ks+1mm`, `ks` → `ключ` | `2*ключ+1mm`, accepted by `expressionSchema` | unit, model |
| Production bugs | rename leaves containing names | `ksx + ks`, `ks` → `key` | `ksx + key` | unit, model |
| Production bugs | rename rewrites every use | `ks * ks - ks`, `ks` → `k` (shorter) | `k * k - k` | unit, model |
| Production bugs | rename to a longer name | `ks/2`, `ks` → `key_size` | `key_size/2` | unit, model |
| Production bugs | rename rewrites every section | `gap.x` = `ks`, parameter `b` = `ks + 1mm`, slot `k` offset x = `ks`; `ks` → `key` | each reads `key`, `ks` renamed in place in the list | unit, model |
| Production bugs | rename rewrites a part's input | loaded part `p` with an input `ks * 2`; `ks` → `key` | `key * 2` | unit, model |
| Production bugs | one undo restores every rewrite | same design through the store; rename, then undo | design equals the arranged one | integration, app |
| Production bugs | rename leaves an expression without the name | `wall + 1mm`, `ks` → `key` | `wall + 1mm` | unit, model |
| Rules | rename to a taken name | `ks`, `wall`; `ks` → `wall` | `id-taken`, ids [`wall`] | unit, model |
| Rules | rename to an invalid name | `ks` → `k-s` | `input-invalid` at `to` | unit, commands |
| Rules | rename from an invalid name | `k-s` → `key` | `input-invalid` at `from` | unit, commands |
| Rules | delete an invalid name | `k-s` | `input-invalid` at `name` | unit, commands |
| Rules | rename a missing name | no `ks`; `ks` → `key` | `unknown-target`, ids [`ks`] | unit, model |
| Rules | rename a missing name to itself | no `ks`; `ks` → `ks` | `unknown-target`, ids [`ks`] | unit, model |
| Rules | rename to its own name | `ks` → `ks` through the store | `ok`; design unchanged; nothing to undo | integration, app |
| Rules | delete an unused parameter | `a`, `ks`, `b`; delete `ks` | `[a, b]` | unit, model |
| Rules | delete a missing name | no `ks`; delete `ks` | `unknown-target`, ids [`ks`] | unit, model |
| Rules | delete a used parameter | `gap.x` = `ks`, `b` = `ks`, slot `k` offset x = `ks`, slot `j` offset y = `ks * 2` | `parameter-in-use`, ids [design id, `b`, `k`, `j`] | unit, model |
| Rules | delete used by a part | loaded part `p` with an input `ks`, slot `k` offset x = `ks` | `parameter-in-use`, ids [`p`, `k`] | unit, model |
| Rules | later duplicate is a user | loaded `[wall 1mm, wall = wall * 2]`; delete `wall` | `parameter-in-use`, ids [`wall`] | unit, model |
| Rules | delete used by one node | slot `k` offset x = `ks`, offset y = `ks` | `parameter-in-use`, ids [`k`] (once) | unit, model |
| Rules | delete a self-referencing parameter | loaded `a` = `a + 1mm`, no other user | `[]` | unit, model |
| Rules | self-use left out of the users | loaded `a` = `a + 1mm`, `b` = `a`; delete `a` | `parameter-in-use`, ids [`b`] | unit, model |
| Rules | users in design order | `gap.x`, parameter `b`, loaded part `p` input, slot `k` offset each use `ks` | `parameter-in-use`, ids [design id, `b`, `p`, `k`] | unit, model |
| Rules | missing name onto a taken one | no `ks`, `wall`; `ks` → `wall` | `unknown-target`, ids [`ks`] | unit, model |
| Rules | rewrite just below the length limit | an expression of 509 characters using `k` once; `k` → `kkk` | accepted, 511 characters | unit, model |
| Rules | rewrite on the length limit | 510 characters; `k` → `kkk` | accepted, 512 characters | unit, model |
| Rules | rewrite just above the length limit | 511 characters; `k` → `kkk` | `expression-too-long`, ids [that item] | unit, model |
| Rules | several items too long | `gap.x` and slot `j` each 511 characters using `k`; `k` → `kkk` | `expression-too-long`, ids [design id, `j`] | unit, model |
| Rules | delete commits as one undo step | delete unused `ks` through the store | committed; undo restores `ks` at its place | integration, app |
| Module boundaries | rename onto an unresolved name | loaded `gap.x` = `key` (no parameter `key`), `ks`; `ks` → `key` | accepted; `gap.x` unchanged | unit, model |
| Module boundaries | rename creates a loop | `checkStructure(before, after)`: before loaded `ks` = `key + 1mm`, no `key`; after its rename to `key` | `dependency-cycle`, ids [`key`] | unit, model |
| Module boundaries | rename with a duplicate name | loaded `[wall 1mm, wall 5mm]`; `wall` → `w` | `[w 1mm, wall 5mm]` | unit, model |
| Module boundaries | delete with a duplicate name | loaded `[wall 1mm, wall 5mm]`, no user; delete `wall` | `[wall 5mm]` | unit, model |
| Module boundaries | rename of a self-reference | loaded `a` = `a + 1mm`; `a` → `b` | `b` = `b + 1mm` | unit, model |
| Module boundaries | splice edits out of order | `a+b`, edits for `b` then `a` | both replaced | unit, model |
| Module boundaries | splice with no edit | `a+b`, no edits | `a+b` | unit, model |
| Module boundaries | splice with overlapping edits | `abc`, spans 0-2 and 1-3 | throws `InvariantError` | unit, model |
| Module boundaries | splice past the end | `ab`, span 1-3 | throws `InvariantError` | unit, model |
| Module boundaries | splice on the end | `ab`, span 1-2 to `c` | `ac` | unit, model |
| Module boundaries | splice with touching edits | `abc`, 0-1 to `x`, 1-2 to `y` | `xyc` | unit, model |
| Module boundaries | splice inserting | `ab`, span 1-1 to `+` | `a+b` | unit, model |
| Module boundaries | splice with a reversed span | `ab`, span 2-1 | throws `InvariantError` | unit, model |
| Module boundaries | rename in a text that does not parse | `1mm +`, `ks` → `key` | throws `InvariantError` | unit, model |
| Module boundaries | node at path | `['layout', 'children', 0, 'children', 1, 'offset', 'position', 'x']`, a slot `k` second in group `g` | `some({ id: 'k', at: 5 })` | unit, model |
| Module boundaries | path on a group's own field | `['layout', 'children', 0, 'offset', 'position', 'x']`, group `g` | `some({ id: 'g', at: 3 })` | unit, model |
| Module boundaries | path outside the layout | `['meta', 'gap', 'x']` | `none` | unit, model |
| Module boundaries | unknown-parameter message | `x` | `The design has no parameter named "x".` | unit, model |
| Module boundaries | parameter-taken message | `x` | `The design already has a parameter named "x".` | unit, model |
| Module boundaries | parameter-in-use message | `x`; users `a` | `The parameter "x" is used by "a".` | unit, model |
| Module boundaries | expression-too-long message | `x` → `y`; items `a`, `b` | `Renaming "x" to "y" makes the expression of "a", "b" too long.` | unit, model |
| Module boundaries | parameter-in-use message, several users | `x`; users `a`, `b` | `The parameter "x" is used by "a", "b".` | unit, model |
| Glue | renameParameter registered | `wall` = `1mm`; `runById('parameters.renameParameter', { from: 'wall', to: 'w' })` | committed; `parameters` = [`w` = `1mm`] | integration, app |
| Glue | deleteParameter registered | `wall` = `1mm`; `runById('parameters.deleteParameter', { name: 'wall' })` | committed; `parameters` = [] | integration, app |
