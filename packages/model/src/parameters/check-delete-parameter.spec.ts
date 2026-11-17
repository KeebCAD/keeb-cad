import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { DesignPart, Node, Parameter } from '@keeb-cad/schema'
import {
  aBlueprintDesignPart,
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
  aQuantityInputValue,
  aSlot,
  aVec2,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { parameterInUseMessage } from '../violations/parameter-in-use-message'
import { unknownParameterMessage } from '../violations/unknown-parameter-message'
import { checkDeleteParameter } from './check-delete-parameter'

const DESIGN_ID = anId('corne')

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

const slotAt = (id: string, { x = '0mm', y = '0mm' }: { x?: string; y?: string }) =>
  aSlot({ id: anId(id), offset: anOffset({ position: aVec2({ x: aDelta(x), y: aDelta(y) }) }) })

const partWithInput = (id: string, input: string) =>
  aBlueprintDesignPart({ id: anId(id), inputs: { travel: aQuantityInputValue(input) } })

function arrange({
  gapX = '1mm',
  parameters = [parameter('ks', '19mm')],
  parts = [aBlueprintDesignPart()],
  children = [],
}: {
  gapX?: string
  parameters?: Parameter[]
  parts?: DesignPart[]
  children?: Node[]
}) {
  return aDesign({
    meta: aMeta({ id: DESIGN_ID, gap: aGap({ x: aLength(gapX) }) }),
    parameters,
    parts,
    layout: aLayout({ children }),
  })
}

function rejectionOf(design: ReturnType<typeof arrange>, name: string) {
  const result = checkDeleteParameter(design, aParameterName(name))
  expectErr(result)
  return result.error
}

const inUse = (name: string, users: string[]) => ({
  kind: 'parameter-in-use',
  ids: users,
  message: parameterInUseMessage(
    name,
    users.map((id) => anId(id)),
  ),
})

describe('checkDeleteParameter', () => {
  it('refuses a missing name with unknown-target, naming it', () => {
    const result = checkDeleteParameter(arrange({ parameters: [] }), aParameterName('ks'))

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'unknown-target',
      ids: ['ks'],
      message: unknownParameterMessage('ks'),
    })
  })

  it('accepts a parameter nothing uses', () => {
    const design = arrange({ parameters: [parameter('a', '1mm'), parameter('ks', '19mm')] })

    expectOk(checkDeleteParameter(design, aParameterName('ks')))
  })

  it('refuses a used parameter with parameter-in-use, naming meta, a parameter and two nodes', () => {
    const design = arrange({
      gapX: 'ks',
      parameters: [parameter('ks', '19mm'), parameter('b', 'ks')],
      children: [slotAt('k', { x: 'ks' }), slotAt('j', { y: 'ks * 2' })],
    })

    expect(rejectionOf(design, 'ks')).toEqual(inUse('ks', [DESIGN_ID, 'b', 'k', 'j']))
  })

  it('names a part whose input uses the parameter', () => {
    const design = arrange({
      parts: [aBlueprintDesignPart(), partWithInput('p', 'ks')],
      children: [slotAt('k', { x: 'ks' })],
    })

    expect(rejectionOf(design, 'ks')).toEqual(inUse('ks', ['p', 'k']))
  })

  it('names a node with two fields using the parameter once', () => {
    const design = arrange({ children: [slotAt('k', { x: 'ks', y: 'ks' })] })

    expect(rejectionOf(design, 'ks')).toEqual(inUse('ks', ['k']))
  })

  it('names users in design order: meta, parameters, parts, nodes', () => {
    const design = arrange({
      gapX: 'ks',
      parameters: [parameter('ks', '19mm'), parameter('b', 'ks')],
      parts: [aBlueprintDesignPart(), partWithInput('p', 'ks')],
      children: [slotAt('k', { x: 'ks' })],
    })

    expect(rejectionOf(design, 'ks')).toEqual(inUse('ks', [DESIGN_ID, 'b', 'p', 'k']))
  })

  it('accepts a parameter whose only use is its own value', () => {
    const design = arrange({ parameters: [parameter('a', 'a + 1mm')] })

    expectOk(checkDeleteParameter(design, aParameterName('a')))
  })

  it('names a later parameter with the same name that reads the first', () => {
    const design = arrange({
      parameters: [parameter('wall', '1mm'), parameter('wall', 'wall * 2')],
    })

    expect(rejectionOf(design, 'wall')).toEqual(inUse('wall', ['wall']))
  })

  it("leaves the parameter's own value out of its users", () => {
    const design = arrange({ parameters: [parameter('a', 'a + 1mm'), parameter('b', 'a')] })

    expect(rejectionOf(design, 'a')).toEqual(inUse('a', ['b']))
  })
})
