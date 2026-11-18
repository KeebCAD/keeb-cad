<script setup lang="ts">
import { UiButton, UiDialog, UiKbd, UiTextField } from '@keeb-cad/ui'

import type { FlowViewProps } from '../flows/types'
import { useOpenFlow } from '../flows/use-open-flow'
import type { RenameParameterFlow } from './rename-parameter-flow'

const props = defineProps<FlowViewProps<typeof RenameParameterFlow>>()
const { draft, reason, update, finish, cancel } = useOpenFlow(props.entry)

// The name starts selected, so typing replaces it; a later focus keeps where the caret goes.
let selected = false

function selectOnce(event: FocusEvent): void {
  if (selected || !(event.target instanceof HTMLInputElement)) return
  selected = true
  event.target.select()
}

function onName(to = ''): void {
  update({ ...draft.value, to })
}
</script>

<template>
  <UiDialog :open="true" @dismiss="cancel">
    <template #title>Rename parameter</template>
    <form class="mt-3 flex w-94 flex-col gap-3" @submit.prevent="finish">
      <UiTextField
        label="Name"
        :model-value="draft.to"
        :error="reason"
        @update:model-value="onName"
        @focusin="selectOnce"
      />
      <div class="flex items-center justify-end gap-2">
        <UiKbd hotkey="Escape" />
        <UiButton :disabled-reason="reason" @click="finish">Rename</UiButton>
      </div>
    </form>
  </UiDialog>
</template>
