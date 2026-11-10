<script setup lang="ts">
import type { AnchorLinkProps } from './types'

defineProps<AnchorLinkProps>()
</script>

<template>
  <g :class="grayed ? 'fill-stale stroke-stale' : 'fill-anchor-link stroke-anchor-link'">
    <line :x1="from.x" :y1="from.y" :x2="to.x" :y2="to.y" stroke-dasharray="4 3" />
    <circle :cx="from.x" :cy="from.y" r="2" stroke="none" />
  </g>
</template>
