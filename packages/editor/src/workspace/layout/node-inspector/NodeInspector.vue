<script setup lang="ts">
import { findNode, isGroup, nodeIdOf } from '@keeb-cad/model/main'
import { computed } from 'vue'

import { useOpenDesign } from '../../../design/use-open-design'
import { selectsRightHalf } from '../../../selection/selects-right-half'
import { useSelection } from '../../../selection/use-selection'
import AnchorSection from './AnchorSection.vue'
import ChainSection from './ChainSection.vue'
import OffsetSection from './OffsetSection.vue'
import type { AnchoredNode } from './types'

const { ids } = useSelection()
const design = useOpenDesign()

// The authored nodes behind the selection, each once (left/a and whole/a name one node). The right
// half's read-only fields are a story of their own, so a right id shows no node sections.
const anchored = computed((): AnchoredNode[] => {
  const layout = design.value?.layout
  if (layout === undefined || selectsRightHalf(ids.value)) return []
  return [...new Set(ids.value.map(nodeIdOf))].flatMap((id) => {
    const found = findNode(layout, id)
    if (found === undefined) return []
    const { node, parent, index } = found
    const chain =
      parent?.arrangement === 'chain'
        ? { parent: parent.id, index, count: parent.children.length }
        : undefined
    return [{ node, chain }]
  })
})
const nodes = computed(() => anchored.value.map(({ node }) => node))
const groupsOnly = computed(() => nodes.value.every((node) => isGroup(node)))
</script>

<template>
  <div v-if="nodes.length > 0" class="flex flex-col gap-pad p-pad">
    <AnchorSection :nodes="anchored" />
    <OffsetSection :nodes="nodes" />
    <ChainSection v-if="groupsOnly" :nodes="nodes" />
  </div>
</template>
