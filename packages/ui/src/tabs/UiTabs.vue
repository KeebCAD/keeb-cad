<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

import type { TabsProps } from './types'

defineProps<TabsProps>()
const model = defineModel<string>()
</script>

<template>
  <TabsRoot v-model="model">
    <TabsList class="flex">
      <TabsTrigger
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        class="border-b-2 border-transparent px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus text-ui text-text-muted data-[state=active]:border-selection data-[state=active]:bg-panel data-[state=active]:text-ui-strong data-[state=active]:text-text"
      >
        {{ item.label }}
      </TabsTrigger>
    </TabsList>
    <TabsContent v-for="item in items" :key="item.value" :value="item.value">
      <slot :name="item.value" />
    </TabsContent>
  </TabsRoot>
</template>
