---
type: epic
title: "A design file that saves, reopens and undoes"
parent: initiative-keeb-cad-m1
covers: [R5, R17, R18]
sources: [_bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, _bmad-output/prd-keeb-cad-m1/prd-keeb-cad-m1.md]
companions: [_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md, _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md]
after: []
refined: true
risk: medium
---

# A design file that saves, reopens and undoes

## Description

Headless: a design opens, autosaves, saves to a file and reopens byte-identical, and Copy design records provenance. Every change is a named command with undo/redo. Parameters and expressions evaluate. The pipeline tags outputs by revision, marks stale ones, and runs background workers with progress and cancel. Every AD-8 section has its schema skeleton and the export registry exists, so later epics fill sections in without colliding.

## Outcome

Every later epic edits the design through commands and sees revision-tagged outputs, without inventing its own persistence or pipeline.

## Requirements

- R1 (parent R18; architecture AD-8): A design is one canonical KDL v2 file with a `format-version` and the 14 sections in AD-8 order, each with its schema skeleton in `model`. The canonical writer fixes order and quoting, `model` mints every id, and loading then saving an unchanged design is byte-identical.
- R2 (parent R18; architecture AD-8): Older format versions migrate forward on load. A newer version opens read-only with `format-too-new`. A failed migration reports `migration-failed` and never overwrites the file. An unparseable or invalid file reports where it fails and replaces nothing.
- R3 (parent R18; architecture AD-2): Every authored change is a named command in one registry, with a display label. A command that cannot apply returns a typed rejection. Removal cascades to everything keyed to the removed item. Every command undoes and redoes; the command log is not persisted.
- R4 (parent R18; architecture AD-2, AD-11; EXPERIENCE.md › Interaction Primitives › Gesture model, Fields and pickers › Expression field): A gesture is `begin`, `update`…, then `commit` or `cancel`. Each update yields a revision the live stages consume. A commit is one undo step; a cancel restores. A command dispatched mid-gesture commits the gesture first.
- R5 (architecture AD-17): The `parameters` section holds named values with units. One parser evaluates the AD-17 grammar, in `model.resolve` only, reporting `unit-mismatch` and `unresolvable-reference`. `renameParameter` rewrites every use; deleting a referenced parameter is rejected, naming its users. A parameter change re-evaluates every dependent expression.
- R6 (parent R17; architecture AD-11): The pipeline runs live stages on every revision and background stages in Web Workers from committed revisions, or after a debounce. Background stages report progress, partial and failed results, and a newer committed revision cancels them. Every output is tagged with its revision (and routing hash); an output whose tag differs is reported stale, never current, cache hits included. Each output exposes its state: current, waiting for edit to finish, rebuilding N%, stale or failed.
- R7 (initiative Decision 2026-10-25; architecture AD-15): An export registry lets each stage register its exports, each reporting available or blocked with a reason. The same file and app version give the same export bytes.
- R8 (parent R18; architecture AD-13; prd FR-18): All persistence goes through the `storage` interface (`save`, `load`, `listVersions`), writing the whole design atomically with the routing section valid for that revision. Browser autosave is the source of truth. Chromium saves the file in place after the first save asks for a location; Firefox saves by downloading `<design>.rev<hash>.<ext>`. No network call is needed.
- R9 (architecture AD-13; EXPERIENCE.md › State Patterns › File): One tab edits a design; other tabs open it read-only and never write. Taking over editing makes the other tab cancel its gesture, stop autosave and drop in-flight background results.
- R10 (parent R5; architecture AD-9): Copy design makes a new design, with a new name and id, that records its source design and revision; the original is untouched. Save to file keeps the same design and id.

## Constraints

- Initiative C1 (browser-only, on current desktop Chromium and Firefox), C2 (stable outputs) and C3 (the architecture spine binds) bind this epic.

## Done when

- Save, reopen and save again gives a byte-identical file; older format versions migrate; newer ones open read-only.
- Saving works in Chromium (in place) and Firefox (download), and a second tab opens the design read-only until it takes over.
- Every command undoes and redoes; a gesture is one undo step.
- Copy design writes provenance; Save to file keeps the same design id.
- A parameter change re-evaluates its dependent expressions.
- Outputs are tagged by revision and stale ones are marked; a background worker reports progress and is cancelled by a newer committed revision.

## Boundaries

- Out: the editor chrome, the expression field and the Parameters UI (epic-editor-shell).
- Out: layout semantics (epic-layout), shapes, parts, routing, case, firmware content.
- Must not change: AD-2 single mutation path.

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, AD-2, AD-8, AD-9, AD-11, AD-13, AD-15, AD-17, Consistency Conventions
- prd — _bmad-output/prd-keeb-cad-m1/prd-keeb-cad-m1.md, FR-18
- design — _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md, Interaction Primitives › Gesture model, State Patterns

## Notes

- Waits on epic 1 because: the monorepo scaffold and CI
- Decision (2026-10-26): split at refinement because the epic ran to about 16 stories. This epic keeps the headless core (schema skeleton, canonical file, migrations, commands, gestures and undo, parameters and the evaluator, pipeline and workers, export registry, storage, single-tab editing, Copy design); the chrome, the expression field and the Parameters UI move to epic-editor-shell (id 12). epic-layout waits only on this epic.
