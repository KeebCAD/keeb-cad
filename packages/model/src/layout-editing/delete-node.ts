import type { Design, Id, Mutable, Rejection } from '@keeb-cad/schema'

import { reject } from '../reject/reject'
import { findNode } from './node-tree'

// Refuses the whole list on any bad id, so a stale request deletes nothing.
export function deleteNode(design: Mutable<Design>, ids: readonly Id[]): void | Rejection {
  const root = design.layout.id
  if (ids.includes(root)) {
    return reject('root-required', [root], `The root group "${root}" can't be deleted.`)
  }
  const missing = ids.filter((id) => findNode(design.layout, id) === undefined)
  if (missing.length > 0) {
    const named = missing.map((id) => `"${id}"`).join(', ')
    return reject('unknown-target', missing, `The design has no node with the id ${named}.`)
  }
  for (const id of ids) {
    // A node inside a subtree deleted earlier in the list is already gone.
    const found = findNode(design.layout, id)
    found?.parent?.children.splice(found.index, 1)
  }
}
