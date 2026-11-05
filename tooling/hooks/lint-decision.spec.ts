import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

import { COLD_CONFIG_TIMEOUT } from '../lint/cold-config-timeout'
import { lintDecision } from './lint-decision'

const root = fileURLToPath(new URL('../..', import.meta.url))
const eslint = new ESLint({ cache: false, cwd: root })

const SPEC = 'packages/x/src/a.spec.ts'
const CLEAN_SPEC =
  "import { expect, it } from 'vitest'\n\nit('a', () => {\n  expect(1).toBe(1)\n})\n"

describe('the lint-on-edit hook', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it('returns exit code 2 and the ESLint output for a violation', async () => {
    const code =
      "import { expect, it } from 'vitest'\n\nit('a', () => {\n  expect(screen.getByTestId('x')).toBe(1)\n})\n"
    expect(await lintDecision(eslint, root, SPEC, code)).toEqual({
      exitCode: 2,
      output: expect.stringContaining('getByTestId'),
    })
  })

  it('passes a clean file silently', async () => {
    expect(await lintDecision(eslint, root, SPEC, CLEAN_SPEC)).toEqual({ exitCode: 0, output: '' })
  })

  it.each([
    ['an ignored ticket', '_bmad-output/x.md'],
    ['a file outside the workspace', '/elsewhere/a.spec.ts'],
  ])('passes %s silently', async (_, filePath) => {
    expect(await lintDecision(eslint, root, filePath, 'it.only(')).toEqual({
      exitCode: 0,
      output: '',
    })
  })

  it('passes a file with warnings only', async () => {
    const filePath = 'packages/x/src/a.ts'
    const code = '// eslint-disable-next-line no-console\nexport const a = 1\n'
    expect(await eslint.lintText(code, { filePath })).toMatchObject([
      { errorCount: 0, warningCount: 1 },
    ])
    expect(await lintDecision(eslint, root, filePath, code)).toEqual({ exitCode: 0, output: '' })
  })
})
