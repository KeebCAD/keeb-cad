---
type: epic
title: "Corney Island's layout built on the Layout canvas"
parent: initiative-keeb-cad-m1
covers: [R1, R2, R3, R4, R17]
sources: []
companions: [_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md, _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md]
after: []
refined: false
risk: medium
---

# Corney Island's layout built on the Layout canvas

## Description

The Layout workspace edits epic-layout's model visually, as EXPERIENCE.md specifies. Both halves are drawn, with per-side population editing. Keys and groups drag by the chain rule, with Alt compensating, and write back to the last literal term. The rotation handle, nudge and rotate keys, the 2D pointer map and selection, the anchor picker with re-anchoring, inspector and Design settings expression fields, the Part picker, the Outline context line and the violations panel complete it. The 2D canvas, shared viewport, selection and pick modes are reused by the Shapes, PCB and Firmware workspaces.

## Outcome

Sergii builds Corney Island's key layout from a blank canvas in the Layout workspace, and every edit follows live (SM-1 "rebuilt visually", keys part; SM-5 move, rotate, stagger and pitch steps).

## Done when

- Corney Island's key layout is built from a blank canvas in the Layout workspace and its key centres match the Ergogen fixture within ±0.05 mm.
- Dragging, nudging or rotating a node moves everything anchored to it live, and one gesture is one undo step.
- Overlap, anchor-cycle and pitch-below-min violations show on the canvas and in the violations panel with node ids, and click through to the named nodes.
- The right half is drawn, selectable and population-editable, with its geometry fields locked.

## Boundaries

- Out: the layout model and its violations (epic-layout).
- Out: the shared chrome and the expression field component (epic-design-document).
- Out: the Shapes, PCB, Case and Firmware workspaces (their epics), which reuse this epic's canvas.

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- design — _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md
- design — _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md, Interaction Primitives, Component Patterns › Canvas, Fields and pickers, Panels and overlays › Violations panel
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md

## Notes

- Waits on epic 1 because: the UX session result
- Waits on epic 3 because: the editor chrome and the expression field
- Waits on epic 4 because: the layout model and its violations
- Decision (2026-10-26): the shared editor chrome goes to epic-design-document, not to this epic: workspaces 1–5 with their empty states, hybrid panels and slide-out, status strip and tab badges, Ctrl+K palette, context menu, cheat sheet, F6 regions, Start screen, File menu, banners and toasts (EXPERIENCE.md › Global chrome, Panels and overlays). This epic owns the canvas, the Layout workspace and the violations panel, since it emits the first violations.
- Decision (2026-10-26): the expression field component (live preview, error underline and message, autocomplete, `Create parameter…`, Ctrl+click to a parameter) is built in epic-design-document, beside its evaluator and the Parameters slide-out. This epic uses it in the inspector: anchor, offset, chain and pitch fields, drag/nudge/rotate write-back to the last literal term, and `unit-mismatch` (EXPERIENCE.md › Fields and pickers, Interaction Primitives › Write-back).
- Decision (2026-10-26): split from epic-layout at its refinement (see that epic's Notes).
- Open question: reversibility (see epic-layout's Notes). It changes this epic's both-halves and population story.
