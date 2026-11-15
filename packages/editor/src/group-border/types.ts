import type { LayoutRow } from '@keeb-cad/protocol'
import type { Option } from '@keeb-cad/result'
import type { Id, PlacementId } from '@keeb-cad/schema'

import type { Point } from '../viewport/types'

export type GroupBorderShown = 'selected' | 'hovered' | 'none'

// A placed group row as the canvas draws it, in model mm.
export type GroupBorderRow = {
  id: Id
  key: PlacementId
  frame: LayoutRow['frame']
  outers: readonly (readonly Point[])[]
  // No slot of its design subtree is placed on its side, so it shows an origin mark, not a border.
  empty: boolean
  tabAt: Option<Point>
  shown: GroupBorderShown
}

export type GroupBorderProps = { row: GroupBorderRow; grayed: boolean }

// `at` is the tab's bottom-left corner, in screen px. The tab is named by its side's id and
// reads the authored one.
export type GroupBorderTabProps = {
  id: Id
  placement: PlacementId
  at: Point
  shown: Exclude<GroupBorderShown, 'none'>
  grayed: boolean
}

// `at` is the group's origin, in screen px.
export type GroupOriginMarkProps = {
  placement: PlacementId
  at: Point
  shown: Exclude<GroupBorderShown, 'none'>
  grayed: boolean
}
