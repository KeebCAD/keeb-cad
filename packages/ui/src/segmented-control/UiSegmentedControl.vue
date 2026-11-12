<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'

import type { SegmentedControlProps } from './types'

defineProps<SegmentedControlProps>()
const model = defineModel<string>()
</script>

<template>
  <div class="flex items-center gap-3">
    <!-- The group carries the name itself, so this would only repeat it. -->
    <span aria-hidden="true" class="text-ui text-text-muted">{{ label }}</span>
    <RadioGroupRoot
      v-model="model"
      :aria-label="label"
      orientation="horizontal"
      class="inline-flex overflow-hidden rounded-md border border-border-interactive"
    >
      <RadioGroupItem
        v-for="option in options"
        v-slot="{ checked }"
        :key="option.value"
        :value="option.value"
        class="inline-flex min-h-target-min items-center gap-1 border-border-interactive px-2 text-ui text-text-muted not-first:border-l hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus data-[state=checked]:bg-fill-on data-[state=checked]:text-text hover:data-[state=checked]:bg-fill-on data-[state=checked]:inset-ring data-[state=checked]:inset-ring-selection"
      >
        <span v-if="checked" aria-hidden="true">✓</span>
        {{ option.label }}
      </RadioGroupItem>
    </RadioGroupRoot>
  </div>
</template>
