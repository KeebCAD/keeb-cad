<script setup lang="ts">
import { useSelection } from '../../selection/use-selection'
import DesignSettings from './design-settings/DesignSettings.vue'
import NodeInspector from './node-inspector/NodeInspector.vue'

const { ids } = useSelection()
</script>

<template>
  <DesignSettings v-if="ids.length === 0" />
  <NodeInspector v-else />
</template>
