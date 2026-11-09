// A step dropped from `pnpm check`, the pre-commit hook or CI fails no other test; this one makes
// the drop a visible edit. Each tool's own behaviour is proven where it is configured (the lint
// rules in tooling/lint, the import rules in tooling/ad10).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url)
const read = (name: string) => readFileSync(new URL(name, root), 'utf8')

/** The commands of every `run:` line in a YAML file, in order. */
const runLines = (yaml: string) => [...yaml.matchAll(/^\s*-?\s*run: (.+)$/gm)].map((m) => m[1])

describe('the check steps', () => {
  it('pnpm check builds the library first, then runs the typecheck, the fast checks, the tests, the build, the dist check, the workbench build and the smoke test', () => {
    const { scripts } = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
    expect(scripts.check).toBe(
      'pnpm build:library && pnpm typecheck && pnpm check:fast && pnpm test && pnpm build && pnpm check:dist && pnpm build:workbench && pnpm smoke',
    )
  })

  it('prepare installs the hooks and builds the library', () => {
    const { scripts } = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
    expect(scripts.prepare).toBe('lefthook install && pnpm build:library')
  })

  it('pins build:library, check:fast, typecheck, lint, format:check, depcruise, test, test:mutation, build, check:dist, build:workbench and smoke', () => {
    const { scripts } = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
    expect(scripts).toMatchObject({
      'build:library': 'pnpm --filter @keeb-cad/library build:library',
      'check:fast': 'pnpm lint && pnpm format:check && pnpm depcruise',
      typecheck: 'vue-tsc --build',
      lint: 'eslint . --cache --cache-location node_modules/.cache/eslint/',
      'format:check': 'prettier --check .',
      depcruise: 'depcruise packages app/src reference-designs --config .dependency-cruiser.mts',
      test: 'vitest run',
      'test:mutation': 'stryker run',
      build: 'pnpm --filter @keeb-cad/app build',
      'check:dist': 'node tooling/check-dist/check-dist.ts',
      'build:workbench': 'pnpm --filter @keeb-cad/ui build:workbench',
      smoke: 'pnpm --filter @keeb-cad/app test:e2e',
    })
  })

  it('the pre-commit hook runs only the fast checks', () => {
    expect(runLines(read('lefthook.yml'))).toEqual([
      'if command -v mise >/dev/null; then mise exec -- pnpm check:fast; else pnpm check:fast; fi',
    ])
  })

  it('CI installs and runs pnpm check, then installs and runs the mutation gate', () => {
    expect(runLines(read('.github/workflows/check.yml'))).toEqual([
      'pnpm install --frozen-lockfile',
      'pnpm check',
      'pnpm install --frozen-lockfile',
      'pnpm test:mutation',
    ])
  })
})
