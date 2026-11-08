import { describe, expect, it } from 'vitest'

import { restrictedSyntax } from './restricted-syntax'
import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'

const TYPES =
  "Declare types in this folder's types.ts. A type paired with a same-named value joins PAIRED_TYPES in eslint.config.ts."

describe('types live in types.ts', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each([
    ['a type alias in a plain package file', 'packages/x/src/foo.ts', 'export type A = string'],
    ['an interface in a plain package file', 'packages/x/src/foo.ts', 'interface A {}'],
    ['a type in a plain app file', 'app/src/foo.ts', 'type A = string'],
    [
      'an unpaired name beside a paired one',
      'packages/x/src/option.ts',
      'export type Other = string',
    ],
    [
      'an interface in a Vue SFC',
      'packages/x/src/Foo.vue',
      '<script setup lang="ts">\ninterface Props { a: string }\ndefineProps<Props>()\n</script>\n',
    ],
  ])('rejects %s', async (_, filePath, code) => {
    expect(await restrictedSyntax(code, filePath)).toEqual([TYPES])
  })

  it.each([
    ['a type in types.ts', 'packages/x/src/types.ts', 'export type A = string'],
    ['a type in a nested types.ts', 'app/src/x/types.ts', 'export interface A {}'],
    ['a type in a spec', 'packages/x/src/foo.spec.ts', 'type Row = { a: number }'],
    [
      'a paired Option',
      'packages/x/src/option.ts',
      'export type Option<T> = T | undefined\nexport const Option = { none: undefined }',
    ],
    [
      'a paired Result',
      'packages/x/src/result.ts',
      'export type Result<T> = { ok: T }\nexport const Result = { ok: 1 }',
    ],
    ['a type outside packages and app', 'tooling/foo.ts', 'export type A = string'],
  ])('allows %s', async (_, filePath, code) => {
    expect(await restrictedSyntax(code, filePath)).toEqual([])
  })
})
