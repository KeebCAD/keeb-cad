# Input reconciliation: architecture spine vs PRD milestone 1

- **Input:** `_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md` (status final, 2026-10-24; context only, written from the brief, known gaps)
- **Against:** `prd-keeb-cad-m1.md`, `addendum.md`, `.memlog.md` (PRD decisions are authoritative)
- **Date:** 2026-10-25

Part A lists PRD requirements that contradict an architecture decision (AD) and will force the architecture to change. Part B lists capabilities that the architecture covers and the PRD drops without saying so. Part C lists smaller drift items. Each item has a suggested resolution.

---

## A. PRD requirements that contradict the architecture (architecture update required)

### A1. Authored, anchored outline shapes vs a derived board outline (high)
- **Architecture:** Glossary "board outline = the **derived** polygon(s) that bound a side". AD-10 lists the board outline as a shared derivation computed in `model.resolve`. The design tree has no geometry nodes, only group, sequence and slot.
- **PRD:** FR-6 and FR-7, plus §4.0. Named **shapes** are *authored* from geometry operations (key outline, rectangle, circle, polygon, add/subtract/intersect, offset with corner style or fillet). Shapes can reference other shapes, and every primitive and polygon vertex is anchored to a node. The memlog source check confirms that all three reference boards author the outline by hand.
- **Forces:**
  - a new shape/geometry sub-tree in the design file and schema (AD-8)
  - anchors for geometry points, not only nodes, which extends AD-3 to points
  - an acyclic shape-reference graph, alongside the anchor graph
  - `resolve`, or a new shape stage, to evaluate the shape graph with clipper2
  - new commands for shape editing
  - a glossary rewrite: "board outline" becomes a named shape chosen as the outline
  - cache keys (AD-11) that cover shape dependencies
- **Related:** FR-10 asks for **several plates**, each defined as shapes. The architecture's `plate` stage assumes a single plate.

### A2. Variants (high)
- **Architecture:** There is no variant concept. AD-14 has "**the one** matrix". The stage signature is `(resolved) → {output, violations}`. Population differences exist only per side (AD-6 `populate`).
- **PRD:** FR-5, FR-11 and FR-15. A design holds several variants (Corney Island wired and wireless) on one layout. Each variant has its own population, PCB, firmware and nets. A layout change updates every variant.
- **Forces:**
  - a variant entity in the design
  - population becoming per variant × per side
  - a matrix and netlist per variant (wired has TRRS and an LED chain; wireless has battery, power switch and nice!view)
  - a stage signature that is variant-parameterised, e.g. `(resolved, variantId)` or `resolved.variants[]`
  - cache keys and revision tagging per variant
  - exports per variant
  - the AD-14 golden test running per variant
  - a decision on whether the case and plates can vary by variant (the MCU window and nice!view cover differ)

### A3. Gerbers and drill files exported in-app (high)
- **Architecture:** AD-15 says "Gerbers are produced from the KiCad project **outside** keeb-cad". Deferred lists "Gerbers inside keeb-cad: Milestone 2". The KiCad project is the primary PCB output.
- **PRD:** FR-13 and SM-3. When routing completes, keeb-cad exports fab-ready gerbers and drill files directly, and KiCad becomes the fallback. Done means the files pass the fab's checks.
- **Forces:** a gerber and Excellon writer stage (or extending `exports`), copper pours and zones, silkscreen and mask, board-edge layers, and in practice an in-app DRC so that "fab-ready" can be claimed. Without a DRC, files that pass fab checks are luck. Update AD-15 and remove the deferred row.
- ☝️ SM-3 already allows "or, if not, the gap is reported and the KiCad export works". So the FR states a hard requirement while the metric accepts the fallback. Decide which one is binding before the architecture takes on a gerber writer plus DRC.

### A4. Incremental routing vs a pure, derived, deterministic routing stage (high)
- **Architecture:** AD-12 says routing is a derived result of pcb placement plus switch-cell tracks. AD-1 says only the design is persisted. The Determinism convention says the same revision gives the same bytes.
- **PRD:** FR-12 and §4.0. After a layout change, traces that are still valid are kept and only broken connections are rerouted.
- **Forces:** the routing stage's input becomes the previous routing result as well as placement, so it is no longer a pure function of the revision. Choose one:
  - (a) Persist routing in the design file. This makes it state, which conflicts with AD-1 "outputs are derived".
  - (b) Keep it as a session-only cache. Then reload means a full reroute and possibly a different result.
  - (c) Define incrementality as a performance optimisation whose output must equal a from-scratch route. This is unlikely with real autorouters.
- ☝️ PRD §7 "deterministic outputs: same design → same files" together with FR-12 incremental routing is internally contradictory unless routes are persisted. Two users, or two sessions, that reach the same design by different edit histories would get different gerbers. The PRD must choose: either routes become persisted design state, or determinism is scoped to "same design + same routing state".

### A5. Keymap authored in the design (medium)
- **Architecture:** Firmware is a pure derived stage. The design file has no keymap, layers or behaviours, and there are no keymap commands.
- **PRD:** FR-16 has a keymap editor (keys and layers). FR-15 requires a firmware-neutral model. §4.0 says keymap entries stay attached to their keys.
- **Forces:**
  - a keymap section in the design schema, keyed by slot **id** (this relies on AD-8 stable ids)
  - keymap commands (setBinding, addLayer, …)
  - a firmware-neutral behaviour vocabulary
  - a rule for slots that are deleted or added (what happens to orphaned bindings)
  - a rule for how variants interact with the keymap: one shared keymap, or one per variant? Wired has RGB keys and wireless has BT and output-select keys.

### A6. ZMK only, with LED/RGB, vs ZMK + QMK (low to medium)
- **Architecture:** AD-15 and the Stack table put ZMK v0.3.0 **and** QMK `keyboard.json` 0.34.x in milestone 1.
- **PRD:** FR-15 and §5. ZMK only. QMK is a non-goal but must be addable later without design changes. Milestone 1 also needs **RGB/underglow (SK6812mini-e)** for the wired variant, plus a ZMK TRRS/UART wired split (open question 2).
- **Forces:**
  - removing QMK from AD-15 and the Stack table
  - adding ZMK RGB config generation
  - splitting `firmware` into a neutral firmware model plus a ZMK writer, so that QMK stays a pure addition
  - a verified ZMK version for the wired split, which may move the pinned v0.3.0

### A7. User-editable, extensible 3D operations for the case (medium)
- **Architecture:** `case` is a pure replicad stage with no user-authored case data in the design. The only user input implied is the outline.
- **PRD:** FR-14. A tray **template** with parameters, which the user can "open" to edit the underlying operations (extrude, offset, boolean, z-position). The operation set must be extensible (tilt, chamfer, loft).
- **Forces:**
  - a case operation graph stored in the design (template instance + parameters + editable operations), with a schema and migrations
  - the case stage acting as an interpreter of that graph
  - commands for case editing
  - an extensibility point in `model` for new 3D operation types
  - case operations referencing named 2D shapes (from A1) and part-owned 3D cutouts (the USB/MCU wall window)
- 📐 "Open the template to edit its ops" means a template is either a macro that expands into operations (and then loses its parameters) or a live parametric node whose operations are read-only. The architecture needs to know which.

### A8. Any node can anchor to any node (medium)
- **Architecture:** AD-3 says "Only children of a `free` group, top-level groups, and inserted blocks may set an anchor."
- **PRD:** FR-1 says "Any node can anchor to any other node, not only its parent." FR-7 adds geometry vertices, and FR-8 parts anchored to any node.
- **Forces:** relax AD-3, or narrow FR-1. If sequence children can set an anchor, it collides with the AD-4 step rule (two placement sources for one node). The likely resolution is to keep AD-3 for sequence children and state this explicitly in FR-1.

### A9. Catalogue and netlist scope beyond the matrix (medium)
- **Architecture:** The AD-5 milestone-1 catalogue is MX, Choc v1 and Choc v2, stabilisers, wired and wireless MCU, battery connector, power switch, reset button, EC11 and M2 screw. AD-14 owns only the **matrix** nets.
- **PRD:** FR-8 covers Choc v2 hotswap, diode, per-key and underglow LEDs, nice!nano, OLED, nice!view, TRRS jack, battery connector, power switch, reset button, M2 screws and standoffs. MX, Choc v1 and the encoder move to milestone 2.
- **Forces:**
  - catalogue entries for displays, TRRS, LEDs and standoffs
  - an owner for **non-matrix nets**: the LED data chain, power and ground, display bus, TRRS/UART and battery. No AD assigns these. Today `pcb` would invent them, which breaks the AD-10 rule that shared derivations live only in `resolve`.
  - part-owned **cutouts and keep-outs per target** (plate, pcb, case) in the catalogue schema (FR-9). AD-5 lists only footprint, minimum pitch, pins and 3D envelope.

### A10. Fixtures and tolerance (low)
- **Architecture:** Corney Island, LambBT and Corax56 are golden fixtures, with key positions within **0.01 mm**.
- **PRD:** Only Corney Island is built. Key centres, **outline vertices, plate cutouts and case dimensions** are checked within **±0.05 mm**. LambBT and Corax56 stay as paper checks (SM-C1).
- **Forces:** align the tolerance (0.01 mm for points is still a stricter internal test; ±0.05 mm is acceptance) and add golden tests for outline, plate and case.

---

## B. Capabilities in the architecture that the PRD drops without saying so

| # | Architecture capability | Where | PRD status | Why it matters for milestone 1 |
|---|---|---|---|---|
| B1 | **Command model:** a named command is the only way the design changes. Commands that can't apply return a typed rejection. | AD-2 | FR-18 states undo and "one gesture = one undo step" only | Undo, keymap and routing stability all depend on it. It belongs as an NFR or constraint, otherwise the editor can mutate the design directly. |
| B2 | **Stable ids** that survive renames, moves and edits | AD-8, AD-3, AD-6 | Implied by FR-16 ("keymap entries stay attached") and FR-12 (keep valid routes), never stated | Keymap, variants, routing reuse and anchors all depend on it. Make it explicit. |
| B3 | **Format version + migrations** on load | AD-8 | Dropped | A personal tool still has to open last month's file after the schema changes. Shapes, variants, keymap and case operations will churn the schema heavily. |
| B4 | **Canonical writer, byte-stable round trip, diffable file** | AD-8 | Dropped | Needed for meaningful revisions and cache keys (AD-11), and for git-friendly designs. |
| B5 | **Browser autosave**, one editing tab, others read-only | AD-13 | Dropped (FR-18 only covers save/open of a file) | Losing work is the top risk for a browser-only tool. Two tabs overwriting each other. |
| B6 | **Outputs never edited in-app; export stops syncing** | AD-1 | Partly kept: escape hatch for KiCad only (glossary) | State the rule for every output, including plates and case STEP. Under A7, editing case operations is design editing, not output editing. Say so. |
| B7 | **Violation reporting** with node ids: pitch-below-min, overlap, unresolvable-anchor, anchor cycles, merge-conflict, unrouted | Conventions, AD-5, AD-3 | Only "unrouted" is kept (FR-12) | Overlaps, keep-out collisions, pitch below the switch minimum and anchor cycles become possible as soon as FR-1 frees anchoring. The user needs to see them, and "design problems never throw" keeps the live preview alive. |
| B8 | **Determinism details:** no clocks, randomness or UUIDs; KiCad UUIDs derived from node ids | Conventions | Reduced to one NFR line | See A4. Gerber and KiCad writers commonly embed timestamps. |
| B9 | **Matrix assignment rule + per-slot row/column overrides; firmware matrix == PCB nets test** | AD-14 | PRD says "derived" only. §4.0 gives the user no control over the matrix or MCU pin assignment. | Corney Island's real matrix and pinout must be reproducible. The user needs overrides for rows, columns and pins, which are missing from the control matrix. |
| B10 | **Revision tagging and live vs background split; background stages start on commit or after a debounce; a newer revision cancels them** | AD-11 | FR-17 covers "never show stale as current" | Mostly covered. The cancellation and debounce behaviour is not stated. |
| B11 | **Coordinate convention** (y up internally; each stage flips at its own output) | AD-7 | Dropped | Internal. Fine for an architecture-only rule; no PRD change needed. |
| B12 | **Wide keys need a stabiliser** | AD-5 | Dropped | Corney Island has no wide keys. Acceptable to defer, but say so. |
| B13 | **No network calls; library bundled; LGPL notice for replicad** | AD-13, Conventions | "Browser-only" kept; licence dropped | Low. |

---

## C. Drift and smaller items

- **Glossary clash.** The architecture's principle is "one word, no synonyms". The two documents differ:
  - "key cell" (PRD) vs "switch cell" (architecture)
  - "chain/sequence" (PRD) vs "sequence"
  - node = "group, key, or slot" (PRD) vs "group, sequence, slot" (architecture), so "key" is an extra node type in the PRD
  - "layout" (PRD) has no architecture term
  - "board outline" (architecture) vs "outline" (PRD)

  Pick one set before stories.
- **Blocks and three-way merge (AD-9)** are architecture scope for milestone 1, but the PRD makes them a milestone-2 non-goal. The architecture can defer AD-9. Stable block-instance ids can stay as a design rule.
- **Unibody-ready (FR-4).** The architecture's glossary defines "side" as a top-level group for one hand and mirrors around the group `center`. Check that a design with a single unibody top-level group is valid without a model change.
- **Averaged anchors** are deferred in the architecture and an open question in the PRD (Corney screws). These are consistent, but the screws may force them into milestone 1.
- **Mirrored side mode** is untested in both documents. They are consistent.
- **Routing spike (architecture Deferred)** must now also test incremental reuse (addendum). Add this to the architecture's deferred row.

---

## Suggested order for the architecture update
1. A4 (routing state and determinism): this is a PRD-level decision first.
2. A2 (variants): it affects the stage signature, the matrix and cache keys.
3. A1 (shapes) together with A8 (anchor rules): the new design-tree sections.
4. A5 and A7 (keymap and case operations as authored design data): schema and commands.
5. A3 (gerbers + DRC): settle the conflict between the FR and SM-3 first.
6. A9, A6, A10 and part C: catalogue, nets, firmware target, fixtures, glossary.
7. Promote B1 to B5, B7 and B9 into the PRD as constraints or NFRs (or confirm with the user that they were dropped on purpose).
