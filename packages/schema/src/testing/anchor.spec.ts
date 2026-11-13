import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { anchorSchema } from '../anchor'
import { anAnchor, aGroupAnchor, aSlotAnchor } from './anchor'
import { anAttachPoint } from './attach-point'
import { anId } from './id'

describe('aSlotAnchor', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(anchorSchema, aSlotAnchor()).issues).toBeUndefined()
  })

  it.each([
    ['ref', () => ({ ref: anId('other') })],
    ['attach', () => ({ attach: anAttachPoint('edge-top') })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aSlotAnchor(fields)).toMatchObject(fields)
  })
})

describe('aGroupAnchor', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(anchorSchema, aGroupAnchor()).issues).toBeUndefined()
  })

  it.each([['ref', () => ({ ref: anId('other') })]])(
    'keeps the %s it is given',
    (_field, makeFields) => {
      const fields = makeFields()

      expect(aGroupAnchor(fields)).toMatchObject(fields)
    },
  )
})

describe('anAnchor', () => {
  it.each([
    ['slot', aSlotAnchor],
    ['group', aGroupAnchor],
  ] as const)('builds the %s branch with its branch builder', (type, branchBuilder) => {
    expect(anAnchor(type)).toEqual(branchBuilder())
  })
})
