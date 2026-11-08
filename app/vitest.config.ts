import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { browserInstances } from '../tooling/vitest/browser-instances'

export default defineConfig({
  // Launch mounts the editor, so the specs that build the main container load its components.
  plugins: [vue(), tailwindcss()],
  // Pre-bundle the editor's deps up front: if Vite discovers them mid-run it re-bundles, and a
  // browser that already loaded the old chunks ends up with two copies of Vitest's runner.
  // They resolve only through editor and ui under `hoist: false`, hence the `>` form.
  optimizeDeps: {
    include: [
      '@keeb-cad/editor > vue',
      '@keeb-cad/editor > vue-router',
      '@keeb-cad/editor > @keeb-cad/ui > reka-ui',
      '@keeb-cad/editor > @keeb-cad/ui > @zag-js/hotkeys',
      '@keeb-cad/editor > @keeb-cad/ui > @lucide/vue',
      '@keeb-cad/editor > @keeb-cad/ui > @vueuse/core',
    ],
  },
  // The model worker's start file awaits at top level, which only an ES module worker can.
  worker: { format: 'es' },
  test: {
    root: fileURLToPath(new URL('./', import.meta.url)),
    // A config file of its own inherits nothing from the root, so it shuffles again here.
    sequence: { shuffle: true },
    expect: { requireAssertions: true },
    include: ['src/**/*.spec.ts'],
    exclude: [...configDefaults.exclude, '**/*.types.spec.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: browserInstances,
    },
  },
})
