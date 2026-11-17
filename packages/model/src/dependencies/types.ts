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
  // From the design root: ['layout'] for the root, then 'children' and an index per level.
  path: (string | number)[]
  // Absent on a root with no explicit anchor.
  dependency?: Dependency
}

export type DependencyGraph = ReadonlyMap<Id, GraphEntry>

// Each item with the items it reads: a node's list holds the one node it is placed from, when that
// resolves; a parameter's the names its value uses.
export type Dependencies<T extends string> = ReadonlyMap<T, readonly T[]>

export interface AnchorCheck {
  // Each in cycle order from its lowest member by compareCodeUnits; sorted by that member.
  cycles: Id[][]
  // Nodes whose explicit anchor names a missing id or a node of the wrong kind, by
  // compareCodeUnits.
  unresolvable: Id[]
  // In or below a cycle or an unresolvable anchor.
  unplaced: ReadonlySet<Id>
}
