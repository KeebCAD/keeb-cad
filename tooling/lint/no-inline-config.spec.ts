import { describe, expect, it } from 'vitest'

import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'
import { lintResult, ruleMessages } from './rule-messages'

const FILE = 'packages/x/src/a.ts'

const expectedTestIdMessage =
  'Find elements by role, then label, then text. A test id is a last resort, behind a file override in eslint.config.ts whose comment gives the reason.'

describe('no inline config', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each([
    ['a disable-next-line comment', '// eslint-disable-next-line no-console\nconsole.log(1)'],
    ['a block disable comment', '/* eslint-disable no-console */'],
    ['a rule-config comment', '/* eslint no-console: off */'],
    ['an enable comment', '// eslint-enable'],
    ['prose that starts with the term in another case', '// ESLint caches per file'],
    ['a disable comment after leading spaces', '/*   eslint-disable no-console */'],
  ])('rejects %s as an error on its line', async (_, code) => {
    const { messages } = await lintResult(code, FILE)
    expect(messages).toContainEqual(
      expect.objectContaining({ ruleId: 'no-warning-comments', severity: 2, line: 1 }),
    )
  })

  it.each([
    ['a comment with the term past its start', '// see the eslint docs'],
    ['an empty comment', '//'],
    ['a global comment', '/* global foo */'],
  ])('allows %s', async (_, code) => {
    expect(await ruleMessages('no-warning-comments', code, FILE)).toEqual([])
  })

  it('still reports a rule a disable comment names', async () => {
    const code = "// eslint-disable-next-line no-restricted-properties\nscreen.getByTestId('a')"
    expect(
      await ruleMessages('no-restricted-properties', code, 'packages/x/src/a.spec.ts'),
    ).toEqual([expect.stringContaining(expectedTestIdMessage)])
  })

  it('still reports a rule a template disable comment names', async () => {
    const code =
      '<template>\n  <!-- eslint-disable-next-line vue/no-restricted-static-attribute -->\n  <p data-testid="a">x</p>\n</template>\n'
    expect(
      await ruleMessages('vue/no-restricted-static-attribute', code, 'packages/x/src/A.vue'),
    ).toEqual([expectedTestIdMessage])
  })
})
