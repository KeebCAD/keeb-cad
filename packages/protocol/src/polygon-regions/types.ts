// Rows of polygon regions: row i's loops are rowLoops[i] to rowLoops[i + 1], loop j's points are
// loopPoints[j] to loopPoints[j + 1], and point k is points[2k], points[2k + 1].
export type PolygonRegionColumns = {
  rowLoops: Uint32Array<ArrayBuffer>
  loopPoints: Uint32Array<ArrayBuffer>
  loopHole: Uint8Array<ArrayBuffer>
  points: Float64Array<ArrayBuffer>
}
