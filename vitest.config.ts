import { configDefaults, defineConfig } from 'vitest/config'

// One workspace-wide run. Projects are listed explicitly so nothing outside them
// (notably spikes/) is ever collected.
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      'packages/*',
      'fixtures',
      {
        // di's root specs touch no DOM, so they run on Node (Verification layer 2); its
        // vitest.config.ts runs only the Vue bridge's, in browsers.
        test: {
          name: 'di',
          root: 'packages/di',
          environment: 'node',
          include: ['src/**/*.spec.ts'],
          exclude: [...configDefaults.exclude, 'src/vue/**'],
        },
      },
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
