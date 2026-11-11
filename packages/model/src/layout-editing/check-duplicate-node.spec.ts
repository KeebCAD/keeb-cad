import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { aDesign, aLayout, anId, aSlot } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { checkDuplicateNode } from './check-duplicate-node'

const ROOT = anId('root')

function arrange() {
  return aDesign({ layout: aLayout({ id: ROOT, children: [aSlot({ id: anId('a') })] }) })
}

describe('checkDuplicateNode', () => {
  it('refuses the root with root-required naming it', () => {
    const result = checkDuplicateNode(arrange(), ROOT)

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'root-required',
      ids: [ROOT],
      message: 'The root group "root" can\'t be duplicated.',
    })
  })

  it('refuses an id the design lacks with unknown-target naming it', () => {
    const result = checkDuplicateNode(arrange(), anId('missing'))

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'unknown-target',
      ids: [anId('missing')],
      message: 'The design has no node with the id "missing".',
    })
  })

  it('accepts a node the design has', () => {
    expectOk(checkDuplicateNode(arrange(), anId('a')))
  })
})
