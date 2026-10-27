import { expect, test } from '@playwright/test'

const LOCAL_ORIGIN = 'http://localhost:4174'
const CAP_MS = 200

// The matrix's "Cap / failure" row: a Corney design that cannot solve within the cap reports
// `timeout` with an error, and the worker stops near the cap (checked between solver steps).
test('corney: a run over the cap reports timeout near the cap', async ({ page }) => {
  const blocked: string[] = []
  await page.context().route('**/*', async (route) => {
    const url = route.request().url()
    if (new URL(url).origin === LOCAL_ORIGIN) return route.continue()
    blocked.push(url)
    return route.abort('blockedbyclient')
  })
  await page.goto(`/?corney=wireless&cap=${CAP_MS}`)
  const el = page.locator('#result')
  await expect(el).not.toHaveAttribute('data-status', 'pending', { timeout: 110_000 })
  const result = JSON.parse((await el.textContent()) ?? '{}') as { status: string; error: string | null; ms: number }

  expect(result.status).toBe('timeout')
  expect(result.error).toBeTruthy()
  expect(result.ms).toBeGreaterThanOrEqual(CAP_MS)
  // One solver step (or the constructor) may run well past the cap before it is checked again.
  expect(result.ms).toBeLessThan(60_000)
  expect(blocked, 'outbound requests').toEqual([])
  console.log(`cap ${CAP_MS} ms: stopped at ${result.ms.toFixed(0)} ms (${result.error})`)
})

// The same row for the custom router (`&engine=custom`, story 9): its cap is a deadline checked
// between connections, so with 50 ms on wireless it stops early with what it placed by then, every
// connection it did not place in `unrouted`, and only its own worker on the page.
test('corney, custom engine: a run over the cap reports timeout with the rest unrouted', async ({ page }) => {
  const cap = 50
  const blocked: string[] = []
  await page.context().route('**/*', async (route) => {
    const url = route.request().url()
    if (new URL(url).origin === LOCAL_ORIGIN) return route.continue()
    blocked.push(url)
    return route.abort('blockedbyclient')
  })
  await page.goto(`/?corney=wireless&engine=custom&cap=${cap}`)
  const el = page.locator('#result')
  await expect(el).not.toHaveAttribute('data-status', 'pending', { timeout: 110_000 })
  const result = JSON.parse((await el.textContent()) ?? '{}') as {
    status: string
    error: string | null
    ms: number
    unrouted: string[]
    routes: { traces: Array<{ connection: string }> }
  }

  expect(result.status).toBe('timeout')
  expect(result.error).toBeTruthy()
  expect(result.ms).toBeGreaterThanOrEqual(cap)
  expect(result.ms).toBeLessThan(60_000)
  expect(result.unrouted.length).toBeGreaterThan(0)
  const placed = new Set(result.routes.traces.map((t) => t.connection))
  for (const id of result.unrouted) expect(placed.has(id), id).toBe(false)
  expect(page.workers().map((w) => w.url()).filter((u) => u.includes('route.worker'))).toEqual([])
  expect(blocked, 'outbound requests').toEqual([])
  console.log(`custom cap ${cap} ms: stopped at ${result.ms.toFixed(0)} ms, ${result.unrouted.length} unrouted (${result.error})`)
})

// The matrix's "Throw" row for the custom router: `&broken` adds an unknown id, which the router
// rejects by throwing. The worker reports `failed` with `thrown` (scored as `threw`), the
// message, no routes, and every id unrouted.
test('corney, custom engine: a router throw is reported as failed and thrown, with no routes', async ({ page }) => {
  await page.goto('/?corney=wireless&engine=custom&broken')
  const el = page.locator('#result')
  await expect(el).not.toHaveAttribute('data-status', 'pending', { timeout: 60_000 })
  const result = JSON.parse((await el.textContent()) ?? '{}') as {
    status: string
    error: string | null
    thrown: boolean
    unrouted: string[]
    routes: { traces: unknown[]; vias: unknown[] }
  }

  expect(result.status).toBe('failed')
  expect(result.thrown).toBe(true)
  expect(result.error).toContain('NOPE:X1.1.F~X2.1.F')
  expect(result.routes).toEqual({ traces: [], vias: [] })
  expect(result.unrouted).toContain('NOPE:X1.1.F~X2.1.F')
})
