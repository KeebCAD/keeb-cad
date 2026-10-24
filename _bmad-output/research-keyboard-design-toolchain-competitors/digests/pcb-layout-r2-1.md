# Digest: PCB layout round 2, part 1 (kle-ng, kbplacer, automated pipelines)

Accessed 2026-10-24. Budget used: 15 tool calls. Sources: kle-ng releases, kle-ng README, kle-ng PCB docs, kicad-kbplacer README, Hack Club Blueprint #8607, KBD.news, sol/samoklava, scipioni/clavis. The kle-ng releases, README, docs and kicad-kbplacer README all come from one author (adamws).

Note on dates: GitHub release pages show day and month but not year. I treat "22 Oct" as 2026 because the brief says v0.50.0 shipped 2026-10-22.

## Findings

### kle-ng (Q1)

1. **What kle-ng is.** A reimplementation of the Keyboard Layout Editor that stays compatible with existing KLE layouts. It has "built-in plate and PCB generators."
   - Source: https://github.com/adamws/kle-ng | adamws (author) | pub_date: n/a, live README
   - Confidence: high | class: positioning
   - Independent confirmation: **no**. A search for "kle-ng" PCB generator found no third-party coverage; results pointed only to kbplacer and older KLE-to-PCB tools.

2. **Plate output.** Switch and stabilizer cutouts, exported as SVG, DXF, STL or JSCAD. Supports Cherry MX, Alps and Kailh Choc.
   - Source: https://editor.keyboard-tools.xyz/docs | adamws | n/a
   - Confidence: high | class: feature | Independent confirmation: no

3. **PCB output.** A ZIP containing a `.kicad_sch` (switch matrix) and a `.kicad_pcb` (switches and diodes, plus any routed tracks), for KiCad 9 or later.
   - Generation runs on a remote worker. Downloads expire after 1 hour. The limit is 150 keys.
   - Optional per-key LEDs and capacitors, with multi-sheet schematics (Key Matrix, LED Chain).
   - Gerbers are not mentioned.
   - Source: https://editor.keyboard-tools.xyz/docs/pcb-generator | adamws | n/a
   - Confidence: high | class: feature | Independent confirmation: no

4. **What kle-ng does not generate.** No MCU, USB connector, mounting holes or board outline. The docs say: "Generator does not include PCB outline; create it to match your intended case." The generated PCB is described as "a starting point" to finish by hand in KiCad.
   - No case output and no firmware (QMK/VIA keymap or info.json) export was found. The QMK/VIA feature I did find is import search (v0.44.0).
   - Source: https://editor.keyboard-tools.xyz/docs/pcb-generator and https://github.com/adamws/kle-ng/releases | adamws | v0.44.0 dated 12 Aug
   - Confidence: high for the missing MCU/USB/outline; medium for "no firmware or case export" (absence in the docs I read)
   - class: feature | Independent confirmation: no

5. **Matrix input.** Each key needs a VIA-style "row,col" label in its top-left legend. Keys without one are left out of the PCB.
   - Source: https://editor.keyboard-tools.xyz/docs/pcb-generator | adamws | n/a
   - Confidence: high | class: feature | Independent confirmation: no

6. **Routing modes.** Disabled; switch-diode only (automatic); Full (automatic, which also routes rows and columns); switch-diode only (preset); Full (preset).
   - In the preset modes, the user draws the switch-diode tracks once and they are copied to every key.
   - The docs say the automatic router is basic and "may leave connections unrouted if it encounters layout obstacles."
   - Freerouting is not mentioned.
   - Source: https://editor.keyboard-tools.xyz/docs/pcb-generator | adamws | n/a
   - Confidence: high | class: feature | Independent confirmation: no

7. **v0.50.0 track editor (22 Oct 2026).** You draw tracks in the footprint preview.
   - Select, edit, drag in a KiCad-like style, and undo/redo. Segments are 45° or 90°.
   - Press V to place a via and change layer.
   - Live DRC checks clearance (0.2 mm), hole clearance (0.25 mm) and shorts, and shows "DRC clean."
   - Also new in v0.50.0: courtyard-overlap warnings, through-hole diodes, and a choice of diode board side.
   - **☝️ Correction to the brief:** this is a *per-key switch-diode template* editor. It is not a board-level router. Rows and columns are still routed by the basic automatic router or by hand in KiCad. Preset routing works only for front-side switches.
   - Source: https://github.com/adamws/kle-ng/releases and https://editor.keyboard-tools.xyz/docs/pcb-generator | adamws | 2026-10-22
   - Confidence: high | class: feature | Independent confirmation: no (released 2 days ago, none expected yet)

8. **Editing after routing.** Tracks are saved as a `tracks` section in the JSON settings and connect only the pads they were drawn around.
   - If you change the switch footprint, diode footprint, or diode position, rotation or side, an overlay offers **Keep** or **Clear**. Undo restores either choice.
   - The docs do not say what happens when a key is moved.
   - Inference (unverified): because preset tracks are relative to each key and the board is regenerated on every run, moving a key probably carries its switch-diode tracks along. Row and column routing would be redone from scratch, and any hand work done in KiCad after export would be lost.
   - Source: https://editor.keyboard-tools.xyz/docs/pcb-generator | adamws | n/a
   - Confidence: high for the stated behavior; low for the inference
   - class: feature | Independent confirmation: no

9. **Release cadence.** 10 releases (v0.44.0 to v0.50.1) between 12 Aug and 23 Oct 2026, about one every 8 days.
   - Recent work leans toward PCB features (v0.47 guards, v0.50 track editor, v0.50.1 ghost-key fix), plus account and sharing (v0.45, short links and saved layouts) and layout hygiene (v0.46 and v0.48, Sanitize Layout and collision detection).
   - Source: https://github.com/adamws/kle-ng/releases | adamws | 2026-08-12 to 2026-10-23
   - Confidence: high | class: trajectory | Independent confirmation: n/a (primary data)

10. **Audience and modality.** A browser editor, with optional accounts (v0.45.0), that hands a starter KiCad project to KLE-literate hobbyists. Finishing the board (MCU, USB, outline, completing rows and columns) is still manual KiCad work.
    - Source: synthesis of findings 3, 4 and 6
    - Confidence: medium | class: positioning | Independent confirmation: no

### kbplacer (Q2)

11. **Routing claims (author's own statements).**
    - Switch-diode routing is "very limited": the shortest 45° track, with no alternatives tried on collision.
    - Row/column routing matches pads with `COL(\d+)` and `ROW(\d+)` nets and uses a simplified internal router.
    - It can copy a hand-routed first switch-diode pair to every key as a template.
    - Outline is a convex hull with a delta.
    - A headless CLI exists: `python -m kbplacer`.
    - Inputs: KLE/kle-ng, VIA, QMK, and Ergogen (marked experimental).
    - Source: https://github.com/adamws/kicad-kbplacer | adamws | n/a, live README
    - Confidence: high (as author claims) | class: feature
    - Independent confirmation: **partial**. KBD.news (2023-06-01) confirms placement and "basic track routing" but says nothing about rows and columns.

12. **One builder's experience (Jan 2026).** One builder used kbplacer for placement only.
    - It "complained about the diode configuration" and could not place parts on the back side. They "manually flip[ped] 252 components."
    - They routed rows and columns by hand.
    - Re-running it was "risky ... once routing has started": it "shifted the keyboard placement, but the already-routed columns didn't move along with it."
    - This does **not** confirm that kbplacer routes switch-diode pairs or rows/columns. It does show that re-running after routing breaks existing tracks.
    - Source: https://blueprint.hackclub.com/projects/8607 | Hack Club Blueprint (independent builder log) | 2026-01-08 to 2026-01-11
    - Confidence: medium (one anecdote, with internal inconsistency about spacing settings) | class: sentiment
    - Independent confirmation: yes (it is the independent source)

13. **Re-run behavior is undocumented.** The README has no option or description for how existing tracks are treated on re-run.
    - Source: https://github.com/adamws/kicad-kbplacer | adamws | n/a
    - Confidence: medium (absence) | class: feature | Independent confirmation: indirect (finding 12)

14. **Coverage in 2023.** KBD.news described kbplacer as KiCad 7 compatible and in the official plugin repository, offering automatic key and diode placement, annotation schemes, rotation, diode position and basic routing.
    - Source: https://kbd.news/KiCad-plugin-for-keyboard-design-2033.html | KBD.news | 2023-06-01
    - Confidence: medium (stale, and the author's independence is unclear) | class: feature
    - Independent confirmation: n/a

### Pipelines and Freerouting (Q3)

15. **samoklava: an automated layout-to-Gerber pipeline exists.**
    - Ergogen YAML becomes a KiCad PCB and plate files. kicad-automation-scripts and Freerouting autoroute the board.
    - KiKit produces renders and Gerbers.
    - A GitHub Actions `build.yml` runs on push and outputs a Gerber zip. Local builds use Docker and `make setup clean all`.
    - No kbplacer, no Freerouting version, and no routing-quality data.
    - Source: https://github.com/sol/samoklava | sol (independent) | date not shown
    - Confidence: high that the pipeline exists; low on currency | class: feature/positioning
    - Independent confirmation: yes. A second fork exists (ujl123/samoklava), and clavis uses the same pattern.

16. **clavis.** A 5x3 split keyboard built with Ergogen (soundmonster fork), Freerouting autorouting and KiKit Gerbers, set up via a Makefile.
    - No routing-quality figures and no version information.
    - Source: https://github.com/scipioni/clavis | scipioni | date not shown
    - Confidence: medium | class: feature | Independent confirmation: yes (same pattern as samoklava)

17. **soundmonster/freerouting_cli.** A Docker image used in the Ergogen + Freerouting lineage, last updated more than 4 years ago according to search results. That suggests these pipelines run old Freerouting 1.x, not v2.x.
    - Source: hub.docker.com/r/soundmonster/freerouting_cli (search snippet, not fetched) | Docker Hub | ~2022
    - Confidence: low | class: trajectory | Independent confirmation: no

18. **Freerouting results on keyboard boards are anecdotal.**
    - A Hack Club builder (Lucenox) said Freerouting autorouting "saved me many hours" on a keyboard PCB (search snippet; date not checked).
    - LoProKap (yanshay) says Ergogen "lacks any support for routing" and built a custom routing system instead (search snippet).
    - No quantified results (completion %, via count, DRC) for Freerouting v2.x on a keyboard matrix were found.
    - Sources: https://hardware.hackclub.com/projects/lumentae/lucenox ; https://github.com/yanshay/loprokap (search snippets only, not fetched)
    - Confidence: low | class: sentiment | Independent confirmation: no

19. **No public kle-ng/KLE + kbplacer + Freerouting chain was found.** Searches turned up no CI, script or Docker pipeline joining kbplacer to Freerouting. The automated pipelines that do exist are Ergogen-based and skip kbplacer.
    - Separately, kicad-mcp (git.supported.systems) has a headless pure-Python "freeroute" autorouting pipeline aimed at CI and MCP clients. It is not keyboard-specific.
    - Source: search results (git.supported.systems/MCP/kicad-mcp commits) | 2025–2026?, date not verified
    - Confidence: medium (absence) | class: positioning | Independent confirmation: n/a

### Synthesis for the decision

- **📐 Already solved, for KLE-literate hobbyists:**
  - Key move → plate update (kle-ng plate export).
  - Key move → regenerated switch and diode placement and schematic (kle-ng, kbplacer).
  - Per-key switch-diode routing as a template that follows each key.
  - Ergogen users have an end-to-end CI pipeline that also autoroutes the board with Freerouting (samoklava).
- **📐 Not solved:**
  - Incremental updates that keep hand routing and the non-matrix parts (MCU, USB, outline) through a key move. Both kle-ng and kbplacer regenerate the board, and re-running kbplacer over existing routing breaks it.
  - Case generation tied to the same layout, in kle-ng.
  - Firmware layout export from the same source, in kle-ng.
  - Board-level routing quality: kle-ng's own router is basic and Freerouting results on keyboards are anecdotal.
- **☝️ The brief's premise needs a correction:** kle-ng's v0.50.0 "track editor with DRC" is a footprint-preview template editor for switch-diode tracks only, not a whole-board editor.

## Leads worth chasing

- kle-ng GitHub issues and discussions, plus r/MechanicalKeyboards and r/olkb, for user reception (none found this round).
- Read kle-ng source: is the PCB worker kbplacer under the hood? The docs mention kbplacer only for converting presets. The repo also has a `supabase` folder.
- Test empirically in kle-ng: move one key after drawing preset tracks and diff the output.
- samoklava and clavis commit dates, and the Freerouting version in their workflow files.
- kicad-mcp "freeroute" (pure-Python Freerouting port): its quality on keyboard matrices.
- Lucenox (Hack Club) and LoProKap custom router: fetch both for dates and concrete results.
- kbplacer issue tracker on re-run behavior and track preservation. PyPI shows v0.16.

## Looked for, not found

- Independent (non-adamws) coverage of kle-ng's PCB generator or track editor.
- Any kle-ng case export or firmware (QMK keymap, info.json, VIA definition) export.
- Documentation of what kle-ng does when a key is moved after tracks are drawn.
- Independent confirmation that kbplacer's row/column router works in practice.
- A documented kbplacer re-run or track-preservation mode.
- Any public KLE/kle-ng + kbplacer + Freerouting automated pipeline.
- Quantified Freerouting v2.x results on keyboard matrix PCBs (2025–2026).
