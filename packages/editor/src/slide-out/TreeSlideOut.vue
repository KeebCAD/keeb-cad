<script setup lang="ts">
import { type TreeRow, UiTree } from '@keeb-cad/ui'
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

import { useHoveredNode } from '../hover/use-hovered-node'
import { useLandmark } from '../landmarks/use-landmark'
import { useLayoutTree } from './use-layout-tree'
import { useSlideOut } from './use-slide-out'
import { useTreeSelection } from './use-tree-selection'

const root = useTemplateRef<HTMLElement>('root')
const { returnFocus } = useSlideOut()
const rows = useLayoutTree()
const { selected, select } = useTreeSelection()
const { pointAtTreeGroup, leave, clearTreeHover } = useHoveredNode()
useLandmark('slide-out', root)

// Its first meaningful item: the selected row, else the first row, else, empty, the root itself.
onMounted(() => {
  const target =
    root.value?.querySelector<HTMLElement>('[role="treeitem"][aria-selected="true"]') ??
    root.value?.querySelector<HTMLElement>('[role="treeitem"]') ??
    root.value
  target?.focus()
})
onBeforeUnmount(() => {
  // Only a hover its rows set, so a key's border under the pointer stays.
  clearTreeHover()
  returnFocus(root.value)
})

// A slot's row points at no group (EXPERIENCE.md Left rail: only a group row shows a border).
function hover(row: TreeRow): void {
  if (row.kind === 'group') pointAtTreeGroup(row.id)
  else leave()
}
</script>

<template>
  <aside
    ref="root"
    tabindex="-1"
    aria-label="Tree"
    class="w-slide-out-width overflow-y-auto rounded-r-lg bg-chrome shadow-overlay focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
  >
    <UiTree
      v-if="rows.length > 0"
      label="Layout"
      :rows="rows"
      :selected="selected"
      @update:selected="select"
      @hover="hover"
      @leave="leave"
    />
  </aside>
</template>
