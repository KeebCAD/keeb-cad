import { describe, expect, it } from 'vitest'

import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'
import { ruleMessages } from './rule-messages'

const SPEC = 'packages/x/src/a.spec.ts'
const conditionalExpects = (code: string) =>
  ruleMessages('vitest/no-conditional-expect', code, SPEC)

describe('no expect under a condition', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each([
    ['an expect behind &&', "it('a', () => {\n  a && expect(a).toBe(1)\n})"],
    ['an expect in a catch', "it('a', () => {\n  f().catch((e) => expect(e).toBe(1))\n})"],
  ])('rejects %s', async (_, code) => {
    expect(await conditionalExpects(code)).toEqual([expect.any(String)])
  })

  it('allows an unconditional expect', async () => {
    expect(await conditionalExpects("it('a', () => {\n  expect(a).toBe(1)\n})")).toEqual([])
  })
})
