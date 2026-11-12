<script setup lang="ts">
import { UiRailButton } from '@keeb-cad/ui'
import { useTemplateRef } from 'vue'

import { useInvoke } from '../invoke/use-invoke'
import { useLandmark } from '../landmarks/use-landmark'
import { ToggleSlideOut } from './toggle-slide-out'
import { useSlideOut } from './use-slide-out'

const root = useTemplateRef<HTMLElement>('root')
const { isOpen } = useSlideOut()
const { invoke } = useInvoke()
useLandmark('left-rail', root)

function toggle(): void {
  void invoke(ToggleSlideOut)
}
</script>

<template>
  <div ref="root" role="group" aria-label="Left rail" class="flex w-left-rail flex-col bg-chrome">
    <UiRailButton icon="tree" label="Tree" :expanded="isOpen" @click="toggle" />
  </div>
</template>
