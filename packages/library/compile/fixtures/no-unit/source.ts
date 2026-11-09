import { defineBlueprint } from '@keeb-cad/blueprint/authoring'

export default defineBlueprint({
  id: 'lib:blueprint/no-unit',
  version: 1,
  licence: { spdx: 'MIT', author: 'keeb-cad' },
  inputs: {
    width: { kind: 'quantity', label: 'Width', default: { type: 'quantity', value: '18mm' } },
  },
  uses: [],
  lanes: {},
})
