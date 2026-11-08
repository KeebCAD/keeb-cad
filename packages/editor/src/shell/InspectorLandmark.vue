<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { RouterView } from 'vue-router'

import { useLandmark } from '../landmarks/use-landmark'

const root = useTemplateRef<HTMLElement>('root')
useLandmark('inspector', root)
</script>

<template>
  <aside
    ref="root"
    tabindex="-1"
    aria-label="Inspector"
    class="w-inspector-width shrink-0 border-l border-border bg-panel focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
  >
    <RouterView name="inspector" />
  </aside>
</template>
