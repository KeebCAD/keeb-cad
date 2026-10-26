---
type: epic
title: "Corney Island's layout built on the Layout canvas"
parent: initiative-keeb-cad-m1
covers: [R1, R2, R3, R4, R8, R17]
sources: [_bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md]
companions: [_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md, _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md]
after: []
refined: true
risk: medium
---

# Corney Island's layout built on the Layout canvas

## Description

The Layout workspace edits epic-layout's model visually, as EXPERIENCE.md specifies. Both halves are drawn, with per-side population editing. Keys and groups drag by the chain rule, with Alt compensating, and write back to the last literal term. The rotation handle, nudge and rotate keys, the 2D pointer map and selection, the anchor picker with re-anchoring, inspector and Design settings expression fields, the Part picker and the violations panel complete it. The 2D canvas, shared viewport, selection and pick modes are reused by the Shapes, PCB and Firmware workspaces.

## Outcome

Sergii builds Corney Island's key layout from a blank canvas in the Layout workspace, and every edit follows live (SM-1 "rebuilt visually", keys part; SM-5 move, rotate, stagger and pitch steps).

## Requirements

- R1 (parent R1, R2; EXPERIENCE.md › Interaction Primitives › 2D pointer map, Chain drag rule, Multi-selection): The Layout canvas adds groups (G) and slots (S), duplicates and deletes them. Left-drag on a key moves it, and on a group frame's tab moves the group, through epic-layout's move commands; Alt-drag (Ctrl-drag as the fallback) compensates the next step. Click, Shift-click and box drag select. Wheel zooms to the cursor; middle drag, Space drag and the trackpad pan; F fits. Tree and canvas selection stay synced, and the viewport is shared across the 2D workspaces. One gesture is one undo step.
- R2 (parent R1, R2; EXPERIENCE.md › Canvas › Rotation handle, Interaction Primitives › Nudge, Rotate): The rotation handle rotates a key or group about its pivot, with a delta readout; Shift snaps to 5°. `[` and `]` rotate 1° (Shift 5°). Arrows nudge 0.25 / 1 / 0.05 mm, set in the nudge-step control; Alt+arrow compensates. A burst is one gesture. These keys act only while the canvas has focus.
- R3 (parent R1; EXPERIENCE.md › Fields and pickers › Anchor picker, Interaction Primitives › Re-anchor, Pick modes): The anchor picker sets an anchor by clicking a target and an attach point (3×3 grid or canvas), or by typed id and Tab; targets that would create a cycle are dimmed. Re-anchoring keeps the node in place, flattens its offsets and says so in a toast. There is no drag-to-anchor.
- R4 (parent R3; EXPERIENCE.md › Panels and overlays › Inspector, Fields and pickers › Design settings, Expression field): The inspector shows the selection's anchor, offset, chain, population, part and key cell, lengths and angles as expression fields, with `mixed` for differing values. With nothing selected, Design settings show the form (read-only), `pitch-x`, `pitch-y` and the default key cell; a group shows pitch and key-cell overrides with `inherits <value>`. An invalid value, such as `u` on rotation, shows its error and the canvas keeps the last valid value.
- R5 (parent R4; EXPERIENCE.md › Information Architecture › Both halves, Fields and pickers › Population toggle): Both halves are drawn. The right half reads as derived (dashed mirror axis, lower opacity until selected), is selectable, and its geometry fields are read-only with `derived from left/<id>`. `Fitted: left / right` sets population per side, one undo step for a multi-selection.
- R6 (parent R8; EXPERIENCE.md › Fields and pickers › Part field): P places a slot with the Part picker open. The Part field searches the catalogue by name; changing a part is one undo step.
- R7 (parent R17; EXPERIENCE.md › Panels and overlays › Violations panel, Canvas › Canvas marks): Layout violations show on the canvas (overlap outlined solid for an error, dashed for a warning; the anchor-cycle path; ●/▲ on ids) and in the violations panel (V), grouped by workspace and kind, errors first. A click selects the named ids, fits and flashes them; F8 and Shift+F8 step through them. A violation leaves only when fixed.
- R8 (EXPERIENCE.md › Interaction Primitives › Shortcuts, Focus and regions, Esc precedence, Accessibility Floor; DESIGN.md › Colors, Components): Shortcuts bind physical keys and are off while a field has focus. Esc does the innermost step. The focused canvas shows its ring. Reduced motion is honoured. Canvas marks reach 3:1 contrast in both themes, and handles keep the canvas hit radius at any zoom. Alt-drag and the Ctrl chords are checked by hand in Chromium and Firefox.

## Constraints

- Initiative C1 (browser-only) and C3 (the architecture spine binds) bind this epic.
- Desktop Chromium and Firefox, mouse or trackpad and keyboard, at a 1366×768 floor (EXPERIENCE.md › Foundation).

## Done when

- Corney Island's key layout is built from a blank canvas in the Layout workspace and its key centres match the Ergogen fixture within ±0.05 mm.
- Dragging, nudging or rotating a node moves everything anchored to it live, and one gesture is one undo step.
- Overlap, anchor-cycle and pitch-below-min violations show on the canvas and in the violations panel with node ids, and click through to the named nodes.
- The right half is drawn, selectable and population-editable, with its geometry fields locked.

## Boundaries

- Out: the layout model and its violations (epic-layout).
- Out: the shared chrome and the expression field component (epic-editor-shell).
- Out: the Shapes, PCB, Case and Firmware workspaces (their epics), which reuse this epic's canvas.
- Out: the Outline context line (epic-shapes-and-plates, where the outline first exists) and the inspector's `Edit key cell` link (epic-parts-and-pcb, with isolated cell mode).

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- design — _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md
- design — _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md, Interaction Primitives, Component Patterns › Canvas, Fields and pickers, Panels and overlays › Violations panel
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Waits on epic 1 because: the UX session result
- Waits on epic 12 because: the editor chrome and the expression field
- Waits on epic 4 because: the layout model and its violations
- Decision (2026-10-26): the shared editor chrome goes to epic-design-document, not to this epic: workspaces 1–5 with their empty states, hybrid panels and slide-out, status strip and tab badges, Ctrl+K palette, context menu, cheat sheet, F6 regions, Start screen, File menu, banners and toasts (EXPERIENCE.md › Global chrome, Panels and overlays). This epic owns the canvas, the Layout workspace and the violations panel, since it emits the first violations.
- Decision (2026-10-26): the expression field component (live preview, error underline and message, autocomplete, `Create parameter…`, Ctrl+click to a parameter) is built in epic-design-document, beside its evaluator and the Parameters slide-out. This epic uses it in the inspector: anchor, offset, chain and pitch fields, drag/nudge/rotate write-back to the last literal term, and `unit-mismatch` (EXPERIENCE.md › Fields and pickers, Interaction Primitives › Write-back).
- Decision (2026-10-26): split from epic-layout at its refinement (see that epic's Notes).
- Decision (2026-10-26): split-reversible stays the M1 form (see epic-layout's Notes); entry 8 keeps the right half's geometry locked.
- Decision (2026-10-26): the 2D canvas rendering technology (SVG, Canvas 2D or WebGL) goes to bmad-architecture as a Stack entry, in the same run as the 3D library question (initiative item 3). It should not wait for the 3D scope decision.
- Unknown: the 2D canvas rendering technology, from that architecture run. Every canvas story of this epic waits on it.
- Decision (2026-10-26): the Outline context line moves to epic-shapes-and-plates, since no outline exists before that epic; the inspector's `Edit key cell` link moves to epic-parts-and-pcb, with isolated cell mode.
- Decision (2026-10-26): tracer bullet is entry 1 (the Layout canvas shows resolved keys and adds groups and slots). Entry 2, the chain-rule drag with Alt compensation, is the least certain and comes next. Violations and both halves run late because they wait on epic-layout 4.7 and 4.6.
- Decision (2026-10-26): the Part picker's rows preview the part's envelope outline and cutouts (entry 5); epic-parts-and-pcb swaps in the footprint preview.
- Decision (2026-10-26, initiative item 8): entry 10 reviews the UX assumptions and bundles after the Corney layout rebuild, not at milestone acceptance, so the chrome and later workspaces build on settled decisions. It runs after epic-layout-editor, the first point where the editor is usable, rather than after epic-layout, which has no UI since the split.
- Decision (2026-10-26): the chrome and the expression field now come from epic-editor-shell (split from epic-design-document at its refinement); the two decisions above stand with that epic in place of epic-design-document.
