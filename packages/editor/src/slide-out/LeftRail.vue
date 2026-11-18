<script setup lang="ts">
import { UiRailButton } from '@keeb-cad/ui'
import { useTemplateRef } from 'vue'

import { useInvoke } from '../invoke/use-invoke'
import { useLandmark } from '../landmarks/use-landmark'
import { ToggleSlideOutTab } from './toggle-slide-out-tab'
import type { SlideOutTab } from './types'
import { useSlideOut } from './use-slide-out'
import { useSlideOutTab } from './use-slide-out-tab'

const root = useTemplateRef<HTMLElement>('root')
const { isOpen, tab } = useSlideOut()
const { tabs } = useSlideOutTab()
const { invoke } = useInvoke()
useLandmark('left-rail', root)

function toggle(pressed: SlideOutTab): void {
  void invoke(ToggleSlideOutTab, { tab: pressed })
}
</script>

<template>
  <div ref="root" role="group" aria-label="Left rail" class="flex w-left-rail flex-col bg-chrome">
    <!-- Each tab's icon is named as the tab. -->
    <UiRailButton
      v-for="item in tabs"
      :key="item.value"
      :icon="item.value"
      :label="item.label"
      :expanded="isOpen && tab === item.value"
      @click="toggle(item.value)"
    />
  </div>
</template>
