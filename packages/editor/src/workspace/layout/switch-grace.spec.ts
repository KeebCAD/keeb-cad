import { AddSlot } from '@keeb-cad/commands'
import type { DesignStore } from '@keeb-cad/design'
import { expectOk } from '@keeb-cad/result/testing'
import {
  aDesign,
  aLayout,
  aLayoutOutput,
  aLayoutRow,
  anId,
  aPartsOutput,
  aSlot,
} from '@keeb-cad/schema/testing'
import type { FakeWorker } from '@keeb-cad/workers/testing'
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { page } from 'vitest/browser'
import { nextTick } from 'vue'

import { emulateColorScheme } from '../../testing/color-scheme'
import { mountShell } from '../../testing/mount-shell'
import { postLayoutSet } from '../../testing/post-layout-set'

const DESIGN = aDesign({
  layout: aLayout({ id: anId('root'), children: [aSlot({ id: anId('a') })] }),
})
const LAYOUT = aLayoutOutput({
  ids: ['left/a', 'left/root'],
  rows: [aLayoutRow(), aLayoutRow({ kind: 'group', part: -1 })],
})
const PARTS = aPartsOutput({ ids: ['key@a'], rows: [{ w: 18, h: 18 }] })
// Frappé's stale, key-body and key-top-face tokens.
const STALE = 'rgb(115, 121, 148)'
const KEY_BODY = 'rgb(98, 104, 128)'
const KEY_TOP_FACE = 'rgb(148, 156, 187)'
const KEY_EDGE = 'rgb(148, 156, 187)'
const ANCHOR_LINK = 'rgb(129, 200, 190)'
const DRAWN = { body: KEY_BODY, topFace: KEY_TOP_FACE, edge: KEY_EDGE, anchorLink: ANCHOR_LINK }
const GRAYED = { body: STALE, topFace: STALE, edge: STALE, anchorLink: STALE }

// A patch commit that keeps slot a, so main's seq passes the posted set's.
function commit(store: DesignStore): void {
  expectOk(store.run(AddSlot, {}))
}

function seqOf(store: DesignStore): number {
  return store.current.map(({ seq }) => seq).getOr(-1)
}

function only(spawned: FakeWorker[]): FakeWorker {
  const [worker] = spawned
  if (worker === undefined) throw new Error('Expected a spawned worker.')
  return worker
}

// On Outline with a set posted and, with commitAfterSet, a commit whose set has not come; time is
// frozen, and the switch to Layout that the grace is timed from is the test's own call.
async function arrange({ commitAfterSet }: { commitAfterSet: boolean }) {
  const shell = await mountShell({ path: '/design/corne/outline', design: DESIGN, spawn: true })
  const worker = only(shell.spawned)
  postLayoutSet(worker, { seq: seqOf(shell.store), layout: LAYOUT, parts: PARTS })
  if (commitAfterSet) commit(shell.store)
  vi.useFakeTimers()
  onTestFinished(() => {
    vi.useRealTimers()
  })
  return {
    switchToLayout: async () => {
      await shell.router.push({ name: 'layout', params: { id: 'corne' } })
    },
    advance: async (milliseconds: number) => {
      vi.advanceTimersByTime(milliseconds)
      await nextTick()
    },
    postSet: async () => {
      postLayoutSet(worker, { seq: seqOf(shell.store), layout: LAYOUT, parts: PARTS })
      await nextTick()
    },
  }
}

function shown() {
  const key = page.getByRole('button', { name: 'a', exact: true }).element()
  const strip = page.getByRole('contentinfo', { name: 'Status strip' }).element()
  const [, topFace] = key.querySelectorAll('rect')
  if (topFace === undefined) throw new Error('Expected a keycap top face.')
  // Slot a's anchor link, the canvas's only line.
  const link = page.getByRole('main', { name: 'Canvas' }).element().querySelector('line')
  if (link === null) throw new Error("Expected slot a's anchor link.")
  return {
    body: getComputedStyle(key).fill,
    topFace: getComputedStyle(topFace).fill,
    edge: getComputedStyle(key).stroke,
    anchorLink: getComputedStyle(link).stroke,
    updating: strip.textContent.includes('◌ updating'),
  }
}

describe('the switch grace', () => {
  beforeEach(() => emulateColorScheme('dark'))

  it('never grays a set that arrives 199 ms after the switch', async () => {
    const { switchToLayout, advance, postSet } = await arrange({ commitAfterSet: true })
    await switchToLayout()

    await advance(199)
    const before = shown()
    await postSet()
    await advance(10)

    expect({ before, after: shown() }).toEqual({
      before: { ...DRAWN, updating: false },
      after: { ...DRAWN, updating: false },
    })
  })

  it('does not gray on the grace itself, 200 ms after the switch', async () => {
    const { switchToLayout, advance } = await arrange({ commitAfterSet: true })
    await switchToLayout()

    await advance(200)

    expect(shown()).toEqual({ ...DRAWN, updating: false })
  })

  it('grays the marks and shows updating 201 ms after the switch with no set', async () => {
    const { switchToLayout, advance } = await arrange({ commitAfterSet: true })
    await switchToLayout()

    await advance(201)

    expect(shown()).toEqual({ ...GRAYED, updating: true })
  })

  it('ungrays and drops updating once the late set arrives', async () => {
    const { switchToLayout, advance, postSet } = await arrange({ commitAfterSet: true })
    await switchToLayout()
    await advance(201)

    await postSet()

    expect(shown()).toEqual({ ...DRAWN, updating: false })
  })

  it("does not gray when main's set had arrived before the switch", async () => {
    const { switchToLayout, advance } = await arrange({ commitAfterSet: false })
    await switchToLayout()

    await advance(201)

    expect(shown()).toEqual({ ...DRAWN, updating: false })
  })

  // The service is first resolved by the Layout canvas mounted on load; its grace must outlive it.
  it('still grays after the canvas that first used it has unmounted', async () => {
    const shell = await mountShell({ path: '/design/corne/layout', design: DESIGN, spawn: true })
    const worker = only(shell.spawned)
    postLayoutSet(worker, { seq: seqOf(shell.store), layout: LAYOUT, parts: PARTS })
    await shell.router.push({ name: 'outline', params: { id: 'corne' } })
    await shell.router.push({ name: 'layout', params: { id: 'corne' } })
    await shell.router.push({ name: 'outline', params: { id: 'corne' } })
    commit(shell.store)
    vi.useFakeTimers()
    onTestFinished(() => {
      vi.useRealTimers()
    })

    await shell.router.push({ name: 'layout', params: { id: 'corne' } })
    vi.advanceTimersByTime(201)
    await nextTick()

    expect(shown()).toEqual({ ...GRAYED, updating: true })
  })

  it('shows no updating 201 ms after a switch away from Layout with no set', async () => {
    const shell = await mountShell({ path: '/design/corne/layout', design: DESIGN, spawn: true })
    const worker = only(shell.spawned)
    postLayoutSet(worker, { seq: seqOf(shell.store), layout: LAYOUT, parts: PARTS })
    commit(shell.store)
    vi.useFakeTimers()
    onTestFinished(() => {
      vi.useRealTimers()
    })

    await shell.router.push({ name: 'outline', params: { id: 'corne' } })
    vi.advanceTimersByTime(201)
    await nextTick()

    const strip = page.getByRole('contentinfo', { name: 'Status strip' }).element()
    expect(strip.textContent).not.toContain('◌ updating')
  })
})
