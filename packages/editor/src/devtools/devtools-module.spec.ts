import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign } from '@keeb-cad/schema/testing'
import { workersModule } from '@keeb-cad/workers'
import { describe, expect, it, onTestFinished } from 'vitest'
import { createApp } from 'vue'

import { editorModule } from '../editor-module'
import { SlideOut } from '../slide-out/slide-out'
import { devtoolsModule } from './devtools-module'
import { DevtoolsPlugin } from './devtools-plugin'
import { devtoolsPluginId } from './plugin-id'
import { inspectables } from './tokens'
import type { EditPayload, PluginHost } from './types'

const ownInspectorId = `${devtoolsPluginId}.services`
const designStoreNode = `${devtoolsPluginId}.design-store`
const slideOutNode = `${devtoolsPluginId}.slide-out`

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
      const payload: EditPayload = {
        app: createApp({}),
        inspectorId: ownInspectorId,
        nodeId,
        path: [key],
        type: typeof value,
        state: { value },
        set: () => {},
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
})
