# Digest: TOPOLA AND KLE-NG, round 2

- Dimension: Topola and kle-ng
- Round: 2
- Date: 2026-10-26
- Budget used: 15 tool calls (1 ToolSearch, 2 WebFetch, 12 Bash: git clone of both repos plus Codeberg/GitHub API calls). About 8 sources.
- Method note: Codeberg's web UI blocks AI fetchers, so for Topola I cloned the repo (`develop` plus `rewrite`) and used the Codeberg REST API. The Topola findings come from source at commit 666e06c (develop HEAD, 2026-07-02). The kle-ng findings come from a clone at HEAD (2026-10-23).

## Findings

1. Topola is MIT-licensed. Cargo.toml describes it as a "Work-in-progress free and open-source topological (rubberband) router and autorouter for printed circuit boards". Package version 0.1.0; no releases are published (the releases API returns `[]`). | https://codeberg.org/topola/topola (Cargo.toml, develop) + https://codeberg.org/api/v1/repos/topola/topola/releases | Topola contributors | 2026-07-02 (HEAD) | accessed 2026-10-26 | high | licence

2. Topola has a headless path. The root crate `topola` is a library, with modules `autorouter`, `router`, `board`, `layout`, `specctra`, and more. `crates/topola-cli` is a binary that depends only on the library. It loads DSN with `SpecctraDesign::load`, builds the board with `make_board`, runs `Command::Autoroute(PinSelection::new_select_layer(&board,0), PlanarAutorouteOptions{...})` through an `Invoker`/`History`, and writes SES with `write_ses`. It can also replay a JSON command history. The engine is batch-callable, not GUI-only. | https://codeberg.org/topola/topola (crates/topola-cli/src/main.rs) | Topola contributors | 2026-07-02 | accessed 2026-10-26 | high | capability

3. WASM: the egui GUI is built to wasm32 with Trunk (`index.html` has a `data-trunk rel="rust"` link to `crates/topola-egui`, and `Cargo.toml` contains `cfg(target_arch="wasm32")` dependencies on wasm-bindgen-futures). The release profile comment reads "opt-level = 2 # fast and small wasm". The core library's dependencies (geo, spade, rstar, petgraph fork, serde, ron) are pure Rust, with no I/O or threads in the manifest. I found no wasm-bindgen/JS API for the core library and no Web Worker build. A Worker build is plausible but unverified. | https://codeberg.org/topola/topola (Cargo.toml, index.html, crates/topola-egui/Cargo.toml) | Topola contributors | 2026-07-02 | accessed 2026-10-26 | medium | version-compat

4. Existing copper is kept: DSN `(wiring)` wires and vias are loaded with `add_fixed_dot_infringably` / `add_fixed_seg_infringably` (src/specctra/design.rs). They are fixed primitives, not routable bands. This gives G4 in principle. The "infringably" naming suggests no collision check on insert. | https://codeberg.org/topola/topola (src/specctra/design.rs) | Topola contributors | 2026-07-02 | accessed 2026-10-26 | high | capability

5. Keep-outs: `specctra-core` parses `(keepout)` into `structure.keepouts`, but `grep -i keepout src/` finds nothing in the router/board crate. Keep-outs are parsed and then ignored. | https://codeberg.org/topola/topola (crates/specctra-core/src/structure.rs; src/) | Topola contributors | 2026-07-02 | accessed 2026-10-26 | high | capability

6. Net classes: `SpecctraMesadata` maps nets to classes and stores a per-class `width` and `clearance`. The code comment says "picks the generic clearance only for now" (`rule.clearances[0]`). The CLI default passes a single constant `routed_band_width: 100.0` in `RouterOptions`. Routed-trace width may therefore be global per run rather than per net; this is unverified. Edge clearance: open issue #246 ("Collision checking for bands should catch collisions with `place_boundary`") suggests the board outline is not enforced. | https://codeberg.org/topola/topola (crates/specctra-core/src/mesadata.rs; issue #246) | Topola contributors | 2026-07-02 / 2025-06-16 | accessed 2026-10-26 | medium | capability

7. Layers and vias: multilayer autoroute modules exist (`multilayer_autoroute.rs`, `multilayer_reconfigurer.rs`, the latter using A* "to search for multilayer configurations", 2025-11-20). Commit 2025-11-24 reads: "Add basic via SES export (constant size and only two layers for now)". The CLI default routes only `principal_layer: 0`, using `new_select_layer(&board, 0)`. | https://codeberg.org/topola/topola (git log; src/autorouter/) | Mikolaj Wielgus | 2025-11 | accessed 2026-10-26 | medium | capability

8. Type of router: a topological "rubberband" router with both an interactive mode (`src/interactor`, egui) and an autorouter (ratsnest, presort by ratline intersections, permutation, timeout). The README gallery shows autorouted small boards (4x4 LED matrix breakout, 3x4 tact-switch IR remote, DB25-to-DB25). | https://codeberg.org/topola/topola (README; git log 2025-11-24/25) | Topola contributors | 2025-11 | accessed 2026-10-26 | medium | capability

9. Issue #278 is still OPEN (created 2025-09-23, last updated 2025-09-28): "routing fails with 'The new constraint edge intersects an existing constraint edge.'" It is a panic in spade's CDT when the CLI routes a ws281x test board. Related open issues: #193 "`insert_cane` and `remove_cane` panic quite often when routing", #210 "Routing can break existing bends", #249 "Routing around curved SMD pads fails", #224 "DSN import does not support many tokens generated by KiCad", #293 "polygon outline is not understood", #295 "Can't load can2usb example from LibrePCB". 36 issues are open. | https://codeberg.org/api/v1/repos/topola/topola/issues/278 and the open-issues list | Codeberg / Topola | 2025-09-23 to 2026-03-14 | accessed 2026-10-26 | high | failure-report

10. Determinism: open issue #46 says the "Delaunay triangulation for navmesh generation is indeterministic... which is not acceptable for software intended for automated workflows. I have no idea what may be the underlying cause." Open issue #47 says coordinates are f64 when they should be integers. | https://codeberg.org/api/v1/repos/topola/topola/issues/46 | Mikolaj Wielgus | 2024-09-28 | accessed 2026-10-26 | high | failure-report

11. Activity: `develop` has 1 commit since 2026-04-26 (2026-07-02, docs/AI policy for NLnet). Substantive feature work stopped around 2025-12-01. A `rewrite` branch has 77 commits since 2026-04-26, the last on 2026-08-09. It contains an autoplacer via simulated annealing (June 2026) and commits titled "Get rid of reference to topola-cli" and "no-longer-present feature 'disable_contracts'". The rewrite drops the CLI and changes the architecture. Contributors: Mikolaj Wielgus has 174 commits on develop, followed by Zscheile/fogti and a few drive-by contributors (bus factor about 1-2). 34 stars. | git log develop and rewrite; https://codeberg.org/api/v1/repos/topola/topola | Codeberg | 2026-08-09 | accessed 2026-10-26 | high | ecosystem

12. Funding: README: "funded through the NGI0 Entrust Fund ... NLnet ... grant agreement No 101069594". | https://codeberg.org/topola/topola (README) | Topola | 2026-07-02 | accessed 2026-10-26 | high | ecosystem

13. kle-ng is MIT ("Copyright (c) 2025 adamws"), Vue/Vite, with HEAD at 2026-10-23. The PCB generator is not client-side. `src/utils/pcbApi.ts` POSTs to `${API_CONFIG.baseURL}/pcb`, polls the task, and fetches renders and a result ZIP. `.env.production` sets `VITE_BACKEND_URL=https://kicad.vps.keyboard-tools.xyz`. The docs say: "The PCB generator runs on a remote worker", "This feature sends your layout data to a backend server", files are kept for 1 hour, and there is a 5-second cooldown. | https://github.com/adamws/kle-ng (LICENSE, src/utils/pcbApi.ts, .env.production, docs/pcb-generator.md) | adamws | 2026-10-23 | accessed 2026-10-26 | high | capability

14. kle-ng routing is kbplacer's own router. `src/utils/pcb/routing-mode.ts` says: "The backend knows three routing values (kbplacer's built-in router)", which are Disabled, Switch-Diode only, and Full. The backend is adamws/kle-ng-api (MIT, "Backend for kle-ng", pushed 2026-10-22); the keyboard-tools README says the backend "migrated to kle-ng-api". kicad-kbplacer is GPL-3.0 (pushed 2026-10-23). The routing code is GPL-3.0 and runs server-side in KiCad/Python. That last part is inferred, because I did not read kle-ng-api's source. | https://github.com/adamws/kle-ng (src/utils/pcb/routing-mode.ts); https://api.github.com/repos/adamws/kle-ng-api; https://api.github.com/repos/adamws/kicad-kbplacer; https://raw.githubusercontent.com/adamws/keyboard-tools/master/README.md | adamws | 2026-10 | accessed 2026-10-26 | high (licences), medium (backend internals) | licence

15. Limits of kle-ng/kbplacer routing, from the docs: "a basic algorithm that finds the shortest path with 45° angles"; it "may leave connections unrouted ... does not try alternative paths; it simply skips difficult connections"; "DRC required"; "Manual finishing needed". With through-hole diodes, Full mode "can leave some row connections for you to finish". The router covers only the switch matrix (switch-diode, rows, columns), not MCU/LED/TRRS nets. | https://github.com/adamws/kle-ng/blob/master/docs/pcb-generator.md | adamws | 2026-10-23 | accessed 2026-10-26 | high | capability

16. kle-ng does have client-side MIT TypeScript: `src/utils/pcb-tracks/` (drc.ts, connectivity.ts, direction45.ts, drag.ts, snap.ts, distance.ts). This is an interactive track editor for drawing a switch-diode "track preset", with KiCad-default DRC (0.2 mm clearance, 0.25 mm to holes) and KiCad-style 45-degree push-drag. It is not an autorouter, but it could be reused for DRC and 45-degree geometry. | https://github.com/adamws/kle-ng (src/utils/pcb-tracks/, docs/pcb-generator.md L80-107) | adamws | 2026-10-23 | accessed 2026-10-26 | high | capability

## Per-candidate gate/criterion notes

### Topola
- G1 no network: pass. It is a pure Rust library with no network dependencies (F2, F3).
- G2 licence: pass. MIT (F1).
- G3 Web Worker: likely, unverified. The GUI already ships as WASM (F3), but there are no JS bindings for the core. A spike would need its own wasm-bindgen wrapper around `SpecctraDesign::load`, `Autorouter`, and `write_ses` (F2).
- G4 fixed copper: pass in code. DSN wiring loads as fixed primitives (F4). Open #210 ("Routing can break existing bends") concerns bands rather than fixed wiring; still worth testing.
- Keep-outs/module zone (3): fail. Keep-outs are parsed and then ignored (F5). A workaround might be to model the zone as fixed copper or a pad of a dummy net (unverified).
- Net classes, edge clearance (3): weak. Only the generic clearance is used, routed width looks like a single option, and edge collision is an open issue (F6).
- 2-layer quality (3): unproven. Vias are basic and constant-size, the CLI default is single-layer, the demos are small, and panics are reported on real KiCad boards (F7, F8, F9).
- Speed (2): no data found.
- Integration (2): you would build a static WASM asset yourself. DSN in and SES out are standard formats (F2).
- Ecosystem (2): poor to uncertain. `develop` is effectively dormant. The rewrite branch is active but drops the CLI. There are no releases and the bus factor is about 1. NLnet funding helps (F11, F12).
- Determinism (1): fail. The navmesh is acknowledged as non-deterministic, issue #46 (F10).
- Verdict input: suitable for at most a cheap spike (build the CLI for wasm32, feed it a keyboard DSN). Expect #278-class panics and missing keep-out support.

### kle-ng (and kbplacer behind it)
- G1: fail. The generator calls a remote backend (F13).
- G2: the routing code is kbplacer, GPL-3.0 (F14). It would be allowed only as a separate worker module, and it is Python inside KiCad (pcbnew), so it cannot run in a browser at all.
- G3: fail. It runs server-side (F13, F14).
- G4: not applicable. It is a matrix-only greedy router (F15).
- Value for us: not as a candidate engine. Two things are reusable: kle-ng's MIT client-side track editor and DRC (F16), and the track-preset approach, which resembles our pre-placed switch-diode templates.

## Leads
- Topola `rewrite` branch: check whether it exposes a library API and whether it adds keep-outs and constraints. Its direction is unknown beyond the commit titles (F11).
- Try `cargo build --target wasm32-unknown-unknown -p topola` and run it on the repo's `tests/multilayer` DSN fixtures to measure wall time. The test fixtures could serve as a benchmark.
- kle-ng-api source: confirm that it shells out to kicad-kbplacer (GPL) within a KiCad Docker image.
- kle-ng `src/utils/pcb-tracks/drc.ts` could be reused as an MIT client-side DRC for validating router output.

## Looked for and could not find
- Any Topola JS/TS or wasm-bindgen API for the autorouter core, or an npm package.
- Topola benchmark or performance numbers.
- Any fix or maintainer response on #278 after 2025-09-28.
- Evidence that Topola applies per-net-class trace width to routed bands (only the parsing is confirmed).
- kle-ng-api source internals (I read only its licence and metadata).
