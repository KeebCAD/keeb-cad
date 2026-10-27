import { expect, test, type Page } from '@playwright/test'
import type { CustomRouteRequest, CustomRouteResponse, ExternalPage, RouteResponse } from '../src/protocol'
import { viaOwners, type RouteSet } from '../src/route-set'
import { toRoutingInput } from '../src/routing-input'
import { connectionNames, testBoard } from '../src/test-board'

const LOCAL_ORIGIN = 'http://localhost:4174'
const PROBE_URL = 'https://example.com/'

interface Result {
  status: string
  error: string | null
  traces: Array<{ connection_name: string }>
  ms: number
}

/**
 * Blocks at the browser level (context.route also sees Worker traffic) and records every request
 * that leaves the local preview server. Nothing inside the page or worker is stubbed.
 */
async function blockExternal(page: Page): Promise<string[]> {
  const blocked: string[] = []
  await page.context().route('**/*', async (route) => {
    const url = route.request().url()
    if (new URL(url).origin === LOCAL_ORIGIN) return route.continue()
    blocked.push(url)
    return route.abort('blockedbyclient')
  })
  return blocked
}

async function finalResult(page: Page): Promise<Result> {
  const el = page.locator('#result')
  await expect(el).not.toHaveAttribute('data-status', 'pending', { timeout: 110_000 })
  return JSON.parse((await el.textContent()) ?? '{}') as Result
}

test('routes both connections in a worker with no outbound requests', async ({ page }) => {
  const blocked = await blockExternal(page)
  await page.goto('/')
  const result = await finalResult(page)

  expect(result.error, 'tscircuit error').toBeNull()
  expect(result.status).toBe('solved')
  const routed = new Set(result.traces.map((t) => t.connection_name))
  for (const name of connectionNames) expect(routed, `trace for ${name}`).toContain(name)
  expect(blocked, 'outbound requests').toEqual([])
  console.log(`tscircuit solve: ${result.ms.toFixed(1)} ms, ${result.traces.length} traces`)
})

test('probe: worker fetch to an external URL is logged and aborted', async ({ page }) => {
  const blocked = await blockExternal(page)
  await page.goto('/?probe')
  const result = await finalResult(page)

  expect(result.status).toBe('probed')
  expect(result.error, 'fetch should have been aborted').not.toBeNull()
  expect(blocked).toEqual([PROBE_URL])
})

test('broken board: a solver error is reported as failed, not hung', async ({ page }) => {
  const blocked = await blockExternal(page)
  await page.goto('/?broken')
  const result = await finalResult(page)

  expect(result.status).toBe('failed')
  expect(result.error, 'tscircuit error').toBeTruthy()
  expect(blocked, 'outbound requests').toEqual([])
})

// `?external` (story 7): the page routes a board posted from outside, here the test board twice,
// in its one worker, with the same response as the built-in modes.
test('external: routeBoard routes a posted board, one call after another', async ({ page }) => {
  const blocked = await blockExternal(page)
  await page.goto('/?external')
  await expect(page.locator('#result')).toHaveAttribute('data-status', 'ready')
  for (let i = 0; i < 2; i++) {
    const result = await page.evaluate(
      (board) => (globalThis as ExternalPage).routeBoard!({ board, probe: false }),
      testBoard,
    ) as RouteResponse
    expect(result.status).toBe('solved')
    const routed = new Set(result.traces.map((t) => t.connection_name))
    for (const name of connectionNames) expect(routed, `trace for ${name}`).toContain(name)
  }
  expect(blocked, 'outbound requests').toEqual([])
})

/** Wireless Corney's RoutingInput and its scored (`key-cell`, `routing`) connection ids. */
async function wirelessInput() {
  // e2e/ shares src/'s Node-free types (tsconfig.json), so `node:fs` comes in untyped, typed here by hand.
  const { readFileSync } = (await import('node:fs' as string)) as { readFileSync: (path: URL, encoding: 'utf8') => string }
  const text = readFileSync(new URL('../../fixtures/corney-island/ergogen/pcbs/corney_island_wireless.kicad_pcb', import.meta.url), 'utf8')
  const input = toRoutingInput(text)
  const ids = input.connections.filter((c) => c.realisedBy === 'key-cell' || c.realisedBy === 'routing').map((c) => c.id)
  return { input, ids }
}

/** Opens `?external&engine=custom` and returns its `routeCustom`, called from the test. */
async function openRouteCustom(page: Page) {
  await page.goto('/?external&engine=custom')
  await expect(page.locator('#result')).toHaveAttribute('data-status', 'ready')
  return (request: CustomRouteRequest) =>
    page.evaluate((r) => (globalThis as ExternalPage).routeCustom!(r), request) as Promise<CustomRouteResponse>
}

// `?external&engine=custom` (story 10): `routeCustom` routes a wireless RoutingInput posted from
// outside, twice in one worker: every scored connection, then three of them again with the rest
// of the first call's copper as `fixedRoutes`, which come back only as the three's copper.
test('external, custom engine: routeCustom routes a posted wireless request, one call after another', async ({ page }) => {
  const blocked = await blockExternal(page)
  const { input, ids } = await wirelessInput()
  const routeCustom = await openRouteCustom(page)

  const first = await routeCustom({ input, ids, capMs: 60_000 })
  expect(first.status, first.error ?? '').toBe('solved')
  expect(first.unrouted).toEqual([])

  const again = ids.filter((id) => first.routes.traces.some((t) => t.connection === id)).slice(0, 3)
  const owners = viaOwners(first.routes)
  const fixedRoutes: RouteSet = {
    traces: first.routes.traces.filter((t) => !again.includes(t.connection)),
    vias: first.routes.vias.filter((_, i) => owners[i]!.length === 0 || owners[i]!.some((o) => !again.includes(o))),
  }
  const second = await routeCustom({ input, ids: again, capMs: 60_000, fixedRoutes })
  expect(second.status, second.error ?? '').toBe('solved')
  expect(second.unrouted).toEqual([])
  expect([...new Set(second.routes.traces.map((t) => t.connection))].sort()).toEqual([...again].sort())
  expect(blocked, 'outbound requests').toEqual([])
  console.log(`custom external: ${ids.length} connections in ${first.ms.toFixed(0)} ms, then ${again.length} round the rest in ${second.ms.toFixed(0)} ms`)
})

// The reroute's failure row (story 10) on the same path: a run over the cap answers `timeout` with
// its error and the rest unrouted, then, in the same page, a router throw answers `failed` with
// `thrown`. score:custom records both in the entry (`runStatus`), never as an exit failure.
test('external, custom engine: routeCustom reports a cap and then a throw, one call after another', async ({ page }) => {
  const blocked = await blockExternal(page)
  const { input, ids } = await wirelessInput()
  const routeCustom = await openRouteCustom(page)

  const capped = await routeCustom({ input, ids, capMs: 1 })
  expect(capped.status).toBe('timeout')
  expect(capped.error).toBeTruthy()
  expect(capped.unrouted.length).toBeGreaterThan(0)

  const thrown = await routeCustom({ input, ids: ['NOPE:X1.1.F~X2.1.F'], capMs: 60_000, fixedRoutes: capped.routes })
  expect(thrown.status).toBe('failed')
  expect(thrown.status === 'failed' && thrown.thrown).toBe(true)
  expect(thrown.error).toContain('NOPE:X1.1.F~X2.1.F')
  expect(thrown.routes).toEqual({ traces: [], vias: [] })
  expect(blocked, 'outbound requests').toEqual([])
})
