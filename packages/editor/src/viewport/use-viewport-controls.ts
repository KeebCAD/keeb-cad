import { useService } from '@keeb-cad/di/vue'
import { Gesture } from '@use-gesture/vanilla'
import { onKeyStroke, useEventListener } from '@vueuse/core'
import { match } from 'ts-pattern'
import { onBeforeUnmount, onMounted, type Ref, watch } from 'vue'

import { Landmarks } from '../landmarks/landmarks'
import { CanvasCursor } from './canvas-cursor'
import { readWheel } from './read-wheel'
import type { CanvasSize, Point } from './types'
import { Viewport } from './viewport'
import { wheelStep } from './viewport-limits'

const MIDDLE_BUTTON = 4
const LEFT_BUTTON = 1

export function useViewportControls(
  svg: Readonly<Ref<SVGSVGElement | null>>,
  size: Readonly<Ref<CanvasSize>>,
): void {
  const viewport = useService(Viewport)
  const cursor = useService(CanvasCursor)
  const landmarks = useService(Landmarks)
  let spaceHeld = false
  let stopNextClick = false
  let pointerAt: readonly [number, number] | undefined
  let gesture: Gesture | undefined

  // The tree gives Space to its rows, so Space pans only with focus on the canvas or nowhere.
  const spaceIsOurs = () => {
    const focused = document.activeElement
    return focused === null || focused === document.body
      ? true
      : landmarks
          .root('canvas')
          .map((root) => root.contains(focused))
          .getOr(false)
  }
  onKeyStroke(
    ' ',
    (event) => {
      if (!spaceIsOurs()) return
      event.preventDefault()
      spaceHeld = true
    },
    { eventName: 'keydown' },
  )
  onKeyStroke(
    ' ',
    () => {
      spaceHeld = false
    },
    { eventName: 'keyup' },
  )
  useEventListener(globalThis, 'blur', () => {
    spaceHeld = false
  })

  // Capture listeners on an ancestor run before the key's own, so the click that ends a pan never
  // reaches a key to select it.
  useEventListener(svg, 'pointerdown', () => (stopNextClick = false), { capture: true })
  useEventListener(
    svg,
    'click',
    (event) => {
      if (!stopNextClick) return
      stopNextClick = false
      event.stopPropagation()
      event.preventDefault()
    },
    { capture: true },
  )

  const local = ([x, y]: readonly [number, number]): Point => {
    const rect = svg.value?.getBoundingClientRect()
    return { x: x - (rect?.left ?? 0), y: y - (rect?.top ?? 0) }
  }

  const zoomByNotch = (at: Point, direction: 'in' | 'out') => {
    viewport.zoomAt(at, direction === 'in' ? wheelStep : 1 / wheelStep, size.value)
  }

  onMounted(() => {
    if (svg.value === null) return
    gesture = new Gesture(
      svg.value,
      {
        // A move's end emits once more with its last point, which may no longer be on the canvas.
        onMove: ({ active, xy }) => {
          if (!active) return
          pointerAt = xy
          cursor.point(local(xy), size.value)
        },
        onHover: ({ hovering, xy }) => {
          pointerAt = hovering === true ? xy : undefined
          if (pointerAt === undefined) cursor.leave()
          else cursor.point(local(pointerAt), size.value)
        },
        // The scale is the gesture's own, from 1 at its start, so each step is the ratio to the
        // last one; the viewport clamps the result.
        onPinch: ({ active, offset, origin, first, memo, event }) => {
          // A wheel pinch's end emits once more with its last event, which must not zoom again.
          if (!active) return memo
          const [scale] = offset
          const previous = first ? 1 : (memo as number)
          // The library multiplies the scale by 1 - deltaY / 100 per Ctrl+wheel step, which a mouse
          // notch of 100 px or more drives to zero or below, so a notch-shaped step is one notch.
          if (event instanceof WheelEvent) {
            const reading = readWheel(event)
            if (reading.kind === 'notch') {
              zoomByNotch(local(origin), reading.direction)
              return scale
            }
          }
          if (scale > 0 && previous > 0)
            viewport.zoomAt(local(origin), scale / previous, size.value)
          return scale
        },
        onDrag: ({ first, buttons, delta, memo, event }) => {
          const [dx, dy] = delta
          const panning = first ? buttons === MIDDLE_BUTTON || spaceHeld : (memo as boolean)
          if (!panning) return false
          if (first) {
            stopNextClick = true
            event.preventDefault()
          }
          if (dx !== 0 || dy !== 0) viewport.panBy({ x: dx, y: dy })
          return true
        },
        onWheel: ({ event, active }) => {
          // The wheel's end repeats its last event; Ctrl+wheel is the pinch's.
          if (!active || event.ctrlKey) return
          event.preventDefault()
          const at = local([event.clientX, event.clientY])
          match(readWheel(event))
            .with({ kind: 'notch' }, ({ direction }) => {
              zoomByNotch(at, direction)
            })
            .with({ kind: 'pan' }, ({ delta }) => {
              viewport.panBy({ x: -delta.x, y: -delta.y })
            })
            .with({ kind: 'none' }, () => {})
            .exhaustive()
        },
      },
      {
        // Followed on the window, not by pointer capture: a capture throws for a pointer the
        // browser didn't press itself (Firefox), as a synthetic test drag is.
        // Not passive, the library's default, so the press that starts a pan can be prevented.
        drag: {
          pointer: { buttons: [LEFT_BUTTON, MIDDLE_BUTTON], keys: false, capture: false },
          eventOptions: { passive: false },
        },
        pinch: { from: () => [1, 0] },
        wheel: { eventOptions: { passive: false } },
      },
    )
  })

  // A canvas that resizes under a still pointer puts another model point under it, or none once
  // the pointer is off it.
  watch(size, ({ width, height }) => {
    if (pointerAt === undefined) return
    const at = local(pointerAt)
    if (at.x >= 0 && at.y >= 0 && at.x <= width && at.y <= height) cursor.point(at, size.value)
    else cursor.leave()
  })

  onBeforeUnmount(() => {
    gesture?.destroy()
    cursor.leave()
  })
}
