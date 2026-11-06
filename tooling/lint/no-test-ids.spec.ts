import { describe, expect, it } from 'vitest'

import { TEST_ID_MESSAGE } from '../../eslint.config'
import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'
import { ruleMessages } from './rule-messages'

describe('no test ids', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each([
    ['a browser-mode spec', 'packages/x/src/a.spec.ts', "screen.getByTestId('a')"],
    ['an end-to-end spec', 'app/e2e/a.spec.ts', "page.getByTestId('a')"],
  ])('rejects getByTestId in %s', async (_, filePath, code) => {
    expect(await ruleMessages('no-restricted-properties', code, filePath)).toEqual([
      expect.stringContaining(TEST_ID_MESSAGE),
    ])
  })

  it('rejects a static data-testid attribute', async () => {
    const code = '<template>\n  <p data-testid="a">x</p>\n</template>\n'
    expect(
      await ruleMessages('vue/no-restricted-static-attribute', code, 'packages/x/src/A.vue'),
    ).toEqual([TEST_ID_MESSAGE])
  })

  it('rejects a bound data-testid attribute', async () => {
    const code = '<template>\n  <p :data-testid="id">x</p>\n</template>\n'
    expect(await ruleMessages('vue/no-restricted-v-bind', code, 'packages/x/src/A.vue')).toEqual([
      TEST_ID_MESSAGE,
    ])
  })

  it('allows a role query', async () => {
    expect(
      await ruleMessages(
        'no-restricted-properties',
        "screen.getByRole('main')",
        'packages/x/src/a.spec.ts',
      ),
    ).toEqual([])
  })

  it('still rejects a test id behind a disable comment', async () => {
    const code =
      "// eslint-disable-next-line no-restricted-properties -- a canvas has no role\nscreen.getByTestId('a')"
    expect(
      await ruleMessages('no-restricted-properties', code, 'packages/x/src/a.spec.ts'),
    ).toEqual([expect.stringContaining(TEST_ID_MESSAGE)])
  })
})
