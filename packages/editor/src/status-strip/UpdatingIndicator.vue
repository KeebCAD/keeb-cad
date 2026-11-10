<script setup lang="ts">
import { useSwitchGrace } from '../workspace/layout/use-switch-grace'

const grayed = useSwitchGrace()
</script>

<template>
  <span v-if="grayed" class="shrink-0 font-mono text-mono text-text-muted">◌ updating</span>
</template>
