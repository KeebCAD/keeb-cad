import { defineBlueprint } from '@keeb-cad/blueprint/authoring'

export default defineBlueprint({
  id: 'lib:blueprint/choc-key',
  version: 1,
  licence: { spdx: 'MIT', author: 'keeb-cad' },
  inputs: {},
  uses: [],
  lanes: {
    parts: {
      pulls: [],
      queries: [],
      outputs: [{ name: 'rectangle', role: 'rectangle', kind: 'shape', count: 'one' }],
      run: () => ({ outputs: { rectangle: { w: 18, h: 18 } }, problems: [] }),
    },
  },
})
