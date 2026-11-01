---
reviews: _bmad-output/initiative-keeb-cad-m1/architecture-blueprints/architecture-blueprints.md (draft, updated 2026-11-01)
against: memlog .memlog.md (entries to line 34), initiative spine architecture-keeb-cad-layout-model.md (read-only), spike 16 sandbox-verdict.md, blueprint-calls-verdict-2026-11-01.md, tickets 16/17/18 (epic-see-corneys-keys/tickets/tickets.toml)
date: 2026-11-01
---

# Review: blueprints spine, rubric pass

## Verdict

**Not ready. Revise before the reviewer gate.** The adopted decisions are mostly carried faithfully. Four gaps remain. (1) The contract between a stage and a lane is not fixed: how a lane is written, how values get into it and how its outputs come back to the stage. Story 17 and story 18 meet at exactly that point. (2) BP-7 conflicts with AD-10 and AD-25. (3) Two rules let a failure that depends on timing or call history get cached as if it were deterministic, which weakens AD-1 and AD-18. (4) The lifecycle of VMs and handles is only half decided.

Severity: **blocker** means stories 17 and 18 (or a later lane story) would diverge, or an inherited AD is contradicted. **Major** means a dimension the spine owns is missing, or a rule can't do its job. **Minor** means wording, enforcement or coverage.

## Findings

### F1 [blocker] The lane contract is undecided: module shape, the way in, the way out

- **Where:** Design Paradigm ("returns its declared, role-tagged outputs"), BP-1, BP-7, the Host API convention.
- **Problem:** Story 17 builds the host and story 18 writes the first blueprint against it. Every later lane story (shapes, extras, plates, pcb, firmware, case) writes another lane against the same host. The spine fixes none of the points where these units meet:
  1. **Module shape.** BP-7 says each module exports `defineBlueprint({ … })`. It does not say where the lane functions live (inside the declaration under `lanes.<stage>`, or as separate named exports), what the shipped JS looks like (an ES module with `export`, or a script body the factory wraps), or how the build strips functions out of the data it ships. BP-3's factory needs a source format to compile.
  2. **Lane function signature.** It is not fixed whether the function is `(inputs, pulls, queries, api) → outputs` or `(ctx) → outputs`, or something else. It is also open whether pulls and queries arrive as arguments or are fetched through API calls. That choice decides what AD-11's "an undeclared read is an error (the lane fails in the worker)" even means. If pulls and queries arrive as arguments, an undeclared read can't happen. If they are fetched through calls, the host-call wrapper rejects an undeclared one. Ticket 17's verify step ("an undeclared read fails the lane") assumes one of these, and the spine doesn't say which.
  3. **Value encoding into the sandbox.** A `Quantity` input could arrive as a number in mm/deg or as `{ value, unit }`. AD-17 ("stages see numbers only") suggests numbers, but the spine doesn't say. Pulled geometry (the tray pulling `cutout`s, an alteration pulling `switch-plate`) could arrive as JSON values or as handles in the run's table. An `asset` input (SVG, STEP) could arrive as bytes, a parsed value or a handle. BP-1's "passed in as values" would push whole polygons and STEP bytes through JSON.
  4. **How outputs come back to the stage.** Geometry stays on the host as handles in a table that "lives for one lane run" (BP-1). So the returned outputs must reference handles, and the host must turn those into the stage's output values before the table is dropped. The spine doesn't fix any of these: the return encoding (JSON with handle markers?), who resolves handles into `model`'s output types (the stage or the wrapper), whether D4's check covers `kind` as well as role (the Data Schema checks roles only), or what the fingerprint's output hash (AD-11) is computed over.
  5. **Operation scope and wiring.** "Implemented by the stage that owns the lane" does not say whether a lane sees only its own stage's operations or every operation. It also doesn't say how a stage hands its implementations to `blueprint`, which imports only `geometry` (AD-10). Presumably a typed implementation table passed in, as `model` passes its evaluator. For the `parts` lane the implementer is `model` (AD-10), and story 18 needs that seam.
- **Fix:** Add a rule, call it **BP-8 Lane contract**. It should fix the module shape, the lane function signature, the encoding of each input kind and of pulls and queries, the output encoding with handle resolution done by the host-call wrapper into `model`'s output types before the table drops, the role-and-kind check, what the output hash covers, and per-stage operation tables passed into `blueprint` by the owning stage. Add one convention row each for "input encoding" and "output encoding".
- **Needs Sergii's decision:** yes. These are new decisions, not in the memlog. A recommendation per point, with alternatives, should go to him as single questions.

### F2 [blocker] BP-7 conflicts with AD-10 and AD-25

- **Where:** BP-7 ("type-checked against the blueprint API's types", "exports its declaration as `defineBlueprint`"), the Design Paradigm diagram (`DECL → register on main`).
- **Problem:** AD-10 says `library` imports only `model`, and `.dependency-cruiser.mts` enforces that (`exports-and-library-import-only-model`). The blueprint API's types and `defineBlueprint` belong to `blueprint` (AD-10: "the blueprint API's operation and query definitions"). So BP-7 needs a `library → blueprint` edge that AD-10 doesn't draw. It is also a second route to AD-25's entry fence: `editor` (main) imports `library`. If library's blueprint modules import `blueprint` (even just `defineBlueprint`), main's module graph reaches `blueprint`, and "main never reaches `blueprint`" fails. The spine doesn't say how `library` keeps the blueprint source (built, never imported at runtime) apart from what main imports (declaration data, and the JS as an asset string for the worker).
- **Fix:** Pick one and state it. (a) A type-only `library → blueprint` edge for blueprint sources, with the sources outside library's runtime exports. Library would export declarations as data from a subpath, and the compiled JS as assets that only the model and case workers load. A dependency-cruiser rule and a violation fixture would prove it. (b) The API types re-exported through `model`, which `library` already imports. That cuts against "code in the package that owns the concept". Option (a) changes AD-10's graph, so it is an initiative-spine update, not a child-spine override.
- **Needs Sergii's decision:** yes. It changes an inherited AD's dependency graph. Under the conflict rule this spine can't decide it alone.

### F3 [blocker] Outcomes that depend on timing or history get cached as deterministic (BP-2 × BP-4 × BP-5 against AD-1 and AD-18)

- **Where:** BP-2 ("A VM dropped after a trap or a pending job is replaced in the next pause"), BP-4 ("may differ by one with call history; accepted limit"), BP-5 ("a failed run … is cached … reruns only when its inputs or its blueprint version change").
- **Problem:**
  1. After a trap or a pending job, the VM is gone until the next pause. The spine doesn't say what happens to later lanes of the same version in the same seq, or in the same stage. Spike 16 saw exactly this case on quickjs-wasi: calls fail `unavailable` until the replacement exists, "so the outcome of a call depends on timing". Under BP-5 such a failure is cached under the lane's key, so the lane stays failed after the VM is back, until an unrelated edit changes its inputs. Reopening the file runs it cleanly. That breaks AD-1's "same file, same app version, same outputs on every reopen".
  2. The ±1 step drift means a blueprint within one step of the budget passes or fails depending on what the VM ran earlier. Session order and reopen order differ, so the same file can fail in one session and succeed after a reopen, and BP-5 caches whichever result came first. AD-18 requires a *deterministic* sandbox. Spike 16 notes that "one step of slack on each side fixes the outcome after every tested history". The spine doesn't adopt that and doesn't fix a budget value. The memlog records the drift only as an input fact, not as a decision to accept it, so "accepted limit" is a decision the spine adds.
- **Fix:**
  1. Cache only failures that are deterministic: a throw, the step budget, a non-JSON-exact value, a role mismatch, a pending job. Never cache a failure that comes from the host side ("VM unavailable", a trap). A lane whose VM is missing is *not run* in that seq: it stays stale and reruns after the replacement pause. State whether a trap counts as a cached failure. With a fixed max stack (F5) a stack trap is deterministic. Running out of memory may not be.
  2. For the step budget, choose one of these: (a) adopt spike 16's slack, a fixed budget B where a lane fails only after B+1 polls, and set B far above any real blueprint, so that the drift can't change the outcome of a blueprint near B ± 1. Accept that and say so explicitly against AD-18. (b) Reset the interrupt counter per run, if quickjs-wasi allows it, and test it. (c) Use a fresh context per run, at a cost.
- **Needs Sergii's decision:** yes, for the step-budget treatment and for whether traps are cached. Not caching host-side failures follows from AD-1 and only needs his confirmation.

### F4 [major] VM and handle lifecycle is half decided

- **Where:** BP-2, BP-1 (handle table), BP-6.
- **Problem:** Creation is decided; the rest isn't.
  1. **Disposal.** Nothing says when a VM is disposed: after a version is unpinned or upgraded, after `replaceDesign` opens another design, or when the worker restarts. quickjs-wasi reserves 1.44 MiB per VM, and WASM memory never shrinks inside a VM. The calls verdict passes quickjs-emscripten's flat 16 MiB at about 12 blueprints.
  2. **Nesting makes a VM depend on the design.** BP-6 compiles the nested version's factory inside the caller's VM. Minimal version selection (AD-5) is design-wide, so what a VM holds depends on the design's pins, not on the blueprint version alone. Raising a nested pin has to rebuild or extend every VM that uses that blueprint. "One VM per blueprint version" doesn't cover that, and the creation pause doesn't say it reacts to a pin raise.
  3. **The case worker.** BP-2's pause belongs to the model worker. The case worker has no patches and no such pause. Its terminate-and-respawn cancel (AD-11) loses every VM. The spine doesn't say when case lanes' VMs are created (on receiving an input slice, before the case run?) or who owns that.
  4. **Worker start and restart.** At start and on a crash restart the whole design arrives. The spine doesn't say that the first pause creates every VM before the first visible set, which keeps the 100 ms budget honest.
  5. **Handles.** It isn't stated whether `use()` shares the caller's handle table (it must, if the caller is to use nested outputs). The calls spike found that quickjs-wasi duplicates every handle a callback returns, so the host must free its copy (it uses `vm.withScope`) or the VM leaks. And whether replicad objects behind handles in the case worker are `.delete()`d when the table drops is unaddressed.
- **Fix:** Add a lifecycle rule (or extend BP-2). Say who owns the VM pool (a `blueprint` service in each worker's partial, per AD-25). Say a VM is keyed by blueprint version plus its resolved nested versions. Say creation happens at worker start, after any applied command that changes pins, and in the case worker before a run. Say disposal happens when no pinned version or MVS result needs the VM, or at worker teardown. Say the handle table is per lane run, shared with nested uses, and freed (replicad objects deleted) when the run ends after the outputs are resolved (F1). Put "host handles are freed per call" into Verification.
- **Needs Sergii's decision:** mostly no. These are technical consequences of decisions he has already adopted. The disposal policy is a choice, though: evict when unpinned now, or keep VMs for undo. Ask him that one question.

### F5 [major] Hermeticity is a deny-list, and it drops spike-16 measures

- **Where:** BP-3.
- **Problem:** BP-3 names what is absent (Date, timers, `fetch`, `performance`, WeakRef, FinalizationRegistry, `Math.random`). Spike 16's wasi host also removed DOMException and atob/btoa, **fixed the WASI clock and random source**, and set **a max stack size (256 KiB)**, which it says story 17 must set. None of these is in the spine. QuickJS-NG adds globals over time (25 quickjs-wasi releases in 8 months, Stack). A deny-list doesn't stop a new global, and an unfixed WASI clock or random source is a hermeticity hole below the JS level. Without a max stack, recursion behaves differently by browser, which also feeds F3.
- **Fix:** Make it an allow-list: only ECMAScript intrinsics plus the frozen API object, with a property test that lists the reachable globals against the allow-list. Also: fix WASI `clock_time_get` and `random_get` to constants, and give one max stack size in `blueprint`. Add these to Verification.
- **Needs Sergii's decision:** no. It carries out AD-18's "hermetic" as the spike proved it. Tell him the allow-list replaces the named list.

### F6 [major] The data form of the design's own work is not covered

- **Where:** Inherited Invariants (AD-18 "data form for the design's own work"), the scope frontmatter. No rule follows.
- **Problem:** AD-10 puts the data-blueprint interpreter in `blueprint`, and AD-18 says "two forms, one interface". The spine is silent on whether the design's own lanes (shapes, plates, case, alterations) call the same operation definitions through the same host-call wrapper. It is also silent on whether they get the same output check and the same failure caching, and where they run relative to code lanes in a stage. AD-16 evaluates shapes in `model`. Without a rule, the first story with one of the design's own lanes (epic-draw-custom-shapes, epic-own-case-operations) can grow a second operation path. That is the "two ways" Sergii ruled out (memlog line 15).
- **Fix:** Either add a rule (the interpreter dispatches through the same operation tables and the same output check, with failures cached like BP-5, and no sandbox), or put a Deferred row naming the revisit point (the first story with one of the design's own lanes) and the invariant that holds until then: one operation definition per operation.
- **Needs Sergii's decision:** yes, whether to decide it now or defer it.

### F7 [minor] Additions not in the memlog's adopted decisions

These come from spike evidence and are reasonable, but no `[ADOPTED]` entry records them. They should be confirmed or traced:
- BP-1: handles in a per-run host table (the spike's design); "assets and other declared reads resolved before the run and passed in as values" (see F1.3, which may be wrong for assets).
- BP-2: replacing a VM in the next pause after a trap or a pending job.
- BP-3: non-JSON-exact values fail typed; a pending promise job fails the run (both spike-16 behaviour).
- BP-4: the ±1 drift as "accepted" (see F3).
- BP-5 widens `lane-failed` beyond the initiative's Violations text ("threw or exceeded its step budget") to non-JSON-exact values, a pending job and a role mismatch. D4 covers the role mismatch. The rest is an extension of an inherited kind's definition, and the initiative's Violations row should say so.
- BP-4: "the status strip's running stage names the blueprint" requires a blueprint field (or per-lane posts) that AD-11's `stage-started { stage, seq }` doesn't carry. That is a change to the inherited `protocol` union and needs a line in the initiative spine.

Fix: give each one a source (spike section, memlog line) or a memlog entry Sergii confirms.

### F8 [minor] Omissions from adopted decisions

- Host-work decision (memlog line 22): "a hang is ended by the user's Restart (AD-11 lifecycle)" is missing from BP-4. That is the one stated recovery when host work has no budget.
- D1 (line 26): "Milestone 2 user blueprints get the same extraction by evaluating the export once in the sandbox at load" is missing. The Deferred row on in-app TS compilation doesn't carry it.
- Engine (line 33): the verdict's "reversible: only blueprint imports the runtime" is implied by AD-10 but not stated as BP-2's undo path.

### F9 [minor] Rules that can't be checked as written

- BP-1 "results never built through the engine's object API": no check. Add a lint (`no-restricted-properties` on `newObject`/`newArray`/`setProp` outside the boundary file) or a test.
- BP-1 "one host-call wrapper": state that operation implementations are reachable only through the wrapper (the F1.5 table type), so a stage can't register a raw `newFunction`.
- BP-3 "factory kept apart from the boundary (the source can't close or skip it)": add an adversarial property test (a source that tries `})(); …` or a `return` at top level).
- BP-3 error `message`/`name` kept under a frozen `Error.prototype`, and no host stack in the guest: add to Verification. Both were found by the calls spike as regressions waiting to happen.
- BP-4 "times never decide an output": a reviewer rule. Say so, as AD-2 does for read-only parameters.
- Verification has no test for BP-5 (a failed run isn't re-run on an unrelated command) or for F3's non-caching of host-side failures.

### F10 [minor] Deferred and working material

- "The blueprint operation list, owned by the first tray-case story" can be read as "no operation lands before tray-case", but stories 17 and 18 need `parts`-lane operations (rectangle, envelope). Reword it: each operation is added by the first story that needs it, through the Host API convention. The tray-case story owns the case operation vocabulary. Without that, nothing in Deferred lets two units diverge, *provided* F1 fixes operation shape and encoding.
- The other Deferred rows (host-work counter, nets, in-app TS, AC timings) are safe: each changes one owner, or nothing runs it in milestone 1.

## Rubric checks

| Criterion | Result |
| --- | --- |
| Fixes the real divergence points for 17, 18 and later lanes, missing none | **Fail**: F1 (lane contract), F4 (lifecycle), F6 (data form) |
| Every rule enforceable and prevents its stated divergence | **Partial**: F3 (BP-5 doesn't prevent repeats for host-side failures and caches wrong outcomes), F9 |
| Nothing in Deferred lets two units diverge | **Pass with a caveat**: F10 wording; relies on F1 |
| Covers every adopted memlog decision faithfully, adds none undecided | **Partial**: F7 additions, F8 omissions. Calls, engine, TS, failures, nesting and declaration D1–D6 are otherwise faithful |
| No rule contradicts or weakens an inherited AD | **Fail**: F2 (AD-10, AD-25), F3 (AD-1, AD-18); F7's `stage-started` change to AD-11 |
| Every owned dimension decided, deferred or open (VM and handle lifecycle, lane outputs back to the stage) | **Fail**: F1.4 (outputs back to the stage), F4 (lifecycle), F6 |

## Other notes, outside the spine

- Ticket 17's description still says "spike 16's runtime" and "declared reads". Its verify list has none of the rules this spine adds (the factory, JSON-exact values, nesting, the lockdown's error taming, failure caching). Refresh it after the spine settles.
- Ticket 18's key blueprint outputs "its 3D envelope". The Data Schema's `OutputKind` (`shape | solid | footprint | part-placement | config`) has no envelope kind, and AD-5 lists the envelope as a part-schema field, not a role-tagged output. Check this against the Data Schema before story 18 (AGENTS.md: a schema kind only after the spine defines it).
- ☝️ The ~5 ms per 50-key command behind the calls decision uses cheap stand-in operations (calls verdict, "does not show": real geometry). The 100 ms budget is safe for crossings, not yet for host work. BP-4 deliberately leaves host work unbudgeted, so the first real measurement belongs in story 18's verify step.
