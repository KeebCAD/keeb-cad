import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { expectOk } from '@keeb-cad/result/testing'
import type { Design } from '@keeb-cad/schema'
import { aDesign, aMeta, anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'
import { type App, createApp } from 'vue'

import { useOpenDesign } from './use-open-design'

type Commit = (design: Design) => void

async function arrange(): Promise<{ app: App }>
async function arrange(design: Design): Promise<{ app: App; commit: Commit }>
async function arrange(design?: Design): Promise<{ app: App; commit?: Commit }> {
  const container = new Container().addModule(designModule)
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  if (design === undefined) return { app }
  const commit: Commit = (next) => {
    expectOk(store.replaceDesign({ design: next, unreadable: [] }))
  }
  commit(design)
  return { app, commit }
}

describe('useOpenDesign', () => {
  it('holds undefined while no design is open', async () => {
    const { app } = await arrange()

    const openDesign = app.runWithContext(() => useOpenDesign())

    expect(openDesign.value).toBeUndefined()
  })

  it('holds the committed design', async () => {
    const design = aDesign()
    const { app } = await arrange(design)

    const openDesign = app.runWithContext(() => useOpenDesign())

    expect(openDesign.value).toEqual(design)
  })

  it('moves from the first design to the later one on a second commit', async () => {
    const first = aDesign({ meta: aMeta({ id: anId('lily-58'), name: 'Lily58' }) })
    const second = aDesign({ meta: aMeta({ id: anId('corne'), name: 'Corne' }) })
    const { app, commit } = await arrange(first)
    const openDesign = app.runWithContext(() => useOpenDesign())
    const before = openDesign.value

    commit(second)

    expect([before, openDesign.value]).toEqual([first, second])
  })
})
