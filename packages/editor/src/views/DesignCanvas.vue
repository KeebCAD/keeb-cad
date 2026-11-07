<script setup lang="ts">
import { DesignStore } from '@keeb-cad/design'
import { useService } from '@keeb-cad/di/vue'
import { computed } from 'vue'

const store = useService(DesignStore)
const meta = computed(() => store.current.getOrUndefined()?.design.meta)
</script>

<template>
  <div v-if="meta" class="design-canvas">
    <p>{{ meta.name }}</p>
    <p>{{ meta.id }}</p>
  </div>
</template>
