import { page } from 'vitest/browser'

import type { Point } from '../viewport/types'

export const canvas = () => page.getByRole('main', { name: 'Canvas' })

export const key = (id: string) => page.getByRole('button', { name: id, exact: true })

export function canvasSvg(): SVGSVGElement {
  const found = canvas().element().querySelector('svg')
  if (found === null) throw new Error('The canvas drew no SVG.')
  return found
}

// A point on the canvas, from its top left, in the page's client coordinates.
export function clientAt({ x, y }: Point): { clientX: number; clientY: number } {
  const { left, top } = canvasSvg().getBoundingClientRect()
  return { clientX: left + x, clientY: top + y }
}
