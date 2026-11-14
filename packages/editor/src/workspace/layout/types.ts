import type { LayoutRow } from '@keeb-cad/protocol'
import type { Id } from '@keeb-cad/schema'

import type { GroupBorderShown } from '../../group-border/types'
import type { Point } from '../../viewport/types'

type PlacedCommon = {
  id: Id
  // The side-qualified row id, unique once both halves are posted.
  key: string
  frame: LayoutRow['frame']
  anchorAt: Point
}

export type PlacedSlot = PlacedCommon & {
  kind: 'slot'
  w: number
  h: number
  fit: LayoutRow['fit']
}

export type PlacedGroup = PlacedCommon & { kind: 'group'; border: LayoutRow['border'] }

export type PlacedNode = PlacedSlot | PlacedGroup

export type CanvasSlotProps = { placed: PlacedSlot; grayed: boolean }

export type AnchorLinkProps = { from: Point; to: Point; grayed: boolean }

// A shown group's tab and, for an empty group, its origin, in screen px.
export type GroupMarksAt = {
  id: Id
  key: string
  shown: Exclude<GroupBorderShown, 'none'>
  origin: Point | undefined
  tab: Point
}
