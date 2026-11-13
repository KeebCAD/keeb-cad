import * as v from 'valibot'

export const attachPointSchema = v.picklist([
  'center',
  'edge-top',
  'edge-bottom',
  'edge-left',
  'edge-right',
  'corner-tl',
  'corner-tr',
  'corner-bl',
  'corner-br',
])
