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
export const UI = ws('ui')

/** An npm package target, by resolved node_modules path or by bare specifier. */
export const npm = (names: string) => `(^|/)node_modules/(${names})/|^(${names})(/|$)`

// @vue/reactivity is not Vue for this rule: it belongs to `reactive` alone (AD-10).
const VUE_NAMES = 'vue|vue-router|pinia|@vueuse/core|@vue/(?!reactivity(?:/|$))[^/]+'
export const VUE = String.raw`${npm(VUE_NAMES)}|\.vue$`
export const VUE_REACTIVITY = npm('@vue/reactivity')

const ANY_PACKAGE = ws('[^/]+')
// Editor, fixtures and ui targets belong to their own rules, so nothing double-reports.
const OWNED_ELSEWHERE = [EDITOR, FIXTURES, UI]
const TEST_FILE = String.raw`\.(spec|test)\.ts$`

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
      'plates-and-pcb-import-only-model-geometry-reactive',
      ['plates', 'pcb'],
      ['model', 'geometry', 'reactive'],
      'plates and pcb import only model, geometry and reactive.',
    ),
    importsOnly(
      'case-imports-only-model-and-geometry',
      ['case'],
      ['model', 'geometry'],
      'case imports only model and geometry.',
    ),
    importsOnly(
      'firmware-drc-and-storage-import-only-model-and-reactive',
      ['firmware', 'drc', 'storage'],
      ['model', 'reactive'],
      'firmware, drc and storage import only model and reactive.',
    ),
    importsOnly(
      'routing-imports-only-model-and-drc',
      ['routing'],
      ['model', 'drc'],
      'routing imports only model and drc, the one stage-to-stage import.',
    ),
    importsOnly(
      'exports-and-library-import-only-model',
      ['exports', 'library'],
      ['model'],
      'exports and library import only model.',
    ),
    importsOnly(
      'model-imports-only-reactive-and-geometry',
      ['model'],
      ['reactive', 'geometry'],
      'Among workspace packages, model imports only reactive and geometry.',
    ),
    importsOnly(
      'reactive-geometry-and-ui-import-no-workspace-package',
      ['reactive', 'geometry', 'ui'],
      [],
      'reactive, geometry and ui sit below everything and import no workspace package.',
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
      comment: 'Only the editor (app/) and ui import Vue and VueUse.',
      severity: 'error',
      from: { pathNot: ['^app/', '^packages/ui/'] },
      to: { path: VUE, pathNot: [EDITOR, UI] },
    },
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
      'only-register-imports-immer',
      '^packages/model/src/register/',
      npm('immer'),
      "Only model's register concept imports immer.",
    ),
    onlyImports(
      'only-ui-imports-reka-and-zag',
      '^packages/ui/',
      npm('reka-ui|@zag-js/hotkeys'),
      'Only ui imports reka-ui and @zag-js/hotkeys.',
    ),
    onlyImports(
      'only-editor-imports-ui',
      ['^app/', '^packages/ui/'],
      UI,
      'Only the editor imports ui.',
    ),
    {
      name: 'worker-imports-no-reactive',
      comment: 'Worker code (*.worker.ts) never reaches reactive, directly or through a helper.',
      severity: 'error',
      from: { path: String.raw`\.worker\.ts$` },
      to: { path: ws('reactive'), reachable: true },
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
