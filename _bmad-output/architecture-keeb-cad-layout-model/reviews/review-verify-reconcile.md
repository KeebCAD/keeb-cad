---
review-of: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
lenses: [verification, input-reconciliation]
date: 2026-10-24
inputs:
  - _bmad-output/architecture-keeb-cad-layout-model/stack-research.md
  - _bmad-output/forge-keeb-cad-preserve-work/forge-keeb-cad-preserve-work.md
  - _bmad-output/layout-model/paper-test-v0.md
---

# Review: verification and reconciliation of the architecture spine

**Verdict:** The stack is mostly real and current. Every pinned npm version matches the registry today. Two things are wrong, though: the starter does not install the Vitest the spine pins, and the KDL library was never researched. The bigger problems are in reconciliation. The spine drops or blurs four things the inputs depend on: the paper test's per-step stagger (chain), a matrix/wiring concept, the parts that wireless needs, and the forge's "case updates live". It also contradicts itself on outline sharing (AD-10). Fix these before stories are cut.

## Part 1: Verification lens

### 1.1 npm spot-check (run 2026-10-24, `npm view <pkg> version time.modified`)

| Package | Spine | npm today (modified) | Status |
| --- | --- | --- | --- |
| vue | 3.5.44 | 3.5.44 (2026-10-23; 3.6.0-rc.13 on `rc`) | OK |
| vite | 8.3.5 | 8.3.5 (2026-10-21) | OK |
| typescript | ~6.0 | latest 7.0.2 (modified 2026-10-24) | OK as a deliberate hold. The create-vue 3.24.0 tarball pins `typescript ~6.0.0` and `vue-tsc ^3.3.11`, so this was confirmed. |
| pinia | 4.1.0 | 4.1.0 (2026-10-14) | OK. The starter actually writes `^4.0.3`, which resolves to 4.1.0. |
| vue-router | 5.4.0 | 5.4.0 (2026-10-07) | OK. The starter writes `^5.3.1`, which resolves to 5.4.0. |
| vitest | 5.0.5 | 5.0.5 (2026-10-19) | **Mismatch with the starter.** See F-V1. |
| create-vue | 3.24.0 | 3.24.0 (2026-09-16) | OK |
| replicad | 1.2.0 | 1.2.0 (2026-10-23) | OK. The package is MIT, but it needs `replicad-opencascadejs` 1.1.0, which is **LGPL-2.1-only**. See F-V4. |
| @bgotink/kdl | 0.4.1 | 0.4.1 (2026-10-13); `next` = 0.5.0-next.1 | Version OK, but **missing from stack-research**. See F-V2. |
| @tarikjabiri/dxf | 2.9.0 | 2.9.0 (2026-09-15), MIT | OK |
| clipper2-ts | "latest (2026, pure TS)" | `latest` = **2.0.1-18** (2026-07-04), BSL-1.0 | **Not pinned.** See F-V3. |

I also checked one non-npm fact. The KiCad 10.0 branch `pcb_io_kicad_sexpr.h` defines `SEXPR_BOARD_FILE_VERSION 20260206` ("Fix barcode and variant attribute serialization"). This matches the spine.

### 1.2 Findings

**F-V1 (Medium): the create-vue 3.24.0 starter installs Vitest 4, not 5.0.5.**
I downloaded the published `create-vue@3.24.0` tarball. Its `template/config/vitest/package.json` pins `"vitest": "^4.1.11"` and `"jsdom": "^30.0.1"`. Vite is pinned at `^8.2.2` and oxlint at `~1.82.0`. Stack-research says "Template uses ^5.0.5", so it apparently read the create-vue `main` branch on GitHub, which has had dependency bumps since the release. The spine's "create-vue … Vitest 5.0.5" therefore can't both be true on day one. A caret range will not move from 4 to 5.
*Fix:* choose one. Either pin `vitest@5.0.5` and the matching `@vitest/*`/jsdom and record it as a post-scaffold bump, or adopt Vitest 4.1.x as the starter ships it. Also correct stack-research to say its template versions come from `main`, not the 3.24.0 release.

**F-V2 (Medium): the KDL library and the KDL decision were asserted, not researched.**
Stack-research has no section on file formats or KDL. The spine still marks the stack "Verified 2026-10-24 (stack-research.md)". I checked it here:
- README (github.com/bgotink/kdl): KDL **v2 is the default**. v1 is available through `@bgotink/kdl/v1-compat`. It works in browsers and is ESM (`"type": "module"`). It describes itself as "parsing documents in a way that allows for format-preserving modifications". There is no schema or validator, only `dessert` deserialization helpers.
- Reality check (0.4.1, a local script):
  - Parse → format of an unmodified document with comments and odd spacing came back **byte-identical**, so format-preserving round-trip holds.
  - `clearFormat()` gives a normalized form, but it **drops comments**, **sorts properties alphabetically** and collapses duplicate keys (last one wins). `Node.create` + `setProperty` keeps insertion order.
  - Bare `19mm` is a **parse error** in KDL v2. `"19mm"` (quoted) is valid. The spine's unit convention already quotes, which is good. Keep it, because unquoted unit suffixes are a v1-era habit.
- Implications for AD-8:
  - The "canonical form, fixed property order" rule can't use `clearFormat`. `model` must emit nodes and properties itself in schema order.
  - Comments a user writes by hand will be lost on the first canonical save. Decide whether that is acceptable (☝️ AD-8's "load then save reproduces byte for byte" only holds for files the tool wrote).
  - Validation is entirely `model`'s job.
  - The package is pre-1.0 with one maintainer, and a 0.5.0-next line is open, so expect breaking changes.
*Fix:* add a KDL section to stack-research with these facts. In AD-8, state that it uses KDL v2, that the canonical writer owns the ordering, and what happens to comments. Pin `@bgotink/kdl@0.4.1` and keep it behind `model` so it can be swapped.

**F-V3 (Low): clipper2-ts is listed as "latest".**
`latest` points to `2.0.1-18`, a prerelease-style version, and there have been 18 of them since 2.0.1 (2025-12-21). "latest" breaks the spine's determinism rule (same design → same bytes): a minor change in offsetting changes the outline output.
*Fix:* pin `clipper2-ts@2.0.1-18` exactly, and say that it is BSL-1.0.

**F-V4 (Low): the LGPL decision recommended by stack-research was not recorded.**
Stack-research says: "LGPL OCCT is acceptable when served as an unmodified, dynamically loaded WASM, but record that decision". The spine does not record it and does not list `replicad-opencascadejs` (about 7.2 MB gzip WASM).
*Fix:* add `replicad-opencascadejs 1.1.0 (LGPL-2.1, unmodified, lazy-loaded in the case worker)` to the stack table. Add one line to AD-11 or the stack about the 7 MB lazy load.

**F-V5 (Low): "ZMK v0.3.0 / main" is not one decision.**
`main` is Zephyr 4.1/HWMv2 and v0.3.0 is not. Shields are unaffected, but board qualifiers (`nice_nano@…//zmk`) differ in the `build.yaml` the firmware stage would emit.
*Fix:* name one target, for example "`main` (Zephyr 4.1); v0.4 when tagged". Write it into the golden test.

**F-V6 (Low): tools the test plan needs are missing from the stack.**
- "resolve must reproduce Ergogen key positions" needs a reference. Either commit the positions as fixtures or add `ergogen@4.2.1` as a dev dependency.
- "KiCad output must open in KiCad 10" needs `kicad-cli` 10.0.x in CI.
- The editor needs a renderer for the case/3D preview, such as three.js, and none is named.
*Fix:* add these to the stack, or state how each test gets its reference.

## Part 2: Reconciliation with the forge brief and paper test

| Input requirement | Spine | Status |
| --- | --- | --- |
| Forge: layout changes show up live in outline, PCB, **case** and firmware | AD-11 puts case in a background worker. The fast preview is deferred | **Contradicts** (F-R4) |
| Forge: complex routing runs in background with progress, never pretends to be solved | AD-11, AD-12 (unrouted count always shown) | Kept |
| Forge: key-cell templates apply to every key | Glossary "switch cell". There is no rule for the default cell per design or per group, and no say on where cells live | Partial (F-R6) |
| Forge: geometry is free, add-ons from a **curated set** | `part` lists a fixed set. "Curated" and its owner (library vs code) are not stated | Partial (F-R3) |
| Forge: remix via a library of parametric blocks, no KiCad import | AD-9, AD-13 | Kept |
| Forge: swap MX → Choc | AD-5 makes it possible (pitch independent, min-pitch violation). There is no command such as `setSwitchType` | Kept, implicit |
| Forge: **go wireless** (check 2) | Part list has no battery, power switch, reset or JST/TRRS | **Dropped** (F-R3) |
| Forge: "all the way to **gerbers**, case and firmware" | No gerber output and no statement that gerbers come from KiCad after export | Dropped (F-R7) |
| Forge: escape hatch = export (STEP/KiCad), exported copy no longer syncs | AD-1 says this generically. STEP/STL appear only in the stack table, and no export list is committed | Partial (F-R7) |
| Forge: firmware output | `firmware` stage (ZMK shield + physical layout, QMK keyboard.json) | Kept, but needs a matrix (F-R2) |
| Forge: build on kbplacer / Freerouting | AD-13 browser-only, no network. Freerouting is Java and kbplacer is a Python KiCad plugin | **Contradicts** (F-R5) |
| Forge open: pre-routed MCU zones | Not mentioned, not even in Deferred | Dropped (Low) |
| Forge: check 2 leads | Fixtures cover only check 1 (three Ergogen boards). There is no fixture or acceptance for check 2 and routing is deferred | **Inverted priority** (F-R5) |
| Paper test: chain = each child relative to previous sibling with **own offset (Δx, Δy), rotation, pivot** | AD-4 sequence = pitch + gap (along direction) + optional turn. There is no perpendicular offset per step | **Dropped** (F-R1) |
| Paper test: one order of operations, offset then rotate about pivot | AD-3 | Kept |
| Paper test: anchor ≠ ownership | AD-3 | Kept. But "only children of `free`, and top-level groups, may set an anchor" must still allow thumbs/MCU/encoder to be top-level or free children. Corax's MCU is under `half`, so `half` must be `free` |
| Paper test: pitch separate from switch, presets `tight`/`standard` | AD-5 (no presets) | Kept (presets are UX) |
| Paper test: helper parts (screws, MCU) as slots | `part` includes MCU and screw | Kept. LEDs go in the switch cell. The MCU cover is not covered |
| Paper test: **outline derived, not authored** | `outline` is a stage, but plate, pcb edge-cuts and case all need it, and AD-10 forbids stages from depending on each other | **Internal contradiction** (F-R2b) |
| Paper test: half mode; reversible allows **per-side component population** | AD-6 forbids geometric overrides in reversible and says nothing on population | Dropped (Low) |
| Paper test: Corax root rot +5° above both halves | Sides are top-level groups. There is no design-level root transform, and "centre group" (AD-6) is undefined | Gap (Low) |
| Paper test: averaged anchors are a candidate | Deferred | Kept |
| Paper test: test `mirrored` on Heatwave | Deferred | Kept |

### 2.1 Findings

**F-R1 (High): `sequence` lost the paper test's per-step offset (stagger), so check 1 can't pass as written.**
Paper test v1 replaced `fan` with `chain`, where each child is placed relative to the previous sibling "using its own offset, rotation and pivot". All three boards need a cross-axis offset per step:
- Corney's cumulative column stagger (`y = +0.25u` …),
- LambBT's `Δx 1u, Δy +1u` columns,
- Corney's thumb chain (`Δ 21mm, Δy -2.75mm, rot -15°`).

AD-4 defines a step as "one pitch along the sequence direction, plus `gap`, plus an optional turn about a pivot", and the glossary defines `gap` as along-axis only. AD-4 also uses "step", which is not a glossary term. It is unclear whether a sequence child's `offset` is applied to its step.
*Fix:* make the step explicit in AD-4 and add it to the glossary. For example: step = pitch + gap along the axis, then the child's `offset` (x, y, rotation about pivot) in the previous child's frame. State that stagger is `offset.y` on a sequence child. Add a fixture test for the Corney column stagger and the LambBT splay.

**F-R2 (High): two shared derivations are missing, the matrix and the outline, and AD-10 makes the gap structural.**
- (a) There is no concept of a **matrix, net or wiring assignment** (row/col per slot, MCU pin map, diode direction). `pcb`/routing needs it, and so does `firmware` (`zmk,matrix-transform`, QMK `matrix_pins`, `layout[].matrix`). Under AD-10 anything two stages share must live in `model`, but `model` has no such concept.
- (b) The **outline** is a stage, yet plate, pcb (edge cuts) and case all consume it. AD-10 says stages "never [depend] on each other". So the outline either gets recomputed three times or breaks the rule.

*Fix:* add a `matrix` (auto-derived from the tree, with overridable row/col and pins) and a `board outline` derivation to `model`, with parameters such as margin and corner radius. The outline stage then only exports. Add both terms to the glossary.

**F-R3 (High): the wireless half of check 2 has no parts, and "curated add-ons" is not a rule.**
`part` = switch cell, encoder, MCU, screw, empty. Choc + wireless needs at least a battery connector/pads, a power switch and a reset button, and usually a choice of MCU module (nice!nano-class) that drives the ZMK board target. The forge locks "add-ons come from a curated set", but the spine doesn't say who owns that set or how it grows. It might be a code enum or library parts with footprints.
*Fix:* define `part` as "a footprint plus pins drawn from the curated part catalogue in `library`". List the milestone-1 catalogue: MCU modules, battery, power switch, reset, encoder, screw, and optionally TRRS/display. Put a `curated` rule in an AD.

**F-R4 (Medium): the forge's "case updates live" became "case updates in the background", and nobody signed off on the change.**
The forge's locked core experience lists case among the outputs that update live. Only complex routing is allowed to lag. AD-11 moves case to a worker, and the fast preview is deferred "if case latency hurts". Stack-research actually recommended a manifold-3d mesh preview during drags.
*Fix:* either record this as a conscious narrowing of the forge, or keep the forge promise by adding a cheap live case approximation: an extruded outline or a manifold mesh, with the replicad B-rep built on drag end. AD-11 then stays honest.

**F-R5 (High): routing contradicts the browser-only architecture, and routing sits on the critical path of check 2, the check that leads.**
The forge's candidate engines don't fit AD-13 ("no network", browser-only, static hosting):
- Freerouting is a Java CLI or a KiCad extension.
- kbplacer is a Python KiCad plugin.

Check 2 requires "the PCB works", and the spine's fixtures and tests only cover check 1. ☝️ The deferral "spike before routing work starts" puts the riskiest unknown last on the path that leads.
*Fix:* add an AD constraint that the routing engine must run in a browser worker (TS/WASM), or route outside the app after KiCad export, which then breaks "every output updates". Pull the routing spike and a check-2 fixture (Sergii's board, Choc + wireless + new thumb cluster) to the front. List DRC/clearance as a violation kind.

**F-R6 (Medium): the key-cell template's scope is undefined.**
The forge says users define key-cell templates "that apply to every key". The spine has the term but not the mechanism. Is there a design-level default cell? Can a group override it? Where do cells live (in the design, or library blocks)? What does "per-key tracks" mean once routing is derived?
*Fix:* add a rule. One option: the design declares switch cells, every switch slot references one by id, the design default applies when none is given, and cell tracks feed AD-12.

**F-R7 (Medium): the export targets and the gerber promise are not committed.**
The forge positioning says "all the way to gerbers, case and firmware" and treats export as the escape hatch. The spine never lists the formats.
*Fix:* add an export table to AD-1:
- `.kicad_pcb` (KiCad 10),
- gerbers (generated in app, or "via KiCad after export", stated either way),
- plate SVG/DXF,
- case STEP + STL,
- ZMK shield folder,
- QMK `keyboard.json`.

## 📐 Angles not covered

- 📐 Several "Verified" labels cite a document that does not contain the fact (KDL, the create-vue template versions). Treat "verified" as true per row, not for the whole table.
- 📐 The spine is optimised for check 1 (Ergogen fidelity: golden fixtures, 0.01mm), which is the check that *doesn't* lead. Check 2's success criteria (wireless parts, routing, a working PCB) have the least architecture behind them. This looks like the more tractable problem drawing the effort.
- 📐 "Canonical byte-for-byte KDL" gives clean diffs, but at the cost of losing any hand-written comments. For a personal, AI-built project, hand-editing the KDL may be a real workflow. Decide this on purpose.
