import { existsSync, globSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('./', import.meta.url))

const packageName = (dir: string) =>
  (JSON.parse(readFileSync(path.join(root, dir, 'package.json'), 'utf8')) as { name: string }).name

// A directory listed as a project, with no config file of its own, inherits nothing from this
// one (`sequence` included), so each becomes an inline project, which extends it. The name stays
// the package name Vitest would give the directory.
const configlessProjects = [
  'fixtures/package.json',
  ...globSync('packages/*/package.json', { cwd: root }),
]
  .map((manifest) => path.dirname(manifest))
  .filter((dir) => !existsSync(path.join(root, dir, 'vitest.config.ts')))
  .map((dir) => ({
    test: { name: packageName(dir), root: dir },
  }))

// expectTypeOf and @ts-expect-error do nothing at run time, so a test resting on them passes
// whatever the types say. Each package whose specs have a tsconfig gets a second project that
// runs them through vue-tsc instead, and a type error fails the test it sits in.
const typeProjects = globSync('packages/*/tsconfig.vitest.json', { cwd: root })
  .map((tsconfig) => path.dirname(tsconfig))
  .map((dir) => ({
    test: {
      name: `${packageName(dir)} types`,
      root: dir,
      typecheck: {
        enabled: true,
        only: true,
        checker: 'vue-tsc',
        tsconfig: 'tsconfig.vitest.json',
        include: ['src/**/*.spec.ts'],
      },
    },
  }))

// One workspace-wide run. Projects are listed explicitly so nothing outside them
// (notably spikes/) is ever collected.
export default defineConfig({
  test: {
    passWithNoTests: true,
    // Random order exposes tests that lean on one another. Every project takes this config's seed,
    // which Vitest prints, so `--sequence.seed` replays a run; a project with a config file of its
    // own sets shuffle again.
    sequence: { shuffle: true },
    projects: [
      'packages/*/vitest.config.ts',
      ...configlessProjects,
      ...typeProjects,
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
        // app's specs wire the main container on Node; its end-to-end specs run under Playwright.
        test: {
          name: '@keeb-cad/app',
          root: 'app',
          environment: 'node',
          include: ['src/**/*.spec.ts'],
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
