import { Result } from '@keeb-cad/result'
import { expectOk, expectResult } from '@keeb-cad/result/testing'
import type { Parameter, Rejection } from '@keeb-cad/schema'
import { aDesign, anExpression, aParameter, aParameterName } from '@keeb-cad/schema/testing'
import { describe, it } from 'vitest'

import { unitMismatchMessage } from '../violations/unit-mismatch-message'
import { unresolvableReferenceMessage } from '../violations/unresolvable-reference-message'
import { checkAddParameter } from './check-add-parameter'

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

const KS = aParameterName('ks')
const WALL = aParameterName('wall')

function arrange(parameters: Parameter[] = []) {
  return aDesign({ parameters })
}

describe('checkAddParameter', () => {
  it.each<[string, Parameter[], Parameter, Rejection]>([
    [
      'a name a parameter has with id-taken',
      [parameter('wall', '3mm')],
      parameter('wall', '1mm'),
      {
        kind: 'id-taken',
        ids: [WALL],
        message: 'The design already has a parameter named "wall".',
      },
    ],
    [
      'a value adding a unitless number to a length with unit-mismatch',
      [],
      parameter('ks', '5 + 1mm'),
      { kind: 'unit-mismatch', ids: [KS], message: unitMismatchMessage([KS]) },
    ],
    [
      'a value naming no parameter with unresolvable-reference',
      [],
      parameter('ks', 'nope'),
      {
        kind: 'unresolvable-reference',
        ids: [KS],
        message: unresolvableReferenceMessage({ parameter: 'nope' }, [KS]),
      },
    ],
  ])('refuses %s, naming the new parameter', (_role, parameters, added, expected) => {
    expectResult(checkAddParameter(arrange(parameters), added), Result.err(expected))
  })

  it.each<[string, Parameter[], Parameter]>([
    ['a name no parameter has', [parameter('wall', '3mm')], parameter('ks', '2mm')],
    ['a negative value, since a parameter is no length field', [], parameter('ks', '-1mm')],
    [
      'a value reading a failed parameter, which reports its own fault',
      [parameter('a', 'a')],
      parameter('ks', 'a'),
    ],
  ])('passes %s', (_role, parameters, added) => {
    expectOk(checkAddParameter(arrange(parameters), added))
  })
})
