<script setup lang="ts">
import { UiKbd } from '@keeb-cad/ui'
import { useElementSize } from '@vueuse/core'
import { computed, onBeforeUnmount, useTemplateRef, watch } from 'vue'

import { StartAddChainGroup } from '../../add-flow/start-add-chain-group'
import { useOpenDesign } from '../../design/use-open-design'
import GroupBorder from '../../group-border/GroupBorder.vue'
import { groupBorderMarks } from '../../group-border/group-border-marks'
import GroupBorderTab from '../../group-border/GroupBorderTab.vue'
import GroupOriginMark from '../../group-border/GroupOriginMark.vue'
import { useGroupBorders } from '../../group-border/use-group-borders'
import { useHoveredNode } from '../../hover/use-hovered-node'
import MirrorAxis from '../../mirror-axis/MirrorAxis.vue'
import { useMirrorAxis } from '../../mirror-axis/use-mirror-axis'
import { useCanvasItemsRoot } from '../../viewport/use-canvas-items-root'
import { useViewport } from '../../viewport/use-viewport'
import { useViewportControls } from '../../viewport/use-viewport-controls'
import AnchorLink from './AnchorLink.vue'
import CanvasSlot from './CanvasSlot.vue'
import SlotIdLabel from './SlotIdLabel.vue'
import type { GroupMarksAt } from './types'
import { useLayoutSetArrived } from './use-layout-set-arrived'
import { useNewDesignHint } from './use-new-design-hint'
import { usePlacedNodes } from './use-placed-nodes'
import { usePointedAndSelectedNodes } from './use-pointed-and-selected-nodes'
import { useSlotIdLabels } from './use-slot-id-labels'
import { useSwitchGrace } from './use-switch-grace'

const svg = useTemplateRef<SVGSVGElement>('svg')
const keys = useTemplateRef<SVGGElement>('keys')
const { width, height } = useElementSize(svg)
const size = computed(() => ({ width: width.value, height: height.value }))
const openDesign = useOpenDesign()
const placed = usePlacedNodes()
const showsHint = useNewDesignHint(placed)
const grayed = useSwitchGrace()
const arrived = useLayoutSetArrived()
const { transform, modelToScreen, fitOnce } = useViewport(size)
useViewportControls(svg, size)
const { registrations, drawnBounds } = useCanvasItemsRoot(svg, keys)
const borders = useGroupBorders()
const mirrorAxis = useMirrorAxis()
const axisFrame = computed(() => mirrorAxis.value.getOrUndefined())
const { clear: clearHovered } = useHoveredNode()
onBeforeUnmount(clearHovered)

const slots = computed(() => placed.value.flatMap((node) => (node.kind === 'slot' ? [node] : [])))
const pointedAndSelected = usePointedAndSelectedNodes()
const labels = useSlotIdLabels(pointedAndSelected, modelToScreen)
const links = computed(() =>
  pointedAndSelected.value.map(({ key, anchorAt, frame }) => ({
    key,
    from: modelToScreen(anchorAt),
    to: modelToScreen(frame),
  })),
)

// Tabs and origin marks in screen px: an empty group's tab sits beside its origin, any other's on
// its border's topmost point.
const marks = computed(() =>
  borders.value.flatMap(({ id, key, frame, empty, tabAt, shown }): GroupMarksAt[] => {
    if (shown === 'none') return []
    if (empty) {
      const origin = modelToScreen(frame)
      const { x, y } = groupBorderMarks.emptyTabOffset
      return [{ id, key, shown, origin, tab: { x: origin.x + x, y: origin.y + y } }]
    }
    return tabAt
      .map((at): GroupMarksAt[] => [{ id, key, shown, origin: undefined, tab: modelToScreen(at) }])
      .getOr([])
  }),
)

// The board extent is what the browser drew of the keys' bodies, so the fit waits for them to be
// registered; and only the open design's own set fits it, never one posted for the design before.
// Not the keys group's box, which Firefox grows by the top face's CSS transform.
watch(
  [slots, size, () => openDesign.value?.meta.id, arrived, registrations],
  ([drawn, , designId, current]) => {
    if (!current || drawn.length === 0 || showsHint.value || designId === undefined) return
    const bounds = drawnBounds()
    if (bounds.isSome()) fitOnce(bounds.value)
  },
  { flush: 'post', immediate: true },
)
</script>

<template>
  <div class="relative h-full">
    <svg ref="svg" class="absolute inset-0 block size-full touch-none">
      <g v-if="!showsHint">
        <g :transform="transform">
          <MirrorAxis v-if="axisFrame !== undefined" :frame="axisFrame" />
          <GroupBorder v-for="row in borders" :key="row.key" :row="row" :grayed="grayed" />
          <g ref="keys">
            <CanvasSlot v-for="slot in slots" :key="slot.key" :placed="slot" :grayed="grayed" />
          </g>
        </g>
        <!-- Drawn in screen space through the viewport's mapping, so never flipped or scaled, and
             beneath the tabs, which stay clickable. -->
        <g class="pointer-events-none">
          <AnchorLink
            v-for="link in links"
            :key="link.key"
            :placement="link.key"
            :from="link.from"
            :to="link.to"
            :grayed="grayed"
          />
          <SlotIdLabel
            v-for="label in labels"
            :id="label.id"
            :key="label.key"
            :placement="label.key"
            :at="label.at"
            :grayed="grayed"
          />
        </g>
        <!-- Pointed at and pressed, so not passed through like the labels and links. -->
        <g>
          <template v-for="mark in marks" :key="mark.key">
            <GroupOriginMark
              v-if="mark.origin !== undefined"
              :placement="mark.key"
              :at="mark.origin"
              :shown="mark.shown"
              :grayed="grayed"
            />
            <GroupBorderTab
              :id="mark.id"
              :placement="mark.key"
              :at="mark.tab"
              :shown="mark.shown"
              :grayed="grayed"
            />
          </template>
        </g>
      </g>
    </svg>
    <div v-if="showsHint" class="absolute inset-0 flex items-center justify-center p-3">
      <!-- The palette has no handle yet to read Ctrl+K from. -->
      <p>
        Add a group (<UiKbd :hotkey="StartAddChainGroup.hotkeys[0]" />) or open the command palette
        (<UiKbd hotkey="mod+K" />).
      </p>
    </div>
  </div>
</template>
