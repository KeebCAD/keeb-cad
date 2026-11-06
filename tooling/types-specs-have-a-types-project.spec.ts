// The runtime projects skip `*.types.spec.ts`, and only a package with a tsconfig.vitest.json gets
// a types project, so a type spec anywhere else would run nowhere and pass silently.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../', import.meta.url))

/** The package directory whose types project would typecheck `file`, if its path allows one. */
const typesProjectDir = (file: string) => /^(packages\/[^/]+)\/src\//.exec(file)?.[1]

describe('type-only specs', () => {
  it('each sit under the src of a package with a types project', () => {
    const typeSpecs = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '*.types.spec.ts'],
      {
        cwd: root,
        encoding: 'utf8',
      },
    )
      .split('\n')
      .filter((file) => file !== '')
    expect(
      typeSpecs.filter((file) => {
        const dir = typesProjectDir(file)
        return dir === undefined || !existsSync(`${root}${dir}/tsconfig.vitest.json`)
      }),
    ).toEqual([])
  })
})
