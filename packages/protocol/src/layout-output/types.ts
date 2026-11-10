import type { LayoutOutput } from '@keeb-cad/schema'

export type PackedLayoutOutput = {
  ids: string[]
  kind: Uint8Array<ArrayBuffer>
  x: Float64Array<ArrayBuffer>
  y: Float64Array<ArrayBuffer>
  rot: Float64Array<ArrayBuffer>
  mirrored: Uint8Array<ArrayBuffer>
  anchorX: Float64Array<ArrayBuffer>
  anchorY: Float64Array<ArrayBuffer>
  part: Int32Array<ArrayBuffer>
  fit: Uint8Array<ArrayBuffer>
  placed: Uint8Array<ArrayBuffer>
}

export type LayoutRow = LayoutOutput['rows'][number]
