import { aLayoutOutput, aLayoutRow, aPartsOutput, aPolygonRegion } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { packLayoutOutput, readLayoutRow } from '../layout-output/layout-output-codec'
import { packPartsOutput, readPartsRow } from '../parts-output/parts-output-codec'
import { buffersOf } from './buffers-of'

const layoutOutput = () =>
  aLayoutOutput({
    ids: ['left/a'],
    rows: [
      aLayoutRow({
        kind: 'group',
        frame: { x: 1, y: 2, rot: 3, mirrored: false },
        part: -1,
        border: [aPolygonRegion({ holes: [[{ x: 0.5, y: 0.5 }]] })],
      }),
    ],
  })

describe('buffersOf', () => {
  it('lists every column of a packed parts output, so a transfer detaches all of them', () => {
    const output = aPartsOutput({
      ids: ['key@a'],
      rows: [[aPolygonRegion({ holes: [[{ x: 0.5, y: 0.5 }]] })]],
    })
    const packed = packPartsOutput(output)

    const clone = structuredClone(packed, { transfer: buffersOf(packed) })

    expect({ ids: clone.ids, rows: [readPartsRow(clone, 0)] }).toEqual(output)
    const { rowLoops, loopPoints, loopHole, points } = packed
    expect([rowLoops, loopPoints, loopHole, points].map(({ length }) => length)).toEqual([
      0, 0, 0, 0,
    ])
  })

  it('lists every column of a packed layout output, so a transfer detaches all of them', () => {
    const output = layoutOutput()
    const packed = packLayoutOutput(output)

    const clone = structuredClone(packed, { transfer: buffersOf(packed) })

    expect({ ids: clone.ids, rows: [readLayoutRow(clone, 0)] }).toEqual(output)
    const { kind, x, y, rot, mirrored, anchorX, anchorY, part, fit, placed } = packed
    const { rowLoops, loopPoints, loopHole, points } = packed
    expect(
      [
        kind,
        x,
        y,
        rot,
        mirrored,
        anchorX,
        anchorY,
        part,
        fit,
        placed,
        rowLoops,
        loopPoints,
        loopHole,
        points,
      ].map(({ length }) => length),
    ).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  })
})
