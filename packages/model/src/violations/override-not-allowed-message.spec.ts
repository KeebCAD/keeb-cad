import { aSideId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { overrideNotAllowedMessage } from './override-not-allowed-message'

describe('overrideNotAllowedMessage', () => {
  it('names the target and says an override there can only remove the part', () => {
    expect(overrideNotAllowedMessage([aSideId('right/a')])).toBe(
      `The override on "right/a" swaps its part, which a reversible board doesn't allow; an override there can only remove the part.`,
    )
  })
})
