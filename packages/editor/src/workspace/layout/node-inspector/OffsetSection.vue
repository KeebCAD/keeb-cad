<script setup lang="ts">
import { SetOffset } from '@keeb-cad/commands'
import type { RunOptions } from '@keeb-cad/design'
import { isGroup } from '@keeb-cad/model/main'
import { computed, useId } from 'vue'

import ExpressionField from '../../../expression-field/ExpressionField.vue'
import { useInvoke } from '../../../invoke/use-invoke'
import { commonText } from './common-text'
import { offsetFields } from './offset-fields'
import { offsetTexts } from './offset-texts'
import type { NodeSectionProps, OffsetField } from './types'

const props = defineProps<NodeSectionProps>()
const { invoke } = useInvoke()
const headingId = useId()

const ids = computed(() => props.nodes.map(({ id }) => id))
const fields = computed(() => {
  const groups = props.nodes.every((node) => isGroup(node))
  return offsetFields.filter(({ groupsOnly }) => groups || !groupsOnly)
})
const shown = computed(() => {
  const texts = props.nodes.map(offsetTexts)
  return (field: OffsetField) => commonText(texts.map((text) => text[field.text]))
})

const runFor = (field: OffsetField) => (expression: string, options: RunOptions) =>
  invoke(SetOffset, { ids: ids.value, ...field.edit(expression) }, options)
</script>

<template>
  <section :aria-labelledby="headingId" class="flex flex-col gap-3">
    <h2 :id="headingId" class="text-section-label text-text-muted uppercase">Offset</h2>
    <ExpressionField
      v-for="field in fields"
      :key="field.label"
      :label="field.label"
      :expression="shown(field) ?? ''"
      :placeholder="shown(field) === undefined ? 'mixed' : undefined"
      :schema="field.schema"
      :run="runFor(field)"
    />
  </section>
</template>
