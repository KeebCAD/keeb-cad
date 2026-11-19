import { defineBlueprint } from '@keeb-cad/blueprint/authoring'

const KEYCAP_MM = 18
const SIZE_FACTORS: Readonly<Record<string, number>> = { '1u': 1, '1.5u': 1.5 }

export default defineBlueprint({
  id: 'lib:blueprint/choc-key',
  version: 1,
  licence: { spdx: 'MIT', author: 'keeb-cad' },
  inputs: {
    size: {
      kind: 'option',
      label: 'Size',
      options: Object.keys(SIZE_FACTORS),
      default: '1u',
      perSlot: true,
    },
  },
  uses: [],
  lanes: {
    parts: {
      pulls: [],
      queries: [],
      outputs: [{ name: 'slot-space', role: 'slot-space', kind: 'shape', count: 'one' }],
      run: ({ inputs }) => {
        const factor = SIZE_FACTORS[inputs.size]
        if (factor === undefined) throw new Error(`No keycap size "${inputs.size}".`)
        const x = (KEYCAP_MM * factor) / 2
        const y = KEYCAP_MM / 2
        const keycap = {
          outer: [
            { x: -x, y: -y },
            { x, y: -y },
            { x, y },
            { x: -x, y },
          ],
          holes: [],
        }
        return { outputs: { 'slot-space': [keycap] }, problems: [] }
      },
    },
  },
})
