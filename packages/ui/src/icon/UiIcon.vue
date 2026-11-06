<script setup lang="ts">
import { icons } from './icons'
import type { IconProps } from './types'

defineProps<IconProps>()
</script>

<template>
  <component
    :is="icons[name]"
    :size="16"
    :stroke-width="1.5"
    :role="label === undefined ? undefined : 'img'"
    :aria-label="label"
    :aria-hidden="label === undefined ? 'true' : undefined"
  />
</template>
