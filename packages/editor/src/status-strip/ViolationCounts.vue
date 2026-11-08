<script setup lang="ts">
import { UiSeverityCount } from '@keeb-cad/ui'

import { useViolationCounts } from './use-violation-counts'

const counts = useViolationCounts()
</script>

<template>
  <div role="group" aria-label="Violation counts" class="flex items-center gap-2">
    <span v-if="counts.dimmed" class="font-mono text-mono text-text-muted">◌</span>
    <UiSeverityCount severity="error" :count="counts.errors" :dimmed="counts.dimmed" />
    <UiSeverityCount severity="warning" :count="counts.warnings" :dimmed="counts.dimmed" />
  </div>
</template>
