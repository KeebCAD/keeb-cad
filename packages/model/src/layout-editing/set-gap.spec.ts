import { aDesign, aGap, aLength, aMeta } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { setGap } from './set-gap'
import type { GapEdit } from './types'

function arrange() {
  return aDesign({ meta: aMeta({ gap: aGap({ x: aLength('1mm'), y: aLength('1mm') }) }) })
}

describe('setGap', () => {
  it.each<[string, GapEdit, ReturnType<typeof aGap>]>([
    ['x alone', { x: aLength('5mm') }, aGap({ x: aLength('5mm'), y: aLength('1mm') })],
    ['y alone', { y: aLength('2mm') }, aGap({ x: aLength('1mm'), y: aLength('2mm') })],
    [
      'both axes',
      { x: aLength('3mm'), y: aLength('4mm') },
      aGap({ x: aLength('3mm'), y: aLength('4mm') }),
    ],
    ['nothing for an empty edit', {}, aGap({ x: aLength('1mm'), y: aLength('1mm') })],
  ])('writes %s, keeping the other axis', (_role, edit, expected) => {
    const design = arrange()

    setGap(design, edit)

    expect(design.meta.gap).toEqual(expected)
  })
})
