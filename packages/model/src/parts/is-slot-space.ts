import { isWellFormed } from '@keeb-cad/geometry'
import { polygonRegionSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

import type { SlotSpace } from './types'

const regionsSchema = v.array(polygonRegionSchema)

// The schema's numbers take Infinity, which no shape may hold.
export function isSlotSpace(value: unknown): value is SlotSpace {
  return (
    v.is(regionsSchema, value) &&
    value.every(({ outer, holes }) =>
      [outer, ...holes].every((loop) =>
        loop.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)),
      ),
    ) &&
    isWellFormed(value)
  )
}
