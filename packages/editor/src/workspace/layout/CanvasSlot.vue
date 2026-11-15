<script setup lang="ts">
import { sideOf } from '@keeb-cad/model/main'
import { UiCanvasToggle } from '@keeb-cad/ui'
import { computed, useTemplateRef } from 'vue'

import { useHoveredNode } from '../../hover/use-hovered-node'
import { useSelection } from '../../selection/use-selection'
import { useCanvasItem } from '../../viewport/use-canvas-item'
import { keycapProportions } from './keycap-proportions'
import type { CanvasSlotProps } from './types'

const props = defineProps<CanvasSlotProps>()
const { ids, select } = useSelection()
const { pointAt, leave } = useHoveredNode()
const body = useTemplateRef<SVGRectElement>('body')
useCanvasItem(() => props.placed.key, body)

const selected = computed(() => ids.value.includes(props.placed.key))
const fitted = computed(() => props.placed.fit === 'fitted')
// The right half is derived, so its fills are paler until selected; edges keep their contrast.
const dimmed = computed(
  () => sideOf(props.placed.key) === 'right' && !selected.value && !props.grayed,
)
const placement = computed(() => {
  const { x, y, rot, mirrored } = props.placed.frame
  return `translate(${x}, ${y}) rotate(${rot}) scale(${mirrored ? -1 : 1}, 1)`
})
const bodyFill = computed(() => {
  if (!fitted.value) return 'fill-none'
  if (props.grayed) return 'fill-stale'
  return dimmed.value ? 'fill-key-body/right-half-body' : 'fill-key-body'
})
const topFaceFill = computed(() => {
  if (props.grayed) return 'fill-stale'
  return dimmed.value ? 'fill-key-top-face/right-half-body' : 'fill-key-top-face'
})
const marks = computed(() => [
  bodyFill.value,
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
    :label="placed.key"
    :pressed="selected"
    :transform="placement"
    :class="marks"
    :stroke-dasharray="fitted ? undefined : '4 3'"
    @press="select([placed.key])"
    @pointerenter="pointAt(placed.key)"
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
      :class="topFaceFill"
    />
  </UiCanvasToggle>
</template>
