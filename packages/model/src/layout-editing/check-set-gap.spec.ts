import { expectOk, expectResult } from '@keeb-cad/result/testing'
import { Result } from '@keeb-cad/result'
import type { Parameter, Rejection } from '@keeb-cad/schema'
import {
  aDesign,
  aGap,
  aLength,
  aMeta,
  anExpression,
  anId,
  aParameter,
  aParameterName,
} from '@keeb-cad/schema/testing'
import { describe, it } from 'vitest'

import { negativeLengthMessage } from '../violations/negative-length-message'
import { unitMismatchMessage } from '../violations/unit-mismatch-message'
import { unresolvableReferenceMessage } from '../violations/unresolvable-reference-message'
import { checkSetGap } from './check-set-gap'
import type { GapEdit } from './types'

const DESIGN_ID = anId('corne')

function arrange(parameters: Parameter[] = []) {
  return aDesign({
    meta: aMeta({ id: DESIGN_ID, gap: aGap({ x: aLength('1mm'), y: aLength('1mm') }) }),
    parameters,
  })
}

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

describe('checkSetGap', () => {
  it.each<[string, GapEdit]>([
    ['a length on 0', { x: aLength('0mm') }],
    ['a length just above 0', { x: aLength('0.01mm') }],
    ['an empty edit', {}],
  ])('passes %s', (_role, edit) => {
    expectOk(checkSetGap(arrange(), edit))
  })

  it.each<[string, Parameter[], GapEdit, Rejection]>([
    [
      'a length just below 0 with negative-length',
      [],
      { x: aLength('-0.01mm') },
      {
        kind: 'negative-length',
        ids: [DESIGN_ID],
        message: negativeLengthMessage([DESIGN_ID]),
      },
    ],
    [
      'a parameter in deg with unit-mismatch',
      [parameter('wall', '5deg')],
      { x: aLength('wall') },
      { kind: 'unit-mismatch', ids: [DESIGN_ID], message: unitMismatchMessage([DESIGN_ID]) },
    ],
    [
      'an unknown name with unresolvable-reference',
      [],
      { x: aLength('nope') },
      {
        kind: 'unresolvable-reference',
        ids: [DESIGN_ID],
        message: unresolvableReferenceMessage({ parameter: 'nope' }, [DESIGN_ID]),
      },
    ],
    [
      'y alone when only y fails',
      [],
      { y: aLength('-1mm') },
      {
        kind: 'negative-length',
        ids: [DESIGN_ID],
        message: negativeLengthMessage([DESIGN_ID]),
      },
    ],
    [
      'x first when both axes fail',
      [],
      { x: aLength('nope'), y: aLength('-1mm') },
      {
        kind: 'unresolvable-reference',
        ids: [DESIGN_ID],
        message: unresolvableReferenceMessage({ parameter: 'nope' }, [DESIGN_ID]),
      },
    ],
  ])('refuses %s, naming the design', (_role, parameters, edit, expected) => {
    expectResult(checkSetGap(arrange(parameters), edit), Result.err(expected))
  })

  it('passes a gap that reads a failed parameter, which reports its own fault', () => {
    expectOk(checkSetGap(arrange([parameter('a', 'a')]), { x: aLength('a') }))
  })
})
