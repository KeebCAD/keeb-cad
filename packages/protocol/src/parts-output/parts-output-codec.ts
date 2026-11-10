import type { PartsOutput } from '@keeb-cad/schema'

import { valueAt } from '../packed-column/value-at'
import type { PackedPartsOutput, PartsRow } from './types'

export function packPartsOutput({ ids, rows }: PartsOutput): PackedPartsOutput {
  return {
    ids,
    w: Float64Array.from(rows, ({ w }) => w),
    h: Float64Array.from(rows, ({ h }) => h),
  }
}

export function readPartsRow(packed: PackedPartsOutput, row: number): PartsRow {
  return { w: valueAt(packed.w, row), h: valueAt(packed.h, row) }
}
