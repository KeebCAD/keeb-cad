import type { Frozen, Node } from '@keeb-cad/schema'

import type { OffsetTexts } from './types'

export function offsetTexts({ offset }: Frozen<Node>): OffsetTexts {
  return {
    x: offset?.position?.x ?? '0mm',
    y: offset?.position?.y ?? '0mm',
    rot: offset?.rotation ?? '0deg',
    pivotX: offset?.pivot?.x ?? '0mm',
    pivotY: offset?.pivot?.y ?? '0mm',
  }
}
