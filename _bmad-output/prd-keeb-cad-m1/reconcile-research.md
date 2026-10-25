# Input reconciliation: competitor research vs PRD (milestone 1)

- **Input:** `_bmad-output/research-keyboard-design-toolchain-competitors/research-keyboard-design-toolchain-competitors.md` (2026-10-24), plus its digests where the report summarises them (`digests/voice-sweep-r1-1.md`, `digests/voice-reddit-r3-1.md`, `digests/pcb-layout-r2-1.md`)
- **Checked against:** `prd-keeb-cad-m1.md`, `addendum.md`, `.memlog.md` (the memlog decisions are authoritative), `discovery-digests.md`
- **Date:** 2026-10-25

## Already reflected (no action)

- Wedge = change without losing work. Covered by the Vision, the §4.0 control/follow matrix and FR-12 (incremental routing).
- Firmware sync as an uncontested piece. Covered by FR-15 and FR-16. ZMK only is a memlog decision; it overrides the research's "QMK/ZMK/VIA JSON".
- Freerouting as a candidate and a quality reference. Covered by the addendum and §9.1.
- Ergogen geometry op set. Covered by FR-6 and the addendum.
- Unrouted connections are reported, never hidden. Covered by FR-12 and SM-C2.

## Gaps (ranked by impact on milestone 1)

### G1. No design-rule or electrical-constraint requirements for routing and export (high)

**Research says:** The one first-timer who finished a full build (Nine, [voice-sweep-r1-1], 2022, stale but primary) needed several routing attempts over **antenna keep-out** and **power trace widths**. They also struggled to fit the **nice!view** pads and wiring, and changed switch pin assignments to make routing easier. A 2026 first-timer had to start "almost from scratch" because components sat **too close to the board edge** [28 / F6]. Another got review feedback on a **missing ground pour** and TX/RX noise [F10]. kle-ng already ships live DRC (0.2 mm clearance, 0.25 mm hole clearance, shorts, courtyard overlap) [14].

**PRD says:** "Keep-outs" appear in the glossary and FR-9, but no requirement:
- makes the router respect part keep-outs (such as the nice!nano BLE antenna area on the wireless variant),
- defines net classes (wider power/VBAT/GND traces, battery and power-switch nets),
- sets an edge-clearance rule or ground pour, or
- requires an in-tool DRC.

SM-3 only says the files "pass the fab's checks". That proves the board can be manufactured, not that it works electrically. SM-C2 forbids loosening clearances, but no FR ever sets them.

**Why it matters for M1:** M1 must route both Corney Island variants itself and export gerbers directly. The wireless variant (nice!nano, nice!view, battery, power switch) is exactly where these failures show up. A board can pass the fab's DRC and still have a dead antenna or undersized power traces.

**Suggested fix:**
- Add an FR for design rules: per-net-class width and clearance, edge clearance, part keep-outs that the router obeys, and optionally a ground pour.
- Add an FR for an in-browser DRC whose result gates the gerber export.
- Use Corney Island's own KiCad/Freerouting rules as the reference values (addendum).
- Add a matching item to the routing spike: can the candidate engine honour net classes and keep-out zones?

### G2. The integrate-vs-reimplement decision is missing; footprint/part sourcing is unaddressed (high)

**Research says (Rec 3):** Treat kle-ng and kbplacer as an integration option as well as competitors. Both are open source and already cover placement plus the switch-diode template routing. keeb-cad could add the preservation layer on top. The ceoloide/ergogen-footprints library is active (2026-10-23) [3].

**PRD says:** The routing spike considers only general routers (tscircuit, Freerouting). FR-8 lists a part catalogue (Choc v2 hotswap, diode, SK6812mini-e, nice!nano, OLED, nice!view, TRRS, battery connector, power switch, reset, M2) but never says where the footprints come from. FR-3 (key cell with local tracks) duplicates what kle-ng's template track editor does.

**Why it matters for M1:**
- SM-1 and SM-3 compare against Corney Island's Ergogen output. If keeb-cad uses the same footprints (most likely ceoloide's), pad geometry matches by construction; redrawn footprints add a source of mismatch.
- The browser-only NFR rules out kbplacer, which is a Python KiCad plugin. It does not rule out kle-ng's TypeScript key-cell/DRC code, if the licence allows reuse. Nobody has checked.

**Suggested fix:** Add a decision or open question: footprint source (ceoloide / KiCad libs / own) and whether kle-ng's template routing and DRC are reused. Put it in the spike or the architecture scope.

### G3. No fallback between "browser router works" and "escape to KiCad" (constrained-electronics mode dropped) (medium-high)

**Research says (Rec 4 and cross-insight 3):**
- Cosmos and handwirers dodge routing completely.
- A constrained-electronics mode (fixed MCU module, routing channels by rule, pre-routed MCU zones) could deliver "move a key, nothing breaks" without solving general routing.

**PRD says:**
- §9.1 names browser incremental routing as the top risk.
- The only fallback is the KiCad escape hatch, which stops syncing. In other words, the fallback brings back the exact problem keeb-cad exists to remove.
- The addendum's spike mentions "pre-routed MCU zones", but no requirement or scope option builds on it.

**📐 Angle not covered:** if the spike fails, M1 currently has no way to deliver its core promise. A rule-based mode would keep the promise: fixed-module MCU region, column/row channels and template traces. Corney Island's regular matrix suits it well.

**Suggested fix:** Add to §9 a planned fallback scope to choose if the spike fails: constrained/channel routing kept in sync, with the KiCad escape hatch only as the last resort.

### G4. Research's contrary evidence and caveat on "preservation" were dropped, which weakens the case for FR-12 (medium)

**Research says:**
- The wedge is keeping the builder's **own** (hand) work across changes.
- Contrary evidence: kle-ng's preset tracks move with each key, so for simple layouts "re-running might be good enough".

**PRD says:** "No manual trace editing in M1" (memlog decision). Routing is fully automatic and deterministic (NFR).

**☝️ Logic point:** with no hand-made traces, M1's incremental routing preserves only **machine-made** routes. A deterministic full re-route would give the same "nothing to realign by hand" outcome. Incremental routing still adds value: speed, visual stability of the board, and fewer surprise changes. Those are not the research's preservation wedge, though, and the PRD doesn't say which of them justifies FR-12's extra complexity.

**Suggested fix:** State why incremental routing matters in M1 (latency, stable diffs, a base for M2 manual editing). Alternatively, make "full re-route on change" an acceptable M1 fallback and keep incremental as a stretch goal.

### G5. Demand caveat and interview recommendation dropped without a note; the Vision states inferred pain as fact (low for M1)

**Research says:**
- The core premise has **medium-low** confidence: one recent first-person rework account, with the rest inferred from avoidance behaviour.
- Rec 2: interview 5 or more builders **before the PRD**.

**PRD says:**
- §2.2 makes Sergii the sole user and says "milestone 2 tests it" (demand). This is consistent with the memlog's personal/hobby stakes decision, so skipping interviews for M1 is justified.
- However, the Vision states "Knowing that even a small change costs that much is what makes builders stall or fall back to handwiring" as fact.
- Nothing defines **how** M2 will test demand.

**Suggested fix:**
- Soften the Vision sentence, or cite it as an inference.
- Record that Rec 2 was deliberately deferred.
- Add an M2 placeholder: interviews or a public demo, as the demand test.

## Minor items (note, no PRD change needed unless wanted)

- **Pin budget and routing–pin coupling** [F11, Nine]: builders run out of MCU pins, and some reassign pins to make routing easier. The wired variant (nice!nano with OLED, TRRS and an LED data chain) is pin-tight. FR-15 derives the pin mapping, but no requirement says the tool checks the pin budget, or whether the router may choose pins. Consider a validation for "pins exhausted".
- **Case/PCB/component fit** [Nine: standoffs and components "should have been moved to ease case fitting"]: FR-14 follows the outline and part-owned cutouts, but nothing checks component height (battery, nice!view, hotswap sockets) against the tray's 4 mm internal gap, or standoff positions against parts. Consider an interference check, or record it as M2 scope.
- **Staleness:** kle-ng releases about every 8 days and already has Keep/Clear behaviour on template edits [pcb-layout-r2-1 §8]. The research says to re-run before any positioning decision after January 2027. That doesn't matter for a personal M1, but it does matter before M2's "other builders" step. Open research questions (does Temporal keep hand routes? how does Freerouting perform on keyboard matrices?) could feed the routing spike; the second one directly benchmarks a spike candidate.
- **Ergogen docs/knowledge stall** (5 voices) supports FR-1's "without config" goal, so it is already aligned.

## Notes on the requested probe list

- "nice!view / antenna keep-out / power trace widths" all come from a single **2022** blog (Nine). The research's own staleness rules call it stale. It is still primary and first-person, and the physics hasn't changed, so G1 stands on engineering grounds more than on demand evidence.
- "DRC" comes from kle-ng's feature set and the F6/F10 voices (G1).
- "Constrained-electronics mode" is G3, "integrate kle-ng/kbplacer" is G2, the "interview recommendation" is G5, and "staleness caveats" are covered under minor items.
