import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'

// DOM tests run in real browsers, never a simulation (AD-26, Verification layer 2).
export default defineConfig({
  plugins: [vue()],
  // Pre-bundle app deps up front: if Vite discovers them mid-run it re-bundles, and a browser
  // that already loaded the old chunks ends up with two copies of Vitest's runner.
  optimizeDeps: { include: ['vue', 'vue-router'] },
  test: {
    root: fileURLToPath(new URL('./', import.meta.url)),
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }, { browser: 'firefox' }],
    },
  },
})
