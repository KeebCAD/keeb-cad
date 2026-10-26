# Digest: Dimension 2, permissive alternatives and keyboard-specific router prior art

- Dimension: 2, permissive alternatives and custom keyboard-specific router prior art
- Round: 1
- Researcher: custom-r1-1 (Claude subagent)
- Date accessed: 2026-10-26
- Budget used: 15 tool calls (1 ToolSearch, 4 WebSearch, 8 WebFetch, 2 Bash calls to the npm registry API). About 9 primary sources read. Two of the four searches returned nothing relevant ("kbplacer router algorithm", "keyboard matrix PCB autorouter custom").

## Findings

1. kbplacer has two routers. The switch-diode router "attempts to connect only two closest pads of the same net" and "attempts to create track in the shortest way (using 45° angles) and doesn't look for other options if there is a collision, leaving elements unconnected." The "Route rows and columns" option uses a "simplified internal router" on nets matching `COL(\d+)`/`ROW(\d+)`, and that naming cannot be configured. Tracks use the netclass default width. The README's own example shows the router failing to connect diodes to each other. | https://github.com/adamws/kicad-kbplacer | adamws (GitHub README) | undated, live README | accessed 2026-10-26 | high | capability / failure-report
2. kbplacer is licensed GPL-3.0 (repo licence shown on the README page). Activity: 761 commits, 546 stars, 2 open issues. No releases or commit dates were visible in the capture. | https://github.com/adamws/kicad-kbplacer | adamws | undated | accessed 2026-10-26 | high (licence), low (activity) | licence / ecosystem
3. kbplacer's issue tracker has only one issue matching "router" (#13, closed Oct 2023): a feature split into "Route switch-diode pairs" and "Route matrix". It is not a bug report. I found no public failure reports about matrix routing completion. | https://github.com/adamws/kicad-kbplacer/issues?q=is%3Aissue+router | adamws | 2023-10-01 | accessed 2026-10-26 | medium | failure-report
4. kbplacer's practical answer to hard cases is track templates: route the first switch-diode pair by hand and the plugin replicates it to every other pair. This needs identical pad layouts, and the plugin warns when replicated tracks fail to connect. This is the same idea as the brief's "pre-placed per-key templates". | https://github.com/adamws/kicad-kbplacer | adamws | undated | accessed 2026-10-26 | high | capability
5. Ergogen's utility_router footprint (ceoloide/ergogen-footprints) is not an autorouter. It emits manually authored route strings: `f`/`b` for layer, `v` for via, `(x,y)` for waypoints relative to the point, and `x`/`|` for a new route, with net, width, via size/drill and locked parameters. The header says "Copyright (c) 2025 Marco Massarelli", MIT, original author @yanshay. | https://raw.githubusercontent.com/ceoloide/ergogen-footprints/main/utility_router.js | ceoloide (GitHub source) | 2025 | accessed 2026-10-26 | high | capability / licence
6. The ceoloide/ergogen-footprints repo is MIT overall, but the README says footprints adapted from @infused-kim are CC BY-NC-SA 4.0. Licences are mixed per file. | https://github.com/ceoloide/ergogen-footprints | ceoloide | undated | accessed 2026-10-26 | medium | licence
7. yanshay (loprokap) says Ergogen "lacks any support for routing the PCB". The workaround records routes in KiCad through a plugin and regenerates them with the router footprint (in yanshay's ergogen-stuff). No autorouter is involved. Loprokap is CC BY-SA 4.0, but its README summary also claims "commercial use is not allowed", which contradicts plain CC BY-SA. | https://github.com/yanshay/loprokap | yanshay | undated | accessed 2026-10-26 | high (no autorouter), medium (licence) | capability / licence
8. kle-ng (adamws, MIT) advertises "built-in plate and PCB generators". Its README does not say how the PCB is routed or whether routing runs client-side. It links kicad-kbplacer only as "See also". | https://github.com/adamws/kle-ng | adamws | undated (page shows 2026) | accessed 2026-10-26 | medium | capability
9. A typical community pipeline is Ergogen followed by Freerouting. clavis (MIT, nice!nano + TRRS + USB) "uses freerouting to automatically route the PCB traces". The repo gives no completion, via or DRC data. | https://github.com/scipioni/clavis | scipioni | undated | accessed 2026-10-26 | medium | capability
10. tscircuit autorouter (`@tscircuit/capacity-autorouter`) is MIT (LICENSE: "Copyright (c) 2025 tscircuit"). It is written in TypeScript (Bun/tsup/Vite) and has an online playground. It is a pipeline of many solvers built on a capacity mesh and hypergraphs, not sequential routing. Inputs: `layerCount`, obstacles of `type: "rect"` only (with layers, rotation, `connectedTo`, `isCopperPour`), and vias with from/to layers. Stated limits: the simplification pipeline "does not route missing connections"; a maintainer dataset of 37 inputs "shows DRC issues in Pipeline 9"; on-board points outside bounds cause an error. 14 open issues, 57 PRs. | https://github.com/tscircuit/tscircuit-autorouter | tscircuit | undated (page 2026) | accessed 2026-10-26 | high (licence), medium (capability) | licence / capability / failure-report
11. On npm, `@tscircuit/capacity-autorouter` latest is 0.0.1010, published 2026-10-25, so releases are effectively daily and the API is pre-1.0. Runtime dependencies: stack-svgs, object-hash, @tscircuit/solver-utils, fast-json-stable-stringify. The npm `license` field is empty; the licence comes from the repo LICENSE file. | https://registry.npmjs.org/@tscircuit/capacity-autorouter | npm registry | 2026-10-25 | accessed 2026-10-26 | high | version-compat / ecosystem
12. Clipper2 ports on npm (all BSL-1.0, a permissive licence):
    - clipper2-wasm 0.4.0 (2026-05-18). Ships ES6/UMD builds and a `.wasm` file located with `locateFile`; includes TypeScript types.
    - clipper2-ts 2.0.1-18 (2026-07-04, countertype). Pure TypeScript port. The scoped package `@countertype/clipper2-ts` is deprecated and says "moved to clipper2-ts".
    - clipper2-js 1.2.4 (2024-01-01, stale).
    - js-angusj-clipper 1.3.1, MIT, Clipper1 WASM (2023, stale).
    - clipper-lib 6.4.2 (2019, stale). | https://registry.npmjs.org/ (per-package JSON), https://cdn.jsdelivr.net/npm/clipper2-wasm@0.2.1/README.md | npm / jsDelivr | dates as listed | accessed 2026-10-26 | high | licence / version-compat / ecosystem
13. Spatial indexes: flatbush 4.6.2, ISC, published 2026-06-09 (maintained). rbush 4.0.1, MIT, published 2024-08-21. Grid pathfinding: `pathfinding` (PathFinding.js) 0.4.18, last published 2016-05-10, with no licence field in npm metadata, so it is abandoned and its licence is unverified. | https://registry.npmjs.org/flatbush, /rbush, /pathfinding | npm registry | as listed | accessed 2026-10-26 | high | licence / ecosystem
14. ergogen 4.2.1, MIT, published 2025-11-02. It is a placement and footprint generator with no router (consistent with finding 7). | https://registry.npmjs.org/ergogen | npm registry | 2025-11-02 | accessed 2026-10-26 | high | capability / ecosystem

## Per-candidate gate and criterion notes

**kbplacer router**
- G2: fail. GPL-3.0 (F2). The code cannot be shipped, but its algorithm (try a 45-degree shortest path, give up on collision) is a documented, trivial reference design.
- G1, G3: fail as is. It is a Python KiCad plugin (F1, F2).
- G4: unknown.
- Quality: poor by its own docs. It leaves connections unconnected on collision (F1, F4).
- Use as prior art only.

**Ergogen utility_router (ceoloide / yanshay)**
- G2: pass. MIT (F5), but check per-file licences (F6).
- G1, G3: pass. Plain JavaScript string-to-geometry.
- G4: not applicable. It is not a router.
- Value: a precedent and route-string format for template-placed tracks, which matches the brief's per-key templates (F5, F7).

**kle-ng PCB generator**
- G2: pass. MIT (F8).
- Routing capability: unknown (F8). This is the top lead.

**tscircuit capacity-autorouter**
- G1: likely pass. It is a pure TypeScript package (F10, F11), but self-hosting was not verified.
- G2: pass. MIT per the LICENSE file, though the npm field is empty (F10, F11).
- G3: likely pass. It has a browser playground and no native dependencies (F10). A Worker run was not verified.
- G4: partial pass. Rect-only obstacles with `connectedTo` (F10). Existing angled tracks would need to be approximated as rotated rects. Unverified.
- Keep-outs (3): partial. Expressed as rect obstacles (F10).
- Net classes (3): unknown.
- Quality (3): risk. Its own dataset reports DRC issues (F10).
- Speed (2): unknown.
- Integration (2): pass for npm, but pre-1.0 with daily churn (F11).
- Ecosystem (2): very active (F10, F11).
- Determinism (1): unknown. The fast-json-stable-stringify and object-hash dependencies hint at hashing and caching, nothing more.
- Recommend including it in the spike.

**Building blocks for a custom router**
- Clipper2 for clearance offsets and booleans: clipper2-ts (pure TypeScript) or clipper2-wasm. Both BSL-1.0, permissive, maintained in 2026 (F12).
- flatbush (ISC, maintained) or rbush (MIT) for spatial indexing of fixed obstacles (F13).
- PathFinding.js is stale with an unverified licence, so writing A*/Lee yourself is preferable (F13).
- G1-G3 pass for all of these.
- G4 is satisfied by design: the fixed copper is loaded into the index and offset by clearance.

## Leads worth chasing next round
- kle-ng PCB generator source: is there any routing (client-side TypeScript?) and what algorithm? adamws also wrote kbplacer, so it may port the simple router. Look in the repo's `src/` for "route" or "track".
- kbplacer source files for the row/column "simplified internal router" (exact algorithm; read only, GPL).
- tscircuit autorouter:
  - Run it in a Web Worker.
  - Benchmark on a keyboard-like fixture (about 45 keys, nice!nano).
  - Check whether its input accepts per-net trace width and clearance.
  - Check for determinism and seed options.
  - Read issues for DRC and failure reports.
- yanshay/ergogen-stuff: the KiCad route-recording plugin, and the actual licence of the router footprint.
- Read clipper2-ts on GitHub: maintainer count, test parity with upstream Clipper2.
- Community write-ups of Freerouting results on Ergogen or nice!nano boards (via counts, failures around module fan-out).

## Looked for and could not find
- A published write-up, blog post, thesis or talk from someone who built a keyboard-specific matrix autorouter, or effort estimates for one. The searches returned nothing relevant.
- Any documentation of a constrained or channel routing approach for keyboards (rows on one layer, columns on the other, fixed channels between columns). Not found this round. The closest prior art is template replication (F4) and manual route strings (F5, F7). The idea is unverified, not disproven.
- Evidence on which parts of 2-layer keyboard matrices fail for simple routers (MCU fan-out, crossings). The only first-party evidence is kbplacer's own documented failure on custom diode positions (F1).
- Permissively licensed TypeScript/JavaScript push-and-shove or rip-up-and-reroute implementations other than tscircuit. None were surfaced.
- kbplacer release dates and recent commit activity (not visible in the fetched page).
