import type { PartsOutput } from '@keeb-cad/schema'

export type PackedPartsOutput = {
  ids: string[]
  w: Float64Array<ArrayBuffer>
  h: Float64Array<ArrayBuffer>
}

export type PartsRow = PartsOutput['rows'][number]
