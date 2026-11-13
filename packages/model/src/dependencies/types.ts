import type { Anchor, Frozen, Id, Node } from '@keeb-cad/schema'

// The one node a node is placed from: its explicit anchor's target, else its default anchor.
export type Dependency =
  | { kind: 'explicit'; target: Id; anchor: Frozen<Anchor> }
  | { kind: 'previous'; target: Id; axis: 'x' | 'y' }
  | { kind: 'parent'; target: Id }

export interface GraphEntry {
  node: Frozen<Node>
  // Absent on the root alone.
  parent?: Id
  index: number
  // Absent on a root with no explicit anchor.
  dependency?: Dependency
}

export type DependencyGraph = ReadonlyMap<Id, GraphEntry>

export interface AnchorCheck {
  // Each in cycle order from its lowest member by compareId; sorted by that member.
  cycles: Id[][]
  // Nodes whose explicit anchor names a missing id or a node of the wrong kind, by compareId.
  unresolvable: Id[]
  // In or below a cycle or an unresolvable anchor.
  unplaced: ReadonlySet<Id>
}
