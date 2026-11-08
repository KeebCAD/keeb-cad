<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { RouterView } from 'vue-router'

import { useLandmark } from '../landmarks/use-landmark'

const root = useTemplateRef<HTMLElement>('root')
useLandmark('canvas', root)
</script>

<template>
  <main
    ref="root"
    tabindex="-1"
    aria-label="Canvas"
    class="min-w-0 flex-1 bg-canvas focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
  >
    <RouterView />
  </main>
</template>
