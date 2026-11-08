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

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-a-new-design-writes-and-reads-back-byte-identical-plan.md`
  summary: Per-entry generic checks (caller's input not frozen, no proxy in the design, over every registered entry that writes the design) move to 13.2; decide there whether they live in `commands` (where the input schemas are) or `app`.
  evidence: Sergii, 2026-11-05: in 23.3 they could not fail, since NewDesign's input never enters the design; the design's deep freeze is already `design`'s unit rule, so an `app` copy was a retest.
  closed: 2026-11-05, sweep A8: no per-entry generic checks; `run` copies the input (`toRaw`, `structuredClone`) and the store parses every produced design (E10), both built by 23.16.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-a-new-design-writes-and-reads-back-byte-identical-plan.md`
  summary: Two replaceDesign tests in packages/design/src/store/design-store.spec.ts assert more than their names claim (the commit event, the caller's input unfrozen, nothing committed).
  evidence: precedent tests `loads a valid design deeply frozen, with the next seq and its revision` and `refuses an invalid design with its issue paths`; rule `Make a test's name and its expects claim the same thing.` 23.3 renames or splits them as they move (conformance pass 6).
- source_plan: `_bmad-output/initiative-keeb-cad-m1/party-mode` (party session 2026-11-05, test builders and deferred work)
  summary: The guard checks paths only on Edit, Write and MultiEdit (`EDIT_TOOLS` in `tooling/hooks/guard-decision.ts`), so a Bash edit (`sed -i`, a heredoc, `cat >`) to a runner, mutation, lint or dependency-cruiser config, or a snapshot, never reaches `ASKED_PATHS` or `DENIED_PATHS`.
  evidence: `guardDecision` returns only `DENIED_COMMANDS` for Bash; agent instructions allow small edits through Bash. Closing it means recognising writes to a path inside a shell command, which a regex can only approximate.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-specs-build-schema-values-with-test-builders-plan.md`
  summary: No check proves `only-tests-import-testing` catches a bare `@keeb-cad/<pkg>/testing` import after dependency-cruiser resolves it to `packages/<pkg>/src/testing/index.ts`; the violation tree has no node_modules, so its bare imports stay unresolved.
  evidence: 23.17 review finding 5; `tooling/ad10/rules.spec.ts` notes the tree's bare imports stay unresolved; the gap predates 23.17 for result/testing, and a real-repo cruise like the editor's Vue check would close it.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-tests-and-lint-close-the-silent-green-shortcuts-plan.md`
  summary: `tooling/ad10/rules.spec.ts`'s `gives every non-kernel row di, reactive and result, and no kernel any` asserts only plates and four kernels, so its name claims more than its expects.
  evidence: precedent line `expect(allowedTargets('plates')).toEqual(expect.arrayContaining(['di', 'reactive', 'result']))`; rule `Make a test's name and its expects claim the same thing.` (23.18 conformance review)

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-tests-and-lint-close-the-silent-green-shortcuts-plan.md`
  summary: Decide whether a `*.types.spec.ts` may import assertion helpers (`expectOk`, `expectErr`, `expectDeeplyFrozen`, `expectNothingFrozen`) from a `testing` subpath, since their `expect` never runs there and a test with `expectTypeOf` beside one passes lint and the suite.
  evidence: 23.18 review pass 2; `keeb-cad/type-specs` bans only `expect`, `assert` and `should` from `vitest`; banning the helpers is a new rule, so it goes to Sergii.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-ui-foundation-renders-in-the-workbench-plan.md`
  summary: `packages/editor/vitest.config.ts` carries a comment with an AD reference that restates a rule.
  evidence: precedent line `// DOM tests run in real browsers, never a simulation (AD-26, Verification layer 2).`; rule `Write a comment only for a why the code can't say. No AD-n or ticket references` (23.6 conformance review).

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-ui-foundation-renders-in-the-workbench-plan.md`
  summary: `.dependency-cruiser.mts` rule comments and code comments carry AD-n references.
  evidence: precedent lines `// @vue/reactivity is not Vue for this rule: it belongs to \`reactive\` alone (AD-10).` and `'Only design imports immer: its register and design/worker (AD-2).'`; rule `No AD-n or ticket references` (23.6 conformance review).

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-ui-foundation-renders-in-the-workbench-plan.md`
  summary: `eslint.config.ts` carries a comment with an AD reference.
  evidence: precedent line `// Deliberate AD-10 violations, cruised by tooling/ad10/rules.spec.ts.`; rule `No AD-n or ticket references` (23.6 conformance review).

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-ui-foundation-renders-in-the-workbench-plan.md`
  summary: `tooling/lint/no-test-ids.spec.ts` takes its expected message from the config's own exported constant and mixes `stringContaining` with exact matches, so rewording the message fails no test.
  evidence: precedent lines `import { TEST_ID_MESSAGE } from '../../eslint.config'` and `toEqual([expect.stringContaining(TEST_ID_MESSAGE)])`; rule `Take expected values from the requirement (the ticket, the plan's boundary table), never from running the code.` (23.6 conformance review).

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-ui-foundation-renders-in-the-workbench-plan.md`
  summary: `tooling/lint/rule-messages.ts` holds a module-level `ESLint` instance its two helpers reach for, and its doc comments restate the signatures.
  evidence: precedent lines `const eslint = new ESLint({ cwd: fileURLToPath(new URL('../..', import.meta.url)) })` and `/** The messages \`ruleId\` reports under the real config for \`code\` at \`filePath\`. */`; rules `Hold state in \`di\` services, never in a module-level singleton that functions reach for.` and `Write a comment only for a why the code can't say. … no restating a signature` (23.6 final conformance pass).

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: Build `messaging`'s request side (pending requests, the typed `stale` reply to a request dropped as stale, reject all pending on a worker restart) with the first story that adds a request kind, and update 23.4's ticket wording ("stale rejection").
  evidence: Sergii's 23.4 decision (2026-11-07): no request kind exists yet, and how a pending caller receives `stale` (no `Result` crosses; `messaging` can't import `result`) needs a consumer to settle.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: `tooling/ad10/rules.spec.ts` keeps mutable state at module level (the generated temp tree and its cruise promise) and computes expected values the way the config does (`forbiddenTarget(row)`, `expect(reported).toEqual(configured)`).
  evidence: precedent lines `const generatedDir = mkdtempSync(path.join(tmpdir(), 'keeb-cad-ad10-'))` and `const generated = cruiseWithConfig(['packages', 'app', 'fixtures'], generatedDir)`; rules `Keep no mutable state at module level in a spec` and `no expected value computed the way production computes it` (23.4 conformance review).

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: Root `vitest.config.ts` and `packages/di/vitest.config.ts` carry comments with AD-n or Verification-layer references.
  evidence: precedent lines `// The AD-10 violation tree holds a deliberate *.spec.ts fixture, not a test.` and `// di's root specs touch no DOM, so they run on Node (Verification layer 2)`; rule `No AD-n or ticket references` (23.4 conformance review).

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: The spine still names the stale reply as built and tested in `messaging` (AD-11 "a typed `stale` rejection reply …", "each needs a `messaging` test"; Structural Seed "stale rejection"); fold in Sergii's 23.4 deferral of the request side (bmad-architecture).
  evidence: 23.4 final conformance pass, finding 13; Sergii's decision 2026-11-07.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: `packages/design/src/store/design-store.spec.ts` asserts a rejection by identity where the requirement is only its value.
  evidence: precedent line `expect(result.error).toBe(rejection)` in `refuses with the rejection the apply step returns and discards its draft`; rule `Assert whole values (toEqual, toMatchObject)` (23.4 final conformance pass, low confidence).

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: The browser Vitest configs for `messaging`, `workers`, `pipeline` and `app` don't pre-bundle their dependencies (`optimizeDeps.include`), which `packages/di/vitest.config.ts` does to avoid a mid-run re-bundle.
  evidence: unverified (would be medium): 23.4's whole-suite log shows no re-optimization; a cold-cache run with `node_modules/.vite` cleared, watching for "new dependencies optimized", would settle it; `app`'s entry spec polls 10 s for the worker's first transform.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: `app/src/start-model-worker.ts` attaches its listener only after `await container.autoLoad()`, so a truly async eager binding could let main's first `design` arrive with no listener and be lost.
  evidence: unverified (would be medium): AD-25 prescribes this order and it works today; settled by checking whether Chromium and Firefox queue a module worker's messages until its top-level evaluation finishes.

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-model-worker-mirrors-the-design-plan.md`
  summary: When 23.7 first calls `ModelWorkerLifecycle.start(spawn)` from `start-main.ts`, `app/vite.config.ts` must set `worker: { format: 'es' }`, not Vite's default `'iife'`, because `app/src/start-model-worker.ts` awaits `autoLoad()` at top level, which an `iife` worker bundle can't hold.
  evidence: 23.4 sets `worker.format: 'es'` only in `app/vitest.config.ts` (its final conformance pass dropped the `vite.config.ts` change as unused until a production spawn exists); 23.7's ticket doesn't mention it; Vite docs: `worker.format` default `'iife'`.

- source_plan: `_bmad-output/architecture-keeb-cad-layout-model/reviews/review-adversary-2026-11-07-batch.md`
  summary: The story that fills the case worker (OCCT/replicad glue, quickjs-wasi's WASM) builds and starts it under `worker.format: 'es'`, which 23.7 sets for every worker; 23.7 checks only the model worker, the one it spawns.
  evidence: adversary gate L6 (`worker.format 'es'` is global to Vite's worker build); `app/src/case.worker.ts` is a stub today.

- source_plan: `_bmad-output/architecture-keeb-cad-layout-model/reviews/review-reconcile-tickets-2026-11-07-batch.md`
  summary: The first story that declares a blueprint input of kind `quantity` codes model/main's `checkInputs` check of its unit and literal against the pinned `DeclaredInput.unit` and its `range` (not below 0 is `range.min`; `negative-length` never reaches inputs), with rows just below, on and just above a range bound.
  evidence: spine gate M7 (2026-11-07) and the Data Schema's `InputValue` comment; 13.4's choc-key `size` input is an option, so no M1 ticket names a quantity input yet.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-a-new-design-autosaves-and-reopens-from-the-browser-plan.md`
  summary: Settle in the spine how editor's banner (16.x) reads autosave's failure state, since autosave lives in app and AD-10 says nothing imports app (move autosave to commands, or a token row in AD-25).
  evidence: 23.5's gap reader, 2026-11-07; Sergii chose to defer it to 16.x's spine pass, since nothing in 23.5 reads the state.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-a-new-design-autosaves-and-reopens-from-the-browser-plan.md`
  summary: Drop from 23.5's verify the sentence "in Chromium a write refused under a quota lowered with cdp()'s Storage.overrideQuotaForOrigin returns quota-exceeded (…)", and reword "a load with a missing routing file saves no reset version" to the unit level (a bundle without routing handed to the load flow), since storage holds all three files.
  evidence: Sergii, 2026-11-07, during 23.5's build (J1, J5): storage keeps full BundleTexts; the quota browser test is dropped because the mapping's Node rows and the memory backend cover it (spine AD-13 updated). The build never writes a ticket file, so the PO folds this in.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-a-new-design-autosaves-and-reopens-from-the-browser-plan.md`
  summary: Reword 23.5's verify "a reset save refused for space while an autosave version remains drops the oldest autosave version and succeeds" to "while two autosave versions remain … drops the older", since a quota prune never drops a design's newest version.
  evidence: Sergii, 2026-11-07, 23.5 review Q1 (spine 8dbe213): a design must never lose its last stored copy. The build never writes a ticket file, so the PO folds this in.
- source_plan: none
  summary: Split from 23.7, its own story after it: editor's UiAction mechanism (UiAction classes, registerUiAction, the uiActions multi token), design's CommandHandle and ActionHandle gaining an optional static hotkeys, editor's one shortcut registry feeding the hotkey layer, and the one invoke path with per-entry input builders, with 23.7's two hotkey verify sentences.
  evidence: Sergii chose Split at 23.7's multi-goal check (2026-11-07): it can be reviewed and merged as its own PR once 23.7 hands the container to editor. The build never writes a ticket file, so the PO slices it.
- source_plan: none
  summary: Split from 23.7, its own story after it: the idempotent dev-only devtools.ts with a build check that the production bundle holds none of it, and the lint rule rejecting a component that imports a service as a value, with 23.7's two verify sentences for them.
  evidence: Sergii chose Split at 23.7's multi-goal check (2026-11-07): neither is needed for launch to open a design. The build never writes a ticket file, so the PO slices it.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-app-opens-the-last-design-plan.md`
  summary: `app/src/autosave/autosave.spec.ts`'s `arrange` resolves `store`, `storage`, `autosave`, `lifecycle` and `flow` for every test (`return { store: container.resolve(DesignStore), storage: …, autosave: …, lifecycle: …, flow: … }`), against AGENTS.md's "Arrange only what the test uses, passed as arguments to an `arrange` helper"; 23.7's new `reportFailure` test arranges only what it uses.
  evidence: 23.7's plan conformance reader (precedent check), 2026-11-07.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-app-opens-the-last-design-plan.md`
  summary: Reword 23.7's "When load or listDesigns returns storage-unavailable, launch opens a new, unsaved design and sets autosave's failure state to that error" to "… launch opens a new design, whose failed autosave sets autosave's failure state", and its verify to match.
  evidence: Sergii, 2026-11-07, 23.7's plan (gap reader, reachable states): the new design's own failed save sets the same state, so a launch-side setter is unobservable. The build never writes a ticket file, so the PO folds this in.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-app-opens-the-last-design-plan.md`
  summary: `packages/commands/src/design/new-design.spec.ts` registers a fake `DesignStore` and asserts `expect(handed).toEqual([…])`, what the fake was handed, against AGENTS.md's "Assert what a function returns or a visible effect; use `toHaveBeenCalled*` only when the call is the behaviour"; the real store's `current` is the visible effect.
  evidence: 23.7's final conformance pass (precedent check), 2026-11-07; 23.7's OpenStoredDesign spec asserts on `current`.
- source_plan: none
  summary: Folded into the ticket tree on 2026-11-07 (Sofia's replan after 23.7's split): the two 23.7 split-offs (now 23.19 and 23.20), 23.7's failure-state rewording, 23.5's cdp() quota and missing-routing rewording, and 23.5's keep-the-newest prune rewording. These entries above need no further action.
  evidence: epic-a-new-design-opens.md Notes, Decision 2026-11-07 (replan after 23.7's build split).
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-uiactions-and-the-shortcut-registry-run-every-hotkey-plan.md`
  summary: A handle has no way to keep its hotkey on inside a focused field; `ui`'s `HotkeyLayer` registers every entry with `enableOnFormTags: false`, while EXPERIENCE.md › Shortcuts keeps "Ctrl+K, Ctrl+S, Ctrl+Shift+S, Ctrl+O and Ctrl+Z / Ctrl+Shift+Z" global with a field focused.
  evidence: Found at 23.19's plan checkpoint (2026-11-07); no 23.19 entry needs it, 16.4's mod+Z is the first. Sergii approved leaving it out of 23.19.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-uiactions-and-the-shortcut-registry-run-every-hotkey-plan.md`
  summary: `packages/editor/src/App.vue`'s `.editor-shell__bar` sets `border-bottom: 1px solid #ccc;`, a literal colour, against AD-26's design tokens; 23.19 touches `App.vue` only to call `useShortcuts()` and leaves it.
  evidence: 23.19's plan conformance reader (precedent check), 2026-11-07.
- source_plan: none
  summary: `packages/ui/src/tooltip/Tooltip.spec.ts`'s two focus tests ("shows its content once the trigger is focused", "portals its content out of the rendered component") fail intermittently in CI's Firefox only; `element().focus()` never shows `getByRole('tooltip')` within 15 s.
  evidence: CI runs 42348232952, 42362055241, 42396210542 (main) and 42402077826 (PR #31) on 2026-11-07, seeds 1794033853063, 1794045694625, 1794072393500, 1794076616865; seed 1794076616865 passes locally (ui Firefox project once, full suite three times). Not order or non-determinism; a CI headless-Firefox timing race between focus and Reka's tooltip open, or state the file's fake-timer pointer tests leave, is unconfirmed and left to Sergii (flaky-triage step 6). No timeout, retry or test change made. Owner: whoever next touches ui's tooltip.
- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-components-reach-services-only-through-composables-plan.md`
  summary: `packages/ui/src/button/Button.spec.ts`'s "keeps focus when its disabled reason is cleared" failed once in Firefox during 23.20's build (focus on `body`, not the button); a second, unnamed failure was in an earlier run of the same session.
  evidence: local `pnpm test`, 2026-11-08, seed `1794115850237`; later runs green (seed `1794115928614` among them). 23.20 touches no `ui` file. Same family as the tooltip focus flake above. Not triaged: the build's implementer re-ran the suite instead, which flaky-triage warns against; owner is whoever next touches `ui`'s focus tests (flaky-triage with the seed).

- source_plan: `_bmad-output/initiative-keeb-cad-m1/tickets/epic-a-new-design-opens/tickets/story-the-invoke-path-takes-a-caller-s-input-and-answers-availabil-plan.md`
  summary: `ui`'s `Button.spec.ts` "with a disabled reason shows the reason in a tooltip once focused" timed out in Firefox in CI (expect.poll), a second flaky test in that file beside 23.20's.
  evidence: PR #36 run 42454209243, seed `1794118810293`, on a docs-only commit; the re-run of the failed job passed. 23.21 doesn't touch `ui`. Needs flaky-triage, not a retry.
