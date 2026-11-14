<script setup lang="ts">
import { UiCanvasToggle } from '@keeb-cad/ui'
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue'

import { useSelection } from '../selection/use-selection'
import { groupBorderMarks } from './group-border-marks'
import type { GroupBorderTabProps } from './types'
import { useHoveredGroup } from './use-hovered-group'

const props = defineProps<GroupBorderTabProps>()
const { select } = useSelection()
const { pointAtGroup, leave } = useHoveredGroup()
const label = useTemplateRef<SVGTextElement>('label')

const { tabLabelInset: inset } = groupBorderMarks
// The label's drawn length, as the browser lays out JetBrains Mono, so the tab fits it.
const labelLength = shallowRef(0)
function measure(): void {
  labelLength.value = label.value?.getComputedTextLength() ?? 0
}
onMounted(() => {
  measure()
  // A label measured before the web font loads is measured again in the font it is drawn in.
  void document.fonts.ready.then(measure)
})
watch(() => props.id, measure, { flush: 'post' })

const selected = computed(() => props.shown === 'selected')
const tab = computed(() => {
  if (selected.value) return props.grayed ? 'fill-stale stroke-none' : 'fill-selection stroke-none'
  return props.grayed ? 'fill-canvas stroke-stale' : 'fill-canvas stroke-group-border'
})
const text = computed(() => {
  if (selected.value) return 'fill-key-legend'
  return props.grayed ? 'fill-stale' : 'fill-text'
})
</script>

<template>
  <UiCanvasToggle
    :label="id"
    :pressed="selected"
    :transform="`translate(${at.x}, ${at.y})`"
    @press="select([id])"
    @pointerenter="pointAtGroup(id)"
    @pointerleave="leave"
  >
    <!-- The tab sits on its bottom-left corner, so it rises one tab height above it. -->
    <rect
      x="0"
      :width="labelLength + 2 * inset"
      stroke-width="1"
      class="h-group-border-tab"
      :class="tab"
      :style="{ y: 'calc(-1 * var(--spacing-group-border-tab))', rx: 'var(--radius-sm)' }"
    />
    <text
      ref="label"
      :x="inset"
      dominant-baseline="central"
      class="font-mono text-canvas-label"
      :class="text"
      :style="{ transform: 'translateY(calc(var(--spacing-group-border-tab) / -2))' }"
    >
      ⠿ {{ id }}
    </text>
  </UiCanvasToggle>
</template>
