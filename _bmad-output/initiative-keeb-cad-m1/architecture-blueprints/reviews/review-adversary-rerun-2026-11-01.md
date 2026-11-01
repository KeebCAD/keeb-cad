# Adversary review (re-run): blueprints spine, 2026-11-01

- **Target:** `_bmad-output/initiative-keeb-cad-m1/architecture-blueprints/architecture-blueprints.md` (draft, BP-1 to BP-10, working-tree version)
- **Parent, read-only:** `_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md`, including today's uncommitted edits: the `blueprint/authoring` path and dashed build-time edge in AD-10, the register's permission to evaluate ranges and conversions, `uses` and `envelope` in the Data Schema
- **Also read:** the first adversary review (`review-adversary-2026-11-01.md`), the rubric and verification reviews, `.memlog.md` (gate decisions Q1 to Q13), tickets 17 and 18 in `tickets/epic-see-corneys-keys/tickets/tickets.toml`, and `.dependency-cruiser.mts`
- **Lens:** for each hole, two units one level down, each following every rule exactly as written, that still build things that don't fit together. Each one ends with a tightening and says whether it is a **wording** change (the rule already means it) or a **new rule** (it needs a decision). A ⚠ marks a fix that touches the parent's Data Schema or AD-10 graph; AGENTS.md says to stop and ask before making those.

## Verdict

**Closer, but still not ready for stories 17 and 18.** The gate closed the import fence (H1), the schema's home (H2), the `uses` field (H3) and the lifecycle's owners (H6). Five new holes open in the parts that are new. The largest: the lane runner that BP-5 and BP-9 put in `pipeline` can't import `blueprint` under AD-10's graph (N1). The second: BP-8's role-keyed return map can't carry the choc key's own outputs, and it gives no channel for the `blueprint` violation that story 17 must ship (N2).

## Status of the first review's holes

| # | Hole | Status | Where / what remains |
| --- | --- | --- | --- |
| H1 | Who imports the API types and `defineBlueprint` | **Closed** | AD-10 (parent edit): `blueprint/authoring`, `library/blueprints-src/`, two fence rules, a dashed edge. Remaining: the subpath is called "type-only", but `defineBlueprint` is a runtime value (N5) |
| H2 | Home of the schema, query list and API version | **Closed** | BP-7 and Q3: the schema lives in `model`, the query list and API version in `blueprint`, both checked in the worker. Accepted side effect: main can pin an upgrade the worker then refuses with `blueprint-api-too-new` (harmless while every blueprint ships with the app) |
| H3 | Nesting: no `uses`, MVS vs pin, where the factory compiles, nested reads | **Closed** | Data Schema `uses`, BP-6, BP-9. Remaining: direct `uses` vs their transitive closure (N4) |
| H4 | Handle table owner; form of outputs | **Partly closed** | BP-8 and BP-9: one table per run, owned by the host, shared by `use()`; the stage converts handles. Still open: handle kind tags, and who owns a converted value once the table frees its handle (case solids; see N3's note) |
| H5 | How outputs reach the stage; lane cache key | **Decided, then reopened** | BP-5: each lane run is a cached unit, and a stage never runs blueprint code. But the unit that owns the run has no legal package (N1), and AD-11's cache-key bullet still has no lane line |
| H6 | VM creation owners; case-worker VMs; cached infrastructure failures | **Mostly closed** | BP-9 pool per worker; BP-5 `unavailable`, never cached. Folded into N1: the model worker's caller of the pool. Also open: the case worker has no "next pause", so when an `unavailable` case lane reruns is unstated |
| H7 | ±1 step drift vs cached failures and fingerprints | **Closed by decision** (Q6b: accepted limit) | The consequence is unstated: a lane at the edge can flip on every VM recreation, and BP-9 now recreates VMs more often (unpin then undo, memory replacement, nested pin change). Each flip shows as **Accept output change**. One sentence in BP-4 should say so |
| H8 | Fingerprint of a failed lane | **Open** | The spine never mentions fingerprints. `unavailable` makes it worse: an entry can now be failed, unavailable or good at a committed revision |
| H9 | Range and `convert` on main; checked twice | **Closed** | AD-10 (parent edit) lets the register evaluate with `model`'s evaluator. Remaining: BP-6 checks a nested blueprint's inputs in the worker, and no failure kind covers that (N4) |
| H10 | Shipped artefact and lane signature | **Partly closed** | BP-8 fixes `lanes = { <stage>(args, op) }`. The artefact's form (bundled or not, script or module, declaration kept or stripped) and the lane-key round-trip check are still open (N5) |
| H11 | State shared across one blueprint's lanes | **Closed** | BP-3 ("nothing survives between runs") and BP-8 (args hold exactly what is declared) settle it by construction |
| H12 | What the guest sees per input kind | **Partly closed** | BP-8 fixes the guest form (numbers, strings, opaque handles). It doesn't say what a handle stands for in each stage, or which operations accept it. An `anchor` input in a `parts` lane has no frame yet, since `parts` runs before layout |
| H13 | "One JSON string" for every result? | **Open** (wording) | BP-1 is unchanged, and BP-10 now routes the interpreter through the same wrapper, so the ambiguity spreads to the data form (N5's note) |
| H14 | How code, declarations and queries reach the case worker | **Open** (wording) | BP-9 says the case worker "fills its own" pool, but not where the code, declarations and query results come from. `case` doesn't import `library` |

---

## N1. The lane runner has no package it can legally live in

**The rules.**
- BP-5 binds `pipeline` and says "a stage receives only lane outputs, never runs blueprint code".
- BP-9 binds `pipeline`: "the model worker fills [the pool in `blueprint`] in its pause".
- AD-10's graph has **no `pipeline → blueprint` edge**: `pipeline` reaches only the stages, `model`, `library`, `reactive` and `protocol`, and "dependencies point only as drawn".
- `model → blueprint` exists, but `model` can't import `plates` or `case`, whose operations a lane needs (AD-10: "each stage implements its own lane's operations").
- Ticket 18 says "model's parts-lane computed resolves each slot's part … through story 17's blueprint package".

**Unit A, story 18 (`model`).** It follows ticket 18 and AD-11, which lists the `parts` lanes among `model`'s derivations. A `model` computed calls the host, so parts lanes run inside `model`'s graph and are cached as computeds, keyed by Vue's dependency tracking.

**Unit B, the first plates-lane story (`pipeline`).** It follows BP-5 and BP-9 and builds the lane-run cache and the pool filler in `pipeline`. To do that it adds `@keeb-cad/blueprint` to `pipeline`'s dependencies. AD-10's per-package rule fails, or the story quietly redraws the graph.

**Unit B′, the same story played safe.** It puts the runner in `plates`, which may import `blueprint`. That breaks BP-5 ("a stage never runs blueprint code").

**Clash.**
- Two lane caches with two key models: Vue tracking in A, BP-5's hash key in B.
- Two pool fillers. The parts runner in `model` needs VMs before layout runs. `pipeline`'s pause sits "between applying patches and running stages", but `model`'s computeds aren't stages and are pulled lazily, so nothing orders A's first read after B's fill.
- The case worker has the same question: `case` may import `blueprint`, but BP-5 forbids `case` (a stage) from running lanes, and no other package is named.

**Tightening (new rule, ⚠ AD-10).** Name one owner per thread and draw its edges. One shape that fits every rule:
- **`model` owns the lane runner service** in its worker partial (`model/worker`). It holds the BP-5 cache, calls the pool, and receives each stage's operation table and output converter **injected** through ts-inject tokens. `pipeline` provides those tokens from the stage packages it already imports, so `model` never imports a stage.
- `pipeline` calls `model`'s runner to fill the pool in its pause. The `parts`, `shapes` and `extras` lanes run through the same runner from inside `model`'s computeds.
- In the case worker, the case worker's entry (not the `case` package's stage function) wires the same runner with `case`'s table.
- Then reword BP-5 ("owned by `model`'s lane runner") and BP-9 ("`pipeline` asks `model`'s runner to fill the pool").

The alternative is a `pipeline → blueprint` edge, which changes the parent graph. Either way it is Sergii's call.

## N2. A role-keyed return map can't carry a key's outputs, and lanes have no way to report a problem

**The rules.**
- BP-8: "A lane returns a map from each declared role to a handle or a plain value. The host checks the roles against the declaration."
- The Data Schema's `LaneDeclaration.outputs` is a **list** of `{ role, target?, kind, purpose? }`, so two entries may share a role with different targets.
- AD-5: a key has role-tagged cutouts with a target `plate` / `pcb` / `case`, so one role (`cutout`) appears three times.
- AD-18: "a blueprint reports problems through the `blueprint` violation, with messages its author writes". Ticket 17 ships that violation kind.

**Unit A, story 18 (choc-key, and its plates successor).** It declares three `cutout` outputs (plate, pcb, case) and returns `{ rectangle, envelope, cutout: [hPlate, hPcb, hCase] }`, matching the array by position. To report "1.75u has no stabilizer", it adds a `problems: ['…']` key.

**Unit B, story 17 (the host).** It reads BP-8 literally: one value per role, `cutout` must be a handle, and every returned key must be a declared role. A's array is a non-handle plain value of the wrong kind, and `problems` is an undeclared role, so the lane fails. For author problems it exposes `op.report(message)` as a host call, which A never calls.

**Clash.**
- The first key with targeted cutouts fails in the host.
- Whichever way a lane yields several values for one role (a tray's N mounts, a part's N cutouts), the role check can't tell which declared entry each value fills.
- AD-18 makes every output required ("missing role" is a cached failure). A lane can't omit an output it doesn't produce under some option (magnets off means no `mount`) unless it returns an empty value, and nothing says an empty array is legal.
- Two ways a `blueprint` violation leaves a lane: as part of the output, or as a host call.

**Tightening (new rule, possibly ⚠).**
- Key each returned output by **role and target** (`'cutout@plate'`), or by the declared output's index. Each value is one handle, or an array of handles of the declared kind. An array may be empty.
- If a count per declared output is wanted (exactly one / any), that is a new field in `LaneDeclaration.outputs`: ⚠ Data Schema, so ask.
- Pick one channel for author problems and put it in BP-8. The recommendation is the return value, `{ outputs, problems }`: it is cached with the run, and it keeps `op` a pure operation table. A host call `op.report` would be a side effect that BP-5's cache has to replay.

## N3. BP-5's cache key collides across lanes and hashes things that aren't values

**The rules.** BP-5: "the blueprint version, its pinned `uses` and the hash of exactly the arguments it receives". BP-8: part refs, anchors, assets and pulls arrive as **opaque handles**.

**Unit A, story 17 (the host).** It hashes `args` as the guest receives it, since that is literally "the arguments it receives". Handles are small integers allocated in order per run.

**Unit B, `model`'s runner (or `pipeline`'s).** It hashes the host values before handles are minted: the `PartRef` for a part input, the `Anchor` record for an anchor, the `AssetHash` for an asset, and the pulled output values in the order its producer list gives.

**Clash.**
- **Cross-lane collisions.** The key has no stage. A blueprint with a `plates` lane and a `pcb` lane that read the same inputs and pull nothing gives both runs the same key in the same worker. The second lane gets the first lane's outputs. This happens in both units.
- **False hits in A.** Handle `3` means a different shape in different runs, so A hits on unrelated pulls.
- **False hits in B.** A `PartRef` doesn't change when the referenced design part's own inputs change, so B keeps a stale result. An `Anchor` record doesn't change when the thing it names moves.
- **Pull order.** For a pull with count `any`, nothing says what order the array has. The tray's `plates` lane (model worker) and `case` lane (case worker) can see the same cutouts in different orders, so they get different hashes and possibly different geometry.
- **No stage version.** The key doesn't include the stage version or the operation set's version. AD-11 lets case results be cached in browser storage, and AD-18 fixes bugs "in place, in the same operation". A persisted lane entry survives an app update that fixed an operation, and the fingerprint never sees the change.
- **Direct or transitive `uses`.** "Its pinned `uses`" can be read as direct only. Then a raised pin two levels down doesn't change the caller's key (see N4).

**Tightening.**
- **Wording:** the key includes the lane's stage and the stage's version.
- **New rule:** the hashed form of each argument kind is defined once, beside the input kinds. It is the resolved host value a handle stands for, never the handle: a part's resolved outputs, an anchor's frame, an asset's hash, a pull's output values. Every `any` / `at-least-one` pull array is in one canonical order, for example by producer id, then slot id, then declaration index.
- Say whether the lane cache is memory-only. If it may persist, the key also carries the runtime version.

Note on H4, which this exposes: a cached `solid` lane result holds a replicad object, while BP-8 frees "the run's handles" at its end. Say that freeing a handle drops the table's reference only. The converted output owns the object, and the cache's eviction disposes it.

## N4. Nesting: direct vs transitive `uses`, what `use()` returns, and blueprints that can't be nested

**The rules.**
- BP-6: `use(id, inputs)` runs "in the caller's VM, lane and handle table"; a `use()` of an id not in `uses` fails; a nested blueprint "has no pulls or queries of its own".
- BP-9: a VM holds "its factory and its pinned `uses`' factories".

**Unit A, story 17 (the host).** It compiles the **direct** `uses` into the VM and checks each `use()` against the root blueprint's `uses`.
- `use()` runs the nested blueprint's lane for the caller's stage and returns that lane's role map, unchecked.
- Omitted inputs take their declared defaults.
- A wrong input throws a message, so it becomes `lane-failed` with the cause "a throw".

**Unit B, the combo key-plus-encoder story (`library`).**
- `combo` uses `choc-key`, which uses `stabilizer`. B expects `stabilizer` in the VM too.
- B reads "has no pulls or queries of its own" as "they arrive empty", and B's nested case-lane addition (magnets) reads `args.pulls.cutout` and crashes.
- B expects the nested outputs checked against the nested declaration, and omitted inputs to be `blueprint-input-invalid`.

**Clash.**
- `choc-key`'s own `use('stabilizer')` fails in A's VM, or passes A's root-only check while `stabilizer` isn't in the root's `uses`.
- BP-5's key ("its pinned `uses`") misses a raised `stabilizer` pin in A, so no rerun and no fingerprint change. B reruns.
- A blueprint whose lane declares pulls or queries can be named in `uses`. Nothing rejects it at library build or on main, so it fails only at run time.
- Two failure kinds for a bad nested input: `lane-failed` ("a throw") or `blueprint-input-invalid`. The Conventions say the latter "comes from main", and no cause in `lane-failed`'s list fits.
- A cycle in `uses` (A uses B uses A) isn't rejected anywhere. MVS terminates, but a closure-compiling pool recurses.

**Tightening.**
- **Wording:** "pinned `uses`" means the **transitive closure** in BP-5's key and in BP-9's VM. Each `use()` is checked against the `uses` of the blueprint making the call.
- **New rule:**
  - The library build rejects a `uses` cycle, and a `uses` target whose lane for the caller's stage declares pulls or queries.
  - `use()` returns the nested lane's checked output map (N2's form), and the nested blueprint has to have a lane for that stage.
  - Omitted nested inputs take their defaults.
  - A bad nested input is `lane-failed` with a new cause, "nested input invalid", added to the Conventions' list.

## N5. The authoring artefact: a "type-only" subpath with a runtime function, two shapes of module, and code that lands in main's bundle

**The rules.**
- AD-10 (parent edit): `blueprint/authoring` is a "type-only subpath (the API types and `defineBlueprint`)".
- BP-7: the build evaluates "each exported `defineBlueprint({ … })`" and "ships JS plus declaration data … Only workers load the JS".
- BP-8: "A module exports `lanes = { <stage>(args, op) }`".
- BP-3: a factory built in an allow-listed global scope with no module loader and no `defineBlueprint` global.
- The declaration's own `lanes` field is `Record<LaneStage, LaneDeclaration>`.

**Unit A, story 18 (choc-key source).** It wants `args.inputs.size` typed from the declaration (the point of "type-checked against the API types"), so it writes one object:

```ts
export default defineBlueprint({ id, version, inputs, lanes: { parts: { pulls: [], queries: [], outputs: [...], run(args, op) { … } } } })
```

The compiled JS keeps `import { defineBlueprint } from '@keeb-cad/blueprint/authoring'`.

**Unit B, story 17 (the factory).** It follows BP-8 and evaluates a script that must yield `{ lanes: { parts(args, op) } }`, with the declaration a separate export the build strips.

**Clash.**
- A's artefact has an `import` the sandbox can't resolve and calls a function that isn't a global. Its `lanes` is the declaration's field, with `run` inside, not BP-8's map of functions.
- "Type-only" lets 17 ship `defineBlueprint` as a declared type with no implementation. 18's build then can't call it.
- "Only workers load the JS" says who *evaluates* the code, not who *bundles* it. If `library`'s single runtime export carries the JS strings next to the declarations, `editor` (main) bundles every blueprint's code as text. That stays inside the fence, but it's against AD-25's intent.
- The data-form interpreter (BP-10) goes "through the same host-call wrapper". If the wrapper JSON-encodes every result (H13, as written), the interpreter parses its own host's results for nothing. If it skips encoding, it isn't "the same wrapper".

**Tightening.**
- **Wording:**
  - Call the subpath "the authoring subpath: API types plus the identity `defineBlueprint`", not "type-only".
  - The library build emits per version one **self-contained script** (bundled, no `import`, no `defineBlueprint` call left) that evaluates to `{ lanes: { <stage>(args, op) } }`, plus the declaration as JSON.
  - A round-trip test checks that the script's lane keys equal the declaration's lane keys.
- **New rule:**
  - Pick one source shape. The recommendation is one `defineBlueprint({ …declaration, lanes: { <stage>: { …LaneDeclaration, run } } })`, which the build splits into declaration data and the script. This is the only shape that types `args` from the declaration.
  - `library` ships code through a **worker-only subpath** (for example `library/blueprint-code`) with an entry-fence rule. This also answers H14 for the model worker. The case worker gets code from `pipeline` over its port once per epoch.
  - The wrapper's shared layer is the operation table, the handle table and attribution. JSON encoding is the guest edge only, so the interpreter skips it.

---

## Also found (smaller)

- **Memory is history-dependent too (BP-4 × BP-5).** `memoryLimit` is per VM, and fresh instances leave cyclic garbage until QuickJS's cycle collector runs. A run near 64 MiB can pass or fail out of memory depending on earlier runs, yet BP-5 caches out-of-memory as deterministic. Either run the garbage collector before each run (a new rule; cheap to spike in 17) or list out-of-memory with the step drift as an accepted limit (wording).
- **Data-form failures have two kinds (BP-10 × AD-16).** A failing operation in the design's own `shapes` is `shape-failed` (`model`) under AD-16, and `lane-failed` under BP-5 and BP-10, since the interpreter is "cached per lane run like code". The data form also has no version, so BP-5's key ("the blueprint version, …") doesn't apply to it as written. One line in BP-10 should name both the key and the kind.
- **Handle kinds.** `op` is per stage, but the 2D operations from `geometry` appear in several stages. Nothing says passing a 2D handle to a 3D operation is a typed throw rather than a host crash (the rest of H4).
- **Case worker reruns.** BP-5 reruns an `unavailable` lane "in the next pause", but the case worker has no pause. Say that it reruns on the next slice, or on the respawn's first slice.

## Angles

- 📐 **Every gate fix moved a decision into a package without checking the package graph.** BP-5 and BP-9 bind `pipeline`, but AD-10's drawing has no edge from `pipeline` to `blueprint`. The first review's angle (rules name packages, not services) still holds, one level further down: the gate named owners, but not owners that can import what they own (N1).
- 📐 **The return map was designed from the minimal key.** The spike's key has one `rectangle`. Every real part has targeted cutouts, and every real build style has N mounts. BP-8 was decided against the one example that has no repeated role (N2). Check the next contract against Corney's whole key part, not the spike's.
- ☝️ **"Undeclared reads are impossible by construction" (Q1) is true for reads, not for the cache.** Passing only what is declared stops undeclared reads. It doesn't make "hash of the arguments" a correct key, because the arguments are handles (N3). The adopted rationale makes that look settled when it isn't.
- ☝️ **N2's count field and N1's edge are both parent changes.** Like `uses` in the first review, an output-count field costs one field before choc-key v1 ships. After that it means a new version of every shipped blueprint (AD-5 immutability).
