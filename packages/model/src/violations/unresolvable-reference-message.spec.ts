import { anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { unresolvableReferenceMessage } from './unresolvable-reference-message'
import type { UnresolvedReference } from './types'

describe('unresolvableReferenceMessage', () => {
  it.each<[UnresolvedReference, string, string]>([
    ['anchor', 'n', 'The node "n" has an anchor that doesn\'t resolve.'],
    ['part', 's', 'The slot "s" names a part that doesn\'t resolve.'],
  ])('words an unresolved %s', (reference, id, expected) => {
    expect(unresolvableReferenceMessage(reference, [anId(id)])).toBe(expected)
  })
})
