import { compareCodeUnits, type LayoutOutput } from '@keeb-cad/schema'
import { aLayoutOutput, aLayoutRow, aPolygonRegion } from '@keeb-cad/schema/testing'

import type { Point } from '../viewport/types'
import type { LayoutRowOf } from './types'

const ROOT_ROW = aLayoutRow({ kind: 'group', part: -1 })

// The root and the given rows, in the worker's id order. A key that names its side (`right/c`) is
// kept as given; any other is on the left.
export function layoutOf(rowsById: Readonly<Record<string, LayoutRowOf>>): LayoutOutput {
  const rows = new Map<string, LayoutRowOf>([
    ['left/root', ROOT_ROW],
    ...Object.entries(rowsById).map(([id, row]): [string, LayoutRowOf] => [
      id.includes('/') ? id : `left/${id}`,
      row,
    ]),
  ])
  const ids = [...rows.keys()].toSorted(compareCodeUnits)
  return aLayoutOutput({ ids, rows: ids.map((id) => rows.get(id) ?? ROOT_ROW) })
}

export function keyAt(x: number, y = 0): LayoutRowOf {
  return aLayoutRow({ frame: { x, y, rot: 0, mirrored: false } })
}

// A counter-clockwise rectangle from its bottom-left to its top-right corner, in model mm.
export function rectangle(left: number, bottom: number, right: number, top: number): Point[] {
  return [
    { x: left, y: bottom },
    { x: right, y: bottom },
    { x: right, y: top },
    { x: left, y: top },
  ]
}

export function groupRow(
  outer: Point[],
  holes: Point[][] = [],
  fields: Partial<LayoutRowOf> = {},
): LayoutRowOf {
  return aLayoutRow({
    kind: 'group',
    part: -1,
    border: [aPolygonRegion({ outer, holes })],
    ...fields,
  })
}
