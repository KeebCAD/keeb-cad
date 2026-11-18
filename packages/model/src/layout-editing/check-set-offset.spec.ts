import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { Parameter } from '@keeb-cad/schema'
import {
  aDelta,
  aDesign,
  aLayout,
  anAngle,
  anExpression,
  anId,
  aParameter,
  aParameterName,
  aSlot,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { checkSetOffset } from './check-set-offset'
import type { OffsetEdit } from './types'

const A = anId('a')
const B = anId('b')

function arrange(parameters: Parameter[] = []) {
  return aDesign({
    parameters,
    layout: aLayout({ children: [aSlot({ id: A }), aSlot({ id: B })] }),
  })
}

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

describe('checkSetOffset', () => {
  it('refuses every id the design lacks in one unknown-target', () => {
    const result = checkSetOffset(arrange(), [A, anId('x'), anId('y')], {})

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'unknown-target', ids: [anId('x'), anId('y')] })
  })

  it('refuses a parameter in mm on the rotation with unit-mismatch, naming every node', () => {
    const result = checkSetOffset(arrange([parameter('w', '2mm')]), [A, B], {
      rotation: anAngle('w'),
    })

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'unit-mismatch', ids: [A, B] })
  })

  it('refuses an unknown name with unresolvable-reference', () => {
    const result = checkSetOffset(arrange(), [A], { position: { x: aDelta('nope') } })

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'unresolvable-reference', ids: [A] })
  })

  it('refuses the position before the rotation when both fail', () => {
    const result = checkSetOffset(arrange([parameter('w', '2mm')]), [A], {
      position: { x: aDelta('nope') },
      rotation: anAngle('w'),
    })

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'unresolvable-reference', ids: [A] })
  })

  it('names a node given twice once', () => {
    const result = checkSetOffset(arrange(), [A, A], { position: { y: aDelta('nope') } })

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'unresolvable-reference', ids: [A] })
  })

  it.each<[string, Parameter[], OffsetEdit]>([
    ['a negative delta', [], { position: { x: aDelta('-3mm') } }],
    [
      'a rotation that reads a failed parameter, which reports its own fault',
      [parameter('p', 'q'), parameter('q', 'p')],
      { rotation: anAngle('p') },
    ],
    ['null fields', [], { position: null, rotation: null, pivot: null }],
    ['an edit with no field', [], {}],
  ])('passes %s', (_role, parameters, edit) => {
    expectOk(checkSetOffset(arrange(parameters), [A], edit))
  })
})
