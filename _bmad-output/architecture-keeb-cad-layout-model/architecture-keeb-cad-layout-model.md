---
name: 'keeb-cad: layout model and generation core'
type: architecture-spine
purpose: build-substrate
altitude: initiative
paradigm: 'single source of truth with derived views (functional core / imperative shell; pipes-and-filters for outputs)'
scope: 'keeb-cad milestone 1: layout model, authored geometry, parameters, electrical model, keymap, case operations, routing state, design file format, generation pipeline, package boundaries, stack'
status: final
created: '2026-10-24'
updated: '2026-10-25'
binds: [FR-1, FR-2, FR-3, FR-4, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18]
sources:
  - _bmad-output/prd-keeb-cad-m1/prd-keeb-cad-m1.md
  - _bmad-output/prd-keeb-cad-m1/addendum.md
  - _bmad-output/prd-keeb-cad-m1/reconcile-architecture.md
  - _bmad-output/prd-keeb-cad-m1/.memlog.md
  - _bmad-output/forge-keeb-cad-preserve-work/forge-keeb-cad-preserve-work.md
  - _bmad-output/layout-model/paper-test-v0.md
  - _bmad-output/architecture-keeb-cad-layout-model/stack-research.md
---

# Architecture Spine: keeb-cad, layout model and generation core

**Principles (they bind every AD):** explicit over terse · one way to do each thing · a small, coherent set of concepts.

## Glossary

Each term means exactly one thing. Code, file format and UI use these words and no synonyms.

| Term | Meaning |
| --- | --- |
| **design** | One keyboard document with exactly one electronics configuration; the only source of truth |
| **authored sections** | Every section of the design file except `routing` (AD-8); changed only by commands |
| **routing section** | The one saved section of derived data: routes per board, keyed by connection. Written only by `pipeline` |
| **revision** | The content hash of the canonical serialisation of the authored sections |
| **routing hash** | The content hash of the routing section |
| **layout** | The tree of nodes that places keys and parts |
| **node** | An element of the layout: a group or a slot |
| **group** | A node with children and an arrangement; has an origin frame and no size |
| **slot** | A leaf with a size (`w`×`h`, default `1u`×`1u`) and a frame at its centre; holds one part |
| **key** | A slot whose part is the key cell |
| **arrangement** | How a group places its children: `chain` or `free` |
| **frame** | A position + rotation in the plane |
| **id** | A stable identifier of a design, node, shape, vertex, construction point or case operation; never changes, never reused |
| **form** | `split-reversible`, `split-mirrored` or `unibody` |
| **side** | One hand's set of resolved placements: `left` and `right` in split forms, `whole` in unibody |
| **side-qualified id** | `<side>/<id>`: a resolved placement of an authored element on one side (`left/thumb-far`) |
| **center** | The top-level group, required in split forms, whose frame's y-axis is the mirror axis |
| **board** | One physical PCB: one in `split-reversible` and `unibody`, one per side in `split-mirrored` |
| **anchor** | What a frame is placed from: a slot (+ attach point), a group origin, a vertex or a construction point |
| **default anchor** | The anchor used when none is set: the parent in a `free` group; the previous sibling, advanced by one step, in a `chain` |
| **attach point** | A named point on a slot's rectangle (`center`, `edge-top/bottom/left/right`, `corner-tl/tr/bl/br`) |
| **offset** | Local x, y, rotation (and pivot), applied in the anchor's frame; the node's only rotation |
| **pivot** | The point a rotation turns around, in the node's own frame before rotation |
| **chain** | An arrangement in which each child's default anchor is the previous sibling, advanced by one step |
| **step** | The distance from one chain child to the next, along the chain direction (AD-4) |
| **free** | An arrangement in which each child's default anchor is the parent |
| **gap** | Extra distance along the chain direction before a child |
| **index** | A child's position within a chain |
| **part** | What a slot holds: a catalogue entry, the key cell, or `empty` |
| **module** | A ready-made board used as a part (nice!nano, nice!view) |
| **catalogue** | The available part definitions, each with an id and an immutable version |
| **component** | A named footprint inside a part or key cell (`switch`, `diode`, `led`); has pins |
| **pad** | A pin on a board: `<side-qualified slot id>.<component>.<pin>` |
| **cutout** | Geometry removed from a plate, PCB or case: part-owned (catalogue, with a role and target) or a user shape |
| **cutout role** | A cutout's purpose (`switch`, `screw`, `mcu-window`, `display-window`, …); plates select roles |
| **keep-out** | An area routing must avoid; part-owned (catalogue) or authored |
| **key cell** | A key template stored in the design: components + their local tracks; groups reference one |
| **pitch** | Centre-to-centre key distance, `pitch-x` / `pitch-y`; independent of switch type |
| **population** | Which slots are fitted, per side |
| **override** | A named change to population, to the derived right side (`split-mirrored`), to the derived netlist (matrix row/column, MCU pin, LED order), or to a part parameter per target |
| **parameter** | A named value with a unit; its name is its id |
| **expression** | A length or angle written with numbers, units, parameter names and `+ - * / ( )` |
| **shape** | A named 2D geometry built from geometry operations: key outline, rectangle, circle, polygon, add, subtract, intersect, offset (corner style, fillet), shape reference |
| **vertex** | A polygon corner; has an id, an anchor and an offset; reusable across shapes |
| **construction point** | A helper point computed from other geometry (e.g. intersection of two lines); a possible anchor; not a part |
| **outline** | The shape designated as the board edge |
| **plate** | A named definition: a shape + the cutout roles it includes |
| **case operation** | A node in the case's 3D operation graph (extrude, offset, boolean, z-position; extensible) |
| **template** | A payload of parameters + case operations, inserted once |
| **net** | A set of pads that must be connected; has a stable net id |
| **netlist** | Every net: matrix rows and columns, power, ground, LED chain, TRRS/UART, display bus, battery |
| **connection** | One pad pair that a net is split into; realised by a key cell, a part, or routing |
| **route** | The copper path for one routed connection |
| **design rules** | Net classes (width, clearance), edge clearance, and keep-out switches |
| **DRC** | The design-rule check, implemented once in `drc` |
| **binding** | What one key does on one layer, from the firmware-neutral vocabulary |
| **keymap** | Layers of bindings keyed by side-qualified slot id, plus combos |
| **violation** | A reported design problem: `{ kind, severity, ids, message }` |
| **block** | A reusable, versioned design fragment (milestone 2) |
| **command** | A named, undoable operation; the only way the authored sections change |
| **gesture** | A continuous interaction (a drag): begin, update(s), then commit or cancel |
| **committed revision** | A revision reached by a command, a gesture commit or cancel, undo, redo, or load |
| **dependency graph** | The one graph of everything that reads something else: anchors, default anchors, shape references, construction-point inputs, parameter references |
| **resolved design** | The design with expressions evaluated and every per-side placement, shape, netlist and connection computed |
| **stage** | A pure function from the resolved design (and, where stated, other stage outputs) to one output |
| **live** | Recomputed synchronously, including during a gesture |
| **background** | Computed in a Web Worker, with progress; cancelled by a newer committed revision |
| **preview** | The editor's 2D rendering of resolved placements and shapes |
| **escape hatch** | Exporting a KiCad project to finish outside keeb-cad; the export no longer syncs |

## Design Paradigm

**Single source of truth, with derived views.** The authored sections are the design. `model` resolves them once into a **resolved design**, and every output is a pure, cached function of it. The one piece of saved derived data is the routing section: it depends on history, so it is kept, and it is re-validated against the current design rather than trusted. Interaction happens in an imperative shell (`editor`) that changes authored sections **only** through commands.

```mermaid
graph LR
  U[User input] --> C[Commands / gestures]
  C --> A[(Authored sections)]
  CAT[(Catalogue, library)] --> R
  A --> R["model.resolve: expressions, sides, frames, shapes, netlist, connections"]
  R --> PL[plates] & PC[pcb placement] & CS[case] & FW[firmware] & PV[preview]
  PC --> RT[routing, background]
  RS[(Routing section)] --> RT & DR
  PC --> DR[drc]
  RT -->|results| P[pipeline]
  DR --> P
  P -->|valid routes, committed revisions only| RS
  PL & PC & RS & DR & CS & FW --> EX[exports]
```

## Invariants & Rules

### AD-1: One document; authored sections plus one saved routing section [ADOPTED]
- **Binds:** all
- **Prevents:** outputs drifting from the model; hand edits lost on regeneration; derived data quietly persisted in more places.
- **Rule:**
  - The design file holds the authored sections plus the routing section. Nothing else derived is saved in it.
  - Every output is derived and is never edited inside keeb-cad. Changes the model can't express are made after **export** (escape hatch).
  - **Stable outputs:** the same file with the same app version gives the same outputs on every reopen. An edit changes only the outputs whose inputs it changed.

### AD-2: Authored sections change only through named commands and gestures [ADOPTED]
- **Binds:** model, editor
- **Prevents:** ad-hoc mutation; broken undo; drag previews computed outside the design; undo floods.
- **Rule:**
  - Every change to an authored section is a named command in `model` (e.g. `moveSlot`, `setGap`, `setAnchor`, `addVertex`, `setParameter`, `renameParameter`, `setBinding`, `insertTemplate`, `setFitted`), and nothing else writes to them.
  - A drag is a **gesture**: `begin`, `update`…, then `commit` or `cancel`. Each `update` produces a revision that the live stages consume. A committed gesture is **one** undo entry.
  - A command that removes something removes everything keyed to it in the same command (deleting a slot deletes its bindings, combo memberships, population entries and overrides; deleting a vertex is rejected while a shape uses it), so one undo restores them all.
  - `renameParameter` rewrites every expression that uses the name, in the same command.
  - The routing section is outside commands and undo (AD-12).
  - The command log is not persisted. The design file holds state, not history.

### AD-3: Placement = one anchor + offset, over one acyclic dependency graph [ADOPTED]
- **Binds:** model, every stage
- **Prevents:** two placement semantics; two cycle checks; geometry that doesn't follow the layout.
- **Rule:**
  - The tree defines ownership. Placement is independent of ownership.
  - Every node, vertex and construction point has exactly **one** anchor. Unset means the default anchor. Any of them may explicitly anchor to any slot (+ attach point), group origin, vertex or construction point.
  - An explicit anchor **replaces** the default: placement is anchor + offset only, with no step added.
  - World frame = anchor frame → translate by offset → rotate by offset rotation about pivot. This is the single order of operations for nodes and geometry alike. A node has exactly one rotation.
  - Attach points exist on slots only; a group exposes only its origin.
  - Anchors reference by **id**, never by path.
  - The **dependency graph** is one graph and must be acyclic. `model` rejects a command that would create a cycle; a loaded file with a cycle reports `anchor-cycle`.

### AD-4: Exactly two arrangements; the step is a default anchor [ADOPTED]
- **Binds:** model, editor
- **Prevents:** overlapping layout mechanisms; losing per-column stagger and splay; slot widths handled differently.
- **Rule:**
  - **chain** has a direction (`+x` or `+y`). Child 0's default anchor is the chain's frame. Child *n*'s default anchor is child *n−1*'s **world frame** (rotation included), translated along the direction axis of that frame by `(size(n−1) + size(n)) / 2 + gap(n)`, where `size` is the slot's extent along the direction in `u`. Child *n*'s offset is then applied.
  - Rotation carries: a child's rotation turns every later sibling's default anchor. A mid-chain turn that must not carry is expressed by giving the next sibling an explicit anchor.
  - A chain child with an explicit anchor keeps its **index**; later siblings step from wherever it ended up.
  - **free:** each child's default anchor is the parent's origin.
  - **Units:** `u` means `pitch-x` on x-axis properties and `pitch-y` on y-axis properties. Every length property in the schema is tagged `x`, `y` or `none`; `u` on a `none` property is `unit-mismatch`.
  - Empty slots keep their index and still advance the chain.

### AD-5: Slots hold parts; the catalogue is versioned; pitch is independent of switch type [ADOPTED]
- **Binds:** model, library, pcb, plates, case, firmware, drc
- **Prevents:** spacing hard-wired to switch type; two owners of part data; cutouts defined per stage; an app update silently changing a saved design.
- **Rule:**
  - The slot owns which part it holds. Population owns only whether it is fitted, per side.
  - `model` owns the **catalogue schema**: components, pins and pin roles, minimum pitch, 3D envelope, cutouts (role + target `plate` / `pcb` / `case`), keep-outs, optional fixed tracks (a pre-routed module zone), named part parameters with defaults. `library` owns the **catalogue data**.
  - Catalogue entries are immutable per version. `catalogue-refs` pins each used part as id + version. `library` keeps every released version; an update adds a version, and moving a design to it is a command.
  - Groups reference a key cell; a slot uses its nearest ancestor's. Part parameters (e.g. screw-hole radius) can be overridden per slot or group, per target.
  - Every stage takes cutouts, keep-outs and fixed tracks from the resolved design only.
  - Pitch below a switch's minimum is `pitch-below-min`, never silently adjusted.
  - Lengths carry an explicit unit: `u` or `mm`. Angles are in `deg`.
  - **Milestone-1 catalogue:** Choc v2 hotswap, SOD-123 diode, SK6812mini-e (per-key and underglow), nice!nano, SSD1306 OLED, nice!view, TRRS PJ320A, JST-PH battery connector, power switch, reset button, solder jumpers, M2 screw and standoff.

### AD-6: Form, sides and the derived right side [ADOPTED]
- **Binds:** model, every stage
- **Prevents:** split-only assumptions; stages mirroring differently; the right half having no identity.
- **Rule:**
  - The design carries `form`. All three forms are valid in the schema from format-version 1. Milestone 1 implements `split-reversible`; the others load and report `unsupported-form` instead of producing outputs.
  - The authored layout describes one side: `left` in split forms, `whole` in unibody. **Only `model.resolve` derives the right side**, and it emits per-side placements, with side-qualified ids, for every form. Every stage consumes them; no stage mirrors.
  - The right side is the resolved left side reflected across the y-axis of `center`'s frame. Nodes, vertices, construction points and shapes are reflected together. Attach points swap left and right.
  - `split-reversible`: one board carries every footprint of both sides (reversible footprints, solder jumpers). Sides differ only in population. Geometric overrides are not allowed.
  - `split-mirrored`: one board per side. Overrides (swap part / remove / offset) target `right/` ids.
  - Keymap, population, pads and violations use side-qualified ids.
  - There is no other asymmetry mechanism.

### AD-7: Coordinates [ADOPTED]
- **Binds:** model, every stage
- **Prevents:** flipped or mirrored outputs from mixed conventions.
- **Rule:** The model uses mm, degrees, **y up**, counter-clockwise positive. Each stage converts to its target's convention at its own output boundary. The model never encodes an output's convention.

### AD-8: Design file = canonical KDL v2, versioned, sectioned, with stable ids [ADOPTED]
- **Binds:** model, library, storage, editor
- **Prevents:** noisy diffs, unreadable old files, sections stored in incompatible shapes, format lock-in.
- **Rule:**
  - Designs are KDL v2 files carrying a `format-version`. `model` validates them and migrates older versions forward on load. A newer version than the app knows opens read-only with `format-too-new`. A failed migration reports `migration-failed` and never overwrites the file.
  - Sections, in this order: `meta` (design id, form, pitch, provenance), `parameters`, `catalogue-refs`, `key-cells`, `layout`, `construction`, `shapes`, `plates`, `case`, `population`, `overrides`, `design-rules`, `keymap`, `routing`. The schema for each lives in `model`.
  - **The canonical writer lives in `model`.** It sets node and property order itself, writes lengths, angles and expressions as quoted strings (`"19mm"`, `"-15deg"`, `"wall + gap"`), and canonicalises numbers.
  - Loading and then saving an unchanged design reproduces the file byte for byte.
  - Free-text comments are not preserved. Annotations use a `note` property.
  - Every id is minted by `model` (kebab-case, unique per design, never reused).
  - The file format doesn't depend on any storage backend.

### AD-9: Remix: copy with provenance; merges in milestone 2 [ADOPTED]
- **Binds:** model, library, editor
- **Prevents:** remixes silently changing under the user; ids that can't support a later merge; a second mechanism for carrying layout changes between boards.
- **Rule:**
  - A remix source is a **block or a whole design**. A design made from another design (e.g. wireless Corney Island from wired) is a remix, not a variant.
  - **Save As** mints a new design id, keeps every other id, and writes provenance into `meta`: source design id, source revision, licence.
  - Ids inside an inserted block are `<instance-id>/<block-node-id>`.
  - **Milestone 1:** Save As only. No library of blocks, no update pull.
  - **Milestone 2:** the design embeds an untouched base copy of the source; pulling is a three-way merge (base, new source, local) keyed by id; conflicting changes are surfaced, never auto-resolved; a pull carries layout and electronics changes alike.

### AD-10: Package dependency direction, shared derivations, stage contracts [ADOPTED]
- **Binds:** all packages
- **Prevents:** stages coupling to each other; UI framework leaking into the core; stages each evaluating geometry, expressions or nets their own way; two shapes for one output.
- **Rule:**
  - Dependencies point only as drawn below. Stages depend on `model` only and never import each other. **One named exception:** `routing` imports `drc`.
  - `model` imports no other workspace package. `resolve(authored, catalogue)` receives catalogue data from its caller. `insertTemplate(payload)` receives the template from `editor`, which reads it from `library`; `model` mints the ids and suffixes clashing parameter names.
  - **Shared derivations live in `model.resolve`, and only there:** expression evaluation, per-side placements, shapes, the netlist, connections, catalogue lookup.
  - **Every stage output type is defined in `model`** (`PlatesOutput`, `PcbPlacement`, `RouteSet`, `DrcResult`, `CaseOutput`, `FirmwareOutput`).
  - **Stage signatures:** `(resolved) → { output, violations[] }` for plates, pcb, case, firmware. `routing(resolved, placement, savedRoutes)` and `drc(resolved, placement, routes)`. `exports(resolved, outputs)` packages what `pipeline` hands it.
  - **Named stage-to-stage flows, all via `pipeline`:** pcb placement → routing and drc; every stage output → exports. No others.
  - Only `editor` imports Vue. Nothing imports `editor`.
  - **Enforcement:** pnpm strict dependencies, plus dependency-cruiser rules in CI.

```mermaid
graph TD
  editor --> pipeline
  editor --> model
  editor --> library
  editor --> storage
  pipeline --> plates & pcb & routing & drc & case & firmware & exports
  pipeline --> model
  pipeline --> library
  routing --> drc
  plates --> model
  pcb --> model
  routing --> model
  drc --> model
  case --> model
  firmware --> model
  exports --> model
  library --> model
  storage --> model
```

### AD-11: Live vs background stages; revisions and cache keys [ADOPTED]
- **Binds:** pipeline, editor, stages
- **Prevents:** a UI that blocks on slow geometry; stale outputs shown as current; cache false hits after an app update or a non-geometric edit.
- **Rule:**
  - **Live:** resolve, plates, pcb placement with key-cell and part tracks, firmware, preview, and DRC of saved routes against the current placement.
  - **Background** (Web Workers): case (replicad) and routing. They report progress and partial or failed results; a newer committed revision cancels them. Background stages start only at committed revisions, or after a gesture has been idle for a debounce interval.
  - **Cache key** = stage id + stage version + catalogue versions used + hash of the resolved slice the stage reads (+ routing hash for drc and exports).
  - Every output is tagged with the revision it was computed from (+ routing hash where it reads routes). An output whose tag differs from the current one is shown marked stale, never as current, including on cache hits.
  - The case solid may be cached by its cache key in memory or browser storage; it is never written to the design file.

### AD-12: Routing: incremental, browser-only, saved in the routing section [ADOPTED]
- **Binds:** pcb, routing, drc, pipeline, storage
- **Prevents:** routing on the undo stack; drags destroying routes; stale routes applied blindly; two writers of the routing section.
- **Rule:**
  - Connections realised by a key cell or a part's fixed tracks are pcb placement and move live. Routing handles only the rest.
  - The routing section holds, per board, routes keyed by connection id. A route is never hand-edited.
  - **A saved route is valid when** its connection still exists, both pads are at the same world positions, and `drc` passes it against the current board.
  - **Only `pipeline` writes the routing section, and only at committed revisions.** At each committed revision it drops invalid routes and requests routing for unrouted connections, passing valid routes as fixed obstacles. During a gesture, saved routes are checked for display only.
  - A routing result for an older committed revision is re-validated route by route against the current one before it is kept.
  - The routing section is outside commands and undo. Undo and redo may change copper while staying electrically equal.
  - Unrouted connections are `unrouted` violations; the UI always shows the count.
  - Any engine sits behind this one stage interface and runs in a Web Worker in the browser. No helper program, no server, no network.
  - **Fallback:** whatever the engine can't route stays unrouted and is finished in KiCad after export (escape hatch).

### AD-13: Storage behind one interface; milestone 1 is local-only [ADOPTED]
- **Binds:** editor, storage, library, pipeline
- **Prevents:** a hard dependency on any service; tabs overwriting each other; a file pairing authored state with routes from another revision.
- **Rule:**
  - All persistence goes through the `storage` package interface: `save`, `load`, `listVersions`. The saved unit is the whole design file, written atomically: authored sections plus the routing section valid for that revision.
  - Milestone 1 implements browser autosave and file Save/Open.
  - The catalogue ships bundled with the app.
  - No network calls are needed to design or export.
  - One tab edits a design at a time; only that tab saves. Other tabs open it read-only and never write the routing section.

### AD-14: The netlist and connections are owned by `model` [ADOPTED]
- **Binds:** model, pcb, routing, drc, firmware
- **Prevents:** a PCB wired one way and firmware scanning another; stages inventing nets; routes dropped because a key moved or was inserted.
- **Rule:**
  - `model.resolve` produces the one netlist from component pin roles, the key cell and parts, and splits each net into connections. pcb, routing, drc and firmware consume them and derive none of their own.
  - **Net ids are stable:** derived from ids, never from indices or positions (e.g. column net `col:<chain-id>`, LED link `led:<slot-id>`).
  - **The split of a net into connections depends only on ids and the netlist, never on positions.** Connection id = net id + the two pads in canonical order. The exact split rule is fixed at the routing spike.
  - **Matrix assignment rule:** for each key, the nearest enclosing chain running along *x* gives the column, the nearest running along *y* gives the row. Keys outside an x+y pair go into an additional row in chain order.
  - Matrix row/column, MCU pin assignment and LED chain order can be overridden; overrides are stored in the design. A future optimiser must be a command that writes overrides.
  - A cross-stage golden test asserts that the firmware matrix equals the PCB nets.

### AD-15: Exports [ADOPTED]
- **Binds:** exports, pipeline, plates, pcb, drc, case, firmware
- **Prevents:** each stage inventing its own export set; fab files from a board that fails DRC.
- **Rule:** Milestone-1 exports:
  - plates: DXF, SVG, and gerber + drill (edge + holes board, same writer as the PCB)
  - case: STEP and STL
  - PCB: gerber (copper, mask, silkscreen, edge) + Excellon drill, **only when `pipeline` holds a DRC result with zero `error` violations and no unrouted connections, tagged with the same revision and routing hash as the routes being exported**; a KiCad 10 board file as the escape hatch, always available
  - firmware: a ZMK shield with the `zmk,physical-layout` node, wired split over UART and RGB underglow when the population fits them, and the keymap

### AD-16: Shapes are authored and evaluated once, in `model` [ADOPTED]
- **Binds:** model, plates, pcb, case, drc, exports
- **Prevents:** plate, PCB edge, case and gerbers disagreeing on one offset or fillet; a mismatch with Ergogen's geometry.
- **Rule:**
  - Shapes, vertices and construction points are authored sections. Every primitive and vertex is anchored (AD-3). Shapes reference shapes by id. Exactly one shape is the outline.
  - Milestone-1 construction point kind: intersection of two lines. New kinds are added to the schema in `model`.
  - `model.resolve` is the **single shape evaluator**, using `makerjs`. The resolved shape type is **exact paths** (lines, arcs, circles). No stage re-evaluates a shape.
  - A stage that needs polygons flattens at its own boundary with the one flatten function and tolerance exported by `model`.
  - A plate is its shape minus the part cutouts whose role it includes, plus any user cutout shapes.

### AD-17: Parameters and expressions are design-wide [ADOPTED]
- **Binds:** model, editor, every authored section
- **Prevents:** per-section parameter scopes; stages evaluating expressions differently; a second expression language later.
- **Rule:**
  - The `parameters` section holds named values with units. Any length or angle property in any authored section holds a literal or an expression.
  - Grammar: numbers with units (`mm`, `u`, `deg`), parameter names, `+ - * /`, parentheses. No functions, no conditionals. One hand-written parser in `model`.
  - Units are checked; a mismatch is `unit-mismatch`. `u` resolves only on axis-tagged properties (AD-4).
  - Parameters are part of the dependency graph (AD-3).
  - Expressions are evaluated only in `model.resolve`. Stages see numbers only.

### AD-18: Case = an authored 3D operation graph [ADOPTED]
- **Binds:** model, case, editor, library
- **Prevents:** two storage shapes for templates; case logic hard-coded in the stage; a case limited to straight extrusion.
- **Rule:**
  - The `case` section is a graph of case operations with ids. Operations reference shapes by id, parameters by name, and part cutouts with target `case` (AD-5).
  - A template is inserted **once** (`insertTemplate`): it adds parameters plus editable case operations whose values are expressions over them. Milestone 1 ships one template, `tray`, in `library`.
  - The `case` stage is an interpreter of the operation graph. Adding an operation type means a schema in `model` plus an interpreter in `case`; nothing else changes.
  - Milestone-1 operation types: extrude, offset, boolean (add, subtract, intersect), z-position.

### AD-19: Keymap is firmware-neutral [ADOPTED]
- **Binds:** model, firmware, editor
- **Prevents:** firmware-specific data in the design; QMK later needing design changes; right-half keys that can't be bound.
- **Rule:**
  - The `keymap` section is a list of layers, each mapping side-qualified slot id → binding, plus a list of combos (set of side-qualified slot ids + layers → binding).
  - Bindings use **only** the vocabulary defined in `model`: `key`, `mod-tap`, `layer-tap`, `momentary-layer`, `toggle-layer`, `transparent`, `none`, and device actions `bluetooth`, `output-select`, `rgb`. The vocabulary grows by changing `model`. There is no raw firmware binding.
  - A device action whose hardware the population doesn't fit is `binding-unsupported`, naming the slot.
  - Firmware writers translate the vocabulary. A writer is a pure addition.

### AD-20: One DRC, one set of design rules [ADOPTED]
- **Binds:** drc, routing, pipeline, exports, model
- **Prevents:** routes the router calls valid failing the export gate; checkers that disagree; keep-outs that can't be adapted per design.
- **Rule:**
  - `design-rules` is an authored section: net classes (width, clearance) assigned to nets, edge clearance, and per-slot switches that disable a catalogue keep-out (e.g. the nice!nano antenna on a wired design).
  - `drc` is the only implementation of the check. Routing uses it for route validity; `pipeline` runs it as a stage for live warnings and the export gate.
  - DRC findings are `drc` violations naming the pads, connections or shapes involved.

### AD-21: One design, one electronics configuration [ADOPTED]
- **Binds:** model, every stage, exports, fixtures
- **Prevents:** a variant axis multiplying every stage, cache key and export.
- **Rule:**
  - A design has one population per side, one netlist, one routing section and one firmware.
  - Different electronics on the same layout are separate designs related by remix (AD-9). There is no variant concept in the model, file or stages.

## Consistency Conventions

| Concern | Convention |
| --- | --- |
| Naming | Glossary terms only. Packages: `@keeb-cad/<name>`. KDL node names are lowercase glossary terms. Commands are verb+noun camelCase (`setGap`). |
| Ids | Kebab-case, minted by `model`. Resolved: `<side>/<id>`. Block nodes: `<instance-id>/<block-node-id>`. Pads: `<side>/<slot-id>.<component>.<pin>`. Nets: derived from ids (AD-14). |
| Units in files | Quoted with an explicit unit or as an expression: `"19mm"`, `"1u"`, `"-15deg"`, `"wall + gap"`. |
| Violations | `{ kind, severity: error \| warning, ids, message }`. Design problems never throw. Commands that can't apply return a typed rejection. Each kind has one owner. `model`: `anchor-cycle`, `unresolvable-reference`, `unit-mismatch`, `unsupported-form`, `pitch-below-min`, `overlap`, `binding-unsupported`, `format-too-new`, `migration-failed`. `routing`: `unrouted`. `drc`: `drc`. A stage reports only its own kinds. |
| Stable outputs | Same file + same app version → same bytes for every export. No clocks, randomness, locale or random UUIDs in outputs; tool-generated ids (KiCad UUIDs) are derived from design ids. Only routes are history-dependent, and they are saved. |
| Testing | Golden fixtures: Corney Island v0.3 wired and wireless, as two designs (`fixtures/`, from `layout-model/sources/`). Internal: key positions within 0.01 mm of Ergogen. Acceptance: key centres, outline vertices, plate cutouts and case dimensions within ±0.05 mm. Every stage has golden-file tests. KiCad output opens in KiCad 10; ZMK output builds. A cross-stage netlist test enforces AD-14. LambBT and Corax56 are paper checks. |
| Editor state | UI state (selection, viewport, panels, gesture in progress) lives in Pinia, never in the design. The design store exposes `dispatch(command)`, the gesture API and read access only. |
| Monorepo | pnpm workspaces and TypeScript project references. dependency-cruiser enforces AD-10 in CI. |
| Licences | `replicad-opencascadejs` is LGPL-2.1, served as an unmodified, dynamically loaded WASM; the notice ships with the app. Footprints derived from third-party libraries carry attribution. Remix provenance carries the source licence (AD-9). |

## Stack

Verified 2026-10-24 (`stack-research.md`) and 2026-10-25 (gate re-check).

| Name | Version |
| --- | --- |
| TypeScript | ~6.0 |
| Vue | 3.5.44 |
| Vite | ^8.2 (8.3.5 current) |
| create-vue (TS, Router, Pinia, Vitest, Playwright, ESLint/Oxlint) | 3.24.0 |
| Pinia | ^4.0 (4.1.0 current) |
| vue-router | 5.4.0 |
| Vitest | ^4.1 (as the starter ships) |
| pnpm | 12.15.0 |
| dependency-cruiser | 18.7.0 |
| makerjs (maintenance mode; geometry unchanged since 0.18.1, which Ergogen uses) | 0.19.2 |
| replicad / replicad-opencascadejs | 1.2.0 / 1.1.0 |
| @bgotink/kdl (KDL v2) | 0.4.1 |
| @tarikjabiri/dxf | 2.9.0 |
| KiCad target (board format `20260206`, written literally) | 10.0.x |
| ZMK target (board names `nice_nano_v2`) | v0.3.0 |

## Structural Seed

```text
keeb-cad/
  packages/
    model/      # glossary types, stage output types, KDL schema + canonical writer + migrations,
                # expression parser, resolve (expressions, sides, frames, shapes via makerjs,
                # netlist, connections), commands, catalogue schema, keymap vocabulary,
                # case-operation schemas, flatten
    plates/     # stage: plate geometry
    pcb/        # stage: placement + key-cell and part tracks + KiCad writer
    routing/    # stage: incremental routing (worker)
    drc/        # checker library + stage: design-rule check
    case/       # stage: case-operation interpreter on replicad (worker)
    firmware/   # stage: ZMK writer (shield, physical layout, wired split, RGB, keymap)
    exports/    # packaging: DXF, SVG, gerber, drill, STEP, STL, KiCad, ZMK
    pipeline/   # orchestration, caching, workers, revision tagging, routing-section writer, export gate
    storage/    # storage interface + browser/file backends
    library/    # versioned catalogue data, footprints + attribution, case templates
    editor/     # Vue app (create-vue)
  fixtures/     # Corney Island wired + wireless designs, Ergogen reference output
```

```mermaid
graph TD
  subgraph Browser
    E[editor] --> P[pipeline]
    P --> W1[[case worker]]
    P --> W2[[routing worker]]
    E --> ST[storage: browser + file]
  end
  H[Static hosting] -.serves app + WASM.-> Browser
```

## Capability → Architecture Map

| Capability (PRD) | Lives in | Governed by |
| --- | --- | --- |
| FR-1–2 layout, anchors, chain | model | AD-3, AD-4 |
| FR-3 pitch, slot size, key cell, group and per-target overrides | model, pcb | AD-4, AD-5 |
| FR-4 form readiness | model | AD-6 |
| FR-5 variants | separate designs | AD-21, AD-9 |
| FR-6–7 shapes, anchored geometry | model | AD-16, AD-3 |
| FR-8–9 parts, cutouts, keep-outs | model (schema), library (data) | AD-5 |
| FR-10 plates | plates, exports | AD-16, AD-15 |
| FR-11 PCB, netlist, overrides | model, pcb | AD-14, AD-6 |
| FR-12 incremental routing | routing, pipeline, drc | AD-12, AD-14, AD-20 |
| FR-13 gerber + drill, KiCad escape hatch | exports, pipeline | AD-15, AD-20 |
| FR-14 tray case | case, model, library | AD-18, AD-17 |
| FR-15 ZMK firmware | firmware | AD-14, AD-15, AD-19 |
| FR-16 keymap | model, firmware | AD-19, AD-2 |
| FR-17 live propagation, warnings | pipeline, editor | AD-11, conventions |
| FR-18 file, undo, autosave, migrations | model, storage | AD-2, AD-8, AD-13 |

## Deferred

| Decision | Why it can wait | Revisit when |
| --- | --- | --- |
| **Routing spike (scheduled first):** tscircuit capacity-autorouter vs Freerouting via CheerpJ, on Corney Island: incremental routing with fixed existing routes, a pre-routed module zone, and the connection split rule (AD-14). Exit criteria: no network at runtime (CheerpJ's free licence requires loading from its servers; Freerouting is GPL-3.0); installs under pnpm strict with TypeScript 6 | Hidden behind AD-12 | First work item. If it fails, SM-3 counts the KiCad export routed outside keeb-cad as done |
| **Geometry spike (alongside):** Corney outline via makerjs within ±0.05 mm; arc booleans with coincident/tangent edges and makerjs issues #509, #377, #387, #477; outline latency on the main thread | Hidden inside `model` | First work item. Failure reopens AD-16 (the resolved shape type would change) |
| **ZMK wired split vs Corney's single-wire TRRS** (`R2: DAT`): v0.3.0 supports only two-wire full-duplex UART; half-duplex is experimental. Choose: rewire for TX/RX, hardware-test half-duplex, or BLE split | Netlist comes from catalogue pin roles either way | Before the firmware story; blocks SM-4 for the wired design |
| Gerber + drill writer: own vs `circuit-json-to-gerber`; ground pours | Hidden inside `exports` | After the routing spike |
| KiCad writer: `kicadts` vs own; KiCad schematic export | Hidden inside `pcb`; the board file suffices as escape hatch | First pcb story |
| Flatten tolerance value | Constant in `model` | Geometry spike |
| Live latency target | Needs live stages to measure | Once live stages exist |
| Corney Island's own ZMK keymap (sizes the neutral vocabulary) | Not in `layout-model/sources` | Before the keymap story |
| Footprint licence (ceoloide derivation with attribution) | Data, not structure | Before footprint library work |
| Construction point kinds beyond line intersection; averaged anchors | Corney uses intersection only | During the Corney rebuild |
| Default LED-order and MCU pin assignment rules | Overrides cover Corney (AD-14) | First netlist story |
| `split-mirrored` and `unibody` implementation | Model ready (AD-6) | When a reference board is chosen |
| MX, Choc v1, EC11, stabilisers and wide-key rules | Not needed by Corney | Milestone 2 |
| Blocks, block library, three-way merge, pull filtering | Milestone 2 (AD-9) | Milestone 2 |
| QMK writer | Pure addition (AD-19) | After milestone 1 |
| Fast 3D preview (manifold-3d); exact-arc case walls | Background case accepted (AD-11) | If case latency or STEP quality hurts |
| Publishing, accounts, git/cloud backends | Milestone 1 is personal (AD-13) | Milestone 2 |
| Static hosting, CI/deploy pipeline, environments | No backend; any static host works | Before the first public preview |
| Offline use (caching the WASM), supported-browser matrix | Personal use; current Chromium and Firefox | Before the first public preview |
| Editor views, drag semantics, expression UI, key-cell editor | UX session | Before editor stories |
| Ergogen config import | Non-goal | After milestone 1 |
| Turborepo, Vitest 5, TS 7, Vue 3.6 | Not needed yet | When speed hurts / create-vue supports them |
