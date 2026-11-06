<script setup lang="ts">
import { getPlatform } from '@zag-js/hotkeys'
import { computed } from 'vue'

import { formatHotkey } from '../hotkeys/format-hotkey'
import type { KbdProps } from './types'

const props = defineProps<KbdProps>()

const text = computed(() => formatHotkey(props.hotkey, getPlatform()))
</script>

<template>
  <kbd
    class="inline-block rounded-sm border border-b-2 border-border bg-chrome px-1 font-mono text-mono-small text-text-muted"
    >{{ text }}</kbd
  >
</template>
