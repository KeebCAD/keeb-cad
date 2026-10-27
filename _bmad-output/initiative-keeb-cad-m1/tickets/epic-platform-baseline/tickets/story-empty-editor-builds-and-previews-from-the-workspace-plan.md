---
title: 'Empty editor builds and previews from the workspace'
type: 'feature'
ticket: '1'
created: '2026-10-26'
status: done
baseline_revision: '0967e50b217be7ad20f0547d0f8680ec45ac8790'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repo holds only planning docs and a LICENSE; every later story needs a pnpm monorepo with the 12 seed packages, `fixtures/`, and a create-vue editor that builds and previews.

**Approach:** Scaffold a strict pnpm 12.15.0 workspace of 12 empty `@keeb-cad/<name>` packages plus `@keeb-cad/fixtures`, joined by TypeScript project references; generate the editor app in `app/` with create-vue 3.24.0 at the Stack versions and strip it to an empty shell; run Vitest as one workspace-wide command; wire a root `pnpm check` = typecheck + unit tests + build.

## Boundaries & Constraints

**Always:** Versions from the architecture Stack table (TypeScript ~6.0, Vue 3.5.44, Vite ^8.2, Pinia ^4.0, vue-router 5.4.0, Vitest ^4.1, pnpm 12.15.0). Package names `@keeb-cad/<name>`, exactly the Structural Seed's 12: model, plates, pcb, routing, drc, case, firmware, exports, pipeline, storage, library, editor. The 11 libraries live in `packages/<name>`; the editor app lives in `app/` (package name `@keeb-cad/editor`). Every package private. Installs pass with strict pnpm settings. `spikes/` is outside the workspace globs, the TS references, the Vitest projects and the ESLint config, so files there never affect `pnpm check`.

**Never:** No design logic or inter-package dependencies (packages start empty; AD-10 rules are story 1.2). No dependency-cruiser, pre-commit hook, Playwright smoke in `pnpm check`, or lint in `pnpm check` (story 1.3). No GitHub Actions (1.4). No hosting, deploy or COOP/COEP headers. No fixture contents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean clone | `git clone` + `pnpm install` | Installs with pnpm 12.15.0, strict, no peer warnings escalated to errors | Wrong pnpm version is switched to 12.15.0 via `packageManager` |
| Check passes | `pnpm check` on a clean tree | Typecheck, tests and build all succeed, exit 0 | — |
| Check fails | A type error in any package, or a failing test | `pnpm check` exits non-zero | Failure names the package/file |
| Package with no tests | Empty package | Vitest run still passes | `passWithNoTests` |
| Stray spike | A broken `.ts` file in `spikes/` | `pnpm check` still exits 0 | — |
| Preview | `pnpm --filter @keeb-cad/editor preview` after build (from `app/`) | Browser shows the empty editor shell | — |

**Decisions:**
- 2026-10-26 (user): the editor application lives in `app/`, not `packages/editor`, to separate the app from the libraries. This deviates from the architecture Structural Seed's directory layout only; the package name, AD-10 role and dependency rules are unchanged.

</frozen-after-approval>

## Code Map

- Repo today: only `LICENSE`, `.gitignore`, `skills-lock.json`, `_bmad*/`, `.agents/`, `.claude/`. No `package.json`. Do not touch `_bmad*/`, `.agents/`, `.claude/`, `LICENSE`.
- `.gitignore` -- extend (keep existing entries) with `node_modules/`, `dist/`, `*.tsbuildinfo`, `coverage/`, `test-results/`, `playwright-report/`.
- Environment: node 25.8.0 (create-vue's engines: `^22.18.0 || >=24.12.0`), global pnpm 12.14.0 via mise — `packageManager: "pnpm@12.15.0"` must make pnpm self-switch.
- create-vue 3.24.0 output (trial run, flags `--ts --router --pinia --vitest --playwright --eslint`): `vue ^3.5.42`, `vue-router ^5.3.1`, `pinia ^4.0.3`, `vite ^8.2.2`, `vitest ^4.1.11`, `typescript ~6.0.0`, `vue-tsc ^3.3.11`; solution-style `tsconfig.json` referencing `tsconfig.{node,app,vitest}.json`; `vitest.config.ts` merges `vite.config.ts` with jsdom; scripts `build = run-p type-check build-only`, `type-check = vue-tsc --build`; boilerplate `HelloWorld`, `TheWelcome`, `WelcomeItem`, `icons/`, `stores/counter.ts`, `AboutView`, logo/CSS; `e2e/vue.spec.ts` + `playwright.config.ts`; `eslint.config.ts` + `.oxlintrc.json`.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- root, private, `packageManager: "pnpm@12.15.0"`, `engines.node` matching create-vue; scripts `typecheck` (`vue-tsc --build`), `test` (`vitest run`), `build` (`pnpm --filter @keeb-cad/editor build-only`, so typecheck runs once), `check` (typecheck → test → build, fail-fast); root devDeps `typescript`, `vue-tsc`, `vitest` -- one entry point
- [x] `pnpm-workspace.yaml` -- packages `packages/*`, `app`, `fixtures`; strict settings exactly `strictPeerDependencies: true`, `hoist: false`, `publicHoistPattern: []`; a `catalog:` for tool versions shared by root and `app` (`typescript`, `vue-tsc`, `vitest`) -- R1 strict install
- [x] `tsconfig.base.json`, `tsconfig.json` -- base options: `target`/`lib` ES2023, `module: preserve`, `moduleResolution: bundler`, `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `skipLibCheck`, `types: []`; solution-style root referencing the 11 `packages/*`, `fixtures`, and `app` -- project references
- [x] `packages/<name>/{package.json,tsconfig.json,src/index.ts}` ×11 (all seed packages but editor) -- `@keeb-cad/<name>`, private, `type: module`, `exports` → `./src/index.ts`, tsconfig extending base with `composite`, `emitDeclarationOnly`, `outDir: dist`, `rootDir: src`; `src/index.ts` = `export {}` -- empty packages
- [x] `fixtures/{package.json,tsconfig.json,src/index.ts}` -- `@keeb-cad/fixtures`, same shape plus devDep `@types/node`, `types: ["node"]`, `include` covering `src/**` and its tests -- epic-risk-spikes story 1 harness reads files with `node:fs`
- [x] `app/` -- run create-vue 3.24.0 with the trial flags, rename to `@keeb-cad/editor`, pin `vue 3.5.44`, `vue-router 5.4.0`; delete boilerplate (welcome components, icons, counter store, About view/route, logo, demo CSS, HelloWorld spec); `App.vue` renders a minimal empty-editor shell with `RouterView`; keep router + Pinia wired; `tsconfig.app.json` extends `["@vue/tsconfig/tsconfig.dom.json", "../tsconfig.base.json"]` (restoring DOM `lib`/`types` after the base); `app/tsconfig.json` also references `e2e/tsconfig.json`; app devDeps use `catalog:`; keep ESLint/Oxlint/Playwright config and rewrite `e2e/vue.spec.ts` to the new shell (unused by `check` until 1.3; ESLint stays in `app/` and 1.3 moves it to the root); drop its own `.gitignore`/`.vscode` duplicates where the root covers them -- R3
- [x] `app/src/__tests__/App.spec.ts` -- mounts `App` with router + Pinia, asserts the shell renders -- proves Vitest runs in editor
- [x] `vitest.config.ts` (root) -- `test.projects` listing `packages/*`, `fixtures` and `app` explicitly (`app` via its own `vitest.config.ts`), `passWithNoTests: true`; `spikes/**` never matched -- workspace-wide Vitest
- [x] `pnpm-lock.yaml` -- generated by `pnpm install`, committed

**Acceptance Criteria:**
- Given a fresh clone of the branch, when `pnpm install` then `pnpm check` run, then both exit 0 and `pnpm -v` inside the repo reports 12.15.0.
- Given a deliberate type error in `packages/model/src/index.ts`, when `pnpm check` runs, then it exits non-zero; reverting restores exit 0.
- Given a deliberately failing test in `fixtures/`, when `pnpm check` runs, then it exits non-zero and names the test file; reverting restores exit 0.
- Given a file with a type error and a failing test under `spikes/`, when `pnpm check` runs, then it exits 0.
- Given the editor build, when `vite preview` serves it, then a browser shows the empty editor shell with no console errors.
- Given `pnpm ls -r --depth -1`, then exactly 13 `@keeb-cad/*` workspace packages are listed (11 in `packages/`, `@keeb-cad/editor` in `app/`, fixtures), and `packages/editor` does not exist.

## Implementation Notes

- No strictness loosened: install passes with `strictPeerDependencies: true`, `hoist: false`, `publicHoistPattern: []`; ESLint and Oxlint also run clean in `app/` under no-hoist.
- `app/e2e/tsconfig.json` gained `noEmit`, `types: ["node"]` and a `tsBuildInfoFile` under `app/node_modules/.tmp`, because it is now referenced and `vue-tsc --build` would otherwise emit `.js` next to the specs.
- `app/.gitignore` deleted (root covers it). `app/.vscode/` kept: the root has no `.vscode`, so nothing duplicates it. `app/README.md`, `.editorconfig`, `.gitattributes` kept as generated.
- `playwright.config.ts` webServer commands switched from `npm run` to `pnpm`. The e2e spec is not run by `check`; locally it fails only because the Playwright browser build for `@playwright/test` 1.63 is not installed (story 1.3).
- Fixture tests live beside code under `fixtures/src/` (`rootDir: src`), so `include: ["src/**/*"]` covers both.
- `@types/node` in `fixtures` pinned to `^24.13.4`, the same range create-vue gives `app`.

- Orchestrator follow-up: added root `tsconfig.node.json` (extends base, `noEmit`, includes `vitest.config.ts`) and referenced it from the root `tsconfig.json`, so the root Vitest config is typechecked (a deliberate type error there now fails `pnpm typecheck`).
- Matrix audit (orchestrator, on a clean copy of the tracked + untracked files, no `node_modules`): pnpm self-switched to 12.15.0; `pnpm install --frozen-lockfile` exit 0; `pnpm check` exit 0 with a type-broken file and a failing test present in `spikes/`; failing test in `fixtures/src` → exit 1; type error in `packages/model` → exit 2; revert → exit 0; 13 `@keeb-cad/*` packages. These are scripted checks, not committed tests: the matrix rows are workspace behaviours, and story 1.3's scripted break-each-check run makes them repeatable.

- Review patch: `app/README.md` replaced with a short workspace README (`# @keeb-cad/editor`, root `pnpm install` / `pnpm check`, `pnpm --filter @keeb-cad/editor dev|preview`); the earlier "kept as generated" note no longer applies to it.

## Plan Change Log

## Review Triage Log

- Pass 1 (quick): high 0, medium 0, low 2, false 0, maybe-false 0.
  - low · patch · `app/README.md` documented npm commands (`npm install`, `npm run build` …) that fail on `catalog:` specifiers and bypass the pinned pnpm, strict settings and root `pnpm check`; verified in the file. Replaced with a workspace README.
  - low · rejected (fix edits this plan) · Implementation Notes name `@playwright/test` 1.63 as the missing browser build, but `pnpm-lock.yaml` resolves `@playwright/test@1.64.1`; verified in the lockfile. Correct figure for story 1.3: install browsers for 1.64.1 via `pnpm --filter @keeb-cad/editor exec playwright install`.

## Design Notes

- Packages export TypeScript source (`"exports": { ".": "./src/index.ts" }`) for Vite and Vitest, and emit declarations only, to gitignored `dist/`, under `vue-tsc --build`. Rule for later stories: a package that imports another adds it as a `workspace:*` dependency **and** a tsconfig `reference`; TS then reads the referenced `dist/*.d.ts`. Never `noEmit` on a composite package (a referencing project fails with TS6310), and never emit into `src/`.
- Root `typecheck` uses `vue-tsc --build` so one command covers plain-TS packages and the editor's `.vue` files.
- `spikes/` is a standalone pnpm project outside the workspace: an install there ignores the root's `packageManager` and strict settings, so risk-spikes story 3 gives it its own `packageManager` and `pnpm-workspace.yaml`.
- Strictness: if a create-vue tool breaks under no-hoist, prefer adding the missing dependency explicitly over loosening the setting; record any loosening in Implementation Notes.

## Verification

**Commands:**
- `pnpm install --frozen-lockfile` -- expected: exit 0
- `pnpm check` -- expected: exit 0
- `pnpm ls -r --depth -1` -- expected: 13 `@keeb-cad/*` packages plus root
- `pnpm --filter @keeb-cad/editor preview` -- expected: serves on localhost:4173

**Manual checks (if no CLI):**
- Open the preview URL in a browser (chrome-devtools MCP): empty editor shell visible, console clean.
- Temporarily break a `spikes/` file and a `model` file to confirm the two exclusion/failure ACs, then revert.
