import {
  aFreeGroup,
  aLayout,
  anId,
  aPartRef,
  aSideComponentOverride,
  aSideId,
  aSidePartOverride,
  aSlot,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { removedSideIds } from './removed-side-ids'

describe('removedSideIds', () => {
  it('names only the side placements a resolved removal names', () => {
    const layout = aLayout({
      id: anId('root'),
      children: [aSlot({ id: anId('a') }), aFreeGroup({ id: anId('g') })],
    })

    const removed = removedSideIds(
      [
        aSidePartOverride({ target: aSideId('right/a'), part: null }),
        aSidePartOverride({ target: aSideId('right/zz'), part: null }),
        aSidePartOverride({ target: aSideId('right/g'), part: null }),
        aSidePartOverride({ target: aSideId('left/a'), part: aPartRef('key') }),
        aSideComponentOverride({ target: aSideId('left/a') }),
      ],
      layout,
    )

    expect(removed).toEqual(new Set(['right/a']))
  })
})
