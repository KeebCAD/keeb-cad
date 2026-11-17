import type { Parameter } from '@keeb-cad/schema'
import { aDesign, anExpression, aParameter, aParameterName } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { setParameter } from './set-parameter'

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

function arrange(parameters: Parameter[]) {
  return aDesign({ parameters })
}

describe('setParameter', () => {
  it('appends a parameter the design has no name for', () => {
    const design = arrange([])

    setParameter(design, parameter('wall', '3mm'))

    expect(design.parameters).toEqual([parameter('wall', '3mm')])
  })

  it('changes the value of the parameter with that name, keeping its place', () => {
    const design = arrange([parameter('wall', '3mm'), parameter('pitch', '19mm')])

    setParameter(design, parameter('wall', '5mm'))

    expect(design.parameters).toEqual([parameter('wall', '5mm'), parameter('pitch', '19mm')])
  })

  it('appends a new name after the ones the design has', () => {
    const design = arrange([parameter('wall', '3mm')])

    setParameter(design, parameter('alpha', '1mm'))

    expect(design.parameters).toEqual([parameter('wall', '3mm'), parameter('alpha', '1mm')])
  })
})
