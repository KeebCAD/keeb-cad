import { globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginPlaywright from 'eslint-plugin-playwright'
import pluginVitest from '@vitest/eslint-plugin'
import pluginUnicorn from 'eslint-plugin-unicorn'
import pluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// The one lint config for the whole workspace. Under `hoist: false` every plugin imported here
// must be a root devDependency. Formatting belongs to Prettier (see .prettierrc.json).
// `pnpm lint` caches results per file, which holds only while no rule is type-aware: a type-aware
// rule reads other files, so a cached result would go stale when they change.

// Keep in step with .prettierignore.
const IGNORED = [
  'packages/library/compiled/**',
  'spikes/**',
  '_bmad*/**',
  '.agents/**',
  '.claude/**',
  '**/dist/**',
  '**/dist-ssr/**',
  '**/coverage/**',
  '**/test-results/**',
  '**/playwright-report/**',
  // Stryker's sandboxes and reports.
  '.stryker-tmp/**',
  'reports/**',
  // Deliberate dependency-rule violations, cruised by tooling/ad10/rules.spec.ts.
  'tooling/ad10/violations/**',
  // Ergogen's input and output, committed verbatim.
  'reference-designs/corney-island/source/**',
  'reference-designs/corney-island/ergogen/**',
]

// Root, app, editor, di and ui tool configs, tooling/ and the e2e specs run in Node.js.
const NODE_FILES = [
  '*.config.ts',
  '.dependency-cruiser.mts',
  'tooling/**',
  'app/*.config.ts',
  'packages/editor/*.config.ts',
  'packages/di/*.config.ts',
  'packages/messaging/*.config.ts',
  'packages/workers/*.config.ts',
  'packages/storage/*.config.ts',
  'packages/blueprint/*.config.ts',
  'packages/pipeline/*.config.ts',
  'packages/ui/*.config.ts',
  'packages/ui/workbench/vite.config.ts',
  'app/e2e/**',
]

// A type that pairs with a same-named value stays in the value's file: TypeScript merges the pair
// only within one file.
const PAIRED_TYPES = ['Result', 'Option']

const TYPES_OUTSIDE_TYPES_TS = {
  selector: `:matches(TSTypeAliasDeclaration, TSInterfaceDeclaration):not([id.name=/^(${PAIRED_TYPES.join('|')})$/])`,
  message:
    "Declare types in this folder's types.ts. A type paired with a same-named value joins PAIRED_TYPES in eslint.config.ts.",
}

const ENTRY_RE_EXPORTS_ONLY = {
  selector:
    'Program > :not(ExportAllDeclaration, ExportNamedDeclaration[source], ExportNamedDeclaration[declaration=null][specifiers.length=0])',
  message:
    'A package entry file only re-exports (`export … from`, `export * from`, or the stub `export {}`); put code in a file named for what it does.',
}

// The shapes a recording shared between tests takes, at module level or directly in a describe
// callback. A non-empty table (`as const` or not) is a fixture and stays allowed.
const DESCRIBE_CALL =
  "CallExpression:matches([callee.name='describe'], [callee.object.name='describe'], [callee.callee.object.name='describe'])"
const SPEC_SCOPES = [
  'Program',
  'Program > ExportNamedDeclaration',
  `${DESCRIBE_CALL} > :function > BlockStatement`,
]
const inSpecScope = (selector: string) =>
  `:matches(${SPEC_SCOPES.map((scope) => `${scope} > ${selector}`).join(', ')})`
const EMPTY_CONTAINER =
  'ArrayExpression[elements.length=0], ObjectExpression[properties.length=0], NewExpression[callee.name=/^(Map|Set|WeakMap|WeakSet|Array)$/]'
const SHARED_SPEC_STATE = [
  {
    selector: inSpecScope('VariableDeclaration[kind=/^(let|var)$/]'),
    message:
      'No `let` or `var` at module level or in a describe callback; create state inside the test.',
  },
  {
    // Any spy call outside every function but describe callbacks; one inside a helper or a test
    // is created per call.
    selector: `CallExpression[callee.object.name='vi'][callee.property.name=/^(fn|spyOn)$/]:not(:function:not(${DESCRIBE_CALL} > :function) CallExpression)`,
    message:
      'No vi.fn or vi.spyOn at module level or in a describe callback; create spies inside the test.',
  },
  {
    selector: [
      `> :matches(${EMPTY_CONTAINER}).init`,
      `> :matches(TSAsExpression, TSSatisfiesExpression).init > :matches(${EMPTY_CONTAINER}).expression`,
    ]
      .map(
        (init) =>
          `${inSpecScope("VariableDeclaration[kind='const'] > VariableDeclarator")} ${init}`,
      )
      .join(', '),
    message:
      'No empty array, object, Map, Set, WeakMap, WeakSet or Array at module level or in a describe callback; create recordings inside the test.',
  },
]

// A class whose utility, after its variants, holds a bracket or parenthesis: `p-[7px]`,
// `hover:bg-[#fff]`, `[mask:none]`, `p-(--x)`. A bracket inside a variant (`data-[state=active]:`)
// sits before a top-level colon, so the variants part takes it and the class stays allowed.
const BRACKETED = String.raw`\[[^\]]*\]|\([^)]*\)`
const PLAIN = String.raw`[^:\[\]()]`
const ARBITRARY_VALUE_PATTERN = `^(?:(?:${PLAIN}|${BRACKETED})*:)*${PLAIN}*(?:${BRACKETED})(?:${PLAIN}|${BRACKETED})*$`

// Test-rule bans ported from the ninja-testing plugin's test-lint (MIT, Copyright (c) 2026 Illya
// Klymov); the behaviours, not its code.
const SNAPSHOT_MESSAGE = 'Assert data explicitly; snapshots are not used here.'
const SNAPSHOT_MATCHERS = [
  'toMatchSnapshot',
  'toMatchInlineSnapshot',
  'toMatchFileSnapshot',
  'toThrowErrorMatchingSnapshot',
  'toThrowErrorMatchingInlineSnapshot',
]
// The rule matches whole chains, so each modifier chain is listed.
const MATCHER_MODIFIERS = ['', 'not.', 'resolves.', 'rejects.', 'resolves.not.', 'rejects.not.']
const RESTRICTED_MATCHERS = Object.fromEntries(
  MATCHER_MODIFIERS.flatMap((modifier) =>
    SNAPSHOT_MATCHERS.map((matcher) => [`${modifier}${matcher}`, SNAPSHOT_MESSAGE]),
  ),
)

const MODULE_MOCK_MESSAGE =
  'Substitute through di: register a fake in the container instead of mocking a module.'

const TRY_IN_TEST = {
  selector:
    'CallExpression:matches([callee.name=/^(it|test)$/], [callee.object.name=/^(it|test)$/], [callee.callee.object.name=/^(it|test)$/]) > :function TryStatement',
  message: 'No try in a test; assert a throw as `expect(() => fn()).toThrow(…)`.',
}

// Inline config is ignored, so an exception is a file override here, where its reason is reviewed
// with the rest of the config.
const TEST_ID_MESSAGE =
  'Find elements by role, then label, then text. A test id is a last resort, behind a file override in eslint.config.ts whose comment gives the reason.'

// A runtime project skips a type spec, so a runtime assertion there would never run.
const TYPE_SPEC_MESSAGE =
  'A *.types.spec.ts runs only in its types project, where `expect`, `assert` and `should` never run; assert with expectTypeOf, or move the test to a runtime spec.'

const SERVICE_IMPORT_MESSAGE =
  "A component reaches services only through editor's composables; import a composable instead of di or di/vue."

export default defineConfigWithVueTs(
  {
    name: 'keeb-cad/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(IGNORED),

  {
    // A comment can't silence a rule, so lint can't go green without checking anything; an
    // exception is a file override below, whose comment gives the reason.
    name: 'keeb-cad/no-inline-config',
    linterOptions: { noInlineConfig: true },
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  pluginUnicorn.configs.unopinionated,

  {
    // noInlineConfig leaves the comment in place, so it would still read as if it silenced a rule.
    name: 'keeb-cad/no-eslint-comments',
    rules: {
      'no-warning-comments': [
        'error',
        { terms: ['eslint-disable', 'eslint-enable', 'eslint'], location: 'start' },
      ],
    },
  },

  {
    // The Vue plugin applies a template's `<!-- eslint-disable -->` itself, ignoring
    // noInlineConfig.
    name: 'keeb-cad/no-vue-template-directives',
    files: ['**/*.vue'],
    rules: {
      'vue/comment-directive': 'off',
    },
  },

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
    rules: {
      ...pluginPlaywright.configs['flat/recommended'].rules,
      'playwright/no-skipped-test': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-conditional-expect': 'error',
      'playwright/expect-expect': 'error',
    },
  },

  {
    ...pluginVitest.configs.recommended,
    files: ['**/*.spec.ts'],
    ignores: ['app/e2e/**'],
    rules: {
      ...pluginVitest.configs.recommended.rules,
      'vitest/no-restricted-matchers': ['error', RESTRICTED_MATCHERS],
      'vitest/no-restricted-vi-methods': [
        'error',
        { mock: MODULE_MOCK_MESSAGE, doMock: MODULE_MOCK_MESSAGE },
      ],
      'vitest/no-conditional-in-test': 'error',
      'vitest/no-conditional-expect': 'error',
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
      'vitest/expect-expect': [
        'error',
        {
          assertFunctionNames: [
            'expect',
            'expectOk',
            'expectErr',
            'expectResult',
            'expectDeeplyFrozen',
            'expectNothingFrozen',
          ],
        },
      ],
    },
  },

  {
    // After the block above: `**/*.spec.ts` matches type specs too, and the later options win.
    name: 'keeb-cad/type-specs',
    files: ['**/*.types.spec.ts'],
    // The Vitest plugin is registered only outside app/e2e.
    ignores: ['app/e2e/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'vitest',
              importNames: ['expect', 'assert', 'should'],
              message: TYPE_SPEC_MESSAGE,
            },
          ],
        },
      ],
      'vitest/expect-expect': ['error', { assertFunctionNames: ['expectTypeOf'] }],
    },
  },

  {
    // Ok and Err, Some and None share signatures; the side that ignores a callback keeps it so
    // the callback's type arguments still infer.
    name: 'keeb-cad/result-mirrored-parameters',
    files: ['packages/result/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  {
    // An entry's apply declares its input exactly as its schema outputs, even when it ignores it.
    name: 'keeb-cad/entry-parameters',
    files: [
      'packages/commands/src/**/*.ts',
      'packages/design/src/**/*.spec.ts',
      // editor's UiActions are entries too.
      'packages/editor/src/{workspace,landmarks,slide-out,viewport,selection,add-flow}/**/*.ts',
      // So are the test entries the flow specs run.
      'packages/editor/src/testing/test-*.ts',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  {
    name: 'keeb-cad/types-in-types-ts',
    files: ['packages/*/src/**/*.{ts,vue}', 'app/src/**/*.{ts,vue}'],
    ignores: ['**/types.ts', '**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': ['error', TYPES_OUTSIDE_TYPES_TS],
    },
  },

  {
    // Replaces the types rule's options on entry files, so it carries that selector too.
    name: 'keeb-cad/entry-files-re-export',
    files: ['packages/*/src/**/{index,main,worker}.ts', 'app/src/{main,*.worker}.ts'],
    rules: {
      'no-restricted-syntax': ['error', ENTRY_RE_EXPORTS_ONLY, TYPES_OUTSIDE_TYPES_TS],
    },
  },

  {
    name: 'keeb-cad/spec-restricted-syntax',
    files: ['**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...SHARED_SPEC_STATE, TRY_IN_TEST],
    },
  },

  {
    name: 'keeb-cad/no-test-ids',
    files: ['**/*.{vue,ts,mts,tsx}'],
    rules: {
      'no-restricted-properties': ['error', { property: 'getByTestId', message: TEST_ID_MESSAGE }],
      'vue/no-restricted-static-attribute': [
        'error',
        { key: 'data-testid', message: TEST_ID_MESSAGE },
      ],
      'vue/no-restricted-v-bind': ['error', { argument: 'data-testid', message: TEST_ID_MESSAGE }],
    },
  },

  {
    name: 'keeb-cad/no-services-in-components',
    files: ['**/*.vue'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@keeb-cad/di', message: SERVICE_IMPORT_MESSAGE, allowTypeImports: true },
            { name: '@keeb-cad/di/vue', message: SERVICE_IMPORT_MESSAGE, allowTypeImports: true },
          ],
        },
      ],
    },
  },

  {
    name: 'keeb-cad/no-arbitrary-values',
    files: ['**/*.vue'],
    plugins: { 'better-tailwindcss': pluginBetterTailwindcss },
    settings: { 'better-tailwindcss': { entryPoint: 'packages/ui/src/theme/theme.css' } },
    rules: {
      'better-tailwindcss/no-restricted-classes': [
        'error',
        {
          restrict: [
            {
              pattern: ARBITRARY_VALUE_PATTERN,
              message:
                "No arbitrary values: use a design token from ui's @theme, or add the token to DESIGN.md first.",
            },
          ],
        },
      ],
    },
  },

  // File overrides go last, after every rules block, so they win.
  {
    // reactive is the one wrapper of @vue/reactivity, so workers never load Vue.
    name: 'keeb-cad/reactive-keeps-workers-off-vue',
    files: ['packages/reactive/src/index.ts'],
    rules: {
      'vue/prefer-import-from-vue': 'off',
    },
  },

  {
    // AsyncResult wraps a promise and is awaited like one, so it chains with `then` throughout.
    name: 'keeb-cad/async-result-is-thenable',
    files: ['packages/result/src/async-result.ts'],
    rules: {
      'unicorn/no-thenable': 'off',
      'unicorn/prefer-await': 'off',
    },
  },

  skipFormatting,
)
