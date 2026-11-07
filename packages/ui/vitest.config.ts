import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import type { BrowserCommand } from 'vitest/node'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'

// `null` hands the scheme back to the browser's own default.
const setColorScheme: BrowserCommand<[scheme: 'light' | 'dark' | null]> = async (
  { page },
  scheme,
) => {
  await page.emulateMedia({ colorScheme: scheme })
}

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // Pre-bundle app deps up front: if Vite discovers them mid-run it re-bundles, and a browser
  // that already loaded the old chunks ends up with two copies of Vitest's runner.
  optimizeDeps: { include: ['vue', 'reka-ui', '@zag-js/hotkeys', '@lucide/vue', '@vueuse/core'] },
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
      instances: [{ browser: 'chromium' }, { browser: 'firefox' }],
      commands: { setColorScheme },
    },
  },
})
