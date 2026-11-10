import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign, aLayout, anId, aSlot } from '@keeb-cad/schema/testing'
import { workersModule } from '@keeb-cad/workers'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { editorModule } from '../editor-module'
import { Selection } from '../selection/selection'
import { applyPanelEdit } from '../testing/apply-panel-edit'
import { SlideOut } from '../slide-out/slide-out'
import { Viewport } from '../viewport/viewport'
import { devtoolsModule } from './devtools-module'
import { DevtoolsPlugin } from './devtools-plugin'
import { devtoolsPluginId } from './plugin-id'
import { inspectables } from './tokens'
import type { EditPayload, PluginHost } from './types'

const ownInspectorId = `${devtoolsPluginId}.services`
const designStoreNode = `${devtoolsPluginId}.design-store`
const slideOutNode = `${devtoolsPluginId}.slide-out`
const selectionNode = `${devtoolsPluginId}.selection`
const viewportNode = `${devtoolsPluginId}.viewport`

type Host = PluginHost['on']
type StatePayload = Parameters<Parameters<Host['getInspectorState']>[0]>[0]

async function arrange() {
  const container = new Container()
    .addModule(designModule)
    .addModule(workersModule)
    .addModule(editorModule)
    .addModule(devtoolsModule)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  return container
}

async function arrangeSelection({ holds, selected }: { holds: string[]; selected: string[] }) {
  const container = await arrange()
  const design = aDesign({
    layout: aLayout({ children: holds.map((id) => aSlot({ id: anId(id) })) }),
  })
  expectOk(container.resolve(DesignStore).replaceDesign({ design, unreadable: [] }))
  const selection = container.resolve(Selection)
  selection.select(selected.map((id) => anId(id)))
  return { selection, inspector: connected(container) }
}

function connected(container: Container) {
  const stateHandlers: Parameters<Host['getInspectorState']>[0][] = []
  const editHandlers: Parameters<Host['editInspectorState']>[0][] = []
  container.resolve(DevtoolsPlugin).setup({
    addInspector: () => {},
    addTimelineLayer: () => {},
    addTimelineEvent: () => {},
    sendInspectorState: () => {},
    selectInspectorNode: () => {},
    now: () => 0,
    on: {
      getInspectorTree: () => {},
      getInspectorState: (handler) => stateHandlers.push(handler),
      editInspectorState: (handler) => editHandlers.push(handler),
    },
  })
  return {
    rows(nodeId: string): StatePayload['state'] {
      const payload: StatePayload = {
        app: createApp({}),
        inspectorId: ownInspectorId,
        nodeId,
        state: {},
      }
      for (const handler of stateHandlers) handler(payload)
      return payload.state
    },
    edit(nodeId: string, key: string, value: unknown): void {
      this.editAt(nodeId, [key], { value })
    },
    // As the panel sends it: a list item or an object member by its full path.
    editAt(nodeId: string, path: string[], state: EditPayload['state']): void {
      const payload: EditPayload = {
        app: createApp({}),
        inspectorId: ownInspectorId,
        nodeId,
        path,
        type: typeof state.value,
        state,
        set: (target: Record<string, unknown>) => {
          applyPanelEdit(target, payload.path, state)
        },
      }
      for (const handler of editHandlers) handler(payload)
    },
  }
}

describe('devtoolsModule', () => {
  it("gives every entry an id starting with the plugin's id", async () => {
    const container = await arrange()

    const ids = container.resolve(inspectables).map(({ id }) => id)

    expect({
      hasEntries: ids.length > 0,
      elsewhere: ids.filter((id) => !id.startsWith(devtoolsPluginId)),
    }).toEqual({ hasEntries: true, elsewhere: [] })
  })

  it('keeps the design store read-only: rows not editable, an edit changes nothing', async () => {
    const container = await arrange()
    const store = container.resolve(DesignStore)
    expectOk(store.replaceDesign({ design: aDesign(), unreadable: [] }))
    const inspector = connected(container)
    const before = store.current

    inspector.edit(designStoreNode, 'seq', 99)

    expect({
      rows: inspector.rows(designStoreNode),
      committed: store.current.getOrUndefined(),
    }).toEqual({
      rows: {
        fields: [
          expect.objectContaining({ key: 'seq', editable: false }),
          expect.objectContaining({ key: 'revision', editable: false }),
          expect.objectContaining({ key: 'design', editable: false }),
          expect.objectContaining({ key: 'routing', editable: false }),
          expect.objectContaining({ key: 'fingerprints', editable: false }),
        ],
      },
      committed: before.getOrUndefined(),
    })
  })

  const closed = (): void => {}
  const opened = (slideOut: SlideOut): void => {
    slideOut.open()
  }

  it.each<[string, (slideOut: SlideOut) => void, unknown, boolean]>([
    ['opens a closed slide-out', closed, true, true],
    ['closes an open slide-out', opened, false, false],
    ['keeps a closed slide-out closed on a value the schema refuses', closed, 'yes', false],
  ])('%s', async (_role, arrangeSlideOut, value, expected) => {
    const container = await arrange()
    const slideOut = container.resolve(SlideOut)
    arrangeSlideOut(slideOut)
    const inspector = connected(container)

    inspector.edit(slideOutNode, 'isOpen', value)

    expect(slideOut.isOpen).toBe(expected)
  })

  it.each<[string, unknown, string[]]>([
    ['selects an id the design holds', ['a'], ['a']],
    ['keeps only the ids the design holds', ['a', 'gone'], ['a']],
    ['leaves the selection unchanged on a value that is no array', 'a', ['b']],
  ])('%s', async (_role, value, expected) => {
    const { selection, inspector } = await arrangeSelection({ holds: ['a', 'b'], selected: ['b'] })

    inspector.edit(selectionNode, 'ids', value)

    expect(selection.ids).toEqual(expected)
  })

  it.each<[string, string[], EditPayload['state'], string[]]>([
    ['replaces a list item with an id the design holds', ['ids', '0'], { value: 'a' }, ['a']],
    ['drops a list item set to an id the design lacks', ['ids', '0'], { value: 'gone' }, []],
    ['adds a list item', ['ids', '1'], { value: 'a', newKey: '1' }, ['b', 'a']],
    ['removes a list item', ['ids', '0'], { value: undefined, remove: true }, []],
    ['leaves the selection unchanged on an item that is no id', ['ids', '0'], { value: 7 }, ['b']],
  ])('%s, edited as the panel does', async (_role, path, state, expected) => {
    const { selection, inspector } = await arrangeSelection({ holds: ['a', 'b'], selected: ['b'] })

    inspector.editAt(selectionNode, path, state)

    expect(selection.ids).toEqual(expected)
  })

  it.each<[string, EditPayload['state'], { x: number; y: number }]>([
    ['sets the centre x as the panel does', { value: 3 }, { x: 3, y: -2 }],
    ['keeps the centre on an x that is no number', { value: 'east' }, { x: 5, y: -2 }],
  ])('%s', async (_role, state, expected) => {
    const container = await arrange()
    container.resolve(Viewport).setCentre({ x: 5, y: -2 })
    const inspector = connected(container)

    inspector.editAt(viewportNode, ['centre', 'x'], state)

    expect(container.resolve(Viewport).centre).toEqual(expected)
  })

  it.each<[string, unknown, number]>([
    ['keeps the zoom on a negative zoom', -1, 2],
    ['keeps the zoom on a zero zoom', 0, 2],
    ['sets a positive zoom', 1, 1],
  ])('%s', async (_role, value, expected) => {
    const container = await arrange()
    container.resolve(Viewport).setZoom(2)
    const inspector = connected(container)

    inspector.edit(viewportNode, 'zoom', value)

    expect(container.resolve(Viewport).zoom).toBe(expected)
  })

  it('sets the centre', async () => {
    const container = await arrange()
    const inspector = connected(container)

    inspector.edit(viewportNode, 'centre', { x: 3, y: -2 })

    expect(container.resolve(Viewport).centre).toEqual({ x: 3, y: -2 })
  })
})
