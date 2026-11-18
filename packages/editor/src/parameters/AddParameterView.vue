<script setup lang="ts">
import { UiButton, UiDialog, UiKbd, UiTextField } from '@keeb-cad/ui'

import type { FlowViewProps } from '../flows/types'
import { useOpenFlow } from '../flows/use-open-flow'
import type { AddParameterFlow } from './add-parameter-flow'

const props = defineProps<FlowViewProps<typeof AddParameterFlow>>()
const { draft, reason, update, finish, cancel } = useOpenFlow(props.entry)

function onName(name = ''): void {
  update({ ...draft.value, name })
}

function onValue(value = ''): void {
  update({ ...draft.value, value })
}
</script>

<template>
  <UiDialog :open="true" @dismiss="cancel">
    <template #title>Add parameter</template>
    <form class="mt-3 flex w-94 flex-col gap-3">
      <!-- Two fields and no submit button, so Enter in either submits by hand. -->
      <UiTextField
        label="Name"
        :model-value="draft.name"
        @update:model-value="onName"
        @keydown.enter.prevent="finish"
      />
      <UiTextField
        label="Value"
        :model-value="draft.value"
        @update:model-value="onValue"
        @keydown.enter.prevent="finish"
      />
      <!-- One reason for the whole draft: the first field that refuses it, or the command's. -->
      <p v-if="reason !== undefined" class="text-ui text-error">
        <span aria-hidden="true">▲</span> <span>{{ reason }}</span>
      </p>
      <div class="flex items-center justify-end gap-2">
        <UiKbd hotkey="Escape" />
        <UiButton :disabled-reason="reason" @click="finish">Add</UiButton>
      </div>
    </form>
  </UiDialog>
</template>
