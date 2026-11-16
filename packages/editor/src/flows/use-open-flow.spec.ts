import { DesignStore, designModule, registerCommand } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { InvariantError } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign, aMeta } from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { Invoke } from '../invoke/invoke'
import { TestRenameDesign } from '../testing/test-rename-design'
import { TestRenameFlow } from '../testing/test-rename-flow'
import { Flows } from './flows'
import { registerFlow } from './register-flow'
import type { FlowEntry } from './types'
import { useOpenFlow } from './use-open-flow'

const ARRANGED_NAME = 'Corne'
const TAKEN_TEXT = 'That is already its name.'

async function arrange() {
  const container = new Container().addModule(designModule)
  container.register(Invoke).useClass(Invoke)
  container.register(Flows).useClass(Flows)
  registerCommand(container, TestRenameDesign)
  registerFlow(container, TestRenameFlow)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  expectOk(
    container.resolve(DesignStore).replaceDesign({
      design: aDesign({ meta: aMeta({ name: ARRANGED_NAME }) }),
      unreadable: [],
    }),
  )
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  return { app, flows: container.resolve(Flows) }
}

describe('useOpenFlow', () => {
  it("holds the open flow's draft", async () => {
    const { app, flows } = await arrange()
    const entry = flows.start(TestRenameFlow, { name: 'Kyria' })

    const open = app.runWithContext(() => useOpenFlow(entry))

    expect(open.draft.value).toEqual({ name: 'Kyria' })
  })

  it('holds the new draft after an update', async () => {
    const { app, flows } = await arrange()
    const entry = flows.start(TestRenameFlow, { name: 'Kyria' })
    const open = app.runWithContext(() => useOpenFlow(entry))

    open.update({ name: 'Lily58' })

    expect(open.draft.value).toEqual({ name: 'Lily58' })
  })

  it("gives a refused draft's rejection text as its reason", async () => {
    const { app, flows } = await arrange()
    const entry = flows.start(TestRenameFlow, { name: ARRANGED_NAME })

    const open = app.runWithContext(() => useOpenFlow(entry))

    expect(open.reason.value).toBe(TAKEN_TEXT)
  })

  it('throws an InvariantError when its draft is read before the flow opens', async () => {
    const { app } = await arrange()
    const unopened: FlowEntry<typeof TestRenameFlow> = { id: 1, handle: TestRenameFlow }

    const open = app.runWithContext(() => useOpenFlow(unopened))

    expect(() => open.draft.value).toThrow(InvariantError)
  })
})
