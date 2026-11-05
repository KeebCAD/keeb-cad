import { describe, expect, it } from 'vitest'

import { ENTRY_RE_EXPORTS_ONLY, TYPES_OUTSIDE_TYPES_TS } from '../../eslint.config'
import { restrictedSyntax } from './restricted-syntax'
import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'

const ENTRY = ENTRY_RE_EXPORTS_ONLY.message

describe('package entry files only re-export', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each(['packages/x/src/index.ts', 'packages/x/src/main.ts', 'packages/x/src/worker.ts'])(
    'rejects a function in %s',
    async (filePath) => {
      expect(await restrictedSyntax('export function f() {}', filePath)).toEqual([ENTRY])
    },
  )

  it('rejects an import re-exported locally', async () => {
    const code = "import { a } from './a'\nexport { a }"
    expect(await restrictedSyntax(code, 'packages/x/src/vue/index.ts')).toEqual([ENTRY, ENTRY])
  })

  it('still rejects a type declared in an entry file', async () => {
    expect(await restrictedSyntax('export type A = string', 'packages/x/src/index.ts')).toEqual([
      ENTRY,
      TYPES_OUTSIDE_TYPES_TS.message,
    ])
  })

  it.each([
    ['the stub', 'export {}'],
    [
      're-exports',
      "export { a } from './a'\nexport * from './b'\nexport type { T } from './types'",
    ],
  ])('allows %s', async (_, code) => {
    expect(await restrictedSyntax(code, 'packages/x/src/index.ts')).toEqual([])
  })

  it.each(['app/src/main.ts', 'app/src/model.worker.ts'])(
    "rejects code in app's thread entry %s",
    async (filePath) => {
      expect(await restrictedSyntax("import { a } from './a'\na()", filePath)).toEqual([
        ENTRY,
        ENTRY,
      ])
    },
  )

  it("allows app's thread entry to re-export its start file", async () => {
    expect(await restrictedSyntax("export * from './start-main'", 'app/src/main.ts')).toEqual([])
  })
})
