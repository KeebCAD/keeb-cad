# Stack research: keeb-cad (browser-only TS + Vue)

Retrieved 2026-10-24. Versions and dates come from `npm view <pkg> version time dist-tags` and from the GitHub API (`pushed_at`, releases). Feature notes come from source and docs pages fetched the same day. Entries marked *(unverified)* were not confirmed from a primary source.

## 1. Starter and core packages

| name | version | date | source URL | notes |
|---|---|---|---|---|
| create-vue | 3.24.0 | 2026-09-16 | https://github.com/vuejs/create-vue (index.ts, template/config/*) | Prompts for TypeScript, then lets you pick JSX, Router, Pinia, Vitest, E2E (Playwright or Cypress), ESLint and Prettier. **Oxlint is always added with ESLint**; the `--oxlint` flag is deprecated. Experimental options: `--oxfmt`, `--vue-rc` (Vue 3.6 RC) and `--tsgo`. `--bare` removes example code. Base template: vite ^8.3.4, @vitejs/plugin-vue ^6.0.10, vite-plugin-vue-devtools ^8.2.1, Node ^22.18 \|\| >=24.12. |
| vue | 3.5.44 (latest) / 3.6.0-rc.13 (rc) | 2026-10-23 (rc) | npm | 3.6 (Vapor mode) is at RC; create-vue offers it behind `--vue-rc`. |
| vite | 8.3.5 | 2026-10-21 | npm | 8.0.0 shipped 2026-03-12. The create-vue repo also has a rolldown config. |
| typescript | 7.0.2 (latest) | 2026-07-08 | npm | **create-vue still pins `typescript ~6.0.0` with vue-tsc ^3.3.13.** TS 7 (the native Go compiler) is used only through the experimental `--tsgo` option. Use TS 6.0.x with vue-tsc for now. 6.0.3 was published 2026-04-16. |
| vue-tsc | ^3.3.13 (template) | - | create-vue template/config/typescript | |
| pinia | 4.1.0 | 2026-10-14 | npm | Template uses ^4.1.0. |
| vue-router | 5.4.0 | 2026-10-07 | npm | Template uses ^5.4.0. |
| vitest | 5.0.5 | 2026-10 | npm | Template uses ^5.0.5 with jsdom ^30.1.3. 5.1.0-beta.1 published 2026-10-19. |
| @vue/test-utils | 2.5.1 | 2026-09-16 | npm | |
| @playwright/test | 1.64.1 | 2026-10 | npm | |
| eslint / oxlint / prettier | 10.13.0 / 1.89.0 / 3.9.10 | 2026-10-16 / 10-19 / 10-10 | npm | |

## 2. Browser CAD / geometry kernels (3D case solids)

| name | version | date | source URL | notes |
|---|---|---|---|---|
| replicad | 1.2.0 | 2026-10-23 (1.0.0 on 2026-08-14) | https://github.com/sgenoud/replicad | MIT; 707 stars; last push 2026-10-23. A B-rep API over OCCT: sketches, extrude/loft/revolve, booleans, **fillets and chamfers**, shell, STEP export (including an assembly exporter), STL export, and DXF/SVG projection. Its source now includes a `manifoldlib.ts` bridge to manifold-3d for mesh booleans. Built to run in a Web Worker; replicad-studio is the reference. |
| replicad-opencascadejs | 1.1.0 | 2026-09-04 | npm | LGPL-2.1. Ships `replicad_single.wasm` at 22.98 MB raw, **about 7.2 MB with gzip -9** (measured), and a separate `replicad_multi.wasm` (threads). This is a custom OCCT build and is maintained. |
| opencascade.js | 1.1.1 (beta 2.0.0-beta.b5ff984) | last publish 2023-03-23 | https://github.com/donalffons/opencascade.js | LGPL-2.1. **Stale**: no npm publish since 2023-03 and last repo push 2023-08. Low-level raw OCCT bindings. Supports STEP and fillets, but it is not a good thing to depend on directly. |
| @bitbybit-dev/occt | 1.5.0 | 2026-10-12 | https://github.com/bitbybit-dev/bitbybit | MIT wrapper over OCCT; last push 2026-10-23. The package unpacks to 100 MB. Has STEP, fillets and booleans, runs in workers, and is aimed at its visual-programming platform. A viable second choice. |
| manifold-3d | 3.5.4 | 2026-09-25 | https://github.com/elalish/manifold | Apache-2.0; 2.4k stars; very active (push 2026-10-24). WASM is **541 KB raw / about 204 KB gzip** (measured). Fast, robust mesh booleans and offsets with hull/minkowski-style ops. Exports mesh only (STL/3MF/glTF). **No STEP and no true B-rep fillets.** |
| @jscad/modeling | 2.13.0 (alpha 3.0.7-alpha.0) | 2026-08-02 (alpha) | https://github.com/jscad/OpenJSCAD.org | MIT, pure JS, mesh CSG. Exports STL/OBJ/3MF/DXF/SVG. **No STEP.** No fillets on arbitrary edges (only rounded primitives and expand). V3 is still alpha. |
| truck (truck-js) | crate 0.2.0 | repo push 2026-10-19 | https://github.com/ricosjp/truck | Apache-2.0, a Rust B-rep kernel. Has `truck-stepio` (STEP) and `truck-shapeops` (booleans). truck-js is **not published on npm**, so you build it yourself with wasm-pack, and its README is one line. Fillet maturity *(unverified)*. Experimental for this use. |

**Recommendation:** use **replicad** (OCCT) in a dedicated Web Worker. It is the only maintained option with a TS-first B-rep API plus fillets/chamfers plus STEP export. Expect about 7 MB of gzipped WASM, so cache it and lazy-load the worker. For "live-ish" regeneration, keep the parametric model in TS, debounce rebuilds, and consider showing a manifold-3d mesh preview during drags with a full OCCT rebuild when the drag ends (replicad already bridges to manifold). LGPL OCCT is acceptable when served as an unmodified, dynamically loaded WASM, but record that decision.

## 3. 2D: DXF writing and polygon offsetting

| name | version | date | source URL | notes |
|---|---|---|---|---|
| @tarikjabiri/dxf | 2.9.0 | 2026-09-15 | https://github.com/dxfjs/writer | MIT, TS, maintained (push 2026-09-16, 125 stars). **Recommended DXF writer.** |
| dxf-writer | 1.18.4 | 2022-11-07 | npm | MIT. Unmaintained since 2022. |
| makerjs | 0.19.2 | 2026-01-27 | https://github.com/Microsoft/maker.js | Apache-2.0. Revived: 0.18.2 to 0.19.2 shipped in Jan 2026, repo push 2026-10-18. A 2D model library with DXF/SVG export and an outline/expand feature. Heavier than a plain writer; useful if you also want its model/path ops. |
| clipper2-ts | 2.0.1-18 (latest tag, prerelease-style numbering) | 2026-07-04 | https://github.com/countertype/clipper2-ts | BSL-1.0, a pure-TS port of Clipper2: booleans, offsetting, triangulation. Active in 2026. **Recommended (no WASM, works well in workers).** |
| clipper2-wasm | 0.4.0 | 2026-05-18 | https://github.com/ErikSom/Clipper2-WASM | BSL-1.0, WASM port, 1.2 MB unpacked. A fallback if TS-port performance is not enough. |
| clipper2-js | 1.2.4 | 2024-01-01 | https://github.com/IRobot1/clipper2-ts | Stale since 2024. |
| clipper-lib (Clipper1) | 6.4.2 | 2019-11-08 | npm | Stale, old Clipper1. |
| js-angusj-clipper (Clipper1 WASM) | 1.3.1 | 2023-02-04 | npm | Stale. |

## 4. KiCad file generation

| name | version | date | source URL | notes |
|---|---|---|---|---|
| KiCad (stable) | **10.0.7** (10.0.8-rc1 tagged 2026-10-21) | 10.0.0 in 2026-03; 10.0.7 tagged 2026-10-06 | https://www.kicad.org/blog/2026/03/Version-10.0.0-Released/ , GitLab tags API | **KiCad 10 is the current stable major version.** |
| `.kicad_pcb` format version (10.0 branch) | `SEXPR_BOARD_FILE_VERSION 20260206` | - | https://gitlab.com/kicad/code/kicad/-/raw/10.0/pcbnew/pcb_io/kicad_sexpr/pcb_io_kicad_sexpr.h | Recent bumps: 20251028 (stopped writing netcodes), 20251101 (backdrill), 20260101 (PCB variants). The schematic format is 20260306. Newer KiCad opens older versions. |
| kicadts (tscircuit) | 0.0.58 | 2026-09-09 | https://github.com/tscircuit/kicadts | MIT, TS. A class per s-expression token; reads and writes `.kicad_pcb`, `.kicad_sch` and `.kicad_mod`. Active, but 0.0.x with 9 stars. README examples use `version: 20240101`, so confirm KiCad 10 round-trips. |
| circuit-json-to-kicad | 0.0.252 | 2026-10-23 | https://github.com/tscircuit/circuit-json-to-kicad | Converts tscircuit Circuit JSON to `.kicad_sch`, `.kicad_pcb` and `.kicad_pro`. Very active but tied to the Circuit JSON model. |
| kicad-to-circuit-json | 0.0.144 | 2026-10-21 | npm | Reverse direction (import). |
| kicad-converter | 0.0.17 | 2025-07-08 | npm | Stale, superseded by the packages above. |
| ergogen | 4.2.1 | 2025-11-02 | https://github.com/ergogen/ergogen | MIT. A keyboard generator that emits KiCad PCBs from footprint templates. Prior art for footprint and switch placement; slower activity. |

**Recommendation:** use kicadts as the s-expression model and serializer, or write a thin serializer of your own for the subset you need (footprints, edge cuts, maybe nets). In either case, pin the target format version and test-open the output in KiCad 10.

## 5. Firmware config formats

| name | version | date | source URL | notes |
|---|---|---|---|---|
| ZMK release | **v0.3.0** (latest tag) | 2025-08-01 | https://github.com/zmkfirmware/zmk/releases | `main` has been on **Zephyr 4.1 since 2025-12-09**. v0.4 will be the first release with it but **is not released yet** (no v0.4 tag as of today; last main commit 2026-10-09). |
| ZMK Zephyr 4.1 / HWMv2 | - | 2025-12-09 | https://zmk.dev/blog/2025/12/09/zephyr-4-1 | Out-of-tree **boards** must move to HWMv2 (`board.yml`, vendor dirs, `Kconfig.<board>`). Board names gain qualifiers and variants (`nice_nano@1.0.0`, `board//zmk`). **Shields need no HWMv2 changes.** Smaller changes: WS2812 Kconfig and Cirque property renames. |
| ZMK shield layout | - | docs fetched 2026-10-24 | https://zmk.dev/docs/development/hardware-integration/new-shield | Files: `Kconfig.shield`, `Kconfig.defconfig`, `<kb>.overlay` (or `_left/_right.overlay` plus `<kb>.dtsi` for splits), `<kb>.keymap`, `<kb>.zmk.yml`, optional `<kb>.conf`. A `zmk,matrix-transform` node is required. A `zmk,physical-layout` node (in `<kb>-layouts.dtsi`, chosen via `zmk,physical-layout`) carries key positions and is **required for ZMK Studio**. Studio also needs a studio-unlock key in the keymap. |
| ZMK "Shield Wizard" (community) | - | 2026-07-17 | https://zmk.dev/blog | A community tool by Genteure for generating shields. Overlaps with this project, so it is worth studying. |
| QMK breaking-change cycle | 0.34.0 | 2026-08-30 | https://docs.qmk.fm/breaking_changes_history | Quarterly cycles: 0.32 (2026-02-22), 0.33 (2026-05-31), 0.34 (2026-08-30). |
| QMK keyboard definition | `keyboard.json` | docs fetched 2026-10-24 | https://docs.qmk.fm/porting_your_keyboard_to_qmk , https://docs.qmk.fm/reference_info_json | A new keyboard is defined in `keyboard.json`. The schema is still documented as the "info.json format", and `info.json` is used for shared parent-folder levels. Fields: `layouts.LAYOUT_*.layout[]` (matrix, x, y, w, h), `matrix_pins`, `diode_direction`, `processor`, `bootloader`, `usb`, `features`, `split`, `encoder`, `rgb_matrix`. config.h and rules.mk are still used for features not yet migrated. |
| QMK 2026-08 changes | 0.34.0 | 2026-08-30 | https://docs.qmk.fm/ChangeLog/20260830 | No keyboard.json schema break. Docs added data-driven config for RGB Matrix, encoders and LED Matrix. **VIA integration is moving to the VIA team** (old feature deprecated). Community Modules v1.1.3 can persist their own data. |
