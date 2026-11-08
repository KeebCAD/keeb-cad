import { Option } from '@keeb-cad/result'
import { describe, expect, it } from 'vitest'

import { HandleTable } from './handle-table'

describe('HandleTable', () => {
  it('finds what it holds', () => {
    const table = new HandleTable()
    expect(table.get(table.add('shape'))).toEqual(Option.some('shape'))
  })

  it('knows nothing it did not hand out', () => {
    expect(new HandleTable().get(1)).toEqual(Option.none())
  })

  it('knows nothing after being freed', () => {
    const table = new HandleTable()
    const handle = table.add('shape')
    table.free()
    expect(table.get(handle)).toEqual(Option.none())
  })
})
