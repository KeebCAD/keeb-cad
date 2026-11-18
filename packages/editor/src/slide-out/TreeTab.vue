<script setup lang="ts">
import { type TreeRow, UiTree } from '@keeb-cad/ui'
import { onBeforeUnmount } from 'vue'

import { useHoveredNode } from '../hover/use-hovered-node'
import { useLayoutTree } from './use-layout-tree'
import { useTreeSelection } from './use-tree-selection'

const rows = useLayoutTree()
const { selected, select } = useTreeSelection()
const { pointAtTreeGroup, leave, clearTreeHover } = useHoveredNode()

// Only a hover its rows set, so a key's border under the pointer stays.
onBeforeUnmount(() => {
  clearTreeHover()
})

// A slot's row points at no group (EXPERIENCE.md Left rail: only a group row shows a border).
function hover(row: TreeRow): void {
  if (row.kind === 'group') pointAtTreeGroup(row.id)
  else leave()
}
</script>

<template>
  <UiTree
    v-if="rows.length > 0"
    label="Layout"
    :rows="rows"
    :selected="selected"
    @update:selected="select"
    @hover="hover"
    @leave="leave"
  />
</template>
