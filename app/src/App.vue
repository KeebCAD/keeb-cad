<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="editor-shell" data-testid="editor-shell">
    <header class="editor-shell__bar">
      <h1 class="editor-shell__title">keeb-cad</h1>
    </header>
    <main class="editor-shell__workspace">
      <RouterView />
    </main>
  </div>
</template>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
}

body {
  font-family: system-ui, sans-serif;
}
</style>

<style scoped>
.editor-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-shell__bar {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #ccc;
}

.editor-shell__title {
  margin: 0;
  font-size: 1rem;
}

.editor-shell__workspace {
  flex: 1;
  display: grid;
  place-items: center;
}
</style>
