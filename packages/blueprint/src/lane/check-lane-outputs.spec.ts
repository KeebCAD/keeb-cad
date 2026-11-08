import { describe, expect, it } from 'vitest'

import { checkLaneOutputs } from './check-lane-outputs'
import type { LaneContract } from './types'
import { errOf, okOf, outcomeOf } from '../testing/outcome'

const one: LaneContract = { outputs: [{ name: 'hole', count: 'one' }] }
const any: LaneContract = { outputs: [{ name: 'holes', count: 'any' }] }
const roleFailed = (output: string) => errOf({ kind: 'lane-failed', cause: 'role', output })

describe('checkLaneOutputs', () => {
  it.each([
    ['0 values', [], roleFailed('hole')],
    ['1 value', 7, okOf({ outputs: { hole: 7 }, problems: [] })],
    ['2 values', [1, 2], roleFailed('hole')],
    ['a list holding 1 value', [7], roleFailed('hole')],
  ])('a one output given %s', (_role, value, expected) => {
    expect(outcomeOf(checkLaneOutputs(one, { outputs: { hole: value }, problems: [] }))).toEqual(
      expected,
    )
  })

  it.each([
    ['0 values', [], []],
    ['2 values', [1, 2], [1, 2]],
  ])('an any output given %s', (_role, value, expected) => {
    expect(outcomeOf(checkLaneOutputs(any, { outputs: { holes: value }, problems: [] }))).toEqual(
      okOf({ outputs: { holes: expected }, problems: [] }),
    )
  })

  it('refuses a bare value for an any output, naming it', () => {
    expect(outcomeOf(checkLaneOutputs(any, { outputs: { holes: 7 }, problems: [] }))).toEqual(
      roleFailed('holes'),
    )
  })

  it('refuses an undeclared name, naming it', () => {
    expect(
      outcomeOf(checkLaneOutputs(one, { outputs: { hole: 1, extra: 2 }, problems: [] })),
    ).toEqual(roleFailed('extra'))
  })

  it('refuses a missing declared name, naming it', () => {
    expect(outcomeOf(checkLaneOutputs(one, { outputs: {}, problems: [] }))).toEqual(
      roleFailed('hole'),
    )
  })

  it.each([
    ['outputs', { problems: [] }],
    ['problems', { outputs: { hole: 1 } }],
  ])('names %s when the lane omits it', (field, value) => {
    expect(outcomeOf(checkLaneOutputs(one, value))).toEqual(roleFailed(field))
  })

  it('names the problems field when they are malformed', () => {
    expect(outcomeOf(checkLaneOutputs(one, { outputs: { hole: 1 }, problems: 'bad' }))).toEqual(
      roleFailed('problems'),
    )
  })
})
