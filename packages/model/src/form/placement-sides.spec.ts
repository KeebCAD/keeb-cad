import { aSplitForm, aUnibodyForm } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { authoredSide, placementSides } from './placement-sides'

describe('placementSides and authoredSide', () => {
  it.each([
    ['split reversible', aSplitForm({ board: 'reversible' }), ['left', 'right'], 'left'],
    ['split mirrored', aSplitForm({ board: 'mirrored' }), ['left', 'right'], 'left'],
    ['unibody', aUnibodyForm(), ['whole'], 'whole'],
  ])('of a %s form', (_role, form, expectedSides, expectedAuthored) => {
    expect({ sides: placementSides(form), authored: authoredSide(form) }).toEqual({
      sides: expectedSides,
      authored: expectedAuthored,
    })
  })
})
