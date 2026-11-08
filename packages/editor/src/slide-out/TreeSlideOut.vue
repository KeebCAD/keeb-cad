<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

import { useLandmark } from '../landmarks/use-landmark'
import { useSlideOut } from './use-slide-out'

const root = useTemplateRef<HTMLElement>('root')
const { returnFocus } = useSlideOut()
useLandmark('slide-out', root)

// Empty, its root is the only thing to focus on open.
onMounted(() => root.value?.focus())
onBeforeUnmount(() => returnFocus(root.value))
</script>

<template>
  <aside
    ref="root"
    tabindex="-1"
    aria-label="Tree"
    class="w-slide-out-width rounded-r-lg bg-chrome shadow-overlay focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
  ></aside>
</template>
