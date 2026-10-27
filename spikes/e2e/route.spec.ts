import { expect, test, type Page } from '@playwright/test'
import type { ExternalPage, RouteResponse } from '../src/protocol'
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
