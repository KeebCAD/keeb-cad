import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { layoutOutputSchema } from './layout-output'

const outputWith = (
  frame: Record<'x' | 'y' | 'rot', unknown>,
  anchorAt: Record<'x' | 'y', unknown>,
) => ({
  ids: ['left/a'],
  rows: [
    {
      kind: 'slot',
      frame: { ...frame, mirrored: false },
      anchorAt,
      part: 0,
      fit: 'fitted',
      placed: true,
    },
  ],
})

describe('layoutOutputSchema', () => {
  it.each([
    [
      'an unplaced row, frame and anchorAt all NaN',
      { x: NaN, y: NaN, rot: NaN },
      { x: NaN, y: NaN },
    ],
    ['a placed row, frame and anchorAt all finite', { x: 1, y: 2, rot: 3 }, { x: 4, y: 5 }],
  ])('accepts %s', (_role, frame, anchorAt) => {
    expect(v.safeParse(layoutOutputSchema, outputWith(frame, anchorAt)).issues).toBeUndefined()
  })

  it('refuses a frame x that is not a number', () => {
    const output = outputWith({ x: 'a', y: 0, rot: 0 }, { x: 0, y: 0 })

    expect(v.safeParse(layoutOutputSchema, output).success).toBe(false)
  })
})
