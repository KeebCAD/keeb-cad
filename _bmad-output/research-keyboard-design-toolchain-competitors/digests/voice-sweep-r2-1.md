# Voice sweep r2-1: Reddit/HN builder voice and verification of new tools

Accessed 2026-10-24. Budget: 16 tool calls, of which 6 were in-depth fetches (GitHub x2, GitHub API x2, Hack Club guide x1, plus search snippets).

**Big caveat:** Reddit could not be reached. WebSearch with `allowed_domains: reddit.com` returns `400: domain not accessible to our user agent`, and open-web queries surfaced no Reddit threads. So **no Reddit voice is in this digest.** Question A is answered only through Hacker News snippets and GitHub READMEs. All HN material is older than 12 months and is flagged as such.

## Findings

| # | Claim | Source URL | Publisher | pub_date | Accessed | Confidence | Class | Segment |
|---|---|---|---|---|---|---|---|---|
| 1 | A builder says that with basic Ergogen, "every change in Ergogen config requires routing the keyboard from scratch." They wrote a KiCad plugin that records routes and reapplies them. This is the direct "move key → reroute" pain. | Search snippet. The quote was attributed to "a GitHub project" among results that included https://github.com/yanshay/loprokap, https://github.com/Choco617/ErgoChoco-PCB and https://github.com/tharj/Pear69. **Which repo it came from is unconfirmed.** | GitHub (individual builder) | unknown | 2026-10-24 | medium on the claim, low on the attribution | sentiment + feature (workaround) | repeat designer (wrote tooling) |
| 2 | Ergogen outputs an unrouted KiCad PCB. Routing is "the biggest missing piece," done by hand or with an autorouter. | https://flatfootfox.com/ergogen-part5-kicad-firmware-assembly/ (snippet) | FlatFootFox blog (tutorial author) | ~2023 (Ergogen v4 series; older than 12 months) | 2026-10-24 | high | feature | first-timer (tutorial audience) |
| 3 | HN commenter: Ergogen "lacks the ability to spit out routed PCBs," but the Samoklava repo shows a KiCad CLI add-on (autorouting) producing fab-ready files. You should still inspect the output. | https://news.ycombinator.com/item?id=30233143 and the thread around it (snippet) | Hacker News | ~2022 (estimated from item ID; **older than 12 months**) | 2026-10-24 | medium | feature / workaround | repeat designer |
| 4 | HN commenter on Ergogen: it "seems to only support flat layouts" (no 3D-curved boards). | HN thread, snippet (around item 30233143 / 35768943) | Hacker News | ~2022–2023 (**older than 12 months**) | 2026-10-24 | low–medium (one voice) | sentiment | repeat designer |
| 5 | HN commenter: designed their first keyboard with Ergogen "going in with no knowledge of PCB design." They recommend it to beginners, with ruiqimao's guide over the official KiCad guide, which they found "a bit too detailed." | https://news.ycombinator.com/item?id=36321526 (snippet) | Hacker News | ~2023 (**older than 12 months**) | 2026-10-24 | medium | sentiment (positive; learning curve) | first-timer |
| 6 | The kbplacer author on HN positions it as "PCB only, no cases," using KLE input. Through its PyPI page, a parallel snippet mentions experimental Ergogen support. | HN snippet; https://github.com/adamws/kicad-kbplacer | Hacker News / GitHub | ~2022 HN | 2026-10-24 | medium | positioning | vendor/tool author |
| 7 | **keyboard-toolbox (kleinpa)**: a Python program defines key positions in a Keyboard protobuf, and Bazel builds plate DXF/SVG, an *unrouted* `.kicad_pcb` with required components, QMK info.json, and KLE JSON. The README says: "PCB routing, will need to be done by hand." It supports only the PCB-plus-base-plate sandwich case. MCUs: 32u4, Pro Micro, STM32F072 (untested). | https://github.com/kleinpa/keyboard-toolbox | GitHub (primary) | created 2020-12-01 | 2026-10-24 | high | feature | repeat designer / programmer |
| 8 | keyboard-toolbox activity: last push **2024-10-09**, 2 stars, 76 commits, 7 open issues, not archived, no releases. In practice dormant for about 2 years. A single-source-of-truth precedent with negligible adoption. | https://api.github.com/repos/kleinpa/keyboard-toolbox | GitHub API | 2024-10-09 (last push) | 2026-10-24 | high | trajectory | n/a |
| 9 | **keycad (sowbug)**: KLE JSON → KiCad PCB that is "reasonably good for most conventional layouts." The MCU and USB-C are *not* auto-placed, so you move them by hand. Routing uses bundled Freerouting. It also generates a BOM and QMK snippets. Repo description: "Generates various CAD files for custom keyboards." | https://github.com/sowbug/keycad (search snippet of README) + API | GitHub | created 2020-02-09 | 2026-10-24 | medium-high | feature | first-timer / conventional layouts |
| 10 | keycad activity: last push **2021-01-17**, 5 stars, 23 open issues. **Abandoned** for 5+ years. | https://api.github.com/repos/sowbug/keycad | GitHub API | 2021-01-17 | 2026-10-24 | high | trajectory | n/a |
| 11 | **keyboard-layouter (yskoht)**: a KiCad pcbnew plugin that places switch footprints at KLE JSON positions. Placement only: no routing, case, or firmware. Supports only Cherry MX footprints from the stock KiCad library. The README confirms pcbnew 7.0.10. Release 0.2.0 is for v5/v6. About 100 stars, 15 commits. Forks exist (darakuneko for KiCad 6+LEDs, tamago324, jluisalegria). | https://github.com/yskoht/keyboard-layouter ; https://kbd.news/KiCad-Keyboard-Layouter-1429.html | GitHub / kbd.news | last-commit date **not retrieved**. The 7.0.10 confirmation implies activity around 2024 (inference) | 2026-10-24 | high on features, low on recency | feature / trajectory | first-timer–repeat (JP community) |
| 12 | Prior-generation precedent: the author of klepcbgen (KLE→KiCad) called it "bare-bones," with no ISO-enter and no rotated keys. | https://deskthority.net/viewtopic.php?p=463218 (snippet) | Deskthority | 2020 (**old**) | 2026-10-24 | medium | positioning | first-timer |
| 13 | **Hack Club Hackpad** (first-timer cohort, teens): the official flow is KiCad (PCB, using Hackpad custom libraries for XIAO RP2040/SK6812) → ai03 Plate Generator DXF → Fusion 360 case (exported as STEP) → KMK/QMK/ZMK firmware. Constraints: 2-layer, ≤100×100mm PCB, fully 3D-printed case. | https://stardance.hackclub.com/missions/hackpad/guide | Hack Club (primary) | undated. The page banner mentions a deadline of Oct 31 (presumably 2026) | 2026-10-24 | high | feature | first-timer |
| 14 | In the Hackpad guide, **PCB↔case sync is manual**: "measure your PCB dimensions manually and add tolerance" (0.2mm). Nothing exports the PCB outline to Fusion. The guide warns about the STEP-vs-STL mistake, hole sizes, the USB-C cutout, and diode polarity, and sends stuck users to #hackpad on Slack with screenshots. These are the guide's *anticipated* failure points, not observed complaints. | same | Hack Club | undated | 2026-10-24 | high (as guide content) | feature / sentiment-proxy | first-timer |
| 15 | Hack Club Highway hosts per-builder project pages (e.g. a gamepad). The cohort uses the same KiCad + Fusion stack. Tool recommendations were not verified beyond the Hackpad guide. | https://highway.hackclub.com/projects/kushmdesai/gamepad (search result only) | Hack Club | unknown | 2026-10-24 | low | positioning | first-timer |
| 16 | Tool-hopping pattern in general-hobbyist forums: no single "build a keyboard" program exists. Builders chain KLE → EasyEDA/Eagle/KiCad → OpenSCAD/Fusion/Onshape (one exported Eagle models into Fusion to build a case around the PCB). | https://forum.level1techs.com/t/simple-keyboard-designer/152569 ; https://hackaday.io/project/186812-macroboard (snippets) | Level1Techs / Hackaday.io | ~2020–2022 (**old**) | 2026-10-24 | medium | sentiment | first-timer |

### Pattern counts (independent voices, this run)
- **Move/change → reroute from scratch (Ergogen):** 1 explicit builder voice (F1), plus 2 tutorial/HN statements that routing is the manual gap (F2, F3). Also 1 tool README (F7) that states routing is manual by design.
- **PCB↔case mismatch / manual sync:** 1 primary guide, which institutionalizes manual measurement for a large first-timer cohort (F14). Plus 2 hobbyist case-around-PCB workflows (F16). **No direct complaint voice was found.**
- **Tool-hopping:** 3 voices/sources (F13, F16 x2).
- **Stalled/abandoned designs:** **0 voices found** (see below).
- **Wishlists ("I wish there was a tool…"):** **0 exact hits.**

### Implication for the decision (interpretation, not evidence)
- **Placement from a layout is solved many times over** (Ergogen, kbplacer, keyboard-layouter, keycad, keyboard-toolbox). **Firmware layout export** is partly solved (keyboard-toolbox → QMK info.json, keycad → QMK snippets). Both serve conventional or Ergogen-style flat layouts.
- **No retrieved tool preserves routing across a key move.** The only answers are an autorouter or a home-made route-replay plugin (F1). Every multi-output "single source of truth" attempt (keyboard-toolbox, keycad) is dormant or abandoned, with single-digit stars.
- **PCB↔case sync is manual even in the best-funded first-timer program** (F14).
- 📐 Low stars and dormancy have two readings. Either demand for the integrated approach is low, or the approach was too hard or too programmer-only (Bazel/protobuf) to catch on. This evidence cannot tell the two apart.
- ☝️ The brief's premise that builders "move one key mid-design" often enough to hurt rests on 1 voice in this run. With Reddit unreachable, the frequency is unverified.

## Leads worth chasing
- **Identify the route-record/reapply plugin from F1.** Fetch the READMEs of yanshay/loprokap, Choco617/ErgoChoco-PCB and tharj/Pear69. It is the closest existing "update routing after a move" workaround.
- **Samoklava** (https://github.com/ujl123/samoklava): Ergogen + KiCad CLI autorouting pipeline. Check whether it re-runs end to end after a key change, and its last activity.
- **kicad-kbplacer**: check its experimental Ergogen support and whether it keeps or re-places tracks on re-run. It may be the most active competitor in the placement layer.
- **Reddit access:** needs a different route, e.g. a human-run search, an archive mirror (Pushshift alternatives), or the Hack Club Slack #hackpad archive (archive.hackclub.com results appeared in search) for first-timer stuck points.
- **Hack Club Slack archive** (archive.hackclub.com/archive/...): likely holds real first-timer "stuck" messages for Hackpad. This is the best substitute for observed rather than anticipated pain.
- The ergogen GitHub issues/discussions for "routing", "reroute" and "preserve traces": a feasible primary source for voice counts.
- yskoht/keyboard-layouter: last commit date, via the API.

## Looked for, not found
- **Reddit:** all of it. The domain is blocked for this agent (400 error), so no r/ErgoMechKeyboards or r/MechanicalKeyboards threads were seen. The "gave up designing keyboard pcb" and "ergogen reroute every change" queries could not run against Reddit.
- **Stalled/abandoned-design stories:** none surfaced on HN or the open web within budget.
- **Explicit wishlists** ("I wish there was a tool that…") for keyboard PCB+case+firmware: none (exact-phrase search came back empty).
- **HN voices from the last 12 months:** none. All HN hits are from about 2022–2023.
- **The last commit date of yskoht/keyboard-layouter:** not retrieved.
- **Hack Club Highway's own keyboard tooling recommendations**, separate from Hackpad: not verified.
- **Any tool that propagates a key move to plate, PCB placement, routing, case and firmware together:** none found.
