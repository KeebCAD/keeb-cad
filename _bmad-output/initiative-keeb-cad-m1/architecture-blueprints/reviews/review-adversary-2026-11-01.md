# Adversary review: blueprints spine, 2026-11-01

- **Target:** `_bmad-output/initiative-keeb-cad-m1/architecture-blueprints/architecture-blueprints.md` (draft, BP-1 to BP-7)
- **Parent, read-only:** `_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md` (AD-5, AD-10, AD-11, AD-18, AD-25, Data Schema `BlueprintDeclaration`)
- **Also read:** `blueprint-calls-verdict-2026-11-01.md`, `.memlog.md` (D1 to D6), tickets 16, 17 and 18 in `tickets/epic-see-corneys-keys/tickets/tickets.toml`, and `.dependency-cruiser.mts` (`tsPreCompilationDeps: true`, rule `exports-and-library-import-only-model`)
- **Lens:** for each hole, two units one level down, each following every rule exactly as written, that still build things that don't fit together. Each pair ends with a tightening and says whether the fix is a **wording** change (the rule already means it but doesn't say it) or a **new rule** (it needs a decision). A ⚠ marks a fix that touches the Data Schema. AGENTS.md says to stop and ask before making those.

## Verdict

**Not ready for stories 17 and 18.** The evaluation model, engine and determinism rules hold up. But the spine leaves seven seams without an owner, and two of them contradict rules that are already enforced:

1. Library authoring against the API's types is blocked by the current fence (H1).
2. Main needs three facts that live in `blueprint`, and the entry fence stops main from reaching `blueprint` (H2).

Five more seams have no owner yet: nesting (H3), the handle table (H4), how a lane's output reaches its stage (H5), VM lifecycle (H6), and budget drift against cached failures (H7). All seven are below the spine's altitude. Each one is a decision that stories 17 and 18 will otherwise make twice, differently.

| # | Hole | Units that clash | Fix |
| --- | --- | --- | --- |
| H1 | Who may import the API types and `defineBlueprint` | 17 (`blueprint`) × 18 (`library`) × entry fence | New rule |
| H2 | Where the declaration schema, `QueryName` list and API version live | 17 host × main's register | New rule |
| H3 | Nesting: no `uses` field; MVS vs one pin; where the nested factory compiles | library build × worker pipeline × register | New rule ⚠ |
| H4 | Owner of the handle table; the form of returned outputs | 17 host × `case` / `model` operations | New rule |
| H5 | How a lane's outputs reach its stage; the lane's cache key | `model`/`plates` stage × `pipeline` | New rule |
| H6 | Owner of VM creation; case-worker VMs; cached infrastructure failures | 17 host × `pipeline` pause × case worker | New rule |
| H7 | ±1 step drift (BP-4) against cached failures (BP-5) and fingerprints | 17 host × `pipeline` fingerprints | New rule |
| H8 | Fingerprint of a failed lane | `pipeline` fingerprint writer × BP-5 | New rule |
| H9 | Range and `convert` evaluated on main vs "main derives nothing"; input checked twice | main's register × 17 host | Wording + new rule |
| H10 | Shipped artefact format and lane signature | 18 library build × 17 factory | New rule |
| H11 | One blueprint's state shared across its own lanes | a tray blueprint's `plates` lane × its `case` lane | Wording |
| H12 | What the guest sees for each input kind | `model` parts lane × `case` lane | New rule (API) |
| H13 | Result encoding: "one JSON string" for every result? | 17 wrapper × stage operation author | Wording |
| H14 | How code, declarations and queries reach the case worker | `pipeline` × `case` input slice | Wording |

---

## H1. Who may import the blueprint API's types, and where `defineBlueprint` lives

**Unit A, story 17 (`blueprint`).** "`blueprint` owns the API" (AD-18), and the Consistency Conventions say every operation's signature is "defined once in `blueprint`". So 17 exports the API types and `defineBlueprint` from `@keeb-cad/blueprint`.

**Unit B, story 18 (`library`).** BP-7 says blueprints are "written in TS in `library`, type-checked against the blueprint API's types". So `library/src/blueprints/choc-key.ts` does `import { defineBlueprint, type PartsLaneApi } from '@keeb-cad/blueprint'`.

**Clash.**
- `.dependency-cruiser.mts` has `exports-and-library-import-only-model`, and `tsPreCompilationDeps: true` makes type-only imports count. 18's import fails CI.
- Say 18 instead adds `library → blueprint` to the graph. AD-10 says `editor` reads blueprint data from `library`, so main's module graph now reaches `blueprint`, and AD-25's entry fence fails.
- The way out that passes every check is for 18 to declare a local copy of the API types inside `library`. That gives two definitions of one API, which is what AD-10 is meant to prevent ("blueprint operations defined twice").

**Tightening (new rule).**
- Blueprint **sources** are build-time input. They are not part of `library`'s runtime surface. Put them in their own source root (for example `library/blueprints/`) that no package's `exports` include. That root may import `blueprint`'s **authoring subpath** (`@keeb-cad/blueprint/authoring`: the API types and an identity `defineBlueprint`) and nothing else.
- The library build emits declaration JSON and self-contained JS (H10). `library`'s runtime exports serve only those emitted artefacts.
- dependency-cruiser gets one rule per side:
  - The authoring root may reach only `blueprint/authoring`.
  - No runtime entry reaches the authoring root.
- Each rule has a violation fixture in `tooling/ad10/`, and `tooling/verify-checks.sh` runs.
- AD-10's graph needs a dashed build-time edge `library(blueprints) ⇢ blueprint/authoring`. AD-10 is the parent's rule, so the parent has to change.

## H2. Main needs three facts that `blueprint` owns; `blueprint` needs one type that `model` owns

**Unit A, main's register (an `editor`/`model` main-side story).**
- It checks `apiVersion` against the app's API version (`blueprint-api-too-new` comes from main, per the Consistency Conventions).
- It checks each lane's `queries` against "the queries defined in `blueprint`" (Data Schema: `QueryName`, a closed list).
- It parses declarations with the `BlueprintDeclaration` schema.

The fence says main never reaches `blueprint`. So the register reads the API version and the query names from constants in `model`.

**Unit B, story 17 (the host).** The worker check "a run's returned roles must match its lane's outputs" needs `LaneDeclaration`.
- `blueprint` imports only `geometry`, so it can't import `model`'s schema.
- AD-10 lets only `model` and command-defining packages import valibot, so `blueprint` can't hold the schema either.
- 17 therefore defines its own structural `LaneOutputs` type, plus its own `API_VERSION` and `QUERIES`.

**Clash.** Both units now hold the API version, the query list and the shape of a lane's outputs. When a story adds a query in `blueprint` and the copy in `model` lags behind, main rejects a declaration the worker would run. The other way round, main accepts a declaration whose query the host doesn't know, and the lane fails at run time.

**Tightening (new rule).** Give each fact one home, on a subpath both threads can reach. Two consistent options:
- **(a)** `model` owns the schema, the API version constant and the `QueryName` list. `blueprint` takes no declaration type at all: its host returns the role-tagged outputs, and `model`'s lane runner checks them against the declaration and raises `lane-failed`.
- **(b)** `blueprint` exposes a pure `blueprint/declaration` subpath (no runtime, no host). The AD-25 fence is carved out for exactly that subpath, and valibot is allowed in it.

**Recommendation: (a).** It matches the Data Schema's "shared kinds defined once in model" and AD-24's valibot rule, and it moves BP-1's role check from the host to `model`. Either way, the spine has to say where "queries are defined in `blueprint`" actually lives. As written, AD-11's sentence and the AD-25 fence can't both be true for main.

## H3. Nesting: nothing declares what a blueprint uses

**Unit A, the library build (story 18 onward).** It ships `BlueprintDeclaration` exactly as typed. The type has no field for nested uses. A blueprint calls `use('lib:blueprint/choc-key', …)` in code, and the build has nothing to record that in.

**Unit B, `pipeline`/model worker.** It needs the nested set **before** any run, for four reasons:
- BP-2 creates the VMs "a newly applied revision needs" in the pause.
- AD-11's cache key includes "blueprint versions used, nested ones included".
- AD-5's MVS picks "the highest minimum".
- AD-3's read-loop check on main runs "without running code".

None of these is possible without running the code first.

**Further splits, each following the rules as written:**
- **Which version runs.** BP-6 says "the one minimal version selection picks". AD-5 says "the design's one pin per item still holds". Implementer X computes MVS at run time from the declared minimums. Implementer Y runs the `library-versions` pin. A hand-edited file with a pin below a declared minimum runs different code in each.
- **Where the nested factory compiles.** BP-3 compiles each version "once into a factory". BP-6 runs the nested version "inside the caller's VM". With one VM per version (BP-2), choc-key's factory has to exist in its own VM *and* in every caller's VM. Implementer X compiles it into each caller's VM. Implementer Y forwards `use()` to choc-key's own VM, which breaks AD-18's "same sandbox" but follows BP-2 to the letter.
- **Nested reads.** The nested version's declaration has its own `pulls` and `queries`. Implementer X merges them into the caller's input slice and read graph. Implementer Y requires the caller to redeclare them, and fails the lane as an undeclared read otherwise. Cache keys and the main-side loop check give different answers for the same design.

**Tightening (new rule ⚠, Data Schema).**
- Add `uses: { id: BlueprintId; minVersion: Version }[]` to `BlueprintDeclaration`.
- `library-versions` holds the MVS result. The register raises it inside the upgrade command, and on load it checks that every pin is at least every declared minimum. The worker never computes MVS; it runs pins.
- A nested factory is compiled into every VM whose blueprint lists it in `uses`. "Compiled once" then means once per VM.
- A lane's input slice and read edges are the union over its `uses` closure, computed from declarations.
- `use()` of an id not in `uses` throws.

The new field is a schema change: **ask Sergii before writing it.**

## H4. Who owns the handle table, and what a lane returns

**Unit A, story 17 (the host).** BP-1: "integer handles into a host-side table that lives for one lane run". 17 builds `HandleTable<unknown>` in the host-call wrapper and passes stored values to each operation.

**Unit B, `case` (the first tray story).** AD-10 says each stage implements its lane's operations. replicad solids are WASM objects that must be `.delete()`d. `case` keeps its own table of solids, so it controls their lifetime, and returns its own integers to the wrapper.

**Clash.**
- Two tables, both starting at 1. A 2D handle from a `geometry` operation and a 3D handle from `case` collide in one run.
- Nobody owns disposal when the run ends.
- BP-1 and BP-5 together leave a run's **outputs** without a form. The table dies with the run, but the outputs must survive to be cached, pulled, hashed for fingerprints and posted. Implementer X resolves handles into host values before the table dies. Implementer Y returns JSON.
- BP-3's "a returned value JSON can't carry exactly is a typed failure" then treats every solid as a failure.

**Tightening (new rule).**
- One table per run, owned by the wrapper in `blueprint`.
- Each entry is tagged with an `OutputKind`-like handle kind, so passing a solid where a shape belongs is a typed throw.
- Operations take and return host values, never integers.
- Each kind registers one dispose hook, which runs when the run ends.
- When a lane returns, the wrapper resolves each handle in its outputs to a host value of that output's `kind`. Only non-handle fields go through the JSON-exactness check.
- Say which host values are plain enough to cache and hash:
  - Shapes: `geometry`'s plain value.
  - Solids: kept in the case worker under AD-18's per-solid cache, never crossing.

## H5. A lane's outputs reach their stage in two different ways

**Unit A, the `plates` stage package.**
- AD-10: stages "implement their own lane's operations" and import `blueprint`.
- AD-10: stage signature `(resolved) → { output, violations }`, plain functions.

So `plates` runs each build entry's plates lane itself, from inside its function, with a host passed in as an argument.

**Unit B, `pipeline`.** BP-5 caches each run "under the lane's cache key", and AD-11's fingerprints are per entry. So `pipeline` wraps **each lane** in its own computed. It hands `plates` the lane outputs through `resolved`, and `plates` composes them.

**Clash.**
- In A the lane cache sits inside the stage's cache.
- AD-11's cache key is written per **stage** ("stage id + stage version + … input slice"). In A the stage's slice is the lane's inputs. In B it is the lane's output values, stale ones included after a failure.
- After a failure, A reruns the stage on the same key and gets the cached failure. B reruns it on the last good output and gets a different key.
- AD-11 never defines a "lane cache key". BP-5 cites one that only exists by implication ("its cache key covers exactly them").

**Tightening (new rule).**
- Every lane run is its own cached unit, owned by `pipeline` in the model worker and by the case worker's runner in the case worker. Its key is `(stage id, blueprint id@version + uses closure, hash of the declared input slice)`.
- A stage function receives its lanes' **outputs** (last good, with a `failed` flag) as part of its input. It never runs a lane itself.
- The stage's own cache key covers the hashes of those outputs.
- BP-5 then reads unambiguously. AD-11's cache-key bullet needs a lane line, and that is a parent edit.

## H6. VM creation has two owners, case-worker VMs have none, and missing VMs become cached failures

**Unit A, story 17 (the host).** Only `blueprint` imports quickjs-wasi, so 17 creates VMs. The simplest version that follows the rules: `host.run()` awaits `ensureVm(version)`. That makes the host async, and BP-1's synchronous stages can't call it.

**Unit B, `pipeline`.** BP-2: "the model worker creates the VMs … in its pause". `pipeline` owns the patch loop, so it calls `host.prepare(versions)`. What does it pass as the versions? It needs the H3 closure, plus the pins from the resolved `parts` and `build`. Those are `model` computeds, read before stages run.

**Clash.**
- Two creation paths with different async contracts. BP-2 binds only `blueprint` and `pipeline`, so the case worker, which also needs VMs for case lanes, has no rule at all.
- BP-2: after a trap or a pending job, the VM is "replaced in the next pause". Every later lane of that version in the same revision now has no VM. Its host reports a failure, and BP-5 caches it under the lane's key. That lane won't rerun until its inputs change, even though it never ran. A trap in a nested blueprint (H3) takes the caller's VM down with it.

**Tightening (new rule).**
- `blueprint` exposes one async `prepare(versionClosure)` and one synchronous `run`.
- In each worker exactly one service calls `prepare`: `pipeline` in the model worker, the case runner in the case worker, at the start of each slice.
- `run` on a missing VM returns **unavailable**. That is a separate result from a failure: it is never cached and never fingerprinted, and it reruns after the next `prepare`.
- BP-5's list of cached failures is closed: throw, step budget, role mismatch, non-JSON-exact value, pending job. A trap fails only the run that trapped.

## H7. "May differ by one" (BP-4) contradicts cached failures (BP-5) and fingerprints (AD-11)

**Unit A, story 17.** It implements BP-4 to the letter. The interrupt-handler count can drift by one with call history, and since the VM persists across runs, a lane right at the budget passes or stops depending on what ran before it.

**Unit B, `pipeline`.** BP-5 caches the stop as a deterministic failure. Fingerprints record the slice and outputs.

**Clash.**
- After a worker restart, which resets history, the same slice succeeds. That is "same slice, different outputs", so the user gets **Accept output change** for something that is neither a fix nor an upgrade.
- Or the reverse: a cached failure that a fresh run would pass, kept until the inputs change.
- "Accepted limit, not a defect" holds for the sandbox. It doesn't hold once BP-5 and fingerprints treat the result as a deterministic function of the slice.

**Tightening (new rule).** Pick one:
- **(a)** Reset the runtime's interrupt countdown before every run, if quickjs-wasi allows it. That removes the history and makes the stop exact. Spike it in 17.
- **(b)** A budget stop is cached, but it is never compared in fingerprints: an entry whose run stopped at the budget keeps its previous fingerprint pair.

**Recommendation: (a), with (b) as the fallback if the spike shows no reset hook.**

## H8. Which outputs a failed lane's fingerprint hashes

**Unit A, `pipeline`'s fingerprint writer.** AD-11 says to hash "its outputs". A failed lane's outputs are its last good outputs, now stale. So A writes `(new slice, hash(stale outputs))`.

**Unit B, the same writer read through BP-5.** The failure is the cached result. So B writes `(new slice, hash(failure))`.

**Clash.**
- With A, fixing the bug produces "same slice, different outputs", and the user gets an Accept prompt for the recovery itself.
- With B, the file records failures as behaviour, and a fixed-in-place blueprint shows a difference against a failure.

**Tightening (new rule).**
- At a committed revision where any of an entry's runs failed or was unavailable, `pipeline` leaves that entry's fingerprint as it was.
- The fingerprint moves only on a revision where every run succeeded.

## H9. Range and `convert` evaluated on main; inputs checked twice

**Unit A, main's register.** D2 and D5 say main validates `range.min`/`range.max` and applies `convert`, using `model`'s evaluator. `model` is reachable from main, so this passes every check.

But a range names the blueprint's other inputs, and those are bound by **design-wide expressions over parameters** (AD-17). Evaluating them is the "expression evaluation" derivation that AD-10 puts in `model`'s computeds in the worker, and "main derives nothing". So A reimplements parameter resolution on main, outside the graph, and the fences don't catch it, because they check packages, not calls.

**Unit B, story 17 (the host).** "Inputs are typed inside code and checked at runtime at the boundary (decision 53)." 17 checks evaluated values against the declaration and fails the lane.

**Clash.**
- A bad value is reported twice, as `blueprint-input-invalid` from main and as `lane-failed` from the worker.
- When main's evaluation and the worker's disagree (different parameter state at different seqs), only one of them reports.

**Tightening.**
- **New rule:** main checks only what needs no evaluation: kind, `option` membership, unit, `perSlot`, unknown names, and literal-only ranges. Ranges and `convert` over bound inputs are evaluated in the worker, which reports `blueprint-input-invalid`, so there is one owner and one kind.
- **Wording:** "checked at the boundary" means the host asserts the types and never reports the user-facing violation.
- This narrows D2 and D5, both adopted, so **ask Sergii**.

## H10. The shipped artefact and the lane signature are undefined

**Unit A, story 18's library build.**
- It compiles `choc-key.ts` with the repo's `tsc` to an ES module: `export const declaration = defineBlueprint({...}); export function parts(inputs, api) {...}`.
- It imports a shared helper module from `library/blueprints/_util.ts`.

**Unit B, story 17's factory.**
- It evaluates a **script** that has to evaluate to `{ lanes }`. That is BP-3's "factory kept apart from the boundary code".
- It provides no module loader and no `defineBlueprint` global, so A's artefact throws on its import, or on the call to `defineBlueprint`.
- The spike used `blueprint(inputs, api)`, which A follows and B doesn't.

**Tightening (new rule).**
- One artefact per version: self-contained (bundled, with no `import`), the declaration stripped out, and evaluating to an object keyed by `LaneStage`.
- Each lane has the signature `(inputs, pulls, queries, api) → outputs`.
- The library build bundles helpers. A round-trip test checks that the artefact's lane keys equal the declaration's lane keys.

## H11. One blueprint's state across its own lanes

**Unit A, a tray blueprint's `plates` lane.** It computes the switch-plate shape plus internal measurements (wall offsets) and returns `switch-plate`.

**Unit B, the same blueprint's `case` lane.** BP-3 and BP-6 give it a fresh instance, so it can't see A's internals. It has two ways forward:
- **Recompute them.** That duplicates host work, and the two copies can drift if one lane's code changes.
- **Pull `switch-plate`.** That gets every producer's `switch-plate` (pulls are by role, not by entry), alterations applied (AD-16). AD-18 also says "a producer never reads the outputs of a body it contributes to".

**Clash.** Two authoring styles for the same need, and the rules don't pick one.

**Tightening (wording).** State the rule outright: lanes share nothing except declared inputs, pulls and queries. A lane that needs another lane's value recomputes it from inputs. Shared logic is a helper bundled into both (H10).

## H12. What the guest sees for each input kind

**Unit A, `model`'s parts lane runner.**
- AD-17: "stages see numbers only", so it passes `quantity` as a number in mm.
- It passes `anchor` as the resolved world frame.
- It passes `part` as the `PartRef`.

**Unit B, `case`'s runner.**
- It passes `anchor` as the `Anchor` record, so the case lane resolves it through a host call.
- It passes `part` as the part's pulled outputs.
- It passes `asset` as bytes. BP-1 says assets are "resolved before the run and passed in as values", but not in what form.

**Clash.** The same blueprint behaves differently depending on which stage runs it.

**Tightening (new rule, in the API).** `blueprint`'s authoring subpath defines one **evaluated input** type per `DeclaredInput.kind`, and every runner produces exactly that:
- quantity: a number in the declared unit
- anchor: a frame in design coordinates
- part: a handle to the resolved part
- asset: a handle to the parsed asset, never raw bytes

## H13. "Results cross as one JSON string": every result, or only structured ones?

**Unit A, story 17's wrapper.** It follows BP-1 literally: every operation result goes out as `JSON.stringify(result)` and is parsed in the guest, handles and scalars included.

**Unit B, a stage author.** They follow the spike, where `rect` returned a raw number, and the Conventions' "its JSON result shape". They return a number, and A's wrapper wraps it.

**Clash.** No incompatibility in behaviour, but every scalar call pays a parse. The spike's per-call numbers (`rect` 1.73 µs) are for raw scalars, not this.

**Tightening (wording).** "Objects and arrays cross as one JSON string; a handle, number, boolean or string crosses as itself." The wrapper does the encoding; operations return host values.

## H14. How code, declarations and queries reach the case worker

**Unit A, `pipeline`.** AD-11: each background stage's input slice is defined in its own package. The case slice is the design's case-relevant values, and the blueprint JS is sent once per epoch on the port.

**Unit B, `case`.** It defines a slice that includes the JS sources and declarations. These are then hashed into the slice on every seq.

**Further split: queries.** AD-11 says queries are "computed once by the stage that owns the data". For a case lane that declares "the tallest part", A computes it in the model worker and puts it in the slice. B computes it in the case worker from parts data in the slice.

**Clash.** The two produce different slice hashes, and therefore different freshness tags and different case caches, for the same design.

**Tightening (wording).**
- A case slice carries `(id, version)` pins, not code. Code and declarations travel once per epoch through a dedicated protocol message, and the cache key covers them through the versions.
- Queries are computed in the model worker and carried in the slice as values.

---

## Angles

- 📐 **Cross-thread seams.** The spine is written from the sandbox outwards: VM, factory, lockdown. Every hole above sits in the seams *around* the sandbox: imports, ownership across threads, caching. Those are exactly the seams AD-10, AD-11 and AD-25 already police. The spine's Binds lines list packages, but no rule says *which service* in each package owns what. That is why H4, H5 and H6 have two plausible owners.
- 📐 **The fence config lags the spine.** `.dependency-cruiser.mts` still says "model imports only reactive and geometry", while AD-10 now says `model → blueprint`. Story 17 has to update it (its ticket says so). H1's rule should land in the same change, or `library`'s first blueprint will fail CI the day 18 starts.
- ☝️ **"Decided in the declaration schema session" isn't the same as "consistent with the fences".** D1 to D6 were approved as a shape (memlog). D2's "main validates inputs … without running blueprint code" and D5's "applied by the register on main" assume that evaluating expressions over bound inputs isn't a derivation. Under AD-10's own list ("shared derivations: expression evaluation"), it is. That is worth checking before story 18 builds on it.
- ☝️ **The cost of H3 compounds.** Adding `uses` later means a new `BlueprintDeclaration` version for every shipped library blueprint, because versions are immutable (AD-5). Adding it before 18 ships `choc-key` v1 costs one field.
