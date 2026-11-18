<script setup lang="ts">
import { computed, useId } from 'vue'

import { anchorText } from './anchor-text'
import { commonText } from './common-text'
import type { AnchorSectionProps } from './types'

const props = defineProps<AnchorSectionProps>()
const headingId = useId()

const anchor = computed(() => commonText(props.nodes.map(anchorText)))
</script>

<template>
  <section :aria-labelledby="headingId" class="flex flex-col gap-3">
    <h2 :id="headingId" class="text-section-label text-text-muted uppercase">Anchor</h2>
    <dl class="flex items-center gap-3">
      <dt class="text-ui text-text-muted">anchor</dt>
      <dd v-if="anchor === undefined" class="font-mono text-mono text-text-muted">mixed</dd>
      <dd v-else class="font-mono text-mono text-text">{{ anchor }}</dd>
    </dl>
  </section>
</template>
