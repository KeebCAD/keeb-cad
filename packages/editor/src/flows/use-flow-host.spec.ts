import { DesignStore, designModule, registerAction, registerCommand } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign } from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { Invoke } from '../invoke/invoke'
import { TestRenameDesign } from '../testing/test-rename-design'
import { TestRenameFlow } from '../testing/test-rename-flow'
import TestRenameView from '../testing/TestRenameView.vue'
import { TestStoreName } from '../testing/test-store-name'
import { TestStoreNameFlow } from '../testing/test-store-name-flow'
import { Flows } from './flows'
import { registerFlow } from './register-flow'
import { useFlowHost } from './use-flow-host'

async function arrange() {
  const container = new Container().addModule(designModule)
  container.register(Invoke).useClass(Invoke)
  container.register(Flows).useClass(Flows)
  registerCommand(container, TestRenameDesign)
  registerFlow(container, TestRenameFlow)
  registerAction(container, TestStoreName)
  registerFlow(container, TestStoreNameFlow)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  expectOk(container.resolve(DesignStore).replaceDesign({ design: aDesign(), unreadable: [] }))
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  return { app, flows: container.resolve(Flows) }
}

describe('useFlowHost', () => {
  it('holds undefined with no flow open', async () => {
    const { app } = await arrange()

    const host = app.runWithContext(() => useFlowHost())

    expect(host.value).toBeUndefined()
  })

  it("holds the open flow's view and entry when its handle has a view", async () => {
    const { app, flows } = await arrange()
    const host = app.runWithContext(() => useFlowHost())

    const entry = flows.start(TestRenameFlow, { name: 'Kyria' })

    expect(host.value).toEqual({ view: TestRenameView, entry })
  })

  it('holds undefined when the open flow has no view', async () => {
    const { app, flows } = await arrange()
    const host = app.runWithContext(() => useFlowHost())

    flows.start(TestStoreNameFlow, { name: 'Kyria' })

    expect(host.value).toBeUndefined()
  })
})
