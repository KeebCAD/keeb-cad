<script setup lang="ts">
import { injectTabsRootContext, TabsContent } from 'reka-ui'
import { watch } from 'vue'

import type { TabPanelProps } from './types'

const props = defineProps<TabPanelProps>()

// Reka registers a panel's value only when it mounts, so a panel whose value follows the selected
// tab would leave every later tab's aria-controls pointing at nothing.
const root = injectTabsRootContext()
watch(
  () => props.value,
  (value, previous) => {
    root.unregisterContent(previous)
    root.registerContent(value)
  },
)
</script>

<template>
  <TabsContent :value="value">
    <slot />
  </TabsContent>
</template>
