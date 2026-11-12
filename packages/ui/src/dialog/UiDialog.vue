<script setup lang="ts">
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'

import type { DialogEmits, DialogProps, DialogSlots } from './types'

defineProps<DialogProps>()
const emit = defineEmits<DialogEmits>()
defineSlots<DialogSlots>()
</script>

<template>
  <!-- With no trigger, the root asks to change open only to close it. -->
  <DialogRoot :open="open" @update:open="emit('dismiss')">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 bg-scrim" />
      <DialogContent
        :aria-describedby="undefined"
        class="fixed top-1/2 left-1/2 -translate-1/2 rounded-lg border border-border bg-panel p-pad text-text shadow-overlay"
      >
        <DialogTitle class="text-ui">
          <slot name="title" />
        </DialogTitle>
        <slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
