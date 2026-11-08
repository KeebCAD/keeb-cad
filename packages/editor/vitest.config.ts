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

// DOM tests run in real browsers, never a simulation (AD-26, Verification layer 2).
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // Pre-bundle app deps up front: if Vite discovers them mid-run it re-bundles, and a browser
  // that already loaded the old chunks ends up with two copies of Vitest's runner.
  // ui's own dependencies resolve only through ui under `hoist: false`, hence the `>` form.
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      '@keeb-cad/ui > reka-ui',
      '@keeb-cad/ui > @zag-js/hotkeys',
      '@keeb-cad/ui > @lucide/vue',
      '@keeb-cad/ui > @vueuse/core',
    ],
  },
  test: {
    root: fileURLToPath(new URL('./', import.meta.url)),
    // A config file of its own inherits nothing from the root, so it shuffles again here.
    sequence: { shuffle: true },
    expect: { requireAssertions: true },
    // The root config's editor project runs these folders on Node.
    exclude: [...configDefaults.exclude, '**/*.types.spec.ts', 'src/design/**'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }, { browser: 'firefox' }],
      commands: { setColorScheme },
    },
  },
})
