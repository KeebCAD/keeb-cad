<script setup lang="ts">
import { UiTabPanel, UiTabs } from '@keeb-cad/ui'

import LeftRail from '../slide-out/LeftRail.vue'
import TreeSlideOut from '../slide-out/TreeSlideOut.vue'
import { useSlideOut } from '../slide-out/use-slide-out'
import { useWorkspace } from '../workspace/use-workspace'
import CanvasLandmark from './CanvasLandmark.vue'
import InspectorLandmark from './InspectorLandmark.vue'
import StatusStripLandmark from './StatusStripLandmark.vue'
import TopBar from './TopBar.vue'

const { workspace } = useWorkspace()
const { isOpen } = useSlideOut()
</script>

<template>
  <UiTabs v-model="workspace" class="h-full">
    <div class="flex h-full flex-col text-ui text-text">
      <TopBar />
      <div class="flex min-h-0 flex-1">
        <div class="relative flex shrink-0">
          <LeftRail />
          <TreeSlideOut v-if="isOpen" class="absolute top-0 left-full z-10 h-full" />
        </div>
        <!-- Only the landmarks' contents swap with the workspace; the landmarks stay mounted. -->
        <UiTabPanel v-if="workspace !== undefined" :value="workspace" class="min-w-0 flex-1">
          <div class="flex h-full">
            <CanvasLandmark />
            <InspectorLandmark />
          </div>
        </UiTabPanel>
      </div>
      <StatusStripLandmark />
    </div>
  </UiTabs>
</template>
