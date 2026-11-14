import { aDesign, aMeta, aPlacementId, aUnibodyForm } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { designWith } from '../testing/layout-canvas'
import { addedSide } from './added-side'

describe('addedSide', () => {
  it.each([
    ['the authored side with nothing selected', [], 'left'],
    ['the side of a selected right id', ['right/x'], 'right'],
    ['the side of a selected left id', ['left/x'], 'left'],
    ['the authored side with several selected', ['left/x', 'right/y'], 'left'],
  ])('on a split design gives %s', (_role, selected, expected) => {
    expect(addedSide(designWith('x', 'y'), selected.map(aPlacementId))).toBe(expected)
  })

  it('gives the unibody side with nothing selected on a unibody design', () => {
    const unibody = aDesign({ meta: aMeta({ form: aUnibodyForm() }) })

    expect(addedSide(unibody, [])).toBe('whole')
  })
})
