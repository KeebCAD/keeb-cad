import { describe, expect, it } from 'vitest'

import { SNAPSHOT_MESSAGE } from '../../eslint.config'
import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'
import { ruleMessages } from './rule-messages'

const SPEC = 'packages/x/src/a.spec.ts'
const inTest = (assertion: string) => `it('a', async () => {\n  ${assertion}\n})`
const snapshotMatchers = (code: string) => ruleMessages('vitest/no-restricted-matchers', code, SPEC)

describe('no snapshot matchers in a spec', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each([
    ['toMatchSnapshot', 'expect(a).toMatchSnapshot()'],
    ['toMatchInlineSnapshot', 'expect(a).toMatchInlineSnapshot()'],
    ['toMatchFileSnapshot', "await expect(a).toMatchFileSnapshot('./a.txt')"],
    ['toThrowErrorMatchingSnapshot', 'expect(f).toThrowErrorMatchingSnapshot()'],
    ['toThrowErrorMatchingInlineSnapshot', 'expect(f).toThrowErrorMatchingInlineSnapshot()'],
    ['a negated snapshot', 'expect(a).not.toMatchSnapshot()'],
    ['a resolved snapshot', 'await expect(p).resolves.toMatchSnapshot()'],
    ['a rejected snapshot', 'await expect(p).rejects.toThrowErrorMatchingInlineSnapshot()'],
  ])('rejects %s', async (_, assertion) => {
    expect(await snapshotMatchers(inTest(assertion))).toEqual([SNAPSHOT_MESSAGE])
  })

  it.each([
    ['an explicit equality', 'expect(a).toEqual({ b: 1 })'],
    ['a thrown error', 'expect(f).toThrow(RangeError)'],
  ])('allows %s', async (_, assertion) => {
    expect(await snapshotMatchers(inTest(assertion))).toEqual([])
  })
})
