<script setup lang="ts">
import { mirrorAxisLengthMm } from './mirror-axis-length'
import type { MirrorAxisProps } from './types'

defineProps<MirrorAxisProps>()
</script>

<template>
  <g
    role="img"
    aria-label="Mirror axis"
    pointer-events="none"
    :transform="`translate(${frame.x}, ${frame.y}) rotate(${frame.rot})`"
  >
    <line
      x1="0"
      :y1="-mirrorAxisLengthMm"
      x2="0"
      :y2="mirrorAxisLengthMm"
      stroke-width="1"
      stroke-dasharray="5 3"
      vector-effect="non-scaling-stroke"
      class="stroke-mirror-axis"
    />
  </g>
</template>
