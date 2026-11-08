<script setup lang="ts">
import { RestartModelWorker } from '@keeb-cad/commands'
import { UiButton, UiTooltip } from '@keeb-cad/ui'

import { useInvoke } from '../invoke/use-invoke'
import { useRunningStage } from './use-running-stage'
import { useWorkerFailure } from './use-worker-failure'

const failure = useWorkerFailure()
const runningStage = useRunningStage()
const { invoke } = useInvoke()

function restart(): void {
  void invoke(RestartModelWorker)
}
</script>

<template>
  <div
    v-if="failure !== undefined"
    role="group"
    aria-label="Model worker failure"
    class="flex min-w-0 items-center gap-2"
  >
    <span aria-hidden="true" class="shrink-0 text-error">●</span>
    <UiTooltip :content="failure">
      <span
        tabindex="0"
        class="min-w-0 truncate font-mono text-mono text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >{{ failure }}</span
      >
    </UiTooltip>
    <UiButton class="shrink-0" @click="restart">{{ RestartModelWorker.label }}</UiButton>
  </div>
  <div v-else-if="runningStage !== undefined" class="flex items-center gap-2">
    <span class="font-mono text-mono text-text"
      >{{ runningStage.stage }} {{ runningStage.elapsed }}</span
    >
    <UiButton @click="restart">{{ RestartModelWorker.label }}</UiButton>
  </div>
</template>
