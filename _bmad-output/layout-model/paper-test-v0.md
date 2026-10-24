# Layout model v0: paper test

The three boards come from `sources/`. Each is rewritten below in v0 pseudo-notation, followed by the parts of v0 that broke.

## v0 (as agreed)
1. Tree: position = parent + local offset.
2. Slot + component (switch cell, encoder, empty).
3. Arrangements (stack, arc, fan, free). In a stack, dragging a key changes its gap, and the keys after it follow. Alt-drag compensates.
4. Units: `u` comes from the switch profile; `mm` is used for tweaks.
5. Mirror: a derived copy plus named overrides.

## A. Corney Island (Choc v2, 6 columns, 3-key thumb fan)

```
half
├── matrix: stack(horizontal, pitch 1u)
│   ├── outer  : stack(vertical) [bottom, home, top]
│   ├── pinky  : stack(vertical)
│   ├── ring   : stack(vertical), y = +0.25u
│   ├── middle : stack(vertical), y = +0.125u
│   ├── index  : stack(vertical), y = -0.125u
│   └── inner  : stack(vertical), y = -0.125u
└── thumbfan  @anchor matrix/middle/bottom, offset (+0.5u, -1u -3mm)
    └── chain [near, mid(Δ 21mm, Δy -2.75mm, rot -15°), far(Δ 22.46mm, Δy +2.12mm, rot -15°; slot rot +90°, size 1.5u)]
```

Ergogen's stagger is relative to the previous column, so the per-column `y` values above are cumulative: they stack the way a chain does. (The far key's 1.5u width comes from Corney's `key_1_5u` tag, which the outlines use; `points` doesn't set it.) The rewrite surfaced these issues:

- **Pitch is not the same thing as switch type.** Corney Island uses Choc switches at a **19mm** pitch, not the tight 18×17. *v0 conflated the two.* Fix: the switch profile sets the footprint and the **minimum** pitch, and the pitch itself is a separate layout setting (preset `tight` or `standard`, or custom).
- **Stagger is cumulative.** That's a chain, not independent offsets.
- **Helper points** (screws, LEDs, MCU cover, outline corners). v0 had no notion of them. Screws and the MCU can be components in slots. Outline corners should be derived, not authored.

## B. LambBT (Choc 18×17, accumulated splay of +15/-10/-5/-5)

```
half
├── matrix: chain(horizontal)
│   ├── pinky  : stack(vertical), rot +15° about its bottom key
│   ├── ring   : Δx 1u, Δy +1u,    rot -10° about (0, -1u) below its bottom key
│   ├── middle : Δx 1u, Δy +1/3u,  rot -5°  about (0, -1u)
│   ├── index  : Δx 1u, Δy -1/3u,  rot -5°  about (0, -1u)
│   └── inner  : Δx 1u, Δy -1/6u
└── thumbs @anchor matrix/inner/bottom, offset (0, -24mm)
    └── chain [inner(rot -15°), outer(rot -10° about (-9, -9.5)mm)]
```

- **One uniform fan can't reproduce this.** The angles are uneven, and each column has its own pivot. *Amelia's bet was right.*
- Fix: replace `fan` with **`chain`**, where each child is placed relative to the **previous sibling** using its own offset, rotation and **pivot**. Chains express accumulation explicitly: you can see it, choose it, and adjust it per step.
- Every transform needs a **pivot**, and one fixed order of operations: offset, then rotate about pivot. Ergogen's "stagger before rotation, in the local frame" becomes the single documented rule.

## C. Corax56 (5 rows with skips, 1.5u thumb at ~60°, MCU and scroll wheel)

```
root  rot +5° about (0,0)
└── half
    ├── matrix: chain(horizontal)
    │   ├── outer2 : stack [empty, empty, home, empty, empty]
    │   ├── …
    │   └── ring   : Δy +0.66u, rot -5° about (0, 8mm)
    ├── thumbs @anchor matrix/middle/home, offset (38, -44)mm
    │   └── chain [layer(rot -15°), space(rot +75°, slot size 1.5u, offset (-5, -3)mm)]
    ├── mcu         @anchor matrix/inner/num,    component: mcu, rot -90°
    ├── scrollwheel @anchor matrix/inner/bottom, component: encoder(scroll)
    └── screws      @anchor average(keys…)
```

- **Empty slots that still take up space** worked as designed. *v0 holds here.*
- **1.5u at 75°** is fine as a slot size plus rotation. *v0 holds.*
- **Placement is not the same as ownership.** Thumbs, MCU and scroll wheel are *owned* by the half but *placed* relative to a specific key elsewhere in the tree. A pure "position = parent + offset" rule can't express that. Fix: every node has an **anchor**, which is the parent by default but can point to any node. The rule becomes **position = anchor + local offset**.
- **Averaged anchors** (a screw centred between keys): an anchor that can be `average(nodes…)`. This is a candidate feature that could also be deferred.

## Mirror: none of the three boards uses it

All three are **reversible PCBs**: one PCB, flipped to make the other half. *John's bet missed, but in a useful way.*

- The model needs a **half mode**:
  - `reversible`: one geometry for both halves. Geometric overrides aren't possible, because it's one physical PCB, though per-side component population might be.
  - `mirrored`: two geometries, with overrides allowed.
- Heatwave (unibody, per-zone mirror with overrides) is the reference for testing `mirrored`. It hasn't been downloaded.

## v1 delta

| v0 | v1 |
|---|---|
| position = parent + offset | position = **anchor** + offset (anchor defaults to the parent) |
| fan | **chain**: each child relative to the previous sibling, with its own offset, rotation and pivot |
| switch profile sets `u` | switch profile sets the footprint and **minimum pitch**; **pitch** is a separate layout setting |
| mirror + overrides | **half mode**: reversible (one geometry) or mirrored (overrides) |
| — | one fixed order of operations: offset, then rotate about pivot |
| — | helper components (MCU, screws) placed in slots; outline is derived, not authored |
| — (candidate) | averaged anchors |

## Decision (2026-10-24)
Sergii accepted v1, including the split between ownership (the tree) and placement (the anchor). Still open: averaged anchors (candidate, may be deferred); testing `mirrored` half mode against Heatwave.
