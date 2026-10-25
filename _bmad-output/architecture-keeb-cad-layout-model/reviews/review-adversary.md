---
review: adversary
target: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
context: _bmad-output/prd-keeb-cad-m1/prd-keeb-cad-m1.md (variants deliberately replaced by AD-21: wired and wireless are two designs)
date: 2026-10-25
method: for each hole, two units one level down that each obey every AD to the letter and still build incompatible software
---

# Adversarial review: layout model and generation core spine

## Verdict

**Not build-ready. It needs one tightening pass, not a redesign.** The paradigm holds up: one source of truth, a single resolver, pure stages, and one writer for the routing section. The holes are mostly in the **identity of the electrical model**, meaning pads, connections, nets and per-side keys. The routing section is keyed on these, so any ambiguity there turns into routes being dropped or misapplied without warning. The second cluster is about **who owns the routing section as a value** (in memory, on disk, during gestures, in read-only tabs). The third is about **cache keys**: the cache-key rule covers the layout dependency graph but not the electrical or catalogue inputs. Four findings are critical. Each one has a short fix that fits inside an existing AD.

Severity scale: **critical** means the two units cannot be integrated, or the golden fixture can't pass, without changing the architecture. **High** means they integrate but produce wrong outputs or lose user work. **Medium** means divergent behaviour that tests would catch late. **Low** means cosmetic or easy to reconcile.

---

## A. Electrical identity: pads, connections, nets

### A1. A pad id `<slot-id>.<pin>` can't name a pad inside a key cell. **Critical**
- **Units:** `pcb` and `routing` (also `drc`, `model` netlist)
- **Builds:** The key cell holds a switch, a diode and an LED in **one slot** (glossary: "key cell"). A pad is `<slot-id>.<pin>`. Under this rule `k-3.1` is switch pin 1, diode pin 1 and LED pin 1 at the same time. The `model` netlist team picks a convention to make pads unique, say the pin numbers of the switch only, with diode pins as hidden internal nodes. The `pcb` team emits key-cell tracks from diode pad 2 to the row net under its own convention, say `k-3.D2`. `routing` asks the netlist for connections that end at `k-3.2` and routes to the switch pad, but the row has to be reached at the diode. Each team followed the glossary. The rows get routed to the wrong copper.
- **Tightening (AD-14 + Ids convention):** A pad is `<slot-id>.<component-ref>.<pin>`. Component refs (`sw`, `d1`, `led`) are declared in the key cell and in each catalogue part. Modules use a single ref, `u`. The netlist uses only this form.

### A2. Nobody decides how a net is split into connections, and net names come from positions. **Critical**
- **Units:** `model` (netlist) and `routing` / `pipeline` (routing-section writer)
- **Builds:** A connection is `(net, pad A, pad B)`, but the netlist (AD-14) is a set of nets with pads. Turning an N-pad net into pairs needs a topology choice: a chain in pad order, a star to the MCU, or an MST. `routing` builds an MST from world positions. When a key moves, the MST changes, so the connection keys change, so AD-12's rule that a valid route is one whose "connection still exists" drops every route on that net, even ones whose copper is untouched. A `drc` that checks completeness splits the net its own way and reports `unrouted` for pairs the router never produced. Net names are also open. If `model` names matrix nets by index (`col-3`), inserting a column renames every later column net, and every saved route on those nets becomes invalid.
- **Tightening (AD-14):** `model.resolve` emits the **connections**, not only nets, using one position-independent rule (for example a chain in the order given by the matrix rule, then the module pin last). Pads are ordered canonically within a pair (`A < B` lexically). Net ids are stable: matrix nets take the id of the chain node that produced them (`row:<chain-id>`, `col:<chain-id>`), never an index. Routing and DRC consume this list and never split nets themselves.

### A3. Nobody decides which connections the key-cell tracks already satisfy. **High**
- **Units:** `pcb` (key-cell tracks, live) and `routing` (connections "between key cells, modules and peripherals")
- **Builds:** AD-12 says routing handles only connections between key cells. But the netlist holds every net, including switch-to-diode inside a cell. `routing` filters by "both pads are in the same slot" and skips those. `pcb` draws key-cell tracks that also run the diode to the row track stub at the cell edge, so the edge-to-edge connection is half done twice. The `drc` completeness check, given neither list, reports `unrouted` for intra-cell connections that the key-cell tracks really do satisfy. An export gate built on that check can never pass.
- **Tightening (AD-12 + AD-14):** Every connection that `model.resolve` emits carries `realisedBy: key-cell | routed`. Only `pcb` realises `key-cell` connections. Only `routing` realises `routed` ones. `drc` checks completeness over the union.

### A4. Matrix overrides have no stable key. **High**
- **Units:** `model` (overrides schema) and `firmware`
- **Builds:** AD-14 says row/column can be overridden, but not what an override is keyed by. Team 1 stores `override matrix slot="k-3" col=4`, keyed by slot. Team 2 stores a remap `col 3 -> 5`, keyed by index. After a column insert, Team 2's remap points at a different column without any warning. The derived matrix also has no rule for two keys landing on one `(row, col)`, which is easy with the "additional row" fallback for thumbs, and no violation kind for it.
- **Tightening (AD-14):** Overrides are keyed by slot id (matrix, LED order) or by net id (MCU pin), never by index. Add a `matrix-collision` violation. Compute indices over keys only, so empty and non-key slots don't take up row or column numbers even though they advance the chain geometrically.

### A5. Per-side identity in `split-reversible`: the keymap, firmware and population can't name the right half. **Critical**
- **Units:** `model` (keymap and resolve) and `firmware` (ZMK physical layout and split)
- **Builds:** In reversible form there is one geometry (AD-6), so right-half keys have the **same slot ids** as left-half keys. The keymap maps slot id to binding (AD-19), so the right half can't get different bindings. Corney Island's keymap needs them, and so does every split keymap. ZMK's `zmk,physical-layout` needs right-hand key positions. AD-6 says only `model.resolve` mirrors, but for reversible it says nothing is mirrored (one geometry). So the `firmware` team flips positions itself, against the spirit of AD-6 though not its letter, and a later `split-mirrored` build gets right positions from `model` instead. The result is two code paths that disagree on the reflection axis. Population is keyed by side, but the keymap isn't, so the two sections use different addressing.
- **Tightening (AD-6 + AD-19):** `model.resolve` emits **per-side resolved placements for every form**. For reversible, the right side is the left side reflected across the `center` axis (the same as mirrored), with ids `right:<id>` in reversible and `mirror:<id>` in mirrored. Better still, use one prefix for both. The keymap, population, overrides and pads are all addressed by side-qualified id. State that `center` is required for both split forms.

### A6. Mirrored readiness: "one netlist, one routing section, one outline" assumes one board. **High**
- **Units:** `pcb` / `exports` (output shapes) and `model` (AD-21 and outline)
- **Builds:** AD-21 says one netlist, one routing section and one firmware per design. AD-16 says exactly one outline. `split-mirrored` has two boards, two outlines (`outline` and `mirror:outline`) and two copper sets. The `pcb` and `exports` teams build a single-board output type, with one gerber set and one DRC gate result. When mirrored is implemented, every stage output type and the export gate change, which breaks the PRD's FR-4 requirement that mirrored "must not require a model change".
- **Tightening (AD-6/AD-21):** From day one, stage outputs are keyed by **board** (`boards: { [boardId]: … }`). Reversible and unibody have one board, mirrored has two. "One netlist" means one netlist per board, derived together. The export gate checks each board.

---

## B. Routing-section ownership and timing

### B1. The routing section has two owners: `model`'s writer and `pipeline`'s content. Autosave can pair mismatched halves. **Critical**
- **Units:** `pipeline` (sole routing-section writer, AD-12) and `storage` / `editor` (autosave of the whole file, AD-13). `model` (canonical writer, AD-8) is the third party.
- **Builds:** The `model` design store holds the authored sections, which are immutable snapshots changed only by commands. The `pipeline` team keeps routes in its own map. The `editor` team calls `storage.save(model.serialize(design))`. Either routes are left out (lost on reload, which breaks AD-13) or the editor team adds the routes into the design object, so a non-command path now mutates the object that commands own. Even with routes passed separately, autosave can capture authored revision N together with routes that are still validated only for N-1, because revalidation runs asynchronously in the routing worker. The file is then internally inconsistent. Load revalidates it, but "same file → same outputs" is only met by accident. **Read-only tabs** (AD-13) run the pipeline too. Their pipeline is "the only writer of the routing section" and by AD-12 writes valid routes, so whether a read-only tab persists routes is undefined.
- **Tightening (AD-12 + AD-13):** The routing section is a separate value, `RoutingState { revision, routes }`, owned by `pipeline` and never stored in the command-managed design. `storage.save(design, routingState)` takes an atomic pair. `pipeline` only exposes a `routingState` whose `revision === revisionOf(design)`. Until then, save writes the last valid-for-current state, which may be empty for changed connections. The model's canonical writer serialises `routing` from that argument. Only the editing tab persists.

### B2. Gesture updates create revisions, and AD-12 drops routes at every revision change. Cancel can't bring them back. **High**
- **Units:** `editor` (gestures, AD-2) and `pipeline` (revalidation, AD-12)
- **Builds:** AD-2 says each gesture `update` produces a new revision. AD-12 says routes are revalidated "after every revision change" and invalid ones are dropped. AD-11 runs DRC of saved routes live. Dragging a key across a routed trace and back drops the route mid-drag. **Cancel** restores the authored state, but the route is already gone, and the routing section is outside undo. The `editor` team assumed cancel has no side effects. The `pipeline` team followed AD-12 to the letter. The debounce in AD-2 also lets routing *start* on an idle mid-drag revision that is never committed, and its result can be written to the section.
- **Tightening (AD-2/AD-12):** Revalidation that **drops** routes, and any write to the routing section, happen only at *committed* revisions (a command, a gesture commit, undo or redo, or load). During a gesture, live DRC of saved routes is display-only. Background routing may run on idle gesture revisions, but its results are only re-validated at the next committed revision (which already holds by the route-by-route rule).

### B3. Undo drops routes for good, which conflicts with AD-11 caching of the routing stage. **Medium**
- **Units:** `pipeline` (cache, AD-11) and `pipeline` routing writer (AD-12), which may be two teams in one package
- **Builds:** AD-11 gives every stage a cache key from its dependency closure. The cache team memoises routing results by key. The routing-writer team follows AD-12 ("invalid routes are dropped"). After move then undo, the cache hands back the old routing result for revision N, and the writer re-validates it route by route and **restores** the copper. With the cache disabled, undo reroutes and gets different copper. The two builds give different files for the same edit sequence. AD-12 allows copper to change on undo but doesn't decide which of these is correct.
- **Tightening (AD-11/AD-12):** Decide one rule. Either the routing stage is not cached by revision (its input includes the saved routes, see C1), or the pipeline keeps an LRU of `RoutingState` per revision as an explicit undo-friendly route cache. State the choice.

### B4. The export gate reads DRC and routing state from different moments. **Medium**
- **Units:** `exports` (gate, AD-15) and `pipeline` (drc stage, routing writer)
- **Builds:** The gate needs "zero errors for the current revision and no unrouted connections". The DRC stage runs live against the **saved** routes. A routing result arrives, the writer validates it (using `drc` as a library) and updates the section, and then the live DRC result is out of date until the next run. The `exports` team reads the latest DRC result tagged with the current revision, which is still *pre-write*: unrouted is greater than 0, so the gate blocks, or a later write leaves it stale. Tagging by revision alone can't tell these apart, because the routing section isn't part of the revision.
- **Tightening (AD-11/AD-15):** Tag DRC and gate results with `(revision, routingStateVersion)`. The gate passes only when both match the current values. Every routing-section write starts a DRC stage run.

### B5. Load-time revalidation breaks the byte-for-byte round trip. **Medium**
- **Units:** `model` (AD-8 round trip) and `pipeline` (AD-12 revalidate on load)
- **Builds:** After an app update with a changed footprint keep-out or DRC tolerance, opening a file drops some routes. Saving then changes the file, which breaks AD-8's "load and save unchanged reproduces byte for byte" rule. One team writes the test as `serialize(parse(f)) === f` (passes). The other writes it end-to-end through the editor (fails).
- **Tightening (AD-8):** Scope the byte-for-byte rule to `model.serialize(model.parse(f))`. Say outright that the routing section may change on load when revalidation drops routes, and that this is reported to the user (count of dropped routes).

---

## C. Revisions and cache keys

### C1. The cache-key closure only covers the dependency graph, which omits most stage inputs. **High**
- **Units:** `pipeline` (cache) and `case` / `routing` / `firmware`
- **Builds:** AD-11 defines the cache key as the hash of the inputs' closure *in the dependency graph* plus global settings. The dependency graph (glossary) holds anchors, default anchors, shape refs, construction inputs and parameters. It leaves out population, key cells, design rules, keymap, overrides, form, catalogue data, **saved routes** (an input to routing and DRC per AD-10), and the stage's own code version. Built literally, it gives these failures:
  - A key-cell change doesn't invalidate pcb.
  - A design-rule change doesn't invalidate routing.
  - A keymap edit doesn't invalidate firmware.
  - The case solid, which AD-11 allows to be cached **in browser storage**, survives an app update that changed the catalogue's case cutouts or the interpreter. Same file, different outputs, which breaks AD-1.
- **Tightening (AD-11):** Cache key = `hash(stageId, stageVersion, catalogueVersion, the slice of the ResolvedDesign the stage reads, plus savedRoutes for routing and drc)`. Compute it from **resolved values**, not graph closure, so `model.resolve` gives every stage a content hash of its input slice. Persisted caches must include `appBuild` in the key.

### C2. A cache hit has no rule for revision tags, so it is shown as stale or as fresh. **Medium**
- **Units:** `pipeline` (tagging) and `editor` (stale marking, AD-11/FR-17)
- **Builds:** A keymap edit moves the revision from N to N+1. The case cache key doesn't change, so the case output is still tagged N. The `editor` follows AD-11 ("never show an older revision's output as current") and marks the case stale. Its spinner never clears, because no background job runs. The other build re-stamps it as N+1.
- **Tightening (AD-11):** An output is tagged with its cache key. It is current for revision R when its key equals the key computed for R. `pipeline` re-stamps on a cache hit.

### C3. Revision has no single function. **Medium**
- **Units:** `model` and `pipeline` / `storage`
- **Builds:** A revision is "the hash of the canonical serialisation". To avoid serialising the whole design on every drag update, the `pipeline` team uses an incremental structural hash. `storage` uses the hash of `serialize()`. They give different revision values for the same state, so tags never match.
- **Tightening (AD-11):** `model` exports `revisionOf(design)` as the only way to get a revision. It can be implemented incrementally inside `model`. State whether `meta` (provenance) and `note` properties are part of the revision.

### C4. The catalogue isn't pinned, so the same file gives different outputs on another app build. **High**
- **Units:** `library` (catalogue data) and `model` (`catalogue-refs`, AD-1 stable outputs)
- **Builds:** `catalogue-refs` exists, but AD-8 doesn't say what it holds. `library` ships an improved Choc v2 footprint. A design reopened after the upgrade gives different gerbers, and its saved routes fail revalidation. One team treats `catalogue-refs` as part ids only. Another stores part id plus version.
- **Tightening (AD-5/AD-8):** `catalogue-refs` pins `part-id@version`. `library` keeps old versions or provides a catalogue migration that runs through `model`'s migration path and is reported to the user.

---

## D. Layout semantics: anchors, chains, attach points

### D1. Group attach points have no footprint rectangle, which creates hidden cycles. **High**
- **Units:** `model` resolve (frames) and `editor` (anchor picking)
- **Builds:** The glossary puts attach points on "a node's footprint rectangle". A slot has `w×h`. A group has no size. Team 1 makes a group's rectangle the bounding box of its children. Then a child anchored to its parent's `edge-left` depends on the bbox, which depends on the child: a cycle that the dependency graph (AD-3) doesn't model and so can't reject. Team 2 gives groups a zero rectangle (every attach point is the origin). The editor UI offers attach points that Team 2's resolver collapses.
- **Tightening (AD-3):** Attach points exist only on slots. Alternatively, groups carry an explicit authored `size`, never derived from children.

### D2. The chain step ignores slot width. **High**
- **Units:** `model` resolve and the fixture/Ergogen comparison
- **Builds:** AD-4 says the step is "one pitch plus gap" between child frames. A chain of `1u, 1.5u, 1u` slots then overlaps. Team 1 uses centre-to-centre (pitch + gap), which needs gaps of `0.25u` everywhere a wide key sits. Team 2 uses `pitch × (w_prev + w_cur)/2 + gap`. Fixture designs written for one resolver are mis-placed by the other by `0.25u`.
- **Tightening (AD-4):** State the step formula, including how `w` / `h` enter along the chain direction. The step is applied in child *n−1*'s rotated frame, along the chain's direction axis.

### D3. Part rotation and slot frame: which frame do outputs use? **Medium**
- **Units:** `firmware` (physical layout `r`) and `plates` / `pcb` / `model` shapes (key outline)
- **Builds:** AD-4 says "set rotation on the part, not the slot" for a non-propagating turn, such as Corney Island's far thumb key at 90°. `plates` rotates the switch cutout by part rotation. `firmware` emits the slot frame's rotation into `zmk,physical-layout`. The key-outline shape primitive uses the slot rectangle, unrotated. Attach points on that slot: in the slot or the part frame?
- **Tightening (AD-4):** Define the **part frame** = slot frame ∘ part rotation. Every part-derived output (footprint, cutouts, key outline, physical layout) uses the part frame. Attach points use the slot frame.

### D4. Vertices and construction points have no default anchor. **Low**
- **Units:** `model` resolve and `editor` (`addVertex`)
- **Builds:** The default anchor is defined only for nodes (free/chain). A vertex with no anchor resolves to the world origin in one build, and is a schema error in the other.
- **Tightening (AD-3):** Vertices and construction points must have an explicit anchor. `addVertex` requires one.

### D5. Deleting something that others anchor to. **High**
- **Units:** `model` commands (AD-2 cascade) and `model` resolve / `editor`
- **Builds:** AD-2 cascades only keyed data (bindings, population, overrides). AD-16 says a missing reference is an `unresolvable-reference` violation. Team 1's `deleteSlot` leaves dependants dangling, and everything anchored to the slot (half an outline) turns into violations. Team 2's `deleteSlot` re-anchors each dependant to the deleted slot's own anchor, keeping its world position, in the same command. Both are legal. The user experience and undo payloads differ, and so does the M2 merge behaviour.
- **Tightening (AD-2):** Choose one rule. Either deleting a referenced thing is a typed rejection listing the dependants, or the command re-points them with world position preserved and records that in the same undo entry. Shape refs, case-op refs and vertex anchors follow the same rule.

### D6. "Never reused" ids can't be enforced across sessions. **Medium**
- **Units:** `model` (id minting) and `storage` / M2 merge
- **Builds:** The command log isn't persisted (AD-2). After deleting `key-7` and reopening, a counter-based minter mints `key-7` again. A random-suffix minter never does. M2's three-way merge, keyed by id (AD-9), confuses the two keys.
- **Tightening (AD-8):** Either persist a mint counter in `meta`, or mint ids with a collision-resistant component. Or drop "never reused" and state "unique within a design at any moment".

### D7. Vertices have no section, and group key-cell overrides have no home. **Medium**
- **Units:** `model` writer and `storage` / migrations
- **Builds:** The AD-8 section list has no place for vertices, which are reusable across shapes, or for per-group key-cell overrides. One team puts vertices in `construction`, the other inside `shapes`. One puts key-cell overrides on layout groups, the other in `key-cells` with a group selector. Canonical files from the two builds can't be read by each other.
- **Tightening (AD-8):** Name the section for every authored entity (vertices go in `construction`, or a new `vertices` section). Key-cell overrides are a property of the layout group, referencing a `key-cells` entry by id. State the precedence when groups nest: the nearest ancestor wins.

---

## E. Population, parts and slot ownership

### E1. Two owners of "which part is in this slot". **High**
- **Units:** `model` layout schema (AD-5: "every leaf is a slot holding one part") and `model` population (glossary: "which part each slot holds, per side")
- **Builds:** The layout team stores `slot part="nice-nano"`. The population team stores `population side="left" slot="mcu" part="nice-nano"`. On top of that, overrides can change population (glossary: "override … to population"). That makes three write paths for one fact, and stages read whichever they were built against.
- **Tightening (AD-5):** The layout slot declares the **default part**. Population per side is the only way to change it per side: fitted, swapped or empty. Drop "override to population" from the glossary. Overrides only apply to *derived* data (mirrored side, netlist).

### E2. "Wired" or "wireless" is inferred from population, but the rule isn't stated. **Medium**
- **Units:** `firmware` (split transport, `binding-unsupported`) and `model` (AD-19 checks)
- **Builds:** Both Corney designs use a nice!nano, which can do BLE. AD-19's example "`bluetooth` on a wired build" needs a "wired" predicate. `model` decides "wired = TRRS fitted". `firmware` decides "wireless = battery connector fitted". A design with both, or neither, gets a violation from one and a BLE shield from the other.
- **Tightening (AD-19/AD-15):** `model.resolve` derives one `capabilities` record from population (`split-transport: uart | ble`, `rgb`, `display`) by a stated rule. Both firmware and violation checks read only that record.

---

## F. Parameters, expressions and templates

### F1. `u` outside an x/y axis context. **High**
- **Units:** `model` expression evaluator and `case` / shapes authors (`library` templates)
- **Builds:** AD-4 says `u` on x means `pitch-x`, and on y means `pitch-y`. A parameter `thumb-off = "0.5u"` used in an x offset and a y offset. A circle radius `"1u"`. A wall `"0.1u"`. A vertex offset in a rotated frame. Evaluator A resolves `u` when the parameter is defined, defaulting to x. Evaluator B keeps `u` symbolic and resolves it where it is used. Evaluator C rejects `u` in a property that has no axis. Corney Island designs built with one evaluator are off by the `pitch-x`/`pitch-y` difference in another, which is zero at 19×19 (so it slips past the fixture) and non-zero at 18×17.
- **Tightening (AD-17):** `u` is a separate dimension that stays symbolic through parameters. It resolves only at a property tagged with an axis in the `model` schema (x, y, chain direction). Any other use of `u` is `unit-mismatch`.

### F2. Expression edge cases have no defined result. **Medium**
- **Units:** `model` parser/evaluator and `editor` (expression input)
- **Builds:** Things the grammar leaves undecided:
  - **Unary minus:** `"-wall"` isn't in the grammar, yet the files use `"-15deg"`.
  - **Number forms:** `.5mm`, `1e1mm`, unitless numbers in `wall * 2`.
  - **Dimensions:** `mm * mm`, `mm / mm`, `mm + u`.
  - **Bad values:** division by zero, negative widths or radii.
  - **Parameter cycles:** only `anchor-cycle` exists as a kind.
  - **Missing parameter names.**

  Two parsers both "match the grammar" yet accept different files, and the canonical writer canonicalises numbers differently.
- **Tightening (AD-17):** Add the grammar in EBNF, including unary minus and unitless scalars (allowed only as `*` / `/` factors). Define the dimension algebra. Add an `invalid-value` violation (division by zero, non-positive size). Rename `anchor-cycle` to `dependency-cycle`, or add `parameter-cycle`. Missing names are `unresolvable-reference`.

### F3. Parameters are referenced by name, everything else by id. Rename has no defined effect. **High**
- **Units:** `model` commands (`renameParameter`) and `case` / every expression author
- **Builds:** AD-3 says references are "by id, never by path". AD-18 has case operations reference parameters **by name**, and expressions contain names. The glossary gives parameters ids too. Team 1's `renameParameter` rewrites every expression string in the same command. Team 2 treats rename as editing a display label, keeping the name immutable and stored as the id. Files from Team 1 break when edited in Team 2's app.
- **Tightening (AD-17):** A parameter's **name is its id** (kebab-case, immutable), or rename is one command that rewrites every referencing expression in one undo entry. Choose one.

### F4. Template insertion: dependency direction, name collisions, the outline reference. **High**
- **Units:** `library` (templates, Structural Seed) and `model` (`insertTemplate` command, AD-18)
- **Builds:**
  - **Dependency direction:** `insertTemplate` is a `model` command, but templates live in `library`, which depends on `model`. `model` can't call the template. Team 1 passes a template id and finds `model` can't resolve it. Team 2 has `editor` call `library.expand()` and dispatch the payload, so ids are minted by `library` against AD-8 ("every id is minted by `model`").
  - **Name collisions:** inserting `tray` into a design that already has a `wall` parameter means overwrite, rename or reject. Inserting twice is also undefined.
  - **The outline reference:** the template's case operations must reference *the outline*. If the outline's id is frozen at insert, re-designating the outline leaves the case on the old shape. If the reference is live, AD-18's "operations reference shapes by id" is broken.
- **Tightening (AD-18):** A template is pure data or a function in `library` returning `{ parameters, operations }` with local placeholder ids. `editor` dispatches `insertTemplate(payload)`, and `model` mints the real ids and prefixes parameter names with the instance (`tray-1.wall`), or rejects collisions. Case operations may reference the designated outline symbolically (`@outline`), resolved in `model.resolve`.

### F5. Undoing a template insert after other sections reference its parameters. **Low**
- **Units:** `model` commands and `editor`
- **Builds:** The user inserts `tray`, then references `tray.wall` in a plate shape, then undoes the insert. Undo correctly restores the state before the insert, but redo order and the dangling-reference violation differ by implementation, depending on whether undo is a snapshot or an inverse command.
- **Tightening (AD-2):** Undo is a snapshot restore of the authored sections (structural sharing), not inverse commands.

---

## G. Package boundaries and violations

### G1. `exports` needs stage outputs but may depend only on `model`. **High**
- **Units:** `exports` and `plates` / `pcb` / `case`
- **Builds:** The stage signature takes only the `ResolvedDesign` (AD-10). `exports` packages DXF, gerber, STEP and KiCad, which means *plate*, *board* and *solid* outputs. The output types live in each stage package, which `exports` can't import. Team 1 has `exports` re-derive plates from the resolved design (a second plate implementation). Team 2 has `pipeline` pass outputs in, which is a second stage-to-stage flow against "the one stage-to-stage flow". The gerber writer is "shared by plates and PCB", so its home is also open.
- **Tightening (AD-10):** Stage output types (`PlateSet`, `BoardOutput`, `CaseSolid`, `FirmwareTree`) are defined in `model`. Name the second flow: `pipeline` passes stage outputs to `exports`. The gerber writer lives in `exports`.

### G2. Violation kinds have no owner, so they are duplicated or missing. **Medium**
- **Units:** `model` resolve and `drc` / `plates` / `pcb`
- **Builds:** `overlap` is reported by `model` (slot rectangles), by `plates` (cutouts) and by `drc` (courtyards). Copper clashes between adjacent key-cell tracks: is that `pcb` or `drc`? The editor shows three warnings for one problem, or none if every team assumes another covers it.
- **Tightening (conventions):** Add a table mapping each violation kind to exactly one producing package. `drc` owns every copper and keep-out check, key-cell tracks included.

### G3. Partial resolution: what a stage receives when resolve hits a cycle or a missing ref. **Medium**
- **Units:** `model` resolve and every stage
- **Builds:** Design problems never throw. When there is an `anchor-cycle`, resolver A leaves out the cycle's nodes, resolver B gives them `NaN` frames, and resolver C returns the last good frames. Stages written against A crash on B.
- **Tightening (AD-10):** `ResolvedDesign` marks each entity `resolved | unresolved(reason)`. Unresolved entities have no frame, and stages skip them without error.

---

## H. Smaller notes

- **Combos and layer references in the keymap (low):** a combo references several slots, and `layer-tap` references a layer. Deleting a layer has no cascade rule. Fix: give layers ids, and cascade-delete or reject in `deleteLayer`.
- **Debounced background start vs `update` revisions (low):** AD-2 lets routing and case start on an idle mid-drag revision, and AD-11 cancels on a newer revision. A slow drag can therefore start and cancel a case build many times. This is accepted, but it should be stated so the pipeline team doesn't add its own throttling.
- **PRD drift (context):** PRD FR-5 and SM-5 ("switch between the wired and wireless variants") still describe variants. AD-21 replaces them with two designs, so SM-5's step becomes "open the other design" and loses the "a layout change updates every variant" property, which now needs a manual remix. 📐 This is the real cost of AD-21. The PRD should state it so SM-5 isn't later read as satisfied by a feature that no longer exists.
- **PRD FR-2 vs AD-4 (context):** FR-2 says a node's own slot rotation "does not propagate". AD-4 says a node's rotation *does* carry, and you use part rotation instead. These agree only once D3 defines the part frame. Otherwise the fixture author and the resolver author disagree.

---

## Minimal tightening set (in priority order)

1. Pads `<slot>.<component>.<pin>`. `model.resolve` emits connections, with a fixed decomposition, stable net ids and `realisedBy` (A1–A3).
2. Side-qualified ids and per-side resolved placement for every form. Outputs keyed by board (A5, A6).
3. `RoutingState {revision, routes}` as a separate value, saved atomically, written only at committed revisions, persisted only by the editing tab (B1, B2).
4. Cache key from the resolved input slice plus stage, catalogue and app versions plus saved routes. Re-stamp on a hit. `revisionOf` lives only in `model` (C1–C3).
5. Pinned catalogue versions (C4). A single owner for slot→part (E1).
6. Stage output types in `model`, and `pipeline → exports` named as a flow (G1).
7. Expression grammar and `u` semantics. Parameter name = id. Template payload insertion (F1–F4).
8. Group attach points, the chain step formula, the part frame, and the delete policy (D1–D3, D5).
