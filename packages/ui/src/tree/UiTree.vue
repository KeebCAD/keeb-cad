<script setup lang="ts">
import { TreeItem, TreeRoot } from 'reka-ui'
import { computed, shallowRef } from 'vue'

import UiIcon from '../icon/UiIcon.vue'
import { findTreeRow, groupIdsOf } from './tree-rows'
import type { TreeProps, TreeRow } from './types'

const props = defineProps<TreeProps>()
const selected = defineModel<readonly string[]>('selected', { required: true })

// Groups start expanded, so a row selected elsewhere is shown; the user's collapses are kept.
const collapsed = shallowRef<readonly string[]>([])
const groupIds = computed(() => groupIdsOf(props.rows))
const expanded = computed<string[]>({
  get: () => groupIds.value.filter((id) => !collapsed.value.includes(id)),
  set: (ids) => {
    collapsed.value = groupIds.value.filter((id) => !ids.includes(id))
  },
})

// Reka selects row objects; the model holds ids.
const current = computed<TreeRow | undefined>({
  get: () => findTreeRow(props.rows, selected.value[0]),
  set: (row) => {
    selected.value = row === undefined ? [] : [row.id]
  },
})

const keyOf = (row: TreeRow): string => row.id
const childrenOf = (row: TreeRow): TreeRow[] | undefined =>
  row.kind === 'group' ? row.children : undefined
</script>

<template>
  <TreeRoot
    v-slot="{ flattenItems }"
    v-model="current"
    v-model:expanded="expanded"
    :items="[...rows]"
    :get-key="keyOf"
    :get-children="childrenOf"
    selection-behavior="replace"
    :aria-label="label"
    class="flex flex-col py-1"
  >
    <TreeItem
      v-for="item in flattenItems"
      :key="item._id"
      v-bind="item.bind"
      :style="{ paddingInlineStart: `${item.level * 12}px` }"
      class="flex h-row cursor-default items-center gap-2 border-l-2 border-transparent pr-3 text-text-muted hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus data-selected:border-selection data-selected:bg-hover data-selected:text-text"
    >
      <UiIcon :name="item.value.kind" />
      <span class="truncate font-mono text-mono">{{ item.value.label }}</span>
    </TreeItem>
  </TreeRoot>
</template>
