import { designModule, DesignStore } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { Result } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import { idSchema, type MigratedBundle } from '@keeb-cad/schema'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designActionsModule } from './design-actions-module'
import { NewDesign } from './new-design'

function arrange() {
  const handed: MigratedBundle[] = []
  const store = {
    replaceDesign(bundle: MigratedBundle) {
      handed.push(bundle)
      return Result.ok({ emptied: [] })
    },
  }
  const container = new Container().addModule(designModule).addModule(designActionsModule)
  container.override(DesignStore).useValue(store as unknown as DesignStore)
  return { newDesign: container.resolve(NewDesign), handed }
}

const isId = (value: unknown) => v.is(idSchema, value)

describe('NewDesign', () => {
  it('hands replaceDesign a fresh split, reversible design with an empty free root and no derived files', async () => {
    const { newDesign, handed } = arrange()

    expectOk(await newDesign.apply({}))

    expect(handed).toEqual([
      {
        design: {
          meta: {
            id: expect.toSatisfy(isId),
            name: 'Untitled design',
            form: { type: 'split', board: 'reversible' },
          },
          layout: { id: expect.toSatisfy(isId), arrangement: 'free', children: [] },
        },
        unreadable: [],
      },
    ])
  })
})
