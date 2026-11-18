<script setup lang="ts">
import { computed } from 'vue'

import { useOpenDesign } from '../design/use-open-design'
import { parameterRows } from './parameter-rows'
import ParameterRow from './ParameterRow.vue'

const design = useOpenDesign()
const rows = computed(() => parameterRows(design.value?.parameters ?? []))
</script>

<template>
  <!-- A plain list, not a listbox: an option's children are presentational, and a row holds a
       field. -->
  <ul v-if="rows.length > 0" role="list" aria-label="Parameters" class="flex flex-col py-1">
    <!-- Keyed by place, so a renamed row keeps its name element, which the dialog's close returns
         focus to. -->
    <ParameterRow
      v-for="(row, index) in rows"
      :key="index"
      :parameter="row.parameter"
      :read-only-text="row.readOnlyText"
    />
  </ul>
  <p v-else class="p-pad text-text-muted">No parameters.</p>
</template>
