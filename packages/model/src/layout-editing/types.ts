import type { Group, Id, Mutable, Node } from '@keeb-cad/schema'

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
