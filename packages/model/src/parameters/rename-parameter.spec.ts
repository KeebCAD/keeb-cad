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

import { renameParameter } from './rename-parameter'

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

const slotAtX = (id: string, x: string) =>
  aSlot({ id: anId(id), offset: anOffset({ position: aVec2({ x: aDelta(x) }) }) })

const usingK = (length: number) => `k${' '.repeat(length - 1)}`

const partWithInput = (id: string, input: string) =>
  aBlueprintDesignPart({ id: anId(id), inputs: { travel: aQuantityInputValue(input) } })

function arrange({
  gapX = '1mm',
  parameters = [],
  parts = [aBlueprintDesignPart()],
  children = [],
}: {
  gapX?: string
  parameters?: Parameter[]
  parts?: DesignPart[]
  children?: Node[]
}) {
  return aDesign({
    meta: aMeta({ gap: aGap({ x: aLength(gapX) }) }),
    parameters,
    parts,
    layout: aLayout({ children }),
  })
}

describe('renameParameter', () => {
  it('renames the parameter in place and rewrites its uses in meta, parameters and nodes', () => {
    const design = arrange({
      gapX: 'ks',
      parameters: [parameter('ks', '19mm'), parameter('b', 'ks + 1mm')],
      children: [slotAtX('k', 'ks')],
    })

    renameParameter(design, aParameterName('ks'), aParameterName('key'))

    expect(design).toEqual(
      arrange({
        gapX: 'key',
        parameters: [parameter('key', '19mm'), parameter('b', 'key + 1mm')],
        children: [slotAtX('k', 'key')],
      }),
    )
  })

  it("rewrites a use in a part's input", () => {
    const design = arrange({
      parameters: [parameter('ks', '19mm')],
      parts: [aBlueprintDesignPart(), partWithInput('p', 'ks * 2')],
    })

    renameParameter(design, aParameterName('ks'), aParameterName('key'))

    expect(design).toEqual(
      arrange({
        parameters: [parameter('key', '19mm')],
        parts: [aBlueprintDesignPart(), partWithInput('p', 'key * 2')],
      }),
    )
  })

  it('renames onto a name an expression uses with no parameter, leaving that expression', () => {
    const design = arrange({ gapX: 'key', parameters: [parameter('ks', '19mm')] })

    renameParameter(design, aParameterName('ks'), aParameterName('key'))

    expect(design).toEqual(arrange({ gapX: 'key', parameters: [parameter('key', '19mm')] }))
  })

  it.each([
    ['just below the length limit', 509, 511],
    ['on the length limit', 510, 512],
  ])('rewrites an expression to %s', (_role, arrangedLength, expectedLength) => {
    const design = arrange({ gapX: usingK(arrangedLength), parameters: [parameter('k', '1mm')] })

    renameParameter(design, aParameterName('k'), aParameterName('kkk'))

    expect(design.meta.gap.x).toBe(`kkk${' '.repeat(expectedLength - 3)}`)
  })

  it('renames only the first of two parameters with the name', () => {
    const design = arrange({ parameters: [parameter('wall', '1mm'), parameter('wall', '5mm')] })

    renameParameter(design, aParameterName('wall'), aParameterName('w'))

    expect(design.parameters).toEqual([parameter('w', '1mm'), parameter('wall', '5mm')])
  })

  it("rewrites a parameter's use of itself with its name", () => {
    const design = arrange({ parameters: [parameter('a', 'a + 1mm')] })

    renameParameter(design, aParameterName('a'), aParameterName('b'))

    expect(design.parameters).toEqual([parameter('b', 'b + 1mm')])
  })
})
