import type { DesignStore } from '@keeb-cad/design'
import { aDesign } from '@keeb-cad/schema/testing'
import { RestartModelWorker } from '@keeb-cad/commands'
import type { FakeWorker } from '@keeb-cad/workers/testing'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { page } from 'vitest/browser'
import { nextTick } from 'vue'

import { emulateColorScheme, resetColorScheme } from '../testing/color-scheme'
import { mountShell } from '../testing/mount-shell'
import type { ColorScheme } from '../testing/types'

afterEach(resetColorScheme)

function strip() {
  return page.getByRole('contentinfo', { name: 'Status strip' })
}

function restartButton() {
  return strip().getByRole('button', { name: RestartModelWorker.label })
}

function text(): string {
  return strip().element().textContent
}

function latestSeq(store: DesignStore): number {
  const current = store.current
  if (current.isNone()) throw new Error('Expected a committed design.')
  return current.value.seq
}

function latest(spawned: FakeWorker[]): FakeWorker {
  const worker = spawned.at(-1)
  if (worker === undefined) throw new Error('Expected a spawned worker.')
  return worker
}

function arrange() {
  return mountShell({ path: '/design/corne/layout', design: aDesign(), spawn: true })
}

function freezeTime(): void {
  vi.useFakeTimers()
  onTestFinished(() => {
    vi.useRealTimers()
  })
}

async function advance(milliseconds: number): Promise<void> {
  vi.advanceTimersByTime(milliseconds)
  await nextTick()
}

async function startParts({ store, spawned }: Awaited<ReturnType<typeof arrange>>): Promise<void> {
  latest(spawned).post({
    kind: 'stage-started',
    epoch: spawned.length,
    seq: latestSeq(store),
    stage: 'parts',
  })
  await nextTick()
}

async function crashThrice(spawned: FakeWorker[], post?: (worker: FakeWorker) => void) {
  const crash = () => {
    post?.(latest(spawned))
    latest(spawned).crash('boom')
  }
  crash()
  crash()
  crash()
  await nextTick()
}

function postIssues(worker: FakeWorker, epoch: number, seq: number): void {
  worker.post({ kind: 'issues', epoch, seq, violations: [] })
}

describe('the status strip', () => {
  describe('the running stage', () => {
    it.each([
      ['just below the threshold', 999],
      ['on the threshold', 1000],
    ])('shows no stage %s', async (_role, milliseconds) => {
      const shell = await arrange()
      freezeTime()
      await startParts(shell)

      await advance(milliseconds)

      expect(text()).not.toContain('parts')
    })

    it.each([
      ['just above the threshold', 1001, 'parts 1 s'],
      ['just below the seconds boundary', 1999, 'parts 1 s'],
      ['on the seconds boundary', 2000, 'parts 2 s'],
      ['just above the seconds boundary', 2001, 'parts 2 s'],
    ])('shows the stage and floored seconds %s', async (_role, milliseconds, expected) => {
      const shell = await arrange()
      freezeTime()
      await startParts(shell)

      await advance(milliseconds)

      expect(text()).toContain(expected)
    })

    it('offers Restart beside the shown stage', async () => {
      const shell = await arrange()
      freezeTime()
      await startParts(shell)

      await advance(1001)

      expect(restartButton().query()).not.toBeNull()
    })

    it('clears when an accepted post arrives', async () => {
      const shell = await arrange()
      freezeTime()
      await startParts(shell)
      await advance(1001)
      expect(text()).toContain('parts 1 s')

      postIssues(latest(shell.spawned), shell.spawned.length, latestSeq(shell.store))
      await nextTick()

      expect(text()).not.toContain('parts')
    })
  })

  describe('the counts', () => {
    function readCounts() {
      const counts = strip()
      return {
        mark: counts.getByText('◌', { exact: true }).query() !== null,
        errors: counts.getByText('0 errors', { exact: true }).query() !== null,
        warnings: counts.getByText('0 warnings', { exact: true }).query() !== null,
      }
    }

    it('reads 0 and 0, dimmed with one mark, before the first issues post', async () => {
      await arrange()

      expect(readCounts()).toEqual({ mark: true, errors: true, warnings: true })
    })

    it("reads 0 and 0 undimmed for an issues post at main's seq", async () => {
      const shell = await arrange()

      postIssues(latest(shell.spawned), shell.spawned.length, latestSeq(shell.store))
      await nextTick()

      expect(readCounts()).toEqual({ mark: false, errors: true, warnings: true })
    })

    it("reads 0 and 0 dimmed for an issues post behind main's seq", async () => {
      const shell = await arrange()
      postIssues(latest(shell.spawned), shell.spawned.length, latestSeq(shell.store))

      shell.store.replaceDesign({ design: aDesign(), unreadable: [] })
      await nextTick()

      expect(readCounts()).toEqual({ mark: true, errors: true, warnings: true })
    })
  })

  describe('a failed worker', () => {
    it('reads failed with its stage and offers Restart', async () => {
      const shell = await arrange()

      await crashThrice(shell.spawned, (worker) =>
        worker.post({
          kind: 'stage-started',
          epoch: shell.spawned.length,
          seq: latestSeq(shell.store),
          stage: 'plates',
        }),
      )

      expect(text()).toContain('failed: plates: boom')
      expect(restartButton().query()).not.toBeNull()
    })

    it('keeps a long message on one line in the 30px strip, Restart visible, the text whole', async () => {
      const shell = await arrange()
      const long = `failed: ${'x'.repeat(600)}`

      latest(shell.spawned).crash(long.slice('failed: '.length))
      latest(shell.spawned).crash(long.slice('failed: '.length))
      latest(shell.spawned).crash(long.slice('failed: '.length))
      await nextTick()

      const message = page.getByText(long, { exact: true }).element()
      expect({
        height: strip().element().getBoundingClientRect().height,
        insideLeft:
          message.getBoundingClientRect().left >= strip().element().getBoundingClientRect().left,
        ellipsis: getComputedStyle(message).textOverflow,
        text: message.textContent,
      }).toEqual({ height: 30, insideLeft: true, ellipsis: 'ellipsis', text: long })
      await expect.element(restartButton()).toBeInViewport()
    })

    it('reads failed with no stage and offers Restart', async () => {
      const shell = await arrange()

      await crashThrice(shell.spawned)

      expect(text()).toContain('failed: boom')
      expect(restartButton().query()).not.toBeNull()
    })
  })

  describe.each<[ColorScheme, string, string, string]>([
    ['dark', 'rgb(198, 208, 245)', 'rgb(231, 130, 132)', 'rgb(165, 173, 206)'],
    ['light', 'rgb(76, 79, 105)', 'rgb(210, 15, 57)', 'rgb(92, 95, 119)'],
  ])('under the %s theme', (scheme, textColour, redColour, mutedColour) => {
    beforeEach(() => emulateColorScheme(scheme))

    it("colours the failed message in text and its mark in error from the theme's tokens", async () => {
      const shell = await arrange()

      await crashThrice(shell.spawned)

      const message = page.getByText('failed: boom', { exact: true }).element()
      const mark = strip().getByText('●', { exact: true }).first().element()
      expect({
        message: getComputedStyle(message).color,
        mark: getComputedStyle(mark).color,
      }).toEqual({ message: textColour, mark: redColour })
    })

    it("colours dimmed counts in the theme's text-muted", async () => {
      await arrange()

      const count = page.getByText('0 errors', { exact: true }).element()
      expect(getComputedStyle(count).color).toBe(mutedColour)
    })
  })
})
