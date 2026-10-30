// AD-10 dependency direction, enforced. The single source of truth for both the
// `pnpm depcruise` CLI step and tooling/ad10/rules.spec.ts.
import { fileURLToPath } from 'node:url'
import type { IConfiguration, IForbiddenRuleType } from 'dependency-cruiser'

export const STAGES = ['plates', 'pcb', 'routing', 'drc', 'case', 'firmware', 'exports'] as const

const alt = (names: readonly string[]) => names.join('|')

/**
 * A workspace package target, by pnpm-resolved path or by bare specifier (an
 * undeclared import stays unresolved and keeps its bare name).
 */
export const ws = (names: string) => `^(packages/(${names})/|@keeb-cad/(${names})(/|$))`
export const EDITOR = '^(app/|@keeb-cad/editor(/|$))'
export const FIXTURES = '^(fixtures/|@keeb-cad/fixtures(/|$))'
const VUE_NAMES = 'vue|vue-router|pinia|@vue/[^/]+'
export const VUE = String.raw`(^|/)node_modules/(${VUE_NAMES})/|^(${VUE_NAMES})(/|$)|\.vue$`

const ANY_PACKAGE = ws('[^/]+')
// Editor and fixtures targets belong to their own rules, so nothing double-reports.
const OWNED_ELSEWHERE = [EDITOR, FIXTURES]
const TEST_FILE = String.raw`\.(spec|test)\.ts$`

/** `from` packages may import only their own files plus `allowed` packages. */
const importsOnly = (
  name: string,
  from: readonly string[],
  allowed: readonly string[],
  comment: string,
): IForbiddenRuleType => ({
  name,
  comment,
  severity: 'error',
  // $1 is the importing package, so a package may import its own files.
  from: { path: `^packages/(${alt(from)})/` },
  to: { path: ANY_PACKAGE, pathNot: [ws(alt([...allowed, '$1'])), ...OWNED_ELSEWHERE] },
})

const config: IConfiguration = {
  forbidden: [
    importsOnly(
      'stage-imports-only-model',
      STAGES.filter((s) => s !== 'routing'),
      ['model'],
      'A pipeline stage imports only model.',
    ),
    importsOnly(
      'routing-imports-only-model-and-drc',
      ['routing'],
      ['model', 'drc'],
      'routing imports only model and drc.',
    ),
    importsOnly(
      'model-imports-no-workspace-package',
      ['model'],
      [],
      'model is the root of the graph and imports no workspace package.',
    ),
    importsOnly(
      'library-and-storage-import-only-model',
      ['library', 'storage'],
      ['model'],
      'library and storage import only model.',
    ),
    {
      name: 'pipeline-imports-no-storage',
      comment: 'pipeline does not import storage.',
      severity: 'error',
      from: { path: '^packages/pipeline/' },
      to: { path: ws('storage') },
    },
    {
      name: 'only-editor-imports-vue',
      comment: 'Only the editor (app/) imports Vue.',
      severity: 'error',
      from: { pathNot: '^app/' },
      to: { path: VUE, pathNot: EDITOR },
    },
    {
      name: 'nothing-imports-editor',
      comment: 'Nothing imports the editor.',
      severity: 'error',
      from: { pathNot: '^app/' },
      to: { path: EDITOR },
    },
    {
      name: 'editor-imports-no-stage',
      comment: 'The editor reaches stages only through pipeline.',
      severity: 'error',
      from: { path: '^app/' },
      to: { path: ws(alt(STAGES)) },
    },
    {
      name: 'fixtures-only-in-tests',
      comment: 'fixtures are imported only by tests.',
      severity: 'error',
      from: { path: '^(packages|app)/', pathNot: TEST_FILE },
      to: { path: FIXTURES },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // Anchored to the workspace: an unanchored `dist/` or `node_modules/` would also drop
    // resolved npm targets (vue/dist/vue.d.mts), hiding them from only-editor-imports-vue.
    // fixtures/corney-island/ holds Ergogen's footprint .js files and output, not workspace code.
    exclude: {
      path: '^((packages/[^/]+|app|fixtures)/(dist|node_modules)/|fixtures/corney-island/)',
    },
    tsPreCompilationDeps: true,
    // Absolute: dependency-cruiser hands TypeScript a cwd-relative name, and TypeScript
    // then resolves this tsconfig's relative `extends` against the wrong directory.
    tsConfig: { fileName: fileURLToPath(new URL('app/tsconfig.app.json', import.meta.url)) },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'types', 'default'],
      extensions: ['.ts', '.vue', '.mjs', '.js', '.json'],
    },
  },
}

export default config
