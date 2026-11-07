<script setup lang="ts">
import UiTooltip from '../tooltip/UiTooltip.vue'
import type { ButtonEmits, ButtonProps } from './types'

defineOptions({ inheritAttrs: false })

const props = defineProps<ButtonProps>()
const emit = defineEmits<ButtonEmits>()

function onClick(event: MouseEvent): void {
  if (props.disabledReason === undefined) emit('click', event)
}
</script>

<template>
  <UiTooltip :content="disabledReason ?? ''" :disabled="disabledReason === undefined">
    <button
      v-bind="$attrs"
      type="button"
      :aria-disabled="disabledReason === undefined ? undefined : 'true'"
      class="inline-flex min-h-target-min items-center gap-1 rounded-md border border-border-interactive bg-panel px-3 text-ui text-text hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:bg-fill-on aria-disabled:border-border aria-disabled:text-text-faint aria-disabled:hover:bg-panel aria-disabled:active:bg-panel"
      @click="onClick"
    >
      <slot />
    </button>
  </UiTooltip>
</template>
