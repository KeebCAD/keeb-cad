import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

// The browser backend's specs need IndexedDB, so they run in real browsers; every other storage
// spec runs on Node, in the root config's `storage` project, where Stryker reaches it.
export default defineConfig({
  test: {
    name: 'storage/browser',
    root: fileURLToPath(new URL('./', import.meta.url)),
    // A config file of its own inherits nothing from the root, so it shuffles again here.
    sequence: { shuffle: true },
    expect: { requireAssertions: true },
    include: ['src/browser/**/*.spec.ts'],
    exclude: [...configDefaults.exclude, '**/*.types.spec.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }, { browser: 'firefox' }],
    },
  },
})
