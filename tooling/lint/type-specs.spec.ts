import { describe, expect, it } from 'vitest'

import { TYPE_SPEC_MESSAGE } from '../../eslint.config'
import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'
import { lintResult, ruleMessages } from './rule-messages'

const TYPE_SPEC = 'packages/x/src/a.types.spec.ts'
const RUNTIME_SPEC = 'packages/x/src/a.spec.ts'
const TYPES_ONLY_TEST =
  "import { expectTypeOf, it } from 'vitest'\n\nit('a', () => {\n  expectTypeOf(1).toEqualTypeOf<number>()\n})\n"

const expectExpect = async (code: string, filePath: string) =>
  (await lintResult(code, filePath)).messages.filter(
    (message) => message.ruleId === 'vitest/expect-expect',
  )

describe('type specs', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each(['expect', 'assert'])('rejects importing %s into a type spec', async (name) => {
    expect(
      await ruleMessages('no-restricted-imports', `import { ${name} } from 'vitest'\n`, TYPE_SPEC),
    ).toEqual([expect.stringContaining(TYPE_SPEC_MESSAGE)])
  })

  it('allows importing expectTypeOf into a type spec', async () => {
    expect(
      await ruleMessages(
        'no-restricted-imports',
        "import { expectTypeOf } from 'vitest'\n",
        TYPE_SPEC,
      ),
    ).toEqual([])
  })

  it('rejects a runtime spec test that asserts only types as an error', async () => {
    expect(await expectExpect(TYPES_ONLY_TEST, RUNTIME_SPEC)).toMatchObject([{ severity: 2 }])
  })

  it('allows a type spec test that asserts with expectTypeOf', async () => {
    expect(await ruleMessages('vitest/expect-expect', TYPES_ONLY_TEST, TYPE_SPEC)).toEqual([])
  })

  it('rejects a type spec test that asserts nothing as an error', async () => {
    const code = "import { it } from 'vitest'\n\nit('a', () => {})\n"
    expect(await expectExpect(code, TYPE_SPEC)).toMatchObject([{ severity: 2 }])
  })
})
