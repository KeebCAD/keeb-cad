import type { PolygonRegion } from '@keeb-cad/schema'

import { valueAt } from '../packed-column/value-at'
import type { PolygonRegionColumns } from './types'

// Each row's loops, outer then holes per region, as start offsets into flat data.
export function packPolygonRegions(
  rows: readonly (readonly PolygonRegion[])[],
): PolygonRegionColumns {
  const rowLoops = [0]
  const loopPoints = [0]
  const loopHole: number[] = []
  const points: number[] = []
  const addLoop = (loop: PolygonRegion['outer'], hole: boolean) => {
    for (const { x, y } of loop) points.push(x, y)
    loopPoints.push(points.length / 2)
    loopHole.push(Number(hole))
  }
  for (const regions of rows) {
    for (const { outer, holes } of regions) {
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
export function readPolygonRegions(columns: PolygonRegionColumns, row: number): PolygonRegion[] {
  const regions: PolygonRegion[] = []
  for (
    let loop = valueAt(columns.rowLoops, row);
    loop < valueAt(columns.rowLoops, row + 1);
    loop++
  ) {
    const points = []
    for (
      let point = valueAt(columns.loopPoints, loop);
      point < valueAt(columns.loopPoints, loop + 1);
      point++
    ) {
      points.push({
        x: valueAt(columns.points, 2 * point),
        y: valueAt(columns.points, 2 * point + 1),
      })
    }
    if (valueAt(columns.loopHole, loop) === 0) {
      regions.push({ outer: points, holes: [] })
      continue
    }
    const region = regions.at(-1)
    if (region === undefined) throw new RangeError(`Row ${row}'s first loop is a hole.`)
    region.holes.push(points)
  }
  return regions
}
