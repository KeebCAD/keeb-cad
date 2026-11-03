<!-- bmad:context -->
<!-- Verified 2026-10-31 against 3ec614edf7198d44c31d38e0001dad091c3a7e78. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## keeb-cad

Browser CAD for split keyboards: layout to plates, PCB, case and firmware, all client-side. TypeScript, Vue 3, pnpm workspace, Node from `mise.toml`. Planning lives in `_bmad-output/initiative-keeb-cad-m1/` (initiative, tickets); AD-n refers to the architecture spine.

## Policy

- Commit docs-only changes straight to main; put any code change on a branch and open a PR.
- Add or change a design-file field, schema or shared kind only after the spine's Data Schema section defines it; if it doesn't, stop and ask.

## Where things are

- Architecture spine (AD-1 to AD-26): `_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md`
- Which story owns which component: `_bmad-output/initiative-keeb-cad-m1/component-ownership.md`
- Package import rules (AD-10, AD-25): the `GRAPH` table in `.dependency-cruiser.mts` generates one rule per package; `tooling/ad10/rules.spec.ts` proves those from the table, and the subpath, entry-fence, kernel and npm rules from the hand-written fixtures in `tooling/ad10/violations/`

## Running and verifying

- After changing `pnpm check`, `lefthook.yml`, CI or `.dependency-cruiser.mts`, run `sh tooling/verify-checks.sh`; the rule names it expects go stale with no test failing.

## Conventions that differ from defaults

- Run DOM tests in Vitest browser mode (Chromium and Firefox, `packages/editor/vitest.config.ts`) with vitest-browser-vue; never add jsdom or @vue/test-utils.
- Put code in the package that owns the concept, never in `model` just because every package can reach it; shared pure logic goes in a cohesive kernel package, one concept per package (as `reactive` and `geometry` are).
- Commit messages: Conventional Commits, an imperative subject of about 72 characters or fewer (`docs: add …`), details in the body. Don't copy the long third-person, single-line subjects in the history.

## Known pitfalls

- Upgrade Vue by editing the `&vue` line in `pnpm-workspace.yaml`. `pnpm update vue@x` and `pnpm add --save-catalog vue@x` write a literal version over `catalog:`, install a second `@vue/reactivity` and fail `tooling/vue-reactivity.spec.ts`.

<!-- /bmad:context -->

## Code layout

- Put every type a folder declares, private ones included, in that folder's `types.ts`; spec files may declare their own.
- Give each file one kind of thing: a class file holds only its class; tokens, errors, `define*` factories and helper functions each get their own file.
- Make entry files (`index.ts`, `main.ts`, `worker.ts`) only re-export; code lives in a file named for what it does.
- Order a class top-down: public API first, private details below.
- Hold state in `di` services, never in a module-level singleton that functions reach for.
- Write a comment only for a why the code can't say. No AD-n or ticket references, no restating a signature, no file-header essays.
- Name a thing for what it does, checked against the spine's glossary; never after the library it wraps.

## Tests

- Keep no mutable state at module level in a spec; create spies and recordings inside the test.
- Arrange only what the test uses, passed as arguments to an `arrange` helper; write one only when a test has something to build.
- Start recording after arrange; a helper never takes a hidden step the assertions depend on.
- Assert relative to the arranged state, never a number a helper's hidden steps produced.
- Write a shared assertion once; assert whole values (`toEqual`, `toMatchObject`) instead of narrowing in the test.
- Use `@ts-expect-error` only in a type-only test; test a runtime check with a value the types accept.
- Test a rule where it is defined; a package that uses it tests only its own part.
