<script setup lang="ts">
import { FieldControl, FieldError, FieldLabel, FieldRoot } from 'reka-ui'

import type { TextFieldProps } from './types'

defineProps<TextFieldProps>()
const model = defineModel<string>()
</script>

<template>
  <FieldRoot :invalid="error !== undefined" class="flex flex-col gap-1">
    <FieldLabel class="text-ui text-text-muted">{{ label }}</FieldLabel>
    <FieldControl
      v-model="model"
      :placeholder="placeholder"
      class="h-field-height rounded-sm border border-border-interactive bg-panel px-2 font-mono text-mono text-text placeholder:text-text-muted focus:border-focus focus:outline-none aria-invalid:border-b-2 aria-invalid:border-b-error"
    />
    <FieldError class="text-ui text-error"
      ><span aria-hidden="true">▲</span> {{ error }}</FieldError
    >
  </FieldRoot>
</template>
