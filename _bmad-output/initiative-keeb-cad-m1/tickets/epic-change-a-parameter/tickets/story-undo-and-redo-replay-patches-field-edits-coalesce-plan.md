---
title: 'Undo and redo replay patches, field edits coalesce'
type: 'feature'
ticket: '1'
created: '2026-11-16'
status: 'done'
baseline_revision: '8f34d1e8a8fc7ba12c7c2805e7cc02cddf1da390'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The design store can run commands and replace the bundle, but has no history: no command can be undone, and an expression field's typing-pause commands would each be their own step. `DesignPatcher.change` throws away the inverse patches Immer already computes.

**Approach:** `design` keeps a linear, unbounded undo history beside the store. Each committed command records its forward and inverse patches and the routing file reference; `undo` and `redo` apply them through `DesignPatcher.apply`, replace the whole `Committed` and send the same patches, with the restored routing file, to the model worker. `run(handle, input, { coalesce: key })` folds same-key commands into one entry.

## Boundaries & Constraints

**Always:**
- `undo()` and `redo()` are `DesignStore` methods returning `Result<void, Rejection>`; each mints the next seq, recomputes the revision with `revisionOf`, and emits a `patches` commit event carrying the patches applied and the routing file restored (AD-2, AD-11).
- Undo applies the entry's inverse patches; redo its forward ones. A coalesced entry's forward patches are the commands' forward patches in run order; its inverse patches are the commands' inverse patches in reverse run order.
- Each undo record (the history's start from `replaceDesign`, and the revision each undo entry reaches) keeps a reference to the routing file last accepted at its revision: the one current at the commit (for a folded commit, the one current at that fold), swapped by `acceptDerivedFiles` when it is accepted at the current seq. Undo and redo restore that undo record's routing file; the fingerprints file is never restored.
- With no design loaded the history is empty, so `undo` and `redo` return `unavailable`.
- `replaceDesign` clears the history, and its routing file becomes the first undo record's reference.
- A new commit after an undo drops every redo entry (linear history).
- A rejected run, and a run of an unregistered handle or bad input, leave the design, seq, history and open session unchanged (ticket: "a rejected command leaving the design and the stack unchanged").
- Decision (Sergii, 2026-11-16): `unavailable` on an empty side carries `command: 'design.undo'` or `command: 'design.redo'`, not bare `'undo'`/`'redo'` nor a new rejection kind, because it is shaped like the namespaced entry ids, under the package that owns undo (Sergii's pick).
- Decision (Sergii, 2026-11-16): a command that produces no patches leaves an open session open, not closes it, because it commits nothing (AD-2: "no seq increment, no commit event, no undo entry").
- Decision (Sergii, 2026-11-16): the history keeps no label or handle, not a label per entry as the ticket says, because undo and redo need only patches and routing; the label is the toast's and palette's need, handed to 16.4 (`deferred-work.md`).

**Never:**
- No per-command inverse code; no undo for actions; no coalesce option on `runById` or on actions.
- No Undo/Redo handles, hotkeys, top-bar buttons, toast or availability reader (16.4; its ticket's unknown: "the store also has no availability query"); no expression field and no `coalesce` through `editor`'s `Invoke` (`packages/editor/src/invoke/invoke.ts:44` takes no options; 14.5 runs its field "through 14.1's { coalesce: key }").
- No history in the design bundle or on disk; no bound on its length.
- No second patch applier: undo and redo go through `DesignPatcher.apply` only.

## I/O & Edge-Case Matrix

See `## Boundary table` (frozen with this block).

</frozen-after-approval>

## Code Map

- `packages/design/src/patching/design-patcher.ts:13-23` -- `change` destructures `[next, patches]` from `produceWithPatches`, which returns a third element, the inverse patches (Immer docs, "Patches": `produceWithPatches` "returns a tuple [nextState, patches, inversePatches]"). Keep the rejection handling as is. `apply` (25-27) is the one applier undo and redo use. `design-patcher.spec.ts:18-30` asserts `change`'s whole value and gains `inverse`.
- `packages/design/src/patching/types.ts` -- `Changed { design, patches }`.
- `packages/design/src/store/design-store.ts` -- `#runCommand` (156-183) commits at 175-180; `replaceDesign` (109-130); `acceptDerivedFiles` (133-147, drops a seq other than current); `#write` (257-261) mints the seq. Reuse `revisionOf`, `#write`, `#emitter`; do not change `available`, `runById`'s rejection or the action path.
- `packages/design/src/store/types.ts` -- `CommitEvent` `patches` variant; `Committed`.
- `packages/design/src/design-module.ts` -- registers `DesignPatcher` and the eager `DesignStore`.
- `packages/protocol/src/model-worker/types.ts:28` -- `patches` message: `{ patches, revision }`.
- `packages/workers/src/model-worker/model-worker-lifecycle.ts:120-126` -- maps a `patches` commit event to the `patches` message.
- `packages/pipeline/src/pipeline/pipeline.ts:50-59` -- `#receiveDesign` sets `#routing`; `#receivePatches` applies patches only; `#routing` is what the derived-files post carries (113).
- `packages/design/src/mirror/mirror-follows-the-store.spec.ts` -- pattern for a same-thread mirror fed from commit events, with a spec-local test command.
- `reference-designs/src/scripts/corney-island-test-overrides.ts` -- test-only step: `overrides.setOverride` `{ type: 'side-part', target: 'right/thumbfan-far-home', part: null }`.
- `app/src/bundle-round-trip.spec.ts`, `app/src/testing/arrange-store.ts`, `app/src/testing/run-corney-script.ts`, `app/src/testing/arrange-placements.ts` -- real-command integration helpers; `writeBundle(committed(store))` gives the bundle's texts; `app` specs may import `design/worker` (`.dependency-cruiser.mts:283`).
- `packages/commands/src/layout/delete-node.ts`, `packages/commands/src/overrides/set-override.ts` -- `DeleteNode` cascades overrides keyed to the deleted node (`packages/model/src/layout-editing/delete-node.ts:36`).
- Consumers of the commit event that need no change (they ignore the new optional field): `app/src/autosave/autosave.ts:10`, `packages/editor/src/selection/selection.ts:23`, `packages/editor/src/hover/hovered-node.ts:63`, `packages/editor/src/flows/flows.ts:77`, `packages/editor/src/devtools/devtools-plugin.ts:140`.

## Tasks & Acceptance

**Execution:**
- [x] `packages/design/src/patching/types.ts`, `design-patcher.ts`, `design-patcher.spec.ts` -- `Changed` gains `inverse: readonly DesignPatch[]`; `DesignPatcher.change` (existing method of a service) returns it; row U0.
- [x] `packages/design/src/history/types.ts`, `undo-history.ts` -- `UndoHistory` (service): private fields for the undo records' routing references, the undo entries `{ coalesce: Option<string>, forward, inverse }`, the cursor and the open session's key; no reactive state, since nothing in 14.1 reads it reactively. Methods: `reset(routing)`, `record(changed, routing, coalesce?)` (append, or fold when the open session's key equals `coalesce`; drops redo entries; the undo record it reaches takes `routing`), `undo(): Option<PatchReplay>`, `redo(): Option<PatchReplay>` (`PatchReplay` = the patches to apply and the routing to restore, named for the ticket's "replay patches"; both close the session), and `acceptRouting(routing)` (swaps the current undo record's reference).
- [x] `packages/design/src/design-module.ts` -- register `UndoHistory` (not eager).
- [x] `packages/design/src/store/types.ts`, `design-store.ts` -- `DesignStore` (service) gains methods `undo()` and `redo()`. `RunOptions { coalesce?: string }` in `types.ts`; the command overload of `run` takes `options?: RunOptions`; a commit records into `UndoHistory` with the routing current at it; `undo`/`redo` apply the step's patches, `#write` with the restored routing and current fingerprints, emit `{ kind: 'patches', patches, seq, revision, routing }`; an empty side returns `{ kind: 'unavailable', command: 'design.undo' | 'design.redo' }`; `replaceDesign` resets the history; `acceptDerivedFiles` at the current seq calls `acceptRouting`. `CommitEvent`'s `patches` variant gains `routing?: Frozen<RoutingFile>` (present only for undo and redo).
- [x] `packages/design/src/index.ts` -- export `RunOptions`.
- [x] `packages/protocol/src/model-worker/types.ts` -- `patches` message gains `routing?: Frozen<RoutingFile>`.
- [x] `packages/workers/src/model-worker/model-worker-lifecycle.ts` -- `ModelWorkerLifecycle` (service): `#commit` forwards `event.routing` when present.
- [x] `packages/pipeline/src/pipeline/pipeline.ts` -- `Pipeline` (service): `#receivePatches` replaces `#routing` (deep-frozen) when the message carries one.
- [x] `packages/design/src/store/design-store-undo.spec.ts` -- boundary rows U1-U30, with spec-local test commands (test fixtures, untagged).
- [x] `packages/design/src/mirror/mirror-follows-the-store.spec.ts` -- rows M*.
- [x] `packages/workers/src/model-worker/model-worker-lifecycle.spec.ts`, `packages/pipeline/src/pipeline/pipeline.spec.ts` -- rows W*, P*.
- [x] `app/src/undo-redo.spec.ts` -- rows A*.

**Acceptance Criteria:**
- Given Corney's script run on a new design, when every step is undone and then redone, then the bundle texts after each undo and redo equal the texts recorded at that revision, and a same-thread mirror fed from the commit events equals the store's design after each.
- Given Corney's script plus `corneyIslandTestOverrides`, when `DeleteNode` deletes `thumbfan-far-home` and one undo runs, then the slot and its override are back as before.
- Given `pnpm test`, then every project passes.

## Implementation Notes

- Decision (Sergii, 2026-11-16): an undo or redo that finds its side empty leaves an open coalesce session open, not closes it, because it changes nothing, as with a command that produces no patches.
- Decision (build): `UndoHistory.record` drops redo entries, not the store, because the plan's task puts it there ("drops redo entries").
- Real-host run: a temporary `app` spec on the real model worker (`arrangeModelWorker`): `NewDesign`, `AddGroup { arrangement: 'free' }`, wait for the worker's accept at seq 2, `acceptDerivedFiles` a routing file tagged `ry` at seq 2, undo, redo, wait for the worker's accept at seq 4; `committed(store).routing.revision` is `ry` (2 passed, Chromium and Firefox). With the pipeline's routing line removed: `expected '21cbbae8…' to be 'ry'` (2 failed). Spec removed afterwards.
- Toggled bugs (implementer): fold inverse order reversed, `acceptRouting` a no-op, session left open on undo/redo, undo applying forward patches, pipeline routing line removed, workers forward removed: each turned its rows red.
- Verification: `pnpm vitest run packages/design packages/workers packages/pipeline app/src/undo-redo.spec.ts`: 52 files, 562 tests passed; `pnpm test`: 757 files, 5771 tests passed, no type errors.

## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer) on the diff since `8f34d1e`: high 0, medium 0, low 10, false 1, maybe-false 0. Patched: 9 entries (all low; direct fixes).
- low, patch: `model-worker-lifecycle.ts:126` sets `routing: undefined` on a command's message, against the task's "when present"; W1's `toEqual` cannot see it (quick + test-reviewer, one root cause). Conditional key; W1 asserts no `routing` property.
- low, patch: Sergii's empty-side decision has no failing test; `records a session after an unavailable undo` runs before any session opens (test-reviewer). New test: open session, empty redo, same key, one entry.
- low, patch: U9's test asserts only the rejection, not "design and seq unchanged" (quick).
- low, patch: module-level `R0`…`REFUSAL` deep-frozen in place by `replaceDesign`/`acceptDerivedFiles` (`deep-freeze.ts`, Immer `freeze(value, true)`), shared across tests (quick + test-reviewer).
- low, patch: the coalescing `it.each` loops over `rename`, which calls `expectOk` (quick).
- low, patch: U10 asserts `current` twice (quick).
- low, patch: A2 folds the cascade precondition into the claim's assertion (quick + test-reviewer).
- low, patch: `app` `replayAll` has no bound, so a runaway history hangs instead of failing (quick).
- low, patch: P2's expected `'r0'` comes from `designMessage`'s hidden `derivedFiles()` default (quick).
- false: "Review Triage Log empty while `lenses_ran` is set" -- triage of this pass is this entry.

Pass 2 (quick, test-reviewer) on the patch diff since pass 1: high 0, medium 0, low 3, false 0, maybe-false 0. Nothing above low and no frozen-block break: the loop ends; lows logged, not patched.
- low, logged: U9's test now asserts "design and seq unchanged" under a name about recording a session, narrowed to `{ design, seq }`, repeating U10's whole-value check (quick + test-reviewer).
- low, logged: the coalescing `it.each` narrows each run's `Result` to `.kind` and restates `rename`'s options ternary (quick + test-reviewer).
- low, logged: W1 picks the command's message by index (`received.at(-2)`), so an extra message would make `not.toHaveProperty('routing')` inspect the wrong one (test-reviewer).

## Design Notes

- Decision (plan): undo and redo emit the existing `patches` commit event with an optional `routing`, not a new event kind, because AD-11's gate passes "`design` and `patches`" by seq and AD-2 says the commit event carries "the patches, seq and revision of each commit, undo and redo (with the routing file an undo or redo restores)".
- Decision (plan): undo records, one per revision the history reaches (n entries, n+1 records, the first from `replaceDesign`), hold the routing reference, not one reference per undo entry, because undoing the first entry must restore the loaded routing file, which no entry's reference holds (AD-1: "load, version switch restore both saved files, undo and redo the routing file").
- Decision (plan): `undo` and `redo` recompute the revision with `revisionOf`, not a revision cached per undo record, because AD-2 says at each undo and redo `design` "computes the resulting design's revision".
- Decision (plan): a rejected run leaves the session open, not closes it, because the ticket's verify asks for "a rejected command leaving the design and the stack unchanged".
- Decision (plan): history lives in its own `UndoHistory` service, not in `DesignStore`'s fields, because AGENTS.md says "a new concept gets a new file" and "a class file holds only its class"; it is a `di` service because it holds state (AD-25: "Lookups and state (the derived graph, history, the pipeline, the design store) are services"). Only `DesignStore` injects it, so the store stays the one writer of `Committed`.
- Decision (plan): `UndoHistory` is registered lazily, not `.eager()`, because AD-2 makes the store eager for one reason ("It resolves eagerly at startup, so a duplicate command id fails there") and the history has no startup check; the store resolves it at construction anyway.
- Decision (plan): an accepted routing file swaps the current undo record's reference, not only the newest entry's, because AD-2 defines the reference as "the routing file last accepted at that record's revision"; after an undo the current record's revision is the one the accepted file was computed for. AD-2's mechanism sentence ("when an accepted file belongs to the newest record's seq") covers only the case where the cursor is at the newest record; U8 is the row where the two differ. Named at checkpoint 1.
- Decision (plan): `Changed` carries `inverse` from the one `produceWithPatches` call, not a second Immer call, because AD-2 says "`DesignPatcher` is the only `produce` call" and "an undo entry holds its command's Immer forward and inverse patches"; AD-2's "`Changed` is the produced design and its patches" grows by the inverse.
- Decision (plan): the protocol `patches` message gains an optional `routing`, not a new message kind, because AD-11 says "Undo and redo also send the routing file they restore, with their patches" and its gate passes "`design` and `patches`" by seq.
- Decision (plan): an empty coalesce key is a key, not "no key", because AD-2 folds a command "when it carries that entry's key", a plain equality with no empty case; `coalesce` absent is "no key" (U30).
- Decision (plan): `design`'s undo specs declare their own test commands, not shared ones in `design/src/testing`, because AD-2 says "`design`'s unit tests define their own test commands".
- Decision (plan): W1 stays a `workers` unit row, not an `app` row, because it tests the lifecycle's own part (mapping one commit event to one message), as `model-worker-lifecycle.spec.ts` already does with the real store; the end-to-end wiring is A1.

## Conformance Log

Pass 1 (two readers, union) and the gap reviewer; 1 finding dropped (gap: "no spine sentence defines `routing` on the `patches` message"; AD-11 does: "Undo and redo also send the routing file they restore, with their patches").
- `Give every decision its rejected alternative` (labels left in `record` and the `shallowRef`) -- fixed
- `Glossary terms only.` (`Step`) -- fixed
- `Lookups and state ... are services` (`change` tagged function; `undo`/`redo`, lifecycle and pipeline untagged) -- fixed
- `Give every decision its rejected alternative` (`design.undo` with no because; `UndoHistory` as its own service; not eager; `Changed.inverse`; protocol `routing`) -- fixed
- AD-2 `swapped by acceptDerivedFiles when an accepted file belongs to the newest record's seq` (plan swaps the current record) -- fixed (Decision (plan), named at checkpoint 1)
- AD-2 `the one current at the commit` (fold routing unspecified; U28 added) -- fixed
- `add empty input` (no design loaded: U29; empty key: U30) -- fixed
- Code Map line numbers for `design-patcher.ts` -- fixed
- `Test a rule where it is defined` (`design-patcher.spec.ts` not listed; U0 added) -- fixed
- `test wiring between packages as integration in pipeline or app` (W1) -- fixed (Decision (plan))
- `Give each file one kind of thing` (spec-local test commands, precedent `mirror-follows-the-store.spec.ts`) -- fixed (Decision (plan) quoting AD-2 "`design`'s unit tests define their own test commands")
- gap: `packages/editor/src/invoke/invoke.ts:44` cannot pass `coalesce` -- fixed (Never: 14.5 owns it)
- gap: undo availability reader for 16.4 -- fixed (Never: 16.4's unknown)
- gap: A2 named a right-side id for `DeleteNode` -- fixed (`thumbfan-far-home`, `corneyIslandTestOverrides`)
- gap: `UndoHistory` separate service with no decision -- fixed
Final pass (one reader):
- `Build schema values the test doesn't read with the concept's test builder` (`AddOverride` literal) -- fixed (`aSideComponentOverride`)
- `A choice no requirement made is a decision` (U30 empty key) -- fixed
- `Glossary terms only.` (`position`, `Restored`) -- fixed (AD-2's "undo record"; `PatchReplay` from the ticket's "replay patches")

## Boundary table

Level: U = unit in `design` (Node); W = unit in `workers`; P = unit in `pipeline`; A = integration in `app`. Spec-local test commands in `design`: `RenameDesign` (sets `meta.name`), `AddOverride` (pushes `aSideComponentOverride({ target: aSideId('left/k1'), component: 'a' })` from `schema/testing` onto `overrides`), `SetComponent` (sets `overrides[0].component` to its input). Arranged with `aDesign({ layout })` holding slot `k1`: a loaded design named `Corne`, routing file `R0`, fingerprints `F0`, seq `s`.

**Production bugs**

| # | Input / state | Expected | Level |
|---|---|---|---|
| U0 | `DesignPatcher.change` renaming to `Corne v2`; then `apply(next, inverse)` | `inverse` is a non-empty list; the applied result equals the original design | U |
| U1 | run `Rename 'A'`, `Rename 'B'`, `Rename 'C'` (no key); undo ×3 | names `B`, `A`, `Corne`; seq `s+4`, `s+5`, `s+6`; revision after the last undo equals the loaded revision | U |
| U2 | U1, then redo ×3 | names `A`, `B`, `C`; revision after each equals the one at that commit | U |
| U3 | key `k`: `AddOverride`, `SetComponent 'b'`; undo once | design equals the loaded design (inverse patches applied in reverse run order) | U |
| U4 | after U3, redo once | design equals the one after `SetComponent` | U |
| U5 | `Rename 'A'`; accept routing `R1` at the current seq; `Rename 'B'`; undo; redo | after undo: routing `R1`; after redo: routing current at the second commit (`R1`, carried by the commit) | U |
| U6 | `Rename 'A'`; accept `R1` at its seq; undo; redo | after undo: `R0`; after redo: `R1` | U |
| U7 | `Rename 'A'`; accept `R1`, fingerprints `F1` at its seq; undo | routing `R0`; fingerprints `F1` | U |
| U8 | `Rename 'A'`; undo; accept `R2` at the undo's seq; redo; undo | after the last undo: routing `R2` | U |
| U28 | key `k`: `Rename 'A'`; accept `R1` at its seq; key `k`: `Rename 'B'`; undo; redo | one entry; after undo: routing `R0`; after redo: `R1` (current at the fold) | U |
| U29 | no design loaded: undo, redo | `unavailable` with `design.undo`, `design.redo`; nothing emitted | U |
| U9 | undo; then `Rename 'A'` with key `k`; undo; undo | after the first undo: unavailable, design and seq unchanged; after the session: one undo returns to `Corne`, the next is unavailable | U |
| M1 | `Rename 'A'`, `Rename 'B'`; undo; redo; each commit event's patches applied to a mirror | mirror equals the store's design after each event, deeply frozen | U |
| A1 | Corney script on a new design; undo every step, then redo every step | bundle texts after each step equal those recorded at that revision; mirror fed from commit events equals the store's design after each | A |
| A2 | Corney script; `corneyIslandTestOverrides`; `DeleteNode` `thumbfan-far-home`; undo | slot and override equal those before the delete | A |

**Rules**

| # | Input / state | Expected | Level |
|---|---|---|---|
| U10 | empty history: undo | `err { kind: 'unavailable', command: 'design.undo' }`; design, seq unchanged; no commit event | U |
| U11 | empty history: redo | `err { kind: 'unavailable', command: 'design.redo' }`; nothing changes | U |
| U12 | one entry: undo, then redo | both ok; a second redo unavailable | U |
| U13 | one entry: undo, undo | first ok; second unavailable | U |
| U14 | `Rename 'A'`; undo; `Rename 'B'`; redo | redo unavailable; name `B` | U |
| U15 | key `k`: `Rename 'A'`, `'AB'`, `'ABC'`; undo once | name `Corne`; one more undo unavailable | U |
| U16 | key `k`: `Rename 'A'`, then `AddOverride` with key `k`; undo once | design equals the loaded design; a second undo unavailable | U |
| U17 | key `k`: `Rename 'A'`; key `j`: `Rename 'B'`; key `k`: `Rename 'C'` | three entries | U |
| U18 | key `k`: `Rename 'A'`; no key: `Rename 'B'`; key `k`: `Rename 'C'` | three entries | U |
| U19 | key `k`: `Rename 'A'`; undo; redo; key `k`: `Rename 'B'` | two entries (redo closed the session) | U |
| U20 | key `k`: `Rename 'A'`; undo; key `k`: `Rename 'B'` | one entry, name `B`; redo unavailable (undo closed it, the new commit dropped redo) | U |
| U21 | key `k`: `Rename 'A'`; `replaceDesign`; key `k`: `Rename 'B'`; undo; undo | first undo returns to the replaced design; second unavailable | U |
| U22 | key `k`: `Rename 'A'`; key `k`: `Rename ''` (refused, `input-invalid`); key `k`: `Rename 'C'` | the refusal returns its rejection, seq unchanged; one entry; undo once gives `Corne` | U |
| U23 | key `k`: `Rename 'A'`; key `j`: `Rename 'A'` (no patches); key `k`: `Rename 'C'` | `ok` for each; one entry; undo once gives `Corne` | U |
| U30 | key `''`: `Rename 'A'`; key `''`: `Rename 'B'`; undo once | name `Corne` (the empty key is a key: "when it carries that entry's key") | U |
| U24 | a command whose apply returns a `Rejection` | that rejection; design, seq and history unchanged | U |

**Module boundaries**

| # | Input / state | Expected | Level |
|---|---|---|---|
| U25 | `Rename 'A'`; undo; redo; record commit events | three `patches` events; the command's has no `routing`; the undo's carries `R0`, the redo's the routing at that undo record | U |
| U26 | after undo and after redo | design deeply frozen | U |
| W1 | lifecycle running; store undo after a command | the worker gets a `patches` message with the undo's patches, seq, revision and `routing`; for the command, no `routing` | W |
| P1 | whole design with `R0`; `patches` with `routing: R1` | the next derived-files post carries `R1` | P |
| P2 | whole design with `R0`; `patches` with no routing | the next derived-files post carries `R0` | P |


## Verification

**Commands:**
- `pnpm vitest run packages/design packages/workers packages/pipeline app/src/undo-redo.spec.ts` -- expected: all pass.
- `pnpm test` -- expected: whole suite passes.
