- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/tickets/story-dependency-cruiser-rejects-ad-10-violations-plan.md`
  summary: Provision pnpm 12.15.0 explicitly (e.g. `pnpm = "12.15.0"` in `mise.toml`, or `pnpm/action-setup` in CI), since Node ≥25 ships no corepack.
  evidence: On this machine pnpm comes from a global mise install that self-switches via `packageManager`. A clean machine or the story 1.4 CI runner activating only the repo `mise.toml` gets Node 26 but no pnpm.
  closed: 2026-10-27, at epic-platform-baseline closure. CI provisions pnpm with `pnpm/action-setup`; a `mise.toml` pin stays optional.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/tickets/story-custom-router-routes-full-corney-and-is-scored-plan.md`
  summary: The custom router stacks vias of the same net (KiCad `hole_to_hole` and `holes_co_located` on the routed boards), because `RoutingInput` has no via-to-via drill clearance and same-net copper never blocks.
  evidence: Story 9 run: wired `hole_to_hole` 45 and `holes_co_located` 27, wireless `hole_to_hole` 2; tscircuit's boards get them too. Not counted in `kicad.added` (not in `CLEARANCE_FAMILY`). Co-located holes are a fab defect; needs a hole-to-hole rule in AD-20 and the router field, for story 13 and bmad-architecture.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/tickets/story-custom-router-reroutes-one-moved-key-plan.md`
  summary: Story 7's tscircuit reroute entries count the saved routes' clashes with the moved key in their `drc` baseline, so their `drc.added` and `fixedCopperViolations` hide them; story 13 should compare the engines with this in mind, or re-run tscircuit with `savedConflicts`.
  evidence: Story 10 review pass 1 measured 4 (wireless) and 30 (wired) violations that `drc(moved, saved)` adds over the bare moved board on the custom base run, mostly shorts with the moved pads. tscircuit's saved routes differ, but they go through the same `rerouteDiff` baseline.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/tickets/story-makerjs-rebuilds-corney-s-outline-flatten-fixed-plan.md`
  summary: spikes/README.md "One command" section still describes only story 3's route spec and the early unit tests, not the specs and tests added by stories 4–11.
  evidence: The story 11 review found the section lists `e2e/route.spec.ts` and "routing input, drc, write-back" only, while `pnpm route` now runs ten specs including `e2e/outline.spec.ts`; earlier stories left it unchanged too.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-the-workspace-matches-the-2026-10-30-spine-plan.md`
  summary: Add a spine-wide no-Pinia dependency-cruiser fence; today `app/` and `packages/ui/` may import pinia (and ui vue-router) because `only-editor-imports-vue` exempts both; after 23.1 the Vue exemption moves from `app/` to `packages/editor/` (spine b9b4ec5).
  evidence: AD-10 says "No Pinia"; `only-editor-imports-vue` has `from.pathNot: ['^app/', '^packages/ui/']`, so pinia in VUE names fences only packages that may not import Vue at all. The app exemption predates 13.9.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-thread-plumbing-matches-the-spine-plan.md`
  summary: AGENTS.md's "proven by the violation tree in tooling/ad10/" is stale; the graph rules are now proven by a tree rules.spec.ts generates from GRAPH, the committed tree only holds subpath, fence, kernel and npm fixtures.
  evidence: 23.1 review pass 1, finding 5; AGENTS.md line 17 vs tooling/ad10/rules.spec.ts.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-result-replaces-the-plain-result-plan.md`
  summary: Decide whether AGENTS.md's "helper functions each get their own file" means one file per helper function or one file per kind; result's attempt.ts (four private runners beside attempt) and result.ts (ok beside Result) depend on the answer.
  evidence: 23.11 review pass 1 read the rule as one function per file; the plan read it as one kind per file. 23.12's lint will need the answer.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-commands-run-through-the-design-store-plan.md`
  summary: Decide whether a command whose apply step changes nothing is a commit (seq + 1, empty patches, commit event, later an undo entry) or returns ok without committing; settle in the undo story (epic-change-a-parameter).
  evidence: 23.2's store commits a no-op (`produceWithPatches` returns `[]`); neither AD-2 nor 23.2's intent says which; an expression field committing on blur without an edit would autosave, message the worker and later add an empty undo entry.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-commands-run-through-the-design-store-plan.md`
  summary: Reconcile AGENTS.md's "entry files only re-export" with the spine's "the main container is built only in `app`'s `main.ts`" for thread entries.
  evidence: 23.2 builds the container in `app/src/main-container.ts` and `main.ts` awaits it then mounts, so it breaks both rules; a thread entry must run something, and settling it edits AGENTS.md or the spine.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-code-follows-agents-md-s-rules-plan.md`
  summary: Replace `tooling/verify-checks.sh` with a static spec that reads the `check` script and `lefthook.yml` and asserts each step is present (and the hook runs lint, format and depcruise but not typecheck or tests); drop AGENTS.md's "run sh tooling/verify-checks.sh" line.
  evidence: Decided by Sergii 2026-11-04 during 23.12: the script runs `pnpm check` 9 times plus ~8 hooked commits in a fresh worktree (one check ≈ 27s), mostly re-proving that each tool fails on bad input, which the lint and AD-10 specs already prove; in 23.12 it found nothing and needed three rows moved off entry files.
