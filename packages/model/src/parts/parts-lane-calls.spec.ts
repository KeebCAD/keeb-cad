import { Result } from '@keeb-cad/result'
import { expectResult } from '@keeb-cad/result/testing'
import { aBlueprintDeclaration } from '@keeb-cad/schema/testing'
import { describe, it } from 'vitest'

import { partsLaneCalls } from './parts-lane-calls'

// An L whose arms are 18 wide, its corner square from (−9, −9) to (9, 9).
const L_SHAPE = [
  {
    outer: [
      { x: -9, y: -9 },
      { x: 27, y: -9 },
      { x: 27, y: 9 },
      { x: 9, y: 9 },
      { x: 9, y: 27 },
      { x: -9, y: 27 },
    ],
    holes: [],
  },
]

const CLOCKWISE_SQUARE = [
  {
    outer: [
      { x: 0, y: 0 },
      { x: 0, y: 18 },
      { x: 18, y: 18 },
      { x: 18, y: 0 },
    ],
    holes: [],
  },
]

// A counter-clockwise triangle whose right corner is at x. At Infinity its signed area is still
// positive, so only the finite check refuses it; at NaN the row guards the schema's own refusal,
// since valibot's number() rejects NaN before the finite check runs.
const triangleTo = (x: number) => [
  {
    outer: [
      { x: 0, y: -1 },
      { x, y: 0 },
      { x: 0, y: 1 },
    ],
    holes: [],
  },
]

const REFUSED = 'The slot space is not well-formed polygon regions.'

// aBlueprintDeclaration's parts lane declares the one slot-space output, named for its role.
function convert(value: unknown) {
  return partsLaneCalls(aBlueprintDeclaration()).convertHandle('slot-space', value, {} as never)
}

describe("the parts lane's slot space check", () => {
  it('accepts well-formed regions as they are', () => {
    expectResult(convert(L_SHAPE), Result.ok(L_SHAPE))
  })

  it.each([
    ['a clockwise square', CLOCKWISE_SQUARE],
    ['a point at x Infinity', triangleTo(Infinity)],
    ['a point at x NaN', triangleTo(NaN)],
    ['no regions', []],
    ['not regions', { w: 18, h: 18 }],
  ])('refuses %s', (_role, value) => {
    expectResult(convert(value), Result.err(REFUSED))
  })

  it('passes any other output through unchecked', () => {
    const value = { w: 18, h: 18 }

    expectResult(
      partsLaneCalls(aBlueprintDeclaration()).convertHandle('other', value, {} as never),
      Result.ok(value),
    )
  })
})
