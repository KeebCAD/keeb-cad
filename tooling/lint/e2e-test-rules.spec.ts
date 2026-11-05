import { describe, expect, it } from 'vitest'

import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'
import { lintResult } from './rule-messages'

const E2E = 'app/e2e/a.spec.ts'
const PRELUDE = "import { test, expect } from '@playwright/test'\n"

describe('end-to-end test rules', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each([
    [
      'playwright/no-skipped-test',
      "test.skip('a', async ({ page }) => {\n  await expect(page).toHaveURL('/')\n})",
    ],
    [
      'playwright/no-focused-test',
      "test.only('a', async ({ page }) => {\n  await expect(page).toHaveURL('/')\n})",
    ],
    [
      'playwright/no-conditional-in-test',
      "test('a', async ({ page }) => {\n  if (page) {\n    await page.goto('/')\n  }\n  await expect(page).toHaveURL('/')\n})",
    ],
    [
      'playwright/no-conditional-expect',
      "test('a', async ({ page }) => {\n  await page.goto('/').catch(async () => {\n    await expect(page).toHaveURL('/')\n  })\n})",
    ],
  ])('rejects what %s forbids as an error', async (ruleId, code) => {
    const { messages } = await lintResult(PRELUDE + code, E2E)
    expect(messages.filter((message) => message.ruleId === ruleId)).toMatchObject([{ severity: 2 }])
  })
})
