// Proves every rule in .dependency-cruiser.mts, cruised with the real config. The graph rules
// are proven from GRAPH itself: a tree generated in a temp dir imports, per row, one package the
// row is not drawn to and every package it is. The subpath, entry-fence, kernel and npm rules are
// proven by a committed tree of hand-written violations (./violations).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cruise, type ICruiseResult } from 'dependency-cruiser'
import { afterAll, describe, expect, it } from 'vitest'
import config, {
  ENTRY_ONLY,
  GRAPH,
  VUE,
  VUEUSE,
  VUE_REACTIVITY,
  allowedTargets,
  npm,
} from '../../.dependency-cruiser.mts'

const violationsDir = fileURLToPath(new URL('violations', import.meta.url))
const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

type Violation = { rule: string; from: string; to: string }

async function cruiseWithConfig(paths: string[], baseDir: string): Promise<ICruiseResult> {
  const { output } = await cruise(
    paths,
    { baseDir, ruleSet: config, validate: true },
    config.options?.enhancedResolveOptions,
  )
  if (typeof output === 'string') throw new TypeError('expected a cruise result object')
  return output
}

const violationsOf = (result: ICruiseResult): Violation[] =>
  result.summary.violations.map((v) => ({ rule: v.rule.name, from: v.from, to: v.to }))

/** The specifiers a module imports: resolved paths, or the bare name when unresolved. */
const edgesOf = (result: ICruiseResult, from: string) =>
  result.modules
    .find((m) => m.source === from)
    ?.dependencies.map((d) => (d.couldNotResolve ? d.module : d.resolved))

const ROWS = Object.keys(GRAPH)
const PACKAGES = ROWS.filter((row) => row !== 'reference-designs')

/** Where a row's generated probes live, under the cruised roots. */
const probeDir = (row: string) =>
  row === 'app'
    ? 'app/src'
    : row === 'reference-designs'
      ? 'reference-designs/src'
      : `packages/${row}/src`

/** The specifier a row uses for an allowed target: through the one entry ENTRY_ONLY allows. */
const specifier = (row: string, target: string) => {
  const sub = ENTRY_ONLY[row]?.[target]
  return sub === undefined || sub === '.' ? `@keeb-cad/${target}` : `@keeb-cad/${target}/${sub}`
}

/** The first package the row is neither drawn to nor is. */
const forbiddenTarget = (row: string) => {
  const target = PACKAGES.find((p) => p !== row && !allowedTargets(row).includes(p))
  if (target === undefined) throw new Error(`${row} may import every package`)
  return target
}

/**
 * The probe file that imports a row's allowed target. app reaches its ENTRY_ONLY targets only
 * through worker subpaths that only its model worker entry may import, so those go there, and
 * reference-designs only from tests, so that goes in a spec file.
 */
const allowedProbe = (row: string, target: string) =>
  row === 'app' && ENTRY_ONLY[row]?.[target] !== undefined
    ? `${probeDir(row)}/model.worker.ts`
    : target === 'reference-designs'
      ? `${probeDir(row)}/allowed.spec.ts`
      : `${probeDir(row)}/allowed.ts`

const allowedProbes = (row: string) => {
  const probes = new Map<string, string[]>()
  for (const target of allowedTargets(row)) {
    const file = allowedProbe(row, target)
    probes.set(file, [...(probes.get(file) ?? []), specifier(row, target)])
  }
  return probes
}

// One generated tree for every row: each probe imports only bare specifiers, which stay
// unresolved, so no probe reaches another and each row's result is its own.
function generateTree(dir: string): void {
  const write = (file: string, lines: string[]) => {
    const target = path.join(dir, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, lines.map((line) => `${line}\n`).join(''))
  }
  for (const row of ROWS) {
    write(`${probeDir(row)}/forbidden.ts`, [`import '@keeb-cad/${forbiddenTarget(row)}'`])
    for (const [file, specifiers] of allowedProbes(row)) {
      write(
        file,
        specifiers.map((s) => `import '${s}'`),
      )
    }
  }
}

const EIGHT_KERNELS = ['expr', 'reactive', 'messaging', 'hashing', 'geometry', 'di', 'result', 'ui']

describe('the rules on cruised trees', async () => {
  const generatedDir = mkdtempSync(path.join(tmpdir(), 'keeb-cad-ad10-'))
  afterAll(() => rmSync(generatedDir, { recursive: true, force: true }))
  generateTree(generatedDir)
  const generated = await cruiseWithConfig(['packages', 'app', 'reference-designs'], generatedDir)

  describe('graph rules, generated from GRAPH', () => {
    const result = generated
    const violations = violationsOf(result)

    it('covers all 29 packages plus reference-designs', () => {
      expect(ROWS).toHaveLength(30)
    })

    it.each(ROWS)('%s: an undrawn import fires its imports-only rule, and only it', (row) => {
      const from = `${probeDir(row)}/forbidden.ts`
      expect(violations.filter((v) => v.from === from)).toEqual([
        {
          rule: `${row}-imports-only-drawn-edges`,
          from,
          to: `@keeb-cad/${forbiddenTarget(row)}`,
        },
      ])
    })

    // A row drawn to nothing has no allowed probe, so there is nothing to cruise.
    it.each(ROWS.filter((row) => allowedTargets(row).length > 0))(
      '%s: every drawn import reports nothing',
      (row) => {
        const probes = [...allowedProbes(row).keys()]
        expect(violations.filter((v) => probes.includes(v.from))).toEqual([])
        // The allowed edges were really cruised, not silently dropped.
        expect(probes.flatMap((from) => edgesOf(result, from) ?? [])).toEqual(
          expect.arrayContaining(allowedTargets(row).map((target) => specifier(row, target))),
        )
      },
    )

    it.each(ROWS.filter((row) => !EIGHT_KERNELS.includes(row)))(
      '%s, outside the kernels, may import di, reactive and result',
      (row) => {
        expect(allowedTargets(row)).toEqual(expect.arrayContaining(['di', 'reactive', 'result']))
      },
    )

    it.each(EIGHT_KERNELS.filter((kernel) => kernel !== 'result'))(
      '%s, a kernel, may import only result',
      (kernel) => {
        expect(allowedTargets(kernel)).toEqual(['result'])
      },
    )

    it('result may import no workspace package', () => {
      expect(allowedTargets('result')).toEqual([])
    })
  })

  describe('rules on the hand-written violation tree', async () => {
    const result = await cruiseWithConfig(['packages', 'app'], violationsDir)
    const violations = violationsOf(result)

    // Not an exact list: each fixture proves its rule can fire.
    it('fires each deliberate violation under its rule', () => {
      const v = (rule: string, from: string, to: string) => ({ rule, from, to })
      expect(violations).toEqual(
        expect.arrayContaining([
          v('app-imports-model-worker-only', 'app/src/autosave.ts', '@keeb-cad/model'),
          v('app-imports-library-worker-only', 'app/src/autosave.ts', '@keeb-cad/library'),
          v('case-worker-entry-reaches-no-model', 'app/src/case.worker.ts', '@keeb-cad/model/main'),
          v(
            'commands-design-pipeline-import-library-root-only',
            'packages/design/src/index.ts',
            '@keeb-cad/library/worker',
          ),
          v(
            'commands-design-pipeline-import-library-root-only',
            'packages/pipeline/src/index.ts',
            '@keeb-cad/library/worker',
          ),
          v(
            'editor-commands-design-import-model-main-only',
            'packages/editor/src/index.ts',
            '@keeb-cad/model',
          ),
          v(
            'reference-designs-only-in-tests',
            'packages/model/src/index.ts',
            '@keeb-cad/reference-designs',
          ),
          v('geometry-imports-only-drawn-edges', 'packages/geometry/src/index.ts', '@keeb-cad/di'),
          v(
            'geometry-imports-only-drawn-edges',
            'packages/geometry/src/index.ts',
            '@keeb-cad/reactive',
          ),
          v(
            'main-entry-reaches-no-pipeline-stage-or-sandbox',
            'app/src/main.ts',
            '@keeb-cad/blueprint/worker',
          ),
          v('main-entry-reaches-no-pipeline-stage-or-sandbox', 'app/src/main.ts', '@keeb-cad/case'),
          v(
            'main-entry-reaches-no-pipeline-stage-or-sandbox',
            'app/src/main.ts',
            '@keeb-cad/pipeline',
          ),
          v('main-entry-reaches-no-pipeline-stage-or-sandbox', 'app/src/main.ts', 'quickjs-wasi'),
          v(
            'model-root-and-main-reach-no-blueprint',
            'packages/model/src/main.ts',
            '@keeb-cad/blueprint',
          ),
          v('only-design-imports-immer', 'packages/model/src/index.ts', 'immer'),
          v('only-storage-browser-imports-dexie', 'packages/storage/src/index.ts', 'dexie'),
          v('di-root-reaches-no-vue', 'packages/di/src/index.ts', 'packages/di/src/vue/index.ts'),
          v('di-root-reaches-no-vue', 'packages/di/src/wiring.ts', 'packages/di/src/vue/index.ts'),
          v('di-root-reaches-no-vue', 'packages/di/src/index.ts', '@keeb-cad/di/vue'),
          v('di-root-reaches-no-vue', 'packages/di/src/wiring.ts', '@keeb-cad/di/vue'),
          v('only-editor-and-ui-import-vueuse', 'packages/di/src/vue/index.ts', '@vueuse/core'),
          v('only-editor-imports-di-vue', 'packages/storage/src/index.ts', '@keeb-cad/di/vue'),
          v('only-editor-ui-and-di-vue-import-vue', 'packages/di/src/wiring.ts', 'vue'),
          v('only-editor-ui-and-di-vue-import-vue', 'packages/storage/src/index.ts', 'vue'),
          v('only-geometry-imports-makerjs', 'packages/plates/src/index.ts', 'makerjs'),
          v(
            'only-model-worker-entry-and-pipeline-import-design-worker',
            'app/src/autosave.ts',
            '@keeb-cad/design/worker',
          ),
          v(
            'only-model-worker-entry-and-pipeline-import-design-worker',
            'app/src/spec-helper.ts',
            '@keeb-cad/design/worker',
          ),
          v(
            'only-model-worker-entry-imports-model-worker',
            'app/src/autosave.ts',
            '@keeb-cad/model/worker',
          ),
          v(
            'only-model-worker-entry-imports-model-worker',
            'app/src/spec-helper.ts',
            '@keeb-cad/model/worker',
          ),
          v(
            'only-reactive-imports-vue-reactivity',
            'packages/storage/src/index.ts',
            '@vue/reactivity',
          ),
          v(
            'only-tests-import-testing',
            'packages/design/src/index.ts',
            'packages/design/src/testing/bundle.ts',
          ),
          v(
            'only-tests-import-testing',
            'packages/storage/src/index.ts',
            '@keeb-cad/result/testing',
          ),
          v(
            'only-tests-import-testing',
            'packages/storage/src/index.ts',
            '@keeb-cad/schema/testing',
          ),
          v('only-ui-imports-its-widget-libraries', 'packages/editor/src/index.ts', '@lucide/vue'),
          v(
            'only-ui-imports-its-widget-libraries',
            'packages/editor/src/index.ts',
            '@zag-js/hotkeys',
          ),
          v('only-ui-imports-its-widget-libraries', 'packages/editor/src/index.ts', 'reka-ui'),
          v(
            'only-ui-imports-the-workbench',
            'packages/editor/src/workbench-import.ts',
            'packages/ui/workbench/states/button-states.ts',
          ),
          v(
            'only-worker-entries-import-library-worker',
            'app/src/autosave.ts',
            '@keeb-cad/library/worker',
          ),
          v(
            'only-worker-entries-import-library-worker',
            'app/src/spec-helper.ts',
            '@keeb-cad/library/worker',
          ),
          v(
            'pipeline-imports-design-worker-only',
            'packages/pipeline/src/index.ts',
            '@keeb-cad/design',
          ),
          v(
            'pipeline-imports-model-root-only',
            'packages/pipeline/src/index.ts',
            '@keeb-cad/model/main',
          ),
          v(
            'blueprint-authoring-imports-nothing-at-run-time',
            'packages/blueprint/src/authoring.ts',
            '@keeb-cad/schema',
          ),
          v('only-blueprint-imports-quickjs-wasi', 'packages/plates/src/index.ts', 'quickjs-wasi'),
          v(
            'blueprints-src-imports-only-blueprint-authoring',
            'packages/library/blueprints-src/rejected.ts',
            '@keeb-cad/schema',
          ),
          v(
            'blueprints-src-imports-only-blueprint-authoring',
            'packages/library/blueprints-src/sibling.ts',
            'packages/library/blueprints-src/allowed.ts',
          ),
          v(
            'library-imports-only-drawn-edges',
            'packages/library/src/index.ts',
            '@keeb-cad/geometry',
          ),
          v('result-imports-no-npm-package', 'packages/result/src/index.ts', 'valibot'),
          v('result-imports-only-drawn-edges', 'packages/result/src/index.ts', '@keeb-cad/di'),
          v('worker-entries-reach-no-ui', 'app/src/model.worker.ts', '@keeb-cad/di/vue'),
          v('worker-entries-reach-no-ui', 'app/src/model.worker.ts', '@keeb-cad/ui'),
          v(
            'worker-entries-reach-no-ui',
            'app/src/model.worker.ts',
            'packages/editor/src/index.ts',
          ),
          v('worker-entries-reach-no-ui', 'app/src/model.worker.ts', 'vue'),
        ]),
      )
    })

    it('reports nothing for a blueprint source importing blueprint/authoring', () => {
      expect(
        violations.filter(({ from }) => from === 'packages/library/blueprints-src/allowed.ts'),
      ).toEqual([])
    })

    it('reports no import under two rules', () => {
      const edges = [...violations, ...violationsOf(generated)].map((v) => `${v.from} -> ${v.to}`)
      expect(edges.filter((e, i) => edges.indexOf(e) !== i)).toEqual([])
    })

    it('exercises every forbidden rule in the config, here or in the generated tree', () => {
      const reported = new Set([...violations, ...violationsOf(generated)].map((v) => v.rule))
      const configured = new Set((config.forbidden ?? []).map((r) => r.name))
      expect(reported).toEqual(configured)
    })

    // vitest is a root devDependency, so this edge resolves into node_modules, unlike the tree's
    // other bare imports.
    it("allows result's testing folder to import vitest", () => {
      const from = 'packages/result/src/testing/expect-ok.ts'
      expect(violations.filter((v) => v.from === from)).toEqual([])
      expect(edgesOf(result, from)).toEqual([expect.stringMatching(/\/node_modules\/vitest\//)])
    })

    it('allows a model test to import reference-designs', () => {
      expect(violations.filter((v) => v.from === 'packages/model/src/x.spec.ts')).toEqual([])
      expect(edgesOf(result, 'packages/model/src/x.spec.ts')).toContain(
        '@keeb-cad/reference-designs',
      )
    })

    // Each allowed edge reports nothing and was really cruised, not silently dropped.
    it.each([
      [
        'the model worker entry',
        'its worker subpaths',
        'app/src/model.worker.ts',
        ['@keeb-cad/model/worker', '@keeb-cad/design/worker', '@keeb-cad/library/worker'],
      ],
      [
        "the model worker's start file",
        'its worker subpaths',
        'app/src/start-model-worker.ts',
        ['@keeb-cad/model/worker', '@keeb-cad/design/worker', '@keeb-cad/library/worker'],
      ],
      [
        "a spec at app's top level",
        'its worker subpaths',
        'app/src/wiring.spec.ts',
        ['@keeb-cad/model/worker', '@keeb-cad/design/worker', '@keeb-cad/library/worker'],
      ],
      [
        'the case worker entry',
        'library/worker',
        'app/src/case.worker.ts',
        ['@keeb-cad/library/worker'],
      ],
      ['the main entry', 'editor', 'app/src/main.ts', ['@keeb-cad/editor']],
      [
        'pipeline',
        "model's root, design/worker and library's root",
        'packages/pipeline/src/index.ts',
        ['@keeb-cad/model', '@keeb-cad/design/worker', '@keeb-cad/library'],
      ],
      [
        'design',
        "model/main, library's root and immer",
        'packages/design/src/index.ts',
        ['@keeb-cad/model/main', '@keeb-cad/library', 'immer'],
      ],
      [
        'editor',
        'model/main, Vue, VueUse, ui and di/vue',
        'packages/editor/src/index.ts',
        ['@keeb-cad/model/main', 'vue', '@vueuse/core', '@keeb-cad/ui', '@keeb-cad/di/vue'],
      ],
      [
        'model/worker',
        'blueprint and reactive',
        'packages/model/src/worker.ts',
        ['@keeb-cad/blueprint', '@keeb-cad/reactive'],
      ],
      [
        'a non-kernel package',
        "di's root, reactive and result's root",
        'packages/storage/src/index.ts',
        ['@keeb-cad/di', '@keeb-cad/reactive', '@keeb-cad/result'],
      ],
      [
        'di/vue',
        "vue and di's root",
        'packages/di/src/vue/index.ts',
        ['vue', 'packages/di/src/errors.ts'],
      ],
      [
        "di/vue's spec",
        'the bridge',
        'packages/di/src/vue/vue.spec.ts',
        ['packages/di/src/vue/index.ts'],
      ],
      [
        'a storage test',
        'result/testing and schema/testing',
        'packages/storage/src/x.spec.ts',
        ['@keeb-cad/result/testing', '@keeb-cad/schema/testing'],
      ],
      [
        'a testing folder',
        'schema/testing',
        'packages/design/src/testing/bundle.ts',
        ['@keeb-cad/schema/testing'],
      ],
      ['a kernel', 'result', 'packages/geometry/src/index.ts', ['@keeb-cad/result']],
      [
        'blueprint/authoring',
        'a schema type, type-only',
        'packages/blueprint/src/authoring/declarations.ts',
        ['packages/schema/src/types.ts'],
      ],
      ['geometry', 'makerjs', 'packages/geometry/src/index.ts', ['makerjs']],
      ["storage's browser backend", 'dexie', 'packages/storage/src/browser/x.ts', ['dexie']],
      ['reactive', '@vue/reactivity', 'packages/reactive/src/index.ts', ['@vue/reactivity']],
      [
        'ui',
        'vue, @vueuse/core, reka-ui, @zag-js/hotkeys and @lucide/vue',
        'packages/ui/src/index.ts',
        ['vue', '@vueuse/core', 'reka-ui', '@zag-js/hotkeys', '@lucide/vue'],
      ],
      [
        'a ui spec',
        'the workbench',
        'packages/ui/src/button/Button.spec.ts',
        ['packages/ui/workbench/states/button-states.ts'],
      ],
      [
        'editor',
        "ui's stylesheet subpath",
        'packages/editor/src/theme-import.ts',
        ['@keeb-cad/ui/theme.css'],
      ],
    ])('allows %s to import %s', (_who, _what, from, targets) => {
      const reported = violations.filter((v) => v.from === from).map((v) => v.to)
      expect(reported.filter((to) => targets.includes(to))).toEqual([])
      expect(edgesOf(result, from)).toEqual(expect.arrayContaining(targets))
    })
  })
})

describe('the config on the real editor', async () => {
  // The violation tree has no node_modules, so its bare imports stay unresolved. Only a
  // real, declared import proves the resolve options and the anchored `exclude` keep a
  // resolved npm target for the Vue rule to see.
  const result = await cruiseWithConfig(['packages/editor/src/mount-editor.ts'], repoRoot)

  it('resolves and keeps the vue dependency of packages/editor/src/mount-editor.ts', () => {
    const mountEditor = result.modules.find(
      (m) => m.source === 'packages/editor/src/mount-editor.ts',
    )
    const dep = mountEditor?.dependencies.find((d) => d.module === 'vue')
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
    '@vue/reactivity-transform',
    'packages/editor/src/x.vue',
  ])('matches %s', (path) => {
    expect(vue.test(path)).toBe(true)
  })

  it.each([
    'vuex-like',
    'node_modules/.pnpm/vuex-like@1.0.0/node_modules/vuex-like/index.js',
    'piniacolada',
    'packages/model/src/vue-helpers.ts',
    '@keeb-cad/di/vue',
    // @vueuse/core has its own rule (only-editor-and-ui-import-vueuse).
    '@vueuse/core',
    'node_modules/.pnpm/@vueuse+core@14.4.0/node_modules/@vueuse/core/index.mjs',
    // @vue/reactivity belongs to reactive alone (only-reactive-imports-vue-reactivity).
    '@vue/reactivity',
    'node_modules/.pnpm/@vue+reactivity@3.5.44/node_modules/@vue/reactivity/dist/reactivity.d.ts',
  ])('does not match %s', (path) => {
    expect(vue.test(path)).toBe(false)
  })
})

describe('the npm target regexes', () => {
  const vueReactivity = new RegExp(VUE_REACTIVITY)
  const vueuse = new RegExp(VUEUSE)
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

  it('VUEUSE matches @vueuse/core and not vue', () => {
    expect(vueuse.test('@vueuse/core')).toBe(true)
    expect(
      vueuse.test('node_modules/.pnpm/@vueuse+core@14.4.0/node_modules/@vueuse/core/index.mjs'),
    ).toBe(true)
    expect(vueuse.test('vue')).toBe(false)
  })

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
