import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { Design, Mutable, Node, Offset, Parameter } from '@keeb-cad/schema'
import {
  aDelta,
  aDesign,
  aFreeGroup,
  aGap,
  aLength,
  aMeta,
  anAngle,
  anExpression,
  anOffset,
  aParameter,
  aParameterName,
  aVec2,
  aLayout,
  anId,
  aPartRef,
  aSideId,
  aSidePartOverride,
  aSlot,
  aSlotAnchor,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { checkStructure } from './check-structure'
import { addNode } from './layout-editing/add-node'
import { setParameter } from './parameters/set-parameter'
import { dependencyCycleMessage } from './violations/dependency-cycle-message'
import { divisionByZeroMessage } from './violations/division-by-zero-message'
import { negativeLengthMessage } from './violations/negative-length-message'
import { unitMismatchMessage } from './violations/unit-mismatch-message'
import { unresolvableReferenceMessage } from './violations/unresolvable-reference-message'

const onSlots = (...slots: Parameters<typeof aSlot>[0][]) =>
  aDesign({ layout: aLayout({ children: slots.map((slot) => aSlot(slot)) }) })

const inRoot = (...children: Node[]) => aDesign({ layout: aLayout({ children }) })

const slot = (id: string, anchoredTo?: string) =>
  aSlot({
    id: anId(id),
    ...(anchoredTo === undefined ? {} : { anchor: aSlotAnchor({ ref: anId(anchoredTo) }) }),
  })

const unknownTarget = (id: string) => ({
  kind: 'unknown-target',
  ids: [id],
  message: `The design has nothing of the right kind with the id "${id}".`,
})

const cycleRejection = (...ids: string[]) => ({
  kind: 'dependency-cycle',
  ids,
  message: dependencyCycleMessage(
    ids.map((id) => anId(id)),
    'nodes',
  ),
})

describe('checkStructure', () => {
  it.each([
    ['a missing id', aPartRef('missing'), 'missing'],
    ["a slot's id, which is not a part", aPartRef('other'), 'other'],
  ])('refuses a slot part naming %s, naming it', (_role, part, expectedId) => {
    const previous = onSlots({ id: anId('other') })
    const next = onSlots({ id: anId('other') }, { id: anId('a'), part })

    const result = checkStructure(previous, next)

    expectErr(result)
    expect(result.error).toEqual(unknownTarget(expectedId))
  })

  it('lets an edit keep a reference that was already dangling before it', () => {
    const previous = onSlots({ id: anId('a'), part: aPartRef('missing') })
    const next = onSlots({ id: anId('a'), part: aPartRef('missing') }, { id: anId('b') })

    expectOk(checkStructure(previous, next))
  })

  describe('an override target', () => {
    const dangling = () => aSidePartOverride({ target: aSideId('right/zz'), part: null })
    const withOverrides = (slots: string[], overrides = [dangling()]) =>
      aDesign({
        layout: aLayout({ children: slots.map((id) => aSlot({ id: anId(id) })) }),
        overrides,
      })

    it('lets an edit keep an override a loaded file already left dangling', () => {
      expectOk(checkStructure(withOverrides(['a']), withOverrides(['a', 'c'])))
    })

    it('refuses an edit that adds an override on a slot the design lacks, naming its target', () => {
      const result = checkStructure(withOverrides(['a'], []), withOverrides(['a']))

      expectErr(result)
      expect(result.error).toEqual(unknownTarget('right/zz'))
    })

    it('passes an override on a slot the design has', () => {
      const removal = aSidePartOverride({ target: aSideId('left/a'), part: null })

      expectOk(checkStructure(withOverrides(['a'], []), withOverrides(['a'], [removal])))
    })
  })

  it('passes a library target the design does not hold', () => {
    const next = onSlots({ id: anId('a'), part: aPartRef('lib:part/unknown') })

    expectOk(checkStructure(aDesign(), next))
  })

  it("names the removed part when a slot's part is deleted", () => {
    const previous = onSlots({ id: anId('a'), part: aPartRef('key') })
    const next = {
      ...previous,
      meta: { ...previous.meta, defaultPart: aPartRef('lib:part/x') },
      parts: [],
    }

    const result = checkStructure(previous, next)

    expectErr(result)
    expect(result.error).toEqual(unknownTarget('key'))
  })

  describe('node references', () => {
    it.each([
      ['a missing id', slot('n', 'missing'), 'missing'],
      ['a group through a slot anchor', slot('n', 'g'), 'g'],
    ])(
      'refuses an added anchor naming %s with unknown-target, naming it',
      (_role, n, expectedId) => {
        const group = aFreeGroup({ id: anId('g') })

        const result = checkStructure(inRoot(group), inRoot(group, n))

        expectErr(result)
        expect(result.error).toEqual(unknownTarget(expectedId))
      },
    )

    it('passes an added anchor naming a slot', () => {
      expectOk(checkStructure(inRoot(slot('a')), inRoot(slot('a'), slot('n', 'a'))))
    })

    it('lets an edit keep an anchor that was already dangling', () => {
      const previous = inRoot(slot('n', 'missing'))

      expectOk(checkStructure(previous, inRoot(slot('n', 'missing'), slot('b'))))
    })
  })

  describe('cycles', () => {
    it('refuses a cycle the edit closes, listed from the node whose dependency changed', () => {
      const previous = inRoot(slot('a', 'b'), slot('b', 'c'), slot('c'))
      const next = inRoot(slot('a', 'b'), slot('b', 'c'), slot('c', 'a'))

      const result = checkStructure(previous, next)

      expectErr(result)
      expect(result.error).toEqual(cycleRejection('c', 'a', 'b'))
    })

    it('lets an edit elsewhere keep a cycle the design already held', () => {
      const looped = [slot('a', 'b'), slot('b', 'c'), slot('c', 'a')]

      expectOk(checkStructure(inRoot(...looped), inRoot(...looped, slot('d'))))
    })

    it('names a dangling anchor before a cycle when one edit makes both', () => {
      const previous = inRoot(slot('a', 'b'), slot('b'), slot('n'))
      const next = inRoot(slot('a', 'b'), slot('b', 'a'), slot('n', 'missing'))

      const result = checkStructure(previous, next)

      expectErr(result)
      expect(result.error).toEqual(unknownTarget('missing'))
    })

    it('of two new cycles, refuses the one whose changed member is lowest by compareCodeUnits', () => {
      const previous = inRoot(slot('p'), slot('q'), slot('r', 'p'), slot('s', 'q'))
      const next = inRoot(slot('p', 'r'), slot('q', 's'), slot('r', 'p'), slot('s', 'q'))

      const result = checkStructure(previous, next)

      expectErr(result)
      expect(result.error).toEqual(cycleRejection('p', 'r'))
    })
  })

  describe('expressions', () => {
    const designId = anId('corne')
    const parameter = (name: string, value: string) =>
      aParameter({ name: aParameterName(name), value: anExpression(value) })
    const atX = (x: string) => anOffset({ position: aVec2({ x: aDelta(x) }) })

    // gap.x is gapX; slot k, when given, has the offset k.
    function arrange({
      parameters = [],
      gapX = '1mm',
      k,
    }: { parameters?: Parameter[]; gapX?: string; k?: Offset } = {}) {
      return aDesign({
        meta: aMeta({ id: designId, gap: aGap({ x: aLength(gapX) }) }),
        parameters,
        layout: aLayout({ children: k === undefined ? [] : [aSlot({ id: anId('k'), offset: k })] }),
      })
    }

    function edited(previous: Design, edit: (draft: Mutable<Design>) => unknown): Design {
      const next = structuredClone(previous)
      edit(next)
      return next
    }

    const withParameter = (name: string, value: string) => (draft: Mutable<Design>) => {
      setParameter(draft, parameter(name, value))
    }
    const withSlot = (offset: Offset) => (draft: Mutable<Design>) =>
      addNode(draft, { id: anId('s'), offset }, {})

    const rejection = (kind: string, id: string, message: string) => ({ kind, ids: [id], message })

    it.each([
      ['a negative parameter no field uses', 'wall', '-1mm'],
      ['a unitless parameter', 'n', '2'],
    ])('accepts %s', (_role, name, value) => {
      const previous = arrange()

      expectOk(checkStructure(previous, edited(previous, withParameter(name, value))))
    })

    it('refuses a parameter that divides by zero, naming it', () => {
      const previous = arrange()
      const ids = [aParameterName('wall')]

      const result = checkStructure(previous, edited(previous, withParameter('wall', '1mm / 0')))

      expectErr(result)
      expect(result.error).toEqual(
        rejection('division-by-zero', 'wall', divisionByZeroMessage(ids)),
      )
    })

    it.each([
      ['a unitless offset x', [], atX('2'), 'unit-mismatch', unitMismatchMessage],
      [
        'an angle in a length field',
        [parameter('a', '5deg')],
        atX('a'),
        'unit-mismatch',
        unitMismatchMessage,
      ],
      [
        'a length in an angle field',
        [parameter('a', '5mm')],
        anOffset({ rotation: anAngle('a') }),
        'unit-mismatch',
        unitMismatchMessage,
      ],
      [
        'an offset x that divides by zero',
        [],
        atX('1mm / 0'),
        'division-by-zero',
        divisionByZeroMessage,
      ],
    ])(
      'refuses adding a slot with %s, naming the slot',
      (_role, parameters, offset, kind, message) => {
        const previous = arrange({ parameters })

        const result = checkStructure(previous, edited(previous, withSlot(offset)))

        expectErr(result)
        expect(result.error).toEqual(rejection(kind, 's', message([anId('s')])))
      },
    )

    it('refuses adding a slot whose offset names no parameter, naming the slot and the name', () => {
      const previous = arrange()
      const ids = [anId('s')]

      const result = checkStructure(previous, edited(previous, withSlot(atX('nope'))))

      expectErr(result)
      expect(result.error).toEqual(
        rejection(
          'unresolvable-reference',
          's',
          unresolvableReferenceMessage({ parameter: 'nope' }, ids),
        ),
      )
    })

    it('accepts adding a slot with a negative delta', () => {
      const previous = arrange()

      expectOk(checkStructure(previous, edited(previous, withSlot(atX('-5mm')))))
    })

    describe('a parameter edit under the gap that reads it', () => {
      const file = () => arrange({ gapX: 'wall', parameters: [parameter('wall', '1mm')] })

      it.each([
        ['far below 0', '-1mm'],
        ['just below 0', '-0.001mm'],
      ])('refuses a length %s with negative-length, naming the design', (_role, value) => {
        const previous = file()

        const result = checkStructure(previous, edited(previous, withParameter('wall', value)))

        expectErr(result)
        expect(result.error).toEqual(
          rejection('negative-length', designId, negativeLengthMessage([designId])),
        )
      })

      it.each([
        ['on 0', '0mm'],
        ['just above 0', '0.001mm'],
      ])('accepts a length %s', (_role, value) => {
        const previous = file()

        expectOk(checkStructure(previous, edited(previous, withParameter('wall', value))))
      })
    })

    it('names the first item the edit breaks in design order, meta before a node', () => {
      const previous = arrange({
        gapX: 'wall',
        parameters: [parameter('wall', '1mm')],
        k: atX('wall'),
      })

      const result = checkStructure(previous, edited(previous, withParameter('wall', '1deg')))

      expectErr(result)
      expect(result.error).toEqual(
        rejection('unit-mismatch', designId, unitMismatchMessage([designId])),
      )
    })

    it('refuses a parameter loop the edit closes, listed from the changed parameter', () => {
      const previous = arrange({ parameters: [parameter('a', '1mm'), parameter('b', 'a')] })
      const ids = [aParameterName('a'), aParameterName('b')]

      const result = checkStructure(previous, edited(previous, withParameter('a', 'b + 1mm')))

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'dependency-cycle',
        ids,
        message: dependencyCycleMessage(ids, 'parameters'),
      })
    })

    describe('in a file whose loop a, b, c gains a second way round through d', () => {
      const file = () =>
        arrange({
          parameters: [
            parameter('e', '1mm'),
            parameter('a', 'b'),
            parameter('b', 'c + d'),
            parameter('c', 'a'),
            parameter('d', 'c'),
          ],
        })

      it.each([
        ['an edit outside the loop', 'e', 'd'],
        ['reordering what a member already reads', 'b', 'd + c'],
      ])('accepts %s, which closes no loop', (_role, name, value) => {
        const previous = file()

        expectOk(checkStructure(previous, edited(previous, withParameter(name, value))))
      })
    })

    it('lets an edit keep a fault the file already held', () => {
      const previous = arrange({ gapX: 'nope' })

      expectOk(checkStructure(previous, edited(previous, withSlot(atX('1mm')))))
    })

    it('refuses a second fault the edit adds to an item that already had one', () => {
      const previous = arrange({
        parameters: [parameter('wall', '1mm')],
        k: anOffset({ position: aVec2({ x: aDelta('nope'), y: aDelta('wall') }) }),
      })

      const result = checkStructure(previous, edited(previous, withParameter('wall', '1deg')))

      expectErr(result)
      expect(result.error).toEqual(
        rejection('unit-mismatch', 'k', unitMismatchMessage([anId('k')])),
      )
    })
  })
})
