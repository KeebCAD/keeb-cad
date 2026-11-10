import { designModule, DesignStore } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import { idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designActionsModule } from './design-actions-module'
import { NewDesign } from './new-design'

async function arrange() {
  const container = new Container().addModule(designModule).addModule(designActionsModule)
  await container.autoLoad()
  return { newDesign: container.resolve(NewDesign), store: container.resolve(DesignStore) }
}

const isId = (value: unknown) => v.is(idSchema, value)

describe('NewDesign', () => {
  it('leaves the store holding a fresh split, reversible design with the key part pinned, an empty free root and no derived files', async () => {
    const { newDesign, store } = await arrange()

    expectOk(await newDesign.apply({}))

    const current = store.current.getOrUndefined()
    expect(current).toMatchObject({
      design: {
        meta: {
          id: expect.toSatisfy(isId),
          name: 'Untitled design',
          form: { type: 'split', board: 'reversible' },
          defaultPart: 'key',
          gap: { x: '1mm', y: '1mm' },
        },
        libraryVersions: [{ id: 'lib:blueprint/choc-key', version: 1 }],
        parts: [{ type: 'blueprint', id: 'key', blueprint: 'lib:blueprint/choc-key', inputs: {} }],
        layout: { id: expect.toSatisfy(isId), arrangement: 'free', children: [] },
      },
      routing: { revision: current?.revision },
      fingerprints: { revision: current?.revision, fingerprints: [] },
    })
  })
})
