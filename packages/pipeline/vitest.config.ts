import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { browserInstances } from '../../tooling/vitest/browser-instances'

export default defineConfig({
  // blueprint/worker imports it; discovered mid-run, Vite re-bundles and the browser reloads.
  optimizeDeps: { include: ['@keeb-cad/blueprint > quickjs-wasi'] },
  test: {
    root: fileURLToPath(new URL('./', import.meta.url)),
    // A config file of its own inherits nothing from the root, so it shuffles again here.
    sequence: { shuffle: true },
    expect: { requireAssertions: true },
    exclude: [...configDefaults.exclude, '**/*.types.spec.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: browserInstances,
    },
  },
})
