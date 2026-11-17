import type { Parameter } from '@keeb-cad/schema'
import { aDesign, anExpression, aParameter, aParameterName } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { deleteParameter } from './delete-parameter'

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

function arrange(parameters: Parameter[]) {
  return aDesign({ parameters })
}

describe('deleteParameter', () => {
  it('removes the parameter, keeping the others in order', () => {
    const design = arrange([parameter('a', '1mm'), parameter('ks', '19mm'), parameter('b', '2mm')])

    deleteParameter(design, aParameterName('ks'))

    expect(design.parameters).toEqual([parameter('a', '1mm'), parameter('b', '2mm')])
  })

  it('removes only the first of two parameters with the name', () => {
    const design = arrange([parameter('wall', '1mm'), parameter('wall', '5mm')])

    deleteParameter(design, aParameterName('wall'))

    expect(design.parameters).toEqual([parameter('wall', '5mm')])
  })
})
