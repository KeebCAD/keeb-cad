<script setup lang="ts">
import { computed } from 'vue'

import { formatNumber } from '../format/format-number'
import type { SeverityCountProps } from './types'

const props = defineProps<SeverityCountProps>()

const isError = computed(() => props.severity === 'error')
// The space is part of the text, so the element reads `0 errors` to a screen reader.
const word = computed(() => ` ${props.severity}${props.count === 1 ? '' : 's'}`)
</script>

<template>
  <span class="inline-flex items-center gap-1 font-mono text-mono tabular-nums">
    <span
      aria-hidden="true"
      :class="[
        dimmed ? 'text-text-muted' : isError ? 'text-error' : 'text-warning',
        isError || dimmed ? undefined : 'glyph-stroke',
      ]"
      >{{ isError ? '●' : '▲' }}</span
    >
    <span :class="dimmed ? 'text-text-muted' : 'text-text'"
      >{{ formatNumber(count, 'none') }}<span class="sr-only">{{ word }}</span></span
    >
  </span>
</template>
