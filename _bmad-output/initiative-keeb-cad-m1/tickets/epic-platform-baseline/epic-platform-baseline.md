---
type: epic
title: "Monorepo builds, checks boundaries and deploys"
parent: initiative-keeb-cad-m1
covers: []
sources: []
companions: []
after: []
refined: false
risk: low
---

# Monorepo builds, checks boundaries and deploys

## Description

The pnpm monorepo with the create-vue editor builds, CI enforces the AD-10 dependency rules, and an empty app is deployed to static hosting. The UX session (editor views, drag semantics, key-cell and expression UI) has run and its result is adopted.

## Outcome

Every later epic builds on a deployed, boundary-checked app shell and on adopted UX decisions.

## Done when

- `pnpm build` and CI pass, with dependency-cruiser rejecting an import that breaks AD-10.
- The empty editor is served from static hosting.
- The UX session's output (editor views, drag semantics, key-cell and expression UI) is adopted as a companion.

## Boundaries

- Out: any design logic; the spikes (epic-risk-spikes).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Decision: 2026-10-25 the UX session runs inside this epic; epic-layout waits on it.
