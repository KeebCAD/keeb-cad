import { h } from 'vue'

import type { CanvasToggleProps } from '../../src/canvas-toggle/types'
import type { WidgetState } from './types'

const keycap = (stroke: string) => () =>
  h('rect', {
    x: -9,
    y: -9,
    width: 18,
    height: 18,
    fill: 'var(--color-key-body)',
    stroke,
    'vector-effect': 'non-scaling-stroke',
  })

export const canvasToggleStates: readonly WidgetState<CanvasToggleProps>[] = [
  {
    name: 'not pressed',
    props: { label: 'outer-home', pressed: false },
    slots: { default: keycap('var(--color-key-edge)') },
  },
  {
    name: 'pressed',
    props: { label: 'outer-home', pressed: true },
    slots: { default: keycap('var(--color-selection)') },
  },
]
