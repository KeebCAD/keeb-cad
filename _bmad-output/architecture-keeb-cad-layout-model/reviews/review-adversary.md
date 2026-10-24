---
review: adversary seam hunt
target: architecture-keeb-cad-layout-model.md (draft, 2026-10-24)
reviewer: adversary lens
date: 2026-10-24
---

# Adversary review: keeb-cad layout model spine

**Verdict:** The geometric core (AD-3/4/7) and the package graph (AD-10) are tight, but the spine leaves several shared entities without an owner. Electrical matrix and nets, mirrored-side derivation, key size, switch-type/switch-cell definitions and the stage input contract are among them. Two independent sessions could each obey every AD and still ship pcb and firmware packages that disagree about which key is wired where. Close the 2 critical and 5 high holes below before the first story is written.

Method: for each seam, two units one level down (packages or features built by independent AI sessions) are constructed. Each obeys every AD to the letter and still builds something incompatible with the other. Each pair ends with a proposed new or tightened AD.

---

## Critical

### C1. Electrical model (matrix, nets, MCU pins) has no owner
- **Unit A:** `pcb` derives a row/column matrix from tree order (sequence = column, index = row) and wires nets to MCU pins in footprint order.
- **Unit B:** `firmware` derives `zmk,matrix-transform`, `matrix_pins` and the QMK `layout[].matrix` from world position (sort by y, then x).
- Both obey AD-10 ("anything two stages share is derived in `model`") only if someone notices the shared thing. Nothing in the spine names the matrix, nets, pin assignment, diode direction or key order (keymap/physical-layout order) as a model entity. The glossary has no term for any of them. The paper test even uses `matrix` as a *group name*, which collides with the electrical meaning.
- **Result:** the flashed firmware scans a different matrix than the PCB is wired for. Each package passes its own golden tests, so nobody notices until hardware.
- **Fix (new AD-14 "Electrical assignment"):** `model` owns a single derived (or user-pinned) `electrical` view. It assigns every switch-bearing slot a `(row, col)`, a net name and a key order, and assigns each MCU pin a role. It is persisted in the design when overridden and otherwise derived by one model function. `pcb` and `firmware` consume only that view and never compute matrix or order themselves. Add glossary terms (`matrix position`, `net`, `key order`) and rename the paper-test group so it doesn't use the word `matrix`.

### C2. Mirrored-side derivation: who mirrors, what ids the copy gets, what "mirror" means
- **Unit A:** `model.resolve` expands `mirrored` into right-side world frames. It mirrors finished frames (negates x and rotation) and gives the copies ids `right/<left-id>`.
- **Unit B:** `pcb` gets only the left tree. It mirrors by flipping footprints to the back layer and mirroring tree offsets *before* resolving. Its overrides target the left node's id, and it treats `corner-bl` as staying `corner-bl`.
- Every point is unspecified in AD-6:
  - Which package performs the derivation.
  - The id scheme for derived nodes. Overrides "target a node id", but which one: the left source or the right copy?
  - Whether mirroring happens at tree level (offsets and pivots mirrored, then resolved) or frame level (world frames reflected). These diverge as soon as a free-group child anchors across sides.
  - How rotations, sequence turns, pivots and named attach points (`corner-bl` becomes `corner-br`?) transform.
  - What "the centre group's vertical axis" is. "Centre group" isn't in the glossary, the glossary only allows `left` and `right` sides, and "vertical" could mean the world axis or the centre group's rotated frame. The spine is also silent on how unibody boards (Heatwave) fit into the `side` concept.
  - Whether `swap part` is "geometric" for the purpose of `reversible` ("geometric overrides are invalid").
- The spine defers *validation against Heatwave*, not the semantics. That leaves the semantics open, which lets units diverge.
- **Fix (tighten AD-6):** Mirroring is performed only by `model.resolve`, at frame level, after the left side is fully resolved. Derived node ids are `<right-side-id>/<left-id>`. Overrides target derived ids. Pin down the attach-point mapping table and the reflection axis (world-vertical through the centre group's world origin, or an explicit `mirror-axis` node). Define `centre`, or remove it. List which override kinds are legal in each side mode.

---

## High

### H1. Stage input contract is undefined, and routing contradicts AD-10
- **Unit A:** the `outline` stage takes `Design` and calls `model.resolve` itself, as the glossary says ("stage = pure function from the design").
- **Unit B:** `pipeline` resolves once and passes a `ResolvedDesign` to each stage, as the paradigm diagram shows (`D --> R --> S1..S5`).
- The shape of `ResolvedDesign` isn't defined anywhere: frames keyed by id? Including derived mirror nodes? Units already applied? So each stage invents its own.
- Routing "takes the placed PCB", which is the *output of the pcb placement stage*. That makes it a stage consuming another stage's output, which AD-10 forbids ("stages never depend on each other").
- **Fix:** Add an AD that defines the stage signature: `(resolved: ResolvedDesign, settings) => { output, violations[], revision }`. Define `ResolvedDesign` in `model`: world frames by id, mirrored nodes expanded, units resolved to mm, the electrical view from C1, and part geometry. Then treat routing explicitly as a *second-order stage* fed by `pipeline` with pcb placement output, and make that the single permitted stage-to-stage edge. Alternatively, make placement a model derivation.

### H2. Live drag: two conflicting mutation paths
- **Unit A (editor drag):** keeps a transient drag preview in Pinia and dispatches one `moveSlot` on pointer-up. Live outputs during the drag are then computed from something that isn't the design, which breaks AD-1, or they don't update, which breaks AD-11.
- **Unit B (editor drag, another session):** dispatches `moveSlot` on every pointermove. That puts about 100 undo entries per drag, 100 revisions and 100 cancelled workers on the stack.
- Both are allowed. AD-2 doesn't say how commands coalesce, and the spine defers "Exact drag-handle UX".
- **Fix (tighten AD-2):** Add a transaction/gesture mechanism in `model`, for example `beginGesture`, then repeated `updateGesture(command)`, then `commitGesture` or `cancelGesture`. Each update produces a new revision, so live stages run. Undo records one entry per gesture. Background stages are debounced until commit or idle.

### H3. Block update base, switch types and switch cells have no single owner
- **Block merge base:** AD-9's three-way merge needs the *copied version* as its base. Unit A (library) ships only the latest block version, because "updates arrive with app updates". Unit B (model merge) expects to fetch base `v1` by id and version. After an app update the base is gone and the merge can't run.
  - **Fix:** the library keeps every published version immutable and addressable by `(block-id, version)`. Alternatively, the design embeds the base snapshot of each inserted block. Choose one.
- **Switch types and cells:** AD-5 says switch type defines the footprint and minimum pitch. Unit A puts the switch-type catalogue (min pitch) in `model`, because resolve needs it. Unit B puts it in `pcb`, because footprints live there. Two owners. A switch cell ("user-defined key template … per-key tracks") could live in the design, in `library` as a block, or in some per-user store. The storage interface only covers designs, so "per user" has nowhere to persist.
  - **Fix:** one AD makes `model` the owner of the part catalogue schema: switch type, min pitch, keep-out and footprint *reference*, with footprint geometry data bundled in `library`. It also states that switch cells are design-local definitions, referenced by id from slots and shareable only as blocks.

### H4. Key size, sequence direction and `u` per axis are undefined
- The paper test needs a **slot size** (Corney's 1.5u far thumb, Corax's 1.5u space). The spine never mentions it. Unit A (`outline`) reads a size from the switch cell. Unit B (`firmware`, QMK `w`/`h`, ZMK physical-layout width) assumes 1u. Unit C (`sequence` resolve) steps one pitch after a 1.5u key and doesn't advance by the extra width.
- `u` is "resolved by pitch", but there are `pitch-x` and `pitch-y`. A `gap` along a vertical sequence, or an offset in a rotated sequence, can pick either one.
- "Sequence direction" is used in AD-4 but isn't a glossary term or a declared property.
- The **pivot** coordinate frame isn't stated: anchor frame, the node's pre-rotation local frame, or a reference to a child ("about its bottom key" in Corax). One session's drag handles will rotate about a different point than another session's resolve.
- **Fix (tighten AD-4/AD-5):** add `size` (w, h in `u` or `mm`) to slots. Make `direction` (`x` or `y`) an explicit sequence property, and make the step = pitch of that axis + gap (size doesn't affect the step). Rule: a `u` value on the x axis uses `pitch-x` and on the y axis uses `pitch-y`, measured in the node's local frame. State that the pivot is expressed in the node's local frame after the offset and before the rotation.

### H5. Caching by "design-subtree hash" misses cross-tree dependencies, and "revision" is undefined
- **Unit A (pipeline):** keys the `outline` cache by the hash of the `left` subtree.
- **Unit B (model command):** a free child of `left` anchors to a node under `right`, or depends on global `pitch-x` or the side mode. Changing it changes `left`'s frames but not `left`'s subtree hash, so the stale outline is served as current. The AD-11 revision tag doesn't help, because the cache claims it is current.
- "Design revision" might be a counter, which marks undo-restored identical content as stale and recomputes the slow case, or a content hash, where identical content reuses its cache. Each pipeline/editor pair picks one.
- **Fix:** define `revision` as the content hash of the canonical design. Define cache keys as a hash of the node's *resolved inputs*: its subtree plus its transitive anchor closure plus the global settings it reads. Alternatively, cache only on `ResolvedDesign` per-id frames, which makes it correct by construction.

### H6. File format evolution, the storage package and multi-tab are unaddressed (operational envelope)
- There's no **format version** in the design or block KDL, and no migration owner. Unit A (model v2) adds `size` to slots. Unit B (canonical writer) rejects or drops unknown properties, so old autosaves are silently rewritten or fail to load. The byte-for-byte round-trip rule makes this worse, because any unknown node either breaks round-tripping or gets lost.
  - **Fix:** a `keeb-cad-format N` header in every file, and `model` owns ordered migrations that run on load. The round-trip rule applies only within the current format version.
- AD-13 and AD-8 bind a `storage` unit, but the Structural Seed has no `storage` package, and the deployment diagram has `editor` writing browser storage directly. Two sessions will build two persistence layers, for example IndexedDB and localStorage. `listVersions` has no definition: are versions autosave snapshots, explicit saves or per-command? The spine also doesn't cover quota or what happens when two tabs autosave the same design and overwrite each other.
  - **Fix:** add a `packages/storage` (depends on `model` only, imported by `editor`). Define a version as an explicit save plus the last N autosaves. Use IndexedDB. Handle a single writer per design with a BroadcastChannel lock or a last-write warning.
- **Operational dimensions** that are neither decided nor deferred: offline/PWA caching of the ~7 MB OCCT WASM, which matters because AD-13 promises "no network calls needed"; recording LGPL compliance for replicad-opencascadejs (stack-research asks for it explicitly); supported browsers and minimum memory for the WASM workers; error telemetry, explicitly none for now. Add them to Deferred with triggers, or decide them.

---

## Medium

### M1. Id minting and the "never reused" rule can't be enforced as written
- Two units mint ids, the editor (`key-3`) and model's `insertBlock`, so they can collide.
- "Never reused after deletion" needs a persisted high-water mark or tombstone set. Neither is in the file format, so after save and load a deleted id can be minted again. That corrupts the AD-9 merge, because a re-used id looks like a local edit of a block node.
- Block ids contain `/`, which contradicts "lowercase kebab-case". Nested blocks (`a/b/c`) are unspecified.
- **Fix:** only `model` commands mint ids. The design persists an `id-counter` or tombstone list. The id grammar is `segment ("/" segment)*`, where each segment is kebab-case.

### M2. The command log: is it persisted, and is merge state-based or intent-based?
- The memlog says commands "form the intention log used for merges". AD-9 says the merge is a three-way state merge keyed by id. AD-1 says the document is the only persisted state.
- Unit A (storage) persists the command log for undo across reloads. Unit B (merge) ignores it.
- **Fix:** state that the command log is session-only (undo/redo), that it isn't persisted, and that merge is purely state-based. Alternatively, persist it explicitly as part of the document.

### M3. Error shape outside stages
- Stages return `{output, violations}`, but `resolve` and commands (cycle rejection, invalid override in reversible mode) have no defined failure shape. One session throws and another returns `Result`.
- It's also unclear whether `pitch-below-min` is reported by every stage that "hits" it, which gives duplicates in the UI, or only once.
- **Fix:** commands return `{ ok, design } | { ok: false, errors[] }` and never throw for user errors. Model-level violations (pitch, overlap, unresolvable anchor) are computed once in `resolve` and carried in `ResolvedDesign`. Stages report only their own domain violations.

### M4. Determinism versus real output formats
- STEP headers carry a timestamp. KiCad files need UUIDs for footprints and tracks. Freerouting, a routing candidate, is not deterministic.
- One session uses `crypto.randomUUID()` and the default replicad STEP export, which obeys "no randomness" only by accident or not at all. Another derives the values.
- **Fix:** KiCad UUIDs are derived as a UUIDv5 of the node id and element. The STEP header timestamp is fixed or omitted. Routing determinism is a required property of whichever engine the spike picks, or routing is exempted with a seeded run.

### M5. Number canonicalisation
- "Byte for byte" with float-producing drags. Does `19.050000000001mm` round-trip? Does `1u` stay `1u`, or get normalised to `19mm`?
- **Fix:** commands snap to a fixed precision (for example 0.001mm and 0.001deg). The writer prints shortest-round-trip decimals at that precision and preserves the unit the user authored.

### M6. Block insertion anchoring
- The memlog's open question "how a block is parameterised and anchored when inserted" never reached the spine.
- AD-3 lets only free-group children and top-level groups set anchors, so a block inserted *into a sequence* can't be anchored. One session forbids that, and another wraps the block in an implicit free group.
- **Fix:** state that a block instance is always a group node that takes its position from its host (a sequence step or a free anchor). Blocks have no parameters in milestone 1.

### M7. Attach-point geometry needs part extents
- `bottom-edge` or `corner-bl` on a *group* needs a bounding box. Is that the union of slot sizes, footprints or keycaps?
- **Fix:** attach points on a group are computed from the union of its slots' `size` rectangles in the group frame. The full named list is fixed in `model`.

---

## Good-spine checklist

| Check | Result |
| --- | --- |
| Every AD Rule enforceable | Mostly. AD-1, AD-2 and AD-10 can be checked by lint or a dependency checker (recommend `dependency-cruiser` or ESLint boundaries in CI, and say so). The AD-8 round-trip is testable. The AD-8 "never reused ids" rule is unenforceable without M1. The AD-11 "never shows older revision" is enforceable only once revision is defined (H5). |
| Each Rule prevents its divergence | No: AD-6 (C2), AD-10 "shared things derived in model" without naming them (C1), AD-11 caching (H5), AD-2 coalescing (H2). |
| Deferred items don't let units diverge | "Exact drag-handle UX" hides a model-level gesture decision (H2). "Mirrored validation" hides open mirror *semantics* (C2). "Averaged anchors" is safe. "Routing engine" is safe only if determinism is a selection criterion (M4). "KiCad writer" is safe. |
| Every dimension decided, deferred or open | Missing entirely: electrical model (C1), format versioning and migration (H6), storage package and multi-tab (H6), offline/WASM caching, LGPL record, supported browsers, worker message protocol (who serialises what to the case/routing worker: KDL, or structured-clone `ResolvedDesign`?). Deployment (static host, CI) is deferred with a trigger, which is acceptable. There's no environment notion (dev/preview/prod) and no observability stance. Both are acceptable for a local-only milestone 1 if they're stated as deferred. |
| Glossary closure | Missing terms: centre group, direction, size, matrix position, net, key order, revision, switch type, gesture. "Group" is used in AD-3 and in node, but has no entry. |

📐 **Angle you may be ignoring:** the spine is entirely about *geometry*. A keyboard is also an *electrical* artifact, and the two stages where an independent-build mismatch costs real money (pcb and firmware) meet on the electrical seam, not the geometric one. The golden fixtures test key positions within 0.01mm but say nothing about matrix agreement. Add a cross-stage golden test: the firmware matrix equals the PCB nets for each fixture.

☝️ **Possible logic gap:** AD-10 "anything two stages share is derived in `model`" is treated as a rule that prevents divergence. It is a *meta-rule*: it only works if the author recognises a thing as shared, and an independent AI session won't recognise that before it has written its own version. Shared derivations should be *enumerated* (resolved frames, electrical view, part extents, violations), and anything else a stage computes should be private to that stage.
