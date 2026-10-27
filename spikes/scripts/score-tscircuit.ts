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
import type { RouteRequest, RouteResponse } from '../src/protocol'
import { movedConnections, rerouteDiff, savedRoutes } from '../src/reroute'
import type { RerouteEntry, RerouteMethod, RouteSet, RunStatus } from '../src/route-set'
import { toRoutingInput } from '../src/routing-input'
import { mergeReroute, toRerouteJson, toRouteSet } from '../src/tscircuit-adapter'
import { kicadVersion } from './kicad'
import {
  CAP_MS,
  DELTA,
  DESIGNS,
  errorText,
  externalSession,
  MOVED_KEY,
  pcbs,
  printReroute,
  probe,
  routeInBrowser,
  runScript,
  scoreRoutes,
  SOURCES,
  spikes,
  withBrowser,
  writeScorecard,
} from './score'

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

/** One `?external` tscircuit solve, as `externalSession` returns it. */
async function solve(session: Awaited<ReturnType<typeof externalSession<'routeBoard'>>>, board: SimpleRouteJson): Promise<ExternalRun> {
  const request: RouteRequest = { board, probe: false, capMs: CAP_MS }
  const { status, error, response, workerMs } = await session.route(request)
  return { status, error, traces: response?.traces ?? [], workerMs }
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
  const session = await externalSession(browser, '/?external', 'routeBoard')
  const entries: RerouteEntry[] = []
  try {
    for (const method of METHODS) {
      let run: ExternalRun
      try {
        run = await solve(session, toRerouteJson(input, saved, moved, method))
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
      for (const e of card.reroute) printReroute(e)
    }
    return 0
  })
}

runScript('score:tscircuit', main)
