import type { Design, Id, Mutable } from '@keeb-cad/schema'

import { subtreeIds } from '../layout-editing/node-tree'

// The design's items: its nodes and design parts. meta.id names the design itself, not an item.
export function itemIds(design: Mutable<Design>): Set<string> {
  return new Set<string>([...subtreeIds(design.layout), ...design.parts.map(({ id }): Id => id)])
}
