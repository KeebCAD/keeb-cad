---
type: epic
title: "Routing and geometry risks answered"
parent: initiative-keeb-cad-m1
covers: []
sources: []
companions: []
after: []
refined: false
risk: high
---

# Routing and geometry risks answered

## Description

Corney Island golden fixtures (Ergogen reference output for wired and wireless, plus a comparison harness) exist. The routing spike, run on Corney's Ergogen-generated PCB, has picked a browser engine that routes incrementally around fixed routes and a pre-routed module zone, or triggered the SM-3 KiCad fallback, and fixed the connection split rule. The geometry spike has confirmed makerjs against Corney's outline (or switched to clipper2) and fixed the flatten tolerance.

## Outcome

The two highest risks are answered before the epics that depend on them start.

## Done when

- Corney Island golden fixtures and a comparison harness are committed under `fixtures/`.
- A written routing verdict: engine chosen with incremental routing around fixed routes and a pre-routed module zone shown, or the SM-3 fallback triggered; the connection split rule is fixed.
- A written geometry verdict: makerjs reproduces Corney's outline within ±0.05 mm with latency measured, or the switch to clipper2 is recorded; the flatten tolerance is fixed.

## Boundaries

- Out: production routing and shape code (epic-routing-and-fab, epic-shapes-and-plates).
- Routing spike exit criteria: no network at runtime, installs under pnpm strict with TypeScript 6 (architecture Deferred).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
