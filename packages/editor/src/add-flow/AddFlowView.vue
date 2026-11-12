<script setup lang="ts">
import { UiButton, UiDialog, UiKbd, UiSegmentedControl, UiTextField } from '@keeb-cad/ui'
import { computed } from 'vue'

import type { FlowViewProps } from '../flows/types'
import { useOpenFlow } from '../flows/use-open-flow'
import type { AddGroupFlow } from './add-group-flow'
import type { AddSlotFlow } from './add-slot-flow'

const AXES = [
  { value: 'y', label: 'Column ↑' },
  { value: 'x', label: 'Row →' },
] as const

const props = defineProps<FlowViewProps<typeof AddGroupFlow | typeof AddSlotFlow>>()
const { draft, reason, update, finish, cancel } = useOpenFlow(props.entry)

const label = computed(() =>
  'arrangement' in draft.value ? `Add ${draft.value.arrangement} group` : 'Add slot',
)
const chain = computed(() =>
  'arrangement' in draft.value && draft.value.arrangement === 'chain' ? draft.value : undefined,
)

// An empty field leaves the id out, so the command mints one.
function onId(text: string | undefined): void {
  const next = { ...draft.value }
  if (text === undefined || text === '') delete next.id
  else next.id = text
  update(next)
}

function onAxis(value: string | undefined): void {
  const axis = AXES.find((option) => option.value === value)?.value
  const open = chain.value
  if (open !== undefined && axis !== undefined) update({ ...open, axis })
}
</script>

<template>
  <UiDialog :open="true" @dismiss="cancel">
    <template #title
      >{{ label }} in <span class="font-mono text-mono">{{ draft.parent }}</span></template
    >
    <form class="mt-3 flex w-94 flex-col gap-3" @submit.prevent="finish">
      <UiTextField
        label="Id"
        placeholder="generated if empty"
        :model-value="draft.id ?? ''"
        :error="reason"
        @update:model-value="onId"
      />
      <UiSegmentedControl
        v-if="chain !== undefined"
        label="Axis"
        :options="AXES"
        :model-value="chain.axis"
        @update:model-value="onAxis"
      />
      <div class="flex items-center justify-end gap-2">
        <UiKbd hotkey="Escape" />
        <UiButton :disabled-reason="reason" @click="finish">Add</UiButton>
      </div>
    </form>
  </UiDialog>
</template>
