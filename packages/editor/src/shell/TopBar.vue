<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'

import { useOpenDesign } from '../design/use-open-design'
import { useLandmark } from '../landmarks/use-landmark'
import WorkspaceTabs from '../workspace/WorkspaceTabs.vue'

const root = useTemplateRef<HTMLElement>('root')
const openDesign = useOpenDesign()
const name = computed(() => openDesign.value.map((design) => design.meta.name).getOrUndefined())
useLandmark('top-bar', root)
</script>

<template>
  <header
    ref="root"
    tabindex="-1"
    aria-label="Top bar"
    class="flex h-top-bar shrink-0 items-stretch gap-3 border-b border-border bg-chrome px-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
  >
    <h1 class="self-center text-ui-strong">{{ name }}</h1>
    <WorkspaceTabs />
  </header>
</template>
