import { defineBlueprint } from '@keeb-cad/blueprint/authoring'

const helper = (value: number): number => value
helper('text')

export default defineBlueprint({
  id: 'lib:blueprint/type-error',
  version: 1,
  licence: { spdx: 'MIT', author: 'keeb-cad' },
  inputs: {},
  uses: [],
  lanes: {},
})
