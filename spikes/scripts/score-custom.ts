// `pnpm score:custom` (after `vite build`): routes every `key-cell` and `routing` connection of
// each Corney design with the custom router (story 8, plus story 9's rip-up) in its own Web Worker
// (`?corney=<design>&engine=custom`) under headless Chromium, with the cap (600 s), network
// blocking and heap sampling of `score:tscircuit`, then scores the RouteSet with the same
// `scoreRoutes`. Writes spikes/scorecards/custom-<design>.scorecard.json; no `reroute` (story 10).
// A cap, a throw or an unroutable connection is a result; the exit code is 0 whenever both
// scorecards are written. An outbound request or a missing kicad-cli fails the run.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CustomRouteResponse } from '../src/protocol'
import { EMPTY_ROUTES } from '../src/route-set'
import { toRoutingInput } from '../src/routing-input'
import { kicadVersion } from './kicad'
import { CAP_MS, DESIGNS, pcbs, probe, routeInBrowser, runScript, scoreRoutes, SOURCES, spikes, withBrowser, writeScorecard } from './score'

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
      writeScorecard(card, run.heapSamples)
      // The router's own `unrouted` against completion's: they differ only if the router placed
      // copper completion does not accept, which would be a router bug worth seeing.
      const own = run.response?.unrouted ?? []
      const routerResult = run.response?.status === 'solved' || run.response?.status === 'timeout'
      if (routerResult && [...own].sort().join() !== [...(card.unrouted ?? [])].sort().join()) {
        console.log(`    router unrouted ${own.length} vs completion unrouted ${card.unrouted?.length ?? 0}: ${own.join(', ')}`)
      }
    }
    return 0
  })
}

runScript('score:custom', main)
