import type { LayoutOutput } from '@keeb-cad/schema'

import { valueAt } from '../packed-column/value-at'
import { fitCodes, kindCodes } from './layout-codes'
import { optionOfCode } from './option-of-code'
import type { LayoutRow, PackedLayoutOutput } from './types'

export function packLayoutOutput({ ids, rows }: LayoutOutput): PackedLayoutOutput {
  return {
    ids,
    kind: Uint8Array.from(rows, ({ kind }) => kindCodes[kind]),
    x: Float64Array.from(rows, ({ frame }) => frame.x),
    y: Float64Array.from(rows, ({ frame }) => frame.y),
    rot: Float64Array.from(rows, ({ frame }) => frame.rot),
    mirrored: Uint8Array.from(rows, ({ frame }) => Number(frame.mirrored)),
    anchorX: Float64Array.from(rows, ({ anchorAt }) => anchorAt.x),
    anchorY: Float64Array.from(rows, ({ anchorAt }) => anchorAt.y),
    part: Int32Array.from(rows, ({ part }) => part),
    fit: Uint8Array.from(rows, ({ fit }) => fitCodes[fit]),
    placed: Uint8Array.from(rows, ({ placed }) => Number(placed)),
  }
}

export function readLayoutRow(packed: PackedLayoutOutput, row: number): LayoutRow {
  return {
    kind: optionOfCode(kindCodes, valueAt(packed.kind, row)),
    frame: {
      x: valueAt(packed.x, row),
      y: valueAt(packed.y, row),
      rot: valueAt(packed.rot, row),
      mirrored: valueAt(packed.mirrored, row) === 1,
    },
    anchorAt: { x: valueAt(packed.anchorX, row), y: valueAt(packed.anchorY, row) },
    part: valueAt(packed.part, row),
    fit: optionOfCode(fitCodes, valueAt(packed.fit, row)),
    placed: valueAt(packed.placed, row) === 1,
  }
}
