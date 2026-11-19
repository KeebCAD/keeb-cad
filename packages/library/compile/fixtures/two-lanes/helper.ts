import { defineBlueprint } from '@keeb-cad/blueprint/authoring'

function half(value: number): number {
  return value / 2
}

export default defineBlueprint({
  id: 'lib:blueprint/two-lanes',
  version: 1,
  licence: { spdx: 'MIT', author: 'keeb-cad' },
  inputs: {
    width: {
      kind: 'quantity',
      label: 'Width',
      unit: 'mm',
      default: { type: 'quantity', value: '18mm' },
    },
  },
  uses: [],
  lanes: {
    parts: {
      pulls: [],
      queries: [],
      outputs: [{ name: 'slot-space', role: 'slot-space', kind: 'shape', count: 'one' }],
      run: ({ inputs }) => {
        const side = half(inputs.width)
        const outer = [
          { x: 0, y: 0 },
          { x: side, y: 0 },
          { x: side, y: side },
          { x: 0, y: side },
        ]
        return { outputs: { 'slot-space': [{ outer, holes: [] }] }, problems: [] }
      },
    },
    shapes: {
      pulls: [],
      queries: [],
      outputs: [],
      run: () => ({ outputs: {}, problems: [] }),
    },
  },
})
