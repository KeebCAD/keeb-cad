<script setup lang="ts">
import type { AsyncResult } from '@keeb-cad/result'
import { parameterValues } from '@keeb-cad/model/main'
import type { Rejection } from '@keeb-cad/schema'
import { UiAutocompleteField } from '@keeb-cad/ui'
import { useDebounceFn } from '@vueuse/core'
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'

import { useOpenDesign } from '../design/use-open-design'
import { useFocusLandmark } from '../landmarks/use-focus-landmark'
import { rejectionText } from '../rejection/rejection-text'
import { evaluatedSuffix } from './evaluated-suffix'
import { nameBeforeCursor } from './name-before-cursor'
import { parameterOptions } from './parameter-options'
import type { ExpressionFieldProps } from './types'
import { typingPauseMs } from './typing-pause'
import { useFieldSession } from './use-field-session'

const props = defineProps<ExpressionFieldProps>()

const design = useOpenDesign()
const session = useFieldSession()
const focusLandmark = useFocusLandmark()

const text = shallowRef(props.expression)
const cursor = shallowRef(0)
const error = shallowRef<string>()
const focused = shallowRef(false)
// The list stays closed on focus, and after an accept or an Esc, until the next keystroke.
const closed = shallowRef(false)
// Text typed or accepted that no run has seen yet.
let pending = false
// Whether the last run refused the text the field still shows.
let lastRun: Promise<boolean> = Promise.resolve(false)

const parameters = computed(() => design.value?.parameters ?? [])
const typedName = computed(() => nameBeforeCursor(text.value, cursor.value))
const options = computed(() =>
  parameterOptions(parameters.value, parameterValues(parameters.value), typedName.value),
)
const open = computed({
  get: () => !closed.value && options.value.length > 0,
  // The list opens from what is typed; only a close is the person's.
  set: (value) => {
    if (!value) closed.value = true
  },
})
const suffix = computed(() => evaluatedSuffix(parameters.value, text.value, props.schema))

const applyAfterPause = useDebounceFn(() => {
  runPending(session.key())
}, typingPauseMs)

watch(
  () => props.expression,
  (expression) => {
    if (!focused.value) text.value = expression
  },
)

onBeforeUnmount(() => {
  applyAfterPause.cancel()
})

function onType(typed: string): void {
  text.value = typed
  closed.value = false
  edited()
}

function onAccept(name: string): void {
  const typed = typedName.value
  if (typed === undefined) return
  const start = cursor.value - typed.length
  text.value = text.value.slice(0, start) + name + text.value.slice(cursor.value)
  cursor.value = start + name.length
  closed.value = true
  edited()
}

function edited(): void {
  pending = true
  void applyAfterPause()
}

// Names are offered while typing, so focus alone, or a caret move after it, opens no list.
function onFocus(): void {
  focused.value = true
  closed.value = true
  session.begin()
}

// Enter runs what is typed and ends the session, so further typing is a new undo entry.
function onCommit(): void {
  applyAfterPause.cancel()
  runPending(session.key())
  session.end()
  session.begin()
}

// Drops what no run has applied and leaves for the canvas; what the pause or Enter applied stays,
// for undo to take back.
function onCancel(): void {
  applyAfterPause.cancel()
  pending = false
  lastRun = Promise.resolve(false)
  restore()
  focusLandmark('canvas')
}

// Applies what is typed before focus lands anywhere else, so a command run from there comes after
// it; text the design refuses gives way to the design's own.
function onBlur(): void {
  focused.value = false
  applyAfterPause.cancel()
  const key = session.key()
  session.end()
  runPending(key)
  const refused = lastRun
  void refused.then((wasRefused) => {
    if (wasRefused && !focused.value) restore()
  })
}

function runPending(key: string | undefined): void {
  if (!pending) return
  pending = false
  const typed = text.value
  lastRun = shown(typed, props.run(typed, { coalesce: key }))
}

async function shown(typed: string, run: AsyncResult<void, Rejection>): Promise<boolean> {
  const result = await run
  const refusal = result.isErr() ? result.error : undefined
  if (text.value === typed) error.value = refusal === undefined ? undefined : rejectionText(refusal)
  return refusal !== undefined
}

function restore(): void {
  text.value = props.expression
  error.value = undefined
}
</script>

<template>
  <UiAutocompleteField
    v-model:open="open"
    v-model:cursor="cursor"
    :model-value="text"
    :label="label"
    :label-hidden="labelHidden"
    :placeholder="placeholder"
    :error="error"
    :suffix="suffix"
    :options="options"
    @update:model-value="onType"
    @accept="onAccept"
    @commit="onCommit"
    @cancel="onCancel"
    @focusin="onFocus"
    @focusout="onBlur"
  />
</template>
