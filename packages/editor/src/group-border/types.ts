import type { LayoutRow } from '@keeb-cad/protocol'
import type { Option } from '@keeb-cad/result'
import type { Id } from '@keeb-cad/schema'

import type { Point } from '../viewport/types'

export type GroupBorderShown = 'selected' | 'hovered' | 'none'

// A placed group row as the canvas draws it, in model mm.
export type GroupBorderRow = {
  id: Id
  // The side-qualified row id, unique once both halves are posted.
  key: string
  frame: LayoutRow['frame']
  outers: readonly (readonly Point[])[]
  // No slot of its design subtree is placed on its side, so it shows an origin mark, not a border.
  empty: boolean
  tabAt: Option<Point>
  shown: GroupBorderShown
}

// The surface whose pointer set the hovered group.
export type HoverSource = 'canvas' | 'tree'

export type UseHoveredGroupResult = {
  pointAtGroup: (id: string) => void
  pointAtTreeGroup: (id: string) => void
  pointAtSlot: (slotId: Id) => void
  leave: () => void
  clear: () => void
  clearTreeHover: () => void
}

export type GroupBorderProps = { row: GroupBorderRow; grayed: boolean }

// `at` is the tab's bottom-left corner, in screen px.
export type GroupBorderTabProps = {
  id: Id
  at: Point
  shown: Exclude<GroupBorderShown, 'none'>
  grayed: boolean
}

// `at` is the group's origin, in screen px.
export type GroupOriginMarkProps = {
  id: Id
  at: Point
  shown: Exclude<GroupBorderShown, 'none'>
  grayed: boolean
}
