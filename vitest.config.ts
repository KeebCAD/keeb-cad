import { defineConfig } from 'vitest/config'

// One workspace-wide run. Projects are listed explicitly so nothing outside them
// (notably spikes/) is ever collected.
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: ['packages/*', 'fixtures', 'app'],
  },
})
