import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { aDesign, aFreeGroup, aLayout, anId, aSlot, aSlotAnchor } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { checkSetArrangement } from './check-set-arrangement'

const G = anId('g')
const K = anId('k')
const S = anId('s')

const CHAIN_X = { arrangement: 'chain', axis: 'x' } as const

// Free g holds k, which is anchored to s outside it; g is anchored to k when `anchoredToChild`.
function arrange({ anchoredToChild = false } = {}) {
  return aDesign({
    layout: aLayout({
      children: [
        aSlot({ id: S }),
        aFreeGroup({
          id: G,
          ...(anchoredToChild ? { anchor: aSlotAnchor({ ref: K }) } : {}),
          children: [aSlot({ id: K, anchor: aSlotAnchor({ ref: S }) })],
        }),
      ],
    }),
  })
}

describe('checkSetArrangement', () => {
  it('refuses a slot with unknown-target', () => {
    const result = checkSetArrangement(arrange(), [S], CHAIN_X)

    expectErr(result)
    expect(result.error).toMatchObject({
      kind: 'unknown-target',
      ids: [S],
    })
  })

  it('refuses only the ids the design lacks with unknown-target', () => {
    const missing = anId('x')

    const result = checkSetArrangement(arrange(), [G, missing], CHAIN_X)

    expectErr(result)
    expect(result.error).toMatchObject({
      kind: 'unknown-target',
      ids: [missing],
    })
  })

  it('refuses a chain whose child would fall back onto the group anchored to it', () => {
    const result = checkSetArrangement(arrange({ anchoredToChild: true }), [G], CHAIN_X)

    expectErr(result)
    expect(result.error).toMatchObject({
      kind: 'dependency-cycle',
      ids: [K, G],
    })
  })

  it('passes a chain that closes no loop', () => {
    expectOk(checkSetArrangement(arrange(), [G], CHAIN_X))
  })

  it('passes freeing a group', () => {
    expectOk(checkSetArrangement(arrange(), [G], { arrangement: 'free' }))
  })
})
