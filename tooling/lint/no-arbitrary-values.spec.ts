import { describe, expect, it } from 'vitest'

import { COLD_CONFIG_TIMEOUT } from './cold-config-timeout'
import { lintResult } from './rule-messages'

const RULE = 'better-tailwindcss/no-restricted-classes'
const FILE = 'packages/x/src/StyledThing.vue'

const template = (attribute: string) => `<template>\n  <p ${attribute}>x</p>\n</template>\n`

describe('no arbitrary values', { timeout: COLD_CONFIG_TIMEOUT }, () => {
  it.each([
    ['an arbitrary length', 'class="p-[7px]"'],
    ['an arbitrary colour', 'class="bg-[#fff]"'],
    ['an arbitrary value behind a variant', 'class="hover:p-[7px]"'],
    ['an arbitrary property', 'class="[mask:none]"'],
    ['a CSS variable shorthand', 'class="p-(--x)"'],
    ['an arbitrary value in a bound class', `:class="'p-[7px]'"`],
  ])('rejects %s', async (_, attribute) => {
    const { messages } = await lintResult(template(attribute), FILE)

    expect(messages).toEqual([expect.objectContaining({ ruleId: RULE, severity: 2, line: 2 })])
  })

  it('allows arbitrary variants, ARIA variants, the spacing scale and named tokens', async () => {
    const attribute = 'class="data-[state=active]:bg-panel aria-disabled:text-text-muted p-3 p-pad"'

    const { messages } = await lintResult(template(attribute), FILE)

    expect(messages).toEqual([])
  })
})
