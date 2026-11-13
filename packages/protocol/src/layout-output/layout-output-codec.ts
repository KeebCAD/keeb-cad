import type { LayoutOutput } from '@keeb-cad/schema'

import { valueAt } from '../packed-column/value-at'
import { fitCodes, kindCodes } from './layout-codes'
import { optionOfCode } from './option-of-code'
import type { BorderColumns, LayoutRow, PackedLayoutOutput } from './types'

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
    ...packBorders(rows),
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
    border: readBorder(packed, row),
  }
}

// Each row's loops, outer then holes per region, as start offsets into flat data.
function packBorders(rows: readonly LayoutRow[]): BorderColumns {
  const rowLoops = [0]
  const loopPoints = [0]
  const loopHole: number[] = []
  const points: number[] = []
  const addLoop = (loop: LayoutRow['border'][number]['outer'], hole: boolean) => {
    for (const { x, y } of loop) points.push(x, y)
    loopPoints.push(points.length / 2)
    loopHole.push(Number(hole))
  }
  for (const { border } of rows) {
    for (const { outer, holes } of border) {
      addLoop(outer, false)
      for (const hole of holes) addLoop(hole, true)
    }
    rowLoops.push(loopHole.length)
  }
  return {
    rowLoops: Uint32Array.from(rowLoops),
    loopPoints: Uint32Array.from(loopPoints),
    loopHole: Uint8Array.from(loopHole),
    points: Float64Array.from(points),
  }
}

// A loop that is not a hole opens a region; each hole joins the region before it.
function readBorder(packed: PackedLayoutOutput, row: number): LayoutRow['border'] {
  const border: LayoutRow['border'] = []
  for (let loop = valueAt(packed.rowLoops, row); loop < valueAt(packed.rowLoops, row + 1); loop++) {
    const points = []
    for (
      let point = valueAt(packed.loopPoints, loop);
      point < valueAt(packed.loopPoints, loop + 1);
      point++
    ) {
      points.push({
        x: valueAt(packed.points, 2 * point),
        y: valueAt(packed.points, 2 * point + 1),
      })
    }
    if (valueAt(packed.loopHole, loop) === 0) {
      border.push({ outer: points, holes: [] })
      continue
    }
    const region = border.at(-1)
    if (region === undefined) throw new RangeError(`Row ${row}'s first loop is a hole.`)
    region.holes.push(points)
  }
  return border
}
