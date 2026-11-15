import { provideInjectorOnApp } from '@keeb-cad/di/vue'
import type { PlacementId } from '@keeb-cad/schema'
import {
  aFreeGroup,
  aLayoutRow,
  anId,
  aPartsOutput,
  aPlacementId,
  aSlot,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'

import { HoveredNode } from '../../hover/hovered-node'
import { Selection } from '../../selection/selection'
import { designOf, keyAt, layoutOf } from '../../testing/layout-canvas'
import { mountShell } from '../../testing/mount-shell'
import { postLayoutSet } from '../../testing/post-layout-set'
import { usePointedAndSelectedNodes } from './use-pointed-and-selected-nodes'

const PARTS = aPartsOutput({ ids: ['key@a'], rows: [{ w: 18, h: 18 }] })

// Keys a and b and group g placed, on Outline so no canvas points at anything; the hovered and
// selected ids are set as the canvas and the Tree set them.
async function arrange({
  hovered,
  selected,
}: {
  hovered: PlacementId | undefined
  selected: PlacementId[]
}) {
  const design = designOf([
    aSlot({ id: anId('a') }),
    aSlot({ id: anId('b') }),
    aFreeGroup({ id: anId('g') }),
  ])
  const shell = await mountShell({ path: '/design/corne/outline', design, spawn: true })
  const [worker] = shell.spawned
  if (worker === undefined) throw new Error('Expected a spawned worker.')
  const seq = shell.store.current.map(({ seq }) => seq).getOr(-1)
  const layout = layoutOf({ a: keyAt(0), b: keyAt(20), g: aLayoutRow({ kind: 'group', part: -1 }) })
  postLayoutSet(worker, { seq, layout, parts: PARTS })
  if (hovered !== undefined) shell.injector.resolve(HoveredNode).point(hovered, 'canvas')
  shell.injector.resolve(Selection).select(selected)
  const app = createApp({})
  provideInjectorOnApp(app, shell.injector)
  return app.runWithContext(() => usePointedAndSelectedNodes())
}

const a = aPlacementId('left/a')
const b = aPlacementId('left/b')

describe('usePointedAndSelectedNodes', () => {
  it.each([
    ['nothing with neither hovered nor selected', undefined, [], []],
    ['the hovered node', b, [], [b]],
    ['the selected node', undefined, [a], [a]],
    ['a node both hovered and selected once', b, [b], [b]],
    ['a hovered and a selected node in placed order', b, [a], [a, b]],
  ])('holds %s', async (_role, hovered, selected, expected) => {
    const shown = await arrange({ hovered, selected })

    expect(shown.value).toMatchObject(expected.map((key) => ({ key })))
  })
})
