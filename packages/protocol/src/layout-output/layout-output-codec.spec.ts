import type { LayoutOutput } from '@keeb-cad/schema'
import { aBorder, aBorderRegion, aLayoutOutput, aLayoutRow } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { packLayoutOutput, readLayoutRow } from './layout-output-codec'
import type { PackedLayoutOutput } from './types'

const SLOT = aLayoutRow({
  frame: { x: 0, y: 19, rot: 0, mirrored: false },
  anchorAt: { x: 0, y: 19 },
})

const GROUP = aLayoutRow({
  kind: 'group',
  frame: { x: -3.5, y: 2, rot: 15, mirrored: true },
  anchorAt: { x: 1, y: -2 },
  part: -1,
  fit: 'empty',
})

const STAND_IN = aLayoutRow({
  frame: { x: 40, y: 0, rot: -90, mirrored: true },
  part: 2,
  fit: 'stand-in',
})

// A slot turned 90 deg about the pivot (9, 0) in its own frame.
const PIVOTED = aLayoutRow({ frame: { x: 9, y: -9, rot: 90, mirrored: false } })

const TWO_REGIONS_ONE_HOLED = aBorder([
  aBorderRegion({
    outer: [
      { x: -10.5, y: -10.5 },
      { x: 10.5, y: -10.5 },
      { x: 10.5, y: 10.5 },
      { x: -10.5, y: 10.5 },
    ],
    holes: [
      [
        { x: -1, y: -1 },
        { x: -1, y: 1 },
        { x: 1, y: 1 },
      ],
    ],
  }),
  aBorderRegion({
    outer: [
      { x: 30, y: -10 },
      { x: 50, y: -10 },
      { x: 40, y: 10.25 },
    ],
  }),
])

function roundTrip(output: LayoutOutput): LayoutOutput {
  const packed = packLayoutOutput(output)
  return { ids: packed.ids, rows: packed.ids.map((_id, row) => readLayoutRow(packed, row)) }
}

describe('the layout output codec', () => {
  it.each([
    ['no rows', aLayoutOutput()],
    ['one row', aLayoutOutput({ ids: ['left/a'], rows: [SLOT] })],
    ['a row turned about a pivot', aLayoutOutput({ ids: ['left/a'], rows: [PIVOTED] })],
    [
      'three rows of both kinds, every fit and mirrored both ways',
      aLayoutOutput({ ids: ['left/a', 'left/b', 'left/c'], rows: [SLOT, GROUP, STAND_IN] }),
    ],
  ])('reads back %s as packed', (_role, output) => {
    expect(roundTrip(output)).toEqual(output)
  })

  it('reads back an unplaced row with no frame or anchor as NaN', () => {
    const unplaced = aLayoutRow({
      frame: { x: NaN, y: NaN, rot: NaN, mirrored: false },
      anchorAt: { x: NaN, y: NaN },
      placed: false,
    })
    const output = aLayoutOutput({ ids: ['left/a'], rows: [unplaced] })

    expect(roundTrip(output)).toEqual(output)
  })

  it("keeps a frame value's every digit and a group's part of -1", () => {
    const expectedX = 22.728
    const expectedPart = -1
    const output = aLayoutOutput({
      ids: ['left/a'],
      rows: [{ ...GROUP, frame: { ...GROUP.frame, x: expectedX }, part: expectedPart }],
    })

    expect(roundTrip(output)).toEqual(output)
  })

  it('packs into new buffers on every call', () => {
    const output = aLayoutOutput({ ids: ['left/a'], rows: [SLOT] })

    const first = packLayoutOutput(output)
    const second = packLayoutOutput(output)

    const shared = (column: keyof Omit<PackedLayoutOutput, 'ids'>) =>
      first[column].buffer === second[column].buffer
    expect({
      kind: shared('kind'),
      x: shared('x'),
      y: shared('y'),
      rot: shared('rot'),
      mirrored: shared('mirrored'),
      anchorX: shared('anchorX'),
      anchorY: shared('anchorY'),
      part: shared('part'),
      fit: shared('fit'),
      placed: shared('placed'),
      rowLoops: shared('rowLoops'),
      loopPoints: shared('loopPoints'),
      loopHole: shared('loopHole'),
      points: shared('points'),
    }).toEqual({
      kind: false,
      x: false,
      y: false,
      rot: false,
      mirrored: false,
      anchorX: false,
      anchorY: false,
      part: false,
      fit: false,
      placed: false,
      rowLoops: false,
      loopPoints: false,
      loopHole: false,
      points: false,
    })
  })

  it('reads back a group border of two regions, one with a hole, between slots with none', () => {
    const output = aLayoutOutput({
      ids: ['left/a', 'left/b', 'left/c'],
      rows: [SLOT, aLayoutRow({ ...GROUP, border: TWO_REGIONS_ONE_HOLED }), STAND_IN],
    })

    expect(roundTrip(output)).toEqual(output)
  })

  it('packs rows with no border into empty border columns and reads them back unchanged', () => {
    const output = aLayoutOutput({ ids: ['left/a', 'left/b'], rows: [SLOT, GROUP] })

    const { rowLoops, loopPoints, loopHole, points } = packLayoutOutput(output)

    expect({
      rowLoops: [...rowLoops],
      loopPoints: [...loopPoints],
      loopHole: [...loopHole],
      points: [...points],
      rows: roundTrip(output),
    }).toEqual({ rowLoops: [0, 0, 0], loopPoints: [0], loopHole: [], points: [], rows: output })
  })

  it('packs an output of no rows into one offset per border column', () => {
    const { rowLoops, loopPoints } = packLayoutOutput(aLayoutOutput())

    expect({ rowLoops: [...rowLoops], loopPoints: [...loopPoints] }).toEqual({
      rowLoops: [0],
      loopPoints: [0],
    })
  })
})
