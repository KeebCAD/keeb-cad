import { configDefaults, defineConfig } from 'vitest/config'

// One workspace-wide run. Projects are listed explicitly so nothing outside them
// (notably spikes/) is ever collected.
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      'packages/*',
      'fixtures',
      'app',
      {
        test: {
          name: 'tooling',
          environment: 'node',
          include: ['tooling/**/*.spec.ts'],
          // The AD-10 violation tree holds a deliberate *.spec.ts fixture, not a test.
          exclude: [...configDefaults.exclude, 'tooling/**/violations/**'],
        },
      },
    ],
  },
})
