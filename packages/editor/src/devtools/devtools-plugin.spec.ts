import {
  type Command,
  type CommandHandle,
  type Committed,
  DesignStore,
  designModule,
  registerCommand,
  type Writable,
} from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { Result } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import type { Design, Rejection } from '@keeb-cad/schema'
import { aDesign } from '@keeb-cad/schema/testing'
import * as v from 'valibot'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createApp, nextTick, shallowRef } from 'vue'

import { Flows } from '../flows/flows'
import { registerFlow } from '../flows/register-flow'
import { Invoke } from '../invoke/invoke'
import { applyPanelEdit } from '../testing/apply-panel-edit'
import { TestRenameDesign } from '../testing/test-rename-design'
import { TestRenameFlow } from '../testing/test-rename-flow'
import { DevtoolsPlugin } from './devtools-plugin'
import { editableField, readOnlyField } from './inspectable-field'
import { stateRefreshDelayMs } from './state-refresh-delay'
import { inspectables } from './tokens'
import type { EditPayload, Inspectable, PluginHost } from './types'

const ownInspectorId = 'keeb-cad.devtools.services'
const otherInspectorId = 'someone-else.inspector'
const invocationsLayer = 'keeb-cad.devtools.invocations'
const commitsLayer = 'keeb-cad.devtools.commits'
const flowsLayer = 'keeb-cad.devtools.flows'
const testNodeId = 'keeb-cad.devtools.test'

type Host = PluginHost['on']
type TreePayload = Parameters<Parameters<Host['getInspectorTree']>[0]>[0]
type StatePayload = Parameters<Parameters<Host['getInspectorState']>[0]>[0]

const renameInputSchema = v.object({ name: v.string() })

class RenameDesign implements Command<v.InferOutput<typeof renameInputSchema>> {
  static readonly kind = 'command'
  static readonly id = 'test.renameDesign'
  static readonly label = 'Rename design'
  static readonly input = renameInputSchema

  available(): Result<void, Rejection> {
    return Result.ok()
  }

  apply(draft: Writable<Design>, input: v.InferOutput<typeof renameInputSchema>): void {
    draft.meta.name = input.name
  }
}

function useFakeTimers(): void {
  vi.useFakeTimers()
  onTestFinished(() => {
    vi.useRealTimers()
  })
}

function fakeHost() {
  const inspectorsAdded: unknown[] = []
  const layersAdded: unknown[] = []
  const timeline: Parameters<PluginHost['addTimelineEvent']>[0][] = []
  const sent: string[] = []
  const selected: [string, string][] = []
  const treeHandlers: Parameters<Host['getInspectorTree']>[0][] = []
  const stateHandlers: Parameters<Host['getInspectorState']>[0][] = []
  const editHandlers: Parameters<Host['editInspectorState']>[0][] = []
  const host: PluginHost = {
    addInspector: (options) => inspectorsAdded.push(options),
    addTimelineLayer: (options) => layersAdded.push(options),
    addTimelineEvent: (options) => timeline.push(options),
    sendInspectorState: (id) => sent.push(id),
    selectInspectorNode: (id, nodeId) => selected.push([id, nodeId]),
    now: () => 0,
    on: {
      getInspectorTree: (handler) => treeHandlers.push(handler),
      getInspectorState: (handler) => stateHandlers.push(handler),
      editInspectorState: (handler) => editHandlers.push(handler),
    },
  }
  return {
    host,
    inspectorsAdded,
    layersAdded,
    timeline,
    sent,
    selected,
    tree(inspectorId = ownInspectorId): TreePayload {
      const payload: TreePayload = { app: createApp({}), inspectorId, filter: '', rootNodes: [] }
      for (const handler of treeHandlers) handler(payload)
      return payload
    },
    state(nodeId: string, inspectorId = ownInspectorId): StatePayload {
      const payload: StatePayload = { app: createApp({}), inspectorId, nodeId, state: {} }
      for (const handler of stateHandlers) handler(payload)
      return payload
    },
    edit(overrides: Partial<EditPayload>): void {
      const payload: EditPayload = {
        app: createApp({}),
        inspectorId: ownInspectorId,
        nodeId: testNodeId,
        type: 'boolean',
        state: { value: true },
        set: (target: Record<string, unknown>) => {
          applyPanelEdit(target, payload.path, payload.state)
        },
        ...overrides,
        // The kit consumes the path it is given, and the table's rows outlive one run.
        path: [...(overrides.path ?? ['open'])],
      }
      for (const handler of editHandlers) handler(payload)
    },
  }
}

function aNestedInspectable(held: {
  items: string[]
  point: { x: number; y: number }
}): Inspectable {
  return {
    id: testNodeId,
    label: 'Test',
    fields: {
      items: editableField({
        schema: v.array(v.string()),
        get: () => held.items,
        set: (value) => {
          held.items = value
        },
      }),
      point: editableField({
        schema: v.strictObject({ x: v.number(), y: v.number() }),
        get: () => held.point,
        set: (value) => {
          held.point = value
        },
      }),
    },
  }
}

function anOpenInspectable(open: { value: boolean }): Inspectable {
  return {
    id: testNodeId,
    label: 'Test',
    fields: {
      open: editableField({
        schema: v.boolean(),
        get: () => open.value,
        set: (value) => {
          open.value = value
        },
      }),
      seen: readOnlyField(() => 'seen'),
    },
  }
}

async function arrange({
  entries = [],
  design,
  commands = [],
  renameFlow = false,
}: {
  entries?: readonly Inspectable[]
  design?: Design
  commands?: readonly CommandHandle[]
  renameFlow?: boolean
} = {}) {
  const container = new Container().addModule(designModule)
  container.register(Invoke).useClass(Invoke)
  container.register(Flows).useClass(Flows)
  container.register(DevtoolsPlugin).useClass(DevtoolsPlugin)
  for (const command of commands) registerCommand(container, command)
  if (renameFlow) {
    registerCommand(container, TestRenameDesign)
    registerFlow(container, TestRenameFlow)
  }
  for (const entry of entries) container.register(inspectables).useValue(entry)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  if (design !== undefined) expectOk(store.replaceDesign({ design, unreadable: [] }))
  return {
    plugin: container.resolve(DevtoolsPlugin),
    store,
    invoke: container.resolve(Invoke),
    flows: container.resolve(Flows),
  }
}

function committedOf(store: DesignStore): Committed {
  const committed = store.current.getOrUndefined()
  if (committed === undefined) throw new Error('The test arranged no design.')
  return committed
}

async function arrangeOpen(initial: boolean) {
  const open = shallowRef(initial)
  const { plugin } = await arrange({ entries: [anOpenInspectable(open)] })
  const fake = fakeHost()
  plugin.setup(fake.host)
  return { open, fake }
}

describe('DevtoolsPlugin', () => {
  describe('setup', () => {
    it('adds one inspector, three layers and each event once when run twice', async () => {
      const { plugin, store } = await arrange()
      const first = fakeHost()
      const second = fakeHost()

      plugin.setup(first.host)
      plugin.setup(second.host)
      expectOk(store.replaceDesign({ design: aDesign(), unreadable: [] }))

      expect({
        inspectors: [...first.inspectorsAdded, ...second.inspectorsAdded],
        layers: [...first.layersAdded, ...second.layersAdded],
        events: [...first.timeline, ...second.timeline].length,
      }).toEqual({
        inspectors: [{ id: ownInspectorId, label: 'Services' }],
        layers: [
          expect.objectContaining({ id: invocationsLayer, label: 'Invocations' }),
          expect.objectContaining({ id: commitsLayer, label: 'Commits' }),
          expect.objectContaining({ id: flowsLayer, label: 'Flows' }),
        ],
        events: 1,
      })
    })

    it('adds one flows event per start, cancel and finish, titled by the flow', async () => {
      const { plugin, flows } = await arrange({ design: aDesign(), renameFlow: true })
      const fake = fakeHost()
      plugin.setup(fake.host)

      flows.cancel(flows.start(TestRenameFlow, { name: 'Kyria' }))
      await flows.finish(flows.start(TestRenameFlow, { name: 'Lily58' }))

      expect(fake.timeline.filter(({ layerId }) => layerId === flowsLayer)).toEqual(
        ['started', 'cancelled: cancel', 'started', 'finished'].map((subtitle) => ({
          layerId: flowsLayer,
          event: expect.objectContaining({ title: 'TestRenameFlow', subtitle }),
        })),
      )
    })

    it('adds no commits event for a design committed before setup', async () => {
      const { plugin } = await arrange({ design: aDesign() })
      const fake = fakeHost()

      plugin.setup(fake.host)

      expect(fake.timeline).toEqual([])
    })

    it('adds a whole commit as its seq and revision only', async () => {
      const { plugin, store } = await arrange({ design: aDesign() })
      const fake = fakeHost()
      plugin.setup(fake.host)

      expectOk(store.replaceDesign({ design: aDesign(), unreadable: [] }))

      const { seq, revision } = committedOf(store)
      expect(fake.timeline).toEqual([
        {
          layerId: commitsLayer,
          event: expect.objectContaining({
            title: `seq ${seq}`,
            subtitle: 'whole',
            data: { seq, revision },
          }),
        },
      ])
    })

    it('adds no commits event with nothing committed', async () => {
      const { plugin } = await arrange()
      const fake = fakeHost()

      plugin.setup(fake.host)

      expect(fake.timeline).toEqual([])
    })

    it('adds no event and sends no state once disposed', async () => {
      const open = shallowRef(false)
      const { plugin, store, invoke } = await arrange({
        entries: [anOpenInspectable(open)],
        commands: [RenameDesign],
      })
      const fake = fakeHost()
      plugin.setup(fake.host)
      useFakeTimers()

      plugin[Symbol.dispose]()
      expectOk(store.replaceDesign({ design: aDesign(), unreadable: [] }))
      await invoke.invoke(RenameDesign, { name: 'Lily58' })
      open.value = true
      await nextTick()
      vi.advanceTimersByTime(stateRefreshDelayMs)

      expect({ events: fake.timeline, sent: fake.sent }).toEqual({ events: [], sent: [] })
    })

    it('adds one invocations event and one commits event for a command that changes the design', async () => {
      const { plugin, invoke, store } = await arrange({
        design: aDesign(),
        commands: [RenameDesign],
      })
      const fake = fakeHost()
      plugin.setup(fake.host)

      await invoke.invoke(RenameDesign, { name: 'Lily58' })

      const { seq, revision } = committedOf(store)
      expect({
        commits: fake.timeline.filter(({ layerId }) => layerId === commitsLayer),
        invocations: fake.timeline.filter(({ layerId }) => layerId === invocationsLayer),
      }).toEqual({
        commits: [
          {
            layerId: commitsLayer,
            event: expect.objectContaining({
              title: `seq ${seq}`,
              subtitle: 'patches',
              data: {
                seq,
                revision,
                patches: [{ op: 'replace', path: ['meta', 'name'], value: 'Lily58' }],
              },
            }),
          },
        ],
        invocations: [
          {
            layerId: invocationsLayer,
            event: expect.objectContaining({
              title: RenameDesign.id,
              subtitle: 'ok',
              data: { label: RenameDesign.label, input: { name: 'Lily58' }, result: 'ok' },
            }),
          },
        ],
      })
    })
  })

  describe('tree', () => {
    it('gives one node per inspectable with its id and label', async () => {
      const second = { id: 'keeb-cad.devtools.second', label: 'Second', fields: {} }
      const { plugin } = await arrange({
        entries: [anOpenInspectable(shallowRef(false)), second],
      })
      const fake = fakeHost()
      plugin.setup(fake.host)

      expect(fake.tree().rootNodes).toEqual([
        { id: testNodeId, label: 'Test' },
        { id: second.id, label: second.label },
      ])
    })

    it("leaves another inspector's rootNodes untouched", async () => {
      const { fake } = await arrangeOpen(false)

      expect(fake.tree(otherInspectorId).rootNodes).toEqual([])
    })

    it('has no nodes with no inspectables registered', async () => {
      const { plugin } = await arrange()
      const fake = fakeHost()
      plugin.setup(fake.host)

      expect(fake.tree().rootNodes).toEqual([])
    })
  })

  describe('state', () => {
    it('gives the fields as rows, editable only with a set', async () => {
      const { fake } = await arrangeOpen(true)

      expect(fake.state(testNodeId).state).toEqual({
        fields: [
          { key: 'open', value: true, editable: true },
          { key: 'seen', value: 'seen', editable: false },
        ],
      })
    })

    it('tells the host which node the panel reads, so its later pushes name that node', async () => {
      const { fake } = await arrangeOpen(true)

      fake.state(testNodeId)

      expect(fake.selected).toEqual([[ownInspectorId, testNodeId]])
    })

    it("selects nothing for another inspector's node or an unknown one", async () => {
      const { fake } = await arrangeOpen(true)

      fake.state(testNodeId, 'another-inspector')
      fake.state('unknown-node')

      expect(fake.selected).toEqual([])
    })

    it("leaves another inspector's state untouched", async () => {
      const { fake } = await arrangeOpen(false)

      expect(fake.state(testNodeId, otherInspectorId).state).toEqual({})
    })

    it('leaves the state of an unknown node untouched', async () => {
      const { fake } = await arrangeOpen(false)

      expect(fake.state('keeb-cad.devtools.unknown').state).toEqual({})
    })

    it('gives no rows for an inspectable with no fields', async () => {
      const { plugin } = await arrange({
        entries: [{ id: testNodeId, label: 'Test', fields: {} }],
      })
      const fake = fakeHost()
      plugin.setup(fake.host)

      expect(fake.state(testNodeId).state).toEqual({ fields: [] })
    })

    it("re-sends the inspector state only once the kit's send window has passed", async () => {
      const { open, fake } = await arrangeOpen(false)
      useFakeTimers()

      open.value = true
      await nextTick()
      vi.advanceTimersByTime(stateRefreshDelayMs - 1)
      const justBefore = [...fake.sent]
      vi.advanceTimersByTime(1)

      expect({ justBefore, onTheDelay: fake.sent }).toEqual({
        justBefore: [],
        onTheDelay: [ownInspectorId],
      })
    })
  })

  describe('edit', () => {
    it('sets a value the schema accepts and re-sends the inspector state', async () => {
      // Not a ref, so the only send is the edit's own, whenever the watch would flush.
      const open = { value: false }
      const { plugin } = await arrange({ entries: [anOpenInspectable(open)] })
      const fake = fakeHost()
      plugin.setup(fake.host)

      fake.edit({ state: { value: true } })

      expect({ open: open.value, sent: fake.sent }).toEqual({
        open: true,
        sent: [ownInspectorId],
      })
    })

    it('keeps the service on a value the schema refuses and re-sends the inspector state', async () => {
      const { open, fake } = await arrangeOpen(false)

      fake.edit({ state: { value: 'yes' } })

      expect({ open: open.value, sent: fake.sent }).toEqual({
        open: false,
        sent: [ownInspectorId],
      })
    })

    it.each([
      ['an unknown key', { path: ['other'] }],
      ['an empty path', { path: [] }],
      ['a path into the value, which is no object', { path: ['open', 'x'] }],
      ['another inspector', { inspectorId: otherInspectorId }],
      ['an unknown node', { nodeId: 'keeb-cad.devtools.unknown' }],
    ])('leaves the service unchanged for %s', async (_role, overrides) => {
      const { open, fake } = await arrangeOpen(false)

      fake.edit(overrides)

      expect(open.value).toBe(false)
    })

    // The panel edits a list item or an object member by its full path.
    it.each<[string, Partial<EditPayload>, { items: string[]; point: { x: number; y: number } }]>([
      [
        'replaces a list item',
        { path: ['items', '0'], state: { value: 'z' } },
        { items: ['z', 'b'], point: { x: 1, y: 2 } },
      ],
      [
        'adds a list item',
        { path: ['items', '2'], state: { value: 'c', newKey: '2' } },
        { items: ['a', 'b', 'c'], point: { x: 1, y: 2 } },
      ],
      [
        'removes a list item',
        { path: ['items', '0'], state: { value: undefined, remove: true } },
        { items: ['b'], point: { x: 1, y: 2 } },
      ],
      [
        'keeps the list on an item the schema refuses',
        { path: ['items', '0'], state: { value: 7 } },
        { items: ['a', 'b'], point: { x: 1, y: 2 } },
      ],
      [
        'sets an object member',
        { path: ['point', 'x'], state: { value: 3 } },
        { items: ['a', 'b'], point: { x: 3, y: 2 } },
      ],
    ])('%s at a nested path', async (_role, overrides, expected) => {
      const held = { items: ['a', 'b'], point: { x: 1, y: 2 } }
      const { plugin } = await arrange({ entries: [aNestedInspectable(held)] })
      const fake = fakeHost()
      plugin.setup(fake.host)

      fake.edit(overrides)

      expect(held).toEqual(expected)
    })

    it('leaves the service unchanged for a removal the schema would accept', async () => {
      const held = shallowRef<boolean | undefined>(true)
      const { plugin } = await arrange({
        entries: [
          {
            id: testNodeId,
            label: 'Test',
            fields: {
              open: editableField({
                schema: v.optional(v.boolean()),
                get: () => held.value,
                set: (value) => {
                  held.value = value
                },
              }),
            },
          },
        ],
      })
      const fake = fakeHost()
      plugin.setup(fake.host)

      fake.edit({ state: { remove: true } })

      expect(held.value).toBe(true)
    })
  })
})
