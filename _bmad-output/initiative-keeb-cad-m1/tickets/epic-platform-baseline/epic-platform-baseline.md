---
type: epic
title: "Monorepo builds and checks boundaries"
parent: initiative-keeb-cad-m1
covers: []
sources: [_bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md]
companions: []
after: []
refined: true
risk: low
---

# Monorepo builds and checks boundaries

## Description

The pnpm monorepo, with all 12 packages from the architecture seed and `fixtures/`, builds from a clean clone. The create-vue editor shell is served locally from its static build. One `pnpm check` command enforces the AD-10 dependency rules and runs every check, locally, in a pre-commit hook and in GitHub Actions. The repo is MIT-licensed on GitHub. The UX session (editor views, drag semantics, key-cell and expression UI) has run and its result is adopted.

## Outcome

Every later epic builds on a boundary-checked app shell that runs locally, and on adopted UX decisions.

## Requirements

- R1 (architecture Monorepo, Structural Seed, Stack): A pnpm workspace holds the 12 `@keeb-cad/<name>` packages from the structural seed plus `fixtures/`, using TypeScript project references and the Stack versions. A clean clone installs under pnpm strict and builds.
- R2 (architecture AD-10): dependency-cruiser encodes the full AD-10 dependency graph. An import that breaks a rule fails the checks and names the rule. The rules: stages import only `model` (and `routing` also imports `drc`), `model` imports no workspace package, only `editor` imports Vue, and nothing imports `editor`.
- R3 (architecture Stack; initiative C1): `editor` is the create-vue app shell. Its static build, served locally by `vite preview`, shows the empty editor, and a smoke test opens it.
- R4 (Decision 2026-10-26): One `pnpm check` runs typecheck, lint, unit tests, the smoke test, dependency-cruiser and the build, and exits non-zero on any failure. A pre-commit hook runs the fast part.
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
- Decision (2026-10-26): every check (typecheck, lint, tests, dependency-cruiser, build) runs from one local `pnpm check`. A git pre-commit hook runs the fast part. A GitHub remote is added and GitHub Actions runs `pnpm check` on push. There is no hosting.
- Decision (2026-10-26): the scaffold creates all 12 packages from the architecture's structural seed, plus `fixtures/`. Each starts as an empty `@keeb-cad/<name>` package with the AD-10 dependency rules wired in from the first commit.
- Decision (2026-10-26): keeb-cad's own code is MIT-licensed, with a LICENSE file at the repo root before the first push.
- Decision (2026-10-26): R2 widened to the full AD-10 graph. A stage importing `pipeline`, `library`, `storage` or another stage is a violation.
- Decision (2026-10-26): tracer bullet is story 1, the empty editor building and previewing from the workspace. Story 2 follows as the least-certain one.
- Decision (2026-10-26): no closing refactor sweep, since the packages start empty.
- Decision (2026-10-26): the pre-commit hook's fast part is lint and dependency-cruiser. `pnpm check` adds typecheck, tests, the smoke test and build. The agent runs create-vue with flags, so story 1 needs no hands-on step.
- Decision (2026-10-26): R6 is done ahead of the stories. The MIT LICENSE was committed before the first push, and `main` was pushed to the public repo `git@github.com:KeebCAD/keeb-cad.git`, `_bmad-output/` included. Story 1.4 keeps only the Actions workflow.
