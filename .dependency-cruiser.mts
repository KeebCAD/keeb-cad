// Package dependency direction and entry fences, enforced. The single source of truth for
// both the `pnpm depcruise` CLI step and tooling/ad10/rules.spec.ts.
import { fileURLToPath } from 'node:url'
import type { IConfiguration, IForbiddenRuleType } from 'dependency-cruiser'

/** The eight kernels import no workspace package except `result`; `result` imports none at all. */
export const KERNELS = [
  'expr',
  'reactive',
  'messaging',
  'hashing',
  'geometry',
  'di',
  'result',
  'ui',
] as const

/** Every other package may import these without a drawn edge. */
export const OPEN_KERNELS = ['di', 'reactive', 'result'] as const

/**
 * The package graph as data: each package (28 under packages/, plus `app` and `reference-designs`) and the
 * packages it is drawn to. One `<package>-imports-only-drawn-edges` rule is generated per row.
 */
export const GRAPH: Readonly<Record<string, readonly string[]>> = {
  expr: ['result'],
  reactive: ['result'],
  messaging: ['result'],
  hashing: ['result'],
  geometry: ['result'],
  di: ['result'],
  result: [],
  ui: ['result'],
  schema: ['expr'],
  blueprint: ['geometry', 'expr', 'schema', 'hashing'],
  drc: ['schema', 'geometry'],
  model: ['schema', 'expr', 'geometry', 'blueprint', 'reactive'],
  library: ['schema'],
  design: ['model', 'library', 'schema', 'reactive', 'hashing'],
  'design-file': ['schema'],
  plates: ['schema', 'geometry', 'blueprint'],
  pcb: ['schema', 'geometry', 'blueprint'],
  firmware: ['schema', 'blueprint'],
  case: ['schema', 'geometry', 'blueprint', 'messaging'],
  routing: ['schema', 'geometry', 'drc', 'messaging'],
  exports: ['schema'],
  protocol: ['schema', 'messaging'],
  pipeline: [
    'plates',
    'pcb',
    'routing',
    'case',
    'firmware',
    'exports',
    'drc',
    'model',
    'design',
    'library',
    'reactive',
    'protocol',
    'messaging',
    'blueprint',
    'hashing',
    'schema',
  ],
  storage: ['schema', 'design-file', 'hashing'],
  viewer3d: ['schema'],
  workers: ['design', 'protocol', 'messaging', 'schema', 'reactive'],
  commands: ['model', 'design', 'workers', 'library', 'storage', 'schema'],
  editor: [
    'model',
    'design',
    'commands',
    'workers',
    'schema',
    'library',
    'storage',
    'viewer3d',
    'ui',
    'protocol',
    'reactive',
  ],
  app: [
    'editor',
    'design',
    'commands',
    'workers',
    'storage',
    'schema',
    'reactive',
    'pipeline',
    'model',
    'library',
    'blueprint',
    'case',
    'routing',
  ],
  'reference-designs': ['schema'],
}

/**
 * Packages an importer may reach only through one entry: importer → target → entry, where `.`
 * is the package root. One rule is generated per (target, entry).
 */
export const ENTRY_ONLY: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  editor: { model: 'main' },
  commands: { model: 'main', library: '.' },
  design: { model: 'main', library: '.' },
  pipeline: { model: '.', design: 'worker', library: '.' },
  app: { model: 'worker', library: 'worker' },
}

const isKernel = (name: string) => (KERNELS as readonly string[]).includes(name)

/** The packages a row may import: its drawn targets, plus the open kernels unless a kernel. */
export const allowedTargets = (name: string): string[] => [
  ...new Set([...(GRAPH[name] ?? []), ...(isKernel(name) ? [] : OPEN_KERNELS)]),
]

const alt = (names: readonly string[]) => names.join('|')
const escape = (s: string) => s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)

/**
 * A workspace package target, by pnpm-resolved path or by bare specifier (an
 * undeclared import stays unresolved and keeps its bare name).
 */
export const ws = (names: string) => `^(packages/(${names})/|@keeb-cad/(${names})(/|$))`
export const REFERENCE_DESIGNS = '^(reference-designs/|@keeb-cad/reference-designs(/|$))'

/**
 * One entry of a package (`.` is its root), by resolved source file (`src/<sub>.ts`, or a folder
 * entry `src/<sub>/index.ts`) or by bare specifier.
 */
export const entry = (name: string, sub: string) =>
  sub === '.'
    ? String.raw`^(packages/${escape(name)}/src/index\.ts$|@keeb-cad/${escape(name)}$)`
    : String.raw`^(packages/${escape(name)}/src/${escape(sub)}(\.ts|/index\.ts)$|@keeb-cad/${escape(name)}/${escape(sub)}$)`

/** The files a row's rules apply to: `app` only at its sources, as `pnpm depcruise` cruises them. */
export const sourcePath = (name: string) =>
  name === 'app'
    ? '^app/src/'
    : name === 'reference-designs'
      ? '^reference-designs/'
      : `^packages/${escape(name)}/`

const selfTarget = (name: string) =>
  name === 'app'
    ? '^(app/|@keeb-cad/app(/|$))'
    : name === 'reference-designs'
      ? REFERENCE_DESIGNS
      : ws(escape(name))

/** An npm package target, by resolved node_modules path or by bare specifier. */
export const npm = (names: string) => `(^|/)node_modules/(${names})/|^(${names})(/|$)`

// @vue/reactivity is not Vue for this rule: it belongs to `reactive` alone.
const VUE_NAMES = 'vue|vue-router|pinia|@vue/(?!reactivity(?:/|$))[^/]+'
export const VUE = String.raw`${npm(VUE_NAMES)}|\.vue$`
export const VUEUSE = npm('@vueuse/core')
export const VUE_REACTIVITY = npm('@vue/reactivity')

const ANY_WORKSPACE_TARGET = '^(packages/[^/]+/|app/|@keeb-cad/[^/]+(/|$))'
const TEST_FILE = String.raw`\.(spec|test)\.ts$`
const TESTING_FOLDER = '^packages/[^/]+/src/testing/'

const MAIN_ENTRY = String.raw`^app/src/main\.ts$`
const MODEL_WORKER_ENTRY = String.raw`^app/src/(model\.worker|start-model-worker)\.ts$`
const CASE_WORKER_ENTRY = String.raw`^app/src/case\.worker\.ts$`
const WORKER_ENTRIES = String.raw`^app/src/(model|case|routing)\.worker\.ts$`
const AUTHORING = String.raw`^packages/blueprint/src/authoring(\.ts$|/)`
const STAGES = ['plates', 'pcb', 'firmware', 'case', 'routing', 'exports']

/** Only files under `owner` may import `target`. */
const onlyImports = (
  name: string,
  owner: string | string[],
  target: string,
  comment: string,
): IForbiddenRuleType => ({
  name,
  comment,
  severity: 'error',
  from: { pathNot: owner },
  to: { path: target },
})

/** A row of GRAPH: the package may import only its own files and its allowed packages. */
const importsOnly = (name: string): IForbiddenRuleType => {
  const allowed = allowedTargets(name)
  return {
    name: `${name}-imports-only-drawn-edges`,
    comment: `${name} imports ${allowed.length > 0 ? `only ${allowed.join(', ')}` : 'no workspace package'}.`,
    severity: 'error',
    from: { path: sourcePath(name) },
    // reference-designs belongs to reference-designs-only-in-tests, so nothing double-reports.
    to: {
      path: ANY_WORKSPACE_TARGET,
      pathNot: [
        selfTarget(name),
        REFERENCE_DESIGNS,
        ...(allowed.length > 0 ? [ws(alt(allowed))] : []),
      ],
    },
  }
}

/** One rule per (target, entry) in ENTRY_ONLY: its importers reach `target` only through it. */
const entryOnlyRules = (): IForbiddenRuleType[] => {
  const groups = new Map<string, { target: string; sub: string; importers: string[] }>()
  for (const [importer, targets] of Object.entries(ENTRY_ONLY)) {
    for (const [target, sub] of Object.entries(targets)) {
      const key = `${target} ${sub}`
      const group = groups.get(key) ?? { target, sub, importers: [] }
      group.importers.push(importer)
      groups.set(key, group)
    }
  }
  return [...groups.values()].map(({ target, sub, importers }) => {
    const label = `${target}${sub === '.' ? ' root' : `/${sub}`}`
    const verb = importers.length === 1 ? 'imports' : 'import'
    return {
      name: `${importers.join('-')}-${verb}-${target}-${sub === '.' ? 'root' : sub}-only`,
      comment: `${importers.join(', ')} reach ${target} only through ${label}.`,
      severity: 'error',
      from: { path: importers.map((i) => sourcePath(i)) },
      to: { path: ws(escape(target)), pathNot: entry(target, sub) },
    }
  })
}

/**
 * Only `owners` import `target`'s `sub` entry. Rows not drawn to `target` are already reported by
 * their imports-only rule, and rows with an ENTRY_ONLY rule for `target` through another entry
 * by that rule, so the fence covers the rest (and `target` itself), and nothing double-reports.
 * A row whose ENTRY_ONLY entry is `sub` itself stays: only its owner files may use it.
 */
const onlyOwnersImportEntry = (
  name: string,
  target: string,
  sub: string,
  owners: string[],
  comment: string,
): IForbiddenRuleType => {
  const rows = Object.keys(GRAPH).filter(
    (row) =>
      allowedTargets(row).includes(target) && [undefined, sub].includes(ENTRY_ONLY[row]?.[target]),
  )
  return {
    name,
    comment,
    severity: 'error',
    from: { path: [...rows, target].map((row) => sourcePath(row)), pathNot: owners },
    to: { path: entry(target, sub) },
  }
}

const config: IConfiguration = {
  forbidden: [
    ...Object.keys(GRAPH).map((name) => importsOnly(name)),
    ...entryOnlyRules(),
    onlyOwnersImportEntry(
      'only-model-worker-entry-imports-model-worker',
      'model',
      'worker',
      [MODEL_WORKER_ENTRY],
      "Only the model worker's entry and its start file import model/worker: one reactive graph.",
    ),
    onlyOwnersImportEntry(
      'only-model-worker-entry-and-pipeline-import-design-worker',
      'design',
      'worker',
      [MODEL_WORKER_ENTRY, sourcePath('pipeline')],
      "Only the model worker's entry, its start file and pipeline import design/worker.",
    ),
    onlyOwnersImportEntry(
      'only-worker-entries-import-library-worker',
      'library',
      'worker',
      [MODEL_WORKER_ENTRY, CASE_WORKER_ENTRY],
      "Only the model and case worker entries and the model worker's start file import library/worker.",
    ),
    onlyOwnersImportEntry(
      'only-editor-imports-di-vue',
      'di',
      'vue',
      // di's own sources belong to di-root-reaches-no-vue, so a root → bridge import reports once.
      ['^packages/editor/', '^packages/di/src/'],
      "Only editor imports di's Vue bridge.",
    ),
    {
      name: 'di-root-reaches-no-vue',
      comment: "di's root never reaches its Vue bridge, so it stays Vue-free on every thread.",
      severity: 'error',
      from: { path: '^packages/di/src/', pathNot: '^packages/di/src/vue/' },
      // The whole bridge folder, so a future bridge-internal file stays fenced too, and the bare
      // specifier, which the owner fence no longer catches from di's own sources.
      to: { path: ['^packages/di/src/vue/', '^@keeb-cad/di/vue$'], reachable: true },
    },
    {
      name: 'model-root-and-main-reach-no-blueprint',
      comment:
        "model reaches blueprint only through model/worker, so main's graph holds no blueprint.",
      severity: 'error',
      from: { path: String.raw`^packages/model/src/(index|main)\.ts$` },
      to: { path: ws('blueprint'), reachable: true },
    },
    {
      name: 'main-entry-reaches-no-pipeline-stage-or-sandbox',
      comment:
        "main's entry never reaches pipeline, a stage, blueprint or quickjs-wasi: main derives nothing.",
      severity: 'error',
      from: { path: MAIN_ENTRY },
      to: {
        path: [ws(alt(['pipeline', 'blueprint', ...STAGES])), npm('quickjs-wasi')],
        reachable: true,
      },
    },
    {
      name: 'worker-entries-reach-no-ui',
      comment: 'No worker entry reaches ui, editor, di/vue or Vue.',
      severity: 'error',
      from: { path: WORKER_ENTRIES },
      to: { path: [ws('ui|editor'), entry('di', 'vue'), VUE], reachable: true },
    },
    {
      name: 'case-worker-entry-reaches-no-model',
      comment: "The case worker's entry never reaches model.",
      severity: 'error',
      from: { path: CASE_WORKER_ENTRY },
      to: { path: ws('model'), reachable: true },
    },
    {
      name: 'only-editor-ui-and-di-vue-import-vue',
      comment: 'Only editor, ui and di/vue import Vue.',
      severity: 'error',
      from: {
        pathNot: ['^packages/editor/', '^packages/ui/', '^packages/di/src/vue/'],
      },
      to: { path: VUE, pathNot: ws('editor|ui') },
    },
    onlyImports(
      'only-editor-and-ui-import-vueuse',
      ['^packages/editor/', '^packages/ui/'],
      VUEUSE,
      'Only editor and ui import @vueuse/core.',
    ),
    onlyImports(
      'only-reactive-imports-vue-reactivity',
      '^packages/reactive/',
      VUE_REACTIVITY,
      'Only reactive imports @vue/reactivity; everything else derives through reactive.',
    ),
    onlyImports(
      'only-geometry-imports-makerjs',
      '^packages/geometry/',
      npm('makerjs'),
      'Only geometry imports makerjs.',
    ),
    onlyImports(
      'only-storage-browser-imports-dexie',
      '^packages/storage/src/browser/',
      npm('dexie'),
      "Only storage's browser backend imports dexie.",
    ),
    onlyImports(
      'only-blueprint-imports-quickjs-wasi',
      // main's entry belongs to main-entry-reaches-no-pipeline-stage-or-sandbox, so nothing double-reports.
      ['^packages/blueprint/', MAIN_ENTRY],
      npm('quickjs-wasi'),
      'Only blueprint imports quickjs-wasi.',
    ),
    {
      name: 'blueprint-authoring-imports-nothing-at-run-time',
      comment:
        'blueprint/authoring reaches library sources at build time, so it imports only types.',
      severity: 'error',
      from: { path: AUTHORING },
      to: { pathNot: AUTHORING, dependencyTypesNot: ['type-only'] },
    },
    onlyImports(
      'only-design-imports-immer',
      '^packages/design/',
      npm('immer'),
      'Only design imports immer: its register and design/worker.',
    ),
    onlyImports(
      'only-ui-imports-its-widget-libraries',
      '^packages/ui/',
      npm('reka-ui|@zag-js/hotkeys|@lucide/vue'),
      'Only ui imports reka-ui, @zag-js/hotkeys and @lucide/vue.',
    ),
    onlyImports(
      'only-ui-imports-the-workbench',
      [
        '^packages/ui/workbench/',
        String.raw`^packages/ui/src/.+\.spec\.ts$`,
        '^packages/ui/src/testing/',
      ],
      '^(packages/ui/workbench/|@keeb-cad/ui/workbench)',
      "Only the workbench itself and ui's tests import the workbench; the app never does.",
    ),
    {
      name: 'result-imports-no-npm-package',
      comment: 'result imports no npm package; its specs and testing folder may import vitest.',
      severity: 'error',
      from: { path: '^packages/result/', pathNot: [TEST_FILE, TESTING_FOLDER] },
      to: {
        path: '(^|/)node_modules/|^[^./]',
        pathNot: [ANY_WORKSPACE_TARGET, REFERENCE_DESIGNS],
      },
    },
    {
      name: 'only-tests-import-testing',
      comment: "Only spec files and other testing folders import a package's testing folder.",
      severity: 'error',
      from: { pathNot: [TEST_FILE, TESTING_FOLDER] },
      // The whole folder, so a resolved import of one helper file is fenced too.
      to: { path: [TESTING_FOLDER, '^@keeb-cad/[^/]+/testing$'] },
    },
    {
      name: 'reference-designs-only-in-tests',
      comment: 'reference-designs is imported only by tests.',
      severity: 'error',
      from: { path: '^(packages|app)/', pathNot: TEST_FILE },
      to: { path: REFERENCE_DESIGNS },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // Anchored to the workspace: an unanchored `dist/` or `node_modules/` would also drop
    // resolved npm targets (vue/dist/vue.d.mts), hiding them from the Vue rule.
    // reference-designs/corney-island/ holds Ergogen's footprint .js files and output, not workspace code.
    exclude: {
      path: '^((packages/[^/]+|app|reference-designs)/(dist|node_modules)/|reference-designs/corney-island/)',
    },
    tsPreCompilationDeps: true,
    // Absolute: dependency-cruiser hands TypeScript a cwd-relative name, and TypeScript
    // then resolves this tsconfig's relative `extends` against the wrong directory.
    tsConfig: {
      fileName: fileURLToPath(new URL('packages/editor/tsconfig.app.json', import.meta.url)),
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'types', 'default'],
      extensions: ['.ts', '.vue', '.mjs', '.js', '.json'],
    },
  },
}

export default config
