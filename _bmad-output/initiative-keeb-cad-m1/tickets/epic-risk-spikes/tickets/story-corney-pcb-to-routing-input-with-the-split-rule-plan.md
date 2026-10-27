---
title: 'Corney PCB to routing input, with the split rule'
type: 'feature'
ticket: '4'
created: '2026-10-27'
status: 'built'
baseline_revision: '1e65ee2479a458369939fae3c08b1363d4f3aa76'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Both routers (tscircuit, entries 6–7; custom, entries 8–10) need the same routing input from Corney's Ergogen `.kicad_pcb`, and AD-14 leaves the connection split rule "fixed at the routing spike". The rule must depend only on ids and the netlist, a connection id must be the net id plus its two pads in canonical order, and ids must survive a key move (R4).

**Approach:** In `spikes/`, a pure `toRoutingInput(pcbText)` builds an engine-neutral `RoutingInput` (outline, pads, fixed copper, keep-outs, net classes, connections). The split rule is written in `spikes/SPLIT-RULE.md` and implemented by one function. `moveKey(pcbText, key, delta)` produces the one-key-move variant that entries 7 and 10 use. Tests run under Vitest in `spikes/`.

## Boundaries & Constraints

**Always:**
- Read only the committed `fixtures/corney-island/ergogen/pcbs/*.kicad_pcb`, loaded with Vite `?raw`.
- Reuse `fixtures/src/kicad-pcb.ts` (`parseSexpr`, and `readKicadPcb` for the outline) by relative import. Its additions stay pure: no fs and no paths.
- Frame and units are KiCad's: mm, y down.
- Pad id is `<Reference>.<pin>.<copper>`, where copper is `F`, `B` or `TH`. Reversible duplicates (switch pads 1 and 2 on F and B; MCU through-holes and jumper pads) are distinct pads, so their links are visible connections and never assumed connected. Pads without a number or net (NPTH) are obstacles, not pads.
- Decision (2026-10-27, after implementation): when two pads share a `<Reference>.<pin>.<copper>` (for example the wired TRRS1's reversible holes for pins 2, 3 and 4), the first in file order keeps the id and later ones get `.2`, `.3` and so on (`TRRS1.2.TH`, `TRRS1.2.TH.2`). File order is Ergogen's and a key move does not change it, so the ids are stable and use no positions. Copies are never merged (C6).
- A net id is the net name.
- A connection id is `<net>:<padA>~<padB>`, with padA < padB in natural-sort order.
- Decision (2026-10-27): the split rule is a chain. Sort a net's pad ids in natural order (so `D2` sorts before `D10`) and connect each pad to the next, giving n−1 connections with no pad on more than two. A star from the lowest pad id was rejected because it puts all of GND's 67 connections on one pad.
- Nets with fewer than two pads give no connections.
- Every connection carries `realisedBy: 'key-cell' | 'fixed-copper' | 'routing'`. `key-cell` means both pads are on one key's switch or diodes (AD-12). `fixed-copper` means the pre-routed traces already join the two pads (for example a jumper's F, B and TH copies). Finding this is the only place positions are used, and it is only for the tag, never for ids or the split. All kinds are emitted, so entries 6–10 choose what to score.
- The ~224 (wired) / ~228 (wireless) existing top-level `segment`s near MCU1 are fixed copper: kept with width, layer and net (or none), and never rerouted.
- Decision (2026-10-27, after implementation; it replaces the between-pin-rows strip, which blocked every controller net because the board nets land on MCU1's ±3.4 mm jumper holes inside it): the pre-routed module zone is the module's fixed copper itself, meaning the pre-routed traces, with no area keep-out. "No copper enters the module zone" (R3) means no new copper comes closer than clearance to that fixed copper, which drc checks. There is no antenna keep-out, because the sources define none.
- Decision (2026-10-27): the net classes follow JLCPCB's 2-layer rules with margin:

  | Class | Nets | Width | Clearance |
  |---|---|---|---|
  | power | GND, VCC, RAW, and BAT_P on wireless | 0.25 mm | 0.20 mm |
  | signal | every other net | 0.15 mm | 0.15 mm |

  Board-edge clearance is 0.30 mm, and the via is 0.56 mm with a 0.30 mm drill. `RoutingInput` also carries the engine clearance, which is the strictest class's: 0.20 mm. JLCPCB's floor is 0.10 mm trace spacing, 0.2 mm to the edge and 0.15 mm SMD pad to pad (jlcpcb.com/capabilities, checked 2026-10-27).
- The one-key move shifts that key's footprints rigidly: S_n, D_n, D_{n+21}, and on wired its LED_n.

**Never:**
- No positions in the split rule or in any id.
- No engine-specific format (SimpleRouteJson and so on); entries 6 and 8 adapt.
- No changes outside `spikes/` except additive pure exports in `fixtures/src/kicad-pcb.ts`.
- No loosened clearance (C6).
- No routing in this story.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Wired / wireless | Committed `.kicad_pcb` | Every net with ≥2 pads yields connections per the rule; outline, pads, fixed copper, keep-outs and net classes are filled | No error expected |
| Single-pad net | e.g. `outer_bottom_F` | No connections | — |
| Key moved | `moveKey` on one key, both designs | Connection id set identical; only the moved key's pads change position | — |
| Repeated pin | Wired TRRS1 pins 2–4, each with two holes | `TRRS1.<n>.TH` and `TRRS1.<n>.TH.2`, linked by a connection on their net; the wired board converts | Never merged |
| Unknown key | `moveKey` with a name not in points.yaml | Throws, naming it | — |
| Net classes | Both designs | Power nets exactly GND, VCC, RAW (+ BAT_P wireless); all others are signal; engine clearance 0.20 | — |
| Module zone | Both designs | Every pre-routed segment is fixed copper; there is no area keep-out; every MCU1 board-net jumper hole (`MCU1.1xx.TH`) is a pad; connections whose pads the fixed copper already joins are tagged `fixed-copper` | — |

</frozen-after-approval>

## Code Map

- `fixtures/src/kicad-pcb.ts` -- `parseSexpr`, `readKicadPcb` (outline + footprints); pure, no imports. Add an exported `readPads(pcb)` / `readSegments(pcb)` or extend `KicadPcb`; pad `(at lx ly r)` is local and r is absolute (normalise mod 360, 375 occurs). World pos: `x = fx + lx·cosθ + ly·sinθ`, `y = fy − lx·sinθ + ly·cosθ`, θ = footprint r. B.Cu footprints are already flipped. Do not import `fixtures/src/index.ts` or `corney-pcb.ts` (node fs + yaml).
- `fixtures/corney-island/ergogen/pcbs/corney_island{,_wireless}.kicad_pcb` -- nets from :84 (124 / 100); 649 / 460 pads; pads carry `(net N "name")`; `*.Cu` = through-hole. Max net GND (68 wired). Segments: 224 / 228, all width 0.25, inside x 207–222, y 57–98; no vias, zones or net classes.
- `fixtures/corney-island/ergogen/points/points.yaml` -- 21 keys in point order; S_n is the nth key; D_n (B.Cu) and D_{n+21} (F.Cu) follow. Keys are linked by nets: `{colrow}_B` = S_n.2 + D_n.2. Read it with `?raw` and a tiny line parser (spikes has no `yaml` dep), or hardcode the 21 names in order.
- `fixtures/corney-island/source/config.yaml:80-84` -- trace widths and via.
- `spikes/` -- standalone pnpm root (strict, `hoist: false`); `tsconfig.json` `types: []`, DOM + WebWorker; no test runner yet. Root lockfile resolves vitest 4.1.12 with vite 8.3.5.

## Tasks & Acceptance

**Execution:**
- [x] `fixtures/src/kicad-pcb.ts` -- add pure pad (reference, pin, type, shape, size, drill, layers, net, world x/y/r) and top-level segment extraction. Keep the existing exports unchanged, so entry 2's tests still pass.
- [x] `spikes/package.json`, `spikes/pnpm-lock.yaml` -- add `vitest` 4.1.12 pinned, a `test` script (`vitest run`), and `pnpm test` in `verify` after typecheck.
- [x] `spikes/src/vite-env.d.ts` -- `vite/client` types for `?raw`.
- [x] `spikes/src/routing-input.ts` -- `RoutingInput` types and `toRoutingInput(pcbText)`.
- [x] `spikes/src/split-rule.ts` -- `splitNet(netId, padIds)` and `connectionId`; position-free by signature.
- [x] `spikes/src/move-key.ts` -- `moveKey(pcbText, key, {dx, dy})`, which rewrites the footprints' `(at …)` in the text.
- [x] `spikes/src/corney.ts` -- `?raw` loaders for both designs, plus the key list.
- [x] `spikes/src/routing-input.test.ts` -- one test per matrix row on both designs. Snapshot the counts (pads, connections, key-cell vs routing). Check that each connection id matches `connectionId` of its pads.
- [x] `spikes/SPLIT-RULE.md` -- the rule, the id grammar and a worked example from Corney (a row net), for AD-14 via story 13.
- [x] `spikes/README.md` -- the new command and the counts.

**Acceptance Criteria:**
- Given `spikes/`, when running `pnpm --dir spikes verify`, then the typecheck, the tests (wired and wireless conversion, the moved-key id equality) and the existing route test all pass.
- Given the repo root, when running `pnpm check`, then it passes (fixtures tests unchanged).

## Implementation Notes

- **RESOLVED (renegotiated 2026-10-27): the TRRS1 pad-id collision.** On the wired board,
  TRRS1's pins 2, 3 and 4 each have two `*.Cu` holes on one net. They are now `TRRS1.<n>.TH` and
  `TRRS1.<n>.TH.2`, by file order. The full committed wired board converts, and the
  TRRS1-removed test copy is gone.
- **RESOLVED (renegotiated 2026-10-27): the module zone blocked controller nets.** The
  between-rows rectangle is gone and `keepOuts` is empty. The module zone is the fixed copper
  itself; the test checks 224 / 228 traces. All 24 jumper holes `MCU1.101–124.TH` are pads on board
  nets. Clearance to fixed copper is left to drc.
- `realisedBy: 'fixed-copper'` comes from `fixedCopperGroups` (a union-find). A trace end on a
  pad's copper, on the same layer, joins the trace to the pad; TH pads count on both layers. A
  trace end on another same-layer trace joins the two traces. A check over both boards found no
  group that mixes nets. Fixed-copper links: wired 104 (MCU1 96, DISP1 8); wireless 108 (MCU1 96,
  DISP1 8, JST1 4). Precedence is fixed-copper, then key-cell, then routing. The two never overlap
  on Corney.
- Wireless has 228 top-level segments: 224, plus 4 JST1 jumpers that are indented under the JST1
  footprint but are top-level.
- `fixtures/src/kicad-pcb.ts` gains the pure exports `readPads(text)` and `readSegments(text)`
  (and the types `Pad`, `CopperSegment` and `Size`). The existing exports are unchanged.
- I added `spikes/vitest.config.ts`, which the plan did not list. It limits Vitest to
  `src/**/*.test.ts`, so Playwright's `e2e/*.spec.ts` is never collected.

## Plan Change Log

- 2026-10-27: no change to the frozen block. The TRRS1 collision above is open for renegotiation.
- 2026-10-27: user renegotiated the frozen block. (1) Repeated pad ids take a file-order suffix `.2`, `.3`, so the wired board converts in full; the TRRS1-removed copy is dropped. (2) The module zone is now the fixed copper with no area keep-out, because the strip blocked every controller net. (3) `realisedBy` gains `fixed-copper`. Matrix rows "Repeated pin" and "Module zone" were rewritten. KEEP: the chain split, the net classes, `moveKey`, the vitest setup and the counts snapshot approach.

## Review Triage Log

### Pass 1 (quick): high 0, medium 0, low 7, false 0, maybe-false 0. 6 patched, 1 rejected.

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | SPLIT-RULE.md pad-id grammar has no `.2`/`.3` suffix | low | patch | Confirmed. `TRRS1.2.TH.2` doesn't parse by the grammar line, and this doc feeds AD-14. Fix: add the suffix to the grammar. |
| 2 | `naturalCompare` docs say "code-unit tie-break", but the code decides at the first differently spelled chunk | low | patch | Confirmed (`a01b` < `a1a`). No Corney id is zero-padded. Fix: make the doc comment and SPLIT-RULE.md describe the code. |
| 3 | `kicad-pcb.ts` refactors existing code (Never: "additive only"), and `footprint()` calls `referenceOf` twice | low | patch (double call); refactor kept | The refactor keeps behaviour, and the fixtures tests pass unchanged in `pnpm check`. The double parse is real. Fix: compute it once. |
| 4 | `fixedCopperGroups` unions copper with no net check; nothing asserts that groups don't mix nets | low | patch (test) | Only a deleted one-off check showed no mixing. Fix: assert per design that each group holds one net. |
| 5 | `keyCount` comes from `S<n>` footprints, while `moveKey` uses points.yaml keys | low | reject | Both are 21 on Corney (the reviewer checked S×21 and D×42), and this spike code converts only Corney. Unlikely to be hit, and the fix adds a parameter. |
| 6 | Key-cell test never checks that padA and padB are on the same key | low | patch (test) | Confirmed. Only the snapshot's 63 would catch a mis-tag. Fix: assert both pads map to the same key. |
| 7 | README's "exits 0 only if" leaves out the unit tests | low | patch | Confirmed. Fix: add the condition. |

## Design Notes

Ids use KiCad references because Corney has no keeb-cad slot ids yet. The mapping to AD-14's `<side>/<slot>.<component>.<pin>` (S_n ↔ key n's `switch`, D_n ↔ its `diode`) is written in SPLIT-RULE.md. The id-stability test only catches position leaks, because a rigid move changes no references; the real guard is that `splitNet` cannot receive positions.

The module zone is the fixed copper itself; there is no area keep-out (renegotiated 2026-10-27). The test asserts that every pre-routed segment is fixed copper, that `keepOuts` is empty, that every `MCU1.1xx.TH` jumper hole is a pad, and that the jumper triples are tagged `fixed-copper`.

For story 13 (AD-20 input): clearances depend on the fab. keeb-cad could offer fab presets (for example "JLCPCB 2-layer") that fill in `design-rules`.

## Verification

**Commands:**
- `pnpm --dir spikes verify` -- expected: exit 0.
- `pnpm check` -- expected: exit 0.
