<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import { computed, useTemplateRef } from 'vue'

import { slotIdLabelMarks } from './slot-id-label-marks'
import type { SlotIdLabelProps } from './types'

const props = defineProps<SlotIdLabelProps>()
const text = useTemplateRef<SVGTextElement>('text')
// The id's drawn width, as the browser lays out JetBrains Mono, so the label fits it.
const { width: textWidth } = useElementSize(text)

const { gap, inset } = slotIdLabelMarks
const width = computed(() => textWidth.value + 2 * inset)
const transform = computed(() => `translate(${props.at.x - width.value / 2}, ${props.at.y + gap})`)
</script>

<template>
  <g role="img" :aria-label="`${placement} id`" pointer-events="none" :transform="transform">
    <rect
      x="0"
      y="0"
      :width="width"
      stroke-width="1"
      class="h-slot-id-label fill-panel"
      :class="grayed ? 'stroke-stale' : 'stroke-key-edge'"
      :style="{ rx: 'var(--radius-sm)' }"
    />
    <text
      ref="text"
      :x="inset"
      dominant-baseline="central"
      class="font-mono text-canvas-label tabular-nums"
      :class="grayed ? 'fill-stale' : 'fill-text'"
      :style="{ transform: 'translateY(calc(var(--spacing-slot-id-label) / 2))' }"
    >
      {{ id }}
    </text>
  </g>
</template>
