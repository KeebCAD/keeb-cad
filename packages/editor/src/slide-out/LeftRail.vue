<script setup lang="ts">
import { UiRailButton } from '@keeb-cad/ui'
import { useTemplateRef } from 'vue'

import { useInvoke } from '../invoke/use-invoke'
import { useLandmark } from '../landmarks/use-landmark'
import { CloseSlideOut } from './close-slide-out'
import { OpenTree } from './open-tree'
import { useSlideOut } from './use-slide-out'

const root = useTemplateRef<HTMLElement>('root')
const { isOpen } = useSlideOut()
const { invoke } = useInvoke()
useLandmark('left-rail', root)

function toggleTree(): void {
  void invoke(isOpen.value ? CloseSlideOut : OpenTree)
}
</script>

<template>
  <div ref="root" role="group" aria-label="Left rail" class="flex w-left-rail flex-col bg-chrome">
    <UiRailButton icon="tree" label="Tree" :expanded="isOpen" @click="toggleTree" />
  </div>
</template>
