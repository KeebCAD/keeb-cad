import { globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginPlaywright from 'eslint-plugin-playwright'
import pluginVitest from '@vitest/eslint-plugin'
import pluginUnicorn from 'eslint-plugin-unicorn'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// The one lint config for the whole workspace. Under `hoist: false` every plugin imported here
// must be a root devDependency. Formatting belongs to Prettier (see .prettierrc.json).

// Keep in step with .prettierignore.
const IGNORED = [
  'spikes/**',
  '_bmad*/**',
  '.agents/**',
  '.claude/**',
  '**/dist/**',
  '**/dist-ssr/**',
  '**/coverage/**',
  '**/test-results/**',
  '**/playwright-report/**',
  // Deliberate AD-10 violations, cruised by tooling/ad10/rules.spec.ts.
  'tooling/ad10/violations/**',
  // Ergogen's input and output, committed verbatim.
  'fixtures/corney-island/source/**',
  'fixtures/corney-island/ergogen/**',
]

// Root and app tool configs, tooling/ and the e2e specs run in Node.js.
const NODE_FILES = [
  '*.config.ts',
  '.dependency-cruiser.mts',
  'tooling/**',
  'app/*.config.ts',
  'app/e2e/**',
]

export default defineConfigWithVueTs(
  {
    name: 'keeb-cad/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(IGNORED),

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  pluginUnicorn.configs.unopinionated,

  {
    name: 'keeb-cad/node-files',
    files: NODE_FILES,
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        URL: 'readonly',
      },
    },
  },

  {
    ...pluginPlaywright.configs['flat/recommended'],
    files: ['app/e2e/**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },

  {
    ...pluginVitest.configs.recommended,
    files: ['**/*.spec.ts'],
    ignores: ['app/e2e/**'],
  },

  skipFormatting,
)
