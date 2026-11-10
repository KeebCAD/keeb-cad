<script setup lang="ts">
import { UiTree } from '@keeb-cad/ui'
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

import { useLandmark } from '../landmarks/use-landmark'
import { useSelection } from '../selection/use-selection'
import { useLayoutTree } from './use-layout-tree'
import { useSlideOut } from './use-slide-out'

const root = useTemplateRef<HTMLElement>('root')
const { returnFocus } = useSlideOut()
const rows = useLayoutTree()
const { ids, select } = useSelection()
useLandmark('slide-out', root)

// Its first meaningful item: the selected row, else the first row, else, empty, the root itself.
onMounted(() => {
  const target =
    root.value?.querySelector<HTMLElement>('[role="treeitem"][aria-selected="true"]') ??
    root.value?.querySelector<HTMLElement>('[role="treeitem"]') ??
    root.value
  target?.focus()
})
onBeforeUnmount(() => returnFocus(root.value))
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
      :selected="ids"
      @update:selected="select"
    />
  </aside>
</template>
