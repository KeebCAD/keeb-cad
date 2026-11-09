import { defineBlueprint } from '@keeb-cad/blueprint/authoring'

export default defineBlueprint({
  id: 'lib:blueprint/no-options',
  version: 1,
  licence: { spdx: 'MIT', author: 'keeb-cad' },
  inputs: { style: { kind: 'option', label: 'Style', default: 'a' } },
  uses: [],
  lanes: {},
})
