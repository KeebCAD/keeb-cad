<script setup lang="ts">
import { ref } from 'vue'

import UiButton from '../src/button/UiButton.vue'
import UiDialog from '../src/dialog/UiDialog.vue'
import type { DialogSlots } from '../src/dialog/types'

// An open modal hides and blocks the whole workbench, so the cell opens it only on request.
defineSlots<DialogSlots>()
const open = ref(false)
</script>

<template>
  <UiButton @click="open = true">Open dialog</UiButton>
  <UiDialog :open="open" @dismiss="open = false">
    <template #title><slot name="title" /></template>
    <slot />
  </UiDialog>
</template>
