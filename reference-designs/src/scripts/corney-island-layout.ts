import type { LayoutScript } from './types'

// Corney Island's left half, from source/config.yaml's points. Ids are Ergogen's point names with
// `_` written `-`. Columns chain up the positive y axis, so the bottom row comes first.

const LEFT_HALF = { x: '-140mm', y: '0mm' }
const ROWS = ['bottom', 'home', 'top']

// Each column's stagger is relative to the column before it, which a chain carries.
const COLUMNS: { name: string; stagger?: string }[] = [
  { name: 'outer' },
  { name: 'pinky' },
  { name: 'ring', stagger: '4.75mm' },
  { name: 'middle', stagger: '2.375mm' },
  { name: 'index', stagger: '-2.375mm' },
  { name: 'inner', stagger: '-2.375mm' },
]

const column = ({ name, stagger }: (typeof COLUMNS)[number]): LayoutScript => [
  {
    command: 'layout.addGroup',
    input: {
      parent: 'matrix',
      id: `matrix-${name}`,
      arrangement: 'chain',
      axis: 'y',
      ...(stagger === undefined ? {} : { offset: { position: { x: '0mm', y: stagger } } }),
    },
  },
  ...ROWS.map((row) => ({
    command: 'layout.addSlot',
    input: { parent: `matrix-${name}`, id: `matrix-${name}-${row}` },
  })),
]

export const corneyIslandLayout: LayoutScript = [
  {
    command: 'layout.addGroup',
    input: { id: 'left-half', arrangement: 'free', offset: { position: LEFT_HALF } },
  },
  {
    command: 'layout.addGroup',
    input: { parent: 'left-half', id: 'matrix', arrangement: 'chain', axis: 'x' },
  },
  ...COLUMNS.flatMap(column),
  // Ergogen's thumbfan anchor: [0.5 ks, -kp - 3] from matrix_middle_bottom.
  {
    command: 'layout.addGroup',
    input: {
      parent: 'left-half',
      id: 'thumbfan',
      arrangement: 'chain',
      axis: 'x',
      offset: { position: { x: '9.5mm', y: '-22mm' } },
    },
  },
  {
    command: 'layout.setAnchor',
    input: { id: 'thumbfan', anchor: { type: 'slot', ref: 'matrix-middle-bottom' } },
  },
  { command: 'layout.addSlot', input: { parent: 'thumbfan', id: 'thumbfan-near-home' } },
  // Ergogen's spread ks + 2 less the 19 mm step; splay -15.
  {
    command: 'layout.addSlot',
    input: {
      parent: 'thumbfan',
      id: 'thumbfan-mid-home',
      offset: { position: { x: '2mm', y: '-2.75mm' }, rotation: '-15deg' },
    },
  },
  // Ergogen's spread 22.463 less the step 9 + 1 + 13.5; splay -15 plus the key's own 90.
  {
    command: 'layout.addSlot',
    input: {
      parent: 'thumbfan',
      id: 'thumbfan-far-home',
      inputs: { size: '1.5u' },
      offset: { position: { x: '-1.037mm', y: '2.122mm' }, rotation: '75deg' },
    },
  },
]
