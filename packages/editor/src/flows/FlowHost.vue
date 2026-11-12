<script setup lang="ts">
import { useFlowHost } from './use-flow-host'

const host = useFlowHost()
</script>

<template>
  <!-- Keyed by its entry: a second start of the same flow mounts a new view on the new entry. -->
  <component :is="host.view" v-if="host !== undefined" :key="host.entry.id" :entry="host.entry" />
</template>
