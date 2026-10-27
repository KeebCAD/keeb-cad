// `pnpm score:tscircuit` (after `vite build`): routes each Corney design with tscircuit in the
// page's Web Worker under headless Chromium, samples the worker's JS heap over CDP, then scores
// the result in Node (`scripts/score.ts`, shared with `score:custom`): completion per
// realisation, `drc` against the bare board, and KiCad on the bare and the routed board. Then it
// moves one key and reroutes only that key's connections twice in one worker (`?external`), with
// the other saved routes as preloaded traces and as rect obstacles, and diffs each result against
// the saved routes (`reroute`). Writes spikes/scorecards/tscircuit-<design>.scorecard.json.
// A routing or reroute failure is a result, recorded in the scorecard; the exit code is 0 whenever both
// scorecards are written. An outbound request or a missing kicad-cli fails the run.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Browser } from '@playwright/test'
import type { SimpleRouteJson, SimplifiedPcbTraces } from '@tscircuit/capacity-autorouter'
import { moveKey } from '../src/move-key'
import type { ExternalPage, RouteRequest, RouteResponse } from '../src/protocol'
import { movedConnections, rerouteDiff, savedRoutes } from '../src/reroute'
import type { RerouteEntry, RerouteMethod, RouteSet, RunStatus } from '../src/route-set'
import { toRoutingInput } from '../src/routing-input'
import { mergeReroute, toRerouteJson, toRouteSet } from '../src/tscircuit-adapter'
import { kicadVersion } from './kicad'
import { runStatus } from './run-status'
import {
  blockedPage,
  CAP_MS,
  DESIGNS,
  errorText,
  GRACE_MS,
  ORIGIN,
  pcbs,
  probe,
  routeInBrowser,
  runScript,
  scoreRoutes,
  SOURCES,
  spikes,
  withBrowser,
  writeScorecard,
} from './score'

/** The reroute's move: story 4's test move. */
const MOVED_KEY = 'matrix_middle_home'
const DELTA = { dx: 1.5, dy: -0.75 }
const METHODS: RerouteMethod[] = ['preloaded-traces', 'rect-obstacles']

/** One `?external` solve: its status, error, the traces tscircuit returned and the solve time. */
interface ExternalRun {
  status: RunStatus
  error: string | null
  traces: SimplifiedPcbTraces
  workerMs: number
}

function engineVersion(): string {
  const pkg = join(spikes, 'node_modules/@tscircuit/capacity-autorouter/package.json')
  return (JSON.parse(readFileSync(pkg, 'utf8')) as { version: string }).version
}

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
    async route(board: SimpleRouteJson): Promise<ExternalRun> {
      const none = { traces: [] }
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
        return { status: runStatus(response), error: response.error, traces: response.traces ?? [], workerMs: response.ms ?? 0 }
      } catch (err) {
        ready = false
        return { status: 'threw', error: `browser: ${errorText(err)}`, workerMs: 0, ...none }
      }
    },
    close: () => context.close().catch(() => undefined),
  }
}

/** What `toRouteSet` could not take, as error notes (never dropped silently). */
function conversionNotes(converted: ReturnType<typeof toRouteSet>): string[] {
  return [
    converted.unknown.length > 0 ? `traces naming no connection: ${converted.unknown.join(', ')}` : '',
    converted.skipped.length > 0 ? `hops that are not board copper: ${converted.skipped.join(', ')}` : '',
  ].filter(Boolean)
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
      let run: ExternalRun
      try {
        run = await session.route(toRerouteJson(input, saved, moved, method))
      } catch (err) {
        run = { status: 'threw', error: `building the SRJ: ${errorText(err)}`, traces: [], workerMs: 0 }
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

async function main(): Promise<number> {
  if (process.argv.includes('--probe')) return probe()
  const version = kicadVersion()
  const engine = { name: 'tscircuit', version: engineVersion() }
  return withBrowser(async (browser) => {
    console.log(`tscircuit ${engine.version}, Chromium ${browser.version()}, kicad-cli ${version}; cap ${CAP_MS / 1000} s per board`)
    for (const design of DESIGNS) {
      const run = await routeInBrowser<RouteResponse>(browser, `/?corney=${design}&cap=${CAP_MS}`)
      if (run.heapSamples === 0) throw new Error(`no worker heap sample for ${design}: is CDP auto-attach reaching the worker?`)
      const text = readFileSync(join(pcbs, SOURCES[design]), 'utf8')
      const input = toRoutingInput(text)
      const converted = toRouteSet(input, run.response?.traces ?? [])
      const routes: RouteSet = { traces: converted.traces, vias: converted.vias }
      const card = scoreRoutes(design, text, input, routes, conversionNotes(converted), run, version, engine)
      card.reroute = await reroute(browser, text, routes)
      writeScorecard(card, run.heapSamples)
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
    return 0
  })
}

runScript('score:tscircuit', main)
