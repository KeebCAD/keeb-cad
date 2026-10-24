# Voice + tool sweep, round 1, agent 1

Run date: 2026-10-24. Budget used: 15 tool calls, 6 sources read in depth (plus search snippets). Coverage is THIN. Reddit itself was not reached (search only surfaced Lemmy mirrors), and HN threads were not found. Treat the sentiment section as a small set of voices, not a pattern.

## Findings

### A) Builders' voice

- Ergogen "lacks any support for routing the PCB". In basic use, "every change in Ergogen config requires routing the keyboard from scratch." The author built a KiCad plugin that "records" routes back into Ergogen footprint config so they can be regenerated. Project is "still under development and not ready for manufacturing" (1 star, no releases). Segment: repeat/advanced hobbyist designer, design stalled. | https://github.com/yanshay/loprokap | GitHub (yanshay) | pub_date unknown (commit dates not visible) | accessed 2026-10-24 | high (primary, author's own words), low on recency | sentiment
- Same source: the route-recording workaround (Ergogen plus KiCad plugin, in the author's "ergogen-stuff" repo) is a grassroots attempt at "move a key and keep routes". It is evidence of demand, not a solved product. | https://github.com/yanshay/loprokap | GitHub | unknown | accessed 2026-10-24 | medium | feature
- A first-timer ("zero knowledge about electrical engineering") dropped Ergogen and rebuilt from scratch in KiCad. Ergogen made it "tricky to figure out how to incorporate the pads and wiring needed for the nice!view". Other pain points: closed outline arcs were "fiddly", routing took several attempts (antenna keep-out, power trace widths), switch pin assignments changed to ease routing, and the case was redesigned several times. The author realised too late that PCB components and standoff holes "should have been moved to ease case fitting", which is a case/PCB coupling failure. The author iterated key position on paper because "changes of a few degrees or millimeters can make a surprising difference." Segment: first-timer, finished. | https://www.rousette.org.uk/archives/introducing-the-nine-keyboard/ | personal blog (rousette.org.uk) | 2022-12-18 | accessed 2026-10-24 | high (primary) BUT STALE (>12 months) | sentiment
- A Hack Club learner said that once the PCB was exported from Ergogen and opened in KiCad, "everything looked different", and switched to drawing the PCB directly in KiCad. Segment: first-timer/student. Seen only as a search snippet, because the full page redirected and was not fetched. | https://highway.hackclub.com/projects/dynamicwhitehat/corneucopia | Hack Club Highway | unknown (likely 2025) | accessed 2026-10-24 | low | sentiment
- Pattern across 3 independent voices (loprokap, Nine, Corneucopia): Ergogen handles key/point layout, but the moment work moves to KiCad (routing, extra components, displays) the parametric link breaks. Builders then either abandon the generator or hand-maintain KiCad. | (sources above) | — | 2022–2026 | accessed 2026-10-24 | medium (3 voices, mixed dates) | sentiment
- A keyboard PCB designer reported that routing traces was harder than the diode matrix, and that it forced them to learn 4-layer boards and vias. They moved from Eagle to KiCad. Search snippet only. | https://hackaday.io/project/183834/log/202823 | hackaday.io | ~2022 (unverified) | accessed 2026-10-24 | low | sentiment
- kbd.news editor's note: KLE "becomes difficult with rotation and symmetry", for example on split boards, so Ergogen is suggested for those. | https://kbd.news/KiCad-plugin-for-keyboard-design-2033.html | kbd.news | 2023-06-01 | accessed 2026-10-24 | medium, stale | positioning

### B) Tools not on the exclusion list

- **keyboard-toolbox (kleinpa)**: Python/KiCad toolkit that turns a layout into an unrouted PCB with components, a switch plate (DXF/SVG), QMK info.json and KLE JSON. Supports ATmega32u4 / Pro Micro. Routing is left to the user. This is the closest "one layout → plate + PCB placement + firmware" pipeline found, but it has no routing and no case. Status/dates not verified. | https://github.com/kleinpa/keyboard-toolbox | GitHub | unknown | accessed 2026-10-24 | low (search snippet) | feature
- **keycad (sowbug)**: generates KiCad PCBs from KLE JSON. The MCU and USB-C are not auto-placed and must be moved by hand. Status/dates not verified. | https://github.com/sowbug/keycad | GitHub | unknown | accessed 2026-10-24 | low | feature
- **Kalerator (clueboard/skullydazed)**: KLE → EAGLE script web app. The Docker image was last updated about 9 years ago, so it is effectively dead. | https://hub.docker.com/r/skullydazed/kalerator | Docker Hub | ~2017 | accessed 2026-10-24 | medium | trajectory
- **keyboard-layouter (yskoht; fork by darakuneko)**: KiCad plugin that places switch footprints from KLE JSON. Tested on pcbnew 7.0.10, Cherry MX footprints only. Placement only. | https://github.com/yskoht/keyboard-layouter | GitHub | ~2024 (unverified) | accessed 2026-10-24 | low | feature
- **KLE-NG KiCad project generator**: mentioned in search results as a feature of Keyboard Layout Editor NG. Not verified. | (search snippet, no primary) | — | unknown | accessed 2026-10-24 | low | feature
- **General AI PCB tools (not keyboard-specific)**: Flux.ai (browser EDA with AI agent), Quilter (RL-based autonomous layout, works alongside KiCad/Altium/etc.), DeepPCB (cloud autorouter), Cadence Allegro X AI (enterprise). Source is a JLCPCB marketing/blog roundup titled "AI Tools for PCB Design: 10 Tools to Know in 2026". It reports a Claude + KiCad MCP server laying out a 2-layer buck converter with zero ERC/DRC errors after fixes. None of these is shown applied to keyboard matrices. | https://jlcpcb.com/blog/ai-tools-for-pcb-design | JLCPCB blog (vendor, marketing register) | 2026 (exact date unverified) | accessed 2026-10-24 | low-medium | trajectory
- **AI-PCB-Generator (22507260)**: open-source natural language → components, nets, footprints and placement, using GPT-4o, Gemini or Claude. Self-described as "world's first", so marketing register. Maturity unverified. | https://github.com/22507260/AI-PCB-Generator | GitHub | unknown | accessed 2026-10-24 | low | feature
- **Ergogen agent skill (fandhe-ai/agent-reference-skills/ergogen)**: an AI-agent "skill" listing for Ergogen exists on skillselion.com. The page content could not be read, so its function is unverified. This hints that people are pairing LLM agents with Ergogen. | https://skillselion.com/skills/fandhe-ai/agent-reference-skills/ergogen | skillselion (aggregator) | unknown | accessed 2026-10-24 | low | trajectory
- **Commercial "design my keyboard PCB" services**: several Fiverr gigs offer custom keyboard PCB + firmware (+ case/keycaps) in KiCad/Altium. The human-service market exists, and no productised service was found. | https://fiverr.com/david_cr70/design-high-quality-custom-mechanical-keyboard-pcb-ready-for-manufacturing | Fiverr | unknown | accessed 2026-10-24 | medium | positioning
- kbplacer (on the exclusion list, noted only for context): it now advertises KLE, VIA, QMK and ergogen inputs, with ergogen support flagged "new experimental feature". | https://github.com/adamws/kicad-kbplacer | GitHub | unknown (current README) | accessed 2026-10-24 | medium | feature

## Leads worth chasing

1. **yanshay/ergogen-stuff**: the route-record/replay plugin. It is the most direct prior art for "move key, keep routes". Check how it handles moved keys and when it was last committed.
2. **Corneucopia and other Hack Club Highway keyboard projects**: a large, recent cohort of first-time designers (2025) with public journals. It is a good surface for unbiased, non-survivor voices, including stalled projects.
3. **keyboard-toolbox (kleinpa)**: verify activity. It is the closest existing "single source → plate + PCB + QMK" pipeline.
4. **KiCad MCP servers + Claude/LLMs applied to keyboards**: search "kicad mcp keyboard" and "claude ergogen". Possible fast-moving 2026 trajectory.
5. **Flux.ai and Quilter**: check whether either has keyboard templates or users posting keyboard builds.
6. **Reddit direct**: use site:reddit.com with queries like "ergogen reroute", "gave up keyboard pcb" and "abandoned split keyboard". Not reached this round.
7. **KLE-NG KiCad generator**: verify the claim and its scope.

## Looked for, not found

- No HN thread on keyboard design toolchains surfaced (query returned non-HN pages).
- No direct Reddit threads reached. Lemmy mirrors of r/ErgoMechKeyboards only returned ergonomic-pain threads, not toolchain pain.
- No web-based integrated keyboard designer launched in 2025–2026 was found (beyond the exclusion list).
- No keyboard-specific AI PCB tool was found.
- No productised commercial "layout in → PCB out" service was found, only freelance gigs.
- No news on a new Ergogen version or web editor in 2025–2026 (query returned noise; check the repo directly).
- No tool found that claims trace-routing persistence across layout changes, apart from the loprokap/ergogen-stuff workaround.
- Firmware-sync pain (QMK/ZMK layout regeneration after key moves) got no voices this round.
