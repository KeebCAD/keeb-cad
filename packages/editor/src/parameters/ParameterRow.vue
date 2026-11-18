<script setup lang="ts">
import { SetParameter } from '@keeb-cad/commands'
import type { RunOptions } from '@keeb-cad/design'
import { parameterSchema } from '@keeb-cad/schema'
import { computed, onBeforeUnmount, useTemplateRef, watch } from 'vue'

import ExpressionField from '../expression-field/ExpressionField.vue'
import { useInvoke } from '../invoke/use-invoke'
import { DeleteSelection } from '../selection/delete-selection'
import { StartRenameParameter } from './start-rename-parameter'
import type { ParameterRowProps } from './types'
import { useDeleteParameterRefusal } from './use-delete-parameter-refusal'
import { useFocusedParameter } from './use-focused-parameter'

const KEYS = [...StartRenameParameter.hotkeys, ...DeleteSelection.hotkeys].join(' ')

const props = defineProps<ParameterRowProps>()
const { invoke } = useInvoke()
const focused = useFocusedParameter()
const refusals = useDeleteParameterRefusal()
const nameElement = useTemplateRef<HTMLElement>('name')

const name = computed(() => props.parameter.name)
const refusal = computed(() => refusals.text(name.value))

// Rows are keyed by place, so a focused name element can come to show another parameter (the one
// after a deleted one, or a renamed one): the focus record follows what it shows.
watch(name, (next) => {
  if (nameElement.value !== null && nameElement.value === document.activeElement) {
    focused.focus(next)
  }
})

// A row that goes away with its name focused takes the focus record with it, since the browser
// sends no focusout for a removed element.
onBeforeUnmount(() => {
  if (nameElement.value !== null && nameElement.value === document.activeElement) focused.clear()
})

const setValue = (value: string, options: RunOptions) =>
  invoke(SetParameter, { name: name.value, value }, options)

function rename(): void {
  void invoke(StartRenameParameter, { name: name.value })
}

// The refusal stays while focus moves within the row, from the name to its value and back.
function leaveRow(event: FocusEvent): void {
  const row = event.currentTarget
  const to = event.relatedTarget
  const staysInRow = row instanceof HTMLElement && to instanceof Node && row.contains(to)
  if (!staysInRow) refusals.clear(name.value)
}
</script>

<template>
  <li
    v-if="readOnlyText !== undefined"
    class="flex min-h-row items-center px-3 font-mono text-mono text-text-muted"
  >
    {{ readOnlyText }}
  </li>
  <li v-else class="flex min-h-row flex-wrap items-center gap-x-2 px-3 py-1" @focusout="leaveRow">
    <span
      ref="name"
      tabindex="0"
      :aria-keyshortcuts="KEYS"
      class="w-26 shrink-0 truncate font-mono text-mono focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      @focusin="focused.focus(parameter.name)"
      @focusout="focused.clear()"
      @dblclick="rename"
      >{{ name }}</span
    >
    <span aria-hidden="true" class="text-text-muted">=</span>
    <ExpressionField
      class="min-w-0 flex-1"
      :label="name"
      label-hidden
      :expression="parameter.value"
      :schema="parameterSchema.entries.value"
      :run="setValue"
    />
    <p v-if="refusal !== undefined" role="alert" class="basis-full text-ui text-error">
      <span aria-hidden="true">▲</span> <span>{{ refusal }}</span>
    </p>
  </li>
</template>
