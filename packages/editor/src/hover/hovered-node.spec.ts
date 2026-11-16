import { DeleteNode, layoutCommandsModule } from '@keeb-cad/commands'
import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import type { Design, Node } from '@keeb-cad/schema'
import { aFreeGroup, anId, aPlacementId, aSlot } from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { Selection } from '../selection/selection'
import { designOf } from '../testing/designs'
import { HoveredNode } from './hovered-node'

const GRACE_MS = 300

const A = aPlacementId('left/a')
const B = aPlacementId('left/b')
const C = aPlacementId('left/c')
const K = aPlacementId('left/k')
const RIGHT_A = aPlacementId('right/a')

const group = (id: string, children: Node[]) => aFreeGroup({ id: anId(id), children })
const slot = (id: string) => aSlot({ id: anId(id) })

// Column c holds keys a and b.
const columnDesign = () => designOf([group('c', [slot('a'), slot('b')])])

async function arrange(design: Design) {
  const container = new Container().addModule(designModule).addModule(layoutCommandsModule)
  container.register(HoveredNode).useClass(HoveredNode)
  container.register(Selection).useClass(Selection)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  expectOk(store.replaceDesign({ design, unreadable: [] }))
  return {
    store,
    hovered: container.resolve(HoveredNode),
    selection: container.resolve(Selection),
  }
}

function freezeTime() {
  vi.useFakeTimers()
  onTestFinished(() => {
    vi.useRealTimers()
  })
  return (milliseconds: number) => {
    vi.advanceTimersByTime(milliseconds)
  }
}

describe('HoveredNode', () => {
  describe('on the canvas', () => {
    it.each([
      ['still shows it just before the grace ends', GRACE_MS - 1, A],
      ['clears it when the grace ends', GRACE_MS, undefined],
      ['clears it just after the grace ends', GRACE_MS + 1, undefined],
    ])(
      'after the pointer leaves a key for empty space, %s',
      async (_role, milliseconds, expected) => {
        const { hovered } = await arrange(columnDesign())
        hovered.point(A, 'canvas')
        const advance = freezeTime()

        hovered.leave()
        advance(milliseconds)

        expect(hovered.id.getOrUndefined()).toEqual(expected)
      },
    )

    it('keeps the group shown once the pointer reaches its tab within the grace', async () => {
      const { hovered } = await arrange(columnDesign())
      hovered.point(A, 'canvas')
      const advance = freezeTime()

      hovered.leave()
      advance(100)
      hovered.point(C, 'canvas')
      advance(400)

      expect(hovered.id.getOrUndefined()).toEqual(C)
    })

    it("replaces the group at once when the pointer reaches another group's key within the grace", async () => {
      const { hovered } = await arrange(
        designOf([group('c', [slot('a')]), group('d', [slot('k')])]),
      )
      hovered.point(A, 'canvas')
      const advance = freezeTime()

      hovered.leave()
      advance(100)
      hovered.point(K, 'canvas')

      expect(hovered.id.getOrUndefined()).toEqual(K)
    })
  })

  describe('the Tree', () => {
    it.each([
      ['still shows it just before the grace ends', GRACE_MS - 1, C],
      ['clears it when the grace ends', GRACE_MS, undefined],
      ['clears it just after the grace ends', GRACE_MS + 1, undefined],
    ])(
      "after the pointer leaves a group's row and crosses slot rows, %s",
      async (_role, milliseconds, expected) => {
        const { hovered } = await arrange(columnDesign())
        hovered.point(C, 'tree')
        const advance = freezeTime()

        hovered.leave()
        advance(200)
        hovered.leave()
        advance(milliseconds - 200)

        expect(hovered.id.getOrUndefined()).toEqual(expected)
      },
    )

    it('clears the hovered group once the slide-out closes', async () => {
      const { hovered } = await arrange(columnDesign())
      hovered.point(C, 'tree')

      hovered.clearSetBy('tree')

      expect(hovered.id.getOrUndefined()).toBeUndefined()
    })

    it("keeps a key's group shown when the slide-out closes under no Tree hover", async () => {
      const { hovered } = await arrange(columnDesign())
      hovered.point(B, 'canvas')
      const advance = freezeTime()

      hovered.clearSetBy('tree')
      advance(GRACE_MS + 1)

      expect(hovered.id.getOrUndefined()).toEqual(B)
    })

    it('clears a group its row set at once when the slide-out closes within the grace', async () => {
      const { hovered } = await arrange(columnDesign())
      hovered.point(C, 'tree')
      const advance = freezeTime()

      hovered.leave()
      advance(100)
      hovered.clearSetBy('tree')

      expect(hovered.id.getOrUndefined()).toBeUndefined()
    })
  })

  describe('a commit', () => {
    it('drops the selection and the hovered border at once when it deletes their group', async () => {
      const { store, hovered, selection } = await arrange(designOf([group('c', [slot('a')])]))
      hovered.point(RIGHT_A, 'canvas')
      selection.select([RIGHT_A])

      expectOk(store.run(DeleteNode, { ids: [anId('c')] }))

      expect({ selected: selection.ids, hovered: hovered.id.getOrUndefined() }).toEqual({
        selected: [],
        hovered: undefined,
      })
    })

    it('keeps the selection and the hovered border when it deletes another node', async () => {
      const { store, hovered, selection } = await arrange(
        designOf([group('c', [slot('a')]), slot('z')]),
      )
      hovered.point(RIGHT_A, 'canvas')
      selection.select([RIGHT_A])

      expectOk(store.run(DeleteNode, { ids: [anId('z')] }))

      expect({ selected: selection.ids, hovered: hovered.id.getOrUndefined() }).toEqual({
        selected: [RIGHT_A],
        hovered: RIGHT_A,
      })
    })
  })
})
