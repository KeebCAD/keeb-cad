import type { LayoutOutput } from '@keeb-cad/schema'
import { aLayoutOutput } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { packLayoutOutput, readLayoutRow } from './layout-output-codec'
import type { LayoutRow, PackedLayoutOutput } from './types'

const SLOT: LayoutRow = {
  kind: 'slot',
  frame: { x: 0, y: 19, rot: 0, mirrored: false },
  anchorAt: { x: 0, y: 19 },
  part: 0,
  fit: 'fitted',
  placed: true,
}

const GROUP: LayoutRow = {
  kind: 'group',
  frame: { x: -3.5, y: 2, rot: 15, mirrored: true },
  anchorAt: { x: 1, y: -2 },
  part: -1,
  fit: 'empty',
  placed: true,
}

const STAND_IN: LayoutRow = {
  kind: 'slot',
  frame: { x: 40, y: 0, rot: -90, mirrored: true },
  anchorAt: { x: 0, y: 0 },
  part: 2,
  fit: 'stand-in',
  placed: true,
}

function roundTrip(output: LayoutOutput): LayoutOutput {
  const packed = packLayoutOutput(output)
  return { ids: packed.ids, rows: packed.ids.map((_id, row) => readLayoutRow(packed, row)) }
}

describe('the layout output codec', () => {
  it.each([
    ['no rows', aLayoutOutput()],
    ['one row', aLayoutOutput({ ids: ['left/a'], rows: [SLOT] })],
    [
      'three rows of both kinds, every fit and mirrored both ways',
      aLayoutOutput({ ids: ['left/a', 'left/b', 'left/c'], rows: [SLOT, GROUP, STAND_IN] }),
    ],
  ])('reads back %s as packed', (_role, output) => {
    expect(roundTrip(output)).toEqual(output)
  })

  it('reads back an unplaced row with no frame or anchor as NaN', () => {
    const unplaced: LayoutRow = {
      ...SLOT,
      frame: { x: NaN, y: NaN, rot: NaN, mirrored: false },
      anchorAt: { x: NaN, y: NaN },
      placed: false,
    }
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
    })
  })
})
