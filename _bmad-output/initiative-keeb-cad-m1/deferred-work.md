- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/tickets/story-dependency-cruiser-rejects-ad-10-violations-plan.md`
  summary: Provision pnpm 12.15.0 explicitly (e.g. `pnpm = "12.15.0"` in `mise.toml`, or `pnpm/action-setup` in CI), since Node ≥25 ships no corepack.
  evidence: On this machine pnpm comes from a global mise install that self-switches via `packageManager`. A clean machine or the story 1.4 CI runner activating only the repo `mise.toml` gets Node 26 but no pnpm.
  closed: 2026-10-27, at epic-platform-baseline closure. CI provisions pnpm with `pnpm/action-setup`; a `mise.toml` pin stays optional.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/tickets/story-custom-router-routes-full-corney-and-is-scored-plan.md`
  summary: The custom router stacks vias of the same net (KiCad `hole_to_hole` and `holes_co_located` on the routed boards), because `RoutingInput` has no via-to-via drill clearance and same-net copper never blocks.
  evidence: Story 9 run: wired `hole_to_hole` 45 and `holes_co_located` 27, wireless `hole_to_hole` 2; tscircuit's boards get them too. Not counted in `kicad.added` (not in `CLEARANCE_FAMILY`). Co-located holes are a fab defect; needs a hole-to-hole rule in AD-20 and the router field, for story 13 and bmad-architecture.
