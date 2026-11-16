import { DesignStore, designModule } from '@keeb-cad/design'
import { Container, InjectorToken } from '@keeb-cad/di'
import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import { Option } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import { aFreeGroup, anId, aPlacementId, aSlot } from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createApp } from 'vue'

import { designOf } from '../testing/designs'
import { HoveredNode } from './hovered-node'
import { useHoveredNode } from './use-hovered-node'

// How long a hover outlives its source, so the pointer can cross from a key to its group's tab.
const EXPECTED_GRACE_MS = 300

// A split form, as aMeta builds by default, whose authored side is left.
async function arrange() {
  const container = new Container().addModule(designModule)
  container.register(HoveredNode).useClass(HoveredNode)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  expectOk(
    container.resolve(DesignStore).replaceDesign({
      design: designOf([aFreeGroup({ id: anId('g'), children: [aSlot({ id: anId('a') })] })]),
      unreadable: [],
    }),
  )
  const app = createApp({})
  provideInjectorOnApp(app, container.resolve(InjectorToken))
  return {
    hover: app.runWithContext(() => useHoveredNode()),
    hovered: container.resolve(HoveredNode),
  }
}

describe('useHoveredNode', () => {
  it('hovers the placement it points at', async () => {
    const { hover, hovered } = await arrange()

    hover.pointAt(aPlacementId('left/a'))

    expect(hovered.id).toEqual(Option.some('left/a'))
  })

  it('hovers nothing once the grace after a leave has passed', async () => {
    vi.useFakeTimers()
    onTestFinished(() => {
      vi.useRealTimers()
    })
    const { hover, hovered } = await arrange()
    hover.pointAt(aPlacementId('left/a'))

    hover.leave()
    vi.advanceTimersByTime(EXPECTED_GRACE_MS + 1)

    expect(hovered.id).toEqual(Option.none())
  })

  it("hovers a Tree group on the split form's authored side", async () => {
    const { hover, hovered } = await arrange()

    hover.pointAtTreeGroup('g')

    expect(hovered.id).toEqual(Option.some('left/g'))
  })
})
