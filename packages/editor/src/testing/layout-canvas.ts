import type { DesignStore } from '@keeb-cad/design'
import { compareId, type Design, type LayoutOutput, type Node } from '@keeb-cad/schema'
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
import { expect } from 'vitest'
import { page } from 'vitest/browser'

import { Selection } from '../selection/selection'
import type { Point } from '../viewport/types'
import { Viewport } from '../viewport/viewport'
import { mountShell } from './mount-shell'
import type { LayoutRowOf } from './types'
import { postLayoutSet } from './post-layout-set'

const PARTS = aPartsOutput({ ids: ['key@a'], rows: [{ w: 18, h: 18 }] })
const ROOT_ROW = aLayoutRow({ kind: 'group', part: -1 })

export function designWith(...slots: string[]): Design {
  return designOf(slots.map((id) => aSlot({ id: anId(id) })))
}

export function designOf(children: Node[]): Design {
  return aDesign({ layout: aLayout({ id: anId('root'), children }) })
}

// The root and the given rows, in the worker's id order. A key that names its side (`right/c`) is
// kept as given; any other is on the left.
export function layoutOf(rowsById: Readonly<Record<string, LayoutRowOf>>): LayoutOutput {
  const rows = new Map<string, LayoutRowOf>([
    ['left/root', ROOT_ROW],
    ...Object.entries(rowsById).map(([id, row]): [string, LayoutRowOf] => [
      id.includes('/') ? id : `left/${id}`,
      row,
    ]),
  ])
  const ids = [...rows.keys()].toSorted(compareId)
  return aLayoutOutput({ ids, rows: ids.map((id) => rows.get(id) ?? ROOT_ROW) })
}

export function keyAt(x: number, y = 0): LayoutRowOf {
  return aLayoutRow({ frame: { x, y, rot: 0, mirrored: false } })
}

function seqOf(store: DesignStore): number {
  return store.current.map(({ seq }) => seq).getOr(-1)
}

function only(spawned: FakeWorker[]): FakeWorker {
  const [worker] = spawned
  if (worker === undefined) throw new Error('Expected a spawned worker.')
  return worker
}

export async function arrangeLayoutCanvas(design: Design) {
  const shell = await mountShell({ path: '/design/corne/layout', design, spawn: true })
  const worker = only(shell.spawned)
  return {
    ...shell,
    viewport: shell.injector.resolve(Viewport),
    selection: shell.injector.resolve(Selection),
    post: (layout: LayoutOutput) => {
      postLayoutSet(worker, { seq: seqOf(shell.store), layout, parts: PARTS })
    },
  }
}

export const canvas = () => page.getByRole('main', { name: 'Canvas' })

export const key = (id: string) => page.getByRole('button', { name: id, exact: true })

export function canvasSvg(): SVGSVGElement {
  const found = canvas().element().querySelector('svg')
  if (found === null) throw new Error('The canvas drew no SVG.')
  return found
}

function svgSize() {
  const { width, height } = canvasSvg().getBoundingClientRect()
  return { width, height }
}

export async function sizeCanvasAndWait(width: number, height: number): Promise<void> {
  canvasSvg().style.width = `${width}px`
  canvasSvg().style.height = `${height}px`
  await expect.poll(() => svgSize()).toEqual({ width, height })
  await nextFrames()
}

// A frame's resize observations come after its animation frame callbacks, so two frames see the
// remounted canvas measured and any fit it would run.
export async function nextFrames(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))
}

// A point on the canvas, from its top left, in the page's client coordinates.
export function clientAt({ x, y }: Point): { clientX: number; clientY: number } {
  const { left, top } = canvasSvg().getBoundingClientRect()
  return { clientX: left + x, clientY: top + y }
}
