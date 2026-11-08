<script setup lang="ts">
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'

import type { TooltipProps } from './types'

defineProps<TooltipProps>()
</script>

<template>
  <TooltipProvider>
    <TooltipRoot :disabled="disabled">
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          :side-offset="4"
          class="max-w-80 rounded-lg border border-border bg-panel px-2 py-1 text-ui wrap-anywhere text-text shadow-overlay"
        >
          {{ content }}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
