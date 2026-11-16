import { NewDesign } from '@keeb-cad/commands'
import { Container } from '@keeb-cad/di'
import type { Derivations } from '@keeb-cad/model/worker'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { aDesign, aLayout, aLayoutRow, anId, aSlot } from '@keeb-cad/schema/testing'
import { readBundle, writeBundle } from '@keeb-cad/storage'
import { describe, expect, it } from 'vitest'

import { arrangePlacements } from './testing/arrange-placements'
import { arrangeStore } from './testing/arrange-store'
import { committed } from './testing/committed'

const DIGITS = 9

function rowOf(derivations: Derivations, id: string) {
  const { ids, rows } = derivations.placements.value
  return rows[ids.indexOf(id)]
}

describe('blueprint inputs through mainModules', () => {
  it.each([
    [
      'an input choc-key does not declare',
      { colour: 'red' },
      `The slot "s" sets "colour", an input its part's blueprint doesn't declare.`,
    ],
    [
      'a size outside its options',
      { size: '2u' },
      `The slot "s" sets "size" to "2u", which isn't one of 1u, 1.5u.`,
    ],
  ])(
    'refuses layout.addSlot given %s, leaving the design as it was',
    async (_role, inputs, expectedMessage) => {
      const store = await arrangeStore(new Container())
      expectOk(await store.run(NewDesign, {}))
      const before = committed(store)

      const result = store.runById('layout.addSlot', { id: 's', inputs })

      expectErr(result)
      expect({ rejection: result.error, current: committed(store) }).toEqual({
        rejection: { kind: 'blueprint-input-invalid', ids: ['s'], message: expectedMessage },
        current: before,
      })
    },
  )

  it('commits an edit elsewhere on a loaded design whose slot already breaks an input, and stands that slot in', async () => {
    const store = await arrangeStore(new Container())
    const derivationsOf = await arrangePlacements(new Container())
    const faulty = aSlot({ id: anId('s'), inputs: { size: '2u' } })
    expectOk(
      store.replaceDesign({
        design: aDesign({ layout: aLayout({ children: [faulty] }) }),
        unreadable: [],
      }),
    )
    const before = committed(store).seq

    expectOk(store.runById('layout.addSlot', { id: 't' }))
    const derivations = await derivationsOf(committed(store))

    expect({
      seq: committed(store).seq,
      violations: derivations.violations.value,
      row: rowOf(derivations, 'left/s'),
    }).toEqual({
      seq: before + 1,
      violations: [
        {
          kind: 'blueprint-input-invalid',
          severity: 'error',
          ids: ['s'],
          message: `The slot "s" sets "size" to "2u", which isn't one of 1u, 1.5u.`,
          fixes: [],
        },
      ],
      row: aLayoutRow({
        part: derivations.parts.value.output.ids.indexOf('stand-in'),
        fit: 'stand-in',
      }),
    })
  })

  it('places a slot turned 90 deg about a pivot the same after a bundle round trip', async () => {
    const store = await arrangeStore(new Container())
    const derivationsOf = await arrangePlacements(new Container())
    expectOk(await store.run(NewDesign, {}))
    expectOk(
      store.runById('layout.addSlot', {
        id: 's',
        offset: { rotation: '90deg', pivot: { x: '9mm', y: '0mm' } },
      }),
    )
    const expectedFrame = {
      x: expect.closeTo(9, DIGITS),
      y: expect.closeTo(-9, DIGITS),
      rot: expect.closeTo(90, DIGITS),
      mirrored: false,
    }
    const before = rowOf(await derivationsOf(committed(store)), 'left/s')?.frame

    const read = readBundle(writeBundle(committed(store)))
    expectOk(read)
    expectOk(store.replaceDesign(read.value))
    const after = rowOf(await derivationsOf(committed(store)), 'left/s')?.frame

    expect({ before, after }).toEqual({ before: expectedFrame, after: expectedFrame })
  })
})
