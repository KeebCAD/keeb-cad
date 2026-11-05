import { describe, expect, it } from 'vitest'

import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'
import { lintResult, ruleMessages } from './rule-messages'

const SPEC = 'packages/x/src/a.spec.ts'
const disabled = (code: string) => ruleMessages('vitest/no-disabled-tests', code, SPEC)

describe('no disabled tests', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each([
    ['it.skip', "it.skip('a', () => {\n  expect(1).toBe(1)\n})"],
    ['describe.skip', "describe.skip('a', () => {})"],
  ])('rejects %s', async (_, code) => {
    expect(await disabled(code)).toEqual([expect.any(String)])
  })

  it('reports a skipped test as an error, not a warning', async () => {
    const code = "it.skip('a', () => {\n  expect(1).toBe(1)\n})"
    expect(await lintResult(code, SPEC)).toMatchObject({ errorCount: 1, warningCount: 0 })
  })
})
