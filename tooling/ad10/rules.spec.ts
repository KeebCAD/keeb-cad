// Proves every AD-10 rule in .dependency-cruiser.mts against a committed tree of
// deliberate violations (./violations), cruised with the real config.
import { fileURLToPath } from 'node:url'
import { cruise, type ICruiseResult } from 'dependency-cruiser'
import { describe, expect, it } from 'vitest'
import config, { VUE, VUE_REACTIVITY, npm } from '../../.dependency-cruiser.mts'

const violationsDir = fileURLToPath(new URL('violations', import.meta.url))
const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

async function cruiseWithConfig(paths: string[], baseDir: string): Promise<ICruiseResult> {
  const { output } = await cruise(
    paths,
    { baseDir, ruleSet: config, validate: true },
    config.options?.enhancedResolveOptions,
  )
  if (typeof output === 'string') throw new TypeError('expected a cruise result object')
  return output
}

describe('AD-10 rules on the violation tree', async () => {
  const result = await cruiseWithConfig(['packages', 'app', 'fixtures'], violationsDir)
  const violations = result.summary.violations.map((v) => ({
    rule: v.rule.name,
    from: v.from,
    to: v.to,
  }))

  it('reports exactly the deliberate violations, each under one rule', () => {
    const sorted = violations.toSorted((a, b) =>
      `${a.rule} ${a.from} ${a.to}`.localeCompare(`${b.rule} ${b.from} ${b.to}`),
    )
    expect(sorted).toEqual([
      {
        rule: 'case-imports-only-model-and-geometry',
        from: 'packages/case/src/index.ts',
        to: 'packages/reactive/src/index.ts',
      },
      { rule: 'editor-imports-no-stage', from: 'app/src/App.vue', to: '@keeb-cad/plates' },
      {
        rule: 'editor-imports-no-stage',
        from: 'app/src/main.ts',
        to: 'packages/plates/src/index.ts',
      },
      {
        rule: 'exports-and-library-import-only-model',
        from: 'packages/library/src/index.ts',
        to: 'packages/storage/src/index.ts',
      },
      {
        rule: 'firmware-drc-and-storage-import-only-model-and-reactive',
        from: 'packages/drc/src/index.ts',
        to: 'packages/geometry/src/index.ts',
      },
      {
        rule: 'fixtures-only-in-tests',
        from: 'packages/model/src/index.ts',
        to: '@keeb-cad/fixtures',
      },
      {
        rule: 'model-imports-only-reactive-and-geometry',
        from: 'packages/model/src/index.ts',
        to: 'packages/library/src/index.ts',
      },
      {
        rule: 'nothing-imports-editor',
        from: 'packages/pipeline/src/index.ts',
        to: 'app/src/main.ts',
      },
      {
        rule: 'nothing-imports-editor',
        from: 'packages/plates/src/index.ts',
        to: '@keeb-cad/editor',
      },
      {
        rule: 'only-editor-imports-ui',
        from: 'packages/pipeline/src/index.ts',
        to: 'packages/ui/src/index.ts',
      },
      { rule: 'only-editor-imports-vue', from: 'packages/storage/src/index.ts', to: 'vue' },
      {
        rule: 'only-geometry-imports-makerjs',
        from: 'packages/plates/src/index.ts',
        to: 'makerjs',
      },
      {
        rule: 'only-reactive-imports-vue-reactivity',
        from: 'packages/storage/src/index.ts',
        to: '@vue/reactivity',
      },
      { rule: 'only-register-imports-immer', from: 'packages/model/src/index.ts', to: 'immer' },
      { rule: 'only-ui-imports-reka-and-zag', from: 'app/src/main.ts', to: '@zag-js/hotkeys' },
      { rule: 'only-ui-imports-reka-and-zag', from: 'app/src/main.ts', to: 'reka-ui' },
      {
        rule: 'pipeline-imports-no-storage',
        from: 'packages/pipeline/src/index.ts',
        to: 'packages/storage/src/index.ts',
      },
      {
        rule: 'plates-and-pcb-import-only-model-geometry-reactive',
        from: 'packages/plates/src/index.ts',
        to: '@keeb-cad/pcb',
      },
      {
        rule: 'plates-and-pcb-import-only-model-geometry-reactive',
        from: 'packages/plates/src/index.ts',
        to: 'packages/pcb/src/index.ts',
      },
      {
        rule: 'reactive-geometry-and-ui-import-no-workspace-package',
        from: 'packages/geometry/src/index.ts',
        to: 'packages/model/src/index.ts',
      },
      {
        rule: 'routing-imports-only-model-and-drc',
        from: 'packages/routing/src/index.ts',
        to: 'packages/pcb/src/index.ts',
      },
      {
        rule: 'worker-imports-no-reactive',
        from: 'packages/pipeline/src/route.worker.ts',
        to: 'packages/reactive/src/index.ts',
      },
    ])
  })

  it('reports no import under two rules', () => {
    const edges = violations.map((v) => `${v.from} -> ${v.to}`)
    expect(edges.filter((e, i) => edges.indexOf(e) !== i)).toEqual([])
  })

  it('exercises every forbidden rule in the config', () => {
    const reported = new Set(violations.map((v) => v.rule))
    const configured = new Set((config.forbidden ?? []).map((r) => r.name))
    expect(reported).toEqual(configured)
  })

  it('allows a model test to import fixtures', () => {
    expect(violations.filter((v) => v.from === 'packages/model/src/x.spec.ts')).toEqual([])
    // The allowed edge was really cruised, not silently dropped.
    const spec = result.modules.find((m) => m.source === 'packages/model/src/x.spec.ts')
    expect(spec?.dependencies.map((d) => d.module)).toContain('@keeb-cad/fixtures')
  })

  // Each allowed edge reports nothing and was really cruised, not silently dropped.
  it.each([
    [
      'routing',
      'drc and model',
      'packages/routing/src/index.ts',
      ['packages/drc/src/index.ts', 'packages/model/src/index.ts'],
    ],
    [
      'model',
      'reactive and geometry',
      'packages/model/src/index.ts',
      ['packages/reactive/src/index.ts', 'packages/geometry/src/index.ts'],
    ],
    [
      'plates',
      'model, geometry and reactive',
      'packages/plates/src/index.ts',
      [
        'packages/model/src/index.ts',
        'packages/geometry/src/index.ts',
        'packages/reactive/src/index.ts',
      ],
    ],
    [
      'pcb',
      'model, geometry and reactive',
      'packages/pcb/src/index.ts',
      [
        'packages/model/src/index.ts',
        'packages/geometry/src/index.ts',
        'packages/reactive/src/index.ts',
      ],
    ],
    [
      'case',
      'model and geometry',
      'packages/case/src/index.ts',
      ['packages/model/src/index.ts', 'packages/geometry/src/index.ts'],
    ],
    [
      'drc',
      'model and reactive',
      'packages/drc/src/index.ts',
      ['packages/model/src/index.ts', 'packages/reactive/src/index.ts'],
    ],
    [
      'firmware',
      'model and reactive',
      'packages/firmware/src/index.ts',
      ['packages/model/src/index.ts', 'packages/reactive/src/index.ts'],
    ],
    [
      'storage',
      'model and reactive',
      'packages/storage/src/index.ts',
      ['packages/model/src/index.ts', 'packages/reactive/src/index.ts'],
    ],
    ['reactive', '@vue/reactivity', 'packages/reactive/src/index.ts', ['@vue/reactivity']],
    [
      'ui',
      'vue, @vueuse/core, reka-ui and @zag-js/hotkeys',
      'packages/ui/src/index.ts',
      ['vue', '@vueuse/core', 'reka-ui', '@zag-js/hotkeys'],
    ],
    ['the editor', 'ui', 'app/src/main.ts', ['packages/ui/src/index.ts']],
    ["model's register concept", 'immer', 'packages/model/src/register/index.ts', ['immer']],
    [
      'non-worker pipeline code',
      'reactive',
      'packages/pipeline/src/reach.ts',
      ['packages/reactive/src/index.ts'],
    ],
  ])('allows %s to import %s', (_who, _what, from, targets) => {
    const reported = violations.filter((v) => v.from === from).map((v) => v.to)
    expect(reported.filter((to) => targets.includes(to))).toEqual([])
    const module = result.modules.find((m) => m.source === from)
    const edges = module?.dependencies.map((d) => (d.couldNotResolve ? d.module : d.resolved))
    expect(edges).toEqual(expect.arrayContaining(targets))
  })
})

describe('AD-10 config on the real editor', async () => {
  // The violation tree has no node_modules, so its bare imports stay unresolved. Only a
  // real, declared import proves the resolve options and the anchored `exclude` keep a
  // resolved npm target for only-editor-imports-vue to see.
  const result = await cruiseWithConfig(['app/src/main.ts'], repoRoot)

  it('resolves and keeps the vue dependency of app/src/main.ts', () => {
    const main = result.modules.find((m) => m.source === 'app/src/main.ts')
    const dep = main?.dependencies.find((d) => d.module === 'vue')
    expect(dep).toBeDefined()
    expect(dep?.couldNotResolve).toBe(false)
    expect(dep?.resolved).toMatch(new RegExp(VUE))
    expect(dep?.resolved).toMatch(/(^|\/)node_modules\//)
  })
})

describe('the Vue target regex', () => {
  const vue = new RegExp(VUE)

  it.each([
    'node_modules/.pnpm/vue@3.5.44/node_modules/vue/index.js',
    'node_modules/.pnpm/@vue+shared@3.5.44/node_modules/@vue/shared/index.js',
    'node_modules/.pnpm/vue-router@5.4.0/node_modules/vue-router/index.cjs',
    'node_modules/.pnpm/pinia@4.1.0/node_modules/pinia/dist/pinia.js',
    'vue',
    'vue/server-renderer',
    '@vue/shared',
    'vue-router',
    'pinia',
    'node_modules/.pnpm/@vueuse+core@14.4.0/node_modules/@vueuse/core/index.mjs',
    '@vueuse/core',
    '@vue/reactivity-transform',
    'app/src/x.vue',
  ])('matches %s', (path) => {
    expect(vue.test(path)).toBe(true)
  })

  it.each([
    'vuex-like',
    'node_modules/.pnpm/vuex-like@1.0.0/node_modules/vuex-like/index.js',
    'piniacolada',
    'packages/model/src/vue-helpers.ts',
    // @vue/reactivity belongs to reactive alone (only-reactive-imports-vue-reactivity).
    '@vue/reactivity',
    'node_modules/.pnpm/@vue+reactivity@3.5.44/node_modules/@vue/reactivity/dist/reactivity.d.ts',
  ])('does not match %s', (path) => {
    expect(vue.test(path)).toBe(false)
  })
})

describe('the npm target regexes', () => {
  const vueReactivity = new RegExp(VUE_REACTIVITY)
  const immer = new RegExp(npm('immer'))

  it.each([
    'node_modules/.pnpm/@vue+reactivity@3.5.44/node_modules/@vue/reactivity/dist/reactivity.d.ts',
    '@vue/reactivity',
  ])('VUE_REACTIVITY matches %s', (path) => {
    expect(vueReactivity.test(path)).toBe(true)
  })

  it.each(['@vue/reactivity-transform', '@vue/shared'])(
    'VUE_REACTIVITY does not match %s',
    (path) => {
      expect(vueReactivity.test(path)).toBe(false)
    },
  )

  it('npm(immer) matches a resolved immer path and not immer-like', () => {
    expect(immer.test('node_modules/.pnpm/immer@11.2.9/node_modules/immer/dist/immer.d.ts')).toBe(
      true,
    )
    expect(immer.test('immer-like')).toBe(false)
    expect(immer.test('node_modules/.pnpm/immer-like@1.0.0/node_modules/immer-like/index.js')).toBe(
      false,
    )
  })
})
