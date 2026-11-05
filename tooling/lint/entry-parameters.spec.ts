import { describe, expect, it } from 'vitest'

import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'
import { ruleMessages } from './rule-messages'

const IGNORED_INPUT =
  'export class Reset {\n  apply(_input: object): number {\n    return 1\n  }\n}\n'
const UNUSED_INPUT =
  'export class Reset {\n  apply(input: object): number {\n    return 1\n  }\n}\n'
const unusedVariables = (code: string, filePath: string) =>
  ruleMessages('@typescript-eslint/no-unused-vars', code, filePath)

describe(
  'an entry ignores its input behind an underscore',
  { timeout: COLD_CONFIG_TIMEOUT },
  () => {
    it.each([
      ['an entry in commands', 'packages/commands/src/layout/reset.ts'],
      ["a test entry in design's specs", 'packages/design/src/store/a.spec.ts'],
    ])('allows %s', async (_, filePath) => {
      expect(await unusedVariables(IGNORED_INPUT, filePath)).toEqual([])
    })

    it.each([
      ["design's own code", 'packages/design/src/store/a.ts', IGNORED_INPUT],
      ['another package', 'packages/editor/src/a.ts', IGNORED_INPUT],
      [
        'an unprefixed parameter in commands',
        'packages/commands/src/layout/reset.ts',
        UNUSED_INPUT,
      ],
    ])('rejects %s', async (_, filePath, code) => {
      expect(await unusedVariables(code, filePath)).toHaveLength(1)
    })
  },
)
