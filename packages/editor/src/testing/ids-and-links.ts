import type { Design, LayoutOutput, PartsOutput } from '@keeb-cad/schema'
import { expect } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import type { Point } from '../viewport/types'
import { modelToScreen } from '../viewport/viewport-transform'
import { canvas, canvasSvg } from './canvas-queries'
import { arrangeLayoutCanvas, sizeCanvasAndWait } from './layout-canvas'
import { nextFrames } from './next-frames'

// The canvas size and viewport the arrangement sets, so a model point's screen point is known.
export const idsAndLinksSize = { width: 648, height: 448 }
export const idsAndLinksView = { centre: { x: 60, y: -5 }, zoom: 4 }

export const statusStrip = () => page.getByRole('contentinfo', { name: 'Status strip' })

export async function arrangeIdsAndLinks(
  design: Design,
  layout: LayoutOutput,
  parts?: PartsOutput,
) {
  const shell = await arrangeLayoutCanvas(design)
  // The pointer stays where the last test left it, which may be where this test draws a key.
  await userEvent.hover(statusStrip())
  await sizeCanvasAndWait(idsAndLinksSize.width, idsAndLinksSize.height)
  shell.post(layout, parts)
  await expect.poll(() => canvas().getByRole('button').elements().length).toBeGreaterThan(0)
  await nextFrames()
  shell.viewport.setCentre(idsAndLinksView.centre)
  shell.viewport.setZoom(idsAndLinksView.zoom)
  await nextFrames()
  return shell
}

export function screenOf(point: Point): Point {
  return modelToScreen(point, idsAndLinksView, idsAndLinksSize)
}

// A model point as a position on the canvas locator, from its top left.
export function onCanvas(point: Point): { position: Point } {
  const { x, y } = screenOf(point)
  const svg = canvasSvg().getBoundingClientRect()
  const area = canvas().element().getBoundingClientRect()
  return { position: { x: svg.left - area.left + x, y: svg.top - area.top + y } }
}

function named(element: Element): string {
  return element.getAttribute('aria-label') ?? ''
}

// The id labels, anchor links and group borders the canvas draws, by name, in drawing order.
export function drawnIdsAndLinks() {
  const names = canvas().getByRole('img').elements().map(named)
  return {
    labels: names.filter((name) => name.endsWith(' id')),
    links: names.filter((name) => name.endsWith(' anchor link')),
    borders: names.filter((name) => name.endsWith(' border')),
  }
}

export const idLabel = (placement: string) =>
  canvas().getByRole('img', { name: `${placement} id`, exact: true })

export const anchorLink = (placement: string) =>
  canvas().getByRole('img', { name: `${placement} anchor link`, exact: true })

export function anchorLinkLine(placement: string): SVGLineElement {
  const line = anchorLink(placement).element().querySelector('line')
  if (line === null) throw new Error('An anchor link draws a line.')
  return line
}

// A link's two ends, in the canvas's screen px.
export function linkEnds(placement: string): { from: Point; to: Point } {
  const line = anchorLinkLine(placement)
  return {
    from: { x: line.x1.baseVal.value, y: line.y1.baseVal.value },
    to: { x: line.x2.baseVal.value, y: line.y2.baseVal.value },
  }
}
