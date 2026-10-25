# Review: spine vs architecture memlog, PRD memlog and conflict analysis

- **Spine:** `architecture-keeb-cad-layout-model.md` (draft, updated 2026-10-25, AD-1..AD-21)
- **Against:** architecture `.memlog.md` (authoritative, later overrides earlier), PRD `.memlog.md`, `prd-keeb-cad-m1/reconcile-architecture.md` (A, B, C)
- **Date:** 2026-10-25

## Verdict

**Pass with fixes.** Every 2026-10-25 architecture decision is reflected in the spine, and none is contradicted. Every A item and almost every B/C item is resolved or explicitly deferred. The open issues are:

- two silent items: B12 (stabilisers/wide keys) and C "layout" (plus "group") missing from the glossary
- a few unbacked additions, the largest being the KiCad **schematic**
- several coherence seams that the new decisions open up: exports vs "the one stage-to-stage flow", routing-section writes during a gesture, cache keys and revision tags for route-dependent outputs, catalogue version vs stable outputs, and design identity for provenance

---

## 1. Architecture memlog → spine

### 1a. 2026-10-25 entries (lines 55–94)

| Memlog | Topic | Spine | Status |
| --- | --- | --- | --- |
| 56 | PRD authoritative; §4.0 core | `binds` FR-1..18 minus FR-5; capability map | Reflected |
| 57 | Outline authored, shape ops, anchored primitives/vertices | Glossary shape/vertex/outline; AD-16; AD-3 | Reflected |
| 58 | Variants | Overridden by 69 → AD-21 | Correctly superseded |
| 59 | Routes saved; validity rule; key-cell tracks live; no manual traces | AD-12 | Reflected |
| 60 | Stable outputs | AD-1, Conventions "Stable outputs" | Reflected (the "cross-user sameness not a goal" clause is not stated; harmless) |
| 61 | Gerber + drill, DRC gate, design rules | AD-15, AD-20 | Reflected. The spine **adds** "and no unrouted connections" to the gate. This is backed by PRD FR-13 "when routing completes", so it is acceptable, but it is not in the arch memlog or the author-call list |
| 62 | Sections: shapes, keymap, case ops; tilt/chamfer/loft later | AD-8, AD-18, AD-19 | Reflected; tilt/chamfer/loft has no Deferred row (low) |
| 63 | ZMK only, wired split, RGB, QMK pure addition | AD-15, AD-19, Deferred QMK | Reflected |
| 64 | No split-reversible assumption | AD-6 | Reflected |
| 65 | M1 non-goals | Deferred: blocks, QMK, Ergogen import; AD-12 no hand edits | **Weakened (low):** "MX / Choc v1 / encoder → M2" is implied only by their absence from AD-5. There is no Deferred row |
| 66 | Routing spike first | Deferred row 1 | Reflected |
| 67 | ±0.05 mm, Corney only | Conventions Testing | Reflected |
| 68 | Routing state option b | AD-12, AD-2 | Reflected; see seam S2 (gesture updates) |
| 69 | No variant concept | AD-21, AD-10 signature | Reflected |
| 70 | Remix widened to whole designs | AD-9 | Reflected; see seam S5 (no design id) |
| 71 | Wireless = plain copy; ids survive copy | AD-9 "Copying keeps every id"; fixtures | **Weakened (medium):** the spine does not say that Save As writes provenance (source design id + revision). Without it, M2 cannot find the fork base. See S5 |
| 72 | PRD drift question to Sofia | Capability map row "FR-5 → separate designs" | Reflected in the spine. The PRD itself is still unchanged (FR-5, SM-3 "both variants", glossary "Variant"). This is outside the spine, but it is a live inconsistency in the `sources` |
| 73 | Anchoring: one anchor, defaults, explicit replaces, index kept, one graph | AD-3, AD-4, glossary | Reflected. The spine goes further: **nodes may anchor to vertices** (see §3) |
| 74 | makerjs single evaluator, exact paths, one flatten | AD-16 | Reflected |
| 75 | makerjs 0.19.2 | Stack | Reflected |
| 76 | Geometry spike | Deferred row 2 | Reflected |
| 77 | Template expands once, parameters stay knobs | AD-18, glossary template | Reflected |
| 78 | Parameters + expressions | AD-17 | Reflected; "case panel only" is folded into Deferred "expression UI" |
| 79 | Keymap vocabulary, delete cascades, violation | AD-19, AD-2 | Reflected |
| 80 | ZMK v0.3.0; confirm by SM-4 build at first firmware story | Stack; Testing "ZMK output builds" | **Weakened (low):** the confirmation checkpoint is gone. PRD OQ2 says "not pinned to v0.3.0 if it lacks wired split". Add a Deferred row |
| 81 | tscircuit / gerber / checks versions | Spike row, gerber-writer row | Fine (candidates only) |
| 82 | Fetch Corney keymap | Deferred row | Reflected |
| 83 | Whole netlist in model | AD-14, AD-10 | Reflected |
| 84 | Connection identity; design rules authored | Glossary connection; AD-12; AD-20 | Reflected; see seam S7 (how nets split into connections) |
| 85 | One `drc`; routing → drc exception | AD-10, AD-20 | Reflected |
| 86 | Form | AD-6 | Reflected |
| 87 | Blocks M2; provenance field | AD-9 | Reflected |
| 88 | Catalogue schema per target; M1 data; MX/Choc v1/EC11/stabilisers → M2 | AD-5 | Data reflected; **M2 list not stated** (see B12) |
| 89 | Plates list | Glossary plate; AD-8 `plates`; AD-15 | Reflected |
| 90 | Exports | AD-15 | Reflected, apart from the added schematic (§3) |
| 91 | Case cache never in file | AD-11 | Reflected |
| 92 | Fixtures | Conventions Testing | Reflected |

### 1b. Earlier entries (2026-10-24) still in force

- **Line 10** (anchors only for free-group children and top-level groups): superseded by line 73. OK.
- **Line 13:** the "alt-drag compensates on next step" drag semantic is now covered by the Deferred UX row (line 55 puts drag semantics out of scope). OK.
- **Line 18:** the KLE format rejection is absent from the spine. The PRD lists KLE as a non-goal. Low; optionally add it to the Ergogen-import Deferred row.
- **Line 32:** `model` "merge" has moved to M2. OK. `library` = "bundled block data" has become catalogue data, footprints and case templates. See seam S6.
- **Line 40** ("commands … form the intention log used for merges"): the spine says instead "The command log is not persisted". This is implicitly superseded by line 51 (embedded base copy as merge base), but **no memlog entry says the log is dropped**, and it is not in the line-94 author-call list. Low: log it as an author call.
- **Lines 48/49** (clipper2-ts pinned 2.0.1-18): dropped from Stack. clipper2-ts is now only the geometry-spike fallback (line 74). Acceptable, but pin it in the Deferred row if the fallback is taken.
- **Line 50** ("wide keys and stabilisers in M1"): superseded by line 88 (stabilisers → M2). The spine is silent either way (see B12). The line-50 note "row stagger supported, row-board fixture deferred" is also absent. Low.
- **Lines 51, 52:** reflected (AD-9, AD-12, conventions).

**No 2026-10-25 decision is contradicted.** The weakened items are 65, 71, 80 and 88 (M2 list).

---

## 2. Conflict analysis coverage

### Part A

| Item | Spine | Status |
| --- | --- | --- |
| A1 shapes | AD-16, AD-3, AD-8 sections, glossary outline/plate; several plates (AD-15, glossary) | **Resolved.** makerjs replaces the analysis's clipper2 assumption |
| A2 variants | AD-21: rejected, separate designs + remix | **Resolved** (by override of PRD FR-5) |
| A3 gerbers | AD-15 gate, AD-20; ☝️ FR vs SM-3 settled in the spike Deferred row | **Resolved, with one silent sub-item:** the gerber **layer content** (silkscreen, mask, board-edge layer, copper pours / ground zones) is not mentioned anywhere. The gerber-writer choice is deferred, but what goes into the gerbers is not. Medium-low |
| A4 routing state | AD-12, AD-1 stable outputs | **Resolved** |
| A5 keymap | AD-19, AD-2 cascade, `setBinding` | **Resolved** (the variant sub-question is moot) |
| A6 ZMK only | AD-15, AD-19, Stack, Deferred QMK | **Resolved.** The ZMK version is pinned without the PRD OQ2 checkpoint (see 1a, line 80) |
| A7 case ops | AD-18, AD-17; 📐 macro vs live answered (macro + parameters) | **Resolved** |
| A8 any-node anchoring | AD-3, AD-4 (explicit replaces default, index kept) | **Resolved** |
| A9 catalogue / non-matrix nets / per-target cutouts | AD-5, AD-14 | **Resolved** |
| A10 fixtures / tolerance | Conventions Testing | **Resolved** |

### Part B

| Item | Spine | Status |
| --- | --- | --- |
| B1 command model | AD-2; typed rejection in conventions | Resolved |
| B2 stable ids | AD-8, glossary id | Resolved for elements. **There is no design-level id** (see S5) |
| B3 format version + migrations | AD-8 | Resolved |
| B4 canonical writer | AD-8 | Resolved |
| B5 autosave, one tab | AD-13 | Resolved |
| B6 outputs never edited | AD-1 (all outputs) | Resolved. That case-op editing counts as design editing is implicit in AD-18 (an authored section); this is acceptable |
| B7 violations | Conventions violation list | Resolved. **`overlap` has no owning package** (resolve? drc?). Low |
| B8 determinism details | Conventions Stable outputs | Resolved |
| B9 matrix rule + overrides + golden test | AD-14, glossary override | Resolved |
| B10 debounce / cancel | AD-2, AD-11 | Resolved |
| B11 coordinates | AD-7 | Resolved |
| B12 stabilisers / wide keys | — | **SILENT.** Memlog 88 moves stabilisers to M2, but the spine says nothing. It also does not say whether a ≥2u slot without a stabiliser is allowed or is a violation. Fix: add a Deferred row "MX, Choc v1, EC11, stabilisers → M2 (memlog 88)". State that wide slots are allowed in M1 with no stabiliser part, or that they raise a violation |
| B13 network / bundling / LGPL | AD-13, Licences | Resolved |

### Part C

| Item | Status |
| --- | --- |
| Glossary clash | Mostly resolved (key cell, chain, node = group\|slot, outline). **Silent:** "layout" (PRD term, and the KDL section name `layout`) and "group" have no glossary entries, although both are used throughout. Low-medium given the "one word, one meaning" principle |
| Blocks / three-way merge | Deferred explicitly (AD-9, Deferred row) |
| Unibody-ready | Resolved (AD-6: side `whole`, `unsupported-form`) |
| Averaged anchors | Deferred explicitly (construction-point row) |
| Mirrored mode | Deferred explicitly |
| Spike tests incremental reuse | Resolved (spike row) |

**Silent items to flag:** B12; C "layout"/"group"; the A3 gerber layer content; and a PRD item outside A–C, FR-12's **pre-routed module zone**. That zone appears only as a spike test. Where do those fixed tracks live? In the catalogue footprint, in a "module cell" like the key cell, or in the routing section? AD-12 says only `pipeline` writes routes and that key-cell tracks are the only fixed copper. Medium.

---

## 3. Spine content not backed by a memlog entry or input

| Spine text | Backing | Severity / action |
| --- | --- | --- |
| AD-15 "KiCad 10 project (**board + schematic**)" | None. The PRD says only "KiCad project opens in KiCad 10". Grep finds no "schematic" in the PRD, addendum or memlogs | **Medium.** Generating a schematic is real scope. Drop it, or log it as a decision |
| AD-5 "**SOD-123** diode" | None (PRD/memlog: "diode") | Low. Log it or say "diode" |
| AD-8 section `catalogue-refs` | None, and it is undefined in the glossary | Low-medium. Define it (does it pin catalogue entry versions?) or drop it. Ties to S4 |
| AD-3 "Any node may explicitly anchor to any … **vertex**" | Memlog 57/73 give vertices→nodes/vertices/cps and nodes→nodes. Node→construction point is backed by PRD OQ4 (screws). **Node→vertex is new** | Low. Log it as an author call or narrow it |
| AD-2 "The command log is not persisted" | Implied by line 51; not logged | Low. Add it to the author-call list |
| AD-15 gate "and no unrouted connections" | PRD FR-13 "when routing completes" | Fine. Note it in the memlog |
| AD-6 "top-level group with id `center`" as a reserved id | Memlog 15 "center group" | Fine, but `center` is not in the glossary and not in the side list. Say whether it is required in every form |

### Line-94 author calls: coherence check

1. **Revision = hash of authored sections only (routing excluded).** Coherent with AD-1/AD-12 (routing is outside undo). But the consequence is unstated: the outputs of the `routing` and `drc` stages, and the PCB gerbers, depend on the routing section. AD-11 cache keys ("inputs' closure + global settings") and the "every output tagged with the revision" rule therefore cannot tell apart two routing states at the same revision. **Fix:** route-dependent stages key on (revision, routing-section hash) and are tagged with both, and the export gate checks both. (S3)
2. **Slot rotation that should not propagate goes on the part.** Coherent with AD-4. But "part" in the glossary is only a catalogue entry; no part-level offset or rotation property is defined. The spine also does not say whether attach points or anchors to that slot see the part rotation. Low: add a part-placement property to the slot schema.
3. **Glossary: key cell, chain, node = group\|slot, key = slot holding key cell.** Mostly coherent. Two problems:
   - "part = a catalogue entry … or empty", but the key cell is stored in the design, not the catalogue. So "slot whose part is the key cell" contradicts the part definition. Fix: part = catalogue entry, key cell or empty.
   - "group" is undefined.
4. **KDL section order.** Coherent; `catalogue-refs` is unbacked (above).
5. **Violation kinds list.** Coherent. `overlap` has no owner. There is no kind for a file that fails schema validation or migration; say whether load errors are a typed rejection.
6. **plates package rename.** Fine.

---

## 4. Coherence seams opened by the new decisions

- **S1 (high): exports breaks "the one stage-to-stage flow".**
  - AD-10 says stages see only `ResolvedDesign`, and that the only stage-to-stage flow is pcb placement → routing/drc.
  - But `exports` must package plates, pcb + routes, case solids and firmware outputs. AD-15 also gates on the `drc` result.
  - So `exports` is either a second flow or not a stage at all.
  - **Fix:** declare `exports` a packager that `pipeline` feeds with stage outputs (a second named flow), or move packaging into `pipeline`. Adjust the stage signature row and the Structural Seed comment to match.
- **S2 (medium): routing-section writes during a gesture.**
  - AD-2 says each gesture `update` is a new revision. AD-12 says saved routes are re-validated "after every revision change" and that invalid ones are dropped by `pipeline`.
  - A drag that passes through an invalid state, then returns or is cancelled, would therefore destroy valid routes and force a reroute. This is history-dependent copper from a no-op.
  - **Fix:** during a gesture, validity is computed for display only. The routing section is written only on commit or cancel (and on load, undo and redo).
- **S3 (medium):** cache keys and revision tags for route-dependent outputs. See author call 1.
- **S4 (medium): catalogue version vs stable outputs.**
  - The catalogue ships with the app (AD-13), and `resolve` reads it.
  - But neither the revision nor "global settings" names the catalogue version. An app update can therefore change outputs for the same file, which breaks AD-1 "same file → same outputs on every reopen".
  - It can also serve a stale persisted case solid from browser storage (AD-11).
  - **Fix:** include the catalogue version in cache keys, and define what `catalogue-refs` pins.
- **S5 (medium): no design id.**
  - AD-9 provenance carries a "source id", but the glossary `id` covers only nodes, shapes, vertices, construction points, parameters and case operations.
  - **Fix:** add a design id in `meta`, minted on create and newly minted on Save As. State that Save As writes provenance (source design id + revision) so that the M1 copy becomes a fork that M2 can merge (memlog 71).
- **S6 (medium): templates in `library`, `insertTemplate` in `model`.**
  - `model` cannot import `library`. The command must therefore take the template's output (parameters + operations) as its argument, and `editor` must run the template function.
  - **Fix:** state the command's input shape. Otherwise a story will add `model → library`.
- **S7 (low-medium): how nets become connections.**
  - A connection is a pad pair, but the spine does not say how an N-pad net is split into pairs.
  - The split must be deterministic and stable under small moves. Otherwise "connection still exists" (AD-12) flips whenever pad positions change the pairing.
  - **Fix:** define the rule in `model` (e.g. chain order or MST with a stable tie-break), or let the router report its pairing.
- **S8 (low): `u` in expressions.**
  - AD-4 says `u` means pitch-x or pitch-y depending on the axis, but AD-17 parameters are design-wide.
  - A parameter `"1u"` used in a y property, or in a non-axial property (radius, case offset), is ambiguous.
  - **Fix:** `u` resolves by the property's axis; in non-axial properties it is a `unit-mismatch`, or it uses pitch-x. State which.

---

## 5. Suggested fixes, in priority order

1. S1: name `exports` as a pipeline-fed packager, or make it a second flow, in AD-10.
2. S2: no routing-section writes during an uncommitted gesture (AD-12/AD-2).
3. S3 + S4: cache keys and output tags include the routing-section hash for route-dependent stages, and the catalogue version for everything (AD-11).
4. S5: add a design id; Save As writes provenance (AD-9, glossary, AD-8 `meta`).
5. Drop or log "schematic" in AD-15; log SOD-123, `catalogue-refs`, node→vertex anchoring and "command log not persisted" as author calls, or remove them.
6. B12: add a Deferred row "MX, Choc v1, EC11, stabilisers → M2", plus a wide-slot rule.
7. Glossary: add `layout`, `group`, `center`; widen `part` to include key cell; add part-level rotation.
8. Pre-routed module zone: say where its tracks live (AD-12/AD-5).
9. S6, S7, S8: state the `insertTemplate` input, the net-to-connection rule and the `u` axis rule.
10. Deferred rows: confirm ZMK wired split at the first firmware story (PRD OQ2); gerber layer content (silk, mask, pours); tilt/chamfer/loft.
