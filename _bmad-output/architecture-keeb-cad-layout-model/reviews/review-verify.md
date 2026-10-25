# Review: technology reality check of the architecture spine

- **Spine:** `architecture-keeb-cad-layout-model.md` (AD-1..AD-21, Stack, Deferred)
- **Inputs:** `stack-research.md`, `.memlog.md` (version entries)
- **Date:** 2026-10-25
- **Method:** I ran `npm view <pkg> version time.modified` for every package, unpacked the tarballs, and read the GitHub API (repo metadata, issues, commits, and the ZMK `v0.3.0` tree and docs at that tag). I also read the KiCad GitLab source and the CheerpJ licensing page. I ran makerjs 0.19.2 in Node and bundled it in a Vite 8.3.5 module worker.

## Verdict

**Mostly verified, with one critical gap.** Every Stack version exists and is current today. The makerjs, KiCad and replicad claims hold up. The problem is the ZMK wired-split decision. It was checked against ZMK alone, not against the fixture's hardware. ZMK v0.3.0 supports only two-wire full-duplex UART, but the Corney Island fixture wires its TRRS jack as a single data line. The Freerouting-via-CheerpJ option in Deferred also conflicts with AD-13 on licence and network grounds.

## Findings

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | **critical** | **ZMK v0.3.0 wired split cannot run on Corney Island's TRRS wiring as specified.** In v0.3.0 (and still on `main`) the docs say: "ZMK supports two transports ... Bluetooth and full-duplex wired UART", "intended for testing by early adopters", and "Full-duplex UART requires the use of two wires ... designs such as the Corne, Sweep, etc. that use only a single GPIO pin ... will not work with the wired split transport". The fixture `layout-model/sources/corney-island.yaml` wires the PJ320A as `SL: GND`, `R2: DAT`, `TP: VCC # Tip and Ring 1 are joined together`, with MCU `P0: DAT`. That is a single-wire, QMK-style serial link. The memlog line "Full-duplex UART fits TRRS 4 conductors" is true of the jack but not of this PCB. The binding `zmk,wired-split.yaml@v0.3.0` does have a `half-duplex` property, and `central.c` contains code for it, but it is marked "Experimental: Enable half-duplex protocol mode" and is undocumented. Nothing shows it working on nRF52 with one pin. | Before the firmware story, Sergii should choose one of three options and record it in the spine: (a) rewire the wired PCB's TRRS for TX and RX, which diverges from the Ergogen fixture netlist; on a reversible PCB, TX and RX must also be crossed, through per-side pinctrl in the left and right overlays; (b) run a hardware spike of the experimental `half-duplex` mode on nice!nano; (c) accept BLE split for the "wired" build. Add a Deferred row. AD-14 and AD-15 ("wired split over UART when the population fits") need a rule for which TRRS pinout counts as "fits". |
| 2 | **high** | **Freerouting via CheerpJ conflicts with AD-13 and carries licence load.** The CheerpJ Community License is free only when loaded from `cjrtnc.leaningtech.com`; "If you wish to self-host CheerpJ, you will need a Commercial License." That is a runtime network dependency, against AD-13's "No network calls are needed to design or export" and the deferred offline goal. Freerouting is **GPL-3.0** (`gh api repos/freerouting/freerouting`). I found no public precedent of Freerouting running under CheerpJ (Swing GUI app; headless mode unverified). | In the Deferred routing-spike row, add exit criteria: works headless under CheerpJ; the CDN dependency is either accepted as an AD-13 exception or rejected; a GPL-3.0 distribution decision is recorded. Otherwise drop the option before the spike starts. |
| 3 | medium | **makerjs features are confirmed; robustness is not.** `index.d.ts` 0.19.2 has `model.combine/combineUnion/combineSubtraction/combineIntersection`, `model.outline(model, distance, joints, inside)` (joints 0 = round), `model.expandPaths`, `chain.fillet`, `chain.dogbone` and `path.fillet`. Smoke test results: union and subtraction with arcs, coincident edges, round-joint outline (4 arcs), chain fillet, and outline of a rotated concave polygon all gave correct chain counts and lengths. Open upstream issues: #509 (combine leaves stray lines, circle minus polygon), #377 (combineSubtraction leaves paths), #387 (outline slow, `valueIds of undefined` crash on complex shapes), #477 (combineUnion takes 20-30 s on complex text), #455 (combine crash with `pointMatchingDistance`). | Add the #509 and #377 repros, and tangent and coincident Corney cases, to the geometry-spike fixtures. Measure outline latency on the main thread, because AD-11 makes resolve live. Keep the clipper2-ts fallback as written. |
| 4 | medium | **The tscircuit packages fight the TS ~6.0 pin.** `kicadts`, `circuit-json-to-gerber` and `@tscircuit/checks` declare a peer dependency of `typescript ^5`. `circuit-json-to-gerber` also peers `tscircuit: *` and `circuit-json: *`, so it pulls in the whole framework and its data model. `@tscircuit/capacity-autorouter` has a runtime dependency taken from a GitHub commit URL (`@tscircuit/pcb-trace-linter#4c035f9...`) and no `license` field on npm (the repo is MIT). | Add to the KiCad-writer, gerber-writer and routing-spike rows: "installs cleanly under pnpm strict deps with TS 6; peer warnings resolved". Note the GitHub-URL dependency for CI reproducibility. |
| 5 | low | **Bundling makerjs is confirmed, with a caveat.** It is CommonJS only (`main: dist/index.js`, no `exports` or `type: module`). Since 0.19.0 it detects its environment with `self`/`global` instead of `eval` (commit #641). `import makerjs from 'makerjs'` in a `new Worker(..., {type:'module'})` built with Vite 8.3.5 gives a 144 KB worker chunk, which ran and produced SVG. A runtime dependency on `@types/node ^7` is noise. | None needed. Optionally note "CJS, works through Vite interop" in the Stack row. |
| 6 | low | **makerjs "repo active Oct 2026" is overstated, but Ergogen parity holds.** All commits since 0.19.2 (2026-01-27) are Dependabot bumps or playground fixes. npm `time.modified` 2026-07-16 is a metadata change, not a release. The 0.18.1 to 0.19.2 commits touch only fonts, DXF line types, SVG winding, environment detection and prototype pollution, with no geometry algorithms. Ergogen 4.2.1 pins `makerjs ^0.18.1`, which resolves to 0.18.x. | Reword the memlog and Stack note to "maintenance-mode; geometry code unchanged since 0.18.1 (Ergogen parity holds)". |
| 7 | low | **The KiCad claim is confirmed; pin it explicitly.** On the `10.0` branch, `pcb_io_kicad_sexpr.h` has `#define SEXPR_BOARD_FILE_VERSION 20260206 // Fix barcode and variant attribute serialization`. Tags: 10.0.7 (2026-10-06), 10.0.8-rc1 (2026-10-21). `master` is already at `20261018` (KiCad 11 development). kicadts 0.0.58 contains no KiCad 10-specific tokens (no variants, no version constants), so a KiCad 10 round-trip is still unverified. | Have the `pcb` writer emit `(version 20260206)` as a constant. Keep the kicadts open-test in the Deferred row. |
| 8 | low | **ZMK details beyond wired split are confirmed.** v0.3.0 is still the latest release (no v0.4 tag). `app/dts/bindings/zmk,physical-layout.yaml` exists at v0.3.0, and boards ship `*-layouts.dtsi`. RGB underglow on nice!nano is confirmed: the Corne `boards/nice_nano_v2.overlay` at v0.3.0 uses `worldsemi,ws2812-spi` on `spi3` with GRB mapping, which works for SK6812mini-e. Underglow drives the whole chain as one strip, so per-key and underglow LEDs share effects. Board names are HWMv1 at v0.3.0 (`nice_nano_v2`); `main` uses HWMv2 qualifiers. On nRF52 the default UART mode is interrupt (async is excluded for a known bug). | The firmware writer should emit `build.yaml` board names for the pinned version only, and treat moving to v0.4 as a migration. |
| 9 | info | **`stack-research.md` has stale template pins.** Row 16 says create-vue uses `vitest ^5.0.5`; the 3.24.0 tarball has `vitest ^4.1.11` (the spine is already right). Row 9 says `vite ^8.3.4`; the template has `^8.2.2`. Pinia `^4.0.3`, Playwright `^1.63.0`, vue-tsc `^3.3.11`. | Correct the research note so later readers don't reintroduce Vitest 5. |

## Stack table check (npm, 2026-10-25)

| Spine row | Spine value | npm latest (modified) | Status |
|---|---|---|---|
| TypeScript | ~6.0 | 7.0.2 latest; 6.0.3 newest 6.x; create-vue pins `~6.0.0` | OK (deliberate) |
| Vue | 3.5.44 | 3.5.44 (2026-10-23) | OK |
| Vite | ^8.2 (8.3.5) | 8.3.5 (2026-10-21); template `^8.2.2` | OK |
| create-vue | 3.24.0 | 3.24.0 (2026-09-16) | OK |
| Pinia | ^4.0 (4.1.0) | 4.1.0 (2026-10-14); template `^4.0.3` | OK |
| vue-router | 5.4.0 | 5.4.0 (2026-10-07) | OK |
| Vitest | ^4.1 | latest 5.0.5; V4 tag 4.1.12; template `^4.1.11` | OK |
| pnpm | 12.15.0 | 12.15.0 (2026-10-24) | OK |
| dependency-cruiser | 18.7.0 | 18.7.0 (2026-10-23); engines node ^22/^24/>=26 | OK |
| makerjs | 0.19.2 | 0.19.2 (published 2026-01-27) | OK, see findings 3, 5, 6 |
| replicad / replicad-opencascadejs | 1.2.0 / 1.1.0 | 1.2.0 (2026-10-23) / 1.1.0 (2026-09-04) | OK. replicad builds against `replicad-opencascadejs ^1.1.0` (repo devDeps) but doesn't declare it, so pin both together |
| @bgotink/kdl | 0.4.1 | 0.4.1 (2026-10-13), MIT, ESM | OK |
| @tarikjabiri/dxf | 2.9.0 | 2.9.0 (2026-09-15), MIT, ESM | OK |
| KiCad target | 10.0.x, 20260206 | 10.0.7 stable; format 20260206 on `10.0` | OK, see finding 7 |
| ZMK target | v0.3.0 | v0.3.0 latest release (2025-08-01) | Version OK; wired split is **critical** (finding 1) |

## Deferred technologies: existence and naming

| Named in spine | Real package / project | Version (modified) | Licence | Notes |
|---|---|---|---|---|
| tscircuit capacity-autorouter | `@tscircuit/capacity-autorouter` (repo `tscircuit/tscircuit-autorouter`) | 0.0.1006 (2026-10-24) | MIT (repo), none in npm metadata | ESM, `dist/index.js` 3.2 MB fully bundled, no `node:`/`fs` imports, so a browser bundle is plausible. 24.9 MB unpacked (source maps). GitHub-URL dependency. |
| Freerouting via CheerpJ | `freerouting/freerouting` (GPL-3.0, active); CheerpJ 4.3 (Leaning Technologies) | n/a (not npm) | GPL-3.0 / CheerpJ Community or Commercial | See finding 2. No precedent found. |
| circuit-json-to-gerber | `circuit-json-to-gerber` | 0.0.117 (2026-10-24) | MIT | Peer `typescript ^5`, `tscircuit *`, `circuit-json *`. 3 stars. |
| kicadts | `kicadts` | 0.0.58 (2026-09-09) | MIT (repo) | Peer `typescript ^5`. 9 stars. KiCad 10 unverified. |
| clipper2-ts | `clipper2-ts` (countertype) | 2.0.1-18 (2026-07-04) | BSL-1.0 | Prerelease-style version on `latest`, so pin it exactly. ESM plus a minified `.mjs`. |
| manifold-3d | `manifold-3d` | 3.5.4 (2026-09-25) | Apache-2.0 | Active. Heavy dependency tree (gltf-transform, esbuild-wasm peer) beyond the core WASM; import only the core when adopted. |

All six exist and are named correctly. The only naming nuance is that the autorouter's npm scope differs from its repo name.

## What I could not verify

- Whether ZMK's experimental `half-duplex` mode works on nRF52840 with one pin. It needs hardware.
- Whether Freerouting runs headless under CheerpJ.
- Whether kicadts round-trips a KiCad 10 (20260206) board.
- Whether makerjs latency on the full Corney outline during a drag meets the target. The geometry spike covers this.

## Evidence

- `npm view` output for all packages (see the tables above).
- makerjs: tarball `dist/index.d.ts` lines 2128-2343 and 2825-2876, smoke test in Node, Vite 8.3.5 module-worker build. Issues: https://github.com/microsoft/maker.js/issues/509, /377, /387, /477, /455. Commits from 2025-12 to 2026-01 via the GitHub API.
- ZMK v0.3.0: `app/dts/bindings/zmk,wired-split.yaml`, `app/src/split/wired/{Kconfig,central.c}`, `docs/docs/features/split-keyboards.md`, `docs/docs/config/split.md`, `app/dts/bindings/zmk,physical-layout.yaml`, `app/boards/shields/corne/boards/nice_nano_v2.overlay`. All at ref `v0.3.0` via the GitHub API.
- Corney Island: `_bmad-output/layout-model/sources/corney-island.yaml` (MCU pins near line 829, TRRS near lines 890-897).
- KiCad: https://gitlab.com/kicad/code/kicad/-/raw/10.0/pcbnew/pcb_io/kicad_sexpr/pcb_io_kicad_sexpr.h and the GitLab tags API.
- CheerpJ licensing: https://cheerpj.com/docs/licensing
