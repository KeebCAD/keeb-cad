import type { PartsOutput } from '@keeb-cad/schema'

import type { PolygonRegionColumns } from '../polygon-regions/types'

export type PackedPartsOutput = { ids: string[] } & PolygonRegionColumns

export type PartsRow = PartsOutput['rows'][number]
