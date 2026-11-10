import { Option } from '@keeb-cad/result'
import { describe, expect, it } from 'vitest'

import { findRow } from './find-row'

const IDS = ['a', 'b', '😀', '￿']

describe('findRow', () => {
  it.each([
    ['the first id', IDS, 'a', Option.some(0)],
    ['the second id', IDS, 'b', Option.some(1)],
    ['an id of a surrogate pair', IDS, '😀', Option.some(2)],
    ['the last id', IDS, '￿', Option.some(3)],
    ['an id below the first', IDS, 'A', Option.none()],
    ['an id between two', IDS, 'aa', Option.none()],
    ['an id above the last', IDS, '￿￿', Option.none()],
    ['any id in no ids', [], 'a', Option.none()],
  ])('finds %s', (_role, ids, id, expected) => {
    expect(findRow(ids, id)).toEqual(expected)
  })
})
