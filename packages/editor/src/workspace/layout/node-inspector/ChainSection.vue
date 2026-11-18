<script setup lang="ts">
import { SetArrangement } from '@keeb-cad/commands'
import { isGroup } from '@keeb-cad/model/main'
import { UiSegmentedControl } from '@keeb-cad/ui'
import { computed, shallowRef, useId, watch } from 'vue'

import { useInvoke } from '../../../invoke/use-invoke'
import { rejectionText } from '../../../rejection/rejection-text'
import { arrangementEdit, arrangementOption, arrangementOptions } from './arrangement-option'
import { commonText } from './common-text'
import type { ArrangementOption, NodeSectionProps } from './types'

const props = defineProps<NodeSectionProps>()
const { invoke } = useInvoke()
const headingId = useId()

const OPTIONS = arrangementOptions.map((option) => ({ value: option, label: option }))

const ids = computed(() => props.nodes.map(({ id }) => id))
// No option is checked while the groups differ.
const checked = computed(
  () => commonText(props.nodes.filter((node) => isGroup(node)).map(arrangementOption)) ?? '',
)
const refusal = shallowRef<string>()

watch(
  () => ids.value.join(' '),
  () => {
    refusal.value = undefined
  },
)

// A refused pick leaves the control on the design's value, with the reason below it.
async function pick(option: string | undefined): Promise<void> {
  if (option === undefined) return
  refusal.value = undefined
  const result = await invoke(SetArrangement, {
    ids: ids.value,
    ...arrangementEdit(option as ArrangementOption),
  })
  if (result.isErr()) refusal.value = rejectionText(result.error)
}
</script>

<template>
  <section :aria-labelledby="headingId" class="flex flex-col gap-3">
    <h2 :id="headingId" class="text-section-label text-text-muted uppercase">Chain</h2>
    <UiSegmentedControl
      label="arrangement"
      :options="OPTIONS"
      :model-value="checked"
      @update:model-value="pick"
    />
    <p v-if="refusal !== undefined" class="text-ui text-error">
      <span aria-hidden="true">▲</span> {{ refusal }}
    </p>
  </section>
</template>
