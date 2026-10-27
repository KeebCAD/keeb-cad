# spikes/ (throwaway)

Scratch project for **epic-risk-spikes**. It is its own pnpm workspace root, outside the repo's
root workspace, with the same strictness (`strictPeerDependencies: true`, `hoist: false`,
`publicHoistPattern: []`) and its own lockfile. Nothing in `app/`, `packages/` or `fixtures/`
depends on it. Delete the folder once the spike verdicts are recorded.

## One command

```sh
pnpm --dir spikes verify
```

It runs a frozen install, `playwright install chromium`, `tsc --noEmit`, `vite build`, and a headless
Playwright run (`e2e/route.spec.ts`) against `vite preview` on port 4174. It exits 0 only if:

1. the Web Worker (`src/route.worker.ts`) routes both connections of `src/test-board.ts` with
   tscircuit's default `AutoroutingPipelineSolver`, and
2. no request left `http://localhost:4174`. Playwright's `context.route('**/*')` blocks and logs
   every other request at the browser level. The `?probe` test makes the worker `fetch`
   `https://example.com/` and asserts that this URL, and only this URL, is logged. This proves
   that worker traffic reaches the logger.

A third control, the `?broken` test, sends `brokenBoard` (`connections: null`). tscircuit throws
`TypeError: e.connections is not iterable`. The test asserts that the page reports `failed`
with a non-empty error rather than hanging.

## Result (2026-10-27, tscircuit 0.0.1010, Node 26.12.1, headless Chromium from Playwright 1.64.1)

- **The worker runs fine.** Pipeline 9 runs in a module Web Worker with no Node or Bun APIs and
  no outbound requests. Both connections are solved.
- **Solver errors are reported, not hung.** The `?broken` board exercises the throw path: the
  worker catches tscircuit's `TypeError` and the page shows status `failed`.
- **Solve time is about 620 ms** (616 to 626 ms over three runs) for the two-connection,
  40 × 20 mm, 2-layer board. Both traces go through 2 vias and use the bottom layer.
- **The worker bundle is 2.49 MB minified.** `DEFAULT_HD_CACHE2_SERVER_URL` and the `_Networked`
  pipeline are tree-shaken out. The only absolute URLs left in the bundle are licence and doc
  comments, plus the probe URL.
- **Install caveat: strict peers fail out of the box.** tscircuit pulls in debug and visualisation
  packages through `@tscircuit/solver-utils` → `graphics-debug`. Under `strictPeerDependencies`,
  `pnpm install` fails on two counts:
  - `typescript ^5` is wanted by `@tscircuit/solver-utils`, `graphics-debug`,
    `@tscircuit/alphabet` and `stack-svgs`;
  - `react-dom@19` sits beside `react@18`.

  `pnpm-workspace.yaml` adds scoped `peerDependencyRules.allowedVersions` exemptions and keeps
  strict mode on. None of those packages is loaded on the routing path. The real app would need
  the same exemptions, or a tscircuit release that drops the dependencies.
- **Typecheck caveat: shared DOM and WebWorker libs.** TS 6.0.3 with `skipLibCheck` absorbs tscircuit's roughly 20
  undeclared type imports and makerjs's `/// <reference types>` to packages that aren't
  installed. The public types still resolve to real types, not `any`: `solver.error` is
  `string | null`, and `getOutputSimplifiedPcbTraces()` returns `SimplifiedPcbTraces`.
  `src/deps.ts` proves the same for clipper2-ts, flatbush and makerjs. The DOM and WebWorker
  libs share one `tsconfig.json` project, so `self` would type as the DOM `Window`.
  `src/route.worker.ts` therefore declares `self` as `DedicatedWorkerGlobalScope` explicitly.
  No `@types/node` was needed.
- **No install scripts**, so there is no `allowBuilds`.
