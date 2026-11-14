import type { Frozen, Group, SideId } from '@keeb-cad/schema'

import { nodeIdOf } from '../ids/side-qualified-id'
import { findNode, isGroup } from '../layout-editing/node-tree'

// A target resolves to the authored slot after its side prefix; a group or a missing id doesn't.
export function resolvesToSlot(layout: Frozen<Group>, target: SideId): boolean {
  const found = findNode(layout, nodeIdOf(target))
  return found !== undefined && !isGroup(found.node)
}
