<script setup lang="ts">
import { computed } from 'vue'

import { useSelection } from '../selection/use-selection'
import { borderPath } from './border-path'
import type { GroupBorderProps } from './types'
import { useHoveredGroup } from './use-hovered-group'

const props = defineProps<GroupBorderProps>()
const { select } = useSelection()
const { pointAtGroup, leave } = useHoveredGroup()

// Outer loops only: a hole is neither drawn nor hit-tested apart, so it points at the group too.
const paths = computed(() => props.row.outers.map(borderPath))
const stroke = computed(() =>
  props.grayed
    ? 'stroke-stale'
    : props.row.shown === 'selected'
      ? 'stroke-selection'
      : 'stroke-group-border',
)
</script>

<template>
  <path
    v-for="(path, index) in paths"
    :key="`hit-${index}`"
    :d="path"
    aria-hidden="true"
    fill="none"
    pointer-events="fill"
    @pointerenter="pointAtGroup(row.id)"
    @pointerleave="leave"
    @click="select([row.id])"
  />
  <g
    v-if="row.shown !== 'none' && paths.length > 0"
    role="img"
    :aria-label="`${row.id} border`"
    fill="none"
    pointer-events="none"
    stroke-dasharray="5 3"
    :stroke-width="row.shown === 'selected' ? 2 : 1"
    :class="stroke"
  >
    <path
      v-for="(path, index) in paths"
      :key="index"
      :d="path"
      vector-effect="non-scaling-stroke"
    />
  </g>
</template>
