import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

// The Vue bridge's specs touch the DOM, so they run in real browsers (AD-26, Verification
// layer 2). di's root specs run on Node, in the root config's `di` project.
export default defineConfig({
  // Pre-bundle up front: a mid-run re-bundle leaves the browser with two copies of the runner.
  optimizeDeps: { include: ['vue', 'ts-pattern'] },
  test: {
    name: 'di/vue',
    root: fileURLToPath(new URL('./', import.meta.url)),
    // A config file of its own inherits nothing from the root, so it shuffles again here.
    sequence: { shuffle: true },
    include: ['src/vue/**/*.spec.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }, { browser: 'firefox' }],
    },
  },
})
