<script setup lang="ts">
import { reactive } from 'vue'

import type { WidgetCellProps } from './types'

const { state } = defineProps<WidgetCellProps>()

// A v-model state keeps its own value here, so the cell answers to clicks.
const props = reactive<Record<string, unknown>>({ ...state.props })
const onUpdateModelValue = (value: unknown) => {
  props.modelValue = value
}
</script>

<template>
  <component :is="component" v-bind="props" @update:model-value="onUpdateModelValue">
    <template v-for="(slot, slotName) in state.slots" :key="slotName" #[slotName]>
      <component :is="slot" />
    </template>
  </component>
</template>
