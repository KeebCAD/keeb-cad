---
title: keeb-cad milestone 1
status: final
created: 2026-10-25
updated: 2026-10-30
---

# PRD: keeb-cad — Milestone 1

## 0. Document Purpose

This PRD defines milestone 1 of keeb-cad for Sergii (builder and sole user) and for the downstream UX, architecture and story work. It builds on the forge brief (`forge-keeb-cad-preserve-work`), the competitor research, the layout-model paper test (v1 model) and the architecture spine (`architecture-keeb-cad-layout-model`, updated 2026-10-25 to match this PRD). Its main job is to close the brief's gap: for every output, what the user controls and how it follows layout changes (§4.0). Glossary terms (§3) are used exactly. All assumptions were confirmed on 2026-10-25 and reconciled with the architecture spine the same day. Technical detail lives in `addendum.md`.

## 1. Vision

keeb-cad is a visual keyboard design tool where the layout is the single source of truth. Every output (outline, plate, PCB, case, firmware) is defined relative to the layout, so a change made once shows up everywhere, and nothing has to be realigned by hand.

Today a builder who wants to change an existing design (move a thumb cluster, swap MX for Choc, go wireless) faces a chain of manual edits across Ergogen config, KiCad, a CAD case and firmware, and every one of them has to agree with the others. Knowing that even a small change costs that much is what makes builders stall or fall back to handwiring. keeb-cad removes that cost. Simple changes update all outputs live; heavy work (routing and case solids) runs in the background with visible progress, and the tool never pretends routing is solved.

Milestone 1 proves the whole pipeline on one board: an existing Ergogen board (Corney Island v0.3, wired and wireless, as two designs) rebuilt visually from a blank canvas, matching its points, outline, plate and case, and carried through PCB, routing and firmware to files ready for production. LambBT and Corax56 serve as paper checks for generality: their configs are expressed in the model on paper, not rebuilt. Done means the files pass fab checks and the ZMK firmware builds; ordering and building a physical board is not required.

Positioning: *"Ergogen's power with a visual editor, all the way to gerbers, case and firmware"* (milestone 1) and *"Remix any keyboard: Choc, wireless, your thumb cluster, and everything updates live"* (milestone 2).

## 2. Target User

### 2.1 Jobs To Be Done
- Design a keyboard once and change it freely, knowing every output stays aligned without manual rework.
- Rebuild a board I like (from Ergogen) visually, without learning a config language.
- Get from a design to things I can order and flash: gerbers, plate files, case files, firmware.
- (Milestone 2) Remix a known board: other switches, wireless, a different thumb cluster.

### 2.2 Non-Users (milestone 1)
- Other builders. Demand from others is unproven; milestone 2 tests it.
- Designers who need hand-routed or hand-edited PCBs inside the tool.

## 3. Glossary

- **Design** — the single file that holds everything about one keyboard with one electronics setup. Every output is computed from it. A different electronics setup on the same layout is a separate design, made by copying.
- **Layout** — the tree of nodes in a design that places keys and parts. The tree sets which node owns which; the anchor sets where each node is placed.
- **Node** — an element of the layout: a group or a slot; a key is a slot holding the key cell. Placed by **anchor + offset** (offset, then rotate about a pivot); a node has one rotation.
- **Anchor** — the node (default: parent) a node or geometry point is positioned from.
- **Arrangement** — how a group places its children: a chain (each child relative to the previous sibling) or free.
- **Slot** — a place in the layout that holds a part. Has a size (for example 1.5u).
- **Construction point** — a helper point derived from other geometry (for example the intersection of two lines), used as an anchor for piece vertices. Not a physical part.
- **Part** — a component from the curated catalogue, placed in a slot (switch, MCU, display, TRRS jack, battery connector, power switch, reset button, screw). Parts may carry footprints, cutouts and keep-outs.
- **Key cell** — the template for what every key carries (switch footprint, diodes, LED placement and their local tracks). Can be overridden for a group of keys.
- **Module** — a ready-made board used as a part (nice!nano, nice!view).
- **Pitch** — key spacing, a layout setting separate from the switch type (which sets only the footprint and minimum pitch).
- **Form** — `split-reversible` (one geometry; one PCB, flipped for the other half), `split-mirrored` (right half derived from the left, with overrides) or `unibody`.
- **Parameter** — a named value with a unit (for example `wall = 1.2mm`), usable in any length or angle.
- **Expression** — a length or angle written with numbers, units, parameters and `+ - * / ( )` (for example `wall + gap`).
- **Piece** — a named 2D geometry of the board outline. A **derived** piece fits a group of keys (and their parts) with a margin and follows the layout. A **drawn** piece is built from **geometry operations** (key outline, primitive: rectangle, circle, polygon; boolean: add, subtract, intersect; offset: expand/shrink with corner style), stays put, and is checked against the keys' fit. **Accents** (rounded corners, cut arcs) go on top. Pieces can reference other pieces.
- **Outline** — the piece that defines the board edge. Plate, PCB edge and case derive from it.
- **Cutout** — geometry removed from a plate, PCB or case. Either part-owned (comes with a part) or user-drawn.
- **Plate** — a 2D piece exported for cutting. A design can have several.
- **Build style** — the case's live setting (tray in milestone 1), switchable at any time. The user sees and edits only its settings.
- **Recipe** — a reusable, versioned case feature with settings (for example magnet pockets). The user's own case operations form their own recipe, applied after the build style.
- **Case** — 3D solids derived from the build style plus recipes.
- **Routing** — creating PCB traces for the connections between key cells, modules and peripherals.
- **Design rules** — trace widths per net class, clearances and keep-outs that routing and the design-rule check (DRC) enforce.
- **Keymap** — what each key does, by layer. Firmware-neutral.
- **Live** — an output that updates during or right after an edit, without a separate step.
- **Escape hatch** — exporting a KiCad project to finish outside keeb-cad. The export does not stay in sync with the design.

## 4. Features

### 4.0 Control and follow matrix

What the user shapes in each output, and what happens when the layout changes.

| Output | User controls | Follows a layout change by | Update | FRs |
|---|---|---|---|---|
| Layout | Nodes, anchors, offsets, rotations and pivots; arrangements; pitch; switch type; form; key cell; slots and parts; parameters | — (source of truth) | live | FR-1–4 |
| Outline | Pieces: by default one derived piece per group of keys, joined automatically; drawn pieces with anchored vertices where the silhouette isn't a fit; accents | Derived pieces refit to the keys; drawn pieces move only where anchored to the changed nodes; a key or part sticking out is reported | live | FR-6–7 |
| Plate | Which pieces form each plate; extra user cutouts | Recomputed from its pieces plus part-owned cutouts (switch holes, screws) | live | FR-9–10 |
| PCB | Parts in slots; key cell and group overrides; per-side population; matrix, pin and LED-order overrides | Footprints and key-cell tracks move with their nodes live; nets and matrix re-derived; saved routes kept where still valid, broken connections rerouted in the background | placement + key-cell tracks live; routing background | FR-8, FR-11–13 |
| Case | Build style (tray) and its settings; the user's own case operations, applied after the style | Re-derived from the outline, part-owned cutouts (USB/MCU wall window, screws) and settings | background | FR-14 |
| Firmware | Keymap (keys, layers) | Matrix, pins and ZMK physical layout re-derived; keymap entries stay attached to their keys | live | FR-15–16 |
| Editor | Views and gestures (decided in the UX session) | Shows every output updating; background stages show progress | — | FR-17–18 |

### 4.1 Layout

**Description:** Sergii starts from a blank canvas and builds a split keyboard from groups, keys and slots using the v1 layout model from the paper test. Every node is placed relative to an anchor, so a single conceptual change (rotate a thumb cluster, shift a column) is a single edit.

#### FR-1: Build a layout from a blank canvas
The user can create a design from nothing and add groups, keys and slots placed by anchor + offset, with rotation about a pivot, in one fixed order of operations (offset, then rotation).
- Any node can anchor to any other node, not only its parent.
- Changing a node's offset moves every node and geometry point anchored to it, transitively.

#### FR-2: Arrangements
The user can arrange a group's children freely, or as a chain: each child is placed relative to the previous sibling with its own offset, rotation and pivot, which expresses cumulative stagger and splay.
- Corney Island's cumulative column stagger and 3-key thumb fan are expressible without per-key absolute coordinates.
- Placement follows one documented frame rule: a child's offset is applied in the frame of the previous sibling, then rotated about its pivot. A node has one rotation, and it carries to later siblings; a turn in the middle of a chain that must not carry is expressed by anchoring the next sibling explicitly (Corney Island's 90° far thumb key is last in its fan, so it is unaffected). The rule must reproduce Ergogen's placement within ±0.05 mm.

#### FR-3: Pitch, switch type, key size and key cell
The user can set pitch independently of switch type, set key/slot size (1u, 1.5u, …), define a key cell (switch, diodes, LED placement) that applies to every key, and override settings for a group of keys or parts (for example the outer column's switch pads, screw-hole sizes per output).
- Changing the key cell updates every key's footprints on the PCB.
- Choc v2 at 19 mm pitch (Corney Island) is expressible.

#### FR-4: Form: split-reversible now, ready for mirrored and unibody
The user can design a reversible split board: one geometry and one PCB for both halves, with per-side population differences only.
- The design model must not assume a reversible split board: the `split-mirrored` and `unibody` forms are deferred but must not require a model change. [NON-GOAL for milestone 1: mirrored and unibody editing]

#### FR-5: Second design from a copy [REVISED 2026-10-25]
The user can copy a design as a new design (`Copy design…`: new name and id, recording its source design and revision) and change its electronics: Corney Island wireless is a copy of Corney Island wired with different parts, positions and population (reset button, display, battery, power switch).
- The copy records which design and revision it came from, so milestone 2 can pull later layout changes into it (remix).
- Saving to another file (`Save to file…`) keeps the same design and id; only `Copy design…` makes a new design.
- In milestone 1, a layout change made after the copy is made in each design separately. [NON-GOAL for milestone 1: several electronics setups in one design; layout changes propagating between designs]

### 4.2 Pieces and outline

**Description:** The board outline is composed of pieces. Derived pieces fit the keys and follow the layout; drawn pieces use a small, composable set of geometry operations, the same set Ergogen uses, anchored to the layout and edited visually.

#### FR-6: Drawn pieces
The user can draw named pieces from key outlines, primitives (rectangle, circle, polygon), booleans (add, subtract, intersect) and offset (expand/shrink with corner style and fillet), and reference one piece from another.
- Corney Island's 18-vertex outline with its fillets, and LambBT's 150 mm-radius circle subtraction, are expressible (see the addendum for the operation inventory).

#### FR-7: The outline follows the keys
The user builds the board outline from pieces. By default each group of keys gets one derived piece, which fits its keys and parts with a margin, follows every layout change, and joins the others automatically. Where the intended silhouette isn't a fit, the user adds a drawn piece (FR-6) whose primitives and vertices are anchored to keys, groups, construction points or other vertices, and reusable across pieces. Accents (rounded corners, cut arcs) go on top.
- A key or part that sticks out of the outline is reported, never silently clipped.
- Moving a column moves the derived pieces with it. Drawn pieces move only where they are anchored to the moved nodes (directly or via construction points).
- Corney Island's outline is reproduced as the same shape within ±0.05 mm. If derived pieces can't match it, a drawn piece does.

**Notes:** the user writes intent (fit the keys), not construction. Drawn pieces remain because all three reference boards hand-author their outlines.

### 4.3 Parts and cutouts

#### FR-8: Parts in slots
The user can place catalogue parts in slots anchored to any node. Milestone 1's catalogue covers everything Corney Island needs: Choc v2 hotswap switch footprint, diode, per-key and underglow LEDs (wired design), nice!nano, OLED, nice!view, TRRS jack, battery connector, power switch, reset button, solder jumpers for the reversible PCB, M2 screws/standoffs. The catalogue is curated.
- A part moves with its anchor.
- Footprints come from keeb-cad's own library, likely derived from ceoloide's footprints with attribution (licence: §8 Q6).

#### FR-9: Part-owned and user cutouts
Parts bring their own cutouts (switch hole in the plate, screw holes, USB/MCU window in the case wall) and keep-outs. The user can add other cutouts as pieces subtracted with booleans.
- Moving a part moves its cutouts in plate, PCB and case together.

### 4.4 Plate

#### FR-10: Plates as pieces
The user can define one or more plates (Corney Island: front/switch plate, backplate and MCU cover) as pieces, and export each as DXF/SVG for cutting or as gerbers to fab it as a PCB (as Corney Island does).
- Plates update live when the layout or outline changes.

### 4.5 PCB and routing

#### FR-11: PCB from the design
The PCB edge comes from the outline; footprints come from key cells and slot parts; nets and the matrix are derived from the layout and population.
- Moving a key moves its footprints and updates nets without user action.
- The user can override derived matrix rows/columns, MCU pin assignment and LED chain order (Corney Island sets all three by hand).

#### FR-12: Incremental browser routing
Key-cell tracks move with their key live. Connections between key cells, modules and peripherals are routed in the browser, in the background, with visible progress. Routes are saved in the design; after a layout change, saved routes that are still valid are kept and only broken connections are rerouted.
- A route is still valid when both its endpoints are unchanged and it still passes DRC against the changed board.
- The router connects to modules only (nice!nano), not bare chips; a pre-routed zone around a module is allowed.
- Connections the router cannot complete are reported as unrouted, never hidden.
- Routing obeys design rules: power/battery net widths, module keep-outs (nice!nano antenna on the wireless design), edge clearance.
- No manual editing of board routes in milestone 1; connections between key cells, modules and peripherals are always routed automatically. A key cell's local tracks are drawn by hand in the key-cell editor. [NON-GOAL: board route editing]
- Fallback if the routing spike fails: see SM-3.

#### FR-13: Production and escape-hatch export
When routing completes, keeb-cad exports fab-ready gerbers and drill files directly. The user can always export a KiCad project instead (escape hatch).
- Gerber export is gated by a design-rule check (DRC) that passes with zero errors.
- The exported KiCad project opens in KiCad 10 without errors.

### 4.6 Case

#### FR-14: Tray build style
The user gives the case a build style; milestone 1 ships tray. The style has settings (wall thickness, PCB-to-wall gap, floor thickness, height), and the case is re-derived from them on every change. The user edits only the settings, never the style's inner operations. The style is a setting, not a one-time choice: switching it re-derives the case without losing the design.
- The user can add their own case operations on top (for example a pocket or a cut). They are kept with the design as the user's own recipe, applied after the style, and follow the layout like everything else.
- The style and every recipe are versioned. An app update never changes a saved case; moving to a newer version is the user's deliberate choice.
- The case follows the outline and part-owned cutouts, rebuilding in the background with visible progress. It exports STL and STEP.
- The operation set grows with the app (tilt, chamfer and more later); the model does not assume straight extrusion.

### 4.7 Firmware and keymap

#### FR-15: Derived firmware
Matrix, pin mapping and ZMK physical layout are derived from the design and update when it changes. Milestone 1 exports a ZMK configuration for each design, including LED (RGB) support for the wired design.
- The firmware model is firmware-neutral so QMK can be added later without design changes.

#### FR-16: Keymap editor
The user can author the keymap (keys and layers) in keeb-cad.
- The editor can express Corney Island's own ZMK keymap: its layers and the behaviours it uses.
- Keymap entries stay attached to their keys through layout changes; deleting a key deletes its entries (undo restores them).

### 4.8 Editor and design file

#### FR-17: Live propagation
Every edit propagates to all affected outputs: live stages update immediately, background stages show progress.
- No output ever shows stale results without marking them stale.
- The editor warns about design problems: overlapping keys or parts, pitch below the switch minimum, anchor cycles, unrouted connections, DRC violations.

#### FR-18: Design file and undo
The user can save and open a design as one file, and undo/redo every edit (every edit is a named command; one gesture = one undo step). The design autosaves in the browser.
- Elements keep stable IDs, so keymap entries and saved routes survive edits.
- The file is versioned; older files open through migrations.
- Everything runs in the browser; no server is required.
- Supported browsers in milestone 1: current Chromium and Firefox, on desktop. In Chromium, Save writes the design's file in place after the first save asks for a location. Firefox lacks the File System Access API, so each save downloads a file named with its revision (`<design>.rev<hash>.<ext>`) and Open uses the standard file picker. On both, browser autosave is the source of truth.

**Notes:** views, panels and the meaning of dragging a key were decided in the UX session (2026-10-26): `initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/` (DESIGN.md, EXPERIENCE.md).

## 5. Non-Goals (Explicit)
- Remixing and the block library of known boards (milestone 2).
- Choc v1, MX and Sofle thumb cluster as built references (milestone 2).
- Unibody and split-mirrored editing (model must be ready, editing deferred).
- Several electronics setups (variants) in one design; propagating layout changes between designs (milestone 2 remix).
- Manual editing or locking of board routes (key-cell local tracks are authored, see FR-12).
- QMK output.
- Ergogen config import.
- Case styles other than tray; tenting.
- Accounts, sharing, publishing.
- Importing KiCad boards.
- KLE / kle-ng format (absolute positioning; rejected in the brief).
- Bare-chip (MCU) routing; constrained routing mode.
- User-imported parts.

## 6. Cross-Cutting NFRs
- **Browser-only:** all stages, including routing and case solids, run client-side.
- **Supported browsers:** current desktop Chromium and Firefox; Firefox saves by download (FR-18). Safari and a full browser matrix wait for the first public preview.
- **Stable outputs:** the same file always reopens to the same outputs, and an edit changes only what it has to. Routes are saved in the design; expensive results (case solids) may be cached; pure derivations (outline, plate, placement, firmware matrix) are recomputed. Two separately made designs producing identical files is not a goal.
- **Live latency:** target set after measurement (§8 Q3).

## 7. Success Metrics

**Primary (check 1)**
- **SM-1:** Corney Island rebuilt in keeb-cad from a blank canvas, without config. Key centres and plate cutouts are within ±0.05 mm of its Ergogen output, and the outline and each plate are the same shape within ±0.05 mm: every point of each boundary lies within 0.05 mm of Ergogen's (footprint geometry may differ; see FR-8). Validates FR-1–FR-10.
- **SM-2:** The tray case matches Corney Island's case within ±0.05 mm on: wall thickness, PCB-to-wall gap, floor thickness, wall height, screw-hole positions and radii, and the MCU/USB wall cutout position and size (see the addendum, Tray case reference numbers). Validates FR-14.
- **SM-3:** Both designs (wired and wireless) route fully in the browser, pass DRC, and export gerbers + drill directly from keeb-cad that pass the fab's checks. If the routing spike shows that browser routing is not achievable, milestone 1 is re-scoped: it counts as done when the KiCad export, routed outside keeb-cad, produces fab-ready files. The PCB is compared with Corney Island's by parts and nets, not by copper, because keeb-cad uses its own footprint library. Validates FR-11–FR-13.
- **SM-4:** ZMK firmware for both designs builds from the export (wired design: see §8 Q2). Validates FR-15–FR-16.
- **SM-5:** A short edit script runs with zero manual fix-ups in any output: move one thumb-fan key; rotate the thumb fan; shift one column's stagger; change pitch-x, then pitch-y (each to a value at or above the switch's minimum); change a case setting. After each step, the outline, plate, PCB, case and firmware of the edited design are current (or visibly updating). One layout change updating both boards is a milestone-2 metric. Validates FR-17.

**Counter-metrics (do not optimise)**
- **SM-C1:** Corney Island-specific shortcuts. Passing SM-1 by hard-coding Corney Island shapes defeats the point; LambBT and Corax56 stay as paper checks for generality.
- **SM-C2:** Routing completion bought by loosening clearances or hiding unrouted nets.

## 8. Open Questions and Risks
1. **Browser routing (risk):** can any engine route incrementally in the browser? Spike candidates: tscircuit capacity-autorouter (TypeScript), Freerouting via CheerpJ.
2. **ZMK wired split (blocks SM-4 for the wired design):** Corney Island's TRRS link is single-wire (`R2: DAT`, tip and ring 1 joined to VCC). ZMK v0.3.0 supports only two-wire full-duplex UART wired split; half-duplex is experimental. Options: rewire the jack for TX/RX (nets then differ from Corney Island), test half-duplex on hardware, or use BLE split for the wired build. Decide before firmware work.
3. **Live latency:** measure, then set a target.
4. **Construction points:** which kinds are needed beyond line intersection (Corney Island uses intersect; averaged anchors are a candidate)?
5. **Demand from others** is unproven (research confidence medium-low; no interviews). Milestone 2 tests it.
6. **Footprint licence:** confirm the licence of ceoloide's footprints allows deriving keeb-cad's library with attribution.
7. **Split-mirrored form:** which reference board to use when it is built (Heatwave is a candidate)?
8. **Joining fitted pieces (FR-7):** how the default derived pieces join, for example whether the gap between the main keys and the thumbs is filled.
9. **Build styles and tenting in milestone 1 (FR-14, §5):** which build styles milestone 1 ships beyond tray, and whether tenting (a wedge recipe, or a stand part plus a mount recipe) is in. §5 stays as written until this is decided.
