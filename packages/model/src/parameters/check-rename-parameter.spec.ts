import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { Node, Parameter } from '@keeb-cad/schema'
import {
  aDelta,
  aDesign,
  aGap,
  aLayout,
  aLength,
  aMeta,
  anExpression,
  anId,
  anOffset,
  aParameter,
  aParameterName,
  aSlot,
  aVec2,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { expressionTooLongMessage } from '../violations/expression-too-long-message'
import { parameterTakenMessage } from '../violations/parameter-taken-message'
import { unknownParameterMessage } from '../violations/unknown-parameter-message'
import { checkRenameParameter } from './check-rename-parameter'

const DESIGN_ID = anId('corne')

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

const usingK = (length: number) => `k${' '.repeat(length - 1)}`

function arrange({
  gapX = '1mm',
  parameters = [],
  children = [],
}: {
  gapX?: string
  parameters?: Parameter[]
  children?: Node[]
}) {
  return aDesign({
    meta: aMeta({ id: DESIGN_ID, gap: aGap({ x: aLength(gapX) }) }),
    parameters,
    layout: aLayout({ children }),
  })
}

function check(design: ReturnType<typeof arrange>, from: string, to: string) {
  return checkRenameParameter(design, aParameterName(from), aParameterName(to))
}

describe('checkRenameParameter', () => {
  it('refuses a rename to a name another parameter has with id-taken, naming that name', () => {
    const design = arrange({ parameters: [parameter('ks', '19mm'), parameter('wall', '1mm')] })

    const result = check(design, 'ks', 'wall')

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'id-taken',
      ids: ['wall'],
      message: parameterTakenMessage('wall'),
    })
  })

  it.each([
    ['to another name', [], 'key'],
    ['to itself', [], 'ks'],
    ['onto a taken name', [parameter('wall', '1mm')], 'wall'],
  ])(
    'refuses a rename of a missing name %s with unknown-target, naming it',
    (_role, parameters, to) => {
      const result = check(arrange({ parameters }), 'ks', to)

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'unknown-target',
        ids: ['ks'],
        message: unknownParameterMessage('ks'),
      })
    },
  )

  it('accepts a rename to its own name', () => {
    expectOk(check(arrange({ parameters: [parameter('ks', '19mm')] }), 'ks', 'ks'))
  })

  it.each([
    ['just below the length limit', 509],
    ['on the length limit', 510],
  ])('accepts a rewrite %s', (_role, arrangedLength) => {
    const design = arrange({ gapX: usingK(arrangedLength), parameters: [parameter('k', '1mm')] })

    expectOk(check(design, 'k', 'kkk'))
  })

  it('accepts a rename onto a name an expression uses with no parameter', () => {
    const design = arrange({ gapX: 'key', parameters: [parameter('ks', '19mm')] })

    expectOk(check(design, 'ks', 'key'))
  })

  it('refuses a rewrite just above the length limit with expression-too-long, naming the item', () => {
    const design = arrange({ gapX: usingK(511), parameters: [parameter('k', '1mm')] })

    const result = check(design, 'k', 'kkk')

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'expression-too-long',
      ids: [DESIGN_ID],
      message: expressionTooLongMessage('k', 'kkk', [DESIGN_ID]),
    })
  })

  it('names every item a rename makes too long, in design order', () => {
    const design = arrange({
      gapX: usingK(511),
      parameters: [parameter('k', '1mm')],
      children: [
        aSlot({ id: anId('j'), offset: anOffset({ position: aVec2({ x: aDelta(usingK(511)) }) }) }),
      ],
    })
    const expectedIds = [DESIGN_ID, anId('j')]

    const result = check(design, 'k', 'kkk')

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'expression-too-long',
      ids: expectedIds,
      message: expressionTooLongMessage('k', 'kkk', expectedIds),
    })
  })
})
