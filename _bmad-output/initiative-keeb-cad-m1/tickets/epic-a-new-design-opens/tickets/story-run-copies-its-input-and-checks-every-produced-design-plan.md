---
title: 'run copies its input and checks every produced design'
type: 'feature'
ticket: '16'
created: '2026-11-06'
status: 'built'
baseline_revision: '56e9a854d3efedb5d745bc854ce3c985f37aea4c'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `DesignStore.run` hands the caller's input object to valibot and on to the apply step, so a value the schema passes through (an `unknown` or custom field) can be frozen by Immer in the caller's hands or carry a Vue proxy into the design. Nothing checks that a produced design still fits the design schema, so a command that spreads an object with an extra key commits it. A command that changes nothing still commits, autosaves and messages the worker.

**Approach:** Build spine AD-2's Inputs and Writing rules into `run`: copy the input with `toRaw` and `structuredClone` before parsing, for both kinds. After a command's draft is produced, return ok without committing when it has no patches. Otherwise parse the produced design with `designSchema` and throw `InvariantError` naming the issue paths and the command id when the parse fails, then run `checkStructure` and commit as today.

## Boundaries & Constraints

**Always:** the committed design is Immer's produced value, never valibot's parse output (structural sharing, frozen). The copy runs before the input schema parse, for commands and actions alike. A schema failure and a clone failure throw. They never return a `Rejection` and never commit. A no-op leaves `store.current` the same object and emits nothing.

**Decision (Sergii, 2026-11-06): the schema check is a private `#ensureValidDesign(design: Frozen<Design>, commandId: string): void` beside `#ensureRegistered`,** whose body is `parse(designSchema, design).match({ ok: () => {}, err: (issues) => { throw new InvariantError(…) } })`, called by name in `#runCommand`. Rejected: an inline `.tap` in the Result chain (the throw hides in the chain) and a new `getOrThrow` in `result` (a kernel API for one call site).

**Decision (Sergii, 2026-11-06): `toRaw` stays shallow, and a Vue proxy nested in a plain input is a caller bug that throws `DataCloneError`,** not unwrapped by a deep walker, because Vue (3.5.44) has no deep unwrap, VueUse has none either (`useCloned`'s JSON clone would silently drop the values the spine wants to throw on), and passing a whole reactive object already clones fine: its raw target holds raw children. `editor` passes plain values or `toRaw` pieces.

**Never:** per-entry generic checks over registered entries (closed by sweep A8). No change to `replaceDesign`, `DesignPatcher`, `commands` or the `Rejection` union. No deep-equal no-op test: a no-op is empty patches. No `run` options (`seq`, `coalesce`), and no undo stack.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reactive input | `reactive({ form })` to a command that stores it | committed as plain data, deeply frozen; caller's object unfrozen | none |
| Passed-through input | an object reaching the draft unchanged through its schema | the committed value is not the caller's object; caller's object unfrozen | none |
| Uncloneable input | input holding a function, command or action | throws the platform's `DataCloneError`; apply never runs | nothing committed, no event |
| Extra key | apply spreads its input, carrying one key the design schema refuses | throws `InvariantError` naming that path and the command id | no ref write, no event, seq unchanged |
| No-op | apply changes nothing | `ok`, no commit | `current` unchanged, no event |

</frozen-after-approval>

## Code Map

- `packages/design/src/store/design-store.ts` -- `run`, `#runCommand`, `#runAction`. Today `#runCommand` does: `#ensureRegistered` → `#committed()` → `available` → `parse(handle.input, input)` → `#patcher.change` → `checkStructure` → `#write` + `emit('commit', { kind: 'patches', … })`. `#runAction` does: `#ensureRegistered` → `available(this.current)` → `parse` → `action.apply`. `#ensureRegistered` is the existing throw-on-bug pattern (`if … return; throw new InvariantError(…)`).
- `packages/design/src/parsing/parse.ts` -- `parse(schema, value): Result<InferOutput, SchemaIssue[]>`, reused for the design parse. `SchemaIssue.path` is `(string | number)[]` (`to-schema-issue.ts`).
- `packages/design/src/patching/design-patcher.ts` -- `change` returns `{ design, patches }`. Immer gives empty patches and the same reference when nothing changed. Do not change this file.
- `@keeb-cad/reactive` -- re-exports `@vue/reactivity`, so `toRaw` comes from there (`design` already depends on it). `structuredClone` is global in Node and both browsers.
- `@keeb-cad/schema` `designSchema` -- `v.strictObject` down through meta, form and layout, so an extra key is an issue at its path. `@keeb-cad/result` `InvariantError(message)`.
- `packages/design/src/store/design-store.spec.ts` -- `describe('run, for a command')` (L141), `describe('run, for an action')` (L315). Reuse `arrange`, `committed`, `recordCommits`, `expectNothingCommitted`, `RenameDesign`, `SetForm`, `aDesign`/`aMeta`, `expectDeeplyFrozen`/`expectNothingFrozen` (`../testing`). The existing `it.each` "stores %s as plain data and never freezes it" (L163) already passes without the copy, because valibot rebuilds objects, so it does not prove the copy.
- `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` L61-64 -- the per-entry checks item is already `closed:`. Nothing to edit.

## Tasks & Acceptance

**Execution:**
- [x] `packages/design/src/store/design-store.ts` -- `run` keeps its `match` on kind. `#runCommand` and `#runAction` each start with their existing `#ensureRegistered`, then `const copied = this.#copyInput(input)` (a private `#copyInput(input: unknown): unknown` returning `structuredClone(toRaw(input))`), then their existing steps over `copied`. In `#runCommand`, the step after `change` is one `.flatMap((changed) => …)`: empty `changed.patches` → `Result.ok()` with no write; otherwise `this.#ensureValidDesign(changed.design, handle.id)` as a statement, then `checkStructure(changed.design).map(() => …write and emit as today…)`. `#copyInput` and `#ensureValidDesign` sit beside `#ensureRegistered`, below the public API.
- [x] `packages/design/src/parsing/format-issue-paths.ts` (+ `format-issue-paths.spec.ts`) -- `formatIssuePaths(issues: readonly SchemaIssue[]): string`, the message's `<paths>` part, beside `to-schema-issue.ts`. `#ensureValidDesign` builds the message with it. Its spec holds the path-format rows below; the store's spec tests only that the message carries the command id and the formatted paths.
- [x] `packages/design/src/store/design-store.spec.ts` -- one test per boundary row below, in the existing `describe`s. Test commands are declared inside their test, as `RejectRename` is. A new shared `class` is added at module level only when two tests use it.

**Acceptance Criteria:**
- Given each boundary row, when its test runs, then it passes. With the matching line of `design-store.ts` removed (the copy, the no-op check, the schema check), at least one row goes red. Say so in the PR.
- Given the workspace, when `pnpm check` and `pnpm test` run, then both pass.

## Boundary Table

| Group | Row | Input | Expected | Level |
|---|---|---|---|---|
| production bugs | patches: 0 (no-op) | `RenameDesign` with the design's current name | `ok`; `store.current` same object; no event | unit, `design` |
| production bugs | patches: 1 (just above) | `RenameDesign` with a new name | commits, seq +1, one patches event (existing test L142) | unit, `design` |
| production bugs | extra keys: 0 | test command spreading a schema-valid object into `meta` | commits | unit, `design` |
| production bugs | extra keys: 1 | test command whose apply spreads its whole input (`{ name, note }`) into `meta` | throws `new InvariantError('Command "meta.spreadRename" produced a design the design schema refuses at meta.note.')`; nothing committed | unit, `design` |
| rules | path format: 1 issue | `[{ path: ['meta', 'note'] }]` | `'meta.note'` | unit, `design` (`format-issue-paths.spec.ts`) |
| rules | path format: 2 issues, out of order | `[{ path: ['meta', 'note'] }, { path: ['meta', 'form', 'tag'] }]` | `'meta.form.tag, meta.note'` | unit, `design` (`format-issue-paths.spec.ts`) |
| rules | path format: numeric segment | `[{ path: ['layout', 'children', 0, 'note'] }]` | `'layout.children.0.note'` | unit, `design` (`format-issue-paths.spec.ts`) |
| rules | input reaches the draft unchanged, plain | test command `meta.storeForm` whose input schema is `{ form: v.custom<Form>(…) }` (passes the object through) and whose apply stores `input.form` | committed form `toEqual` the input's, `not.toBe` it; caller's object unfrozen | unit, `design` |
| rules | input reaches the draft unchanged, reactive | the same command given `reactive({ form })` | committed form `toEqual` the plain form, `isProxy` false; caller's object unfrozen | unit, `design` |
| rules | input reaches an action unchanged | test action `file.recordInput` whose input schema passes a value through (`v.unknown()`) and records what `apply` receives | recorded value `toEqual` the caller's, `not.toBe` it; caller's object unfrozen | unit, `design` |
| rules | reactive input, rebuilt by its schema | existing `it.each` L163–L186 | stays green (kept; it does not prove the copy) | unit, `design` |
| rules | uncloneable input, command | `{ name: 'x', onDone: () => {} }`, schema `v.looseObject` | `toThrow(expect.objectContaining({ name: 'DataCloneError' }))`; nothing committed | unit, `design` |
| rules | uncloneable input, action | the same shape to a test action recording applies | throws; recorded applies `[]` | unit, `design` |
| rules | nested proxy | `{ form: state.form }` with `state = reactive({ form })`, to `meta.storeForm` | throws `DataCloneError`; nothing committed | unit, `design` |
| rules | uncloneable input, unavailable command | the same shape to a test command whose `available` is false | throws `DataCloneError`, not an `unavailable` rejection (copy before availability) | unit, `design` |
| module boundaries | unregistered and uncloneable | an unregistered command given a function | throws the existing "is not registered" `InvariantError` (registration first) | unit, `design` |

## Implementation Notes

(Superseded after PR #23 opened: see the WebWorker lib entry below.) **Decision (build): `structuredClone` is typed by one `declare global` in `store/types.ts`,** not by adding the `WebWorker` or `DOM` lib to `design`'s (and `commands`', which compiles `design`'s source) tsconfig, because the store runs on main and in the model worker, and each lib would also declare globals one of them lacks. The plan's Code Map said only that it is global at runtime.

**Decision (build): `formatIssuePaths` sorts by code unit order,** not `localeCompare`, because the message is the store's own rule and must not vary with the runtime's locale (same comparator as `hashing`'s canonical encoding).

Toggled bugs, each run against `design-store.spec.ts`: copy removed (7 rows red), `toRaw` removed (both reactive rows red), copy moved after `available` (unavailable-command row red), copy moved before registration (unregistered row red), no-op check removed (no-op row red), schema check removed (extra-keys row red). Restored each time.

- After PR #23 opened (Sergii, 2026-11-06): `structuredClone`'s type comes from the `WebWorker` lib in `design` and `commands` (`tsconfig.lib.json`), not a hand-written `declare global` in `store/types.ts`, because the lib's own declaration is faithful to design/worker and keeps both packages DOM-free; `commands` needs it because it type-checks design's store source. Checked clean with `tsc` before applying.

## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer; 0 findings dropped on quote check). Verdicts: high 0, medium 0, low 9, false 0, maybe-false 0.

- low, patch -- `RecordInput` declared twice (both lenses): identical class in two action tests; moved to a module-level factory over a per-test recorder (no module-level mutable state).
- low, patch -- `NotifyRename` names nothing it does: renamed `LooseRename`.
- low, patch -- extra-keys-0 test used `toMatchObject`, tolerating the extra keys its name rules out: `toEqual` on the design.
- low, patch -- `formatIssuePaths` had no empty-input or root-path row though the plan decides the root renders as `''`: rows added.
- low, patch -- pass-through command tests never asserted the committed design deeply frozen (matrix Reactive input row): `expectDeeplyFrozen` added.
- low, patch -- action pass-through test's `expectNothingFrozen` cannot fail (actions never reach Immer): expect and name clause dropped.
- medium, patch -- the package-wide `declare global { structuredClone }` sat in `store/types.ts`, where a reader of `design` would not look for an ambient affecting `commands` too: moved to `src/types.ts`, then reverted: nothing imports a root `types.ts`, so `commands` lost the declaration and the move needed a side-effect `import '../types'` in `design-store.ts`, worse than the original. It stays in `store/types.ts`, which `design-store.ts` imports, so the ambient reaches every program compiling the store; downgraded to low, kept (later replaced by the WebWorker lib, pass 2). The lens's claim that `T` is the wrong return type is false: lib.dom declares the same `structuredClone<T>(value: T): T` shape.
- low, rejected -- duplicate paths kept (`meta.form, meta.form` when two checks fail on one field): only a bug message's wording, rare, and deduping adds a step no requirement asks for.
- low, rejected -- uncloneable command test has no apply recorder: the clone throws before `available` (pinned by the unavailable-command row), so apply cannot run first; a recorder adds a fake for no new claim.

Pass 2 (quick, on `db42237..6d39bd9`, the WebWorker lib switch; 0 dropped). Verdicts: high 0, medium 0, low 5, false 0, maybe-false 0.

- low, rejected -- `commands` gets worker-only globals though it runs on main: the trade-off Sergii approved (DOM would break commands' no-DOM fence; nothing uses those globals today, grep-checked by the lens).
- low, patch -- `design`'s tsconfig comment claimed the main thread has every WebWorker global the store uses, which nothing enforces: reworded to name the worker-only globals that type-check but don't exist on main (1be9181).
- low, rejected -- the specs' `tsconfig.vitest.json` inherit WebWorker though they run on Node: the lib was never Node-faithful (`types: []`, no Node lib), and Node has `structuredClone`.
- low, patch -- the build's `declare global` decision was not marked superseded: annotated.
- low, patch -- no pass-2 triage entry: this entry.

## Design Notes

**Decision (plan): copy in `run` for both kinds, not only commands,** because the spine puts the copy in `run` before the parse, and `run` parses for both kinds. An action's input can reach `replaceDesign` too.

**Decision (plan): `run` keeps its `match`, and each runner checks registration then copies,** not one registration check before the dispatch, because the registered list depends on the kind. **Order is registration, then copy, then the existing steps,** not copy first, because a missing registration is the more basic bug and keeps its existing message. The copy comes before `#committed()` and `available`, not between `available` and the parse (which the spine's "before it parses" also allows), because a clone failure is a bug whatever the state, and a bug should not hide behind an `unavailable` rejection.

**Decision (plan): the clone error propagates as the platform's `DataCloneError`,** not wrapped in `InvariantError`, because the spine only says it throws and the platform message already names what can't be cloned.

**Decision (plan): the no-op check comes right after `change`, before the schema parse and `checkStructure`,** not after them, because an unchanged design is the committed one, which already passed both.

**Decision (plan): the schema parse runs before `checkStructure`,** not after, because the structure checks (13.3's acyclicity) read the design's shape and assume it is valid.

**Decision (plan): the message is `Command "<id>" produced a design the design schema refuses at <paths>.`** with each path's segments dot-joined (a number as its digits: `layout.children.0.note`) and the paths sorted and comma-joined, not the issues' messages, because the ticket asks for the paths and the command id, and valibot's messages are not ours to fix. Built by hand, not with valibot's `getDotPath`, because `parse` has already turned valibot's issues into `SchemaIssue`s with plain array paths, and `getDotPath` reads valibot's own issue type. Sorted, not valibot's issue order, so the message is the store's own rule. An empty path (an issue at the design root) renders as the empty string, not a `(root)` placeholder, because `change`'s producer returns `undefined`, so no apply step can replace the draft's root object.

**Decision (plan): the test schemas `v.custom`, `v.unknown()` and `v.looseObject` are pass-through on purpose,** not stricter schemas, because the copy is what those rows test, and AD-24 says `run`'s copy keeps caller objects out of the design whatever the schema; a stricter schema would rebuild the object and hide a missing copy.

**Decision (plan): the commit stays Immer's value,** not `parse`'s output, because valibot rebuilds every object, which would break structural sharing and the patches' meaning.

## Conformance Log

- Readers 1+2 (union, 0 dropped): `Give every test an \`expect\` that fails when the behaviour breaks.` (reactive row cited a test that passes without the copy) -- fixed (new plain, reactive and action pass-through rows)
- `Order a class top-down…` / `Give every decision its rejected alternative…` (registration before dispatch under-specified) -- fixed (match kept; each runner checks then copies)
- `Take expected values from the requirement…` (path order read off valibot) -- fixed (paths sorted by the store)
- `A choice no requirement made is a decision…` (no-op and throw call site in the chain) -- fixed (one `.flatMap`, `#ensureValidDesign` as a statement)
- `A choice no requirement made is a decision…` (root and numeric path rendering) -- fixed
- `Give every threshold three rows…` (copy before availability had no row) -- fixed (unavailable-command row)
- gap: future `editor` caller (`packages/editor/`, spine `store.run(AddKey, input)`), nested proxy -- asked (Sergii: throw)
- gap: action via `#runAction` (`packages/design/src/store/design-store.ts`), no pass-through row -- fixed
- Final pass (0 dropped): `Give each file one kind of thing…` (path formatting had no home) -- fixed (`parsing/format-issue-paths.ts`)
- Final pass: frozen signature vs task (`command` vs `handle.id`) -- fixed (`commandId: string`)
- Final pass: `Give every decision its rejected alternative…` (copy order, empty path) -- fixed
- Final pass: `…that dependency is its Y.` (valibot `getDotPath`) -- fixed
- Final pass: AD-24 `Pass-through kinds … are avoided as weak validation` (test schemas) -- fixed (labelled deliberate)
- Not read by any reviewer: the final-pass fixes above, and the nested-proxy row.

## Verification

**Commands:**
- `pnpm vitest run packages/design` -- expected: green
- `pnpm check && pnpm test` -- expected: green
- Toggled bug for each of the copy, the no-op check and the schema check: remove the line, see a row go red, restore it.
