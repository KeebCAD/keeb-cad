import { designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { aPlacementId } from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { Selection } from './selection'
import { useSelection } from './use-selection'

describe('useSelection', () => {
  it('holds the selected ids', async () => {
    const container = new Container().addModule(designModule)
    container.register(Selection).useClass(Selection)
    onTestFinished(() => container.dispose())
    await container.autoLoad()
    const app = createApp({})
    provideInjectorOnApp(app, container.resolve(InjectorToken))
    const selection = app.runWithContext(() => useSelection())

    selection.select([aPlacementId('left/a')])

    expect(selection.ids.value).toEqual(['left/a'])
  })
})
