import { test, expect } from '@playwright/test'

test('opens a design in the editor shell at layout', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Untitled design')
  await expect(page).toHaveURL(/\/#\/design\/[a-z0-9]+(?:-[a-z0-9]+)*\/layout$/)
})
