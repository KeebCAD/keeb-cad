import type { Page } from '@playwright/test'

import { byCodeUnit } from '../ordering/by-code-unit'

export async function drawnKeys(page: Page): Promise<string[]> {
  const labels = await page
    .getByRole('main', { name: 'Canvas' })
    .getByRole('button')
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label') ?? ''))
  return labels.toSorted(byCodeUnit)
}
