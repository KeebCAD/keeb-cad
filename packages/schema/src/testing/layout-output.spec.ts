import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { layoutOutputSchema } from '../layout-output'
import { aLayoutOutput } from './layout-output'

describe('aLayoutOutput', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(layoutOutputSchema, aLayoutOutput()).issues).toBeUndefined()
  })

  it.each([
    ['ids', () => ({ ids: ['left/root'] })],
    [
      'rows',
      () => ({
        rows: [
          {
            kind: 'group' as const,
            frame: { x: 1, y: 2, rot: 3, mirrored: false },
            anchorAt: { x: 0, y: 0 },
            part: -1,
            fit: 'fitted' as const,
            placed: true,
          },
        ],
      }),
    ],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aLayoutOutput(fields)).toMatchObject(fields)
  })
})
