import { compareCodeUnits } from '@keeb-cad/schema'
import type { Page } from '@playwright/test'

export async function drawnKeys(page: Page): Promise<string[]> {
  const labels = await page
    .getByRole('main', { name: 'Canvas' })
    .getByRole('button')
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label') ?? ''))
  return labels.toSorted(compareCodeUnits)
}
