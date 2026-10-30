---
name: 'keeb-cad: code decisions, agenda and outcomes'
type: decision-agenda
status: decided
created: '2026-10-30'
updated: '2026-10-30'
origin: 'built with Sergii after the 2026-10-30 party session; Sergii kept every room candidate. Decided by Sergii in the code-decisions party session the same day.'
companions:
  - _bmad-output/architecture-keeb-cad-layout-model/directions-2026-10-30.md
affects: [AD-2, AD-10, AD-11, AD-18 (implications for bmad-architecture to word, not decided rules)]
next: 'bmad-architecture folds these decisions and the directions record into the spine; then the epics are re-sliced as vertical slices'
---

# Code decisions

This file started as the agenda for the code-decisions session. Every item now has an outcome. Only the lines marked **Decided** were confirmed by Sergii. **Not decided** lists things that came up in the round, often bundled into a question, and are still open. **Evidence** lists the facts the round used: spikes and outside research. The spikes ran in a temporary scratchpad and were not kept in the repo, so their results are summarised here.

## Outcomes

### A. Code organisation (Sergii's)
- **Decided, wiring:** module singletons (imports as the wiring) are ruled out, because they are hard to test. Hand-wired factories with one composition root were shown in code and rejected as "DI by hand" that won't scale. Wiring uses **`@snap/ts-inject`**.
- **Decided, layout inside a package:** folders **by concept**, not by kind.
- **Not decided:**
  - a convention and a test against ts-inject's silent override miss across a merged `PartialContainer`;
  - a rule for code that spans two concepts ("goes with what it produces");
  - whether the few stateful services get their own folder.
- **Evidence:** wiring spike over 9 libraries plus manual, all wiring the same app.
  - At 11–12 services, wiring lines were similar everywhere (18–29).
  - Only ts-inject and iti caught all three deliberate wiring mistakes in `tsc` *and* let a test swap any service deep in the graph without a planned seam.
  - typed-inject is unmaintained.
  - tsyringe doesn't import under TS 6 without a reflect polyfill.
  - Effect 4 worked alongside Vue refs, but adds a second paradigm, needs `runSync` per command, and was one month old (the spike agent itself wrote a wrong v4 API from memory).

### 1. What the "one world" is
- **Decided:** **one reactive graph** from the model to the pixels. The core uses **Vue's reactivity API directly**, with no interface of our own, imported only through **a single re-export file**.
- **Implication:** AD-10's "only `editor` imports Vue" must be amended openly to let the core import `@vue/reactivity`.
- **Not decided:** staying on Vue 3.5 or moving to 3.6 (which ports alien-signals into `@vue/reactivity`; it was at rc.14 on 2026-10-30).
- **Evidence:** reactive-core spike on a Corney-sized design.
  - Fine-grained (`@vue/reactivity` and `alien-signals`), one coarse computed, and a plain full recompute were all under 2 ms per drag update, also at 4× the keys.
  - Clipper geometry was ~93% of the cost.
  - Fine-grained used ~3× the heap (~300 KB).
  - The reactive graph was chosen for one mental model, not for speed.

### 2. The doors
- **Decided:** **one rule, one crossing.** Anything leaving or entering the reactive graph goes through one crossing. There is no fixed list of doors.
- **Decided:** inside the graph, **refs hold plain values that commands replace**, never mutate. Updates go through **an established library rather than our own machinery**. Immer-style patches are to be **considered**.
- **Not decided:** which library (Immer, Mutative or another), and whether its patches are used.
- **Evidence:**
  - Vue proxies throw `DataCloneError` in `postMessage`.
  - Update-library spike:
    - every command took microseconds with Immer, Mutative or plain spread;
    - inverse patches restored state exactly;
    - Immer freezes by default, including the caller's inputs (~1.7× cost, still microseconds);
    - id-list changes come out as array-index patches, which is awkward for AD-9's id-keyed merge;
    - Mutative and Travels are essentially one maintainer.

### 3. Enforcing "only commands write"
- **Decided:** enforced at **compile time**. Everything outside commands sees the design **read-only through types**, so wrong writes fail without runtime checks.
- **Not decided:**
  - a dependency-cruiser fence as a backstop;
  - runtime freezing (Sergii's "without runtime" leans away from relying on it);
  - the details of deep read-only typing (TypeScript `readonly` is shallow).

### 4. Debugging recomputation
- **Decided:** a small **text trace modelled on tldraw's `whyAmIRunning`** (named nodes, the chain of causes, readable by agents in test output), built on Vue's hooks, plus a few **"this must not recompute" yes/no checks** on key paths. **No recompute counts.**
- **Evidence:**
  - Vue's `onTrack`/`onTrigger` work only in dev builds and lose the source after one hop.
  - alien-signals has no hooks.
  - A ~40-line wrapper answered both "why did it recompute" and "why didn't it".
  - Outside: tldraw `whyAmIRunning`; Vue DevTools v9 beta has a reactivity graph (needs Vue 3.6, component-scoped, visual only); Preact has no such tooling.

### 5. The undo mechanism
- **Decided:** undo keeps **the before and after of each touched record** between marks (tldraw-style). **Patches are derived on demand** from them when needed.
- **Implication:** no per-command inverse code. AD-2's "a committed gesture is one undo entry" holds through marks.
- **Evidence:**
  - Drag spike, 120 updates squashed into one entry: before/after per record ~0.3 KB and 0.1 µs to undo. Concatenated library patches 50–130 KB. One diff at the end ~1.5 KB.
  - Immer and Mutative have no built-in patch squash.
  - AD-9's three-way merge compares three states and doesn't need undo history.

### 6. Invalid states
- **Decided (Sergii's proposal):** **the edit goes through, the break is flagged, and a fix (re-anchor, or the equivalent) is offered right away, without blocking.**
- **Not decided:**
  - suggest-only vs sometimes auto-apply;
  - keeping world position vs keeping expression links when re-anchoring (combining offsets can turn an expression into a number);
  - common recipe spot names, which matter after a style switch;
  - whether AD-2's existing refusals (a vertex in use, a referenced keymap layer) change.
- **Note:** D5 (switch style at any time) means a dangling recipe-spot attachment can't be refused. It has to be flagged and offered a fix.

### 7. Search vs index for "who points at X"
- **Decided:** **one function that searches on demand.**
- **Not decided:** caching it as a computed for a live "used by" panel. Leave that until a panel needs it.

### 8. How finely derived values are divided
- **Decided:** derived values are **the reactive graph's own small computeds**. There is **no single `resolve` function**.
- **Implication:** AD-10's "shared derivations live in `model.resolve`, and only there" needs rewording.
- **Moved:** caching for the case in the worker moved to item 10.

### 9. Where behaviour lives
- **Decided:** **commands are registered entries.** Each describes its name, inputs and when it's available, and the UI, undo labels, shortcuts and agents all read from the register.
- **Decided:** **the split.**
  - Pure logic (e.g. `placeSlot`: an anchor frame plus an evaluated offset gives a world frame) is plain functions.
  - Lookups and state (the derived graph, history, the pipeline, the command register) live in services wired by ts-inject.
- **Ruled out:** functions with state passed around by hand.
- **Note:** methods on the data itself are out because of item 2. Class instances lose their methods when they cross to workers or files.
- **Not decided:** registers for everything the user picks from a list (recipes, parts, exports). That was Mary's extension.

### 10. The recipe interpreter as code
- **Decided, shape (Sergii's insight):** the inside of a recipe uses **the same model as the outline (D4)**: named pieces, each derived or built on top of other named pieces, with accents on top. The outline, the plates and the case all use one mechanism.
- **Decided, operations:** a **closed set**. **No foreign or library code runs inside the engine.** New operations are added by the app, and the interpreter is built so that adding one is easy.
- **Decided, worker:** the case worker **caches per named piece**.
- **Not decided:**
  - the exact verb list (a sketch: combine, offset, extrude, tilt, round/chamfer, pattern; bosses and port cutouts are derived pieces from parts);
  - 3D edges reachable only through declared spots;
  - tilt as new vocabulary;
  - doing 2D offsets with clipper2 (as arcs) instead of replicad's `Drawing.offset` (it measured better, but wasn't chosen);
  - the worker restart policy.
- **Evidence:**
  - **Research on how tools chain operations:**
    - Mainstream timelines (Fusion, SolidWorks, Onshape) are lists with a hidden graph.
    - The named-pieces shape matches Onshape (parts plus merge scope) and Ergogen (named cases).
    - The cure for topological naming is to reference named or datum things, never generated faces.
    - Onshape FeatureScript pins custom features per file and only notifies about newer versions. That's a precedent for D8.
  - **replicad spike on one tray half:**
    - ~0.55 s full rebuild (edge rounding ~35%, each cut 36–53 ms);
    - honeycomb floor 2.8 s; 7° wedge 1.2 s;
    - display mesh 476 ms at default detail, 77 ms coarse;
    - STEP 41 ms, STL 474 ms.
  - **Caching per piece:** moving a magnet pocket −91%, changing wall thickness −9%, moving a key ~0%.
  - **Memory:**
    - replicad's `Drawing.offset` leaks ~4 MB per call.
    - With clipper offsets (as arcs): rebuild 485 ms, within 0.003 mm of the original, but chained OCCT booleans still grow memory ~5 MB per rebuild (~3 GB after 400 rebuilds).
    - The WASM heap never shrinks.
  - **Cancelling:** OCCT runs synchronously, so cancelling means terminating the worker. Restart plus first build ~1.2 s, and the cache is lost.
  - Edge rounding picked the right edges across key moves from −3 to +5 mm.

### 11. Package boundaries
- **Decided:** **keep the 11 packages for now.** Sergii's reasons: short import paths, and a closed public surface (package `exports` stop code reaching into internals).
- **Context:** 142 lines of TypeScript existed across the packages and the app on 2026-10-30.

### 12. Order
- **Decided:** **vertical slices named by capability.** Sergii rejected the walking skeleton, the layered order, and the short skeleton.
- **Not decided:**
  - the slice list and its order (the room's sketch: see keys → change a parameter → drag → body follows → plate DXF → tray in 3D → switch style → footprints and PCB → nets → routing → firmware → wireless copy);
  - whether each slice is checked against Corney.
- **Note:** Corney enters keeb-cad as a script of layout commands in tests (epic-layout). There is no importer and no hand-written Corney design file.

### 13. Truth
- **Decided:** **a layered verification approach.**
  1. Compile time: types, ts-inject, package exports, depcruise.
  2. Unit tests, written test-first, for functions and services.
  3. Generic checks over every registered command (do → undo → identical; redo), file save → load round-trip, and only plain data at the crossing.
  4. Invariants on generated designs, which are the same rules the app shows as violations.
  5. Headless slice scenarios: **the ongoing marker**.
  6. End to end in a real browser: one journey per slice, kept small; a person approves any screenshot baselines.
  7. Reactive and resource checks: must-not-recompute, frame budget, worker memory.
  8. Golden end results at milestone acceptance only: Ergogen ±0.05 mm, KiCad opens it, the fab checker accepts it, ZMK builds.
- **Decided (part of the approved shape):** agents don't edit what decides "right": oracles, invariants, golden files.
- **Sergii's framing:** fixtures are good for validating end results, not as an ongoing marker. Unit tests alone are not enough.

### 14. Teaching agents
- **Decided:** **enforce first, then real code.**
  - Anything that can be checked becomes a check.
  - What can't be checked is shown by real production code from the first slice.
  - AGENTS.md stays short and points at both.
- **Decided:** rules that can't be enforced live in **one file that both reviewers load**: `bmad-review` via `review_guidance` and `bmad-code-review` via `persistent_facts`, both through `_bmad/custom` overrides.
- **Not decided:**
  - who may edit that file ("agents don't edit it" was proposed, not repeated);
  - using `bmad-project-context` pitfalls as the feedback loop for repeated agent mistakes.

## Original agenda (as built before the session)

### Sergii's
- **A. Code organisation.** For example, whether to adopt dependency injection: how modules receive what they depend on (who creates what, how a stage or the recipe interpreter gets its collaborators), and how code is laid out inside a package. It touches 9 and 11 but is distinct from both: it's about wiring.

### Room's candidates (all kept)
1. **What the "one world" is.** *(ex-D1 in the directions record)*
2. **The doors.** Where plain data crosses, and how. *(Winston)*
3. **Enforcing "only commands write".** *(Smithy, Amelia)*
4. **Debugging recomputation.** *(Amelia)*
5. **The undo mechanism.** *(Winston, Mary)*
6. **Invalid states.** *(directions record, Open)*
7. **Search vs index** for "who points at X". *(directions record, Open)*
8. **How finely derived values are divided.** *(Winston)*
9. **Where behaviour lives.** *(Mary)*
10. **The recipe interpreter as code.** *(follows from D8 and D9)*
11. **Package boundaries.** *(Mary, Amelia)*
12. **Order.** *(Amelia)*
13. **Truth.** *(Mary vs Amelia)*
14. **Teaching agents.** *(Smithy, Sally)*

## Session notes
- **Order taken:** 1 → 12 → 1 → 2 → 3 → A (wiring) → 4 → 5 → 6 → A (wiring) → 9 → A (layout) → 11 → 7 → 8 → 10 → 13 → 14.
- **Process catches by Sergii:**
  - re-asking reasoning already on record;
  - an invented "Corney file";
  - dropping patches because milestone 2 is far away;
  - a DI list picked from memory;
  - presenting a single `resolve()` after choosing a reactive graph;
  - drifting into code detail while forgetting that commands are listed in the UI;
  - framing truth as golden vs unit.
- **Sergii's experience isn't evidence.** Fact questions were turned into spikes or outside research.
