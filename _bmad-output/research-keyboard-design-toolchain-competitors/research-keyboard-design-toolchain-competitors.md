---
title: 'competitive research: keyboard design toolchain competitors'
type: 'competitive'
topic: 'keyboard design toolchain competitors'
decision: "Where is keeb-cad's wedge: which slice of 'move a key without breaking plate/PCB/case/firmware' is unsolved, and for which builders"
source: 'native run'
status: complete
preset: 'standard'
validation: 'normal'
created: '2026-10-24'
updated: '2026-10-24'
claims_verified: 6
claims_unverified: 4
---

# competitive research: keyboard design toolchain competitors

**Decision this research serves:** Where is keeb-cad's wedge? Which slice of "move a key without breaking plate/PCB/case/firmware" is still unsolved, and for which builders?

## Executive summary

**What the evidence says to do:** don't build another layout-to-starter-board generator. That job is solved several times over, and the strongest competitor ships about every eight days. The unclaimed ground is **keeping the builder's own work intact when the layout changes**: hand-routed traces, MCU/USB placement, the board outline, and the case fit. Every tool examined regenerates the design from scratch. None updates it incrementally.

Three findings drive that answer:

1. **Placement is solved; preservation is not.**
   - Ergogen regenerates the plate, case, outline and footprint placement from one config [1].
   - kle-ng and kbplacer regenerate the switch matrix, with template switch-diode routing and a basic row/column router [10][13].
   - None of them keeps manual routing across a re-run. Re-running kbplacer after hand-routing left the routed columns behind [15]. That builder used kbplacer for placement only. kle-ng leaves the MCU, USB and outline to the user [13].
   - Even the most automated pipeline found still hand-routes the main-board signal traces [23].
2. **Builders dodge iteration rather than suffer it.**
   - Recent Reddit voices stall at the Ergogen → KiCad routing step [24][25].
   - Others avoid PCBs until the layout is final, using handwiring or wiring harnesses: "failed on about 4 or 5 designs… No ruined pcb" [29][30].
   - Read this way, the pain looks less like constant rework and more like **iteration that never happens because the cost is too high**.
3. **The incumbents are uneven.**
   - Ergogen core has been dormant since 2025-11 [1]. Its 2026 energy is in a footprint library [3].
   - The original KLE, ai03 and swillkb are dormant or archived [16][17][18].
   - Cosmos sidesteps routing with standard flex PCBs and its own controllers [6][7].
   - kle-ng (one author, very fast cadence) is the live threat in the beginner, browser-based segment [12][14].

**Biggest caveat:** direct, recent, first-person testimony of "I moved a key and had to re-route the board" is **thin**. Only one recent first-person rework account turned up [28], plus older snippets [32]. The demand is inferred from avoidance behaviour and stall points, not measured. Validate with builder interviews before committing.

## 1. Feature teardown: what survives a key move

| Tool | Plate | PCB placement | Switch-diode routing | Row/col routing | MCU/USB/outline | Case | Firmware layout | Keeps manual work on re-run? |
|---|---|---|---|---|---|---|---|---|
| Ergogen [1][2] | regenerates | regenerates | no (router footprint add-on [4]) | no | outline yes; MCU via footprint | regenerates (basic) | no; ZMK shield only on roadmap [2] | n/a: it regenerates |
| Cosmos [6][7] | yes | n/a (generic flex PCB, cut to fit) | n/a | n/a | own Lemon MCU only | regenerates (STEP/STL) | QMK/ZMK, Lemon only; matrix mapped by pressing keys [7] | n/a |
| kle-ng [12][13][14] | regenerates (SVG/DXF/STL) | regenerates | template, copied per key | basic auto, "may leave connections unrouted" | **not generated** | no | no export found | no: fresh board every run |
| kbplacer [10][11] | no | regenerates | auto or template | simplified, `ROW/COL` nets only | outline as convex hull; a "controller circuit template" option for repeated parts (medium) | no | no | **no**: hand-routed columns left behind [15] |
| Ergogen + Freerouting pipelines (samoklava, clavis) [20][21] | yes | yes | autorouted | autorouted | via config | yes | no | no: full re-autoroute |
| Temporal pipeline [23] | yes | yes | — | — | main-board signals hand-routed | yes | — | unclear (open question) |
| Dactyl family (compactyl) [33] | case only | — | — | — | — | yes | — | dormant since 2022 |

Answer to the hard question: has anyone shipped automatic re-routing when a key moves? **Partially.** Whole-matrix regeneration exists [10][13]. Re-routing only what a moved key affects while keeping hand work does not; it turned up in no source across four researchers. That is absence of evidence (medium confidence). kle-ng's v0.50.0 "track editor" (2026-10-22) edits switch-diode tracks in the footprint preview. Read with the docs' preset modes, that makes it a per-key template editor with DRC, not a board-level router [13][14] (medium).

Ergogen's yanshay "Router" footprint stores per-key traces relative to each key's point. It is unmaintained (last push 2023-10), and its docs don't cover routes between keys [4]. Its author's own keyboard project states the motive outright: "every change in Ergogen config requires routing the keyboard from scratch" [5].

Freerouting v2.5.0 (2026-10-05) claims fully routed boards rose from 52% to 75% on its own 1,157-board benchmark. It is now scriptable through a CLI and a KiCad 10 extension [19]. The figures are self-reported, with no keyboard-specific results (medium confidence). AI autorouters (DeepPCB, Quilter) show only vendor marketing [34] (low).

## 2. Positioning and audience

- **Ergogen:** code-first YAML for ergo and splay designs. Its documentation is self-described as "still in progress" [1], and builders say it "hasn't been updated for years" and that the know-how lives in Discord [26]. One repeat designer says that without rotation or splay "you really don't benefit from it" [27].
- **Cosmos:** a GUI plus Expert Mode for 3D-printed, curved, handwired or flex builds. Its docs assume CAD and printing skills, and admit the rotation GUI is hard to use [6].
- **kle-ng:** browser-based, built for people who already know KLE. It hands off "a starting point" KiCad project [13]. It is converging on an all-browser layout → plate → PCB path for beginners and intermediates [14].
- **kbplacer:** a KiCad plugin and CLI for intermediate and expert KiCad users [10].
- **First-timer cohorts:** Hack Club's Hackpad runs KiCad → ai03 plate → Fusion 360 → KMK/QMK/ZMK, and tells builders to "measure your PCB dimensions manually" to fit the case [22]. Case and PCB sync is institutionalised as manual.
- **Long tail:** keyboard-toolbox [35] (single source → plate, unrouted PCB, QMK info.json; dormant since 2024) and keycad [36] (abandoned 2021). They are precedents for the "one source of truth" idea, and neither got traction.

## 3. Trajectory

| Project | Last activity | Signal |
|---|---|---|
| Ergogen core | 2025-11-02 [1] | ~12 months idle; 1,578 stars; no v5 or fork found |
| ceoloide/ergogen-footprints | 2026-10-23 [3] | active community layer, KiCad 8 |
| Cosmos | 2026-07-20 [9]; release post 2026-07-12 [8] | active, effectively one maintainer, 675 stars |
| kle-ng | v0.50.1, 2026-10-23 [14] | ~1 release every 8 days, PCB-focused |
| kbplacer | v0.20, 2026-10-21 [11] | very active, 544 stars |
| Freerouting | v2.5.0, 2026-10-05 [19] | renewed, scriptable |
| KLE (original) | 2024-09-17 [16] | dormant |
| ai03 builder / swillkb (kad) | 2022 [17][18] | archived or dormant |

kle-ng and kbplacer come from **one author** (adamws) and are moving fastest. That makes them both the strongest competitor and a single-maintainer risk.

## 4. Builders' voice

Source: 12 Reddit threads read in depth, mostly r/ErgoMechKeyboards in 2026, plus guides and blogs. The tallies count distinct people.

- **Ergogen learning curve and doc stall: 5 people** [24][25][26]. "I get lost af in it as well" [25].
- **KiCad routing after Ergogen as the stall or the leftover manual step: 3 people** [23][24]. "how do you route the connections in Kicad, since I haven't been able to figure it out?" [24]
- **Iteration cost forcing rework: 5 people, but weak.** One recent first-person account: "I had almost to start from scratch" [28]. The others are older snippets: "I need to reroute all the diode wiring elsewhere" [32] (2025-06, stale).
- **Avoiding the PCB to keep iteration cheap: 4 people** [29][30]. That includes a vendor with about 40 designs who handwires almost everything [30].
- **Wishes:** an end-to-end pipeline (2 people) [23]; a fuller generated KiCad project with MCU and parts library (1) [27]; LLMs used for configs and PCB review (3) [26][28].
- **Not found:** complaints about the case not fitting after a change; requests for an autorouter; recent kbplacer user voices.

Confidence: **medium-low** for the core premise, **medium** for the stall points. Segment read: the pain concentrates in **first-timers**, while repeat designers build their own pipelines or handwire.

## Cross-dimension insights

- **Regeneration is commoditised, and preservation isn't.** Every active competitor converges on "regenerate from source" (teardown). Builders respond by avoiding PCBs or building pipelines (voice). So the open product is *incremental update with manual work preserved*, and that is also the hardest engineering problem in the space.
- **The fastest competitor sits in the beginner segment, where the pain is.** kle-ng's momentum (trajectory) aims at first-timers, who are exactly where the stalls cluster (voice). Competing there means racing a single prolific author on his own ground. Repeat designers have workarounds and less need.
- **Cosmos shows the alternative is avoiding routing altogether.** Standard electronics remove the routing problem (teardown), and four builders independently choose handwiring for the same reason (voice). A keeb-cad that also constrains electronics, using modules and a fixed controller footprint, could reach "move a key, nothing breaks" without solving general routing.
- **The firmware layout is nearly unclaimed among active tools.** Cosmos generates firmware only for its own controllers [7]. No tool found generates it from an Ergogen config, and kle-ng has no export. Dormant tools did emit QMK files (keyboard-toolbox [35], keycad [36]), so the idea isn't new; it was never adopted. It is a small, tractable piece of the cross-artifact sync story (low confidence on absence).

## Contrary evidence

The red-team pass was off (config default). Contrary signals found during the run:

- The core premise has little recent first-person testimony (§4). Repeat designers report that pipelines make iteration "very low-cost now" [23], which suggests the pain is solvable with existing tools for people who invest in setup.
- kle-ng's preset tracks move with each key [13]. For simple layouts, re-running might be good enough, and preservation might matter only for complex boards. This is an inference and was not tested.

## Recommendations

1. **Position keeb-cad around "change without losing work," not "generate a board."** This feeds the product brief's alternatives and differentiation sections. Confidence: medium (the gap is consistent across all sources). Demand is low-medium (thin voice).
2. **Run a validation step before the PRD:** interview 5 or more builders, split between first-timers and repeat designers, about the last layout change they made or *avoided*. This tests whether the avoidance pattern [29][30] reflects demand. It feeds the brief's problem statement.
3. **Treat kle-ng and kbplacer as an integration option as well as a competitor.** Both are open source, scriptable, and cover placement and the template switch-diode routing [10][13]. keeb-cad could add the preservation and sync layer on top instead of re-implementing them. This feeds architecture. Confidence: medium (author's docs only, no independent confirmation).
4. **Consider a constrained-electronics mode, Cosmos-style,** as a way to ship "nothing breaks" early: fixed MCU module, routing channels by rule. This feeds the brief's scope options. Confidence: medium.
5. **Firmware layout sync (QMK/ZMK/VIA JSON) is a cheap win, uncontested among active tools,** to include in the MVP. Confidence: low (absence-based; dormant precedents exist [35][36]).

## Open questions

- Does Temporal's pipeline keep hand-routed traces when the layout regenerates [23]? Reading the curbol/temporal repo would answer it, and it is the closest existing answer to the preservation problem.
- What does kle-ng do when a key moves after preset tracks are drawn? Answer by testing it in the browser.
- How do Freerouting v2.x results look on keyboard matrices specifically? Run it on 2–3 open-source keyboard boards.
- What do Discord communities (Absolem Club/Ergogen, Cosmos) say? No tool can read them, so this needs a human pass.
- The unread beginner workflow thread (r/ErgoMechKeyboards 1xar6rh, 2026-10-20).

## Source appendix

| # | Supports | Publisher | Pub date | Accessed | Confidence |
|---|---|---|---|---|---|
| [1] | Ergogen outputs, un-routed PCBs; last commit; docs "in progress" | [ergogen (GitHub)](https://github.com/ergogen/ergogen) | 2025-11-02 | 2026-10-24 | high |
| [2] | Ergogen roadmap: routing, ZMK shield items open | [ergogen roadmap.md](https://raw.githubusercontent.com/ergogen/ergogen/develop/roadmap.md) | undated | 2026-10-24 | high |
| [3] | ceoloide footprint library active, utility_router | [ceoloide (GitHub)](https://github.com/ceoloide/ergogen-footprints) | 2026-10-23 | 2026-10-24 | high |
| [4] | yanshay Router footprint, per-key relative traces; unmaintained | [yanshay/ergogen-stuff (GitHub)](https://github.com/yanshay/ergogen-stuff) | 2023-10-18 | 2026-10-24 | medium |
| [5] | "every change … requires routing the keyboard from scratch" | [yanshay/loprokap (GitHub)](https://github.com/yanshay/loprokap) | undated | 2026-10-24 | medium |
| [6] | Cosmos GUI/Expert Mode, outputs, electronics options, audience | [Cosmos docs](https://ryanis.cool/cosmos/docs/) | undated | 2026-10-24 | high |
| [7] | Cosmos firmware autogen, Lemon only, matrix by key press | [Cosmos firmware docs](https://ryanis.cool/cosmos/docs/firmware/) | undated (cites 2025-12) | 2026-10-24 | high |
| [8] | Cosmos Summer Software Release | [Cosmos blog](https://ryanis.cool/cosmos/blog/) | 2026-07-12 | 2026-10-24 | high |
| [9] | Cosmos repo activity, stars | [GitHub API](https://api.github.com/repos/rianadon/Cosmos-Keyboards) | 2026-07-20 | 2026-10-24 | high |
| [10] | kbplacer placement, routing modes, CLI | [adamws/kicad-kbplacer (GitHub)](https://github.com/adamws/kicad-kbplacer) | 2026-10 | 2026-10-24 | high |
| [11] | kbplacer v0.20 release, cadence | [kbplacer releases](https://github.com/adamws/kicad-kbplacer/releases/tag/v0.20) | 2026-10-21 | 2026-10-24 | high |
| [12] | kle-ng positioning, built-in plate and PCB generators | [adamws/kle-ng (GitHub)](https://github.com/adamws/kle-ng) | 2026-10-24 | 2026-10-24 | high |
| [13] | kle-ng PCB generator scope; no MCU/USB/outline; "starting point" | [kle-ng PCB generator docs](https://editor.keyboard-tools.xyz/docs/pcb-generator) | undated | 2026-10-24 | high |
| [14] | kle-ng v0.50.0 template track editor; release cadence | [kle-ng releases](https://github.com/adamws/kle-ng/releases/tag/v0.50.0) | 2026-10-22 | 2026-10-24 | high |
| [15] | kbplacer re-run left routed columns behind | [Hack Club Blueprint #8607](https://blueprint.hackclub.com/projects/8607) | 2026-01-11 | 2026-10-24 | medium |
| [16] | Original KLE dormant | [ijprest/keyboard-layout-editor (GitHub)](https://github.com/ijprest/keyboard-layout-editor) | 2024-09-17 | 2026-10-24 | high |
| [17] | ai03 plate builder archived | [ai03-2725/another-keyboard-builder (GitHub)](https://github.com/ai03-2725/another-keyboard-builder) | 2022-01-17 | 2026-10-24 | high |
| [18] | swillkb library dormant | [swill/kad (GitHub)](https://github.com/swill/kad) | 2022-04-22 | 2026-10-24 | high |
| [19] | Freerouting v2.5.0 benchmark claim, CLI, KiCad 10 | [Freerouting release](https://github.com/freerouting/freerouting/releases/tag/v2.5.0) | 2026-10-05 | 2026-10-24 | medium |
| [20] | Ergogen + Freerouting + KiKit CI pipeline | [sol/samoklava (GitHub)](https://github.com/sol/samoklava) | undated | 2026-10-24 | medium |
| [21] | Ergogen + Freerouting Makefile pipeline | [scipioni/clavis (GitHub)](https://github.com/scipioni/clavis) | undated | 2026-10-24 | medium |
| [22] | Hackpad first-timer flow; manual PCB measurement for case | [Hack Club Hackpad guide](https://stardance.hackclub.com/missions/hackpad/guide) | undated | 2026-10-24 | high |
| [23] | Temporal: automated pipeline, signal traces still hand-routed | [r/ErgoMechKeyboards](https://www.reddit.com/r/ErgoMechKeyboards/comments/1u8ywq5/temporal_a_wireless_3642_key_split_with_a_fully/) | 2026-06-18 | 2026-10-24 | high |
| [24] | First-timer stalls routing after Ergogen | [r/ErgoMechKeyboards](https://www.reddit.com/r/ErgoMechKeyboards/comments/1s6pso1/help_with_ergogen_and_pcb_routing/) | 2026-03-29 | 2026-10-24 | high |
| [25] | "Absolutly lost on Ergogen"; KLE-based workaround | [r/ErgoMechKeyboards](https://www.reddit.com/r/ErgoMechKeyboards/comments/1sjs779/absolutly_lost_on_ergogen/) | 2026-04-12 | 2026-10-24 | high |
| [26] | Ergogen docs stale; knowledge in Discord; AI docs | [r/ErgoMechKeyboards](https://www.reddit.com/r/ErgoMechKeyboards/comments/1uq45nl/ergogen_docs_updated_with_claude/) | 2026-07-07 | 2026-10-24 | high |
| [27] | kle-ng KiCad 9 export matrix-only; wish for MCU/parts | [r/ErgoMechKeyboards](https://www.reddit.com/r/ErgoMechKeyboards/comments/1qfmztc/kleng_can_now_generate_kicad_9_projects/) | 2026-01-17 | 2026-10-24 | medium |
| [28] | First-timer "almost start from scratch"; LLM review | [r/ErgoMechKeyboards](https://www.reddit.com/r/ErgoMechKeyboards/comments/1uo2elg/help_with_pcb_design/) | 2026-07-05 | 2026-10-24 | high |
| [29] | Handwiring and harness to avoid ruined PCBs | [r/ErgoMechKeyboards](https://www.reddit.com/r/ErgoMechKeyboards/comments/1ollcop/handwire_vs_pcb/) | 2025-11-01 | 2026-10-24 | high |
| [30] | Vendor with ~40 designs handwires almost all | [r/olkb](https://www.reddit.com/r/olkb/comments/1sbsvq9/all_the_keyboards_ive_designed_and_built_over_the/) | 2026-04-03 | 2026-10-24 | medium |
| [31] | Cosmos STL breakage over 30 iterations | [r/ErgoMechKeyboards](https://www.reddit.com/r/ErgoMechKeyboards/comments/1v08bs1/cosmos_keyboard_generator/) | 2026-07-18 | 2026-10-24 | medium |
| [32] | "reroute all the diode wiring" after a mod | [r/ErgoMechKeyboards](https://www.reddit.com/r/ErgoMechKeyboards/comments/1l2yqx9/next_totem_plan/) | 2025-06-04 | 2026-10-24 | low |
| [33] | compactyl dormant | [GitHub API](https://api.github.com/repos/dereknheiley/compactyl/commits?per_page=3) | 2022-12-03 | 2026-10-24 | high |
| [34] | AI autorouters: vendor claims only | [DeepPCB](https://deeppcb.ai/what-is-the-best-ai-pcb-autorouter-in-2026/) | 2026 | 2026-10-24 | low |
| [35] | keyboard-toolbox single-source precedent, dormant | [kleinpa/keyboard-toolbox (GitHub)](https://github.com/kleinpa/keyboard-toolbox) | 2024-10-09 | 2026-10-24 | high |
| [36] | keycad abandoned | [sowbug/keycad (GitHub)](https://github.com/sowbug/keycad) | 2021-01-17 | 2026-10-24 | high |

Cosmos's own issues (STL breakage over 30 iterations [31]) are noted under teardown context but carry little weight for the decision.

## Staleness map

Re-check windows: features 3 months, trajectory 6 months, sentiment 12 months (from the competitive pack). Computed with `recon_kit.py staleness`.

| Claim | Class | Source date | Re-check by |
|---|---|---|---|
| [7] Cosmos firmware is Lemon-only | feature | 2025-12-09 | 2026-03-09 (**past**) |
| [15] kbplacer re-run leaves routed columns behind | feature | 2026-01-11 | 2026-04-11 (**past**) |
| [1] Ergogen core idle | trajectory | 2025-11-02 | 2026-05-02 (**past**) |
| [23] Temporal still hand-routes signal traces | feature | 2026-06-18 | 2026-09-18 (**past**) |
| [29] Builders handwire to keep iteration cheap | sentiment | 2025-11-01 | 2026-11-01 |
| [19] Freerouting v2.5 benchmark | feature | 2026-10-05 | 2027-01-05 |
| [10] No incremental re-routing tool | feature | 2026-10-21 | 2027-01-21 |
| [14] kle-ng track editor is template-only | feature | 2026-10-22 | 2027-01-22 |
| [13] kle-ng PCB generator scope | feature | 2026-10-24 | 2027-01-24 |
| [28] Thin first-person reroute testimony | sentiment | 2026-07-05 | 2027-07-05 |

The "past" re-check dates are measured from each source's own date. [1] and [7] were observed live today, so they hold as of 2026-10-24. [15] and [23] are older single accounts and could already be out of date. The earliest re-check is **2026-03-09** ([7]), and the next one coming up is **2026-11-01** ([29]). kle-ng and kbplacer change roughly weekly, so re-run this before any positioning decision made after January 2027.
