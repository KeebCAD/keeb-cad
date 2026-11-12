import { DesignStore, designModule, registerAction, registerCommand } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import type { Result } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign, aMeta } from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished } from 'vitest'

import { editorModule } from '../editor-module'
import { Invoke } from '../invoke/invoke'
import type { InvokeEvent } from '../invoke/types'
import { rejectionText } from '../rejection/rejection-text'
import { TestBrokenStoreName } from '../testing/test-broken-store-name'
import { TestBrokenStoreNameFlow } from '../testing/test-broken-store-name-flow'
import { TestRenameDesign } from '../testing/test-rename-design'
import { TestRenameFlow } from '../testing/test-rename-flow'
import { TestStoreNameFlow } from '../testing/test-store-name-flow'
import { TestStoreName } from '../testing/test-store-name'
import { Flows } from './flows'
import { registerFlow } from './register-flow'
import type { FlowEvent, OpenFlow } from './types'

const ARRANGED_NAME = 'Corne'
const TAKEN_TEXT = 'That is already its name.'
const REQUIRED_TEXT = 'A name is required.'
const QUOTA_TEXT = "The browser's storage is full; free some space and try again."

// Registers a store-name action and its flow only when the test uses it.
async function arrange({
  storeName = false,
  brokenStoreName = false,
}: { storeName?: boolean; brokenStoreName?: boolean } = {}) {
  const container = new Container().addModule(designModule).addModule(editorModule)
  registerCommand(container, TestRenameDesign)
  registerFlow(container, TestRenameFlow)
  if (storeName) {
    registerAction(container, TestStoreName)
    registerFlow(container, TestStoreNameFlow)
  }
  if (brokenStoreName) {
    registerAction(container, TestBrokenStoreName)
    registerFlow(container, TestBrokenStoreNameFlow)
  }
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  expectOk(
    store.replaceDesign({
      design: aDesign({ meta: aMeta({ name: ARRANGED_NAME }) }),
      unreadable: [],
    }),
  )
  return {
    flows: container.resolve(Flows),
    invoke: container.resolve(Invoke),
    store,
    arranged: designOf(store),
  }
}

function designOf(store: DesignStore): { name: string; seq: number } {
  const committed = store.current.getOrUndefined()
  if (committed === undefined) throw new Error('The test arranged no design.')
  return { name: committed.design.meta.name, seq: committed.seq }
}

// What a view reads off an open flow: its draft and its refusal's text.
function viewOf({ entry, draft, availability }: OpenFlow) {
  return {
    entry,
    draft,
    reason: availability.match({
      ok: (): string | undefined => undefined,
      err: (error) => rejectionText(error),
    }),
  }
}

function topOf(flows: Flows) {
  return flows.top.map((open) => viewOf(open)).getOrUndefined()
}

function stackOf(flows: Flows) {
  return flows.stack.map((open) => viewOf(open))
}

function recordInvocations(invoke: Invoke, id: string): InvokeEvent[] {
  const invocations: InvokeEvent[] = []
  invoke.events.on('invoke', (event) => {
    if (event.id === id) invocations.push(event)
  })
  return invocations
}

// A Result as a plain value: an Err's iterator throws inside the matchers.
function answerOf(result: Result<void, unknown>): { ok: void } | { err: unknown } {
  return result.match<{ ok: void } | { err: unknown }>({
    ok: (value) => ({ ok: value }),
    err: (error) => ({ err: error }),
  })
}

function recordEvents(flows: Flows): FlowEvent[] {
  const events: FlowEvent[] = []
  flows.events.on('flow', (event) => {
    events.push(event)
  })
  return events
}

describe('Flows', () => {
  describe('start', () => {
    it('opens the flow with its draft, available, and reports it started', async () => {
      const { flows } = await arrange()
      const events = recordEvents(flows)

      const entry = flows.start(TestRenameFlow, { name: 'Kyria' })

      expect({ top: topOf(flows), events }).toEqual({
        top: { entry, draft: { name: 'Kyria' }, reason: undefined },
        events: [{ kind: 'started', entry }],
      })
    })

    it('cancels the open flow as replaced before it starts the new one, running nothing', async () => {
      const { flows, store, arranged } = await arrange()
      const first = flows.start(TestRenameFlow, { name: 'Kyria' })
      const events = recordEvents(flows)

      const second = flows.start(TestRenameFlow, { name: 'Lily58' })

      expect({
        stack: stackOf(flows),
        design: designOf(store),
        events,
      }).toEqual({
        stack: [{ entry: second, draft: { name: 'Lily58' }, reason: undefined }],
        design: arranged,
        events: [
          { kind: 'cancelled', entry: first, reason: 'replaced' },
          { kind: 'started', entry: second },
        ],
      })
    })
  })

  describe('update', () => {
    it.each([
      ['an empty name', 'Kyria', '', REQUIRED_TEXT],
      ['a one-character name, on the limit', '', 'K', undefined],
      ['a name that trims to empty', 'Kyria', '  ', REQUIRED_TEXT],
    ])('re-asks availability for %s', async (_role, started, name, expectedReason) => {
      const { flows } = await arrange()
      const entry = flows.start(TestRenameFlow, { name: started })

      flows.update(entry, { name })

      expect(topOf(flows)).toEqual({ entry, draft: { name }, reason: expectedReason })
    })

    it('makes a refused draft available again once it is fixed', async () => {
      const { flows } = await arrange()
      const entry = flows.start(TestRenameFlow, { name: '' })

      flows.update(entry, { name: 'Kyria' })

      expect(topOf(flows)).toEqual({ entry, draft: { name: 'Kyria' }, reason: undefined })
    })
  })

  describe('a design commit', () => {
    it('re-asks availability when a commit from outside makes the draft refused', async () => {
      const { flows, store } = await arrange()
      const entry = flows.start(TestRenameFlow, { name: 'Kyria' })

      expectOk(store.run(TestRenameDesign, { name: 'Kyria' }))

      expect(topOf(flows)).toEqual({ entry, draft: { name: 'Kyria' }, reason: TAKEN_TEXT })
    })

    it('cancels the open flow as design-replaced when the design is replaced, running nothing', async () => {
      const { flows, store } = await arrange()
      const entry = flows.start(TestRenameFlow, { name: 'Kyria' })
      const events = recordEvents(flows)

      expectOk(
        store.replaceDesign({
          design: aDesign({ meta: aMeta({ name: 'Lily58' }) }),
          unreadable: [],
        }),
      )

      expect({ stack: flows.stack, name: designOf(store).name, events }).toEqual({
        stack: [],
        name: 'Lily58',
        events: [{ kind: 'cancelled', entry, reason: 'design-replaced' }],
      })
    })
  })

  describe('finish', () => {
    it('runs its command with the parsed draft and pops the flow', async () => {
      const { flows, store } = await arrange()
      const entry = flows.start(TestRenameFlow, { name: ' Kyria ' })
      const events = recordEvents(flows)

      const answer = await flows.finish(entry)

      expect({
        answer: answerOf(answer),
        stack: flows.stack,
        name: designOf(store).name,
        events,
      }).toEqual({
        answer: { ok: undefined },
        stack: [],
        name: 'Kyria',
        events: [{ kind: 'finished', entry }],
      })
    })

    it('runs its command once when finished twice before the first settles', async () => {
      const { flows, invoke, store, arranged } = await arrange()
      const events = recordEvents(flows)
      const entry = flows.start(TestRenameFlow, { name: 'Kyria' })
      const invocations = recordInvocations(invoke, TestRenameDesign.id)

      const [, second] = await Promise.all([flows.finish(entry), flows.finish(entry)])

      expect({
        design: designOf(store),
        invocations: invocations.length,
        events,
        second: answerOf(second),
      }).toEqual({
        design: { name: 'Kyria', seq: arranged.seq + 1 },
        invocations: 1,
        events: [
          { kind: 'started', entry },
          { kind: 'finished', entry },
        ],
        second: { err: { kind: 'unavailable', command: TestRenameDesign.id } },
      })
    })

    it('shows no refusal from its own commit while the finish is pending', async () => {
      const { flows } = await arrange()
      const entry = flows.start(TestRenameFlow, { name: 'Kyria' })

      const finishing = flows.finish(entry)
      const topWhilePending = topOf(flows)
      await finishing

      expect(topWhilePending).toEqual({ entry, draft: { name: 'Kyria' }, reason: undefined })
    })

    it('keeps a refused flow open with its draft and the refusal as its reason', async () => {
      const { flows, store, arranged } = await arrange()
      const entry = flows.start(TestRenameFlow, { name: ARRANGED_NAME })
      const events = recordEvents(flows)

      await flows.finish(entry)

      expect({ design: designOf(store), top: topOf(flows), events }).toEqual({
        design: arranged,
        top: { entry, draft: { name: ARRANGED_NAME }, reason: TAKEN_TEXT },
        events: [],
      })
    })

    it("keeps the flow open with its draft and the action's failure as its reason", async () => {
      const { flows } = await arrange({ storeName: true })
      const entry = flows.start(TestStoreNameFlow, { name: 'Kyria' })
      const events = recordEvents(flows)

      const answer = await flows.finish(entry)

      expect({ answer: answerOf(answer), top: topOf(flows), events }).toEqual({
        answer: { err: { kind: 'quota-exceeded' } },
        top: { entry, draft: { name: 'Kyria' }, reason: QUOTA_TEXT },
        events: [],
      })
    })

    it('cancels a flow whose finish is pending when the design is replaced', async () => {
      const { flows, store } = await arrange({ storeName: true })
      const events = recordEvents(flows)
      const entry = flows.start(TestStoreNameFlow, { name: 'Kyria' })

      const finishing = flows.finish(entry)
      expectOk(
        store.replaceDesign({
          design: aDesign({ meta: aMeta({ name: 'Lily58' }) }),
          unreadable: [],
        }),
      )
      const answer = await finishing

      expect({ answer: answerOf(answer), stack: flows.stack, events }).toEqual({
        answer: { err: { kind: 'quota-exceeded' } },
        stack: [],
        events: [
          { kind: 'started', entry },
          { kind: 'cancelled', entry, reason: 'design-replaced' },
        ],
      })
    })

    it('lets the flow be cancelled after a finish whose run threw', async () => {
      const { flows } = await arrange({ brokenStoreName: true })
      const entry = flows.start(TestBrokenStoreNameFlow, { name: 'Kyria' })
      await expect(flows.finish(entry)).rejects.toThrow('TestBrokenStoreName broke.')

      flows.cancel(entry)

      expect(flows.stack).toEqual([])
    })

    it('ignores an update and a cancel while the finish is pending, reopening the draft that ran', async () => {
      const { flows } = await arrange({ storeName: true })
      const entry = flows.start(TestStoreNameFlow, { name: 'Kyria' })
      const events = recordEvents(flows)

      const finishing = flows.finish(entry)
      flows.update(entry, { name: 'Lily58' })
      flows.cancel(entry)
      await finishing

      expect({ top: topOf(flows), events }).toEqual({
        top: { entry, draft: { name: 'Kyria' }, reason: QUOTA_TEXT },
        events: [],
      })
    })

    it("drops a failed finish's reason at the next update", async () => {
      const { flows } = await arrange({ storeName: true })
      const entry = flows.start(TestStoreNameFlow, { name: 'Kyria' })
      await flows.finish(entry)

      flows.update(entry, { name: 'Lily58' })

      expect(topOf(flows)).toEqual({ entry, draft: { name: 'Lily58' }, reason: undefined })
    })
  })

  describe('cancel', () => {
    it('pops the flow without running its command and reports it cancelled', async () => {
      const { flows, store, arranged } = await arrange()
      const entry = flows.start(TestRenameFlow, { name: 'Kyria' })
      const events = recordEvents(flows)

      flows.cancel(entry)

      expect({ stack: flows.stack, design: designOf(store), events }).toEqual({
        stack: [],
        design: arranged,
        events: [{ kind: 'cancelled', entry, reason: 'cancel' }],
      })
    })
  })

  describe('an entry that is not the top', () => {
    it('changes nothing when a replaced entry is updated, finished or cancelled', async () => {
      const { flows, store, arranged } = await arrange()
      const first = flows.start(TestRenameFlow, { name: 'Kyria' })
      const second = flows.start(TestRenameFlow, { name: 'Lily58' })

      flows.update(first, { name: 'Sofle' })
      await flows.finish(first)
      flows.cancel(first)

      expect({ stack: stackOf(flows), design: designOf(store) }).toEqual({
        stack: [{ entry: second, draft: { name: 'Lily58' }, reason: undefined }],
        design: arranged,
      })
    })

    it('changes nothing when a closed entry is updated, finished or cancelled', async () => {
      const { flows, store, arranged } = await arrange()
      const entry = flows.start(TestRenameFlow, { name: 'Kyria' })
      flows.cancel(entry)
      const events = recordEvents(flows)

      flows.update(entry, { name: 'Sofle' })
      const answer = await flows.finish(entry)
      flows.cancel(entry)

      expect({
        answer: answerOf(answer),
        stack: flows.stack,
        design: designOf(store),
        events,
      }).toEqual({
        answer: { err: { kind: 'unavailable', command: TestRenameDesign.id } },
        stack: [],
        design: arranged,
        events: [],
      })
    })
  })
})
