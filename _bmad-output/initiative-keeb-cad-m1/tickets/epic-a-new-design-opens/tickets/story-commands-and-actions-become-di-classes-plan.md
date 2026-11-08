---
title: 'Commands and actions become di classes'
type: 'refactor'
ticket: '15'
created: '2026-11-05'
status: done
baseline_revision: '233d99e63adba9aa25639cef46b8a1fbe3f2831b'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 1
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 2 defines entries as plain objects (`defineCommand`, `defineAction`); the spine (AD-2, 2026-11-05) makes every entry a `di` class whose statics are its handle, and actions cannot run at all yet, so story 3's `NewDesign` has nothing to plug into.

**Approach:** In `design`, replace the define functions with the instance interfaces `Command<Input>` and `Action<Input, E>`, the class-side `CommandHandle` and `ActionHandle`, and `registerCommand`/`registerAction`; the store resolves an entry's instance lazily through `InjectorToken` and `run(handle, input)` runs both kinds. Story 2's test commands become classes; the specs add test actions.

## Boundaries & Constraints

**Always:**
- `Command<Input>`: `available(design: Frozen<Design>): boolean`, `apply(draft: Writable<Design>, input: Input): void | Rejection`. `Action<Input, E>`: `available(current: Option<Committed>): boolean`, `apply(input: Input): AsyncResult<void, E>`. Both are required methods, checked by `implements`.
- `CommandHandle` / `ActionHandle`: `static readonly kind` (`'command'` / `'action'`), `id`, `label` (`string`), `input` (a Valibot schema), and a no-argument constructor returning the instance interface.
- `registerCommand(container, Handle)` / `registerAction(container, Handle)`: register `Handle` as its own token with `useClass` (container lifetime, not eager) and add the class itself to `commands` (`MultiToken<CommandHandle>`) / `actions` (`MultiToken<ActionHandle>`). Their signature refuses to compile unless `apply`'s input type and `v.InferOutput<typeof Handle.input>` are mutually assignable.
- `DesignStore` injects both multi tokens and `InjectorToken`; refuses a duplicate id across both tokens at construction from the statics (`DuplicateCommandIdError`, unchanged); constructs no entry at startup; resolves an entry's instance through the injector the first time it reads its availability or runs it.
- `run(handle, input)` takes `v.InferInput<Handle['input']>` and branches on `handle.kind` with ts-pattern `match`. Both kinds throw `InvariantError` for a handle not in its multi token. Order for both: availability → `unavailable`; parse → `input-invalid` (with `command: handle.id`); apply.
  - Command: unchanged from story 2 (needs a loaded design, else `InvariantError`; patcher, `checkStructure`, one write, commit event); returns `Result<void, Rejection>`.
  - Action: needs no design; `available` gets `store.current`; returns `AsyncResult<void, E | Rejection>`, `E` taken from the instance's `apply`; refusals resolve as err without calling `apply`.
- AGENTS.md code layout and test rules; specs on Node.

**Decision (2026-11-05, Sergii, review):** the input check stays strict: an `apply` that leaves out its input parameter is refused like any mismatch, so an entry with an empty schema declares it (`apply(_input: {})` or `apply(_draft, _input: {})`).

**Decision (2026-11-05, Sergii, review, corrected):** lint refused an unused `_input` outside `result`, so `@typescript-eslint/no-unused-vars` takes `argsIgnorePattern: '^_'` for entry classes too: `packages/commands/src/**` and `design`'s specs, with a lint spec in `tooling/lint`.

**Never:** No real entry in `commands`, no `NewDesign`, no store method for labels or availability, no undo, no change to `replaceDesign`, `DesignPatcher`, `Rejection` or any schema. No default `available`. No base class for entries. No `vi.mock`; arrange registers through `registerCommand`/`registerAction`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Story 2's command rows | test command classes (rename, setForm, refuse, locked) | each row's story 2 outcome unchanged | as story 2 |
| Action, no design | test load action, nothing loaded, valid input | resolves ok; `store.current` holds the design it handed to `replaceDesign` | — |
| Action input invalid | load action, input its schema refuses | resolves err `input-invalid`, `command` = its id, plain issue paths; apply not called | — |
| Action unavailable | action whose `available` returns false | resolves err `{ kind: 'unavailable', command: id }`; apply not called | — |
| Action not registered | action class never registered | `run` throws `InvariantError` | throws |
| Action injects store | load action has `inject(DesignStore)` | runs, no `CircularDependencyError` | — |
| Duplicate across kinds | command and action sharing one id | `autoLoad()` rejects with `DuplicateCommandIdError` | throws |

</frozen-after-approval>

## Code Map

- `packages/design/src/entries/` -- `define-command.ts`, `define-action.ts`, `always-available.ts`, `define-command.spec.ts` are deleted; `types.ts` holds `CommandDefinition`/`ActionDefinition`/`*Spec` (replace with the four interfaces plus any helper type such as an action's error type); `tokens.ts` retypes to `MultiToken<CommandHandle>` / `MultiToken<ActionHandle>`. Keep the existing comment's point: methods, not function properties, so a narrower input still fits the token's element type (method bivariance) — which is also why the register signature needs an explicit two-way check.
- `packages/design/src/store/design-store.ts` -- `run` today takes `CommandDefinition`, checks `#commands.includes`, calls `command.available`/`command.apply` on the definition. Keep `#committed`, `#write`, `replaceDesign`, events. `Committed` is in `store/types.ts`; `entries/types.ts` may import it.
- `packages/design/src/store/design-store.spec.ts` -- `arrange` uses `register(commands).useValue(entry)`; switch to the register functions. Its helpers (`recordCommits`, `committed`, `expectNothingCommitted`) stay.
- `packages/design/src/index.ts` -- drop `defineCommand`, `defineAction`, `*Definition`, `*Spec`; export `registerCommand`, `registerAction`, types `Command`, `Action`, `CommandHandle`, `ActionHandle`.
- `packages/design/package.json` -- add `ts-pattern: catalog:` (already in the catalog, used by `di`).
- `packages/di/src/` -- `InjectorToken` (transient; `createInjector(currentResolver() ?? container)`), `Injector.resolve`, `Class<T>`, `Container.register(token).useClass(C)`; default lifetime `Container`, `eager: false`. Multi tokens resolve to `[]` when empty. Do not change `di`.
- `packages/result/src/async-result.ts` -- `AsyncResult.ok()`, `.err(e)`, `.fromResult(r)`; it is `PromiseLike<Result>`, so specs `await` it and use `expectOk`/`expectErr` from `@keeb-cad/result/testing`.
- `packages/schema/src/frozen.spec.ts` -- the type-only test pattern: `// @ts-expect-error <why>` inside a function, then `expectTypeOf(fn).toBeFunction()`.
- No uses outside `design` (grep: `app`, `editor`, `commands` don't reference the define functions). `packages/design/dist/` is untracked build output; ignore it.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/design/src/entries/types.ts` -- `Command`, `Action`, `CommandHandle`, `ActionHandle` (+ helper types) -- the spine's entry interfaces.
- [ ] `packages/design/src/entries/register-command.ts`, `register-action.ts` -- one function each, with the two-way input check -- AGENTS.md one kind per file.
- [ ] `packages/design/src/entries/tokens.ts` -- retype the multi tokens.
- [ ] `packages/design/src/entries/{define-command,define-action,always-available}.ts`, `define-command.spec.ts` -- delete.
- [ ] `packages/design/src/entries/register-command.spec.ts`, `register-action.spec.ts` -- type-only tests for the boundary rows below (literal id, input check, `run` refuses a wrong input type).
- [ ] `packages/design/src/store/design-store.ts` -- `InjectorToken`, lazy instance resolution, `run` overloads for both kinds.
- [ ] `packages/design/src/store/design-store.spec.ts` -- test command classes, test actions, every I/O row and every runtime boundary row; records start after arrange.
- [ ] `packages/design/src/index.ts`, `packages/design/package.json` -- exports, `ts-pattern` dep.

**Acceptance Criteria:**
- Given the workspace, when `pnpm check` runs, then it passes.
- Given `grep -rn "defineCommand\|defineAction" packages app --include='*.ts' --include='*.vue'` excluding `dist` and `node_modules`, then no output.

## Boundary Table

| Group | Boundary | Input | Expected | Level |
|-------|----------|-------|----------|-------|
| rules | input check: exact | apply input `{ name: string }`, schema `v.object({ name: v.string() })` | `registerCommand` compiles | unit (type) |
| rules | input check: apply narrower | apply input `{ name: string; extra: string }`, same schema | compile error | unit (type) |
| rules | input check: apply disagrees | apply input `{ name: number }`, same schema | compile error | unit (type) |
| rules | input check: apply omits its input | `apply()` (action) / `apply(draft)` (command), schema `v.object({})` | compile error | unit (type) |
| rules | same three rows for `registerAction` | as above, action classes | compiles / error / error | unit (type) |
| rules | `run` input type | action with `v.object({ name: v.string() })`, `run(A, { name: 1 })` | compile error | unit (type) |
| rules | id literal | `static readonly id = 'test.rename'` | `typeof Rename.id` is `'test.rename'` | unit (type) |
| rules | duplicate ids: distinct | command `test.a`, action `test.b` | `autoLoad()` resolves | unit |
| rules | duplicate ids: across kinds | command and action both `test.a` | rejects `DuplicateCommandIdError(['test.a'])` | unit |
| rules | duplicate ids: two commands | two command classes both `test.a` | rejects `DuplicateCommandIdError(['test.a'])` | unit |
| module boundaries | lazy construction: 0 runs | registered entry, after `autoLoad()` | constructed 0 times | unit |
| module boundaries | lazy construction: 1 run | one `run` | constructed 1 time | unit |
| module boundaries | lazy construction: 2 runs | two `run`s of one entry | constructed 1 time | unit |
| module boundaries | action availability with no design | `available` sees `store.current` | receives `Option.none()` before any load | unit |

## Implementation Notes

## Plan Change Log

- 2026-11-05 (Sergii): type-only specs run in `pnpm test` through a `<package> types` Vitest project per `tsconfig.vitest.json` (vue-tsc), because `expectTypeOf(fn).toBeFunction()` beside a `@ts-expect-error` could not fail there. Rows that need `@ts-expect-error` are dropped as edge cases: "id literal" and "`run` input type". The register rows assert the parameter type with `expectTypeOf`.

## Review Triage Log

Pass 1 (quick, test-reviewer): high 0, medium 1, low 8, false 2, maybe-false 0; one intent gap. Sergii settled it (strict check, then, after the lint premise in the question proved wrong, strict plus a lint exception for entry parameters); the code already matched, so it was not reverted. Patches 3, 4, 5, 7, 8, 9, 11 applied by the implementer; the lint exception, its spec and the test entries' `_input` parameters applied in this session; `pnpm check` green (637 tests).

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | An `apply` that omits its input parameter is refused (`Parameters[…]` is `undefined`, `Same<undefined, {}>` false); with lint banning an unused `_input`, every entry must declare and use its input | medium | intent_gap | Real: `InputCheck` in `entries/types.ts`; the spec's `entryCommand`/`entryAction` pass only because they are widened. The frozen intent says "exactly v.InferOutput" and does not say whether an omitted parameter counts; story 3's `NewDesign` may have an empty input. |
| 2 | A handle typed as plain `CommandHandle`/`ActionHandle` (or `apply(draft, input: any)`) passes the input check | low | reject | Real but only the spec's widened `arrange` arrays reach it; `commands`' modules pass concrete classes. Fixing it means generic arrange plumbing, more than a direct correction. |
| 3 | `keeps the command id literal` asserts TypeScript's own `static readonly` inference on a bare class, under `describe('registerCommand')` | low | patch | Real: no production type in the test. Rewrite against a full handle class that `registerCommand` accepts. |
| 4 | `lets run refuse an input of the wrong type` lives in `register-action.spec.ts`, not beside `run`; no command overload row; `ActionError` inference untested | low | patch | Real: rule defined in `design-store.ts`. Move to a type-only spec beside the store with both overloads and an `expectTypeOf` on the action's return type. |
| 5 | Availability test's name claims "the current design" but asserts only `Option.none()`; its `apply` calls `replaceDesign` for nothing | low | patch | Real: rename to the none case; apply returns `AsyncResult.ok()`. |
| 6 | `seq: 1` and `revision: hash(value)` in the action test are unstated / computed the production way | false | reject | Story 2's frozen rules define revision as `hash(design)` and seq as + 1 from none; the existing `replaceDesign` test asserts the same. |
| 7 | An unregistered action throws `Command "test.load" is not registered.` | low | patch | Real: glossary keeps command and action distinct. Message names the kind; test asserts it. |
| 8 | Lazy-construction rows cover commands only | medium | patch | Real: `#runAction` resolves on its own path. Add the three rows for an action. |
| 9 | The availability-before-parse order is untested for both kinds | low | patch | Real: swapping the steps leaves every test green. Add a row per kind: unavailable and invalid input → `unavailable`. |
| 10 | Action input-invalid test doesn't observe that `apply` didn't run | false | reject | `Load.apply` commits via `replaceDesign`; `expectNothingCommitted` asserts no write and no event. |
| 11 | Action input-invalid issue message is `expect.any(String)` although the schema fixes `'A design to load.'` | low | patch | Real: assert the whole value. |

## Design Notes

**Decision (plan): order.** Both kinds check availability before parsing, as story 2's commands do; an action both unavailable and given bad input resolves `unavailable`.

**Decision (plan): `apply` throwing or its promise rejecting** is a bug: it escapes `run` (a throw) or rejects the `AsyncResult`'s promise; the store doesn't catch it.

**Decision (plan): mutual assignability** for the input check, because the ticket says the input must *be* `v.InferOutput` of the schema; a wider `apply` input (`unknown`) is refused too.

**Decision (plan): `available` is required** on both interfaces (the spine names it as part of the instance); the default from story 2 goes.

Sketch of a test action that injects the store (the shape `NewDesign` takes in story 3):

```ts
class Load implements Action<{ design: unknown }, DesignInvalid> {
  static readonly kind = 'action'
  static readonly id = 'test.load'
  static readonly label = 'Load'
  static readonly input = v.object({ design: v.unknown() })
  readonly #store = inject(DesignStore)
  available() { return true }
  apply(input: { design: unknown }) { return AsyncResult.fromResult(this.#store.replaceDesign(input.design)) }
}
```

A constructed-count spy is a closure counter created inside the test, never at module level.

## Verification

**Commands:**
- `pnpm vitest run packages/design` -- expected: all pass.
- `pnpm typecheck` -- expected: passes, so every `@ts-expect-error` is used.
- `pnpm test` -- expected: whole suite passes.
- `pnpm check` -- expected: passes.
- `grep -rn "defineCommand\|defineAction" packages app --include='*.ts' --include='*.vue' | grep -v '/dist/\|node_modules'` -- expected: no output.
