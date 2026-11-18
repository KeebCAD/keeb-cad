<script setup lang="ts">
import { SetGap } from '@keeb-cad/commands'
import type { RunOptions } from '@keeb-cad/design'
import { gapSchema } from '@keeb-cad/schema'
import { useId } from 'vue'

import { useOpenDesign } from '../../../design/use-open-design'
import ExpressionField from '../../../expression-field/ExpressionField.vue'
import { useInvoke } from '../../../invoke/use-invoke'

const design = useOpenDesign()
const { invoke } = useInvoke()
const headingId = useId()

const setGapX = (x: string, options: RunOptions) => invoke(SetGap, { x }, options)
const setGapY = (y: string, options: RunOptions) => invoke(SetGap, { y }, options)
</script>

<template>
  <section
    v-if="design !== undefined"
    :aria-labelledby="headingId"
    class="flex flex-col gap-3 p-pad"
  >
    <h2 :id="headingId" class="text-section-label text-text-muted uppercase">Design settings</h2>
    <ExpressionField
      label="gap x"
      :expression="design.meta.gap.x"
      :schema="gapSchema.entries.x"
      :run="setGapX"
    />
    <ExpressionField
      label="gap y"
      :expression="design.meta.gap.y"
      :schema="gapSchema.entries.y"
      :run="setGapY"
    />
  </section>
</template>
