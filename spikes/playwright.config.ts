import { defineConfig, devices } from '@playwright/test'

/** Headless Chromium against `vite preview` of the built dist/ (run `pnpm build` first). */
export default defineConfig({
  testDir: './e2e',
  timeout: 120 * 1000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4174',
    headless: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm exec vite preview --port 4174 --strictPort',
    port: 4174,
    reuseExistingServer: false,
  },
})
