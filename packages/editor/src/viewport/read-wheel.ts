import type { WheelReading } from './types'
import { notchMinDeltaPx } from './viewport-limits'

// No browser says whether a wheel event came from a mouse or a trackpad, so a mouse notch is read
// from its shape: a line or page step, or a whole pixel step of at least the notch minimum.
export function readWheel({
  deltaMode,
  deltaX,
  deltaY,
}: Pick<WheelEvent, 'deltaMode' | 'deltaX' | 'deltaY'>): WheelReading {
  if (deltaMode !== WheelEvent.DOM_DELTA_PIXEL) {
    return deltaY === 0 ? { kind: 'none' } : notch(deltaY)
  }
  if (deltaX === 0 && Number.isInteger(deltaY) && Math.abs(deltaY) >= notchMinDeltaPx) {
    return notch(deltaY)
  }
  return { kind: 'pan', delta: { x: deltaX, y: deltaY } }
}

function notch(deltaY: number): WheelReading {
  return { kind: 'notch', direction: deltaY < 0 ? 'in' : 'out' }
}
