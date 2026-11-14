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
import { useHoveredGroup } from '../../group-border/use-hovered-group'
import { useCanvasItemsRoot } from '../../viewport/use-canvas-items-root'
import { useViewport } from '../../viewport/use-viewport'
import { useViewportControls } from '../../viewport/use-viewport-controls'
import AnchorLink from './AnchorLink.vue'
import CanvasSlot from './CanvasSlot.vue'
import type { GroupMarksAt } from './types'
import { useLayoutSetArrived } from './use-layout-set-arrived'
import { useNewDesignHint } from './use-new-design-hint'
import { usePlacedNodes } from './use-placed-nodes'
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
useCanvasItemsRoot(svg, keys)
const borders = useGroupBorders()
const { clear: clearHovered } = useHoveredGroup()
onBeforeUnmount(clearHovered)

const slots = computed(() => placed.value.flatMap((node) => (node.kind === 'slot' ? [node] : [])))
const legends = computed(() =>
  slots.value
    .filter(({ fit }) => fit === 'fitted')
    .map(({ key, id, frame }) => ({ key, id, at: modelToScreen(frame) })),
)
const links = computed(() =>
  placed.value.map(({ key, anchorAt, frame }) => ({
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

// The board extent is what the browser drew, so the fit waits for the keys to be in the DOM; and
// only the open design's own set fits it, never one posted for the design before.
watch(
  [slots, size, () => openDesign.value?.meta.id, arrived],
  ([drawn, , designId, current]) => {
    if (!current || drawn.length === 0 || showsHint.value || designId === undefined) return
    const group = keys.value
    if (group === null) return
    fitOnce(group.getBBox())
  },
  { flush: 'post', immediate: true },
)
</script>

<template>
  <div class="relative h-full">
    <svg ref="svg" class="absolute inset-0 block size-full touch-none">
      <g v-if="!showsHint">
        <g :transform="transform">
          <GroupBorder v-for="row in borders" :key="row.key" :row="row" :grayed="grayed" />
          <g ref="keys">
            <CanvasSlot v-for="slot in slots" :key="slot.key" :placed="slot" :grayed="grayed" />
          </g>
        </g>
        <!-- Drawn in screen space through the viewport's mapping, so never flipped or scaled. -->
        <g aria-hidden="true" class="pointer-events-none">
          <AnchorLink
            v-for="link in links"
            :key="link.key"
            :from="link.from"
            :to="link.to"
            :grayed="grayed"
          />
          <text
            v-for="legend in legends"
            :key="legend.key"
            :x="legend.at.x"
            :y="legend.at.y"
            text-anchor="middle"
            dominant-baseline="central"
            class="fill-key-legend font-mono text-canvas-label tabular-nums"
          >
            {{ legend.id }}
          </text>
        </g>
        <!-- Pointed at and pressed, so neither hidden nor passed through like the legends. -->
        <g>
          <template v-for="mark in marks" :key="mark.key">
            <GroupOriginMark
              v-if="mark.origin !== undefined"
              :id="mark.id"
              :at="mark.origin"
              :shown="mark.shown"
              :grayed="grayed"
            />
            <GroupBorderTab :id="mark.id" :at="mark.tab" :shown="mark.shown" :grayed="grayed" />
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
