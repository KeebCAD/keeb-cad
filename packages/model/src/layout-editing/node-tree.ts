import { Option } from '@keeb-cad/result'
import type { Frozen, Group, Id, Mutable, Node } from '@keeb-cad/schema'

import type { Found } from './types'

export function findNode(root: Mutable<Group>, id: string): Found | undefined
export function findNode(root: Frozen<Group>, id: string): Frozen<Found> | undefined
export function findNode(root: Frozen<Group>, id: string): Frozen<Found> | undefined {
  if (root.id === id) return { node: root, parent: undefined, index: 0 }
  const search = (group: Frozen<Group>): Frozen<Found> | undefined => {
    for (const [index, child] of group.children.entries()) {
      if (child.id === id) return { node: child, parent: group, index }
      if (isGroup(child)) {
        const found = search(child)
        if (found !== undefined) return found
      }
    }
    return undefined
  }
  return search(root)
}

export function nextSiblingId(root: Frozen<Group>, id: Id): Option<Id> {
  const found = findNode(root, id)
  return Option.fromNullable(found?.parent?.children[found.index + 1]?.id)
}

export function nearestGroupId(root: Frozen<Group>, id: Id): Option<Id> {
  const found = findNode(root, id)
  if (found === undefined) return Option.none()
  return Option.fromNullable(isGroup(found.node) ? found.node.id : found.parent?.id)
}

export function lastChildId(root: Frozen<Group>, id: Id): Option<Id> {
  const found = findNode(root, id)
  return Option.fromNullable(
    found !== undefined && isGroup(found.node) ? found.node.children.at(-1)?.id : undefined,
  )
}

export function isGroup<N extends { readonly id: Id }>(
  node: N,
): node is Extract<N, { readonly arrangement: unknown }> {
  return 'arrangement' in node
}

export function subtreeIds(node: Frozen<Node>): Id[] {
  return isGroup(node) ? [node.id, ...node.children.flatMap(subtreeIds)] : [node.id]
}

// A node inside another one asked for is already in that one's subtree, so it is not listed twice.
export function subtreeIdsOf(root: Frozen<Node>, ids: readonly Id[]): Id[] {
  const wanted = new Set<string>(ids)
  const walk = (node: Frozen<Node>): Id[] =>
    wanted.has(node.id) ? subtreeIds(node) : isGroup(node) ? node.children.flatMap(walk) : []
  return walk(root)
}
