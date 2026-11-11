<script setup lang="ts">
import { RouterView } from 'vue-router'

import { useShortcuts } from './shortcuts/use-shortcuts'
import type { AppProps } from './types'

const { root } = defineProps<AppProps>()

useShortcuts(root)
</script>

<template>
  <RouterView />
</template>
