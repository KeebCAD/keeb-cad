import type { Matrix, Point } from '@keeb-cad/geometry'
import type { Id, LayoutOutput, ResolvedParts } from '@keeb-cad/schema'

import type { Rectangle } from '../parts/types'

export interface ReadOffset {
  position: Point
  rotation: number
  pivot: Point
}

// A rectangle placed by a frame, in some group's frame.
export interface PlacedRectangle extends Rectangle {
  frame: Matrix
}

export interface Extent {
  near: number
  far: number
}

export type LayoutRow = LayoutOutput['rows'][number]

export interface ArrangedNode {
  id: Id
  kind: LayoutRow['kind']
  frame: Matrix
  anchor: Matrix
  part: number
  fit: LayoutRow['fit']
  rectangle?: Rectangle
}

export interface Context {
  gap: { x: number; y: number }
  parts: ResolvedParts
}

export interface Previous {
  frame: Matrix
  far: number
}

export interface Step {
  anchor: Matrix
  far: number
}

export interface SlotPart {
  row: number
  fit: LayoutRow['fit']
  rectangle: Rectangle
}
