<script setup lang="ts">
import UiIcon from '../icon/UiIcon.vue'
import type { RailButtonEmits, RailButtonProps } from './types'

defineProps<RailButtonProps>()
const emit = defineEmits<RailButtonEmits>()
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    :aria-expanded="expanded ? 'true' : 'false'"
    class="flex aspect-square min-h-target-min w-full items-center justify-center border-l-2 border-transparent text-text-muted hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus aria-expanded:border-selection aria-expanded:bg-fill-on aria-expanded:text-text"
    @click="emit('click', $event)"
  >
    <UiIcon :name="icon" />
  </button>
</template>
