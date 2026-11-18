import type { Parameter } from '@keeb-cad/schema'
import { aDesign, anExpression, aParameter, aParameterName } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { addParameter } from './add-parameter'

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

function arrange(parameters: Parameter[]) {
  return aDesign({ parameters })
}

describe('addParameter', () => {
  it('adds the parameter to a design with none', () => {
    const design = arrange([])

    addParameter(design, parameter('wall', '3mm'))

    expect(design.parameters).toEqual([parameter('wall', '3mm')])
  })

  it('appends the parameter after the ones the design has', () => {
    const design = arrange([parameter('ks', '19mm')])

    addParameter(design, parameter('wall', '3mm'))

    expect(design.parameters).toEqual([parameter('ks', '19mm'), parameter('wall', '3mm')])
  })
})
