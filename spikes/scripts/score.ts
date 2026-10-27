// The engine-neutral half of the score scripts (`score:tscircuit`, `score:custom`): serve dist/,
// route one Corney design in the page's Web Worker under headless Chromium with every off-origin
// request blocked and the worker's JS heap sampled over CDP, then score a RouteSet in Node:
// completion per realisation, `drc` against the bare board, and KiCad on the bare and the routed
// board (`out/<engine>-<design>/`). Both engines go through `scoreRoutes`, so their scorecards
// compare field for field. No side effects at import.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { preview } from 'vite'
import { completionCounts, routedConnections, unroutedConnections } from '../src/completion'
import { drc, type DrcReport } from '../src/drc'
import { addedViolations } from '../src/drc-cases'
import type { ExternalPage } from '../src/protocol'
import { EMPTY_ROUTES, emptyScorecard, type DrcCounts, type KicadCounts, type RerouteEntry, type RouteSet, type RunStatus, type Scorecard } from '../src/route-set'
import type { RoutingInput } from '../src/routing-input'
import { writeProject, writeRoutes, writeRules } from '../src/write-back'
import { bag, CLEARANCE_FAMILY, count, drcSignatures, atLimit, kicadSignature, runKicad, takeEach, type KicadReport } from './kicad'
import { runStatus } from './run-status'

const here = dirname(fileURLToPath(import.meta.url))
export const spikes = join(here, '..')
const out = join(spikes, 'out')
export const scorecards = join(spikes, 'scorecards')
export const pcbs = join(spikes, '../fixtures/corney-island/ergogen/pcbs')
export const SOURCES = { wired: 'corney_island.kicad_pcb', wireless: 'corney_island_wireless.kicad_pcb' } as const
export type Design = keyof typeof SOURCES
export const DESIGNS: Design[] = ['wired', 'wireless']

const PORT = 4175
export const ORIGIN = `http://localhost:${PORT}`
/** Per board: 10× the 60 s bar. */
export const CAP_MS = 600_000
/** How long the page may take past the cap (a solver step the worker cannot interrupt). */
export const GRACE_MS = 120_000
const HEAP_SAMPLE_MS = 100
const MiB = 1024 * 1024

/** What every worker answers with (`RouteResponse`, `CustomRouteResponse`). */
export interface WorkerAnswer {
  status: 'solved' | 'failed' | 'timeout' | 'probed'
  error: string | null
  ms?: number
  thrown?: boolean
}

/** One routing run in the browser. `response` is the worker's answer, absent on a cap or crash. */
export interface BrowserRun<R extends WorkerAnswer> {
  status: RunStatus
  error: string | null
  response: R | undefined
  workerMs: number
  peakHeapBytes: number
  heapSamples: number
}

export const errorText = (err: unknown) => (err instanceof Error ? `${err.name}: ${err.message}` : String(err))

/** A fresh context and page whose every request off the preview origin is aborted and listed. */
export async function blockedPage(browser: Browser): Promise<{ context: BrowserContext; page: Page; blocked: string[] }> {
  const context = await browser.newContext()
  const blocked: string[] = []
  await context.route('**/*', async (route) => {
    const url = route.request().url()
    if (new URL(url).origin === ORIGIN) return route.continue()
    blocked.push(url)
    return route.abort('blockedbyclient')
  })
  return { context, page: await context.newPage(), blocked }
}

/**
 * Routes one design in the page's worker. Every request off the preview origin is aborted and
 * fails the run. The worker's JS heap is read every 100 ms with `Runtime.getHeapUsage`, sent to
 * the worker target through the page's CDP session (`performance.memory` is absent in workers).
 */
export async function routeInBrowser<R extends WorkerAnswer>(browser: Browser, path: string): Promise<BrowserRun<R>> {
  const { context, page, blocked } = await blockedPage(browser)
  const cdp = await context.newCDPSession(page)
  const workers = new Set<string>()
  let peakHeapBytes = 0
  let heapSamples = 0
  let id = 0
  cdp.on('Target.attachedToTarget', (e) => {
    if (e.targetInfo.type === 'worker') workers.add(e.sessionId)
  })
  cdp.on('Target.detachedFromTarget', (e) => {
    if (e.sessionId) workers.delete(e.sessionId)
  })
  cdp.on('Target.receivedMessageFromTarget', (e) => {
    const msg = JSON.parse(e.message) as { result?: { usedSize?: number } }
    const used = msg.result?.usedSize
    if (typeof used === 'number') {
      heapSamples++
      peakHeapBytes = Math.max(peakHeapBytes, used)
    }
  })
  await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: false })
  const sampler = setInterval(() => {
    for (const sessionId of workers) {
      const message = JSON.stringify({ id: ++id, method: 'Runtime.getHeapUsage' })
      cdp.send('Target.sendMessageToTarget', { sessionId, message }).catch(() => undefined)
    }
  }, HEAP_SAMPLE_MS)

  try {
    let response: R | undefined
    // Anything but the wait's own timeout (renderer crash, OOM, page error) is the run's result:
    // status `threw`, nothing routed. The scorecard is still written and the next design still runs.
    let crashed: string | undefined
    try {
      await page.goto(`${ORIGIN}${path}`)
      await page.locator('#result:not([data-status="pending"])').waitFor({ timeout: CAP_MS + GRACE_MS })
      response = JSON.parse((await page.locator('#result').textContent()) ?? '{}') as R
    } catch (err) {
      if (!(err instanceof Error && err.name === 'TimeoutError')) {
        crashed = `browser: ${errorText(err)}`
      }
    }
    if (blocked.length > 0) throw new Error(`outbound request(s) from the page or worker: ${blocked.join(', ')}`)
    const sample = { peakHeapBytes, heapSamples }
    if (crashed) return { status: 'threw', error: crashed, response: undefined, workerMs: 0, ...sample }
    if (!response) {
      return {
        status: 'timeout',
        error: `no answer from the worker within ${CAP_MS + GRACE_MS} ms`,
        response: undefined,
        workerMs: CAP_MS + GRACE_MS,
        ...sample,
      }
    }
    return { status: runStatus(response), error: response.error, response, workerMs: response.ms ?? 0, ...sample }
  } finally {
    clearInterval(sampler)
    await context.close().catch(() => undefined)
  }
}

/** The reroute's move (entries 7 and 10): story 4's test move. */
export const MOVED_KEY = 'matrix_middle_home'
export const DELTA = { dx: 1.5, dy: -0.75 }

/** Prints one reroute entry's summary line, and its error under it. */
export function printReroute(e: RerouteEntry): void {
  console.log(
    `  reroute ${e.method} (${e.movedKey} +${e.delta.dx},${e.delta.dy}): ${e.run.status} in ${(e.workerMs / 1000).toFixed(1)} s, ` +
      `moved ${e.movedConnections.routed}/${e.movedConnections.total} routed, ${e.changedConnections.length} connections changed, ` +
      `saved routes ${e.savedRoutes.unchanged} unchanged / ${e.savedRoutes.changed} changed, ` +
      `fixed copper +${e.fixedCopperViolations}, drc +${e.drc.added}` +
      (e.savedConflicts ? `, saved conflicts ${e.savedConflicts.violations} (${e.savedConflicts.connections.length} connections rerouted)` : ''),
  )
  if (e.run.error) console.log(`      ${e.run.error}`)
}

/** A window function of the `?external` page (`routeBoard`, `routeCustom`), its request and response. */
type ExternalFn = keyof ExternalPage
type ExternalRequest<F extends ExternalFn> = Parameters<NonNullable<ExternalPage[F]>>[0]
type ExternalResponse<F extends ExternalFn> = Awaited<ReturnType<NonNullable<ExternalPage[F]>>>

/** One `?external` call: its status, error, the worker's answer (absent on a cap or throw) and its time. */
export interface ExternalRun<R> {
  status: RunStatus
  error: string | null
  response: R | undefined
  workerMs: number
}

/**
 * An `?external` page (`path`, e.g. `/?external` or `/?external&engine=custom`): routes requests
 * built in Node, one at a time, through the window function `fn` in the page's one worker, with
 * the base run's cap and network blocking. A call with no answer within cap + grace is `timeout`
 * and the page is reloaded (a new worker) for the next; a browser error is `threw`, and reloads
 * too. No heap samples: a reroute records solve time only.
 */
export async function externalSession<F extends ExternalFn>(browser: Browser, path: string, fn: F) {
  type Res = ExternalResponse<F> & WorkerAnswer
  const { context, page, blocked } = await blockedPage(browser)
  const open = async () => {
    await page.goto(`${ORIGIN}${path}`)
    await page.locator('#result[data-status="ready"]').waitFor({ timeout: 30_000 })
  }
  let ready = false
  return {
    blocked,
    async route(request: ExternalRequest<F>): Promise<ExternalRun<Res>> {
      try {
        if (!ready) await open()
        ready = true
        const solving = page.evaluate(
          ({ fn, request }) => (globalThis as unknown as Record<string, (r: unknown) => Promise<unknown>>)[fn]!(request),
          { fn, request },
        ) as Promise<Res>
        solving.catch(() => undefined)
        let timer: ReturnType<typeof setTimeout> | undefined
        const response = await Promise.race([
          solving,
          new Promise<undefined>((resolve) => (timer = setTimeout(() => resolve(undefined), CAP_MS + GRACE_MS))),
        ]).finally(() => clearTimeout(timer))
        if (!response) {
          ready = false
          return { status: 'timeout', error: `no answer from the worker within ${CAP_MS + GRACE_MS} ms`, response: undefined, workerMs: CAP_MS + GRACE_MS }
        }
        return { status: runStatus(response), error: response.error, response, workerMs: response.ms ?? 0 }
      } catch (err) {
        ready = false
        return { status: 'threw', error: `browser: ${errorText(err)}`, response: undefined, workerMs: 0 }
      }
    },
    close: () => context.close().catch(() => undefined),
  }
}

function drcCounts(r: DrcReport): DrcCounts {
  return { errors: r.violations.length, byClass: r.byClass, byKind: r.byKind }
}

const family = new Set<string>(CLEARANCE_FAMILY)
const familyOf = (r: KicadReport) => r.violations.filter((v) => family.has(v.type))

function kicadCounts(r: KicadReport): KicadCounts {
  const types = [...r.violations.map((v) => v.type), ...(r.unconnected_items ?? []).map((v) => v.type)]
  const clearanceFamily = count(types.filter((t) => family.has(t)))
  return {
    clearanceFamily,
    other: count(types.filter((t) => !family.has(t))),
    capped: Object.entries(clearanceFamily)
      .filter(([, n]) => atLimit(n))
      .map(([t]) => t),
  }
}

/** The multiset difference `xs` − `ys`. */
function minus(xs: string[], ys: string[]): string[] {
  const left = bag(xs)
  takeEach(left, ys)
  return [...left].flatMap(([s, n]) => Array.from({ length: n }, () => s))
}

/** Writes `<stem>.kicad_pcb`, `.kicad_pro` and `.kicad_dru` to `dir` and runs KiCad's DRC on it. */
function kicadBoard(dir: string, stem: string, text: string, input: RoutingInput, routes: RouteSet): KicadReport {
  mkdirSync(dir, { recursive: true })
  const board = join(dir, `${stem}.kicad_pcb`)
  writeFileSync(board, writeRoutes(text, input, routes))
  writeFileSync(join(dir, `${stem}.kicad_pro`), writeProject(input, stem))
  writeFileSync(join(dir, `${stem}.kicad_dru`), writeRules(input))
  return runKicad(board, join(dir, `${stem}.kicad-drc.json`))
}

/**
 * Scores one engine's routes on one design: everything in R2 but `reroute`. `notes` are the
 * engine's own error notes (what its adapter could not take), joined to the run's error. Writes
 * the bare and routed boards and their KiCad reports to `out/<engine>-<design>/`.
 */
export function scoreRoutes(
  design: Design,
  text: string,
  input: RoutingInput,
  routes: RouteSet,
  notes: string[],
  run: Pick<BrowserRun<WorkerAnswer>, 'status' | 'error' | 'workerMs' | 'peakHeapBytes'>,
  kicadVersion: string,
  engine: Scorecard['engine'],
): Scorecard {
  const routed = routedConnections(input, routes)
  const base = drc(input, EMPTY_ROUTES)
  const ours = drc(input, routes)

  const dir = join(out, `${engine.name}-${design}`)
  rmSync(dir, { recursive: true, force: true })
  const bareKicad = kicadBoard(dir, `bare-${design}`, text, input, EMPTY_ROUTES)
  const routedKicad = kicadBoard(dir, `${engine.name}-${design}`, text, input, routes)
  const kicadSigs = familyOf(routedKicad).map(kicadSignature)
  const drcSigs = ours.violations.map(drcSignatures(input, routes))

  const bareCounts = kicadCounts(bareKicad)
  const routedCounts = kicadCounts(routedKicad)
  const card = emptyScorecard(engine, design)
  return {
    ...card,
    kicadVersion,
    date: new Date().toISOString(),
    connections: completionCounts(input, routed),
    drc: { ...drcCounts(ours), added: addedViolations(base, ours).length },
    kicad: {
      ...routedCounts,
      added: minus(kicadSigs, familyOf(bareKicad).map(kicadSignature)).length,
      addedUncertain: [...new Set([...bareCounts.capped, ...routedCounts.capped])].sort(),
    },
    baseline: { drc: drcCounts(base), kicad: bareCounts },
    workerMs: Math.round(run.workerMs),
    peakMemoryMb: Math.round((run.peakHeapBytes / MiB) * 10) / 10,
    run: { status: run.status, error: [run.error, ...notes].filter(Boolean).join('; ') || null, capMs: CAP_MS },
    unrouted: unroutedConnections(input, routed),
    crossCheck: { drcOnly: minus(drcSigs, kicadSigs), kicadOnly: minus(kicadSigs, drcSigs) },
  }
}

/** Writes `scorecards/<engine>-<design>.scorecard.json` and prints its summary line; returns the path. */
export function writeScorecard(card: Scorecard, heapSamples: number): string {
  mkdirSync(scorecards, { recursive: true })
  const file = join(scorecards, `${card.engine.name}-${card.design}.scorecard.json`)
  writeFileSync(file, JSON.stringify(card, null, 2) + '\n')
  const r = card.connections.byRealisation
  console.log(
    `${card.design}: ${card.run!.status} in ${(card.workerMs / 1000).toFixed(1)} s, ` +
      `${card.connections.routed}/${card.connections.total} routed (${card.connections.completionPct.toFixed(1)}%; ` +
      `key-cell ${r['key-cell'].routed}/${r['key-cell'].total}, routing ${r.routing.routed}/${r.routing.total}), ` +
      `drc ${card.baseline.drc.errors}+${card.drc.added}, KiCad +${card.kicad.added}` +
      `${card.kicad.capped.length > 0 ? ` (capped: ${card.kicad.capped.join(',')})` : ''}, ` +
      `peak heap ${card.peakMemoryMb} MiB (${heapSamples} samples) -> ${file}`,
  )
  if (card.run!.error) console.log(`    ${card.run!.error}`)
  return file
}

/** Serves dist/ on the score port and opens headless Chromium for `fn`; closes both after. */
export async function withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  const server = await preview({ root: spikes, logLevel: 'warn', preview: { port: PORT, strictPort: true, open: false } })
  try {
    const browser = await chromium.launch({ headless: true })
    try {
      return await fn(browser)
    } finally {
      await browser.close()
    }
  } finally {
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()))
  }
}

/**
 * `--probe`: load a page's probe control (`path`; the default `?probe` is the tscircuit worker's),
 * whose worker fetches https://example.com/ instead of routing, to show that an outbound request fails the run and names the URL. It scores nothing,
 * so it needs no kicad-cli; it needs a built `dist/`.
 */
export function probe(path = '/?probe'): Promise<number> {
  return withBrowser(async (browser) => {
    const run = await routeInBrowser(browser, path)
    throw new Error(`probe made no outbound request (status ${run.status})`)
  })
}

/** Runs a score script's main: exit 0 on its return, 1 with `<name>: <message>` on stderr when it throws. */
export function runScript(name: string, main: () => Promise<number>): void {
  main().then(
    (code) => {
      process.exitCode = code
    },
    (error: unknown) => {
      console.error(`${name}: ${error instanceof Error ? error.message : String(error)}`)
      process.exitCode = 1
    },
  )
}
