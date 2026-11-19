<script setup lang="ts">
import { sideOf } from '@keeb-cad/model/main'
import { UiCanvasToggle } from '@keeb-cad/ui'
import { computed, type CSSProperties, useTemplateRef } from 'vue'

import { useHoveredNode } from '../../hover/use-hovered-node'
import { useSelection } from '../../selection/use-selection'
import { useCanvasItem } from '../../viewport/use-canvas-item'
import { keycapProportions } from './keycap-proportions'
import { slotSpacePath } from './slot-space-path'
import type { CanvasSlotProps } from './types'

const props = defineProps<CanvasSlotProps>()
const { ids, select } = useSelection()
const { pointAt, leave } = useHoveredNode()
const body = useTemplateRef<SVGPathElement>('body')
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
const path = computed(() => slotSpacePath(props.placed.slotSpace))
// The browser finds the face's box, since a canvas computes no geometry.
const { faceWidth, faceHeight, faceShift } = keycapProportions
const faceStyle: CSSProperties = {
  transformBox: 'fill-box',
  transformOrigin: 'center',
  transform: `translate(0, ${faceShift * 100}%) scale(${faceWidth}, ${faceHeight})`,
}
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
    <path
      ref="body"
      :d="path"
      fill-rule="nonzero"
      :stroke-width="selected ? 2 : 1"
      vector-effect="non-scaling-stroke"
    />
    <path
      v-if="fitted"
      :d="path"
      fill-rule="nonzero"
      stroke="none"
      :style="faceStyle"
      :class="topFaceFill"
    />
  </UiCanvasToggle>
</template>
