<script setup lang="ts">
import { Toggle } from 'reka-ui'

import type { CanvasToggleEmits, CanvasToggleProps } from './types'

defineProps<CanvasToggleProps>()
const emit = defineEmits<CanvasToggleEmits>()
</script>

<template>
  <!-- Controlled: a click asks to be pressed, and the parent decides, so a pressed one stays pressed. -->
  <Toggle
    as="g"
    role="button"
    :aria-label="label"
    :model-value="pressed"
    @update:model-value="emit('press')"
  >
    <slot />
  </Toggle>
</template>
