<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { useLandmark } from '../landmarks/use-landmark'
import ModelWorkerState from '../status-strip/ModelWorkerState.vue'
import UpdatingIndicator from '../status-strip/UpdatingIndicator.vue'
import ViolationCounts from '../status-strip/ViolationCounts.vue'

const root = useTemplateRef<HTMLElement>('root')
useLandmark('status-strip', root)
</script>

<template>
  <footer
    ref="root"
    tabindex="-1"
    aria-label="Status strip"
    class="flex h-status-strip shrink-0 items-center justify-end border-t border-border bg-chrome px-pad focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
  >
    <div class="flex max-w-160 min-w-0 items-center justify-end gap-3">
      <UpdatingIndicator />
      <ModelWorkerState />
      <ViolationCounts class="shrink-0" />
    </div>
  </footer>
</template>
