<!-- bmad:context -->
<!-- Verified 2026-10-31 against 3ec614edf7198d44c31d38e0001dad091c3a7e78. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## keeb-cad

Browser CAD for split keyboards: layout to plates, PCB, case and firmware, all client-side. TypeScript, Vue 3, pnpm workspace, Node from `mise.toml`. Planning lives in `_bmad-output/initiative-keeb-cad-m1/` (initiative, tickets); AD-n refers to the architecture spine.

## Policy

- Commit docs-only changes straight to main; put any code change on a branch and open a PR.

## Where things are

- Architecture spine (AD-1 to AD-26): `_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md`
- Which story owns which component: `_bmad-output/initiative-keeb-cad-m1/component-ownership.md`
- Package import rules (AD-10): `.dependency-cruiser.mts`, proven by the violation tree in `tooling/ad10/`

## Running and verifying

- After changing `pnpm check`, `lefthook.yml`, CI or `.dependency-cruiser.mts`, run `sh tooling/verify-checks.sh`; the rule names it expects go stale with no test failing.

## Conventions that differ from defaults

- Run DOM tests in Vitest browser mode (Chromium and Firefox, `app/vitest.config.ts`) with vitest-browser-vue; never add jsdom or @vue/test-utils.
- Put code in the package that owns the concept, never in `model` just because every package can reach it; shared pure logic goes in a cohesive kernel package, one concept per package (as `reactive` and `geometry` are).
- Commit messages: Conventional Commits, an imperative subject of about 72 characters or fewer (`docs: add …`), details in the body. Don't copy the long third-person, single-line subjects in the history.

## Known pitfalls

- Upgrade Vue by editing the `&vue` line in `pnpm-workspace.yaml`. `pnpm update vue@x` and `pnpm add --save-catalog vue@x` write a literal version over `catalog:`, install a second `@vue/reactivity` and fail `tooling/vue-reactivity.spec.ts`.

<!-- /bmad:context -->
