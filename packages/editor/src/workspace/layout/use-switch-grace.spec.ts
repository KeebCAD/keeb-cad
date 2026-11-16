import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign } from '@keeb-cad/schema/testing'
import { workersModule } from '@keeb-cad/workers'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createApp, nextTick } from 'vue'

import { DesignLocation } from '../../router/design-location'
import { SwitchGrace } from './switch-grace'
import { useSwitchGrace } from './use-switch-grace'

// The spine's Switch grace, about 200 ms.
const EXPECTED_GRACE_MS = 200
const PAST_GRACE_MS = EXPECTED_GRACE_MS + 1

// On Outline with a design open and no Layout set posted; time is frozen.
async function arrange() {
  const container = new Container().addModule(designModule).addModule(workersModule)
  container.register(DesignLocation).useClass(DesignLocation)
  container.register(SwitchGrace).useClass(SwitchGrace)
  onTestFinished(async () => {
    await container.dispose()
    history.replaceState(null, '', location.pathname + location.search)
  })
  await container.autoLoad()
  expectOk(container.resolve(DesignStore).replaceDesign({ design: aDesign(), unreadable: [] }))
  const { router } = container.resolve(DesignLocation)
  await router.push('/design/corne/outline')
  vi.useFakeTimers()
  onTestFinished(() => {
    vi.useRealTimers()
  })
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  return {
    grayed: app.runWithContext(() => useSwitchGrace()),
    switchToLayoutAndWait: async () => {
      await router.push('/design/corne/layout')
      vi.advanceTimersByTime(PAST_GRACE_MS)
      await nextTick()
    },
  }
}

describe('useSwitchGrace', () => {
  it('is false while no switch has outrun its grace', async () => {
    const { grayed } = await arrange()

    expect(grayed.value).toBe(false)
  })

  it('is true once a switch to Layout outruns its grace with no set', async () => {
    const { grayed, switchToLayoutAndWait } = await arrange()

    await switchToLayoutAndWait()

    expect(grayed.value).toBe(true)
  })
})
