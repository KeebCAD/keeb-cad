# Rubric review: architecture spine, keeb-cad layout model

- **Spine:** `architecture-keeb-cad-layout-model.md` (draft, updated 2026-10-25)
- **Context:** `prd-keeb-cad-m1/prd-keeb-cad-m1.md`
- **Reviewed:** 2026-10-25
- **Out of scope by instruction:** no variant concept (FR-5 → two designs, AD-21). Not a finding.

## Verdict

**Revise before adoption. The fixes are moderate, not a redesign.** The spine is strong. The paradigm is clear, the ADs are terse and mostly enforceable, package direction is enforced in CI, the conventions are concrete, and Deferred is mostly hidden behind seams. Three kinds of gap remain. (1) The data contracts between packages contradict the dependency rules: stage inputs, catalogue injection and export packaging. (2) The violation contract and the cache key are underspecified, so stages can diverge on them. (3) The glossary drifts from AD-8's section list and leaves several working terms undefined. Each gap needs one or two lines in an existing AD or convention.

## Scorecard

| Criterion | Result |
| --- | --- |
| Fixes the real divergence points, misses none | Partial. Misses stage I/O types, catalogue injection, violation shape and ownership, plate cutout selection, group override storage |
| Every Rule is enforceable and prevents its Prevents | Mostly. AD-10 signature, AD-11 cache key and AD-15 gate are not enforceable as written |
| Nothing in Deferred lets units diverge | One leak: the geometry-spike fallback (clipper2-ts polygons) changes `ResolvedDesign` |
| Named tech looks current | Mostly. Flags: makerjs maintenance, pnpm 12.x, ZMK v0.3.0 vs wired split |
| Covers every PRD requirement | Gaps: FR-16 combos, FR-3 group overrides, FR-10 per-plate cutouts, FR-12 pre-routed module zone, PRD Q2 and Q6 |
| Altitude dimensions decided, deferred or open | Mostly. Hosting, CI and environments are deferred. Missing: newer-format files, app/catalogue version vs stable outputs, browser file API differences, static-host header needs |
| Internal consistency | Several issues (see §7) |
| Terse | Good. Only a little rationale in prose, and no bloat |

## Findings

Severity: **H** = units will diverge or a Rule is self-contradictory. **M** = a gap that is likely to cause rework. **L** = polish.

### 1. Divergence points and enforceability

**F1 (H): The stage data flow contradicts the stage signature and the dependency graph.**
- AD-10 signature: `(resolved) → {output, violations[]}`, plus saved routes for routing and drc. But AD-10 also says `pipeline` passes the **pcb placement output** to routing and to drc. The glossary's "stage" has the same omission.
- The type of the pcb placement output is unowned. Routing and drc can't import `pcb`, so if the type lives in `pcb` the rule is broken. If each defines its own, they diverge.
- `exports` is called a stage that depends only on `model`. It packages DXF, gerber, STEP, KiCad and ZMK, which are other stages' outputs, so it is a second stage-to-stage flow the rule doesn't allow.
- The AD-15 gate ("only when the `drc` stage reports zero errors") binds `exports`, but `exports` can't see drc output. Who enforces the gate is undefined.
- **Fix:**
  - Define in `model` the stage output types that cross packages: `PcbPlacement`, `RouteSet`, `DrcResult`, and the plate, case and firmware outputs.
  - Write three signatures: base `(resolved)`; routing and drc `(resolved, placement, savedRoutes)`; exports `(resolved, stageOutputs)`.
  - Name every flow `pipeline` wires.
  - State that `pipeline` enforces the export gate.

**F2 (H): The catalogue and templates can't reach `model`.**
- `model.resolve` does catalogue lookup (AD-10), and `insertTemplate` is a `model` command (AD-2, AD-18). The catalogue data and the templates live in `library`, which depends on `model`, never the reverse.
- **Fix:** take the data as arguments, `resolve(authored, catalogue)` and `insertTemplate(template, params)`. `pipeline` and `editor` inject them from `library`. Tests and fixtures inject a pinned catalogue.

**F3 (H): The violation contract is incomplete.**
- No severity. AD-15 gates on "zero errors", and nothing defines which kinds are errors. Is `unrouted` an error? Is `pitch-below-min`?
- No owner per kind. `overlap` could be implemented in `model`, `drc` or `pcb`. `pitch-below-min` and `binding-unsupported` have no owner either.
- Missing kinds:
  - invalid or unparseable file
  - file newer than the app's `format-version`
  - failed migration
  - conflicting overrides (two keys on one matrix position, one MCU pin used twice)
  - catalogue part not found
- Command rejections are "typed" with no shape.
- **Fix:**
  - Add `Violation {kind, severity, ids[], message}` and a kind → owning package → severity table.
  - Add the missing kinds.
  - Give rejections one shape, `{command, reason-kind, ids}`.

**F4 (H): The revision and cache key miss real inputs, which breaks stable outputs.**
- AD-11's cache key is "inputs' closure in the dependency graph plus global settings". The dependency graph (glossary) covers only anchors, shapes, construction points and parameters. Population, keymap, design rules, key cells, overrides and catalogue data are outside it, so firmware and drc keys miss real inputs. "Global settings" is undefined.
- The catalogue ships bundled (AD-13) and isn't pinned in the file. A new app release that changes a footprint changes outputs for an unchanged file, which breaks AD-1 "same file → same outputs". `catalogue-refs` exists in AD-8 but is never defined.
- **Fix:**
  - Define `catalogue-refs` as part id + catalogue version.
  - Define a stage cache key as hash(declared input sections + their dependency-graph closure + catalogue version + stage version).
  - Drop "global settings" or list them.

**F5 (M): The plate cutout target can't tell plates apart.**
- The catalogue has one `plate` target (AD-5). Corney has three plates: the switch plate gets switch holes, the backplate gets screws only, the MCU cover gets neither. Each stage will invent its own selection.
- **Fix:** a plate definition names the cutout classes it takes (e.g. `switch`, `screw`, `module`), and catalogue cutouts are tagged by class. Or key catalogue targets by plate role.

**F6 (M): FR-3 group overrides have no mechanism, and "override" means two things.**
- The glossary says the key cell is "overridable per group". The glossary's own "override" covers population, the mirror and the netlist only. FR-3 also asks for "screw-hole sizes per output", but cutouts come from the catalogue only (AD-5).
- Where group key-cell overrides are stored, and how `pcb` resolves them, is undecided, so `model` and `pcb` could each pick their own answer.
- **Fix:**
  - Key cells are referenced by id and a group property selects one. Or add a named override kind for key cells.
  - Add per-instance cutout parameter overrides to the override list, resolved in `model.resolve`.

### 2. Deferred items that leak

**F7 (H): The geometry-spike fallback isn't hidden.**
- "On failure switch to clipper2-ts polygons inside `model`" changes what `ResolvedDesign` carries: polygons instead of exact lines, arcs and circles. AD-16's flatten-at-the-boundary rule and every consuming stage change with it, as do the exact-arc STEP walls.
- **Fix:** either fix the resolved shape type now (exact paths, with polygons as an internal evaluator detail flattened back into the same type), or state that the fallback reopens AD-16 and every stage contract.

**F8 (L):** The routing engine choice must not shape the routing section. The route schema (segments, vias, layers, widths) is a `model` schema under AD-8 but has no content yet. Fix: add one line, "route schema is engine-neutral, defined in `model` before the spike lands".

**F9 (L):** The "editor views, drag semantics" deferral is safe only because drags must map to existing `model` commands. Fix: state that the UX session may add commands to `model` but no other write path.

### 3. PRD coverage

**F10 (M): FR-16 combos.** AD-19 maps slot id → binding per layer. A combo is a binding on a **set** of slots, so it can't be expressed per slot. Fix: add a `combos` list (slot-id set, binding, layers) to the `keymap` section. Behaviour tuning such as hold-tap timing needs a home too, either design-wide parameters or vocabulary arguments.

**F11 (M): One netlist vs per-side population.** AD-21 says one netlist, while population differs per side (AD-6). Fix: state whether the netlist is the union over sides (one reversible PCB) and how firmware gets per-side pin and matrix data.

**F12 (L): FR-12 pre-routed module zone.** No owner is named. Fix: it is catalogue data on the module part (pre-routed tracks plus keep-out), or part of the key-cell mechanism.

**F13 (L): FR-9 user cutouts on the PCB.** Plates and the case name their shapes, but the PCB has only the outline. Fix: add a `pcb-cutouts` list of shape ids, or allow the outline to contain holes.

**F14 (M): PRD open questions are dropped or overridden.**
- Q2 (ZMK version with wired split) is asserted as `v0.3.0` in Stack, and AD-15 promises "wired split over UART". The PRD explicitly says the version may not be v0.3.0. To my knowledge, ZMK's wired UART split landed on `main` after v0.3.0. Verify.
- Q6 (footprint licence) isn't listed. The Licences convention assumes attribution is enough.
- **Fix:** add both to Deferred with a "revisit when", or add an Open Questions section.

**F15 (L):** The front matter `binds` omits FR-5, which the capability map does cover (via AD-21). Fix: add FR-5 so the trace is complete.

### 4. Operational envelope

Decided or deferred: no backend, static hosting, CI/deploy, environments, browser matrix, offline WASM caching, storage backends. These are acceptable for a personal milestone 1. Gaps:

- **F16 (M): files newer than the app.** AD-8 migrates forward only. Fix: a file with a newer `format-version` opens read-only with a violation (see F3).
- **F17 (L): static-host requirements may not be "any host".** If the routing spike picks CheerpJ, or a worker needs `SharedArrayBuffer`, the host must send COOP/COEP headers. Fix: add the header requirement to the hosting deferral, revisited after the routing spike.
- **F18 (L): file Save/Open differs by browser.** The File System Access API writes back in place in Chromium. Firefox has no equivalent and only downloads. That affects AD-13's "file Save/Open" semantics. Fix: name the behaviour per browser, or defer it with the browser matrix.
- **F19 (L): autosave durability.** IndexedDB/OPFS eviction and quota limits are unaddressed. `listVersions` implies retention. Fix: say that storage requests persistent storage and keeps N versions, or state it as a `storage`-internal decision.
- **F20 (L): diagnostics.** There is no stated stance on error logging or telemetry. Fix: one line, "no telemetry; worker and WASM failures surface as stage failures in the UI".

### 5. Tech currency (flagged, not researched)

- **makerjs 0.19.2:** makerjs releases have been slow for years. Maintenance risk for the core geometry engine. The geometry spike should cover it (and see F7).
- **pnpm 12.15.0:** the major version looks high. Re-check.
- **Pinia ^4 / vue-router 5.4 / TypeScript ~6.0 / Vite 8:** plausible for late 2026. They depend on create-vue 3.24 defaults. No action.
- **ZMK v0.3.0:** see F14.
- **KiCad 10 board format 20260206:** plausible. Golden tests will catch any drift.

### 6. Internal consistency

**F21 (M): The glossary's authored sections don't match AD-8.** The glossary lists parameters, layout, shapes, plates, case, keymap, design rules, population and overrides. AD-8 adds `meta`, `catalogue-refs`, `key-cells` and `construction`. Revision is the hash of "the authored sections", so it is ambiguous whether key cells or construction points change the revision, and that is a cache false-hit risk. Fix: make the glossary list exactly the AD-8 sections minus `routing`, and say whether `meta` counts (it should, because it holds pitch and form).

**F22 (M): Contradictory definitions.**
- "key: a slot whose part is the key cell" against "part: a catalogue entry … or `empty`". The key cell is stored in the design, not the catalogue. Fix: "a slot holding the key cell (a design-local part)", or widen "part".
- "side: a top-level group for one hand", but `split-reversible` has one geometry, and AD-6 mirrors across "the top-level group with id `center`", which is neither a side nor in the glossary. Fix: side is a population key, not necessarily a layout group. Define the `center` group, or name the mirror axis another way.
- AD-4 is titled "arrangements", but "arrangement" isn't a glossary term.

**F23 (M): Terms used but not defined.** violation, group, frame / world frame, net, net class, pad, pin role, binding, layer (keymap layer vs copper layer), keep-out, remix, provenance, export (bold in AD-1), live / background stage, global settings, pcb placement, preview. Fix: add short entries, and disambiguate "layer".

**F24 (L): Diagram gaps.**
- `preview` is a stage in the paradigm diagram and the AD-11 live list, but has no package in AD-10 or the seed. Fix: name its owner (`editor`, or a stage).
- The paradigm diagram omits `exports` and `library`.
- The deployment diagram omits `library` and `model`. Acceptable for a seed, but `exports` should appear wherever stages are listed.

**F25 (L): Format-writer ownership is ambiguous.** The seed puts the "KiCad writer" in `pcb` and the "ZMK writer" in `firmware`, while `exports` lists "KiCad, ZMK" again, along with the gerber writer that plates and PCB share (AD-15). Fix: stages produce the format content; `exports` only bundles and names files. Or move all writers to `exports`. Pick one.

**F26 (L): Id convention.** Ids are "kebab-case", but composite ids use `/`, `:` and `.`. Fix: "atomic ids are kebab-case; composites use the separators listed".

### 7. Terseness

Good overall. Small trims:
- The paradigm paragraph's "it depends on history, so it is kept" is rationale and could go.
- Stack's "(8.3.5 current)" notes will go stale. Keep them in `stack-research.md`.

## What is solid (keep)

- One resolve, one mirror, one shape evaluator, one expression parser, one DRC, one netlist. These are the right shared derivations to centralise.
- The routing section design: saved, re-validated, single writer, outside undo.
- The canonical KDL writer, byte-for-byte round trips, and ids minted by `model`.
- Dependency direction enforced by pnpm strict mode plus dependency-cruiser in CI.
- The cross-stage netlist golden test.
- Deferred rows that name a seam and a trigger.
