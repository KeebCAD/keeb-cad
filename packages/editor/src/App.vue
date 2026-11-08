<script setup lang="ts">
import { RouterView } from 'vue-router'

import { useShortcuts } from './shortcuts/use-shortcuts'

useShortcuts()
</script>

<template>
  <RouterView />
</template>
