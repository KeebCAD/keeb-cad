import { describe, expect, it } from 'vitest'

import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'
import { ruleMessages } from './rule-messages'

const SPEC = 'packages/x/src/a.spec.ts'
const conditionals = (code: string) => ruleMessages('vitest/no-conditional-in-test', code, SPEC)

describe('no if in a test body', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each([
    ['an if in an it', "it('a', () => {\n  if (a) {\n    expect(a).toBe(1)\n  }\n})"],
    ['an if in a test', "test('a', () => {\n  if (a) a()\n  expect(a).toBe(1)\n})"],
  ])('rejects %s', async (_, code) => {
    expect(await conditionals(code)).toEqual([expect.any(String)])
  })

  it('allows an if in a helper outside the test', async () => {
    const code =
      "const pick = (a) => {\n  if (a) return 1\n  return 2\n}\nit('a', () => {\n  expect(pick(true)).toBe(1)\n})"
    expect(await conditionals(code)).toEqual([])
  })
})
