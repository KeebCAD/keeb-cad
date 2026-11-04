# Findings: the code follows AGENTS.md's rules

Input for Sergii, not new rules. Linted at the plan's baseline (`a171835`) with the three rules
on.

## What the rules flagged in 23.2's rebuild

Nothing. `design`, `schema`, `hashing`, `model` and `result` gave zero `no-restricted-syntax`
errors. Each one already keeps its types in a `types.ts`, has entry files that only re-export
(`model/src/index.ts` is the `export {}` stub), and has specs with no module-level or
describe-level `let`, spies or empty containers. So the lint caught nothing that review had
missed there. Code written after the prose rules (13124c4) already followed the checkable ones.

## What they flagged elsewhere (all fixed in this story)

- `tooling/ad10/rules.spec.ts:102`: a module-level `let generated` memoised the generated-tree
  cruise. It is now a module-level `const` promise, which every use awaits.
- `packages/di/src`: 24 errors. Types sat outside `types.ts` in `token.ts` (6),
  `registration.ts` (3), `errors.ts`, `inject.ts`, `injector.ts` and `module.ts` (1 each), and
  `vue/index.ts` held code (11 statements).
- `packages/editor/src`: `index.ts` (4 statements) and `router/index.ts` (4) held code.

## Wording the lint had to interpret

- **"every type a folder declares"** counts `type` and `interface` declarations only. Inline type
  literals are not declarations, so the rule does not see them, even when they repeat:
  `result`'s `match` handlers `{ ok: …; err: … }` appear three times (`ok.ts:31`, `err.ts:33`,
  `async-result.ts:80`) and `{ some: …; none: … }` twice (`some.ts:22`, `none.ts:22`); `di`'s
  `Bindings.all` row type appears twice (`bindings.ts:33-34`). Classes and enums also declare a
  type, and the rule lets them through (`di`'s `Lifetime`, `result`'s `Ok`/`Some`). Whether a
  repeated inline shape should become a named type in `types.ts` is still a question for you.
- **The paired-type exception** is matched by name only (`PAIRED_TYPES` in `eslint.config.ts`).
  The lint does not check that a same-named value sits beside the type.
- **"Make package entry files only re-export"** allows `export … from`, `export * from`
  (including `export type … from`) and the bare `export {}` stub. A re-export with a comment
  passes, because comments are not statements (`app`'s worker headers would pass, but `app` is
  exempt anyway).
- **"No mutable state at module level in a spec"** is checked by the shape of the declaration,
  not by whether anything mutates it: `let`/`var`, `vi.fn`/`vi.spyOn` and empty
  array/object/`Map`/`Set`/`WeakMap`/`WeakSet`/`Array`. A module-level `const` that holds state
  in some other shape (say `new Container()` or `createThing()`) passes, and so do the
  module-level command fixtures in `design-store.spec.ts:20,29`. A spy inside a helper function
  is allowed, because it is created on each call. "Directly in a describe callback" covers
  `describe(…)`, `describe.x(…)` and `describe.each(…)(…)`.
- **"helper functions each get their own file"**, read as one kind per file with private helpers
  kept beside their user: `disposeInstance` is called by `Slot.dispose`, not by `disposeSlots`.
  Both now sit in `di/src/disposal.ts`, so `disposeInstance` is exported for `Slot`. The rule
  does not check this; it was a hand call.
