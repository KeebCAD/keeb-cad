import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import viteConfig from './vite.config.ts'

// DOM tests run in real browsers, never a simulation (AD-26, Verification layer 2).
export default mergeConfig(
  viteConfig,
  defineConfig({
    // Pre-bundle app deps up front: if Vite discovers them mid-run it re-bundles, and a browser
    // that already loaded the old chunks ends up with two copies of Vitest's runner.
    optimizeDeps: { include: ['vue', 'vue-router'] },
    test: {
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      browser: {
        enabled: true,
        provider: playwright(),
        headless: true,
        instances: [{ browser: 'chromium' }, { browser: 'firefox' }],
      },
    },
  }),
)
