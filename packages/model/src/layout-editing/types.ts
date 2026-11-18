import type {
  Anchor,
  Angle,
  ChainGroup,
  Delta,
  Group,
  Id,
  Length,
  Mutable,
  Node,
} from '@keeb-cad/schema'

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never

export type NewNode = WithoutId<Mutable<Node>> & { id?: Id }

export interface InsertAt {
  parent?: Id
  index?: number
}

export interface Found {
  node: Mutable<Node>
  parent: Mutable<Group> | undefined
  index: number
}

// The gap axes an edit sets; an axis it leaves out keeps its value.
export interface GapEdit {
  x?: Length
  y?: Length
}

// The axes of a position or pivot an edit sets; an axis it leaves out keeps its value.
export interface Vec2Edit {
  x?: Delta
  y?: Delta
}

// The offset fields an edit sets on each node; null clears one, and a field left out keeps its
// value.
export interface OffsetEdit {
  position?: Vec2Edit | null
  rotation?: Angle | null
  pivot?: Vec2Edit | null
}

export type ArrangementEdit = { arrangement: 'chain'; axis: 'x' | 'y' } | { arrangement: 'free' }

// A group read as either arrangement, so it can change arrangement in place.
export interface ArrangeableGroup {
  arrangement: Group['arrangement']
  axis?: ChainGroup['axis']
  children: { anchor?: Anchor }[]
}
