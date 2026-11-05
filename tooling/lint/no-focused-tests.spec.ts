import { describe, expect, it } from 'vitest'

import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'
import { ruleMessages } from './rule-messages'

const SPEC = 'packages/x/src/a.spec.ts'
const focused = (code: string) => ruleMessages('vitest/no-focused-tests', code, SPEC)

describe('no focused tests', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each([
    ['it.only', "it.only('a', () => {\n  expect(1).toBe(1)\n})"],
    ['describe.only', "describe.only('a', () => {})"],
  ])('rejects %s', async (_, code) => {
    expect(await focused(code)).toEqual([expect.any(String)])
  })

  it('allows a plain it', async () => {
    expect(await focused("it('a', () => {\n  expect(1).toBe(1)\n})")).toEqual([])
  })
})
