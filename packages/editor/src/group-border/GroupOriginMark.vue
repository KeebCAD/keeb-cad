<script setup lang="ts">
import { computed } from 'vue'

import { groupBorderMarks } from './group-border-marks'
import type { GroupOriginMarkProps } from './types'

const props = defineProps<GroupOriginMarkProps>()

const { originRadius: r, originCross: arm } = groupBorderMarks
const stroke = computed(() =>
  props.grayed
    ? 'stroke-stale'
    : props.shown === 'selected'
      ? 'stroke-selection'
      : 'stroke-group-border',
)
</script>

<template>
  <g
    role="img"
    :aria-label="`${id} origin`"
    fill="none"
    pointer-events="none"
    :stroke-width="shown === 'selected' ? 2 : 1"
    :class="stroke"
  >
    <circle :cx="at.x" :cy="at.y" :r="r" />
    <line :x1="at.x - arm" :y1="at.y" :x2="at.x + arm" :y2="at.y" />
    <line :x1="at.x" :y1="at.y - arm" :x2="at.x" :y2="at.y + arm" />
  </g>
</template>
