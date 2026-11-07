import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
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
      instances: [{ browser: 'chromium' }, { browser: 'firefox' }],
    },
  },
})
