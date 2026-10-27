---
title: 'tscircuit routes in a browser worker offline'
type: 'feature'
ticket: '3'
created: '2026-10-27'
status: done
baseline_revision: '641d5ab23c32015ddcc8dfe143ec8633bf36029b'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/research-browser-pcb-autorouters/research-browser-pcb-autorouters.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nobody has shown tscircuit's capacity-autorouter running in a browser Web Worker, or installing under pnpm strict with TypeScript 6. Those are routing exit criteria (no network at runtime; pnpm strict + TS 6). Entries 4 to 12 also need a spike project to run in.

**Approach:** Create a standalone, throwaway `spikes/` pnpm project that installs every pinned spike dependency. A Vite page starts a Web Worker that routes a hand-written two-connection SimpleRouteJson board with tscircuit. A headless Playwright run blocks and logs every request that leaves the local preview server. One `spikes/` command runs install, typecheck, build and the headless route, and exits 0 only if both connections route and no request was logged.

## Boundaries & Constraints

**Always:** `spikes/` is its own pnpm workspace root, outside the root workspace, with root-level strictness (`strictPeerDependencies: true`, `hoist: false`, `publicHoistPattern: []`) and its own committed lockfile. Runtime deps are pinned exactly: `@tscircuit/capacity-autorouter` 0.0.1010, `clipper2-ts` 2.0.1-18, `flatbush` 4.6.2, `makerjs` 0.19.2. TypeScript is 6.0.3 (TS 7 exists but is out of scope). Routing runs only inside the worker. The default (non-networked) pipeline export `AutoroutingPipelineSolver` is used.

**Never:** No change to the root workspace, root configs or `packages/`/`app/`/`fixtures/`. No `_Networked` pipeline, no cache server, no CDN. Don't fake the "no network" result by stubbing `fetch` inside the worker: blocking happens at the browser level. No Corney board or `.kicad_pcb` conversion yet (that is entry 4).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | Two-connection 2-layer board, network blocked | Worker returns solved, a trace for each connection name, solve time in ms; command exits 0 | No error expected |
| Solver fails or throws | tscircuit `failed`/throws in the worker | Page shows status `failed` with tscircuit's error; command exits non-zero, printing it | Worker catches and posts the error; it never hangs |
| Any outbound request | Something in the page or worker requests a non-local URL | Request aborted and logged; command exits non-zero, listing the URL | Test asserts the log is empty |
| Probe (negative control) | Page loaded with `?probe` makes the worker fetch an external URL | That request appears in the log and is aborted | Proves worker traffic is visible to the logger |

</frozen-after-approval>

## Code Map

- `.prettierignore`, `eslint.config.ts` (`IGNORED`), `vitest.config.ts` (explicit `projects`) -- already exclude `spikes/`; leave them untouched.
- `.gitignore` -- already ignores `node_modules/`, `dist/`, `test-results/`, `playwright-report/` at any depth, so `spikes/` needs no own ignore file.
- `pnpm-workspace.yaml` -- strictness settings to mirror; it does not list `spikes/`, and must not.
- `mise.toml` -- Node 26.12.1, picked up from `spikes/` by mise's upward search. `package.json` `packageManager` is `pnpm@12.15.0`; use the same in `spikes/`.
- `app/playwright.config.ts`, `app/vite.config.ts` -- patterns to copy: `vite preview` on a strict port as `webServer`, headless chromium. Root lockfile pins vite 8.3.5 and playwright 1.64.1; use the same so the existing chromium download is reused.
- `tsconfig.base.json` -- strict options to mirror (strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `skipLibCheck`, bundler resolution). The spike tsconfig must stand alone and not extend files outside `spikes/`.
- tscircuit 0.0.1010 API (from its `dist/index.d.ts`): `AutoroutingPipelineSolver` (alias of Pipeline 9) is constructed as `new AutoroutingPipelineSolver(srj: SimpleRouteJson, opts?)`. `BaseSolver` gives `solve()`, `solved`, `failed` and `error`, and the solver gives `getOutputSimplifiedPcbTraces()`. The `SimpleRouteJson` required fields are `layerCount`, `minTraceWidth`, `obstacles`, `connections` and `bounds`. `Obstacle` is `{type:'rect', layers, center, width, height, connectedTo}`. `SimpleRouteConnection` is `{name, pointsToConnect:[{x,y,layer}]}`. Its `.d.ts` imports types from about 20 undeclared packages; `skipLibCheck` should absorb this, and the typecheck proves it. The only `fetch` calls are in the `_Networked` pipeline.
- `makerjs` 0.19.2 ships `dist/index.d.ts` but depends on `@types/node@^7`. Watch for clashes with DOM libs in typecheck.

## Tasks & Acceptance

**Execution:**
- [x] `spikes/pnpm-workspace.yaml` -- `packages: ['.']`, strict settings as above, `allowBuilds` only if an install script demands it -- makes `spikes/` its own root.
- [x] `spikes/package.json` -- private ESM package `keeb-cad-spikes`, `packageManager` pnpm@12.15.0, engines node >=26, exact pins for the four runtime deps plus `typescript` 6.0.3, `vite` 8.3.5 and `@playwright/test` 1.64.1. Scripts: `typecheck` (`tsc --noEmit`), `build` (`vite build`), `route` (`playwright test`), and `verify` (`pnpm install --frozen-lockfile && playwright install chromium && pnpm typecheck && pnpm build && pnpm route`).
- [x] `spikes/pnpm-lock.yaml` -- generated by `pnpm install` in `spikes/`, committed.
- [x] `spikes/tsconfig.json` -- standalone strict config: DOM + WebWorker libs for `src/`, Node types for the configs and e2e. Split into two project files only if one won't typecheck.
- [x] `spikes/vite.config.ts` -- `worker.format: 'es'`, preview on port 4174 (strict).
- [x] `spikes/index.html`, `spikes/src/main.ts` -- start `new Worker(new URL('./route.worker.ts', import.meta.url), {type:'module'})`, post the test board (plus a probe flag from `?probe`), and render the result as JSON in `#result` with `data-status` set to `solved`, `failed` or `probed`.
- [x] `spikes/src/test-board.ts` -- the two-connection SimpleRouteJson: 2 layers, roughly 40×20 mm bounds, four pad rects `connectedTo` their connection, and two connections that must route around each other or cross on layers.
- [x] `spikes/src/route.worker.ts` -- with the probe flag, `fetch('https://example.com/')` and post `probed`. Otherwise run `AutoroutingPipelineSolver` on the board, time it with `performance.now()`, and post `{status, error, traces, ms}`. Wrap it in try/catch.
- [x] `spikes/src/deps.ts` -- type-only usage of `clipper2-ts`, `flatbush` and `makerjs` (for example, constructing a `Flatbush` and calling a clipper and a makerjs function in an exported function), so the typecheck proves all four deps resolve under pnpm strict.
- [x] `spikes/playwright.config.ts`, `spikes/e2e/route.spec.ts` -- `webServer` runs `vite preview`. A `context.route('**/*')` aborts and records any request not to `http://localhost:4174`. Test 1 opens `/`, waits for a final status, asserts `solved`, a trace for each connection name and an empty log, and prints `ms`. Test 2 opens `/?probe` and asserts the log holds exactly the probe URL.
- [x] `spikes/README.md` -- what the folder is (throwaway, epic-risk-spikes, deleted after the verdicts), the one command, and the measured result (solve ms, any install or typecheck caveats found).

**Acceptance Criteria:**
- Given a clean checkout with Node 26 via mise, when running `pnpm --dir spikes verify`, then it installs under the strict settings, typechecks, builds, routes both connections headless and exits 0.
- Given the probe test, when the worker fetches an external URL, then the request is logged and aborted, which proves worker traffic is covered.
- Given the root workspace, when running root `pnpm check:fast`, then it passes and the output does not mention `spikes/`.

## Implementation Notes

- **Strict peers fail out of the box, and are handled with scoped exemptions.** `pnpm install` under `strictPeerDependencies: true` failed with ERR_PNPM_PEER_DEP_ISSUES. tscircuit's transitive debug and visualisation deps (`@tscircuit/solver-utils`, `graphics-debug`, `@tscircuit/alphabet`, `stack-svgs`) want `typescript ^5`, and `graphics-debug` pulls `react-dom@19` beside `react@18`. `spikes/pnpm-workspace.yaml` adds scoped `peerDependencyRules.allowedVersions` entries (`<parent>>typescript: '6'`, `react-dom>react: '18'`). Strict mode stays on. None of these packages is on the routing path, but the real app would need the same exemptions.
- **Typecheck is clean with one `tsconfig.json`** (DOM + WebWorker libs, `types: []`). No `@types/node` was needed, because the configs and e2e use no Node globals. A throwaway probe confirmed the tscircuit, clipper2-ts, flatbush and makerjs types resolve to real types, not `any`. makerjs's `@types/node@^7` caused no clash.
- **Measured:** about 620 ms solve in headless Chromium (616 to 626 ms over three runs), 2 traces, each with 2 vias and using the bottom layer. The worker bundle is 2.49 MB, and the `_Networked` cache server URL is tree-shaken out.
- **Not exercised end to end:** the `failed` and throws paths (matrix row 2). The worker try/catch and the `!solved || failed` branch exist, and test 1 asserts `error` is null first so that a tscircuit error would print. No failing board was fed through the browser. A solver that hangs would hit the 110 s wait, then the 120 s test timeout, and exit non-zero.
- No install scripts ran, so there is no `allowBuilds`.
- One file was added beyond the Code Map: `spikes/src/protocol.ts`, the shared request and response types for the worker messages.

## Plan Change Log

## Review Triage Log

### Pass 1 (quick) — high 0, medium 0, low 2, false 3, maybe-false 0

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | `spikes/pnpm-lock.yaml` missing from the diff, so AC1 is unmet | false | rejected | The lockfile exists on disk and is not git-ignored. Only the review diff left it out, on purpose, for size. It is committed with the change. |
| 2 | Third test unplanned; README, Implementation Notes and Verification are stale | low | patch (README part) | The test was added in step-03's matrix audit to cover row 2. The README did not describe it, so the README gets a direct fix. The plan-note and Verification parts are rejected, since the fix would edit this build's plan. |
| 3 | `brokenBoard` comment claims a throw without evidence | false | rejected | Ran the package in Node with `connections: null`. The constructor throws `TypeError: e.connections is not iterable`, so the comment is accurate and the worker's `catch` path is the one exercised. |
| 4 | `data:` URLs would count as outbound | low | rejected | Nothing issues a `data:` request today, because the worker is a separate `dist/assets` file. Avoiding it would add a branch for a case that is not reachable. |
| 5 | Mixed DOM and WebWorker libs; "Typecheck caveat: none" claims too much; redundant `reference lib` | low | patch | A real but cosmetic inaccuracy. The fix is a direct correction: delete one line and reword one README bullet. |

## Design Notes

"Zero network requests" means zero requests to any origin other than the local preview server that serves the built bundle. Loading the page and worker script from localhost is the app's own static hosting. The probe test is the control: without it, an empty log could mean the logger never saw worker traffic.

If tscircuit cannot run in the worker (for example because of a Node or Bun API, or a hang), that is a valid spike finding. Record the evidence in the README and Implementation Notes and leave the command red. Don't work around it by routing on the main thread.

## Verification

**Commands:**
- `pnpm --dir spikes verify` -- expected: exit 0; Playwright reports 2 passed and prints the solve ms.
- `pnpm check:fast` (repo root) -- expected: pass, with the root workspace unaffected.
- `git status --short` -- expected: only new files under `spikes/` plus this plan.
