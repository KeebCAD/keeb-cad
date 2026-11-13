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
} & BorderColumns

// The rows' borders: row i's loops are rowLoops[i] to rowLoops[i + 1], loop j's points are
// loopPoints[j] to loopPoints[j + 1], and point k is points[2k], points[2k + 1].
export type BorderColumns = {
  rowLoops: Uint32Array<ArrayBuffer>
  loopPoints: Uint32Array<ArrayBuffer>
  loopHole: Uint8Array<ArrayBuffer>
  points: Float64Array<ArrayBuffer>
}

export type LayoutRow = LayoutOutput['rows'][number]
