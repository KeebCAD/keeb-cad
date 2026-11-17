import { aParameterName, anId, aSideId } from '@keeb-cad/schema/testing'
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

  it('words an unresolved override target, naming it', () => {
    expect(unresolvableReferenceMessage('override', [aSideId('right/zz')])).toBe(
      'The override on "right/zz" names a slot that doesn\'t resolve.',
    )
  })

  it.each([
    [
      'two users',
      [anId('a'), aParameterName('b')],
      'No parameter is named "nope"; "a", "b" use it.',
    ],
    ['one user', [anId('a')], 'No parameter is named "nope"; "a" uses it.'],
  ])('words a missing parameter, naming it and %s', (_role, ids, expected) => {
    expect(unresolvableReferenceMessage({ parameter: 'nope' }, ids)).toBe(expected)
  })
})
