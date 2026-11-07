import { describe, expect, it } from 'vitest'

import type { Endpoint } from '../endpoint/types'
import { Dispatcher } from './dispatcher'
import type { Stamp } from './types'

type TestMessage = { kind: 'design' | 'patches' | 'issues' } & Stamp
type IssuesOnly = { kind: 'issues' } & Stamp

const EPOCH = 2
const LATEST = 5
const STAMP = { kind: 'issues', epoch: 1, seq: 1 } as const

function options() {
  return { designKinds: ['design', 'patches'], wholeKind: 'design' }
}

interface Arrangement {
  epoch?: number
  latest?: number
}

// The receiving side: restarted at `epoch` when given, and its latest design seq set to `latest`
// by a design message it sends itself.
function arrange({ epoch, latest }: Arrangement = {}) {
  const dispatcher = new Dispatcher(options())
  const { port1: receiver, port2: sender } = new MessageChannel()
  if (epoch !== undefined) dispatcher.restart(epoch)
  if (epoch !== undefined && latest !== undefined) {
    dispatcher.send<TestMessage>(receiver, { kind: 'patches', epoch, seq: latest })
  }
  const received: TestMessage[] = []
  const record = (message: TestMessage) => {
    received.push(message)
  }
  const stop = dispatcher.listen<TestMessage>(receiver, {
    design: record,
    patches: record,
    issues: record,
  })
  return { dispatcher, receiver, sender, received, stop }
}

// Resolves once the receiver has handled every message: a listener added after the dispatcher's
// runs after it for each one.
function deliver(receiver: MessagePort, sender: MessagePort, messages: readonly unknown[]) {
  const delivered = new Promise<void>((resolve) => {
    let count = 0
    receiver.addEventListener('message', () => {
      count += 1
      if (count === messages.length) resolve()
    })
  })
  for (const message of messages) sender.postMessage(message)
  return delivered
}

function arrangeChannel() {
  const { port1, port2 } = new MessageChannel()
  const arrival = new Promise<unknown>((resolve) => {
    port2.addEventListener('message', (event) => resolve(event.data), { once: true })
    port2.start()
  })
  return { sender: port1, arrival }
}

function arrangeRecorder() {
  const posted: unknown[] = []
  const endpoint: Endpoint = {
    postMessage: (message) => posted.push(message),
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  return { endpoint, posted }
}

describe('Dispatcher', () => {
  describe('send', () => {
    it.each([
      ['a class instance in an array', () => ({ a: [new (class X {})()] }), 'a.0'],
      ['a Map', () => ({ m: new Map() }), 'm'],
      ['a function', () => ({ f() {} }), 'f'],
      ['a DataView', () => ({ d: new DataView(new ArrayBuffer(1)) }), 'd'],
      ['a symbol', () => ({ s: Symbol('s') }), 's'],
      ['a nested Map', () => ({ design: { meta: { x: new Map() } } }), 'design.meta.x'],
      ['a Map on an array', () => ({ a: Object.assign([], { x: new Map() }) }), 'a.x'],
    ])('refuses %s, naming its path, and posts nothing', (_what, makeValue, expectedPath) => {
      const { endpoint, posted } = arrangeRecorder()

      expect(() => new Dispatcher(options()).send(endpoint, { ...STAMP, ...makeValue() })).toThrow(
        expect.objectContaining({ name: 'NotPlainError', path: expectedPath }),
      )
      expect(posted).toEqual([])
    })

    it.each([
      ['a SharedArrayBuffer', (shared: ArrayBufferLike) => ({ b: shared }), 'b'],
      [
        'a typed array over a SharedArrayBuffer',
        (shared: ArrayBufferLike) => ({ v: new Uint8Array(shared) }),
        'v',
      ],
    ])('refuses %s, naming its path', (_what, makeValue, expectedPath) => {
      const { endpoint } = arrangeRecorder()
      const shared = new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true }).buffer

      expect(() =>
        new Dispatcher(options()).send(endpoint, { ...STAMP, ...makeValue(shared) }),
      ).toThrow(expect.objectContaining({ name: 'NotPlainError', path: expectedPath }))
    })

    it('posts plain values, which arrive equal', async () => {
      const { sender, arrival } = arrangeChannel()
      const value = {
        nested: Object.freeze({ inner: Object.freeze({ n: 1, text: 'a', flag: true }) }),
        list: [1, [2, 3], { four: 4 }],
        bytes: new Uint8Array([1, 2, 3]),
        buffer: new Uint8Array([4, 5]).buffer,
        nothing: null,
        bare: Object.assign(Object.create(null) as object, { key: 'value' }),
      }

      new Dispatcher(options()).send(sender, { ...STAMP, ...value })

      expect(await arrival).toEqual({
        ...STAMP,
        nested: { inner: { n: 1, text: 'a', flag: true } },
        list: [1, [2, 3], { four: 4 }],
        bytes: new Uint8Array([1, 2, 3]),
        buffer: new Uint8Array([4, 5]).buffer,
        nothing: null,
        bare: { key: 'value' },
      })
    })

    it.each([
      ['an empty object', () => ({}), {}],
      ['an empty array', () => [], []],
      ['an empty ArrayBuffer', () => new ArrayBuffer(0), new ArrayBuffer(0)],
    ])('posts %s', async (_what, makeValue, expected) => {
      const { sender, arrival } = arrangeChannel()

      new Dispatcher(options()).send(sender, { ...STAMP, value: makeValue() })

      expect(await arrival).toEqual({ ...STAMP, value: expected })
    })

    it('posts a cycle, which arrives as a cycle', async () => {
      const { sender, arrival } = arrangeChannel()
      const looped: typeof STAMP & { self?: unknown } = { ...STAMP }
      looped.self = looped

      new Dispatcher(options()).send(sender, looped)

      const arrived = (await arrival) as { self: unknown }
      expect(arrived.self).toBe(arrived)
    })

    it('transfers the buffers it is given, detaching them on the sender', async () => {
      const { sender, arrival } = arrangeChannel()
      const buffer = new ArrayBuffer(16)

      new Dispatcher(options()).send(sender, { ...STAMP, buffer }, [buffer])

      const arrived = (await arrival) as { buffer: ArrayBuffer }
      expect([buffer.byteLength, arrived.buffer.byteLength]).toEqual([0, 16])
    })
  })

  describe('listen', () => {
    it('starts a fresh port and delivers its first message', async () => {
      const { sender, received } = arrange({ epoch: EPOCH })

      sender.postMessage({ kind: 'issues', epoch: EPOCH, seq: 1 })

      await expect.poll(() => received).toEqual([{ kind: 'issues', epoch: EPOCH, seq: 1 }])
    })

    it("hands each message to its kind's handler", async () => {
      const dispatcher = new Dispatcher(options())
      const { port1: receiver, port2: sender } = new MessageChannel()
      dispatcher.restart(EPOCH)
      const handled: string[] = []
      dispatcher.listen<TestMessage>(receiver, {
        design: () => handled.push('design'),
        patches: () => handled.push('patches'),
        issues: () => handled.push('issues'),
      })

      await deliver(receiver, sender, [
        { kind: 'issues', epoch: EPOCH, seq: 0 },
        { kind: 'design', epoch: EPOCH, seq: 1 },
        { kind: 'patches', epoch: EPOCH, seq: 2 },
      ])

      expect(handled).toEqual(['issues', 'design', 'patches'])
    })

    it('hands on nothing once stopped', async () => {
      const { receiver, sender, received, stop } = arrange({ epoch: EPOCH })

      stop()
      await deliver(receiver, sender, [{ kind: 'issues', epoch: EPOCH, seq: 1 }])

      expect(received).toEqual([])
    })

    it('drops a kind it has no handler for, leaving the latest as it was', async () => {
      const dispatcher = new Dispatcher(options())
      const { port1: receiver, port2: sender } = new MessageChannel()
      dispatcher.restart(1)
      const received: IssuesOnly[] = []
      dispatcher.listen<IssuesOnly>(receiver, { issues: (message) => received.push(message) })

      await deliver(receiver, sender, [
        { kind: 'patches', epoch: 1, seq: 9 },
        { kind: 'issues', epoch: 1, seq: 1 },
      ])

      expect(received).toEqual([{ kind: 'issues', epoch: 1, seq: 1 }])
    })
  })

  describe('gate', () => {
    it.each([
      ['below the latest', LATEST - 1],
      ['on the latest', LATEST],
    ])('drops a design message %s', async (_role, seq) => {
      const { receiver, sender, received } = arrange({ epoch: EPOCH, latest: LATEST })

      await deliver(receiver, sender, [{ kind: 'patches', epoch: EPOCH, seq }])

      expect(received).toEqual([])
    })

    it('admits a design message above the latest and makes its seq the latest', async () => {
      const { receiver, sender, received } = arrange({ epoch: EPOCH, latest: LATEST })

      await deliver(receiver, sender, [
        { kind: 'patches', epoch: EPOCH, seq: LATEST + 1 },
        { kind: 'issues', epoch: EPOCH, seq: LATEST },
      ])

      expect(received).toEqual([{ kind: 'patches', epoch: EPOCH, seq: LATEST + 1 }])
    })

    it('drops another kind below the latest', async () => {
      const { receiver, sender, received } = arrange({ epoch: EPOCH, latest: LATEST })

      await deliver(receiver, sender, [{ kind: 'issues', epoch: EPOCH, seq: LATEST - 1 }])

      expect(received).toEqual([])
    })

    it.each([
      ['on the latest', LATEST],
      ['above the latest', LATEST + 1],
    ])('admits another kind %s and leaves the latest as it was', async (_role, seq) => {
      const { receiver, sender, received } = arrange({ epoch: EPOCH, latest: LATEST })

      await deliver(receiver, sender, [
        { kind: 'issues', epoch: EPOCH, seq },
        { kind: 'design', epoch: EPOCH, seq: LATEST + 1 },
      ])

      expect(received).toEqual([
        { kind: 'issues', epoch: EPOCH, seq },
        { kind: 'design', epoch: EPOCH, seq: LATEST + 1 },
      ])
    })

    it.each([
      ['an older', EPOCH - 1],
      ['a newer', EPOCH + 1],
    ])('drops a message from %s epoch', async (_role, epoch) => {
      const { receiver, sender, received } = arrange({ epoch: EPOCH, latest: LATEST })

      await deliver(receiver, sender, [{ kind: 'issues', epoch, seq: 9 }])

      expect(received).toEqual([])
    })

    it('drops another kind below a design seq its own side sent', async () => {
      const { dispatcher, receiver, sender, received } = arrange({ epoch: EPOCH, latest: LATEST })

      dispatcher.send<TestMessage>(receiver, { kind: 'patches', epoch: EPOCH, seq: 7 })
      await deliver(receiver, sender, [{ kind: 'issues', epoch: EPOCH, seq: 6 }])

      expect(received).toEqual([])
    })

    it('takes its epoch from the first design message when never restarted', async () => {
      const { receiver, sender, received } = arrange()

      await deliver(receiver, sender, [
        { kind: 'issues', epoch: 4, seq: 1 },
        { kind: 'design', epoch: 4, seq: 1 },
        { kind: 'issues', epoch: 4, seq: 1 },
      ])

      expect(received).toEqual([
        { kind: 'design', epoch: 4, seq: 1 },
        { kind: 'issues', epoch: 4, seq: 1 },
      ])
    })

    it('drops patches ahead of the first whole design and takes no epoch from them', async () => {
      const { receiver, sender, received } = arrange()

      await deliver(receiver, sender, [
        { kind: 'patches', epoch: 4, seq: 2 },
        { kind: 'design', epoch: 5, seq: 1 },
      ])

      expect(received).toEqual([{ kind: 'design', epoch: 5, seq: 1 }])
    })

    it('keeps the epoch it was restarted at over a design from another', async () => {
      const { receiver, sender, received } = arrange({ epoch: EPOCH })

      await deliver(receiver, sender, [{ kind: 'design', epoch: EPOCH + 1, seq: 1 }])

      expect(received).toEqual([])
    })

    it('starts a new epoch from no latest seq', async () => {
      const { dispatcher, receiver, sender, received } = arrange({ epoch: EPOCH, latest: LATEST })

      dispatcher.restart(EPOCH + 1)
      await deliver(receiver, sender, [{ kind: 'design', epoch: EPOCH + 1, seq: 1 }])

      expect(received).toEqual([{ kind: 'design', epoch: EPOCH + 1, seq: 1 }])
    })
  })
})
