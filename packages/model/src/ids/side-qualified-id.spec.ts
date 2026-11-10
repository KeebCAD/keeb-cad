import { InvariantError } from '@keeb-cad/result'
import { anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { nodeIdOf, sideQualifiedId } from './side-qualified-id'

describe('sideQualifiedId', () => {
  it('puts the side before the id, split by a slash', () => {
    expect(sideQualifiedId('left', 'thumb-far')).toBe('left/thumb-far')
  })
})

describe('nodeIdOf', () => {
  it('reads the node id after the side', () => {
    expect(nodeIdOf('left/thumb-far')).toBe(anId('thumb-far'))
  })

  it.each([
    ['no side prefix', 'thumb-far'],
    ['an empty node id', 'left/'],
    ['an empty side', '/thumb-far'],
  ])('throws on an id with %s', (_role, qualified) => {
    expect(() => nodeIdOf(qualified)).toThrow(InvariantError)
  })
})
