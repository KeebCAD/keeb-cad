import { defineConfig } from 'vitest/config'

// Unit tests, plus the kicad-drc script's no-kicad-cli test; e2e/ belongs to Playwright.
export default defineConfig({
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'], environment: 'node' },
})
