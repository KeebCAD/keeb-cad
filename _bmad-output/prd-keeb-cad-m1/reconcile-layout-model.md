# Reconciliation: layout model + Corney Island v0.3 vs PRD (milestone 1)

Inputs: `layout-model/paper-test-v0.md`, `layout-model/sources/README.md`, `layout-model/sources/corney-island.yaml` (milestone-1 reference board).
Checked against: `prd-keeb-cad-m1.md`, `addendum.md`, `.memlog.md` (memlog decisions treated as authoritative).
Date: 2026-10-25.

Legend: **Covered** = an FR states it. **Partial** = an FR implies it but the case Corney actually uses is not stated or is ambiguous. **Gap** = no FR.

---

## 1. Corney Island v0.3 feature inventory vs PRD

### 1.1 Points (key placement)

| Corney feature (yaml) | PRD | Status |
|---|---|---|
| `matrix` zone: 6 columns x 3 rows, padding `kp`=19, spread `ks`=19 | FR-2 chain, FR-3 pitch | Covered |
| Cumulative column stagger (0, 0, +0.25kp, +0.125kp, -0.125kp, -0.125kp) | FR-2 ("cumulative stagger ... expressible") | Covered |
| Zone anchor `shift: [100,-100]` (KiCad placement offset), `rotate: hand_rotation` (=0) | FR-1 (board origin anchor) | Covered (placement offset is export-only; no FR needed) |
| `thumbfan` anchored to `matrix_middle_bottom` + `[0.5ks, -kp-3]` | FR-1 (any node anchors to any node) | Covered |
| Thumb `mid`: splay -15, stagger -2.75, spread ks+2; `far`: splay -15 (cum. -30), stagger 2.122, spread ks+3.463 | FR-2 chain with offset/rotation/pivot | **Partial**: see 1.6 (frame semantics) |
| `far` key-level `rotate: 90` on top of chain splay (final r = 60) | Not distinguished | **Partial**: PRD does not separate a rotation that propagates to later siblings (chain splay) from a local slot/key rotation that does not (paper test wrote it as "slot rot +90°") |
| `far` is 1.5u, carried only by tag `key_1_5u` (used by keycap/debug outlines) | None | **Gap**: no key/slot size in glossary or FRs. Paper test v1 relies on "slot size 1.5u"; PRD dropped it |
| Tags `key`, `matrix_key`, `thumb_key`, `helper`, `underglow`, `screw` used as selectors in `outlines.where` and `pcbs.footprints.where` (incl. regex `/key/`, `/outer_/`, `/screw_pcb/`, `/screw_mcu/`) | None | **Gap** (see 1.5): PRD has "key cell applies to every key" and nothing for applying something to a subset (outer column, thumbs, screw roles) |
| Per-column `column_net` / per-row `row_net`; thumbs reuse C3/C4/C5 with row R3 | FR-11 "nets and matrix derived" | **Partial**: Corney's matrix is user-assigned; PRD has no user control over matrix assignment (control matrix §4.0 PCB row lists none) |
| Per-key `led_prev`/`led_next` (serpentine LED chain, thumbs LED_7-9, underglow ULED_1..6 feeding far thumb) | memlog: LED data chain in M1; FR-15 RGB | **Partial**: chain order is user-authored in Corney; PRD does not say whether it is derived or controlled |
| Switch presets `mx` / `choc_v1` / `choc_v2` via `$extends` (pitch, cutout 13.8, keycap 18, LED/diode offsets and rotations, switch rotation) | FR-3 (pitch separate from switch) | Covered for pitch. **Partial**: in Corney the key cell's LED/diode offsets and switch rotation are per switch type; PRD key cell is independent of switch type (matters for M2 MX->Choc remix) |
| Named variables reused across sections (`splay_thumb_middle`, `splay_thumb_far`, case thicknesses, screw radii) | None | **Partial**: MCU cover angle is `(splay_middle + splay_far) * 2` = far-key angle. In a visual tool this needs "orientation follows node X" or parameters/expressions; otherwise changing thumb splay leaves the MCU cover edge behind (breaks the vision's "change once") |

### 1.2 Helper points (24 single-point zones)

| Helper | Mechanism | PRD | Status |
|---|---|---|---|
| `underglow_led_1..6` | anchored to keys + `[0, vertical_underglow_shift]` | FR-8 parts in slots anchored to nodes | Covered |
| `screw_pcb_*` (5), `screw_mcu_cover_*` (2) | anchored to keys + shift (single anchor, **no average**) | FR-8 | Covered |
| `plate_outline_bottom_1..2` | key anchor + shift | FR-7 | Covered |
| `plate_outline_bottom_3..4` | `affect: ['x','y']` (take far key position, keep r=0) | FR-7 | Covered for a vertex (vertex orientation irrelevant); note only |
| `mcu_cover_top_left` -> `top_right` -> `bottom_right` | **helper anchored to helper** (chain of geometry points), `bottom_right` rotated 60 | FR-7 anchors vertices to a *node* (key, group, board origin) | **Gap/ambiguous**: geometry points anchored to other geometry points, and reused by name in several shapes (`mcu_cover_*` in two polygons, `plate_additional_outline_top` in `_matrix_outline` and `_plate_outline`). PRD Node = group/key/slot; a named reference point is none of these unless "empty slot" is meant |
| `mcu_cover_bottom_left`, `plate_additional_outline_bottom_left` | **`aggregate: intersect`** of a vertical line and a 60° line | None | **Gap**: no intersection/derived construction point. Required for SM-1 (both points are outline vertices) |
| (averaged anchors) | not used by Corney at all | §9 OQ4 asks "averaged anchors for screws: needed for Corney?" | ☝️ OQ4 premise is off: Corney uses no `average`; all screws are single-anchor. Average is a Corax56 need. What Corney needs instead is intersect (row above). OQ4 can be closed for M1 and replaced with "intersect" |

### 1.3 Outlines (shapes)

| Corney outline | Ops | PRD | Status |
|---|---|---|---|
| `_matrix_outline` 18-vertex polygon, vertices key-anchored with mm fudge offsets | polygon, anchored vertices | FR-6, FR-7 | Covered |
| `_plate_outline` = matrix outline + polygon (default add) | outline ref, add | FR-6 | Covered |
| `_backplate_additional_outline` (MCU cover polygon) | polygon of helper refs | FR-6/7 | Covered, subject to 1.2 gaps |
| `_backplate_outline` = plate + MCU cover | add | FR-6 | Covered |
| `_bottom_case_*_outline` | `expand` +/-, `fillet 0.5`, `joints: 1` | FR-6 offset with corner style + fillet | Covered |
| `_bottom_case_walls` = outer - inner | subtract | FR-6 | Covered |
| `_mcu_wall_cutout` rectangle anchored to `matrix_inner_top` + shift | rect with adjust | FR-9 (part-owned USB/MCU window) | Covered (PRD makes it part-owned; Corney authors it. Acceptable; SM-2 must still hit 8 x (40+2*0.25+2*1.2)) |
| `_switch_cutouts` 13.8 x 13.8 per `/key/` | rect per tag | FR-9 part-owned switch hole | Covered |
| `_screws` / `_screw_heads` / `_spacers` / `_controller_overlay_screws` | circles per screw role, **different radii per output** (1.1 in plates/case floor, 2.15 spacer holes in PCB) | FR-9 | **Partial**: PRD does not say one part yields different cutouts per output (plate hole vs PCB spacer hole vs case floor hole) |
| `_keycap_outlines` (incl. 1.5u), `_hex_outline`, `_debug_points`, `_bottom_case_superlight_inner_outline`, `preview` (stack) | preview/unused | — | Not needed for M1 (hex and superlight are commented out in the case) |

### 1.4 Plates

Corney produces **three** plates, each as a **KiCad PCB** (template `kicad8`, NPTH mounting holes), i.e. fabricated as FR4 through the PCB fab, not laser-cut from DXF:

| Plate | Shape | PRD FR-10 |
|---|---|---|
| `frontplate` (switch plate) | matrix outline, fillet, - switch cutouts, - screws | Listed |
| `backplate` | backplate outline (incl. MCU cover area), fillet, - screws | **Missing** (PRD names "switch plate and MCU cover" only) |
| `controller_overlay` (MCU cover) | MCU cover polygon, fillet, - MCU screws | Listed |

**Gap**: FR-10 exports DXF and SVG only; Corney's plates are PCB-fabbed (gerbers with NPTH). SM-3's "pass fab checks" covers PCBs only. Either add gerber/KiCad export for plates or record DXF-only as a deliberate deviation. Also add backplate to FR-10.

### 1.5 PCBs and footprints

Shared base (`_corney_island_baseline`, merged into both variants via YAML anchors):

| Footprint | Detail | PRD | Status |
|---|---|---|---|
| Choc v1/v2 hotswap switch, reversible, `choc_v2_support` | two footprint groups: `outer_` column has `outer_pad_width_back: 1.6`, others don't | FR-3 key cell, FR-8 | **Partial**: key cell "applies to every key"; no per-group override |
| Diodes SOD123, **two per key** (`diodes_b` side B, `diodes_f` side F, mirrored x shift) | reversible PCB needs both | FR-3 "diode" | **Partial**: reversible key cell = two diodes per key is not stated |
| nice!nano, reversible, `include_traces: true`, `use_rectangular_jumpers: true`, explicit pin map (P0 DAT, P1 LED, P21..P14 C0..C5, P2/P3 SDA/SCL, P4 CS, P5..P8 R0..R3) | pre-routed jumper traces; user pin map | FR-8, FR-11 "pin mapping derived"; addendum spike "pre-routed MCU zones" | **Partial**: reversible jumpers + footprint-embedded traces not in FRs; pin map is user-chosen in Corney, PRD only "derived" with no user control |
| M2 NPTH spacers at `/screw_pcb/` (r 2.15), M2 screw holes at `/screw_mcu/` (r 1.1) | | FR-8 | Covered (see 1.3 per-output radius) |
| JLC order-number text (`utility_text`) | silkscreen text | None | Minor gap (fab convenience; not blocking) |

Wired variant `corney_island`: SSD1306 OLED (reversible), THT top reset switch, TRRS PJ320A (reversible, symmetric), per-key SK6812mini-e (**reverse-mount**), underglow SK6812mini-e (normal mount, rotate 180). PRD FR-8 lists all. Covered.

Wireless variant `corney_island_wireless`: nice!view (`invert_jumpers_position`), SMD side power switch, **SMD side** reset switch (different part and position from wired), JST PH battery connector (rectangular jumpers). FR-5/FR-8 cover parts; **Partial**: FR-5 says variants differ in "parts populated" but Corney's variants put *different parts at different positions* (reset switch, display) — the PRD should state a slot's part and offset can vary per variant.

Side mode: both PCBs are reversible; FR-4 covers this. Jumpers (MCU, nice!view, battery) are how reversibility is achieved electrically; not named in FR-4/FR-8.

### 1.6 Case

| Corney | PRD | Status |
|---|---|---|
| walls = `_bottom_case_walls` extruded 1.0+4+1.6 = 6.6 | FR-14, addendum numbers | Covered |
| MCU wall cutout extruded 2.2 at **z = bottom_plate_thickness (1.0)**, subtract | FR-14 z-position, FR-9 | Covered |
| floor = outer outline extruded 1.0 | FR-14 | Covered |
| screw holes through floor | FR-9 | Covered |
| `shift: [-75,0,0]` | export placement only | n/a |

z offsets: Corney uses z only inside the case. Plates and PCBs have no z in Ergogen; PRD likewise has no 3D assembly stack. Fine for M1 (no SM depends on it).

---

## 2. v1 layout-model delta vs PRD

| v1 delta (paper test) | PRD | Status |
|---|---|---|
| position = **anchor** + offset, anchor defaults to parent; ownership (tree) vs placement (anchor) | Glossary Layout/Node/Anchor; FR-1 | Covered |
| **chain** replaces fan; each child relative to previous sibling with own offset, rotation, pivot | Glossary Arrangement; FR-2 | Covered. Note: v0 `stack`/`arc` silently dropped; "chain/sequence" is assumed to subsume stack. Paper test's stack drag semantics (gap change, alt-drag) deferred to UX — fine |
| **pivot** on every transform | Glossary Node; FR-1 | Covered |
| **one fixed order of operations**: offset, then rotate about pivot | Glossary Node ("offset, then rotate about a pivot"), FR-1 | Covered in words. **Risk**: the PRD does not say which frame a chain step's offset is expressed in. Ergogen applies stagger/spread in the zone's **unrotated** frame, then accumulated splays about pivots that are themselves transformed by earlier rotations. A naive "offset in the previous sibling's rotated frame" will not reproduce Corney's thumbfan (or LambBT) within the SM-1 ±0.05 mm. The rule needs to be pinned (and proven against Ergogen output) before SM-1 is testable |
| switch profile sets footprint + **minimum pitch**; **pitch** separate (presets tight/standard/custom) | Glossary Pitch; FR-3 | Covered (presets not named; minor) |
| **half mode**: reversible / mirrored | Glossary "Side mode"; FR-4 | Covered (renamed). Mirrored untested -> OQ5 |
| **helper components** (MCU, screws) placed in slots | FR-8 | Covered |
| "outline is **derived, not authored**" | FR-6/FR-7: outline is **authored** from anchored primitives/polygons | **Divergence**, justified by memlog event (all three boards hand-author outlines) and decision (anchored geometry ops). PRD should record that it supersedes the paper test's v1 row so the architecture doc (which also says "derived") is not followed |
| Helper *geometry* points (outline corners, MCU cover corners) | FR-7 anchors to nodes only | **Gap**: see 1.2 (point-to-point anchoring, named reusable points, intersect) |
| **averaged anchors** (candidate) | OQ4 | Open, but mis-aimed: not needed for Corney (see 1.2). Keep as Corax56 paper check (SM-C1) |
| Per-key rotation independent of chain accumulation (`far` rotate 90, "slot rot +90°") | not stated | Partial (1.1) |
| Slot size (1.5u) | not stated | Gap (1.1) |

---

## 3. Gaps, ranked

1. **Construction points (intersect, point-to-point anchoring, named shared points).** Two of Corney's outline vertices are line intersections, and the MCU cover corners chain from each other. FR-7 anchors only to nodes. Without this, SM-1 fails on the outline. OQ4 (average) is the wrong question for Corney. Suggested fix: extend FR-7 with "named reference points anchored to nodes or other points, including intersection of two oriented lines; reusable across shapes". Close OQ4 for M1.
2. **Plates incomplete and wrong export format.** Corney has frontplate, **backplate** and controller overlay, all PCB-fabbed (KiCad/gerber, NPTH). FR-10 names two and exports DXF/SVG only. Suggested fix: add backplate; add gerber/KiCad export for plates (or record DXF-only as a deliberate deviation from the reference).
3. **Key size and per-group selection.** No slot/key size (the 1.5u far thumb), and no way to apply footprint parameters or cutout sizes to a subset (outer-column pad width, screw roles with different hole radii per output). Suggested fix: add slot size to FR-1/FR-3, and per-key/per-group key-cell overrides (or tags) to FR-3.
4. **Chain frame semantics unpinned.** The "offset, then rotate about pivot" rule doesn't say which frame the offset is in, or whether a key's own rotation (far +90°) carries to later siblings. Ergogen's stagger and spread are applied in the unrotated frame, and its pivots accumulate. Getting this wrong breaks SM-1's ±0.05 mm. Suggested fix: state the frame rule in FR-2 and add an acceptance check that compares against Ergogen point output for Corney, LambBT and Corax56. Also record that the PRD reverses the paper test's "outline is derived".
5. **Reversible PCB and electrical assignment are not controllable.** Corney sets the matrix nets, the MCU pin map and the LED chain order by hand. It puts two diodes on every key, uses solder jumpers and pre-routed MCU traces, and places different parts at different positions in each variant. The PRD only says this is "derived" and lists no user controls. Suggested fix: add these user controls to §4.0's PCB row and FR-11, and state in FR-5 that a slot's part and offset can vary by variant.

Minor: switch-preset-dependent key-cell offsets (relevant to M2); JLC order text; the MCU-cover angle is tied to the thumb splay (needs an orientation-follows-node rule or parameters); pitch presets not named.

---

## 4. Bias / angle notes

- 📐 The PRD treats Corney as a *geometry* target (SM-1 measures key centres, vertices, cutouts) but Corney is equally an *electrical-assignment* target (pin map, matrix, LED chain). "Derived" sounds automatic, but matching or even sanely reproducing Corney's PCB requires user-assigned electrical data. SM-3 doesn't check this, so the gap would surface late (in routing/firmware).
- 📐 Plates were framed as laser-cut 2D (DXF/SVG); the reference treats them as PCBs. That changes the fab pipeline and SM-3 scope.
- ☝️ OQ4 assumes averaged anchors might be needed for Corney; the source shows they are not, and the actually missing aggregate is intersect.
