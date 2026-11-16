import { NewDesign } from '@keeb-cad/commands'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import { readBundle, writeBundle } from '@keeb-cad/storage'
import { describe, expect, it } from 'vitest'

import { arrangeStore } from './testing/arrange-store'
import { committed } from './testing/committed'

describe('the design bundle round trip', () => {
  it("reads a new design's three texts back whole, emptying nothing, and writes the same texts again", async () => {
    const store = await arrangeStore(new Container())
    expectOk(await store.run(NewDesign, {}))
    const written = writeBundle(committed(store))

    const read = readBundle(written)
    expectOk(read)
    const replaced = store.replaceDesign(read.value)

    expectOk(replaced)
    expect(replaced.value).toEqual({ emptied: [] })
    expect(writeBundle(committed(store))).toEqual(written)
  })
})
