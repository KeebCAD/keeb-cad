<script setup lang="ts">
import { computed } from 'vue'

import { useOpenDesign } from '../design/use-open-design'

const openDesign = useOpenDesign()
const meta = computed(() => openDesign.value.getOrUndefined()?.meta)
</script>

<template>
  <div v-if="meta" class="design-canvas">
    <p>{{ meta.name }}</p>
    <p>{{ meta.id }}</p>
  </div>
</template>
