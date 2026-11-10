import {
  aBlueprintDesignPart,
  aBlueprintId,
  aChainGroup,
  aDesign,
  aDelta,
  aFreeGroup,
  aLayout,
  aMeta,
  anAngle,
  anId,
  anOffset,
  aPartRef,
  aQuantityInputValue,
  aSlot,
  aVec2,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { walkReferences } from './walk-references'

describe('walkReferences', () => {
  it('lists every declared reference in a design built from every section, by path', () => {
    const design = aDesign({
      meta: aMeta({ defaultPart: aPartRef('key') }),
      parts: [
        aBlueprintDesignPart({
          id: anId('key'),
          blueprint: aBlueprintId('lib:blueprint/choc-key'),
          inputs: { size: '1u', travel: aQuantityInputValue('3mm'), hotswap: true },
        }),
      ],
      layout: aLayout({
        id: anId('root'),
        offset: anOffset({ rotation: anAngle('5deg') }),
        children: [
          aChainGroup({
            id: anId('column'),
            defaultPart: aPartRef('lib:part/choc'),
            offset: anOffset({ position: aVec2({ x: aDelta('1mm') }) }),
            children: [
              aSlot({ id: anId('home'), part: aPartRef('key'), inputs: { size: '1.5u' } }),
              aSlot({ id: anId('top') }),
            ],
          }),
          aFreeGroup({ id: anId('thumbs'), children: [aSlot({ part: aPartRef('lib:part/x') })] }),
        ],
      }),
    })

    expect([...walkReferences(design)]).toEqual([
      { path: ['meta', 'defaultPart'], kind: 'design-part', target: 'key' },
      {
        path: ['parts', 0, 'blueprint'],
        kind: 'library-blueprint',
        target: 'lib:blueprint/choc-key',
      },
      {
        path: ['layout', 'children', 0, 'defaultPart'],
        kind: 'library-part',
        target: 'lib:part/choc',
      },
      {
        path: ['layout', 'children', 0, 'children', 0, 'part'],
        kind: 'design-part',
        target: 'key',
      },
      {
        path: ['layout', 'children', 1, 'children', 0, 'part'],
        kind: 'library-part',
        target: 'lib:part/x',
      },
    ])
  })

  it('finds no reference in literal expressions', () => {
    const design = aDesign({
      meta: aMeta({ defaultPart: aPartRef('lib:part/x') }),
      parts: [],
      layout: aLayout({ offset: anOffset({ pivot: aVec2({ y: aDelta('-3mm') }) }) }),
    })

    expect([...walkReferences(design)]).toEqual([
      { path: ['meta', 'defaultPart'], kind: 'library-part', target: 'lib:part/x' },
    ])
  })
})
