import type { LayoutRow, PartsRow } from '@keeb-cad/protocol'
import type { Id, PlacementId } from '@keeb-cad/schema'

import type { GroupBorderShown } from '../../group-border/types'
import type { Point } from '../../viewport/types'

type PlacedCommon = {
  id: Id
  key: PlacementId
  frame: LayoutRow['frame']
  anchorAt: Point
}

export type PlacedSlot = PlacedCommon & {
  kind: 'slot'
  slotSpace: PartsRow
  fit: LayoutRow['fit']
}

export type PlacedGroup = PlacedCommon & { kind: 'group'; border: LayoutRow['border'] }

export type PlacedNode = PlacedSlot | PlacedGroup

export type CanvasSlotProps = { placed: PlacedSlot; grayed: boolean }

export type AnchorLinkProps = { placement: PlacementId; from: Point; to: Point; grayed: boolean }

// A shown slot's id label; `at` is the bottom middle of the key's drawn bounds, in screen px.
export type SlotIdLabelAt = { key: PlacementId; id: Id; at: Point }

// The label is named by the side's id and reads the authored one.
export type SlotIdLabelProps = { id: Id; placement: PlacementId; at: Point; grayed: boolean }

// A shown group's tab and, for an empty group, its origin, in screen px.
export type GroupMarksAt = {
  id: Id
  key: PlacementId
  shown: Exclude<GroupBorderShown, 'none'>
  origin: Point | undefined
  tab: Point
}
