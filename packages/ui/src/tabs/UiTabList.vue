<script setup lang="ts" generic="Item extends TabItem">
import { TabsList, TabsTrigger } from 'reka-ui'

import type { TabItem, TabListProps, TabListSlots } from './types'

defineProps<TabListProps<Item>>()
const slots = defineSlots<TabListSlots<Item>>()
</script>

<template>
  <TabsList class="flex">
    <TabsTrigger
      v-for="item in items"
      :key="item.value"
      :value="item.value"
      class="flex items-center gap-2 border-b-2 border-transparent px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus text-ui text-text-muted data-[state=active]:border-selection data-[state=active]:bg-panel data-[state=active]:text-ui-strong data-[state=active]:text-text"
    >
      {{ item.label }}
      <!-- The tab is named by its label alone; the hint repeats its shortcut for the eye. -->
      <span v-if="slots.hint" aria-hidden="true" class="flex">
        <slot name="hint" :item="item" />
      </span>
    </TabsTrigger>
  </TabsList>
</template>
