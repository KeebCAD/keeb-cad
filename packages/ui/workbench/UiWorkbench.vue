<script setup lang="ts">
import WidgetCell from './WidgetCell.vue'
import { widgets } from './widgets'
</script>

<template>
  <main class="flex min-h-screen flex-col gap-5 bg-canvas p-3 text-text">
    <section v-for="widget in widgets" :key="widget.title" class="flex flex-col gap-2">
      <h2 class="text-section-label uppercase">{{ widget.title }}</h2>
      <div
        v-for="state in widget.states"
        :key="state.name"
        class="flex items-center gap-3 bg-panel p-3"
      >
        <span class="w-slide-out-width font-mono text-mono-small text-text-muted">
          {{ state.name }}
        </span>
        <WidgetCell :component="widget.component" :state="state" />
      </div>
    </section>
  </main>
</template>
