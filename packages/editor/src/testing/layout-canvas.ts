import type { DesignStore } from '@keeb-cad/design'
import type { Design, LayoutOutput, PartsOutput } from '@keeb-cad/schema'
import { aPartsOutput } from '@keeb-cad/schema/testing'
import type { FakeWorker } from '@keeb-cad/workers/testing'
import { expect } from 'vitest'

import { Selection } from '../selection/selection'
import { Viewport } from '../viewport/viewport'
import { canvasSvg } from './canvas-queries'
import { mountShell } from './mount-shell'
import { nextFrames } from './next-frames'
import { postLayoutSet } from './post-layout-set'

const PARTS = aPartsOutput({ ids: ['key@a'], rows: [{ w: 18, h: 18 }] })

export async function arrangeLayoutCanvas(design: Design) {
  const shell = await mountShell({ path: '/design/corne/layout', design, spawn: true })
  const worker = only(shell.spawned)
  return {
    ...shell,
    viewport: shell.injector.resolve(Viewport),
    selection: shell.injector.resolve(Selection),
    post: (layout: LayoutOutput, parts: PartsOutput = PARTS) => {
      postLayoutSet(worker, { seq: seqOf(shell.store), layout, parts })
    },
  }
}

export async function sizeCanvasAndWait(width: number, height: number): Promise<void> {
  canvasSvg().style.width = `${width}px`
  canvasSvg().style.height = `${height}px`
  await expect.poll(() => svgSize()).toEqual({ width, height })
  await nextFrames()
}

function seqOf(store: DesignStore): number {
  return store.current.map(({ seq }) => seq).getOr(-1)
}

function only(spawned: FakeWorker[]): FakeWorker {
  const [worker] = spawned
  if (worker === undefined) throw new Error('Expected a spawned worker.')
  return worker
}

function svgSize() {
  const { width, height } = canvasSvg().getBoundingClientRect()
  return { width, height }
}
