import type { PartsOutput } from '@keeb-cad/schema'
import { aPartsOutput, aPolygonRegion, aSlotSpace } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { packPartsOutput, readPartsRow } from './parts-output-codec'

function roundTrip(output: PartsOutput): PartsOutput {
  const packed = packPartsOutput(output)
  return { ids: packed.ids, rows: packed.ids.map((_id, row) => readPartsRow(packed, row)) }
}

describe('the parts output codec', () => {
  it.each([
    ['no rows', aPartsOutput({ ids: [], rows: [] })],
    ['one row', aPartsOutput({ ids: ['key@a'], rows: [aSlotSpace({ width: 18, height: 17 })] })],
    [
      'three rows, one with a holed region beside another',
      aPartsOutput({
        ids: ['abe@a', 'key@a', 'stand-in'],
        rows: [
          aSlotSpace({ width: 10 }),
          [
            aPolygonRegion({
              holes: [
                [
                  { x: 0.25, y: 0.25 },
                  { x: 0.25, y: 0.5 },
                  { x: 0.5, y: 0.5 },
                ],
              ],
            }),
            aPolygonRegion({
              outer: [
                { x: 5, y: 0 },
                { x: 6, y: 0 },
                { x: 22.728, y: 0.001 },
              ],
            }),
          ],
          aSlotSpace(),
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

    const shared = (column: 'rowLoops' | 'loopPoints' | 'loopHole' | 'points') =>
      first[column].buffer === second[column].buffer
    expect({
      rowLoops: shared('rowLoops'),
      loopPoints: shared('loopPoints'),
      loopHole: shared('loopHole'),
      points: shared('points'),
    }).toEqual({ rowLoops: false, loopPoints: false, loopHole: false, points: false })
  })
})
