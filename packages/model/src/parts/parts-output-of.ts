import { compareCodeUnits, type PartsOutput } from '@keeb-cad/schema'

import type { Rectangle } from './types'

export function partsOutputOf(rectangles: ReadonlyMap<string, Rectangle>): PartsOutput {
  const ids = [...rectangles.keys()].toSorted(compareCodeUnits)
  return { ids, rows: ids.map((id) => rectangles.get(id) as Rectangle) }
}
