import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { aDesign, aLayout, anId, aSlot } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { checkDeleteNode } from './check-delete-node'

const ROOT = anId('root')

function arrange() {
  return aDesign({ layout: aLayout({ id: ROOT, children: [aSlot({ id: anId('a') })] }) })
}

describe('checkDeleteNode', () => {
  it('refuses the root with root-required naming it', () => {
    const result = checkDeleteNode(arrange(), [ROOT])

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'root-required',
      ids: [ROOT],
      message: 'The root group "root" can\'t be deleted.',
    })
  })

  it('refuses a list with missing ids with unknown-target naming every missing one', () => {
    const result = checkDeleteNode(arrange(), [anId('a'), anId('missing'), anId('gone')])

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'unknown-target',
      ids: [anId('missing'), anId('gone')],
      message: 'The design has no node with the id "missing", "gone".',
    })
  })

  it.each([
    ['no ids', []],
    ['an id the design has', [anId('a')]],
  ])('accepts %s', (_role, ids) => {
    expectOk(checkDeleteNode(arrange(), ids))
  })
})
