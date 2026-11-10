import type { Frozen, Group, Id, Mutable, Node } from '@keeb-cad/schema'

import type { Found } from './types'

export function findNode(root: Mutable<Group>, id: string): Found | undefined {
  if (root.id === id) return { node: root, parent: undefined, index: 0 }
  const search = (group: Mutable<Group>): Found | undefined => {
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

export function isGroup<N extends { readonly id: Id }>(
  node: N,
): node is Extract<N, { readonly arrangement: unknown }> {
  return 'arrangement' in node
}

export function subtreeIds(node: Frozen<Node>): Id[] {
  return isGroup(node) ? [node.id, ...node.children.flatMap(subtreeIds)] : [node.id]
}
