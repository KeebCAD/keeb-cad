<script setup lang="ts">
import { UiKbd, UiTabList } from '@keeb-cad/ui'

import { useWorkspace } from './use-workspace'

const { tabs } = useWorkspace()
</script>

<template>
  <UiTabList :items="tabs">
    <template #hint="{ item }">
      <UiKbd :hotkey="item.hotkey" />
    </template>
  </UiTabList>
</template>
