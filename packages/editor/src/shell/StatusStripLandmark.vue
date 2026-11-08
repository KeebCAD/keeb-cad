<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { useLandmark } from '../landmarks/use-landmark'

const root = useTemplateRef<HTMLElement>('root')
useLandmark('status-strip', root)
</script>

<template>
  <footer
    ref="root"
    tabindex="-1"
    aria-label="Status strip"
    class="h-status-strip shrink-0 border-t border-border bg-chrome focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
  ></footer>
</template>
