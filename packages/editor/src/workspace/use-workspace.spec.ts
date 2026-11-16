import { designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { Option } from '@keeb-cad/result'
import { workersModule } from '@keeb-cad/workers'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { Invoke } from '../invoke/invoke'
import { registerUiAction } from '../ui-actions/register-ui-action'
import { DesignLocation } from '../router/design-location'
import { nextFrames } from '../testing/next-frames'
import { showWorkspace } from './show-workspace'
import { useWorkspace } from './use-workspace'

const AT_LAYOUT = '/design/corne/layout'

async function arrange() {
  const container = new Container().addModule(designModule).addModule(workersModule)
  container.register(DesignLocation).useClass(DesignLocation)
  container.register(Invoke).useClass(Invoke)
  for (const handle of Object.values(showWorkspace)) registerUiAction(container, handle)
  onTestFinished(async () => {
    await container.dispose()
    history.replaceState(null, '', location.pathname + location.search)
  })
  await container.autoLoad()
  const designLocation = container.resolve(DesignLocation)
  await designLocation.router.push(AT_LAYOUT)
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  return { designLocation, workspace: app.runWithContext(() => useWorkspace()) }
}

describe('useWorkspace', () => {
  it("holds the location's workspace", async () => {
    const { workspace } = await arrange()

    expect(workspace.workspace.value).toBe('layout')
  })

  it('moves the location to a workspace it is set to', async () => {
    const { designLocation, workspace } = await arrange()

    workspace.workspace.value = 'outline'

    await expect.poll(() => designLocation.workspace).toEqual(Option.some('outline'))
  })

  it('leaves the location unchanged when set to no workspace', async () => {
    const { designLocation, workspace } = await arrange()

    workspace.workspace.value = 'nope'
    await nextFrames()

    expect(designLocation.workspace).toEqual(Option.some('layout'))
  })

  it('offers one tab per workspace with its label and first hotkey', async () => {
    const { workspace } = await arrange()

    expect(workspace.tabs).toEqual([
      { value: 'layout', label: 'Layout', hotkey: '1' },
      { value: 'outline', label: 'Outline', hotkey: '2' },
      { value: 'pcb', label: 'PCB', hotkey: '3' },
      { value: 'case', label: 'Case', hotkey: '4' },
      { value: 'firmware', label: 'Firmware', hotkey: '5' },
    ])
  })
})
