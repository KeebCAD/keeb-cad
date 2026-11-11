<script setup lang="ts">
import { useCursorReadout } from './use-cursor-readout'

const text = useCursorReadout()
</script>

<template>
  <span
    role="group"
    aria-label="Cursor"
    class="min-w-40 shrink-0 font-mono text-mono whitespace-nowrap tabular-nums"
  >
    {{ text }}
  </span>
</template>
