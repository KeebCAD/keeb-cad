# Digest: tscircuit gaps and CheerpJ commercial terms, round 2

- Dimension: TSCIRCUIT GAPS AND CHEERPJ COMMERCIAL TERMS
- Round: 2
- Date: 2026-10-26
- Budget used: 15 tool calls (1 ToolSearch, 12 Bash covering gh CLI, a shallow clone and grep, 2 WebFetch). Sources: repo source at commit fb6c0f5 (2026-10-25, v0.0.1010), README, docs/benchmark-*.md, 4 issues plus 2 issue searches, the benchmark-dashboard data repo, 2 CheerpJ pages.
- Method note: the tscircuit claims come from a shallow clone of tscircuit/tscircuit-autorouter at HEAD fb6c0f57 (package.json version 0.0.1010), read with grep. Code reading supports or rules out capabilities. Nothing was executed.

## Findings

1. The repo is at version 0.0.1010 with an MIT licence. It was last pushed on 2026-10-26, has 93 stars and 71 open issues. | https://github.com/tscircuit/tscircuit-autorouter (package.json; gh api repos/tscircuit/tscircuit-autorouter) | tscircuit | HEAD commit 2026-10-25 | accessed 2026-10-26 | high | ecosystem, licence

2. The default export `AutoroutingPipelineSolver` is an alias of `AutoroutingPipelineSolver9_PreloadedTraceGraph` (lib/index.ts line 25). The network-backed variant is a separate export, `AutoroutingPipelineSolver9_Networked`. | https://github.com/tscircuit/tscircuit-autorouter/blob/main/lib/index.ts | tscircuit | 2026-10-25 | accessed 2026-10-26 | high | capability

3. The only `fetch(` call and the `DEFAULT_HD_CACHE2_SERVER_URL = "https://hd-cache2.tscircuit.com"` constant are in `lib/autorouter-pipelines/AutoroutingPipeline9_Networked/` (HdCache2Client.ts:16 and :740). grep found no HdCache or `fetch(` reference in the AutoroutingPipeline9_PreloadedTraceGraph directory. When `cacheProvider` is omitted, the default pipeline's cache is `getGlobalInMemoryCache()`. A browser `LocalStorageCache` provider exists, and `cacheProvider: null` disables caching. Transitive dependencies were not audited, so the claim that the default pipeline makes no network calls is supported by source reading but not proven at runtime. | https://github.com/tscircuit/tscircuit-autorouter/tree/main/lib/autorouter-pipelines/AutoroutingPipeline9_Networked ; .../AutoroutingPipeline9_PreloadedTraceGraph/AutoroutingPipelineSolver9_PreloadedTraceGraph.ts:1112 ; lib/cache/LocalStorageCache.ts | tscircuit | 2026-10-25 | accessed 2026-10-26 | medium-high | capability

4. There is no lock, fixed or immutable option for preloaded traces. The full Pipeline 9 option set is: `capacityDepth, targetMinCapacity, cacheProvider, effort, maxNodeDimension, maxNodeRatio, minNodeArea, visualizationTraceColorMode, powerTraceExpansion`. The `SimplifiedPcbTrace` type has no lock flag. grep for `locked|isLocked|immutable|preserveTraces|keepPreloaded` in lib returned nothing. | lib/autorouter-pipelines/AutoroutingPipeline9_PreloadedTraceGraph/AutoroutingPipelineSolver9_PreloadedTraceGraph.ts:107-117 ; lib/types/srj-types.ts | tscircuit | 2026-10-25 | accessed 2026-10-26 | high | capability

5. Pipeline 9 can change preloaded traces by design. `SimplifiedPcbTrace.__replaces_pcb_trace_id` is documented as "Preloaded trace intentionally replaced by this routed output". The pipeline tracks `changedPreloadedTraceSections` and `replacedConnectionNames`, returns `mutatedPreloadedTraces` (applyFixedRouteReplacementsToPreloadedTraces.ts), and uses a `SelectiveReripTinyHyperGraphSolver...` in port-point pathing. Preloaded `traces` are therefore not a safe way to pass FIXED copper (gate G4). A workaround I have not verified is to pass saved copper as `obstacles` (rect, with `connectedTo` set to the net) and leave it out of `traces`. Arcs and diagonal segments would then have to be approximated with rects. | lib/types/srj-types.ts ; lib/autorouter-pipelines/AutoroutingPipeline9_PreloadedTraceGraph/* ; lib/solvers/PortPointPathingSolver/tinyhypergraph/TinyHypergraphPortPointPathingSolver.ts | tscircuit | 2026-10-25 | accessed 2026-10-26 | high (behaviour exists), low (workaround) | capability

6. Obstacles are typed `type: "rect"`, with optional `shape?: "circle"` and `ccwRotationDegrees?` (documented as "rotation metadata"). There is no polygon obstacle type. The board itself can be a polygon through `outline?: {x,y}[]`. Keep-outs are possible only as rect obstacles with empty `connectedTo`. The only keep-out flags are `isFanoutSourceKeepout` (internal) and `isNonPlatedHole`. | lib/types/srj-types.ts | tscircuit | 2026-10-25 | accessed 2026-10-26 | high | capability

7. Trace width can be set per connection with `SimpleRouteConnection.nominalTraceWidth`, and per bus with `traceWidth`. Clearances are board-wide only: `defaultObstacleMargin, minTraceToPadEdgeClearance, minTraceToHoleEdgeClearance, minBoardEdgeClearance, minViaEdgeToPadEdgeClearance, minPadEdgeToPadEdgeClearance` and similar. There is no per-net or per-connection clearance field. A board-edge clearance (`minBoardEdgeClearance`) exists. | lib/types/srj-types.ts | tscircuit | 2026-10-25 | accessed 2026-10-26 | high | capability

8. The repo's runtime entry points are only `lib/runtime/{bun,node}.ts` and `{bun,node}.worker.ts`. grep for `new Worker`, `self.postMessage` and `web worker` in lib found no browser-worker code. The threaded mode is documented as "a separate Bun worker pool". I found no README, doc or example showing use in a browser Web Worker. Separately, the existence of LocalStorageCache suggests browser use is intended (inference). | lib/runtime/ ; docs/benchmark-threads.md | tscircuit | 2026-10-25 | accessed 2026-10-26 | medium | capability

9. Published benchmark numbers come from the raw `data/index.json` in the dashboard repo. The latest Pipeline 9 run (1x effort) is 40221273711 at commit fb6c0f5, dated 2026-10-25:

   | Dataset | Completion | Relaxed DRC pass | p50 time | p90 time |
   |---|---|---|---|---|
   | dataset01 | 100% | 100% | 2.0 s | 5.9 s |
   | srj18 | 100% | 100% | 38 s | 122 s |
   | srj19 | 94% | 92.5% | 12 s | 105 s |
   | srj20 | 79% | 79% | 12 s | 146 s |
   | srj21 | 100% | 100% | 1.0 s | 1.4 s |
   | srj23 | 100% | 80.3% | 1.9 s | 15 s |

   For srj23, the p50 peak RSS is 391 MB and the maximum is 1.95 GB. All runs were on a 32-vCPU ARM Blacksmith runner in Bun/Node, not in a browser. Sample counts and board types are not recorded in index.json. "Relaxed DRC" is the repo's own checker. | https://github.com/tscircuit/autorouter-benchmark-dashboard/blob/main/data/index.json | tscircuit | 2026-10-25 | accessed 2026-10-26 | high (numbers), low (relevance to keyboards) | performance

10. The README links a DRC-failure dataset, dataset-srj33-drc-failures. It holds 37 inputs on which Pipeline 9 completed routing but produced relaxed DRC issues. | https://github.com/tscircuit/tscircuit-autorouter/blob/main/README.md | tscircuit | 2026-10-25 | accessed 2026-10-26 | high | failure-report

11. Issue #3130 is OPEN, created 2026-10-18. The router returned "solved" with vias 0.15 and 0.17 mm from pads against a 0.2 mm clearance, and `effort 2x` did not fix it. The issue asks the router to report connections it cannot route within clearance instead of returning violating routes. | https://github.com/tscircuit/tscircuit-autorouter/issues/3130 | tscircuit (user report) | 2026-10-18 | accessed 2026-10-26 | high | failure-report

12. Issue #2654 is OPEN, created 2026-09-19. Pipeline 9 at 0.0.913 returns `solved: true` with a via overlapping an unrelated pad (a real copper short). It reproduces deterministically from a frozen SRJ. | https://github.com/tscircuit/tscircuit-autorouter/issues/2654 | tscircuit (user report) | 2026-09-19 | accessed 2026-10-26 | high | failure-report

13. Issue #2147 is OPEN, created 2026-08-18. The autorouter emitted overlapping vias on two different nets (0.567 mm apart against 0.700 mm required), a deterministic short. | https://github.com/tscircuit/tscircuit-autorouter/issues/2147 | tscircuit (user report) | 2026-08-18 | accessed 2026-10-26 | high | failure-report

14. Issue #2947 is OPEN, created 2026-10-10. Through-hole escape vias check only their logical source and target layers, so they can hit bottom-layer copper. This is relevant to 2-layer boards with THT and SMD pads on the bottom. | https://github.com/tscircuit/tscircuit-autorouter/issues/2947 | tscircuit (user report) | 2026-10-10 | accessed 2026-10-26 | high | failure-report

15. On CheerpJ Core licence tiers:
    - **Community (free):** covers personal projects, FOSS and technical evaluation. Self-hosting is listed as not allowed. Commercial use is limited to individuals and one-person companies.
    - **Small Business:** £100 per developer per month, for teams of up to 10, licensed annually. Self-hosting is allowed.
    - **Enterprise:** contact sales. Self-hosting is included, and multi-year or perpetual options are offered.
    - **Other:** Non-Profit and Academic tiers get discounts, and Public Sector gets custom pricing.

    The page says Core can be self-hosted in air-gapped environments under any commercial licence. The page carries no "updated" date, only a 2012-2026 footer, so I cannot confirm the pricing is no more than 3 months old. It was read directly on 2026-10-26. | https://cheerpj.com/cheerpj-core-licensing/ | Leaning Technologies | undated (2026 footer) | accessed 2026-10-26 | medium-high (extracted via fetch summariser) | pricing, licence

16. The CheerpJ docs say: "If you wish to self-host CheerpJ, you will need a Commercial License." The free tier "allows unlimited, unmetered use of CheerpJ from the cjrtnc.leaningtech.com domain". For FOSS projects the stated obligation is "Give appropriate credits". No free tier permits self-hosting, so a FOSS app on the free tier must load the runtime from the Leaning CDN, which fails gate G1. | https://cheerpj.com/docs/licensing | Leaning Technologies | undated (2026 footer) | accessed 2026-10-26 | high | licence

## Gate and criterion notes

**tscircuit capacity-autorouter (Pipeline 9 default)**
- **G1 (no network):** likely passes if you use the default `AutoroutingPipelineSolver` and avoid `..._Networked` (F2, F3). This still needs a runtime network-panel check in the spike.
- **G2 (licence):** passes, MIT (F1).
- **G3 (Web Worker):** unproven. There is no browser-worker evidence (F8). Benchmark memory reaches up to 1.95 GB RSS and p90 times reach minutes on hard datasets (F9), so browser feasibility is a spike question.
- **G4 (fixed copper):** fails as a native feature. Preloaded traces can be ripped or replaced and no lock exists (F4, F5). It might pass through the obstacle workaround (F5), which is the first thing to test.
- **Keep-outs:** rect or circle only, with no polygon obstacles (F6), so this criterion is only partly met.
- **Net classes:** width per connection, clearance global only. Board-edge clearance exists (F7). This criterion is only partly met.
- **Quality:** returns "solved" with real DRC violations and shorts (F11-F14). The app must run its own DRC on the output.
- **Determinism:** issues describe the bugs as deterministic (F12, F13). Only weak positive evidence.
- **Ecosystem:** very active, with daily commits and a public benchmark pipeline (F1, F9). Many open correctness bugs (F11-F14).

**CheerpJ (for running a Java router such as Freerouting in-browser)**
- **G1 with free tier:** fails, because a CDN runtime is required (F16).
- **G1 with commercial tier:** passes. Self-hosting, including air-gapped, costs at least £100 per developer per month, or a quote for Enterprise (F15).
- **G2:** a paid proprietary runtime is attached to an MIT app. The Non-Profit discount exists only on request (F15).

## Leads
- Run the obstacle-as-fixed-copper workaround with Pipeline 9: pass saved routes as rect obstacles with `connectedTo` set, `traces` omitted, then diff the output.
- Test Pipeline 9 in a Vite Web Worker with the network panel open and `cacheProvider: null`.
- Look for a sample-count breakdown in https://github.com/tscircuit/autorouter-benchmark-dashboard/tree/main/data/runs (per-run JSON files).
- Ask Leaning Technologies whether the Non-Profit or FOSS discount extends to Small Business self-hosting.

## Looked for and could not find
- A lock, fixed or immutable flag for preloaded traces in types, options or issues. Searches for "preloaded traces" and "lock" returned nothing relevant.
- Per-net clearance and polygon obstacles in the SRJ types.
- Any README, doc, example or issue showing a browser or Web Worker run with no network.
- Sample counts per dataset in the dashboard index.
- A dated CheerpJ pricing page, and any free or open-source CheerpJ tier that permits self-hosting.
