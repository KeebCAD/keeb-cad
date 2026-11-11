---
title: 'Availability says why'
type: 'feature'
ticket: 29
created: '2026-11-11'
status: 'built'
baseline_revision: '1960f0a56468f25868f573916f543fc3c231b982'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `Invoke.available` answers a boolean that is `true` on any parse failure, so nothing in the UI can tell a person why an entry is refused, and a form can't show the reason for the text they typed.

**Approach:** `Invoke.available(handle, input?)` returns `Result<void, Rejection>` in `invoke`'s order (spine AD-26 Shortcuts, 2f64fbd): a command with no design open is `unavailable` first; a parse failure of input the caller passed is an `input-invalid` refusal with the schema's issues, of input the path built is ok; otherwise the entry's own check answers. Every caller and spec moves to the Result. `editor` gains `rejectionText`, the one pure function from a `Rejection` to the text a person reads, and `idSchema` checks non-empty before kebab-case (spine Data Schema, `:782`, `:825`).

## Boundaries & Constraints

**Always:**
- The caller passed input when its argument is not `undefined` (spine AD-26 Shortcuts; `invoke.ts:77-78` already draws that line).
- Shortcut keys, DeleteSelection and DuplicateSelection treat only ok as available; an `input-invalid` answer is unavailable to them.
- Decision (Sergii 2026-11-11, ticket): `rejectionText` words the store's own kinds `unavailable` → `Not available right now.`, `unknown-command` → `No such command.`, `stale` → `The design changed; try again.`; a model kind gives its `message`, `input-invalid` its first issue's `message`.
- Decision (Sergii 2026-11-11, ticket): `idSchema` reads `An id is required.` for an empty id, then `An id is kebab-case.`.
- Decision (Sergii 2026-11-11): row 5 expects both messages for an empty id, `['An id is required.', 'An id is kebab-case.']`, not the first issue only and not a pipe that stops at its first failure, because the whole value is asserted; Valibot runs a pipe's later actions after a failed one without `abortPipeEarly` (Valibot's `Config`: "Whether a pipe should be aborted early", `abortPipeEarly?`, `valibot/dist/index.d.cts:3718-3721`, unset in `idSchema`; node probe 2026-11-11 gave that list), and `rejectionText` reads the first.
- Decision (Sergii 2026-11-11): rows 3 and 3a stay, not dropped as unreachable, because the ticket's verify names "ok for built input its schema refuses" and a builder can type-check yet fail a refinement (`{ name: '' }` is a `NameInput`).
- Decision (Sergii 2026-11-11): row 12b stays, rewriting `invoke.spec.ts:485-490`, not deleted, because the UiAction branch parses on its own (`#checkUiAction`, `invoke.ts:126-134`) and the spine's caller-input rule covers every handle kind.
- Decision (Sergii 2026-11-11): `rejectionText` throws `InvariantError` for an `input-invalid` with no issues, with no row, not a tested throw and not a non-empty tuple type on `Rejection`, because no code reaches that state (AGENTS: "Arrange only a state real commands could reach").
- Nothing on screen reads a reason yet (ticket: split from 25; 30's flows and 25's add flow are the first readers).

**Never:**
- The `UiAction.available(): boolean` and `Action.available(current): boolean` interfaces (`ui-actions/types.ts:8`; the spine changes `Invoke`'s answer, not the entries'); the design store (`design-store.ts:83-104` already returns the Result); any UI that shows a reason; G, S, flows (25, 30).
- `vi.mock`, jsdom, snapshots; a second parse in `available` beside the one `#check` does.

## Boundary table

Level: U = unit in the named package (`editor` runs in browser mode).

**Production bugs** (a wrong answer greys a usable key, or claims a key whose entry then fails)

| # | Input / state | Expected | Level |
|---|---|---|---|
| 1 | `available(command)`, no design open, a builder registered | `err({ kind: 'unavailable', command })`; builder not asked | U editor |
| 1a | `available(command, valid input)`, no design open | `err({ kind: 'unavailable', command })` | U editor |
| 2 | `available(command, { name: '' })` (caller input its schema refuses; the test schema's message `A name is required.`) | `err({ kind: 'input-invalid', command, issues: [{ path: ['name'], message: 'A name is required.' }] })`; check not asked | U editor |
| 3 | `available(command)`, its builder's input its schema refuses | `ok()`; check not asked | U editor |
| 3a | `available(command)`, no builder, `{}` refused by its schema | `ok()`; check not asked | U editor |
| 4 | shortcut registry, entry's answer an err | key not run, not prevented (existing row, `shortcut-registry.spec.ts:229`) | U editor |
| 4a | shortcut registry, entry's answer ok | key run once, prevented (`:230`) | U editor |

**Rules**

| # | Input / state | Expected | Level |
|---|---|---|---|
| 5 | `idSchema` on `` | issues' messages `['An id is required.', 'An id is kebab-case.']` (Decision (Sergii 2026-11-11), Always) | U schema |
| 5a | `idSchema` on `a` (one character, the shortest id) | ok | U schema |
| 5c | `idSchema` on `ab` (two characters) | ok | U schema |
| 5b | `idSchema` on `Foo Bar` | issues' messages `['An id is kebab-case.']` | U schema |
| 6 | `rejectionText({ kind: 'id-taken', ids, message: 'm' })` | `'m'` | U editor |
| 7 | `rejectionText` of `input-invalid` with issues `[x, y]` | `x.message` | U editor |
| 8 | `rejectionText` of `unavailable` / `unknown-command` / `stale` | `Not available right now.` / `No such command.` / `The design changed; try again.` | U editor |

**Module boundaries**

| # | Input / state | Expected | Level |
|---|---|---|---|
| 9 | `available(command, valid)`, its check refuses `{ kind: 'stale', seq: 1, latest: 2 }` | `err({ kind: 'stale', seq: 1, latest: 2 })` | U editor |
| 10 | `available(command, valid)`, check ok | `ok()` | U editor |
| 11 | `available(action, valid)`, no design, its check false | `err({ kind: 'unavailable', command: action id })` | U editor |
| 11a | as 11, its check true | `ok()` | U editor |
| 12 | `available(uiAction, valid)`, its `available()` false | `err({ kind: 'unavailable', command: uiAction id })` | U editor |
| 12a | as 12, true | `ok()` | U editor |
| 12b | `available(uiAction, { name: '' })` | `err({ kind: 'input-invalid', command: uiAction id, issues: [{ path: ['name'], message: 'A name is required.' }] })`; its check not asked | U editor |

**Glue**

| # | Input / state | Expected | Level |
|---|---|---|---|
| 13 | `available(DeleteSelection)` / `available(DuplicateSelection)` in each state their specs arrange as unavailable (`delete-selection.spec.ts:97-120`, `duplicate-selection.spec.ts:66-76`) | `err({ kind: 'unavailable', command: <UiAction id> })`, design unchanged | U editor |
| 14 | `available(FitViewport)` on Outline and with no drawn key; `available(ShowLayout)` on Layout; `available(CloseSlideOut)` closed; `available(OpenTree)` open | `err({ kind: 'unavailable', command: <its id> })` | U editor |

</frozen-after-approval>

## Code Map

- `packages/editor/src/invoke/invoke.ts:61-69` (service, changed) -- `available` returns `Result<void, Rejection>`. Keep the no-design guard (`:64`, commands only). Then `#check(handle, #inputFor(handle, input))` (`:112-123`) already parses before checking for both branches (store: `design-store.ts:83-104`; UiAction: `#checkUiAction`, `:126-134`), so the only new logic is: an err of kind `input-invalid` with `input === undefined` answers ok; everything else passes through, ok mapped to `void`. The comment at `:61-62` moves to the new branch. `Result` has no `orElse` (`result/src/err.ts`): use `match`.
- `packages/editor/src/invoke/invoke.spec.ts` -- `:30` `nameInputSchema` gains a message on `v.minLength(1, 'A name is required.')`, so rows 2 and 12b write the issue from the test, not from Valibot's default text. `:191-197` and the `available` describe (`:384-490`) assert the Result as whole values (`toEqual(Result.err({...}))` / `toEqual(Result.ok())`), every `available` row in that one form. `expectUnavailable` (`:184-187`) narrows (`expectErr(result)` then `expect(result.error)`); it becomes `expect(result).toEqual(Result.err({ kind: 'unavailable', command }))`, and its callers keep it (AGENTS: "Write a shared assertion once; assert whole values"). `:398-403` becomes row 2, `:485-490` row 12b (the requirement changed: 2f64fbd). Rows 3 and 3a are new. "Check not asked" is proved by the answer, not by a call record (AGENTS: "use `toHaveBeenCalled*` only when the call is the behaviour"): rows 2, 3 and 3a use `renameWith({ kind: 'stale', seq: 1, latest: 2 })`, whose check would answer `stale`; row 3 registers `buildName('')` (`RecordedBuildName` is fixed to `{ name: 'Corne' }`); row 12b uses `recordName(id, false)`, whose check would answer `unavailable`. With the schema's message set, `:344`, `:378` and `:750` write `'A name is required.'` in place of `expect.any(String)`.
- `packages/editor/src/shortcuts/shortcut-registry.ts:65` -- `!this.#invoke.available(...)` → `.isErr()`. Its spec's rows (`:228-245`) stay as written; they pass through the Result unchanged.
- `packages/editor/src/selection/delete-selection.ts:26-30`, `duplicate-selection.ts:27-31` -- `.map((input) => this.#invoke.available(X, input).isOk())`; their `available(): boolean` stays.
- Specs asserting the boolean, moving to row 13/14's Result: `selection/delete-selection.spec.ts:106,119`, `selection/duplicate-selection.spec.ts:75`, `viewport/fit-viewport.spec.ts:132,145`, `workspace/workspace.spec.ts:45`, `slide-out/slide-out.spec.ts:52,62`.
- `packages/editor/src/invoke/use-invoke.ts:8`, `types.ts:39` -- unchanged: `InvokeFunctions` is `Pick<Invoke, 'invoke' | 'available'>`, so the bound method returns the Result.
- `packages/editor/src/rejection/rejection-text.ts` (function, new) -- `rejectionText(rejection: Rejection): string`, an exhaustive ts-pattern `match` (`.exhaustive()`, no `.otherwise`), as `invoke.ts:45-58` matches. Spec `rejection-text.spec.ts` beside it.
- `packages/schema/src/id.ts:3-7` -- `v.nonEmpty('An id is required.')` before the regex. Rows 5–5b are added to `id.spec.ts` as `toEqual` on the issues' messages; rows 5, 5a and 5c are the length threshold's 0, 1 and 2 characters. Its `.success).toBe(false)` refusals (`:11-13`) are left as they are (deferred-work.md).
- `packages/schema/src/types.ts:159-173` -- `SchemaIssue`, `ModelRejectionKind`, `Rejection`; read, not changed. Every `input-invalid` is built from `parse`'s issues (`design-store.ts:195`, `invoke.ts:128`, both through `design/src/parsing/parse.ts:13`).

## Tasks & Acceptance

**Execution:**
- [ ] `packages/schema/src/id.ts`, `id.spec.ts` -- non-empty check first; rows 5–5c.
- [ ] `packages/editor/src/invoke/invoke.ts` -- `available` returns the Result as the Code Map says.
- [ ] `packages/editor/src/invoke/invoke.spec.ts` -- rows 1–3a, 9–12b.
- [ ] `packages/editor/src/shortcuts/shortcut-registry.ts`, `selection/{delete,duplicate}-selection.ts` -- read the Result. Rows 4, 4a, 13.
- [ ] The specs listed in the Code Map -- assert the Result. Rows 13, 14.
- [ ] `packages/editor/src/rejection/rejection-text.ts`, `rejection-text.spec.ts` -- `rejectionText` (function). Rows 6–8.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row passes at its level.
- Given each row group, when its toggled bug is applied, then its rows go red and pass once restored (named in the PR): the no-design guard dropped (1, 1a), the caller-input branch answering ok (2, 12b), a built-input parse failure answering err (3, 3a), `.isErr()` inverted in the registry (4, 4a), `.isOk()` dropped to `true` in DeleteSelection (13), the check's rejection replaced by `unavailable` (9), the `nonEmpty` removed (5), `nonEmpty` replaced by `v.minLength(3, 'An id is required.')` (5a, 5c), a store kind's text swapped (8), the first issue replaced by the last (7), a model kind's text replaced by its kind (6), ok mapped to `unavailable` (10, 11a, 12a), the entry's check ignored, always ok (11, 12), `#checkUiAction`'s refusal mapped to ok (14).
- Given `pnpm --filter app dev` at `/?seed=corney` in Chromium and Firefox, when 13.24's verify is followed for Delete and Ctrl+D, then each step behaves as it says.

## Implementation Notes

- Decision (build): `expectResult(actual, expected)` in `packages/result/src/testing/expect-result.ts` compares both Results as plain `{ ok }` / `{ err }` values, not `toEqual(Result.err(…))` as the plan sketched and not `expectErr` then `.error`. `toEqual` walks an `Err`'s iterator, which throws past its first yield (`result/src/err.ts:46-49`; `invoke.spec.ts:661` notes the same), and AGENTS says "assert whole values … instead of narrowing in the test". Where a spec had folded the boolean into one `toEqual` with other state, it now has `expectResult` plus a `toEqual` for that state.
- Decision (build): `eslint.config.ts` adds `'expectResult'` to `vitest/expect-expect`'s `assertFunctionNames`, beside `expectOk` and `expectErr`, not a local `expect` in each test, because without it `pnpm lint` flags every test whose only assertion is `expectResult` (implementer's run). Unplanned config change, rejected alternative refuted by a command; listed for the look.
- Decision (build): `rejectionText` matches model kinds by `{ message: P.string }`, not by listing `ModelRejectionKind`'s five members, because the spine says "a model kind gives its message" (`:782`), and only model kinds carry `message` (`schema/src/types.ts:168-173`); `.exhaustive()` still holds.
- Toggled bugs (implementer's script, both browsers): every row group went red except two AC claims. Row 1a stays green with the no-design guard dropped, because `DesignStore.available` answers `unavailable` itself with no design (`design-store.ts:89-92`); only row 1 goes red (the builder is asked). Row 13's `.isOk()` → `true` turns only the root-selected case red; with nothing selected `#input()` is none and `getOr(false)` answers first.
- Real-host run: no spec in the diff fakes a third-party host or boundary (the fakes are test commands, actions and UiActions of the repo's own interfaces).
- Verification (2026-11-11): `pnpm test` 559 files, 4486 tests passed, no type errors; `pnpm lint` clean; `pnpm depcruise` no violations. Manual check by the implementer in Chromium only: Ctrl+D on `outer-home` added and selected `outer-home-2`, Delete removed it, Delete with top-bar focus changed nothing; Firefox, the Tree tab, the bookmark dialog and the devtools timeline not checked.

- `toEqual(Result.err(…))` throws: Vitest's iterable equality walks `Err`'s iterator, which throws past its first yield (`result/src/err.ts`). Added `expectResult(actual, expected)` to `@keeb-cad/result/testing` (compares both as `{ ok }` / `{ err }` plain values) and registered it in `eslint.config.ts`'s `assertFunctionNames` beside `expectOk`/`expectErr`. Specs that bundled the boolean into one `toEqual` with other state now assert the Result with `expectResult` and the state with a second `toEqual`.
- Row 1a's toggled bug (no-design guard dropped) does not turn 1a red: `DesignStore.available` answers `unavailable` with no design itself (`design-store.ts:89-92`); only row 1 (builder asked) goes red.

## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer; 0 test-reviewer findings dropped for a missing quote). Verdicts: 1 medium, 3 low patched, 4 low rejected, 3 false.
- medium, patch -- test-reviewer 1: rows 3, 3a ("without asking its check") pass even if the check is asked and its `stale` swallowed, since `available` maps built-input errors to ok (`invoke.ts:230-237`); a widened branch (`input === undefined ? ok`) would stay green. Fix: the check records into a test-local list, asserted empty.
- low, patch -- quick 6: `expectResult(actual: Result<unknown, unknown>, expected: Result<unknown, unknown>)` lets a misspelled `kind` in `expected` compile; `expectOk`/`expectErr` keep `<T, E>`. Fix: generic, expected typed from actual. The "no spec of its own" half is false: `expectOk` and `expectErr` have none either (`result/src/testing/`).
- low, patch -- quick 5 / test-reviewer 3 (one root cause): `it.each(['a', 'ab'])('accepts %j, at the shortest lengths'` names `ab` (just above) as a shortest length. Fix: name each row's role.
- low, patch -- test-reviewer 2: `invoke.spec.ts:334`, `:364` still narrow (`expectErr` then `.error`) on lines this diff changes. Fix: `expectResult`.
- low, reject -- quick 1 / test-reviewer 4: the AC lists row 1a under the no-design guard's toggled bug, but the store answers `unavailable` itself (`design-store.ts:89-92`); the test is right, the fix edits this plan. Named at the look.
- low, reject -- quick 2: row 13's toggled bug reaches only the root-selected case; the fix edits this plan's AC. Named at the look.
- low, reject -- quick 3: Firefox and the rest of 13.24's verify not checked by hand; Sergii's look covers it.
- low, reject -- quick 8: plan bookkeeping (repeated notes, checkboxes, empty change log); the fix edits this plan.
- false -- quick 4: `toMatchObject` instead of `toEqual` in `id.spec.ts`: AGENTS names both ("assert whole values (`toEqual`, `toMatchObject`)"), and `toMatchObject` checks array length, so both messages are pinned.
- false -- quick 7: the `eslint.config.ts` line is a recorded `Decision (build)` with a command as its evidence, per the build's structural-change rule; listed at the look.
- false -- quick 6, second half: see above.

Pass 2 (quick, test-reviewer, on the patched files; 0 dropped). Verdicts: 0 high, 0 medium, 3 low, 0 false. Nothing above low: the loop ends, lows logged, not patched.
- low -- quick 1 / test-reviewer 1 (one root cause): `expectResult` compares `{ ok: value }` / `{ err: error }` with `toEqual`, which ignores `undefined` properties, so `Result.ok()` and `Result.err(undefined)` compare equal. No caller in this diff can meet it: `Rejection` is never `undefined`. A `Result<void, void>` caller would.
- low -- quick 2: correction to pass 1's medium. Rows 3 and 3a's `seen` can't catch a widened branch (`input === undefined ? ok`): their built input fails the parse before the check (`design-store.ts:83`), so the check is unasked either way; the rows do prove what they name. `invoke.spec.ts` has no row for built valid input with a refusing check (→ that rejection); the widened branch still goes red in `shortcut-registry.spec.ts:228-245` and row 14's UiAction specs, so the harm is a rule tested outside its own spec.
- low -- test-reviewer 2: row 3's name says "builder's input", but a `#inputFor` that ignored the builder would fall back to `{}`, which also fails, so row 3 can't tell it from 3a; "asks a command's check about its builder's input when the caller gives none" proves the builder is read.

## Design Notes

- Decision (plan): the built-input branch turns `#check`'s `input-invalid` into ok, not a second parse in `available`, because both check paths already parse first (`design-store.ts:83` "Parses before it checks"; `invoke.ts:125`), so one parse serves `invoke` and `available` alike.
- Decision (plan): `rejectionText` throws `InvariantError` for an `input-invalid` with no issues, not a fallback text, because Valibot never fails with none (`valibot/dist/index.d.cts:2744`: `issues: [InferIssue<TSchema>, ...InferIssue<TSchema>[]]`) and every `input-invalid` is built from `parse`, which maps them one to one (`parse.ts:13`), so an empty list is a bug.
- Decision (plan): `rejectionText` gets its own folder `editor/src/rejection/`, not `invoke/`, because it reads a `Rejection` from any source, not only the invoke path's answer: "every surface (a form's reason, the palette, menus, toasts) uses" it (spine `:782`), and AGENTS says "a new concept gets a new file".
- Decision (plan): `rejectionText` stays out of `editor`'s `index.ts`, not exported now, because its first readers are inside `editor` (ticket: "30's flows and 25's add flow are its first readers"; spine: a flow "is a class in `editor`"), and `ui` and `app` read no `Rejection` today.
- Decision (plan): rows 13 and 14 assert the whole Result in the UiActions' own specs, not `.isErr()`, because AGENTS says "assert whole values … instead of narrowing in the test"; the rule each spec owns is the UiAction's state (which focus, workspace or selection makes it unavailable), and the Result is the value `available` returns for it.
- Decision (plan): no row for caller input of another type (`null`, `{}` for `nameInputSchema`), not one, because `available`'s input is typed `v.InferInput<H['input']>` (`invoke.ts:63`) and AGENTS says "test a runtime check with a value the types accept"; `{ name: '' }` (row 2) is the caller's empty input the spine names (`{ id: '' }`).
- Decision (plan): an `input-invalid` from an entry's own check, not only from parsing, would also turn ok on built input; accepted, not a separate parse flag, because only `parse` builds that kind (`design-store.ts:195`, `invoke.ts:128`) and the spine gives an entry's check the model's kinds (`:782`).
- Decision (plan): no row for `useInvoke().available`, not a browser row, because it is `Invoke.available` bound (`use-invoke.ts:8`) and typed by `Pick<Invoke, …>` (`types.ts:39`); AGENTS: "Test a rule where it is defined".
- Decision (plan): no row for DeleteSelection or DuplicateSelection on an `input-invalid` answer, not an arranged one, because their input is `Selection.ids`, typed `readonly Id[]` (`selection.ts:9`), which `deleteNodeInputSchema` and `duplicateNodeInputSchema` accept; AGENTS: "Arrange only a state real commands could reach". The `.isOk()` is what makes it unavailable; row 13's toggled bug covers the read.
- Decision (plan): the test schema in `invoke.spec.ts` carries its own message, not Valibot's default, because AGENTS says "Take expected values from the requirement … never from running the code".

## Conformance Log

Pass 1 (two readers and the gap reviewer; 0 findings dropped for a missing quote or path):
- AGENTS "Take expected values from the requirement … never from running the code" (row 5's second message) -- asked (Sergii: both messages).
- AGENTS "Arrange only a state real commands could reach" (row 7a) -- asked (Sergii: throw, no row).
- AGENTS "Give every decision its rejected alternative" (the `rejection/` folder, the export) -- fixed.
- AGENTS "Test a rule where it is defined" (rows 13, 14 whole Result) -- fixed (Decision (plan)).
- AGENTS "Arrange only what the test uses, passed as arguments to an `arrange` helper" (row 3's builder) -- fixed (`buildName('')`).
- AGENTS "use `toHaveBeenCalled*` only when the call is the behaviour" ("check not asked") -- fixed (proved by the answer).
- AGENTS "Take expected values from the requirement" (`invoke.spec.ts:344,378,750` `expect.any(String)`) -- fixed.
- Code Map citation `duplicate-selection.ts:76-80` -- fixed (`:27-31`).
- AGENTS "Give every threshold three rows" (idSchema length) -- fixed.
- AGENTS "assert whole values … instead of narrowing" (`id.spec.ts:11-13`) -- deferred.
- AGENTS "add empty input and an input that breaks an assumption" (caller `null`, `{}`) -- fixed (Decision (plan): the types refuse them).
- Observation: `input-invalid` from an entry's own check -- fixed (Decision (plan)).
- gap: toggled bugs for rows 6, 7a, 10, 11, 11a, 12, 12a, 14 -- fixed.
- gap: decision without a Y (`rejection/` folder) -- fixed.
- gap: caller input `null`/`{}` -- fixed (Decision (plan)).
- gap: rows 3, 3a, 12b unreachable -- asked (Sergii: keep).
- gap: row 9 `stale` from a check -- fixed (a check may return any `Rejection`, `types.ts:168-173`; the row proves pass-through, not a reachable `stale`).

Final pass (one reader):
- AGENTS "assert whole values … instead of narrowing" (`expectUnavailable` "where it fits") -- fixed.
- AGENTS "Give every threshold three rows" (just above is 2 characters) -- fixed (row 5c).
- AGENTS "Take expected values from the requirement" (row 5 second message) -- fixed (Valibot `Config` cite added to Sergii's decision).

## Verification

**Commands:**
- `pnpm test` -- expected: all pass, no type errors.
- `pnpm lint` -- expected: clean.
- `pnpm depcruise` -- expected: no violations.

**Manual checks:**
- `pnpm --filter app dev`, `/?seed=corney`, Chromium and Firefox: Delete and Ctrl+D as 13.24's verify says. Nothing new is visible: no surface reads a reason yet.
