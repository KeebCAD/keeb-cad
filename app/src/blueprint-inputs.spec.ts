import { blueprintWorkerModule, LaneRunner } from '@keeb-cad/blueprint/worker'
import { NewDesign } from '@keeb-cad/commands'
import { type Committed, DesignStore } from '@keeb-cad/design'
import { DesignMirror, DesignMirrorWriter, designWorkerModule } from '@keeb-cad/design/worker'
import { Container } from '@keeb-cad/di'
import { libraryData } from '@keeb-cad/library/worker'
import { createDerivations, type Derivations } from '@keeb-cad/model/worker'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { aDesign, aLayout, aLayoutRow, anId, aSlot } from '@keeb-cad/schema/testing'
import { readBundle, writeBundle } from '@keeb-cad/storage'
import { MemoryBackend, storageBackend } from '@keeb-cad/storage/testing'
import { describe, expect, it } from 'vitest'

import { mainModules } from './main-modules'

const DIGITS = 9

async function arrangeStore(): Promise<DesignStore> {
  const container = new Container()
  for (const module of mainModules) container.addModule(module)
  container.override(storageBackend).useValue(new MemoryBackend())
  await container.autoLoad()
  return container.resolve(DesignStore)
}

// The model worker's derivations, wired by hand on a mirror fed the store's design.
async function arrangeDerivations() {
  const container = new Container().addModule(designWorkerModule).addModule(blueprintWorkerModule)
  await container.autoLoad()
  const runner = container.resolve(LaneRunner)
  runner.useLibrary(libraryData)
  const derivations = createDerivations(container.resolve(DesignMirror), libraryData, runner)
  const writer = container.resolve(DesignMirrorWriter)
  return async ({ design, revision }: Committed): Promise<Derivations> => {
    writer.replace(design, revision)
    await runner.pause(derivations.pins.value)
    return derivations
  }
}

function committed(store: DesignStore): Committed {
  const current = store.current
  if (current.isNone()) throw new Error('Expected a committed design.')
  return current.value
}

function rowOf(derivations: Derivations, id: string) {
  const { ids, rows } = derivations.placements.value
  return rows[ids.indexOf(`left/${id}`)]
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
      const store = await arrangeStore()
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
    const store = await arrangeStore()
    const derivationsOf = await arrangeDerivations()
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
      row: rowOf(derivations, 's'),
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
    const store = await arrangeStore()
    const derivationsOf = await arrangeDerivations()
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
    const before = rowOf(await derivationsOf(committed(store)), 's')?.frame

    const read = readBundle(writeBundle(committed(store)))
    expectOk(read)
    expectOk(store.replaceDesign(read.value))
    const after = rowOf(await derivationsOf(committed(store)), 's')?.frame

    expect({ before, after }).toEqual({ before: expectedFrame, after: expectedFrame })
  })
})
