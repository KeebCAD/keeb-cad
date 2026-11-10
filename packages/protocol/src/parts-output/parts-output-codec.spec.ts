import type { PartsOutput } from '@keeb-cad/schema'
import { aPartsOutput } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { packPartsOutput, readPartsRow } from './parts-output-codec'

function roundTrip(output: PartsOutput): PartsOutput {
  const packed = packPartsOutput(output)
  return { ids: packed.ids, rows: packed.ids.map((_id, row) => readPartsRow(packed, row)) }
}

describe('the parts output codec', () => {
  it.each([
    ['no rows', aPartsOutput({ ids: [], rows: [] })],
    ['one row', aPartsOutput({ ids: ['key@a'], rows: [{ w: 18, h: 17 }] })],
    [
      'three rows',
      aPartsOutput({
        ids: ['abe@a', 'key@a', 'stand-in'],
        rows: [
          { w: 10, h: 18 },
          { w: 22.728, h: 0.001 },
          { w: 18, h: 18 },
        ],
      }),
    ],
  ])('reads back %s as packed', (_role, output) => {
    expect(roundTrip(output)).toEqual(output)
  })

  it('packs into new buffers on every call', () => {
    const output = aPartsOutput()

    const first = packPartsOutput(output)
    const second = packPartsOutput(output)

    expect(first.w.buffer).not.toBe(second.w.buffer)
    expect(first.h.buffer).not.toBe(second.h.buffer)
  })
})
