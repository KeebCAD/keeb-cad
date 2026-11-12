<script setup lang="ts">
import { UiButton, UiDialog } from '@keeb-cad/ui'

import type { FlowViewProps } from '../flows/types'
import { useOpenFlow } from '../flows/use-open-flow'
import type { TestRenameFlow } from './test-rename-flow'

const props = defineProps<FlowViewProps<typeof TestRenameFlow>>()
const { draft, reason, update, finish, cancel } = useOpenFlow(props.entry)

function onInput(event: Event): void {
  update({ name: (event.target as HTMLInputElement).value })
}
</script>

<template>
  <UiDialog :open="true" @dismiss="cancel">
    <template #title>Rename design</template>
    <label class="flex flex-col gap-1">
      Name
      <input :value="draft.name" class="border border-border" @input="onInput" />
    </label>
    <p v-if="reason !== undefined">{{ reason }}</p>
    <UiButton :disabled-reason="reason" @click="finish">Finish</UiButton>
  </UiDialog>
</template>
