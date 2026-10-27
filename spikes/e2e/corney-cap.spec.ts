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
