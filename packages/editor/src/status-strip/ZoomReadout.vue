<script setup lang="ts">
import { useZoomReadout } from './use-zoom-readout'

const text = useZoomReadout()
</script>

<template>
  <span
    role="group"
    aria-label="Zoom"
    class="min-w-40 shrink-0 font-mono text-mono whitespace-nowrap tabular-nums"
  >
    {{ text }}
  </span>
</template>
