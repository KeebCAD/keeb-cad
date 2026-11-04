---
title: 'The code follows AGENTS.md''s rules'
type: 'refactor'
ticket: '12'
created: '2026-11-04'
status: 'done'
baseline_revision: 'a1718358072bd440ec97a8ca44810fe111707e7b'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** AGENTS.md's code layout and test rules (13124c4) bind only by prose: `di`, `editor` and `app` predate them, and nothing stops a later story from breaking the checkable ones.

**Approach:** Add three lint rules to the root ESLint config as `no-restricted-syntax` selectors (types only in a folder's `types.ts`, entry files only re-export, no mutable state at module level in a spec), prove each with a violation fixture linted through the real config, and bring `di`, `editor` and `app` into line with every AGENTS.md layout and test rule. Record what the lint caught in 23.2's rebuild that prose had not.

## Boundaries & Constraints

**Always:**
- Rules are `no-restricted-syntax` selectors in `eslint.config.ts`, one file-scoped config object per rule, each selector with its own message; no plugin. Each rule's spec lints fixture text with the real config (`new ESLint().lintText(code, { filePath })`), so the selectors and file globs are proven together.
- Types rule: in `packages/*/src/**` and `app/src/**` (`.ts`, `.vue`), a `type` alias or `interface` outside `types.ts` is an error; spec files are exempt; a type named in the paired-type list (`Result`, `Option`, each paired with a same-named value) is allowed; a new paired type joins the list.
- Entry rule: in package entry files (`packages/*/src/**/{index,main,worker}.ts`) every top-level statement is `export … from`, `export * from`, or the stub `export {}`.
- Spec-state rule: in `*.spec.ts`, at module level or directly in a `describe` callback: no `let`/`var`, no `vi.fn`/`vi.spyOn` call, no `const` bound to an empty array or object literal or to `new Map/Set/WeakMap/WeakSet/Array`.
- Behaviour unchanged: every existing spec still passes after the moves; `di`'s and `editor`'s public exports keep their names and subpaths.
- `di`, `editor`, `app`: types to `types.ts`; one kind per file (classes, tokens, errors, helpers apart); classes ordered public API first; `di/vue/index.ts`, `editor/src/index.ts` (`mountEditor` → `mount-editor.ts`) and `editor/src/router/index.ts` become re-exports.
- Specs in `di` and `editor` follow AGENTS.md's Tests rules: `editor`'s `App.spec.ts` builds its own router in the test; whole-value assertions; shared assertions written once; each rule tested where it is defined.
- No AD-n or ticket reference anywhere in `packages/*/src` or `app/src`.

**Decision (2026-11-04, Sergii):** the three rules are configured, not written: `no-restricted-syntax` in `eslint.config.ts`, no local plugin. The paired-type exception is a name list.

**Decision (2026-11-04, Sergii):** the entry rule covers package entry files only (`packages/*/src/**`); `app`'s thread entries (`main.ts`, `*.worker.ts`) are exempt. `createMainContainer` folds back into `app/src/main.ts`, which builds the container as the spine says, and `main-container.ts` goes. AGENTS.md's entry-file line gains "package".

**Decision (2026-11-04, Sergii):** "helper functions each get their own file" means one kind per file, grouped by concept: the token functions share one file, and a private helper stays beside the one function that uses it (`disposeInstance` with `disposeSlots`). `result/attempt.ts` stays as built.

**Decision (2026-11-04, Sergii):** `di`'s injection context (`resolverStack`, `chain`) stays module-level: it is the mechanism `inject()` in field initialisers needs and can't be a service of the container it builds. One why-comment says so.

**Never:** No change to the spine, `.dependency-cruiser.mts` rules or any package's public API. No new rule beyond the three. No change to `design`, `schema`, `hashing`, `result`, `model` beyond what a lint rule flags. No rewrite of AGENTS.md beyond the findings note this story owes (that note is input for Sergii, not new rules).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Type in a plain file | `packages/x/src/foo.ts` with `export type A = string` | types rule error | — |
| Type in types.ts | `packages/x/src/types.ts` with the same | no error | — |
| Type in a spec | `packages/x/src/foo.spec.ts` with `type Row = {…}` | no error | — |
| Paired type | `export type Option<T> = …` beside `export const Option = …` | no error | — |
| Interface in a Vue SFC | `<script setup lang="ts">` declaring `interface Props` | error | — |
| Entry with code | `packages/x/src/index.ts` with `export function f() {}` | entry rule error | — |
| Entry with import + local export | `import { a } from './a'; export { a }` | error | — |
| Stub entry | `export {}` | no error | — |
| Module `let` in spec | `let calls = 0` at top level of a spec | spec-state rule error | — |
| Spy in describe | `describe('x', () => { const spy = vi.fn() … })` | error | — |
| Recording in test | `it('…', () => { const calls: string[] = [] })` | no error | — |
| Frozen fixture | top-level `const CASES = [{ a: 1 }] as const` | no error | — |

</frozen-after-approval>

## Code Map

- `eslint.config.ts` -- one workspace config; add three file-scoped config objects setting `no-restricted-syntax`. Nothing else in the config sets that rule, and the entry object (which replaces the types object's options on entry files) still rejects type declarations there. `skipFormatting` stays last. `NODE_FILES` already covers `tooling/**`.
- `tooling/ad10/rules.spec.ts` -- pattern for a tooling spec that proves rules with the real config; root `vitest.config.ts` project `tooling` runs `tooling/**/*.spec.ts` on Node (`violations/**` excluded).
- `tooling/verify-checks.sh` -- rows "lint error" and "type error" write into `packages/model/src/index.ts`, an entry file: "type error" expects the commit allowed, which the entry rule now refuses. Move both rows to a non-entry file (`packages/model/src/verify-broken.ts`); run the script after.
- `packages/di/src/` -- `token.ts` (brand symbols, 5 types, 5 functions), `registration.ts` (2 types + private `RegistrationDefaults`, constant, 2 classes), `bindings.ts` (`Slot`, `StoredEntry`, `Bindings`, `disposeSlots`, `disposeInstance`), `inject.ts` (`Resolver`, module-level `resolverStack`/`chain`, `inject`, context helpers), `injector.ts` (`Injector`, `InjectorToken`, `createInjector`), `module.ts` (`Module` only → `types.ts`), `errors.ts` (`CannotOverrideReason` + 9 error classes), `container.ts`/`scope.ts` (private methods above public API). `index.ts` is already re-exports only. `vue/index.ts` holds `InjectorKey` and four functions → own files plus `vue/types.ts` if needed.
- `packages/di/package.json` -- exports `.` and `./vue`; paths unchanged.
- `packages/editor/src/index.ts` -- `mountEditor` → `mount-editor.ts`; `router/index.ts` builds the router at module level and `App.spec.ts` imports and pushes that singleton. Turn it into a `createEditorRouter()` factory file used by `mountEditor` and the spec.
- `app/src/main.ts` -- awaits `createMainContainer()` (from `main-container.ts`) then mounts; inline it per the decision. `app/src/{model,case,routing}.worker.ts` -- `// … (AD-11)` header comments: drop the tags (the three remaining AD refs; schema's inline types were already moved by 23.2, so the ticket's 2026-11-03 counts are stale).
- Spec audit (di + editor, ~85 lines): narrowing in `container.spec.ts:176,260,460`, `errors.spec.ts:18-65`, `registration.spec.ts:22-75`, `scope.spec.ts:60`, `injector.spec.ts:56`, `inject.spec.ts:80-91` (try/catch + `let captured`); repeated `CannotOverrideError` pairs `container.spec.ts:467-511`; duplicated root component `vue/vue.spec.ts:29,53,86`; `makeContainer` hidden `InjectorToken` resolve `vue.spec.ts:11`; cycle detection retested in `container.spec.ts:154-178` (defined in `inject.ts`, tested in `inject.spec.ts`); Scoped-outside-scope tested in `injector.spec.ts:39` and `scope.spec.ts:42` (defined in `container.ts`).
- Do not touch `design`, `schema`, `hashing`, `result`: built under the rules; only fix what the lint flags there.

## Tasks & Acceptance

**Execution:**
- [x] `eslint.config.ts` -- three `no-restricted-syntax` config objects scoped as in Boundaries.
- [x] `tooling/lint/*.spec.ts` -- one spec per rule: every I/O row, linted through the real config with fixture `filePath`s and asserting the rule's message.
- [x] `packages/di/src/` -- types into `types.ts`; split `token.ts`, `registration.ts`, `bindings.ts`, `inject.ts`, `injector.ts`, `errors.ts` per one-kind-per-file; reorder `Container`, `Scope`, `RegistrationOptions` public first; `vue/` into files with `vue/index.ts` re-exporting; drop restating comments.
- [x] `packages/di/src/**/*.spec.ts` -- the audit's fixes; imports follow the moves.
- [x] `packages/editor/src/` -- `mount-editor.ts`, router factory file, `index.ts` and `router/index.ts` re-export only; `App.spec.ts` builds its own router and awaits navigation.
- [x] `app/src/` -- worker header tags dropped; `createMainContainer`'s body inlined into `main.ts`, `main-container.ts` deleted.
- [x] `AGENTS.md` -- "Make entry files" → "Make package entry files".
- [x] `tooling/verify-checks.sh` -- rows off the entry file.
- [x] `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-code-follows-agents-md-s-rules-findings.md` -- what the three rules flagged in 23.2's rebuild (`design`, `schema`, `hashing`, `model`, `result`) that review had not, with file:line, and any rule wording the lint had to interpret.

**Acceptance Criteria:**
- Given the workspace, when `pnpm check` runs, then it passes with the three rules on.
- Given each rule's spec, when it runs, then every violation fixture fails that rule and every allowed fixture passes.
- Given `grep -rnE 'AD-[0-9]+' packages/*/src app/src`, then no output.
- Given `sh tooling/verify-checks.sh`, then every row passes.

## Implementation Notes

- `di` layout: `types.ts` holds every type; `token-brands.ts`, `token.ts` (the five token functions plus private `isClassConstructor`), `registration-{builder,options,defaults}.ts`, `slot.ts`, `stored-entry.ts`, `bindings.ts`, `disposal.ts`, `inject.ts` (injection context plus its why-comment), `injector-token.ts`, `create-injector.ts`, one file per error class in `errors/` (with `errors/types.ts`, `override-messages.ts`, `describe-value.ts`), `vue/{injector-key,provide-injector,use-injector,use-service}.ts`. Public exports and subpaths unchanged.
- Spec audit: error pairs and try/catch captures became `toThrow(new XError(…))`, which in Vitest 5 compares name, message and own props. `errors.spec.ts` asserts whole objects with `toMatchObject` and gains a `CannotOverrideError` case. The Scoped-outside-scope test moved from `scope.spec.ts` to `container.spec.ts`, and `injector-token.spec.ts`'s copy was dropped. The two cycle tests in `container.spec.ts` merged into one, and so did the two registration-defaults tests. `di` tests went from 96 to 95: two merged duplicates out, one new error case in; review pass 1 restored the Injector-path Scoped test.

## Plan Change Log

- `tooling/verify-checks.sh`: the "AD-10 break" row also wrote into an entry file (`plates/src/index.ts`). The hook runs lint before depcruise, so the entry rule would have hidden depcruise's rule name. Moved to `plates/src/verify-broken.ts`.
- `tooling/ad10/rules.spec.ts`: the spec-state rule flagged its module-level `let generated` memo, now a `const` promise. Its "real editor" probe read the `vue` import from `editor/src/index.ts` and now reads `editor/src/mount-editor.ts`.
- `disposeInstance` is used by `Slot.dispose`, not `disposeSlots` as the decision assumed. It sits beside `disposeSlots` in `disposal.ts`, exported for `Slot`.
- `app` worker headers: only the `(AD-n)` tags were dropped; the one-line comments stay.

## Review Triage Log

Pass 1 (quick): high 0, medium 1, low 10, false 0, maybe-false 0; 8 patched, 3 rejected.

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | Bare `vi.spyOn(…)` statement at module/describe level passes the spy selector | medium | patch | Real: the selector requires a `VariableDeclaration` ancestor; Boundaries says "no `vi.fn`/`vi.spyOn` call" at those levels, and a bare module-level `spyOn` is the commonest shared spy. Match `ExpressionStatement` too, plus a fixture. |
| 2 | Exported `let`/empty `const`/spy in a spec passes (parent is `ExportNamedDeclaration`) | low | patch | Real: `inSpecScope` anchors on `Program >`. Direct correction: one more scope, one fixture. |
| 3 | The spy exemption `:not(VariableDeclaration :function CallExpression)` checks every ancestor, so a describe wrapped in a `const` function exempts its spies | low | reject | Real but unlikely (a describe built inside a helper const); the fix needs a scoped exemption, more selector complexity. |
| 4 | `errors.spec.ts` omits `message` for three errors | low | patch | Real: `toThrow(new XError())` elsewhere builds the expected text from the same code, so these messages are unasserted. |
| 5 | Class-only `toThrow(XError)` checks remain in `di` specs | low | patch | Real: 13 sites listed (grep confirmed); the plan's "whole-value assertions" covers them. `AggregateError` and `toBeInstanceOf(Service)` checks left as is. |
| 6 | Injector-from-root Scoped error path lost its test | low | patch | Real: the dropped test went through `createInjector`; the moved `container.spec.ts` test calls `c.resolve` directly. Restored as one test. |
| 7 | `mount-editor.ts` doc comment restates the signature | low | patch | Real: AGENTS.md "no restating a signature"; deleted. |
| 8 | `tooling/lint/restricted-syntax.ts` holds a module-level `ESLint` instance | low | reject | The rule targets state that functions reach for; this is a configured, read-only tool reused so 44 fixture lints don't each reload the config, and nothing mutates it. |
| 9 | `rules.spec.ts` local still named `index` | low | patch | Real: it now holds the `mount-editor.ts` module; renamed. |
| 10 | `verify-checks.sh` helper comment says stubs hold only `export {}` | low | patch | Real: rows now write new `verify-broken.ts` files. The script itself is deferred for replacement. |
| 11 | Each `createEditorRouter()` adds `popstate` listeners that tests never remove | low | reject | Real but harmless with one router test; the fix adds a history parameter or teardown, not a direct correction. |

## Design Notes

**Decision (plan): the spec-state rule** checks declarations, not mutation: `let`/`var`, spy factories, and empty containers at module or `describe` level are the shapes shared recordings take; a non-empty `as const` table is a fixture.

## Verification

**Commands:**
- `pnpm install && pnpm check` -- expected: all steps pass.
- `pnpm vitest run --project tooling` -- expected: the three rule specs and the AD-10 spec pass.
- `pnpm vitest run --project di packages/di packages/editor` -- expected: all pass, same test count as baseline or with only merged duplicates removed.
- `sh tooling/verify-checks.sh` -- expected: every row PASS.
- `grep -rnE 'AD-[0-9]+' packages/*/src app/src` -- expected: no output.
