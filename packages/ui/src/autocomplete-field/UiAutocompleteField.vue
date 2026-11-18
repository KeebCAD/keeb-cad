<script setup lang="ts">
import {
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteRoot,
  AutocompleteViewport,
  useId,
} from 'reka-ui'
import { nextTick, useTemplateRef, watch } from 'vue'

import type { AutocompleteFieldEmits, AutocompleteFieldProps } from './types'

defineProps<AutocompleteFieldProps>()
const emit = defineEmits<AutocompleteFieldEmits>()
const text = defineModel<string>({ default: '' })
const open = defineModel<boolean>('open', { default: false })
// Where the caret is, so a caller can read the word before it and place the caret after a change.
const cursor = defineModel<number>('cursor', { default: 0 })

const inputId = useId(undefined, 'ui-autocomplete-field')
const errorId = useId(undefined, 'ui-autocomplete-field-error')
const input = useTemplateRef<{ $el: HTMLInputElement }>('input')

const inputElement = (): HTMLInputElement | undefined => input.value?.$el

// The caret this field last read, so only a caret the caller moves is written back: writing a read
// one would collapse a selection made since.
let read: number | undefined

function readCursor(): void {
  const at = inputElement()?.selectionStart ?? undefined
  if (at === undefined) return
  read = at
  cursor.value = at
}

watch(cursor, async (at) => {
  if (at === read) return
  await nextTick()
  const element = inputElement()
  if (element !== undefined && element.selectionStart !== at) element.setSelectionRange(at, at)
})

// The option Reka highlights while the list is open, read from the input's active descendant,
// since Reka keeps its last highlight after the list closes.
function activeOption(): string | undefined {
  const id = inputElement()?.getAttribute('aria-activedescendant') ?? ''
  const option = open.value && id !== '' ? document.getElementById(id) : null
  return option?.dataset['value']
}

// Runs before Reka's own handlers on the input, so each decision reads the list as it was.
function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return
  switch (event.key) {
    case 'Home':
    case 'End': {
      // Reka's filter moves the highlight and prevents the caret move; the text keeps the key.
      event.stopPropagation()
      return
    }
    case 'Tab': {
      const active = activeOption()
      if (active === undefined) {
        emit('commit')
        return
      }
      event.preventDefault()
      event.stopPropagation()
      emit('accept', active)
      return
    }
    case 'Enter': {
      // With an option active, Reka's Enter clicks it, which accepts it.
      if (activeOption() === undefined) emit('commit')
      return
    }
    case 'Escape': {
      // With the list open, Reka's Esc closes it and nothing else happens.
      if (open.value) return
      emit('cancel')
      return
    }
  }
}

function onSelect(value: string, event: Event): void {
  // Reka would replace the whole text with the option; the caller decides what it replaces.
  event.preventDefault()
  emit('accept', value)
}
</script>

<template>
  <!-- The list renders inside the root, which Reka spares when it hides the rest of the page. -->
  <AutocompleteRoot
    v-model="text"
    v-model:open="open"
    ignore-filter
    class="relative flex flex-col gap-1"
    @keydown.capture="onKeydown"
  >
    <label :for="inputId" class="text-ui text-text-muted">{{ label }}</label>
    <div
      class="flex h-field-height items-center gap-1 rounded-sm border border-border-interactive bg-panel px-2 font-mono text-mono focus-within:border-focus has-aria-invalid:border-b-2 has-aria-invalid:border-b-error"
    >
      <AutocompleteInput
        :id="inputId"
        ref="input"
        :aria-invalid="error === undefined ? undefined : 'true'"
        :aria-describedby="error === undefined ? undefined : errorId"
        class="min-w-0 flex-1 bg-transparent text-text focus:outline-none"
        @input="readCursor"
        @keyup="readCursor"
        @click="readCursor"
        @focus="readCursor"
        @select="readCursor"
      />
      <span v-if="suffix !== undefined" class="shrink-0 text-text-muted">{{ suffix }}</span>
    </div>
    <AutocompleteContent
      class="absolute top-full right-0 left-0 z-10 mt-1 rounded-sm border border-border-interactive bg-panel py-1"
    >
      <AutocompleteViewport>
        <AutocompleteItem
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :data-value="option.value"
          class="cursor-default px-2 font-mono text-mono text-text data-highlighted:bg-hover"
          @pointerdown.prevent
          @select="onSelect(option.value, $event)"
        >
          {{ option.label }}
        </AutocompleteItem>
      </AutocompleteViewport>
    </AutocompleteContent>
    <p v-if="error !== undefined" :id="errorId" class="text-ui text-error">
      <span aria-hidden="true">▲</span> {{ error }}
    </p>
  </AutocompleteRoot>
</template>
