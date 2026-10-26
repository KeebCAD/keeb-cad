---
title: 'technical research: browser-runnable PCB autorouters'
type: 'technical'
topic: 'browser-runnable PCB autorouters'
decision: 'Which routing engine candidates the epic-risk-spikes routing spike builds against Corney Island'
source: 'native run'
status: complete
claims_verified: 7
claims_unverified: 2
claims_disputed: 1
preset: 'standard'
validation: 'normal'
created: '2026-10-26'
updated: '2026-10-26'
---

# technical research: browser-runnable PCB autorouters

**Decision this research serves:** which routing engine candidates the epic-risk-spikes routing spike builds against Corney Island (shape: select).

## Executive summary

**Spike tscircuit's autorouter first, and keep a small custom TypeScript router as the named runner-up. Drop Freerouting, Topola and krt-wasm as spike candidates.**

- **Only one finished engine passes every gate.** That is `@tscircuit/capacity-autorouter`: MIT, pure ESM with no Node APIs, and no network in its default pipeline [1][2]. Even so, two gates pass only with conditions that the spike must test:
  - it can rewrite traces passed in as existing copper, and it has no lock option [1];
  - it has never been shown running in a browser Web Worker [1].
- **"Solved" does not mean DRC-clean, for any engine we looked at.** tscircuit has four open bugs that return solved routes with clearance violations or shorts. One of them is through-hole vias ignoring bottom-layer copper, which affects hotswap boards [3][4][5][6]. AD-20's single `drc`, used as the gate, is therefore load-bearing whatever engine is chosen.
- **No engine supports per-net clearance.** tscircuit has board-wide clearance plus trace width per connection [1]. krt-wasm and Topola each use one clearance [15][16]. The only practical policy that stays inside C6 is to route at the strictest clearance and let `drc` check the net classes.
- **Freerouting is blocked by its runtime, not its licence.** Under the relaxed licence gate it can ship as a separately loaded worker. But CheerpJ's free tier must load from Leaning Technologies' servers [12], self-hosting costs £100 per developer per month [13], and there is no WASM or TeaVM build [10]. It stays useful as a native, dev-time quality reference, never shipped.

**Biggest caveat:** nothing here was run. Every capability cell comes from reading code, types, docs and issue trackers. Whether tscircuit can route a Corney-like board in a browser, how fast, and whether it leaves fixed copper intact are exactly what the spike measures. tscircuit's own numbers come from a 32-vCPU server, with p90 times up to 146 s and peak memory up to 1.95 GB [7].

## Requirements (agreed at the plan gate, 2026-10-26)

Hard gates:
- G1: no network at runtime.
- G2: licence. Permissive, or GPL only as a separately loaded worker module that exchanges standard file formats, with source offered. keeb-cad itself ships permissive.
- G3: runs client-side in a Web Worker.
- G4: accepts existing copper as fixed obstacles (AD-12).

Weighted criteria:

| Id | Criterion | Weight |
|---|---|---|
| W1 | Keep-outs and a pre-routed module zone | 3 |
| W2 | Net classes (width, clearance) and edge clearance | 3 |
| W3 | 2-layer keyboard quality | 3 |
| W4 | Browser speed | 2 |
| W5 | Integration (pnpm strict, TS 6, static WASM) | 2 |
| W6 | Ecosystem health | 2 |
| W7 | Determinism | 1 |

## Landscape and screen

The browser-runnable field is small. Every serious general-purpose open router is GPL (Freerouting [9], KiCad's PNS router [21]) or in Java. The permissive field is tscircuit's TypeScript pipeline [1], the MIT Rust grid router KiCadRoutingTools and its WASM fork krt-wasm [14][15], and Topola, an MIT Rust topological router [16].

**Cut at the screen:**
- **KiCad PNS:** GPL-3.0 and tied to pcbnew; no WASM build [21].
- **The kicad-mcp "freeroute" Python port:** a reported GPL-3.0-or-later port of Freerouting, pre-alpha, and its repository is unreachable after a failed migration [22]. Confidence is low; the evidence is search snippets only.
- **RustRouter, typmax-router, bbnet:** GPL or AGPL.
- **happy-autorouter:** four-layer via-in-pad only.
- **kbplacer:** GPL-3.0 [20]. It is a greedy 45° router that "doesn't look for other options if there is a collision, leaving elements unconnected" [20].
- **kle-ng:** routes on a remote server using kbplacer, so it fails G1 and G3 [19].

**Keyboard-specific prior art is thin.** Ergogen's `utility_router` stores hand-written route strings, not autorouting [25]. Community Ergogen builds route with Freerouting outside the browser [26]. I found no published write-up of anyone building a keyboard matrix router, and no documentation of a "rows on one layer, columns on the other" channel approach.

## tscircuit capacity-autorouter

**Current state** [1][2]:
- Version 0.0.1010, released almost daily, with 14 versions between 21 and 25 October 2026.
- About 1,070 commits in six months, with bots doing about half; one npm maintainer.
- The default solver is `AutoroutingPipelineSolver9_PreloadedTraceGraph`.

**Input.** The input is SimpleRouteJson. It carries:
- `layerCount` and a polygon `outline`;
- `minBoardEdgeClearance` and other board-wide pad, hole and via clearances;
- `nominalTraceWidth` per connection;
- rect or circle obstacles with `connectedTo` exemptions, which can serve as keep-outs;
- existing `traces` [1].

It has no per-net clearance and no polygon obstacles [1].

**Fixed copper (G4).** Incremental routing is something the project designs for: it keeps datasets for finishing boards "without disturbing valid existing routes" [8]. But the output type carries `__replaces_pcb_trace_id` ("Preloaded trace intentionally replaced by this routed output"), and Pipeline 9 returns `mutatedPreloadedTraces` [1]. I found no lock, fixed or immutable option [1]. So G4 passes only if one of two things holds:
- saved routes come back unchanged, which the spike must diff; or
- they are passed in as rect obstacles with `connectedTo` set, which no one has tried.

**Runtime (G1, G3).** The only `fetch` calls are in the separately exported `_Networked` pipeline. The default pipeline's cache is in memory [1]. The 3.3 MB main bundle has no `node:` imports and no Bun calls, and the step API is synchronous, which suits a Worker [2]. The repo ships only Bun and Node worker runtimes; no example shows a browser Web Worker [1]. Its type definitions import types from about 20 packages it does not declare, which is a risk under pnpm strict [2] (medium confidence).

**Quality** [7]. The latest Pipeline 9 run on the project's own datasets (2026-10-25, 32-vCPU server):

| Dataset | Completion | Relaxed DRC pass | p50 time | p90 time |
|---|---|---|---|---|
| dataset01 | 100% | 100% | 2.0 s | 5.9 s |
| srj18 | 100% | 100% | 38 s | 122 s |
| srj19 | 94% | 92.5% | 12 s | 105 s |
| srj20 | 79% | 79% | 12 s | 146 s |
| srj21 | 100% | 100% | 1.0 s | 1.4 s |
| srj23 (partially routed) | 100% | 80.3% | 1.9 s | 15 s |

None of the datasets is a keyboard board. Four bugs are open, and each returns `solved` with violations or shorts:
- #3130: vias 0.15 mm from pads at a 0.2 mm rule [3];
- #2654: a via over an unrelated pad [4];
- #2147: overlapping vias on two nets [5];
- #2947: through-hole escape vias ignore bottom-layer copper [6].

The project keeps a 37-input dataset of its own DRC failures [1]. Geometry is probably deterministic for a pinned version; trace ids may not be [2] (low to medium confidence).

## krt-wasm / KiCadRoutingTools

**Licence: clean.** Both upstream and the fork are MIT, and the fork keeps drandyhaas's copyright. Freerouting appears only as a benchmark run as a separate process; I found no GPL-derived code in the Rust core [14][15].

**Fit: weak.**
- **Build target.** Upstream is a PyO3 library with no WASM feature. The tscircuit fork builds with `--target nodejs` only, and inlines a 265 KB WASM as base64 with no Node-only APIs. A Web Worker is plausible but untested [15].
- **Inputs.** The fork's WASM API reads only axis-aligned rect obstacles, rectangular bounds, a width per connection and one global clearance. It has no input for existing traces, outline, polygons or net classes [15].
- **Failure semantics.** Connections are routed one after another, in four fixed orderings. A single failed connection fails the call, which never returns partial routes [15]. AD-12 needs the opposite: report what's unrouted and keep everything else.
- **Activity.** The fork has been frozen on an old core since 2026-08-20. Upstream is very active (about 5,600 commits in six months) and has the features the fork lacks: arc board edges, polygon keep-outs, net classes and rip-up. But upstream only builds as a Python extension [14].

## Topola

**For** [16]:
- MIT.
- A headless DSN → SES library and CLI.
- DSN wiring loads as fixed copper, so G4 holds in code.

**Against:**
- It parses keep-outs and then ignores them, and it applies only the generic clearance [16].
- Board-edge collision is an open issue, and vias are constant size on two layers [16].
- The maintainers acknowledge routing is non-deterministic (#46) [17].
- It panics on real boards (#278 and related issues) [18].
- `develop` has had one commit in six months. Active work is on a `rewrite` branch that drops the CLI. There are no releases [16].
- Running it in a Worker would need our own wasm-bindgen wrapper [16].

## Freerouting (re-screened under the relaxed licence gate)

**Licence and activity.** GPL-3.0, actively released (v2.5.0 on 2026-10-05) [9]. Under the relaxed G2 it would ship as a separate worker exchanging DSN and SES.

**Runtime (G1, G3).** It fails both today:
- The free CheerpJ Community licence allows use only "from the cjrtnc.leaningtech.com domain", and self-hosting needs a Commercial licence [12].
- The Small Business tier is £100 per developer per month, billed annually; Enterprise is by quote. The pricing page is undated [13], so freshness is medium.
- Self-hosting is allowed during a technical evaluation, and licences are per application [12].
- No TeaVM or GraalVM WebAssembly build exists. Open issue #1012 asks only for a decoupled, headless routing core. One researcher read it as a request for WASM builds, but the verifier found it does not ask for them, so the reading is disputed. That no WASM build exists is confirmed [10].

**Fixed wires and keep-outs.** Recent work fixed preserved-trace handling. Two bugs remain open: `wire_keepout` is imported as a full keep-out that also blocks vias (#1018, fix in PR #1023) [11], and SES reimport rejects exported wires [11]. Whether CheerpJ runs inside a Web Worker was not checked.

## Custom TypeScript router (wildcard)

**Building blocks are available, permissive and maintained:**
- clipper2-ts 2.0.1-18 (BSL-1.0, pure TS, 2026-07) or clipper2-wasm 0.4.0 for clearance offsets and booleans [23];
- flatbush 4.6.2 (ISC, 2026-06) for spatial indexing [24].

PathFinding.js was abandoned in 2016, so the grid or A* search would be written in-house [24]. kle-ng's MIT client-side `src/utils/pcb-tracks/` (`drc.ts`, 45° geometry) is reusable for `drc` and for checking track geometry [19].

**No prior art exists on how hard this is.** That makes quality and effort the unknowns, not licence or runtime.

## Decision matrix

Scores run 0 (absent) to 3 (good). Cells are judged from code and docs; nothing was run. "?" means not evidenced this run and is scored 1. Re-weight freely.

| Criterion (weight) | tscircuit | Custom TS | krt-wasm | Topola | Freerouting + paid CheerpJ |
|---|---|---|---|---|---|
| G1 no network | pass (default pipeline) [1] | pass | pass likely [15] | pass likely [16] | **fail on the free tier**; pass with a paid licence [12][13] |
| G2 licence | pass, MIT [1] | pass | pass, MIT [14][15] | pass, MIT [16] | pass as a separate worker [9] |
| G3 Web Worker | probable, untested [1][2] | pass | probable, Node target [15] | needs a wrapper [16] | ? |
| G4 fixed copper | **conditional**: may rewrite [1] | pass by design | **fail**: no trace input [15] | pass [16] | pass, open bugs [11] |
| W1 keep-outs (3) | 2: rect/circle [1] | 3 by design | 1: rect only [15] | 0: ignored [16] | 2: open via bug [11] |
| W2 net classes (3) | 1: width per connection, edge clearance, no per-net clearance [1] | 3 by design | 1: one clearance [15] | 1: generic clearance [16] | ? (1) |
| W3 keyboard quality (3) | 1: open "solved with violations" bugs [3]–[6] | 0: no prior art | 0: no rip-up, all-or-nothing [15] | 1: panics [18] | ? (1) |
| W4 browser speed (2) | 2: server p50 1–38 s [7] | ? (1) | 2: 265 KB Rust WASM [15] | ? (1) | ? (1) |
| W5 integration (2) | 2: SRJ JSON; undeclared type deps [2] | 3: native to the model | 1: Node target, tscircuit peer [15] | 1: DSN + own wrapper [16] | 1: DSN/SES + CheerpJ |
| W6 ecosystem (2) | 2: very active, 0.0.x, one maintainer [1] | 1: we own it | 1: fork frozen [15] | 0: stalled main, rewrite [16] | 3: active releases [9] |
| W7 determinism (1) | 2: likely [2] | 3 by design | 2: likely [15] | 0: acknowledged non-deterministic [17] | ? (1) |
| **Weighted total (max 48)** | **26** | **31** | **16** | **10** | **24 (unevaluated cells scored 1)** |

☝️ **Custom TS outscores tscircuit only because its "by design" cells score capability we would still have to build.** Its W3 = 0 and its effort are the honest counterweight. The matrix does not price effort, so treat the custom total as a ceiling, not a forecast.

## Cross-dimension insights

- **Per-net clearance is a gap in every permissive engine.** AD-20 net classes can still hold: route at the largest clearance any net class needs, which is stricter, so never looser (C6), and let `drc` check each class. This trades completion for correctness and needs a `Decision:` line.
- **The incremental model (AD-12) is the real selection test.** tscircuit rewrites preloaded traces by design [1]. krt-wasm has no trace input and no partial results [15]. Only Topola keeps fixed copper as fixed [16], but it fails nearly everything else. Whoever wins, AD-12's re-validation (routes in = routes out for valid connections) has to be a spike check, not an assumption.
- **The single `drc` (AD-20) has to be our own code.** Every engine either ships DRC bugs [3]–[6] or has no DRC at all [15]. kle-ng's MIT `drc.ts` is a starting point [19].

## Contrary evidence

Red team was off for this run. The strongest argument against the pick, from the evidence already gathered:
- tscircuit is 0.0.x with API churn several times a day and one npm maintainer [1].
- Its server-side p90 times reach 146 s with up to 1.95 GB peak memory [7], and a browser worker will be slower.
- Its open DRC bugs include one aimed squarely at through-hole parts on the bottom layer [6].

A spike could prove it workable on Corney and it could still break on the next minor version. The hedge is AD-12's single stage interface, plus pinning or vendoring one version.

## Recommendations

Bound to `epic-risk-spikes` (routing spike) and the architecture spine's Deferred row "Routing spike".

1. **Spike tscircuit first** (pin 0.0.1010 or later). Run it in a Vite Web Worker with the network blocked, on Corney wired and wireless converted to SimpleRouteJson. Measure:
   - completion;
   - `drc` violations at Corney's own rules;
   - time and memory in the browser;
   - fixed copper: preloaded traces in vs out, and the rect-obstacle workaround.

   Confidence: medium. The pick rests on static reading and the project's own benchmarks.
2. **Name the custom TypeScript router as runner-up.** It wins if tscircuit rewrites fixed routes under both approaches, fails `drc` on Corney beyond what `drc` can reject cleanly, or can't run in a Worker. Built on clipper2-ts and flatbush, keyboard-specific: rows, columns, LED chain and module pins around fixed copper. Confidence: low; no prior art and no effort evidence.
3. **Drop krt-wasm, Topola and Freerouting/CheerpJ as spike candidates.** Revisit Freerouting only if a community WASM build appears; issue #1012's decoupled core would make one easier. Paying for CheerpJ costs more than the existing SM-3 fallback.
4. **Keep Freerouting as a native, dev-time quality reference** for the routing comparison. It is never shipped, so the licence doesn't apply.
5. **Record the "route at the strictest clearance, `drc` checks each net class" policy** as a decision in epic-risk-spikes (feeds AD-20).
6. **Reuse kle-ng's MIT `drc.ts` and 45° geometry** as prior art for the `drc` package (feeds epic-routing-and-fab).

## Open questions

- **Does tscircuit's Pipeline 9 keep traces passed as rect obstacles with `connectedTo` intact, and does it still connect to them?** Settled by the spike.
- **Does tscircuit run in a browser Worker, and how fast on a Corney-size board?** Settled by the spike.
- **How much effort would a custom keyboard router take?** No evidence exists. A timeboxed prototype is the only way to answer it.
- **Does CheerpJ run inside a Web Worker?** Not checked. Moot unless the CheerpJ licence is bought.
- **What does Freerouting's PCBench quality look like on keyboard boards?** Not retrieved this run.

## Source appendix

| # | Supports | Publisher | Pub date | Accessed | Confidence |
|---|---|---|---|---|---|
| [1] | tscircuit licence, SRJ types, Pipeline 9 options, preloaded-trace mutation, network code, runtimes | [tscircuit/tscircuit-autorouter](https://github.com/tscircuit/tscircuit-autorouter) | 2026-10-25 | 2026-10-26 | high |
| [2] | Published bundle: ESM, no Node APIs, undeclared type deps, determinism hints | [npm @tscircuit/capacity-autorouter 0.0.1010](https://www.npmjs.com/package/@tscircuit/capacity-autorouter) | 2026-10-25 | 2026-10-26 | high (static) / medium (inference) |
| [3] | Solved with clearance violations | [tscircuit issue #3130](https://github.com/tscircuit/tscircuit-autorouter/issues/3130) | 2026-10-18 | 2026-10-26 | high |
| [4] | Via over unrelated pad | [tscircuit issue #2654](https://github.com/tscircuit/tscircuit-autorouter/issues/2654) | 2026-09-19 | 2026-10-26 | high |
| [5] | Overlapping vias, deterministic short | [tscircuit issue #2147](https://github.com/tscircuit/tscircuit-autorouter/issues/2147) | 2026-08-18 | 2026-10-26 | high |
| [6] | THT escape vias ignore bottom copper | [tscircuit issue #2947](https://github.com/tscircuit/tscircuit-autorouter/issues/2947) | 2026-10-10 | 2026-10-26 | high |
| [7] | Pipeline 9 benchmark numbers | [autorouter-benchmark-dashboard data/index.json](https://github.com/tscircuit/autorouter-benchmark-dashboard/blob/main/data/index.json) | 2026-10-25 | 2026-10-26 | high (numbers) / low (keyboard relevance) |
| [8] | Partially pre-routed dataset intent | [tscircuit dataset-srj28 README](https://github.com/tscircuit/tscircuit-autorouter) | 2026 | 2026-10-26 | medium |
| [9] | Freerouting GPL-3.0, releases | [freerouting/freerouting](https://github.com/freerouting/freerouting) | 2026-10-05 | 2026-10-26 | high |
| [10] | No WASM build; request open | [Freerouting issue #1012](https://github.com/freerouting/freerouting/issues/1012) | 2026-10-21 | 2026-10-26 | high |
| [11] | wire_keepout blocks vias; SES reimport bug | [Freerouting issue #1018](https://github.com/freerouting/freerouting/issues/1018) | 2026-10-23 | 2026-10-26 | high |
| [12] | Free tier loads from the Leaning domain; self-hosting needs a commercial licence | [CheerpJ docs: licensing](https://cheerpj.com/docs/licensing) | undated (2026) | 2026-10-26 | high |
| [13] | Commercial tiers and price | [CheerpJ Core licensing](https://cheerpj.com/cheerpj-core-licensing/) | undated (2026) | 2026-10-26 | medium |
| [14] | KiCadRoutingTools MIT, PyO3 build, upstream features | [drandyhaas/KiCadRoutingTools](https://github.com/drandyhaas/KiCadRoutingTools) | 2026-10-23 | 2026-10-26 | high |
| [15] | krt-wasm licence, Node target, input schema, failure semantics | [tscircuit/krt-wasm](https://github.com/tscircuit/krt-wasm) | 2026-08-20 | 2026-10-26 | high |
| [16] | Topola MIT, headless API, fixed wiring, ignored keep-outs, activity | [Topola (Codeberg)](https://codeberg.org/topola/topola) | 2026-07-02 | 2026-10-26 | high |
| [17] | Non-deterministic navmesh | [Topola issue #46](https://codeberg.org/topola/topola/issues/46) | 2024-09-28 | 2026-10-26 | high |
| [18] | Routing panic on a real board | [Topola issue #278](https://codeberg.org/topola/topola/issues/278) | 2025-09-23 | 2026-10-26 | high |
| [19] | kle-ng routes server-side via kbplacer; MIT client DRC | [adamws/kle-ng](https://github.com/adamws/kle-ng) | 2026-10-23 | 2026-10-26 | high |
| [20] | kbplacer GPL-3.0; greedy 45° router | [adamws/kicad-kbplacer](https://github.com/adamws/kicad-kbplacer) | undated | 2026-10-26 | high |
| [21] | KiCad source GPL-3.0 | [KiCad source mirror](https://github.com/KiCad/kicad-source-mirror) | 2026-10-25 | 2026-10-26 | high (repo) / medium (PNS files) |
| [22] | freeroute is a GPL port; repo unreachable | [git.supported.systems freeroute](https://git.supported.systems/warehack.ing/freeroute) | 2026 | 2026-10-26 | low |
| [23] | Clipper2 TS and WASM ports, BSL-1.0 | [npm clipper2-ts](https://www.npmjs.com/package/clipper2-ts) | 2026-07-04 | 2026-10-26 | high |
| [24] | flatbush ISC; PathFinding.js abandoned | [npm flatbush](https://www.npmjs.com/package/flatbush) | 2026-06-09 | 2026-10-26 | high |
| [25] | utility_router is hand-authored route strings | [ceoloide/ergogen-footprints](https://github.com/ceoloide/ergogen-footprints) | 2025 | 2026-10-26 | high |
| [26] | Ergogen builds route with Freerouting | [scipioni/clavis](https://github.com/scipioni/clavis) | undated | 2026-10-26 | medium |

## Staleness map

Computed with `recon_kit.py staleness`. Windows: capability, performance and version-compat 1 month; failure reports and pricing 3 months; licence 6 months.

| Claim | Re-check by |
|---|---|
| tscircuit: no lock for preloaded traces; board-wide clearance; benchmark numbers | 2026-11-25 |
| Freerouting: no WASM build | 2026-11-21 |
| kle-ng: server-side routing, MIT `drc.ts` | 2026-11-23 |
| tscircuit open DRC bugs | 2027-01-18 |
| CheerpJ price | 2027-01-26 |
| tscircuit and CheerpJ licences | 2027-04 |
| krt-wasm, Topola capability and determinism | already past their window |

The krt-wasm and Topola cells are dated by those projects' last code change: 2026-08-20 for krt-wasm, and 2026-07-02 for Topola's `develop` branch. The code hasn't moved since, so the claims still describe it. The cut stands until either project ships again. The earliest live re-check is **2026-11-21**. tscircuit changes daily, so run the spike within a month of this report or refresh it first.
