import {
  aDesign,
  aLayout,
  aMeta,
  anId,
  aPlacementId,
  aSlot,
  aSplitForm,
  aUnibodyForm,
} from '@keeb-cad/schema/testing'
import type { Form } from '@keeb-cad/schema'
import { describe, expect, it } from 'vitest'

import { holdsPlacement } from './holds-placement'

function arrange(form: Form) {
  return aDesign({
    meta: aMeta({ form }),
    layout: aLayout({ children: [aSlot({ id: anId('k') })] }),
  })
}

describe('holdsPlacement', () => {
  it.each([
    ['the left side of a held slot', 'left/k', true],
    ['the right side of a held slot', 'right/k', true],
    ['the unibody side, which a split form has not', 'whole/k', false],
    ['a node the design does not hold', 'left/gone', false],
  ])('on a split design, holds %s: %s', (_role, id, expected) => {
    expect(holdsPlacement(arrange(aSplitForm()), aPlacementId(id))).toBe(expected)
  })

  it.each([
    ['the unibody side of a held slot', 'whole/k', true],
    ['a split side, which a unibody form has not', 'left/k', false],
  ])('on a unibody design, holds %s: %s', (_role, id, expected) => {
    expect(holdsPlacement(arrange(aUnibodyForm()), aPlacementId(id))).toBe(expected)
  })
})
