import { describe, expect, it } from 'vitest'

import { findVisibleUses } from './find-visible-uses'

describe('findVisibleUses', () => {
  it('finds the ids of use() calls with a literal id', () => {
    expect(
      findVisibleUses(`const a = use('lib:blueprint/x', {}); use("lib:blueprint/y", {})`),
    ).toEqual(['lib:blueprint/x', 'lib:blueprint/y'])
  })

  it('ignores a computed id and another function', () => {
    expect(findVisibleUses(`use(idOf(), {}); reuse('lib:blueprint/x', {})`)).toEqual([])
  })
})
