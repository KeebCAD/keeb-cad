---
title: 'Expressions parse and evaluate with units'
type: 'feature'
ticket: '2'
created: '2026-11-17'
status: 'done'
baseline_revision: 'de04f877a1e5043cf23b10e20b7970de392a45e9'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: [quick, test-reviewer]
review_loop_iteration: 1
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `expr` holds only a regex for one literal (`packages/expr/src/parse-expression.ts:5`). 14.8 needs AD-17's full grammar and `evaluate(expression, scope)` with unit checks, and 14.9 and 15.2 need a tree whose nodes carry source offsets so they can splice text in place.

**Approach:** Write AD-17's grammar as a peggy file in `expr` and commit the parser peggy generates from it, with a Node spec that fails when that parser is stale. A typed wrapper returns the Data Schema's `ExpressionTree` or `ExpressionSyntaxError`, and an evaluator over the tree returns `Value` or `EvaluateError`. `parseExpression` is rebuilt on the wrapper and keeps today's contract.

## Boundaries & Constraints

**Always:**
- Types are the Data Schema's, unchanged (spine Data Schema, 2026-11-17): `Span`, `ExpressionTree`, `ExpressionSyntaxError`, `Value`, `EvaluateError`. `ParseError` stays `{ kind: 'expression-parse-failed'; input }`.
- Grammar (AD-17, the ticket): a number is digits, optionally `.` and digits, immediately followed by an optional `mm` or `deg` that no letter (`\p{L}`), digit or `_` follows. A name is a letter, then letters, digits or `_`; a letter is any Unicode letter (`\p{L}`), a digit is `0-9`. Operators are `+ - * /`, plus unary minus (at any operand position, and nesting: `2 * -3`, `--19mm`) and parentheses, with whitespace (space or tab, nothing else) allowed between tokens; a newline is a syntax error at its offset. `*` and `/` bind tighter than `+` and `-`, all left-associative, and unary minus binds tighter than both. `mm` and `deg` alone parse as names.
- Spans are UTF-16 offsets, end exclusive. A parenthesised node's span excludes its parentheses. A binary node's span runs from its left operand's first character to its right operand's last, parentheses around either included; a negate's span runs from its minus to its operand's last character, parentheses included.
- `ExpressionSyntaxError.offset` is the position of the first character the parser cannot accept, or the input's length when the input ends too early. An input with no token (empty or whitespace only) fails at 0, as the ticket says.
- Evaluation is depth-first and left to right, and the first failure is returned. `+` and `-` need equal units (two unitless operands are equal). In `*`, at most one operand may have a unit, and the result keeps it. `/` with a divisor that has a unit is `unit-mismatch`, whatever the divisor's value. A unitless divisor equal to 0 (or -0) is `division-by-zero`. Each failure carries the failing node's span.
- `parseExpression(input)` returns `Ok({ value, unit })` only when the tree is a number with a unit spanning the whole input, or a negate spanning the whole input whose operand starts one character after it (a number with a unit). Anything else returns `Err({ kind: 'expression-parse-failed', input })`.

- Decision (Sergii 2026-11-17): a name's letters are any Unicode letter (`\p{L}`), not ASCII only. The spine's `ParameterName` says the same (03021b6), so 14.8 can create every name the grammar parses. peggy 5.1.1 accepts `[\p{L}]u` (scratch run: `ширина` parses, spans 0..6; `a𝒳b` spans 0..4 in UTF-16).
- Decision (Sergii 2026-11-17): whitespace between tokens is space and tab only, not also CR and LF, because the expression field is a single-line input whose value the HTML spec strips of CR and LF, so a newline can only come from a hand-edited file.
- Decision (Sergii 2026-11-17): a number literal a double cannot hold is refused by the grammar, as `expression-syntax-error` at the number's first character, not kept in the tree as `Infinity`, so no tree holds a non-finite value and 14.8 needs no check for one.
- Decision (Sergii 2026-11-17, review loop 1): an expression longer than 512 characters (UTF-16 units) is refused as `expression-syntax-error` at offset 512 (raised from 256 the same day, because 256 refused the existing 310- and 311-character largest-double tests and made the grammar's overflow refusal unreachable), not parsed, not a nesting-depth limit and not left to throw, because 3,000 nested `(` throw `RangeError` from the parser and a 5,000-term chain throws from `evaluate` (scratch runs), and the spine says "Design problems never throw"; 512 characters keeps both depths far inside Node's stack, which overflows only at 1,837 nesting levels (about 3,675 characters; browser stacks not measured).

**Never:**
- No schema, model, blueprint, command or design-section change; `schema` re-exports nothing new (14.8 does).
- No hand-edit of the generated parser; no Vite plugin; no build step before tests.
- No change to an existing `parse-expression.spec.ts` test (new rows may be added).

</frozen-after-approval>

## Code Map

- `packages/expr/src/parse-expression.ts:5-14` -- the regex stub; rebuilt (function) on `parseExpressionTree`. Callers stay untouched: `packages/schema/src/expression.ts`, `quantity.ts`, `declared-input.ts`, `packages/model/src/placement/literal-value.ts`, `packages/blueprint/src/lane/check-nested-inputs.ts`.
- `packages/expr/src/parse-expression.spec.ts` -- existing literal tests, unchanged; their refusals compare the whole `{ kind, input }` (line 46).
- `packages/expr/src/types.ts` -- `Unit`, `ParseError`; the five new types join here.
- `packages/expr/src/index.ts` -- re-exports only; gains `parseExpressionTree`, `evaluate` and the new types.
- `packages/result/src/result.ts:19` -- `Result.fromThrowing(fn, mapErr)` wraps the generated `parse`, which throws its `SyntaxError` (peggy 5.1.1's generated `class peg$SyntaxError extends SyntaxError`, checked in a scratch generation).
- `packages/library/tsconfig.node.json`, `packages/blueprint/tsconfig.node.json`, `packages/messaging/tsconfig.node.json` -- the precedent for a Node-only tsconfig: `"extends": "@tsconfig/node26/tsconfig.json"`, `module: preserve`, `moduleResolution: bundler`, `types: ["node"]`, `noEmit: true`, `tsBuildInfoFile: ./node_modules/.tmp/tsconfig.node.tsbuildinfo`; library lists `@tsconfig/node26: catalog:` in its devDependencies.
- Root `vitest.config.ts` -- expr is a configless project, so every `*.spec.ts` under `packages/expr` runs under `pnpm test`, the drift spec included; its types project covers only `src/**/*.spec.ts`, so the drift spec is type-checked by `vue-tsc --build` through the new `tsconfig.node.json`.
- `eslint.config.ts:17` (`IGNORED`) and `.prettierignore` -- kept in step; the generated files join both.
- `.dependency-cruiser.mts:26` -- `expr: ['result']`; npm imports are not fenced for expr (`di`, a kernel, already imports `ts-pattern`: `packages/di/package.json:11`).
- peggy 5.1.1 CLI (scratch run): `peggy --format es --dts -o <out>.js <grammar>` writes an ES module that imports nothing, plus a `.d.ts` whose `parse` returns `any`. `peggy.generate(source, { output: 'source', format: 'es', grammarSource })` returns the CLI's file byte for byte when `grammarSource` is the path the CLI was given (scratch comparison: `equal true 12526 12526`). Scratch grammar run (the Always grammar): failures land at `(2 * (gap +)` 11, `2 +` 3, `` 0, `19 mm` 3, `2degree`/`2gap`/`2mm3`/`2mm_x`/`2٣` 1, `2mm +\ngap` 5. A whitespace-only input lands at its length (`   ` 3), so the grammar places it at 0 (Design Notes). A non-finite number needs peggy's `error(message, location())` in the number's action: it then lands at the number's start (`9`×309`mm` 0, `1mm + 9`×309`mm` 6).

## Tasks & Acceptance

**Execution:**
- [x] `packages/expr/package.json` -- add `peggy: catalog:` (with `peggy: 5.1.1`, exact as the Stack row, added to `pnpm-workspace.yaml`'s catalog, as `dexie` and `quickjs-wasi` are for their one package), `@types/node: catalog:`, `@tsconfig/node26: catalog:` devDependencies and `ts-pattern: catalog:` dependency; add the script `"generate:parser": "peggy --format es --dts -o src/expression-parser.js src/expression-parser.peggy"`.
- [x] `packages/expr/src/expression-parser.peggy` -- the grammar per Always; actions build `ExpressionTree` nodes with spans from `location()`; a number literal whose value is not finite fails at its first character; an input of only space and tab fails at 0 (its own start alternative calling `error()` at offset 0).
- [x] `packages/expr/src/expression-parser.js`, `expression-parser.d.ts` -- generated by `pnpm --filter @keeb-cad/expr generate:parser`, committed, never edited.
- [x] `packages/expr/src/parse-expression-tree.ts` -- `parseExpressionTree(input): Result<ExpressionTree, ExpressionSyntaxError>` (function); the one cast of the generated `parse`'s `any`; maps only the parser's `SyntaxError` (rethrows anything else).
- [x] `packages/expr/src/evaluate.ts` -- `evaluate(expression: string, scope: ReadonlyMap<string, Value>): Result<Value, ExpressionSyntaxError | EvaluateError>` (function); a `ts-pattern` `match` on node `type`.
- [x] `packages/expr/src/parse-expression.ts` -- rebuilt on `parseExpressionTree` per Always.
- [x] `packages/expr/src/types.ts`, `index.ts` -- the five Data Schema types; re-exports.
- [x] `packages/expr/generated-parser/expression-parser.spec.ts` -- the drift spec: read the grammar and the committed parser with `node:fs`, both paths resolved from `import.meta.url` (the suite runs from the repo root), `peggy.generate(..., { output: 'source', format: 'es', grammarSource: 'src/expression-parser.peggy' })`, `expect(generated).toBe(committed)`.
- [x] `packages/expr/tsconfig.node.json` -- as the precedent above, `include: ["generated-parser/**/*"]`; `packages/expr/tsconfig.json` -- reference it.
- [x] `eslint.config.ts`, `.prettierignore` -- ignore `packages/expr/src/expression-parser.js` and `.d.ts`, with the comment "generated by peggy; the drift spec checks the parser".
- [x] `packages/expr/src/parse-expression-tree.spec.ts`, `evaluate.spec.ts` -- the boundary table's unit rows; `parse-expression.spec.ts` gains the new literal rows only, including a whole-value row for `9`×308 `mm` (`{ value: 1e308, unit: 'mm' }`), since its existing nines test asserts only finiteness.
- [x] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- one entry (`source_plan` this plan): evaluation overflow to a non-finite `Value` is unchecked; 14.8 decides.

**Acceptance Criteria:**
- Given the committed parser, when one character of it is changed, then the drift spec fails, and it passes again once the change is undone (a toggled bug, recorded in Implementation Notes and said in the PR).
- Given the grammar edited and `generate:parser` not re-run, when `pnpm test` runs, then the drift spec fails.
- Given every caller of `parseExpression`, when `pnpm test` runs, then their existing tests pass unchanged.

## Design Notes

`Decision (plan):` the scope is `ReadonlyMap<string, Value>`, not `Record<string, Value>`, because a Record lookup of a name such as `constructor` finds `Object.prototype`'s member (`node -e "const s={}; console.log(typeof s['constructor'])"` prints `function`).

`Decision (plan):` `evaluate` takes the expression string and parses it, not a tree, because AD-17 names it `evaluate(expression, scope)` and the glossary's **expression** is the written text.

`Decision (plan):` the generated `.d.ts` comes from peggy's `--dts`, not a hand-written declaration and not `allowJs` in `tsconfig.lib.json`. peggy 5.1.1's help lists `--dts  Create a .d.ts to describe the generated parser.`, so a hand-written file would build by hand what peggy's CLI already produces. `allowJs` would type the import as `any` all the same, and would change a tsconfig. The drift spec checks only the `.js`, because peggy's API has no `.d.ts` output; the `.d.ts` depends only on the start rule, which this story fixes.

`Decision (plan):` the drift spec lives in `packages/expr/generated-parser/` (named for the concept it guards, AD-25 "folders are by concept, not by kind"; not `generate/`, a process) under its own `tsconfig.node.json`, not in `src/`, because `tsconfig.lib.json` keeps `types: []` ("expressions parse on every thread") and Node types belong only to Node code, as in `packages/library/tsconfig.node.json`. Its tsconfig extends `@tsconfig/node26`, not `tsconfig.base.json`, because all three Node tsconfigs in the Code Map do.

`Decision (plan):` a name's digits are `0-9`, not every Unicode digit (`\p{Nd}`), because a number's digits are `0-9` (`\d` in the stub's non-`u` regex, `packages/expr/src/parse-expression.ts:5`) and a digit means one thing in one grammar.

`Decision (plan):` unit check before the zero check in `/`, not the zero check first, because the ticket says "unit x unit and unit / unit are unit-mismatch" with no exception for a zero divisor.

`Decision (plan):` the first failure, left to right, not every failure, because `EvaluateError` (Data Schema) is a single value.

`Decision (plan):` no check on a non-finite evaluation result (`9…9mm * 10` gives `Infinity`), not a new `EvaluateError`, because the Data Schema's `EvaluateError` has only `unit-mismatch`, `division-by-zero` and `unresolvable-reference`, and a new kind is decided in the spine first (`AGENTS.md`: "Add or change ... shared kind only after the spine's Data Schema section defines it"). Logged to `deferred-work.md` for 14.8.

`Decision (plan):` `parseExpressionTree` checks the 512-character cap before calling `parse`, not the grammar, because the `RangeError` comes from the parser's recursion and a check before `parse` never enters it; `evaluate` and `parseExpression` inherit the cap through `parseExpressionTree`.

`Decision (plan):` the grammar places a whitespace-only input at offset 0, not the wrapper, because the grammar is the one place that defines whitespace (space and tab); a wrapper check would define the set a second time. A whitespace tail after an operator (`2 +   `) still ends too early and lands at the input's length.

`Decision (plan):` the five `expr` types ship no test builder, not a builder in an `expr/testing` subpath, because `AGENTS.md`'s builder rule covers schema values ("Build schema values the test doesn't read with the concept's test builder (`schema/testing` ...)"), these types have no schema, and every row writes out the whole tree or value it is about.

`Decision (plan):` unary minus at any operand position and nesting, not only at an expression's start, because AD-17 says "Standard precedence, unary minus" and the ticket's `parseExpression` refusals include `-mm`, a negate the grammar must parse before the literal check refuses it.

`Decision (plan):` `evaluate` branches with `ts-pattern`'s `match(...).exhaustive()`, not a `switch`, because the spine names an exhaustive ts-pattern match as the repo's branch on a kind (Data Schema, `rejectionText`: "an exhaustive ts-pattern match") and `ts-pattern` is already a catalog dependency (`pnpm-workspace.yaml`, `ts-pattern: ^5.9.0`).

`Decision (plan):` `parseExpressionTree` maps only the parser's `SyntaxError` and rethrows anything else, not every throw to `ExpressionSyntaxError`, because any other throw is a bug in the grammar's actions, and the spine's "Design problems never throw" makes a throw a defect, never a refusal.

`Decision (plan):` the generated `.d.ts` keeps the types peggy writes, not a copy in `types.ts`, because `generate:parser` rewrites the file on every run (`peggy -o` overwrites) and the frozen Never forbids hand edits; it is the one file in `src/` that `AGENTS.md`'s types-in-`types.ts` rule does not reach, as the lint ignore records.

## Conformance Log

Pass 1 (readers A, B; 0 findings dropped):
- `A choice no requirement made is a decision and is labelled as one.` (overflow note) -- fixed
- same rule (ts-pattern dependency) -- fixed
- `Put every type a folder declares ... in that folder's types.ts` (generated `.d.ts`) -- fixed
- `Take expected values from the requirement ...` (`2degree`, `2gap` offsets) -- fixed
- precedent `packages/library/tsconfig.node.json` `"extends": "@tsconfig/node26/tsconfig.json",` (base unnamed) -- fixed
- precedent `parse-expression.spec.ts` `expect(Number.isFinite(value)).toBe(true)` (weak assertion copied) -- fixed
- frozen negate-span sentence against its own row -- fixed
- `A choice no requirement made ...` (unary minus position) -- fixed
- `"X, not Y, because Z."` (Sergii's decision lines) -- kept: his calls, recorded as given
- `Prove a test ... with a toggled bug ... and say so in the PR.` -- fixed
- `Give every threshold three rows: just below, on, just above` (largest double; unit terminator members) -- fixed
- AD-25 `folders are by concept, not by kind` (`generate/`) -- fixed
- implementation risk: non-finite number offset needs `error()`; drift spec paths from `import.meta.url` -- fixed
- gap: `packages/expr/src/parse-expression-tree.spec.ts` on row for the largest double -- fixed
- gap: unit terminator digit and `_` -- fixed
- gap: CR and no-break space -- fixed
- gap: non-ASCII digit in a name -- fixed
- gap: parentheses at a binary operand edge -- fixed
- gap: failing node below the root -- fixed
- gap: operator members (`-` mismatch, unitless left, `5mm * 2`, `2 * 3`, `6 / 3`) -- fixed
- gap: rethrow decision unlabelled -- fixed
- gap: generated `.d.ts` exemption -- fixed
- gap: `ParameterName` reach for `\p{L}` names (14.8) -- asked: Sergii added it to the spine (03021b6)

Final pass (one reader; 0 findings dropped):
- `A choice no requirement made is a decision and is labelled as one.` (whitespace-only offset placement; `2 +   `) -- fixed
- `Give every test an expect that fails when the behaviour breaks.` (precedent nines test) -- fixed (new whole-value row; the frozen test stays)
- `Give every threshold three rows: just below, on, just above` (rows far from the limit) -- fixed
- `add empty input and an input that breaks an assumption.` (`_a`) -- fixed
- `pnpm-workspace.yaml` catalog precedent (`peggy` literal) -- fixed
- `a new schema concept ships its builder in the same PR` -- fixed (decision: not a schema concept)

## Implementation Notes

- Toggled bug (drift spec): renamed the first `peg$c0` in the committed `expression-parser.js` to `peg$cX`; `generated-parser/expression-parser.spec.ts` went red, and green again once restored. Stale grammar: changed the `_` rule to `[ \t\n]*` without re-running `generate:parser`; the drift spec went red, green once restored.
- `peggy.generate(..., { grammarSource: 'src/expression-parser.peggy' })` matches the CLI output byte for byte; `generate:parser` re-run leaves both generated files unchanged (same sha1).
- `ts-pattern` also branches `combine`'s operator in `evaluate.ts`, not only the node type, so each branch is one `.with` and `exhaustive()` covers the four operators.
- Specs compare whole `Result`s with `expectResult` from `@keeb-cad/result/testing`, the repo's existing helper.
- Syntax-error rows live in `parse-expression-tree.spec.ts`, where the grammar is wrapped; `evaluate.spec.ts` keeps one row (`(2 * (gap +)`) for evaluate passing the syntax error through.
- `19` and `-mm` from the boundary table's refusal row were already rows of `parse-expression.spec.ts` (`no unit`, `a minus with no digits`), so only `wall + gap`, `(19mm)`, `- 19mm` and `--19mm` were added.

- Real-host run: no spec in the diff fakes a third-party host or boundary; the drift spec runs real peggy 5.1.1, and `pnpm --filter @keeb-cad/expr generate:parser` regenerated a byte-identical `expression-parser.js` (`cmp` silent).
- Structural changes (package.json dependencies, `pnpm-workspace.yaml`, `tsconfig.node.json`, `eslint.config.ts`, `.prettierignore`) are all named in the plan's tasks; none unplanned.
- Decision (build): the two grammar `error()` messages name what was expected ("Expected a number or a name", "Expected a number a double can hold"), not peggy's generated expectation list, because the wrapper reads only `cause.location.start.offset` (`packages/expr/src/parse-expression-tree.ts:11`), so the message never reaches a caller.
- Verification: `pnpm vitest run --project @keeb-cad/expr` 89 passed; `pnpm typecheck`, `pnpm check:fast` clean; `pnpm test` 762 files, 5852 tests passed, no type errors.

- Loopback 1 build: applied `stash@{0}`; `MAX_LENGTH = 512` in `parse-expression-tree.ts` (refused before `parse`); `literalOf` on a `ts-pattern` `match` with the whole-input span check inside the patterns (an `if` before it trips `unicorn/prefer-ternary`); the pass-1 test rows added; the refusal test renamed `refuses %s at the expected offset`.
- Decision (build): the cap rows pad `'1 + 1'` with spaces, not a `1 + 1 + …` chain, so each row asserts the whole tree and only the padding moves the length; the 5,000-term chain row covers the chain.
- Decision (build): a decimal literal below the smallest double reads as `0` (`Number('0.' + '0'.repeat(330) + '1')` is `0`), not refused, because no requirement names it and review pass 1 rejected the guard as complexity for input no one types (Review Triage Log).
- Verification (loopback 1): `pnpm vitest run --project @keeb-cad/expr` 106 passed; `pnpm typecheck`, `pnpm check:fast` clean. The implementer's first `pnpm test` reported 2 failed tests in 2 files that its truncated output did not name; its rerun and mine (seed `1794899348914`, full log kept) both passed 762 files, 5,871 tests, no type errors. The two failures are unidentified: not reproduced, not shown to be flaky.

- Verification (after pass-2 patches): expr 106 passed; `pnpm typecheck`, `pnpm check:fast` clean; `pnpm test` (seed `1794899802523`) 762 files, 5,871 tests passed, no type errors.

## Plan Change Log

- Loopback 1 (2026-11-17). Trigger: review found `RangeError` thrown out of `parseExpression`, `parseExpressionTree` and `evaluate` on deep nesting or long chains (Review Triage Log, pass 1). Amended: Sergii's 256-character cap (frozen block), the cap decision (Design Notes), six cap rows (Boundary Table). Known-bad state avoided: a design file whose expression throws during schema validation. Amended again the same day: Sergii raised the cap to 512, because 256 broke the frozen existing tests (implementer stopped with 9 failing). KEEP: start from `git stash apply stash@{0}` ("14.2 attempt 1 (before depth limit)"), which passed every other row and the whole suite; keep its grammar, drift spec, tsconfig, catalog and ignore changes as they are. Also apply the pass-1 patch rows: `literalOf` in `parse-expression.ts` branches with `ts-pattern` `match`; drop its comment that restates the checks; add tree rows for `2 * -3`, `--19mm` and `8 / 4 / 2` (left grouping) in `parse-expression-tree.spec.ts`; add accepting tree rows there for `key_2`, `ширина`, a tab, `a-b` and `(2mm)`; rename `refuses %s at its first unreadable character` to a name that matches every row (for example, `refuses %s at the expected offset`), or split it by rule.

## Review Triage Log

### Pass 1 (quick, test-reviewer; 0 findings dropped): high 0, medium 1, low 7, false 0, maybe-false 0

| Verdict | Route | Finding | Evidence |
|---|---|---|---|
| medium | intent_gap | Deep nesting or a long chain throws `RangeError` out of `parseExpression`, `parseExpressionTree` and `evaluate` (quick) | Scratch run: `parseExpression('('×3000 + '1mm' + ')'×3000)` throws `RangeError`; `evaluate` of 5000 `1 + …` terms throws `RangeError` (1000 terms is fine). `schema/src/expression.ts` calls `parseExpression` inside `v.check`, so a design file holding such a string throws instead of being refused. No limit is in the plan, and a limit needs a number: asked Sergii. |
| low | rejected | A decimal literal below the smallest double (`0.` + 330 zeros + `1`) reads as `0` (quick) | Real (scratch parse gives `value: 0`), but no one types that in a field, and refusing it adds a branch; listed among the build's decisions instead. |
| low | patch (KEEP) | `literalOf` branches on `tree.type` with `if`s, not `ts-pattern` (quick) | `parse-expression.ts:11-19`; the plan's decision names ts-pattern as the branch on a kind. |
| low | patch (KEEP) | No accepting rows for `2 * -3` or `--19mm` as trees (quick) | Neither spec parses either; the `--19mm` refusal in `parse-expression.spec.ts` would also pass if nested negation were a syntax error. |
| low | patch (KEEP) | No row shows `*` and `/` grouping from the left (quick) | Scratch parse of `8 / 4 / 2` groups left today, but no test would fail if `Product` grouped right. |
| low | patch (KEEP) | `parse-expression.ts:9-10` comment restates the checks below it (quick) | `AGENTS.md`: "Write a comment only for a why the code can't say". |
| low | rejected | Implementation Notes say each operator is one `.with` (quick) | The fix edits this build's plan. |
| low | patch (KEEP) | `refuses %s at its first unreadable character` names a claim several rows don't make (test-reviewer) | Rows at the input's length, at 0 for no token, and at a too-large number's start are not "unreadable characters". |
| low | patch (KEEP) | Lexical accepting rows (`key_2`, `ширина`, tab, `a-b`, `(2mm)`) are tested only through `evaluate` (test-reviewer) | `AGENTS.md` "Test a rule where it is defined": the grammar is wrapped in `parseExpressionTree`, whose spec has only the refusing side. |

Loopback 1 (intent_gap): code stashed as `git stash` "14.2 attempt 1 (before depth limit)", reverted to the baseline; KEEP: everything in the stash except what the depth limit changes, plus the patch-routed rows above.

### Pass 2 (quick, test-reviewer; 0 findings dropped): high 0, medium 0, low 4, false 0, maybe-false 1

| Verdict | Route | Finding | Evidence |
|---|---|---|---|
| low | rejected | The 512-character cap makes `parseExpression` refuse a literal longer than 512 characters that the stub accepted, against the ticket's "every string that parsed still parses" (quick) | Real (`'1.' + '0'.repeat(600) + 'mm'` was `Ok`, is now refused), but no design file holds a 600-character literal: the app writes literals from doubles, at most ~25 characters. The fix edits this build's plan (Sergii's frozen cap), so it is named at the look halt for Sergii and Sofia, not patched. |
| low | patch | `parse-expression-tree.ts` cap comment says "far inside any stack"; only Node's was measured (quick) | The frozen decision says "browser stacks not measured". |
| low | patch | `expression-parser.peggy` comment reads as if `evaluate` never yields a non-finite value (quick) | `9…9mm * 10` evaluates to `Infinity` (deferred-work entry for 14.8); the comment holds only for literals. |
| maybe-false | rejected | The implementer's first `pnpm test` had 2 unnamed failures (quick) | Not reproduced: the implementer's rerun and mine (seed `1794899348914`, full log) passed 5,871 tests. If real, it would be low: the diff changes only `expr`'s internals, and every caller's tests passed three times. Settled by naming them in a failing run, which none has given. |
| low | rejected | Five lexical rows in `evaluate.spec.ts` repeat the new tree rows (test-reviewer) | Duplication, not a defect; the Boundary Table lists both levels, and removing them edits the frozen table's level column. |

### Pass 3 (quick, on the two comment patches; 0 findings dropped): no findings. The review loop ends here; no test file changed, so test-reviewer did not run.

## Boundary Table

| Group | Row | Input | Expected | Level |
|---|---|---|---|---|
| Production bugs | sum of two parameters | `wall + gap`, scope wall=2mm, gap=3mm | `Ok({ value: 5, unit: 'mm' })` | unit, expr |
| Production bugs | precedence | `2 * wall + gap`, same scope | `Ok({ value: 7, unit: 'mm' })` | unit, expr |
| Production bugs | grouping | `(a + b) / 2`, a=4mm, b=2mm | `Ok({ value: 3, unit: 'mm' })` | unit, expr |
| Production bugs | negation | `-gap`, gap=3mm | `Ok({ value: -3, unit: 'mm' })` | unit, expr |
| Production bugs | left association | `1 - 2 - 3` | `Ok({ value: -4 })` (no unit) | unit, expr |
| Rules | unlike units added | `1mm + 1deg` | `unit-mismatch`, span 0..10 | unit, expr |
| Rules | unlike units subtracted | `1mm - 1deg` | `unit-mismatch`, span 0..10 | unit, expr |
| Rules | no unit added to a unit | `1 + 1mm` | `unit-mismatch`, span 0..7 | unit, expr |
| Rules | unit with no unit added | `1mm + 1` | `unit-mismatch`, span 0..7 | unit, expr |
| Rules | unit × unit | `2mm * 3mm` | `unit-mismatch`, span 0..9 | unit, expr |
| Rules | unit ÷ unit | `6mm / 3mm` | `unit-mismatch`, span 0..9 | unit, expr |
| Rules | unitless factor keeps the unit | `2 * 5mm` | `Ok({ value: 10, unit: 'mm' })` | unit, expr |
| Rules | unit times a unitless factor | `5mm * 2` | `Ok({ value: 10, unit: 'mm' })` | unit, expr |
| Rules | unitless times unitless | `2 * 3` | `Ok({ value: 6 })` (no unit) | unit, expr |
| Rules | unitless over unitless | `6 / 3` | `Ok({ value: 2 })` (no unit) | unit, expr |
| Rules | unitless divisor keeps the unit | `5mm / 2` | `Ok({ value: 2.5, unit: 'mm' })` | unit, expr |
| Rules | unitless ÷ unit | `2 / 5mm` | `unit-mismatch`, span 0..7 | unit, expr |
| Rules | divisor just below zero | `5mm / -0.5` | `Ok({ value: -10, unit: 'mm' })` | unit, expr |
| Rules | divisor on zero | `5mm / 0` | `division-by-zero`, span 0..7 | unit, expr |
| Rules | divisor on negative zero | `5mm / -0` | `division-by-zero`, span 0..8 | unit, expr |
| Rules | divisor just above zero | `5mm / 0.5` | `Ok({ value: 10, unit: 'mm' })` | unit, expr |
| Rules | zero divisor with a unit | `5mm / 0mm` | `unit-mismatch`, span 0..9 | unit, expr |
| Rules | name missing from scope | `gap`, empty scope | `unresolvable-reference`, name `gap`, span 0..3 | unit, expr |
| Rules | a unit word as a name | `mm`, empty scope | `unresolvable-reference`, name `mm`, span 0..2 | unit, expr |
| Rules | a prototype member's name | `constructor`, empty scope | `unresolvable-reference`, name `constructor`, span 0..11 | unit, expr |
| Rules | failing division below the root | `1 + 5mm / 0` | `division-by-zero`, span 4..11 | unit, expr |
| Rules | failing sum inside parentheses | `2 * (1mm + 1deg)` | `unit-mismatch`, span 5..15 | unit, expr |
| Rules | missing name below the root | `1 + gap`, empty scope | `unresolvable-reference`, name `gap`, span 4..7 | unit, expr |
| Rules | first failure, left to right | `a + 1mm * 1mm`, empty scope | `unresolvable-reference`, name `a`, span 0..1 | unit, expr |
| Rules | broken expression | `(2 * (gap +)` | `expression-syntax-error`, offset 11 | unit, expr |
| Rules | input ends too early | `2 +` | `expression-syntax-error`, offset 3 | unit, expr |
| Rules | empty | `` | `expression-syntax-error`, offset 0 | unit, expr |
| Rules | whitespace only | `   ` | `expression-syntax-error`, offset 0 | unit, expr |
| Rules | space before a unit | `19 mm` | `expression-syntax-error`, offset 3 | unit, expr |
| Rules | unit followed by a letter | `2degree` | `expression-syntax-error`, offset 1 | unit, expr |
| Rules | unit followed by a non-Latin letter | `2mmш` | `expression-syntax-error`, offset 1 | unit, expr |
| Rules | unit followed by a digit | `2mm3` | `expression-syntax-error`, offset 1 | unit, expr |
| Rules | unit followed by `_` | `2mm_x` | `expression-syntax-error`, offset 1 | unit, expr |
| Rules | unit closed by a parenthesis | `(2mm)` | `Ok({ value: 2, unit: 'mm' })` | unit, expr |
| Rules | name starting with a digit | `2gap` | `expression-syntax-error`, offset 1 | unit, expr |
| Rules | a non-ASCII digit after a number | `2٣` | `expression-syntax-error`, offset 1 | unit, expr |
| Rules | a non-ASCII digit in a name | `a٣`, scope a=1mm | `expression-syntax-error`, offset 1 | unit, expr |
| Rules | name starting with `_` | `_a`, scope _a=1mm | `expression-syntax-error`, offset 0 | unit, expr |
| Rules | whitespace after a trailing operator | `2 +   ` | `expression-syntax-error`, offset 6 | unit, expr |
| Rules | name with `_` and digits | `key_2`, scope key_2=1mm | `Ok({ value: 1, unit: 'mm' })` | unit, expr |
| Rules | name in a non-Latin script | `ширина`, scope ширина=4mm | `Ok({ value: 4, unit: 'mm' })` | unit, expr |
| Rules | span after an astral letter | `𝒳 + 1mm`, scope 𝒳=1mm | tree `binary +` 0..8 { `name 𝒳` 0..2, `number 1 mm` 5..8 } | unit, expr |
| Rules | newline between tokens | `2mm +\ngap` | `expression-syntax-error`, offset 5 | unit, expr |
| Rules | CR between tokens | `2mm +\rgap` | `expression-syntax-error`, offset 5 | unit, expr |
| Rules | no-break space between tokens | `2mm +\u00A0gap` | `expression-syntax-error`, offset 5 | unit, expr |
| Rules | tab between tokens | `2mm\t+ 1mm` | `Ok({ value: 3, unit: 'mm' })` | unit, expr |
| Rules | name with `-` | `a-b`, a=3mm, b=1mm | `Ok({ value: 2, unit: 'mm' })` (a minus, never part of a name) | unit, expr |
| Module boundaries | every node carries its span | `-(a + 2mm) * 3` | the whole tree: `binary *` 0..14 { left `negate` 0..10 { `binary +` 2..9 { `name a` 2..3, `number 2 mm` 6..9 } }, right `number 3` 13..14 } | unit, expr |
| Module boundaries | parentheses on a left operand | `(a) + b` | `binary +` 0..7 { `name a` 1..2, `name b` 6..7 } | unit, expr |
| Module boundaries | parentheses on a right operand | `a + (b)` | `binary +` 0..7 { `name a` 0..1, `name b` 5..6 } | unit, expr |
| Module boundaries | whitespace kept outside spans | ` a + b ` | `binary +` 1..6 { `name a` 1..2, `name b` 5..6 } | unit, expr |
| Module boundaries | literal still read | every row of `parse-expression.spec.ts`'s reads | unchanged | unit, expr |
| Module boundaries | literal still refused | every row of its refusals, plus `wall + gap`, `(19mm)`, `- 19mm`, `--19mm`, `19`, `-mm` | `{ kind: 'expression-parse-failed', input }` | unit, expr |
| Module boundaries | huge literal inside an expression | `1mm + ` then `9`×309 `mm` | `expression-syntax-error`, offset 6 | unit, expr |
| Module boundaries | one digit short of overflow | `9`×308 `mm` | tree `number` { value `1e308`, unit `mm` } 0..311 | unit, expr |
| Module boundaries | just below the largest double | the digits of `Number.MAX_VALUE − 2^971` (one ulp below), then `mm` | tree `number` { value `Number.MAX_VALUE - 2 ** 971`, unit `mm` } | unit, expr |
| Module boundaries | on the largest double | the digits of `Number.MAX_VALUE`, then `mm` | tree `number` { value `Number.MAX_VALUE`, unit `mm` } | unit, expr |
| Module boundaries | just above the largest double | the digits of `Number.MAX_VALUE + 2^970` (half an ulp, which rounds to `Infinity`), then `mm` | `expression-syntax-error`, offset 0 | unit, expr |
| Module boundaries | one digit past overflow | `9`×309 `mm` | `expression-syntax-error`, offset 0; `parseExpression` refuses it | unit, expr |
| Module boundaries | just below the length cap | `1 + 1 + …` padded with spaces to 511 characters | parses | unit, expr |
| Module boundaries | on the length cap | the same, 512 characters | parses | unit, expr |
| Module boundaries | just above the length cap | the same, 513 characters | `expression-syntax-error`, offset 512 | unit, expr |
| Module boundaries | deep nesting inside the cap | `(`×254 `1mm` `)`×254 (511 characters) | parses; `evaluate` gives `Ok({ value: 1, unit: 'mm' })` | unit, expr |
| Module boundaries | deep nesting past the cap | `(`×3000 `1mm` `)`×3000 | `expression-syntax-error`, offset 512, from `parseExpressionTree`, `evaluate` and (as `expression-parse-failed`) `parseExpression`; nothing throws | unit, expr |
| Module boundaries | long chain past the cap | 5,000 terms `1 + 1 + …` | `evaluate` returns `expression-syntax-error`, offset 512; nothing throws | unit, expr |
| Glue | committed parser current | grammar and committed parser | drift spec green | unit, expr (Node) |
| Glue | committed parser stale | one character of the committed parser changed | drift spec red (toggled bug) | unit, expr (Node) |

## Verification

**Commands:**
- `pnpm --filter @keeb-cad/expr generate:parser && git diff --exit-code packages/expr/src/expression-parser.js` -- expected: no diff.
- `pnpm vitest run --project @keeb-cad/expr` -- expected: all green, drift spec included.
- `pnpm typecheck && pnpm check:fast` -- expected: clean.
- `pnpm test` -- expected: the whole suite green.

**Manual checks (if no CLI):**
- Nothing visible changes: no editor, schema or placement reads the new parser until 14.8.
