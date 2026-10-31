// One reactive graph (AD-10): @vue/runtime-core pins @vue/reactivity exactly, so a second
// installed copy would split the graph between the editor and the core. The catalog keeps
// one number for both through a YAML alias; this proves the lockfile and the alias.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (name: string) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')

/**
 * The `packages:` keys of a pnpm lockfile (`name@version`, unquoted), across every YAML
 * document in it (pnpm writes its own dependencies as a separate first document).
 */
function lockfilePackageKeys(lockfile: string): string[] {
  const sections = lockfile.matchAll(/^packages:\n([\s\S]*?)(?=^\S|(?![\s\S]))/gm)
  return [...sections].flatMap(([, section]) =>
    [...section!.matchAll(/^ {2}'?([^'\s][^']*?)'?:\s*$/gm)].map((m) => m[1]!),
  )
}

/** The installed `@vue/reactivity` versions, from the lockfile's package keys. */
function vueReactivityCopies(lockfile: string): string[] {
  return lockfilePackageKeys(lockfile).filter((key) => /^@vue\/reactivity@[^@]+$/.test(key))
}

/** Every entry of the workspace `catalog:` block, name to value as written. */
function catalogEntries(workspace: string): Map<string, string> {
  const block = /^catalog:\n((?: {2}.*\n|\s*\n)*)/m.exec(workspace)?.[1] ?? ''
  const entries = new Map<string, string>()
  for (const m of block.matchAll(/^ {2}'?([^'#:\s][^':]*)'?:\s*(.+?)\s*$/gm)) {
    entries.set(m[1]!, m[2]!)
  }
  return entries
}

describe('one @vue/reactivity', () => {
  it('has exactly one installed copy', () => {
    const copies = vueReactivityCopies(read('pnpm-lock.yaml'))
    expect(copies, `installed: ${copies.join(', ')}`).toHaveLength(1)
  })

  it('names both copies when the lockfile holds two', () => {
    const two = [
      'packages:',
      '',
      "  '@vue/reactivity@3.5.44':",
      '    resolution: {integrity: sha512-a}',
      '',
      "  '@vue/reactivity@3.6.0':",
      '    resolution: {integrity: sha512-b}',
      '',
      'snapshots:',
      '',
      "  '@vue/reactivity@3.5.44': {}",
      '',
    ].join('\n')
    expect(vueReactivityCopies(two)).toEqual(['@vue/reactivity@3.5.44', '@vue/reactivity@3.6.0'])
  })

  it("keeps the catalog's @vue/reactivity an alias of vue's anchor", () => {
    const catalog = catalogEntries(read('pnpm-workspace.yaml'))
    expect(catalog.get('vue')).toMatch(/^&vue \S+$/)
    expect(catalog.get('@vue/reactivity')).toBe('*vue')
  })

  it('fails when a rewrite writes two literal versions', () => {
    const rewritten = "catalog:\n  vue: 3.5.44\n  '@vue/reactivity': 3.5.44\n"
    expect(catalogEntries(rewritten).get('@vue/reactivity')).not.toBe('*vue')
  })
})
