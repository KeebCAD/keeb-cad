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
  closed: 2026-11-05, stale: AGENTS.md's Where things are line already describes `rules.spec.ts` and the `GRAPH` table.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-result-replaces-the-plain-result-plan.md`
  summary: Decide whether AGENTS.md's "helper functions each get their own file" means one file per helper function or one file per kind; result's attempt.ts (four private runners beside attempt) and result.ts (ok beside Result) depend on the answer.
  evidence: 23.11 review pass 1 read the rule as one function per file; the plan read it as one kind per file. 23.12's lint will need the answer.
  closed: 2026-11-05, party decision: one file per kind; helpers over one concept share a file named for it (AGENTS.md Code layout).
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-commands-run-through-the-design-store-plan.md`
  summary: Decide whether a command whose apply step changes nothing is a commit (seq + 1, empty patches, commit event, later an undo entry) or returns ok without committing; settle in the undo story (epic-change-a-parameter).
  evidence: 23.2's store commits a no-op (`produceWithPatches` returns `[]`); neither AD-2 nor 23.2's intent says which; an expression field committing on blur without an edit would autosave, message the worker and later add an empty undo entry.
  closed: 2026-11-05, party decision: no patches, no commit (spine AD-2); built by 23.16.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-commands-run-through-the-design-store-plan.md`
  summary: Reconcile AGENTS.md's "entry files only re-export" with the spine's "the main container is built only in `app`'s `main.ts`" for thread entries.
  evidence: 23.2 builds the container in `app/src/main-container.ts` and `main.ts` awaits it then mounts, so it breaks both rules; a thread entry must run something, and settling it edits AGENTS.md or the spine.
  closed: 2026-11-05, stale: the spine builds the main container in the start file `main.ts` re-exports (`app/src/start-main.ts`).
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-code-follows-agents-md-s-rules-plan.md`
  summary: Replace `tooling/verify-checks.sh` with a static spec that reads the `check` script and `lefthook.yml` and asserts each step is present (and the hook runs lint, format and depcruise but not typecheck or tests); drop AGENTS.md's "run sh tooling/verify-checks.sh" line.
  evidence: Decided by Sergii 2026-11-04 during 23.12: the script runs `pnpm check` 9 times plus ~8 hooked commits in a fresh worktree (one check ≈ 27s), mostly re-proving that each tool fails on bad input, which the lint and AD-10 specs already prove; in 23.12 it found nothing and needed three rows moved off entry files.
  closed: 2026-11-04, branch chore/replace-verify-checks: `tooling/check-steps.spec.ts` replaces the script.
- source_plan: `AGENTS.md` (Tests: the priority packages)
  summary: When slicing the first story that puts logic into `pcb`, `plates`, `case` or `exports`, add to its `verify` "Sergii approves each test name in <package>'s first specs against its expects before merge.", as 23.3 (design-file) and 23.5 (storage) carry.
  evidence: 2026-11-04 testing-rules adoption; those four packages have no sliced story that adds logic yet (plates-to-dxf entry 3 builds the registry in pipeline; tray-case, own-case-operations, parts-and-pcb and nets-and-matrix are unsliced).
  owner: the first story with logic in `pcb`, `plates`, `case` or `exports`.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-test-harness-enforces-agents-md-s-test-rules-plan.md`
  summary: Decide whether to ban loops, switch, ternaries and nested ifs around expect in specs, beyond vitest/no-conditional-in-test's top-level if.
  evidence: @vitest/eslint-plugin 1.6.28 index.mjs:2681 reports only an IfStatement whose grandparent's parent is the it/test call; AGENTS.md says no if or loop around expect. A wider selector is a new rule, so it goes to Sergii.
  closed: 2026-11-05, party decision: no loop selector; Vitest's `expect.requireAssertions` (23.18) plus AGENTS.md's prose rule cover it, since a selector misses expects reached through a helper.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-test-harness-enforces-agents-md-s-test-rules-plan.md`
  summary: Decide whether the guard should ask before edits to eslint.config.ts, so the ported test rules can't be switched off unprompted.
  evidence: ASKED_PATHS covers vitest, vite, playwright and stryker configs only; adding a path is a new guard rule, so it goes to Sergii.
  closed: 2026-11-05, party decision: yes, and `.dependency-cruiser.mts` too; built by 23.18.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-test-harness-enforces-agents-md-s-test-rules-plan.md`
  summary: Decide whether to require a reason on eslint-disable comments (e.g. eslint-comments/require-description), as AGENTS.md's test-id line asks.
  evidence: A bare eslint-disable-next-line silences no-restricted-properties and every ported rule (no-test-ids spec shows suppression works without a reason); enforcing it is a new rule, so it goes to Sergii.
  closed: 2026-11-05, party decision: no eslint-disable comments at all (`noInlineConfig` plus a `no-warning-comments` ban); exceptions are file overrides in `eslint.config.ts`; built by 23.18.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-commands-run-through-the-design-store-plan.md`
  summary: Split `packages/di/src/token.ts` so each helper gets its own file: it holds `createToken`, `createMultiToken`, `isToken`, `tokenKind` and `tokenName` together.
  evidence: AGENTS.md "tokens, errors, `define*` factories and helper functions each get their own file"; found by the plan-conformance reviewer's precedent check on story 2's plan (2026-11-05 dry run, PR #14).
  closed: 2026-11-05, void: helpers over one concept share a file, so `token.ts` stays whole.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-a-new-design-writes-and-reads-back-byte-identical-plan.md`
  summary: Story 15's plan sketch of a test action declares its input schema inline and its input type by hand, against AGENTS.md's three-file entry shape.
  evidence: precedent `story-commands-and-actions-become-di-classes-plan.md`, line `static readonly input = v.object({ design: v.unknown() })`; rule `The class's static input points at the schema; implements and apply use the type.` (23.3 conformance review)
  closed: 2026-11-08, stale: `git grep "static readonly input = v\."` finds nothing; no entry declares its input inline.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-a-new-design-writes-and-reads-back-byte-identical-plan.md`
  summary: Per-entry generic checks (caller's input not frozen, no proxy in the design, over every registered entry that writes the design) move to 13.2; decide there whether they live in `commands` (where the input schemas are) or `app`.
  evidence: Sergii, 2026-11-05: in 23.3 they could not fail, since NewDesign's input never enters the design; the design's deep freeze is already `design`'s unit rule, so an `app` copy was a retest.
  closed: 2026-11-05, sweep A8: no per-entry generic checks; `run` copies the input (`toRaw`, `structuredClone`) and the store parses every produced design (E10), both built by 23.16.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-a-new-design-writes-and-reads-back-byte-identical-plan.md`
  summary: Two replaceDesign tests in packages/design/src/store/design-store.spec.ts assert more than their names claim (the commit event, the caller's input unfrozen, nothing committed).
  evidence: precedent tests `loads a valid design deeply frozen, with the next seq and its revision` and `refuses an invalid design with its issue paths`; rule `Make a test's name and its expects claim the same thing.` 23.3 renames or splits them as they move (conformance pass 6).
  closed: 2026-11-08, stale: the named tests no longer exist; the store spec's current `replaceDesign` test names claim what they assert.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/party-mode` (party session 2026-11-05, test builders and deferred work)
  summary: The guard checks paths only on Edit, Write and MultiEdit (`EDIT_TOOLS` in `tooling/hooks/guard-decision.ts`), so a Bash edit (`sed -i`, a heredoc, `cat >`) to a runner, mutation, lint or dependency-cruiser config, or a snapshot, never reaches `ASKED_PATHS` or `DENIED_PATHS`.
  evidence: `guardDecision` returns only `DENIED_COMMANDS` for Bash; agent instructions allow small edits through Bash. Closing it means recognising writes to a path inside a shell command, which a regex can only approximate.
  closed: 2026-11-08, accepted (Sergii): the guard stays on the edit tools; AGENTS.md's ban on editing runner or mutation config covers the rest.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-specs-build-schema-values-with-test-builders-plan.md`
  summary: No check proves `only-tests-import-testing` catches a bare `@keeb-cad/<pkg>/testing` import after dependency-cruiser resolves it to `packages/<pkg>/src/testing/index.ts`; the violation tree has no node_modules, so its bare imports stay unresolved.
  evidence: 23.17 review finding 5; `tooling/ad10/rules.spec.ts` notes the tree's bare imports stay unresolved; the gap predates 23.17 for result/testing, and a real-repo cruise like the editor's Vue check would close it.
  closed: 2026-11-08, settled by a run: `depcruise` of a temporary `packages/editor/src/zz-probe.ts` importing `@keeb-cad/result/testing` reported `only-tests-import-testing: packages/editor/src/zz-probe.ts → packages/result/src/testing/index.ts`.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-tests-and-lint-close-the-silent-green-shortcuts-plan.md`
  summary: `tooling/ad10/rules.spec.ts`'s `gives every non-kernel row di, reactive and result, and no kernel any` asserts only plates and four kernels, so its name claims more than its expects.
  evidence: precedent line `expect(allowedTargets('plates')).toEqual(expect.arrayContaining(['di', 'reactive', 'result']))`; rule `Make a test's name and its expects claim the same thing.` (23.18 conformance review)
  closed: 2026-11-08, fixed by the refactor sweep: `it.each` rows cover the eight kernels and every other row.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-tests-and-lint-close-the-silent-green-shortcuts-plan.md`
  summary: Decide whether a `*.types.spec.ts` may import assertion helpers (`expectOk`, `expectErr`, `expectDeeplyFrozen`, `expectNothingFrozen`) from a `testing` subpath, since their `expect` never runs there and a test with `expectTypeOf` beside one passes lint and the suite.
  evidence: 23.18 review pass 2; `keeb-cad/type-specs` bans only `expect`, `assert` and `should` from `vitest`; banning the helpers is a new rule, so it goes to Sergii.
  closed: 2026-11-08, accepted (Sergii): no lint ban on `testing` assertion helpers in type specs; AGENTS.md's `expectTypeOf only` stays the guard.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-ui-foundation-renders-in-the-workbench-plan.md`
  summary: `packages/editor/vitest.config.ts` carries a comment with an AD reference that restates a rule.
  evidence: precedent line `// DOM tests run in real browsers, never a simulation (AD-26, Verification layer 2).`; rule `Write a comment only for a why the code can't say. No AD-n or ticket references` (23.6 conformance review).
  closed: 2026-11-08, fixed by the refactor sweep: AD reference removed.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-ui-foundation-renders-in-the-workbench-plan.md`
  summary: `.dependency-cruiser.mts` rule comments and code comments carry AD-n references.
  evidence: precedent lines `// @vue/reactivity is not Vue for this rule: it belongs to \`reactive\` alone (AD-10).` and `'Only design imports immer: its register and design/worker (AD-2).'`; rule `No AD-n or ticket references` (23.6 conformance review).
  closed: 2026-11-08, fixed by the refactor sweep: AD-n references removed from comments and rule comments.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-ui-foundation-renders-in-the-workbench-plan.md`
  summary: `eslint.config.ts` carries a comment with an AD reference.
  evidence: precedent line `// Deliberate AD-10 violations, cruised by tooling/ad10/rules.spec.ts.`; rule `No AD-n or ticket references` (23.6 conformance review).
  closed: 2026-11-08, fixed by the refactor sweep: AD reference removed.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-ui-foundation-renders-in-the-workbench-plan.md`
  summary: `tooling/lint/no-test-ids.spec.ts` takes its expected message from the config's own exported constant and mixes `stringContaining` with exact matches, so rewording the message fails no test.
  evidence: precedent lines `import { TEST_ID_MESSAGE } from '../../eslint.config'` and `toEqual([expect.stringContaining(TEST_ID_MESSAGE)])`; rule `Take expected values from the requirement (the ticket, the plan's boundary table), never from running the code.` (23.6 conformance review).
  closed: 2026-11-08, fixed by the refactor sweep: the spec writes the message out; `eslint.config.ts` no longer exports it. `stringContaining` stays only where ESLint prefixes the configured message with its own text.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-ui-foundation-renders-in-the-workbench-plan.md`
  summary: `tooling/lint/rule-messages.ts` holds a module-level `ESLint` instance its two helpers reach for, and its doc comments restate the signatures.
  evidence: precedent lines `const eslint = new ESLint({ cwd: fileURLToPath(new URL('../..', import.meta.url)) })` and `/** The messages \`ruleId\` reports under the real config for \`code\` at \`filePath\`. */`; rules `Hold state in \`di\` services, never in a module-level singleton that functions reach for.` and `Write a comment only for a why the code can't say. … no restating a signature` (23.6 final conformance pass).
  closed: 2026-11-08, fixed by the refactor sweep: `ESLint` is built inside `lintResult`; the doc comments are gone.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: Build `messaging`'s request side (pending requests, the typed `stale` reply to a request dropped as stale, reject all pending on a worker restart) with the first story that adds a request kind, and update 23.4's ticket wording ("stale rejection").
  evidence: Sergii's 23.4 decision (2026-11-07): no request kind exists yet, and how a pending caller receives `stale` (no `Result` crosses; `messaging` can't import `result`) needs a consumer to settle.
  owner: the first story that adds a request kind.
  note: since 2026-11-08 each kernel but `result` may import `result` (spine, `.dependency-cruiser.mts`), so the evidence's `messaging` can't import `result` no longer holds.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: `tooling/ad10/rules.spec.ts` keeps mutable state at module level (the generated temp tree and its cruise promise) and computes expected values the way the config does (`forbiddenTarget(row)`, `expect(reported).toEqual(configured)`).
  evidence: precedent lines `const generatedDir = mkdtempSync(path.join(tmpdir(), 'keeb-cad-ad10-'))` and `const generated = cruiseWithConfig(['packages', 'app', 'fixtures'], generatedDir)`; rules `Keep no mutable state at module level in a spec` and `no expected value computed the way production computes it` (23.4 conformance review).
  closed: 2026-11-08, fixed and decided by the refactor sweep: the generated tree and its cruise are a `const` in an outer `describe`; the computed expected values stay, because AGENTS.md says rules.spec proves the rows from the `GRAPH` table (its plan's Decision), with literal kernel rows.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: Root `vitest.config.ts` and `packages/di/vitest.config.ts` carry comments with AD-n or Verification-layer references.
  evidence: precedent lines `// The AD-10 violation tree holds a deliberate *.spec.ts fixture, not a test.` and `// di's root specs touch no DOM, so they run on Node (Verification layer 2)`; rule `No AD-n or ticket references` (23.4 conformance review).
  closed: 2026-11-08, fixed by the refactor sweep: AD-n and Verification-layer references removed.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: The spine still names the stale reply as built and tested in `messaging` (AD-11 "a typed `stale` rejection reply …", "each needs a `messaging` test"; Structural Seed "stale rejection"); fold in Sergii's 23.4 deferral of the request side (bmad-architecture).
  evidence: 23.4 final conformance pass, finding 13; Sergii's decision 2026-11-07.
  owner: the first story that adds a request kind (with its bmad-architecture fold).

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: `packages/design/src/store/design-store.spec.ts` asserts a rejection by identity where the requirement is only its value.
  evidence: precedent line `expect(result.error).toBe(rejection)` in `refuses with the rejection the apply step returns and discards its draft`; rule `Assert whole values (toEqual, toMatchObject)` (23.4 final conformance pass, low confidence).
  closed: 2026-11-08, fixed by the refactor sweep: `toEqual`.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: The browser Vitest configs for `messaging`, `workers`, `pipeline` and `app` don't pre-bundle their dependencies (`optimizeDeps.include`), which `packages/di/vitest.config.ts` does to avoid a mid-run re-bundle.
  evidence: unverified (would be medium): 23.4's whole-suite log shows no re-optimization; a cold-cache run with `node_modules/.vite` cleared, watching for "new dependencies optimized", would settle it; `app`'s entry spec polls 10 s for the worker's first transform.
  closed: 2026-11-08, settled by a run: with every `.vite` cache cleared, `pnpm test` (298 files, 2719 tests) logged no `new dependencies optimized`; no config change.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: `app/src/start-model-worker.ts` attaches its listener only after `await container.autoLoad()`, so a truly async eager binding could let main's first `design` arrive with no listener and be lost.
  evidence: unverified (would be medium): AD-25 prescribes this order and it works today; settled by checking whether Chromium and Firefox queue a module worker's messages until its top-level evaluation finishes.
  owner: the first story that adds an async eager binding to the worker container; today's `autoLoad` delay is one microtask.
  note: settled 2026-11-08 by a scratch Playwright run: a module worker that awaited a 200 ms timer before listening lost the message main posted at once, in Chromium and Firefox; the same worker without the await received it. Browsers do not queue past top-level await.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: When 23.7 first calls `ModelWorkerLifecycle.start(spawn)` from `start-main.ts`, `app/vite.config.ts` must set `worker: { format: 'es' }`, not Vite's default `'iife'`, because `app/src/start-model-worker.ts` awaits `autoLoad()` at top level, which an `iife` worker bundle can't hold.
  evidence: 23.4 sets `worker.format: 'es'` only in `app/vitest.config.ts` (its final conformance pass dropped the `vite.config.ts` change as unused until a production spawn exists); 23.7's ticket doesn't mention it; Vite docs: `worker.format` default `'iife'`.
  closed: 2026-11-08, stale: `app/vite.config.ts` sets `worker: { format: 'es' }`.

- source_plan: `_bmad-output/architecture-keeb-cad-layout-model/reviews/review-adversary-2026-11-07-batch.md`
  summary: The story that fills the case worker (OCCT/replicad glue, quickjs-wasi's WASM) builds and starts it under `worker.format: 'es'`, which 23.7 sets for every worker; 23.7 checks only the model worker, the one it spawns.
  evidence: adversary gate L6 (`worker.format 'es'` is global to Vite's worker build); `app/src/case.worker.ts` is a stub today.
  owner: the story that fills the case worker.

- source_plan: `_bmad-output/architecture-keeb-cad-layout-model/reviews/review-reconcile-tickets-2026-11-07-batch.md`
  summary: The first story that declares a blueprint input of kind `quantity` codes model/main's `checkInputs` check of its unit and literal against the pinned `DeclaredInput.unit` and its `range` (not below 0 is `range.min`; `negative-length` never reaches inputs), with rows just below, on and just above a range bound.
  evidence: spine gate M7 (2026-11-07) and the Data Schema's `InputValue` comment; 13.4's choc-key `size` input is an option, so no M1 ticket names a quantity input yet.
  owner: the first story that declares a quantity input.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-a-new-design-autosaves-and-reopens-from-the-browser-plan.md`
  summary: Settle in the spine how editor's banner (16.x) reads autosave's failure state, since autosave lives in app and AD-10 says nothing imports app (move autosave to commands, or a token row in AD-25).
  evidence: 23.5's gap reader, 2026-11-07; Sergii chose to defer it to 16.x's spine pass, since nothing in 23.5 reads the state.
  owner: 16.x, at its spine pass.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-a-new-design-autosaves-and-reopens-from-the-browser-plan.md`
  summary: Drop from 23.5's verify the sentence "in Chromium a write refused under a quota lowered with cdp()'s Storage.overrideQuotaForOrigin returns quota-exceeded (…)", and reword "a load with a missing routing file saves no reset version" to the unit level (a bundle without routing handed to the load flow), since storage holds all three files.
  evidence: Sergii, 2026-11-07, during 23.5's build (J1, J5): storage keeps full BundleTexts; the quota browser test is dropped because the mapping's Node rows and the memory backend cover it (spine AD-13 updated). The build never writes a ticket file, so the PO folds this in.
  closed: 2026-11-08, stale: folded into the ticket tree, per the 2026-11-07 fold entry.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-a-new-design-autosaves-and-reopens-from-the-browser-plan.md`
  summary: Reword 23.5's verify "a reset save refused for space while an autosave version remains drops the oldest autosave version and succeeds" to "while two autosave versions remain … drops the older", since a quota prune never drops a design's newest version.
  evidence: Sergii, 2026-11-07, 23.5 review Q1 (spine 8dbe213): a design must never lose its last stored copy. The build never writes a ticket file, so the PO folds this in.
  closed: 2026-11-08, stale: folded into the ticket tree, per the 2026-11-07 fold entry.
- source_plan: none
  summary: Split from 23.7, its own story after it: editor's UiAction mechanism (UiAction classes, registerUiAction, the uiActions multi token), design's CommandHandle and ActionHandle gaining an optional static hotkeys, editor's one shortcut registry feeding the hotkey layer, and the one invoke path with per-entry input builders, with 23.7's two hotkey verify sentences.
  evidence: Sergii chose Split at 23.7's multi-goal check (2026-11-07): it can be reviewed and merged as its own PR once 23.7 hands the container to editor. The build never writes a ticket file, so the PO slices it.
  closed: 2026-11-08, stale: folded as 23.19, per the 2026-11-07 fold entry.
- source_plan: none
  summary: Split from 23.7, its own story after it: the idempotent dev-only devtools.ts with a build check that the production bundle holds none of it, and the lint rule rejecting a component that imports a service as a value, with 23.7's two verify sentences for them.
  evidence: Sergii chose Split at 23.7's multi-goal check (2026-11-07): neither is needed for launch to open a design. The build never writes a ticket file, so the PO slices it.
  closed: 2026-11-08, stale: folded as 23.20, per the 2026-11-07 fold entry.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-app-opens-the-last-design-plan.md`
  summary: `app/src/autosave/autosave.spec.ts`'s `arrange` resolves `store`, `storage`, `autosave`, `lifecycle` and `flow` for every test (`return { store: container.resolve(DesignStore), storage: …, autosave: …, lifecycle: …, flow: … }`), against AGENTS.md's "Arrange only what the test uses, passed as arguments to an `arrange` helper"; 23.7's new `reportFailure` test arranges only what it uses.
  evidence: 23.7's plan conformance reader (precedent check), 2026-11-07.
  closed: 2026-11-08, fixed by the refactor sweep: `arrange` returns the container and each test resolves what it uses.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-app-opens-the-last-design-plan.md`
  summary: Reword 23.7's "When load or listDesigns returns storage-unavailable, launch opens a new, unsaved design and sets autosave's failure state to that error" to "… launch opens a new design, whose failed autosave sets autosave's failure state", and its verify to match.
  evidence: Sergii, 2026-11-07, 23.7's plan (gap reader, reachable states): the new design's own failed save sets the same state, so a launch-side setter is unobservable. The build never writes a ticket file, so the PO folds this in.
  closed: 2026-11-08, stale: folded into the ticket tree, per the 2026-11-07 fold entry.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-app-opens-the-last-design-plan.md`
  summary: `packages/commands/src/design/new-design.spec.ts` registers a fake `DesignStore` and asserts `expect(handed).toEqual([…])`, what the fake was handed, against AGENTS.md's "Assert what a function returns or a visible effect; use `toHaveBeenCalled*` only when the call is the behaviour"; the real store's `current` is the visible effect.
  evidence: 23.7's final conformance pass (precedent check), 2026-11-07; 23.7's OpenStoredDesign spec asserts on `current`.
  closed: 2026-11-08, fixed by the refactor sweep: the spec uses the real store and asserts `current`.
- source_plan: none
  summary: Folded into the ticket tree on 2026-11-07 (Sofia's replan after 23.7's split): the two 23.7 split-offs (now 23.19 and 23.20), 23.7's failure-state rewording, 23.5's cdp() quota and missing-routing rewording, and 23.5's keep-the-newest prune rewording. These entries above need no further action.
  evidence: epic-a-new-design-opens.md Notes, Decision 2026-11-07 (replan after 23.7's build split).
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-uiactions-and-the-shortcut-registry-run-every-hotkey-plan.md`
  summary: A handle has no way to keep its hotkey on inside a focused field; `ui`'s `HotkeyLayer` registers every entry with `enableOnFormTags: false`, while EXPERIENCE.md › Shortcuts keeps "Ctrl+K, Ctrl+S, Ctrl+Shift+S, Ctrl+O and Ctrl+Z / Ctrl+Shift+Z" global with a field focused.
  evidence: Found at 23.19's plan checkpoint (2026-11-07); no 23.19 entry needs it, 16.4's mod+Z is the first. Sergii approved leaving it out of 23.19.
  owner: 16.4.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-uiactions-and-the-shortcut-registry-run-every-hotkey-plan.md`
  summary: `packages/editor/src/App.vue`'s `.editor-shell__bar` sets `border-bottom: 1px solid #ccc;`, a literal colour, against AD-26's design tokens; 23.19 touches `App.vue` only to call `useShortcuts()` and leaves it.
  evidence: 23.19's plan conformance reader (precedent check), 2026-11-07.
  closed: 2026-11-08, by 23.8: `App.vue` keeps only `useShortcuts()` and a bare `RouterView`; the shell's chrome takes its colours from `ui`'s tokens.
- source_plan: none
  summary: `packages/ui/src/tooltip/Tooltip.spec.ts`'s two focus tests ("shows its content once the trigger is focused", "portals its content out of the rendered component") fail intermittently in CI's Firefox only; `element().focus()` never shows `getByRole('tooltip')` within 15 s.
  evidence: CI runs 42348232952, 42362055241, 42396210542 (main) and 42402077826 (PR #31) on 2026-11-07, seeds 1794033853063, 1794045694625, 1794072393500, 1794076616865; seed 1794076616865 passes locally (ui Firefox project once, full suite three times). Not order or non-determinism; a CI headless-Firefox timing race between focus and Reka's tooltip open, or state the file's fake-timer pointer tests leave, is unconfirmed and left to Sergii (flaky-triage step 6). No timeout, retry or test change made. Owner: whoever next touches ui's tooltip.
  closed: 2026-11-08, by #37. Not a race with Reka and not the fake-timer tests: Firefox focuses a test file's iframe only when something in it asks, so after another file held focus `document.hasFocus()` was false before the test began (probe, 3 of 3 on seed `1794116896357`; ruled out file order and file parallelism). A Firefox-only setup file, `tooling/vitest/focus-test-frame.ts`, calls `window.focus()` before each test in every browser-mode config.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-components-reach-services-only-through-composables-plan.md`
  summary: `packages/ui/src/button/Button.spec.ts`'s "keeps focus when its disabled reason is cleared" failed once in Firefox during 23.20's build (focus on `body`, not the button); a second, unnamed failure was in an earlier run of the same session.
  evidence: local `pnpm test`, 2026-11-08, seed `1794115850237`; later runs green (seed `1794115928614` among them). 23.20 touches no `ui` file. Same family as the tooltip focus flake above. Not triaged: the build's implementer re-ran the suite instead, which flaky-triage warns against; owner is whoever next touches `ui`'s focus tests (flaky-triage with the seed).
  closed: 2026-11-08, by #37; same cause as the tooltip focus entry above (unfocused Firefox test frame). Its CI seed `1794077267560` passes the whole suite with the fix.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-invoke-path-takes-a-caller-s-input-and-answers-availabil-plan.md`
  summary: `ui`'s `Button.spec.ts` "with a disabled reason shows the reason in a tooltip once focused" timed out in Firefox in CI (expect.poll), a second flaky test in that file beside 23.20's.
  evidence: PR #36 run 42454209243, seed `1794118810293`, on a docs-only commit; the re-run of the failed job passed. 23.21 doesn't touch `ui`. Needs flaky-triage, not a retry.
  closed: 2026-11-08, by #37; same cause as the tooltip focus entry above. Seed `1794118810293` reproduced it locally under 2 CPUs and passes with the fix.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-editor-frame-shows-the-design-plan.md`
  summary: Split from 23.8, its own story after it: the status strip's contents (error and warning counts from issues held with their seq, dimmed with ◌ while behind, 0 before the first; the running stage past 1000 ms with whole seconds and Restart; failed: <message> naming the stage) with the workers changes they read (issues with seq, the running stage with its arrival time, ModelWorkerStatus widened to WorkerFailed { message, stage? }, the ErrorEvent message or a fixed text, the crash count reset only by an issues post, never by stage-started or derived-files) and the RestartModelWorker action in commands, with 23.8's verify sentences for them.
  evidence: 23.8's plan was about 5,100 tokens without its boundary table, over the 3,000 cap; Sergii chose the split on 2026-11-08. 23.8 keeps the frame (top bar, tabs with URL and focus, rail and Tree slide-out, canvas hints, inspector region, F6 regions, the strip as an empty region). Tickets not done that name 23.8 or a split-off term: 13.7 (epic-see-corneys-keys/tickets/tickets.toml:129, after = ["23.8", 22]; "feeds the status strip's cursor coordinates … added to 23.8's" strip, and "the status strip showing updating"); epic-routing-and-fab's story 2 (epic-routing-and-fab/tickets/tickets.toml:16, "after the model worker's crash cap every model-worker stage counts as failed … until Restart"); epic-keep-my-work's undo/redo story (epic-keep-my-work/tickets/tickets.toml:22–25, after = [1, "14.1", "23.19", "23.8"], "on 23.8's top bar", the frame half, which stays in 23.8); 23.8's own entry (epic-a-new-design-opens/tickets/tickets.toml:238–239) still carries the split-off description and verify sentences.
  closed: 2026-11-08, stale: built as 23.23 (#39).
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-editor-frame-shows-the-design-plan.md`
  summary: The empty Layout hint writes `G` and `Ctrl+K` out by hand; 13.25 (Add group; split from 13.7 and 13.24, 2026-11-10) and the palette story render them from their handles' `hotkeys` through `formatHotkey`.
  evidence: 23.8's Decision (Sergii): no Add group or palette entry exists yet to read them from; AD-26 "Every `kbd` hint is formatted by its formatter".
  owner: the palette story (`Ctrl+K`'s handle).
  progress: 2026-11-12, by 13.25: both keys render as `UiKbd` chips; `G` reads `StartAddChainGroup.hotkeys[0]`, `Ctrl+K` stays `hotkey="mod+K"` in `LayoutCanvas.vue` until the palette story gives it a handle.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-editor-frame-shows-the-design-plan.md`
  summary: `packages/editor/src/invoke/invoke.spec.ts` repeats its `unavailable` assertion in about seven tests, and its `arrange` registers `container.register(Recorder).useClass(Recorder)` for every test.
  evidence: AGENTS.md "Write a shared assertion once" and "Arrange only what the test uses, passed as arguments to an `arrange` helper"; 23.8's conformance pass.
  closed: 2026-11-08, fixed by the refactor sweep: one `expectUnavailable`; `Recorder` is passed only by tests that use it.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-editor-frame-shows-the-design-plan.md`
  summary: `packages/workers/src/model-worker/model-worker-lifecycle.spec.ts`'s `arrange` runs `registerCommand(container, RenameDesign)` for every test.
  evidence: AGENTS.md "Arrange only what the test uses, passed as arguments to an `arrange` helper"; 23.8's conformance pass.
  closed: 2026-11-08, fixed by the refactor sweep: `RenameDesign` is registered only for tests that run it.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-editor-frame-shows-the-design-plan.md`
  summary: `ui`'s hotkey layer calls `preventDefault()` on every matched key, so a key whose entry is unavailable (Esc with the slide-out closed, 1 at layout) is swallowed.
  evidence: `packages/ui/src/hotkeys/hotkey-layer.ts` prevents before the registry asks `available`; 23.8 adds Escape, F6 and 1–5 as UiAction hotkeys.
  owner: 16.4, the first chord.
  note: AD-26 says `Alt+arrow and every Ctrl chord call preventDefault`.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-editor-frame-shows-the-design-plan.md`
  summary: Editor browser specs run at a 1366x768 page viewport, while DESIGN.md › Layout specifies "a 1366×768 minimum laptop viewport (1366×696 inside the browser)", so no test checks the shell at the 696px-high page.
  evidence: 23.8's ticket and boundary row say 1366x768 and its shell-boxes row expects a 1002x696 canvas; at DESIGN's 1366×696 page the canvas would be 624 high. The shell is flex, so nothing breaks today; a ticket or DESIGN wording fix settles which height is meant.
  closed: 2026-11-08, decided (Sergii): editor browser specs run at a 1366×696 page, the inside of the browser DESIGN.md names; the canvas row is 1002×624.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-editor-frame-shows-the-design-plan.md`
  summary: Editor specs' `afterEach(resetColorScheme)` runs before `mountShell`'s `onTestFinished` unmounts the app, so VueUse's `useColorMode` listener may write `data-theme` back after the reset (medium, unverified).
  evidence: Vitest runs `onTestFinished` after `afterEach`; settle it with a run that reads `document.documentElement.dataset.theme` after teardown, or by resetting inside the unmounting `onTestFinished`. Seen green on three shuffled runs.
  closed: 2026-11-08, settled by a run and fixed: a probe read `data-theme="light"` after teardown in 1 of 24 tests, so the reset moved into the unmounting `onTestFinished`; the probe then read none in 72 of 72.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-status-strip-shows-the-model-worker-s-state-plan.md`
  summary: The violations-panel story answers whether `failed:` also shows in that panel (Sofia's pick: no).
  evidence: EXPERIENCE.md's Output states row says the message is "also in the violations panel"; epic-a-new-design-opens leaves that panel to epic-change-a-parameter.
  owner: the violations-panel story.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-status-strip-shows-the-model-worker-s-state-plan.md`
  summary: bmad-ux reconciles EXPERIENCE.md's Output states `◌` for `waiting for edit to finish` and `rebuilding N%` with AD-11.
  evidence: 23.23 builds to the spine's glyphs (`◌` on behind counts, the running stage as `parts 2 s`), because no live stage posts a percent (Decision (Sergii)).
  owner: `bmad-ux`.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-status-strip-shows-the-model-worker-s-state-plan.md`
  summary: 13.17/13.18 add the non-zero severity row to the status strip's counts.
  evidence: 23.23 tests only zero counts: "only zero counts can be posted, so this story tests zero and dimmed zero"; AGENTS.md "Arrange only a state real commands could reach".
  owner: 13.17/13.18.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-status-strip-shows-the-model-worker-s-state-plan.md`
  summary: `packages/editor/src/design/use-open-design.ts:9` holds an `Option` in a computed.
  evidence: AD-24: "A value that is stored (a computed, a ref) … is unwrapped first".
  closed: 2026-11-08, fixed by the refactor sweep: returns `Frozen<Design> | undefined`.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-status-strip-shows-the-model-worker-s-state-plan.md`
  summary: `packages/workers/src/model-worker/model-worker-lifecycle.spec.ts`'s `arrange` runs `registerCommand(container, RenameDesign)` for every test.
  evidence: AGENTS.md "Arrange only what the test uses"; 23.23's new rows arrange only what they use.
  closed: 2026-11-08, fixed by the refactor sweep: `RenameDesign` is registered only for tests that run it.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-status-strip-shows-the-model-worker-s-state-plan.md`
  summary: `model-worker-lifecycle.spec.ts`'s `aViolation` literal has no `schema/testing` builder; the first violation kind's story adds it.
  evidence: AGENTS.md "Build schema values the test doesn't read with the concept's test builder".
  owner: the first violation kind's story.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-devtools-inspect-services-and-commands-in-development-plan.md`
  summary: `packages/editor/src/invoke/invoke.spec.ts` registers its `Recorder` in `arrange` for every test, including tests that never read it.
  evidence: offending line `container.register(Recorder).useClass(Recorder)`; rule `Arrange only what the test uses, passed as arguments to an `arrange` helper`. 23.22's new rows take it as an argument; the existing rows are left as they are.
  closed: 2026-11-08, fixed by the refactor sweep: `Recorder` is passed only by tests that use it.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-refactor-sweep-plan.md`
  summary: Fold into 23.8's ticket wording that editor browser specs run at a 1366×696 page and the shell-boxes row's canvas is 1002×624, not 1366×768 and 1002×696.
  evidence: Sergii, 2026-11-08, the refactor sweep's plan: `DESIGN.md` says `1366×768 minimum laptop viewport (1366×696 inside the browser)` and the page a test renders is the inside of the browser. The build never writes a ticket file, so the PO folds this in.
  closed: 2026-11-08, folded into 23.8's description and verify.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/epic-a-new-design-opens-retrospective.md`
  summary: E2: the crash cap can't be reached by a worker that posts `issues` before crashing, since every whole design posts `issues` first and that post resets the count.
  evidence: `packages/workers/src/model-worker/model-worker-lifecycle.ts:131-135`, `packages/pipeline/src/pipeline/pipeline.ts:49`; the code follows AD-11 as written.
  owner: Sergii, then `bmad-architecture`; latent until a stage can crash.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/epic-a-new-design-opens-retrospective.md`
  summary: E3: `format-too-new` at launch falls through to another or a new design, replaces the URL and shows nothing.
  evidence: `app/src/launch/launch.ts:33-47`, spine AD-8. Unreachable until the format version changes.
  owner: epic-keep-my-work.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/epic-a-new-design-opens-retrospective.md`
  summary: E4: `LoadFlow`'s `emptied` outcome and load failures are reported nowhere.
  evidence: `packages/commands/src/load/load-flow.ts:11-20`, `open-stored-design.ts:19-21`, spine AD-13 One load flow.
  owner: 16.1, with the notices.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/epic-a-new-design-opens-retrospective.md`
  summary: E6: `NewDesign` and `OpenStoredDesign` don't align the route; only `Launch` does.
  evidence: `app/src/launch/launch.ts:21`, `packages/editor/src/router/design-location.ts:31-33`.
  owner: epic-keep-my-work's Start screen story.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/epic-a-new-design-opens-retrospective.md`
  summary: E7: `DesignStorage.load` isn't serialized with `save`, and its `versions` then `read` are two transactions, so a replacement between them reads as `not-found`.
  evidence: `packages/storage/src/design-storage/design-storage.ts:37-49`. Needs a second writer.
  owner: the Web Lock story.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/epic-a-new-design-opens-retrospective.md`
  summary: E8: duplicate hotkeys are never checked, and a handle with a hotkey, a required input and no builder fails silently.
  evidence: `packages/editor/src/shortcuts/shortcut-registry.ts:18-27,55-59`. None exist today.
  owner: the first story that adds a hotkey a second entry could claim.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/epic-a-new-design-opens-retrospective.md`
  summary: E10 (traced, not run): a KDL node named `constructor` reads `Object.prototype` from `entries` and takes the schema path.
  evidence: `packages/design-file/src/codec/read-kdl.ts:43`. Reachable from a hand-edited file once Open exists.
  owner: 16.2.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/epic-a-new-design-opens-retrospective.md`
  summary: E11: `spawn()` throwing synchronously; `writeBundle` throwing inside the commit emit, skipping later listeners; `Autosave` and `ModelWorkerLifecycle` not disposable; (not verified) `indexedDB` read eagerly where the accessor itself throws.
  evidence: `packages/workers/src/model-worker/model-worker-lifecycle.ts:103`, `app/src/autosave/autosave.ts:28`, `packages/storage/src/browser/browser-storage-access.ts:3`. Unreachable today.
  owner: the next refactor sweep.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/epic-a-new-design-opens-retrospective.md`
  summary: A3: small duplications: plain-object check, code-unit comparator, `Dispatcher` registration, a `committed` helper in four specs.
  evidence: `packages/hashing/src/is-plain-object.ts:2-3`, `packages/messaging/src/sending/assert-plain.ts:20-21`, `packages/hashing/src/canonical-encoding.ts:19`, `packages/design/src/parsing/format-issue-paths.ts:6`.
  owner: the next refactor sweep.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/epic-a-new-design-opens-retrospective.md`
  summary: A4: hand-written `switch` on tags in `design-file`, where other packages use ts-pattern.
  evidence: `packages/design-file/src/codec/schema-fields.ts:23`, `read-kdl.ts:67`.
  owner: the next refactor sweep.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/epic-a-new-design-opens-retrospective.md`
  summary: E9: should opening a design with no edit write autosave and move `savedAt`, which orders `listDesigns`?
  evidence: In the served build the stored version went from 2 to 4 with no edit; `app/src/autosave/autosave.ts:10-11` saves on `commit` and `accept`.
  owner: Sergii, before epic-keep-my-work's recent list.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/epic-a-new-design-opens-retrospective.md`
  summary: E1: should a nested reactive input keep throwing `DataCloneError` from `run`, or be unwrapped or refused as `input-invalid`?
  evidence: `packages/design/src/store/design-store.ts:198-200` unwraps only the top level; 23.16's plan line 130 chose to let the error through but doesn't mention nested proxies.
  owner: Sergii, before the first command whose input comes from reactive UI state.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-the-sandbox-runs-a-blueprint-lane-plan.md`
  summary: Out-of-memory results depend on garbage left by earlier runs, so the same lane can pass or fail by VM history.
  evidence: BP-4; `packages/blueprint/src/pool/blueprint-vm.ts`.
  owner: the first story a real blueprint hits the limit.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-the-sandbox-runs-a-blueprint-lane-plan.md`
  summary: Handles are integers with no 2D/3D tag; a lane can pass a 2D handle to a 3D operation.
  evidence: BP-4 Deferred; `packages/blueprint/src/lane/handle-table.ts`.
  owner: the first story with 3D operations.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-the-sandbox-runs-a-blueprint-lane-plan.md`
  summary: The unknown-query check in the worker (a query not in `blueprint`'s list) is not built: there is no query yet.
  evidence: `_bmad-output/initiative-keeb-cad-m1/architecture-blueprints/architecture-blueprints.md` Failure kinds.
  owner: the first query's story.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-the-sandbox-runs-a-blueprint-lane-plan.md`
  summary: `checkNestedInputs` skips a nested quantity's `range`: its bounds are expressions the stub cannot parse.
  evidence: `packages/blueprint/src/lane/check-nested-inputs.ts`.
  owner: 14.2, with the expression grammar.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-the-sandbox-runs-a-blueprint-lane-plan.md`
  summary: The AC reference run of the sandbox timings: the 2026-11-08 re-run was on battery, `power-saver`.
  evidence: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/sandbox-verdict.md`.
  owner: whoever next has AC at hand.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-library-blueprints-build-and-run-in-the-model-worker-plan.md`
  summary: Add BP-8's refusal of an anchor input on a `parts` lane with the story that adds `InputValue`'s anchor variant.
  evidence: 13.21 fails every anchor input at build, so no source can reach the check. Decision, Sergii, 2026-11-09.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-library-blueprints-build-and-run-in-the-model-worker-plan.md`
  summary: Split `packages/blueprint/src/testing/a-pinned-blueprint.ts` by concept and build `aContract` on `aBlueprintDeclaration`.
  evidence: `export const MIB = 1024 * 1024` beside pins and scripts; AGENTS.md `helpers over one concept share a file named for it`, `never a copied literal`.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-library-blueprints-build-and-run-in-the-model-worker-plan.md`
  summary: Import `devtoolsPluginId` in `tooling/check-dist/check-dist.ts` through a package export.
  evidence: `from '../../packages/editor/src/devtools/plugin-id.ts'`; spine `Each closes its public surface through package \`exports\``.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-library-blueprints-build-and-run-in-the-model-worker-plan.md`
  summary: Decide or pin `filesContaining`'s `localeCompare` sort, its throw on an empty folder and an empty needle.
  evidence: `tooling/check-dist/files-containing.ts` `.toSorted((a, b) => a.localeCompare(b))`; no test has two results; AGENTS.md `Give every threshold three rows`.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-library-blueprints-build-and-run-in-the-model-worker-plan.md`
  summary: Replace the cast in `check-nested-inputs.ts` and the parallel `NestedInputDeclaration` with `schema`'s types.
  evidence: `(value as { value: string }).value`; AD-24 `A type whose value has a schema is inferred from it`.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-library-blueprints-build-and-run-in-the-model-worker-plan.md`
  summary: Move recording out of `arrange()` in `packages/pipeline/src/pipeline/pipeline.spec.ts`.
  evidence: `port2.addEventListener('message', (event) => posts.push(event.data))` inside `arrange`; AGENTS.md `Start recording after arrange`.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-library-blueprints-build-and-run-in-the-model-worker-plan.md`
  summary: 13.18 re-enters the backoff after running stages when a VM was lost mid-stage.
  evidence: `blueprint-pause.ts` reads `hasUnavailable` only after its own pause; no stage calls `runLane` until 13.18. Decision, Sergii, 2026-11-09; on 13.18's ticket.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-a-new-design-holds-a-default-key-part-plan.md`
  summary: Show a part's last good output for a later failing run.
  evidence: 13.18 stands the slot in on every failure; no command changes a part's inputs yet, so only 13.4 can reach a later failing run. Decision (plan).
  owner: 13.4.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-a-new-design-holds-a-default-key-part-plan.md`
  summary: Report a lane's `problems` as violations once the `blueprint` violation kind arrives.
  evidence: `createDerivations` reads only a run's `rectangle` output; BP-8 `problems` become `blueprint` violations; `ViolationKind` has no `blueprint` member.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-a-new-design-holds-a-default-key-part-plan.md`
  summary: Pass quantity inputs to lanes as numbers once `expr` has an evaluator.
  evidence: `createDerivations` hands lanes the resolved inputs as written, a quantity as `{ type: 'quantity', value }`; BP-8 `quantities as numbers in mm or deg`; `expr` exports only `parseExpression`.
  owner: 13.4.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-one-corney-column-resolves-from-a-chain-plan.md`
  summary: Sofia updates 13.22's ticket: model's layout rows already carry `part` as the PartsOutput row index, so the LayoutOutput codec no longer turns a run id into a row.
  evidence: Sergii's answer on 13.2 (2026-11-10); the spine's Data Schema `LayoutOutput.part` line was updated to match; the build workflow never writes ticket files.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-one-corney-column-resolves-from-a-chain-plan.md`
  summary: Sofia adds to 13.3's ticket that DuplicateNode remaps references inside the copy through the reference walk, with its tests, now that anchors make a node-to-node reference reachable.
  evidence: Sergii, 2026-11-10: nothing in 13.2's schema points at a node, so the remap can't be tested there; spine AD-2 updated to say it lands with 13.3's anchors.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-one-corney-column-resolves-from-a-chain-plan.md`
  summary: Precedent fix: packages/model/src/parts/create-derivations.ts holds rectangleOf, partsOutputOf, unresolved and failure beside createDerivations; move each helper to its own file.
  evidence: AGENTS.md "Give each file one kind of thing"; found by 13.2's conformance review.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-one-corney-column-resolves-from-a-chain-plan.md`
  summary: Precedent fix: DeletePartInput sits in packages/commands/src/types.ts; move it to packages/commands/src/parts/types.ts.
  evidence: AGENTS.md "type RenameDesignInput = v.InferOutput<typeof renameDesignInputSchema> in the folder's types.ts"; found by 13.2's conformance review.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-one-corney-column-resolves-from-a-chain-plan.md`
  summary: Precedent fix: app/src/default-key-part.spec.ts arrange() returns lifecycle, which the parts.deletePart test never uses.
  evidence: AGENTS.md "Arrange only what the test uses, passed as arguments to an arrange helper"; found by 13.2's conformance review (low).

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-one-corney-column-resolves-from-a-chain-plan.md`
  summary: Precedent fix: packages/commands/src/parts/delete-part.spec.ts wires DesignStore and modules inside commands; move that wiring to an app integration test and keep a unit test of DeletePart.apply.
  evidence: AGENTS.md "test wiring between packages as integration in pipeline or app"; found by 13.2's final conformance pass.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-one-corney-column-resolves-from-a-chain-plan.md`
  summary: Precedent fix: packages/commands/src/parts/delete-part.ts casts the draft with "as Mutable<Design>", which hides AD-2's compile check that Writable<Design> is assignable to Mutable<Design>; drop the cast.
  evidence: spine AD-2 "Writable<Design> must be assignable to Mutable<Design>, checked by the compiler"; found by 13.2's final conformance pass.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-one-corney-column-resolves-from-a-chain-plan.md`
  summary: Flaky under full-suite load, untouched by 13.2: tooling/lint/no-focused-tests.spec.ts "allows a plain it" failed once in pnpm test and passed alone three times; it loads the ESLint config cold under COLD_CONFIG_TIMEOUT. Run flaky-triage on it.
  evidence: 2026-11-10, 13.2 branch, full run 1 after review patches; 3 isolated passes; git diff since baseline touches nothing under tooling/lint.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-one-corney-column-resolves-from-a-chain-plan.md`
  summary: Flaky under full-suite load, untouched by 13.2: packages/editor/src/slide-out/slide-out.spec.ts (Firefox) "opens and closes from the rail button, which says whether it is expanded" failed once in pnpm test and passed alone twice. Run flaky-triage on it.
  evidence: 2026-11-10, 13.2 branch, full run 2 after review patches; 2 isolated passes; the branch changes nothing in packages/editor.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-the-layout-set-reaches-main-plan.md`
  summary: Focus reordering in pipeline (AD-11 Newer seqs): sets ordered by the workspace table, a yield between stages, and a focus arriving during the hidden phase getting its set next, with its test; goes to the first story that fills a second workspace set (shapes or plates for Outline, pcb placement for PCB, firmware).
  evidence: Sergii 2026-11-10, 13.22 planning: with the Layout set the only set any stage fills, every focus posts the same message in the same order, so no test of the reordering can fail when it breaks. Tree search: no not-done ticket names the reordering; 13.7 (tickets.toml line 129) names "story 22's posted Layout set" for the posting, not the reordering.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-the-layout-set-reaches-main-plan.md`
  summary: Precedent fix: packages/workers/src/model-worker/model-worker-lifecycle.ts comments restate the code ("// The whole list of the last post the gate accepted, with that post's seq.", "// Returns the call that stops watching the worker and terminates it."); delete them.
  evidence: AGENTS.md "Write a comment only for a why the code can't say"; found by 13.22's final conformance pass.

- source_plan: none
  summary: Split from 13.7 — the Layout canvas viewport: a viewport service stored per design id in localStorage and shared across 2D workspaces; wheel zoom toward the cursor x1.1 per notch between 10% and 2000%; middle or Space drag and trackpad pan; F fits the selection, else the whole board, with 24 px padding; the status strip's cursor coordinates (model mm through 23.6's formatter, 'x 12.34 y -5.67') and zoom as a whole percent; the tunable constants in one place; the handle hit-radius check at 50%, 100% and 400%.
  evidence: Sergii 2026-11-10, 13.7 build step 1 multi-goal check: 13.7 held three independently shippable goals (canvas with selection; viewport; canvas editing) far past the 3000-token plan cap; split as A (canvas, 13.7 keeps) → B (this) → C. Tree search for 13.7 and this goal's terms: 14.6 (epic-change-a-parameter/tickets/tickets.toml:77, after ["13.3", "13.7"]; verify "clicking it selects both keys and fits them") needs fit; 15.4 (epic-drag-keys/tickets/tickets.toml:43, after ["13.7", 2, "16.4"]) drags on the canvas in model mm; 23.8 (done) and epic-a-new-design-opens R3 name "cursor and zoom arrive with epic-see-corneys-keys's viewport".

- source_plan: none
  summary: Split from 13.7 — editing from the Layout canvas: G adds a free group and S a slot through an add flow with an optional id field, pre-filled with a minted id and editable before commit (13.2's id input; an id already in the design refused; ids never change afterwards); Ctrl+D duplicates the selection after the original and Delete deletes it (one DeleteNode with the selected ids), each through the design store.
  evidence: Sergii 2026-11-10, 13.7 build step 1 multi-goal check (same split as the viewport entry; C after A, independent of B). Tree search: 19.2 (epic-plates-to-dxf/tickets/tickets.toml:9, "through the add flow's optional id field pre-filled with a minted id (13.7)") reuses this goal's add flow; 14.5 (epic-change-a-parameter/tickets/tickets.toml:66, after ["13.7", "13.8"]) edits the selection that 13.7 keeps; 13.8 (epic-see-corneys-keys) and the epic's R6 "G, S, Ctrl+D and Delete add, duplicate and delete".

- source_plan: none
  summary: Ctrl+D on a multi-selection: 13.24 duplicates only a single selected node (DuplicateNode takes one id; DuplicateSelection is unavailable otherwise); duplicating several nodes, as one command and one undo step, goes to the story that brings multi-selection (15.4's box select or Shift-click), with the test that DuplicateSelection is unavailable for several selected nodes.
  evidence: Sergii 2026-11-10, re-slice of 13.7: packages/commands/src/layout/duplicate-node-input-schema.ts is v.strictObject({ id: idSchema }); no story before 15.4 can select several nodes. Rejected: DuplicateNode taking ids now (a spine change for an unreachable case) and running it once per id (several undo steps for one keypress).

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-layout-canvas-draws-resolved-keys-with-selection-plan.md`
  summary: Split from 13.7 — group frames on the Layout canvas: each group drawn as an outline that follows its children's stagger (not a rectangle), with its ⠿ tab and a 2px selection frame when selected; model posts the outline, since canvases compute no geometry (AD-10, AD-22), so a spine pass first defines it in LayoutOutput (hull or union, margin, rotation), and DESIGN.md's Group frame is redrawn with a side-by-side preview for Sergii's pick.
  evidence: Sergii 2026-11-10, 13.7 plan Open Question 1: the board fit may use the browser's SVG getBBox, but a group frame should follow staggered columns, not be a plain rectangle; that outline is geometry, which no posted output carries (schema/src/layout-output.ts). Picked 'split frames out': 13.7 draws keycaps and anchor links, and groups stay selectable in the tree. Tree search for 13.7 and this goal's terms: 13.7 itself (epic-see-corneys-keys/tickets/tickets.toml:131, "draws placed keys as keycaps with group frames and anchor links"); 15.4 (epic-drag-keys/tickets/tickets.toml:40, "Left-drag on a key, or on a group frame's tab, previews through 15.1's service", after ["13.7", 2, "16.4"]) drags by the group frame's tab, which this goal adds. epic-layout-editor mentions group frames but is dropped.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-layout-canvas-draws-resolved-keys-with-selection-plan.md`
  summary: `app/src/layout-set.spec.ts` computes an expected value the way production does (`const KEY_RUN = `key@${argumentHash({})}``).
  evidence: 13.7 conformance review; AGENTS 'no expected value computed the way production computes it, except by calling a function the requirement names'.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-layout-canvas-draws-resolved-keys-with-selection-plan.md`
  summary: A stand-in slot's ▲/● `unresolvable-reference` badge on the Layout canvas (EXPERIENCE.md Canvas keys row; DESIGN.md Unfitted slot) has no owning story.
  evidence: Sergii 2026-11-10 at 13.7's planning: 13.7 draws the dashed outline only; no tickets.toml names canvas violation glyphs. Sofia to place it with the canvas violation display.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-layout-canvas-draws-resolved-keys-with-selection-plan.md`
  summary: `app/src/layout-set.spec.ts` builds side-qualified ids by hand (`.layoutRow(`left/${node}`)`) and loops `expectOk` over the script (`for (const { command, input } of corneyIslandLayout) expectOk(store.runById(command, input))`).
  evidence: 13.7 conformance final pass; 13.7 adds `sideQualifiedId` to `model`'s root, which `app` can't reach (`.dependency-cruiser.mts:112` `app: { model: 'worker', … }`); AGENTS 'No `if` or loop around `expect`'.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-layout-canvas-draws-resolved-keys-with-selection-plan.md`
  summary: `app/src/launch/launch.spec.ts` asserts `expect(arranged.storedIds).not.toContain(opened(arranged).id)` with no stored designs, so it cannot fail; 'never trying the older' asserts nothing about trying.
  evidence: 13.7 conformance final pass; AGENTS 'Give every test an `expect` that fails when the behaviour breaks.'
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-layout-canvas-draws-resolved-keys-with-selection-plan.md`
  summary: `tooling/check-dist/devtools-problems.ts:3` deep-imports `../../packages/editor/src/devtools/plugin-id.ts` past the package's `exports`; 13.7's `reference-designs-problems.ts` does the same because the root package can't resolve workspace packages under Node.
  evidence: 13.7 conformance final pass; spine AD-25 'Each closes its public surface through package `exports`.'
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-layout-canvas-draws-resolved-keys-with-selection-plan.md`
  summary: `packages/editor/src/status-strip/use-running-stage.ts` holds a constant, a helper and a composable in one file.
  evidence: 13.7 conformance final pass; AGENTS 'Give each file one kind of thing'.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-layout-canvas-viewport-zooms-pans-and-fits-plan.md`
  summary: The automated check that canvas handles keep the `canvas-hit-radius` (8 px) hit radius at 50%, 100% and 400% moves from 13.23's verify to the first story that draws a handle (rotation handle or grab tab, epic-drag-keys); Sofia drops the clause from 13.23 and adds it there.
  evidence: Sergii 2026-11-10 at 13.23's planning; DESIGN.md `canvas-hit-radius: 8px  # canvas handles at any zoom (vertex, grab tab, rotation handle)`; after 13.7 and 13.23 the canvas draws keys (which scale by design) and anchor links ("not draggable", EXPERIENCE.md), so no handle exists to check (AGENTS 'Arrange only a state real commands could reach').
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-layout-canvas-viewport-zooms-pans-and-fits-plan.md`
  summary: `packages/ui/src/theme/use-theme-choice.ts` holds a type guard (`const isThemeChoice = (value: string): value is ThemeChoice => THEME_CHOICES.includes(value)`) beside its composable.
  evidence: 13.23 conformance pass 1; AGENTS 'Give each file one kind of thing'. 13.23 follows its `useStorage` serializer pattern with the schema in its own file.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-delete-and-ctrl-d-act-on-the-selection-plan.md`
  summary: `packages/commands/src/layout/layout-commands.spec.ts:34` shares one module-level `const offset = anOffset({ position: aVec2({ x: aDelta('2mm') }) })` across the forwarding table's cases.
  evidence: 13.24 conformance pass 1 (both readers); AGENTS 'Keep no mutable state at module level in a spec; create spies and recordings inside the test.' 13.24's row 18 builds its values inside each case instead.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-delete-and-ctrl-d-act-on-the-selection-plan.md`
  summary: `packages/editor/src/devtools/devtools-plugin.spec.ts` has no row for a refused invocation, so the err branch of `#addInvocation` and `#outcome` (`devtools-plugin.ts:109-131`: subtitle the rejection's `kind`, else `'error'`, and `data.result` the error) can break with no test failing.
  evidence: 13.24 post-look review pass (quick lens); AGENTS 'Give every test an `expect` that fails when the behaviour breaks'. Pre-existing; 13.24 only changed the event's title and data keys.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-g-and-s-add-groups-and-slots-through-the-add-flow-plan.md`
  summary: Where G and S's add flow (and P, which follows the same parent rule) puts a new node when several nodes are selected; 13.25 sends it to the root, as with nothing selected, and the multi-selection story (15.4) revisits it: the root, the first-selected node's group, or the group all selected nodes share (else the root).
  evidence: Sergii 2026-11-11 at 13.25's planning; no reachable state selects several nodes before 15.4 (13.24, Sergii 2026-11-11: only canvas and Tree clicks select), and the spine and EXPERIENCE.md ("the selected group (or the selected slot's group, else the root)") name only one selected node.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-g-and-s-add-groups-and-slots-through-the-add-flow-plan.md`
  summary: `packages/editor/src/selection/delete-selection.spec.ts:132` waits with a real timer (`await new Promise((settle) => setTimeout(settle, 0))`), and its `arrange` has a hidden default (`selected = [anId('a')]`).
  evidence: 13.25 conformance pass 1 (both readers); AGENTS 'Set time with Vitest's fake timers' and 'Arrange only what the test uses, passed as arguments to an `arrange` helper'. 13.25's rows wait with `expect.poll` and pass their arrangement instead.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-a-modal-owns-the-keyboard-plan.md`
  summary: `packages/ui/workbench/CanvasToggleFrame.vue` takes the glossary's **frame** for a workbench wrapper that gives a canvas toggle its SVG; rename it (13.27 named its own wrapper `DialogHost`).
  evidence: 13.27 conformance review (precedent check); spine glossary "**frame** | A position + rotation in the plane"; AGENTS 'Name a thing for what it does, checked against the spine's glossary'.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-availability-says-why-plan.md`
  summary: `packages/schema/src/id.spec.ts:11-13` asserts refusals as `expect(v.safeParse(idSchema, id).success).toBe(false)`, narrowing to the success flag instead of asserting the issues.
  evidence: 13.29 conformance pass 1 (precedent check); AGENTS 'assert whole values (`toEqual`, `toMatchObject`) instead of narrowing in the test'. 13.29's new rows 5–5b assert the messages with `toEqual`.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-flows-hold-the-open-flow-plan.md`
  summary: `const expectedScrim = 'rgba(35, 38, 52, 0.45)'` is declared in both `packages/editor/src/shortcuts/modal-keeps-keys.spec.ts` and `packages/ui/src/dialog/Dialog.spec.ts`; one shared value (AGENTS: "Write a shared assertion once").
  evidence: 13.30's final conformance pass, precedent finding P2.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-flows-hold-the-open-flow-plan.md`
  summary: 13.25 proves that a flow's `finished` runs once with the parsed input (not the raw draft), on the add flow, whose `finished` selects the new node.
  evidence: Sergii 2026-11-12 at 13.30's look: test fixtures stay plain, so 13.30's test flow has no `finished` hook and the rule moved to the first real flow.
  progress: 2026-11-12, by 13.25: rows 1a and 2 prove only that `finished` runs and selects the new node (Sergii 2026-11-12); that it runs once and gets the parsed input stays open for the first flow whose schema transforms its input, since `idSchema` only brands and selecting twice gives the same selection.
  owner: the first flow whose input schema transforms its input.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-flows-hold-the-open-flow-plan.md`
  summary: a flow view's field must not keep text the person typed while a finish is pending (`Flows.update` drops it); 13.25's add flow view disables or resyncs its Id field while finishing.
  evidence: 13.30 review pass 3 (quick): `TestRenameView`'s one-way `:value` leaves dropped edits on screen, and a failed finish then retries a draft different from the field.
  closed: 2026-11-12, by 13.25's decision: no pending-finish guard, because `AddGroup` and `AddSlot` are commands the store runs synchronously, so the finish settles in the same task's microtasks, before the browser dispatches another input event. A flow that finishes with an asynchronous action reopens it.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-t-toggles-the-slide-out-plan.md`
  summary: the palette's `Open tree` / `Open parameters` entries (EXPERIENCE.md, Left rail + slide-out row) are open-only UiActions the palette story adds beside 13.28's `ToggleSlideOut`, which would close an open slide-out if the palette listed it.
  evidence: 13.28 review pass 1 (quick): 13.28 removed `OpenTree` ('Open tree') for one toggle on T, per the ticket; no palette exists in `packages/editor/src` yet.
  owner: the command palette story (epic-drag-keys).
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-explicit-anchors-move-dependants-cycles-rejected-plan.md`
  summary: After a layout edit that changes which key ends a chain (an append after it, or deleting it), the editor offers to re-anchor what hung off the old last key, as one undoable SetAnchor; for epic-drag-keys beside 15.3's re-anchor in place and 15.6's anchor picker.
  evidence: Sergii 2026-11-13, party round on anchoring: anchors stay by id, so a thumb cluster anchored to a column's last key stays on it when a key is appended, and falls back to its default anchor when that key is deleted; the fix belongs in the editor, not as a model 'last child' anchor kind.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-explicit-anchors-move-dependants-cycles-rejected-plan.md`
  summary: `app/src/corney-column.spec.ts:76-78` asserts rows with `expect.objectContaining(at(0))`, narrowing instead of asserting each row whole.
  evidence: 13.3's conformance pass, precedent finding: AGENTS.md "assert whole values (`toEqual`, `toMatchObject`) instead of narrowing in the test"; 13.3 takes only that spec's arrange helpers, and its own app spec asserts whole rows.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/tickets/story-explicit-anchors-move-dependants-cycles-rejected-plan.md`
  summary: `app/src/corney-column.spec.ts`'s round-trip test asserts `expect(await placementsOf(committed(store))).toEqual(before)`, an expected value the same placement code computed.
  evidence: 13.3's final conformance pass, precedent finding: AGENTS.md "no expected value computed the way production computes it, except by calling a function the requirement names and that has unit tests of its own"; 13.3 follows that spec's wiring but doesn't edit it.
