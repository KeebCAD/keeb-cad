// `pnpm score:custom` (after `vite build`): routes every `key-cell` and `routing` connection of
// each Corney design with the custom router (story 8, plus story 9's rip-up) in its own Web Worker
// (`?corney=<design>&engine=custom`) under headless Chromium, with the cap (600 s), network
// blocking and heap sampling of `score:tscircuit`, then scores the RouteSet with the same
// `scoreRoutes`. Then (story 10) it moves story 7's key by the same amount and reroutes that key's
// connections in the custom worker (`?external&engine=custom`), together with the saved routes that
// now clash with the moved key (`savedConflicts`), with every other base-run route as fixed
// obstacles it cannot move or rip up, and diffs the result against the saved routes (`reroute`,
// one `fixed-obstacles` entry, with `savedConflicts`). Writes spikes/scorecards/custom-<design>.scorecard.json.
// A cap, a throw or an unroutable connection is a result, in the base run or the reroute; the exit
// code is 0 whenever both scorecards are written. An outbound request or a missing kicad-cli fails the run.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Browser } from '@playwright/test'
import { routedConnections } from '../src/completion'
import { moveKey } from '../src/move-key'
import type { CustomRouteResponse } from '../src/protocol'
import { movedConnections, rerouteDiff, savedConflicts, savedRoutes } from '../src/reroute'
import { EMPTY_ROUTES, viaOwners, type RerouteEntry, type RouteSet, type RunStatus } from '../src/route-set'
import { toRoutingInput } from '../src/routing-input'
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

/**
 * The router has no release: the git blob hash of `src/custom-router.ts` (7 characters), which
 * names the exact router source the scorecards came from, or `spike` without git.
 */
function engineVersion(): string {
  try {
    const hash = execFileSync('git', ['hash-object', 'src/custom-router.ts'], { cwd: spikes, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    return hash ? hash.slice(0, 7) : 'spike'
  } catch {
    return 'spike'
  }
}

/**
 * Moves MOVED_KEY by DELTA and reroutes its connections in the custom worker, together with the
 * saved routes that now clash with the moved key (`savedConflicts`), with every other saved route
 * (`base` less the moved and conflicting connections' routes) as `fixedRoutes`: static obstacles
 * of their own nets that the router cannot move or rip up, so it returns copper for the asked ids
 * only and `after` = fixed + returned. The diff is against the full saved routes, so the rerouted
 * conflicting connections show as changed. A router failure, cap or throw is recorded in the entry,
 * never thrown.
 */
async function reroute(browser: Browser, text: string, base: RouteSet): Promise<RerouteEntry[]> {
  const input = toRoutingInput(moveKey(text, MOVED_KEY, DELTA))
  const moved = movedConnections(input, MOVED_KEY)
  const saved = savedRoutes(base, moved)
  const conflicts = savedConflicts(input, saved)
  const ids = [...moved, ...conflicts.connections]
  const fixed = savedRoutes(base, ids)
  const entry = (status: RunStatus, error: string | null, workerMs: number, returned: RouteSet): RerouteEntry => ({
    method: 'fixed-obstacles',
    movedKey: MOVED_KEY,
    delta: DELTA,
    run: { status, error, capMs: CAP_MS },
    workerMs: Math.round(workerMs),
    ...rerouteDiff(input, saved, { traces: [...fixed.traces, ...returned.traces], vias: [...fixed.vias, ...returned.vias] }, moved),
    savedConflicts: conflicts,
  })
  const session = await externalSession(browser, '/?external&engine=custom', 'routeCustom')
  let result: RerouteEntry
  try {
    const run = await session.route({ input, ids, capMs: CAP_MS, fixedRoutes: fixed })
    const returned = run.response?.routes ?? EMPTY_ROUTES
    // The router's contract: copper for the asked ids only. Any other trace or via is noted, and scored.
    const asked = new Set(ids)
    const strays = [...new Set([...returned.traces.map((t) => t.connection), ...viaOwners(returned).flat()])].filter((id) => !asked.has(id))
    const note = strays.length > 0 ? `returned copper for connections not asked for: ${strays.join(', ')}` : ''
    try {
      // `movedConnections` counts the moved ids only and `drc` has no unrouted kind: a rerouted
      // conflicting connection left unrouted is noted here, so the entry never reads clean with it.
      const after: RouteSet = { traces: [...fixed.traces, ...returned.traces], vias: [...fixed.vias, ...returned.vias] }
      const routed = new Set(routedConnections(input, after))
      const lost = conflicts.connections.filter((id) => !routed.has(id))
      const unroutedNote = lost.length > 0 ? `saved conflicts unrouted after the reroute (${lost.length}/${conflicts.connections.length}): ${lost.join(', ')}` : ''
      result = entry(run.status, [run.error, note, unroutedNote].filter(Boolean).join('; ') || null, run.workerMs, returned)
    } catch (err) {
      // Scoring the returned routes threw: recorded, with none of them scored (after = fixed).
      const why = `scoring the returned routes: ${errorText(err)}`
      result = entry('threw', [run.error, why].filter(Boolean).join('; '), run.workerMs, EMPTY_ROUTES)
    }
  } finally {
    await session.close()
  }
  if (session.blocked.length > 0) throw new Error(`outbound request(s) from the page or worker: ${session.blocked.join(', ')}`)
  return [result]
}

async function main(): Promise<number> {
  // The custom page and worker's own control, so the block is shown on this engine's worker.
  if (process.argv.includes('--probe')) return probe('/?corney=wireless&engine=custom&probe')
  const version = kicadVersion()
  const engine = { name: 'custom', version: engineVersion() }
  return withBrowser(async (browser) => {
    console.log(`custom router ${engine.version}, Chromium ${browser.version()}, kicad-cli ${version}; cap ${CAP_MS / 1000} s per board`)
    for (const design of DESIGNS) {
      const run = await routeInBrowser<CustomRouteResponse>(browser, `/?corney=${design}&engine=custom&cap=${CAP_MS}`)
      if (run.heapSamples === 0) throw new Error(`no worker heap sample for ${design}: is CDP auto-attach reaching the worker?`)
      const text = readFileSync(join(pcbs, SOURCES[design]), 'utf8')
      const input = toRoutingInput(text)
      const routes = run.response?.routes ?? EMPTY_ROUTES
      const card = scoreRoutes(design, text, input, routes, [], run, version, engine)
      card.reroute = await reroute(browser, text, routes)
      writeScorecard(card, run.heapSamples)
      // The router's own `unrouted` against completion's: they differ only if the router placed
      // copper completion does not accept, which would be a router bug worth seeing.
      const own = run.response?.unrouted ?? []
      const routerResult = run.response?.status === 'solved' || run.response?.status === 'timeout'
      if (routerResult && [...own].sort().join() !== [...(card.unrouted ?? [])].sort().join()) {
        console.log(`    router unrouted ${own.length} vs completion unrouted ${card.unrouted?.length ?? 0}: ${own.join(', ')}`)
      }
      for (const e of card.reroute) printReroute(e)
    }
    return 0
  })
}

runScript('score:custom', main)
