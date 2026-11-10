<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import { computed, useTemplateRef, watch } from 'vue'

import { useOpenDesign } from '../../design/use-open-design'
import { useViewport } from '../../viewport/use-viewport'
import AnchorLink from './AnchorLink.vue'
import CanvasSlot from './CanvasSlot.vue'
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

// The board extent is what the browser drew, so the fit waits for the keys to be in the DOM; and
// only the open design's own set fits it, never one posted for the design before.
watch(
  [slots, size, () => openDesign.value?.meta.id, arrived],
  ([drawn, , designId, current]) => {
    if (!current || drawn.length === 0 || showsHint.value || designId === undefined) return
    const group = keys.value
    if (group === null) return
    fitOnce(designId, group.getBBox())
  },
  { flush: 'post', immediate: true },
)
</script>

<template>
  <div class="relative h-full">
    <svg ref="svg" class="absolute inset-0 block size-full">
      <g v-if="!showsHint">
        <g :transform="transform">
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
      </g>
    </svg>
    <div v-if="showsHint" class="absolute inset-0 flex items-center justify-center p-3">
      <p>Add a group (G) or open the command palette (Ctrl+K).</p>
    </div>
  </div>
</template>
