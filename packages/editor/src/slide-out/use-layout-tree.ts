import type { Frozen, Node } from '@keeb-cad/schema'
import type { TreeRow } from '@keeb-cad/ui'
import { computed, type ComputedRef } from 'vue'

import { useOpenDesign } from '../design/use-open-design'

// The root's children: the root itself is always there, so it is no row.
export function useLayoutTree(): ComputedRef<TreeRow[]> {
  const openDesign = useOpenDesign()
  return computed(() => openDesign.value?.layout.children.map(rowOf) ?? [])
}

function rowOf(node: Frozen<Node>): TreeRow {
  return 'children' in node
    ? { id: node.id, label: node.id, kind: 'group', children: node.children.map(rowOf) }
    : { id: node.id, label: node.id, kind: 'slot', children: [] }
}
