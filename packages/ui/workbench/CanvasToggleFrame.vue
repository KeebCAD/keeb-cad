<script setup lang="ts">
import UiCanvasToggle from '../src/canvas-toggle/UiCanvasToggle.vue'
import type { CanvasToggleProps } from '../src/canvas-toggle/types'

// A canvas toggle draws only inside an SVG, so the cell gives it one.
defineProps<CanvasToggleProps>()
</script>

<template>
  <svg viewBox="-12 -12 24 24" class="size-24 bg-canvas">
    <UiCanvasToggle :label="label" :pressed="pressed">
      <slot />
    </UiCanvasToggle>
  </svg>
</template>
