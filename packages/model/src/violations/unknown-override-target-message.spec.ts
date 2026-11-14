import { aSideId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { unknownOverrideTargetMessage } from './unknown-override-target-message'

describe('unknownOverrideTargetMessage', () => {
  it('names the target the design has no slot at', () => {
    expect(unknownOverrideTargetMessage([aSideId('right/zz')])).toBe(
      'The design has no slot to override at "right/zz".',
    )
  })
})
