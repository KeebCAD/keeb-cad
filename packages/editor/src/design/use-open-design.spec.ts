import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { expectOk } from '@keeb-cad/result/testing'
import type { Design } from '@keeb-cad/schema'
import { aDesign, aMeta, anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'

import { useOpenDesign } from './use-open-design'

async function arrange() {
  const container = new Container().addModule(designModule)
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  const commit = (design: Design) => expectOk(store.replaceDesign({ design, unreadable: [] }))
  return { app, commit }
}

describe('useOpenDesign', () => {
  it('holds undefined while no design is open', async () => {
    const { app } = await arrange()

    const openDesign = app.runWithContext(() => useOpenDesign())

    expect(openDesign.value).toBeUndefined()
  })

  it('holds the committed design', async () => {
    const { app, commit } = await arrange()
    const design = aDesign()
    const openDesign = app.runWithContext(() => useOpenDesign())

    commit(design)

    expect(openDesign.value).toEqual(design)
  })

  it('moves from the first design to the later one on a second commit', async () => {
    const { app, commit } = await arrange()
    const first = aDesign({ meta: aMeta({ id: anId('lily-58'), name: 'Lily58' }) })
    const second = aDesign({ meta: aMeta({ id: anId('corne'), name: 'Corne' }) })
    commit(first)
    const openDesign = app.runWithContext(() => useOpenDesign())
    const before = openDesign.value

    commit(second)

    expect([before, openDesign.value]).toEqual([first, second])
  })
})
