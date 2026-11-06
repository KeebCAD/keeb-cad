<!-- bmad:context -->
<!-- Verified 2026-10-31 against 3ec614edf7198d44c31d38e0001dad091c3a7e78. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## keeb-cad

Browser CAD for split keyboards: layout to plates, PCB, case and firmware, all client-side. TypeScript, Vue 3, pnpm workspace, Node from `mise.toml`. Planning lives in `_bmad-output/initiative-keeb-cad-m1/` (initiative, tickets); AD-n refers to the architecture spine.

## Policy

- Commit docs-only changes straight to main; put any code change on a branch and open a PR. Customization of BMad skills and agents (`_bmad/custom/`) also goes straight to main, once the skill still renders (`_bmad/scripts/render_skill.py` for a workflow, `resolve_customization.py` for an agent); hooks, `.claude/settings.json` and `tooling/` stay on a branch.
- Before merging a PR, review every change under `packages/`, `app/`, `fixtures/` or `tooling/` made after its last review pass: run `bmad-build`'s review lenses (quick, plus test-reviewer when a spec changed) on the diff since that pass, and record the triage in the plan's Review Triage Log. A change that touches only docs, or a rebase, needs no pass.
- Add or change a design-file field, schema or shared kind only after the spine's Data Schema section defines it; if it doesn't, stop and ask.
- Give every decision its rejected alternative: "X, not Y, because Z". This covers a plan's `Decision (plan):` entries, a spine sentence that chooses between options, and the decisions you list at the end of a task. A choice no requirement made is a decision and is labelled as one. When a decision builds by hand the main job of a dependency in the spine's Stack table, that dependency is its Y.

## Where things are

- Architecture spine (AD-1 to AD-26): `_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md`
- Which story owns which component: `_bmad-output/initiative-keeb-cad-m1/component-ownership.md`
- Package import rules (AD-10, AD-25): the `GRAPH` table in `.dependency-cruiser.mts` generates one rule per package; `tooling/ad10/rules.spec.ts` proves those from the table, and the subpath, entry-fence, kernel and npm rules from the hand-written fixtures in `tooling/ad10/violations/`

## Conventions that differ from defaults

- Run DOM tests in Vitest browser mode (Chromium and Firefox, `packages/editor/vitest.config.ts`) with vitest-browser-vue; never add jsdom or @vue/test-utils.
- Put code in the package that owns the concept, never in `model` just because every package can reach it; shared pure logic goes in a cohesive kernel package, one concept per package (as `reactive` and `geometry` are).
- Commit messages: Conventional Commits, an imperative subject of about 72 characters or fewer (`docs: add …`), details in the body. Don't copy the long third-person, single-line subjects in the history.

## Known pitfalls

- Upgrade Vue by editing the `&vue` line in `pnpm-workspace.yaml`. `pnpm update vue@x` and `pnpm add --save-catalog vue@x` write a literal version over `catalog:`, install a second `@vue/reactivity` and fail `tooling/vue-reactivity.spec.ts`.

<!-- /bmad:context -->

## Code layout

- Put every type a folder declares, private ones included, in that folder's `types.ts`; spec files may declare their own. A type that pairs with a same-named value (`Result`, `Option`) stays in that value's file, since TypeScript merges the pair only within one file.
- Give each file one kind of thing: a class file holds only its class; tokens, errors and `define*` factories each get their own file; helpers over one concept share a file named for it (`token.ts`), and a new concept gets a new file.
- Give each command or action three files in its concept folder: the class (`rename-design.ts`), its input schema as `renameDesignInputSchema` (`rename-design-input-schema.ts`), and `type RenameDesignInput = v.InferOutput<typeof renameDesignInputSchema>` in the folder's `types.ts`. The class's static `input` points at the schema; `implements` and `apply` use the type. Types flow out of a schema file, never in: it imports nothing from `types.ts`. An entry that takes no input skips both and uses `commands`' shared `emptyInputSchema` and `EmptyInput`.
- Make package entry files (`index.ts`, `main.ts`, `worker.ts`) only re-export; code lives in a file named for what it does.
- Order a class top-down: public API first, private details below.
- Hold state in `di` services, never in a module-level singleton that functions reach for.
- Write a comment only for a why the code can't say. No AD-n or ticket references, no restating a signature, no file-header essays.
- Name a thing for what it does, checked against the spine's glossary; never after the library it wraps.

## Tests

- Keep no mutable state at module level in a spec; create spies and recordings inside the test.
- Arrange only what the test uses, passed as arguments to an `arrange` helper; write one only when a test has something to build.
- Build schema values the test doesn't read with the concept's test builder (`schema/testing`: `aDesign({ layout })`), never a copied literal; a new schema concept ships its builder in the same PR. Write out only the data the test is about (the spine's Test builders row).
- Arrange only a state real commands could reach; it need not be built through them.
- Start recording after arrange; a helper never takes a hidden step the assertions depend on.
- Assert relative to the arranged state, never a number a helper's hidden steps produced.
- Write a shared assertion once; assert whole values (`toEqual`, `toMatchObject`) instead of narrowing in the test.
- Use `@ts-expect-error` only in a type-only test; test a runtime check with a value the types accept.
- Test a rule where it is defined; a package that uses it tests only its own part.
- Take expected values from the requirement (the ticket, the plan's boundary table), never from running the code. When nothing says what a boundary returns, ask.
- Give every threshold three rows: just below, on, just above; add empty input and an input that breaks an assumption. "Valid" or "correct" without a number is a question, not a spec. Ask which combinations matter instead of enumerating them.
- End every task with the decisions you made on your own (limits, rounding, ordering, defaults, error handling), each in the Policy section's "X, not Y, because Z" form.
- Make a test's name and its `expect`s claim the same thing. Name the boundary's role ("on the clearance limit"); numbers go in parameters or `expected*` constants.
- Give every test an `expect` that fails when the behaviour breaks. No `if` or loop around `expect`, no expected value computed the way production computes it, except by calling a function the requirement names and that has unit tests of its own (`revision: hash(design)`); `it.each` is the only repetition. Assert a throw as `expect(() => fn()).toThrow(…)`.
- Assert what a function returns or a visible effect; use `toHaveBeenCalled*` only when the call is the behaviour.
- Substitute through `di`: register a fake for state or a boundary in the container, never `vi.mock`. Set time with Vitest's fake timers; never register a clock only so tests can control it. Exports read no clock at all.
- Test calculations as units in the package that owns them (a stage gets the outputs it reads as inputs); test wiring between packages as integration in `pipeline` or `app`.
- Assert data explicitly, never with snapshots. A person approves every screenshot baseline; an agent never updates a baseline or a snapshot.
- Find elements by role, then label, then text. `getByTestId` and `data-testid` are a last resort, behind `eslint-disable-next-line … -- <reason>`.
- Write an end-to-end test only for an action that is irreversible, costs the user material or work, or crosses a boundary no lower level can fake. It covers the normal flow; error flows stay lower.
- The priority packages are `pcb`, `plates`, `case`, `exports`, `design-file` and `storage`: a mistake there costs a fab order, a print or a user's work. Stryker mutates only their pure files; code that needs a browser or I/O stays out and is proven by a toggled bug. After changing their pure logic, run Stryker on the changed files and give every survivor a verdict: a test gap (add the boundary row), a boundary the implementation introduced (list it as your decision), or an equivalent mutant (prove it and propose a point-wise exclusion for a person to confirm).
- Prove a test Stryker can't reach (browser mode, integration) with a toggled bug: break the code, watch the test go red, restore it, and say so in the PR.
- Only Sonnet-class models or stronger write tests here.
- Before saying done after changing code under `packages/`, `app/`, `fixtures/` or `tooling/` (the files the stop hook watches), run the whole suite (`pnpm test`), not only the files you touched. A change elsewhere needs no suite run; a workflow change is proven by its own CI run.
- Never delete, skip or weaken a failing test, raise a timeout without naming the cause, edit runner or mutation config to get green, bypass hooks (`--no-verify`) or force push; report instead. Never change the code under test when asked for tests, or the tests when asked to implement against them.
