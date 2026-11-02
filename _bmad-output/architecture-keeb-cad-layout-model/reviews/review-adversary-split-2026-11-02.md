# Adversary review: package split (2026-11-02)

- **Target:** `architecture-keeb-cad-layout-model.md`, uncommitted package-split update (new `expr`, `messaging`, `schema`, `commands`, `design-file`; `drc` a checker; `editor` declares every entry; domain operations in `model` over `Mutable<Design>`; worker `reactive` ban dropped for the `model/worker` entry fence; lane runner in `blueprint/worker`; codecs in `protocol`; KDL and migrations in `design-file`).
- **Decisions read:** `.memlog.md`, the last 15 entries tagged `package-split`, plus the gate entries they supersede (H4, H7, N4).
- **Lens:** adversary. For each hole, two units one level down (stories or packages) that each obey every AD to the letter and still build incompatibly, or one unit that cannot be built legally at all.
- **Fix tags:** **wording** = the spine already implies one answer; a sentence makes it explicit. **decision** = a new choice Sergii has to make. Following "no design autofixes", nothing here is applied.

## Verdict

The split moves the domain out of `model` cleanly. It leaves three thread-crossing concerns with no legal home: computing the revision and hashes, applying patches on the worker, and minting seqs and sending patches on main. Each blocks epic 23's tracer. Six high holes come from import edges and subpaths the graph names only at package level. Fix them before 23.1 rewrites `.dependency-cruiser.mts`, not after, or the cruiser rules will encode the holes.

---

## Critical

### C1. Nothing may compute the revision outside `storage`, yet the worker and `commands` both need it (decision)
- **Unit A:** `pipeline` (model worker) tags each routing and fingerprints file with "the design revision it belongs to" (AD-1, AD-11 Derived files, Data Schema `RoutingFile.revision`).
- **Unit B:** `design-file` (main only, imported only by `storage`, AD-8, AD-10) holds the canonical writer. The revision is by definition "the content hash of the canonical serialisation of the authored sections" (Glossary).
- **Clash:** `pipeline` can't import `design-file`, so it cannot compute the revision it must tag with. On main, `commands`' `emptyDerivedFiles(revision)` (AD-1) and `newDesign`'s caller need a revision too, and `commands` can't reach `design-file` either. Only `storage` can compute one. So a `pipeline` story either writes a second canonical serialiser (two revisions for one design) or asks main for the revision on every post, which no message kind exists for.
- **Related, same root:** no package is named for the hash function. `Hash` and `Revision` say "the hashing code parses its result with this schema". That code computes the input-slice hash (`pipeline`), the output hash (fingerprints), the routing hash, the BP-5 argument hash in the run id `<part id>@<hash>` (both `model`'s parts concept and `blueprint/worker`'s lane cache), the design-mirror hash (main and worker), and `AssetHash`. `schema` may hold no function. The five-kernel list in AD-10 is closed, and AD-25 says "23 packages; no merges". Two stories will each write a hash, and a run id from `model` won't match the lane cache key from `blueprint`.
- **Also:** filling a missing derived file is now ambiguous. AD-8 says load returns the bundle with "each missing one filled empty (AD-1)" but doesn't say who fills it: `design-file`, `storage`, or `editor` through `commands`' `emptyDerivedFiles`. The old text gave this to `migrateBundle`.
- **Fix (decision):** pick one home for canonical serialisation plus hashing that both threads may import. Option (a): a sixth kernel (e.g. `hash`, or `canonical`: canonical value bytes plus a content hash), imported by `design-file`, `commands`, `pipeline`, `model` and `blueprint`. Option (b): main computes the revision per committed command and sends it with the patches (this also answers the design-hash Open Question, if the mirror hash *is* the revision). Then the worker never computes one, and `pipeline` tags with the value it was sent. Either way, name the one owner that fills missing derived files.

### C2. The model worker's mirror can't apply patches or freeze without breaking a fence (decision; the Open Question is a build blocker, not a deferral)
- **Unit A:** `commands` is main only and "the only import of `immer`". It exports `applyDesignPatches` (AD-2 Writing, AD-10). Only `editor` imports `commands` (AD-10).
- **Unit B:** the model worker's mirror "applies patches only through `applyDesignPatches`" and freezes the whole value at start, restart and load (AD-11 The design mirror). It also needs Immer's `freeze(value, true)`.
- **Clash:** whoever owns the mirror (see below) must import `commands` (forbidden: only `editor`, and `commands` is main only) or `immer` (forbidden: only `commands`). AD-2 still says "Each thread loads it separately (same code and configuration, its own instance)". That sentence describes a file both threads load, which contradicts "main only". The Open Question's "revisit at 23.1's dependency-cruiser rewrite" is too late: 23.1 has to encode an answer.
- **Second hole, same unit:** no package is named as the mirror's owner. `pipeline` receives the messages (it imports `messaging` and `protocol`). `model/worker`'s per-section selector computeds read the mirror's `shallowRef` (AD-10), but `model` can't import `messaging` or `protocol`. A `pipeline` story and a `model/worker` story will each define the mirror ref, or each assume the other does.
- **Fix (decision):** for example, `commands` gains a worker-safe subpath `commands/mirror`, exporting only `applyDesignPatches` and the deep freeze over the same Immer configuration. Only the model worker's entry, or `pipeline`, imports it, and the entry fence keeps `commands/main` out of every worker. Then state "only `commands` imports `immer`" per subpath. Also name the mirror's owner: say the ref token lives in `model/worker` and `pipeline` writes it through `commands/mirror`.

### C3. `commands` must mint seqs and send patches, but may import only `model` and `schema` (decision)
- **Unit A:** `commands` holds "patches, the seq check" (AD-2). Its undo "send[s] both [design and routing file] to the model worker" (AD-2 Undo and the derived files). It rejects a command whose snapshot seq "is not main's latest" (AD-2 Commands from snapshots). Its derived-files service accepts a post "only at main's latest seq" (AD-1).
- **Unit B:** `messaging` holds typed send and "one design-seq gate per receiver" (AD-11 The crossing). `editor` is the only main package that imports both `messaging` and `commands`.
- **Clash:** `commands` can't send anything (no `messaging` or `protocol` edge) and has no seq to check against. It can't own the seq counter, because the gate in `messaging` needs that counter. `messaging` can't own it either: on main the receiver gate is never advanced, because main receives no `design` or `patches` messages, so "every other kind passes if seq ≥ latest" lets every stale post through. Two stories will each mint a seq: one in `commands` for its check, one in `editor` or `messaging` for the wire.
- **Fix (decision):** name one seq and epoch owner on main and the direction of flow. For example, `commands` mints seq and exposes a typed outbound port token, "design changed: patches | whole value, routing file, seq, hash", which `editor` provides and forwards through `messaging`. Main's receive gate reads that same counter, with the main-side rule stated: drop below latest, no advance. Then fix AD-11's gate bullet to say which side advances.

---

## High

### H1. `Frozen<T>` and `Mutable<T>` have no legal home (decision)
- **Unit A:** `model`'s domain operations take `Mutable<Design>`, and its queries and derivations take `Frozen<…>`. Stages, `editor`, `protocol` and tests also take `Frozen<…>` (AD-2 Read-only types).
- **Unit B:** `Frozen<T>` is defined "over Immer's `Immutable<T>`", and `commands` is the only `immer` importer. `model` can't import `commands`, because `commands → model` would make a cycle. Stages can't import `commands` either.
- **Clash:** a `model` story defines its own `DeepReadonly` and `Mutable`, and a `commands` story defines `Writable = Draft<…>`. Nothing proves that a `Writable<Design>` draft passes as `Mutable<Design>`, or that a `Frozen` value from `commands` matches a stage's `Frozen`. `schema` is "the same list as the Data Schema section", and every type there is "inferred, never declared by hand", so a hand-written mapped type isn't allowed in `schema` as written.
- **Fix (decision):** for example, `Frozen<T>` and `Mutable<T>` hand-written in `schema` with no immer import, as a named exception to "every type is inferred" listed in Data Schema. `commands` then holds a type test that `Immutable<Design>` ≡ `Frozen<Design>` and that `Draft<Design>` is assignable to `Mutable<Design>`. Resolve the Open Question before 23.1, not at it.

### H2. `ref(kind)` and `Quantity<U>` are functions in a package that may export none (decision, small)
- **Unit A:** `schema`'s lint says "exports no function and holds no function outside a schema" (AD-10).
- **Unit B:** AD-24 defines `ref(kind)` as a shared kind: "that id schema piped with `v.metadata({ refKind })`". `editor` declares command input schemas that hold references, with `ref`, `Id`, `Length` and `Expression` "only from `schema`" (AD-10). `Quantity<'mm'>` and `Result<T, E>` are generic as well.
- **Clash:** if `schema` exports `ref`, its lint fails. If it doesn't, `editor` inlines `v.pipe(Id, v.metadata({ refKind: 'slot' }))` and becomes a second definer of a shared kind, which AD-24's walk then trusts. `Result<T, E>` can't be inferred from a schema without a factory, so it must be hand-declared, which breaks "never declared by hand".
- **Fix (decision):** either (a) `schema` exports one constant per kind (`refs.slot`, `refs.libraryPart`, …; `Length`, `Angle` as constants), and the spine's `ref(kind)` becomes notation; or (b) the lint allows exported schema factories, meaning functions whose return value is a Valibot schema, proven by the violation fixture. List `Result` (and `Frozen`/`Mutable`, H1) as the hand-declared generic types.

### H3. Subpaths of `model` and `commands` let main reach `blueprint`, and code both threads need has no subpath (wording + decision)
- **Unit A:** main's entry "never reaches `blueprint`" (AD-25 Entry fences). `editor` imports only `model/main`.
- **Unit B:** at package level, `model` imports `blueprint` and `reactive` (AD-10), and `commands → model` is drawn without a subpath.
- **Clash 1 (fence defeat):** a `commands` story imports `@keeb-cad/model` (root) or `model/worker` for the register's acyclicity check (AD-2: "the register runs `model`'s structural checks"). The graph allows it. Main then reaches `model/worker`, and through it `blueprint`. Less visibly, a `model/main` domain operation (the MVS result written into `library-versions`, upgrade `convert`, read-loop checks from declarations) calls a helper in `blueprint`, the concept that owns pulls, roles and API versions. Every edge is drawn, and the main fence fails only at CI.
- **Clash 2 (no home):** some code is needed on both threads. The reference walk (who-points-at on main; dangling checks for `unresolvable-reference` in the worker). The dependency-graph builder (cycle rejection on main; evaluation order in the worker). `reject()`. AD-25 gives `model` exactly two subpaths and says each entry imports only its own.
- **Fix:** (wording) draw subpath edges: `commands → model/main`; `model/main → schema, expr` only (no `blueprint`, `reactive` or `geometry`, unless the main fence allows `geometry`); `model/worker → model/main, schema, expr, geometry, blueprint, reactive`. (decision) Either let `model/worker` import `model/main`'s pure functions (never the reverse), or add a third subpath for shared domain code. Also name the home of MVS, upgrade `convert` and read-loop checks as `model/main`, never `blueprint`.

### H4. Worker entries have no home, and spawning them needs an import the graph forbids (decision)
- **Unit A:** main spawns all three workers (AD-11 Spawning). `editor` "never imports `pipeline`", and imports neither `case` nor `routing` (AD-10).
- **Unit B:** the model worker's entry merges `pipeline`, `model/worker`, `blueprint/worker` and `library/worker` partials. The case worker's entry merges `case`, `blueprint/worker` and `library/worker` (AD-25).
- **Clash:** no package is named for the entry files. If they live in `pipeline`, `case` and `routing`, then `editor`'s `import ModelWorker from '@keeb-cad/pipeline/worker?worker'` (or a `new URL` to a package file, which Vite resolves through the dependency) is an `editor → pipeline` edge, which is forbidden. If they live in `app/`, then `app/` imports `pipeline`, which is also forbidden, because `editor` *is* `app/`. A third reading, an entry inside `pipeline` that imports `library/worker`, conflicts with "`library/worker`, which only the model and case worker entries import", because `pipeline` is not an entry.
- **Fix (decision):** say where the four entry files live (e.g. `app/src/entries/{main,model-worker,case-worker,routing-worker}.ts`) and that AD-10's `editor` edges apply to the main entry's graph, while each worker entry's graph is fenced on its own by AD-25. Or put the entries in their packages and let `editor` reference them by `?worker` URL only, with a dependency-cruiser exception named in AD-10. Today AD-10 forbids both.

### H5. `LayoutOutput.part` is a row number, but only `protocol` knows the row order (decision)
- **Unit A:** `model/worker`'s slot-to-part-run computed and its placement produce layout rows. Per Data Schema, `LayoutOutput.part: number` is "its row in the PartsOutput posted with it".
- **Unit B:** `protocol` holds `compareId` and the codecs, and the ids are "pre-sorted by the worker" with `compareId` (AD-11 Stage outputs). `model` can't import `protocol`.
- **Clash:** `model` can't compute a row number into a sorted `PartsOutput` without `compareId`. If it sorts with `<`, that matches today, but `compareId` stops being the one helper the gate fix H7 required. If it doesn't sort, `part` is filled before the codec reorders `PartsOutput` and points at the wrong run. Underneath that, the Data Schema types are the *wire* rows, and nothing types what a derivation returns before the codec. A `model` story and a `protocol` story will each pick a shape.
- **Fix (decision):** state that derivations return id-keyed values (`LayoutOutput.part` holds a run id), and that `protocol`'s codec sorts both outputs and resolves run ids to row numbers when it packs them. Data Schema then types both forms, or marks `part` "row on the wire, run id in the worker". Alternatively, move `compareId` to a home `model` can import (with the C1 kernel).

### H6. The `resolved` input of every stage has no type home, so a stage can't be written without importing `model` (wording, with Data Schema entries to follow)
- **Unit A:** stages take "their types from `schema`, never from `model`" (AD-10). Their signature is `(resolved) → { output, violations[] }`, `drc(resolved, placement, routes)` and `routing(resolved, …)` (AD-10 Stage signatures).
- **Unit B:** the "resolved design" is "`model`'s computeds" (Glossary): evaluated expressions, per-side placements, parts, shapes, netlist, connections. Data Schema types only posted outputs and, for background stages, input slices. Live stages (`plates`, `pcb`, `firmware`, `drc`) have no input type at all.
- **Clash:** a `plates` story types `resolved` from `model` (forbidden) or adds the type to `schema` (forbidden until the spine defines it: "stop and ask"). Two stages will define two shapes of "resolved placement".
- **Fix (wording):** say every stage, live or background, takes one plain input type in `schema`, typed here before its first story, and `pipeline` maps `model`'s computeds onto it. Add Data Schema placeholder lines for `PlatesInput`, `PcbInput`, `FirmwareInput` and `DrcInput` beside the input slices.

### H7. Two owners of main's latest derived files, and autosave has no legal home (wording)
- **Unit A:** the derived-files service is in `commands` (AD-1; Seed; `commandsMainServices`). `storage` "never imports `commands`" (AD-8). Autosave "writes the design plus what the derived-files service holds" (AD-13).
- **Unit B:** the Paradigm diagram still draws `PL → |routing and fingerprints files| → ST`, and `storage → protocol` is an edge in AD-10 with no stated use.
- **Clash:** a `storage` story reads the diagram and the edge, then subscribes to `pipeline`'s derived-file posts and holds the latest itself, a second holder beside the service. Separately, autosave can't live in `storage` (it can't read the design service or the derived-files service in `commands`), and no package is named for it. The move of the service from `model/main` (gate H4) to `commands` has no memlog decision; the package-split `commands` entry doesn't list it.
- **Fix (wording):** redraw the arrow to the derived-files service and record the move in the memlog. Drop `storage → protocol` or state what it carries. Say autosave is an `editor` service that reads `commands`' two services and calls `storage.save(bundle)`, and that `editor` routes `pipeline`'s derived-file posts into the derived-files service.

---

## Medium

### M1. The Valibot import list misses packages that must parse or walk schemas (wording)
- AD-10 lists `schema`, `editor` and `commands`. The packages below also need Valibot:
  - `model`: AD-24's walk reads `v.getMetadata`.
  - `design-file`: it reads `format-version` "with its own schema" before parsing anything else (AD-8).
  - `blueprint`: inputs are "checked at runtime at the boundary" (AD-18).
  - The library build: it "validates the declaration with the schema".
- Two stories will each work around the list: one passes a parse function in, the other imports valibot anyway.
- Also, the derived files from load go to the service unvalidated. `replaceDesign` parses only the design.
- **Fix (wording):** extend the list. Say which unit parses the routing and fingerprints files on load (most naturally `design-file`, after `migrateBundle`).

### M2. The register's checks need `expr` and library declarations it can't import (wording)
- AD-10 says the register "may evaluate input ranges and upgrade conversions with `expr`'s evaluator" and checks read loops from "the pinned declarations".
- `commands` imports only `model` and `schema`: no `expr` and no `library`.
- **Fix (wording):** route both through `model/main`. The register calls `model/main`'s checks, which import `expr` and receive declarations through a token typed in `schema` and provided in `main.ts` from `library`'s data. Or add `expr` to `commands`' edges.

### M3. Fix names and inputs cross from the worker to `editor`'s declarations with no shared type (decision)
- **Unit A:** `model`, `blueprint`, `drc` and `pipeline` emit violations whose `fixes` name "a registered entry's name plus its inputs" (Glossary `fix`, AD-2 Breaks).
- **Unit B:** only `editor` declares entries and their input schemas. No worker package can import them.
- **Clash:** the worker writes `{ name: 'setAnchor', inputs: { … } }` as free strings and objects. A rename in `editor` compiles cleanly, and the fix fails at run time as a parse rejection.
- **Fix (decision):** type the fix vocabulary in `schema` (a union of fix names with their input schemas), have `editor` declare those entries against it, and add a test that every fix name is registered. Or accept run-time-only checking and say so.

### M4. Who evaluates design-parameter expressions in the design's own case lane, in a worker without `model`? (wording, or a small decision)
- AD-17's exception covers only a *data blueprint's own inputs*. The design's own work (its `case` lane) is data using design-wide parameters (AD-18).
- The case worker "never loads `model`" (AD-10, AD-11).
- **Clash:** a `pipeline` story pre-evaluates the design's case lane into numbers in the slice ("stages see numbers only"), while a `blueprint` story's interpreter evaluates it in the case worker against a parameter scope sent in the slice. The slice shape and the cache key differ between the two.
- **Fix:** state that `model` evaluates every design-parameter expression, the design's own lanes included, and that the interpreter only ever evaluates a library data blueprint's own inputs.

### M5. Two paths to a state change in commands, and two owners of cycle rejection (wording)
- AD-2 says each entry's apply "forwards to one `model` domain operation". The memlog defines domain operations as changes to "a domain fact" (rename rewrite, cascades, cycle rejection).
- **Clash 1:** for `setGap`, one `editor` story writes `draft.meta.gap` directly; another adds `model.setGap` because the rule says "forwards". Both comply.
- **Clash 2:** the glossary and the memlog put cycle rejection in a domain operation, while AD-2 runs it as the register's post-check. A `setAnchor` operation that rejects a cycle itself can return different ids from the register's check.
- **Fix (wording):** either every apply forwards (even trivial sets), or plain field sets may write the draft directly. Make cycle rejection the register's post-check only.

### M6. `Violation`, `Fix` and `Rejection` are shared types missing from the Data Schema block (wording)
- "This section and the `schema` package are the same list", and AGENTS.md says to stop and ask when it doesn't define a type.
- `Violation` (Conventions), `Fix` and `Rejection` (`reject(kind, ids, message)`) appear only in prose.
- **Fix (wording):** add them to the TS block.

### M7. The run-id hash and the lane-cache key are one value with two implementers (wording; goes away under C1)
- The `PartsOutput` id `<part id>@<hash of its resolved inputs>` is "the same argument hash as BP-5's lane cache key". It is computed in `model`'s parts concept and in `blueprint/worker`.
- **Fix (wording):** say `model` calls `blueprint`'s argument hash (`model → blueprint` is drawn), or give it to C1's kernel.

---

## Low

### L1. "Any package may import `reactive`" contradicts "stages import no `reactive`" (wording)
- Both sentences are in AD-10, and the memlog removed the stage edges.
- **Fix (wording):** "any package drawn with a `reactive` edge".

### L2. Two homes for the KiCad writer (wording)
- The Seed puts it in `pcb` ("KiCad writer"). The Deferred table says "KiCad writer: hidden inside `exports`".
- **Fix (wording):** pick one.

### L3. `exports` imports only `schema` but may need `flatten` (wording)
- If the gerber or DXF writer needs polygons, AD-16 says "a stage that needs polygons flattens at its own boundary" with `geometry`'s `flatten`. `exports` has no `geometry` edge.
- **Fix (wording):** state that the writers emit exact arcs, or add `exports → geometry`.

### L4. Channel message types in `case` and `routing` sit outside `schema`, and so does their validation (wording)
- This is fine as TypeScript types. It needs a line saying whether they are parsed on receipt (Valibot isn't imported there) or trusted, since only `messaging`'s plain-value check guards them.

### L5. The Open Questions schedule two blockers too late (wording)
- The rows for `applyDesignPatches` (C2) and `Frozen`/`Mutable` (H1) say "revisit at 23.1's dependency-cruiser rewrite". 23.1 can't write the rules without the answers.
- **Fix (wording):** "Before 23.1".

---

## Pairs that held

These were attacked and did not break:
- `drc` as a checker imported by both `routing` and `pipeline`.
- Stage-to-stage independence.
- The `ui`/`editor` split of hotkey rules.
- `design-file` imported only by `storage`, with `editor` handing the bundle on.
- The case worker without `model`, for code blueprints.
- `blueprint → expr` for the interpreter.
- `protocol`'s single union with channel kinds beside their stages.
- The fence of one partial per thread.
