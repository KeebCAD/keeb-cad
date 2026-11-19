import type { PartsOutput } from '@keeb-cad/schema'

import { packPolygonRegions, readPolygonRegions } from '../polygon-regions/polygon-regions-codec'
import type { PackedPartsOutput, PartsRow } from './types'

export function packPartsOutput({ ids, rows }: PartsOutput): PackedPartsOutput {
  return { ids, ...packPolygonRegions(rows) }
}

export function readPartsRow(packed: PackedPartsOutput, row: number): PartsRow {
  return readPolygonRegions(packed, row)
}
