import type { Matrix, Point } from '@keeb-cad/geometry'
import type { Id, LayoutOutput, ResolvedParts } from '@keeb-cad/schema'

import type { DependencyGraph } from '../dependencies/types'
import type { SlotSpace } from '../parts/types'

export interface ReadOffset {
  position: Point
  rotation: number
  pivot: Point
}

// A slot space placed by a frame, in some group's frame.
export interface PlacedSlotSpace {
  frame: Matrix
  slotSpace: SlotSpace
}

export interface Extent {
  near: number
  far: number
}

export type LayoutRow = LayoutOutput['rows'][number]

// What placement reads, the same for every node of one layout.
export interface Placing {
  graph: DependencyGraph
  // Each evaluated quantity field, by valueKey.
  values: ReadonlyMap<string, number>
  gap: { x: number; y: number }
  parts: ResolvedParts
  // The placed nodes, each after its dependency.
  order: readonly Id[]
}

// A node's anchor frame and frame, relative to some group.
export interface RelativeFrame {
  anchor: Matrix
  frame: Matrix
}

export type RelativeFrames = ReadonlyMap<Id, RelativeFrame>

// Each group's own relative frames, by group id.
export type GroupFrames = ReadonlyMap<Id, RelativeFrames>

export interface SlotPart {
  row: number
  fit: LayoutRow['fit']
  slotSpace: SlotSpace
}
