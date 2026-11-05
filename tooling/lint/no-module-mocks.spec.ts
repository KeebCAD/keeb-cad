import { describe, expect, it } from 'vitest'

import { MODULE_MOCK_MESSAGE } from '../../eslint.config'
import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'
import { ruleMessages } from './rule-messages'

const SPEC = 'packages/x/src/a.spec.ts'
const viMethods = (code: string) => ruleMessages('vitest/no-restricted-vi-methods', code, SPEC)

describe('no module mocks in a spec', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each([
    ['vi.mock', "vi.mock('./a')"],
    ['vi.doMock', "it('a', async () => {\n  vi.doMock('./a')\n  expect(1).toBe(1)\n})"],
  ])('rejects %s', async (_, code) => {
    expect(await viMethods(code)).toEqual([MODULE_MOCK_MESSAGE])
  })

  it.each([
    [
      'vi.fn inside a test',
      "it('a', () => {\n  const spy = vi.fn()\n  expect(spy).not.toHaveBeenCalled()\n})",
    ],
    ['fake timers', "it('a', () => {\n  vi.useFakeTimers()\n  expect(1).toBe(1)\n})"],
  ])('allows %s', async (_, code) => {
    expect(await viMethods(code)).toEqual([])
  })
})
