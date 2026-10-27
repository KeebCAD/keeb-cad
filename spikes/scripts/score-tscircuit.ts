// `pnpm score:tscircuit` (after `vite build`): routes each Corney design with tscircuit in the
// page's Web Worker under headless Chromium, samples the worker's JS heap over CDP, then scores
// the result in Node: completion per realisation, `drc` against the bare board, and KiCad on the
// bare and the routed board. Then it moves one key and reroutes only that key's connections twice
// in one worker (`?external`), with the other saved routes as preloaded traces and as rect
// obstacles, and diffs each result against the saved routes (`reroute`). Writes
// spikes/scorecards/tscircuit-<design>.scorecard.json.
// A routing or reroute failure is a result, recorded in the scorecard; the exit code is 0 whenever both
// scorecards are written. An outbound request or a missing kicad-cli fails the run.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'
import type { SimpleRouteJson, SimplifiedPcbTraces } from '@tscircuit/capacity-autorouter'
import { preview } from 'vite'
import { completionCounts, routedConnections, unroutedConnections } from '../src/completion'
import { drc, type DrcReport } from '../src/drc'
import { addedViolations } from '../src/drc-cases'
import { moveKey } from '../src/move-key'
import type { ExternalPage, RouteRequest, RouteResponse } from '../src/protocol'
import { movedConnections, rerouteDiff, savedRoutes } from '../src/reroute'
import {
  EMPTY_ROUTES,
  emptyScorecard,
  type DrcCounts,
  type KicadCounts,
  type RerouteEntry,
  type RerouteMethod,
  type RouteSet,
  type RunStatus,
  type Scorecard,
} from '../src/route-set'
import { toRoutingInput, type RoutingInput } from '../src/routing-input'
import { mergeReroute, toRerouteJson, toRouteSet } from '../src/tscircuit-adapter'
import { writeProject, writeRoutes, writeRules } from '../src/write-back'
import {
  bag,
  CLEARANCE_FAMILY,
  count,
  drcSignatures,
  atLimit,
  kicadSignature,
  kicadVersion,
  runKicad,
  takeEach,
  type KicadReport,
} from './kicad'
import { runStatus } from './run-status'

const here = dirname(fileURLToPath(import.meta.url))
const spikes = join(here, '..')
const out = join(spikes, 'out')
const scorecards = join(spikes, 'scorecards')
const pcbs = join(spikes, '../fixtures/corney-island/ergogen/pcbs')
const SOURCES = { wired: 'corney_island.kicad_pcb', wireless: 'corney_island_wireless.kicad_pcb' } as const
type Design = keyof typeof SOURCES
const DESIGNS: Design[] = ['wired', 'wireless']

const PORT = 4175
const ORIGIN = `http://localhost:${PORT}`
/** Per board: 10× the 60 s bar. */
const CAP_MS = 600_000
/** How long the page may take past the cap (a solver step the worker cannot interrupt). */
const GRACE_MS = 120_000
const HEAP_SAMPLE_MS = 100
const MiB = 1024 * 1024

/** The reroute's move: story 4's test move. */
const MOVED_KEY = 'matrix_middle_home'
const DELTA = { dx: 1.5, dy: -0.75 }
const METHODS: RerouteMethod[] = ['preloaded-traces', 'rect-obstacles']

interface BrowserRun {
  status: RunStatus
  error: string | null
  traces: SimplifiedPcbTraces
  workerMs: number
  peakHeapBytes: number
  heapSamples: number
}

function engineVersion(): string {
  const pkg = join(spikes, 'node_modules/@tscircuit/capacity-autorouter/package.json')
  return (JSON.parse(readFileSync(pkg, 'utf8')) as { version: string }).version
}

/** A fresh context and page whose every request off the preview origin is aborted and listed. */
async function blockedPage(browser: Browser): Promise<{ context: BrowserContext; page: Page; blocked: string[] }> {
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

const errorText = (err: unknown) => (err instanceof Error ? `${err.name}: ${err.message}` : String(err))

/**
 * The `?external` page: routes SRJs built in Node, one at a time, in the page's one worker, with
 * the base run's cap and network blocking. A run with no answer within cap + grace is `timeout`
 * and the page is reloaded (a new worker) for the next; a browser error is `threw`. No heap
 * samples: the reroute records solve time only.
 */
async function externalSession(browser: Browser) {
  const { context, page, blocked } = await blockedPage(browser)
  const open = async () => {
    await page.goto(`${ORIGIN}/?external`)
    await page.locator('#result[data-status="ready"]').waitFor({ timeout: 30_000 })
  }
  let ready = false
  return {
    blocked,
    async route(board: SimpleRouteJson): Promise<BrowserRun> {
      const none = { traces: [], peakHeapBytes: 0, heapSamples: 0 }
      try {
        if (!ready) await open()
        ready = true
        const request: RouteRequest = { board, probe: false, capMs: CAP_MS }
        const solving = page.evaluate((r) => (globalThis as ExternalPage).routeBoard!(r), request)
        solving.catch(() => undefined)
        let timer: ReturnType<typeof setTimeout> | undefined
        const response = await Promise.race([
          solving,
          new Promise<undefined>((resolve) => (timer = setTimeout(() => resolve(undefined), CAP_MS + GRACE_MS))),
        ]).finally(() => clearTimeout(timer))
        if (!response) {
          ready = false
          return { status: 'timeout', error: `no answer from the worker within ${CAP_MS + GRACE_MS} ms`, workerMs: CAP_MS + GRACE_MS, ...none }
        }
        return { status: runStatus(response), error: response.error, traces: response.traces ?? [], workerMs: response.ms ?? 0, peakHeapBytes: 0, heapSamples: 0 }
      } catch (err) {
        ready = false
        return { status: 'threw', error: `browser: ${errorText(err)}`, workerMs: 0, ...none }
      }
    },
    close: () => context.close().catch(() => undefined),
  }
}

/**
 * Routes one design in the page's worker. Every request off the preview origin is aborted and
 * fails the run. The worker's JS heap is read every 100 ms with `Runtime.getHeapUsage`, sent to
 * the worker target through the page's CDP session (`performance.memory` is absent in workers).
 */
async function routeInBrowser(browser: Browser, path: string): Promise<BrowserRun> {
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
    let response: RouteResponse | undefined
    // Anything but the wait's own timeout (renderer crash, OOM, page error) is the run's result:
    // status `threw`, no traces. The scorecard is still written and the next design still runs.
    let crashed: string | undefined
    try {
      await page.goto(`${ORIGIN}${path}`)
      await page.locator('#result:not([data-status="pending"])').waitFor({ timeout: CAP_MS + GRACE_MS })
      response = JSON.parse((await page.locator('#result').textContent()) ?? '{}') as RouteResponse
    } catch (err) {
      if (!(err instanceof Error && err.name === 'TimeoutError')) {
        crashed = `browser: ${errorText(err)}`
      }
    }
    if (blocked.length > 0) throw new Error(`outbound request(s) from the page or worker: ${blocked.join(', ')}`)
    const sample = { peakHeapBytes, heapSamples }
    if (crashed) return { status: 'threw', error: crashed, traces: [], workerMs: 0, ...sample }
    if (!response) {
      return {
        status: 'timeout',
        error: `no answer from the worker within ${CAP_MS + GRACE_MS} ms`,
        traces: [],
        workerMs: CAP_MS + GRACE_MS,
        ...sample,
      }
    }
    return { status: runStatus(response), error: response.error, traces: response.traces ?? [], workerMs: response.ms ?? 0, ...sample }
  } finally {
    clearInterval(sampler)
    await context.close().catch(() => undefined)
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

/** What `toRouteSet` could not take, as error notes (never dropped silently). */
function conversionNotes(converted: ReturnType<typeof toRouteSet>): string[] {
  return [
    converted.unknown.length > 0 ? `traces naming no connection: ${converted.unknown.join(', ')}` : '',
    converted.skipped.length > 0 ? `hops that are not board copper: ${converted.skipped.join(', ')}` : '',
  ].filter(Boolean)
}

function score(
  design: Design,
  text: string,
  run: BrowserRun,
  version: string,
  engine: Scorecard['engine'],
): { card: Scorecard; routes: RouteSet } {
  const input = toRoutingInput(text)
  const converted = toRouteSet(input, run.traces)
  const routes: RouteSet = { traces: converted.traces, vias: converted.vias }
  const notes = conversionNotes(converted)

  const routed = routedConnections(input, routes)
  const base = drc(input, EMPTY_ROUTES)
  const ours = drc(input, routes)

  const dir = join(out, `tscircuit-${design}`)
  rmSync(dir, { recursive: true, force: true })
  const bareKicad = kicadBoard(dir, `bare-${design}`, text, input, EMPTY_ROUTES)
  const routedKicad = kicadBoard(dir, `tscircuit-${design}`, text, input, routes)
  const kicadSigs = familyOf(routedKicad).map(kicadSignature)
  const drcSigs = ours.violations.map(drcSignatures(input, routes))

  const bareCounts = kicadCounts(bareKicad)
  const routedCounts = kicadCounts(routedKicad)
  const card = emptyScorecard(engine, design)
  const scored: Scorecard = {
    ...card,
    kicadVersion: version,
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
  return { card: scored, routes }
}

/**
 * Moves MOVED_KEY by DELTA and reroutes only its connections, once per method, in one
 * `?external` page. The saved routes are `base` less the moved connections' routes. A build
 * error, solver failure, cap or throw is recorded in the entry; the returned traces are scored.
 */
async function reroute(browser: Browser, text: string, base: RouteSet): Promise<RerouteEntry[]> {
  const input = toRoutingInput(moveKey(text, MOVED_KEY, DELTA))
  const moved = movedConnections(input, MOVED_KEY)
  const saved = savedRoutes(base, moved)
  const session = await externalSession(browser)
  const entries: RerouteEntry[] = []
  try {
    for (const method of METHODS) {
      let run: BrowserRun
      try {
        run = await session.route(toRerouteJson(input, saved, moved, method))
      } catch (err) {
        run = { status: 'threw', error: `building the SRJ: ${errorText(err)}`, traces: [], workerMs: 0, peakHeapBytes: 0, heapSamples: 0 }
      }
      const entry = (status: RunStatus, error: string | null, after: RouteSet, replaced: string[]): RerouteEntry => ({
        method,
        movedKey: MOVED_KEY,
        delta: DELTA,
        run: { status, error, capMs: CAP_MS },
        workerMs: Math.round(run.workerMs),
        ...rerouteDiff(input, saved, after, moved, replaced),
      })
      try {
        const converted = toRouteSet(input, run.traces)
        const { routes: after, replaced } =
          method === 'preloaded-traces'
            ? mergeReroute(input, saved, converted, run.traces)
            : { routes: { traces: [...saved.traces, ...converted.traces], vias: [...saved.vias, ...converted.vias] }, replaced: [] }
        entries.push(entry(run.status, [run.error, ...conversionNotes(converted)].filter(Boolean).join('; ') || null, after, replaced))
      } catch (err) {
        // Scoring the returned traces threw: recorded, with none of them scored (after = saved).
        const why = `scoring the returned traces: ${errorText(err)}`
        entries.push(entry('threw', [run.error, why].filter(Boolean).join('; '), saved, []))
      }
    }
  } finally {
    await session.close()
  }
  if (session.blocked.length > 0) throw new Error(`outbound request(s) from the page or worker: ${session.blocked.join(', ')}`)
  return entries
}

/**
 * `--probe`: load the page's `?probe` control (the worker fetches https://example.com/) instead of
 * a design, to show that an outbound request fails the run and names the URL. It scores nothing,
 * so it needs no kicad-cli; it needs a built `dist/`.
 */
async function probe(): Promise<number> {
  const server = await preview({ root: spikes, logLevel: 'warn', preview: { port: PORT, strictPort: true, open: false } })
  const browser = await chromium.launch({ headless: true })
  try {
    const run = await routeInBrowser(browser, '/?probe')
    throw new Error(`probe made no outbound request (status ${run.status})`)
  } finally {
    await browser.close()
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()))
  }
}

async function main(): Promise<number> {
  if (process.argv.includes('--probe')) return probe()
  const version = kicadVersion()
  const engine = { name: 'tscircuit', version: engineVersion() }
  const server = await preview({ root: spikes, logLevel: 'warn', preview: { port: PORT, strictPort: true, open: false } })
  const browser = await chromium.launch({ headless: true })
  mkdirSync(scorecards, { recursive: true })
  console.log(`tscircuit ${engine.version}, Chromium ${browser.version()}, kicad-cli ${version}; cap ${CAP_MS / 1000} s per board`)
  try {
    for (const design of DESIGNS) {
      const run = await routeInBrowser(browser, `/?corney=${design}&cap=${CAP_MS}`)
      if (run.heapSamples === 0) throw new Error(`no worker heap sample for ${design}: is CDP auto-attach reaching the worker?`)
      const text = readFileSync(join(pcbs, SOURCES[design]), 'utf8')
      const { card, routes } = score(design, text, run, version, engine)
      card.reroute = await reroute(browser, text, routes)
      const file = join(scorecards, `tscircuit-${design}.scorecard.json`)
      writeFileSync(file, JSON.stringify(card, null, 2) + '\n')
      const r = card.connections.byRealisation
      console.log(
        `${design}: ${card.run!.status} in ${(card.workerMs / 1000).toFixed(1)} s, ` +
          `${card.connections.routed}/${card.connections.total} routed (${card.connections.completionPct.toFixed(1)}%; ` +
          `key-cell ${r['key-cell'].routed}/${r['key-cell'].total}, routing ${r.routing.routed}/${r.routing.total}), ` +
          `drc ${card.baseline.drc.errors}+${card.drc.added}, KiCad +${card.kicad.added}` +
          `${card.kicad.capped.length > 0 ? ` (capped: ${card.kicad.capped.join(',')})` : ''}, ` +
          `peak heap ${card.peakMemoryMb} MiB (${run.heapSamples} samples) -> ${file}`,
      )
      if (card.run!.error) console.log(`    ${card.run!.error}`)
      for (const e of card.reroute) {
        console.log(
          `  reroute ${e.method} (${e.movedKey} +${e.delta.dx},${e.delta.dy}): ${e.run.status} in ${(e.workerMs / 1000).toFixed(1)} s, ` +
            `moved ${e.movedConnections.routed}/${e.movedConnections.total} routed, ${e.changedConnections.length} connections changed, ` +
            `saved routes ${e.savedRoutes.unchanged} unchanged / ${e.savedRoutes.changed} changed, ` +
            `fixed copper +${e.fixedCopperViolations}, drc +${e.drc.added}`,
        )
        if (e.run.error) console.log(`      ${e.run.error}`)
      }
    }
  } finally {
    await browser.close()
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()))
  }
  return 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (error: unknown) => {
    console.error(`score:tscircuit: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  },
)
