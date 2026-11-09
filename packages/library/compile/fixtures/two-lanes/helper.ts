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
      outputs: [{ name: 'rectangle', role: 'rectangle', kind: 'shape', count: 'one' }],
      run: ({ inputs }) => ({
        outputs: { rectangle: { w: half(inputs.width), h: half(inputs.width) } },
        problems: [],
      }),
    },
    shapes: {
      pulls: [],
      queries: [],
      outputs: [],
      run: () => ({ outputs: {}, problems: [] }),
    },
  },
})
