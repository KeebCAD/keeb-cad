---
review: input reconciliation (PRD + addendum -> spine)
spine: architecture-keeb-cad-layout-model.md (updated 2026-10-25, AD-1..AD-21)
inputs: prd-keeb-cad-m1/prd-keeb-cad-m1.md, prd-keeb-cad-m1/addendum.md
override log: .memlog.md (entries from 2026-10-25)
date: 2026-10-25
---

# Reconcile review: PRD milestone 1 against the architecture spine

## Verdict

**Mostly aligned, with 3 high gaps.** Every FR except FR-5 is bound, and FR-5 is deliberately overridden by the memlog (NO VARIANT CONCEPT), so it is not a finding. The §4.0 live/background classification, the "never show stale" rule, routing validity, the DRC gate, the KiCad escape hatch, firmware neutrality, form readiness, stable outputs, autosave, migrations and the ±0.05 mm acceptance tolerance all landed. The gaps are in quiet places:
- **Reversible right-half identity.** The spine never says what a right-hand key is in `split-reversible`. Keymap, firmware and population depend on that.
- **FR-3 group and part overrides.** The spine has nowhere to store them.
- **Plate cutout selection.** It cannot tell a switch plate from a backplate.

There are also 6 medium findings and a set of low findings and glossary drift.

Severity scale: **High** = a PRD requirement can't be met as specified, or a story would have to invent architecture. **Medium** = ambiguity or an unconfirmed contradiction that two builders could resolve differently. **Low** = a missing note, a test or a wording fix.

---

## High

### H1. `split-reversible` gives right-hand keys no identity or position (FR-4, FR-15, FR-16, §4.0 Firmware row)
- PRD: a reversible board has one geometry and one PCB, flipped for the other half (glossary, Side mode), with per-side population differences only (FR-4). Firmware exports the matrix, pins and ZMK physical layout (FR-15). Keymap entries stay attached to their keys (FR-16).
- Spine:
  - AD-6 has resolve derive a mirrored side only for `split-mirrored`, with `mirror:` ids. For `split-reversible` it says only "one geometry, one PCB … only population differs".
  - The glossary defines **side** as a top-level group (`left`, `right`). With one geometry, it is undefined whether a `right` group exists.
  - AD-19 keys the keymap by `slot id → binding`.
- Consequences:
  - The right half's keys have no ids, so the keymap cannot bind them differently from the left.
  - The ZMK physical layout needs right-half positions. Flipping a PCB mirrors it, and AD-6 says only `model.resolve` mirrors, but reversible mirroring is never specified.
  - Population is "keyed by side", but the spine doesn't say whether the one PCB/netlist is built from the union of both sides' populations. The display and reset button differ per side. The netlist glossary also has no entry for the reversible-specific pieces: double-sided pads and solder-jumper nets (the solder jumpers are in the FR-8 catalogue).
- **Fix:** add to AD-6 for `split-reversible`:
  - (a) resolve derives the right side as the flipped copy with `mirror:<left-id>` ids. That is the same machinery as `split-mirrored` with no geometric overrides. Alternatively, key the keymap and population by `(side, slot id)`.
  - (b) the PCB, netlist and routing use the union of the side populations, with jumper nets taken from catalogue pin roles.
  - (c) firmware emits per-half positions from the resolved sides.

### H2. FR-3 group overrides and per-output part settings have no home (FR-3, §4.0 PCB row "key cell and group overrides")
- PRD: the user can override the key cell or part settings for a group of keys or parts. Its examples are the outer column's switch pads and screw-hole sizes per output.
- Spine:
  - The **key cell** glossary entry says "overridable per group", but no AD says how. The `key-cells` section exists, but there's no rule for assigning a key cell to a group or for inheritance.
  - The **override** glossary entry is limited to population, the mirrored side and the netlist.
  - Part cutouts come "from the catalogue only" (AD-5), so a design can't change a screw hole's radius for the plate versus the PCB versus the case.
- Corney Island's screw has three radii (r 1.1, head r 2.05, standoff r 2.15, from the addendum), and SM-2 checks them at ±0.05 mm. The spine forces those values into catalogue data, with no per-design control.
- **Fix:** extend AD-5 and the override glossary entry:
  - (a) groups may reference a key cell by id, and the nearest ancestor wins.
  - (b) a `part-parameter` override (part property per target) is stored in `overrides` and applied in resolve.

### H3. One `plate` cutout target can't serve several plates (FR-10, §4.0 Plate row)
- PRD: Corney Island has a front/switch plate, a backplate and an MCU cover, each recomputed "from its shapes plus part-owned cutouts (switch holes, screws)".
- Spine: catalogue cutouts are per target `plate | pcb | case` (AD-5), and a plate is "a shape + part cutouts" (glossary, memlog). Nothing says which part cutouts a given plate takes. The backplate must not get switch holes, while the switch plate must.
- **Fix:** a plate definition declares which cutout kinds or roles it includes (e.g. `switch`, `screw`, `mcu-window`). Alternatively, catalogue cutouts carry a role that plates filter on. State this in AD-5 or AD-16.

---

## Medium

### M1. FR-2's frame rule is contradicted by an unconfirmed author call
- PRD FR-2: "a node's own slot rotation (for example the far thumb key's 90°) does not propagate to later siblings", reproducing Ergogen within ±0.05 mm.
- Spine AD-4: "A node's own rotation is part of its frame, so it carries to later siblings. A slot that should turn without affecting later siblings sets its rotation on the part." Memlog line 94 lists this as an author call **not asked**.
- Problems:
  - The literal rule contradicts the PRD.
  - The **part** glossary entry has no rotation property.
  - If the rotation sits on the part, the slot's footprint rectangle, attach points and the `key outline` geometry operation don't rotate. Outline vertices anchored to that key's attach points would then miss Ergogen's positions.
- **Fix:** confirm with Sergii. Then define either a non-propagating slot rotation (e.g. `orient`, which affects the slot's own frame and footprint but not the step basis) or a part rotation that the key outline and attach points honour.

### M2. Chain step direction: whose frame?
- AD-4 says child *n*'s default anchor is "child n−1's frame moved one pitch plus gap along the direction", and the direction is "+x or +y of its own frame" (the chain's).
- For cumulative splay (FR-2, Corney's thumb fan), the step must run along the **previous sibling's** rotated axis. Read literally, AD-4 steps along the chain's axis, and builders will split on this.
- **Fix:** state that the step is applied along the direction axis of child *n−1*'s frame.

### M3. The revision excludes routes, so stale tagging and the gerber gate can't see route changes (FR-13, FR-17 "never show stale")
- Spine: revision = hash of the authored sections only (AD-11; memlog 94 lists this as an unconfirmed author call). Outputs are tagged by revision. The gerber gate is "zero errors for the current revision" (AD-15).
- When a routing result arrives, the routing section changes but the revision doesn't. A DRC result or PCB export computed before that result still looks current, and the gate could pass on an old DRC.
- **Fix:** tag routing, DRC and PCB-export outputs with `(revision, routing-section hash)`, and gate gerbers on both. Alternatively, include routes in the cache key of those stages.

### M4. The antenna keep-out can't be switched off per design (FR-12, glossary Design rules)
- PRD: the design rules include keep-outs, and the nice!nano antenna keep-out applies "on the wireless variant".
- Spine: keep-outs come only from the catalogue, per part (AD-5, AD-20), and design rules are only net classes plus edge clearance. The wired Corney design also uses a nice!nano (memlog line 80), so it would inherit the antenna keep-out and route more tightly than the reference.
- This comes from the two-designs decision, but there is no memlog decision on this effect.
- **Fix:** let `design-rules` enable or disable catalogue keep-outs per part or role, and align the glossary (PRD design rules = widths + clearances + keep-outs).

### M5. The pre-routed module zone has no architectural home (FR-12, addendum spike)
- PRD and addendum: "a pre-routed zone around a module is allowed", and the spike must test it.
- Spine: it appears only in the Deferred spike row. The catalogue schema (footprint, pins, roles, envelope, cutouts, keep-outs) has no tracks. Only key cells carry local tracks.
- **Fix:** add optional pre-routed tracks to the catalogue part schema. They would be placed with the part, like key-cell tracks, and passed to routing as fixed copper. Alternatively, name this exact schema change in the spike row as the outcome to decide.

### M6. Combos don't fit `slot id → binding` (FR-16)
- AD-19 lists `combo` in the vocabulary, but a combo is triggered by several key positions, not one. The delete rule (AD-2) is also undefined for a slot that takes part in a combo.
- Corney's ZMK keymap may use combos (it is unfetched, per the memlog question).
- **Fix:** make combos a separate keymap list keyed by a set of slot ids. Deleting any member slot removes the combo in the same command.

---

## Low

| # | Requirement | Gap | Fix |
| --- | --- | --- | --- |
| L1 | FR-8 "per-key **and underglow** LEDs" | AD-5's catalogue lists only SK6812mini-e. It doesn't say whether underglow uses the same part. | Name the underglow part, or state "SK6812mini-e for both". |
| L2 | FR-11, §4.0 PCB row (LED order, pins) | Matrix has a default rule (AD-14); LED chain order and MCU pin assignment have none, only overrides. Stable outputs need a deterministic default. | Add default rules (e.g. LED chain in matrix order; pins in catalogue order). |
| L3 | FR-10 plates fabbed as PCB | AD-15 says plate gerber is "edge + holes". Fabs expect an Excellon drill for round holes (screws). | Plates: gerber + drill, same writer. |
| L4 | SM-1/SM-2 ±0.05 mm | AD-16's shared flatten tolerance has no value. Case and plate flattening eat into the ±0.05 mm budget. | Set the flatten tolerance (e.g. ≤0.005 mm) in AD-16. |
| L5 | FR-8 footprint licence (§8 Q6) | Attribution landed (Licences); the open licence check isn't in Deferred. | Add a Deferred row: confirm the ceoloide licence before the first footprint story. |
| L6 | FR-7 anchor to "board origin" | AD-3 anchors are nodes, vertices and construction points. No root or origin node is named. | Name the root frame (e.g. the design root node `origin`). |
| L7 | Addendum operations: `stack`, standalone `fillet`, `3D shift`, `case reuse` | Spine has offset with fillet, z-position and shape reference. Standalone fillet (offset 0 + fillet?) and `stack` aren't stated. 3D shift has only z. | State the mapping, or mark them unneeded for Corney. |
| L8 | SM-3 fallback (KiCad routed outside) | The spine doesn't say the KiCad export carries key-cell tracks plus valid saved routes. | One line in AD-15. |
| L9 | SM-3 "compared by parts and nets", SM-5 edit script | Testing conventions have no parts/nets comparison against Corney and no SM-5 edit-script end-to-end test. | Add both to the Testing row. |
| L10 | SM-C2 (no loosened clearances) | Design rules are freely user-authored, with no fab-minimum floor. | Optional: a DRC warning below fab minimums. |
| L11 | NFR stable outputs ("same file reopens to same outputs") | A file saved with unrouted connections triggers background routing on reopen, which may not be deterministic. | State that the router must be deterministic, or that reopen results are allowed to differ only for connections that were unrouted. |
| L12 | FR-17 overlap warning | `overlap` is a violation kind, but no stage owns it (resolve? drc?). | Assign it to `model.resolve`. |
| L13 | Firmware outputs | AD-15 lists the physical layout, wired split and RGB. Displays (OLED, nice!view) and the BLE split for the wireless design aren't listed, though SM-4 needs them to build. | Add "display and split transport per population". |

---

## Glossary drift (PRD §3 vs spine)

| PRD term | Spine | Status |
| --- | --- | --- |
| Variant | removed; AD-21, design + remix | Memlog-backed (known). The PRD needs a rewrite (memlog question at line 72). |
| Side mode (`reversible`/`mirrored`) | **form** (`split-reversible`/`split-mirrored`/`unibody`) | Memlog-backed (line 86). The PRD glossary is stale. |
| Node = group, key or slot | node = group or slot; key = slot whose part is the key cell | Author call, unconfirmed (memlog line 94). It also clashes internally: **part** = "catalogue entry", but the key cell lives in the design, not the catalogue. Fix the part definition. |
| Anchor = "the node (default: parent)" | node, vertex or construction point; default depends on arrangement | Memlog-backed (line 73). The PRD glossary is stale. |
| Arrangement | used, never defined in the glossary | Add the term. |
| Design rules = widths, clearances **and keep-outs** | net classes + edge clearance; keep-outs from the catalogue | Diverges; see M4. |
| Layout, Case, Live, Escape hatch, Geometry operations | no glossary entries (concepts covered in AD-11, AD-1, AD-18 and under shape) | Add the entries, or note the mapping, so the code uses one word. |
| Plate = "a derived 2D shape" | "a named definition: a shape + part cutouts" | Compatible; see H3 for cutout selection. |
| Pitch | `pitch-x`/`pitch-y` | Compatible refinement. |

---

## Landed correctly (checked)

- **§4.0 Layout:** live, the source of truth (AD-3, AD-4, AD-11).
- **§4.0 Outline:** anchored geometry, only dependents move (AD-3, AD-16).
- **§4.0 Plate:** live (AD-11).
- **§4.0 PCB:** placement and key-cell tracks live, routing in the background (AD-11, AD-12).
- **§4.0 Case:** background (AD-11, AD-18).
- **§4.0 Firmware:** live (AD-11).
- **§4.0 Editor:** progress shown and stale outputs marked stale (AD-11).
- **FR-1:** any node anchors to any node, transitively, with a single order of operations.
- **FR-4:** "must not assume reversible" (AD-6, form).
- **FR-6/7:** shapes, construction points, vertex reuse.
- **FR-9:** cutouts and keep-outs move with their part.
- **FR-12:**
  - route validity is endpoints + DRC;
  - only broken connections are rerouted;
  - unrouted connections are never hidden;
  - no manual trace editing;
  - browser-only, in a Web Worker.
- **FR-13:** DRC gate with zero errors; KiCad 10 escape hatch always available.
- **FR-14:**
  - tray parameters;
  - editable 3D operations;
  - no straight-extrusion assumption;
  - STL and STEP export.
- **FR-15:** firmware-neutral; ZMK v0.3.0 (memlog-confirmed); RGB when the population fits.
- **FR-16:** delete cascade with undo (AD-2).
- **FR-17:** every warning kind has a violation kind.
- **FR-18:**
  - named commands;
  - one gesture = one undo step;
  - autosave;
  - stable ids;
  - format-version + migrations;
  - no server.
- **NFRs:** browser-only; stable outputs (case cache never in the file); latency target deferred.
- **SM-1/2/4 tolerances:** in Testing.
- **SM-3 fallback:** in Deferred.
- **Non-goals:** reflected or not contradicted.
