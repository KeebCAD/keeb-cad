import { aChainGroup, aFreeGroup, aLayoutRow, anId, aSlot } from '@keeb-cad/schema/testing'

import { designOf } from './designs'
import { groupRow, layoutOf, rectangle } from './layout-rows'
import type { Half, LayoutRowOf } from './types'

// The right half's rows sit mirrored about x = 60 mm.
const MIRROR_X = 120

const slot = (id: string) => aSlot({ id: anId(id) })

function frameAt(x: number, y: number, side: Half): LayoutRowOf['frame'] {
  return side === 'left'
    ? { x, y, rot: 0, mirrored: false }
    : { x: MIRROR_X - x, y, rot: 0, mirrored: true }
}

function onSide(x: number, y: number, side: Half) {
  return { x: side === 'left' ? x : MIRROR_X - x, y }
}

function borderOn(left: number, bottom: number, right: number, top: number, side: Half) {
  return side === 'left'
    ? rectangle(left, bottom, right, top)
    : rectangle(MIRROR_X - right, bottom, MIRROR_X - left, top)
}

function rowsOn(side: Half): Record<string, LayoutRowOf> {
  return {
    [`${side}/matrix-middle`]: groupRow(borderOn(-10, -10, 10, 29, side), [], {
      frame: frameAt(0, 0, side),
    }),
    [`${side}/matrix-middle-top`]: aLayoutRow({
      frame: frameAt(0, 19, side),
      anchorAt: onSide(0, 9.5, side),
    }),
    [`${side}/matrix-middle-bottom`]: aLayoutRow({ frame: frameAt(0, 0, side) }),
    // Its border reaches 4 mm above its keys, so a pointer there is inside it and on no key.
    [`${side}/thumbfan`]: groupRow(borderOn(0, -38, 39, -12, side), [], {
      frame: frameAt(10, -25, side),
      anchorAt: onSide(9, -9, side),
    }),
    [`${side}/thumbfan-near-home`]: aLayoutRow({ frame: frameAt(10, -25, side) }),
    [`${side}/thumbfan-mid-home`]: aLayoutRow({ frame: frameAt(29, -25, side) }),
  }
}

// Free group matrix-middle (top over bottom) and chain group thumbfan (near-home beside mid-home),
// both drawn on both halves, 18 × 18 mm keys.
export function matrixAndThumbfan() {
  return {
    design: designOf([
      aFreeGroup({
        id: anId('matrix-middle'),
        children: [slot('matrix-middle-top'), slot('matrix-middle-bottom')],
      }),
      aChainGroup({
        id: anId('thumbfan'),
        children: [slot('thumbfan-near-home'), slot('thumbfan-mid-home')],
      }),
    ]),
    layout: layoutOf({ ...rowsOn('left'), ...rowsOn('right') }),
  }
}
