import { NewDesign } from '@keeb-cad/commands'
import { DesignStore } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import { readBundle, writeBundle } from '@keeb-cad/storage'
import { describe, expect, it } from 'vitest'

import { mainModules } from './main-modules'

async function arrange(): Promise<DesignStore> {
  const container = new Container()
  for (const module of mainModules) container.addModule(module)
  await container.autoLoad()
  return container.resolve(DesignStore)
}

function writeCurrent(store: DesignStore) {
  const current = store.current
  if (current.isNone()) throw new Error('Expected a committed design.')
  return writeBundle(current.value)
}

describe('the design bundle round trip', () => {
  it("reads a new design's three texts back whole, emptying nothing, and writes the same texts again", async () => {
    const store = await arrange()
    expectOk(await store.run(NewDesign, {}))
    const written = writeCurrent(store)

    const read = readBundle(written)
    expectOk(read)
    const replaced = store.replaceDesign(read.value)

    expectOk(replaced)
    expect(replaced.value).toEqual({ emptied: [] })
    expect(writeCurrent(store)).toEqual(written)
  })
})
