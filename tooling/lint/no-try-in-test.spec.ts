import { describe, expect, it } from 'vitest'

import { restrictedSyntax } from './restricted-syntax'
import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'

const TRY = 'No try in a test; assert a throw as `expect(() => fn()).toThrow(…)`.'
const TRY_BLOCK = 'try {\n    f()\n  } catch {\n    expect(1).toBe(1)\n  }'

describe('no try in a test body', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each([
    ['an it', `it('a', () => {\n  ${TRY_BLOCK}\n})`],
    ['a test', `test('a', () => {\n  ${TRY_BLOCK}\n})`],
    ['an it.each', `it.each([1])('a %s', () => {\n  ${TRY_BLOCK}\n})`],
    ['an it.skip', `it.skip('a', () => {\n  ${TRY_BLOCK}\n})`],
  ])('rejects a try in %s', async (_, code) => {
    expect(await restrictedSyntax(code, 'packages/x/src/a.spec.ts')).toEqual([TRY])
  })

  it('rejects a try in an end-to-end test', async () => {
    const code = `test('a', async () => {\n  ${TRY_BLOCK}\n})`
    expect(await restrictedSyntax(code, 'app/e2e/a.spec.ts')).toEqual([TRY])
  })

  it('allows a try in a helper outside the test', async () => {
    const code = `function f() {\n  ${TRY_BLOCK}\n}`
    expect(await restrictedSyntax(code, 'packages/x/src/a.spec.ts')).toEqual([])
  })
})
