import { test, expect } from '@playwright/test'

test('shows the empty editor shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('keeb-cad')
  await expect(page.getByTestId('empty-editor')).toHaveText('No design open.')
})
