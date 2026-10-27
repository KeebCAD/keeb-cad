---
type: epic
title: "Monorepo builds and checks boundaries"
parent: initiative-keeb-cad-m1
covers: []
sources: [_bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md]
companions: [_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md, _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md]
after: []
refined: true
risk: low
status: done
---

# Monorepo builds and checks boundaries

## Description

The pnpm monorepo, with all 12 packages from the architecture seed and `fixtures/`, builds from a clean clone. The create-vue editor shell is served locally from its static build. One `pnpm check` command enforces the AD-10 dependency rules and runs every check, locally, in a pre-commit hook and in GitHub Actions. The repo is MIT-licensed on GitHub. The UX session (editor views, drag semantics, key-cell and expression UI) has run and its result is adopted.

## Outcome

Every later epic builds on a boundary-checked app shell that runs locally, and on adopted UX decisions.

## Requirements

- R1 (architecture Monorepo, Structural Seed, Stack): A pnpm workspace holds the 12 `@keeb-cad/<name>` packages of the structural seed as of the build (`viewer3d`, added later, belongs to epic-tray-case) plus `fixtures/`, using TypeScript project references and the Stack versions. A clean clone installs under pnpm strict and builds.
- R2 (architecture AD-10): dependency-cruiser encodes the full AD-10 dependency graph as of the build (the `viewer3d` and three.js rules, added later, belong to epic-tray-case). An import that breaks a rule fails the checks and names the rule. The rules: stages import only `model` (and `routing` also imports `drc`), `model` imports no workspace package, only `editor` imports Vue, and nothing imports `editor`.
- R3 (architecture Stack; initiative C1): `editor` is the create-vue app shell. Its static build, served locally by `vite preview`, shows the empty editor, and a smoke test opens it.
- R4 (Decision 2026-10-26): One `pnpm check` runs typecheck, lint, a Prettier format check, unit tests, the smoke test, dependency-cruiser and the build, and exits non-zero on any failure. A pre-commit hook runs the fast part.
- R5 (Decision 2026-10-26): A GitHub remote exists, and GitHub Actions runs `pnpm check` on every push and fails visibly when a check fails. There is no hosting.
- R6 (Decision 2026-10-26): An MIT LICENSE sits at the repo root before the first push.
- R7 (initiative Boundaries; architecture Deferred): A UX session (`bmad-ux`) decides editor views, panels, drag semantics, key-cell and expression UI. Its DESIGN.md and EXPERIENCE.md are adopted as companions before any editor story starts.

## Constraints

- Initiative C1 (browser-only, no server) and C3 (the architecture spine binds) bind this epic.
- Package and tool versions come from the architecture Stack table.

## Done when

- `pnpm check` passes locally and in GitHub Actions, and dependency-cruiser rejects an import that breaks AD-10.
- The empty editor's static build is served locally by `vite preview`.
- The `fixtures/` package exists for epic-risk-spikes story 1.
- The UX session's output (editor views, drag semantics, key-cell and expression UI) is adopted as a companion.

## Boundaries

- Out: any design logic, since the packages start empty. The spikes and fixture contents belong to epic-risk-spikes.
- Out: hosting, deploy and COOP/COEP headers (architecture Deferred, before the first public preview).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, AD-10, Conventions (Monorepo, Testing), Stack, Structural Seed, Deferred

## Notes

- Decision: 2026-10-25 the UX session runs inside this epic; epic-layout waits on it.
- Decision (2026-10-26): no deploy in this epic, and none in milestone 1. keeb-cad runs locally only. The static build is still served locally (`vite preview`), so no server dependency creeps in (C1). Hosting choice, CI/deploy and COOP/COEP headers stay deferred (architecture Deferred, "before the first public preview").
- Decision (2026-10-26, check list superseded by R4 and the Prettier decision below): every check (typecheck, lint, tests, dependency-cruiser, build) runs from one local `pnpm check`. A git pre-commit hook runs the fast part. A GitHub remote is added and GitHub Actions runs `pnpm check` on push. There is no hosting.
- Decision (2026-10-26): the scaffold creates all 12 packages from the architecture's structural seed, plus `fixtures/`. Each starts as an empty `@keeb-cad/<name>` package with the AD-10 dependency rules wired in from the first commit.
- Decision (2026-10-26): keeb-cad's own code is MIT-licensed, with a LICENSE file at the repo root before the first push.
- Decision (2026-10-26): R2 widened to the full AD-10 graph. A stage importing `pipeline`, `library`, `storage` or another stage is a violation.
- Decision (2026-10-26): tracer bullet is story 1, the empty editor building and previewing from the workspace. Story 2 follows as the least-certain one.
- Decision (2026-10-26): no closing refactor sweep, since the packages start empty.
- Decision (2026-10-26, fast part superseded by the Prettier decision below): the pre-commit hook's fast part is lint and dependency-cruiser. `pnpm check` adds typecheck, tests, the smoke test and build. The agent runs create-vue with flags, so story 1 needs no hands-on step.
- Decision (2026-10-26): R6 is done ahead of the stories. The MIT LICENSE was committed before the first push, and `main` was pushed to the public repo `git@github.com:KeebCAD/keeb-cad.git`, `_bmad-output/` included. Story 1.4 keeps only the Actions workflow.
- Decision (2026-10-26): Prettier is the code formatter. It was never planned before; the architecture Stack now pins Prettier 3.9.10. It runs as a format check in `pnpm check` and in the pre-commit hook, so the hook's fast part is now lint, format check and dependency-cruiser (supersedes the earlier fast-part decision). R4 and story 3 widened to match.
- Decision (2026-10-26): the editor app lives in `app/`, not `packages/editor`, to separate the app from the libraries (story 1 build). The package name `@keeb-cad/editor` and its AD-10 role are unchanged. The architecture Structural Seed and Monorepo convention now say so (updated 2026-10-26).
- Decision (2026-10-26, architecture update, commit 15bf969): two drifts in the ux-editor spines, for a `bmad-ux` Update run. (1) EXPERIENCE.md still specifies the Assembly chip (A), the Assembly legend and steps J1.12 and J2.5, though Assembly is deferred past M1 (initiative Decision 2026-10-26). (2) The Export menu lacks the `blocked: <kind>` state for a `model` error (AD-15). Owner Sergii; before epic-editor-shell and epic-tray-case are refined.
- Decision (2026-10-26): the two ux-editor drifts above (Assembly, export model-error block) were fixed in commit 36b769a, which also added Design info › Versions. One follow-up remains for a `bmad-ux` touch-up: version retention is now settled (AD-13, commit 680fbc0). The spines' Upstream Handoffs and Gaps still list it as open, and the Versions rows should show the AD-13 reason instead of `file` / `browser`.
- Decision (2026-10-27): the version-retention touch-up above is done (commit da014f0); no ux-editor follow-up remains.
- Decision (2026-10-27, closure): the architecture update (commit 15bf969) added `packages/viewer3d` and the AD-10 rules "only `viewer3d` imports three.js; only `editor` imports `viewer3d`" after this epic was built. epic-tray-case owns the package scaffold, those dependency-cruiser rules and their violation fixtures, since nothing imports three.js before it; R1 and R2 are read as of the build.
- Decision (2026-10-27, closure): the deferred item from story 2 (provision pnpm 12.15.0) is closed. CI provisions it with `pnpm/action-setup` from `packageManager`; a local `pnpm` pin in `mise.toml` stays an optional one-line change.
- Closed (2026-10-27): closure check against implementation evidence. `pnpm check` passes locally (typecheck, lint, format, dependency-cruiser, 20 tests, build, Playwright smoke) and on GitHub Actions at 7abfa33; dependency-cruiser reports all 12 deliberate AD-10 violations; `vite preview` serves the empty editor; `fixtures/` exists; the ux-editor spines are adopted. No story review left a material finding open.
