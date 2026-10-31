---
title: 'The workspace matches the 2026-10-30 spine'
type: 'chore'
ticket: '9'
created: '2026-10-31'
status: 'built'
baseline_revision: 'c65d55ee05a6cecf9ffe0dcbdc70ad102fa58144'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The workspace predates the 2026-10-30 spine: `reactive`, `geometry` and `ui` don't exist, immer, valibot and ts-inject aren't installed, and the AD-10 dependency-cruiser rules still say model imports nothing and stages import only model, which forbids edges AD-10 now requires.

**Approach:** Scaffold the three packages as empty stubs, add and pin the new dependencies, rewrite the AD-10 rules to match AD-10 as written, and prove each new or rewritten fence with a deliberate violation in `tooling/ad10/violations`.

## Boundaries & Constraints

**Always:**
- `vue` and `@vue/reactivity` are pinned to 3.5.44 in the pnpm catalog, `@vue/reactivity`'s entry a YAML alias of `vue`'s anchor so one number moves both (decided 2026-10-31); the app and `reactive` use `catalog:`. immer `^11.2.9`, valibot `^1.5.0` and `@snap/ts-inject` `^1.2` as caret ranges (decided 2026-10-31: the lockfile stops silent upgrades; the ticket's "pinned exactly" is superseded).
- Every fence has exactly one violation fixture that reports under that rule alone, and every allowed edge the change opens has a fixture proving it is cruised and not reported.
- Each stub package closes its surface with package `exports` and joins the root `tsconfig.json` references.

**Never:**
- No package code beyond an empty `src/index.ts` (story 10 fills the register, story 11 fills `ui`).
- No reka-ui, @zag-js/hotkeys, makerjs, @vueuse/core or @valibot/to-json-schema installed; only their fences.
- No change to the existing rules that already match AD-10 (pipeline-imports-no-storage, nothing-imports-editor, editor-imports-no-stage, fixtures-only-in-tests).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Allowed spine edge | `model` imports `reactive` and `geometry`; `plates` imports `geometry` and `reactive`; `reactive` imports `@vue/reactivity`; `ui` imports `vue` | No violation; the edge is in the cruise result | — |
| Fence crossed | A fixture crosses one new or rewritten fence | Exactly one violation, under that rule | `pnpm depcruise` exits non-zero |
| Second Vue reactivity | Lockfile holds two `@vue/reactivity` versions | The one-copy test fails, naming both | — |
| Anchor dropped | A pnpm rewrite of `pnpm-workspace.yaml` writes two literal versions | The anchor test fails | — |

</frozen-after-approval>

## Code Map

- `.dependency-cruiser.mts` -- the AD-10 rules and exported `ws`, `EDITOR`, `FIXTURES`, `VUE`, `STAGES`; `importsOnly(name, from, allowed, comment)` helper allows the importer's own files via `$1`. Rewrite here.
- `tooling/ad10/rules.spec.ts` -- cruises `tooling/ad10/violations` with the real config; asserts the exact sorted violation list, that every configured rule is exercised, and allowed edges (pattern: "allows routing to import drc and model"). Extend, keeping its shape.
- `tooling/ad10/violations/{packages,app,fixtures}/` -- one `src/index.ts` per package with a comment naming the rule each import breaks. Reuse; `model/src/index.ts` currently breaks `model-imports-no-workspace-package` via library (keep the edge, rename the rule).
- `packages/model/{package.json,tsconfig.json,src/index.ts}` -- stub pattern to copy for `reactive`, `geometry`, `ui` (`exports: {".": "./src/index.ts"}`, composite tsconfig extending `tsconfig.base.json`, `export {}`).
- `tsconfig.json` -- project references; add the three packages.
- `pnpm-workspace.yaml` -- `catalog:` block (typescript, vitest, vue-tsc); add `vue: &vue 3.5.44` and `'@vue/reactivity': *vue`.
- `vitest.config.ts` -- the `tooling` project runs `tooling/**/*.spec.ts` on Node; `packages/*` picks up new packages automatically.
- `app/package.json` -- editor deps (vue 3.5.44); gets `@snap/ts-inject`.
- AD-10 table (spine lines 266–313): plates, pcb → model, geometry, reactive; case → model, geometry; firmware, drc → model, reactive; exports → model; routing → model, drc; library → model; storage → model, reactive; model → reactive, geometry; reactive, geometry, ui → none.

## Tasks & Acceptance

**Execution:**
- [x] `packages/{reactive,geometry,ui}/` -- create `package.json` (`@keeb-cad/<name>`, exports), `tsconfig.json`, `src/index.ts` copied from model's stub; `reactive` depends on `@vue/reactivity: catalog:` -- the spine's packages exist.
- [x] `pnpm-workspace.yaml`, `packages/model/package.json`, `app/package.json` -- anchored catalog entries, app's `vue` to `catalog:`; model gets `immer` ^11.2.9, `valibot` ^1.5.0, `@snap/ts-inject` ^1.2; app gets `@snap/ts-inject` ^1.2; run `pnpm install` -- deps declared where the spine places them.
- [x] `tsconfig.json` -- add the three references.
- [x] `.dependency-cruiser.mts` -- replace `stage-imports-only-model`, `routing-imports-only-model-and-drc`, `model-imports-no-workspace-package` and `library-and-storage-import-only-model` with one `importsOnly` rule per AD-10 row above (rows sharing an allowed set may share a rule); drop `@vue/reactivity` from `VUE` and add `@vueuse/core`; let `only-editor-imports-vue` allow `packages/ui/`; add `only-reactive-imports-vue-reactivity`, `only-geometry-imports-makerjs`, `only-register-imports-immer` (allowed from `packages/model/src/register/`), `only-ui-imports-reka-and-zag`, `only-editor-imports-ui`, `worker-imports-no-reactive` (from `\.worker\.ts$`) -- AD-10 as written.
- [x] `tooling/ad10/violations/` -- one violation per new or rewritten rule, each reporting under that rule alone, plus allowed-edge fixtures for model → reactive/geometry, a stage → geometry/reactive, reactive → @vue/reactivity, ui → vue and @vueuse/core, register → immer -- fences proven.
- [x] `tooling/ad10/rules.spec.ts` -- update the expected list; add allowed-edge tests; extend the VUE regex table (`@vue/reactivity` and `@vueuse/core` cases) -- the spec stays the single proof.
- [x] `tooling/vue-reactivity.spec.ts` -- parse `pnpm-lock.yaml` and assert exactly one `@vue/reactivity@<version>` package key; read `pnpm-workspace.yaml` as text and assert `@vue/reactivity` is the alias `*vue` -- one reactive graph, and a pnpm rewrite that drops the anchor fails the check.
- [x] probe, not committed -- in a scratch copy, run the pnpm commands that rewrite `pnpm-workspace.yaml` (`pnpm add --save-catalog` of a dev dep, a catalog version bump with `pnpm update`, `pnpm approve-builds` if it edits `allowBuilds`) and record in Implementation Notes whether the anchor survives -- the decision asked for this check.

**Acceptance Criteria:**
- Given the scaffolded workspace, when `pnpm check` runs, then it passes.
- Given the violation tree, when `rules.spec.ts` runs, then every configured rule reports at least one violation and no fixture reports under two rules.
- Given `packages/ui`, when the editor is built, then nothing outside `app/` may import it.

## Implementation Notes

- **Rules.** The AD-10 rows became seven `importsOnly` rules: `plates-and-pcb-import-only-model-geometry-reactive`, `case-imports-only-model-and-geometry`, `firmware-drc-and-storage-import-only-model-and-reactive` (two rows sharing one allowed set), `routing-imports-only-model-and-drc` (name kept, comment updated), `exports-and-library-import-only-model`, `model-imports-only-reactive-and-geometry`, `reactive-geometry-and-ui-import-no-workspace-package`. `ui` targets join `OWNED_ELSEWHERE` beside editor and fixtures, so a package importing `ui` reports under `only-editor-imports-ui` alone. The npm-target fences share an `onlyImports(name, owner, target)` helper and an `npm(names)` regex builder (resolved `node_modules` path or bare specifier).
- **VUE regex.** `@vue/(?!reactivity(?:/|$))[^/]+` drops `@vue/reactivity` while `@vue/reactivity-transform` and every other `@vue/*` stay Vue; `@vueuse/core` added; `pinia` kept.
- **Worker rule.** `to.reachable: true` works in a forbidden rule (dependency-cruiser 18.7.0): the fixture `pipeline/src/route.worker.ts` reaches `reactive` through `reach.ts` and reports once, with the `via` chain.
- **One-copy spec.** pnpm 12's lockfile is multi-document YAML (pnpm's own dependencies are a separate first document with its own `packages:`), so the spec reads the keys of every `packages:` section, as text, with no YAML dependency.
- **Probe (pnpm 12.15.0, scratch copy, not committed).** The anchor survives every rewrite tried; pnpm keeps the comment and the `&vue` / `*vue` pair:
  - `pnpm add -D -w --save-catalog is-odd@3.0.1`: appends `is-odd: 3.0.1` to the catalog; anchor intact.
  - `pnpm update -r --latest typescript`: rewrites `typescript: ~7.0.2` in the catalog; anchor intact.
  - `pnpm approve-builds esbuild` and `pnpm approve-builds lefthook`: edit `allowBuilds`; anchor intact.
  - `pnpm update -r vue@3.5.43` and `pnpm --filter @keeb-cad/editor add --save-catalog vue@3.5.43` do **not** touch the catalog: both replace the app's `catalog:` with the literal `3.5.43`, and the lockfile then holds `@vue/reactivity@3.5.43` and `@3.5.44`. The one-copy test catches that (checked against the probe's lockfile). So a Vue bump is a hand edit of the `&vue` line.

## Plan Change Log

## Review Triage Log

### Pass 1 (quick) — high 0, medium 1, low 5, false 0, maybe-false 0

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | `tooling/verify-checks.sh:120` expects removed rule `stage-imports-only-model` | medium | patch | Line 120 greps for the old name; depcruise now reports the new one, so the row FAILs. Rename the expected rule. |
| 2 | A `*.worker.ts` in routing or case importing reactive reports under the stage rule and the worker rule | low | reject | Real, but only a double report on an import that is wrong either way; fixing it means carving workers out of the stage rules, which would hide other worker violations. More than a direct correction. |
| 3 | A `.vue` under `packages/ui/` imported from outside reports under `only-editor-imports-vue` and `only-editor-imports-ui` | low | patch | `to.pathNot` is `EDITOR` only; story 11 adds `.vue` files there. Add `UI` to `pathNot`. |
| 4 | Allowed edges case, storage not proven cruised; drc/firmware → reactive and pcb have no fixture | low | patch | Plan's Always line requires each opened allowed edge be proven cruised; `it.each` lacks these rows. Add fixtures and rows. |
| 5 | `VUE_REACTIVITY` / `npm()` never tested on resolved paths | low | patch | Only `VUE` has a resolved-path table; a regex slip in `npm()` would blind four fences unnoticed. Add a small table. |
| 6 | `ui` may import pinia and vue-router; the Design Note "a reintroduced Pinia import still fails" is false for app and ui | low | defer | Pinia in `app/` was already unfenced before this change; a spine-wide no-Pinia fence is a new rule outside this plan. |
| 7 | `catalogEntries` doc comment says it returns the `@vue/reactivity` entry | low | patch | Function returns every entry. Reword. |

## Design Notes

- **Worker code** is any `*.worker.ts` file (Vite's `new Worker(new URL('./x.worker.ts', import.meta.url))` convention); the spine names no convention, so this one is set here. Use dependency-cruiser's `to.reachable` if it works in a forbidden rule, so a worker reaching `reactive` through a helper is caught; otherwise a direct-import rule. Put the worker fixture in `pipeline` so no stage rule double-reports.
- **The register concept** is `packages/model/src/register/` (AD-25 folders by concept).
- `only-editor-imports-ui` comes from AD-10 ("only `editor` imports it"); the ticket doesn't list it, but it is one rule and one fixture.
- Keep `pinia` in `VUE` names: a reintroduced Pinia import still fails.

## Verification

**Commands:**
- `pnpm install --frozen-lockfile` -- expected: clean after the lockfile update
- `pnpm vitest run --project tooling` -- expected: rules and one-copy specs pass
- `pnpm check` -- expected: passes
