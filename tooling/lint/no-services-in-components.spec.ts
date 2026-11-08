import { describe, expect, it } from 'vitest'

import { SERVICE_IMPORT_MESSAGE } from '../../eslint.config'
import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'
import { ruleMessages } from './rule-messages'

const RULE = '@typescript-eslint/no-restricted-imports'
const COMPONENT = 'packages/x/src/A.vue'

const component = (imports: string) => `<script setup lang="ts">\n${imports}\n</script>\n`

describe('no services in components', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each([
    ['a value import from di/vue', "import { useService } from '@keeb-cad/di/vue'"],
    ['a value import from di', "import { Container } from '@keeb-cad/di'"],
    ['a mixed import', "import { type Injector, Container } from '@keeb-cad/di'"],
    ['a side-effect import', "import '@keeb-cad/di/vue'"],
  ])('rejects %s in a component', async (_, imports) => {
    expect(await ruleMessages(RULE, component(imports), COMPONENT)).toEqual([
      expect.stringContaining(SERVICE_IMPORT_MESSAGE),
    ])
  })

  it.each([
    ['a type import from di', "import type { Injector } from '@keeb-cad/di'"],
    ['a type import from di/vue', "import type { useService } from '@keeb-cad/di/vue'"],
    ['an inline type import', "import { type Injector } from '@keeb-cad/di'"],
    ['an import from another package', "import { DesignStore } from '@keeb-cad/design'"],
  ])('allows %s in a component', async (_, imports) => {
    expect(await ruleMessages(RULE, component(imports), COMPONENT)).toEqual([])
  })

  it('allows a value import from di/vue in a composable', async () => {
    expect(
      await ruleMessages(
        RULE,
        "import { useService } from '@keeb-cad/di/vue'\n",
        'packages/x/src/use-x.ts',
      ),
    ).toEqual([])
  })
})
