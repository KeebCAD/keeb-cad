---
type: initiative
title: "Corney Island rebuilt visually in keeb-cad, through to files ready for production"
sources:
  - _bmad-output/prd-keeb-cad-m1/prd-keeb-cad-m1.md
  - _bmad-output/prd-keeb-cad-m1/addendum.md
companions:
  - _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
  - _bmad-output/initiative-keeb-cad-m1/component-ownership.md
after: []
risk: high
status: in-progress
---

# Corney Island rebuilt visually in keeb-cad, through to files ready for production

## Description

Milestone 1 of keeb-cad proves the whole pipeline on one board. Corney Island v0.3 is rebuilt from a blank canvas in a browser-only visual editor where the layout is the single source of truth. Outline, plates, PCB with browser routing, tray case and ZMK firmware all follow layout edits without manual realignment, and production files come out at the end. Wired and wireless are two designs: the second is a copy of the first. Scope, controls and follow behaviour come from the PRD (§4.0 control and follow matrix). The architecture spine fixes the invariants every epic shares.

## Outcome

For Sergii as builder: one layout edit updates every output of a design, and both Corney Island designs reach fab-checked gerbers and building ZMK firmware (PRD SM-1 to SM-5).

## Requirements

- R1 (prd FR-1): Build a layout from a blank canvas with groups and slots placed by anchor + offset (offset, then rotate about pivot). Any node anchors to any node, and moving a node moves everything anchored to it, transitively.
- R2 (prd FR-2): Arrange children freely or as a chain. Corney Island's cumulative column stagger and 3-key thumb fan are expressible without absolute coordinates. Each node has one rotation, carried along the chain; a mid-chain turn that must not carry uses an explicit anchor. Placement reproduces Ergogen within ±0.05 mm.
- R3 (prd FR-3): Set pitch independently of switch type, slot size (1u, 1.5u), a key cell applied to every key, and overrides per group or part. Changing the key cell updates every key's footprints. Choc v2 at 19 mm pitch is expressible.
- R4 (prd FR-4): Design a split-reversible board (one geometry, one PCB, per-side population). Split-mirrored and unibody designs load without a model change; editing them is deferred.
- R5 (prd FR-5): Copy a design (`Copy design…`) as a new design that records its source design and revision; `Save to file…` keeps the same design and id. Corney Island wireless is a copy of wired with different parts, positions and population.
- R6 (prd FR-6): Draw named pieces from key outlines, rectangle, circle, polygon, add/subtract/intersect, and offset with corner style and fillet, and reference pieces from pieces. Corney Island's 18-vertex filleted outline and LambBT's r = 150 mm circle subtraction are expressible.
- R7 (prd FR-7): The outline is built from pieces. By default each group of keys gets one derived piece that fits its keys and parts with a margin, follows every layout change, and joins the others automatically.
  - A drawn piece, anchored to keys, groups, construction points or vertices, covers a silhouette that isn't a fit. Accents go on top.
  - A key or part that sticks out of the outline is reported, never clipped.
  - Corney Island's outline is reproduced as the same shape within ±0.05 mm, by a drawn piece if derived pieces can't match it.
- R8 (prd FR-8): Place curated catalogue parts in slots anchored to any node. The catalogue covers everything Corney Island needs, with footprints from keeb-cad's own library carrying attribution.
- R9 (prd FR-9): Parts bring their cutouts and keep-outs for plate, PCB and case; user cutouts are pieces subtracted with booleans. Moving a part moves its cutouts in every output together.
- R10 (prd FR-10): Define several plates (Corney: switch plate, backplate, MCU cover) as pieces that update live. Each exports as DXF/SVG or as gerbers.
- R11 (prd FR-11): The PCB edge comes from the outline, footprints from key cells and parts, and nets and matrix from layout and population. Moving a key updates its footprints and nets. The user can override matrix rows/columns, MCU pins and LED chain order.
- R12 (prd FR-12): Key-cell tracks follow keys live, and other connections route in the browser, in the background, with progress.
  - Routes are saved in the design and kept while their endpoints are unchanged and DRC passes; only broken connections are rerouted.
  - Unrouted connections are always reported.
  - Design rules are obeyed, and a pre-routed module zone is allowed.
  - No manual editing of board routes; key-cell local tracks are drawn by hand in the key-cell editor.
- R13 (prd FR-13): Export fab-ready gerbers + drill once routing completes, gated by zero DRC errors. A KiCad export that opens in KiCad 10 is always available as the escape hatch.
- R14 (prd FR-14): Give the case a build style (tray in M1) whose settings (wall, PCB-to-wall gap, floor, height) re-derive the case on every change. Only the settings are edited, and switching style re-derives the case without losing the design.
  - The user's own case operations are their own recipe, applied after the style, and follow the layout.
  - The style and recipes are versioned; an app update never changes a saved case.
  - The case follows the outline and part cutouts, and rebuilds in the background with progress.
  - It exports STL and STEP. The operation set grows with the app.
- R15 (prd FR-15): Matrix, pin mapping and ZMK physical layout are derived from the design. A ZMK configuration is exported per design, with RGB for the wired design. The firmware model is neutral, so QMK can be added without design changes.
- R16 (prd FR-16): Author a keymap (keys, layers) that expresses Corney Island's own ZMK keymap and behaviours. Entries follow their keys; deleting a key deletes its entries, and undo restores them.
- R17 (prd FR-17): Every edit propagates to all affected outputs, live or in the background with progress. Stale results are always marked. The editor warns about overlaps, pitch below minimum, anchor cycles, unrouted connections and DRC violations.
- R18 (prd FR-18): Save and open a design as one versioned file (older files migrate), with browser autosave. Undo/redo covers every named command (one gesture = one step). Stable ids keep keymap entries and saved routes attached through edits.

## Constraints

- C1 (prd §6, FR-18): Browser-only, on current desktop Chromium and Firefox; every stage, including routing and case solids, runs client-side with no server. Firefox saves by download.
- C2 (prd §6): Stable outputs: the same file reopens to the same outputs, and an edit changes only what it must. Routes are saved, case solids may be cached, and pure derivations are recomputed.
- C3 (architecture spine): AD-1 to AD-25 bind every epic and story. Work that needs to break one goes back through `bmad-architecture`.
- C4 (prd SM-1, SM-2, SM-C1): Acceptance is against Corney Island v0.3's Ergogen output within ±0.05 mm: key centres, plate cutouts and case dimensions, and the outline and plates as the same shape (every boundary point within 0.05 mm). No Corney-specific shortcuts.
- C5 (prd §5, FR-15): ZMK is the only firmware target, and the catalogue is curated (no user-imported parts).
- C6 (prd SM-C2): Routing completion is never bought by loosening clearances or hiding unrouted connections.

## Done when

- Corney Island wired is rebuilt from a blank canvas, with key centres and plate cutouts within ±0.05 mm of Ergogen, and the outline and plates the same shape within ±0.05 mm (SM-1).
- The tray case matches Corney Island's case dimensions within ±0.05 mm (SM-2).
- Both designs route in the browser, pass DRC, and export gerbers + drill that pass the fab's checks. If the routing spike fails, the KiCad export routed outside keeb-cad producing fab-ready files counts instead. The PCB is compared with Corney Island's by parts and nets, not copper (SM-3).
- ZMK firmware for both designs builds from the export (SM-4).
- The SM-5 edit script runs with zero manual fix-ups in any output.

## Boundaries

- Out (prd §5):
  - remix and the block library; propagating layout changes between designs
  - MX, Choc v1 and the Sofle thumb as built references
  - editing unibody and split-mirrored designs
  - manual editing of board routes (key-cell local tracks are authored); QMK; Ergogen and KiCad import; KLE
  - case styles other than tray, and tenting
  - the Case workspace's Assembly view (plates and PCB at real heights), and the plate and PCB 3D bodies it needs (Decision 2026-10-26)
  - accounts and sharing
  - bare-chip routing; user-imported parts
- Editor views, panels and drag semantics were decided in the UX session (epic-platform-baseline story 5); its DESIGN.md and EXPERIENCE.md are companions of the editor epics.
- Touch point: Ergogen reference output (Corney Island) — golden comparison; owner: epic-risk-spikes
- Touch point: routing engine (tscircuit capacity-autorouter or a custom keyboard router, chosen by epic-risk-spikes) — runs in a worker; owner: epic-routing-and-fab
- Touch point: KiCad 10 — opens the board export; owner: epic-parts-and-pcb
- Touch point: fab gerber checker — accepts gerbers + drill; owner: epic-routing-and-fab
- Touch point: ZMK v0.3.0 build toolchain — builds the exported config; owner: epic-firmware-and-keymap
- Touch point: static host — serves the app and WASM; deferred to the first public preview (milestone 1 runs locally only, epic-platform-baseline Decision 2026-10-26)
- Tracer path: a blank canvas → Corney's keys → parameters and drag → the outline from pieces → plates → PCB placement and nets → ZMK firmware → browser routing, DRC and gerbers → the tray case, all from one design file, one vertical slice at a time.

## References

- prd — _bmad-output/prd-keeb-cad-m1/prd-keeb-cad-m1.md, §4.0 control and follow matrix, §4 FR-1 to FR-18, §7 success metrics, §8 open questions
- prd — _bmad-output/prd-keeb-cad-m1/addendum.md, routing candidates, tray case reference numbers, Ergogen operations
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, Invariants AD-1 to AD-25, Open Questions, Deferred
- companion — _bmad-output/initiative-keeb-cad-m1/component-ownership.md, which slice builds each shared editor component
- fixture — _bmad-output/layout-model/sources/corney-island.yaml

## Notes

- Open question: Routing engine (prd §8 Q1). Epic-risk-spikes compares tscircuit capacity-autorouter with a custom keyboard router. Freerouting is dropped as a runtime engine (see that epic's research). If it fails, SM-3 is re-scoped to the KiCad export routed outside keeb-cad. Owner Sergii; first work item.
- Open question: ZMK wired split (prd §8 Q2). Corney Island's single-wire TRRS vs ZMK v0.3.0's two-wire UART split. The options are rewiring, testing half-duplex on hardware, or BLE split. This blocks SM-4 for the wired design. Owner Sergii; decide before the firmware epic.
- Open question: Live latency target (prd §8 Q3). Measure once the live stages exist. Owner Sergii.
- Open question: Construction point kinds beyond line intersection (prd §8 Q4). Settle during the Corney rebuild.
- Open question: Footprint licence (prd §8 Q6). Confirm that ceoloide's licence allows derivation with attribution. Owner Sergii; before footprint library work.
- Open question: Joining fitted pieces (prd §8 Q8). How the default derived pieces join, for example whether the gap between the main keys and the thumbs is filled.
- Open question: Build styles and tenting in M1 (prd §8 Q9). Which build styles M1 ships beyond tray, and whether tenting is in. Boundaries keep both out until decided. R14's style switch waits on it: no slice proves switching until a second style exists.
- Decision: 2026-10-25 sliced into 10 epics by capability (one static deploy, so no package is an epic boundary); risk first: platform baseline and risk spikes open, milestone acceptance closes.
- Decision: 2026-10-25 the catalogue schema with the Choc v2 switch and M2 screw cutouts moves into epic-layout so plates get part cutouts before epic-parts-and-pcb.
- Decision: 2026-10-25 epic-design-document owns the worker harness, every AD-8 section skeleton and the export registry, so routing, case and firmware don't collide in `model`.
- Decision: 2026-10-25 the UX session runs inside epic-platform-baseline; epic-layout waits on it.
- Decision: 2026-10-25 Corney's TRRS nets are derived unchanged in epic-parts-and-pcb; a later rewire changes only the jack's catalogue pin roles.
- Decision (2026-10-26): epic-layout split at refinement into epic-layout (placement model, headless Ergogen match) and epic-layout-editor (id 11, the Layout workspace UX), because it ran to about 15 stories. epic-shapes-and-plates now also waits on epic-layout-editor for the 2D canvas.
- Decision (2026-10-26): the 3D case viewer (EXPERIENCE.md › Workspace-specific › 3D viewer) is in M1, as an epic-tray-case requirement, because editing case operations blind fails FR-14's intent. The Assembly view and its plate and PCB 3D bodies are deferred past M1; SM-2's numeric case check stands in for the fit check. bmad-architecture adds the 3D library to the Stack in the same run as the 2D renderer.
- Decision (2026-10-26, initiative item 4): split-reversible stays the M1 form (FR-4, AD-6, SM-3 unchanged). Deferring it would mean building split-mirrored instead, breaking SM-3's parts-and-nets comparison with Corney's reversible PCB and doubling boards and fab orders. Revisit at the routing verdict (epic-risk-spikes story 13): if reversible Corney does not route in the browser, weigh split-mirrored then, with evidence.
- Decision (2026-10-26, initiative item 5): PRD wording follows the UX (EXPERIENCE.md › Upstream Handoffs). Apply through a bmad-prd update, then re-derive R5, R12, C1 and Boundaries from it:
  - FR-5: "The user can copy a design as a new design (`Copy design…`: new name and id, recording its source design and revision) and change its electronics … Saving to another file (`Save to file…`) keeps the same design and id." R5 and epic-design-document say "Copy design" instead of "Save As"; the architecture's term follows at its next run.
  - FR-12 and §5: "No manual editing of board routes in milestone 1; connections between key cells, modules and peripherals are always routed automatically. A key cell's local tracks are drawn by hand in the key-cell editor." §5: "Manual editing or locking of board routes (key-cell local tracks are authored, see FR-12)." R12 and Boundaries reword the same way.
  - SM-5: "… shift one column's stagger; change pitch-x, then pitch-y (each to a value at or above the switch's minimum); change a case parameter …"
  - FR-18 and §6, new: "Supported browsers in milestone 1: current Chromium and Firefox, on desktop. In Chromium, Save writes the design's file in place after the first save asks for a location. Firefox lacks the File System Access API, so each save downloads a file named with its revision (`<design>.rev<hash>.<ext>`) and Open uses the standard file picker. On both, browser autosave is the source of truth." C1 gains "current desktop Chromium and Firefox". Safari stays out (architecture Deferred, supported-browser matrix).
- Decision (2026-10-26, architecture update, commit 15bf969): the architecture queue is settled. 2D canvases are SVG drawn by Vue, with one shared viewport (AD-22, Konva as the Deferred fallback for PCB copper). The Case 3D viewer is three.js + replicad-threejs-helper in a new `viewer3d` package (AD-22, AD-11; Glossary: 3D viewer, body). Keymap layers have stable ids; deleting a referenced layer is rejected, naming the slots and combos (AD-19). `construction-undefined` is a `model` error. AD-13 gains `listDesigns`, and opening a file never overwrites a newer stored copy. `unresolvable-reference` is a warning for a missing key cell, an error otherwise. AD-9 says Copy design. Every export but the KiCad board is blocked by a `model` error in its slice (AD-15). Each gated epic carries its line.
- Decision (2026-10-26): epic-design-document split at refinement into epic-design-document (headless core) and epic-editor-shell (id 12: chrome, expression field, Parameters UI), because it ran to about 16 stories. epic-layout waits only on the headless core; epic-layout-editor now waits on epic-editor-shell.
- Decision (2026-10-30, replan): the approach directions in `_bmad-output/architecture-keeb-cad-layout-model/directions-2026-10-30.md` (status proposed) change what is required. R7 (every vertex anchored), R14 (a tray template whose operations are edited) and the outline-vertex wording in C4 and Done when (SM-1) are contradicted. R1, R5, R6, R9, R10 and R18 are extended. Those requirements are not rewritten yet. Order: a code-decisions session, then bmad-architecture folds the directions into the spine, then a bmad-prd update for FR-7, FR-14 and SM-1, then these requirements are re-derived. Affected epics carry a matching note.
- Decision (2026-10-30, replan): the build order changes to vertical slices named by capability (code-decisions item 12; the spine fold f6bf8a2 also invalidates planned entries such as 3.4 and 3.5). Each slice is an epic. The layered epics (design-document, editor-shell, layout, layout-editor) are dropped; their planned entries, none started, move into the first slice that needs them and are re-checked against the spine. Done epics stay. Rejected: slices as story orderings inside a few capability epics (an epic's Done when would no longer mean one slice works end to end).
- Decision (2026-10-30, replan): shared editor components are built once and owned. Slice 1 builds the frame every slice sits in (global chrome with workspace tabs, docked right panel, status strip, canvas with viewport and selection). Every other component in DESIGN.md › Components is built by the first slice that needs it, as its own story; a companion ownership map names each component's owning story, and later slices declare `after` on it and extend it, never re-implement it. 'No second implementation of a DESIGN.md component' goes into the reviewers' rules file (spine Agents convention). Rejected: an editor-shell epic first (the layered order item 12 rejected; chrome built against guesses).
- Decision (2026-10-30, replan): slice order, each an epic: see Corney's keys (with the editor frame) → change a parameter → drag keys → keep my work → outline follows the keys → draw custom pieces → plates to DXF → footprints on the PCB → nets and matrix → firmware and keymap → route and fab → tray in 3D → my own case operations → wireless copy → milestone accepted. Changed from the room's sketch: 'keep my work' added (R18 had no slice); outline split into derived and drawn pieces; 'switch style' replaced by 'my own case operations' until prd §8 Q9 adds a style; case moved after the PCB (tray walls offset the PCB edge, part cutouts and envelopes come with parts); firmware before routing (small, forces prd §8 Q2 early).
- Decision (2026-10-30, replan): every slice's Done when runs its capability on Corney Island through the layout-command script (spine Fixtures) and checks the slice's own invariants; golden comparisons with Ergogen within ±0.05 mm run only in milestone accepted (code-decisions item 13). A spike may compare (slice 'outline follows the keys' opens with one). Rejected: a golden comparison per slice (contradicts item 13; drag, undo and keep-my-work have nothing to compare).
- Decision (2026-10-30, replan): the re-slice supersedes the 2026-10-25 homes for the catalogue schema (now 'plates to DXF'), the worker harness (now 'route and fab', the first background stage) and the export registry (now 'plates to DXF', the first export), and the 2026-10-26 split decisions for epic-layout and epic-design-document (both dropped). Declined from the tree check: 'route and fab' after 'firmware and keymap' (both need only nets; `after` holds prerequisites, build order already puts firmware first).
- Decision (2026-10-30, replan): the catalogue schema (14.7) moved into 'change a parameter', because pitch-below-min and overlap need the switch's minimum pitch and envelope; it no longer waits for 'plates to DXF'. Moved entries' stale prerequisites were repointed to the new order. Five epic prerequisites (plates on drawn pieces, route on nets, wireless on case, firmware and route) are pinned when those slices plan their stories; no planned entry needs them yet.
