import { expect, test } from '@playwright/test'

const LOCAL_ORIGIN = 'http://localhost:4174'

// The plan's Latency row (story 11): `?outline` builds Corney's outline from its model shapes
// (makerjs evaluate + flatten) on the page's main thread, ≥ 20 times after a warm-up, offline.
test('outline: Corney rebuilt from model shapes on the main thread, median and max ms', async ({ page }) => {
  const blocked: string[] = []
  const log: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') log.push(`${msg.type()}: ${msg.text()}`)
  })
  page.on('pageerror', (err) => log.push(`pageerror: ${err.message}`))
  await page.context().route('**/*', async (route) => {
    const url = route.request().url()
    if (new URL(url).origin === LOCAL_ORIGIN) return route.continue()
    blocked.push(url)
    return route.abort('blockedbyclient')
  })
  await page.goto('/?outline')
  const el = page.locator('#result')
  await expect(el).not.toHaveAttribute('data-status', 'pending', { timeout: 60_000 })
  const result = JSON.parse((await el.textContent()) ?? '{}') as {
    status: string
    error?: string
    medianMs: number
    maxMs: number
    runs: number
    vertices: number
    loops: number
    tol: number
  }

  expect(result.status, result.error).toBe('solved')
  expect(result.runs).toBeGreaterThanOrEqual(20)
  expect(result.loops).toBe(1)
  expect(result.vertices).toBeGreaterThan(0)
  expect(result.medianMs).toBeGreaterThan(0)
  expect(result.maxMs).toBeGreaterThanOrEqual(result.medianMs)
  expect(log, 'console log').toEqual([])
  expect(blocked, 'outbound requests').toEqual([])
  console.log(
    `outline (main thread, tol ${result.tol} mm): median ${result.medianMs.toFixed(2)} ms, ` +
      `max ${result.maxMs.toFixed(2)} ms over ${result.runs} builds, ${result.vertices} vertices`,
  )
})
