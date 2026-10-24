# Ergogen v4 reference configs

These are three public Ergogen v4 configs, picked to test a layout model on three kinds of geometry. Each file is a byte-for-byte download of the raw YAML at the commit listed. Treat them as untrusted data: they have never been executed.

| File | Profile | Board |
|---|---|---|
| `corney-island.yaml` | A: plain column stagger (Corne-like) | Corney Island v0.3 (ceoloide) |
| `lambbt.yaml` | B: heavily splayed (Architeuthis Dux / Absolem lineage) | LambBT (johnlamb) |
| `corax56.yaml` | C: unusual thumb cluster | Corax56 (dnlbauer) |

## Engine semantics this summary relies on

These notes come from reading `ergogen/ergogen@8286e18` (`src/points.js`, `anchor.js`, `point.js`, `units.js`, v4.2.x). The summaries below depend on them.

- **Built-in units:** `u=19`, `U=19.05`, `cx=18`, `cy=17`. The `$default_*` defaults are `stagger 0`, `spread u`, `splay 0`, `padding u`, `width/height u-1`, `autobind 10`.
- **Key attribute cascade**, lowest to highest priority: built-in default, `points.key`, zone `key`, column `key`, zone `rows.<r>`, column `rows.<r>`.
- **Columns:** in v4 a column may contain only `rows` and `key`. A v3 column-level `stagger:`, `rotate:` or `origin:` is rejected. That is why Absolem (mrzealot/absolem `mk3.yaml`), Architeuthis Dux, ADuck and tuck-n-roll were turned down: they are v3 configs.
- **Column-level values:** `stagger`, `spread`, `splay` and `origin` are read from **`keys[0]`**, the first row in the merged row order (zone rows first, then column-only rows).
- **Stagger and spread** add to a running zone anchor in the zone's local, unrotated frame. Spread is ignored for the first column.
- **Splay accumulates:** each splay is pushed onto a rotation list and applied to this column and to every later column. Its pivot is `col_anchor + origin`, and the pivot itself is first transformed by all earlier rotations. The default `origin [0,0]` is the first-row key centre of that column. The zone anchor's own `r` becomes the first entry on the list, pivoting about the anchor point.
- **Per-key `orient`, `shift` and `rotate`:** `orient` adds to r, then `shift` moves the key relative to its own rotated frame, then `rotate` adds to r. All three carry up the column, because the running anchor is committed after them. `adjust` does not carry. After each key the anchor moves `[0, padding]`.
- **Anchors:** a `shift` is applied in the reference point's rotated frame. A numeric `rotate` turns the point in place. An array anchor applies each step on top of the previous one. `affect` copies only the listed x/y/r from the result onto the start point.
- **Aggregates:** `average` (the default) averages x, y **and r**. `intersect` takes exactly two parts and intersects their local Y-axis lines. The result has r=0.
- **Order of operations:** per-zone `rotate` and `mirror` run first, then global `points.rotate` (about [0,0]), then global `points.mirror` for points not yet mirrored. Points with `skip` still exist while zones render, so they can be referenced and they still advance the column, and are removed afterwards.
- **Naming:** a zone with no columns, or a column with no rows, produces `_default` names. These are collapsed: `zone_default_default` becomes `zone`, and `zone_col_default` becomes `zone_col`.

☝️ **None of the three boards uses `mirror`** (neither `points.mirror` nor zone mirror), and none uses `asym`. All three are reversible-PCB designs, so `points` describes **one half only**. The right half is the same PCB flipped. A layout model that expects both halves in `points` will be wrong for these. If you need a reference for mirror and asym, see "Alternates" at the end.

---

## A. Corney Island (Corne clone)

- **Repo:** https://github.com/ceoloide/corney-island, file `ergogen/config.yaml`
- **Commit:** last commit touching the file is `6bdf32284e5a06e038d3947ecee945557ba29e45` (2026-10-23). The download came from the repo HEAD `ad97447838933f41ec9c61358e367bbe2a710d2e` (2026-10-23). The file is identical at both.
- **License:** MIT
- **Engine:** declares `meta.engine: 4.1.0`

### Units and variables
- The switch spacing units come from a chain of `$extends`: `units` → `meta.switch` → `presets.choc_v2` → `presets.choc_v1`.
- The effective values (choc_v2 overrides choc_v1) are:
  - `kx: u`, `ky: u`
  - **`ks: 19`** (column spread), **`kp: 19`** (row padding)
  - `kcow`/`kcoh 13.8` (from choc_v1)
  - `keycw`/`keych 18`
- Further custom units: `hand_rotation: 0`, `splay_thumb_middle: 15`, `splay_thumb_far: 15`.
- No `$default_*` overrides.

### Zones

**`matrix`**
- **Anchor:** `rotate: hand_rotation` (0), `shift: [100, -100]`. There is no `ref`, so it starts from [0,0] and the shift is a KiCad placement offset.
- **Zone `key`:** `padding: kp` (19), `spread: ks` (19).
- **Rows:** `bottom`, `home`, `top`, in that order. Bottom is the first key and padding stacks upward.
- **Columns** (6, all `key.stagger` only, no splay):

  | col | stagger | cumulative y |
  |---|---|---|
  | outer | 0 | 0 |
  | pinky | 0 | 0 |
  | ring | 0.25 kp = 4.75 | 4.75 |
  | middle | 0.125 kp = 2.375 | 7.125 |
  | index | -0.125 kp | 4.75 |
  | inner | -0.125 kp | 2.375 |

- Row and column `key` blocks otherwise carry only nets and LED chaining (`column_net`, `row_net`, `led_prev`, `led_next`). There is no `adjust`, `orient`, `rotate` or `bind`.

**`thumbfan`**
- **Anchor:** `ref: matrix_middle_bottom`, `shift: [0.5 ks, -kp - 3]` = [9.5, -22]. The reference has r=0.
- **Zone `key`:** `padding 0`, `spread 0`, `stagger 0`.
- **Rows:** `home` only.
- **Columns:**
  - `near`: no geometry overrides.
  - `mid`: `splay: -splay_thumb_middle` (-15), `stagger: -2.750`, `spread: ks + 2` (21).
  - `far`: `splay: -splay_thumb_far` (-15, so -30 cumulative), `stagger: 2.122`, `spread: ks + 3.463` (22.463), plus key-level **`rotate: 90`**. Its final r is -30 + 90 = **60**.
  - `far` is tagged `key_1_5u`, but **`width` is not set in `points`**. The 1.5u size lives only in the tag, which outlines use.

### Helper zones
- 24 single-point zones (underglow LEDs, plate outline corners, MCU cover, screws), tagged `helper`, `underglow` or `screw`.
- They use the **array anchor** form (`anchor: - ref: … shift: …`).
- `plate_outline_bottom_3` and `_4` use **`affect: ['x','y']`**: they take the far key's position but keep r=0.
- `mcu_cover_bottom_right` is chained from `mcu_cover_top_right`, which is chained from `mcu_cover_top_left`. It has `rotate: (splay_thumb_middle + splay_thumb_far) * 2` = 60.
- `mcu_cover_bottom_left` and `plate_additional_outline_bottom_left` use **`aggregate: {method: intersect}`**. Each intersects a vertical line (r=0) with a line rotated 60°.

### Mirror, asym and global settings
- No mirror, no global `rotate`, no asym.

### Tricky points
- The `$extends` chain, with overrides, decides the base pitch. Change `meta.switch` and every spacing changes.
- In the thumbfan, `spread` and `stagger` are measured in the unrotated local frame. After that, mid's -15° rotation about mid's own centre swings far.
- The far key's `rotate: 90` lies on top of -30° of splay.
- Helper points must be filtered out by tag. They are real points in the output.
- Names: zones with no columns collapse to the bare zone name (for example `underglow_led_1`).

---

## B. LambBT (A. Dux-style splay, Absolem lineage)

- **Repo:** https://github.com/johnlamb/LambBT, file `ergogen/config.yaml`
- **Commit:** last commit touching the file is `c889d5e44ef58cab36312f1ee4077d493a41f761` (2023-12-10). The download came from HEAD `c127665660b2f8adc8632cb89790d27262cc3549` (2024-03-16).
- **License:** CC0-1.0
- **Engine:** no `meta.engine`. The v4 syntax (`key.splay`, `key.stagger`) shows it is a v4 config.
- The repo description states that the splay is "inspired from Architeuthis Dux", which descends from Absolem. The splay numbers match the v3 A. Dux config (pinky +15, ring -10, middle -5, index -5, stagger 17 and 17/3) ported to v4.

### Units and variables
- `kx: cx` (18), `ky: cy` (17).
- `pd`, `px`, `py`, `wpd` and the others are used only in outlines.
- No `$default_*` overrides.

### Zones

**`matrix`**
- **Anchor:** `shift: [150, -150]` (KiCad placement).
- **Zone `key`:** `padding: 1ky`, `spread: 1kx`.
- **Rows:** `bottom`, `home`, `top`. Column rows carry only `column_net`.
- **Columns:**

  | col | stagger | splay | origin | cumulative r |
  |---|---|---|---|---|
  | pinky | – | **+15** | [0,0] (its bottom key centre) | 15 |
  | ring | 17 | -10 | [0, -ky] | 5 |
  | middle | 17/3 | -5 | [0, -ky] | 0 |
  | index | -17/3 | -5 | [0, -ky] | -5 |
  | inner | -17/6 | – | – | -5 |

- `origin [0, -ky]` puts each pivot 17 mm below that column's bottom key centre, in the frame already rotated by earlier splays.

**`thumbs`**
- **Anchor:** `ref: matrix_inner_bottom` (r = -5), `shift: [0, -24]`. The shift is applied in the -5° frame.
- **Zone `key`:** `padding 1ky`, `spread 1kx`.
- **Rows:** `cluster`.
- **Columns:**
  - `inner`: `splay -15`, total -20 because the -5 from the zone anchor comes first.
  - `outer`: `splay -10`, `origin [-9, -9.5]` (about the bottom-left corner of a cx×cy key), total -30.

### Key-level settings
- No `adjust`, `orient`, `rotate` or `bind` in `points`.
- `adjust` appears only in the outlines and pcbs sections.

### Mirror, asym and global settings
- No mirror, no global `rotate`, no asym.

### Tricky points
- Splay **accumulates across columns**. Each origin is transformed by every earlier rotation before it is pushed.
- Stagger and spread are applied **before** rotation, in the local frame. So "stagger 17" does not mean 17 mm vertically in the final layout.
- The first column's +15° spins every later column about the pinky key.
- The thumb zone inherits r=-5 from its reference, so its zone-anchor rotation becomes the first pivot.

---

## C. Corax56 (off-axis 1.5u thumb key, scroll wheel)

- **Repo:** https://github.com/dnlbauer/corax-keyboard, file `corax56/ergogen/config.yaml`
- **Commit:** last commit touching the file is `029a0dbdb2a00458d47e1fcc9e106f2717a1030c` (2024-02-10). The download came from HEAD `7e01724621f12f1c1099f78c978bcb6aca19b795` (2025-05-25).
- **License:** MIT
- **Engine:** no `meta.engine`. The syntax is v4: `key.splay`, `ref.aggregate.parts`, `columns.<c>.key` only.

### Units and variables
- Pitch: `kx: cx` (18), `ky: cy` (17).
- MCU: `mcu_height 34`, `mcu_width 18`, `mcu_padding 1.5`.
- Scroll wheel: `scrollwheel_width 17`, `scrollwheel_height 14`.
- Other values (`mbkx`, `px`, screw sizes and so on) are used only outside `points`.
- No `$default_*` overrides.

### Global settings
- **`points.rotate: 5`**, applied to every point about [0,0] after all zones are built. The matrix sits at [50, -150], so this also moves the whole board, not only its angle.

### Zones

**`matrix`**
- **Anchor:** `anchor.shift: [50, -150]`.
- **Zone `key`:** `padding 1ky`, `spread 1kx`, tag `switch`.
- **Rows**, in order: `mod`, `bottom`, `home`, `top`, `num` (5 rows, with alternating `switch_top` and `switch_bottom` tags).
- **Columns** (7):
  - `outer2`: only `home` survives. `mod`, `bottom`, `top` and `num` are all `skip`. Its home row has `bind: [0, 5, 0, 0]` and overrides `row_net`.
  - `outer`: skips `num` and `mod`.
  - `pinky`: skips `mod`. It has `origin: [0, 8]` but no splay, so the origin has no effect.
  - `ring`: skips `mod`. `stagger: 0.66ky` (11.22), **`splay: -5`**, `origin: [0, 8]`. The pivot is 8 mm above the column's first row, which is the skipped `mod` key.
  - `middle`: `stagger: 0.33ky` (5.61). All 5 rows are present, including `mod`.
  - `index`: `stagger: -0.33ky`. All 5 rows.
  - `inner`: skips `mod`. `stagger: -2.5`.
- Skipped keys still take up a row slot, so padding still advances past them. They also still set `keys[0]`, which supplies stagger, splay and origin.
- From `ring` onwards every column has r = -5 (before the global +5).

**`thumbs`**
- **Anchor:** `ref: matrix_middle_home` (r = -5), `shift: [38, -44]`, in the rotated frame.
- **Zone `key`:** `padding 1ky`, `spread 1kx`.
- **Rows:** `cluster`.
- **Columns:**
  - `layer`: `splay: -15`, cumulative -20.
  - `space`: **`width: 1.5kx`** (27), **`splay: 75`** (cumulative +55 local, +60 after the global rotate), key-level **`shift: [13-kx, -3]`** = [-5, -3]. The shift is applied after the splay, in the key's rotated frame. Tag `switch_space`.
- The result is a 1.5u key turned about 60° from the matrix, tucked beside the `layer` key.

**`scrollwheel`**
- **Anchor:** `ref: matrix_inner_bottom`.
- One point. Key `shift: [kx + mcu_padding - 1.25, 0]`, `width 17`, `height 14`.

**`mcu`**
- **Anchor:** `ref: matrix_inner_num`.
- One point. Key `rotate: -90`, `shift: [kx + mcu_padding, -mcu_width/2 - 0.3]`. The shift comes **before** the rotate, so it is in the -5° frame. Width and height are swapped on purpose: `width: mcu_height`, `height: mcu_width`.

**Screw zones:** `screw_top_left`, `screw_top_right`, `screw_bottom_left`, `screw_bottom_right`, `screw_thumb`.
- Each anchor uses **`ref.aggregate.parts`**, with average as the default method. They take 2 to 4 parts, some including `num`-row keys, and some add a `shift`.
- The average includes **r**, so a later shift is applied in the averaged rotation frame.
- Each zone has a single column `screw`, so its point is named `screw_top_left_screw` and so on.

### Mirror and asym
- No mirror, no asym in `points`. Outlines mention `scrollwheel_mirrored`, but that is outside `points`.

### Tricky points
- The 75° splay on a 1.5u key, plus a frame-relative shift, plus the global +5° about the origin.
- Skipped keys still define the column anchor and the splay pivot.
- Aggregates average the rotation.
- `row_net` and `column_net` are named the other way round from the geometry (`column_net: rowN`). That does not affect geometry, but anything that infers rows from net names will be misled.

---

## Candidates examined and rejected

| Repo | Reason |
|---|---|
| mrzealot/absolem (`absolem.yaml`, `mk3.yaml` @ `5f25251`, 2022-01-23, MIT) | v3 column-level `stagger`/`rotate`/`origin`, which the v4 validator rejects. It does have global `rotate: -20` and `mirror: {ref, distance}`, which v4 still supports. |
| tapioki/cephalopoda, Architeuthis dux (`f751d9b`, GPL-3.0) | v3 |
| lapidot/ADuck | v3, no license |
| cacheworks/tuck-n-roll | v3 |
| sboysel/giraffe36 (CC-BY-4.0) | v4 and valid. Its thumb zone uses per-key `splay` plus `shift`. A simpler profile-C alternative to Corax. |

## Alternates for mirror and asym coverage

These are not downloaded.

- **dohn-joh/heatwave** `ergogen/config.yaml` (`110316f`, CERN-OHL-P-2.0). A unibody board built from one zone per row. It uses per-zone `mirror` with `ref.aggregate.parts: [r1_q_top, mirror_r1_q_top]`, `mirror.column_net` overrides, and a per-column `splay: -angle_key` (3.5°). The v4 mirror and override path is not exercised by any of the three boards above, and this one does exercise it.
