<script setup lang="ts">
import { UiCanvasToggle } from '@keeb-cad/ui'
import { computed, useTemplateRef } from 'vue'

import { useHoveredGroup } from '../../group-border/use-hovered-group'
import { useSelection } from '../../selection/use-selection'
import { useCanvasItem } from '../../viewport/use-canvas-item'
import { keycapProportions } from './keycap-proportions'
import type { CanvasSlotProps } from './types'

const props = defineProps<CanvasSlotProps>()
const { ids, select } = useSelection()
const { pointAtSlot, leave } = useHoveredGroup()
const body = useTemplateRef<SVGRectElement>('body')
useCanvasItem(() => props.placed.id, body)

const selected = computed(() => ids.value.includes(props.placed.id))
const fitted = computed(() => props.placed.fit === 'fitted')
const placement = computed(() => {
  const { x, y, rot, mirrored } = props.placed.frame
  return `translate(${x}, ${y}) rotate(${rot}) scale(${mirrored ? -1 : 1}, 1)`
})
const marks = computed(() => [
  fitted.value ? (props.grayed ? 'fill-stale' : 'fill-key-body') : 'fill-none',
  selected.value
    ? 'stroke-selection'
    : props.grayed
      ? 'stroke-stale'
      : fitted.value
        ? 'stroke-key-edge'
        : 'stroke-key-outline-faint',
])
</script>

<template>
  <!-- Fill, stroke and dashes sit on the group, which the body inherits. -->
  <UiCanvasToggle
    :label="placed.id"
    :pressed="selected"
    :transform="placement"
    :class="marks"
    :stroke-dasharray="fitted ? undefined : '4 3'"
    @press="select([placed.id])"
    @pointerenter="pointAtSlot(placed.id)"
    @pointerleave="leave"
  >
    <rect
      ref="body"
      :x="-placed.w / 2"
      :y="-placed.h / 2"
      :width="placed.w"
      :height="placed.h"
      :stroke-width="selected ? 2 : 1"
      vector-effect="non-scaling-stroke"
    />
    <rect
      v-if="fitted"
      :x="(-placed.w * keycapProportions.faceWidth) / 2"
      :y="placed.h * keycapProportions.faceBottom"
      :width="placed.w * keycapProportions.faceWidth"
      :height="placed.h * keycapProportions.faceHeight"
      stroke="none"
      :class="grayed ? 'fill-stale' : 'fill-key-top-face'"
    />
  </UiCanvasToggle>
</template>
