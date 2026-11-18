<script setup lang="ts">
import { UiButton, UiTabList, UiTabPanel, UiTabs } from '@keeb-cad/ui'
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

import { useInvoke } from '../invoke/use-invoke'
import { useLandmark } from '../landmarks/use-landmark'
import ParametersTab from '../parameters/ParametersTab.vue'
import { StartAddParameter } from '../parameters/start-add-parameter'
import TreeTab from './TreeTab.vue'
import { useSlideOut } from './use-slide-out'
import { useSlideOutTab } from './use-slide-out-tab'

const root = useTemplateRef<HTMLElement>('root')
const { returnFocus } = useSlideOut()
const { tab, tabs } = useSlideOutTab()
const { invoke } = useInvoke()
useLandmark('slide-out', root)

// F6 lands on the slide-out, so its name says which panel it holds.
const label = computed(() => tabs.find((item) => item.value === tab.value)?.label)

// Its first meaningful item, on Tree the selected row, else the first row, and on Parameters the
// first name, which F2 and Delete act from; else, empty, the root itself. Only on opening: a tab
// switch leaves focus on the tab list.
onMounted(() => {
  const element = root.value
  if (element === null) return
  const target =
    tab.value === 'tree'
      ? (element.querySelector<HTMLElement>('[role="treeitem"][aria-selected="true"]') ??
        element.querySelector<HTMLElement>('[role="treeitem"]'))
      : element.querySelector<HTMLElement>('li > [tabindex="0"]')
  ;(target ?? element).focus()
})
onBeforeUnmount(() => {
  returnFocus(root.value)
})

function addParameter(): void {
  void invoke(StartAddParameter)
}
</script>

<template>
  <aside
    ref="root"
    tabindex="-1"
    :aria-label="label"
    class="flex w-slide-out-width flex-col rounded-r-lg bg-chrome shadow-overlay focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
  >
    <UiTabs v-model="tab" class="flex min-h-0 flex-1 flex-col">
      <div class="flex h-10 shrink-0 items-stretch gap-2 border-b border-border pr-2 pl-1">
        <UiTabList :items="tabs" />
        <UiButton
          v-if="tab === 'parameters'"
          aria-label="Add parameter"
          class="ml-auto self-center"
          @click="addParameter"
          >+</UiButton
        >
      </div>
      <UiTabPanel value="tree" class="min-h-0 flex-1 overflow-y-auto">
        <TreeTab />
      </UiTabPanel>
      <UiTabPanel value="parameters" class="min-h-0 flex-1 overflow-y-auto">
        <ParametersTab />
      </UiTabPanel>
    </UiTabs>
  </aside>
</template>
