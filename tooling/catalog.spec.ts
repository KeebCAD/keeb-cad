// Shared dependencies go through the pnpm catalog (AD-10): a third-party package declared by
// more than one workspace package uses `catalog:` in each, so no two drift onto different
// copies. `catalogMode: strict` makes `pnpm add` follow this for packages already in the
// catalog; this catches the rest (hand edits, a dependency becoming shared).
import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url)
const read = (name: string) => readFileSync(new URL(name, root), 'utf8')

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const

type Manifest = Partial<Record<(typeof DEPENDENCY_FIELDS)[number], Record<string, string>>>

/** The root manifest plus every member the workspace's `packages:` globs list. */
function manifestPaths(workspace: string): string[] {
  const block = /^packages:\n((?: {2}- .*\n)*)/m.exec(workspace)?.[1] ?? ''
  const globs = [...block.matchAll(/^ {2}- (.+?)\s*$/gm)].map((m) => `${m[1]}/package.json`)
  return ['package.json', ...globs.flatMap((g) => globSync(g, { cwd: root }))]
}

/** Each third-party dependency declared by two or more manifests without `catalog:`. */
function uncatalogedShared(manifests: Record<string, Manifest>): Record<string, string[]> {
  const declared = new Map<string, string[]>()
  for (const [path, manifest] of Object.entries(manifests)) {
    for (const field of DEPENDENCY_FIELDS) {
      for (const [name, spec] of Object.entries(manifest[field] ?? {})) {
        if (spec.startsWith('workspace:')) continue
        declared.set(name, [...(declared.get(name) ?? []), `${path} ${spec}`])
      }
    }
  }
  return Object.fromEntries(
    [...declared].filter(
      ([, uses]) => uses.length > 1 && uses.some((use) => !use.endsWith(' catalog:')),
    ),
  )
}

describe('shared dependencies', () => {
  it('use catalog: in every workspace package that declares them', () => {
    const paths = manifestPaths(read('pnpm-workspace.yaml'))
    const manifests = Object.fromEntries(
      paths.map((path) => [path, JSON.parse(read(path)) as Manifest]),
    )
    expect(uncatalogedShared(manifests)).toEqual({})
  })

  it('names a shared dependency one package declares with a plain version', () => {
    expect(
      uncatalogedShared({
        'packages/model/package.json': { dependencies: { valibot: 'catalog:' } },
        'packages/plates/package.json': { dependencies: { valibot: '^1.5.0' } },
        'packages/pcb/package.json': { dependencies: { immer: '^11.2.9' } },
      }),
    ).toEqual({
      valibot: ['packages/model/package.json catalog:', 'packages/plates/package.json ^1.5.0'],
    })
  })

  it('ignores workspace: links', () => {
    expect(
      uncatalogedShared({
        'app/package.json': { dependencies: { '@keeb-cad/model': 'workspace:*' } },
        'packages/pipeline/package.json': { dependencies: { '@keeb-cad/model': 'workspace:*' } },
      }),
    ).toEqual({})
  })
})
