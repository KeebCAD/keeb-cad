import { anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { unknownAnchorTargetMessage } from './unknown-anchor-target-message'

describe('unknownAnchorTargetMessage', () => {
  it('names the anchor target the design has nothing of the right kind at', () => {
    expect(unknownAnchorTargetMessage([anId('a')])).toBe(
      'The design has nothing of the right kind with the id "a".',
    )
  })
})
