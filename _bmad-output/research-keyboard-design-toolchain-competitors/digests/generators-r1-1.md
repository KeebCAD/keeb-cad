# Digest: Parametric generators (Ergogen, Cosmos, Dactyl family), round 1, agent 1

Accessed 2026-10-24. Budget: about 16 tool calls and about 10 distinct sources. Several Cosmos doc and blog URLs I guessed returned 404 (see "Looked for, not found").

## Findings

### Ergogen
- From one YAML config, Ergogen generates "automatic plates, cases, as well as un-routed PCBs". Moving a key in the config regenerates the points, so it also regenerates the outlines/plate, the case, the PCB outline and the footprint placement. Traces are **not** routed. | https://github.com/ergogen/ergogen | ergogen (GitHub README) | README undated; HEAD 2025-11-02 | accessed 2026-10-24 | high | feature
- Ergogen's own roadmap treats routing only as a minor, open CLI item: "Figure out a manual, but still reasonably comfortable routing method directly from the config." Related open items: netclasses, and empty nets meaning unconnected. | https://raw.githubusercontent.com/ergogen/ergogen/develop/roadmap.md | ergogen | undated (develop branch, read 2026-10-24) | accessed 2026-10-24 | high | trajectory
- The roadmap has no firmware or matrix section. The only related item is a minor one: "generate a ZMK shield from the config". So the firmware layout and matrix are manual today (inferred from the item still being open). | same roadmap.md | ergogen | undated | accessed 2026-10-24 | medium | feature
- Other open roadmap items: Eeschema (schematic) output, a footprint overhaul (externalized, versioned footprints) as the top CLI priority, and 3D model paths in KiCad output. Web UI items: a live preview, KLE features, multi-outline visualization, "snapping/measurement capabilities for quicker iteration", and kicad_pcb visualization. | same roadmap.md | ergogen | undated | accessed 2026-10-24 | high | trajectory
- The docs call themselves "still in progress". The unofficial web deployment is "expected to become official soon", and the CLI is needed for in-development features. | https://docs.ergogen.xyz/ | ergogen docs | undated | accessed 2026-10-24 | medium | positioning
- Commit activity: the latest commits are v4.2.1 on 2025-11-02 by Bán Dénes (the maintainer), with a contribution from Marco Massarelli (ceoloide) on 2025-10-26. Nothing newer showed up in the API's default listing, so the default branch looks idle for about 12 months (flag: this may miss other branches). 29 open issues. | https://api.github.com/repos/ergogen/ergogen/commits?per_page=5 | GitHub API | 2025-11-02 | accessed 2026-10-24 | medium | trajectory
- Routing in practice happens outside Ergogen: Ergogen → KiCad → FreeRouting (DSN/SES) → DRC. One forum post (anecdotal; I did not find the workflow itself) describes a GitHub workflow that takes Ergogen YAML to Gerbers through FreeRouting, and warns that it "doesn't work perfectly" and needs a DRC check. | WebSearch summary of a forum post; underlying URL not retrieved | unknown | unknown | accessed 2026-10-24 | low | sentiment
- A community footprint library exists (ceoloide/ergogen-footprints). Custom footprints must sit in a `footprints/` folder next to config.yaml. | https://github.com/ceoloide/ergogen-footprints | ceoloide | not checked | accessed 2026-10-24 | medium | feature

### Cosmos (rianadon/Cosmos-Keyboards)
- Input is a GUI editor (tabs, hand scanning) plus an "Expert Mode" for editing in code. The docs admit that the GUI for rotation (for example thumb cluster rotation) is hard to use, which is why Expert Mode is recommended for it. | https://ryanis.cool/cosmos/docs/ | ryanis.cool | undated | accessed 2026-10-24 | medium | positioning
- Cosmos outputs a 3D case model (STEP/STL), screw fastening, an optional bottom plate, and 3D-printed hotswap sockets. Changing a key regenerates the case and sockets. It does not generate a custom routed PCB. The electronics are the author's modular boards (Lemon microcontrollers; Pumpkin Patch PCB and Cactus Connector appear in the docs nav) plus third-party flex PCBs (Skree, Cyboard). I could not fetch the PCB doc page to confirm per-key versus full-board PCBs. | https://ryanis.cool/cosmos/docs/ ; https://ryanis.cool/cosmos/docs/firmware/ | ryanis.cool | undated | accessed 2026-10-24 | medium | feature
- Firmware is auto-generated: QMK for the Wired Lemon and ZMK for the Wireless Lemon. The key labels/keymap come from the design. The **matrix is not derived from geometry**: the user flashes PeaMK, then presses each key in order to map matrix positions. Only Lemon MCUs are supported, and other MCUs are planned "after the PeaMK work". OLED size is hardcoded to 128x32, and trackball support is limited. | https://ryanis.cool/cosmos/docs/firmware/ | ryanis.cool | undated (cites a ZMK post dated 2025-12-09) | accessed 2026-10-24 | high | feature
- Firmware autogen, an improved plate with artwork, and new PCBs shipped in the "Summer Hardware Release" on 2025-07-17. That is older than 3 months (flag). | https://ryanis.cool/cosmos/blog/ | ryanis.cool | 2025-07-17 | accessed 2026-10-24 | high | trajectory
- The latest release post is the "Summer Software Release" on 2026-07-12: layout/design options, Stilts Mode fixes, part intersection detection, and hand previews. No 2026 post covers PCB routing or wiring. | https://ryanis.cool/cosmos/blog/ | ryanis.cool | 2026-07-12 | accessed 2026-10-24 | high | trajectory
- The project is active but effectively has one maintainer. Commits run through 2026-07-20, nearly all by Ryan Adolf; one community PR (#97, a trackball part, by WainingForests) landed on 2026-07-17. Monetization: a one-time "pro" fee for cosmetic options (rounded top/sides). | https://api.github.com/repos/rianadon/Cosmos-Keyboards/commits?per_page=8 ; docs | GitHub API | 2026-07-20 | accessed 2026-10-24 | high | trajectory
- The docs assume CAD, 3D-printing and soldering skills. They say the settings are numerous with "little guidance", the defaults are "a mere suggestion", and users are pointed to Discord. | https://ryanis.cool/cosmos/docs/ | ryanis.cool | undated | accessed 2026-10-24 | medium | positioning

### Dactyl / Dactyl-Manuform family
- compactyl (dereknheiley) has had no commits since 2022-12-03 (readme and BOM updates). It is dormant. | https://api.github.com/repos/dereknheiley/compactyl/commits?per_page=3 | GitHub API | 2022-12-03 | accessed 2026-10-24 | high | trajectory
- (Unverified belief, not evidenced this run) The Dactyl generators are Clojure or Python CadQuery/OpenSCAD scripts that output case STLs only, with hand-wiring assumed and no PCB or firmware output. I did not retrieve a source confirming this.

## Leads worth chasing
- The Cosmos PCB docs (Pumpkin Patch, Plum Twist, Skree): find the correct URL from the nav on ryanis.cool/cosmos/docs, to settle whether Cosmos generates any per-design PCB geometry.
- The Cosmos GitHub issues and Discord: look for complaints about iterating (rotation UI, Expert Mode round-trip, STEP export).
- Ergogen issues mentioning "routing", "traces" or "autoroute", and the ceoloide fork/footprints activity in 2026. The default branch may be idle, but the ecosystem may have moved to ceoloide's work.
- The forum post about an Ergogen → FreeRouting → Gerber GitHub workflow (the source behind the search summary), plus the r/ErgoMechKeyboards sentiment on routing pain after Ergogen.
- Dactyl generator web tools (for example the Dactyl Generator web UI, bullwinkle3000 or joshreve Python dactyl, the dactyl-manuform-generator site): check that the repos exist, how active they are, and what they output.
- The Ergogen web UI (ergogen.cache.works or similar), to see the state of its live preview.

## Looked for, not found
- An Ergogen release listing or date (the GitHub Releases section came back empty; I used commit dates instead).
- Any Ergogen feature for trace routing, firmware or matrix output. The roadmap shows these are not built.
- Any Cosmos feature that routes PCB traces or derives the matrix from the design (matrix mapping is done by pressing the physical keys).
- The Cosmos blog posts and the PCB doc page by URL (all 404s with my guessed slugs).
- An ibnuda/dactyl-keyboard-generator repo (404). I evidenced no active Dactyl web generator this run.
- User complaints about iteration in GitHub issues or Reddit: I ran out of budget before searching for them.
